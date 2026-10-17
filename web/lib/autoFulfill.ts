import fs from "fs";
import path from "path";
import os from "os";
import { getDbVault, saveDbVaultItem, getDbOrders, saveDbOrder, getKV, setKV } from "@/lib/db";
import { encryptCredential } from "@/lib/cryptoVault";
import { readAuthoritativeCatalog } from "@/lib/catalog";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

export interface AutoFulfillRequest {
  order_id: string;
  buyer_username: string;
  buyer_phone?: string;
  game_title: string;
  platform?: string;
  selling_price_idr: number;
  channel?: string;
}

function normalizeTitle(t: string): string {
  return (t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function getLocalVault(): any[] {
  const paths = [
    path.resolve(process.cwd(), "data", "inventory_vault.json"),
    path.resolve(process.cwd(), "..", "output", "inventory_vault.json"),
    path.resolve(os.tmpdir(), "akshara_inventory_vault.json"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
  }
  return [];
}

function saveLocalVault(items: any[]) {
  const jsonStr = JSON.stringify(items, null, 2);
  const paths = [
    path.resolve(process.cwd(), "data", "inventory_vault.json"),
    path.resolve(process.cwd(), "..", "output", "inventory_vault.json"),
    path.resolve(os.tmpdir(), "akshara_inventory_vault.json"),
  ];
  for (const p of paths) {
    try {
      const d = path.dirname(p);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(p, jsonStr, "utf-8");
    } catch (e) {}
  }
}

async function sendTelegram(message: string, inlineKeyboard?: any) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.warn("[Telegram Auto-Fulfill] Telegram token or chat ID is missing, skipping message.");
    return;
  }
  try {
    const payload: any = {
      chat_id: ADMIN_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };
    if (inlineKeyboard) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Telegram Auto-Fulfill Error]", err);
  }
}

export async function processAutoFulfillment(req: AutoFulfillRequest): Promise<any> {
  const {
    order_id,
    buyer_username,
    buyer_phone = "081234567890",
    game_title,
    platform = "PC / Steam Key",
    selling_price_idr,
    channel = "Shopee",
  } = req;

  // 1. Ambil data vault
  let vaultItems: any[] = [];
  try {
    const dbVault = await getDbVault();
    if (dbVault && dbVault.length > 0) {
      vaultItems = dbVault;
    } else {
      const kvVault = await getKV("inventory_vault");
      if (kvVault && Array.isArray(kvVault) && kvVault.length > 0) {
        vaultItems = kvVault;
      } else {
        vaultItems = getLocalVault();
      }
    }
  } catch (e) {
    vaultItems = getLocalVault();
  }

  // 2. Cari item AVAILABLE yang sesuai dengan judul game
  const cleanTarget = normalizeTitle(game_title);
  const matchIndex = vaultItems.findIndex((item: any) => {
    if (item.status !== "AVAILABLE") return false;
    const cleanItem = normalizeTitle(item.game_title);
    return cleanItem.includes(cleanTarget) || cleanTarget.includes(cleanItem);
  });

  // =========================================================================
  // CASE A: VAULT STOCK FOUND -> ZERO-TOUCH INSTANT FULFILLMENT ("SLEEP & EARN")
  // =========================================================================
  if (matchIndex !== -1) {
    const matchedItem = vaultItems[matchIndex];
    const nowIso = new Date().toISOString();

    // 1. Mark status DISPATCHED
    matchedItem.status = "DISPATCHED";
    matchedItem.assigned_order_id = order_id;
    matchedItem.dispatched_at = nowIso;
    vaultItems[matchIndex] = matchedItem;

    // Persist vault
    await saveDbVaultItem(matchedItem).catch(() => {});
    await setKV("inventory_vault", vaultItems).catch(() => {});
    saveLocalVault(vaultItems);

    // Hitung sisa stok brankas untuk game ini & kirim alert restock jika <= 1
    const remainingCount = vaultItems.filter((item: any) => {
      if (item.status !== "AVAILABLE") return false;
      const cleanItem = normalizeTitle(item.game_title);
      return cleanItem.includes(cleanTarget) || cleanTarget.includes(cleanItem);
    }).length;

    if (remainingCount <= 1) {
      readAuthoritativeCatalog().then((catalog: any[]) => {
        const matchedGame = catalog.find((g: any) => {
          const titleNorm = normalizeTitle(g.title);
          return titleNorm.includes(cleanTarget) || cleanTarget.includes(titleNorm);
        });

        let supplierInfo = "Cek Sourcing Radar di Command Deck";
        let modalPriceStr = "N/A";
        let supplierUrl = "https://www.g2g.com/id";

        if (matchedGame && Array.isArray(matchedGame.sellers) && matchedGame.sellers.length > 0) {
          const sorted = [...matchedGame.sellers].sort((a: any, b: any) => (a.price_g2g_idr || 0) - (b.price_g2g_idr || 0));
          const best = sorted[0];
          supplierInfo = `${best.seller_name} (${best.tier_label || "Supplier Terverifikasi"})`;
          modalPriceStr = `Rp ${(best.price_g2g_idr || 0).toLocaleString("id-ID")}`;
          supplierUrl = best.profile_url || "https://www.g2g.com/id";
        }

        const restockAlert = (
          `⚠️ *[PERINGATAN STOK BRANKAS MENIPIS: SISA ${remainingCount} UNIT]*\n`
          + `━━━━━━━━━━━━━━━━━━━━━━\n`
          + `🎮 *Game:* \`${game_title}\`\n`
          + `📦 *Sisa Stok Brankas:* *${remainingCount} UNIT TERSISA*\n`
          + `🛡️ *Rekomendasi Supplier:* \`${supplierInfo}\`\n`
          + `💵 *Harga Modal:* *${modalPriceStr}*\n`
          + `🔗 *Tautan Supplier Langsung:* ${supplierUrl}\n`
          + `━━━━━━━━━━━━━━━━━━━━━━\n`
          + `💡 *Tindakan:* Segera restock akun baru ke Brankas agar fitur instant "Sleep & Earn" tetap berjalan lancar!`
        );
        sendTelegram(restockAlert).catch(() => {});
      }).catch(() => {});
    }

    // 2. Generate claim code & passcode PIN
    const cleanTag = game_title.slice(0, 2).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MC";
    const claimCode = `AKSH-${Math.floor(1000 + Math.random() * 9000)}-${cleanTag}`;
    const passcodePin = String(Math.floor(100000 + Math.random() * 900000));
    const warrantySerial = `AKSHARA-${nowIso.slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Format & encrypt credential data
    const plainCred = `Username / ID: ${matchedItem.username}\nPassword: ${matchedItem.password}${matchedItem.notes ? `\nCatatan: ${matchedItem.notes}` : ""}`;
    const encryptedCred = encryptCredential(plainCred, passcodePin);

    // Save to claimed_credentials
    let claims: any[] = [];
    try {
      const dbClaims = await getKV("claimed_credentials");
      if (dbClaims && Array.isArray(dbClaims)) claims = dbClaims;
    } catch (e) {}

    const newClaim = {
      claim_code: claimCode,
      passcode: passcodePin,
      order_id,
      buyer_username,
      product_title: game_title,
      platform,
      credential_data: encryptedCred,
      is_encrypted: true,
      warranty_days: 30,
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
    await setKV("claimed_credentials", claims).catch(() => {});

    // Save claim backup to files
    const claimPaths = [
      path.resolve(process.cwd(), "data", "claimed_credentials.json"),
      path.resolve(process.cwd(), "..", "output", "claimed_credentials.json"),
      path.resolve(process.cwd(), "..", "claim-web", "data", "claimed_credentials.json"),
    ];
    for (const cp of claimPaths) {
      try {
        const d = path.dirname(cp);
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(cp, JSON.stringify(claims, null, 2), "utf-8");
      } catch (e) {}
    }

    // 3. Catat di autonomous_orders
    const autoOrder = {
      id: `ord-${Date.now()}`,
      order_id,
      channel,
      buyer_name: buyer_username,
      buyer_phone,
      buyer_email: `${buyer_username.toLowerCase().replace(/[^a-z0-9]/g, "")}@customer.akshara-game.id`,
      game_title,
      platform,
      category: matchedItem.category || "Account (Full Access)",
      price_idr: selling_price_idr,
      credentials: {
        username: matchedItem.username,
        password: matchedItem.password,
        claim_code: claimCode,
        passcode: passcodePin,
      },
      status: "AUTO_FULFILLED_VAULT",
      created_at: nowIso,
      updated_at: nowIso,
    };
    await saveDbOrder(autoOrder).catch(() => {});

    // 4. Catat transaksi di financial_ledger
    const cogsNet = Number(matchedItem.cost_idr) || 100000;
    const shopeeFee = Math.round(selling_price_idr * 0.08) + 1000;
    const netProfit = selling_price_idr - cogsNet - shopeeFee;
    const txRecord = {
      order_id,
      buyer_username,
      product_name: game_title,
      platform,
      gross_revenue_idr: selling_price_idr,
      cogs_net_idr: cogsNet,
      shopee_fee_idr: shopeeFee,
      net_profit_idr: netProfit,
      fulfillment_source: "INVENTORY_VAULT_BUFFER",
      timestamp: nowIso.replace("T", " ").substring(0, 19),
    };

    try {
      let ledger: any[] = [];
      const dbLedger = await getKV("financial_ledger");
      if (dbLedger && Array.isArray(dbLedger)) ledger = dbLedger;
      ledger.unshift(txRecord);
      await setKV("financial_ledger", ledger).catch(() => {});

      const ledgerPaths = [
        path.resolve(process.cwd(), "data", "financial_ledger.json"),
        path.resolve(process.cwd(), "..", "output", "financial_ledger.json"),
      ];
      for (const lp of ledgerPaths) {
        try {
          const d = path.dirname(lp);
          if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
          fs.writeFileSync(lp, JSON.stringify(ledger, null, 2), "utf-8");
        } catch (e) {}
      }
    } catch (err) {}

    // 5. Kirim Notifikasi Telegram Real-Time ke Senna
    const claimBase = (
      process.env.NEXT_PUBLIC_CLAIM_BASE_URL ||
      process.env.NEXT_PUBLIC_CLAIM_WEB_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://claimakshara.vercel.app"
    ).replace(/\/$/, "");
    const portalUrl = `${claimBase}/claim/${claimCode}`;
    const copyPasteShopee = `Halo kak ${buyer_username}, pesanan ${game_title} kakak sudah siap!\n\n`
      + `🔗 Portal Buka Kredensial: ${portalUrl}\n`
      + `🔒 Passcode PIN: ${passcodePin}\n\n`
      + `Harap siapkan video rekaman layar tanpa jeda saat membuka kredensial untuk perlindungan garansi resmi toko 30 hari. Terima kasih! 🚀`;

    const tgMsg =
      `⚡ *[AUTO-FULFILLED DARI VAULT — ZERO TOUCH]*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + `📦 *No. Pesanan:* \`${order_id}\`\n`
      + `👤 *Pembeli:* \`${buyer_username}\`\n`
      + `🎮 *Game:* \`${game_title}\` (${platform})\n`
      + `💰 *Harga Jual:* Rp ${selling_price_idr.toLocaleString("id-ID")}\n`
      + `💵 *Modal Pre-Stock:* Rp ${cogsNet.toLocaleString("id-ID")}\n`
      + `📈 *Laba Bersih:* *Rp ${netProfit.toLocaleString("id-ID")}* (${((netProfit / selling_price_idr) * 100).toFixed(1)}%)\n`
      + `━━━━━━━━━━━━━━━━━━━━━━\n`
      + `🔑 *Kode Klaim:* \`${claimCode}\`\n`
      + `🔒 *Passcode PIN:* \`${passcodePin}\`\n`
      + `🔗 *Link Vault:* ${portalUrl}\n\n`
      + `📋 *DRAF BALASAN SHOPEE (TINGGAL COPY-PASTE):*\n`
      + `\`\`\`\n${copyPasteShopee}\n\`\`\``;

    await sendTelegram(tgMsg);

    return {
      status: "success",
      mode: "AUTO_FULFILLED_VAULT",
      order_id,
      claim_code: claimCode,
      passcode: passcodePin,
      claim_url: portalUrl,
      net_profit_idr: netProfit,
      shopee_chat_template: copyPasteShopee,
    };
  }

  // =========================================================================
  // CASE B: VAULT EMPTY -> FALLBACK TO JIT SOURCING & TELEGRAM HITL APPROVAL
  // =========================================================================
  const nowIso = new Date().toISOString();
  const catalog = await readAuthoritativeCatalog();
  const matchedCatalogGame = catalog.find((g: any) => {
    const cTitle = normalizeTitle(g.title);
    return cTitle.includes(cleanTarget) || cleanTarget.includes(cTitle);
  });

  const selectedSeller = matchedCatalogGame?.sellers?.find((s: any) => s.seller_id === matchedCatalogGame.selected_seller_id) || matchedCatalogGame?.sellers?.[0];
  const cogsEstimate = selectedSeller ? (selectedSeller.cogs_net_idr || selectedSeller.price_g2g_idr) : Math.round(selling_price_idr * 0.7);
  const shopeeFee = Math.round(selling_price_idr * 0.08) + 1000;
  const netProfitEst = selling_price_idr - cogsEstimate - shopeeFee;

  const hitlOrder = {
    id: `ord-${Date.now()}`,
    order_id,
    channel,
    buyer_name: buyer_username,
    buyer_phone,
    buyer_email: `${buyer_username.toLowerCase().replace(/[^a-z0-9]/g, "")}@customer.akshara-game.id`,
    game_title,
    platform,
    category: matchedCatalogGame?.category || "Account (Full Access)",
    price_idr: selling_price_idr,
    status: "AWAITING_HITL_JIT",
    created_at: nowIso,
    updated_at: nowIso,
  };
  await saveDbOrder(hitlOrder).catch(() => {});

  const sellerName = selectedSeller?.seller_name || "G2G / Eneba Supplier";
  const sellerStock = selectedSeller?.stock || 10;

  const hitlMsg =
    `🔔 *[ORDER MASUK: PERLU PERSETUJUAN HITL (JIT)]*\n`
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + `⚠️ *Stok Vault Kosong:* Membutuhkan kulakan JIT real-time.\n`
    + `📦 *No. Pesanan:* \`${order_id}\`\n`
    + `👤 *Pembeli:* \`${buyer_username}\`\n`
    + `🎮 *Game:* \`${game_title}\`\n`
    + `💰 *Harga Jual Shopee:* Rp ${selling_price_idr.toLocaleString("id-ID")}\n`
    + `🛒 *Rekomendasi Supplier:* \`${sellerName}\` (Stok: ${sellerStock})\n`
    + `💵 *Estimasi Modal:* Rp ${cogsEstimate.toLocaleString("id-ID")}\n`
    + `📈 *Proyeksi Laba Bersih:* *Rp ${netProfitEst.toLocaleString("id-ID")}*\n`
    + "━━━━━━━━━━━━━━━━━━━━━━\n"
    + "Klik tombol di bawah untuk menyetujui pemenuhan order secara otomatis:";

  const inlineKeyboard = [
    [
      { text: "✅ Approve & Beli Kredensial", callback_data: `approve_${order_id}` },
      { text: "❌ Reject Order", callback_data: `reject_${order_id}` },
    ],
  ];

  await sendTelegram(hitlMsg, inlineKeyboard);

  return {
    status: "awaiting_hitl",
    mode: "JIT_HITL",
    order_id,
    game_title,
    message: "Vault habis, order diteruskan ke Telegram HITL untuk persetujuan manual.",
    estimated_profit_idr: netProfitEst,
  };
}
