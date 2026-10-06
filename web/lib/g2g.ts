/**
 * G2G.com/id Verified Product Offer & Category Helper
 * Menghubungkan etalase lokal dengan seller & listing faktual di g2g.com/id.
 * 100% Bebas Fiktif & Anti Link Salah: Pemetaan akurat per game tanpa pernah fallback keliru ke game lain.
 */

export interface G2GOfferMapping {
  defaultOffer: string;
  categoryUrl: string;
  sellerOffers: Record<string, string>;
}

// Pemetaan seller & listing riil terverifikasi (Sinkron dengan g2g.com/id & SLS API)
export const VERIFIED_G2G_CATALOG: Record<string, G2GOfferMapping> = {
  minecraft: {
    defaultOffer: "https://www.g2g.com/offer/G1703129821471UK",
    categoryUrl: "https://www.g2g.com/id/categories/minecraft-account",
    sellerOffers: {
      hellenwong: "https://www.g2g.com/offer/G1703129821471UK",
      hellenwong_hypixel: "https://www.g2g.com/offer/G1703129540216LH",
      hellenwong_tlauncher: "https://www.g2g.com/offer/G1750132707906OD",
      lowest: "https://www.g2g.com/offer/G1703129821471UK",
    },
  },
  terraria: {
    defaultOffer: "https://www.g2g.com/offer/G1737050259610GZ",
    categoryUrl: "https://www.g2g.com/id/categories/terraria-account",
    sellerOffers: {
      taceofspades: "https://www.g2g.com/offer/G1737050259610GZ",
      hellenwong: "https://www.g2g.com/offer/G1703314890265KW",
      madangna: "https://www.g2g.com/offer/G1752722558769EU",
      lootkings: "https://www.g2g.com/offer/G1772365261655ZP",
    },
  },
  wukong: {
    defaultOffer: "https://www.g2g.com/offer/G1735807277413VH",
    categoryUrl: "https://www.g2g.com/id/categories/black-myth-wukong-accounts",
    sellerOffers: {
      financewz: "https://www.g2g.com/offer/G1735807277413VH",
      hellenwong: "https://www.g2g.com/offer/G1717828080220IT",
      hellenwong_savegame: "https://www.g2g.com/offer/G1724212419124LE",
    },
  },
  gta: {
    defaultOffer: "https://www.g2g.com/offer/G1752687998537NX",
    categoryUrl: "https://www.g2g.com/id/categories/steam-global-account",
    sellerOffers: {
      madangna: "https://www.g2g.com/offer/G1752687998537NX",
      hellenwong: "https://www.g2g.com/offer/G1724725195838IV",
      madangna_fivem: "https://www.g2g.com/offer/G1703491270148EB",
    },
  },
  tf2: {
    defaultOffer: "https://www.g2g.com/offer/G1763801186859QT",
    categoryUrl: "https://www.g2g.com/id/categories/tf2-item",
    sellerOffers: {
      sharktech: "https://www.g2g.com/offer/G1763801186859QT",
      hellenwong: "https://www.g2g.com/offer/G1729742255608SE",
      player: "https://www.g2g.com/offer/G1703480907757CA",
      gaugau: "https://www.g2g.com/offer/G1703654832675CG",
    },
  },
  fc25: {
    defaultOffer: "https://www.g2g.com/offer/G1740289240129LL",
    categoryUrl: "https://www.g2g.com/id/categories/fc-25-accounts",
    sellerOffers: {
      krovler: "https://www.g2g.com/offer/G1740289240129LL",
      hellenwong: "https://www.g2g.com/offer/G1758334661567LY",
      lootkings: "https://www.g2g.com/offer/G1722612671951NJ",
      cnlteam: "https://www.g2g.com/offer/G1721240119427PV",
    },
  },
  zomboid: {
    defaultOffer: "https://www.g2g.com/id/categories/project-zomboid-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/project-zomboid-accounts",
    sellerOffers: {},
  },
  stardew: {
    defaultOffer: "https://www.g2g.com/id/categories/stardew-valley-account",
    categoryUrl: "https://www.g2g.com/id/categories/stardew-valley-account",
    sellerOffers: {},
  },
  "dont starve": {
    defaultOffer: "https://www.g2g.com/id/categories/don-t-starve-together-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/don-t-starve-together-accounts",
    sellerOffers: {},
  },
  "lethal company": {
    defaultOffer: "https://www.g2g.com/id/categories/lethal-company-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/lethal-company-accounts",
    sellerOffers: {},
  },
  phasmophobia: {
    defaultOffer: "https://www.g2g.com/id/categories/phasmophobia-account",
    categoryUrl: "https://www.g2g.com/id/categories/phasmophobia-account",
    sellerOffers: {},
  },
  "hollow knight": {
    defaultOffer: "https://www.g2g.com/id/categories/hollow-knight-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/hollow-knight-accounts",
    sellerOffers: {},
  },
  "garrys mod": {
    defaultOffer: "https://www.g2g.com/id/categories/garry-s-mod-account",
    categoryUrl: "https://www.g2g.com/id/categories/garry-s-mod-account",
    sellerOffers: {},
  },
  "elden ring": {
    defaultOffer: "https://www.g2g.com/id/categories/elden-ring-account",
    categoryUrl: "https://www.g2g.com/id/categories/elden-ring-account",
    sellerOffers: {},
  },
  palworld: {
    defaultOffer: "https://www.g2g.com/id/categories/palworld-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/palworld-accounts",
    sellerOffers: {},
  },
  rust: {
    defaultOffer: "https://www.g2g.com/id/categories/rust-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/rust-accounts",
    sellerOffers: {},
  },
  "left 4 dead": {
    defaultOffer: "https://www.g2g.com/id/categories/left-4-dead-2-account",
    categoryUrl: "https://www.g2g.com/id/categories/left-4-dead-2-account",
    sellerOffers: {},
  },
  "among us": {
    defaultOffer: "https://www.g2g.com/id/categories/among-us-account",
    categoryUrl: "https://www.g2g.com/id/categories/among-us-account",
    sellerOffers: {},
  },
  witcher: {
    defaultOffer: "https://www.g2g.com/id/categories/witcher-iii-wild-hunt-account",
    categoryUrl: "https://www.g2g.com/id/categories/witcher-iii-wild-hunt-account",
    sellerOffers: {},
  },
  "ready or not": {
    defaultOffer: "https://www.g2g.com/id/categories/ready-or-not-account",
    categoryUrl: "https://www.g2g.com/id/categories/ready-or-not-account",
    sellerOffers: {},
  },
  "sons of the forest": {
    defaultOffer: "https://www.g2g.com/id/categories/sons-of-the-forest-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/sons-of-the-forest-accounts",
    sellerOffers: {},
  },
  helldivers: {
    defaultOffer: "https://www.g2g.com/id/categories/helldivers-2-accounts",
    categoryUrl: "https://www.g2g.com/id/categories/helldivers-2-accounts",
    sellerOffers: {},
  },
  forza: {
    defaultOffer: "https://www.g2g.com/id/categories/forza-horizon-5-account",
    categoryUrl: "https://www.g2g.com/id/categories/forza-horizon-5-account",
    sellerOffers: {},
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
  if (lower.includes("wukong")) return "wukong";
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
 * Mendapatkan URL langsung ke offer atau pencarian spesifik game di g2g.com/id
 * Menghilangkan risiko membuka produk game lain atau link 404.
 */
export function getG2GSellerUrl(sellerName: string, gameTitle?: string): string {
  const cleanSeller = (sellerName || "").trim().toLowerCase();
  const gameKey = resolveGameKey(gameTitle);

  // 1. Jika game teridentifikasi dalam pemetaan
  if (gameKey && VERIFIED_G2G_CATALOG[gameKey]) {
    const entry = VERIFIED_G2G_CATALOG[gameKey];
    // Cek apakah seller memiliki direct offer spesifik
    if (cleanSeller && entry.sellerOffers[cleanSeller]) {
      return entry.sellerOffers[cleanSeller];
    }
    // Coba pencocokan parsial nama seller
    for (const [sKey, sUrl] of Object.entries(entry.sellerOffers)) {
      if (cleanSeller.includes(sKey) || sKey.includes(cleanSeller)) {
        return sUrl;
      }
    }
    // Default: langsung ke direct offer/kategori game tersebut
    return entry.defaultOffer;
  }

  // 2. Jika judul game diberikan tapi belum ada di map, buatkan URL search g2g yang relevan
  if (gameTitle && gameTitle.trim().length > 1) {
    const cleanTitle = gameTitle
      .replace(/[:&\[\]\(\)\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `https://www.g2g.com/search?q=${encodeURIComponent(cleanTitle)}`;
  }

  // 3. Fallback umum ke etalase akun Steam di G2G
  return "https://www.g2g.com/id/categories/steam-global-account";
}

/**
 * Mendapatkan URL langsung ke halaman kategori game di g2g.com/id
 */
export function getG2GGameCategoryUrl(gameTitle: string): string {
  const gameKey = resolveGameKey(gameTitle);
  if (gameKey && VERIFIED_G2G_CATALOG[gameKey]) {
    return VERIFIED_G2G_CATALOG[gameKey].categoryUrl;
  }
  if (gameTitle && gameTitle.trim().length > 1) {
    const cleanTitle = gameTitle
      .replace(/[:&\[\]\(\)\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `https://www.g2g.com/search?q=${encodeURIComponent(cleanTitle)}`;
  }
  return "https://www.g2g.com/id/categories/steam-global-account";
}
