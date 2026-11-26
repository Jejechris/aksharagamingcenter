/**
 * Resolver artwork resmi ringan untuk etalase publik Storefront (`claim-web`).
 * Menggunakan URL kurasi resmi & Steam Store CDN (dengan memory cache agar cepat).
 */

const CURATED_GAME_ARTWORK: Record<string, string> = {
  minecraft:
    "https://store-images.s-microsoft.com/image/apps.54465.14492077886571533.be42f4bd-887b-4430-8ed0-622341b4d2b0.5054cf02-8b0f-47e2-9d15-7ddc81f63638",
  wukong: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/header.jpg",
  "project zomboid":
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/108600/header.jpg",
  "grand theft auto":
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg",
  "gta v": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg",
  terraria: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg",
  "red dead": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg",
  "fc 25": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2669320/header.jpg",
  "fc 26": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2669320/header.jpg",
  "tf2": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/440/header.jpg",
  "mann co": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/440/header.jpg",
};

const steamCache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function cleanQuery(title: string): string {
  return title
    .replace(/\(.*?\)/g, "")
    .replace(/account|full access|edition|enhanced|standard|global|key|crate|original/gi, "")
    .replace(/[:•\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolvePublicArtworkUrl(title: string): Promise<string> {
  const lower = (title || "").toLowerCase();
  for (const [needle, url] of Object.entries(CURATED_GAME_ARTWORK)) {
    if (lower.includes(needle)) return url;
  }

  const key = cleanQuery(lower) || lower;
  const cached = steamCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.url;
  }

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(key)}&l=english&cc=US`,
      { signal: AbortSignal.timeout(1600) }
    );
    if (!res.ok) return "";
    const json = await res.json();
    const first = Array.isArray(json?.items) ? json.items[0] : null;
    const appId = first?.id;
    const url = appId
      ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
      : String(first?.tiny_image || "");
    steamCache.set(key, { url, ts: Date.now() });
    return url;
  } catch {
    return "";
  }
}
