import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { createDatabase } from "../src/db/connection.js";
import type { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import os from "os";

describe("Admin Stats API", () => {
  let db: DatabaseSync;
  let app: ReturnType<typeof createApp>;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipm-admin-test-"));
    dbPath = path.join(tmpDir, "db.sqlite");
    db = createDatabase(dbPath);
    app = createApp(db, tmpDir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("空DBで統計情報を取得できる", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(200);
    expect(res.body.promptCount).toBe(0);
    expect(res.body.bundleCount).toBe(0);
    expect(res.body.imageCount).toBe(0);
    expect(res.body.storageBytes).toBeDefined();
    expect(res.body.storageBytes.images).toBe(0);
    expect(res.body.storageBytes.database).toBeGreaterThan(0);
    expect(res.body.storageBytes.total).toBe(
      res.body.storageBytes.images + res.body.storageBytes.database,
    );
    expect(res.body.lastUpdatedAt).toBeNull();
  });

  it("プロンプト作成後に件数が反映される", async () => {
    await request(app)
      .post("/api/prompts")
      .field("title", "テスト")
      .field("prompt", "test prompt")
      .field("description", "説明");

    await request(app)
      .post("/api/prompts")
      .field("title", "テスト2")
      .field("prompt", "test prompt 2")
      .field("description", "説明2");

    const res = await request(app).get("/api/admin/stats");
    expect(res.body.promptCount).toBe(2);
  });

  it("バンドル作成後に件数が反映される", async () => {
    await request(app)
      .post("/api/bundles")
      .field("title", "バンドル")
      .field("description", "説明")
      .field("items", JSON.stringify([{ title: "t", prompt: "p", has_break: false }]));

    const res = await request(app).get("/api/admin/stats");
    expect(res.body.bundleCount).toBe(1);
  });

  it("lastUpdatedAtが最新の日時を返す", async () => {
    await request(app)
      .post("/api/prompts")
      .field("title", "テスト")
      .field("prompt", "test")
      .field("description", "説明");

    const res = await request(app).get("/api/admin/stats");
    expect(res.body.lastUpdatedAt).toBeTruthy();
  });

  it("レスポンス形式が正しい", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.body).toHaveProperty("promptCount");
    expect(res.body).toHaveProperty("bundleCount");
    expect(res.body).toHaveProperty("imageCount");
    expect(res.body).toHaveProperty("storageBytes");
    expect(res.body.storageBytes).toHaveProperty("images");
    expect(res.body.storageBytes).toHaveProperty("database");
    expect(res.body.storageBytes).toHaveProperty("total");
    expect(res.body).toHaveProperty("lastUpdatedAt");
  });
});
