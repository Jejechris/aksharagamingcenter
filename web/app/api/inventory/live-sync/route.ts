import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getDbCatalog, saveDbGame } from "@/lib/db";
import { syncCatalogWithG2GLive, fetchG2GLiveOffer } from "@/lib/g2gStock";

const catalogPath = path.resolve(process.cwd(), "..", "output", "active_catalog.json");
const bundledCatalogPath = path.resolve(process.cwd(), "data", "active_catalog.json");
const tmpCatalogPath = path.resolve(os.tmpdir(), "akshara_active_catalog.json");

function getLocalCatalogData(): any[] {
  if (fs.existsSync(tmpCatalogPath)) {
    try {
      const raw = fs.readFileSync(tmpCatalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  if (fs.existsSync(catalogPath)) {
    try {
      const raw = fs.readFileSync(catalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  if (fs.existsSync(bundledCatalogPath)) {
    try {
      const raw = fs.readFileSync(bundledCatalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  const starterBackupPath = path.resolve(process.cwd(), "data", "starter_catalog_backup.json");
  if (fs.existsSync(starterBackupPath)) {
    try {
      const raw = fs.readFileSync(starterBackupPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return [];
}

function saveCatalogData(data: any[]) {
  const jsonStr = JSON.stringify(data, null, 2);
  const targets = [tmpCatalogPath, catalogPath, bundledCatalogPath];
  for (const t of targets) {
    try {
      const dir = path.dirname(t);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(t, jsonStr, "utf-8");
    } catch (e) {}
  }
}

async function loadCatalog(): Promise<any[]> {
  try {
    const dbCatalog = await getDbCatalog();
    if (dbCatalog !== null && dbCatalog.length > 0) {
      return dbCatalog;
    }
  } catch (err) {
    console.warn("loadCatalog DB fallback notice:", err);
  }
  return getLocalCatalogData();
}

export async function POST() {
  try {
    const catalog = await loadCatalog();
    if (!Array.isArray(catalog) || catalog.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Katalog kosong, tidak ada produk untuk diaudit." },
        { status: 400 }
      );
    }

    // Jalankan audit dan sinkronisasi real-time langsung ke G2G SLS API
    const { updatedCatalog, auditLogs, syncedCount, auditTime } = await syncCatalogWithG2GLive(catalog);

    // Simpan hasil audit ke disk dan database
    saveCatalogData(updatedCatalog);
    Promise.all(updatedCatalog.map((g: any) => saveDbGame(g))).catch((e) =>
      console.warn("Supabase bulk save notice in live-sync:", e)
    );

    return NextResponse.json({
      status: "success",
      message: `Audit live selesai. ${syncedCount} seller G2G tersinkronisasi faktual langsung dari server SLS G2G.`,
      synced_count: syncedCount,
      audit_time: auditTime,
      audit_logs: auditLogs,
      data: updatedCatalog,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const offerId = searchParams.get("offer_id");

    // Jika ingin query satu offer spesifik
    if (offerId) {
      const liveData = await fetchG2GLiveOffer(offerId);
      return NextResponse.json({
        status: "success",
        data: liveData,
      });
    }

    // Default: jalankan audit katalog
    return POST();
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
