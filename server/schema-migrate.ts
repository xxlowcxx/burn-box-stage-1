/**
 * Lightweight SQLite column migrations for Stage 2 fields.
 * Runs on boot so existing data.db keeps working without a full reset.
 */

import type Database from "better-sqlite3";

const COLUMNS: { table: string; name: string; ddl: string }[] = [
  { table: "files", name: "display_name", ddl: "TEXT" },
  { table: "files", name: "folder", ddl: "TEXT DEFAULT ''" },
  { table: "files", name: "tags", ddl: "TEXT" }, // JSON array
  { table: "files", name: "storage_backend", ddl: "TEXT DEFAULT 'local'" },
  { table: "files", name: "remote_url", ddl: "TEXT" },
  { table: "files", name: "parent_file_id", ddl: "INTEGER" }, // convert lineage
  { table: "files", name: "converted_from", ddl: "TEXT" },
];

export function migrateStage2Columns(sqlite: Database.Database): void {
  for (const col of COLUMNS) {
    const rows = sqlite
      .prepare(`PRAGMA table_info(${col.table})`)
      .all() as { name: string }[];
    if (rows.some((r) => r.name === col.name)) continue;
    sqlite.exec(`ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.ddl}`);
  }
}
