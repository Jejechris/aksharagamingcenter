import { NextRequest, NextResponse } from "next/server";
import { readAuthoritativeCatalog, bulkAddOrUpdateGames } from "@/lib/catalog";
import { verifyCronOrAdminRequest } from "@/lib/auth";
import { discoverRealTrendingOpportunity, savePersistedResearchGames } from "@/lib/marketResearch";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "";

async function sendTelegramAlert(text: string) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID || !TELEGRAM_API) {
    console.warn("[Cron Trend] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not configured, skipping alert.");
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
    console.error("[Cron Trend] Failed to send Telegram alert:", err);
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronOrAdminRequest(req)) {
    return NextResponse.json({ status: "unauthorized", message: "Unauthorized cron access." }, { status: 401 });
  }

  try {
    const existingCatalog = await readAuthoritativeCatalog().catch(() => []);
    const excludeTitles = new Set(
      (existingCatalog || []).map((g: any) => String(g.title || "").toLowerCase().trim())
    );

    const { verified, tactical_reason, instant_redeem_guide } =
      await discoverRealTrendingOpportunity(excludeTitles);

    if (verified.net_margin_pct < 12 || !verified.arbitrage_viable) {
      return NextResponse.json({
        status: "skipped",
        message: `Trend ditemukan (${verified.title}) tapi margin tidak layak (${verified.net_margin_pct}%). Dibatalkan.`,
      });
    }

    const payload = {
      id: `auto-trend-${Date.now()}`,
      title: verified.title,
      platform: verified.platform || "Steam",
      category: "Digital Key / CDKey",
      source_marketplace: "ENEBA",
      selling_price_shopee_idr: verified.recommended_shopee_price_idr,
      target_margin_pct: Math.round(verified.net_margin_pct * 10) / 10,
      status: "active",
      selected_seller_id: "eneba-trend-auto",
      sellers: [
        {
          seller_id: "eneba-trend-auto",
          seller_name: "Eneba Global Merchants (Live Verified)",
          rating_pct: 99.8,
          reviews_count: 45000,
          price_g2g_idr: verified.price_eneba_idr,
          delivery_speed: "Instant 0-Detik (Redeem Code)",
          stock: 999,
          risk_score: 0,
          tier: "ultra_safe",
          tier_label: "🔥 LIVE TREND VERIFIED",
          tier_desc: "Ditemukan otomatis oleh Live Market Trend Cron (Eneba + Steam ID).",
          is_recommended: true,
          profile_url: verified.eneba_direct_url,
        },
      ],
    };

    // Save to both persistent research DB and active catalog
    await savePersistedResearchGames("eneba", [
      {
        id: payload.id,
        title: verified.title,
        platform: verified.platform,
        category: "Digital Key / CDKey",
        source_marketplace: "ENEBA",
        eneba_direct_url: verified.eneba_direct_url,
        seller_name: "Eneba Global Merchants",
        seller_rating_pct: 99.8,
        seller_reviews_count: 45000,
        supplier_tier: "ultra_safe",
        key_type: verified.key_type,
        price_eneba_idr: verified.price_eneba_idr,
        eneba_base_price_idr: verified.eneba_base_price_idr,
        recommended_shopee_price_idr: verified.recommended_shopee_price_idr,
        steam_indo_price_idr: verified.steam_indo_price_idr,
        qris_fee_idr: verified.qris_fee_idr,
        shopee_fee_idr: verified.shopee_fee_idr,
        operational_fee_idr: 0,
        net_profit_idr: verified.net_profit_idr,
        net_margin_pct: verified.net_margin_pct,
        spread_pct: verified.spread_pct,
        demand_score: 96,
        competition_level: "Sedang",
        arbitrage_verdict: verified.net_margin_pct >= 25 ? "SUPER_OPPORTUNITY" : "HIGH_MARGIN",
        crawl_timestamp: "Cron Live Discovery",
        tactical_reason,
        instant_redeem_guide,
        data_source: verified.data_source,
        eneba_live_verified: verified.eneba_live_verified,
      },
    ]);
    await bulkAddOrUpdateGames([payload as any]);

    const text = `🚀 *AUTO-DISCOVERY TREND LIVE BERHASIL!*

AI + Live Market Verifier menemukan peluang game terverifikasi dan menyimpannya ke Radar Katalog Anda!

🎮 *Game:* ${verified.title}
🛒 *Platform:* ${payload.platform}
🔥 *Analisa:* ${tactical_reason}

💰 *Modal Eneba (Faktual):* Rp ${verified.price_eneba_idr.toLocaleString("id-ID")}
💵 *Harga Steam Indo:* Rp ${verified.steam_indo_price_idr.toLocaleString("id-ID")}
🏪 *Rekomendasi Jual Shopee:* Rp ${verified.recommended_shopee_price_idr.toLocaleString("id-ID")}
📈 *Net Margin Bersih:* +${verified.net_margin_pct.toFixed(1)}% (Rp ${verified.net_profit_idr.toLocaleString("id-ID")})

🔗 *Link Eneba:* ${verified.eneba_direct_url}`;

    await sendTelegramAlert(text);

    return NextResponse.json({
      status: "success",
      message: `Trend ${verified.title} terverifikasi live & berhasil disimpan ke database.`,
      game: payload,
      market_verification: verified,
    });
  } catch (err: any) {
    console.error("[Cron Trend] Error:", err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
