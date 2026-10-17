const fs = require('fs');
let c = fs.readFileSync('app/dashboard/operator/page.tsx', 'utf-8');
const startIdx = c.indexOf('  const fetchCatalog = useCallback(async () => {');
const endIdx = c.indexOf('  }, []);', startIdx) + 9;
const newFunc = `  const fetchCatalog = useCallback(async () => {
    try {
      const mergedData = await fetchSmartCatalog();
      if (mergedData && mergedData.length > 0) {
        setCatalogGames(mergedData);
        setQuickGame(mergedData[0].title);
      }
    } catch (e) {
      console.error("Failed to fetch catalog:", e);
    }
  }, []);`;
c = c.substring(0, startIdx) + newFunc + c.substring(endIdx);
fs.writeFileSync('app/dashboard/operator/page.tsx', c);
console.log('Fixed operator');
