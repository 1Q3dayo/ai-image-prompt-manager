import type { DatabaseSync } from "node:sqlite";

export function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      has_break INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bundle_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      has_break INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
      UNIQUE(bundle_id, sort_order)
    )
  `);

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
      title, prompt, description, content='prompts', content_rowid='id',
      tokenize='trigram'
    )
  `);

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS bundles_fts USING fts5(
      title, description, content='bundles', content_rowid='id',
      tokenize='trigram'
    )
  `);

  initializeTriggers(db);
  rebuildFtsIndex(db);
}

function rebuildFtsIndex(db: DatabaseSync): void {
  db.exec("INSERT INTO prompts_fts(prompts_fts) VALUES ('rebuild')");
  db.exec("INSERT INTO bundles_fts(bundles_fts) VALUES ('rebuild')");
}

function initializeTriggers(db: DatabaseSync): void {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
      INSERT INTO prompts_fts(rowid, title, prompt, description)
      VALUES (new.id, new.title, new.prompt, new.description);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
      INSERT INTO prompts_fts(prompts_fts, rowid, title, prompt, description)
      VALUES ('delete', old.id, old.title, old.prompt, old.description);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
      INSERT INTO prompts_fts(prompts_fts, rowid, title, prompt, description)
      VALUES ('delete', old.id, old.title, old.prompt, old.description);
      INSERT INTO prompts_fts(rowid, title, prompt, description)
      VALUES (new.id, new.title, new.prompt, new.description);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS bundles_ai AFTER INSERT ON bundles BEGIN
      INSERT INTO bundles_fts(rowid, title, description)
      VALUES (new.id, new.title, new.description);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS bundles_ad AFTER DELETE ON bundles BEGIN
      INSERT INTO bundles_fts(bundles_fts, rowid, title, description)
      VALUES ('delete', old.id, old.title, old.description);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS bundles_au AFTER UPDATE ON bundles BEGIN
      INSERT INTO bundles_fts(bundles_fts, rowid, title, description)
      VALUES ('delete', old.id, old.title, old.description);
      INSERT INTO bundles_fts(rowid, title, description)
      VALUES (new.id, new.title, new.description);
    END
  `);

}
