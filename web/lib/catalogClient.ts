export async function fetchSmartCatalog(): Promise<any[]> {
  let localGames: any[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("akshara_custom_catalog_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localGames = parsed;
        }
      }
    } catch (e) {}
  }

  let serverGames: any[] = [];
  try {
    const res = await fetch("/api/catalog");
    const json = await res.json();
    if (json.status === "success" && Array.isArray(json.data)) {
      serverGames = json.data;
    }
  } catch (e) {
    console.error("fetch /api/catalog failed", e);
  }

  const mergedMap = new Map<string, any>();
  for (const g of serverGames) {
    mergedMap.set(g.id, g);
  }

  for (const lg of localGames) {
    if (!mergedMap.has(lg.id)) {
      mergedMap.set(lg.id, lg);
    } else {
      const existing = mergedMap.get(lg.id);
      const existingSellerIds = new Set((existing.sellers || []).map((s: any) => s.seller_id));
      const additionalSellers = (lg.sellers || []).filter(
        (s: any) => !existingSellerIds.has(s.seller_id)
      );
      if (additionalSellers.length > 0) {
        mergedMap.set(lg.id, {
          ...existing,
          sellers: [...existing.sellers, ...additionalSellers],
        });
      }
    }
  }

  const mergedList = Array.from(mergedMap.values());
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("akshara_custom_catalog_v2", JSON.stringify(mergedList));
    } catch (e) {}
  }
  return mergedList;
}
