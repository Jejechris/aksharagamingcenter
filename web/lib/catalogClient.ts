function sanitizeG2GUrl(url?: string): string | undefined {
  if (!url) return url;
  if (url.includes("g2g.com/categories/") && url.includes("?q=")) {
    return url.split("?")[0];
  }
  return url;
}

function sanitizeGameUrls(game: any): any {
  if (!game) return game;
  const sellers = (game.sellers || []).map((s: any) => ({
    ...s,
    profile_url: sanitizeG2GUrl(s.profile_url),
    fallback_search_url: sanitizeG2GUrl(s.fallback_search_url),
  }));

  const metrics = game.metrics ? { ...game.metrics } : undefined;
  if (metrics && metrics.selected_seller) {
    metrics.selected_seller = {
      ...metrics.selected_seller,
      profile_url: sanitizeG2GUrl(metrics.selected_seller.profile_url),
      fallback_search_url: sanitizeG2GUrl(metrics.selected_seller.fallback_search_url),
    };
  }

  return {
    ...game,
    sellers,
    metrics,
  };
}

export async function fetchSmartCatalog(): Promise<any[]> {
  let localGames: any[] = [];
  if (typeof window !== "undefined") {
    try {
      // Bust legacy v2 cache that might contain ?q= URLs
      if (localStorage.getItem("akshara_custom_catalog_v2")) {
        localStorage.removeItem("akshara_custom_catalog_v2");
      }
      const stored = localStorage.getItem("akshara_custom_catalog_v3");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localGames = parsed.map(sanitizeGameUrls);
        }
      }
    } catch (e) {}
  }

  let serverGames: any[] = [];
  try {
    const res = await fetch("/api/catalog");
    const json = await res.json();
    if (json.status === "success" && Array.isArray(json.data)) {
      serverGames = json.data.map(sanitizeGameUrls);
    }
  } catch (e) {
    console.error("fetch /api/catalog failed", e);
  }

  const mergedMap = new Map<string, any>();
  for (const g of serverGames) {
    mergedMap.set(g.id, sanitizeGameUrls(g));
  }

  for (const lg of localGames) {
    const cleanLg = sanitizeGameUrls(lg);
    if (!mergedMap.has(cleanLg.id)) {
      mergedMap.set(cleanLg.id, cleanLg);
    } else {
      const existing = mergedMap.get(cleanLg.id);
      const existingSellerIds = new Set((existing.sellers || []).map((s: any) => s.seller_id));
      const additionalSellers = (cleanLg.sellers || []).filter(
        (s: any) => !existingSellerIds.has(s.seller_id)
      );
      if (additionalSellers.length > 0) {
        mergedMap.set(cleanLg.id, {
          ...existing,
          sellers: [...existing.sellers, ...additionalSellers],
        });
      }
    }
  }

  const mergedList = Array.from(mergedMap.values()).map(sanitizeGameUrls);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("akshara_custom_catalog_v3", JSON.stringify(mergedList));
    } catch (e) {}
  }
  return mergedList;
}
