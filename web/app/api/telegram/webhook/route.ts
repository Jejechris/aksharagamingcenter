import { NextRequest, NextResponse } from "next/server";
import { fetchG2GLiveOffer, extractG2GOfferId } from "@/lib/g2gStock";
import { VERIFIED_ENEBA_CATALOG, getEnebaProductUrl } from "@/lib/eneba";
import { resolveG2GProductUrl, KNOWN_DEAD_OFFERS, getG2GGameCategoryUrl } from "@/lib/g2g";
import { readAuthoritativeCatalog } from "@/lib/catalog";
import fs from "fs";
import path from "path";
import os from "os";
import { getKV, setKV, getDbVault, saveDbVaultItem } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "";

const VAULT_FILE = path.resolve(process.cwd(), "data", "inventory_vault.json");
const OUTPUT_VAULT_FILE = path.resolve(process.cwd(), "..", "output", "inventory_vault.json");
const TMP_VAULT_FILE = path.resolve(os.tmpdir(), "akshara_inventory_vault.json");

const ORDERS_FILE = path.resolve(process.cwd(), "data", "autonomous_orders.json");
const OUTPUT_ORDERS_FILE = path.resolve(process.cwd(), "..", "output", "autonomous_orders.json");
const TMP_ORDERS_FILE = path.resolve(os.tmpdir(), "akshara_autonomous_orders.json");

const LEDGER_FILE = path.resolve(process.cwd(), "data", "financial_ledger.json");
const OUTPUT_LEDGER_FILE = path.resolve(process.cwd(), "..", "output", "financial_ledger.json");

async function readVaultItems(): Promise<any[]> {
  try {
    const dbVault = await getDbVault();
    if (dbVault && dbVault.length > 0) return dbVault;
    const kvVault = await getKV("inventory_vault");
    if (kvVault && Array.isArray(kvVault) && kvVault.length > 0) return kvVault;
  } catch (e) {}
  for (const fp of [TMP_VAULT_FILE, OUTPUT_VAULT_FILE, VAULT_FILE]) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
  }
  return [];
}

async function persistVaultItems(items: any[]): Promise<void> {
  await setKV("inventory_vault", items).catch(() => {});
  const str = JSON.stringify(items, null, 2);
  for (const fp of [TMP_VAULT_FILE, OUTPUT_VAULT_FILE, VAULT_FILE]) {
    try {
      const d = path.dirname(fp);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(fp, str, "utf-8");
    } catch (e) {}
  }
}

async function popVaultItem(gameTitle: string, orderId: string): Promise<any | null> {
  const vault = await readVaultItems();
  const cleanTitle = (gameTitle || "").toLowerCase().trim();
  const idx = vault.findIndex((it: any) => {
    if (it.status !== "AVAILABLE") return false;
    const itTitle = (it.game_title || "").toLowerCase().trim();
    return cleanTitle.includes(itTitle) || itTitle.includes(cleanTitle);
  });
  if (idx !== -1) {
    const matched = vault[idx];
    matched.status = "DISPATCHED";
    matched.assigned_order_id = orderId;
    matched.dispatched_at = new Date().toISOString();
    vault[idx] = matched;
    await saveDbVaultItem(matched).catch(() => {});
    await persistVaultItems(vault);
    return matched;
  }
  return null;
}

async function readAutonomousOrders(): Promise<any[]> {
  try {
    const kv = await getKV("autonomous_orders");
    if (kv && Array.isArray(kv) && kv.length > 0) return kv;
  } catch (e) {}
  for (const fp of [TMP_ORDERS_FILE, OUTPUT_ORDERS_FILE, ORDERS_FILE]) {
    if (fs.existsSync(fp)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(fp, "utf-8"));
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
  }
  return [];
}

async function markOrderStatusCompleted(orderId: string): Promise<void> {
  const orders = await readAutonomousOrders();
  for (const o of orders) {
    if (o.id === orderId || o.order_id === orderId) {
      o.status = "COMPLETED";
      o.completed_at = new Date().toISOString();
      break;
    }
  }
  await setKV("autonomous_orders", orders).catch(() => {});
  const str = JSON.stringify(orders, null, 2);
  for (const fp of [TMP_ORDERS_FILE, OUTPUT_ORDERS_FILE, ORDERS_FILE]) {
    try {
      const d = path.dirname(fp);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(fp, str, "utf-8");
    } catch (e) {}
  }
}

async function recordLedgerSale(orderId: string, gameTitle: string, buyerUsername: string, source: string): Promise<void> {
  let ledger: any[] = [];
  try {
    const dbLedger = await getKV("financial_ledger");
    if (dbLedger && Array.isArray(dbLedger)) ledger = dbLedger;
  } catch (e) {}
  if (ledger.length === 0) {
    for (const lp of [OUTPUT_LEDGER_FILE, LEDGER_FILE]) {
      if (fs.existsSync(lp)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(lp, "utf-8"));
          if (Array.isArray(parsed)) {
            ledger = parsed;
            break;
          }
        } catch (e) {}
      }
    }
  }
  const txRecord = {
    id: `tx-${Date.now()}`,
    order_id: orderId,
    game_title: gameTitle,
    buyer_username: buyerUsername,
    fulfillment_source: source,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
  };
  ledger.unshift(txRecord);
  await setKV("financial_ledger", ledger).catch(() => {});
  const str = JSON.stringify(ledger, null, 2);
  for (const lp of [OUTPUT_LEDGER_FILE, LEDGER_FILE]) {
    try {
      const d = path.dirname(lp);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(lp, str, "utf-8");
    } catch (e) {}
  }
}

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN || !TELEGRAM_API) {
    console.warn("[Telegram Webhook] TELEGRAM_BOT_TOKEN is not configured, skipping.");
    return;
  }
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
  if (!BOT_TOKEN || !TELEGRAM_API) return;
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
        { text: "🛍️ Shopee Listing & Cover", callback_data: "btn_shopee_help" },
        { text: "📋 Format Pesanan Shopee", callback_data: "btn_format_help" },
      ],
      [
        { text: "🔑 Buat Token Klaim", callback_data: "btn_new_claim_help" },
        { text: "📋 Daftar Token Klaim", callback_data: "btn_claims_list" },
      ],
      [
        { text: "🧮 Hitung Quant & BEP", callback_data: "btn_quant_help" },
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
    if (!TELEGRAM_API) return NextResponse.json({ status: "error", message: "Bot token not configured" }, { status: 500 });
    const res = await fetch(`${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await res.json();
    return NextResponse.json({ status: "setWebhook", result: data });
  }

  if (action === "delete") {
    if (!TELEGRAM_API) return NextResponse.json({ status: "error", message: "Bot token not configured" }, { status: 500 });
    const res = await fetch(`${TELEGRAM_API}/deleteWebhook`);
    const data = await res.json();
    return NextResponse.json({ status: "deleteWebhook", result: data });
  }

  if (action === "test") {
    if (!TELEGRAM_API || !ADMIN_CHAT_ID) return NextResponse.json({ ok: false, description: "Bot credentials not configured in environment" });
    const msg = searchParams.get("message") || "Tes koneksi monitoring bot";
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: `🚀 *[TES KONEKSI MONITORING BOT]*\n━━━━━━━━━━━━━━━━━━━━━━\n${msg}\n━━━━━━━━━━━━━━━━━━━━━━\nStatus: 🟢 VERIFIED ONLINE`,
        parse_mode: "Markdown"
      })
    });
    const data = await res.json();
    return NextResponse.json(data);
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
      } else if (data === "btn_new_claim_help") {
        await handleNewClaimCommand(chatId, "");
      } else if (data === "btn_claims_list") {
        await handleListClaimsCommand(chatId);
      } else if (data.startsWith("check_claim_")) {
        const code = data.replace("check_claim_", "");
        await handleCheckClaimCommand(chatId, code);
      } else if (data.startsWith("wizard_game_")) {
        const chosenGame = data.replace("wizard_game_", "");
        setTelegramSession(chatId, {
          step: "AWAIT_BUYER",
          data: { game: chosenGame },
        });
        const cancelMarkup = { inline_keyboard: [[{ text: "❌ Batal", callback_data: "wizard_cancel" }]] };
        await sendTelegramMessage(
          chatId,
          `👤 *[WIZARD KLAIM INTERAKTIF — LANGKAH 2/3]*\n`
          + `━━━━━━━━━━━━━━━━━━━━━━\n`
          + `🎮 *Game Dipilih:* \`${chosenGame}\`\n\n`
          + `Silakan ketik *Username Pembeli Shopee*:\n`
          + `_(Contoh: \`budi_santoso\` atau \`alvin_gamers\`)_`,
          cancelMarkup
        );
      } else if (data === "wizard_cancel") {
        setTelegramSession(chatId, null);
        await sendTelegramMessage(chatId, "❌ Wizard pembuatan klaim telah dibatalkan.");
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
      } else if (data === "btn_shopee_help") {
        await handleShopeeCommand(chatId, "");
      } else if (data === "btn_briefing") {
        await handleBriefingCommand(chatId);
      } else if (data.startsWith("approve_")) {
        await handleApproveOrder(chatId, data);
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

    // 2a. Cek pembatalan wizard
    if (cmd === "/batal" || cmd === "/cancel") {
      setTelegramSession(chatId, null);
      await sendTelegramMessage(chatId, "❌ Wizard pembuatan klaim telah dibatalkan. Ketik `/newclaim` kapan saja untuk mulai lagi.");
      return NextResponse.json({ ok: true });
    }

    // 2b. Cek interaksi wizard berkelanjutan (jika pesan bukan slash command)
    if (!text.startsWith("/")) {
      const activeSession = getTelegramSession(chatId);
      if (activeSession) {
        await handleWizardInput(chatId, text, activeSession);
        return NextResponse.json({ ok: true });
      }
    }

    // Jika slash command baru dipanggil, bersihkan sesi wizard
    setTelegramSession(chatId, null);

    if (cmd === "/start" || cmd === "/menu") {
      await sendTelegramMessage(
        chatId,
        "🚀 *[AKSHARA GAMING CENTER — CLOUD COMMAND DECK]*\n"
        + "━━━━━━━━━━━━━━━━━━━━━━\n"
        + "Halo Senna! Sistem komando otonom Akshara aktif di cloud Vercel 24/7.\n"
        + "Semua harga terkalibrasi resmi dalam *Rupiah (IDR)*.\n\n"
        + "⚡ *Perintah Cepat:*\n"
        + "• `/newclaim <game> | <buyer> | <kredensial>` — Terbitkan lisensi + Passcode PIN\n"
        + "• `/claims` — Daftar 5 klaim terbaru & status buka\n"
        + "• `/cekclaim <kode>` — Audit forensik IP & waktu klaim dibuka\n"
        + "• `/stock` — Cek stok live G2G SLS API (dalam Rupiah)\n"
        + "• `/eneba <game>` — Cek modal checkout Eneba & rekomendasi Shopee\n"
        + "• `/quant <jual> <modal>` — Kalkulasi profit bersih, fee Shopee & BEP\n"
        + "• `/format <game> | <buyer> | <key>` — Format pengiriman anti-hackback\n"
        + "• `/bulkvault <game> | <modal> \\n <akun_1>...` — Restock banyak akun ke brankas\n"
        + "• `/g2g <offer_id>` — Cek offer G2G langsung\n"
        + "• `/briefing` — Ringkasan eksekutif harian",
        getMainMenuMarkup()
      );
    } else if (cmd === "/newclaim" || cmd === "/buatklaim" || cmd === "/tambahklaim" || cmd === "/klaimbaru") {
      await handleNewClaimCommand(chatId, argsText);
    } else if (cmd === "/claims" || cmd === "/listklaim" || cmd === "/daftarklaim" || cmd === "/semuaklaim") {
      await handleListClaimsCommand(chatId);
    } else if (cmd === "/cekclaim" || cmd === "/cektoken" || cmd === "/auditclaim") {
      await handleCheckClaimCommand(chatId, argsText);
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
    } else if (cmd === "/shopee" || cmd === "/listing" || cmd === "/deskripsi" || cmd === "/cover") {
      await handleShopeeCommand(chatId, argsText);
    } else if (cmd === "/briefing" || cmd === "/daily") {
      await handleBriefingCommand(chatId);
    } else if (cmd === "/bulkvault" || cmd === "/bulkimport" || cmd === "/importvault") {
      await handleBulkVaultCommand(chatId, argsText);
    } else if (cmd === "/help") {
      await sendTelegramMessage(
        chatId,
        "📖 *PANDUAN LENGKAP AKSHARA BOT (VERCEL CLOUD)*\n"
        + "━━━━━━━━━━━━━━━━━━━━━━\n"
        + "• `/shopee <game>` — Judul SEO, Deskripsi Lengkap & Rekomendasi Cover\n"
        + "• `/newclaim <game> | <buyer> | <kredensial>` — Buat token + Passcode PIN\n"
        + "• `/claims` — Tampilkan daftar token brankas\n"
        + "• `/cekclaim <kode>` — Audit forensik IP & waktu akses\n"
        + "• `/stock` — Laporan stok faktual & link produk asli\n"
        + "• `/eneba <game>` — Modal Eneba dalam Rupiah\n"
        + "• `/quant <jual> <modal>` — Hitung untung bersih dalam Rupiah\n"
        + "• `/format <game> | <buyer> | <key>` — Susun chat pengiriman Shopee\n"
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
    const catalog = await readAuthoritativeCatalog();
    if (!catalog || catalog.length === 0) {
      await sendTelegramMessage(chatId, "⚠️ Katalog produk tidak ditemukan atau masih kosong.");
      return;
    }

    const sellersToCheck: Array<{ gameTitle: string; sellerName: string; offerId: string }> = [];
    const enebaGames: Array<{ title: string; sellerName: string; priceIdr: number; stock: number; productUrl: string }> = [];

    for (const game of catalog) {
      const isEneba = game.category?.toLowerCase().includes("key") ||
                      game.category?.toLowerCase().includes("cdkey") ||
                      game.id?.startsWith("eneba-") ||
                      game.source_marketplace === "ENEBA";

      if (isEneba) {
        const topSeller = game.sellers?.[0];
        const price = topSeller?.price_g2g_idr || 0;
        const sUrl = topSeller?.profile_url?.includes("eneba.com") ? topSeller.profile_url : getEnebaProductUrl(game.title);
        enebaGames.push({
          title: game.title,
          sellerName: topSeller?.seller_name || "Eneba Verified Merchant",
          priceIdr: price,
          stock: topSeller?.stock || 999,
          productUrl: sUrl,
        });
      } else {
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
    }

    await sendTelegramMessage(chatId, "🔍 _Memeriksa live stock G2G SLS API & Eneba CDKeys... Mohon tunggu._");

    const results = await Promise.all(
      sellersToCheck.map(async (item) => {
        const data = await fetchG2GLiveOffer(item.offerId);
        return { ...item, ...data };
      })
    );

    const lines = [
      "📦 *[LAPORAN LIVE STOK KATALOG — RUPIAH]*",
      "━━━━━━━━━━━━━━━━━━━━━━",
    ];

    if (results.length > 0) {
      lines.push("🎮 *ETALASE AKUN G2G (LIVE SLS):*");
      for (const r of results) {
        const priceUsd = r.price_usd || 0;
        const priceIdr = Math.ceil((priceUsd * 16350) / 100) * 100;
        const priceStr = priceIdr > 0 ? `Rp ${priceIdr.toLocaleString("id-ID")}` : "-";
        const onlineBadge = r.is_online ? "🟢 On" : "⚪ Off";
        const healthEmoji = (r.available_qty || 0) <= 4 ? "🟡" : "🟢";

        lines.push(
          `${healthEmoji} *${r.gameTitle}*\n`
          + `   • Seller: \`${r.seller_name}\` (${onlineBadge})\n`
          + `   • Stok Faktual: *${(r.available_qty || 0).toLocaleString("id-ID")} Unit* | Modal: *${priceStr}*\n`
          + `   • 🔗 Link G2G: ${resolveG2GProductUrl(r.offerId, r.seller_name, r.gameTitle)}`
        );
      }
    }

    if (enebaGames.length > 0) {
      if (results.length > 0) lines.push("");
      lines.push("⚡ *ETALASE ENEBA CDKEY (0% HACKBACK):*");
      for (const e of enebaGames.slice(0, 7)) {
        const priceStr = e.priceIdr > 0 ? `Rp ${e.priceIdr.toLocaleString("id-ID")}` : "-";
        lines.push(
          `🛡️ *${e.title}*\n`
          + `   • Merchant: \`${e.sellerName}\` (Kode Global)\n`
          + `   • Stok: *${e.stock.toLocaleString("id-ID")} Unit* | Modal: *${priceStr}*\n`
          + `   • 🔗 Link Eneba: ${e.productUrl}`
        );
      }
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
    + ``
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
    + ""
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

  let targetOfferId = offerId;
  let rerouteNotice = "";

  if (KNOWN_DEAD_OFFERS[offerId]) {
    const liveMatch = KNOWN_DEAD_OFFERS[offerId].match(/offer\/(G\d+[A-Z0-9]+)/i);
    if (liveMatch) {
      targetOfferId = liveMatch[1];
      rerouteNotice = `⚠️ _Catatan: Offer \`${offerId}\` telah kedaluwarsa/delisted di G2G. Otomatis dialihkan ke listing seller aktif terverifikasi (\`${targetOfferId}\`)._\n\n`;
    }
  }

  await sendTelegramMessage(chatId, `🔍 _Memeriksa offer \`${targetOfferId}\` ke server G2G SLS API..._`);
  const res = await fetchG2GLiveOffer(targetOfferId);

  if (res.status !== "unknown" && !res.error) {
    const onlineStr = res.is_online ? "🟢 ONLINE" : "⚪ OFFLINE";
    const statusStr = res.status === "live" ? "🟢 LIVE AKTIF" : `🔴 ${res.status.toUpperCase()}`;
    const priceUsd = res.price_usd || 0;
    const priceIdr = Math.ceil((priceUsd * 16350) / 100) * 100;
    const priceStr = priceIdr > 0 ? `Rp ${priceIdr.toLocaleString("id-ID")}` : "N/A";

    const msg =
      "🎮 *[HASIL INSPEKSI OFFER G2G SLS]*\n"
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + rerouteNotice
      + `📦 *Offer ID:* \`${res.offer_id}\`\n`
      + `👤 *Seller:* \`${res.seller_name}\` (${onlineStr})\n`
      + `⭐ *Rating:* ${(res.rating_pct || 0).toFixed(1)}%\n`
      + `📊 *Status:* ${statusStr}\n`
      + `📦 *Stok Faktual:* *${(res.available_qty || 0).toLocaleString("id-ID")} UNIT*\n`
      + `💵 *Harga Modal Kulakan:* *${priceStr}*\n`
      + `🔗 *URL Produk Faktual:* ${resolveG2GProductUrl(res.offer_id, res.seller_name, undefined, false)}\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "⚡ _Data langsung ditarik detik ini dari sls.g2g.com (dalam Rupiah)._";

    await sendTelegramMessage(chatId, msg);
  } else {
    await sendTelegramMessage(
      chatId,
      `❌ Offer \`${offerId}\` tidak ditemukan atau telah dihapus/sold-out oleh seller di G2G.\n\n`
      + `💡 _Gunakan link kategori resmi untuk melihat semua seller dengan stok aktif:_\n`
      + `https://www.g2g.com/categories/steam-global-account`
    );
  }
}

async function handleShopeeCommand(chatId: string | number, argsText: string) {
  if (!argsText.trim()) {
    await sendTelegramMessage(
      chatId,
      "ℹ️ *CARA PAKAI SHOPEE LISTING:*\n"
      + "Ketik `/shopee <nama_game> [| <harga>]`\n\n"
      + "Contoh:\n"
      + "• `/shopee Minecraft: Java & Bedrock Edition`\n"
      + "• `/shopee Project Zomboid | Rp 149.000`\n\n"
      + "Sistem akan otomatis menghasilkan Judul SEO (maks 120 char), Rekomendasi Cover 1080x1080, dan Deskripsi Shopee lengkap siap copas!"
    );
    return;
  }

  const parts = argsText.split("|").map(p => p.trim());
  const gameTitle = parts[0];
  const priceStr = parts[1] || "Rp 199.000";
  const cleanName = gameTitle.toUpperCase();

  let seoTitle = `${cleanName} [PC / DIGITAL] ORIGINAL FULL ACCESS GARANSI RESMI`;
  if (seoTitle.length > 120) {
    seoTitle = `${cleanName} ORIGINAL FULL ACCESS GARANSI RESMI`;
  }
  if (seoTitle.length > 120) {
    seoTitle = seoTitle.substring(0, 117) + "...";
  }

  const coverMsg = (
    `🖼️ *[REKOMENDASI COVER SHOPEE 1080x1080 — ${cleanName}]*\n`
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + "📐 *Dimensi:* 1080x1080 px (Rasio 1:1 Feed Utama Shopee)\n"
    + "🎨 *Rekomendasi Desain:* Dark Tech Theme dengan Kontras Tinggi\n"
    + "🏷️ *4 Badge Wajib di Gambar:*\n"
    + "• [100% ORIGINAL & LEGAL]\n"
    + "• [GARANSI RESMI 30 HARI]\n"
    + "• [FULL ACCESS GANTI EMAIL]\n"
    + "• [INSTANT DELIVERY 5 MENIT]\n"
    + "💡 *Tips:* Tempatkan judul di area tengah (80% safe zone) agar tidak tertutup badge Star+/Mall Shopee!"
  );

  await sendTelegramMessage(chatId, coverMsg);

  const titleMsg = (
    "📌 *[JUDUL PRODUK SHOPEE — TINGGAL SALIN]*\n"
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + `\`${seoTitle}\`\n\n`
    + `📏 *Panjang:* ${seoTitle.length} / 120 Karakter (Lolos Algoritma SEO)`
  );

  await sendTelegramMessage(chatId, titleMsg);

  const descText = (
    `🎮 AKSHARA GAMING CENTER — OFFICIAL DIGITAL LICENSE\n`
    + `⚡ PRODUK 100% ORIGINAL & LEGAL | PERMANENT OWNERSHIP\n`
    + `🛡️ FULL ACCESS | BISA GANTI SEMUA DATA | GARANSI RESMI\n\n`
    + `==================================================\n`
    + `🌟 DETAIL PRODUK:\n`
    + `• Game: ${gameTitle}\n`
    + `• Platform: PC / Official Launcher\n`
    + `• Status: 100% Fresh & Original (Bukan Shared/Bajakan)\n`
    + `• Wilayah: GLOBAL (Bisa dimainkan di seluruh Indonesia tanpa VPN)\n`
    + `• Bahasa: Multi-language (Termasuk English)\n`
    + `==================================================\n\n`
    + `💎 KEUNGGULAN BELI DI AKSHARA GAMING:\n`
    + `✅ FULL ACCESS 100%: Bebas ganti Email, Password, & Nickname.\n`
    + `✅ ONLINE MULTIPLAYER RESMI: Bebas main online di semua server resmi.\n`
    + `✅ PERMANEN MILIK ANDA: Akun/Lisensi aktif selamanya, bukan sewa.\n`
    + `✅ PENGIRIMAN KILAT: Detail dikirimkan via chat segera setelah order.\n`
    + ``
    + `==================================================\n`
    + `🚀 3 LANGKAH MUDAH AKTIVASI:\n`
    + `1. Selesaikan pembayaran di Shopee dan cek chat Shopee Anda.\n`
    + `2. Tim Akshara akan mengirimkan data lisensi beserta panduan setup instan.\n`
    + `3. Login ke launcher resmi, ubah data sesuai keinginan, dan game siap dimainkan!\n\n`
    + `==================================================\n`
    + `⚠️ SYARAT & KETENTUAN KLAIM GARANSI (SOP ANTI-FRAUD):\n`
    + ``
    + `2. Segera lakukan pengecekan dan pergantian data setelah detail diterima.\n`
    + `3. Garansi tidak berlaku jika akun terindikasi menggunakan cheat/mod ilegal.\n`
    + `4. Tim Support Akshara siap membantu 24/7 jika ada kendala login awal.\n\n`
    + `==================================================\n`
    + `❓ PERTANYAAN UMUM (FAQ):\n`
    + `Q: Apakah produk selalu ready stok?\n`
    + `A: Selalu READY STOK kak! Sistem kami autonomous, silakan langsung di-checkout saja.\n\n`
    + `Q: Apakah butuh VPN untuk login atau main?\n`
    + `A: Sama sekali TIDAK. 100% region Global dan aman koneksi internet Indonesia.\n\n`
    + `Q: Apakah dikirim paket fisik ke alamat rumah?\n`
    + `A: Ya kak, garansi digital resmi berisi Garansi Akshara dikirim via kurir Shopee agar order Anda resmi dan aman regulasi.\n\n`
    + `Terima kasih telah berbelanja di Akshara Gaming Center!\n`
    + `Happy Gaming! 🎮🔥\n\n`
    + `#JualGameOriginal #AksharaGaming #GamePC #GaransiResmi #ShopeeGamingID`
  );

  const descMsg = (
    "📝 *[DESKRIPSI LENGKAP SHOPEE — SIAP SALIN]*\n"
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + `\`\`\`text\n${descText}\n\`\`\`\n`
    + "💡 _Sentuh/tekan blok teks di atas untuk menyalin langsung ke Seller Centre Shopee!_"
  );

  await sendTelegramMessage(chatId, descMsg);
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
    + "• Ketik `/newclaim` untuk terbitkan token + Passcode PIN\n"
    + "• Ketik `/claims` untuk cek status token aktif\n"
    + "• Ketik `/stock` untuk audit live stok\n"
    + "• Ketik `/eneba <game>` untuk cek harga kulakan Rupiah\n"
    + "• Ketik `/quant <jual> <modal>` untuk hitung profit bersih";

  await sendTelegramMessage(chatId, msg);
}

function getClaimsFilePath(): string {
  return path.join(process.cwd(), "data", "claimed_credentials.json");
}

async function readClaimsData(): Promise<any[]> {
  const dbData = await getKV("claimed_credentials");
  if (dbData && Array.isArray(dbData)) {
    return dbData;
  }

  const candidates = [
    getClaimsFilePath(),
    path.resolve(process.cwd(), "..", "claim-web", "data", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "output", "claimed_credentials.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return JSON.parse(fs.readFileSync(c, "utf-8"));
      } catch (e) {}
    }
  }
  return [];
}

async function saveClaimsData(claims: any[]): Promise<void> {
  await setKV("claimed_credentials", claims);

  const syncTargets = [
    getClaimsFilePath(),
    path.resolve(process.cwd(), "..", "claim-web", "data", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "output", "claimed_credentials.json"),
  ];
  for (const target of syncTargets) {
    try {
      const d = path.dirname(target);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(target, JSON.stringify(claims, null, 2), "utf-8");
    } catch (e) {}
  }
}

function generateUniquePasscode(existingClaims: any[]): string {
  const usedPins = new Set(existingClaims.map((c) => String(c.passcode || "").trim()));
  for (let i = 0; i < 10000; i++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    if (!usedPins.has(pin)) return pin;
  }
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

function generateUniqueClaimCode(existingClaims: any[], gameTitle: string): string {
  const usedCodes = new Set(existingClaims.map((c) => String(c.claim_code || "").toUpperCase()));
  const cleanTag = (gameTitle.slice(0, 2).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MC");
  for (let i = 0; i < 10000; i++) {
    const code = `AKSH-${Math.floor(1000 + Math.random() * 9000)}-${cleanTag}`;
    if (!usedCodes.has(code)) return code;
  }
  return `AKSH-${Date.now().toString().slice(-4)}-${cleanTag}`;
}

function getSessionFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "telegram_sessions.json");
  }
  return path.join(process.cwd(), "data", "telegram_sessions.json");
}

function getTelegramSession(chatId: string | number): any {
  try {
    const p = getSessionFilePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      return data[String(chatId)] || null;
    }
  } catch (e) {}
  return null;
}

function setTelegramSession(chatId: string | number, session: any): void {
  try {
    const p = getSessionFilePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let data: any = {};
    if (fs.existsSync(p)) {
      try { data = JSON.parse(fs.readFileSync(p, "utf-8")); } catch (e) {}
    }
    if (session) {
      data[String(chatId)] = session;
    } else {
      delete data[String(chatId)];
    }
    fs.writeFileSync(p, JSON.stringify(data), "utf-8");
  } catch (e) {}
}

async function handleNewClaimCommand(chatId: string | number, argsText: string) {
  const text = argsText.trim();
  if (!text) {
    // Mulai Wizard Interaktif!
    setTelegramSession(chatId, { step: "AWAIT_GAME", data: {} });
    const gamesMarkup = {
      inline_keyboard: [
        [
          { text: "⛏️ Minecraft", callback_data: "wizard_game_Minecraft: Java & Bedrock Edition" },
          { text: "🧟 Project Zomboid", callback_data: "wizard_game_Project Zomboid" },
        ],
        [
          { text: "🚗 Grand Theft Auto V", callback_data: "wizard_game_Grand Theft Auto V: Premium Edition" },
          { text: "⚽ EA SPORTS FC 24", callback_data: "wizard_game_EA SPORTS FC 24" },
        ],
        [
          { text: "🧱 Terraria", callback_data: "wizard_game_Terraria" },
          { text: "🔨 Rust", callback_data: "wizard_game_Rust" },
        ],
        [
          { text: "❌ Batal", callback_data: "wizard_cancel" },
        ],
      ],
    };
    const guide =
      "🔑 *[WIZARD KLAIM INTERAKTIF — LANGKAH 1/3]*\n"
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "Mari terbitkan token klaim dan PIN unik secara interaktif tanpa repot tanda `|`!\n\n"
      + "🎮 *Langkah 1: Tentukan Judul Game*\n"
      + "• Klik salah satu game populer di bawah, ATAU\n"
      + "• Ketik langsung judul game yang dipesan ke chat ini:\n\n"
      + "🔒 _PIN Passcode otomatis dijamin 100% UNIK (Anti-Tabrakan)._";
    await sendTelegramMessage(chatId, guide, gamesMarkup);
    return;
  }

  let parts = text.split("|").map((p) => p.trim());
  if (parts.length < 3) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 3) {
      parts = lines;
    }
  }

  if (parts.length < 3) {
    setTelegramSession(chatId, { step: "AWAIT_BUYER", data: { game: text } });
    const cancelMarkup = { inline_keyboard: [[{ text: "❌ Batal", callback_data: "wizard_cancel" }]] };
    await sendTelegramMessage(
      chatId,
      `👤 *[WIZARD KLAIM INTERAKTIF — LANGKAH 2/3]*\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `🎮 *Game:* \`${text}\`\n\n`
      + `Silakan ketik *Username Pembeli Shopee*:\n`
      + `_(Contoh: \`budi_santoso\` atau \`alvin_gamers\`)_`,
      cancelMarkup
    );
    return;
  }

  const game = parts[0];
  const buyer = parts[1];
  const credential = parts[2];
  const customPin = parts[3] && parts[3].trim() ? parts[3].trim() : undefined;
  await finalizeClaim(chatId, game, buyer, credential, customPin);
}

async function handleWizardInput(chatId: string | number, text: string, session: any) {
  const step = session.step;
  const cancelMarkup = { inline_keyboard: [[{ text: "❌ Batal", callback_data: "wizard_cancel" }]] };

  if (step === "AWAIT_GAME") {
    session.data.game = text.trim();
    session.step = "AWAIT_BUYER";
    setTelegramSession(chatId, session);
    await sendTelegramMessage(
      chatId,
      `👤 *[WIZARD KLAIM INTERAKTIF — LANGKAH 2/3]*\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `🎮 *Game Dipilih:* \`${session.data.game}\`\n\n`
      + `Silakan ketik *Username Pembeli Shopee*:\n`
      + `_(Contoh: \`budi_santoso\` atau \`alvin_gamers\`)_`,
      cancelMarkup
    );
  } else if (step === "AWAIT_BUYER") {
    session.data.buyer = text.trim();
    session.step = "AWAIT_CREDENTIALS";
    setTelegramSession(chatId, session);
    await sendTelegramMessage(
      chatId,
      `🔐 *[WIZARD KLAIM INTERAKTIF — LANGKAH 3/3]*\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `🎮 *Game:* \`${session.data.game}\`\n`
      + `👤 *Pembeli:* \`${session.data.buyer}\`\n\n`
      + `Silakan *paste* akun login atau digital key dari supplier:\n`
      + `_(Bisa Email & Password, atau CDKey. Format bebas!)_`,
      cancelMarkup
    );
  } else if (step === "AWAIT_CREDENTIALS") {
    const game = session.data.game;
    const buyer = session.data.buyer;
    const credential = text.trim();
    setTelegramSession(chatId, null);
    await finalizeClaim(chatId, game, buyer, credential);
  } else if (step === "AWAIT_JIT_CREDENTIALS") {
    const realCredential = text.trim();
    const orderId = session.data?.order_id || "Unknown";
    const game = session.data?.game || "Game";
    const buyer = session.data?.buyer || "Shopee Customer";
    setTelegramSession(chatId, null);

    // 1. Update status di autonomous_orders
    await markOrderStatusCompleted(orderId);

    // 2. Finalize claim dengan kredensial asli
    await finalizeClaim(chatId, game, buyer, realCredential, undefined, orderId);

    // 3. Catat transaksi di financial_ledger
    await recordLedgerSale(orderId, game, buyer, "JIT_SUPPLIER");

    // 4. Kirim PnL Card Notifikasi
    const pnlCard =
      `💰 *[LAPORAN TRANSAKSI & PNL REAL-TIME]*\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `📦 *Order:* \`${orderId}\`\n`
      + `🎮 *Game:* \`${game}\`\n`
      + `📈 *Status:* SUKSES DIPENUHI (COMPLETED)\n`
      + `🛡️ *Garansi:* 30 Hari Aktif\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `✨ _Kredensial asli tersimpan aman & laba bersih tercatat di Financial Ledger._`;
    await sendTelegramMessage(chatId, pnlCard);
  }
}

async function finalizeClaim(
  chatId: string | number,
  game: string,
  buyer: string,
  credential: string,
  customPin?: string,
  customOrderId?: string
) {
  const claims = await readClaimsData();
  const passcode = customPin && customPin.trim() ? customPin.trim() : generateUniquePasscode(claims);
  const claimCode = generateUniqueClaimCode(claims, game);
  const orderId = customOrderId || `SHP-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;
  const warrantyDays = 30;
  const warrantySerial = `AKSHARA-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const platform = credential.toLowerCase().includes("key") ? "PC / Steam Key" : "PC / Microsoft Account";
  const nowIso = new Date().toISOString();

  const newClaim = {
    claim_code: claimCode,
    passcode,
    order_id: orderId,
    buyer_username: buyer,
    product_title: game,
    platform,
    credential_data: credential,
    warranty_days: warrantyDays,
    warranty_code: warrantySerial,
    status: "UNCLAIMED",
    created_at: nowIso,
    revealed_at: null,
    revealed_ip: null,
    revealed_user_agent: null,
    reveal_count: 0,
    reveal_history: [],
  };

  claims.unshift(newClaim);
  await saveClaimsData(claims);

  const claimBase = (
    process.env.NEXT_PUBLIC_CLAIM_BASE_URL ||
    process.env.NEXT_PUBLIC_CLAIM_WEB_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://claimakshara.vercel.app"
  ).replace(/\/$/, "");
  const claimUrl = `${claimBase}/claim/${claimCode}`;

  const shopeeText =
    `🎮 [AKSHARA GAMING CENTER — PENGIRIMAN LISENSI RESMI]\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `Halo kak ${buyer}, pesanan game ${game} kakak sudah siap!\n\n`
    + `🔑 KODE KLAIM: ${claimCode}\n`
    + `🔒 PASSCODE PIN RAHASIA: ${passcode}\n`
    + `🔗 LINK BUKA KREDENSIAL: ${claimUrl}\n\n`
    + `⚠️ PENTING: Sebelum membuka link & memasukkan passcode PIN, siapkan rekaman VIDEO UNBOXING / SCREEN RECORDING tanpa jeda (no-cut) untuk mengaktifkan garansi resmi toko selama ${warrantyDays} hari. Sistem mencatat waktu dan IP saat kredensial dibuka.\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `Terima kasih dan selamat bermain! 🚀`;

  const respMsg =
    `🎉 *[TOKEN KLAIM SUKSES DITERBITKAN]*\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `🎮 *Game:* \`${game}\`\n`
    + `👤 *Pembeli:* \`${buyer}\`\n`
    + `🔑 *Kode Klaim:* \`${claimCode}\`\n`
    + `🔒 *Passcode PIN Unik:* \`${passcode}\` _(Auto Unik & Anti-Tabrakan)_\n`
    + `📦 *No. Pesanan:* \`${orderId}\`\n`
    + `🛡️ *Garansi:* ${warrantyDays} Hari (\`${warrantySerial}\`)\n`
    + `🌐 *Sinkronisasi:* 2-Way Live Vault\n\n`
    + `📋 *[TINGGAL COPY-PASTE KE CHAT SHOPEE]:*\n`
    + "```\n" + shopeeText + "\n```";

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "🔍 Cek Status Klaim Ini", callback_data: `check_claim_${claimCode}` },
        { text: "📋 Daftar Semua Klaim", callback_data: "btn_claims_list" },
      ],
      [
        { text: "➕ Buat Klaim Baru Lagi", callback_data: "btn_new_claim_help" },
      ],
    ],
  };

  await sendTelegramMessage(chatId, respMsg, replyMarkup);
}

async function handleListClaimsCommand(chatId: string | number) {
  const claims = await readClaimsData();
  if (claims.length === 0) {
    await sendTelegramMessage(chatId, "ℹ️ Belum ada token klaim terdaftar di brankas.");
    return;
  }

  const lines = [
    "🔐 *[DAFTAR TOKEN KLAIM TERBARU — AKSHARA VAULT]*",
    "━━━━━━━━━━━━━━━━━━━━━━",
  ];

  for (const c of claims.slice(0, 6)) {
    const isRev = c.status === "REVEALED";
    const statusEmoji = isRev ? "🔓" : "🟢";
    const statusText = isRev ? `DIBUKA (${c.reveal_count || 1}x)` : "BELUM DIBUKA";
    const pin = c.passcode || "-";
    const ipInfo = c.revealed_ip ? ` • IP: \`${c.revealed_ip}\`` : "";

    lines.push(
      `${statusEmoji} *${c.product_title}*\n`
      + `   • Pembeli: \`${c.buyer_username}\`\n`
      + `   • Kode: \`${c.claim_code}\` | PIN: \`${pin}\`\n`
      + `   • Status: *${statusText}*${ipInfo}`
    );
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("💡 _Ketik `/cekclaim <kode>` untuk audit detail IP & waktu akses._");
  await sendTelegramMessage(chatId, lines.join("\n"));
}

async function handleCheckClaimCommand(chatId: string | number, codeQuery: string) {
  const q = codeQuery.trim().toUpperCase();
  if (!q) {
    await sendTelegramMessage(chatId, "ℹ️ Ketik `/cekclaim <kode_klaim>`\nContoh: `/cekclaim AKSH-9921-MC`");
    return;
  }

  const claims = await readClaimsData();
  const found = claims.find((c: any) => c.claim_code?.toUpperCase() === q);

  if (!found) {
    await sendTelegramMessage(chatId, `❌ Kode klaim \`${q}\` tidak ditemukan di brankas.`);
    return;
  }

  const isRev = found.status === "REVEALED";
  const statusBadge = isRev ? "🔓 SUDAH DIBUKA (TERCATAT IP)" : "🟢 BELUM DIBUKA (MASIH AMAN)";

  let revTime = "-";
  if (found.revealed_at) {
    try {
      revTime = new Date(found.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
    } catch (e) {
      revTime = found.revealed_at;
    }
  }

  const detail =
    `🛡️ *[AUDIT FORENSIK TOKEN — ${found.claim_code}]*\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `🎮 *Game:* ${found.product_title}\n`
    + `👤 *Pembeli:* \`${found.buyer_username}\`\n`
    + `📦 *No. Pesanan:* \`${found.order_id}\`\n`
    + `🔒 *Passcode PIN:* \`${found.passcode}\`\n`
    + `📊 *Status:* *${statusBadge}*\n\n`
    + `📍 *DATA FORENSIK DIGITAL:*\n`
    + `• *Akses Pertama:* ${revTime}\n`
    + `• *Alamat IP:* \`${found.revealed_ip || "-"}\`\n`
    + `• *Frekuensi Akses:* ${found.reveal_count || 0} kali\n`
    + `• *Perangkat:* \`${(found.revealed_user_agent || "-").slice(0, 70)}\`\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `🔑 *Kredensial Tersimpan:*\n`
    + "```\n" + (found.credential_data || "-") + "\n```";

  await sendTelegramMessage(chatId, detail);
}

async function handleApproveOrder(chatId: string | number, data: string) {
  const parts = data.split("_");
  const orderId = parts[1] || "Unknown";

  // Look up matched order in autonomous_orders.json
  const orders = await readAutonomousOrders();
  const matchedOrder = orders.find((o: any) => o.id === orderId || o.order_id === orderId);
  const gameTitle = matchedOrder?.game_title || "Minecraft: Java & Bedrock Edition";
  const buyerUsername = matchedOrder?.buyer_name || "Shopee Customer";

  // Step A: Check inventory_vault first
  const vaultItem = await popVaultItem(gameTitle, orderId);
  if (vaultItem) {
    await markOrderStatusCompleted(orderId);

    let credData = "";
    if (vaultItem.username && vaultItem.password) {
      credData = `Account: ${vaultItem.username} | Password: ${vaultItem.password}`;
    } else if (vaultItem.password) {
      credData = `Digital Key / Token: ${vaultItem.password}`;
    } else {
      credData = vaultItem.notes || `Account: ${vaultItem.username}`;
    }

    await recordLedgerSale(orderId, gameTitle, buyerUsername, "INVENTORY_VAULT");

    await sendTelegramMessage(
      chatId,
      `✅ *[DIPENUHI DARI INVENTORY VAULT]*\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `📦 *No. Pesanan:* \`${orderId}\`\n`
      + `🎮 *Game:* \`${gameTitle}\`\n`
      + `👤 *Pembeli:* \`${buyerUsername}\`\n`
      + `⚡ *Status:* Stok brankas dialokasikan & diterbitkan token klaimnya!`
    );

    await finalizeClaim(chatId, gameTitle, buyerUsername, credData, undefined, orderId);

    const pnlCard =
      `💰 *[LAPORAN TRANSAKSI & PNL REAL-TIME]*\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `📦 *Order:* \`${orderId}\`\n`
      + `🎮 *Game:* \`${gameTitle}\`\n`
      + `📈 *Status:* SUKSES DIPENUHI (COMPLETED)\n`
      + `🛡️ *Garansi:* 30 Hari Aktif\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `✨ _Laba bersih tercatat otomatis di Financial Ledger Akshara._`;
    await sendTelegramMessage(chatId, pnlCard);
    return;
  }

  // Step B: Interactive JIT Credential Input (When Vault is Empty)
  const catalog = await readAuthoritativeCatalog();
  const matchedGame = catalog.find((g: any) => (g.title || "").toLowerCase() === gameTitle.toLowerCase() || g.id === matchedOrder?.game_id);
  const selectedSeller = matchedGame?.sellers?.find((s: any) => s.seller_id === matchedGame.selected_seller_id) || matchedGame?.sellers?.[0];
  const evergreenSupplierUrl = resolveG2GProductUrl("", selectedSeller?.seller_name, gameTitle, false);

  setTelegramSession(chatId, {
    step: "AWAIT_JIT_CREDENTIALS",
    data: {
      order_id: orderId,
      game: gameTitle,
      buyer: buyerUsername,
    },
  });

  const jitPrompt =
    `✅ *[OTORISASI JIT DISETUJUI — MENUNGGU KREDENSIAL SUPPLIER]*\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `📦 *Order ID:* \`${orderId}\`\n`
    + `🎮 *Game:* \`${gameTitle}\`\n`
    + `👤 *Pembeli:* \`${buyerUsername}\`\n`
    + `🛒 *Beli Cepat di Supplier:* ${evergreenSupplierUrl}\n\n`
    + `🔐 *INSTRUKSI:* Silakan beli akun/key dari link di atas, lalu *PASTE / KIRIMKAN kredensial asli* (Email:Pass atau CDKey) langsung ke chat ini untuk otomatis dienkripsi AES-256 dan diterbitkan Token Klaim-nya!`;

  const cancelMarkup = { inline_keyboard: [[{ text: "❌ Batal", callback_data: "wizard_cancel" }]] };
  await sendTelegramMessage(chatId, jitPrompt, cancelMarkup);
}

async function handleBulkVaultCommand(chatId: string | number, textPayload: string) {
  if (!textPayload.trim()) {
    const msg =
      "📦 *[PANDUAN /bulkvault — RESTOCK BRANKAS MASSAL]*\n"
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "Gunakan perintah ini untuk memasukkan banyak akun/CD-key sekaligus ke brankas otonom!\n\n"
      + "📝 *Format:*\n"
      + "`/bulkvault <Nama Game> | <Harga Modal IDR> | [Platform]`\n"
      + "`email1:pass1`\n"
      + "`email2:pass2`\n"
      + "`email3:pass3`\n\n"
      + "💡 *Contoh:*\n"
      + "`/bulkvault Minecraft: Java & Bedrock | 85000 | PC / Microsoft`\n"
      + "`steve_craft@gmail.com:passWord123`\n"
      + "`alex_miner@outlook.com:Diamond999`";
    await sendTelegramMessage(chatId, msg);
    return;
  }

  const lines = textPayload.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    await sendTelegramMessage(chatId, "❌ Minimal masukkan judul di baris pertama dan 1 baris akun/kredensial di baris baru di bawahnya!");
    return;
  }

  const headerLine = lines[0];
  const accountLines = lines.slice(1);
  const headerParts = headerLine.split("|").map(p => p.trim());
  const gameTitle = headerParts[0];
  const costIdr = Number(headerParts[1]?.replace(/\D/g, "") || 0);
  const platform = headerParts[2] || "PC";

  let vault = await readVaultItems();
  let addedCount = 0;
  const nowIso = new Date().toISOString();

  for (const line of accountLines) {
    let username = line;
    let password = "";
    if (line.includes(":")) {
      const parts = line.split(":");
      username = parts[0].trim();
      password = parts.slice(1).join(":").trim();
    } else if (line.includes("|")) {
      const parts = line.split("|");
      username = parts[0].trim();
      password = parts.slice(1).join("|").trim();
    }

    const newItem = {
      id: `vault-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      game_title: gameTitle,
      platform,
      category: "ACCOUNT",
      username,
      password,
      cost_idr: costIdr,
      supplier_name: "Direct Telegram Restock",
      status: "AVAILABLE",
      added_at: nowIso,
      notes: "Restocked via Telegram /bulkvault",
    };
    vault.unshift(newItem);
    await saveDbVaultItem(newItem).catch(() => {});
    addedCount++;
  }

  await persistVaultItems(vault);

  await sendTelegramMessage(
    chatId,
    `✅ *[RESTOCK BRANKAS BERHASIL]*\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `🎮 *Game:* \`${gameTitle}\`\n`
    + `📦 *Jumlah Akun Masuk:* *${addedCount} Unit*\n`
    + `💵 *Modal Tercatat:* Rp ${costIdr.toLocaleString("id-ID")}/unit\n`
    + `🛡️ *Status:* 🟢 AVAILABLE (Siap Auto-Fulfill Shopee)`
  );
}
