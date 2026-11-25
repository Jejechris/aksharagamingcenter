/**
 * Steam Store Indonesia Real-Time Price Checker
 * Fetches official retail prices in IDR from the Steam Store API for Indonesia (cc=ID, l=indonesian).
 */

export interface RealSteamPriceResult {
  official_title: string;
  steam_app_id: number;
  price_idr: number | null;
  original_price_idr?: number | null;
  discount_percent?: number;
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
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=indonesian&cc=ID`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      const qLower = term.toLowerCase();
      // Prefer exact or base-game match with a non-zero price over free starter packs / skins / DLC
      const pricedItems = data.items.filter(
        (it: any) =>
          it.price &&
          typeof it.price.final === "number" &&
          it.price.final > 0 &&
          !/starter pack|skin|soundtrack|ost|upgrade|dlc|wallpaper|artbook/i.test(it.name || "")
      );
      const pool = pricedItems.length > 0 ? pricedItems : data.items;
      const item =
        pool.find((it: any) => (it.name || "").toLowerCase().trim() === qLower) ||
        pool.find((it: any) => (it.name || "").toLowerCase().includes(qLower)) ||
        pool[0];

      const official_title = item.name || gameTitle;
      const steam_app_id = item.id;
      const price_idr =
        item.price && typeof item.price.final === "number"
          ? Math.round(item.price.final / 100)
          : null;
      const original_price_idr =
        item.price && typeof item.price.initial === "number"
          ? Math.round(item.price.initial / 100)
          : price_idr;
      const discount_percent =
        original_price_idr && price_idr && original_price_idr > price_idr
          ? Math.round(((original_price_idr - price_idr) / original_price_idr) * 100)
          : 0;

      return {
        official_title,
        steam_app_id,
        price_idr,
        original_price_idr,
        discount_percent,
      };
    }

    return null;
  } catch {
    return null;
  }
}
