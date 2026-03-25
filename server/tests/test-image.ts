import fs from "fs";
import sharp from "sharp";

export async function createTestPngBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

export async function createTestAvifBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .avif({ quality: 50, effort: 4 })
    .toBuffer();
}

export function isAvifFile(filePath: string): boolean {
  const header = fs.readFileSync(filePath).subarray(4, 12).toString("ascii");
  return header === "ftypavif" || header === "ftypavis";
}
