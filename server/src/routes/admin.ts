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

  return router;
}
