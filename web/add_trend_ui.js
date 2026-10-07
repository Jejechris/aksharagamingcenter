const fs = require('fs');

// 1. Mod Eneba UI
let eneba = fs.readFileSync('app/dashboard/eneba/page.tsx', 'utf8');

eneba = eneba.replace('const [isAiScanning, setIsAiScanning] = useState(false);', 
`const [isAiScanning, setIsAiScanning] = useState(false);
  const [isDiscoveringTrend, setIsDiscoveringTrend] = useState(false);`);

const funcToAddEneba = `
  const handleDiscoverTrend = async () => {
    setIsDiscoveringTrend(true);
    try {
      const res = await fetch("/api/research/eneba-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover_trend" }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success" && json.data) {
        setGames((prev) => [json.data, ...prev]);
        setAiScannerOpen(true);
        showToast(\`🎯 Trend Ditemukan: \${json.data.title} (\${json.data.arbitrage_verdict})!\`);
      } else {
        showToast(json.message || "Gagal menemukan trend.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan saat mencari trend.", "error");
    } finally {
      setIsDiscoveringTrend(false);
    }
  };
`;
eneba = eneba.replace('const handleCustomAiScan = async', funcToAddEneba + '\n  const handleCustomAiScan = async');

const btnToAddEneba = `
          <button
            type="button"
            onClick={handleDiscoverTrend}
            disabled={isDiscoveringTrend || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer select-none"
          >
            <Flame className={\`w-3.5 h-3.5 \${isDiscoveringTrend ? "animate-pulse" : ""}\`} />
            <span>{isDiscoveringTrend ? "Mencari Trend..." : "Auto-Discover Trend"}</span>
          </button>
`;
eneba = eneba.replace('<span>{aiScannerOpen ? "Tutup Scanner AI" : "Scan CDKey Baru"}</span>\n          </button>', '<span>{aiScannerOpen ? "Tutup Scanner AI" : "Scan CDKey Baru"}</span>\n          </button>\n' + btnToAddEneba);

fs.writeFileSync('app/dashboard/eneba/page.tsx', eneba);

// 2. Mod Research UI
let research = fs.readFileSync('app/dashboard/research/page.tsx', 'utf8');

research = research.replace('const [isManualScanning, setIsManualScanning] = useState(false);',
`const [isManualScanning, setIsManualScanning] = useState(false);
  const [isDiscoveringTrend, setIsDiscoveringTrend] = useState(false);`);

const funcToAddResearch = `
  const handleDiscoverTrend = async () => {
    setIsDiscoveringTrend(true);
    try {
      const res = await fetch("/api/research/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            query: "Game PC terbaru atau paling viral bulan ini yang belum banyak dijual di Shopee (pilih 1 secara acak yang paling profit)",
            platform: "Steam" 
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success" && json.data) {
        // format mapping to match G2GScannedGame
        const arb = json.data;
        const trendGame = {
          id: arb.id,
          title: arb.title,
          platform: arb.platform,
          category: arb.category,
          source_marketplace: "G2G",
          g2g_direct_url: arb.profile_url,
          seller_name: arb.best_supplier.name,
          seller_rating_pct: arb.best_supplier.rating_pct,
          seller_reviews_count: arb.best_supplier.reviews_count,
          supplier_tier: arb.best_supplier.tier,
          price_g2g_idr: arb.g2g_price_idr,
          recommended_shopee_price_idr: arb.shopee_retail_price_idr,
          steam_indo_price_idr: arb.steam_indo_price_idr,
          qris_fee_idr: arb.qris_fee_idr,
          shopee_fee_idr: arb.shopee_fee_idr,
          operational_fee_idr: 2000,
          net_profit_idr: arb.net_profit_idr,
          net_margin_pct: arb.net_margin_pct,
          spread_pct: arb.spread_pct,
          demand_score: arb.demand_score,
          competition_level: arb.competition_level,
          arbitrage_verdict: arb.tag === "🔥 HIGH MARGIN" ? "SUPER_OPPORTUNITY" : "HIGH_MARGIN",
          crawl_timestamp: "Live Trend AI",
          tactical_reason: arb.arbitrage_reason,
        };
        setScannedGames((prev) => [trendGame, ...prev]);
        setManualSearchOpen(true);
        showToast(\`🎯 Trend Ditemukan: \${arb.title} (\${arb.tag})!\`);
      } else {
        showToast(json.message || "Gagal menemukan trend.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan saat mencari trend.", "error");
    } finally {
      setIsDiscoveringTrend(false);
    }
  };
`;
research = research.replace('const handleManualAiScan = async', funcToAddResearch + '\n  const handleManualAiScan = async');

const btnToAddResearch = `
          <button
            type="button"
            onClick={handleDiscoverTrend}
            disabled={isDiscoveringTrend || loading || isScanningBot}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 cursor-pointer select-none"
          >
            <Flame className={\`w-3.5 h-3.5 \${isDiscoveringTrend ? "animate-pulse" : ""}\`} />
            <span>{isDiscoveringTrend ? "Mencari Trend..." : "Auto-Discover Trend"}</span>
          </button>
`;
research = research.replace('<span>{manualSearchOpen ? "Tutup Scanner AI" : "Pencarian AI Manual"}</span>\n          </button>', '<span>{manualSearchOpen ? "Tutup Scanner AI" : "Pencarian AI Manual"}</span>\n          </button>\n' + btnToAddResearch);

fs.writeFileSync('app/dashboard/research/page.tsx', research);
console.log('Modified both UIs');
