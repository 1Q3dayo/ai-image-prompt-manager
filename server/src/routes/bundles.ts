import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  upload,
  deleteImage,
  cleanupUploadedFile,
  saveUploadedImage,
  copyImage,
} from "../middleware/upload.js";

export function createBundlesRouter(getDb: () => DatabaseSync): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const db = getDb();
    const q = (req.query.q as string) || "";
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const tagValueIds = parseTagValueIds(req.query.tag_value_ids);

    let result: { data: unknown[]; total: number };
    if (q || tagValueIds.length > 0) {
      result = searchBundles(db, q, limit, offset, tagValueIds);
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
      result = { data: rows, total };
    }

    result.data = embedTags(db, result.data as Array<Record<string, unknown>>, "bundle");
    res.json(result);
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
    const tags = getTagsForEntity(db, id, "bundle");
    res.json({ ...bundle, items, tags });
  });

  router.post("/", upload.single("image"), async (req, res) => {
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

      if (tags && tags.length > 0) {
        saveTags(db, bundleId as number, tags, "bundle");
      }

      db.exec("COMMIT");
      transactionStarted = false;

      const bundle = db
        .prepare("SELECT * FROM bundles WHERE id = ?")
        .get(bundleId);
      const savedItems = db
        .prepare(
          "SELECT * FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order",
        )
        .all(bundleId);
      const savedTags = getTagsForEntity(db, bundleId as number, "bundle");
      res.status(201).json({ ...(bundle as object), items: savedItems, tags: savedTags });
    } catch (error) {
      if (transactionStarted) {
        db.exec("ROLLBACK");
      }
      if (imagePath) {
        deleteImage(imagePath, req);
      }
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "バンドルの保存に失敗しました",
      });
    }
  });

  router.put("/:id", upload.single("image"), async (req, res) => {
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

    let items:
      | Array<{
          title: string;
          prompt: string;
          has_break: boolean | number;
        }>
      | undefined;
    if (req.body.items) {
      try {
        items = JSON.parse(req.body.items);
      } catch {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "itemsのJSON形式が不正です" });
        return;
      }
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

      if (items) {
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

      if (tags !== undefined) {
        db.prepare("DELETE FROM bundle_tags WHERE bundle_id = ?").run(id);
        if (tags.length > 0) {
          saveTags(db, id, tags, "bundle");
        }
      }

      db.prepare(
        `UPDATE bundles SET title = ?, description = ?, image_path = ?,
         updated_at = datetime('now') WHERE id = ?`,
      ).run(
        title ?? existing.title,
        description ?? existing.description,
        imagePath,
        id,
      );

      db.exec("COMMIT");
      transactionStarted = false;

      if (req.file) {
        deleteImage(existing.image_path as string | null, req);
      }

      const bundle = db.prepare("SELECT * FROM bundles WHERE id = ?").get(id);
      const savedItems = db
        .prepare(
          "SELECT * FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order",
        )
        .all(id);
      const savedTags = getTagsForEntity(db, id, "bundle");
      res.json({ ...(bundle as object), items: savedItems, tags: savedTags });
    } catch (error) {
      if (transactionStarted) {
        db.exec("ROLLBACK");
      }
      if (req.file && imagePath) {
        deleteImage(imagePath, req);
      }
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "バンドルの更新に失敗しました",
      });
    }
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

    deleteImage(existing.image_path as string | null, req);
    db.prepare("DELETE FROM bundles WHERE id = ?").run(id);
    res.status(204).send();
  });

  return router;
}

function saveTags(
  db: DatabaseSync,
  entityId: number,
  tags: Array<{ key_id: number; value: string }>,
  type: "bundle",
): void {
  const table = type === "bundle" ? "bundle_tags" : "prompt_tags";
  const idCol = type === "bundle" ? "bundle_id" : "prompt_id";
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
  type: "bundle",
): Array<{ key_id: number; key_name: string; value_id: number; value: string }> {
  const table = type === "bundle" ? "bundle_tags" : "prompt_tags";
  const idCol = type === "bundle" ? "bundle_id" : "prompt_id";
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
  type: "bundle",
): Array<Record<string, unknown>> {
  if (rows.length === 0) return rows;
  const table = type === "bundle" ? "bundle_tags" : "prompt_tags";
  const idCol = type === "bundle" ? "bundle_id" : "prompt_id";
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
    () => `AND EXISTS (SELECT 1 FROM bundle_tags WHERE bundle_id = ${alias}.id AND tag_value_id = ?)`,
  );
  return { sql: clauses.join(" "), params: tagValueIds };
}

function searchBundles(
  db: DatabaseSync,
  q: string,
  limit: number,
  offset: number,
  tagValueIds: number[] = [],
): { data: unknown[]; total: number } {
  const tagClause = buildTagExistsClause(tagValueIds, "b");

  if (q.length >= 3) {
    try {
      const escaped = q.replace(/"/g, '""');
      const ftsQuery = `"${escaped}"`;
      const data = db
        .prepare(
          `SELECT b.*, (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) as item_count
           FROM bundles b
           JOIN bundles_fts f ON b.id = f.rowid
           WHERE bundles_fts MATCH ? ${tagClause.sql}
           ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
        )
        .all(ftsQuery, ...tagClause.params, limit, offset);
      const totalResult = db
        .prepare(
          `SELECT COUNT(*) as count FROM bundles b
           JOIN bundles_fts f ON b.id = f.rowid
           WHERE bundles_fts MATCH ? ${tagClause.sql}`,
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
      `SELECT b.*, (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) as item_count
       FROM bundles b WHERE 1=1 ${tagClause.sql}
       ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...tagClause.params, limit, offset);
  const totalResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM bundles b WHERE 1=1 ${tagClause.sql}`,
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
  const tagClause = buildTagExistsClause(tagValueIds, "b");
  const data = db
    .prepare(
      `SELECT b.*, (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) as item_count
       FROM bundles b
       WHERE (b.title LIKE ? OR b.description LIKE ?) ${tagClause.sql}
       ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(pattern, pattern, ...tagClause.params, limit, offset);
  const totalResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM bundles b
       WHERE (b.title LIKE ? OR b.description LIKE ?) ${tagClause.sql}`,
    )
    .get(pattern, pattern, ...tagClause.params) as Record<string, number>;
  return { data, total: totalResult.count };
}
