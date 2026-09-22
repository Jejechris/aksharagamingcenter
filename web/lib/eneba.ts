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
    defaultUrl: "https://www.eneba.com/id/steam-terraria-steam-key-global",
    searchSlug: "terraria",
    estimatedPriceIdr: 42000,
  },
  stardew: {
    title: "Stardew Valley",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-stardew-valley-steam-key-global",
    searchSlug: "stardew-valley",
    estimatedPriceIdr: 58000,
  },
  "hollow knight": {
    title: "Hollow Knight",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-hollow-knight-steam-key-global",
    searchSlug: "hollow-knight",
    estimatedPriceIdr: 49000,
  },
  "dont starve": {
    title: "Don't Starve Together",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-don-t-starve-together-steam-key-global",
    searchSlug: "dont-starve-together",
    estimatedPriceIdr: 35000,
  },
  "project zomboid": {
    title: "Project Zomboid",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-project-zomboid-steam-key-global",
    searchSlug: "project-zomboid",
    estimatedPriceIdr: 72000,
  },
  "witcher 3": {
    title: "The Witcher 3: Wild Hunt Complete Edition",
    platform: "GOG / Steam",
    keyType: "GOG Key (Global)",
    defaultUrl: "https://www.eneba.com/id/gog-the-witcher-3-wild-hunt-game-of-the-year-edition-gog-key-global",
    searchSlug: "witcher-3-wild-hunt",
    estimatedPriceIdr: 68000,
  },
  cyberpunk: {
    title: "Cyberpunk 2077",
    platform: "GOG / Steam",
    keyType: "GOG Key (Global)",
    defaultUrl: "https://www.eneba.com/id/gog-cyberpunk-2077-gog-key-global",
    searchSlug: "cyberpunk-2077",
    estimatedPriceIdr: 245000,
  },
  minecraft: {
    title: "Minecraft: Java & Bedrock Edition",
    platform: "PC / Microsoft",
    keyType: "Xbox Live / Microsoft Key (Global)",
    defaultUrl: "https://www.eneba.com/id/xbox-minecraft-java-bedrock-edition-pc-xbox-live-key-global",
    searchSlug: "minecraft-java-bedrock",
    estimatedPriceIdr: 198000,
  },
  "gta v": {
    title: "Grand Theft Auto V: Premium Edition",
    platform: "Rockstar Games",
    keyType: "Rockstar Key (Global)",
    defaultUrl: "https://www.eneba.com/id/rockstar-grand-theft-auto-v-premium-online-edition-rockstar-games-launcher-key-global",
    searchSlug: "gta-v-premium",
    estimatedPriceIdr: 155000,
  },
  rdr2: {
    title: "Red Dead Redemption 2",
    platform: "Rockstar Games",
    keyType: "Rockstar Key (Global)",
    defaultUrl: "https://www.eneba.com/id/rockstar-red-dead-redemption-2-rockstar-games-launcher-key-global",
    searchSlug: "red-dead-redemption-2",
    estimatedPriceIdr: 185000,
  },
  "lethal company": {
    title: "Lethal Company",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-lethal-company-steam-key-global",
    searchSlug: "lethal-company",
    estimatedPriceIdr: 45000,
  },
  phasmophobia: {
    title: "Phasmophobia",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-phasmophobia-steam-key-global",
    searchSlug: "phasmophobia",
    estimatedPriceIdr: 55000,
  },
  palworld: {
    title: "Palworld",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-palworld-steam-key-global",
    searchSlug: "palworld",
    estimatedPriceIdr: 125000,
  },
  "elden ring": {
    title: "Elden Ring",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-elden-ring-steam-key-global",
    searchSlug: "elden-ring",
    estimatedPriceIdr: 385000,
  },
  "fc 25": {
    title: "EA SPORTS FC 25 Standard Edition",
    platform: "EA App / PC",
    keyType: "EA App Key (Global)",
    defaultUrl: "https://www.eneba.com/id/ea-app-ea-sports-fc-25-standard-edition-ea-app-key-global",
    searchSlug: "fc-25",
    estimatedPriceIdr: 165000,
  },
  "euro truck": {
    title: "Euro Truck Simulator 2",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-euro-truck-simulator-2-steam-key-global",
    searchSlug: "euro-truck-simulator-2",
    estimatedPriceIdr: 39000,
  },
  "assetto corsa": {
    title: "Assetto Corsa",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-assetto-corsa-steam-key-global",
    searchSlug: "assetto-corsa",
    estimatedPriceIdr: 34000,
  },
  "left 4 dead 2": {
    title: "Left 4 Dead 2",
    platform: "Steam",
    keyType: "Steam Key (Global)",
    defaultUrl: "https://www.eneba.com/id/steam-left-4-dead-2-steam-key-global",
    searchSlug: "left-4-dead-2",
    estimatedPriceIdr: 29000,
  }
};

/**
 * Mendapatkan URL pencarian langsung Eneba untuk judul game tertentu
 */
export function getEnebaSearchUrl(gameTitle: string): string {
  if (!gameTitle) return "https://www.eneba.com/id/store/all";
  const clean = gameTitle
    .replace(/[:&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `https://www.eneba.com/id/store/all?text=${encodeURIComponent(clean)}`;
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
