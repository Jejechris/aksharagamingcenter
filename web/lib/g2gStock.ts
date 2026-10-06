/**
 * G2G Live Stock & SLS API Real-Time Synchronization Engine
 * Langsung terhubung ke endpoint resmi G2G SLS (Service Layer Service) di https://sls.g2g.com/offer/{offer_id}
 * 100% Real, Faktual, dan Live Time tanpa data fiktif atau perkiraan.
 */

export interface G2GLiveOfferResult {
  offer_id: string;
  product_url: string;
  seller_name: string;
  status: "live" | "delisted" | "sold_out" | "unknown";
  is_sold_out: boolean;
  available_qty: number;
  actual_qty: number;
  price_usd: number;
  is_online: boolean;
  rating_pct: number;
  success_orders: number;
  total_rating: number;
  synced_at: string;
  error?: string;
}

export interface G2GAuditLogItem {
  game_title: string;
  seller_name: string;
  offer_id: string;
  product_url: string;
  previous_stock: number;
  live_stock: number;
  is_online: boolean;
  status: string;
  health: "CRITICAL" | "WARNING" | "SAFE";
}

/**
 * Mengekstrak ID Offer G2G (format: G dilanjutkan angka dan karakter alfanumerik)
 * Contoh URL: https://www.g2g.com/id/categories/minecraft-account/offer/G1703129821471UK
 * Hasil: G1703129821471UK
 */
export function extractG2GOfferId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^G\d+[A-Z0-9]+$/i.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/offer\/(G\d+[A-Z0-9]+)/i);
  return match ? match[1] : null;
}

/**
 * Mengambil data offer real-time langsung dari server SLS G2G
 */
export async function fetchG2GLiveOffer(offerIdOrUrl: string): Promise<G2GLiveOfferResult> {
  const offerId = extractG2GOfferId(offerIdOrUrl);
  const now = new Date().toISOString();

  const productUrl = offerId ? `https://www.g2g.com/offer/${offerId}` : (offerIdOrUrl || "");

  if (!offerId) {
    return {
      offer_id: offerIdOrUrl,
      product_url: productUrl,
      seller_name: "Unknown",
      status: "unknown",
      is_sold_out: true,
      available_qty: 0,
      actual_qty: 0,
      price_usd: 0,
      is_online: false,
      rating_pct: 0,
      success_orders: 0,
      total_rating: 0,
      synced_at: now,
      error: "Invalid offer ID format",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`https://sls.g2g.com/offer/${offerId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.g2g.com/",
        Origin: "https://www.g2g.com",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        offer_id: offerId,
        product_url: productUrl,
        seller_name: "Unknown",
        status: "unknown",
        is_sold_out: true,
        available_qty: 0,
        actual_qty: 0,
        price_usd: 0,
        is_online: false,
        rating_pct: 0,
        success_orders: 0,
        total_rating: 0,
        synced_at: now,
        error: `HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    const payload = json.payload;

    if (!payload) {
      return {
        offer_id: offerId,
        product_url: productUrl,
        seller_name: "Unknown",
        status: "unknown",
        is_sold_out: true,
        available_qty: 0,
        actual_qty: 0,
        price_usd: 0,
        is_online: false,
        rating_pct: 0,
        success_orders: 0,
        total_rating: 0,
        synced_at: now,
        error: json.messages || "Empty payload from G2G SLS",
      };
    }

    const availableQty = Number(payload.available_qty ?? 0);
    const actualQty = Number(payload.actual_qty ?? 0);
    const isSoldOut = Boolean(payload.is_sold_out || availableQty === 0 || payload.status !== "live");
    const status = payload.status === "live" ? (isSoldOut ? "sold_out" : "live") : "delisted";

    return {
      offer_id: payload.offer_id || offerId,
      product_url: `https://www.g2g.com/offer/${payload.offer_id || offerId}`,
      seller_name: payload.username || "G2G Seller",
      status,
      is_sold_out: isSoldOut,
      available_qty: availableQty,
      actual_qty: actualQty,
      price_usd: Number(payload.unit_price_in_usd ?? 0),
      is_online: Boolean(payload.is_online),
      rating_pct: Math.round((Number(payload.satisfaction_rate) || 0) * 1000) / 10,
      success_orders: Number(payload.total_success_order ?? 0),
      total_rating: Number(payload.total_rating ?? 0),
      synced_at: now,
    };
  } catch (err: any) {
    return {
      offer_id: offerId,
      product_url: productUrl,
      seller_name: "Unknown",
      status: "unknown",
      is_sold_out: true,
      available_qty: 0,
      actual_qty: 0,
      price_usd: 0,
      is_online: false,
      rating_pct: 0,
      success_orders: 0,
      total_rating: 0,
      synced_at: now,
      error: err.name === "AbortError" ? "G2G SLS Connection Timeout" : err.message,
    };
  }
}

/**
 * Sinkronisasi seluruh katalog game dengan data stok live dari G2G
 */
export async function syncCatalogWithG2GLive(catalog: any[]): Promise<{
  updatedCatalog: any[];
  auditLogs: G2GAuditLogItem[];
  syncedCount: number;
  auditTime: string;
}> {
  const auditLogs: G2GAuditLogItem[] = [];
  let syncedCount = 0;
  const auditTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Salin katalog agar aman dari mutasi langsung
  const updatedCatalog = JSON.parse(JSON.stringify(catalog));

  // Ambil semua tawaran seller untuk query paralel
  const tasks: Array<{
    gameIndex: number;
    sellerIndex: number;
    offerId: string;
    gameTitle: string;
    sellerName: string;
    previousStock: number;
  }> = [];

  updatedCatalog.forEach((game: any, gIdx: number) => {
    (game.sellers || []).forEach((seller: any, sIdx: number) => {
      const offerId = extractG2GOfferId(seller.profile_url);
      if (offerId) {
        tasks.push({
          gameIndex: gIdx,
          sellerIndex: sIdx,
          offerId,
          gameTitle: game.title,
          sellerName: seller.seller_name,
          previousStock: Number(seller.stock ?? 0),
        });
      }
    });
  });

  // Eksekusi query live ke G2G SLS API
  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      const liveData = await fetchG2GLiveOffer(task.offerId);
      return { task, liveData };
    })
  );

  results.forEach((res) => {
    if (res.status === "fulfilled") {
      const { task, liveData } = res.value;
      if (!liveData.error) {
        const game = updatedCatalog[task.gameIndex];
        const seller = game.sellers[task.sellerIndex];

        // Perbarui stok real live
        seller.stock = liveData.available_qty;
        seller.is_sold_out = liveData.is_sold_out;
        seller.is_online = liveData.is_online;
        seller.live_status = liveData.status;
        seller.live_synced_at = liveData.synced_at;
        seller.total_success_order = liveData.success_orders;
        if (liveData.rating_pct > 0) {
          seller.rating_pct = liveData.rating_pct;
        }

        let health: "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        if (liveData.available_qty === 0 || liveData.is_sold_out) {
          health = "CRITICAL";
        } else if (liveData.available_qty <= 3) {
          health = "WARNING";
        }

        auditLogs.push({
          game_title: task.gameTitle,
          seller_name: task.sellerName,
          offer_id: task.offerId,
          product_url: `https://www.g2g.com/offer/${task.offerId}`,
          previous_stock: task.previousStock,
          live_stock: liveData.available_qty,
          is_online: liveData.is_online,
          status: liveData.status,
          health,
        });

        syncedCount++;
      }
    }
  });

  return {
    updatedCatalog,
    auditLogs,
    syncedCount,
    auditTime,
  };
}
