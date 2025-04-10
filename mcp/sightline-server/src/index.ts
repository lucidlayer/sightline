#!/usr/bin/env node

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
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

      // Use cheerio for DOM parsing
      const cheerio = await import('cheerio');
      const $ = cheerio.load(dom);

      const results = [];

      for (const rule of rules) {
        const selector = String(rule.selector);
        const expectedText = String(rule.text);

        const elements = $(selector);
        let found = false;

        elements.each((_: number, el: cheerio.Element) => {
          const text = $(el).text();
          if (text.includes(expectedText)) {
            found = true;
            return false; // break loop
          }
        });

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

    case "toggle_archive_snapshot": {
      const { snapshot_id, archived } = args;
      await db.run('UPDATE snapshots SET archived = ? WHERE id = ?', archived ? 1 : 0, snapshot_id);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
    }

    case "delete_snapshot": {
      const { snapshot_id } = args;
      await db.run('DELETE FROM snapshots WHERE id = ?', snapshot_id);
      await db.run('DELETE FROM diffs WHERE snapshot_id_a = ? OR snapshot_id_b = ?', snapshot_id, snapshot_id);
      await db.run('DELETE FROM validations WHERE snapshot_id = ?', snapshot_id);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
    }

    case "update_ai_suggestion": {
      const { suggestion_id, action } = args;
      await db.run('UPDATE ai_suggestions SET status = ? WHERE id = ?', action, suggestion_id);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// MCP resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'sightline://snapshots',
      name: 'All Sightline Snapshots',
      mimeType: 'application/json',
    },
    {
      uriTemplate: 'sightline://snapshots/{id}',
      name: 'Single Snapshot by ID',
      mimeType: 'application/json',
    },
    {
      uriTemplate: 'sightline://diffs/{idA}/{idB}',
      name: 'Diff between two snapshots',
      mimeType: 'application/json',
    },
    {
      uri: 'sightline://ai-suggestions',
      name: 'AI Suggestions',
      mimeType: 'application/json',
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;

  if (uri === 'sightline://snapshots') {
    const rows = await db.all('SELECT id, label, tags, timestamp, archived, env_info, image FROM snapshots');
    const snapshots = rows.map(row => ({
      id: row.id,
      label: row.label,
      tags: JSON.parse(row.tags || '[]'),
      timestamp: row.timestamp,
      archived: !!row.archived,
      env_info: JSON.parse(row.env_info || '{}'),
      thumbnail_base64: row.image ? Buffer.from(row.image).toString('base64') : null
    }));
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(snapshots) }] };
  }

  const snapMatch = uri.match(/^sightline:\/\/snapshots\/(\d+)$/);
  if (snapMatch) {
    const id = Number(snapMatch[1]);
    const row = await db.get('SELECT * FROM snapshots WHERE id = ?', id);
    if (!row) throw new Error('Snapshot not found');
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          id: row.id,
          label: row.label,
          tags: JSON.parse(row.tags || '[]'),
          timestamp: row.timestamp,
          archived: !!row.archived,
          env_info: JSON.parse(row.env_info || '{}'),
          image_base64: Buffer.from(row.image).toString('base64'),
          dom: row.dom
        })
      }]
    };
  }

  const diffMatch = uri.match(/^sightline:\/\/diffs\/(\d+)\/(\d+)$/);
  if (diffMatch) {
    const idA = Number(diffMatch[1]);
    const idB = Number(diffMatch[2]);
    const diffRow = await db.get('SELECT * FROM diffs WHERE snapshot_id_a = ? AND snapshot_id_b = ?', idA, idB);
    if (!diffRow) throw new Error('Diff not found');
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          score: diffRow.score,
          diff_image_base64: Buffer.from(diffRow.diff_image).toString('base64')
        })
      }]
    };
  }

  if (uri === 'sightline://ai-suggestions') {
    const rows = await db.all('SELECT * FROM ai_suggestions');
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(rows)
      }]
    };
  }

  throw new Error(`Unknown resource URI: ${uri}`);
});

const clients: Record<string, { res: any }> = {};

/**
 * Initialize and start HTTP + WebSocket + SSE server.
 */
async function main() {
  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "50mb" }));

  const port = process.env.PORT || 3000;

  // SSE endpoint
  app.get("/mcp-sse", (req, res) => {
    const clientId = randomUUID();
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    clients[clientId] = { res };

    // Send clientId to client
    res.write(`event: client_id\ndata: ${JSON.stringify({ clientId })}\n\n`);

    // Keep alive
    const keepAlive = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      delete clients[clientId];
    });
  });

  // POST endpoint for client requests
  app.post("/mcp-message", async (req, res) => {
    const { clientId, ...rpcRequest } = req.body;
    const client = clients[clientId];
    if (!client) {
      res.status(400).json({ error: "Invalid clientId" });
      return;
    }

    try {
      let result, error;
      try {
        if (rpcRequest.method === "list_tools") {
          // @ts-expect-error
          result = await server.request(ListToolsRequestSchema, rpcRequest.params);
        } else if (rpcRequest.method === "call_tool") {
          // @ts-expect-error
          result = await server.request(CallToolRequestSchema, rpcRequest.params);
        } else {
          throw new Error(`Unsupported method: ${rpcRequest.method}`);
        }
      } catch (err: any) {
        error = { code: -32000, message: err.message || String(err) };
      }

      const response = {
        jsonrpc: "2.0",
        id: rpcRequest.id,
        ...(error ? { error } : { result }),
      };

      // Send response as SSE event
      client.res.write(`event: rpc_response\ndata: ${JSON.stringify(response)}\n\n`);

      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Error handling /mcp-message:", err);
      res.status(500).json({ error: err.message });
    }
  });

  const serverInstance = app.listen(port, () => {
    console.log(`Sightline MCP server listening on port ${port}`);
  });

  // WebSocket JSON-RPC (optional)
  const wss = new WebSocketServer({ server: serverInstance });

  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      try {
        const request = JSON.parse(message.toString());
        let result, error;
        try {
          if (request.method === "list_tools") {
            // @ts-expect-error
            result = await server.request(ListToolsRequestSchema, request.params);
          } else if (request.method === "call_tool") {
            // @ts-expect-error
            result = await server.request(CallToolRequestSchema, request.params);
          } else {
            throw new Error(`Unsupported method: ${request.method}`);
          }
        } catch (err: any) {
          error = { code: -32000, message: err.message || String(err) };
        }

        const response = {
          jsonrpc: "2.0",
          id: request.id,
          ...(error ? { error } : { result }),
        };

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
