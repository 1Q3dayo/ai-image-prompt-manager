import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../../data");

export function getDbPath(): string {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, "db.sqlite");
}

export function createDatabase(dbPath?: string): DatabaseSync {
  const resolvedPath = dbPath ?? getDbPath();
  const db = new DatabaseSync(resolvedPath);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");

  return db;
}

let _db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!_db) {
    _db = createDatabase();
  }
  return _db;
}

export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
