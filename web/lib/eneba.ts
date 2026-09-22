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
    defaultUrl: "https://www.eneba.com/store/all?text=terraria",
    searchSlug: "terraria",
    estimatedPriceIdr: 49000,
  },
  stardew: {
    title: "Stardew Valley",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=stardew+valley",
    searchSlug: "stardew-valley",
    estimatedPriceIdr: 395000,
  },
  "hollow knight": {
    title: "Hollow Knight",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=hollow+knight",
    searchSlug: "hollow-knight",
    estimatedPriceIdr: 148000,
  },
  "dont starve": {
    title: "Don't Starve Together",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=don-t-starve-together",
    searchSlug: "dont-starve-together",
    estimatedPriceIdr: 85000,
  },
  "project zomboid": {
    title: "Project Zomboid",
    platform: "Steam",
    keyType: "Steam Key / Gift (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=project+zomboid",
    searchSlug: "project-zomboid",
    estimatedPriceIdr: 118000,
  },
  "witcher 3": {
    title: "The Witcher 3: Wild Hunt Complete Edition",
    platform: "GOG / Steam",
    keyType: "GOG Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=witcher+3",
    searchSlug: "witcher-3-wild-hunt",
    estimatedPriceIdr: 365000,
  },
  cyberpunk: {
    title: "Cyberpunk 2077",
    platform: "GOG / Steam",
    keyType: "GOG Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=cyberpunk+2077",
    searchSlug: "cyberpunk-2077",
    estimatedPriceIdr: 325000,
  },
  minecraft: {
    title: "Minecraft: Java & Bedrock Edition",
    platform: "PC / Microsoft",
    keyType: "Xbox Live / Microsoft Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=minecraft+java+bedrock",
    searchSlug: "minecraft-java-bedrock",
    estimatedPriceIdr: 315000,
  },
  "gta v": {
    title: "Grand Theft Auto V: Premium Edition",
    platform: "Rockstar Games",
    keyType: "Rockstar Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=grand+theft+auto+v",
    searchSlug: "gta-v-premium",
    estimatedPriceIdr: 235000,
  },
  rdr2: {
    title: "Red Dead Redemption 2",
    platform: "Rockstar Games",
    keyType: "Rockstar Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=red+dead+redemption+2",
    searchSlug: "red-dead-redemption-2",
    estimatedPriceIdr: 255000,
  },
  "lethal company": {
    title: "Lethal Company",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=lethal+company",
    searchSlug: "lethal-company",
    estimatedPriceIdr: 125000,
  },
  phasmophobia: {
    title: "Phasmophobia",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=phasmophobia",
    searchSlug: "phasmophobia",
    estimatedPriceIdr: 215000,
  },
  palworld: {
    title: "Palworld",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=palworld",
    searchSlug: "palworld",
    estimatedPriceIdr: 425000,
  },
  "elden ring": {
    title: "Elden Ring",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=elden+ring",
    searchSlug: "elden-ring",
    estimatedPriceIdr: 785000,
  },
  "fc 25": {
    title: "EA SPORTS FC 25 Standard Edition",
    platform: "EA App / PC",
    keyType: "EA App Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=fc+25",
    searchSlug: "fc-25",
    estimatedPriceIdr: 665000,
  },
  "euro truck": {
    title: "Euro Truck Simulator 2",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=euro+truck+simulator+2",
    searchSlug: "euro-truck-simulator-2",
    estimatedPriceIdr: 195000,
  },
  "assetto corsa": {
    title: "Assetto Corsa",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=assetto+corsa",
    searchSlug: "assetto-corsa",
    estimatedPriceIdr: 75000,
  },
  "left 4 dead 2": {
    title: "Left 4 Dead 2",
    platform: "Steam",
    keyType: "Steam Key / Gift (Global)",
    defaultUrl: "https://www.eneba.com/store/all?text=left+4+dead+2",
    searchSlug: "left-4-dead-2",
    estimatedPriceIdr: 125000,
  }
};

/**
 * Mendapatkan URL pencarian langsung Eneba untuk judul game tertentu.
 * Format ini 100% aman (tidak pernah 404) dan langsung menampilkan perbandingan harga semua merchant Eneba.
 */
export function getEnebaSearchUrl(gameTitle: string): string {
  if (!gameTitle) return "https://www.eneba.com/store/all";
  const clean = gameTitle
    .replace(/[:&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `https://www.eneba.com/store/all?text=${encodeURIComponent(clean)}`;
}

/**
 * Mendapatkan URL listing langsung produk di Eneba
 */
export function getEnebaProductUrl(gameTitle: string): string {
  const lower = (gameTitle || "").toLowerCase();
  const matched = Object.entries(VERIFIED_ENEBA_CATALOG).find(([key]) => lower.includes(key));
  if (matched) {
    return matched[1].defaultUrl;
  }
  return getEnebaSearchUrl(gameTitle);
}
