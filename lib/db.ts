import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export * from "@/lib/types"; // server code may import everything from here

const globalForDb = globalThis as unknown as { _ledgerDb?: Database.Database };

function open(): Database.Database {
  const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "ledger.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS liens (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id      INTEGER NOT NULL REFERENCES cases(id),
      provider     TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
      status       TEXT NOT NULL DEFAULT 'asserted'
                   CHECK (status IN ('asserted','verified','negotiating','reduced','paid','waived')),
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_liens_case ON liens(case_id);
  `);
  return db;
}

export const db = globalForDb._ledgerDb ?? (globalForDb._ledgerDb = open());
