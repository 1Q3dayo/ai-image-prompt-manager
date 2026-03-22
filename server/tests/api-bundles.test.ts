import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { createDatabase } from "../src/db/connection.js";
import type { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import os from "os";

describe("Bundles API", () => {
  let db: DatabaseSync;
  let app: ReturnType<typeof createApp>;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-api-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
    db = createDatabase(dbPath);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("POST /api/bundles", () => {
    it("バンドルを保存できる", async () => {
      const items = [
        { title: "背景", prompt: "beautiful landscape", has_break: true },
        { title: "人物", prompt: "portrait photo", has_break: false },
      ];
      const res = await request(app)
        .post("/api/bundles")
        .field("title", "テストバンドル")
        .field("description", "テスト説明文")
        .field("items", JSON.stringify(items));

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("テストバンドル");
      expect(res.body.description).toBe("テスト説明文");
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].title).toBe("背景");
      expect(res.body.items[0].prompt).toBe("beautiful landscape");
      expect(res.body.items[0].has_break).toBe(1);
      expect(res.body.items[0].sort_order).toBe(0);
      expect(res.body.items[1].title).toBe("人物");
      expect(res.body.items[1].has_break).toBe(0);
      expect(res.body.items[1].sort_order).toBe(1);
    });

    it("itemsなしでもバンドルを保存できる", async () => {
      const res = await request(app)
        .post("/api/bundles")
        .field("title", "空バンドル")
        .field("description", "アイテムなし");

      expect(res.status).toBe(201);
      expect(res.body.items).toHaveLength(0);
    });

    it("必須フィールドが欠けると400を返す", async () => {
      const res = await request(app)
        .post("/api/bundles")
        .field("title", "タイトルのみ");

      expect(res.status).toBe(400);
    });

    it("不正なitemsJSONで400を返す", async () => {
      const res = await request(app)
        .post("/api/bundles")
        .field("title", "テスト")
        .field("description", "テスト")
        .field("items", "invalid json");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/bundles", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/bundles")
        .field("title", "風景バンドル")
        .field("description", "風景プロンプト集")
        .field(
          "items",
          JSON.stringify([
            { title: "山", prompt: "mountain view", has_break: false },
          ]),
        );

      await request(app)
        .post("/api/bundles")
        .field("title", "人物バンドル")
        .field("description", "人物プロンプト集")
        .field(
          "items",
          JSON.stringify([
            { title: "女性", prompt: "portrait woman", has_break: true },
          ]),
        );
    });

    it("一覧を取得できる", async () => {
      const res = await request(app).get("/api/bundles");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    it("limit/offsetでページネーションできる", async () => {
      const res = await request(app).get("/api/bundles?limit=1&offset=0");
      expect(res.body.data.length).toBe(1);
    });

    it("FTS検索できる（3文字以上）", async () => {
      const res = await request(app).get("/api/bundles?q=風景バンドル");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe("風景バンドル");
    });

    it("LIKE検索できる（2文字以下）", async () => {
      const res = await request(app).get("/api/bundles?q=風景");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("descriptionでFTS検索できる", async () => {
      const res = await request(app).get("/api/bundles?q=人物プロンプト集");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe("人物バンドル");
    });
  });

  describe("GET /api/bundles/:id", () => {
    it("個別のバンドルをitems付きで取得できる", async () => {
      const items = [
        { title: "背景", prompt: "landscape", has_break: false },
        { title: "前景", prompt: "foreground", has_break: true },
      ];
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "テスト")
        .field("description", "テスト説明")
        .field("items", JSON.stringify(items));

      const res = await request(app).get(
        `/api/bundles/${created.body.id}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("テスト");
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].sort_order).toBe(0);
      expect(res.body.items[1].sort_order).toBe(1);
    });

    it("存在しないIDは404を返す", async () => {
      const res = await request(app).get("/api/bundles/999");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/bundles/:id", () => {
    it("バンドルのメタデータを更新できる", async () => {
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "元タイトル")
        .field("description", "元説明");

      const res = await request(app)
        .put(`/api/bundles/${created.body.id}`)
        .field("title", "更新タイトル");

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("更新タイトル");
      expect(res.body.description).toBe("元説明");
    });

    it("itemsを差し替えできる", async () => {
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "テスト")
        .field("description", "テスト")
        .field(
          "items",
          JSON.stringify([
            { title: "旧", prompt: "old prompt", has_break: false },
          ]),
        );

      const newItems = [
        { title: "新1", prompt: "new prompt 1", has_break: true },
        { title: "新2", prompt: "new prompt 2", has_break: false },
      ];
      const res = await request(app)
        .put(`/api/bundles/${created.body.id}`)
        .field("items", JSON.stringify(newItems));

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].title).toBe("新1");
      expect(res.body.items[1].title).toBe("新2");
    });

    it("更新後にFTS検索で見つかる", async () => {
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "元タイトル名称")
        .field("description", "元説明テキスト");

      await request(app)
        .put(`/api/bundles/${created.body.id}`)
        .field("title", "新しいバンドル名称");

      const search = await request(app).get(
        "/api/bundles?q=新しいバンドル名称",
      );
      expect(search.body.data.length).toBe(1);
    });

    it("存在しないIDは404を返す", async () => {
      const res = await request(app)
        .put("/api/bundles/999")
        .field("title", "テスト");
      expect(res.status).toBe(404);
    });

    it("不正なitemsJSONで400を返す", async () => {
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "テスト")
        .field("description", "テスト");

      const res = await request(app)
        .put(`/api/bundles/${created.body.id}`)
        .field("items", "bad json");
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/bundles/:id", () => {
    it("バンドルを削除できる", async () => {
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "削除テスト")
        .field("description", "削除対象")
        .field(
          "items",
          JSON.stringify([
            { title: "アイテム", prompt: "test", has_break: false },
          ]),
        );

      const res = await request(app).delete(
        `/api/bundles/${created.body.id}`,
      );
      expect(res.status).toBe(204);

      const check = await request(app).get(
        `/api/bundles/${created.body.id}`,
      );
      expect(check.status).toBe(404);
    });

    it("削除後にFTS検索でヒットしない", async () => {
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "削除対象バンドル")
        .field("description", "削除テスト説明文");

      await request(app).delete(`/api/bundles/${created.body.id}`);

      const search = await request(app).get(
        "/api/bundles?q=削除対象バンドル",
      );
      expect(search.body.data.length).toBe(0);
    });

    it("削除でbundle_itemsもCASCADE削除される", async () => {
      const created = await request(app)
        .post("/api/bundles")
        .field("title", "CASCADE確認")
        .field("description", "テスト")
        .field(
          "items",
          JSON.stringify([
            { title: "アイテム", prompt: "test", has_break: false },
          ]),
        );

      const bundleId = created.body.id;
      await request(app).delete(`/api/bundles/${bundleId}`);

      const items = db
        .prepare("SELECT * FROM bundle_items WHERE bundle_id = ?")
        .all(bundleId);
      expect(items).toHaveLength(0);
    });

    it("存在しないIDは404を返す", async () => {
      const res = await request(app).delete("/api/bundles/999");
      expect(res.status).toBe(404);
    });
  });
});
