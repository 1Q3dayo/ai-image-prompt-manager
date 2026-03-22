import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";

describe("Health Check", () => {
  const app = createApp();

  it("GET /api/health はstatus okを返す", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("存在しないエンドポイントは404を返す", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
