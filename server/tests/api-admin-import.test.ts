import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { createDatabase } from "../src/db/connection.js";
import type { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import os from "os";
import { createTestPngBuffer, isAvifFile } from "./test-image.js";

describe("Admin Import API", () => {
  let db: DatabaseSync;
  let app: ReturnType<typeof createApp>;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-import-test-"));
    dbPath = path.join(tmpDir, "db.sqlite");
    db = createDatabase(dbPath);
    app = createApp(db, tmpDir);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // DBリストアテストで既にcloseされている場合がある
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("POST /api/admin/import/json", () => {
    it("replaceモードで全データが置き換わる", async () => {
      await request(app)
        .post("/api/prompts")
        .field("title", "既存")
        .field("prompt", "existing")
        .field("description", "説明");

      const exportData = {
        version: 1,
        prompts: [
          {
            title: "インポート1",
            prompt: "imported1",
            has_break: 0,
            description: "説明1",
            image_path: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
          {
            title: "インポート2",
            prompt: "imported2",
            has_break: 1,
            description: "説明2",
            image_path: null,
            created_at: "2026-01-02T00:00:00.000Z",
            updated_at: "2026-01-02T00:00:00.000Z",
          },
        ],
        bundles: [
          {
            title: "バンドル1",
            description: "バンドル説明",
            image_path: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            items: [
              { sort_order: 0, title: "item1", prompt: "p1", has_break: 0 },
            ],
          },
        ],
      };

      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from(JSON.stringify(exportData)), "export.json");

      expect(res.status).toBe(200);
      expect(res.body.imported.prompts).toBe(2);
      expect(res.body.imported.bundles).toBe(1);

      const promptsRes = await request(app).get("/api/prompts");
      expect(promptsRes.body.total).toBe(2);

      const bundlesRes = await request(app).get("/api/bundles");
      expect(bundlesRes.body.total).toBe(1);
    });

    it("appendモードで既存データに追加される", async () => {
      await request(app)
        .post("/api/prompts")
        .field("title", "既存")
        .field("prompt", "existing")
        .field("description", "説明");

      const exportData = {
        version: 1,
        prompts: [
          {
            title: "追加",
            prompt: "appended",
            has_break: 0,
            description: "追加説明",
            image_path: null,
          },
        ],
        bundles: [],
      };

      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "append")
        .attach("file", Buffer.from(JSON.stringify(exportData)), "export.json");

      expect(res.status).toBe(200);
      expect(res.body.imported.prompts).toBe(1);

      const promptsRes = await request(app).get("/api/prompts");
      expect(promptsRes.body.total).toBe(2);
    });

    it("base64画像が復元される", async () => {
      const pngData = await createTestPngBuffer();
      const base64 = `data:image/png;base64,${pngData.toString("base64")}`;

      const exportData = {
        version: 1,
        prompts: [
          {
            title: "画像付き",
            prompt: "with image",
            has_break: 0,
            description: "説明",
            image_path: null,
            image_data: base64,
          },
        ],
        bundles: [],
      };

      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from(JSON.stringify(exportData)), "export.json");

      expect(res.status).toBe(200);
      expect(res.body.imported.images).toBe(1);

      const imagesDir = path.join(tmpDir, "images");
      const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith(".avif"));
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(isAvifFile(path.join(imagesDir, files[0]))).toBe(true);
    });

    it("version 2のタグ付きデータをインポートできる（replace）", async () => {
      const exportData = {
        version: 2,
        tag_keys: [
          { name: "character", sort_order: 0, values: ["girl", "boy", "unused"] },
        ],
        prompts: [
          {
            title: "タグ付き",
            prompt: "tagged",
            has_break: 0,
            description: "説明",
            tags: [{ key: "character", value: "girl" }],
          },
        ],
        bundles: [
          {
            title: "バンドル",
            description: "説明",
            items: [],
            tags: [{ key: "character", value: "boy" }],
          },
        ],
      };

      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from(JSON.stringify(exportData)), "export.json");

      expect(res.status).toBe(200);

      const keys = await request(app).get("/api/tags/keys?includeValues=true");
      expect(keys.body).toHaveLength(1);
      expect(keys.body[0].name).toBe("character");
      expect(keys.body[0].values).toHaveLength(3);

      const prompts = await request(app).get("/api/prompts");
      expect(prompts.body.data[0].tags).toHaveLength(1);
      expect(prompts.body.data[0].tags[0].value).toBe("girl");

      const bundles = await request(app).get("/api/bundles");
      expect(bundles.body.data[0].tags).toHaveLength(1);
      expect(bundles.body.data[0].tags[0].value).toBe("boy");
    });

    it("version 1のデータはタグなしでインポートできる（後方互換）", async () => {
      const exportData = {
        version: 1,
        prompts: [
          { title: "v1", prompt: "old", has_break: 0, description: "旧形式" },
        ],
        bundles: [],
      };

      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from(JSON.stringify(exportData)), "export.json");

      expect(res.status).toBe(200);
      expect(res.body.imported.prompts).toBe(1);
    });

    it("エクスポート→インポートのround-tripでタグが保持される", async () => {
      await request(app).post("/api/tags/keys").send({ name: "style" });
      const keyRes = await request(app).get("/api/tags/keys");
      const keyId = keyRes.body[0].id;

      await request(app)
        .post("/api/prompts")
        .field("title", "roundtrip")
        .field("prompt", "test")
        .field("description", "説明")
        .field("tags", JSON.stringify([{ key_id: keyId, value: "anime" }]));

      const exportRes = await request(app).get("/api/admin/export/json");

      await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from(JSON.stringify(exportRes.body)), "export.json");

      const prompts = await request(app).get("/api/prompts");
      expect(prompts.body.data[0].tags).toHaveLength(1);
      expect(prompts.body.data[0].tags[0].key_name).toBe("style");
      expect(prompts.body.data[0].tags[0].value).toBe("anime");
    });

    it("ファイルなしでエラーになる", async () => {
      const res = await request(app).post("/api/admin/import/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ファイル/);
    });

    it("不正なJSONでエラーになる", async () => {
      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from("not json"), "bad.json");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/JSON/);
    });

    it("不正な形式のエクスポートファイルでエラーになる", async () => {
      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from(JSON.stringify({ foo: "bar" })), "bad.json");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/形式/);
    });

    it("不正なmodeでエラーになる", async () => {
      const exportData = { version: 1, prompts: [], bundles: [] };
      const res = await request(app)
        .post("/api/admin/import/json")
        .field("mode", "invalid")
        .attach("file", Buffer.from(JSON.stringify(exportData)), "export.json");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/mode/);
    });

    it("バンドルのitemsが正しくインポートされる", async () => {
      const exportData = {
        version: 1,
        prompts: [],
        bundles: [
          {
            title: "バンドル",
            description: "説明",
            image_path: null,
            items: [
              { sort_order: 0, title: "A", prompt: "pa", has_break: 0 },
              { sort_order: 1, title: "B", prompt: "pb", has_break: 1 },
            ],
          },
        ],
      };

      await request(app)
        .post("/api/admin/import/json")
        .field("mode", "replace")
        .attach("file", Buffer.from(JSON.stringify(exportData)), "export.json");

      const bundlesRes = await request(app).get("/api/bundles");
      const bundleId = bundlesRes.body.data[0].id;
      const detailRes = await request(app).get(`/api/bundles/${bundleId}`);
      expect(detailRes.body.items).toHaveLength(2);
      expect(detailRes.body.items[0].title).toBe("A");
      expect(detailRes.body.items[1].title).toBe("B");
    });
  });

  describe("POST /api/admin/import/db", () => {
    it("有効なSQLiteファイルでリストアできる", async () => {
      await request(app)
        .post("/api/prompts")
        .field("title", "元データ")
        .field("prompt", "original")
        .field("description", "説明");

      const exportRes = await request(app)
        .get("/api/admin/export/db")
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => callback(null, Buffer.concat(chunks)));
        });

      await request(app)
        .post("/api/prompts")
        .field("title", "追加データ")
        .field("prompt", "added")
        .field("description", "追加説明");

      let statsRes = await request(app).get("/api/admin/stats");
      expect(statsRes.body.promptCount).toBe(2);

      const restoreRes = await request(app)
        .post("/api/admin/import/db")
        .attach("file", exportRes.body as Buffer, "backup.sqlite");

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.status).toBe("ok");

      statsRes = await request(app).get("/api/admin/stats");
      expect(statsRes.body.promptCount).toBe(1);
    });

    it("ファイルなしでエラーになる", async () => {
      const res = await request(app).post("/api/admin/import/db");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ファイル/);
    });

    it("無効なSQLiteファイルでエラーになる", async () => {
      const res = await request(app)
        .post("/api/admin/import/db")
        .attach("file", Buffer.from("not a sqlite file"), "bad.sqlite");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/SQLite/);
    });

    it("必要なテーブルがないDBでエラーになる", async () => {
      const emptyDbPath = path.join(tmpDir, "empty.sqlite");
      const emptyDb = createDatabase(emptyDbPath);
      emptyDb.exec("CREATE TABLE dummy (id INTEGER PRIMARY KEY)");
      emptyDb.close();

      const dbBuffer = fs.readFileSync(emptyDbPath);
      const res = await request(app)
        .post("/api/admin/import/db")
        .attach("file", dbBuffer, "empty.sqlite");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/テーブル/);
    });
  });
});
