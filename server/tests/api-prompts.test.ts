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

    it("copy_image_fromで既存画像をコピーして保存できる", async () => {
      const pngBuffer = await createTestPngBuffer();
      const original = await request(app)
        .post("/api/prompts")
        .field("title", "元プロンプト")
        .field("prompt", "original")
        .field("description", "元の説明")
        .attach("image", pngBuffer, { filename: "sample.png", contentType: "image/png" });

      const res = await request(app)
        .post("/api/prompts")
        .field("title", "コピー")
        .field("prompt", "copied")
        .field("description", "コピーの説明")
        .field("copy_image_from", original.body.image_path);

      expect(res.status).toBe(201);
      expect(res.body.image_path).toMatch(/\.avif$/);
      expect(res.body.image_path).not.toBe(original.body.image_path);

      const copiedPath = path.join(tmpDir, "images", res.body.image_path);
      expect(fs.existsSync(copiedPath)).toBe(true);

      const originalPath = path.join(tmpDir, "images", original.body.image_path);
      expect(fs.existsSync(originalPath)).toBe(true);
    });

    it("copy_image_fromに不正なパスを指定すると400エラー", async () => {
      const res = await request(app)
        .post("/api/prompts")
        .field("title", "不正パス")
        .field("prompt", "test")
        .field("description", "説明")
        .field("copy_image_from", "../../../etc/passwd");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("画像のコピーに失敗しました");
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

  describe("タグ付与 (prompts)", () => {
    let keyId: number;

    beforeEach(async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      keyId = keyRes.body.id;
    });

    it("POST時にタグ付きで保存できる", async () => {
      const tags = [{ key_id: keyId, value: "girl" }];
      const res = await request(app)
        .post("/api/prompts")
        .field("title", "タグ付き")
        .field("prompt", "tagged")
        .field("description", "説明")
        .field("tags", JSON.stringify(tags));

      expect(res.status).toBe(201);
      expect(res.body.tags).toHaveLength(1);
      expect(res.body.tags[0].key_name).toBe("character");
      expect(res.body.tags[0].value).toBe("girl");
    });

    it("PUT時にタグを更新できる", async () => {
      const created = await request(app)
        .post("/api/prompts")
        .field("title", "テスト")
        .field("prompt", "test")
        .field("description", "説明")
        .field("tags", JSON.stringify([{ key_id: keyId, value: "girl" }]));

      const res = await request(app)
        .put(`/api/prompts/${created.body.id}`)
        .field("tags", JSON.stringify([{ key_id: keyId, value: "boy" }]));

      expect(res.status).toBe(200);
      expect(res.body.tags).toHaveLength(1);
      expect(res.body.tags[0].value).toBe("boy");
    });

    it("一覧取得時にタグが含まれる", async () => {
      await request(app)
        .post("/api/prompts")
        .field("title", "タグ付き")
        .field("prompt", "tagged")
        .field("description", "説明")
        .field("tags", JSON.stringify([{ key_id: keyId, value: "girl" }]));

      const res = await request(app).get("/api/prompts");
      expect(res.body.data[0].tags).toHaveLength(1);
      expect(res.body.data[0].tags[0].key_name).toBe("character");
    });

    it("個別取得時にタグが含まれる", async () => {
      const created = await request(app)
        .post("/api/prompts")
        .field("title", "タグ付き")
        .field("prompt", "tagged")
        .field("description", "説明")
        .field("tags", JSON.stringify([{ key_id: keyId, value: "girl" }]));

      const res = await request(app).get(`/api/prompts/${created.body.id}`);
      expect(res.body.tags).toHaveLength(1);
    });

    it("11個以上のタグで400を返す", async () => {
      const tags = Array.from({ length: 11 }, (_, i) => ({
        key_id: keyId,
        value: `val${i}`,
      }));
      const res = await request(app)
        .post("/api/prompts")
        .field("title", "多すぎ")
        .field("prompt", "too many")
        .field("description", "説明")
        .field("tags", JSON.stringify(tags));

      expect(res.status).toBe(400);
    });

    it("存在しない値は自動作成される", async () => {
      const res = await request(app)
        .post("/api/prompts")
        .field("title", "新規値")
        .field("prompt", "new value")
        .field("description", "説明")
        .field("tags", JSON.stringify([{ key_id: keyId, value: "new_character" }]));

      expect(res.status).toBe(201);
      expect(res.body.tags[0].value).toBe("new_character");
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
