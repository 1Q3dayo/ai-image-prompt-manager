import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

export function createAdminRouter(
  getDb: () => DatabaseSync,
  _setDb: (db: DatabaseSync) => void,
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
          const ext = path.extname(p.image_path as string).toLowerCase();
          const mime =
            ext === ".png"
              ? "image/png"
              : ext === ".gif"
                ? "image/gif"
                : ext === ".webp"
                  ? "image/webp"
                  : "image/jpeg";
          const data = fs.readFileSync(imgPath);
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
          const ext = path.extname(b.image_path as string).toLowerCase();
          const mime =
            ext === ".png"
              ? "image/png"
              : ext === ".gif"
                ? "image/gif"
                : ext === ".webp"
                  ? "image/webp"
                  : "image/jpeg";
          const data = fs.readFileSync(imgPath);
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

  return router;
}
