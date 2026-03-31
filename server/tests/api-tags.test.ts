import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { createDatabase } from "../src/db/connection.js";
import type { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import os from "os";

describe("Tags API", () => {
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

  describe("POST /api/tags/keys", () => {
    it("タグキーを作成できる", async () => {
      const res = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("character");
      expect(res.body.id).toBeDefined();
      expect(res.body.sort_order).toBe(0);
    });

    it("nameなしで400を返す", async () => {
      const res = await request(app)
        .post("/api/tags/keys")
        .send({});

      expect(res.status).toBe(400);
    });

    it("空文字のnameで400を返す", async () => {
      const res = await request(app)
        .post("/api/tags/keys")
        .send({ name: "  " });

      expect(res.status).toBe(400);
    });

    it("重複名で409を返す", async () => {
      await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });

      const res = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/tags/keys", () => {
    it("キー一覧を取得できる", async () => {
      await request(app).post("/api/tags/keys").send({ name: "character" });
      await request(app).post("/api/tags/keys").send({ name: "style" });

      const res = await request(app).get("/api/tags/keys");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("sort_order順で返される", async () => {
      await request(app).post("/api/tags/keys").send({ name: "zzz" });
      await request(app).post("/api/tags/keys").send({ name: "aaa" });

      const id2 = (await request(app).get("/api/tags/keys")).body[1].id;
      await request(app)
        .put(`/api/tags/keys/${id2}`)
        .send({ sort_order: -1 });

      const res = await request(app).get("/api/tags/keys");
      expect(res.body[0].name).toBe("aaa");
      expect(res.body[1].name).toBe("zzz");
    });

    it("includeValues=trueで値も含む", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const keyId = keyRes.body.id;

      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl" });

      const res = await request(app)
        .get("/api/tags/keys")
        .query({ includeValues: "true" });

      expect(res.status).toBe(200);
      expect(res.body[0].values).toHaveLength(1);
      expect(res.body[0].values[0].value).toBe("girl");
    });
  });

  describe("PUT /api/tags/keys/:id", () => {
    it("キー名を更新できる", async () => {
      const created = await request(app)
        .post("/api/tags/keys")
        .send({ name: "old" });

      const res = await request(app)
        .put(`/api/tags/keys/${created.body.id}`)
        .send({ name: "new" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("new");
    });

    it("sort_orderを更新できる", async () => {
      const created = await request(app)
        .post("/api/tags/keys")
        .send({ name: "test" });

      const res = await request(app)
        .put(`/api/tags/keys/${created.body.id}`)
        .send({ sort_order: 5 });

      expect(res.status).toBe(200);
      expect(res.body.sort_order).toBe(5);
    });

    it("存在しないIDで404を返す", async () => {
      const res = await request(app)
        .put("/api/tags/keys/999")
        .send({ name: "test" });

      expect(res.status).toBe(404);
    });

    it("更新フィールドなしで400を返す", async () => {
      const created = await request(app)
        .post("/api/tags/keys")
        .send({ name: "test" });

      const res = await request(app)
        .put(`/api/tags/keys/${created.body.id}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("重複名で409を返す", async () => {
      await request(app).post("/api/tags/keys").send({ name: "a" });
      const second = await request(app)
        .post("/api/tags/keys")
        .send({ name: "b" });

      const res = await request(app)
        .put(`/api/tags/keys/${second.body.id}`)
        .send({ name: "a" });

      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /api/tags/keys/:id", () => {
    it("キーを削除できる", async () => {
      const created = await request(app)
        .post("/api/tags/keys")
        .send({ name: "test" });

      const res = await request(app).delete(
        `/api/tags/keys/${created.body.id}`,
      );

      expect(res.status).toBe(204);

      const list = await request(app).get("/api/tags/keys");
      expect(list.body).toHaveLength(0);
    });

    it("存在しないIDで404を返す", async () => {
      const res = await request(app).delete("/api/tags/keys/999");
      expect(res.status).toBe(404);
    });

    it("削除時にCASCADEでtag_valuesも削除される", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const keyId = keyRes.body.id;

      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl" });

      await request(app).delete(`/api/tags/keys/${keyId}`);

      const values = await request(app).get(
        `/api/tags/keys/${keyId}/values`,
      );
      expect(values.status).toBe(404);
    });
  });

  describe("POST /api/tags/keys/:keyId/values", () => {
    it("タグ値を作成できる", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });

      const res = await request(app)
        .post(`/api/tags/keys/${keyRes.body.id}/values`)
        .send({ value: "girl" });

      expect(res.status).toBe(201);
      expect(res.body.value).toBe("girl");
      expect(res.body.tag_key_id).toBe(keyRes.body.id);
    });

    it("valueなしで400を返す", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });

      const res = await request(app)
        .post(`/api/tags/keys/${keyRes.body.id}/values`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("存在しないキーIDで404を返す", async () => {
      const res = await request(app)
        .post("/api/tags/keys/999/values")
        .send({ value: "test" });

      expect(res.status).toBe(404);
    });

    it("同一キーで重複する値は409を返す", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const keyId = keyRes.body.id;

      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl" });

      const res = await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/tags/keys/:keyId/values", () => {
    it("値一覧を取得できる", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const keyId = keyRes.body.id;

      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl" });
      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "boy" });

      const res = await request(app).get(
        `/api/tags/keys/${keyId}/values`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("qパラメータでフィルタできる", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const keyId = keyRes.body.id;

      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl" });
      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "boy" });
      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl_pink" });

      const res = await request(app)
        .get(`/api/tags/keys/${keyId}/values`)
        .query({ q: "girl" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("存在しないキーIDで404を返す", async () => {
      const res = await request(app).get("/api/tags/keys/999/values");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/tags/values/:id", () => {
    it("値を更新できる", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const valRes = await request(app)
        .post(`/api/tags/keys/${keyRes.body.id}/values`)
        .send({ value: "old" });

      const res = await request(app)
        .put(`/api/tags/values/${valRes.body.id}`)
        .send({ value: "new" });

      expect(res.status).toBe(200);
      expect(res.body.value).toBe("new");
    });

    it("存在しないIDで404を返す", async () => {
      const res = await request(app)
        .put("/api/tags/values/999")
        .send({ value: "test" });

      expect(res.status).toBe(404);
    });

    it("空のvalueで400を返す", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const valRes = await request(app)
        .post(`/api/tags/keys/${keyRes.body.id}/values`)
        .send({ value: "test" });

      const res = await request(app)
        .put(`/api/tags/values/${valRes.body.id}`)
        .send({ value: "" });

      expect(res.status).toBe(400);
    });

    it("重複する値で409を返す", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const keyId = keyRes.body.id;

      await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "girl" });
      const valRes = await request(app)
        .post(`/api/tags/keys/${keyId}/values`)
        .send({ value: "boy" });

      const res = await request(app)
        .put(`/api/tags/values/${valRes.body.id}`)
        .send({ value: "girl" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/tags/suggestions", () => {
    let keyId1: number;
    let keyId2: number;

    beforeEach(async () => {
      const k1 = await request(app).post("/api/tags/keys").send({ name: "character" });
      const k2 = await request(app).post("/api/tags/keys").send({ name: "style" });
      keyId1 = k1.body.id;
      keyId2 = k2.body.id;

      await request(app)
        .post("/api/prompts")
        .field("title", "p1")
        .field("prompt", "prompt1")
        .field("description", "d1")
        .field("tags", JSON.stringify([{ key_id: keyId1, value: "girl" }, { key_id: keyId2, value: "anime" }]));

      await request(app)
        .post("/api/prompts")
        .field("title", "p2")
        .field("prompt", "prompt2")
        .field("description", "d2")
        .field("tags", JSON.stringify([{ key_id: keyId1, value: "girl" }, { key_id: keyId2, value: "realistic" }]));

      await request(app)
        .post("/api/prompts")
        .field("title", "p3")
        .field("prompt", "prompt3")
        .field("description", "d3")
        .field("tags", JSON.stringify([{ key_id: keyId1, value: "boy" }]));
    });

    it("全タグの候補を件数付きで取得できる", async () => {
      const res = await request(app)
        .get("/api/tags/suggestions")
        .query({ type: "prompts" });

      expect(res.status).toBe(200);
      const girlTag = res.body.find((s: { value: string }) => s.value === "girl");
      expect(girlTag.count).toBe(2);
      const boyTag = res.body.find((s: { value: string }) => s.value === "boy");
      expect(boyTag.count).toBe(1);
    });

    it("選択済みタグで絞り込んだ候補を取得できる", async () => {
      const allTags = await request(app)
        .get("/api/tags/suggestions")
        .query({ type: "prompts" });
      const animeValueId = allTags.body.find((s: { value: string }) => s.value === "anime").value_id;

      const res = await request(app)
        .get("/api/tags/suggestions")
        .query({ type: "prompts", selected: String(animeValueId) });

      expect(res.status).toBe(200);
      const girlTag = res.body.find((s: { value: string }) => s.value === "girl");
      expect(girlTag.count).toBe(1);
      const boyTag = res.body.find((s: { value: string }) => s.value === "boy");
      expect(boyTag).toBeUndefined();
    });

    it("不正なtypeで400を返す", async () => {
      const res = await request(app)
        .get("/api/tags/suggestions")
        .query({ type: "invalid" });

      expect(res.status).toBe(400);
    });
  });

  describe("タグによるプロンプト絞り込み", () => {
    let keyId: number;

    beforeEach(async () => {
      const k = await request(app).post("/api/tags/keys").send({ name: "style" });
      keyId = k.body.id;

      await request(app)
        .post("/api/prompts")
        .field("title", "anime1")
        .field("prompt", "anime prompt")
        .field("description", "d")
        .field("tags", JSON.stringify([{ key_id: keyId, value: "anime" }]));

      await request(app)
        .post("/api/prompts")
        .field("title", "realistic1")
        .field("prompt", "realistic prompt")
        .field("description", "d")
        .field("tags", JSON.stringify([{ key_id: keyId, value: "realistic" }]));

      await request(app)
        .post("/api/prompts")
        .field("title", "notag")
        .field("prompt", "no tag")
        .field("description", "d");
    });

    it("tag_value_idsで絞り込める", async () => {
      const suggestions = await request(app)
        .get("/api/tags/suggestions")
        .query({ type: "prompts" });
      const animeId = suggestions.body.find((s: { value: string }) => s.value === "anime").value_id;

      const res = await request(app)
        .get("/api/prompts")
        .query({ tag_value_ids: String(animeId) });

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("anime1");
      expect(res.body.total).toBe(1);
    });

    it("テキスト検索とタグフィルタを組み合わせられる", async () => {
      const suggestions = await request(app)
        .get("/api/tags/suggestions")
        .query({ type: "prompts" });
      const animeId = suggestions.body.find((s: { value: string }) => s.value === "anime").value_id;

      const res = await request(app)
        .get("/api/prompts")
        .query({ q: "anime", tag_value_ids: String(animeId) });

      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("DELETE /api/tags/values/:id", () => {
    it("値を削除できる", async () => {
      const keyRes = await request(app)
        .post("/api/tags/keys")
        .send({ name: "character" });
      const valRes = await request(app)
        .post(`/api/tags/keys/${keyRes.body.id}/values`)
        .send({ value: "girl" });

      const res = await request(app).delete(
        `/api/tags/values/${valRes.body.id}`,
      );

      expect(res.status).toBe(204);
    });

    it("存在しないIDで404を返す", async () => {
      const res = await request(app).delete("/api/tags/values/999");
      expect(res.status).toBe(404);
    });
  });
});
