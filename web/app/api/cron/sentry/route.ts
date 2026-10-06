import { NextRequest, NextResponse } from "next/server";
import { readAuthoritativeCatalog } from "@/lib/catalog";
import { fetchG2GLiveOffer, extractG2GOfferId } from "@/lib/g2gStock";
import { resolveG2GProductUrl, getG2GGameCategoryUrl } from "@/lib/g2g";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8911523018:AAFvUAesNmjOov7gWiuL9Sf9DePavy2fUpI";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "7025906160";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramAlert(text: string) {
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

    const catalog = await readAuthoritativeCatalog();
    if (!catalog || catalog.length === 0) {
      return NextResponse.json({ status: "empty_catalog", message: "Katalog kosong." });
    }

    const sellersToCheck: Array<{
      gameTitle: string;
      sellerName: string;
      offerId: string;
      previousStock: number;
    }> = [];

    for (const game of catalog) {
      for (const s of game.sellers || []) {
        const rawId = s.offer_id || extractG2GOfferId(s.profile_url);
        if (rawId) {
          const offerId = extractG2GOfferId(rawId);
          if (offerId) {
            sellersToCheck.push({
              gameTitle: game.title,
              sellerName: s.seller_name,
              offerId,
              previousStock: s.stock || 0,
            });
          }
        }
      }
    }

    // Limit concurrency to 5 requests at a time
    const auditResults: Array<{
      gameTitle: string;
      sellerName: string;
      offerId: string;
      productUrl: string;
      availableQty: number;
      isOnline: boolean;
      status: string;
      priceUsd: number;
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
          return {
            gameTitle: item.gameTitle,
            sellerName: live.seller_name !== "Unknown" ? live.seller_name : item.sellerName,
            offerId: item.offerId,
            productUrl: resolveG2GProductUrl(item.offerId, live.seller_name !== "Unknown" ? live.seller_name : item.sellerName, item.gameTitle),
            availableQty: live.available_qty,
            isOnline: live.is_online,
            status: live.status,
            priceUsd: live.price_usd,
            health,
            error: live.error,
          };
        })
      );
      auditResults.push(...batchResults);
    }

    // Filter alerts
    const criticalItems = auditResults.filter((r) => r.health === "CRITICAL");
    const warningItems = auditResults.filter((r) => r.health === "WARNING");
    const safeCount = auditResults.filter((r) => r.health === "SAFE").length;

    const alertsSent: string[] = [];

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
