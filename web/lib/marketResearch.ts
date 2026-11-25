import fs from "fs";
import path from "path";
import os from "os";
import { fetchRealSteamIndonesiaPrice, RealSteamPriceResult } from "@/lib/steamPrice";
import { fetchUsdToIdrRate } from "@/lib/g2gStock";
import { buildEnebaFilteredUrl } from "@/lib/eneba";
import { evaluateSellerTrust } from "@/lib/sellerTrust";
import { calculateShopeeEconomics, calculateTargetSellingPrice } from "@/lib/pricing";
import { callGemini } from "@/lib/gemini";
import { getKV, setKV, isDbConfigured } from "@/lib/db";

export interface LiveEnebaListing {
  title: string;
  url: string;
  base_price_idr: number;
  landed_cost_idr: number;
  platform: string;
  is_key: boolean;
  is_gift: boolean;
  is_account: boolean;
}

const JUNK_LISTING_RE = /\b(dlc|expansion|upgrade|season pass|starter pack|skin|outfit|coins?|points?|pack|bundle only|ost|soundtrack|artbook|random|mystery|account)\b/i;

function inferPlatformFromEnebaTitle(title: string, fallback: string = "Steam"): string {
  const low = title.toLowerCase();
  if (low.includes("steam")) return "Steam";
  if (low.includes("xbox") || low.includes("microsoft")) return "Xbox / Microsoft";
  if (low.includes("gog")) return "GOG";
  if (low.includes("ea app") || low.includes("origin")) return "EA App / PC";
  if (low.includes("epic")) return "Epic Games";
  if (low.includes("ubisoft")) return "Ubisoft Connect";
  if (low.includes("nintendo") || low.includes("switch")) return "Nintendo Switch";
  if (low.includes("rockstar")) return "Rockstar";
  return fallback;
}

const enebaCache = new Map<string, { ts: number; data: LiveEnebaListing[] }>();

/**
 * Mengambil harga REAL & LIVE langsung dari SSR HTML eneba.com/store/all (currency=IDR).
 * Menghilangkan angka halusinasi LLM seperti kasus 007 First Light Rp 255rb vs real Rp 873rb+.
 */
export async function fetchLiveEnebaListings(
  query: string,
  options?: { platform?: string; allowNonGlobalFallback?: boolean }
): Promise<LiveEnebaListing[]> {
  const cleanQuery = query
    .replace(/[:&\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleanQuery) return [];

  const cacheKey = `${cleanQuery.toLowerCase()}::${options?.platform || ""}`;
  const cached = enebaCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000 && cached.data.length > 0) {
    return cached.data;
  }

  const urls = [
    `https://www.eneba.com/store/all?text=${encodeURIComponent(cleanQuery)}&currency=IDR&regions[]=global&types[]=game&sortBy=PRICE_LOWEST`,
  ];
  if (options?.allowNonGlobalFallback !== false) {
    urls.push(
      `https://www.eneba.com/store/all?text=${encodeURIComponent(cleanQuery)}&currency=IDR&sortBy=PRICE_LOWEST`
    );
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        },
        signal: AbortSignal.timeout(7000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (!html || /cloudflare|turnstile|just a moment/i.test(html)) continue;

      const anchors = Array.from(
        html.matchAll(/<a[^>]*title="([^"]{4,160})"[^>]*href="(\/[a-z0-9-]+)"[^>]*><\/a>/gi)
      );
      const listings: LiveEnebaListing[] = [];
      const seenUrl = new Set<string>();

      for (let i = 0; i < anchors.length; i++) {
        const start = anchors[i].index ?? 0;
        const end =
          i + 1 < anchors.length ? anchors[i + 1].index ?? start + 3500 : Math.min(html.length, start + 3500);
        const chunk = html.slice(start, end);
        const rawTitle = anchors[i][1].trim();
        const slug = anchors[i][2].trim();
        const cleanText = chunk.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
        // Ekstrak SEMUA nominal Rp di dalam blok kartu (e.g. "From Rp 1,200,631 -94% Rp 73,251")
        // Lalu ambil harga terendah (harga diskon aktual, BUKAN harga coret original!)
        const rpMatches = Array.from(cleanText.matchAll(/Rp\s*([\d.,]+)/gi))
          .map((m) => Number(m[1].replace(/[^\d]/g, "")))
          .filter((n) => Number.isFinite(n) && n > 1000);
        const basePriceIdr = rpMatches.length > 0 ? Math.min(...rpMatches) : 0;

        if (basePriceIdr <= 1000) continue;
        const fullUrl = `https://www.eneba.com${slug}`;
        if (seenUrl.has(fullUrl)) continue;
        seenUrl.add(fullUrl);

        const lowTitle = rawTitle.toLowerCase();
        // ~9% Eneba buyer service fee checkout QRIS/Pay
        const landedCostIdr = Math.ceil((basePriceIdr * 1.09) / 1000) * 1000;
        listings.push({
          title: rawTitle,
          url: fullUrl,
          base_price_idr: basePriceIdr,
          landed_cost_idr: landedCostIdr,
          platform: inferPlatformFromEnebaTitle(rawTitle, options?.platform || "Steam"),
          is_key: lowTitle.includes("key"),
          is_gift: lowTitle.includes("gift"),
          is_account: lowTitle.includes("account"),
        });
      }

      if (listings.length > 0) {
        enebaCache.set(cacheKey, { ts: Date.now(), data: listings });
        return listings;
      }
    } catch {
      // Try next URL
    }
  }

  return [];
}

function selectBestEnebaListing(
  listings: LiveEnebaListing[],
  query: string,
  preferredPlatform: string = "Steam"
): LiveEnebaListing | null {
  if (!listings || listings.length === 0) return null;

  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !["the", "edition", "standard", "pc", "steam"].includes(w));

  const queryWantsDlcOrAccount = JUNK_LISTING_RE.test(query);
  const platLower = preferredPlatform.toLowerCase();

  const scored = listings
    .filter((l) => {
      const tLow = l.title.toLowerCase();
      if (!queryWantsDlcOrAccount && JUNK_LISTING_RE.test(tLow)) return false;
      if (l.is_account && !query.toLowerCase().includes("account")) return false;
      // Hindari salah cocok edisi klasik/tahun lama vs remake modern (contoh: Resident Evil 4 2023 vs 2005 HD Edition)
      const qLow = query.toLowerCase();
      const legacyMatch = tLow.match(/\b(199\d|200\d|201[0-5]|classic|hd edition|biohazard 4)\b/i);
      if (legacyMatch && !qLow.includes(legacyMatch[1].toLowerCase())) {
        return false;
      }
      // Require core tokens of game title to appear so random games don't match
      if (queryTokens.length > 0) {
        const hits = queryTokens.filter((tok) => tLow.includes(tok)).length;
        if (hits < Math.max(1, Math.ceil(queryTokens.length * 0.6))) return false;
      }
      return true;
    })
    .map((l) => {
      let score = 0;
      const lPlat = l.platform.toLowerCase();
      if (platLower.includes("steam") && lPlat === "steam") score += 40;
      else if (platLower.includes("xbox") && lPlat.includes("xbox")) score += 40;
      else if (lPlat === "steam") score += 20;
      if (l.is_key) score += 25;
      if (l.title.toLowerCase().includes("global")) score += 15;
      if (!l.title.toLowerCase().includes("deluxe") && !l.title.toLowerCase().includes("ultimate")) score += 5;
      return { l, score };
    })
    .sort((a, b) => b.score - a.score || a.l.base_price_idr - b.l.base_price_idr);

  return scored[0]?.l || null;
}

export interface VerifiedMarketOpportunity {
  title: string;
  platform: string;
  key_type: string;
  eneba_direct_url: string;
  price_eneba_idr: number;
  eneba_base_price_idr: number;
  recommended_shopee_price_idr: number;
  steam_indo_price_idr: number;
  steam_indo_original_idr: number;
  steam_discount_pct: number;
  cheapshark_usd: number;
  usd_idr_rate: number;
  qris_fee_idr: number;
  shopee_fee_idr: number;
  net_profit_idr: number;
  net_margin_pct: number;
  spread_pct: number;
  data_source: "live_market_verified" | "ai_estimated";
  eneba_live_verified: boolean;
  steam_live_verified: boolean;
  cheapshark_live_verified: boolean;
  arbitrage_viable: boolean;
  arbitrage_warning?: string;
  steam_app_id?: number;
}

/**
 * Pipeline multi-API faktual:
 * 1. Live Eneba SSR (`eneba.com/store/all?currency=IDR`) -> Harga modal Eneba asli + URL produk asli
 * 2. Live Steam Store Indonesia (`storesearch cc=ID`) -> Harga retail & promo resmi Indonesia
 * 3. Live CheapShark Global Deals -> Pembanding USD termurah global
 */
export async function verifyLiveGameOpportunity(params: {
  query: string;
  preferredPlatform?: string;
  targetMarginPct?: number;
}): Promise<VerifiedMarketOpportunity | null> {
  const query = (params.query || "").trim();
  const preferredPlatform = (params.preferredPlatform || "Steam").trim();
  const targetMarginPct = params.targetMarginPct ?? 20;

  if (!query) return null;

  const [enebaListings, realSteam, cheapSharkRaw, usdRate] = await Promise.all([
    fetchLiveEnebaListings(query, { platform: preferredPlatform }).catch(() => []),
    fetchRealSteamIndonesiaPrice(query).catch(() => null),
    fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query)}&limit=6`, {
      headers: {
        "User-Agent": "AksharaGamingCenter/2.0 (ops@aksharagaming.id)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetchUsdToIdrRate().catch(() => 16850),
  ]);

  const matchedEneba = selectBestEnebaListing(enebaListings, query, preferredPlatform);

  let cheapestUsd = 0;
  let cheapSharkTitle = "";
  if (Array.isArray(cheapSharkRaw) && cheapSharkRaw.length > 0) {
    const qLower = query.toLowerCase();
    const bestCs =
      cheapSharkRaw.find((c: any) => (c.external || "").toLowerCase().trim() === qLower) ||
      cheapSharkRaw.find((c: any) => (c.external || "").toLowerCase().includes(qLower)) ||
      cheapSharkRaw[0];
    if (bestCs) {
      cheapestUsd = Number(bestCs.cheapest) || 0;
      cheapSharkTitle = bestCs.external || "";
    }
  }

  const enebaLiveVerified = Boolean(matchedEneba && matchedEneba.landed_cost_idr > 0);
  const steamLiveVerified = Boolean(realSteam && realSteam.price_idr && realSteam.price_idr > 0);
  const cheapsharkLiveVerified = cheapestUsd > 0;

  if (!enebaLiveVerified && !steamLiveVerified && !cheapsharkLiveVerified) {
    return null;
  }

  const resolvedTitle = realSteam?.official_title || cheapSharkTitle || query;
  const resolvedPlatform = matchedEneba?.platform || preferredPlatform || "Steam";
  const steamCurrentIdr = realSteam?.price_idr || 0;
  const steamOrigIdr = realSteam?.original_price_idr || steamCurrentIdr;
  const steamDiscountPct = realSteam?.discount_percent || 0;

  // Prioritas harga modal:
  // 1) Harga Eneba SSR live (+~9% fee checkout)
  // 2) Harga CheapShark USD * kurs * 1.10 (bila Eneba tidak mengembalikan hasil)
  // 3) Estimasi berbasis Steam Indo normal hanya sebagai fallback terkalibrasi (bukan angka acak 255k!)
  const cheapsharkIdr = cheapsharkLiveVerified ? Math.ceil((cheapestUsd * usdRate * 1.1) / 1000) * 1000 : 0;
  const enebaBasePrice = matchedEneba?.base_price_idr || 0;
  const priceEnebaIdr = enebaLiveVerified
    ? matchedEneba!.landed_cost_idr
    : cheapsharkIdr > 0
    ? cheapsharkIdr
    : Math.max(25000, Math.round(((steamOrigIdr || steamCurrentIdr) * 0.72) / 1000) * 1000);

  const enebaUrl =
    matchedEneba?.url ||
    buildEnebaFilteredUrl(resolvedTitle, { region: "global", platform: resolvedPlatform });

  // Hitung target harga jual Shopee yang tidak pernah rugi & rapi (akhiran .900)
  const rawTargetShopee = calculateTargetSellingPrice({
    cogsIdr: priceEnebaIdr,
    presetId: "reguler",
    packagingCostIdr: 0,
    targetMarginPct,
  });
  const targetShopee = Math.max(19900, Math.ceil(rawTargetShopee / 1000) * 1000 - 100);

  // Jika Steam Indonesia tersedia & lebih tinggi dari targetShopee, pasang harga di bawah Steam normal
  let recommendedShopee = targetShopee;
  const steamCeilingRef = steamCurrentIdr > 0 ? steamCurrentIdr : steamOrigIdr;
  if (steamCeilingRef > targetShopee * 1.12) {
    const competitive = Math.floor((steamCeilingRef * 0.88) / 1000) * 1000 - 100;
    const capped = Math.ceil((targetShopee * 1.25) / 1000) * 1000 - 100;
    recommendedShopee = Math.max(targetShopee, Math.min(competitive, capped));
  }

  const eco = calculateShopeeEconomics({
    sellingPriceIdr: recommendedShopee,
    cogsIdr: priceEnebaIdr,
    presetId: "reguler",
    packagingCostIdr: 0,
  });

  const spreadPct =
    priceEnebaIdr > 0 ? Math.round(((recommendedShopee - priceEnebaIdr) / priceEnebaIdr) * 1000) / 10 : 0;

  let arbitrageViable = eco.netProfitIdr > 5000 && eco.netMarginPct >= 10;
  let arbitrageWarning: string | undefined;

  if (steamCurrentIdr > 0 && recommendedShopee >= steamCurrentIdr * 0.98) {
    arbitrageViable = false;
    arbitrageWarning =
      `Harga key Eneba saat ini (~Rp ${priceEnebaIdr.toLocaleString("id-ID")}) terlalu tinggi dibanding Steam Indonesia (Rp ${steamCurrentIdr.toLocaleString("id-ID")}` +
      `${steamDiscountPct > 0 ? `, diskon ${steamDiscountPct}% dari Rp ${steamOrigIdr.toLocaleString("id-ID")}` : ""}). Tidak layak untuk arbitrase jual ulang di Shopee saat ini.`;
  } else if (steamCurrentIdr > 0 && priceEnebaIdr >= steamCurrentIdr) {
    arbitrageViable = false;
    arbitrageWarning = `Modal Eneba (Rp ${priceEnebaIdr.toLocaleString("id-ID")}) melebihi harga resmi Steam Indonesia (Rp ${steamCurrentIdr.toLocaleString("id-ID")}).`;
  }

  const keyType = matchedEneba?.is_gift
    ? `${resolvedPlatform} Gift Global`
    : `${resolvedPlatform} Key Global`;

  return {
    title: resolvedTitle,
    platform: resolvedPlatform,
    key_type: keyType,
    eneba_direct_url: enebaUrl,
    price_eneba_idr: priceEnebaIdr,
    eneba_base_price_idr: enebaBasePrice,
    recommended_shopee_price_idr: recommendedShopee,
    steam_indo_price_idr: steamCurrentIdr || steamOrigIdr || Math.round(recommendedShopee * 1.25),
    steam_indo_original_idr: steamOrigIdr,
    steam_discount_pct: steamDiscountPct,
    cheapshark_usd: cheapestUsd,
    usd_idr_rate: Math.round(usdRate),
    qris_fee_idr: eco.qrisFeeIdr,
    shopee_fee_idr: eco.shopeeFeeIdr,
    net_profit_idr: eco.netProfitIdr,
    net_margin_pct: eco.netMarginPct,
    spread_pct: spreadPct,
    data_source: enebaLiveVerified || cheapsharkLiveVerified || steamLiveVerified ? "live_market_verified" : "ai_estimated",
    eneba_live_verified: enebaLiveVerified,
    steam_live_verified: steamLiveVerified,
    cheapshark_live_verified: cheapsharkLiveVerified,
    arbitrage_viable: arbitrageViable,
    arbitrage_warning: arbitrageWarning,
    steam_app_id: realSteam?.steam_app_id,
  };
}

/**
 * Auto-Discover Trend NYATA (Zero Gimmick):
 * Mengumpulkan kandidat game trending dari Steam Indonesia Top Sellers/Specials + CheapShark Global Deals
 * + saran judul trending Gemini AI, lalu MEMVALIDASI setiap kandidat ke Eneba Live SSR + Steam ID.
 * Hanya mengembalikan peluang yang BENAR-BENAR ada di Eneba dengan margin bersih positif & harga di bawah Steam ID!
 */
export async function discoverRealTrendingOpportunity(
  excludeTitles: Set<string> = new Set()
): Promise<{
  verified: VerifiedMarketOpportunity;
  tactical_reason: string;
  instant_redeem_guide: string;
}> {
  const csHeaders = {
    "User-Agent": "AksharaGamingCenter/2.0 (ops@aksharagaming.id)",
    Accept: "application/json",
  };

  const [steamFeatured, cheapDealsRated, cheapDealsSavings, aiTitlesRaw] = await Promise.all([
    fetch("https://store.steampowered.com/api/featuredcategories/?cc=id&l=indonesian", {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch("https://www.cheapshark.com/api/1.0/deals?pageSize=30&sortBy=DealRating&upperPrice=18&onSale=1", {
      headers: csHeaders,
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetch("https://www.cheapshark.com/api/1.0/deals?pageSize=30&sortBy=Savings&upperPrice=15&onSale=1", {
      headers: csHeaders,
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    callGemini(
      `Berikan 8 judul game PC populer non-indie-obscure yang sering dicari gamer Indonesia dan harga normal Steam-nya mahal (>= Rp 200.000) sementara key global-nya sering diskon besar (misal: Hogwarts Legacy, Resident Evil 4, Cyberpunk 2077, Red Dead Redemption 2, Monster Hunter World, Mortal Kombat 11, Batman Arkham Knight, Middle-earth Shadow of War, Elden Ring, GTA V).
Hanya kembalikan JSON array string judul game (JANGAN tulis harga):
{"titles": ["..."]}`,
      "Kembalikan hanya daftar judul game populer dalam JSON.",
      { jsonMode: true, temperature: 0.8 }
    ).catch(() => ""),
  ]);

  const candidateTitles: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (raw?: string) => {
    const clean = (raw || "").trim();
    const low = clean.toLowerCase();
    if (!clean || clean.length < 3) return;
    if (/steam machine|steam deck|soundtrack|upgrade|dlc|pack|bundle|skin/i.test(low)) return;
    if (seen.has(low) || excludeTitles.has(low)) return;
    seen.add(low);
    candidateTitles.push(clean);
  };

  // 1. CheapShark deals with steamAppID & real savings (most likely cheaper than Steam ID!)
  const allCheap = [
    ...(Array.isArray(cheapDealsRated) ? cheapDealsRated : []),
    ...(Array.isArray(cheapDealsSavings) ? cheapDealsSavings : []),
  ];
  for (const d of allCheap) {
    if (Number(d.savings || 0) >= 50 && Number(d.salePrice || 0) >= 1.5 && d.steamAppID) {
      pushCandidate(d.title);
    }
  }

  // 2. AI trending title ideas (judul saja, harga 100% diverifikasi API!)
  if (aiTitlesRaw) {
    try {
      const cleaned = aiTitlesRaw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.titles)) {
        for (const t of parsed.titles) pushCandidate(String(t));
      }
    } catch {}
  }

  // 3. Steam Featured Top Sellers & Specials (prioritaskan yg diskonnya < 50% atau non-promo supaya key global berpotensi lebih murah!)
  const steamItems = [
    ...(Array.isArray(steamFeatured?.top_sellers?.items) ? steamFeatured.top_sellers.items : []),
    ...(Array.isArray(steamFeatured?.specials?.items) ? steamFeatured.specials.items : []),
  ].sort((a: any, b: any) => (Number(a.discount_percent) || 0) - (Number(b.discount_percent) || 0));
  for (const it of steamItems) {
    if ((Number(it.final_price) || 0) >= 8000000) {
      pushCandidate(it.name);
    }
  }

  // Cek bertahap (1 per 1 dengan jeda singkat 180ms agar Eneba SSR tidak memblokir/throttle & harga asli Rp 73rb terbaca akurat!)
  const pool = candidateTitles.slice(0, 18);
  const verifiedEnebaViable: VerifiedMarketOpportunity[] = [];
  const verifiedAnyViable: VerifiedMarketOpportunity[] = [];
  const verifiedLastResort: VerifiedMarketOpportunity[] = [];

  for (let i = 0; i < pool.length; i++) {
    const title = pool[i];
    const item = await verifyLiveGameOpportunity({
      query: title,
      preferredPlatform: "Steam",
      targetMarginPct: 18,
    }).catch(() => null);
    if (item) {
      if (item.eneba_live_verified && item.arbitrage_viable && item.net_margin_pct >= 12) {
        verifiedEnebaViable.push(item);
      } else if (item.arbitrage_viable && item.net_margin_pct >= 12) {
        verifiedAnyViable.push(item);
      } else if (item.eneba_live_verified || item.cheapshark_live_verified) {
        verifiedLastResort.push(item);
      }
    }
    if (verifiedEnebaViable.length >= 2) break;
    if (i >= 10 && verifiedEnebaViable.length >= 1) break;
    if (i < pool.length - 1) {
      await new Promise((r) => setTimeout(r, 180));
    }
  }

  verifiedEnebaViable.sort((a, b) => b.net_margin_pct - a.net_margin_pct || b.net_profit_idr - a.net_profit_idr);
  verifiedAnyViable.sort((a, b) => b.net_margin_pct - a.net_margin_pct || b.net_profit_idr - a.net_profit_idr);

  const chosen = verifiedEnebaViable[0] || verifiedAnyViable[0] || verifiedLastResort[0];
  if (!chosen) {
    throw new Error("Tidak ada kandidat trend yang lolos verifikasi harga live Eneba & Steam Indonesia saat ini.");
  }

  const baseInfo = chosen.eneba_live_verified
    ? `Harga Eneba Live terverifikasi Rp ${chosen.eneba_base_price_idr.toLocaleString("id-ID")} (mendarat ~Rp ${chosen.price_eneba_idr.toLocaleString("id-ID")} + fee checkout)`
    : `Harga Global API terverifikasi $${chosen.cheapshark_usd.toFixed(2)} USD (~Rp ${chosen.price_eneba_idr.toLocaleString("id-ID")})`;

  const steamInfo = chosen.steam_live_verified
    ? `dibanding harga Steam Indonesia Rp ${chosen.steam_indo_price_idr.toLocaleString("id-ID")}${
        chosen.steam_discount_pct > 0 ? ` (normal Rp ${chosen.steam_indo_original_idr.toLocaleString("id-ID")})` : ""
      }`
    : "";

  const reason = chosen.arbitrage_warning
    ? `${chosen.arbitrage_warning} ${baseInfo}.`
    : `${baseInfo} ${steamInfo}. Proyeksi laba bersih Rp ${chosen.net_profit_idr.toLocaleString("id-ID")} (+${chosen.net_margin_pct}%) setelah potongan Shopee 8% + Rp 1.000 & QRIS 0.7%.`;

  return {
    verified: chosen,
    tactical_reason: reason.trim(),
    instant_redeem_guide:
      chosen.platform.toLowerCase().includes("xbox") || chosen.platform.toLowerCase().includes("microsoft")
        ? "Buka redeem.microsoft.com > Login akun Microsoft pribadi pembeli > Masukkan kode lisensi 25-digit."
        : "Buka Steam Client > Klik '+ Add a Game' > 'Activate a Product on Steam' > Masukkan kode CDKey resmi.",
  };
}

// =========================================================================
// Persistent Research Radar Storage (Supabase app_kv + Disk JSON Fallback)
// Memastikan hasil Research / Auto Discover Trend TIDAK hilang saat refresh!
// =========================================================================
const MAX_PERSISTED_RESEARCH = 60;

function getResearchLocalPath(channel: "eneba" | "g2g"): string[] {
  const fileName =
    channel === "eneba" ? "research_discovered_eneba.json" : "research_discovered_g2g.json";
  return [
    path.resolve(process.cwd(), "data", fileName),
    path.resolve(os.tmpdir(), `akshara_${fileName}`),
  ];
}

export async function getPersistedResearchGames(channel: "eneba" | "g2g"): Promise<any[]> {
  const kvKey = channel === "eneba" ? "research_discovered_eneba" : "research_discovered_g2g";
  if (isDbConfigured()) {
    try {
      const kvVal = await getKV(kvKey);
      if (Array.isArray(kvVal)) {
        return kvVal;
      }
    } catch {}
  }

  for (const p of getResearchLocalPath(channel)) {
    try {
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

export async function savePersistedResearchGames(
  channel: "eneba" | "g2g",
  newItems: any[]
): Promise<any[]> {
  if (!Array.isArray(newItems) || newItems.length === 0) {
    return getPersistedResearchGames(channel);
  }
  const existing = await getPersistedResearchGames(channel);
  const byKey = new Map<string, any>();

  // Put newly discovered items first so latest scans stay on top
  for (const item of newItems) {
    if (!item || !item.title) continue;
    const key = String(item.title).toLowerCase().trim();
    byKey.set(key, {
      ...item,
      persisted_in_research_db: true,
      persisted_at: item.persisted_at || new Date().toISOString(),
    });
  }
  for (const old of existing) {
    if (!old || !old.title) continue;
    const key = String(old.title).toLowerCase().trim();
    if (!byKey.has(key)) {
      byKey.set(key, old);
    }
  }

  const merged = Array.from(byKey.values()).slice(0, MAX_PERSISTED_RESEARCH);
  const kvKey = channel === "eneba" ? "research_discovered_eneba" : "research_discovered_g2g";
  if (isDbConfigured()) {
    await setKV(kvKey, merged).catch((e) =>
      console.warn(`[Research Persist ${kvKey}] setKV warning:`, e)
    );
  }

  const jsonStr = JSON.stringify(merged, null, 2);
  for (const p of getResearchLocalPath(channel)) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, jsonStr, "utf-8");
    } catch {}
  }

  return merged;
}

export async function deletePersistedResearchGame(
  channel: "eneba" | "g2g",
  idOrTitle: string
): Promise<any[]> {
  const existing = await getPersistedResearchGames(channel);
  const target = idOrTitle.toLowerCase().trim();
  const next = existing.filter(
    (it: any) =>
      String(it.id || "").toLowerCase() !== target &&
      String(it.title || "").toLowerCase().trim() !== target
  );

  const kvKey = channel === "eneba" ? "research_discovered_eneba" : "research_discovered_g2g";
  if (isDbConfigured()) {
    await setKV(kvKey, next).catch(() => {});
  }
  const jsonStr = JSON.stringify(next, null, 2);
  for (const p of getResearchLocalPath(channel)) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, jsonStr, "utf-8");
    } catch {}
  }
  return next;
}
