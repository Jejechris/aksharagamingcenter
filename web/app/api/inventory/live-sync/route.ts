import { NextResponse } from "next/server";
import { readAuthoritativeCatalog, writeAuthoritativeCatalog } from "@/lib/catalog";
import { syncCatalogWithG2GLive, fetchG2GLiveOffer } from "@/lib/g2gStock";

export async function POST() {
  try {
    const catalog = await readAuthoritativeCatalog();
    if (!Array.isArray(catalog) || catalog.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Katalog kosong, tidak ada produk untuk diaudit." },
        { status: 400 }
      );
    }

    // Jalankan audit dan sinkronisasi real-time langsung ke G2G SLS API
    const { updatedCatalog, auditLogs, syncedCount, auditTime } = await syncCatalogWithG2GLive(catalog);

    // Simpan hasil audit ke Supabase (catalog_games + app_kv) dan disk secara sinkron penuh
    await writeAuthoritativeCatalog(updatedCatalog, { syncAllGamesToDb: true });

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
