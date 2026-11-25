import fs from "fs";
import path from "path";

let rootEnvLoaded = false;

/**
 * Memuat environment variables dari root `.env` monorepo (`../.env`) ke `process.env`
 * bila Next.js dijalankan dari direktori `web/`.
 * Tidak menimpa variabel `web/.env.local` yang valid, kecuali nilai yang lama kosong
 * atau token Gemini invalid `AQ.A` sementara root `.env` punya nilai baru.
 */
export function ensureRootEnvLoaded(): void {
  if (rootEnvLoaded) return;
  rootEnvLoaded = true;

  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
  ];

  for (const envPath of candidates) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const raw = fs.readFileSync(envPath, "utf-8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const eqIdx = trimmed.indexOf("=");
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!key || !val) continue;

        const existing = process.env[key];
        const isStaleGeminiPlaceholder =
          key === "GEMINI_API_KEY" &&
          existing?.startsWith("AQ.A") &&
          !val.startsWith("AQ.A");

        if (!existing || isStaleGeminiPlaceholder) {
          process.env[key] = val;
        }
      }
    } catch {
      // Ignore unreadable env path
    }
  }
}
