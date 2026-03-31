import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { createDatabase } from "../src/db/connection.js";
import type { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import os from "os";
import { createTestAvifBuffer } from "./test-image.js";

describe("Admin Export API", () => {
  let db: DatabaseSync;
  let app: ReturnType<typeof createApp>;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-export-test-"));
    dbPath = path.join(tmpDir, "db.sqlite");
    db = createDatabase(dbPath);
    app = createApp(db, tmpDir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("GET /api/admin/export/json", () => {
    it("空DBでエクスポートできる", async () => {
      const res = await request(app).get("/api/admin/export/json");
      expect(res.status).toBe(200);
      expect(res.body.version).toBe(2);
      expect(res.body.exportedAt).toBeTruthy();
      expect(res.body.tag_keys).toEqual([]);
      expect(res.body.prompts).toEqual([]);
      expect(res.body.bundles).toEqual([]);
    });

    it("Content-Dispositionヘッダーが設定される", async () => {
      const res = await request(app).get("/api/admin/export/json");
      expect(res.headers["content-disposition"]).toMatch(
        /attachment; filename="aipm-export-\d{8}\.json"/,
      );
    });

    it("プロンプトとバンドルがエクスポートされる", async () => {
      await request(app)
        .post("/api/prompts")
        .field("title", "テスト")
        .field("prompt", "test prompt")
        .field("description", "説明");

      await request(app)
        .post("/api/bundles")
        .field("title", "バンドル")
        .field("description", "バンドル説明")
        .field(
          "items",
          JSON.stringify([
            { title: "item1", prompt: "p1", has_break: false },
          ]),
        );

      const res = await request(app).get("/api/admin/export/json");
      expect(res.body.prompts).toHaveLength(1);
      expect(res.body.prompts[0].title).toBe("テスト");
      expect(res.body.prompts[0]).not.toHaveProperty("id");
      expect(res.body.bundles).toHaveLength(1);
      expect(res.body.bundles[0].title).toBe("バンドル");
      expect(res.body.bundles[0].items).toHaveLength(1);
      expect(res.body.bundles[0].items[0].title).toBe("item1");
    });

    it("画像なしの場合image_dataが含まれない", async () => {
      await request(app)
        .post("/api/prompts")
        .field("title", "テスト")
        .field("prompt", "test")
        .field("description", "説明");

      const res = await request(app).get(
        "/api/admin/export/json?includeImages=true",
      );
      expect(res.body.prompts[0]).not.toHaveProperty("image_data");
    });

    it("includeImages=trueで画像がbase64エンコードされる", async () => {
      const imagesDir = path.join(tmpDir, "images");
      const testImage = await createTestAvifBuffer();
      fs.writeFileSync(path.join(imagesDir, "test.avif"), testImage);

      db.prepare(
        "INSERT INTO prompts (title, prompt, has_break, description, image_path) VALUES (?, ?, ?, ?, ?)",
      ).run("テスト", "test", 0, "説明", "test.avif");

      const res = await request(app).get(
        "/api/admin/export/json?includeImages=true",
      );
      expect(res.body.prompts[0].image_data).toMatch(
        /^data:image\/avif;base64,/,
      );
    });

    it("includeImages=falseではimage_dataが含まれない", async () => {
      db.prepare(
        "INSERT INTO prompts (title, prompt, has_break, description, image_path) VALUES (?, ?, ?, ?, ?)",
      ).run("テスト", "test", 0, "説明", "test.png");

      const res = await request(app).get(
        "/api/admin/export/json?includeImages=false",
      );
      expect(res.body.prompts[0]).not.toHaveProperty("image_data");
    });

    it("タグ付きデータがエクスポートされる", async () => {
      await request(app).post("/api/tags/keys").send({ name: "character" });
      await request(app).post("/api/tags/keys/1/values").send({ value: "girl" });
      await request(app).post("/api/tags/keys/1/values").send({ value: "unused_value" });

      await request(app)
        .post("/api/prompts")
        .field("title", "タグ付き")
        .field("prompt", "tagged")
        .field("description", "説明")
        .field("tags", JSON.stringify([{ key_id: 1, value: "girl" }]));

      const res = await request(app).get("/api/admin/export/json");
      expect(res.body.version).toBe(2);
      expect(res.body.tag_keys).toHaveLength(1);
      expect(res.body.tag_keys[0].name).toBe("character");
      expect(res.body.tag_keys[0].values).toContain("girl");
      expect(res.body.tag_keys[0].values).toContain("unused_value");
      expect(res.body.prompts[0].tags).toHaveLength(1);
      expect(res.body.prompts[0].tags[0].key).toBe("character");
      expect(res.body.prompts[0].tags[0].value).toBe("girl");
    });
  });

  describe("GET /api/admin/export/db", () => {
    it("SQLiteファイルをダウンロードできる", async () => {
      const res = await request(app)
        .get("/api/admin/export/db")
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => callback(null, Buffer.concat(chunks)));
        });
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/x-sqlite3/);
      expect(res.headers["content-disposition"]).toMatch(
        /attachment; filename="aipm-db-\d{8}\.sqlite"/,
      );
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });

    it("ダウンロードしたファイルが有効なSQLiteである", async () => {
      const res = await request(app)
        .get("/api/admin/export/db")
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => callback(null, Buffer.concat(chunks)));
        });

      const downloadPath = path.join(tmpDir, "downloaded.sqlite");
      fs.writeFileSync(downloadPath, res.body as Buffer);

      const downloadedDb = createDatabase(downloadPath);
      const count = (
        downloadedDb
          .prepare("SELECT COUNT(*) as count FROM prompts")
          .get() as Record<string, number>
      ).count;
      expect(count).toBe(0);
      downloadedDb.close();
    });
  });
});
