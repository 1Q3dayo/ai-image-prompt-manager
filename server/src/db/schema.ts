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

  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_key_id INTEGER NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tag_key_id) REFERENCES tag_keys(id) ON DELETE CASCADE,
      UNIQUE(tag_key_id, value)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_tags (
      prompt_id INTEGER NOT NULL,
      tag_value_id INTEGER NOT NULL,
      PRIMARY KEY (prompt_id, tag_value_id),
      FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_value_id) REFERENCES tag_values(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bundle_tags (
      bundle_id INTEGER NOT NULL,
      tag_value_id INTEGER NOT NULL,
      PRIMARY KEY (bundle_id, tag_value_id),
      FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_value_id) REFERENCES tag_values(id) ON DELETE CASCADE
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_tag_values_key_id ON tag_values(tag_key_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags(prompt_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_prompt_tags_value_id ON prompt_tags(tag_value_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_bundle_tags_bundle_id ON bundle_tags(bundle_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_bundle_tags_value_id ON bundle_tags(tag_value_id)");

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
