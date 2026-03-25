import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import { upload, deleteImage, cleanupUploadedFile } from "../middleware/upload.js";

export function createBundlesRouter(getDb: () => DatabaseSync): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const db = getDb();
    const q = (req.query.q as string) || "";
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    if (q) {
      const results = searchBundles(db, q, limit, offset);
      res.json(results);
    } else {
      const rows = db
        .prepare(
          `SELECT b.*, (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) as item_count
           FROM bundles b ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
        )
        .all(limit, offset);
      const total = (
        db.prepare("SELECT COUNT(*) as count FROM bundles").get() as Record<
          string,
          number
        >
      ).count;
      res.json({ data: rows, total });
    }
  });

  router.get("/:id", (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id as string);
    const bundle = db.prepare("SELECT * FROM bundles WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!bundle) {
      res.status(404).json({ error: "見つかりません" });
      return;
    }

    const items = db
      .prepare(
        "SELECT * FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order",
      )
      .all(id);
    res.json({ ...bundle, items });
  });

  router.post("/", upload.single("image"), (req, res) => {
    const db = getDb();
    const { title, description } = req.body;
    let items: Array<{
      title: string;
      prompt: string;
      has_break: boolean | number;
    }>;
    try {
      items = JSON.parse(req.body.items || "[]");
    } catch {
      cleanupUploadedFile(req.file);
      res.status(400).json({ error: "itemsのJSON形式が不正です" });
      return;
    }

    if (!title || !description) {
      cleanupUploadedFile(req.file);
      res.status(400).json({ error: "title, descriptionは必須です" });
      return;
    }

    const imagePath = req.file ? req.file.filename : null;
    const result = db
      .prepare(
        `INSERT INTO bundles (title, description, image_path)
         VALUES (?, ?, ?)`,
      )
      .run(title, description, imagePath);

    const bundleId = result.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
       VALUES (?, ?, ?, ?, ?)`,
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      insertItem.run(
        bundleId,
        i,
        item.title,
        item.prompt,
        item.has_break ? 1 : 0,
      );
    }

    const bundle = db
      .prepare("SELECT * FROM bundles WHERE id = ?")
      .get(bundleId);
    const savedItems = db
      .prepare(
        "SELECT * FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order",
      )
      .all(bundleId);
    res.status(201).json({ ...(bundle as object), items: savedItems });
  });

  router.put("/:id", upload.single("image"), (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id as string);
    const existing = db
      .prepare("SELECT * FROM bundles WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      cleanupUploadedFile(req.file);
      res.status(404).json({ error: "見つかりません" });
      return;
    }

    const { title, description } = req.body;

    if (req.body.items) {
      let items: Array<{
        title: string;
        prompt: string;
        has_break: boolean | number;
      }>;
      try {
        items = JSON.parse(req.body.items);
      } catch {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "itemsのJSON形式が不正です" });
        return;
      }

      db.prepare("DELETE FROM bundle_items WHERE bundle_id = ?").run(id);
      const insertItem = db.prepare(
        `INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
         VALUES (?, ?, ?, ?, ?)`,
      );
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        insertItem.run(id, i, item.title, item.prompt, item.has_break ? 1 : 0);
      }
    }

    const imagePath = req.file
      ? req.file.filename
      : (existing.image_path as string | null);

    db.prepare(
      `UPDATE bundles SET title = ?, description = ?, image_path = ?,
       updated_at = datetime('now') WHERE id = ?`,
    ).run(
      title ?? existing.title,
      description ?? existing.description,
      imagePath,
      id,
    );

    if (req.file) {
      deleteImage(existing.image_path as string | null);
    }

    const bundle = db.prepare("SELECT * FROM bundles WHERE id = ?").get(id);
    const savedItems = db
      .prepare(
        "SELECT * FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order",
      )
      .all(id);
    res.json({ ...(bundle as object), items: savedItems });
  });

  router.delete("/:id", (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id as string);
    const existing = db
      .prepare("SELECT * FROM bundles WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: "見つかりません" });
      return;
    }

    deleteImage(existing.image_path as string | null);
    db.prepare("DELETE FROM bundles WHERE id = ?").run(id);
    res.status(204).send();
  });

  return router;
}

function searchBundles(
  db: DatabaseSync,
  q: string,
  limit: number,
  offset: number,
): { data: unknown[]; total: number } {
  if (q.length >= 3) {
    try {
      const escaped = q.replace(/"/g, '""');
      const ftsQuery = `"${escaped}"`;
      const data = db
        .prepare(
          `SELECT b.*, (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) as item_count
           FROM bundles b
           JOIN bundles_fts f ON b.id = f.rowid
           WHERE bundles_fts MATCH ?
           ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
        )
        .all(ftsQuery, limit, offset);
      const totalResult = db
        .prepare(
          `SELECT COUNT(*) as count FROM bundles b
           JOIN bundles_fts f ON b.id = f.rowid
           WHERE bundles_fts MATCH ?`,
        )
        .get(ftsQuery) as Record<string, number>;
      return { data, total: totalResult.count };
    } catch {
      // FTS構文エラー時はLIKEフォールバック
    }
  }

  return likeFallback(db, q, limit, offset);
}

function likeFallback(
  db: DatabaseSync,
  q: string,
  limit: number,
  offset: number,
): { data: unknown[]; total: number } {
  const pattern = `%${q}%`;
  const data = db
    .prepare(
      `SELECT b.*, (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) as item_count
       FROM bundles b
       WHERE b.title LIKE ? OR b.description LIKE ?
       ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(pattern, pattern, limit, offset);
  const totalResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM bundles b
       WHERE b.title LIKE ? OR b.description LIKE ?`,
    )
    .get(pattern, pattern) as Record<string, number>;
  return { data, total: totalResult.count };
}
