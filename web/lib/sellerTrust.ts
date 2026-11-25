/**
 * Seller Rating, Reputation & Composite Trust Engine (0-100)
 * Digunakan bersama oleh auto-find-sellers, g2g-crawler, eneba-crawler, catalog, cron, dan Sentry & Risk Hub.
 */
import { calculateShopeeEconomics } from "@/lib/pricing";

export type TrustTier = "Safe (A+)" | "Moderate (B)" | "Caution (C)";

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

  if (rawRating > 0 && rawRating < 92) {
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

  const trustScore = Math.max(
    0,
    Math.min(100, Math.round(priceMarginScore + ratingScore + volumeScore + deliveryScore))
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
