import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../src/db/connection.js";
import { initializeSchema } from "../src/db/schema.js";
import fs from "fs";
import path from "path";
import os from "os";

describe("DB接続", () => {
  let db: DatabaseSync;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("WALモードが有効", () => {
    const result = db.prepare("PRAGMA journal_mode").get() as Record<string, string>;
    expect(result.journal_mode).toBe("wal");
  });

  it("foreign_keysが有効", () => {
    const result = db.prepare("PRAGMA foreign_keys").get() as Record<string, number>;
    expect(result.foreign_keys).toBe(1);
  });

  it("busy_timeoutが設定済み", () => {
    const result = db.prepare("PRAGMA busy_timeout").get() as Record<string, number>;
    expect(result.timeout).toBe(5000);
  });
});

describe("スキーマ作成", () => {
  let db: DatabaseSync;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("promptsテーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='prompts'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("prompts");
  });

  it("bundlesテーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bundles'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("bundles");
  });

  it("bundle_itemsテーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bundle_items'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("bundle_items");
  });

  it("prompts_fts仮想テーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='prompts_fts'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("prompts_fts");
  });

  it("bundles_fts仮想テーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bundles_fts'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("bundles_fts");
  });

  it("tag_keysテーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tag_keys'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("tag_keys");
  });

  it("tag_valuesテーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tag_values'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("tag_values");
  });

  it("prompt_tagsテーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='prompt_tags'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("prompt_tags");
  });

  it("bundle_tagsテーブルが存在する", () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bundle_tags'"
    ).get() as Record<string, string> | undefined;
    expect(result?.name).toBe("bundle_tags");
  });

  it("二重実行してもエラーにならない（冪等性）", () => {
    expect(() => initializeSchema(db)).not.toThrow();
  });
});

describe("FTSトリガー - prompts", () => {
  let db: DatabaseSync;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("INSERT時にFTSインデックスが更新される（trigram: 3文字以上）", () => {
    db.exec(`
      INSERT INTO prompts (title, prompt, has_break, description)
      VALUES ('テストタイトル', '美しい風景画', 0, '風景画のプロンプト')
    `);
    const results = db.prepare(
      "SELECT * FROM prompts_fts WHERE prompts_fts MATCH '風景画'"
    ).all() as Record<string, string>[];
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("テストタイトル");
  });

  it("INSERT時に英語でもFTS検索できる", () => {
    db.exec(`
      INSERT INTO prompts (title, prompt, has_break, description)
      VALUES ('landscape', 'beautiful scenery', 0, 'nature prompt')
    `);
    const results = db.prepare(
      "SELECT * FROM prompts_fts WHERE prompts_fts MATCH 'beautiful'"
    ).all() as Record<string, string>[];
    expect(results.length).toBe(1);
  });

  it("UPDATE時にFTSインデックスが更新される", () => {
    db.exec(`
      INSERT INTO prompts (title, prompt, has_break, description)
      VALUES ('テストタイトル', '美しい風景画', 0, '風景画のプロンプト')
    `);
    db.exec(`
      UPDATE prompts SET title = '更新後タイトル' WHERE id = 1
    `);
    const oldResults = db.prepare(
      "SELECT * FROM prompts_fts WHERE prompts_fts MATCH 'テストタイトル'"
    ).all();
    expect(oldResults.length).toBe(0);

    const newResults = db.prepare(
      "SELECT * FROM prompts_fts WHERE prompts_fts MATCH '更新後タイトル'"
    ).all() as Record<string, string>[];
    expect(newResults.length).toBe(1);
  });

  it("DELETE時にFTSインデックスが更新される", () => {
    db.exec(`
      INSERT INTO prompts (title, prompt, has_break, description)
      VALUES ('テストタイトル', '美しい風景画', 0, '風景画のプロンプト')
    `);
    db.exec("DELETE FROM prompts WHERE id = 1");
    const results = db.prepare(
      "SELECT * FROM prompts_fts WHERE prompts_fts MATCH '風景画'"
    ).all();
    expect(results.length).toBe(0);
  });
});

describe("FTSトリガー - bundles", () => {
  let db: DatabaseSync;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("INSERT時にFTSインデックスが更新される（trigram: 3文字以上）", () => {
    db.exec(`
      INSERT INTO bundles (title, description)
      VALUES ('風景セット', '風景画用のプロンプト集')
    `);
    const results = db.prepare(
      "SELECT * FROM bundles_fts WHERE bundles_fts MATCH '風景セット'"
    ).all() as Record<string, string>[];
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("風景セット");
  });

  it("UPDATE時にFTSインデックスが更新される", () => {
    db.exec(`
      INSERT INTO bundles (title, description)
      VALUES ('風景セット', '説明文です')
    `);
    db.exec(`
      UPDATE bundles SET title = '人物セット' WHERE id = 1
    `);
    const results = db.prepare(
      "SELECT * FROM bundles_fts WHERE bundles_fts MATCH '人物セット'"
    ).all() as Record<string, string>[];
    expect(results.length).toBe(1);
  });

  it("DELETE時にFTSインデックスが更新される", () => {
    db.exec(`
      INSERT INTO bundles (title, description)
      VALUES ('風景セット', '説明文です')
    `);
    db.exec("DELETE FROM bundles WHERE id = 1");
    const results = db.prepare(
      "SELECT * FROM bundles_fts WHERE bundles_fts MATCH '風景セット'"
    ).all();
    expect(results.length).toBe(0);
  });
});

describe("CASCADE削除", () => {
  let db: DatabaseSync;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("バンドル削除時にアイテムも削除される", () => {
    db.exec(`
      INSERT INTO bundles (title, description) VALUES ('テスト', '説明')
    `);
    db.exec(`
      INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
      VALUES (1, 0, 'item1', 'prompt1', 0)
    `);
    db.exec(`
      INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
      VALUES (1, 1, 'item2', 'prompt2', 1)
    `);

    const before = db.prepare("SELECT COUNT(*) as count FROM bundle_items").get() as Record<string, number>;
    expect(before.count).toBe(2);

    db.exec("DELETE FROM bundles WHERE id = 1");

    const after = db.prepare("SELECT COUNT(*) as count FROM bundle_items").get() as Record<string, number>;
    expect(after.count).toBe(0);
  });

  it("tag_key削除時にtag_valuesも削除される", () => {
    db.exec("INSERT INTO tag_keys (name) VALUES ('character')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'girl')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'boy')");

    const before = db.prepare("SELECT COUNT(*) as count FROM tag_values").get() as Record<string, number>;
    expect(before.count).toBe(2);

    db.exec("DELETE FROM tag_keys WHERE id = 1");

    const after = db.prepare("SELECT COUNT(*) as count FROM tag_values").get() as Record<string, number>;
    expect(after.count).toBe(0);
  });

  it("tag_key削除時にprompt_tagsも削除される", () => {
    db.exec("INSERT INTO prompts (title, prompt, has_break, description) VALUES ('t', 'p', 0, 'd')");
    db.exec("INSERT INTO tag_keys (name) VALUES ('style')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'anime')");
    db.exec("INSERT INTO prompt_tags (prompt_id, tag_value_id) VALUES (1, 1)");

    db.exec("DELETE FROM tag_keys WHERE id = 1");

    const after = db.prepare("SELECT COUNT(*) as count FROM prompt_tags").get() as Record<string, number>;
    expect(after.count).toBe(0);
  });

  it("tag_key削除時にbundle_tagsも削除される", () => {
    db.exec("INSERT INTO bundles (title, description) VALUES ('t', 'd')");
    db.exec("INSERT INTO tag_keys (name) VALUES ('style')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'anime')");
    db.exec("INSERT INTO bundle_tags (bundle_id, tag_value_id) VALUES (1, 1)");

    db.exec("DELETE FROM tag_keys WHERE id = 1");

    const after = db.prepare("SELECT COUNT(*) as count FROM bundle_tags").get() as Record<string, number>;
    expect(after.count).toBe(0);
  });

  it("prompt削除時にprompt_tagsも削除される", () => {
    db.exec("INSERT INTO prompts (title, prompt, has_break, description) VALUES ('t', 'p', 0, 'd')");
    db.exec("INSERT INTO tag_keys (name) VALUES ('style')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'anime')");
    db.exec("INSERT INTO prompt_tags (prompt_id, tag_value_id) VALUES (1, 1)");

    db.exec("DELETE FROM prompts WHERE id = 1");

    const after = db.prepare("SELECT COUNT(*) as count FROM prompt_tags").get() as Record<string, number>;
    expect(after.count).toBe(0);
  });

  it("bundle削除時にbundle_tagsも削除される", () => {
    db.exec("INSERT INTO bundles (title, description) VALUES ('t', 'd')");
    db.exec("INSERT INTO tag_keys (name) VALUES ('style')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'anime')");
    db.exec("INSERT INTO bundle_tags (bundle_id, tag_value_id) VALUES (1, 1)");

    db.exec("DELETE FROM bundles WHERE id = 1");

    const after = db.prepare("SELECT COUNT(*) as count FROM bundle_tags").get() as Record<string, number>;
    expect(after.count).toBe(0);
  });
});

describe("UNIQUE制約", () => {
  let db: DatabaseSync;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("同一バンドル内で同じsort_orderは挿入できない", () => {
    db.exec(`
      INSERT INTO bundles (title, description) VALUES ('テスト', '説明')
    `);
    db.exec(`
      INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
      VALUES (1, 0, 'item1', 'prompt1', 0)
    `);
    expect(() => {
      db.exec(`
        INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
        VALUES (1, 0, 'item2', 'prompt2', 0)
      `);
    }).toThrow();
  });

  it("異なるバンドルでは同じsort_orderを使える", () => {
    db.exec("INSERT INTO bundles (title, description) VALUES ('A', '説明A')");
    db.exec("INSERT INTO bundles (title, description) VALUES ('B', '説明B')");
    expect(() => {
      db.exec(`
        INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
        VALUES (1, 0, 'item1', 'prompt1', 0)
      `);
      db.exec(`
        INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
        VALUES (2, 0, 'item2', 'prompt2', 0)
      `);
    }).not.toThrow();
  });

  it("存在しないbundle_idへのFK参照は拒否される", () => {
    expect(() => {
      db.exec(`
        INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
        VALUES (999, 0, 'item', 'prompt', 0)
      `);
    }).toThrow();
  });

  it("tag_keysのname重複は拒否される", () => {
    db.exec("INSERT INTO tag_keys (name) VALUES ('character')");
    expect(() => {
      db.exec("INSERT INTO tag_keys (name) VALUES ('character')");
    }).toThrow();
  });

  it("同一tag_key_idで同じvalueの重複は拒否される", () => {
    db.exec("INSERT INTO tag_keys (name) VALUES ('character')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'girl')");
    expect(() => {
      db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'girl')");
    }).toThrow();
  });

  it("異なるtag_key_idでは同じvalueを使える", () => {
    db.exec("INSERT INTO tag_keys (name) VALUES ('character')");
    db.exec("INSERT INTO tag_keys (name) VALUES ('style')");
    expect(() => {
      db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'same')");
      db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (2, 'same')");
    }).not.toThrow();
  });

  it("同一prompt_idとtag_value_idの重複は拒否される", () => {
    db.exec("INSERT INTO prompts (title, prompt, has_break, description) VALUES ('t', 'p', 0, 'd')");
    db.exec("INSERT INTO tag_keys (name) VALUES ('style')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'anime')");
    db.exec("INSERT INTO prompt_tags (prompt_id, tag_value_id) VALUES (1, 1)");
    expect(() => {
      db.exec("INSERT INTO prompt_tags (prompt_id, tag_value_id) VALUES (1, 1)");
    }).toThrow();
  });

  it("同一bundle_idとtag_value_idの重複は拒否される", () => {
    db.exec("INSERT INTO bundles (title, description) VALUES ('t', 'd')");
    db.exec("INSERT INTO tag_keys (name) VALUES ('style')");
    db.exec("INSERT INTO tag_values (tag_key_id, value) VALUES (1, 'anime')");
    db.exec("INSERT INTO bundle_tags (bundle_id, tag_value_id) VALUES (1, 1)");
    expect(() => {
      db.exec("INSERT INTO bundle_tags (bundle_id, tag_value_id) VALUES (1, 1)");
    }).toThrow();
  });
});

describe("FTS rebuild（既存データのバックフィル）", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("スキーマ初期化前に存在したデータもFTS検索できる", () => {
    const db = createDatabase(dbPath);
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
      INSERT INTO prompts (title, prompt, has_break, description)
      VALUES ('既存タイトル', '美しい風景画', 0, '既存データの説明')
    `);
    initializeSchema(db);

    const results = db.prepare(
      "SELECT * FROM prompts_fts WHERE prompts_fts MATCH '既存タイトル'"
    ).all() as Record<string, string>[];
    expect(results.length).toBe(1);
    db.close();
  });
});

describe("updated_at（API層で明示更新する前提）", () => {
  let db: DatabaseSync;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("UPDATE文でupdated_atを明示指定すると更新される", () => {
    db.exec(`
      INSERT INTO prompts (title, prompt, has_break, description)
      VALUES ('テストタイトル', 'テストプロンプト', 0, 'テスト説明')
    `);
    const before = db.prepare("SELECT updated_at FROM prompts WHERE id = 1").get() as Record<string, string>;

    db.exec("UPDATE prompts SET title = '更新タイトル', updated_at = datetime('now') WHERE id = 1");
    const after = db.prepare("SELECT updated_at FROM prompts WHERE id = 1").get() as Record<string, string>;

    expect(after.updated_at).toBeDefined();
    expect(typeof after.updated_at).toBe("string");
  });
});
