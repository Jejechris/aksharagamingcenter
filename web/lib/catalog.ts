import fs from "fs";
import path from "path";
import os from "os";
import { getDbCatalog, saveDbGame, deleteDbGame, isDbConfigured, getKV, setKV } from "@/lib/db";
import { resolveG2GProductUrl } from "@/lib/g2g";
import { getEnebaProductUrl, getEnebaSearchUrl } from "@/lib/eneba";

// File Targets
const bundledCatalogPath = path.resolve(process.cwd(), "data", "active_catalog.json");
const outputCatalogPath = path.resolve(process.cwd(), "..", "output", "active_catalog.json");
const tmpCatalogPath = path.resolve(os.tmpdir(), "akshara_active_catalog.json");
const starterBackupPath = path.resolve(process.cwd(), "data", "starter_catalog_backup.json");

// Financial Constants
export const USD_IDR_RATE = 16350;
export const QRIS_FEE_PCT = 0.007; // 0.7%
export const SHOPEE_ADMIN_FEE_PCT = 0.08; // 8.0%
export const SHOPEE_FIXED_FEE_IDR = 1000;
export const PACKAGING_COST_IDR = 0; // Pure digital mode = Rp 0; Physical Envelope = Rp 2.000

// In-memory catalog cache
let inMemoryCatalogCache: any[] | null = null;
let lastCacheTimestamp: number = 0;

export interface Seller {
  seller_id: string;
  seller_name: string;
  rating_pct: number;
  reviews_count: number;
  price_g2g_idr: number;
  delivery_speed: string;
  stock: number;
  risk_score: number;
  is_recommended: boolean;
  profile_url?: string;
  tier?: "ultra_safe" | "lowest_price" | "mid_level" | string;
  tier_label?: string;
  tier_desc?: string;
  qris_fee_idr?: number;
  cogs_net_idr?: number;
  net_profit_idr?: number;
  net_margin_pct?: number;
}

export interface CatalogGame {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  target_margin_pct: number;
  status: string;
  selected_seller_id: string;
  sellers: Seller[];
  metrics?: {
    selected_seller: Seller;
    cogs_g2g_idr: number;
    qris_fee_idr: number;
    cogs_net_idr: number;
    shopee_fee_idr: number;
    packaging_cost_idr: number;
    total_cost_idr: number;
    net_profit_idr: number;
    net_margin_pct: number;
    break_even_price_idr: number;
  };
}

export function calculateItemMetrics(item: any): CatalogGame {
  const selectedSeller =
    item.sellers?.find((s: any) => s.seller_id === item.selected_seller_id) ||
    item.sellers?.[0] || { price_g2g_idr: 100000, seller_name: "Default Seller" };

  const cogsG2g = selectedSeller.price_g2g_idr || 0;
  const qrisFee = Math.round(cogsG2g * QRIS_FEE_PCT);
  const cogsNet = cogsG2g + qrisFee;
  const sellingPrice = item.selling_price_shopee_idr || 0;
  const shopeeFee = Math.round(sellingPrice * SHOPEE_ADMIN_FEE_PCT) + SHOPEE_FIXED_FEE_IDR;
  const packaging = PACKAGING_COST_IDR; // Digital mode: Rp 0; Envelope: Rp 2.000
  const totalCost = cogsNet + shopeeFee + packaging;
  const netProfit = sellingPrice - totalCost;
  const netMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const breakEven = Math.round((cogsNet + SHOPEE_FIXED_FEE_IDR + packaging) / (1 - SHOPEE_ADMIN_FEE_PCT));

  const enrichedSellers: Seller[] = (item.sellers || []).map((s: any) => {
    const sCogsG2g = s.price_g2g_idr || 0;
    const sQris = Math.round(sCogsG2g * 0.007);
    const sCogsNet = sCogsG2g + sQris;
    const sTotalCost = sCogsNet + shopeeFee + packaging;
    const sProfit = sellingPrice - sTotalCost;
    const sMargin = sellingPrice > 0 ? (sProfit / sellingPrice) * 100 : 0;
    return {
      ...s,
      qris_fee_idr: sQris,
      cogs_net_idr: sCogsNet,
      net_profit_idr: sProfit,
      net_margin_pct: Math.round(sMargin * 10) / 10,
    };
  });

  return {
    ...item,
    sellers: enrichedSellers,
    metrics: {
      selected_seller: selectedSeller,
      cogs_g2g_idr: cogsG2g,
      qris_fee_idr: qrisFee,
      cogs_net_idr: cogsNet,
      shopee_fee_idr: shopeeFee,
      packaging_cost_idr: packaging,
      total_cost_idr: totalCost,
      net_profit_idr: netProfit,
      net_margin_pct: Math.round(netMargin * 10) / 10,
      break_even_price_idr: breakEven,
    },
  };
}

function tryReadJson(filePath: string): any[] | null {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {}
  return null;
}

export async function readAuthoritativeCatalog(): Promise<any[]> {
  // If DB is configured, try reading DB first
  if (isDbConfigured()) {
    try {
      // 1. Try relational table first
      const dbData = await getDbCatalog();
      if (dbData && dbData.length > 0) {
        inMemoryCatalogCache = dbData;
        lastCacheTimestamp = Date.now();
        return dbData;
      }
      // 2. Try KV table if relational is empty
      const kvData = await getKV("active_catalog");
      if (kvData && Array.isArray(kvData) && kvData.length > 0) {
        inMemoryCatalogCache = kvData;
        lastCacheTimestamp = Date.now();
        return kvData;
      }
    } catch (err) {}
  }

  // Find candidate files on disk and pick the one with most entries or highest priority
  const candidates: Array<{ path: string; data: any[] }> = [];

  const checkPaths = [bundledCatalogPath, outputCatalogPath, tmpCatalogPath, starterBackupPath];
  for (const p of checkPaths) {
    const data = tryReadJson(p);
    if (data) {
      candidates.push({ path: p, data });
    }
  }

  if (candidates.length > 0) {
    // Sort by count descending so we never regress to an older file with fewer games
    candidates.sort((a, b) => b.data.length - a.data.length);
    const best = candidates[0].data;
    inMemoryCatalogCache = best;
    lastCacheTimestamp = Date.now();
    return best;
  }

  if (inMemoryCatalogCache && inMemoryCatalogCache.length > 0) {
    return inMemoryCatalogCache;
  }

  return [];
}

export function writeAuthoritativeCatalog(catalogList: any[]): void {
  inMemoryCatalogCache = catalogList;
  lastCacheTimestamp = Date.now();

  const jsonStr = JSON.stringify(catalogList, null, 2);

  const targets = [
    bundledCatalogPath,
    outputCatalogPath,
    tmpCatalogPath,
  ];

  for (const targetPath of targets) {
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, jsonStr, "utf-8");
    } catch (err) {}
  }

  // Fire-and-forget async DB sync if configured
  if (isDbConfigured()) {
    Promise.all(catalogList.map((g) => saveDbGame(g))).catch(() => {});
    setKV("active_catalog", catalogList).catch(() => {});
  }
}

export function findGameIndexInList(catalog: any[], game_id?: string, title?: string, category?: string): number {
  if (!game_id && !title) return -1;

  if (game_id) {
    const idx = catalog.findIndex((g) => g.id === game_id);
    if (idx !== -1) return idx;
  }

  if (title) {
    const cleanTitle = title.toLowerCase().trim();
    if (category) {
      const isKeyReq = category.toLowerCase().includes("key") || category.toLowerCase().includes("cdkey");
      const idx = catalog.findIndex((g) => {
        const tMatch = (g.title || "").toLowerCase().trim() === cleanTitle;
        if (!tMatch) return false;
        const gIsKey = (g.category || "").toLowerCase().includes("key") || (g.category || "").toLowerCase().includes("cdkey");
        return isKeyReq === gIsKey;
      });
      if (idx !== -1) return idx;
    } else {
      const idx = catalog.findIndex((g) => (g.title || "").toLowerCase().trim() === cleanTitle);
      if (idx !== -1) return idx;
    }
  }

  return -1;
}

export async function addOrUpdateGame(incomingGame: any): Promise<{ item: CatalogGame; allGames: CatalogGame[] }> {
  const catalog = await readAuthoritativeCatalog();
  const existingIdx = findGameIndexInList(catalog, incomingGame.id, incomingGame.title, incomingGame.category);

  let targetItem: any;

  const isEneba = incomingGame.category?.toLowerCase().includes("key") ||
                  incomingGame.category?.toLowerCase().includes("cdkey") ||
                  incomingGame.id?.startsWith("eneba-") ||
                  incomingGame.source_marketplace === "ENEBA";

  const defaultEnebaUrl = getEnebaProductUrl(incomingGame.title);

  if (existingIdx >= 0) {
    // Merge existing
    const existing = catalog[existingIdx];
    const existingSellers: Seller[] = existing.sellers || [];
    const incomingSellers: Seller[] = (incomingGame.sellers || []).map((s: any, idx: number) => ({
      seller_id: s.seller_id || `seller-${Date.now()}-${idx}`,
      seller_name: s.seller_name || (isEneba ? "Eneba Verified Merchant (Eneba)" : "G2G Verified"),
      rating_pct: Number(s.rating_pct) || 99.8,
      reviews_count: Number(s.reviews_count) || 25000,
      price_g2g_idr: Number(s.price_g2g_idr || s.price_eneba_idr) || 50000,
      delivery_speed: s.delivery_speed || (isEneba ? "Instant 0-Detik (Redeem Code)" : "Instant Delivery"),
      stock: Number(s.stock) || (isEneba ? 999 : 30),
      risk_score: Number(s.risk_score) || 0,
      is_recommended: Boolean(s.is_recommended ?? (idx === 0)),
      profile_url: s.profile_url || (isEneba ? defaultEnebaUrl : "https://www.g2g.com/id"),
      tier: s.tier || "ultra_safe",
      tier_label: s.tier_label || (isEneba ? "🛡️ ENEBA CDKEY (0% HACKBACK)" : "🛡️ TOP VERIFIED"),
      tier_desc: s.tier_desc || (isEneba ? "Kunci aktivasi digital resmi Eneba. Instant redeem ke akun Steam pribadi." : "Diimpor langsung dari Sourcing Radar."),
    }));

    // Merge sellers without duplicates
    const mergedSellers = [...existingSellers];
    for (const is of incomingSellers) {
      const sIdx = mergedSellers.findIndex(s => s.seller_id === is.seller_id || s.seller_name.toLowerCase() === is.seller_name.toLowerCase());
      if (sIdx >= 0) {
        mergedSellers[sIdx] = { ...mergedSellers[sIdx], ...is };
      } else {
        mergedSellers.push(is);
      }
    }

    targetItem = {
      ...existing,
      ...incomingGame,
      id: existing.id || incomingGame.id,
      title: incomingGame.title || existing.title,
      platform: incomingGame.platform || existing.platform,
      category: incomingGame.category || existing.category,
      selling_price_shopee_idr: Number(incomingGame.selling_price_shopee_idr ?? existing.selling_price_shopee_idr),
      target_margin_pct: Number(incomingGame.target_margin_pct ?? existing.target_margin_pct),
      status: incomingGame.status || existing.status || "active",
      selected_seller_id: incomingGame.selected_seller_id || existing.selected_seller_id || mergedSellers[0]?.seller_id,
      sellers: mergedSellers.length > 0 ? mergedSellers : existingSellers,
    };
    catalog[existingIdx] = targetItem;
  } else {
    // Insert new
    const rawSellers = incomingGame.sellers || [];
    const newSellers: Seller[] = rawSellers.length > 0 ? rawSellers.map((s: any, idx: number) => ({
      seller_id: s.seller_id || `seller-${Date.now()}-${idx}`,
      seller_name: s.seller_name || (isEneba ? "Eneba Verified Merchant (Eneba)" : "G2G / Eneba Verified"),
      rating_pct: Number(s.rating_pct) || 99.8,
      reviews_count: Number(s.reviews_count) || 25000,
      price_g2g_idr: Number(s.price_g2g_idr || s.price_eneba_idr) || 50000,
      delivery_speed: s.delivery_speed || (isEneba ? "Instant 0-Detik (Redeem Code)" : "Instant Delivery"),
      stock: Number(s.stock) || (isEneba ? 999 : 30),
      risk_score: Number(s.risk_score) || 0,
      is_recommended: Boolean(s.is_recommended ?? (idx === 0)),
      profile_url: s.profile_url || (isEneba ? defaultEnebaUrl : "https://www.g2g.com/id"),
      tier: s.tier || "ultra_safe",
      tier_label: s.tier_label || (isEneba ? "🛡️ ENEBA CDKEY (0% HACKBACK)" : "🛡️ TOP VERIFIED"),
      tier_desc: s.tier_desc || (isEneba ? "Kunci aktivasi digital resmi Eneba. Instant redeem ke akun Steam pribadi." : "Diimpor langsung dari Sourcing Radar."),
    })) : [
      {
        seller_id: `${incomingGame.id || "seller"}-top-merchant`,
        seller_name: incomingGame.seller_name || (isEneba ? "Eneba Verified Merchant (Eneba)" : "G2G Verified"),
        rating_pct: Number(incomingGame.seller_rating_pct) || 99.8,
        reviews_count: Number(incomingGame.seller_reviews_count) || 25000,
        price_g2g_idr: Number(incomingGame.price_g2g_idr || incomingGame.price_eneba_idr) || 50000,
        delivery_speed: isEneba ? "Instant 0-Detik (Redeem Code)" : "Instant Delivery",
        stock: isEneba ? 999 : 30,
        risk_score: 0,
        is_recommended: true,
        profile_url: incomingGame.eneba_direct_url || (isEneba ? defaultEnebaUrl : (incomingGame.g2g_direct_url || "https://www.g2g.com/id")),
        tier: incomingGame.supplier_tier || "ultra_safe",
        tier_label: isEneba ? "🛡️ ENEBA CDKEY (0% HACKBACK)" : "🛡️ TOP VERIFIED",
        tier_desc: isEneba ? "Kunci aktivasi digital resmi Eneba. Instant redeem ke akun Steam pribadi." : "Diimpor langsung dari Sourcing Radar.",
      }
    ];

    targetItem = {
      id: incomingGame.id || `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: incomingGame.title,
      platform: incomingGame.platform || "Steam",
      category: incomingGame.category || (isEneba ? "Digital Key / CDKey" : "Account (Full Access)"),
      selling_price_shopee_idr: Number(incomingGame.selling_price_shopee_idr || incomingGame.recommended_shopee_price_idr) || 100000,
      target_margin_pct: Math.round(Number(incomingGame.target_margin_pct || incomingGame.net_margin_pct)) || 25,
      status: "active",
      selected_seller_id: incomingGame.selected_seller_id || newSellers[0]?.seller_id,
      sellers: newSellers,
    };
    catalog.unshift(targetItem);
  }

  writeAuthoritativeCatalog(catalog);

  // Send Telegram Bot notification with verified product link
  notifyTelegramCatalogEvent(targetItem).catch(() => {});

  const enrichedAll = catalog.map(calculateItemMetrics);
  const enrichedItem = calculateItemMetrics(targetItem);

  return { item: enrichedItem, allGames: enrichedAll };
}

export async function bulkAddOrUpdateGames(incomingGames: any[]): Promise<{ importedCount: number; allGames: CatalogGame[] }> {
  if (!Array.isArray(incomingGames) || incomingGames.length === 0) {
    const current = await readAuthoritativeCatalog();
    return { importedCount: 0, allGames: current.map(calculateItemMetrics) };
  }

  const catalog = await readAuthoritativeCatalog();
  let count = 0;

  for (const incoming of incomingGames) {
    if (!incoming || !incoming.title) continue;
    const existingIdx = findGameIndexInList(catalog, incoming.id, incoming.title);

    if (existingIdx >= 0) {
      // Update
      catalog[existingIdx] = {
        ...catalog[existingIdx],
        ...incoming,
        id: catalog[existingIdx].id,
        title: incoming.title || catalog[existingIdx].title,
      };
      count++;
    } else {
      // Add
      const rawSellers = incoming.sellers || [];
      const newSellers: Seller[] = rawSellers.length > 0 ? rawSellers : [
        {
          seller_id: `seller-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          seller_name: incoming.seller_name || "G2G / Eneba Verified",
          rating_pct: Number(incoming.seller_rating_pct) || 99.5,
          reviews_count: Number(incoming.seller_reviews_count) || 10000,
          price_g2g_idr: Number(incoming.price_g2g_idr || incoming.price_eneba_idr) || 100000,
          delivery_speed: "Instant Delivery",
          stock: 30,
          risk_score: 0,
          is_recommended: true,
          profile_url: incoming.g2g_direct_url || incoming.eneba_direct_url || "https://www.g2g.com/id",
          tier: incoming.supplier_tier || "ultra_safe",
          tier_label: incoming.source_marketplace === "ENEBA" ? "🛡️ ENEBA CDKEY (0% HACKBACK)" : "🛡️ TOP VERIFIED",
          tier_desc: "Diimpor langsung dari Sourcing Radar.",
        }
      ];

      const newItem = {
        id: incoming.id || `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: incoming.title,
        platform: incoming.platform || "Steam",
        category: incoming.category || "Digital Key / Account",
        selling_price_shopee_idr: Number(incoming.selling_price_shopee_idr || incoming.recommended_shopee_price_idr) || 100000,
        target_margin_pct: Math.round(Number(incoming.target_margin_pct || incoming.net_margin_pct)) || 25,
        status: "active",
        selected_seller_id: newSellers[0]?.seller_id,
        sellers: newSellers,
      };
      catalog.unshift(newItem);
      count++;
    }
  }

  writeAuthoritativeCatalog(catalog);
  const enrichedAll = catalog.map(calculateItemMetrics);
  return { importedCount: count, allGames: enrichedAll };
}

export async function deleteGameFromCatalog(gameId: string): Promise<CatalogGame[]> {
  const catalog = await readAuthoritativeCatalog();
  const next = catalog.filter((g) => g.id !== gameId && !g.id.includes(gameId));
  writeAuthoritativeCatalog(next);
  if (isDbConfigured()) {
    deleteDbGame(gameId).catch(() => {});
  }
  return next.map(calculateItemMetrics);
}

async function notifyTelegramCatalogEvent(item: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
  if (!token || !chatId) {
    console.warn("[Telegram Catalog Event] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not configured, skipping.");
    return;
  }
  try {
    const isEneba = item.category?.toLowerCase().includes("key") ||
                    item.category?.toLowerCase().includes("cdkey") ||
                    item.id?.startsWith("eneba-") ||
                    item.source_marketplace === "ENEBA" ||
                    item.sellers?.some((s: any) => s.seller_name?.toLowerCase().includes("eneba") || s.profile_url?.includes("eneba.com"));

    let productUrl = "";
    if (isEneba) {
      const sellerUrl = item.sellers?.[0]?.profile_url;
      productUrl = (sellerUrl && sellerUrl.includes("eneba.com"))
        ? sellerUrl
        : getEnebaProductUrl(item.title);
    } else {
      const firstSeller = item.sellers?.[0];
      productUrl = resolveG2GProductUrl(
        firstSeller?.profile_url || firstSeller?.offer_id,
        firstSeller?.seller_name,
        item.title
      );
    }

    const marketLabel = isEneba ? "⚡ Eneba Verified CDKey (0% Hackback)" : "🛒 G2G Verified Marketplace";
    const securityBadge = isEneba ? "🛡️ 0% Hackback (Redeem Kode Resmi)" : "🛡️ Garansi Toko & Anti-Hackback";

    const text =
      `🆕 *[PRODUK BARU DITAMBAHKAN KE KATALOG]*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎮 *Game:* \`${item.title}\`\n` +
      `📦 *Platform:* \`${item.platform || "PC"}\`\n` +
      `🏷️ *Kategori:* \`${item.category || "Digital Product"}\`\n` +
      `💰 *Harga Jual Shopee:* *Rp ${(item.selling_price_shopee_idr || 0).toLocaleString("id-ID")}*\n` +
      `👤 *Seller Utama:* \`${item.sellers?.[0]?.seller_name || marketLabel}\`\n` +
      `🛡️ *Keamanan:* ${securityBadge}\n` +
      `🔗 *Tautan Listing Faktual:*\n${productUrl}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ _Bot Sentry otomatis memonitor stok & harga produk ini pada audit berkala._`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {}
}
