import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  upload,
  deleteImage,
  cleanupUploadedFile,
  saveUploadedImage,
  copyImage,
} from "../middleware/upload.js";

export function createPromptsRouter(getDb: () => DatabaseSync): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const db = getDb();
    const q = (req.query.q as string) || "";
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const tagValueIds = parseTagValueIds(req.query.tag_value_ids);

    let result: { data: unknown[]; total: number };
    if (q || tagValueIds.length > 0) {
      result = searchPrompts(db, q, limit, offset, tagValueIds);
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
      result = { data: rows, total };
    }

    result.data = embedTags(db, result.data as Array<Record<string, unknown>>, "prompt");
    res.json(result);
  });

  router.get("/:id", (req, res) => {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM prompts WHERE id = ?")
      .get(parseInt(req.params.id as string)) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: "見つかりません" });
      return;
    }
    const tags = getTagsForEntity(db, row.id as number, "prompt");
    res.json({ ...row, tags });
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

    let tags: Array<{ key_id: number; value: string }> | undefined;
    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "tagsのJSON形式が不正です" });
        return;
      }
      if (tags && tags.length > 10) {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "タグは最大10個までです" });
        return;
      }
    }

    let imagePath: string | null = null;
    if (req.file) {
      try {
        imagePath = await saveUploadedImage(req.file, req);
      } catch {
        res.status(400).json({ error: "画像の変換に失敗しました" });
        return;
      }
    } else if (req.body.copy_image_from) {
      try {
        imagePath = copyImage(req.body.copy_image_from, req);
      } catch {
        res.status(500).json({ error: "画像のコピー中にエラーが発生しました" });
        return;
      }
      if (!imagePath) {
        res.status(400).json({ error: "画像のコピーに失敗しました" });
        return;
      }
    }

    let transactionStarted = false;
    try {
      db.exec("BEGIN TRANSACTION");
      transactionStarted = true;

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

      const promptId = result.lastInsertRowid;

      if (tags && tags.length > 0) {
        saveTags(db, promptId as number, tags, "prompt");
      }

      db.exec("COMMIT");
      transactionStarted = false;

      const row = db
        .prepare("SELECT * FROM prompts WHERE id = ?")
        .get(promptId) as Record<string, unknown>;
      const savedTags = getTagsForEntity(db, promptId as number, "prompt");
      res.status(201).json({ ...row, tags: savedTags });
    } catch (error) {
      if (transactionStarted) {
        db.exec("ROLLBACK");
      }
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

    let tags: Array<{ key_id: number; value: string }> | undefined;
    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "tagsのJSON形式が不正です" });
        return;
      }
      if (tags && tags.length > 10) {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "タグは最大10個までです" });
        return;
      }
    }

    let imagePath = existing.image_path as string | null;
    if (req.file) {
      try {
        imagePath = await saveUploadedImage(req.file, req);
      } catch {
        res.status(400).json({ error: "画像の変換に失敗しました" });
        return;
      }
    }

    let transactionStarted = false;
    try {
      db.exec("BEGIN TRANSACTION");
      transactionStarted = true;

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

      if (tags !== undefined) {
        db.prepare("DELETE FROM prompt_tags WHERE prompt_id = ?").run(id);
        if (tags.length > 0) {
          saveTags(db, id, tags, "prompt");
        }
      }

      db.exec("COMMIT");
      transactionStarted = false;

      if (req.file) {
        deleteImage(existing.image_path as string | null, req);
      }

      const row = db.prepare("SELECT * FROM prompts WHERE id = ?").get(id) as Record<string, unknown>;
      const savedTags = getTagsForEntity(db, id, "prompt");
      res.json({ ...row, tags: savedTags });
    } catch (error) {
      if (transactionStarted) {
        db.exec("ROLLBACK");
      }
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

function saveTags(
  db: DatabaseSync,
  entityId: number,
  tags: Array<{ key_id: number; value: string }>,
  type: "prompt",
): void {
  const table = type === "prompt" ? "prompt_tags" : "bundle_tags";
  const idCol = type === "prompt" ? "prompt_id" : "bundle_id";
  const insertLink = db.prepare(
    `INSERT OR IGNORE INTO ${table} (${idCol}, tag_value_id) VALUES (?, ?)`,
  );
  for (const tag of tags) {
    const trimmed = tag.value.trim();
    if (!trimmed) continue;
    db.prepare(
      "INSERT OR IGNORE INTO tag_values (tag_key_id, value) VALUES (?, ?)",
    ).run(tag.key_id, trimmed);
    const tv = db
      .prepare(
        "SELECT id FROM tag_values WHERE tag_key_id = ? AND value = ?",
      )
      .get(tag.key_id, trimmed) as { id: number };
    insertLink.run(entityId, tv.id);
  }
}

function getTagsForEntity(
  db: DatabaseSync,
  entityId: number,
  type: "prompt",
): Array<{ key_id: number; key_name: string; value_id: number; value: string }> {
  const table = type === "prompt" ? "prompt_tags" : "bundle_tags";
  const idCol = type === "prompt" ? "prompt_id" : "bundle_id";
  return db
    .prepare(
      `SELECT tk.id as key_id, tk.name as key_name, tv.id as value_id, tv.value
       FROM ${table} et
       JOIN tag_values tv ON et.tag_value_id = tv.id
       JOIN tag_keys tk ON tv.tag_key_id = tk.id
       WHERE et.${idCol} = ?
       ORDER BY tk.sort_order ASC, tk.id ASC, tv.value ASC`,
    )
    .all(entityId) as Array<{ key_id: number; key_name: string; value_id: number; value: string }>;
}

function embedTags(
  db: DatabaseSync,
  rows: Array<Record<string, unknown>>,
  type: "prompt",
): Array<Record<string, unknown>> {
  if (rows.length === 0) return rows;
  const table = type === "prompt" ? "prompt_tags" : "bundle_tags";
  const idCol = type === "prompt" ? "prompt_id" : "bundle_id";
  const ids = rows.map((r) => r.id as number);
  const placeholders = ids.map(() => "?").join(",");
  const tagRows = db
    .prepare(
      `SELECT et.${idCol} as entity_id, tk.id as key_id, tk.name as key_name, tv.id as value_id, tv.value
       FROM ${table} et
       JOIN tag_values tv ON et.tag_value_id = tv.id
       JOIN tag_keys tk ON tv.tag_key_id = tk.id
       WHERE et.${idCol} IN (${placeholders})
       ORDER BY tk.sort_order ASC, tk.id ASC, tv.value ASC`,
    )
    .all(...ids) as Array<{
    entity_id: number;
    key_id: number;
    key_name: string;
    value_id: number;
    value: string;
  }>;

  const tagMap = new Map<number, Array<{ key_id: number; key_name: string; value_id: number; value: string }>>();
  for (const t of tagRows) {
    const arr = tagMap.get(t.entity_id) ?? [];
    arr.push({ key_id: t.key_id, key_name: t.key_name, value_id: t.value_id, value: t.value });
    tagMap.set(t.entity_id, arr);
  }

  return rows.map((r) => ({
    ...r,
    tags: tagMap.get(r.id as number) ?? [],
  }));
}

function parseTagValueIds(param: unknown): number[] {
  if (!param) return [];
  const arr = Array.isArray(param) ? param : [param];
  return arr.map((v) => parseInt(v as string)).filter((n) => !isNaN(n));
}

function buildTagExistsClause(tagValueIds: number[], alias: string): { sql: string; params: number[] } {
  if (tagValueIds.length === 0) return { sql: "", params: [] };
  const clauses = tagValueIds.map(
    () => `AND EXISTS (SELECT 1 FROM prompt_tags WHERE prompt_id = ${alias}.id AND tag_value_id = ?)`,
  );
  return { sql: clauses.join(" "), params: tagValueIds };
}

function searchPrompts(
  db: DatabaseSync,
  q: string,
  limit: number,
  offset: number,
  tagValueIds: number[] = [],
): { data: unknown[]; total: number } {
  const tagClause = buildTagExistsClause(tagValueIds, "p");

  if (q.length >= 3) {
    try {
      const escaped = q.replace(/"/g, '""');
      const ftsQuery = `"${escaped}"`;
      const data = db
        .prepare(
          `SELECT p.* FROM prompts p
           JOIN prompts_fts f ON p.id = f.rowid
           WHERE prompts_fts MATCH ? ${tagClause.sql}
           ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
        )
        .all(ftsQuery, ...tagClause.params, limit, offset);
      const totalResult = db
        .prepare(
          `SELECT COUNT(*) as count FROM prompts p
           JOIN prompts_fts f ON p.id = f.rowid
           WHERE prompts_fts MATCH ? ${tagClause.sql}`,
        )
        .get(ftsQuery, ...tagClause.params) as Record<string, number>;
      return { data, total: totalResult.count };
    } catch {
      // FTS構文エラー時はLIKEフォールバック
    }
  }

  if (q) {
    return likeFallback(db, q, limit, offset, tagValueIds);
  }

  // タグフィルタのみ（テキスト検索なし）
  const data = db
    .prepare(
      `SELECT p.* FROM prompts p WHERE 1=1 ${tagClause.sql}
       ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...tagClause.params, limit, offset);
  const totalResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM prompts p WHERE 1=1 ${tagClause.sql}`,
    )
    .get(...tagClause.params) as Record<string, number>;
  return { data, total: totalResult.count };
}

function likeFallback(
  db: DatabaseSync,
  q: string,
  limit: number,
  offset: number,
  tagValueIds: number[] = [],
): { data: unknown[]; total: number } {
  const pattern = `%${q}%`;
  const tagClause = buildTagExistsClause(tagValueIds, "p");
  const data = db
    .prepare(
      `SELECT p.* FROM prompts p
       WHERE (p.title LIKE ? OR p.prompt LIKE ? OR p.description LIKE ?) ${tagClause.sql}
       ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(pattern, pattern, pattern, ...tagClause.params, limit, offset);
  const totalResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM prompts p
       WHERE (p.title LIKE ? OR p.prompt LIKE ? OR p.description LIKE ?) ${tagClause.sql}`,
    )
    .get(pattern, pattern, pattern, ...tagClause.params) as Record<string, number>;
  return { data, total: totalResult.count };
}
