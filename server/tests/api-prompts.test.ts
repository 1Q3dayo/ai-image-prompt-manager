import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { createDatabase } from "../src/db/connection.js";
import type { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import os from "os";
import { createTestPngBuffer, isAvifFile } from "./test-image.js";

describe("Prompts API", () => {
  let db: DatabaseSync;
  let app: ReturnType<typeof createApp>;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-api-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    app = createApp(db, tmpDir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("POST /api/prompts", () => {
    it("プロンプトを保存できる", async () => {
      const res = await request(app)
        .post("/api/prompts")
        .field("title", "テストタイトル")
        .field("prompt", "beautiful landscape")
        .field("has_break", "true")
        .field("description", "テスト説明文");

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("テストタイトル");
      expect(res.body.prompt).toBe("beautiful landscape");
      expect(res.body.has_break).toBe(1);
      expect(res.body.description).toBe("テスト説明文");
      expect(res.body.id).toBeDefined();
    });

    it("必須フィールドが欠けると400を返す", async () => {
      const res = await request(app)
        .post("/api/prompts")
        .field("title", "テスト");

      expect(res.status).toBe(400);
    });

    it("添付画像をAVIFに変換して保存できる", async () => {
      const pngBuffer = await createTestPngBuffer();

      const res = await request(app)
        .post("/api/prompts")
        .field("title", "画像付き")
        .field("prompt", "with image")
        .field("description", "説明")
        .attach("image", pngBuffer, {
          filename: "sample.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body.image_path).toMatch(/\.avif$/);

      const savedPath = path.join(tmpDir, "images", res.body.image_path);
      expect(fs.existsSync(savedPath)).toBe(true);
      expect(isAvifFile(savedPath)).toBe(true);
    });
  });

  describe("GET /api/prompts", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/prompts")
        .field("title", "風景タイトル")
        .field("prompt", "beautiful landscape")
        .field("has_break", "false")
        .field("description", "風景の説明");

      await request(app)
        .post("/api/prompts")
        .field("title", "人物タイトル")
        .field("prompt", "portrait photo")
        .field("has_break", "true")
        .field("description", "人物の説明");
    });

    it("一覧を取得できる", async () => {
      const res = await request(app).get("/api/prompts");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    it("limit/offsetでページネーションできる", async () => {
      const res = await request(app).get("/api/prompts?limit=1&offset=0");
      expect(res.body.data.length).toBe(1);
    });

    it("FTS検索できる（3文字以上）", async () => {
      const res = await request(app).get(
        "/api/prompts?q=landscape",
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe("風景タイトル");
    });

    it("LIKE検索できる（2文字以下）", async () => {
      const res = await request(app).get("/api/prompts?q=風景");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("日本語でFTS検索できる（3文字以上）", async () => {
      const res = await request(app).get(
        "/api/prompts?q=風景タイトル",
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe("GET /api/prompts/:id", () => {
    it("個別のプロンプトを取得できる", async () => {
      const created = await request(app)
        .post("/api/prompts")
        .field("title", "テスト")
        .field("prompt", "test prompt")
        .field("description", "テスト説明");

      const res = await request(app).get(
        `/api/prompts/${created.body.id}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("テスト");
    });

    it("存在しないIDは404を返す", async () => {
      const res = await request(app).get("/api/prompts/999");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/prompts/:id", () => {
    it("プロンプトを更新できる", async () => {
      const created = await request(app)
        .post("/api/prompts")
        .field("title", "元タイトル")
        .field("prompt", "original")
        .field("description", "元説明");

      const res = await request(app)
        .put(`/api/prompts/${created.body.id}`)
        .field("title", "更新タイトル");

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("更新タイトル");
      expect(res.body.prompt).toBe("original");
    });

    it("更新後にFTS検索で見つかる", async () => {
      const created = await request(app)
        .post("/api/prompts")
        .field("title", "元タイトル")
        .field("prompt", "original prompt text")
        .field("description", "元説明");

      await request(app)
        .put(`/api/prompts/${created.body.id}`)
        .field("title", "新しいタイトル名");

      const search = await request(app).get(
        "/api/prompts?q=新しいタイトル名",
      );
      expect(search.body.data.length).toBe(1);
    });
  });

  describe("DELETE /api/prompts/:id", () => {
    it("プロンプトを削除できる", async () => {
      const created = await request(app)
        .post("/api/prompts")
        .field("title", "削除テスト")
        .field("prompt", "delete me")
        .field("description", "削除対象");

      const res = await request(app).delete(
        `/api/prompts/${created.body.id}`,
      );
      expect(res.status).toBe(204);

      const check = await request(app).get(
        `/api/prompts/${created.body.id}`,
      );
      expect(check.status).toBe(404);
    });

    it("削除後にFTS検索でヒットしない", async () => {
      const created = await request(app)
        .post("/api/prompts")
        .field("title", "削除テスト")
        .field("prompt", "delete target prompt")
        .field("description", "削除対象の説明");

      await request(app).delete(`/api/prompts/${created.body.id}`);

      const search = await request(app).get(
        "/api/prompts?q=delete target",
      );
      expect(search.body.data.length).toBe(0);
    });
  });
});
