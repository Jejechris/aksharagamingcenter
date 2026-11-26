import fs from "fs";
import path from "path";
import os from "os";
import { queryDb, isDbConfigured } from "@/lib/db";

let tableEnsured = false;

async function ensureHostedMediaTable(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  if (tableEnsured) return true;
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS hosted_media (
        id TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL DEFAULT 'image/png',
        data_base64 TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryDb(`ALTER TABLE hosted_media ENABLE ROW LEVEL SECURITY`).catch(() => {});
    tableEnsured = true;
    return true;
  } catch (err) {
    console.warn("[MediaHost] ensureHostedMediaTable warning:", err);
    return false;
  }
}

function getTempPath(id: string): string {
  const dir = path.resolve(os.tmpdir(), "akshara_hosted_media");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `${id}.json`);
}

export async function saveHostedMedia(
  rawId: string,
  mimeType: string,
  base64Data: string
): Promise<{ ok: boolean; id: string; persistedDb: boolean }> {
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
  if (!safeId || safeId.length < 4) {
    throw new Error("Media ID tidak valid.");
  }

  let persistedDb = false;
  if (await ensureHostedMediaTable()) {
    try {
      await queryDb(
        `INSERT INTO hosted_media (id, mime_type, data_base64, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           mime_type = EXCLUDED.mime_type,
           data_base64 = EXCLUDED.data_base64,
           created_at = NOW()`,
        [safeId, mimeType, base64Data]
      );
      persistedDb = true;
    } catch (err) {
      console.warn("[MediaHost] DB upsert failed, saving temp fallback:", err);
    }
  }

  try {
    fs.writeFileSync(
      getTempPath(safeId),
      JSON.stringify({ id: safeId, mimeType, base64Data }),
      "utf-8"
    );
  } catch {}

  return { ok: true, id: safeId, persistedDb };
}

export async function getHostedMedia(
  rawId: string
): Promise<{ mimeType: string; buffer: Buffer } | null> {
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
  if (!safeId || safeId.length < 4) return null;

  if (await ensureHostedMediaTable()) {
    try {
      const rows = await queryDb<{ mime_type: string; data_base64: string }>(
        "SELECT mime_type, data_base64 FROM hosted_media WHERE id = $1 LIMIT 1",
        [safeId]
      );
      if (rows && rows.length > 0 && rows[0].data_base64) {
        return {
          mimeType: rows[0].mime_type || "image/png",
          buffer: Buffer.from(rows[0].data_base64, "base64"),
        };
      }
    } catch {}
  }

  try {
    const tmpFile = getTempPath(safeId);
    if (fs.existsSync(tmpFile)) {
      const parsed = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      if (parsed?.data_base64 || parsed?.base64Data) {
        return {
          mimeType: parsed.mimeType || "image/png",
          buffer: Buffer.from(parsed.data_base64 || parsed.base64Data, "base64"),
        };
      }
    }
  } catch {}

  return null;
}
