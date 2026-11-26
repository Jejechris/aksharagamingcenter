/**
 * Shopee Indonesia Seller Compliance & Clean Listing Guard.
 * Single Source of Truth untuk format judul simpel seragam cover,
 * pembersih emoji/simbol non-standar, serta deteksi risiko HAKI & kata terlarang Shopee.
 */

export const FORBIDDEN_URL_RE = /(https?:\/\/|wa\.me|bit\.ly|vercel\.app|\.com\b|\.id\b|shopee\.co)/i;
export const PHYSICAL_JUNK_RE = /(amplop fisik|kartu garansi fisik|ekspedisi kurir|video unboxing amplop)/i;
export const EMOJI_OR_DECOR_RE = /([\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF\u2500-\u257F\uFE0E\uFE0F\u200D])/;
export const PROMO_SPAM_RE = /\b(100%\s*original|termurah|terlaris|hot item|best seller|gratis ongkir|promo gila)\b/i;
export const SENSITIVE_TRIGGER_RE = /\b(bajakan|sharing|shared|hackback|crack|keygen|carding|bypass|akun curian)\b/i;
export const HAKI_RISK_RE = /\b(windows\s*(10|11|pro|home)?|microsoft\s*office|office\s*365|adobe|photoshop|premiere|coreldraw|autocad|antivirus|os\s*license|key\s*oem)\b/i;

export function formatCleanShopeeTitle(params: {
  title: string;
  platform?: string;
  category?: string;
}): string {
  const rawTitle = (params.title || "Game Original")
    .replace(/\[.*?\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rawPlatform = (params.platform || "PC").trim();
  const category = (params.category || "").toLowerCase();

  const typeSuffix = /key|cdkey|redeem|license/i.test(category) ? "CD-Key" : "Private";

  const hasPlatform =
    rawPlatform.length > 0 &&
    rawTitle.toLowerCase().includes(rawPlatform.toLowerCase());

  let formatted = hasPlatform
    ? `${rawTitle} - ${typeSuffix}`
    : `${rawTitle} (${rawPlatform}) - ${typeSuffix}`;

  // Bersihkan emoji/karakter non-standar dari judul
  formatted = stripEmojisAndUnsafeSymbols(formatted).replace(/\s+/g, " ").trim();

  if (formatted.length > 120) {
    formatted = formatted.slice(0, 117).trim() + "...";
  }
  return formatted;
}

export function stripEmojisAndUnsafeSymbols(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF\uFE0E\uFE0F\u200D]/g, "")
    .replace(/[━═─]+/g, "--------------------------------------------------")
    .replace(/[•✓✔]/g, "-")
    .replace(/[✕✖]/g, "x")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isHighRiskHakiProduct(
  title: string,
  platform?: string,
  category?: string
): { highRisk: boolean; reason?: string } {
  const combined = `${title} ${platform || ""} ${category || ""}`;
  if (HAKI_RISK_RE.test(combined)) {
    return {
      highRisk: true,
      reason:
        "Berisiko tinggi terkena takedown HAKI / Brand IP Portal (Windows/Office/Software) kecuali memiliki surat izin distributor resmi.",
    };
  }
  return { highRisk: false };
}

export interface ShopeeSafetyAuditItem {
  severity: "error" | "warning";
  message: string;
}

export function auditShopeeTextSafety(params: {
  seoTitle: string;
  description: string;
  baseTitle?: string;
  platform?: string;
  category?: string;
}): ShopeeSafetyAuditItem[] {
  const findings: ShopeeSafetyAuditItem[] = [];
  const title = (params.seoTitle || "").trim();
  const desc = (params.description || "").trim();

  if (title.length < 10) {
    findings.push({ severity: "error", message: "Judul produk Shopee minimal 10 karakter." });
  }
  if (title.length > 120) {
    findings.push({ severity: "warning", message: "Judul >120 karakter bisa terpotong saat pencarian Shopee." });
  }
  if (desc.length < 60) {
    findings.push({ severity: "error", message: "Deskripsi produk Shopee minimal 60 karakter." });
  }

  // Cek ALL CAPS berlebihan di judul (>75% huruf kapital dan panjang > 15 char)
  const letters = title.replace(/[^a-zA-Z]/g, "");
  const upperLetters = title.replace(/[^A-Z]/g, "");
  if (letters.length > 15 && upperLetters.length / letters.length > 0.75) {
    findings.push({
      severity: "warning",
      message: "Judul didominasi huruf kapital semua (ALL CAPS); gunakan huruf normal agar sesuai panduan judul Shopee.",
    });
  }

  if (PROMO_SPAM_RE.test(title)) {
    findings.push({
      severity: "warning",
      message: "Hindari kata promosi clickbait di judul ('100% Original', 'Termurah', 'Best Seller', 'Diskon').",
    });
  }

  if (EMOJI_OR_DECOR_RE.test(title) || EMOJI_OR_DECOR_RE.test(desc)) {
    findings.push({
      severity: "error",
      message: "Terdeteksi emoji/simbol dekoratif di judul atau deskripsi — Shopee mewajibkan teks alfanumerik polos tanpa emoji.",
    });
  }

  if (FORBIDDEN_URL_RE.test(title) || FORBIDDEN_URL_RE.test(desc)) {
    findings.push({
      severity: "error",
      message: "Terdeteksi URL/domain/kontak eksternal — dilarang keras di listing Shopee.",
    });
  }

  if (PHYSICAL_JUNK_RE.test(desc)) {
    findings.push({
      severity: "warning",
      message: "Masih ada kata amplop/kurir fisik dalam deskripsi.",
    });
  }

  if (SENSITIVE_TRIGGER_RE.test(title) || SENSITIVE_TRIGGER_RE.test(desc)) {
    findings.push({
      severity: "warning",
      message: "Hindari kata pemicu moderasi Shopee (misal: sharing, bajakan, hackback, crack) meski dalam konteks menyangkal.",
    });
  }

  const haki = isHighRiskHakiProduct(
    params.baseTitle || title,
    params.platform,
    params.category
  );
  if (haki.highRisk && haki.reason) {
    findings.push({
      severity: "warning",
      message: haki.reason,
    });
  }

  return findings;
}
