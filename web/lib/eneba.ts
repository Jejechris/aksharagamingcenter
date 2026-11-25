/**
 * Eneba Digital Key / CDKey / Redeem Code Helper
 * Menyediakan pemetaan listing resmi, URL pencarian, dan tautan langsung untuk kulakan Digital Key dari eneba.com.
 * Pembayaran Eneba di Indonesia mendukung QRIS, DANA, OVO, ShopeePay, dan Bank Transfer.
 */

export interface EnebaProductMapping {
  title: string;
  platform: string;
  keyType: string;
  defaultUrl: string;
  searchSlug: string;
  estimatedPriceIdr: number;
}

export const VERIFIED_ENEBA_CATALOG: Record<string, EnebaProductMapping> = {
  terraria: {
    title: "Terraria",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=terraria&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "terraria",
    estimatedPriceIdr: 49000,
  },
  stardew: {
    title: "Stardew Valley",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=stardew+valley&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "stardew-valley",
    estimatedPriceIdr: 95000,
  },
  "hollow knight": {
    title: "Hollow Knight",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=hollow+knight&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "hollow-knight",
    estimatedPriceIdr: 148000,
  },
  "dont starve": {
    title: "Don't Starve Together",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=don-t-starve-together&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "dont-starve-together",
    estimatedPriceIdr: 85000,
  },
  "project zomboid": {
    title: "Project Zomboid",
    platform: "Steam",
    keyType: "Steam Key / Gift (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=project+zomboid&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "project-zomboid",
    estimatedPriceIdr: 118000,
  },
  "witcher 3": {
    title: "The Witcher 3: Wild Hunt Complete Edition",
    platform: "GOG / Steam",
    keyType: "GOG Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=witcher+3&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "witcher-3-wild-hunt",
    estimatedPriceIdr: 365000,
  },
  cyberpunk: {
    title: "Cyberpunk 2077",
    platform: "GOG / Steam",
    keyType: "GOG Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=cyberpunk+2077&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "cyberpunk-2077",
    estimatedPriceIdr: 325000,
  },
  minecraft: {
    title: "Minecraft: Java & Bedrock Edition",
    platform: "PC / Microsoft",
    keyType: "Xbox Live / Microsoft Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=minecraft+java+bedrock&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "minecraft-java-bedrock",
    estimatedPriceIdr: 315000,
  },
  "gta v": {
    title: "Grand Theft Auto V: Premium Edition",
    platform: "Rockstar Games",
    keyType: "Rockstar Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=grand+theft+auto+v&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "gta-v-premium",
    estimatedPriceIdr: 235000,
  },
  rdr2: {
    title: "Red Dead Redemption 2",
    platform: "Rockstar Games",
    keyType: "Rockstar Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=red+dead+redemption+2&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "red-dead-redemption-2",
    estimatedPriceIdr: 255000,
  },
  "lethal company": {
    title: "Lethal Company",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=lethal+company&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "lethal-company",
    estimatedPriceIdr: 125000,
  },
  phasmophobia: {
    title: "Phasmophobia",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=phasmophobia&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "phasmophobia",
    estimatedPriceIdr: 215000,
  },
  palworld: {
    title: "Palworld",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=palworld&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "palworld",
    estimatedPriceIdr: 425000,
  },
  "elden ring": {
    title: "Elden Ring",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=elden+ring&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "elden-ring",
    estimatedPriceIdr: 785000,
  },
  "fc 25": {
    title: "EA SPORTS FC 25 Standard Edition",
    platform: "EA App / PC",
    keyType: "EA App Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=fc+25&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "fc-25",
    estimatedPriceIdr: 665000,
  },
  "euro truck": {
    title: "Euro Truck Simulator 2",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=euro+truck+simulator+2&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "euro-truck-simulator-2",
    estimatedPriceIdr: 195000,
  },
  "assetto corsa": {
    title: "Assetto Corsa",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=assetto+corsa&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "assetto-corsa",
    estimatedPriceIdr: 75000,
  },
  "left 4 dead 2": {
    title: "Left 4 Dead 2",
    platform: "Steam",
    keyType: "Steam Key / Gift (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=left+4+dead+2&regions[]=global&sortBy=PRICE_LOWEST",
    searchSlug: "left-4-dead-2",
    estimatedPriceIdr: 125000,
  }
};

/**
 * Filter options untuk pencarian Eneba
 */
export interface EnebaFilterOptions {
  region?: string;
  platform?: string;
  type?: string;
  sortBy?: string;
}

/**
 * Membangun URL Eneba terfilter rapi dengan parameter Region, Platform (DRM), Tipe Produk, dan Sorting.
 * Menggunakan slug resmi Eneba terverifikasi:
 * - steam -> drms[]=steam
 * - xbox / microsoft -> drms[]=xbox
 * - gog -> drms[]=gog
 * - epic -> drms[]=epic_games
 * - ea / origin -> drms[]=origin
 * - rockstar -> drms[]=rockstar_social_club
 * - psn / playstation -> drms[]=psn
 * - nintendo -> drms[]=nintendo
 */
export function buildEnebaFilteredUrl(gameTitle: string, options?: EnebaFilterOptions): string {
  const clean = (gameTitle || "")
    .replace(/[:&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const baseUrl = "https://www.eneba.com/store/all";
  const params: string[] = [];

  if (clean) {
    params.push(`text=${encodeURIComponent(clean)}`);
  }

  // Region mapping: global -> regions[]=global, asia -> regions[]=asia, indonesia -> regions[]=indonesia, europe -> regions[]=europe, us -> regions[]=united_states
  const regionRaw = (options?.region || "global").toLowerCase().trim();
  if (regionRaw && regionRaw !== "all" && regionRaw !== "semua" && regionRaw !== "semua region") {
    if (regionRaw === "global") params.push("regions[]=global");
    else if (regionRaw === "asia") params.push("regions[]=asia");
    else if (regionRaw === "indonesia" || regionRaw === "indo") params.push("regions[]=indonesia");
    else if (regionRaw === "europe" || regionRaw === "eu") params.push("regions[]=europe");
    else if (regionRaw === "us" || regionRaw === "united_states" || regionRaw === "usa") params.push("regions[]=united_states");
  }

  // Verified Platform (DRM) mapping - HANYA whitelist yang 100% cocok dengan Eneba
  const platRaw = (options?.platform || "").toLowerCase().trim();
  if (platRaw && platRaw !== "all" && platRaw !== "semua") {
    if (platRaw.includes("steam")) {
      params.push("drms[]=steam");
    } else if (platRaw.includes("xbox") || platRaw.includes("microsoft")) {
      params.push("drms[]=xbox");
    } else if (platRaw.includes("rockstar")) {
      params.push("drms[]=rockstar_social_club");
    } else if (platRaw.includes("gog")) {
      params.push("drms[]=gog");
    } else if (platRaw.includes("ea") || platRaw.includes("origin")) {
      params.push("drms[]=origin");
    } else if (platRaw.includes("epic")) {
      params.push("drms[]=epic_games");
    } else if (platRaw.includes("nintendo") || platRaw.includes("switch")) {
      params.push("drms[]=nintendo");
    } else if (platRaw.includes("playstation") || platRaw.includes("psn") || platRaw.includes("ps5")) {
      params.push("drms[]=psn");
    }
  }

  // types[] HANYA ditambahkan jika diminta secara spesifik (jangan dipaksa 'game' agar tidak membatasi listing bundle/editions)
  const typeRaw = (options?.type || "").toLowerCase().trim();
  if (typeRaw && typeRaw !== "all" && typeRaw !== "semua") {
    params.push(`types[]=${encodeURIComponent(typeRaw)}`);
  }

  // Default sortBy=PRICE_LOWEST
  const sort = options?.sortBy || "PRICE_LOWEST";
  params.push(`sortBy=${encodeURIComponent(sort)}`);

  return `${baseUrl}?${params.join("&")}`;
}

/**
 * Mendapatkan URL pencarian langsung Eneba untuk judul game tertentu.
 */
export function getEnebaSearchUrl(gameTitle: string, options?: EnebaFilterOptions): string {
  return buildEnebaFilteredUrl(gameTitle, {
    region: options?.region || "global",
    platform: options?.platform,
    type: options?.type,
    sortBy: options?.sortBy || "PRICE_LOWEST",
  });
}

/**
 * Mendapatkan URL listing langsung produk di Eneba dengan filter otomatis
 */
export function getEnebaProductUrl(gameTitle: string, options?: EnebaFilterOptions): string {
  const lower = (gameTitle || "").toLowerCase();
  const matched = Object.entries(VERIFIED_ENEBA_CATALOG).find(([key]) => lower.includes(key));
  const detectedPlatform = options?.platform || (matched ? matched[1].platform : undefined);

  return buildEnebaFilteredUrl(gameTitle, {
    region: options?.region || "global",
    platform: detectedPlatform,
    type: options?.type,
    sortBy: options?.sortBy || "PRICE_LOWEST",
  });
}
