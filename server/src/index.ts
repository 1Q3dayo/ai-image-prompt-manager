import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createDatabase } from "./db/connection.js";
import { initializeSchema } from "./db/schema.js";
import { createPromptsRouter } from "./routes/prompts.js";
import { createBundlesRouter } from "./routes/bundles.js";
import { createAdminRouter } from "./routes/admin.js";
import type { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbRef {
  current: DatabaseSync;
}

export function createApp(db?: DatabaseSync, dataDirOverride?: string) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const dataDir = dataDirOverride ?? path.resolve(__dirname, "../../data");
  const imagesDir = path.join(dataDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });
  app.set("dataDir", dataDir);

  app.use("/api/images", express.static(imagesDir));

  const database = db ?? createDatabase();
  initializeSchema(database);

  const dbRef: DbRef = { current: database };
  const getDb = () => dbRef.current;
  const setDb = (newDb: DatabaseSync) => {
    dbRef.current = newDb;
  };

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/prompts", createPromptsRouter(getDb));
  app.use("/api/bundles", createBundlesRouter(getDb));
  app.use("/api/admin", createAdminRouter(getDb, setDb, dataDir));

  return app;
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
