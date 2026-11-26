/**
 * Seller Rating, Reputation & Composite Trust Engine (0-100)
 * Digunakan bersama oleh auto-find-sellers, g2g-crawler, eneba-crawler, catalog, cron, dan Sentry & Risk Hub.
 */
import { calculateShopeeEconomics } from "@/lib/pricing";

export type TrustTier = "Safe (A+)" | "Moderate (B)" | "Caution (C)";

export type FreshnessStatus = "verified_fresh" | "unverified" | "risky_played";

export interface SteamFreshnessEvaluation {
  fresh_status: FreshnessStatus;
  has_zero_hours: boolean;
  has_fresh_label: boolean;
  has_first_email: boolean;
  has_changeable_data: boolean;
  is_rejected_hackback_risk: boolean;
  risk_reason?: string;
  freshness_bonus: number;
  badges: string[];
}

export interface SellerTrustEvaluation {
  seller_rating: number;       // 0 - 100 (%)
  seller_orders: number;       // total transaksi / ulasan
  seller_level: string;
  verified: boolean;
  delivery_time: string;
  trust_score: number;         // 0 - 100
  trust_tier: TrustTier;
  is_hard_rejected: boolean;
  reject_reason?: string;
  net_margin_pct: number;
  net_profit_idr: number;
  fresh_status?: FreshnessStatus;
  has_zero_hours?: boolean;
  has_first_email?: boolean;
  freshness_badges?: string[];
}

const HACKBACK_SUBSTRINGS = [
  "old steam account",
  "old account",
  "aged account",
  "used account",
  "played account",
  "pre-owned",
  "previous owner",
  "random play time",
  "random playtime",
  "random hours",
  "inactive account",
  "dormant account",
  "bruteforce",
  "stealer",
  "combo list",
  "cracked",
  "hacked account",
  "hackback",
  "compromised",
  "no original email",
  "no original mail",
  "without original email",
  "without oge",
  "no oge",
  "email cannot be changed",
  "mail cannot be changed",
  "cant change email",
  "can't change email",
  "cannot change email",
  "perfect archive",
  "max runes",
  "max stats",
  "max gold",
  "max skill",
  "max credits",
  "100% progress",
  "100%process",
  "other paid games",
  "community account ban",
  "community ban",
  "vac ban",
  "trade ban",
  "game ban",
];

/**
 * Mengidentifikasi apakah produk merupakan Steam Account (berbeda dengan Key/CDKey/Item/Minecraft/EA).
 */
export function isSteamAccountProduct(
  platform?: string | null,
  category?: string | null,
  title?: string | null
): boolean {
  const plat = String(platform || "").toLowerCase();
  const cat = String(category || "").toLowerCase();
  const ttl = String(title || "").toLowerCase();

  if (
    cat.includes("key") ||
    cat.includes("cdkey") ||
    cat.includes("gift") ||
    cat.includes("item") ||
    cat.includes("trade") ||
    cat.includes("voucher") ||
    ttl.includes("mann co")
  ) {
    return false;
  }

  if (plat.includes("steam") && !plat.includes("rockstar")) {
    return true;
  }

  // Fallback untuk game katalog Steam yang umum
  if (
    !plat &&
    (ttl.includes("terraria") ||
      ttl.includes("wukong") ||
      ttl.includes("zomboid") ||
      ttl.includes("stardew") ||
      ttl.includes("lethal") ||
      ttl.includes("phasmo") ||
      ttl.includes("hollow knight") ||
      ttl.includes("garry") ||
      ttl.includes("elden ring") ||
      ttl.includes("palworld") ||
      ttl.includes("rust") ||
      ttl.includes("ready or not") ||
      ttl.includes("helldivers") ||
      ttl.includes("forza"))
  ) {
    return true;
  }

  return false;
}

/**
 * Mengevaluasi tingkat keamanan Anti-Hackback akun Steam berdasarkan judul & deskripsi offer G2G.
 * Memblokir akun berjam main (>0 jam), akun lama/random playtime, cracked/stealer, dan memprioritaskan 0 Hours Fresh + OGE.
 */
export function evaluateSteamAccountFreshness(
  text?: string | null
): SteamFreshnessEvaluation {
  const raw = String(text || "");
  const lower = raw.toLowerCase();

  if (!lower.trim()) {
    return {
      fresh_status: "unverified",
      has_zero_hours: false,
      has_fresh_label: false,
      has_first_email: false,
      has_changeable_data: false,
      is_rejected_hackback_risk: false,
      freshness_bonus: 0,
      badges: [],
    };
  }

  // 1. Cek pola range jam main (contoh: "0-300 hours Played", "0 - 100h")
  if (/\b0\s*[-–~]\s*[1-9]\d*\s*(?:h|hr|hrs|hour|hours)\b/i.test(lower)) {
    return {
      fresh_status: "risky_played",
      has_zero_hours: false,
      has_fresh_label: false,
      has_first_email: false,
      has_changeable_data: false,
      is_rejected_hackback_risk: true,
      risk_reason: "Terindikasi akun pernah dimainkan / rentan hackback (pola rentang jam main 0-X hours)",
      freshness_bonus: -50,
      badges: ["Risiko Hackback (Played)"],
    };
  }

  // 2. Cek jam main eksplisit > 0 (contoh: "10+ HOURS played", "150 hours played", "50h playtime")
  if (
    /\b[1-9]\d*\s*\+?\s*(?:h|hr|hrs|hour|hours)\s*(?:played|playing|play\s*time|playtime|logged|in[- ]?game|on account)\b/i.test(
      lower
    )
  ) {
    return {
      fresh_status: "risky_played",
      has_zero_hours: false,
      has_fresh_label: false,
      has_first_email: false,
      has_changeable_data: false,
      is_rejected_hackback_risk: true,
      risk_reason: "Akun memiliki riwayat jam main (>0 hours played), berisiko hackback",
      freshness_bonus: -50,
      badges: ["Risiko Hackback (>0h Played)"],
    };
  }

  // 3. Cek tanda kurung jam main (contoh: "(10+ HOURS)", "[200 Hours]"), abaikan konteks garansi/pengiriman
  const parenMatch = lower.match(/(?:\(|\[)([^)\]]*\b[1-9]\d*\s*\+?\s*(?:h|hr|hrs|hour|hours)\b[^)\]]*)(?:\)|\])/i);
  if (
    parenMatch &&
    !/(?:warranty|guarantee|delivery|deliver|dispatch|support|reply|response|shipping|mins?|garansi|kirim)/i.test(
      parenMatch[1]
    )
  ) {
    return {
      fresh_status: "risky_played",
      has_zero_hours: false,
      has_fresh_label: false,
      has_first_email: false,
      has_changeable_data: false,
      is_rejected_hackback_risk: true,
      risk_reason: `Listing menyebut jam main akun non-0h (${parenMatch[0]})`,
      freshness_bonus: -50,
      badges: ["Risiko Hackback (Played)"],
    };
  }

  // 4. Cek bundel banyak game berbayar/bonus acak ("+10 Other Paid Games", "+ Bonus Games" -> tipikal log cracked)
  if (
    /\+\s*(?:[1-9]\d*\s*)?(?:other\s+|bonus\s+|extra\s+|random\s+|more\s+)?(?:paid\s+)?games?\b/i.test(
      lower
    )
  ) {
    return {
      fresh_status: "risky_played",
      has_zero_hours: false,
      has_fresh_label: false,
      has_first_email: false,
      has_changeable_data: false,
      is_rejected_hackback_risk: true,
      risk_reason: "Listing bundel '+ Bonus / Other Paid Games' berisiko tinggi akun log/cracked",
      freshness_bonus: -50,
      badges: ["Risiko Hackback (Multi-Game Log)"],
    };
  }

  // 4b. Cek akun dengan status ban (Community ban, VAC ban, bans) tanpa penafian ("no ban"/"zero ban")
  if (
    /(\bbans?\b)/i.test(lower) &&
    !/(\bno\s+bans?\b|\bnot\s+banned\b|\bnever\s+banned\b|\bunban|\bzero\s+bans?\b|\b0\s+bans?\b|\bwithout\s+bans?\b)/i.test(
      lower
    )
  ) {
    return {
      fresh_status: "risky_played",
      has_zero_hours: false,
      has_fresh_label: false,
      has_first_email: false,
      has_changeable_data: false,
      is_rejected_hackback_risk: true,
      risk_reason: "Akun memiliki catatan ban / pembatasan Steam (Community/VAC Ban)",
      freshness_bonus: -50,
      badges: ["Risiko Akun Ban"],
    };
  }

  // 5. Cek substring berisiko hackback / save-game / akun lama
  for (const bad of HACKBACK_SUBSTRINGS) {
    if (lower.includes(bad)) {
      return {
        fresh_status: "risky_played",
        has_zero_hours: false,
        has_fresh_label: false,
        has_first_email: false,
        has_changeable_data: false,
        is_rejected_hackback_risk: true,
        risk_reason: `Listing mengandung indikasi non-fresh/cracked/save-file ("${bad}")`,
        freshness_bonus: -50,
        badges: ["Risiko Hackback (Non-Fresh)"],
      };
    }
  }

  // 6. Sinyal positif akun segar (0 Hours / Fresh / Original Email / Full Data Change)
  const hasZeroHours =
    /(?:\b0|steam0)\s*(?:h|hr|hrs|hour|hours)\b|0hour|\b0h\b|\bzero\s*hours?\b/i.test(lower);
  const hasFreshLabel =
    /\bfresh\b|\bbrand\s*new\b|\bnew\s+(?:steam\s+)?account\b|\b0\s*level\s*steam\b|\blevel\s*0\b|\bnever\s*played\b|\bunplayed\b/i.test(
      lower
    );
  const hasFirstEmail =
    /original\s*(?:e-?mail|mail)|\bfirst\s*(?:e-?mail|mail)|\bfist\s*(?:e-?mail|mail)|\boge\b|\bwith\s*(?:original|first)\s*mail/i.test(
      lower
    );
  const hasChangeableData =
    /full\s*data\s*change|can\s*change\s*(?:all\s*)?(?:data|email|details|info|password)|all\s*details?\s*changeable|changeable\s*data|bind\s*(?:the\s*)?email/i.test(
      lower
    );

  const badges: string[] = [];
  if (hasZeroHours) badges.push("0 Hours Fresh");
  else if (hasFreshLabel) badges.push("Fresh Account");
  if (hasFirstEmail) badges.push("First Email / OGE");
  if (hasChangeableData) badges.push("Full Data Change");

  let bonus = 0;
  if (hasZeroHours) bonus += 8;
  else if (hasFreshLabel) bonus += 5;
  if (hasFirstEmail) bonus += 5;
  if (hasChangeableData) bonus += 2;
  bonus = Math.min(15, bonus);

  const freshStatus: FreshnessStatus =
    hasZeroHours || hasFreshLabel ? "verified_fresh" : "unverified";

  return {
    fresh_status: freshStatus,
    has_zero_hours: hasZeroHours,
    has_fresh_label: hasFreshLabel,
    has_first_email: hasFirstEmail,
    has_changeable_data: hasChangeableData,
    is_rejected_hackback_risk: false,
    freshness_bonus: bonus,
    badges,
  };
}

export function normalizeSellerRating(rawRate?: number | string | null): number {
  if (rawRate === undefined || rawRate === null || rawRate === "") return 0;
  const num = Number(rawRate);
  if (!Number.isFinite(num) || num <= 0) return 0;
  // G2G SLS satisfaction_rate sering bernilai desimal 0.992 -> 99.2
  if (num <= 1.0) {
    return Math.round(num * 1000) / 10;
  }
  return Math.min(100, Math.round(num * 10) / 10);
}

export function formatOrdersCompact(orders?: number | null): string {
  const n = Math.max(0, Math.round(Number(orders) || 0));
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k terjual`;
  }
  return `${n} terjual`;
}

export function evaluateSellerTrust(params: {
  rating?: number | string | null;
  orders?: number | string | null;
  reviews?: number | string | null;
  stock?: number | string | null;
  priceIdr?: number;
  sellingPriceShopeeIdr?: number;
  deliverySpeed?: string | null;
  isOnline?: boolean | null;
  sellerLevel?: string | null;
  verified?: boolean | null;
  priceFloorIdr?: number;
  offerTitle?: string | null;
  offerDescription?: string | null;
  platform?: string | null;
  category?: string | null;
  gameTitle?: string | null;
}): SellerTrustEvaluation {
  const rawRating = normalizeSellerRating(params.rating);
  const ordersCount = Math.max(
    0,
    Math.round(Number(params.orders ?? params.reviews ?? 0) || 0)
  );
  const stockQty = Math.max(0, Math.round(Number(params.stock ?? 0) || 0));
  const priceIdr = Math.max(0, Number(params.priceIdr ?? 0) || 0);
  const sellingPrice = Math.max(0, Number(params.sellingPriceShopeeIdr ?? 0) || 0);
  const deliveryStr = (params.deliverySpeed || "Fast Delivery").trim();
  const isInstant =
    deliveryStr.toLowerCase().includes("instant") ||
    deliveryStr.toLowerCase().includes("0-detik") ||
    params.isOnline === true;

  // Rumus full-digital terpusat via web/lib/pricing.ts
  const eco = calculateShopeeEconomics({
    sellingPriceIdr: sellingPrice,
    cogsIdr: priceIdr,
    presetId: "reguler",
    packagingCostIdr: 0,
  });
  const netProfit = eco.netProfitIdr;
  const netMarginPct = eco.netMarginPct;

  // Hard Reject Filter
  let isHardRejected = false;
  let rejectReason: string | undefined;

  const combinedOfferText = `${params.offerTitle || ""} ${params.offerDescription || ""}`.trim();
  const freshness = combinedOfferText ? evaluateSteamAccountFreshness(combinedOfferText) : null;

  if (freshness?.is_rejected_hackback_risk) {
    isHardRejected = true;
    rejectReason = freshness.risk_reason || "Listing berisiko hackback / bukan akun fresh";
  } else if (rawRating > 0 && rawRating < 92) {
    isHardRejected = true;
    rejectReason = `Rating seller terlalu rendah (${rawRating}% < 92%)`;
  } else {
    const lowBaitThreshold = params.priceFloorIdr ? params.priceFloorIdr * 1.1 : 35000;
    if ((rawRating === 0 || ordersCount < 5) && priceIdr > 0 && priceIdr < lowBaitThreshold) {
      isHardRejected = true;
      rejectReason = `Indikasi bait/scam (transaksi ${ordersCount} < 5 pada harga terlalu rendah)`;
    }
  }

  // Fallback rating tampilan bila API tidak menyertakan
  const effectiveRating = rawRating > 0 ? rawRating : ordersCount >= 100 ? 96.0 : 94.0;

  // 1. 40% Daya Saing Harga & Margin Bersih
  let priceMarginScore = 0;
  if (sellingPrice > 0) {
    if (netMarginPct >= 30) priceMarginScore = 40;
    else if (netMarginPct >= 20) priceMarginScore = 30 + ((netMarginPct - 20) / 10) * 10;
    else if (netMarginPct >= 10) priceMarginScore = 18 + ((netMarginPct - 10) / 10) * 12;
    else if (netMarginPct > 0) priceMarginScore = 6 + (netMarginPct / 10) * 12;
    else priceMarginScore = 0;
  } else {
    priceMarginScore = priceIdr > 0 ? 28 : 20;
  }

  // 2. 35% Rating Positif Seller
  let ratingScore = 0;
  if (effectiveRating >= 98) {
    ratingScore = 35;
  } else if (effectiveRating >= 96) {
    ratingScore = 28 + ((effectiveRating - 96) / 2) * 7;
  } else if (effectiveRating >= 92) {
    ratingScore = 14 + ((effectiveRating - 92) / 4) * 14;
  } else {
    ratingScore = 0;
  }

  // 3. 15% Volume Transaksi / Ulasan
  let volumeScore = 0;
  if (ordersCount >= 10000) volumeScore = 15;
  else if (ordersCount >= 1000) volumeScore = 13;
  else if (ordersCount >= 200) volumeScore = 11;
  else if (ordersCount >= 50) volumeScore = 8;
  else if (ordersCount >= 20) volumeScore = 6;
  else if (ordersCount >= 5) volumeScore = 3;
  else volumeScore = 1;

  // 4. 10% Ketersediaan Stok & Kecepatan Pengiriman
  let deliveryScore = 0;
  if (stockQty >= 10) deliveryScore += 5;
  else if (stockQty >= 3) deliveryScore += 3;
  else if (stockQty >= 1) deliveryScore += 1;

  if (isInstant) deliveryScore += 5;
  else deliveryScore += 2;

  const freshnessAdj = freshness
    ? freshness.is_rejected_hackback_risk
      ? -40
      : Math.round(freshness.freshness_bonus * 0.5)
    : 0;

  const trustScore = Math.max(
    0,
    Math.min(100, Math.round(priceMarginScore + ratingScore + volumeScore + deliveryScore + freshnessAdj))
  );

  // 3 Tier Classification
  let trustTier: TrustTier = "Caution (C)";
  if (!isHardRejected && trustScore >= 80 && effectiveRating >= 96 && ordersCount >= 20) {
    trustTier = "Safe (A+)";
  } else if (!isHardRejected && trustScore >= 62 && effectiveRating >= 92) {
    trustTier = "Moderate (B)";
  }

  const verified =
    typeof params.verified === "boolean"
      ? params.verified
      : effectiveRating >= 97 && ordersCount >= 50;

  const sellerLevel =
    params.sellerLevel ||
    (ordersCount >= 10000
      ? "Top Merchant"
      : ordersCount >= 1000
      ? "Verified Pro"
      : ordersCount >= 20
      ? "Trusted Seller"
      : "New Seller");

  return {
    seller_rating: effectiveRating,
    seller_orders: ordersCount,
    seller_level: sellerLevel,
    verified,
    delivery_time: deliveryStr,
    trust_score: trustScore,
    trust_tier: trustTier,
    is_hard_rejected: isHardRejected,
    reject_reason: rejectReason,
    net_margin_pct: netMarginPct,
    net_profit_idr: netProfit,
    fresh_status: freshness?.fresh_status,
    has_zero_hours: freshness?.has_zero_hours,
    has_first_email: freshness?.has_first_email,
    freshness_badges: freshness?.badges,
  };
}

export function getTrustTierBadgeStyle(tier?: string): string {
  if (tier === "Safe (A+)") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (tier === "Moderate (B)") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export function getFreshnessBadgeStyle(status?: FreshnessStatus | string): string {
  if (status === "verified_fresh") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "risky_played") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-amber-50 text-amber-800 border-amber-200";
}
