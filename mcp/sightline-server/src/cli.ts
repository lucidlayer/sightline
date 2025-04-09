#!/usr/bin/env node

import { Command } from "commander";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const program = new Command();

async function openDb() {
  return open({
    filename: path.join(process.cwd(), "sightline.sqlite"),
    driver: sqlite3.Database,
  });
}

program
  .name("sightline-cli")
  .description("CLI utilities for Sightline MCP server")
  .version("0.1.0");

program
  .command("list-snapshots")
  .description("List all snapshots")
  .action(async () => {
    const db = await openDb();
    const rows = await db.all("SELECT id, timestamp, label, tags, archived FROM snapshots");
    console.table(rows);
    await db.close();
  });

program
  .command("archive-snapshot <id>")
  .description("Archive (soft-delete) a snapshot by ID")
  .action(async (id) => {
    const db = await openDb();
    await db.run("UPDATE snapshots SET archived = 1 WHERE id = ?", id);
    console.log(`Archived snapshot ${id}`);
    await db.close();
  });

program
  .command("unarchive-snapshot <id>")
  .description("Unarchive a snapshot by ID")
  .action(async (id) => {
    const db = await openDb();
    await db.run("UPDATE snapshots SET archived = 0 WHERE id = ?", id);
    console.log(`Unarchived snapshot ${id}`);
    await db.close();
  });

program
  .command("delete-snapshot <id>")
  .description("Permanently delete a snapshot by ID")
  .action(async (id) => {
    const db = await openDb();
    await db.run("DELETE FROM snapshots WHERE id = ?", id);
    console.log(`Deleted snapshot ${id}`);
    await db.close();
  });

program
  .command("list-validations")
  .description("List all validations")
  .action(async () => {
    const db = await openDb();
    const rows = await db.all("SELECT * FROM validations");
    console.table(rows);
    await db.close();
  });

program
  .command("list-diffs")
  .description("List all diffs")
  .action(async () => {
    const db = await openDb();
    const rows = await db.all("SELECT * FROM diffs");
    console.table(rows);
    await db.close();
  });

program
  .command("export-data <table> <outputFile>")
  .description("Export table data (snapshots, validations, diffs) to JSON file")
  .action(async (table, outputFile) => {
    const db = await openDb();
    const rows = await db.all(`SELECT * FROM ${table}`);
    await db.close();
    const fs = await import("fs/promises");
    await fs.writeFile(outputFile, JSON.stringify(rows, null, 2), "utf-8");
    console.log(`Exported ${rows.length} rows from ${table} to ${outputFile}`);
  });

program
  .command("import-data <table> <inputFile>")
  .description("Import JSON data into table (snapshots, validations, diffs)")
  .action(async (table, inputFile) => {
    const db = await openDb();
    const fs = await import("fs/promises");
    const content = await fs.readFile(inputFile, "utf-8");
    const rows = JSON.parse(content);
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(",");
    const stmt = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`;
    for (const row of rows) {
      await db.run(stmt, ...columns.map((col) => row[col]));
    }
    await db.close();
    console.log(`Imported ${rows.length} rows into ${table} from ${inputFile}`);
  });

program
  .command("validate-snapshot <snapshot_id> <selector> <text>")
  .description("Validate a snapshot's DOM for selector and expected text")
  .action(async (snapshot_id, selector, text) => {
    const db = await openDb();
    const row = await db.get("SELECT dom FROM snapshots WHERE id = ?", snapshot_id);
    if (!row) {
      console.error("Snapshot not found");
      await db.close();
      return;
    }
    const dom = row.dom;
    const found = dom.includes(selector) && dom.includes(text);
    const resultObj = { selector, expectedText: text, found };
    await db.run(
      "INSERT INTO validations (snapshot_id, result) VALUES (?, ?)",
      snapshot_id,
      JSON.stringify(resultObj)
    );
    console.log(`Validation result: ${JSON.stringify(resultObj, null, 2)}`);
    await db.close();
  });

program
  .command("compare-snapshots <snapshot_id_a> <snapshot_id_b>")
  .description("Compare two snapshots and save diff + score")
  .action(async (idA, idB) => {
    const db = await openDb();
    const rowA = await db.get("SELECT image FROM snapshots WHERE id = ?", idA);
    const rowB = await db.get("SELECT image FROM snapshots WHERE id = ?", idB);
    if (!rowA || !rowB) {
      console.error("One or both snapshots not found");
      await db.close();
      return;
    }
    const { PNG } = await import("pngjs");
    const pixelmatch = (await import("pixelmatch")).default;
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
      { threshold: 0.1 }
    );
    const diffBuffer = PNG.sync.write(diff);
    await db.run(
      "INSERT INTO diffs (snapshot_id_a, snapshot_id_b, diff_image, score) VALUES (?, ?, ?, ?)",
      idA,
      idB,
      diffBuffer,
      score
    );
    console.log(`Diff score: ${score}`);
    await db.close();
  });

program.parseAsync(process.argv);
