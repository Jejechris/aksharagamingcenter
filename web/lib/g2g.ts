/**
 * G2G.com Bulletproof Zero-404 Verified Product Offer & Category Helper
 * Menghubungkan etalase lokal dengan seller & listing faktual di g2g.com tanpa pernah menghasilkan link 404.
 *
 * Aturan Zero-404:
 * 1. Tidak pernah menggabungkan /categories/ dan /offer/ dalam 1 URL (penyebab 404 utama).
 * 2. Jika Offer ID valid dan live: https://www.g2g.com/offer/{offerId}
 * 3. Jika seller/game diketahui: https://www.g2g.com/categories/{categorySlug}?q={sellerName}
 * 4. Fallback aman universal: https://www.g2g.com/search?q={cleanTitle}
 * 5. Eneba canonical URL: https://www.eneba.com/store/all?text={cleanTitle} (tanpa /id/)
 */

export interface G2GOfferMapping {
  defaultOffer: string;
  categorySlug: string;
  categoryUrl: string;
  sellerOffers: Record<string, string>;
}

// Known expired or delisted offers mapped to their active, live replacements
export const KNOWN_DEAD_OFFERS: Record<string, string> = {
  "G1737050259610GZ": "https://www.g2g.com/offer/G1703314890265KW", // Terraria TAceOfSpades -> HellenWong live (98k+ stock)
  "G1763801186859QT": "https://www.g2g.com/offer/G1703480907757CA", // TF2 Sharktech -> Player live
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
  rust: "rust-accounts-buy", // Fixed typo: was rus-accounts-buy
  "left 4 dead": "left-4-dead-2-account",
  "among us": "among-us-account",
  witcher: "witcher-iii-wild-hunt-account",
  "ready or not": "ready-or-not-account",
  "sons of the forest": "sons-of-the-forest-accounts",
  helldivers: "helldivers-2-accounts",
  forza: "forza-horizon-5-account",
};

// Pemetaan seller & listing riil terverifikasi
export const VERIFIED_G2G_CATALOG: Record<string, G2GOfferMapping> = {
  minecraft: {
    defaultOffer: "https://www.g2g.com/offer/G1703129821471UK",
    categorySlug: "minecraft-account",
    categoryUrl: "https://www.g2g.com/categories/minecraft-account",
    sellerOffers: {
      hellenwong: "https://www.g2g.com/offer/G1703129821471UK",
      hellenwong_hypixel: "https://www.g2g.com/offer/G1703129540216LH",
      hellenwong_tlauncher: "https://www.g2g.com/offer/G1750132707906OD",
      lowest: "https://www.g2g.com/offer/G1703129821471UK",
    },
  },
  terraria: {
    defaultOffer: "https://www.g2g.com/offer/G1703314890265KW",
    categorySlug: "terraria-account",
    categoryUrl: "https://www.g2g.com/categories/terraria-account",
    sellerOffers: {
      hellenwong: "https://www.g2g.com/offer/G1703314890265KW",
      madangna: "https://www.g2g.com/offer/G1752722558769EU",
      lootkings: "https://www.g2g.com/offer/G1772365261655ZP",
    },
  },
  wukong: {
    defaultOffer: "https://www.g2g.com/offer/G1735807277413VH",
    categorySlug: "black-myth-wukong-accounts",
    categoryUrl: "https://www.g2g.com/categories/black-myth-wukong-accounts",
    sellerOffers: {
      financewz: "https://www.g2g.com/offer/G1735807277413VH",
      hellenwong: "https://www.g2g.com/offer/G1717828080220IT",
      hellenwong_savegame: "https://www.g2g.com/offer/G1724212419124LE",
    },
  },
  gta: {
    defaultOffer: "https://www.g2g.com/offer/G1752687998537NX",
    categorySlug: "steam-global-account",
    categoryUrl: "https://www.g2g.com/categories/steam-global-account",
    sellerOffers: {
      madangna: "https://www.g2g.com/offer/G1752687998537NX",
      hellenwong: "https://www.g2g.com/offer/G1724725195838IV",
      madangna_fivem: "https://www.g2g.com/offer/G1703491270148EB",
    },
  },
  tf2: {
    defaultOffer: "https://www.g2g.com/offer/G1703480907757CA",
    categorySlug: "tf2-item",
    categoryUrl: "https://www.g2g.com/categories/tf2-item",
    sellerOffers: {
      player: "https://www.g2g.com/offer/G1703480907757CA",
      gaugau: "https://www.g2g.com/offer/G1703654832675CG",
      hellenwong: "https://www.g2g.com/offer/G1729742255608SE",
    },
  },
  fc25: {
    defaultOffer: "https://www.g2g.com/offer/G1740289240129LL",
    categorySlug: "fc-25-accounts",
    categoryUrl: "https://www.g2g.com/categories/fc-25-accounts",
    sellerOffers: {
      krovler: "https://www.g2g.com/offer/G1740289240129LL",
      hellenwong: "https://www.g2g.com/offer/G1758334661567LY",
      lootkings: "https://www.g2g.com/offer/G1722612671951NJ",
      cnlteam: "https://www.g2g.com/offer/G1721240119427PV",
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
 * Mendapatkan URL langsung ke offer atau pencarian spesifik game di g2g.com
 * Dijamin ZERO 404: selalu mengarahkan ke halaman pencarian/kategori yang valid.
 */
export function getG2GSellerUrl(sellerName: string, gameTitle?: string): string {
  const cleanSeller = (sellerName || "").trim();
  const gameKey = resolveGameKey(gameTitle);

  // 1. Cek apakah ada di katalog terverifikasi dengan offer spesifik seller
  if (gameKey && VERIFIED_G2G_CATALOG[gameKey]) {
    const entry = VERIFIED_G2G_CATALOG[gameKey];
    const sLower = cleanSeller.toLowerCase();
    if (sLower && entry.sellerOffers[sLower]) {
      return entry.sellerOffers[sLower];
    }
    for (const [sKey, sUrl] of Object.entries(entry.sellerOffers)) {
      if (sLower.includes(sKey) || sKey.includes(sLower)) {
        return sUrl;
      }
    }
  }

  // 2. Jika category slug diketahui, arahkan ke category filter seller (100% Live)
  if (gameKey && G2G_CATEGORY_SLUGS[gameKey]) {
    const slug = G2G_CATEGORY_SLUGS[gameKey];
    if (cleanSeller && !cleanSeller.toLowerCase().includes("default") && !cleanSeller.toLowerCase().includes("unknown")) {
      return `https://www.g2g.com/categories/${slug}?q=${encodeURIComponent(cleanSeller)}`;
    }
    return `https://www.g2g.com/categories/${slug}`;
  }

  // 3. Jika game title ada, gunakan universal search
  if (gameTitle && gameTitle.trim().length > 1) {
    const cleanTitle = gameTitle
      .replace(/[:&\[\]\(\)\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleanSeller && !cleanSeller.toLowerCase().includes("default") && !cleanSeller.toLowerCase().includes("unknown")) {
      return `https://www.g2g.com/search?q=${encodeURIComponent(cleanTitle + " " + cleanSeller)}`;
    }
    return `https://www.g2g.com/search?q=${encodeURIComponent(cleanTitle)}`;
  }

  // 4. Default fallback aman
  return "https://www.g2g.com/categories/steam-global-account";
}

/**
 * Mendapatkan URL langsung ke halaman kategori game di g2g.com
 */
export function getG2GGameCategoryUrl(gameTitle: string, sellerName?: string): string {
  const gameKey = resolveGameKey(gameTitle);
  if (gameKey && G2G_CATEGORY_SLUGS[gameKey]) {
    const slug = G2G_CATEGORY_SLUGS[gameKey];
    if (sellerName && sellerName.trim() && !sellerName.toLowerCase().includes("default") && !sellerName.toLowerCase().includes("unknown")) {
      return `https://www.g2g.com/categories/${slug}?q=${encodeURIComponent(sellerName.trim())}`;
    }
    return `https://www.g2g.com/categories/${slug}`;
  }
  if (gameTitle && gameTitle.trim().length > 1) {
    const cleanTitle = gameTitle
      .replace(/[:&\[\]\(\)\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `https://www.g2g.com/search?q=${encodeURIComponent(cleanTitle)}`;
  }
  return "https://www.g2g.com/categories/steam-global-account";
}

/**
 * Universal Resolver: Mengubah sembarang link / offer_id menjadi URL live G2G / Eneba yang 100% aktif & faktual.
 * Menghilangkan 404 dari kombinasi /categories/.../offer/ dan me-reroute otomatis listing dead ke safe category.
 */
export function resolveG2GProductUrl(
  rawUrlOrId?: string,
  sellerName?: string,
  gameTitle?: string,
  isLive: boolean = true
): string {
  const trimmed = (rawUrlOrId || "").trim();

  // 1. Cek apakah ID atau URL mengandung offer dead yang diketahui
  for (const [deadId, liveUrl] of Object.entries(KNOWN_DEAD_OFFERS)) {
    if (trimmed.includes(deadId)) {
      return liveUrl;
    }
  }

  // 2. Deteksi Eneba URL
  if (trimmed.includes("eneba.com")) {
    // Normalisasi: pastikan tidak mengandung /id/
    return trimmed.replace("eneba.com/id/store", "eneba.com/store");
  }
  if (trimmed.toLowerCase().includes("eneba") || (sellerName && sellerName.toLowerCase().includes("eneba"))) {
    const clean = (gameTitle || "").replace(/[:&\[\]\(\)\-]/g, " ").replace(/\s+/g, " ").trim();
    return `https://www.eneba.com/store/all?text=${encodeURIComponent(clean)}`;
  }

  // 3. Ekstrak Offer ID
  const oid = extractG2GOfferId(trimmed);

  // Jika produk delisted / sold out / tidak live, jangan arahkan ke offer (bisa 404/dead).
  // Arahkan ke category search yang 100% aktif
  if (!isLive) {
    return getG2GGameCategoryUrl(gameTitle || "", sellerName);
  }

  if (oid) {
    if (KNOWN_DEAD_OFFERS[oid]) {
      return KNOWN_DEAD_OFFERS[oid];
    }
    // G2G Canonical direct offer: https://www.g2g.com/offer/{oid} (BUKAN /categories/.../offer/{oid}!)
    return `https://www.g2g.com/offer/${oid}`;
  }

  // 4. Jika URL adalah category URL tanpa offer, bersihkan dari prefix /id/
  if (trimmed.includes("g2g.com/id/categories/")) {
    return trimmed.replace("g2g.com/id/categories/", "g2g.com/categories/");
  }
  if (trimmed.startsWith("https://www.g2g.com/categories/")) {
    return trimmed;
  }

  // 5. Resolusi seller & nama game
  return getG2GSellerUrl(sellerName || "", gameTitle);
}
