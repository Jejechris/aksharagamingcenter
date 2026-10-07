const fs = require('fs');
let c = fs.readFileSync('app/dashboard/autonomous/page.tsx', 'utf-8');
const startIdx = c.indexOf('  const fetchCatalog = useCallback(async () => {');
const endIdx = c.indexOf('  }, []);', startIdx) + 9;
const newFunc = `  const fetchCatalog = useCallback(async () => {
    try {
      const mergedData = await fetchSmartCatalog();
      if (mergedData && mergedData.length > 0) {
        setCatalogGames(mergedData);
        const first = mergedData[0];
        setVFormGame(first.title);
        setVFormPlatform(first.platform);
        setVFormCategory(first.category);
        const firstSeller = first.sellers?.find((s) => s.is_selected) || first.sellers?.[0];
        if (firstSeller) {
          setVFormCost(firstSeller.price_g2g_idr);
          setVFormSupplier(firstSeller.seller_name);
          setBulkCost(firstSeller.price_g2g_idr);
          setBulkSupplier(firstSeller.seller_name);
        }
        setBulkGame(first.title);
        setBulkPlatform(first.platform);
        setBulkCategory(first.category);
        setFormGame(first.title);
        setFormPlatform(first.platform);
        setFormPrice(first.selling_price_shopee_idr);
      }
    } catch (e) {
      console.error("Failed to load catalog into autonomous page:", e);
    }
  }, []);`;
c = c.substring(0, startIdx) + newFunc + c.substring(endIdx);
fs.writeFileSync('app/dashboard/autonomous/page.tsx', c);
console.log('Fixed autonomous');
