/**
 * Single Source of Truth untuk kalkulasi ekonomi, biaya QRIS, buffer kurs FX,
 * dan preset program biaya Shopee Indonesia.
 */

export type ShopeeFeePresetId = "reguler" | "xtra_ongkir" | "flash_promo";

export interface ShopeeFeePreset {
  id: ShopeeFeePresetId;
  label: string;
  shortLabel: string;
  adminFeePct: number;
  fixedFeeIdr: number;
  description: string;
}

export const SHOPEE_FEE_PRESETS: Record<ShopeeFeePresetId, ShopeeFeePreset> = {
  reguler: {
    id: "reguler",
    label: "Reguler Non-Program (8% + Rp 1.000)",
    shortLabel: "Reguler 8%",
    adminFeePct: 8.0,
    fixedFeeIdr: 1000,
    description: "Biaya admin standar seller digital tanpa program Gratis Ongkir Xtra / Cashback Xtra.",
  },
  xtra_ongkir: {
    id: "xtra_ongkir",
    label: "Star / Gratis Ongkir Xtra (12% + Rp 1.000)",
    shortLabel: "Xtra / Star 12%",
    adminFeePct: 12.0,
    fixedFeeIdr: 1000,
    description: "Simulasi potongan toko Star Seller / program Xtra (~8% admin + ~4% layanan program).",
  },
  flash_promo: {
    id: "flash_promo",
    label: "Flash Sale + Voucher Toko (14.5% + Rp 1.000)",
    shortLabel: "Promo Xtra 14.5%",
    adminFeePct: 14.5,
    fixedFeeIdr: 1000,
    description: "Margin guard saat kampanye promo, voucher toko, dan subsidi campaign aktif bersamaan.",
  },
};

export const DEFAULT_QRIS_FEE_PCT = 0.7;
export const DEFAULT_FX_BUFFER_PCT = 1.5;

export interface EconomicsInput {
  sellingPriceIdr: number;
  cogsIdr: number;
  presetId?: ShopeeFeePresetId;
  adminFeePct?: number;
  fixedFeeIdr?: number;
  qrisFeePct?: number;
  fxBufferPct?: number;
  packagingCostIdr?: number;
}

export interface EconomicsResult {
  presetId: ShopeeFeePresetId;
  adminFeePct: number;
  fixedFeeIdr: number;
  qrisFeePct: number;
  fxBufferPct: number;
  baseCogsIdr: number;
  fxBufferIdr: number;
  effectiveCogsIdr: number;
  qrisFeeIdr: number;
  cogsNetIdr: number;
  shopeeFeeIdr: number;
  packagingCostIdr: number;
  totalCostIdr: number;
  netProfitIdr: number;
  netMarginPct: number;
}

export function resolveFeeConfig(input: {
  presetId?: ShopeeFeePresetId;
  adminFeePct?: number;
  fixedFeeIdr?: number;
}) {
  const presetKey: ShopeeFeePresetId =
    input.presetId && SHOPEE_FEE_PRESETS[input.presetId] ? input.presetId : "reguler";
  const preset = SHOPEE_FEE_PRESETS[presetKey];
  const adminFeePct =
    typeof input.adminFeePct === "number" && Number.isFinite(input.adminFeePct)
      ? Math.max(0, input.adminFeePct)
      : preset.adminFeePct;
  const fixedFeeIdr =
    typeof input.fixedFeeIdr === "number" && Number.isFinite(input.fixedFeeIdr)
      ? Math.max(0, Math.round(input.fixedFeeIdr))
      : preset.fixedFeeIdr;
  return { presetId: presetKey, adminFeePct, fixedFeeIdr };
}

export function calculateShopeeEconomics(input: EconomicsInput): EconomicsResult {
  const { presetId, adminFeePct, fixedFeeIdr } = resolveFeeConfig(input);
  const qrisFeePct =
    typeof input.qrisFeePct === "number" && Number.isFinite(input.qrisFeePct)
      ? Math.max(0, input.qrisFeePct)
      : DEFAULT_QRIS_FEE_PCT;
  const fxBufferPct =
    typeof input.fxBufferPct === "number" && Number.isFinite(input.fxBufferPct)
      ? Math.max(0, input.fxBufferPct)
      : 0;
  const packagingCostIdr = Math.max(0, Math.round(Number(input.packagingCostIdr ?? 0) || 0));

  const baseCogsIdr = Math.max(0, Math.round(Number(input.cogsIdr) || 0));
  const fxBufferIdr = Math.round(baseCogsIdr * (fxBufferPct / 100));
  const effectiveCogsIdr = baseCogsIdr + fxBufferIdr;
  const qrisFeeIdr = Math.round(effectiveCogsIdr * (qrisFeePct / 100));
  const cogsNetIdr = effectiveCogsIdr + qrisFeeIdr;

  const sellingPriceIdr = Math.max(0, Math.round(Number(input.sellingPriceIdr) || 0));
  const shopeeFeeIdr =
    sellingPriceIdr > 0
      ? Math.round(sellingPriceIdr * (adminFeePct / 100)) + fixedFeeIdr
      : 0;

  const totalCostIdr = cogsNetIdr + shopeeFeeIdr + packagingCostIdr;
  const netProfitIdr = sellingPriceIdr > 0 ? sellingPriceIdr - totalCostIdr : 0;
  const netMarginPct =
    sellingPriceIdr > 0 ? Math.round((netProfitIdr / sellingPriceIdr) * 1000) / 10 : 0;

  return {
    presetId,
    adminFeePct,
    fixedFeeIdr,
    qrisFeePct,
    fxBufferPct,
    baseCogsIdr,
    fxBufferIdr,
    effectiveCogsIdr,
    qrisFeeIdr,
    cogsNetIdr,
    shopeeFeeIdr,
    packagingCostIdr,
    totalCostIdr,
    netProfitIdr,
    netMarginPct,
  };
}

export function calculateBreakEvenPrice(input: Omit<EconomicsInput, "sellingPriceIdr">): number {
  const eco = calculateShopeeEconomics({ ...input, sellingPriceIdr: 0 });
  const fixedComponent = eco.cogsNetIdr + eco.fixedFeeIdr + eco.packagingCostIdr;
  const denom = 1 - eco.adminFeePct / 100;
  if (denom <= 0.05) return fixedComponent;
  return Math.ceil(fixedComponent / denom);
}

export function calculateTargetSellingPrice(
  input: Omit<EconomicsInput, "sellingPriceIdr"> & { targetMarginPct: number }
): number {
  const eco = calculateShopeeEconomics({ ...input, sellingPriceIdr: 0 });
  const fixedComponent = eco.cogsNetIdr + eco.fixedFeeIdr + eco.packagingCostIdr;
  const denom = 1 - eco.adminFeePct / 100 - Math.max(0, input.targetMarginPct) / 100;
  if (denom <= 0.05) return 999000;
  const rawPrice = fixedComponent / denom;
  const roundedThousand = Math.ceil(rawPrice / 1000) * 1000;
  return roundedThousand > 900 ? roundedThousand - 100 : roundedThousand;
}
