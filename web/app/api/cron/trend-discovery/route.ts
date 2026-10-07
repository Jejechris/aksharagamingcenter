import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { getEnebaProductUrl } from "@/lib/eneba";
import { bulkAddOrUpdateGames } from "@/lib/catalog";

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
    console.error("[Cron Trend] Failed to send Telegram alert:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const prompt = `Berperanlah sebagai Market Intelligence Analyst untuk game PC di Indonesia.
Temukan 1 judul game yang SAAT INI sedang sangat viral dan memiliki potensi margin tinggi jika dibeli CDKey-nya di Eneba lalu dijual di Shopee Indonesia.
Game harus populer, valid, dan rilis.
Berikan estimasi harga modal kulakan Eneba (dalam IDR), harga jual rekomendasi di Shopee Indonesia, dan platform lisensi.
Format JSON only:
{
  "title": "Nama Game (Contoh: Monster Hunter Wilds)",
  "platform": "Steam",
  "category": "Digital Key / CDKey",
  "key_type": "Steam Key Global",
  "price_eneba_idr": 250000,
  "recommended_shopee_price_idr": 350000,
  "steam_indo_price_idr": 450000,
  "tactical_reason": "Alasan mengapa game ini sedang trending dan marginnya bagus."
}`;

    const rawAi = await callGemini(prompt);
    const cleaned = rawAi.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const qris = Math.round(parsed.price_eneba_idr * 0.007);
    const shopeeFee = Math.round(parsed.recommended_shopee_price_idr * 0.08) + 1000;
    const profit = parsed.recommended_shopee_price_idr - parsed.price_eneba_idr - qris - shopeeFee - 2000;
    const margin = parsed.recommended_shopee_price_idr > 0 ? (profit / parsed.recommended_shopee_price_idr) * 100 : 0;

    if (margin < 20) {
      return NextResponse.json({
        status: "skipped",
        message: `Trend ditemukan (${parsed.title}) tapi margin terlalu rendah (${margin.toFixed(1)}%). Dibatalkan.`,
      });
    }

    const payload = {
      id: `auto-trend-${Date.now()}`,
      title: parsed.title,
      platform: parsed.platform || "Steam",
      category: parsed.category || "Digital Key / CDKey",
      selling_price_shopee_idr: parsed.recommended_shopee_price_idr,
      target_margin_pct: Math.round(margin),
      status: "active",
      selected_seller_id: "eneba-trend-auto",
      sellers: [
        {
          seller_id: "eneba-trend-auto",
          seller_name: "Eneba Auto Discovery",
          rating_pct: 99.9,
          reviews_count: 50000,
          price_g2g_idr: parsed.price_eneba_idr,
          delivery_speed: "Instant Delivery",
          stock: 50,
          risk_score: 0,
          tier: "ultra_safe",
          tier_label: "🔥 TREND VIRAL",
          tier_desc: "Ditemukan otomatis oleh AI Market Intelligence Cron.",
          is_recommended: true,
          profile_url: getEnebaProductUrl(parsed.title),
        },
      ],
    };

    // Save directly to catalog
    await bulkAddOrUpdateGames([payload as any]);

    // Send Telegram Notification
    const text = `🚀 *AUTO-DISCOVERY TREND BERHASIL!*

AI Market Intelligence baru saja menemukan peluang game viral dan telah memasukkannya ke Radar Katalog Anda!

🎮 *Game:* ${parsed.title}
🛒 *Platform:* ${payload.platform}
🔥 *Alasan:* ${parsed.tactical_reason}

💰 *Estimasi Modal Eneba:* Rp ${parsed.price_eneba_idr.toLocaleString("id-ID")}
💵 *Rekomendasi Jual:* Rp ${parsed.recommended_shopee_price_idr.toLocaleString("id-ID")}
📈 *Net Margin Bersih:* +${margin.toFixed(1)}% (Rp ${profit.toLocaleString("id-ID")})

Cek Dashboard Akshara Anda sekarang untuk memproses listing Shopee-nya!`;

    await sendTelegramAlert(text);

    return NextResponse.json({
      status: "success",
      message: `Trend ${parsed.title} berhasil dianalisa dan disimpan.`,
      game: payload,
    });
  } catch (err: any) {
    console.error("[Cron Trend] Error:", err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
