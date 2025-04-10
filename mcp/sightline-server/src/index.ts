#!/usr/bin/env node

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import puppeteer from "puppeteer";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "fs";
import path from "path";

let db: Database<sqlite3.Database, sqlite3.Statement>;

/**
 * Initialize SQLite database with required tables.
 */
async function initDatabase() {
  db = await open({
    filename: path.join(process.cwd(), "sightline.sqlite"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      image BLOB,
      dom TEXT,
      metadata TEXT,
      label TEXT,
      tags TEXT,
      env_info TEXT,
      archived INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
    CREATE INDEX IF NOT EXISTS idx_snapshots_label ON snapshots(label);
    CREATE INDEX IF NOT EXISTS idx_snapshots_archived ON snapshots(archived);

    CREATE TABLE IF NOT EXISTS validations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      result TEXT,
      FOREIGN KEY(snapshot_id) REFERENCES snapshots(id)
    );

    CREATE TABLE IF NOT EXISTS diffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id_a INTEGER,
      snapshot_id_b INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      diff_image BLOB,
      score REAL,
      FOREIGN KEY(snapshot_id_a) REFERENCES snapshots(id),
      FOREIGN KEY(snapshot_id_b) REFERENCES snapshots(id)
    );
  `);
}

/**
 * Create the MCP server instance.
 */
const server = new Server(
  {
    name: "sightline-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);


/**
 * List available tools: take_snapshot, validate_snapshot, compare_snapshots.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "take_snapshot",
        description: "Capture a UI snapshot with Puppeteer",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to capture" },
            label: { type: "string", description: "Optional label for snapshot" },
            tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
            env_info: { type: "object", description: "Optional environment info" },
          },
          required: ["url"],
        },
      },
      {
        name: "validate_snapshot",
        description: "Validate a snapshot's DOM with simple or multiple checks",
        inputSchema: {
          type: "object",
          properties: {
            snapshot_id: { type: "number", description: "Snapshot ID" },
            rules: {
              type: "array",
              description: "Validation rules (selector + expected text)",
              items: {
                type: "object",
                properties: {
                  selector: { type: "string", description: "CSS selector" },
                  text: { type: "string", description: "Expected text content" },
                },
                required: ["selector", "text"],
              },
            },
            profile: { type: "string", description: "Validation profile name (optional)" },
          },
          required: ["snapshot_id", "rules"],
        },
      },
      {
        name: "compare_snapshots",
        description: "Compare two snapshots and generate a diff",
        inputSchema: {
          type: "object",
          properties: {
            snapshot_id_a: { type: "number", description: "First snapshot ID" },
            snapshot_id_b: { type: "number", description: "Second snapshot ID" },
            threshold: { type: "number", description: "Pixelmatch threshold (optional)", minimum: 0, maximum: 1 },
          },
          required: ["snapshot_id_a", "snapshot_id_b"],
        },
      },
    ],
  };
});

/**
 * Handle tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = request.params.arguments ?? {};

  switch (name) {
    case "take_snapshot": {
      const url = String(args.url);
      const label = args.label ? String(args.label) : null;
      const tags = args.tags ? JSON.stringify(args.tags) : null;
      const env_info = args.env_info ? JSON.stringify(args.env_info) : null;

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2" });

      const dom = await page.content();
      const screenshotBuffer = await page.screenshot({ fullPage: true });

      await browser.close();

      const result = await db.run(
        "INSERT INTO snapshots (image, dom, metadata, label, tags, env_info) VALUES (?, ?, ?, ?, ?, ?)",
        screenshotBuffer,
        dom,
        JSON.stringify({ url }),
        label,
        tags,
        env_info
      );
      const id = result.lastID;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ snapshot_id: id }),
          },
        ],
      };
    }

    case "validate_snapshot": {
      const snapshot_id = Number(args.snapshot_id);
      const rules = Array.isArray(args.rules) ? args.rules : [];
      const profile = args.profile ? String(args.profile) : null;

      const row = await db.get(
        "SELECT dom FROM snapshots WHERE id = ?",
        snapshot_id
      );
      if (!row) throw new Error("Snapshot not found");

      const dom = row.dom;
      const results = [];

      for (const rule of rules) {
        const selector = String(rule.selector);
        const expectedText = String(rule.text);
        const found = dom.includes(selector) && dom.includes(expectedText);
        results.push({ selector, expectedText, found });
      }

      const validationResult = {
        profile,
        rules: results,
      };

      await db.run(
        "INSERT INTO validations (snapshot_id, result) VALUES (?, ?)",
        snapshot_id,
        JSON.stringify(validationResult)
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(validationResult),
          },
        ],
      };
    }

    case "compare_snapshots": {
      const idA = Number(args.snapshot_id_a);
      const idB = Number(args.snapshot_id_b);
      const threshold = args.threshold !== undefined ? Number(args.threshold) : 0.1;

      const rowA = await db.get(
        "SELECT image FROM snapshots WHERE id = ?",
        idA
      );
      const rowB = await db.get(
        "SELECT image FROM snapshots WHERE id = ?",
        idB
      );
      if (!rowA || !rowB) throw new Error("Snapshots not found");

      const imgA = PNG.sync.read(rowA.image);
      const imgB = PNG.sync.read(rowB.image);

      const { width, height } = imgA;
      const diff = new PNG({ width, height });

      const score = pixelmatch(
        imgA.data,
        imgB.data,
        diff.data,
        width,
        height,
        { threshold }
      );

      const diffBuffer = PNG.sync.write(diff);

      await db.run(
        "INSERT INTO diffs (snapshot_id_a, snapshot_id_b, diff_image, score) VALUES (?, ?, ?, ?)",
        idA,
        idB,
        diffBuffer,
        score
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ score }),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Initialize and start HTTP + WebSocket server.
 */
async function main() {
  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "50mb" }));

  const port = process.env.PORT || 3000;

  // Basic SSE endpoint for /mcp-sse
  app.get("/mcp-sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send initial connected event
    res.write(`event: connected\ndata: {}\n\n`);

    // Keep connection alive with comments
    const keepAlive = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
    });
  });

  // Minimal JSON-RPC dispatcher
  async function handleJsonRpcRequest(request: any) {
    const { id, method, params } = request;
    let result, error;

    try {
      if (method === "list_tools") {
        // @ts-expect-error Suppress schema param type mismatch
        result = await server.request(ListToolsRequestSchema, params);
      } else if (method === "call_tool") {
        // @ts-expect-error Suppress schema param type mismatch
        result = await server.request(CallToolRequestSchema, params);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }
    } catch (err: any) {
      error = { code: -32000, message: err.message || String(err) };
    }

    return {
      jsonrpc: "2.0",
      id,
      ...(error ? { error } : { result }),
    };
  }

  // HTTP JSON-RPC endpoint
  app.post("/jsonrpc", async (req, res) => {
    try {
      const response = await handleJsonRpcRequest(req.body);
      res.json(response);
    } catch (err: any) {
      console.error("JSON-RPC HTTP error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  const serverInstance = app.listen(port, () => {
    console.log(`Sightline MCP server listening on port ${port}`);
  });

  // WebSocket JSON-RPC
  const wss = new WebSocketServer({ server: serverInstance });

  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      try {
        const request = JSON.parse(message.toString());
        const response = await handleJsonRpcRequest(request);
        ws.send(JSON.stringify(response));
      } catch (err: any) {
        console.error("JSON-RPC WS error:", err);
        ws.send(JSON.stringify({ error: err.message }));
      }
    });
  });
}

main().catch((err) => {
  console.error("Sightline MCP server error:", err);
  process.exit(1);
});
