import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import multer from "multer";
import fs from "fs";
import path from "path";
import { createDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/schema.js";
import {
  deleteImage,
  getImageMimeType,
  restoreBase64Image,
} from "../middleware/upload.js";

const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

export function createAdminRouter(
  getDb: () => DatabaseSync,
  setDb: (db: DatabaseSync) => void,
  dataDir: string,
): Router {
  const router = Router();

  router.get("/stats", (_req, res) => {
    const db = getDb();
    const imagesDir = path.join(dataDir, "images");
    const dbPath = path.join(dataDir, "db.sqlite");

    const promptCount = (
      db.prepare("SELECT COUNT(*) as count FROM prompts").get() as Record<
        string,
        number
      >
    ).count;

    const bundleCount = (
      db.prepare("SELECT COUNT(*) as count FROM bundles").get() as Record<
        string,
        number
      >
    ).count;

    let imageCount = 0;
    let imagesBytes = 0;
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      imageCount = files.length;
      for (const file of files) {
        const stat = fs.statSync(path.join(imagesDir, file));
        imagesBytes += stat.size;
      }
    }

    let databaseBytes = 0;
    if (fs.existsSync(dbPath)) {
      databaseBytes += fs.statSync(dbPath).size;
    }
    const walPath = dbPath + "-wal";
    if (fs.existsSync(walPath)) {
      databaseBytes += fs.statSync(walPath).size;
    }
    const shmPath = dbPath + "-shm";
    if (fs.existsSync(shmPath)) {
      databaseBytes += fs.statSync(shmPath).size;
    }

    const promptMax = (
      db
        .prepare("SELECT MAX(updated_at) as max_date FROM prompts")
        .get() as Record<string, string | null>
    ).max_date;
    const bundleMax = (
      db
        .prepare("SELECT MAX(updated_at) as max_date FROM bundles")
        .get() as Record<string, string | null>
    ).max_date;

    let lastUpdatedAt: string | null = null;
    if (promptMax && bundleMax) {
      lastUpdatedAt = promptMax > bundleMax ? promptMax : bundleMax;
    } else {
      lastUpdatedAt = promptMax ?? bundleMax;
    }

    res.json({
      promptCount,
      bundleCount,
      imageCount,
      storageBytes: {
        images: imagesBytes,
        database: databaseBytes,
        total: imagesBytes + databaseBytes,
      },
      lastUpdatedAt,
    });
  });

  router.get("/export/json", (req, res) => {
    const db = getDb();
    const includeImages = req.query.includeImages === "true";
    const imagesDir = path.join(dataDir, "images");

    const prompts = db
      .prepare("SELECT * FROM prompts ORDER BY id")
      .all() as Array<Record<string, unknown>>;
    const bundles = db
      .prepare("SELECT * FROM bundles ORDER BY id")
      .all() as Array<Record<string, unknown>>;

    const exportPrompts = prompts.map((p) => {
      const item: Record<string, unknown> = {
        title: p.title,
        prompt: p.prompt,
        has_break: p.has_break,
        description: p.description,
        image_path: p.image_path,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
      if (includeImages && p.image_path) {
        const imgPath = path.join(imagesDir, p.image_path as string);
        if (fs.existsSync(imgPath)) {
          const data = fs.readFileSync(imgPath);
          const mime = getImageMimeType(p.image_path as string);
          item.image_data = `data:${mime};base64,${data.toString("base64")}`;
        }
      }
      return item;
    });

    const exportBundles = bundles.map((b) => {
      const items = db
        .prepare(
          "SELECT sort_order, title, prompt, has_break FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order",
        )
        .all(b.id as number);
      const item: Record<string, unknown> = {
        title: b.title,
        description: b.description,
        image_path: b.image_path,
        created_at: b.created_at,
        updated_at: b.updated_at,
        items,
      };
      if (includeImages && b.image_path) {
        const imgPath = path.join(imagesDir, b.image_path as string);
        if (fs.existsSync(imgPath)) {
          const data = fs.readFileSync(imgPath);
          const mime = getImageMimeType(b.image_path as string);
          item.image_data = `data:${mime};base64,${data.toString("base64")}`;
        }
      }
      return item;
    });

    const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      prompts: exportPrompts,
      bundles: exportBundles,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aipm-export-${now}.json"`,
    );
    res.json(payload);
  });

  router.get("/export/db", (_req, res) => {
    const db = getDb();
    const dbPath = path.join(dataDir, "db.sqlite");

    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: "データベースファイルが見つかりません" });
      return;
    }

    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");

    const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    res.setHeader("Content-Type", "application/x-sqlite3");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aipm-db-${now}.sqlite"`,
    );

    const stream = fs.createReadStream(dbPath);
    stream.pipe(res);
  });

  router.post("/import/json", adminUpload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "ファイルが必要です" });
      return;
    }

    const mode = (req.body.mode as string) || "replace";
    if (mode !== "replace" && mode !== "append") {
      res.status(400).json({ error: "modeはreplaceまたはappendを指定してください" });
      return;
    }

    let payload: {
      version?: number;
      prompts?: Array<Record<string, unknown>>;
      bundles?: Array<Record<string, unknown>>;
    };
    try {
      payload = JSON.parse(req.file.buffer.toString("utf-8"));
    } catch {
      res.status(400).json({ error: "JSONの形式が不正です" });
      return;
    }

    if (!payload.version || !Array.isArray(payload.prompts) || !Array.isArray(payload.bundles)) {
      res.status(400).json({ error: "エクスポートファイルの形式が不正です" });
      return;
    }

    const db = getDb();
    let importedPrompts = 0;
    let importedBundles = 0;
    let importedImages = 0;
    const createdImages: string[] = [];

    db.exec("BEGIN TRANSACTION");
    try {
      if (mode === "replace") {
        db.exec("DELETE FROM bundle_items");
        db.exec("DELETE FROM bundles");
        db.exec("DELETE FROM prompts");
      }

      const insertPrompt = db.prepare(
        `INSERT INTO prompts (title, prompt, has_break, description, image_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );

      for (const p of payload.prompts!) {
        let imagePath: string | null = null;
        if (p.image_data && typeof p.image_data === "string") {
          imagePath = await restoreBase64Image(p.image_data as string, dataDir);
          if (imagePath) {
            importedImages++;
            createdImages.push(imagePath);
          }
        }

        insertPrompt.run(
          p.title as string,
          p.prompt as string,
          (p.has_break as number) ?? 0,
          (p.description as string) ?? "",
          imagePath,
          (p.created_at as string) ?? new Date().toISOString(),
          (p.updated_at as string) ?? new Date().toISOString(),
        );
        importedPrompts++;
      }

      const insertBundle = db.prepare(
        `INSERT INTO bundles (title, description, image_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      );
      const insertItem = db.prepare(
        `INSERT INTO bundle_items (bundle_id, sort_order, title, prompt, has_break)
         VALUES (?, ?, ?, ?, ?)`,
      );

      for (const b of payload.bundles!) {
        let imagePath: string | null = null;
        if (b.image_data && typeof b.image_data === "string") {
          imagePath = await restoreBase64Image(b.image_data as string, dataDir);
          if (imagePath) {
            importedImages++;
            createdImages.push(imagePath);
          }
        }

        const result = insertBundle.run(
          b.title as string,
          (b.description as string) ?? "",
          imagePath,
          (b.created_at as string) ?? new Date().toISOString(),
          (b.updated_at as string) ?? new Date().toISOString(),
        );
        const bundleId = Number(result.lastInsertRowid);

        if (Array.isArray(b.items)) {
          for (let i = 0; i < b.items.length; i++) {
            const item = b.items[i] as Record<string, unknown>;
            insertItem.run(
              bundleId,
              (item.sort_order as number) ?? i,
              item.title as string,
              item.prompt as string,
              (item.has_break as number) ?? 0,
            );
          }
        }

        importedBundles++;
      }

      if (mode === "replace") {
        db.exec("INSERT INTO prompts_fts(prompts_fts) VALUES ('rebuild')");
        db.exec("INSERT INTO bundles_fts(bundles_fts) VALUES ('rebuild')");
      }

      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      for (const imagePath of createdImages) {
        deleteImage(imagePath, dataDir);
      }
      res.status(500).json({
        error: e instanceof Error ? e.message : "インポートに失敗しました",
      });
      return;
    }

    res.json({
      imported: {
        prompts: importedPrompts,
        bundles: importedBundles,
        images: importedImages,
      },
    });
  });

  router.post("/import/db", adminUpload.single("file"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "ファイルが必要です" });
      return;
    }

    const dbPath = path.join(dataDir, "db.sqlite");
    const tmpPath = path.join(dataDir, `tmp-restore-${Date.now()}.sqlite`);

    try {
      fs.writeFileSync(tmpPath, req.file.buffer);

      let testDb: DatabaseSync;
      try {
        testDb = createDatabase(tmpPath);
      } catch {
        fs.unlinkSync(tmpPath);
        res.status(400).json({ error: "有効なSQLiteファイルではありません" });
        return;
      }

      try {
        testDb.prepare("SELECT COUNT(*) FROM prompts").get();
        testDb.prepare("SELECT COUNT(*) FROM bundles").get();
        testDb.prepare("SELECT COUNT(*) FROM bundle_items").get();
      } catch {
        testDb.close();
        fs.unlinkSync(tmpPath);
        res.status(400).json({ error: "必要なテーブルが存在しません" });
        return;
      }
      testDb.close();

      const currentDb = getDb();
      currentDb.close();

      for (const suffix of ["", "-wal", "-shm"]) {
        const p = dbPath + suffix;
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }

      fs.renameSync(tmpPath, dbPath);

      const newDb = createDatabase(dbPath);
      initializeSchema(newDb);
      setDb(newDb);

      res.json({ status: "ok", message: "データベースをリストアしました" });
    } catch (e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      res.status(500).json({
        error: e instanceof Error ? e.message : "リストアに失敗しました",
      });
    }
  });

  return router;
}
