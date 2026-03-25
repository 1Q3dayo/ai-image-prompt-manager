import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  upload,
  deleteImage,
  cleanupUploadedFile,
  saveUploadedImage,
} from "../middleware/upload.js";

export function createPromptsRouter(getDb: () => DatabaseSync): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const db = getDb();
    const q = (req.query.q as string) || "";
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    if (q) {
      const results = searchPrompts(db, q, limit, offset);
      res.json(results);
    } else {
      const rows = db
        .prepare(
          "SELECT * FROM prompts ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        )
        .all(limit, offset);
      const total = (
        db.prepare("SELECT COUNT(*) as count FROM prompts").get() as Record<
          string,
          number
        >
      ).count;
      res.json({ data: rows, total });
    }
  });

  router.get("/:id", (req, res) => {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM prompts WHERE id = ?")
      .get(parseInt(req.params.id as string));
    if (!row) {
      res.status(404).json({ error: "見つかりません" });
      return;
    }
    res.json(row);
  });

  router.post("/", upload.single("image"), async (req, res) => {
    const db = getDb();
    const { title, prompt, has_break, description } = req.body;
    if (!title || !prompt || !description) {
      cleanupUploadedFile(req.file);
      res
        .status(400)
        .json({ error: "title, prompt, descriptionは必須です" });
      return;
    }

    let imagePath: string | null = null;
    if (req.file) {
      try {
        imagePath = await saveUploadedImage(req.file, req);
      } catch {
        res.status(400).json({ error: "画像の変換に失敗しました" });
        return;
      }
    }

    try {
      const result = db
        .prepare(
          `INSERT INTO prompts (title, prompt, has_break, description, image_path)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          title,
          prompt,
          has_break === "true" || has_break === "1" ? 1 : 0,
          description,
          imagePath,
        );

      const row = db
        .prepare("SELECT * FROM prompts WHERE id = ?")
        .get(result.lastInsertRowid);
      res.status(201).json(row);
    } catch (error) {
      if (imagePath) {
        deleteImage(imagePath, req);
      }
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "プロンプトの保存に失敗しました",
      });
    }
  });

  router.put("/:id", upload.single("image"), async (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id as string);
    const existing = db.prepare("SELECT * FROM prompts WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      cleanupUploadedFile(req.file);
      res.status(404).json({ error: "見つかりません" });
      return;
    }

    const { title, prompt, has_break, description } = req.body;

    let imagePath = existing.image_path as string | null;
    if (req.file) {
      try {
        imagePath = await saveUploadedImage(req.file, req);
      } catch {
        res.status(400).json({ error: "画像の変換に失敗しました" });
        return;
      }
    }

    try {
      db.prepare(
        `UPDATE prompts SET title = ?, prompt = ?, has_break = ?, description = ?,
         image_path = ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(
        title ?? (existing.title as string),
        prompt ?? (existing.prompt as string),
        has_break !== undefined
          ? has_break === "true" || has_break === "1"
            ? 1
            : 0
          : (existing.has_break as number),
        description ?? (existing.description as string),
        imagePath,
        id,
      );

      if (req.file) {
        deleteImage(existing.image_path as string | null, req);
      }

      const row = db.prepare("SELECT * FROM prompts WHERE id = ?").get(id);
      res.json(row);
    } catch (error) {
      if (req.file && imagePath) {
        deleteImage(imagePath, req);
      }
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "プロンプトの更新に失敗しました",
      });
    }
  });

  router.delete("/:id", (req, res) => {
    const db = getDb();
    const id = parseInt(req.params.id as string);
    const existing = db.prepare("SELECT * FROM prompts WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: "見つかりません" });
      return;
    }

    deleteImage(existing.image_path as string | null, req);
    db.prepare("DELETE FROM prompts WHERE id = ?").run(id);
    res.status(204).send();
  });

  return router;
}

function searchPrompts(
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
          `SELECT p.* FROM prompts p
           JOIN prompts_fts f ON p.id = f.rowid
           WHERE prompts_fts MATCH ?
           ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
        )
        .all(ftsQuery, limit, offset);
      const totalResult = db
        .prepare(
          `SELECT COUNT(*) as count FROM prompts p
           JOIN prompts_fts f ON p.id = f.rowid
           WHERE prompts_fts MATCH ?`,
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
      `SELECT * FROM prompts
       WHERE title LIKE ? OR prompt LIKE ? OR description LIKE ?
       ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(pattern, pattern, pattern, limit, offset);
  const totalResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM prompts
       WHERE title LIKE ? OR prompt LIKE ? OR description LIKE ?`,
    )
    .get(pattern, pattern, pattern) as Record<string, number>;
  return { data, total: totalResult.count };
}
