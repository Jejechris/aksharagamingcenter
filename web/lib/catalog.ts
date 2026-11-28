import fs from "fs";
import path from "path";
import os from "os";
import { getDbCatalog, saveDbGame, deleteDbGame, isDbConfigured, getKV, setKV, getLastDbError } from "@/lib/db";
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

export function sortCatalogDeterministically<T extends { title?: string; id?: string }>(items: T[]): T[] {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const titleCmp = String(a?.title || "").localeCompare(String(b?.title || ""), "en", {
      sensitivity: "base",
    });
    if (titleCmp !== 0) return titleCmp;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

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
  fallback_search_url?: string;
  offer_id?: string;
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
  const sellers = Array.isArray(item.sellers) ? item.sellers : [];
  const selectedSeller =
    sellers.find((s: any) => s.seller_id === item.selected_seller_id) ||
    sellers[0] || { price_g2g_idr: 100000, seller_name: "Default Seller" };

  const cogsG2g = Math.max(0, Math.round(Number(selectedSeller.price_g2g_idr ?? 0) || 0));
  const qrisFee = Math.round(cogsG2g * QRIS_FEE_PCT);
  const cogsNet = cogsG2g + qrisFee;
  const sellingPrice = Math.max(0, Math.round(Number(item.selling_price_shopee_idr ?? 0) || 0));
  const shopeeFee = Math.round(sellingPrice * SHOPEE_ADMIN_FEE_PCT) + SHOPEE_FIXED_FEE_IDR;
  const packaging = PACKAGING_COST_IDR; // Digital mode: Rp 0; Envelope: Rp 2.000
  const totalCost = cogsNet + shopeeFee + packaging;
  const netProfit = sellingPrice - totalCost;
  const netMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const breakEven = Math.round((cogsNet + SHOPEE_FIXED_FEE_IDR + packaging) / (1 - SHOPEE_ADMIN_FEE_PCT));

  const enrichedSellers: Seller[] = sellers.map((s: any) => {
    const sCogsG2g = Math.max(0, Math.round(Number(s.price_g2g_idr ?? 0) || 0));
    const sQris = Math.round(sCogsG2g * QRIS_FEE_PCT);
    const sCogsNet = sCogsG2g + sQris;
    const sTotalCost = sCogsNet + shopeeFee + packaging;
    const sProfit = sellingPrice - sTotalCost;
    const sMargin = sellingPrice > 0 ? (sProfit / sellingPrice) * 100 : 0;
    return {
      ...s,
      price_g2g_idr: sCogsG2g,
      qris_fee_idr: sQris,
      cogs_net_idr: sCogsNet,
      net_profit_idr: sProfit,
      net_margin_pct: Math.round(sMargin * 10) / 10,
    };
  });

  return {
    ...item,
    selling_price_shopee_idr: sellingPrice,
    selected_seller_id: selectedSeller?.seller_id || item.selected_seller_id || "",
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

let lastStorageSource: "supabase_pg" | "supabase_kv" | "local_fallback" = "local_fallback";
let lastStorageError: string | null = null;

export function getCatalogStorageMeta() {
  return {
    storage_source: lastStorageSource,
    db_configured: isDbConfigured(),
    db_error: lastStorageError || getLastDbError(),
  };
}

export async function readAuthoritativeCatalog(): Promise<any[]> {
  // If DB is configured, try reading DB first
  if (isDbConfigured()) {
    try {
      // 1. Try relational table first
      const dbData = await getDbCatalog();
      if (dbData && dbData.length > 0) {
        const sortedDb = sortCatalogDeterministically(dbData);
        inMemoryCatalogCache = sortedDb;
        lastCacheTimestamp = Date.now();
        lastStorageSource = "supabase_pg";
        lastStorageError = null;
        return sortedDb;
      }
      // 2. Try KV table if relational is empty
      const kvData = await getKV("active_catalog");
      if (kvData && Array.isArray(kvData) && kvData.length > 0) {
        const sortedKv = sortCatalogDeterministically(kvData);
        inMemoryCatalogCache = sortedKv;
        lastCacheTimestamp = Date.now();
        lastStorageSource = "supabase_kv";
        lastStorageError = null;
        return sortedKv;
      }
      lastStorageSource = "local_fallback";
      lastStorageError = getLastDbError() || "Tabel catalog_games Supabase kosong, memakai fallback.";
    } catch (err: any) {
      lastStorageSource = "local_fallback";
      lastStorageError = err?.message || getLastDbError() || "Koneksi PostgreSQL Supabase gagal.";
      console.warn("[Catalog DB Fallback]", lastStorageError);
    }
  } else {
    lastStorageSource = "local_fallback";
    lastStorageError = "DATABASE_URL / POSTGRES_URL belum terpasang di environment server ini.";
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
    const best = sortCatalogDeterministically(candidates[0].data);
    inMemoryCatalogCache = best;
    lastCacheTimestamp = Date.now();
    return best;
  }

  if (inMemoryCatalogCache && inMemoryCatalogCache.length > 0) {
    return sortCatalogDeterministically(inMemoryCatalogCache);
  }

  return [];
}

export interface WriteCatalogOptions {
  changedGameIds?: string[];
  syncAllGamesToDb?: boolean;
}

function sanitizeNumber(val: any, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeSellersList(rawSellers: any[], gameTitle: string, isEneba: boolean): Seller[] {
  const defaultEnebaUrl = getEnebaProductUrl(gameTitle);
  return (Array.isArray(rawSellers) ? rawSellers : []).map((s: any, idx: number) => ({
    ...s,
    seller_id: String(s.seller_id || `seller-${Date.now()}-${idx}`).trim(),
    seller_name: String(s.seller_name || (isEneba ? "Eneba Verified Merchant (Eneba)" : "G2G Verified")).trim(),
    rating_pct: sanitizeNumber(s.rating_pct ?? s.seller_rating, 99.5),
    reviews_count: Math.max(0, Math.round(sanitizeNumber(s.reviews_count ?? s.reviews, 10000))),
    price_g2g_idr: Math.max(0, Math.round(sanitizeNumber(s.price_g2g_idr ?? s.price_eneba_idr ?? s.price_idr, 50000))),
    delivery_speed: s.delivery_speed || s.delivery || (isEneba ? "Instant 0-Detik (Redeem Code)" : "Instant Delivery"),
    stock: Math.max(0, Math.round(sanitizeNumber(s.stock, isEneba ? 999 : 30))),
    risk_score: Math.max(0, Math.round(sanitizeNumber(s.risk_score, 0))),
    is_recommended: Boolean(s.is_recommended ?? idx === 0),
    profile_url: s.profile_url || (isEneba ? defaultEnebaUrl : resolveG2GProductUrl("", s.seller_name, gameTitle)),
    tier: s.tier || "ultra_safe",
    tier_label: s.tier_label || (isEneba ? "🛡️ ENEBA CDKEY (0% HACKBACK)" : "🛡️ TOP VERIFIED"),
    tier_desc: s.tier_desc || (isEneba ? "Kunci aktivasi digital resmi Eneba. Instant redeem ke akun Steam pribadi." : "Diimpor langsung dari Sourcing Radar."),
  }));
}

function mergeNormalizedGame(existing: any, incomingGame: any): any {
  const isEneba = Boolean(
    incomingGame.category?.toLowerCase().includes("key") ||
    incomingGame.category?.toLowerCase().includes("cdkey") ||
    incomingGame.id?.startsWith("eneba-") ||
    incomingGame.source_marketplace === "ENEBA" ||
    existing?.category?.toLowerCase().includes("cdkey")
  );
  const title = String(incomingGame.title || existing?.title || "Game Title").trim();
  const existingSellers: Seller[] = Array.isArray(existing?.sellers) ? existing.sellers : [];
  const rawIncomingSellers = Array.isArray(incomingGame.sellers) ? incomingGame.sellers : [];
  const incomingSellers = sanitizeSellersList(rawIncomingSellers, title, isEneba);

  const mergedSellers = [...existingSellers];
  for (const is of incomingSellers) {
    const sIdx = mergedSellers.findIndex(
      (s) => s.seller_id === is.seller_id || (s.seller_name || "").toLowerCase() === is.seller_name.toLowerCase()
    );
    if (sIdx >= 0) {
      mergedSellers[sIdx] = { ...mergedSellers[sIdx], ...is };
    } else {
      mergedSellers.push(is);
    }
  }

  const finalSellers = mergedSellers.length > 0 ? mergedSellers : existingSellers;
  const rawPrice =
    incomingGame.selling_price_shopee_idr ??
    incomingGame.recommended_shopee_price_idr ??
    existing?.selling_price_shopee_idr;
  const sellingPrice = Math.max(0, Math.round(sanitizeNumber(rawPrice, 100000)));
  const rawMargin =
    incomingGame.target_margin_pct ??
    incomingGame.net_margin_pct ??
    existing?.target_margin_pct;
  const targetMargin = Math.round(sanitizeNumber(rawMargin, 25) * 100) / 100;

  const candidateSelected = String(incomingGame.selected_seller_id || existing?.selected_seller_id || "").trim();
  const selectedSellerId =
    candidateSelected && finalSellers.some((s) => s.seller_id === candidateSelected)
      ? candidateSelected
      : String(finalSellers[0]?.seller_id || candidateSelected || "");

  return {
    ...existing,
    ...incomingGame,
    id: existing?.id || incomingGame.id || `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    platform: String(incomingGame.platform || existing?.platform || "Steam").trim(),
    category: String(incomingGame.category || existing?.category || (isEneba ? "Digital Key / CDKey" : "Account (Full Access)")).trim(),
    selling_price_shopee_idr: sellingPrice,
    target_margin_pct: targetMargin,
    status: String(incomingGame.status || existing?.status || "active").trim(),
    selected_seller_id: selectedSellerId,
    sellers: finalSellers,
  };
}

export async function writeAuthoritativeCatalog(
  catalogList: any[],
  options: WriteCatalogOptions = {}
): Promise<void> {
  const sanitizedList = sortCatalogDeterministically(
    catalogList.map((g) => {
      const sellers = Array.isArray(g.sellers) ? g.sellers : [];
      const rawSel = String(g.selected_seller_id || "").trim();
      const resolvedSel =
        rawSel && sellers.some((s: any) => s.seller_id === rawSel)
          ? rawSel
          : String(sellers[0]?.seller_id || rawSel || "");
      return {
        ...g,
        selling_price_shopee_idr: Math.max(0, Math.round(sanitizeNumber(g.selling_price_shopee_idr, 100000))),
        target_margin_pct: Math.round(sanitizeNumber(g.target_margin_pct, 25) * 100) / 100,
        selected_seller_id: resolvedSel,
        sellers,
      };
    })
  );

  inMemoryCatalogCache = sanitizedList;
  lastCacheTimestamp = Date.now();

  const jsonStr = JSON.stringify(sanitizedList, null, 2);

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

  if (isDbConfigured()) {
    const gamesToSync =
      Array.isArray(options.changedGameIds) && options.changedGameIds.length > 0 && !options.syncAllGamesToDb
        ? sanitizedList.filter((g) => options.changedGameIds!.includes(g.id))
        : sanitizedList;

    const failedIds: string[] = [];
    // Batch sequentially in chunks of 4 to avoid exhausting pool max=5
    for (let i = 0; i < gamesToSync.length; i += 4) {
      const chunk = gamesToSync.slice(i, i + 4);
      const res = await Promise.all(chunk.map((g) => saveDbGame(g)));
      res.forEach((ok, idx) => {
        if (!ok) failedIds.push(chunk[idx]?.id || "unknown");
      });
    }

    const kvOk = await setKV("active_catalog", sanitizedList);
    if (failedIds.length > 0 || !kvOk) {
      console.error("[Catalog DB Sync Error]", { failedIds, kvOk });
      throw new Error(`Sinkronisasi database gagal untuk: ${failedIds.join(", ") || "active_catalog KV"}`);
    }
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
    targetItem = mergeNormalizedGame(catalog[existingIdx], incomingGame);
    catalog[existingIdx] = targetItem;
  } else {
    // Insert new
    const rawSellers = incomingGame.sellers || [];
    const newSellers: Seller[] =
      rawSellers.length > 0
        ? sanitizeSellersList(rawSellers, incomingGame.title || "Game Title", isEneba)
        : [
            {
              seller_id: `${incomingGame.id || "seller"}-top-merchant`,
              seller_name: incomingGame.seller_name || (isEneba ? "Eneba Verified Merchant (Eneba)" : "G2G Verified"),
              rating_pct: sanitizeNumber(incomingGame.seller_rating_pct, 99.8),
              reviews_count: Math.max(0, Math.round(sanitizeNumber(incomingGame.seller_reviews_count, 25000))),
              price_g2g_idr: Math.max(0, Math.round(sanitizeNumber(incomingGame.price_g2g_idr ?? incomingGame.price_eneba_idr, 50000))),
              delivery_speed: isEneba ? "Instant 0-Detik (Redeem Code)" : "Instant Delivery",
              stock: isEneba ? 999 : 30,
              risk_score: 0,
              is_recommended: true,
              profile_url: incomingGame.eneba_direct_url || (isEneba ? defaultEnebaUrl : (incomingGame.g2g_direct_url || resolveG2GProductUrl("", incomingGame.seller_name, incomingGame.title))),
              tier: incomingGame.supplier_tier || "ultra_safe",
              tier_label: isEneba ? "🛡️ ENEBA CDKEY (0% HACKBACK)" : "🛡️ TOP VERIFIED",
              tier_desc: isEneba ? "Kunci aktivasi digital resmi Eneba. Instant redeem ke akun Steam pribadi." : "Diimpor langsung dari Sourcing Radar.",
            },
          ];

    const newItemId = incomingGame.id || `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    targetItem = {
      id: newItemId,
      title: String(incomingGame.title).trim(),
      platform: String(incomingGame.platform || "Steam").trim(),
      category: String(incomingGame.category || (isEneba ? "Digital Key / CDKey" : "Account (Full Access)")).trim(),
      selling_price_shopee_idr: Math.max(0, Math.round(sanitizeNumber(incomingGame.selling_price_shopee_idr ?? incomingGame.recommended_shopee_price_idr, 100000))),
      target_margin_pct: Math.round(sanitizeNumber(incomingGame.target_margin_pct ?? incomingGame.net_margin_pct, 25) * 100) / 100,
      status: String(incomingGame.status || "active").trim(),
      selected_seller_id: incomingGame.selected_seller_id || newSellers[0]?.seller_id || "",
      sellers: newSellers,
    };
    catalog.unshift(targetItem);
  }

  await writeAuthoritativeCatalog(catalog, { changedGameIds: [targetItem.id] });

  // Send Telegram Bot notification with verified product link
  notifyTelegramCatalogEvent(targetItem).catch(() => {});

  const sortedCatalog = sortCatalogDeterministically(catalog);
  const enrichedAll = sortedCatalog.map(calculateItemMetrics);
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
  const changedIds: string[] = [];

  for (const incoming of incomingGames) {
    if (!incoming || !incoming.title) continue;
    const existingIdx = findGameIndexInList(catalog, incoming.id, incoming.title, incoming.category);

    if (existingIdx >= 0) {
      const merged = mergeNormalizedGame(catalog[existingIdx], incoming);
      catalog[existingIdx] = merged;
      changedIds.push(merged.id);
      count++;
    } else {
      const isEneba = Boolean(
        incoming.category?.toLowerCase().includes("key") ||
        incoming.category?.toLowerCase().includes("cdkey") ||
        incoming.id?.startsWith("eneba-") ||
        incoming.source_marketplace === "ENEBA"
      );
      const rawSellers = incoming.sellers || [];
      const newSellers: Seller[] =
        rawSellers.length > 0
          ? sanitizeSellersList(rawSellers, incoming.title, isEneba)
          : [
              {
                seller_id: `seller-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                seller_name: incoming.seller_name || "G2G / Eneba Verified",
                rating_pct: sanitizeNumber(incoming.seller_rating_pct, 99.5),
                reviews_count: Math.max(0, Math.round(sanitizeNumber(incoming.seller_reviews_count, 10000))),
                price_g2g_idr: Math.max(0, Math.round(sanitizeNumber(incoming.price_g2g_idr ?? incoming.price_eneba_idr, 100000))),
                delivery_speed: isEneba ? "Instant 0-Detik (Redeem Code)" : "Instant Delivery",
                stock: isEneba ? 999 : 30,
                risk_score: 0,
                is_recommended: true,
                profile_url: incoming.g2g_direct_url || incoming.eneba_direct_url || resolveG2GProductUrl("", incoming.seller_name, incoming.title),
                tier: incoming.supplier_tier || "ultra_safe",
                tier_label: incoming.source_marketplace === "ENEBA" ? "🛡️ ENEBA CDKEY (0% HACKBACK)" : "🛡️ TOP VERIFIED",
                tier_desc: "Diimpor langsung dari Sourcing Radar.",
              },
            ];

      const newItem = {
        id: incoming.id || `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: String(incoming.title).trim(),
        platform: String(incoming.platform || "Steam").trim(),
        category: String(incoming.category || "Digital Key / Account").trim(),
        selling_price_shopee_idr: Math.max(0, Math.round(sanitizeNumber(incoming.selling_price_shopee_idr ?? incoming.recommended_shopee_price_idr, 100000))),
        target_margin_pct: Math.round(sanitizeNumber(incoming.target_margin_pct ?? incoming.net_margin_pct, 25) * 100) / 100,
        status: String(incoming.status || "active").trim(),
        selected_seller_id: newSellers[0]?.seller_id || "",
        sellers: newSellers,
      };
      catalog.unshift(newItem);
      changedIds.push(newItem.id);
      count++;
    }
  }

  await writeAuthoritativeCatalog(catalog, { changedGameIds: changedIds });
  const enrichedAll = sortCatalogDeterministically(catalog).map(calculateItemMetrics);
  return { importedCount: count, allGames: enrichedAll };
}

export async function deleteGameFromCatalog(gameId: string): Promise<CatalogGame[]> {
  const catalog = await readAuthoritativeCatalog();
  const next = sortCatalogDeterministically(catalog.filter((g) => g.id !== gameId));
  if (isDbConfigured()) {
    await deleteDbGame(gameId);
  }
  await writeAuthoritativeCatalog(next, { changedGameIds: [] });
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
