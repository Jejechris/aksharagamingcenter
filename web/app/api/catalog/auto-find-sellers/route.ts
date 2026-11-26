import { NextRequest, NextResponse } from "next/server";
import { readAuthoritativeCatalog, writeAuthoritativeCatalog } from "@/lib/catalog";
import {
  G2G_CATEGORY_SLUGS,
  resolveGameKey,
  getG2GDirectOfferUrl,
  getG2GGameCategoryUrl,
} from "@/lib/g2g";
import {
  evaluateSellerTrust,
  evaluateSteamAccountFreshness,
  isSteamAccountProduct,
  FreshnessStatus,
  TrustTier,
} from "@/lib/sellerTrust";

export const dynamic = "force-dynamic";

interface SearchOfferItem {
  offer_id: string;
  title?: string;
  description?: string;
  username: string;
  converted_unit_price?: number;
  display_price?: string;
  unit_price_in_usd?: number;
  available_qty: number;
  is_sold_out: boolean;
  satisfaction_rate: number;
  total_success_order?: number;
  total_rating?: number;
  is_online?: boolean;
  delivery_speed?: string;
  seller_level?: string;
  verified?: boolean;
  qualityScore?: number;
  trustScore?: number;
  trustTier?: TrustTier;
  sellerRating?: number;
  sellerOrders?: number;
  priceIdr?: number;
  freshStatus?: FreshnessStatus;
  hasZeroHours?: boolean;
  hasFirstEmail?: boolean;
  freshnessBadges?: string[];
}

// Lapis 1: Blacklist Clickbait, Shared, Cracked, dan Non-Full-Access
const CLICKBAIT_BLACKLIST = [
  "shared", "sharing", "offline", "offline only", "offline mode", "rent", "rental", "sewa",
  "trial", "demo", "tlauncher", "cracked", "crack", "nfa", "sfa", "non-full", "no mail",
  "no email", "no change", "cant change", "can't change", "cannot change",
  "save game", "savegame", "mod ", "mods", "dlc only", "expansion only",
  "cape only", "coin", "coins", "gold", "currency", "boost", "boosting", "coaching",
  "random", "mystery", "lucky", "empty", "no game", "game pass", "gamepass", "1 month",
  "3 months", "14 days", "7 days", "1 day", "temporary", "temp ", "family share",
  "steam family", "activation", "p2", "p3", "secondary", "guest"
];

function hasClickbaitSignals(text: string): boolean {
  for (const b of CLICKBAIT_BLACKLIST) {
    if (text.includes(b)) return true;
  }
  // Cek pola hackback (0-300 hours played, 10+ hours, old account, archive, other paid games, dsb.)
  const freshness = evaluateSteamAccountFreshness(text);
  if (freshness.is_rejected_hackback_risk) {
    return true;
  }
  // Ban check: hindari false positive jika listing menulis "no ban" atau "unbanned"
  if (text.includes("banned") && !text.includes("unbanned") && !text.includes("no banned") && !text.includes("not banned")) {
    return true;
  }
  if (/(\bban\b|\bbans\b|\bhypixel ban\b)/i.test(text)) {
    if (!/(\bno bans?\b|\bnot ban\b|\bnever ban\b|\bunban|\bzero bans?\b)/i.test(text)) {
      return true;
    }
  }
  return false;
}

// Lapis 2: Price Sanity Floor
function getGamePriceFloor(gameTitle: string, sellingPrice: number, medianPrice: number = 0): number {
  const lower = gameTitle.toLowerCase();

  // Khusus game dengan harga wajar tinggi (patokan absolut anti-scam)
  if (lower.includes("minecraft")) return 95000;
  if (lower.includes("wukong") || lower.includes("black myth")) return 180000;
  if (lower.includes("gta") || lower.includes("grand theft auto")) return 90000;
  if (lower.includes("elden ring")) return 150000;
  if (lower.includes("cyberpunk") || lower.includes("rdr2") || lower.includes("red dead")) return 100000;
  if (lower.includes("fc 25") || lower.includes("fc25")) return 55000;

  let baseFloor = 12000;
  if (sellingPrice > 0) {
    baseFloor = Math.max(baseFloor, Math.round(sellingPrice * 0.3));
  }
  if (medianPrice > 0) {
    baseFloor = Math.max(baseFloor, Math.round(medianPrice * 0.45));
  }
  return baseFloor;
}

// Fetch deduplicated pool of up to 80 offers (recommended + lowest_price)
async function searchG2GOffersForSlug(slug: string): Promise<SearchOfferItem[]> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: "https://www.g2g.com/",
    Origin: "https://www.g2g.com",
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const [resRec, resLowest] = await Promise.all([
        fetch(
          `https://sls.g2g.com/offer/search?seo_term=${slug}&currency=IDR&country=ID&page_size=40`,
          { headers, signal: controller.signal, cache: "no-store" }
        ).catch(() => null),
        fetch(
          `https://sls.g2g.com/offer/search?seo_term=${slug}&currency=IDR&country=ID&sort=lowest_price&page_size=40`,
          { headers, signal: controller.signal, cache: "no-store" }
        ).catch(() => null),
      ]);

      clearTimeout(timeout);

      const map = new Map<string, SearchOfferItem>();

      if (resRec && resRec.ok) {
        const j = await resRec.json();
        const results = j?.payload?.results;
        if (Array.isArray(results)) {
          for (const item of results) {
            if (item.offer_id) map.set(item.offer_id, item);
          }
        }
      }

      if (resLowest && resLowest.ok) {
        const j = await resLowest.json();
        const results = j?.payload?.results;
        if (Array.isArray(results)) {
          for (const item of results) {
            if (item.offer_id && !map.has(item.offer_id)) {
              map.set(item.offer_id, item);
            }
          }
        }
      }

      if (map.size > 0 || attempt === 1) {
        return Array.from(map.values());
      }
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      if (attempt === 1) {
        console.warn(`[Auto-Find Sellers] Error querying slug ${slug}:`, err);
      }
    }
  }
  return [];
}

// 4 Lapis Filter, Anti-Hackback Freshness Guard & Composite Trust/Value Scoring Engine (0-100)
function processBestSellers(
  offers: SearchOfferItem[],
  gameTitle: string,
  sellingPrice: number,
  safeOnly: boolean = false,
  freshOnly: boolean = true,
  platform: string = "",
  category: string = ""
): {
  selectedSellers: any[];
  allCleanSellers: any[];
  filteredClickbaitCount: number;
  filteredNonFreshCount: number;
  verifiedFreshCount: number;
  freshFallbackWarning: boolean;
  cleanCandidatesCount: number;
} | null {
  if (!Array.isArray(offers) || offers.length === 0) return null;

  let filteredClickbaitCount = 0;
  const candidatesLayer1: SearchOfferItem[] = [];

  // Lapis 1: Blacklist Check
  for (const o of offers) {
    if (!o.offer_id || !o.username) continue;
    const textToCheck = `${o.title || ""} ${o.description || ""}`.toLowerCase();
    if (hasClickbaitSignals(textToCheck)) {
      filteredClickbaitCount++;
      continue;
    }
    candidatesLayer1.push(o);
  }

  // Hitung median harga dari kandidat Lapis 1
  const pricesL1 = candidatesLayer1
    .map((o) =>
      Number(o.converted_unit_price ?? o.display_price ?? Math.ceil((o.unit_price_in_usd ?? 0) * 17000))
    )
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  const medianPrice =
    pricesL1.length > 0 ? pricesL1[Math.floor(pricesL1.length / 2)] : 0;

  const floor = getGamePriceFloor(gameTitle, sellingPrice, medianPrice);

  // Lapis 2 & 3: Price Floor, Stock, Hard Reject & Composite Trust Scoring
  const scoredCandidates: SearchOfferItem[] = [];
  for (const o of candidatesLayer1) {
    const convertedIdr = Number(o.converted_unit_price ?? o.display_price ?? 0);
    const priceUsd = Number(o.unit_price_in_usd ?? 0);
    const priceIdr =
      convertedIdr > 0 ? Math.round(convertedIdr) : Math.ceil(priceUsd * 16850 * 1.045);

    if (priceIdr < floor) {
      filteredClickbaitCount++;
      continue;
    }

    const qty = Number(o.available_qty ?? 0);
    if (qty < 1 || o.is_sold_out) continue;

    const ordersCount = Number(o.total_success_order ?? o.total_rating ?? 0);
    const trustEval = evaluateSellerTrust({
      rating: o.satisfaction_rate,
      orders: ordersCount,
      reviews: o.total_rating,
      stock: qty,
      priceIdr,
      sellingPriceShopeeIdr: sellingPrice,
      deliverySpeed: o.delivery_speed,
      isOnline: o.is_online,
      sellerLevel: o.seller_level,
      verified: o.verified,
      priceFloorIdr: floor,
      offerTitle: o.title,
      offerDescription: o.description,
      platform,
      category,
      gameTitle,
    });

    // Hard Reject (<92% rating, low-transaction scam bait, or played/hackback risk)
    if (trustEval.is_hard_rejected) {
      filteredClickbaitCount++;
      continue;
    }

    // Optional Safe-Only toggle (>= 95% rating & >= 20 transactions)
    if (safeOnly && (trustEval.seller_rating < 95 || trustEval.seller_orders < 20)) {
      filteredClickbaitCount++;
      continue;
    }

    // Bonus listing clarity + Steam Freshness (0 Hours / Original Email / Full Data Change)
    const freshness = evaluateSteamAccountFreshness(`${o.title || ""} ${o.description || ""}`);
    const titleLower = (o.title || "").toLowerCase();
    let clarityBonus = freshness.freshness_bonus;
    if (titleLower.includes("full access") || /\bfa\b/.test(titleLower)) clarityBonus += 4;
    if (
      titleLower.includes("original email") ||
      titleLower.includes("first mail") ||
      titleLower.includes("changeable") ||
      titleLower.includes("key") ||
      titleLower.includes("cdkey")
    ) {
      clarityBonus += 4;
    }

    scoredCandidates.push({
      ...o,
      priceIdr,
      trustScore: trustEval.trust_score,
      trustTier: trustEval.trust_tier,
      sellerRating: trustEval.seller_rating,
      sellerOrders: trustEval.seller_orders,
      freshStatus: freshness.fresh_status,
      hasZeroHours: freshness.has_zero_hours,
      hasFirstEmail: freshness.has_first_email,
      freshnessBadges: freshness.badges,
      qualityScore: Math.min(100, trustEval.trust_score + clarityBonus),
    });
  }

  if (scoredCandidates.length === 0) return null;

  // Deduplikasi berdasarkan seller: simpan offer dengan Freshness + Trust & Quality Score tertinggi per seller
  const sellerMap = new Map<string, typeof scoredCandidates[0]>();
  for (const c of scoredCandidates) {
    const exist = sellerMap.get(c.username);
    const cFreshRank = c.freshStatus === "verified_fresh" ? 1 : 0;
    const existFreshRank = exist?.freshStatus === "verified_fresh" ? 1 : 0;
    if (
      !exist ||
      cFreshRank > existFreshRank ||
      (cFreshRank === existFreshRank &&
        ((c.qualityScore || 0) > (exist.qualityScore || 0) ||
          ((c.qualityScore || 0) === (exist.qualityScore || 0) &&
            (c.priceIdr || 0) < (exist.priceIdr || 0))))
    ) {
      sellerMap.set(c.username, c);
    }
  }

  const dedupedCandidates = Array.from(sellerMap.values());
  const isSteamGame = isSteamAccountProduct(platform, category, gameTitle);
  const verifiedFreshCandidates = dedupedCandidates.filter((c) => c.freshStatus === "verified_fresh");
  const verifiedFreshCount = verifiedFreshCandidates.length;

  let cleanCandidates = dedupedCandidates;
  let filteredNonFreshCount = 0;
  let freshFallbackWarning = false;

  if (freshOnly && isSteamGame) {
    if (verifiedFreshCandidates.length > 0) {
      filteredNonFreshCount = dedupedCandidates.length - verifiedFreshCandidates.length;
      cleanCandidates = verifiedFreshCandidates;
    } else {
      freshFallbackWarning = true;
    }
  }

  const cleanCandidatesCount = cleanCandidates.length;

  // 1. Best Value (Termurah yang lolos Hard Reject & Trust Filter)
  const sortedByPrice = [...cleanCandidates].sort((a, b) => (a.priceIdr || 0) - (b.priceIdr || 0));
  const lowestPriceOffer = sortedByPrice[0];

  // 2. Top Verified (Trust Score & Rating tertinggi + volume transaksi besar)
  const remainingForSafe = cleanCandidates.filter((o) => o.username !== lowestPriceOffer.username);
  const sortedBySafe = remainingForSafe.sort((a, b) => {
    const tA = a.trustScore || 0;
    const tB = b.trustScore || 0;
    if (tB !== tA) return tB - tA;
    return (b.sellerOrders || 0) - (a.sellerOrders || 0);
  });
  const ultraSafeOffer = sortedBySafe[0] || lowestPriceOffer;

  // 3. Balanced Alternative (Highest Quality Score)
  const remainingForMid = cleanCandidates.filter(
    (o) => o.username !== lowestPriceOffer.username && o.username !== ultraSafeOffer.username
  );
  const sortedByScore = remainingForMid.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  const midLevelOffer =
    sortedByScore[0] || (sortedByPrice.length > 1 ? sortedByPrice[1] : lowestPriceOffer);

  const buildSellerItem = (
    offer: typeof scoredCandidates[0],
    tier: "lowest_price" | "ultra_safe" | "mid_level",
    isRecommended: boolean
  ) => {
    const priceIdr = offer.priceIdr || 0;
    const priceUsd = Number(offer.unit_price_in_usd ?? 0);
    const directUrl = getG2GDirectOfferUrl(offer.offer_id, gameTitle);
    const catUrl = getG2GGameCategoryUrl(gameTitle);

    const trust = evaluateSellerTrust({
      rating: offer.satisfaction_rate,
      orders: offer.sellerOrders ?? offer.total_success_order ?? offer.total_rating,
      reviews: offer.total_rating,
      stock: offer.available_qty,
      priceIdr,
      sellingPriceShopeeIdr: sellingPrice,
      deliverySpeed: offer.delivery_speed,
      isOnline: offer.is_online,
      sellerLevel: offer.seller_level,
      verified: offer.verified,
    });

    const qrisFee = Math.round(priceIdr * 0.007);
    const cogsNet = priceIdr + qrisFee;
    const shopeeFee = Math.round(sellingPrice * 0.08) + 1000;
    const netProfit = sellingPrice - cogsNet - shopeeFee;
    const netMargin = sellingPrice > 0 ? Math.round((netProfit / sellingPrice) * 1000) / 10 : 0;

    let tierLabel = "⚡ BEST CLEAN VALUE";
    let tierDesc = "Harga kulakan Full Access termurah yang lolos filter anti-clickbait & reputasi.";
    if (tier === "ultra_safe") {
      tierLabel = "🛡️ TOP VERIFIED";
      tierDesc = `Trust Score ${trust.trust_score}/100 (${trust.trust_tier}) • Rating ${trust.seller_rating}% (${trust.seller_orders.toLocaleString("id-ID")} order).`;
    } else if (tier === "mid_level") {
      tierLabel = "⚖️ BALANCED TIER";
      tierDesc = `Alternatif seimbang (${trust.trust_tier}) dengan stok ${Number(offer.available_qty ?? 0)} unit.`;
    }

    return {
      seller_id: `g2g-${offer.offer_id}`,
      seller_name: offer.username,
      offer_title: offer.title || "G2G Verified Listing",
      quality_score: offer.qualityScore || trust.trust_score,
      trust_score: trust.trust_score,
      trust_tier: trust.trust_tier,
      seller_rating: trust.seller_rating,
      seller_orders: trust.seller_orders,
      seller_level: trust.seller_level,
      verified: trust.verified,
      delivery_time: trust.delivery_time,
      tier,
      tier_label: tierLabel,
      tier_desc: tierDesc,
      stock: Number(offer.available_qty ?? 0),
      price_g2g_idr: priceIdr,
      price_usd: priceUsd,
      rating_pct: trust.seller_rating,
      reviews_count: Number(offer.total_rating ?? trust.seller_orders),
      delivery_speed: offer.delivery_speed === "instant" ? "Instant Delivery" : "Fast Delivery",
      is_online: Boolean(offer.is_online),
      is_recommended: isRecommended,
      fresh_status: offer.freshStatus || trust.fresh_status || "unverified",
      has_zero_hours: Boolean(offer.hasZeroHours ?? trust.has_zero_hours),
      has_first_email: Boolean(offer.hasFirstEmail ?? trust.has_first_email),
      freshness_badges: offer.freshnessBadges || trust.freshness_badges || [],
      profile_url: directUrl,
      fallback_search_url: catUrl,
      offer_id: offer.offer_id,
      live_status: "live",
      qris_fee_idr: qrisFee,
      cogs_net_idr: cogsNet,
      net_profit_idr: netProfit,
      net_margin_pct: netMargin,
    };
  };

  const selectedSellers = [buildSellerItem(lowestPriceOffer, "lowest_price", true)];

  if (ultraSafeOffer.username !== lowestPriceOffer.username) {
    selectedSellers.push(buildSellerItem(ultraSafeOffer, "ultra_safe", false));
  }
  if (
    midLevelOffer.username !== lowestPriceOffer.username &&
    midLevelOffer.username !== ultraSafeOffer.username
  ) {
    selectedSellers.push(buildSellerItem(midLevelOffer, "mid_level", false));
  }

  // Jika belum sampai 3 seller, ambil kandidat bersih lainnya jika ada
  let idx = 0;
  while (selectedSellers.length < 3 && idx < sortedByPrice.length) {
    const cand = sortedByPrice[idx];
    if (!selectedSellers.some((s) => s.seller_name === cand.username)) {
      selectedSellers.push(buildSellerItem(cand, "mid_level", false));
    }
    idx++;
  }

  // Kumpulkan semua kandidat bersih (maks 10 terbaik dari seluruh cleanCandidates) untuk preview/sortir admin sebelum simpan ke DB
  const allRankedCandidates = [...cleanCandidates].sort((a, b) => {
    const fDiff = (b.freshStatus === "verified_fresh" ? 1 : 0) - (a.freshStatus === "verified_fresh" ? 1 : 0);
    if (fDiff !== 0) return fDiff;
    const scoreDiff = (b.qualityScore || 0) - (a.qualityScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.priceIdr || 0) - (b.priceIdr || 0);
  });
  const allCleanSellers = allRankedCandidates.slice(0, 10).map((cand) => {
    const tier =
      cand.username === ultraSafeOffer.username
        ? "ultra_safe"
        : cand.username === lowestPriceOffer.username
        ? "lowest_price"
        : "mid_level";
    return buildSellerItem(cand, tier, cand.username === selectedSellers[0]?.seller_name);
  });

  return {
    selectedSellers,
    allCleanSellers,
    filteredClickbaitCount,
    filteredNonFreshCount,
    verifiedFreshCount,
    freshFallbackWarning,
    cleanCandidatesCount,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { game_id, title, mode, safeOnly } = body;
    const filterSafeOnly = Boolean(safeOnly);
    const filterFreshOnly = body.freshOnly === undefined ? true : Boolean(body.freshOnly);
    const previewOnly = Boolean(body.preview_only);

    const catalog = await readAuthoritativeCatalog();
    if (!Array.isArray(catalog) || catalog.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Katalog kosong atau tidak dapat diakses." },
        { status: 400 }
      );
    }

    // MODE: "apply_preview" - Terapkan pilihan seller hasil sortir & review admin ke DB
    if (mode === "apply_preview") {
      const updates: Array<{
        game_id: string;
        sellers: any[];
        selected_seller_id: string;
      }> = Array.isArray(body.updates) ? body.updates : [];

      if (updates.length === 0) {
        return NextResponse.json({ status: "error", message: "Tidak ada perubahan seller yang dipilih." }, { status: 400 });
      }

      const changedIds: string[] = [];
      for (const upd of updates) {
        const g = catalog.find((x: any) => x.id === upd.game_id);
        if (!g || !Array.isArray(upd.sellers) || upd.sellers.length === 0) continue;

        g.sellers = upd.sellers;
        const chosenId =
          upd.selected_seller_id && upd.sellers.some((s: any) => s.seller_id === upd.selected_seller_id)
            ? upd.selected_seller_id
            : upd.sellers[0].seller_id;
        g.selected_seller_id = chosenId;

        const chosenSeller = upd.sellers.find((s: any) => s.seller_id === chosenId) || upd.sellers[0];
        const sellingPrice = Number(g.selling_price_shopee_idr || 100000);
        const shopeeFee = Math.round(sellingPrice * 0.08) + 1000;
        const cogsNet = chosenSeller.cogs_net_idr || Math.round((chosenSeller.price_g2g_idr || 0) * 1.007);
        const netProfit = sellingPrice - cogsNet - shopeeFee;
        const netMargin = sellingPrice > 0 ? Math.round((netProfit / sellingPrice) * 1000) / 10 : 0;

        g.target_margin_pct = netMargin;
        g.metrics = {
          selected_seller: { ...chosenSeller },
          cogs_g2g_idr: chosenSeller.price_g2g_idr,
          qris_fee_idr: chosenSeller.qris_fee_idr || Math.round((chosenSeller.price_g2g_idr || 0) * 0.007),
          cogs_net_idr: cogsNet,
          shopee_fee_idr: shopeeFee,
          packaging_cost_idr: 0,
          total_cost_idr: cogsNet + shopeeFee,
          net_profit_idr: netProfit,
          net_margin_pct: netMargin,
          break_even_price_idr: Math.ceil((cogsNet + 1000) / (1 - 0.08)),
        };
        changedIds.push(g.id);
      }

      if (changedIds.length > 0) {
        await writeAuthoritativeCatalog(catalog, { changedGameIds: changedIds });
      }

      return NextResponse.json({
        status: "success",
        message: `${changedIds.length} game berhasil diperbarui dengan seller pilihan Anda & tersimpan di database!`,
        updated_count: changedIds.length,
        allGames: catalog,
      });
    }

    // MODE: "all" - Otomatis cari seller live untuk semua game (mendukung preview_only agar admin cek & sortir dulu!)
    if (mode === "all") {
      let updatedCount = 0;
      let totalFilteredClickbait = 0;
      let totalFilteredNonFresh = 0;
      const logs: string[] = [];
      const changedIds: string[] = [];
      const batchPreviews: any[] = [];

      for (const game of catalog) {
        const gameKey = resolveGameKey(game.title);
        const slug = gameKey && G2G_CATEGORY_SLUGS[gameKey] ? G2G_CATEGORY_SLUGS[gameKey] : null;

        if (slug) {
          const offers = await searchG2GOffersForSlug(slug);
          if (offers.length > 0) {
            const processed = processBestSellers(
              offers,
              game.title,
              game.selling_price_shopee_idr || 100000,
              filterSafeOnly,
              filterFreshOnly,
              game.platform || "",
              game.category || ""
            );

            if (processed && processed.selectedSellers.length > 0) {
              totalFilteredClickbait += processed.filteredClickbaitCount;
              totalFilteredNonFresh += processed.filteredNonFreshCount;
              const bestCandidate = processed.selectedSellers[0];
              const sellingPrice = game.selling_price_shopee_idr || 100000;
              const shopeeFee = Math.round(sellingPrice * 0.08) + 1000;
              const totalCost = bestCandidate.cogs_net_idr + shopeeFee;
              const netProfit = sellingPrice - totalCost;
              const netMargin =
                sellingPrice > 0 ? Math.round((netProfit / sellingPrice) * 1000) / 10 : 0;
              const selectedStillExists = processed.selectedSellers.some(
                (s: any) => s.seller_id === game.selected_seller_id
              );

              if (previewOnly) {
                batchPreviews.push({
                  game_id: game.id,
                  game_title: game.title,
                  platform: game.platform || "Steam",
                  selling_price_shopee_idr: sellingPrice,
                  current_selected_seller_id: game.selected_seller_id,
                  recommended_selected_seller_id: bestCandidate.seller_id,
                  candidates: processed.allCleanSellers,
                  filtered_out_clickbait_count: processed.filteredClickbaitCount,
                  filtered_out_non_fresh_count: processed.filteredNonFreshCount,
                  verified_fresh_count: processed.verifiedFreshCount,
                  fresh_fallback_warning: processed.freshFallbackWarning,
                  clean_candidates_count: processed.cleanCandidatesCount,
                  total_raw_offers: offers.length,
                });
              } else {
                game.sellers = processed.selectedSellers;
                if (netMargin >= 5.0 || !selectedStillExists) {
                  game.selected_seller_id = bestCandidate.seller_id;
                  game.target_margin_pct = netMargin;
                  game.metrics = {
                    selected_seller: { ...bestCandidate },
                    cogs_g2g_idr: bestCandidate.price_g2g_idr,
                    qris_fee_idr: bestCandidate.qris_fee_idr,
                    cogs_net_idr: bestCandidate.cogs_net_idr,
                    shopee_fee_idr: shopeeFee,
                    packaging_cost_idr: 0,
                    total_cost_idr: totalCost,
                    net_profit_idr: netProfit,
                    net_margin_pct: netMargin,
                    break_even_price_idr: Math.ceil((bestCandidate.cogs_net_idr + 1000) / (1 - 0.08)),
                  };
                }
                changedIds.push(game.id);
              }

              updatedCount++;
              logs.push(
                `✅ ${game.title}: ${processed.allCleanSellers.length} kandidat bersih terverifikasi (${processed.filteredClickbaitCount} clickbait diblokir).`
              );
            }
          }
        }
      }

      if (!previewOnly && updatedCount > 0) {
        await writeAuthoritativeCatalog(catalog, { changedGameIds: changedIds });
      }

      return NextResponse.json({
        status: "success",
        preview_only: previewOnly,
        fresh_only: filterFreshOnly,
        message: previewOnly
          ? `Preview siap: ${updatedCount} game bersih disiapkan (${totalFilteredClickbait} clickbait/hackback & ${totalFilteredNonFresh} non-0h disaring). Silakan review & sortir.`
          : `Autonomous Seller Finder berhasil menyegarkan ${updatedCount} game (${totalFilteredClickbait} clickbait/hackback & ${totalFilteredNonFresh} non-0h diblokir).`,
        updated_count: updatedCount,
        filtered_out_clickbait_count: totalFilteredClickbait,
        filtered_out_non_fresh_count: totalFilteredNonFresh,
        batch_previews: previewOnly ? batchPreviews : undefined,
        allGames: catalog,
        logs,
      });
    }

    // MODE: "single" - Cari 3 seller live untuk 1 game spesifik
    const targetGame = catalog.find(
      (g: any) =>
        (game_id && g.id === game_id) ||
        (title && g.title.toLowerCase().trim() === title.toLowerCase().trim())
    );

    if (!targetGame) {
      return NextResponse.json(
        { status: "error", message: `Game dengan ID "${game_id}" atau judul "${title}" tidak ditemukan di katalog.` },
        { status: 404 }
      );
    }

    const gameKey = resolveGameKey(targetGame.title);
    const slug = gameKey && G2G_CATEGORY_SLUGS[gameKey] ? G2G_CATEGORY_SLUGS[gameKey] : "steam-global-account";

    const offers = await searchG2GOffersForSlug(slug);
    if (offers.length === 0) {
      return NextResponse.json({
        status: "warning",
        message: `G2G SLS tidak mengembalikan offer aktif untuk kategori "${slug}". Seller yang ada tetap dipertahankan.`,
        game: targetGame,
        allGames: catalog,
      });
    }

    const processed = processBestSellers(
      offers,
      targetGame.title,
      targetGame.selling_price_shopee_idr || 100000,
      filterSafeOnly,
      filterFreshOnly,
      targetGame.platform || "",
      targetGame.category || ""
    );

    if (!processed || processed.selectedSellers.length === 0) {
      return NextResponse.json({
        status: "warning",
        message: `Semua ${offers.length} penawaran untuk "${targetGame.title}" terindikasi clickbait / played hours / shared dan diblokir demi keamanan anti-hackback.`,
        game: targetGame,
        allGames: catalog,
        filtered_out_clickbait_count: offers.length,
      });
    }

    const bestCandidate = processed.selectedSellers[0];
    const sellingPrice = targetGame.selling_price_shopee_idr || 100000;
    const shopeeFee = Math.round(sellingPrice * 0.08) + 1000;
    const totalCost = bestCandidate.cogs_net_idr + shopeeFee;
    const netProfit = sellingPrice - totalCost;
    const netMargin = sellingPrice > 0 ? Math.round((netProfit / sellingPrice) * 1000) / 10 : 0;
    const selectedStillExists = processed.selectedSellers.some(
      (s: any) => s.seller_id === targetGame.selected_seller_id
    );

    if (previewOnly) {
      return NextResponse.json({
        status: "success",
        preview_only: true,
        fresh_only: filterFreshOnly,
        message: `Ditemukan ${processed.allCleanSellers.length} kandidat bersih (${processed.filteredClickbaitCount} hackback/clickbait & ${processed.filteredNonFreshCount} non-0h disaring).`,
        game: targetGame,
        recommended_selected_seller_id: bestCandidate.seller_id,
        sellers: processed.allCleanSellers,
        filtered_out_clickbait_count: processed.filteredClickbaitCount,
        filtered_out_non_fresh_count: processed.filteredNonFreshCount,
        verified_fresh_count: processed.verifiedFreshCount,
        fresh_fallback_warning: processed.freshFallbackWarning,
        clean_candidates_count: processed.cleanCandidatesCount,
        total_raw_offers: offers.length,
      });
    }

    targetGame.sellers = processed.selectedSellers;

    if (netMargin >= 5.0 || !selectedStillExists) {
      targetGame.selected_seller_id = bestCandidate.seller_id;
      targetGame.target_margin_pct = netMargin;
      targetGame.metrics = {
        selected_seller: { ...bestCandidate },
        cogs_g2g_idr: bestCandidate.price_g2g_idr,
        qris_fee_idr: bestCandidate.qris_fee_idr,
        cogs_net_idr: bestCandidate.cogs_net_idr,
        shopee_fee_idr: shopeeFee,
        packaging_cost_idr: 0,
        total_cost_idr: totalCost,
        net_profit_idr: netProfit,
        net_margin_pct: netMargin,
        break_even_price_idr: Math.ceil((bestCandidate.cogs_net_idr + 1000) / (1 - 0.08)),
      };
    }

    await writeAuthoritativeCatalog(catalog, { changedGameIds: [targetGame.id] });

    return NextResponse.json({
      status: "success",
      preview_only: false,
      message: `Ditemukan ${processed.selectedSellers.length} seller Full Access bersih (${processed.filteredClickbaitCount} listing clickbait/shared diblokir otomatis).`,
      game: targetGame,
      allGames: catalog,
      sellers: processed.selectedSellers,
      filtered_out_clickbait_count: processed.filteredClickbaitCount,
      clean_candidates_count: processed.cleanCandidatesCount,
      total_raw_offers: offers.length,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
