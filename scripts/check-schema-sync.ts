#!/usr/bin/env tsx
/**
 * Check that the worker's DB schema is in sync with the app's schema
 * for the tables they share (sites, auditResults, siteVersions).
 *
 * Run: npx tsx scripts/check-schema-sync.ts
 *
 * This script extracts column names from each shared table in both
 * schema files and reports any differences.
 */

import * as fs from "fs";

const APP_SCHEMA = "src/db/schema.ts";
const WORKER_SCHEMA = "worker/src/db/schema.ts";

const SHARED_TABLES = ["sites", "auditResults", "siteVersions"];

function extractTableBlock(content: string, tableName: string): string | null {
  // Match: export const <tableName> = pgTable("...", {  ... });
  // or with a third arg: export const <tableName> = pgTable("...", {  ... }, ...);
  const re = new RegExp(
    `export const ${tableName} = pgTable\\([^,]+,\\s*\\{([\\s\\S]*?)\\}(?:\\s*,\\s*\\([^)]*\\)\\s*=>\\s*\\[[^\\]]*\\])?\\s*\\);`,
    "m"
  );
  const match = content.match(re);
  return match ? match[1] : null;
}

function extractColumns(block: string): string[] {
  // Match column definitions like: columnName: type("db_name")
  const cols: string[] = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^\s+(\w+)\s*:/);
    if (m) cols.push(m[1]);
  }
  return cols;
}

const appContent = fs.readFileSync(APP_SCHEMA, "utf-8");
const workerContent = fs.readFileSync(WORKER_SCHEMA, "utf-8");

let hasErrors = false;

for (const table of SHARED_TABLES) {
  const appBlock = extractTableBlock(appContent, table);
  const workerBlock = extractTableBlock(workerContent, table);

  if (!appBlock) {
    console.error(`Table '${table}' not found in ${APP_SCHEMA}`);
    hasErrors = true;
    continue;
  }
  if (!workerBlock) {
    console.error(`Table '${table}' not found in ${WORKER_SCHEMA}`);
    hasErrors = true;
    continue;
  }

  const appCols = extractColumns(appBlock);
  const workerCols = extractColumns(workerBlock);

  const appOnly = appCols.filter((c) => !workerCols.includes(c));
  const workerOnly = workerCols.filter((c) => !appCols.includes(c));

  if (appOnly.length > 0 || workerOnly.length > 0) {
    hasErrors = true;
    console.error(`Schema drift in '${table}':`);
    if (appOnly.length > 0) {
      console.error(`  Columns in app but missing from worker: ${appOnly.join(", ")}`);
    }
    if (workerOnly.length > 0) {
      console.error(`  Columns in worker but missing from app: ${workerOnly.join(", ")}`);
    }
  }
}

if (hasErrors) {
  console.error("\nSchema sync check FAILED. Update both schemas to match.");
  process.exit(1);
} else {
  console.log("Schema sync check passed. App and worker schemas are in sync.");
}
