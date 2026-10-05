import { NextRequest, NextResponse } from "next/server";
import { fetchG2GLiveOffer, extractG2GOfferId } from "@/lib/g2gStock";
import { VERIFIED_ENEBA_CATALOG } from "@/lib/eneba";
import fs from "fs";
import path from "path";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8911523018:AAFvUAesNmjOov7gWiuL9Sf9DePavy2fUpI";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "7025906160";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
  } catch (error) {
    console.error("[Telegram Webhook] sendMessage error:", error);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || "" }),
    });
  } catch (error) {
    console.error("[Telegram Webhook] answerCallback error:", error);
  }
}

function getMainMenuMarkup() {
  return {
    inline_keyboard: [
      [
        { text: "📦 Cek Stok Live (G2G)", callback_data: "btn_stock" },
        { text: "⚡ Radar Eneba CDKey", callback_data: "btn_eneba" },
      ],
      [
        { text: "📋 Format Pesanan Shopee", callback_data: "btn_format_help" },
        { text: "🧮 Hitung Quant & BEP", callback_data: "btn_quant_help" },
      ],
      [
        { text: "📊 Briefing Harian", callback_data: "btn_briefing" },
      ],
    ],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const webhookUrl = searchParams.get("url");

  if (action === "set" && webhookUrl) {
    const res = await fetch(`${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await res.json();
    return NextResponse.json({ status: "setWebhook", result: data });
  }

  if (action === "delete") {
    const res = await fetch(`${TELEGRAM_API}/deleteWebhook`);
    const data = await res.json();
    return NextResponse.json({ status: "deleteWebhook", result: data });
  }

  // Get info
  const infoRes = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
  const info = await infoRes.json();
  return NextResponse.json({
    service: "Akshara Telegram Vercel Webhook",
    status: "active",
    webhookInfo: info,
    instructions: {
      set_webhook: "Panggil GET ?action=set&url=https://<domain-vercel>/api/telegram/webhook untuk hosting cloud 24/7",
      delete_webhook: "Panggil GET ?action=delete jika ingin menggunakan bot daemon lokal laptop",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // 1. Handle Inline Button Callbacks
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || "";
      const chatId = cb.from?.id || ADMIN_CHAT_ID;
      await answerCallbackQuery(cb.id, "Memproses permintaan...");

      if (data === "btn_stock") {
        await handleStockCommand(chatId);
      } else if (data === "btn_eneba") {
        await handleEnebaCommand(chatId, "minecraft");
      } else if (data === "btn_format_help") {
        await sendTelegramMessage(
          chatId,
          "ℹ️ *Format Pesanan:* Ketik `/format <game> | <buyer> | <key>`\nContoh: `/format Project Zomboid | Budi | STEAM-KEY-1234`"
        );
      } else if (data === "btn_quant_help") {
        await sendTelegramMessage(
          chatId,
          "ℹ️ *The Quant:* Ketik `/quant <harga_jual> <modal_idr_atau_usd>`\nContoh: `/quant 219000 135000`"
        );
      } else if (data === "btn_briefing") {
        await handleBriefingCommand(chatId);
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Text Messages
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chatId = message.chat?.id || ADMIN_CHAT_ID;
    const cmd = text.split(" ")[0].toLowerCase();
    const argsText = text.substring(cmd.length).trim();

    if (cmd === "/start" || cmd === "/menu") {
      await sendTelegramMessage(
        chatId,
        "🚀 *[AKSHARA GAMING CENTER — CLOUD COMMAND DECK]*\n"
        + "━━━━━━━━━━━━━━━━━━━━━━\n"
        + "Halo Senna! Sistem komando otonom Akshara aktif di cloud Vercel 24/7.\n"
        + "Semua harga terkalibrasi resmi dalam *Rupiah (IDR)*.\n\n"
        + "⚡ *Perintah Cepat:*\n"
        + "• `/stock` — Cek stok live G2G SLS API (dalam Rupiah)\n"
        + "• `/eneba <game>` — Cek modal checkout Eneba & rekomendasi Shopee\n"
        + "• `/quant <jual> <modal>` — Kalkulasi profit bersih, fee Shopee & BEP\n"
        + "• `/format <game> | <buyer> | <key>` — Format pengiriman anti-hackback\n"
        + "• `/g2g <offer_id>` — Cek offer G2G langsung\n"
        + "• `/briefing` — Ringkasan eksekutif harian",
        getMainMenuMarkup()
      );
    } else if (cmd === "/stock" || cmd === "/cekstok" || cmd === "/stok") {
      await handleStockCommand(chatId);
    } else if (cmd === "/eneba" || cmd === "/cdkey") {
      await handleEnebaCommand(chatId, argsText);
    } else if (cmd === "/quant" || cmd === "/hitung") {
      await handleQuantCommand(chatId, argsText);
    } else if (cmd === "/format" || cmd === "/kirim") {
      await handleFormatCommand(chatId, argsText);
    } else if (cmd === "/g2g" || cmd === "/offer") {
      await handleG2GCommand(chatId, argsText);
    } else if (cmd === "/briefing" || cmd === "/daily") {
      await handleBriefingCommand(chatId);
    } else if (cmd === "/help") {
      await sendTelegramMessage(
        chatId,
        "📖 *PANDUAN LENGKAP AKSHARA BOT (VERCEL CLOUD)*\n"
        + "━━━━━━━━━━━━━━━━━━━━━━\n"
        + "• `/stock` — Laporan stok faktual & harga modal Rupiah\n"
        + "• `/eneba <game>` — Modal Eneba dalam Rupiah (termasuk fee checkout)\n"
        + "• `/quant <jual> <modal>` — Hitung untung bersih dalam Rupiah\n"
        + "• `/format <game> | <buyer> | <key>` — Susun chat pengiriman Shopee\n"
        + "• `/g2g <offer_id>` — Live inspect link listing G2G\n"
        + "• `/menu` — Tampilkan tombol menu interaktif"
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook Handler Error]", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

async function handleStockCommand(chatId: string | number) {
  try {
    const catalogPath = path.join(process.cwd(), "data", "active_catalog.json");
    if (!fs.existsSync(catalogPath)) {
      await sendTelegramMessage(chatId, "⚠️ File katalog tidak ditemukan di server.");
      return;
    }

    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    const sellersToCheck: Array<{ gameTitle: string; sellerName: string; offerId: string }> = [];

    for (const game of catalog) {
      for (const s of game.sellers || []) {
        const rawId = s.offer_id || extractG2GOfferId(s.profile_url);
        if (rawId) {
          const offerId = extractG2GOfferId(rawId);
          if (offerId && sellersToCheck.length < 8) {
            sellersToCheck.push({
              gameTitle: game.title,
              sellerName: s.seller_name,
              offerId,
            });
          }
        }
      }
    }

    await sendTelegramMessage(chatId, "🔍 _Menghubungi server G2G SLS API... Mohon tunggu._");

    const results = await Promise.all(
      sellersToCheck.map(async (item) => {
        const data = await fetchG2GLiveOffer(item.offerId);
        return { ...item, ...data };
      })
    );

    const lines = [
      "📦 *[LAPORAN LIVE STOK G2G SLS — RUPIAH]*",
      "━━━━━━━━━━━━━━━━━━━━━━",
    ];

    for (const r of results) {
      const priceUsd = r.price_usd || 0;
      const priceIdr = Math.ceil((priceUsd * 16350) / 100) * 100;
      const priceStr = priceIdr > 0 ? `Rp ${priceIdr.toLocaleString("id-ID")}` : "-";
      const onlineBadge = r.is_online ? "🟢 On" : "⚪ Off";
      const healthEmoji = (r.available_qty || 0) <= 4 ? "🟡" : "🟢";

      lines.push(
        `${healthEmoji} *${r.gameTitle}*\n`
        + `   • Seller: \`${r.seller_name}\` (${onlineBadge})\n`
        + `   • Stok Faktual: *${(r.available_qty || 0).toLocaleString("id-ID")} Unit* | Modal: *${priceStr}* (\`${r.offerId}\`)`
      );
    }

    lines.push("━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("⚡ _Semua harga modal terkonversi akurat dalam Rupiah (IDR)._");
    await sendTelegramMessage(chatId, lines.join("\n"));
  } catch (err: any) {
    await sendTelegramMessage(chatId, `❌ Gagal mengambil live stock: ${err.message}`);
  }
}

async function handleEnebaCommand(chatId: string | number, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    await sendTelegramMessage(chatId, "ℹ️ Ketik `/eneba <nama_game>`\nContoh: `/eneba minecraft` atau `/eneba zomboid`");
    return;
  }

  const matches = Object.values(VERIFIED_ENEBA_CATALOG).filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.platform.toLowerCase().includes(q)
  );

  if (matches.length > 0) {
    const lines = [`⚡ *[RADAR ENEBA CDKEY — ${query.toUpperCase()}]*`, "━━━━━━━━━━━━━━━━━━━━━━"];
    for (const item of matches.slice(0, 4)) {
      const recommendedShopee = Math.ceil((item.estimatedPriceIdr * 1.25) / 1000) * 1000;
      const shopeeFee = Math.ceil(recommendedShopee * 0.08) + 1000;
      const netProfit = recommendedShopee - item.estimatedPriceIdr - shopeeFee - 2000;
      const netMargin = Math.round((netProfit / recommendedShopee) * 100);

      lines.push(
        `🎮 *${item.title}*\n`
        + `• Platform: \`${item.platform}\` (${item.keyType})\n`
        + `• Modal Checkout Riil: *Rp ${item.estimatedPriceIdr.toLocaleString("id-ID")}*\n`
        + `• Rekomendasi Shopee: *Rp ${recommendedShopee.toLocaleString("id-ID")}*\n`
        + `• Potensi Laba Bersih: *+Rp ${netProfit.toLocaleString("id-ID")}* (+${netMargin}%)\n`
        + `• Keamanan: 🛡️ *0% Hackback (Redeem Langsung)*\n`
        + `• Link: ${item.defaultUrl}\n`
      );
    }
    lines.push("━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("💡 _Harga modal dalam Rupiah sudah mencakup kurs & fee checkout Eneba._");
    await sendTelegramMessage(chatId, lines.join("\n"));
  } else {
    await sendTelegramMessage(
      chatId,
      `🔍 Tidak ditemukan judul game '${query}' pada katalog utama Eneba.\nKetik nama game seperti 'minecraft', 'zomboid', 'terraria', atau 'gta'.`
    );
  }
}

async function handleQuantCommand(chatId: string | number, argsText: string) {
  const parts = argsText.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendTelegramMessage(
      chatId,
      "ℹ️ *Cara Pakai Quant:*\nKetik `/quant <harga_jual_idr> <modal_idr_atau_usd>`\n\nContoh:\n• `/quant 219000 135000` (Modal Rp 135.000)\n• `/quant 219000 8.20` (Modal $8.20)"
    );
    return;
  }

  const sellingPrice = parseFloat(parts[0].replace(/\./g, "").replace(/,/g, ""));
  let cogsInput = parseFloat(parts[1].replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "."));

  let cogsRawIdr = cogsInput;
  if (cogsInput < 1000) {
    cogsRawIdr = cogsInput * 16350;
  }

  const qrisFeeIdr = Math.ceil(cogsRawIdr * 0.007);
  const cogsNetIdr = cogsRawIdr + qrisFeeIdr;
  const shopeeAdminFee = Math.ceil(sellingPrice * 0.08);
  const shopeeServiceFee = 1000;
  const packagingCost = 2000;

  const totalCosts = cogsNetIdr + shopeeAdminFee + shopeeServiceFee + packagingCost;
  const netProfit = sellingPrice - totalCosts;
  const netMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const bep = Math.ceil((cogsNetIdr + shopeeServiceFee + packagingCost) / 0.92);

  const healthEmoji = netMargin >= 20 ? "🟢 SEHAT" : netMargin >= 10 ? "🟡 TIPIS" : "🔴 RUGI";

  const msg =
    "🧮 *[HASIL SIMULASI PROFIT — THE QUANT]*\n"
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + `💰 *Harga Jual Shopee:* Rp ${sellingPrice.toLocaleString("id-ID")}\n`
    + `💵 *Modal Sourcing:* Rp ${Math.round(cogsRawIdr).toLocaleString("id-ID")}\n`
    + `💳 *Fee QRIS (0.7%):* Rp ${qrisFeeIdr.toLocaleString("id-ID")}\n`
    + `📦 *Modal Bersih (COGS Net):* Rp ${Math.round(cogsNetIdr).toLocaleString("id-ID")}\n\n`
    + "📉 *POTONGAN & BIAYA TETAP:*\n"
    + `• Shopee Admin (8%): -Rp ${shopeeAdminFee.toLocaleString("id-ID")}\n`
    + `• Shopee Service Fee: -Rp ${shopeeServiceFee.toLocaleString("id-ID")}\n`
    + `• Amplop & Kartu A6: -Rp ${packagingCost.toLocaleString("id-ID")}\n\n`
    + "📊 *HASIL AKHIR:*\n"
    + `• *PROFIT BERSIH:* *Rp ${Math.round(netProfit).toLocaleString("id-ID")}*\n`
    + `• *Margin Bersih:* *${netMargin.toFixed(1)}%* (${healthEmoji})\n`
    + `• *Titik Impas (BEP):* Rp ${bep.toLocaleString("id-ID")}\n`
    + "━━━━━━━━━━━━━━━━━━━━━━";

  await sendTelegramMessage(chatId, msg);
}

async function handleFormatCommand(chatId: string | number, argsText: string) {
  if (!argsText || !argsText.includes("|")) {
    await sendTelegramMessage(
      chatId,
      "ℹ️ *Cara Pakai Format Pengiriman:*\nKetik `/format <game> | <pembeli> | <credential_key>`\n\nContoh:\n`/format Project Zomboid | Budi Santoso | STEAM-KEY-PZ-9981-LH`"
    );
    return;
  }

  const parts = argsText.split("|").map((p) => p.trim());
  const gameTitle = parts[0] || "Game Digital";
  const buyerName = parts[1] || "Pelanggan";
  const credential = parts[2] || "KODE-LISENSI-XXXX";
  const rndSerial = Math.random().toString(36).substring(2, 6).toUpperCase();
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const warrantyCode = `AKSHARA-${dateStr}-${rndSerial}`;

  const isKey = credential.toLowerCase().includes("key") || credential.includes("-");
  const step1 = isKey
    ? "1️⃣ *AKTIVASI REDEEM KEY RESMI:*\n• Buka launcher platform (Steam/Microsoft/dll).\n• Pilih menu 'Activate a Product' / 'Redeem Code'.\n• Masukkan CDKey di bawah. Game langsung aktif permanen di akun pribadi Anda!"
    : "1️⃣ *LOGIN & AMANKAN AKUN:*\n• Login ke launcher menggunakan email & password di bawah.\n• Segera ganti Password & Email ke milik Anda pribadi.\n• Aktifkan 2FA untuk keamanan maksimal!";

  const msg =
    "🎮 *[PENGIRIMAN PESANAN RESMI — AKSHARA GAMING CENTER]*\n"
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + `Halo kak *${buyerName}*, pesanan game *${gameTitle}* kakak telah selesai diproses!\n\n`
    + "📦 *DATA LISENSI RESMI:*\n"
    + `\`\`\`${credential}\`\`\`\n\n`
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + "🛡️ *PANDUAN 3-LANGKAH PENGGUNAAN AMAN:*\n\n"
    + `${step1}\n\n`
    + "2️⃣ *KONFIRMASI PENERIMAAN:*\n"
    + "• Periksa game dan pastikan berjalan lancar.\n"
    + "• Klik 'Pesanan Diterima' di Shopee dan berikan ulasan bintang 5 untuk mengaktifkan garansi toko.\n\n"
    + "3️⃣ *KLAIM GARANSI DIGITAL:*\n"
    + `• *Serial Garansi Anda:* \`${warrantyCode}\`\n`
    + "• Simpan kartu fisik A6 resmi yang dikirimkan ke alamat Anda.\n\n"
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + "✨ *Selamat Bermain & Happy Gaming!* 🚀";

  await sendTelegramMessage(chatId, msg);
}

async function handleG2GCommand(chatId: string | number, query: string) {
  const offerId = extractG2GOfferId(query);
  if (!offerId) {
    await sendTelegramMessage(
      chatId,
      "ℹ️ Masukkan Offer ID G2G yang valid.\nContoh: `/g2g G1703129821471UK`"
    );
    return;
  }

  await sendTelegramMessage(chatId, `🔍 _Memeriksa offer \`${offerId}\` ke server G2G SLS API..._`);
  const res = await fetchG2GLiveOffer(offerId);

  if (res.status !== "unknown" && !res.error) {
    const onlineStr = res.is_online ? "🟢 ONLINE" : "⚪ OFFLINE";
    const statusStr = res.status === "live" ? "🟢 LIVE AKTIF" : `🔴 ${res.status.toUpperCase()}`;
    const priceUsd = res.price_usd || 0;
    const priceIdr = Math.ceil((priceUsd * 16350) / 100) * 100;
    const priceStr = priceIdr > 0 ? `Rp ${priceIdr.toLocaleString("id-ID")}` : "N/A";

    const msg =
      "🎮 *[HASIL INSPEKSI OFFER G2G SLS]*\n"
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + `📦 *Offer ID:* \`${res.offer_id}\`\n`
      + `👤 *Seller:* \`${res.seller_name}\` (${onlineStr})\n`
      + `⭐ *Rating:* ${(res.rating_pct || 0).toFixed(1)}%\n`
      + `📊 *Status:* ${statusStr}\n`
      + `📦 *Stok Faktual:* *${(res.available_qty || 0).toLocaleString("id-ID")} UNIT*\n`
      + `💵 *Harga Modal Kulakan:* *${priceStr}*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "⚡ _Data langsung ditarik detik ini dari sls.g2g.com (dalam Rupiah)._";

    await sendTelegramMessage(chatId, msg);
  } else {
    await sendTelegramMessage(chatId, `❌ Gagal memeriksa offer \`${offerId}\`.`);
  }
}

async function handleBriefingCommand(chatId: string | number) {
  const nowStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const msg =
    "📊 *[EXECUTIVE BRIEFING — AKSHARA GAMING CENTER]*\n"
    + `🕒 *Waktu Sistem:* ${nowStr} WIB\n`
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + "🛡️ *Status Sentry:* 🟢 AKTIF (Monitoring G2G & Eneba)\n"
    + "⚡ *Gateway Aktif:* G2G SLS Direct & Eneba CDKey Terminal\n"
    + "💵 *Standar Mata Uang:* 100% RUPIAH (IDR)\n"
    + "💎 *Risiko Hackback:* 0% (Katalog Terverifikasi)\n"
    + "💳 *Metode Pembayaran:* QRIS Instant Pay (Fee 0.7%)\n\n"
    + "📦 *Pintasan Operasional:*\n"
    + "• Ketik `/stock` untuk audit live stok\n"
    + "• Ketik `/eneba <game>` untuk cek harga kulakan Rupiah\n"
    + "• Ketik `/quant <jual> <modal>` untuk hitung profit bersih";

  await sendTelegramMessage(chatId, msg);
}
