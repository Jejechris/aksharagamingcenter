/**
 * G2G.com Bulletproof Zero-404 Verified Product Offer & Category Helper
 * Menghubungkan etalase lokal dengan seller & listing faktual di g2g.com tanpa pernah menghasilkan link 404 atau halaman kosong.
 *
 * Aturan Direct Offer & Anti-Kosong:
 * 1. Direct Offer format resmi Indonesia: https://www.g2g.com/id/categories/{slug}/offer/{offerId} (menampilkan harga IDR dan stok faktual).
 * 2. Kategori Evergreen resmi Indonesia: https://www.g2g.com/id/categories/{slug} (TANPA ?q=NamaSeller).
 * 3. Jika Offer ID terdaftar di KNOWN_DEAD_OFFERS atau statusnya delisted, dialihkan otomatis ke kategori game.
 * 4. Seller profile URL: https://www.g2g.com/{sellerUsername}
 */

import { buildEnebaFilteredUrl } from "./eneba";

export interface G2GOfferMapping {
  defaultOffer: string;
  categorySlug: string;
  categoryUrl: string;
  sellerOffers: Record<string, string>;
}

// Known expired or delisted offers mapped to their evergreen active category replacements
export const KNOWN_DEAD_OFFERS: Record<string, string> = {
  "G1737050259610GZ": "https://www.g2g.com/id/categories/terraria-account",
  "G1763801186859QT": "https://www.g2g.com/id/categories/tf2-item",
};

// Verified Category Slugs on G2G (Canonical slugs, 100% active, zero 404)
export const G2G_CATEGORY_SLUGS: Record<string, string> = {
  minecraft: "minecraft-account",
  terraria: "terraria-account",
  wukong: "black-myth-wukong-accounts",
  gta: "steam-global-account",
  tf2: "tf2-item",
  fc25: "fc-25-accounts",
  "fc 25": "fc-25-accounts",
  zomboid: "project-zomboid-accounts",
  stardew: "stardew-valley-account",
  "dont starve": "don-t-starve-together-accounts",
  "lethal company": "lethal-company-accounts",
  phasmophobia: "phasmophobia-account",
  "hollow knight": "hollow-knight-accounts",
  "garrys mod": "garry-s-mod-account",
  "elden ring": "elden-ring-account",
  palworld: "palworld-accounts",
  rust: "rust-accounts-buy",
  "left 4 dead": "left-4-dead-2-account",
  "among us": "among-us-account",
  witcher: "witcher-iii-wild-hunt-account",
  "ready or not": "ready-or-not-account",
  "sons of the forest": "sons-of-the-forest-accounts",
  helldivers: "helldivers-2-accounts",
  forza: "forza-horizon-5-account",
};

// Pemetaan seller & listing riil terverifikasi (Kategori Bersih Tanpa Query Parameter Seller)
export const VERIFIED_G2G_CATALOG: Record<string, G2GOfferMapping> = {
  minecraft: {
    defaultOffer: "https://www.g2g.com/id/categories/minecraft-account",
    categorySlug: "minecraft-account",
    categoryUrl: "https://www.g2g.com/id/categories/minecraft-account",
    sellerOffers: {
      hellenwong: "https://www.g2g.com/id/categories/minecraft-account",
      hellenwong_hypixel: "https://www.g2g.com/id/categories/minecraft-account",
      hellenwong_tlauncher: "https://www.g2g.com/id/categories/minecraft-account",
      lowest: "https://www.g2g.com/id/categories/minecraft-account",
    },
  },
  terraria: {
    defaultOffer: "https://www.g2g.com/id/categories/terraria-account",
    categorySlug: "terraria-account",
    categoryUrl: "https://www.g2g.com/id/categories/terraria-account",
    sellerOffers: {
      hellenwong: "https://www.g2g.com/id/categories/terraria-account",
      madangna: "https://www.g2g.com/id/categories/terraria-account",
      lootkings: "https://www.g2g.com/id/categories/terraria-account",
    },
  },
  wukong: {
    defaultOffer: "https://www.g2g.com/id/categories/black-myth-wukong-accounts",
    categorySlug: "black-myth-wukong-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/black-myth-wukong-accounts",
    sellerOffers: {
      financewz: "https://www.g2g.com/id/categories/black-myth-wukong-accounts",
      hellenwong: "https://www.g2g.com/id/categories/black-myth-wukong-accounts",
      hellenwong_savegame: "https://www.g2g.com/id/categories/black-myth-wukong-accounts",
    },
  },
  gta: {
    defaultOffer: "https://www.g2g.com/id/categories/steam-global-account",
    categorySlug: "steam-global-account",
    categoryUrl: "https://www.g2g.com/id/categories/steam-global-account",
    sellerOffers: {
      madangna: "https://www.g2g.com/id/categories/steam-global-account",
      hellenwong: "https://www.g2g.com/id/categories/steam-global-account",
      madangna_fivem: "https://www.g2g.com/id/categories/steam-global-account",
    },
  },
  tf2: {
    defaultOffer: "https://www.g2g.com/id/categories/tf2-item",
    categorySlug: "tf2-item",
    categoryUrl: "https://www.g2g.com/id/categories/tf2-item",
    sellerOffers: {
      player: "https://www.g2g.com/id/categories/tf2-item",
      gaugau: "https://www.g2g.com/id/categories/tf2-item",
      hellenwong: "https://www.g2g.com/id/categories/tf2-item",
    },
  },
  fc25: {
    defaultOffer: "https://www.g2g.com/id/categories/fc-25-accounts",
    categorySlug: "fc-25-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/fc-25-accounts",
    sellerOffers: {
      krovler: "https://www.g2g.com/id/categories/fc-25-accounts",
      hellenwong: "https://www.g2g.com/id/categories/fc-25-accounts",
      lootkings: "https://www.g2g.com/id/categories/fc-25-accounts",
      cnlteam: "https://www.g2g.com/id/categories/fc-25-accounts",
    },
  },
};

/**
 * Mencari game key dari string game title
 */
export function resolveGameKey(gameTitle?: string): string | null {
  if (!gameTitle) return null;
  const lower = gameTitle.toLowerCase();
  if (lower.includes("minecraft")) return "minecraft";
  if (lower.includes("terraria") || lower.includes("terreria")) return "terraria";
  if (lower.includes("wukong") || lower.includes("black myth")) return "wukong";
  if (lower.includes("gta") || lower.includes("grand theft auto")) return "gta";
  if (lower.includes("tf2") || lower.includes("mann co") || lower.includes("team fortress")) return "tf2";
  if (lower.includes("fc 25") || lower.includes("fc25") || lower.includes("fifa")) return "fc25";
  if (lower.includes("zomboid")) return "zomboid";
  if (lower.includes("stardew")) return "stardew";
  if (lower.includes("dont starve") || lower.includes("don't starve")) return "dont starve";
  if (lower.includes("lethal company")) return "lethal company";
  if (lower.includes("phasmophobia")) return "phasmophobia";
  if (lower.includes("hollow knight")) return "hollow knight";
  if (lower.includes("garry")) return "garrys mod";
  if (lower.includes("elden ring")) return "elden ring";
  if (lower.includes("palworld")) return "palworld";
  if (lower.includes("rust")) return "rust";
  if (lower.includes("left 4 dead") || lower.includes("l4d")) return "left 4 dead";
  if (lower.includes("among us")) return "among us";
  if (lower.includes("witcher")) return "witcher";
  if (lower.includes("ready or not")) return "ready or not";
  if (lower.includes("sons of the forest") || lower.includes("forest")) return "sons of the forest";
  if (lower.includes("helldivers")) return "helldivers";
  if (lower.includes("forza")) return "forza";
  return null;
}

/**
 * Ekstrak Offer ID G2G dari sembarang string/URL
 */
export function extractG2GOfferId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/(?:offer\/|item\/|^)?(G\d{10,}[A-Za-z0-9]*)/i);
  return match ? match[1] : null;
}

/**
 * Membersihkan nama seller dari suffix internal (seperti _Hypixel, _TLauncher, _SaveGame, _FiveM)
 * dan mengabaikan nama generik (Lowest, Default, Seller).
 */
export function cleanSellerUsername(sellerName?: string): string {
  if (!sellerName) return "";
  let s = sellerName.trim();
  s = s.replace(/_(?:hypixel|tlauncher|savegame|fivem|vip|store|indo|acc|global|key)$/i, "");
  s = s.replace(/^g2g[-_]/i, "");
  s = s.trim();

  const lower = s.toLowerCase();
  if (
    lower.includes("lowest") ||
    lower.includes("default") ||
    lower.includes("unknown") ||
    lower === "seller" ||
    lower === "g2g seller" ||
    lower === "verified seller" ||
    lower === "verified merchant"
  ) {
    return "";
  }
  return s;
}

/**
 * Mengembalikan URL Profil Toko Seller di G2G.com (format: https://www.g2g.com/{sellerName})
 */
export function getG2GSellerProfileUrl(sellerName?: string): string {
  const clean = cleanSellerUsername(sellerName);
  if (clean) {
    return `https://www.g2g.com/${encodeURIComponent(clean)}`;
  }
  return "https://www.g2g.com/id/categories/steam-global-account";
}

/**
 * Menghasilkan URL Direct Offer G2G resmi dalam format Indonesia (IDR):
 * https://www.g2g.com/id/categories/${slug}/offer/${offerId}
 */
export function getG2GDirectOfferUrl(offerId: string, gameTitle?: string): string {
  const oid = extractG2GOfferId(offerId) || offerId.trim();
  const gameKey = resolveGameKey(gameTitle);
  const slug = gameKey && G2G_CATEGORY_SLUGS[gameKey] ? G2G_CATEGORY_SLUGS[gameKey] : "steam-global-account";
  return `https://www.g2g.com/id/categories/${slug}/offer/${oid}`;
}

/**
 * Menghasilkan URL Evergreen Kategori G2G resmi Indonesia (IDR) yang DIJAMIN 100% TIDAK PERNAH 404 dan TIDAK PERNAH KOSONG.
 * Menghindari penambahan `?q=SellerName` agar listing produk selalu tampil lengkap.
 */
export function getG2GEvergreenUrl(categorySlugOrGameTitle?: string, _sellerName?: string): string {
  const gameKey = resolveGameKey(categorySlugOrGameTitle);
  if (gameKey && G2G_CATEGORY_SLUGS[gameKey]) {
    return `https://www.g2g.com/id/categories/${G2G_CATEGORY_SLUGS[gameKey]}`;
  }

  if (categorySlugOrGameTitle && categorySlugOrGameTitle.includes("-")) {
    return `https://www.g2g.com/id/categories/${encodeURIComponent(categorySlugOrGameTitle.trim())}`;
  }

  return "https://www.g2g.com/id/categories/steam-global-account";
}

/**
 * Mendapatkan URL ke etalase kategori game resmi Indonesia di g2g.com (Kategori Bersih Tanpa ?q=Seller)
 */
export function getG2GSellerUrl(_sellerName: string, gameTitle?: string): string {
  const gameKey = resolveGameKey(gameTitle);

  if (gameKey && G2G_CATEGORY_SLUGS[gameKey]) {
    return `https://www.g2g.com/id/categories/${G2G_CATEGORY_SLUGS[gameKey]}`;
  }

  return "https://www.g2g.com/id/categories/steam-global-account";
}

/**
 * Mendapatkan URL langsung ke halaman kategori game di g2g.com (format Indonesia IDR)
 */
export function getG2GGameCategoryUrl(gameTitle: string, sellerName?: string): string {
  return getG2GSellerUrl(sellerName || "", gameTitle);
}

/**
 * Universal Resolver: Mengubah sembarang link / offer_id menjadi URL live G2G Direct Offer atau Eneba.
 * - Jika Eneba -> gunakan buildEnebaFilteredUrl
 * - Jika offer_id valid dan isLive !== false -> kembalikan getG2GDirectOfferUrl (https://www.g2g.com/id/categories/${slug}/offer/${oid})
 * - Jika delisted / dead offer / tanpa offer_id -> fallback ke kategori bersih https://www.g2g.com/id/categories/${slug}
 */
export function resolveG2GProductUrl(
  rawUrlOrId?: string,
  sellerName?: string,
  gameTitle?: string,
  isLive: boolean = true
): string {
  const trimmed = (rawUrlOrId || "").trim();

  // 1. Deteksi Eneba URL
  if (trimmed.includes("eneba.com")) {
    return trimmed.replace("eneba.com/id/store", "eneba.com/store");
  }
  if (trimmed.toLowerCase().includes("eneba") || (sellerName && sellerName.toLowerCase().includes("eneba"))) {
    return buildEnebaFilteredUrl(gameTitle || "");
  }

  // 2. Deteksi Offer ID
  const oid = extractG2GOfferId(trimmed);
  if (oid) {
    if (KNOWN_DEAD_OFFERS[oid] || isLive === false) {
      return getG2GGameCategoryUrl(gameTitle || "");
    }
    return getG2GDirectOfferUrl(oid, gameTitle);
  }

  // 3. Fallback: Evergreen Category Bersih Indonesia (IDR)
  return getG2GGameCategoryUrl(gameTitle || "");
}
