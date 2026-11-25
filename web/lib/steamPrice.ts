/**
 * Steam Store Indonesia Real-Time Price Checker
 * Fetches official retail prices in IDR from the Steam Store API for Indonesia (cc=ID, l=indonesian).
 */

export interface RealSteamPriceResult {
  official_title: string;
  steam_app_id: number;
  price_idr: number | null;
}

export async function fetchRealSteamIndonesiaPrice(gameTitle: string): Promise<RealSteamPriceResult | null> {
  if (!gameTitle || !gameTitle.trim()) {
    return null;
  }

  const cleanTitle = gameTitle
    .replace(/[:&\[\]\(\)\-]/g, " ")
    .replace(/\b(steam|global|account|akun|key|cdkey|pc|edition|deluxe|bundle)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const term = cleanTitle || gameTitle.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=indonesian&cc=ID`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      const item = data.items[0];
      const official_title = item.name || gameTitle;
      const steam_app_id = item.id;
      // Steam API returns price in cents/sub-unit (e.g. 45000000 for Rp 450.000)
      const price_idr = item.price && typeof item.price.final === "number"
        ? Math.round(item.price.final / 100)
        : null;

      return {
        official_title,
        steam_app_id,
        price_idr,
      };
    }

    return null;
  } catch (err) {
    // Fail gracefully with null on network error, timeout, or abort
    return null;
  }
}
