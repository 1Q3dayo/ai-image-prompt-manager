import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";

export function createTagsRouter(getDb: () => DatabaseSync): Router {
  const router = Router();

  router.get("/keys", (req, res) => {
    const db = getDb();
    const includeValues = req.query.includeValues === "true";

    const keys = db
      .prepare("SELECT * FROM tag_keys ORDER BY sort_order ASC, id ASC")
      .all() as Array<{ id: number; name: string; sort_order: number; created_at: string }>;

    if (!includeValues) {
      res.json(keys);
      return;
    }

    const values = db
      .prepare("SELECT * FROM tag_values ORDER BY value ASC")
      .all() as Array<{ id: number; tag_key_id: number; value: string; created_at: string }>;

    const valuesByKeyId = new Map<number, typeof values>();
    for (const v of values) {
      const arr = valuesByKeyId.get(v.tag_key_id) ?? [];
      arr.push(v);
      valuesByKeyId.set(v.tag_key_id, arr);
    }

    const result = keys.map((k) => ({
      ...k,
      values: valuesByKeyId.get(k.id) ?? [],
    }));

    res.json(result);
  });

  router.post("/keys", (req, res) => {
    const db = getDb();
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "nameは必須です" });
      return;
    }

    try {
      const result = db
        .prepare("INSERT INTO tag_keys (name) VALUES (?)")
        .run(name.trim());
      const created = db
        .prepare("SELECT * FROM tag_keys WHERE id = ?")
        .get(result.lastInsertRowid);
      res.status(201).json(created);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("UNIQUE")) {
        res.status(409).json({ error: "同名のキーが既に存在します" });
        return;
      }
      throw e;
    }
  });

  router.put("/keys/:id", (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id);
    const { name, sort_order } = req.body;

    const existing = db
      .prepare("SELECT * FROM tag_keys WHERE id = ?")
      .get(id);
    if (!existing) {
      res.status(404).json({ error: "キーが見つかりません" });
      return;
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "nameは空にできません" });
        return;
      }
      updates.push("name = ?");
      params.push(name.trim());
    }
    if (sort_order !== undefined) {
      if (typeof sort_order !== "number") {
        res.status(400).json({ error: "sort_orderは数値です" });
        return;
      }
      updates.push("sort_order = ?");
      params.push(sort_order);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "更新フィールドがありません" });
      return;
    }

    params.push(id);
    try {
      db.prepare(`UPDATE tag_keys SET ${updates.join(", ")} WHERE id = ?`).run(
        ...params,
      );
      const updated = db
        .prepare("SELECT * FROM tag_keys WHERE id = ?")
        .get(id);
      res.json(updated);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("UNIQUE")) {
        res.status(409).json({ error: "同名のキーが既に存在します" });
        return;
      }
      throw e;
    }
  });

  router.delete("/keys/:id", (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id);

    const existing = db
      .prepare("SELECT * FROM tag_keys WHERE id = ?")
      .get(id);
    if (!existing) {
      res.status(404).json({ error: "キーが見つかりません" });
      return;
    }

    db.prepare("DELETE FROM tag_keys WHERE id = ?").run(id);
    res.status(204).send();
  });

  router.get("/keys/:keyId/values", (req, res) => {
    const db = getDb();
    const keyId = parseInt(req.params.keyId);
    const q = (req.query.q as string) || "";

    const keyExists = db
      .prepare("SELECT id FROM tag_keys WHERE id = ?")
      .get(keyId);
    if (!keyExists) {
      res.status(404).json({ error: "キーが見つかりません" });
      return;
    }

    if (q) {
      const values = db
        .prepare(
          "SELECT * FROM tag_values WHERE tag_key_id = ? AND value LIKE ? ORDER BY value ASC",
        )
        .all(keyId, `%${q}%`);
      res.json(values);
    } else {
      const values = db
        .prepare(
          "SELECT * FROM tag_values WHERE tag_key_id = ? ORDER BY value ASC",
        )
        .all(keyId);
      res.json(values);
    }
  });

  router.post("/keys/:keyId/values", (req, res) => {
    const db = getDb();
    const keyId = parseInt(req.params.keyId);
    const { value } = req.body;

    if (!value || typeof value !== "string" || !value.trim()) {
      res.status(400).json({ error: "valueは必須です" });
      return;
    }

    const keyExists = db
      .prepare("SELECT id FROM tag_keys WHERE id = ?")
      .get(keyId);
    if (!keyExists) {
      res.status(404).json({ error: "キーが見つかりません" });
      return;
    }

    try {
      const result = db
        .prepare("INSERT INTO tag_values (tag_key_id, value) VALUES (?, ?)")
        .run(keyId, value.trim());
      const created = db
        .prepare("SELECT * FROM tag_values WHERE id = ?")
        .get(result.lastInsertRowid);
      res.status(201).json(created);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("UNIQUE")) {
        res.status(409).json({ error: "同じキーに同名の値が既に存在します" });
        return;
      }
      throw e;
    }
  });

  router.put("/values/:id", (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id);
    const { value } = req.body;

    if (!value || typeof value !== "string" || !value.trim()) {
      res.status(400).json({ error: "valueは空にできません" });
      return;
    }

    const existing = db
      .prepare("SELECT * FROM tag_values WHERE id = ?")
      .get(id) as { id: number; tag_key_id: number; value: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: "値が見つかりません" });
      return;
    }

    try {
      db.prepare("UPDATE tag_values SET value = ? WHERE id = ?").run(
        value.trim(),
        id,
      );
      const updated = db
        .prepare("SELECT * FROM tag_values WHERE id = ?")
        .get(id);
      res.json(updated);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("UNIQUE")) {
        res.status(409).json({ error: "同じキーに同名の値が既に存在します" });
        return;
      }
      throw e;
    }
  });

  router.delete("/values/:id", (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id);

    const existing = db
      .prepare("SELECT * FROM tag_values WHERE id = ?")
      .get(id);
    if (!existing) {
      res.status(404).json({ error: "値が見つかりません" });
      return;
    }

    db.prepare("DELETE FROM tag_values WHERE id = ?").run(id);
    res.status(204).send();
  });

  return router;
}
