import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const dataDir = path.resolve(__dirname, "../../data");
  const imagesDir = path.join(dataDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  app.use("/api/images", express.static(imagesDir));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
