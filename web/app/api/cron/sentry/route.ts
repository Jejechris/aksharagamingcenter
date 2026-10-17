import { NextRequest, NextResponse } from "next/server";
import { readAuthoritativeCatalog, writeAuthoritativeCatalog } from "@/lib/catalog";
import { queryDb } from "@/lib/db";
import { fetchG2GLiveOffer, extractG2GOfferId } from "@/lib/g2gStock";
import { resolveG2GProductUrl, getG2GGameCategoryUrl } from "@/lib/g2g";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "";

async function sendTelegramAlert(text: string) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID || !TELEGRAM_API) {
    console.warn("[Cron Sentry] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not configured, skipping alert.");
    return;
  }
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("[Cron Sentry] Failed to send Telegram alert:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceAlert = searchParams.get("force") === "true";
    const heartbeat = searchParams.get("heartbeat") === "true";

    // PING SUPABASE TO KEEP IT AWAKE
    try {
      await queryDb("SELECT 1 AS ping");
    } catch (err) {
      console.warn("Supabase ping failed:", err);
    }

    const catalog = await readAuthoritativeCatalog();
    if (!catalog || catalog.length === 0) {
      return NextResponse.json({ status: "empty_catalog", message: "Katalog kosong." });
    }

    const sellersToCheck: Array<{
      gameId: string;
      gameTitle: string;
      sellingPriceShopeeIdr: number;
      selectedSellerId: string;
      sellerId: string;
      sellerName: string;
      offerId: string;
      recordedPriceIdr: number;
      previousStock: number;
      isSelected: boolean;
    }> = [];

    for (const game of catalog) {
      for (const s of game.sellers || []) {
        const rawId = s.offer_id || extractG2GOfferId(s.profile_url);
        if (rawId) {
          const offerId = extractG2GOfferId(rawId);
          if (offerId) {
            sellersToCheck.push({
              gameId: game.id,
              gameTitle: game.title,
              sellingPriceShopeeIdr: game.selling_price_shopee_idr || 100000,
              selectedSellerId: game.selected_seller_id,
              sellerId: s.seller_id,
              sellerName: s.seller_name,
              offerId,
              recordedPriceIdr: s.price_g2g_idr || 0,
              previousStock: s.stock || 0,
              isSelected: s.seller_id === game.selected_seller_id,
            });
          }
        }
      }
    }

    // Limit concurrency to 5 requests at a time
    const auditResults: Array<{
      gameId: string;
      gameTitle: string;
      sellerId: string;
      sellerName: string;
      offerId: string;
      productUrl: string;
      availableQty: number;
      isOnline: boolean;
      status: string;
      priceUsd: number;
      livePriceIdr: number;
      recordedPriceIdr: number;
      liveMarginPct: number;
      priceAlert: "MARGIN_DANGER" | "NORMAL";
      isSelected: boolean;
      health: "CRITICAL" | "WARNING" | "SAFE";
      error?: string;
    }> = [];

    const batchSize = 5;
    for (let i = 0; i < sellersToCheck.length; i += batchSize) {
      const batch = sellersToCheck.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const live = await fetchG2GLiveOffer(item.offerId);
          let health: "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
          if (live.available_qty === 0 || live.is_sold_out || live.status !== "live") {
            health = "CRITICAL";
          } else if (live.available_qty <= 4) {
            health = "WARNING";
          }

          // Price Spike Guard calculations
          const livePriceIdr = live.price_usd > 0 ? Math.ceil((live.price_usd * 16350) / 100) * 100 : item.recordedPriceIdr;
          const liveCogsNet = Math.round(livePriceIdr * 1.007);
          const shopeeFee = Math.round(item.sellingPriceShopeeIdr * 0.08) + 1000;
          const liveNetProfit = item.sellingPriceShopeeIdr - liveCogsNet - shopeeFee;
          const liveMarginPct = item.sellingPriceShopeeIdr > 0 ? (liveNetProfit / item.sellingPriceShopeeIdr) * 100 : 0;

          let priceAlert: "MARGIN_DANGER" | "NORMAL" = "NORMAL";
          const isPriceSpike = liveMarginPct < 12.0 || (item.recordedPriceIdr > 0 && livePriceIdr > item.recordedPriceIdr * 1.15);
          if (isPriceSpike && live.price_usd > 0) {
            priceAlert = "MARGIN_DANGER";
          }

          return {
            gameId: item.gameId,
            gameTitle: item.gameTitle,
            sellerId: item.sellerId,
            sellerName: live.seller_name !== "Unknown" ? live.seller_name : item.sellerName,
            offerId: item.offerId,
            productUrl: resolveG2GProductUrl(item.offerId, live.seller_name !== "Unknown" ? live.seller_name : item.sellerName, item.gameTitle),
            availableQty: live.available_qty,
            isOnline: live.is_online,
            status: live.status,
            priceUsd: live.price_usd,
            livePriceIdr,
            recordedPriceIdr: item.recordedPriceIdr,
            liveMarginPct,
            priceAlert,
            isSelected: item.isSelected,
            health,
            error: live.error,
          };
        })
      );
      auditResults.push(...batchResults);
    }

    // Auto-Failover: Check for price spikes on currently selected sellers
    let catalogModified = false;
    const failoverAlerts: string[] = [];

    for (const audited of auditResults) {
      if (audited.isSelected && audited.priceAlert === "MARGIN_DANGER") {
        const game = catalog.find((g: any) => g.id === audited.gameId);
        if (game && Array.isArray(game.sellers)) {
          // Cari seller cadangan di game yang sama dengan stock > 5 dan margin >= 15.0%
          const backupSeller = game.sellers.find((s: any) => {
            if (s.seller_id === audited.sellerId) return false;
            const sStock = s.stock || 0;
            const sMargin = s.net_margin_pct !== undefined ? s.net_margin_pct : 0;
            const sStatus = s.live_status || "live";
            return sStock > 5 && sMargin >= 15.0 && sStatus !== "dead" && sStatus !== "out_of_stock";
          });

          if (backupSeller) {
            console.log(`[Auto-Failover] Price spike on ${game.title} (Seller: ${audited.sellerName}). Switching to backup: ${backupSeller.seller_name}`);
            game.selected_seller_id = backupSeller.seller_id;
            catalogModified = true;

            const failoverMsg = (
              `🚨 *[AUTO-FAILOVER: LONJAKAN HARGA SUPPLIER]*\n`
              + `━━━━━━━━━━━━━━━━━━━━━━\n`
              + `🎮 *Game:* \`${game.title}\`\n`
              + `⚠️ *Lonjakan Terdeteksi:* Supplier utama (\`${audited.sellerName}\`) mengalami lonjakan harga!\n`
              + `• Modal Baru: *Rp ${audited.livePriceIdr.toLocaleString("id-ID")}* (Sebelumnya: Rp ${audited.recordedPriceIdr.toLocaleString("id-ID")})\n`
              + `• Proyeksi Margin: *${audited.liveMarginPct.toFixed(1)}%* (Batas Bahaya: < 12.0%)\n\n`
              + `🛡️ *Tindakan Otonom:* Otomatis dialihkan ke Supplier Cadangan Sehat:\n`
              + `• Supplier Baru: *${backupSeller.seller_name}*\n`
              + `• Margin Supplier Baru: *${(backupSeller.net_margin_pct || 0).toFixed(1)}%* | Stok: *${backupSeller.stock} Unit*\n`
              + `━━━━━━━━━━━━━━━━━━━━━━\n`
              + `⚡ _Katalog Shopee & Web Store telah diperbarui otonom tanpa jeda penjualan._`
            );
            await sendTelegramAlert(failoverMsg);
            failoverAlerts.push(game.id);
          }
        }
      }
    }

    if (catalogModified) {
      writeAuthoritativeCatalog(catalog);
    }

    // Filter alerts
    const criticalItems = auditResults.filter((r) => r.health === "CRITICAL");
    const warningItems = auditResults.filter((r) => r.health === "WARNING");
    const safeCount = auditResults.filter((r) => r.health === "SAFE").length;

    const alertsSent: string[] = [...failoverAlerts];

    // Send Critical Alerts (0 Stock / Sold Out)
    for (const item of criticalItems) {
      const priceIdr = Math.ceil((item.priceUsd * 16350) / 100) * 100;
      const priceStr = priceIdr > 0 ? `Rp ${priceIdr.toLocaleString("id-ID")}` : "-";
      const categoryUrl = getG2GGameCategoryUrl(item.gameTitle);
      const alertMsg = (
        `🚨 *[ALERT STOK KRITIS / SOLD OUT]*\n`
        + `━━━━━━━━━━━━━━━━━━━━━━\n`
        + `🎮 *Game:* \`${item.gameTitle}\`\n`
        + `👤 *Seller:* \`${item.sellerName}\` (${item.isOnline ? "🟢 Online" : "⚪ Offline"})\n`
        + `🔴 *Sisa Stok:* *0 UNIT (HABIS)*\n`
        + `💵 *Harga Modal:* ${priceStr}\n`
        + `🔗 *Tautan Listing:* ${item.productUrl}\n`
        + `🌐 *Etalase Lengkap (Semua Seller):*\n${categoryUrl}\n\n`
        + `⚠️ *TINDAKAN CEPAT:* Segera matikan listing Shopee atau switch ke supplier cadangan di web dashboard!`
      );
      await sendTelegramAlert(alertMsg);
      alertsSent.push(item.offerId);
    }

    // Send Warning Alerts (Stock <= 4)
    for (const item of warningItems) {
      const priceIdr = Math.ceil((item.priceUsd * 16350) / 100) * 100;
      const priceStr = priceIdr > 0 ? `Rp ${priceIdr.toLocaleString("id-ID")}` : "-";
      const categoryUrl = getG2GGameCategoryUrl(item.gameTitle);
      const alertMsg = (
        `🟡 *[ALERT STOK MENIPIS]*\n`
        + `━━━━━━━━━━━━━━━━━━━━━━\n`
        + `🎮 *Game:* \`${item.gameTitle}\`\n`
        + `👤 *Seller:* \`${item.sellerName}\` (${item.isOnline ? "🟢 Online" : "⚪ Offline"})\n`
        + `⚠️ *Sisa Stok:* *HANYA ${item.availableQty} UNIT TERSISA!*\n`
        + `💵 *Harga Modal:* ${priceStr}\n`
        + `🔗 *Tautan Listing:* ${item.productUrl}\n`
        + `🌐 *Etalase Lengkap (Semua Seller):*\n${categoryUrl}\n\n`
        + `💡 *Saran:* Pantau pesanan masuk atau persiapkan supplier alternatif di web dashboard.`
      );
      await sendTelegramAlert(alertMsg);
      alertsSent.push(item.offerId);
    }

    // If heartbeat requested or force alert
    if ((heartbeat || forceAlert) && alertsSent.length === 0) {
      const hbMsg = (
        `🛡️ *[LAPORAN MARKET SENTRY 24/7]*\n`
        + `━━━━━━━━━━━━━━━━━━━━━━\n`
        + `Status: 🟢 SEMUA STOK AMAN\n`
        + `• Total Seller Diaudit: *${auditResults.length} Seller*\n`
        + `• 🟢 Stok Aman: *${safeCount} Seller*\n`
        + `• 🟡 Stok Menipis: *${warningItems.length} Seller*\n`
        + `• 🔴 Stok Habis: *${criticalItems.length} Seller*\n`
        + `━━━━━━━━━━━━━━━━━━━━━━\n`
        + `⚡ _Audit otonom dijalankan live dari server cloud Akshara._`
      );
      await sendTelegramAlert(hbMsg);
    }

    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      auditedCount: auditResults.length,
      safeCount,
      warningCount: warningItems.length,
      criticalCount: criticalItems.length,
      alertsDispatched: alertsSent.length,
      alerts: [...criticalItems, ...warningItems].map((i) => ({
        game: i.gameTitle,
        seller: i.sellerName,
        offerId: i.offerId,
        stock: i.availableQty,
        url: i.productUrl,
        health: i.health,
      })),
    });
  } catch (error: any) {
    console.error("[Cron Sentry Error]:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
