import { NextRequest, NextResponse } from "next/server";
import {
  readAlerts,
  recordAlert,
  resolveAlert,
  resolveAlertsForGame,
  resolveAllAlerts,
} from "@/lib/alerts";
import {
  readAuthoritativeCatalog,
  writeAuthoritativeCatalog,
  calculateItemMetrics,
} from "@/lib/catalog";
import { fetchG2GLiveOffer, extractG2GOfferId } from "@/lib/g2gStock";
import { calculateShopeeEconomics, calculateTargetSellingPrice } from "@/lib/pricing";
import { generateShopeeMassUpdateWorkbook, ShopeeMassProductInput } from "@/lib/shopeeMassUpload";
import { isDbConfigured, queryDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const alerts = await readAlerts();
    const active = alerts.filter((a) => !a.resolved);
    const criticalCount = active.filter((a) => a.severity === "critical").length;
    return NextResponse.json(
      {
        status: "success",
        unreadCount: active.length,
        criticalCount,
        alerts,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Gagal memuat notifikasi." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "resolve") {
      const ok = await resolveAlert(String(body.id || ""));
      return NextResponse.json({ status: ok ? "success" : "not_found" });
    }

    if (action === "resolve_all") {
      const count = await resolveAllAlerts();
      return NextResponse.json({ status: "success", resolvedCount: count });
    }

    if (action === "reprice_game") {
      const gameId = String(body.gameId || "").trim();
      const newPrice = Math.max(1000, Math.round(Number(body.newSellingPriceIdr || 0)));
      const unpause = body.unpause !== false;
      if (!gameId || newPrice <= 0) {
        return NextResponse.json(
          { status: "error", message: "gameId & harga baru wajib diisi." },
          { status: 400 }
        );
      }

      const catalog = await readAuthoritativeCatalog();
      const target = catalog.find((g: any) => g.id === gameId);
      if (!target) {
        return NextResponse.json(
          { status: "error", message: "Game tidak ditemukan di katalog." },
          { status: 404 }
        );
      }

      target.selling_price_shopee_idr = newPrice;
      if (unpause) {
        target.status = "active";
      }
      await writeAuthoritativeCatalog(catalog);
      if (body.alertId) {
        await resolveAlert(String(body.alertId));
      } else {
        await resolveAlertsForGame(gameId);
      }

      return NextResponse.json({
        status: "success",
        message: `Harga "${target.title}" diperbarui ke Rp ${newPrice.toLocaleString("id-ID")} (Storefront aktif).`,
      });
    }

    if (action === "toggle_pause") {
      const gameId = String(body.gameId || "").trim();
      const paused = Boolean(body.paused);
      const catalog = await readAuthoritativeCatalog();
      const target = catalog.find((g: any) => g.id === gameId);
      if (!target) {
        return NextResponse.json(
          { status: "error", message: "Game tidak ditemukan di katalog." },
          { status: 404 }
        );
      }
      target.status = paused ? "paused" : "active";
      await writeAuthoritativeCatalog(catalog);
      return NextResponse.json({
        status: "success",
        gameStatus: target.status,
        message: paused
          ? `"${target.title}" dijeda dari Storefront.`
          : `"${target.title}" diaktifkan kembali di Storefront.`,
      });
    }

    if (action === "export_shopee_update") {
      const gameIds: string[] = Array.isArray(body.gameIds) ? body.gameIds : [];
      const catalog = await readAuthoritativeCatalog();
      const alerts = await readAlerts();
      const activeAlertGameIds = new Set(
        alerts
          .filter((a) => !a.resolved && a.game_id)
          .map((a) => String(a.game_id))
      );

      const targetIds = gameIds.length > 0 ? new Set(gameIds) : activeAlertGameIds;
      const filtered = catalog
        .filter((g: any) => targetIds.has(g.id))
        .map(calculateItemMetrics);

      if (filtered.length === 0) {
        return NextResponse.json(
          { status: "error", message: "Tidak ada produk terdampak yang dipilih untuk export Mass Update." },
          { status: 400 }
        );
      }

      const items: ShopeeMassProductInput[] = filtered.map((g: any) => {
        const sellers = Array.isArray(g.sellers) ? g.sellers : [];
        const sel = sellers.find((s: any) => s.seller_id === g.selected_seller_id) || sellers[0];
        const rawStock = Number(sel?.stock || 0);
        const isPaused = String(g.status || "active").toLowerCase() === "paused";
        const safeStock = isPaused || rawStock <= 0 ? 0 : Math.max(1, Math.min(25, Math.floor(rawStock * 0.7)));
        return {
          id: g.id,
          title: g.title,
          platform: g.platform || "Steam",
          category_type: g.category || "Digital License",
          shopee_category_id: "101090",
          seo_title: g.title,
          description: "",
          price_idr: g.selling_price_shopee_idr || 99000,
          stock: safeStock,
          sku_parent: g.id,
          cover_image_url: "",
        };
      });

      const buffer = await generateShopeeMassUpdateWorkbook(items);
      const dateTag = new Date().toISOString().slice(0, 10);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="shopee-price-guard-update-${dateTag}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (action === "scan_now") {
      // 1. Check DB health
      if (isDbConfigured()) {
        try {
          await queryDb("SELECT 1 as ok");
        } catch (dbErr: any) {
          await recordAlert({
            category: "TECH_INCIDENT",
            severity: "critical",
            title: "Koneksi Database Supabase Bermasalah",
            message: dbErr?.message || "Ping PostgreSQL gagal.",
            source: "manual_scan",
          });
        }
      }

      // 2. Check live G2G offer prices & margin health for selected sellers
      const catalog = await readAuthoritativeCatalog();
      let catalogModified = false;
      let checkedCount = 0;
      let triggeredCount = 0;

      for (const game of catalog) {
        const sellers = Array.isArray(game.sellers) ? game.sellers : [];
        const sel = sellers.find((s: any) => s.seller_id === game.selected_seller_id) || sellers[0];
        if (!sel) continue;

        const offerId = extractG2GOfferId(sel.offer_id || sel.profile_url);
        let livePrice = Number(sel.price_g2g_idr || 0);
        let liveStock = Number(sel.stock || 0);
        let liveOnline = true;
        let fetchFailed = false;

        if (offerId) {
          checkedCount += 1;
          try {
            const live = await fetchG2GLiveOffer(offerId);
            if (live.error || live.status === "unknown") {
              fetchFailed = true;
            } else {
              if (live.price_idr > 0) livePrice = live.price_idr;
              else if (live.price_usd > 0) livePrice = Math.ceil(live.price_usd * 16850 * 1.045);
              if (typeof live.available_qty === "number") liveStock = live.available_qty;
              liveOnline = live.status === "live";
            }
          } catch {
            fetchFailed = true;
          }
        }

        if (fetchFailed) {
          await recordAlert({
            category: "TECH_INCIDENT",
            severity: "warning",
            title: `Gagal Sinkron Live G2G: ${game.title}`,
            message: `Endpoint G2G tidak mengembalikan status live untuk offer ${offerId} (${sel.seller_name}). Data katalog tetap dipertahankan.`,
            game_id: game.id,
            game_title: game.title,
            source: "manual_scan",
          });
          continue;
        }

        const recordedCogs = Number(sel.price_g2g_idr || 0);
        const eco = calculateShopeeEconomics({
          sellingPriceIdr: Number(game.selling_price_shopee_idr || 0),
          cogsIdr: livePrice,
          presetId: "reguler",
          packagingCostIdr: 0,
        });
        const recommendedPrice = calculateTargetSellingPrice({
          cogsIdr: eco.cogsNetIdr,
          presetId: "reguler",
          packagingCostIdr: 0,
          targetMarginPct: Number(game.target_margin_pct || 18),
        });

        const priceHiked = recordedCogs > 0 && livePrice > recordedCogs * 1.1;
        const marginDanger = eco.netMarginPct < 12;

        if (liveStock <= 0 || !liveOnline) {
          triggeredCount += 1;
          game.status = "paused";
          catalogModified = true;
          await recordAlert({
            category: "STOCK_OUT",
            severity: "critical",
            title: `Stok Supplier Habis: ${game.title}`,
            message: `Seller ${sel.seller_name} habis stok (${liveStock} unit). Storefront otomatis di-pause sementara.`,
            game_id: game.id,
            game_title: game.title,
            old_cogs_idr: recordedCogs,
            new_cogs_idr: livePrice,
            current_selling_price_idr: game.selling_price_shopee_idr,
            recommended_selling_price_idr: recommendedPrice,
            current_margin_pct: eco.netMarginPct,
            auto_paused: true,
            source: "manual_scan",
          });
        } else if (priceHiked || marginDanger) {
          triggeredCount += 1;
          const shouldAutoPause = eco.netMarginPct < 5;
          if (shouldAutoPause) {
            game.status = "paused";
            catalogModified = true;
          }
          if (livePrice > 0 && Math.abs(livePrice - recordedCogs) > 500) {
            sel.price_g2g_idr = livePrice;
            catalogModified = true;
          }
          await recordAlert({
            category: shouldAutoPause ? "AUTO_PAUSED" : priceHiked ? "DISCOUNT_ENDED" : "PRICE_SPIKE",
            severity: eco.netMarginPct < 5 ? "critical" : "warning",
            title: shouldAutoPause
              ? `Circuit Breaker Aktif: ${game.title}`
              : `Margin Tipis / Harga Naik: ${game.title}`,
            message: `Modal supplier kini Rp ${livePrice.toLocaleString("id-ID")} (margin bersih ${eco.netMarginPct.toFixed(1)}%). ${
              shouldAutoPause
                ? "Produk otomatis di-pause dari Storefront agar tidak rugi."
                : "Disarankan menyesuaikan harga jual Shopee & Storefront."
            }`,
            game_id: game.id,
            game_title: game.title,
            old_cogs_idr: recordedCogs,
            new_cogs_idr: livePrice,
            current_selling_price_idr: game.selling_price_shopee_idr,
            recommended_selling_price_idr: recommendedPrice,
            current_margin_pct: eco.netMarginPct,
            auto_paused: shouldAutoPause,
            source: "manual_scan",
          });
        }
      }

      if (catalogModified) {
        await writeAuthoritativeCatalog(catalog);
      }

      const alerts = await readAlerts();
      return NextResponse.json({
        status: "success",
        checkedCount,
        triggeredCount,
        alerts,
      });
    }

    return NextResponse.json({ status: "error", message: "Aksi tidak dikenal." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Gagal memproses aksi alert." },
      { status: 500 }
    );
  }
}
