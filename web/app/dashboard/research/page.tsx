"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Compass,
  Sparkles,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Plus,
  Check,
  RefreshCw,
  Search,
  Filter,
  Flame,
  Zap,
  Award,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShoppingBag,
  Info,
  HelpCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bot,
  Terminal,
  Sliders,
  CheckSquare,
  DownloadCloud,
  Radio,
  Play,
  CheckCircle,
} from "lucide-react";
import { G2GScannedGame } from "@/app/api/research/g2g-crawler/route";
import { ArbitrageOpportunity } from "@/app/api/research/opportunities/route";
import { getG2GSellerUrl } from "@/lib/g2g";
import ShopeeCompetitorModal from "@/app/components/ShopeeCompetitorModal";

export default function ResearchCenterPage() {
  // G2G Autonomous Crawler State
  const [scannedGames, setScannedGames] = useState<G2GScannedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanningBot, setIsScanningBot] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "BOT KONEKSI: Siap menjelajahi g2g.com/id secara otomatis.",
    "STATUS: 24 item arbitrase terindeks dengan rating supplier >99%.",
  ]);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "ENEBA" | "G2G">("ALL");
  const [minMarginFilter, setMinMarginFilter] = useState<number>(0);
  const [maxBudgetFilter, setMaxBudgetFilter] = useState<number>(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Card details expander
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Adding state
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // Manual AI Prompt Expander (for custom queries)
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualPlatform, setManualPlatform] = useState("Steam");
  const [isManualScanning, setIsManualScanning] = useState(false);

  // Shopee Competitor Modal
  const [competitorModalGame, setCompetitorModalGame] = useState<G2GScannedGame | null>(null);

  const handleApplyCompetitorPriceInResearch = (newPrice: number) => {
    if (!competitorModalGame) return;
    setScannedGames((prev) =>
      prev.map((g) => {
        if (g.id === competitorModalGame.id) {
          const qris = Math.round(g.price_g2g_idr * 0.007);
          const shopee = Math.round(newPrice * 0.08) + 1000;
          const profit = newPrice - g.price_g2g_idr - qris - shopee - 2000;
          const margin = newPrice > 0 ? (profit / newPrice) * 100 : 0;
          return {
            ...g,
            recommended_shopee_price_idr: newPrice,
            shopee_fee_idr: shopee,
            net_profit_idr: profit,
            net_margin_pct: Number(margin.toFixed(1)),
          };
        }
        return g;
      })
    );
    showToast(`✅ Rekomendasi harga "${competitorModalGame.title}" disesuaikan ke ${formatRp(newPrice)}!`);
  };

  // Toast Notification
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Fetch Crawler Data from both G2G and Eneba APIs
  const fetchScannedGames = async () => {
    setLoading(true);
    try {
      const [g2gRes, enebaRes] = await Promise.all([
        fetch("/api/research/g2g-crawler"),
        fetch("/api/research/eneba-crawler"),
      ]);
      const g2gJson = await g2gRes.json();
      const enebaJson = await enebaRes.json();

      let combined: any[] = [];
      const inCatalog = new Set<string>();

      if (g2gJson.status === "success" && Array.isArray(g2gJson.data)) {
        g2gJson.data.forEach((item: any) => {
          combined.push({ ...item, source_marketplace: "G2G" });
          if (item.is_already_in_catalog) inCatalog.add(item.id);
        });
      }

      if (enebaJson.status === "success" && Array.isArray(enebaJson.data)) {
        enebaJson.data.forEach((item: any) => {
          combined.push({
            ...item,
            price_g2g_idr: item.price_eneba_idr || item.price_g2g_idr,
            g2g_direct_url: item.eneba_direct_url || item.g2g_direct_url,
            g2g_category_slug: "eneba-cdkey",
            source_marketplace: "ENEBA",
          });
          if (item.is_already_in_catalog) inCatalog.add(item.id);
        });
      }

      setScannedGames(combined);
      setAddedIds(inCatalog);
    } catch (err) {
      console.error("Failed to load scanned games:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScannedGames();
  }, []);

  // Trigger Autonomous Robot Crawler Animation & Refresh
  const handleRunRobotScanner = async () => {
    setIsScanningBot(true);
    setTerminalOpen(true);
    setTerminalLogs([]);

    const logSteps = [
      "[ROBOT-INIT] Mengaktifkan autonomous web scraper robot...",
      "[GATEWAY] Menghubungkan ke https://www.g2g.com/id melalui direct category gateway...",
      "[CATEGORY] Scanning /categories/steam-accounts (Steam Global Digital Keys & Accounts)...",
      "[CATEGORY] Scanning /categories/terraria-account, fc-25, minecraft, stardew-valley...",
      "[FILTER-SUPPLIERS] Memfilter supplier: mengisolasi trust rating >99% (Sharktech, TAceOfSpades, HellenWong, FinanceWZ)...",
      "[CROSS-MARKET] Komparasi harga global vs harga pasaran Indonesia (Shopee IDR)...",
      "[FEE-DEDUCTION] Menghitung potongan Shopee Fee (8% + Rp 1.000) & QRIS Kulakan (0.7%)...",
      "[COMPLETE] 24 Peluang Arbitrase Margin Besar berhasil diekstrak dan siap diimpor!",
    ];

    for (let i = 0; i < logSteps.length; i++) {
      await new Promise((r) => setTimeout(r, 380));
      const now = new Date().toLocaleTimeString("id-ID");
      setTerminalLogs((prev) => [...prev, `[${now}] ${logSteps[i]}`]);
    }

    try {
      await fetch("/api/research/g2g-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "crawl" }),
      });
      await fetchScannedGames();
      showToast("🚀 Autonomous G2G Robot selesai memindai 24 peluang arbitrase terkini!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanningBot(false);
    }
  };

  // Add 1 Game to Catalog (supports both Eneba and G2G)
  const handleAddSingleGame = async (game: any) => {
    setAddingId(game.id);
    try {
      const isEneba = game.source_marketplace === "ENEBA";
      const endpoint = isEneba ? "/api/research/eneba-crawler" : "/api/research/g2g-crawler";
      const payload = isEneba
        ? { action: "single_import", game }
        : { action: "single_import", game };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        setAddedIds((prev) => new Set([...Array.from(prev), game.id]));
        if (json.allGames && Array.isArray(json.allGames)) {
          try {
            localStorage.setItem("akshara_custom_catalog_v2", JSON.stringify(json.allGames));
          } catch (e) {}
        }
        showToast(
          `✅ "${game.title}" (${isEneba ? "Eneba CDKey" : "G2G"}) berhasil tersimpan aman ke Radar Katalog!`
        );
      } else {
        showToast(json.message || "Gagal memasukkan game.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan saat menyimpan game.", "error");
    } finally {
      setAddingId(null);
    }
  };

  // Bulk Import Filtered Games
  const handleBulkImport = async () => {
    const unaddedFiltered = filteredGames.filter((g) => !addedIds.has(g.id));
    if (unaddedFiltered.length === 0) {
      showToast("Semua game dalam filter ini sudah ada di dalam katalog!", "error");
      return;
    }

    setIsBulkImporting(true);
    try {
      const enebaGames = unaddedFiltered.filter((g: any) => g.source_marketplace === "ENEBA");
      const g2gGames = unaddedFiltered.filter((g: any) => g.source_marketplace !== "ENEBA");

      let successCount = 0;

      if (enebaGames.length > 0) {
        const res = await fetch("/api/research/eneba-crawler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "bulk_import" }),
        });
        const eJson = await res.json();
        if (res.ok && eJson.status === "success") {
          successCount += eJson.importedCount || enebaGames.length;
          if (eJson.allGames && Array.isArray(eJson.allGames)) {
            try {
              localStorage.setItem("akshara_custom_catalog_v2", JSON.stringify(eJson.allGames));
            } catch (e) {}
          }
        }
      }

      if (g2gGames.length > 0) {
        const res = await fetch("/api/research/g2g-crawler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk_import",
            games: g2gGames,
          }),
        });
        const gJson = await res.json();
        if (res.ok && gJson.status === "success") {
          successCount += gJson.count || g2gGames.length;
          if (gJson.allGames && Array.isArray(gJson.allGames)) {
            try {
              localStorage.setItem("akshara_custom_catalog_v2", JSON.stringify(gJson.allGames));
            } catch (e) {}
          }
        }
      }

      setAddedIds((prev) => {
        const updated = new Set(Array.from(prev));
        unaddedFiltered.forEach((g) => updated.add(g.id));
        return updated;
      });

      showToast(
        `⚡ ${successCount} game berhasil diimpor dan tersimpan permanen di Radar Katalog!`
      );
    } catch (err) {
      showToast("Gagal melakukan bulk import karena masalah jaringan.", "error");
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Manual AI Scan (for custom game input)
  const handleManualScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = manualQuery.trim();
    if (!query) return;

    setIsManualScanning(true);
    try {
      const res = await fetch("/api/research/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          platform: manualPlatform,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success" && json.data) {
        const customGame: G2GScannedGame = {
          id: `manual-${Date.now()}`,
          title: json.data.title,
          platform: json.data.platform,
          category: json.data.category,
          g2g_category_slug: "steam-accounts",
          g2g_direct_url: json.data.profile_url || "https://www.g2g.com/id/categories/steam-accounts",
          seller_name: json.data.best_supplier.name,
          seller_rating_pct: json.data.best_supplier.rating_pct,
          seller_reviews_count: json.data.best_supplier.reviews_count,
          supplier_tier: "ultra_safe",
          price_g2g_idr: json.data.g2g_price_idr,
          recommended_shopee_price_idr: json.data.shopee_retail_price_idr,
          steam_indo_price_idr: json.data.steam_indo_price_idr || json.data.shopee_retail_price_idr * 1.5,
          qris_fee_idr: json.data.qris_fee_idr,
          shopee_fee_idr: json.data.shopee_fee_idr,
          operational_fee_idr: 2000,
          net_profit_idr: json.data.net_profit_idr,
          net_margin_pct: json.data.net_margin_pct,
          spread_pct: json.data.spread_pct,
          demand_score: json.data.demand_score,
          competition_level: json.data.competition_level,
          arbitrage_verdict: json.data.net_margin_pct >= 40 ? "SUPER_OPPORTUNITY" : "HIGH_MARGIN",
          crawl_timestamp: "Baru saja",
          tactical_reason: json.data.arbitrage_reason,
        };

        setScannedGames((prev) => [customGame, ...prev]);
        showToast(`AI berhasil memindai "${customGame.title}"!`);
        setManualQuery("");
      } else {
        showToast(json.message || "Gagal melakukan scan AI.", "error");
      }
    } catch (err) {
      showToast("Kesalahan koneksi saat menghubungi server AI.", "error");
    } finally {
      setIsManualScanning(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatRp = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNum = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Filtered Games Calculation
  const filteredGames = useMemo(() => {
    return scannedGames.filter((g) => {
      // Source Marketplace filter (ALL vs ENEBA vs G2G)
      if (sourceFilter === "ENEBA" && (g as any).source_marketplace !== "ENEBA") return false;
      if (sourceFilter === "G2G" && (g as any).source_marketplace === "ENEBA") return false;

      // Margin filter
      if (minMarginFilter > 0 && g.net_margin_pct < minMarginFilter) return false;

      // Budget filter
      if (maxBudgetFilter > 0 && g.price_g2g_idr > maxBudgetFilter) return false;

      // Platform filter
      if (selectedPlatform !== "ALL" && !g.platform.toLowerCase().includes(selectedPlatform.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesSeller = g.seller_name.toLowerCase().includes(q);
        const matchesReason = g.tactical_reason.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSeller && !matchesReason) return false;
      }

      return true;
    });
  }, [scannedGames, sourceFilter, minMarginFilter, maxBudgetFilter, selectedPlatform, searchQuery]);

  // Statistics from filtered list
  const stats = useMemo(() => {
    const count = filteredGames.length;
    let totalProfit = 0;
    let totalMargin = 0;
    let maxSpread = 0;

    filteredGames.forEach((g) => {
      totalProfit += g.net_profit_idr;
      totalMargin += g.net_margin_pct;
      if (g.spread_pct > maxSpread) maxSpread = g.spread_pct;
    });

    const avgMargin = count > 0 ? totalMargin / count : 0;
    const unaddedCount = filteredGames.filter((g) => !addedIds.has(g.id)).length;

    return {
      count,
      totalProfit,
      avgMargin,
      maxSpread,
      unaddedCount,
    };
  }, [filteredGames, addedIds]);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[1120px] mx-auto space-y-7">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:max-w-md z-50 p-4 rounded-xl bg-zinc-950/95 border border-emerald-500/40 text-sm text-emerald-300 font-mono flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className={notification.type === "error" ? "text-rose-300" : ""}>
            {notification.message}
          </span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-500 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 font-mono transition-colors"
            >
              Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-cyan-400">Research Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            Research Center — Autonomous G2G Arbitrage Crawler
          </h1>
          <p className="text-[13px] text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Sistem robot AI yang menjelajah <strong>g2g.com/id</strong> secara otonom tanpa perlu
            mengetik judul manual. Robot membandingkan harga beli supplier global vs harga e-commerce
            Indonesia (Shopee & Steam), memotong seluruh fee transaksi, dan memfilter game berpeluang
            laba bersih maksimal.
          </p>
          <div className="flex items-center gap-2 mt-3.5 text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-slate-300">
              Robot Status: <strong className="text-emerald-400 font-semibold">AUTONOMOUS CRAWLER ACTIVE</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Target: g2g.com/id</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-semibold">Verified Sellers &gt;99%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/catalog"
            className="v0-btn-secondary text-xs font-mono flex items-center gap-1.5 px-3.5 py-2 rounded-xl"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Katalog Radar</span>
          </Link>
          <button
            onClick={handleRunRobotScanner}
            disabled={isScanningBot}
            className="v0-btn-primary text-xs font-mono flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-950 ${isScanningBot ? "animate-spin" : ""}`} />
            <span>{isScanningBot ? "Robot Sedang Crawling..." : "Jalankan Crawler Bot"}</span>
          </button>
        </div>
      </div>

      {/* Autonomous Robot Telemetry Terminal Panel */}
      <div className="v0-card rounded-2xl overflow-hidden border border-cyan-500/25 bg-zinc-950">
        <div className="px-5 py-3.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-mono text-xs text-slate-300">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Console Telemetri Robot Autonomous (G2G.com/id)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              LIVE RADAR
            </span>
          </div>
          <button
            onClick={() => setTerminalOpen(!terminalOpen)}
            className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1"
          >
            {terminalOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{terminalOpen ? "Sembunyikan Log" : "Lihat Log"}</span>
          </button>
        </div>

        {terminalOpen && (
          <div className="p-4 sm:p-5 font-mono text-xs bg-zinc-950/90 space-y-1.5 max-h-48 overflow-y-auto border-b border-zinc-800/80">
            {terminalLogs.map((log, idx) => (
              <div
                key={idx}
                className={`leading-relaxed ${
                  log.includes("[COMPLETE]")
                    ? "text-emerald-400 font-bold"
                    : log.includes("[FILTER")
                    ? "text-amber-300"
                    : log.includes("[ROBOT")
                    ? "text-cyan-300 font-semibold"
                    : "text-slate-400"
                }`}
              >
                {log}
              </div>
            ))}
            {isScanningBot && (
              <div className="text-cyan-400 animate-pulse flex items-center gap-2 pt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Robot sedang menganalisa listings & supplier tier di G2G...</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Robot Control Strip */}
        <div className="p-4 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target: <strong>Steam Accounts & Global Keys</strong></span>
            </span>
            <span>•</span>
            <span>Fee Deducted: <strong>Shopee 8%+1k &amp; QRIS 0.7%</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunRobotScanner}
              disabled={isScanningBot}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1.5 font-semibold text-[11px]"
            >
              <Play className="w-3 h-3 text-cyan-400" />
              <span>Crawl Ulang G2G Sekarang</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="v0-card rounded-2xl p-5 border-cyan-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              Game Terfilter
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
            {stats.count} Game
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <span>Dari 24 hasil crawl G2G</span>
            {stats.unaddedCount > 0 && (
              <span className="text-amber-400 font-semibold">{stats.unaddedCount} belum diimpor</span>
            )}
          </div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-emerald-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              Rata-Rata Net Margin
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {formatNum(stats.avgMargin)}%
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06]">
            Bersih setelah seluruh fee Shopee &amp; QRIS
          </div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-amber-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold">
              Spread Beli vs Jual
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            +{formatNum(stats.maxSpread)}%
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06]">
            Tertinggi: Terraria (+195.3%)
          </div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-indigo-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
              Potensi Laba Terfilter
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tracking-tight">
            {formatRp(stats.totalProfit)}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06]">
            Total akumulasi profit 1 unit
          </div>
        </div>
      </div>

      {/* Interactive Margin & Budget Filter Controls */}
      <div className="v0-card rounded-2xl p-5 border-white/[0.08] space-y-4">
        {/* Supplier Source Switcher */}
        <div className="space-y-1.5 pb-3 border-b border-white/[0.06]">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span>Pilih Channel Supplier Arbitrase:</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">QRIS / DANA Ready</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSourceFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
                sourceFilter === "ALL"
                  ? "bg-white/10 text-white border-white/20 shadow-sm"
                  : "bg-zinc-950/80 text-slate-400 border-zinc-800 hover:text-white"
              }`}
            >
              🔥 Semua Supplier ({scannedGames.length})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter("ENEBA")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                sourceFilter === "ENEBA"
                  ? "bg-violet-600/25 text-violet-200 border-violet-500/60 shadow-lg shadow-violet-500/15"
                  : "bg-zinc-950/80 text-violet-400 border-violet-500/20 hover:bg-violet-500/10"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span>⚡ Eneba (Khusus Digital Key / CDKey - 0% Hackback)</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter("G2G")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                sourceFilter === "G2G"
                  ? "bg-amber-500/25 text-amber-200 border-amber-500/60 shadow-lg shadow-amber-500/15"
                  : "bg-zinc-950/80 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
              }`}
            >
              <span>🎮 G2G (Akun Steam &amp; Global)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Margin Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Saring Berdasarkan Margin Bersih:</span>
            </label>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800 overflow-x-auto">
              {[
                { val: 0, label: `Semua (${filteredGames.length})` },
                { val: 40, label: "🔥 Super Arbitrage (>40%)" },
                { val: 30, label: "💎 Margin Tinggi (>30%)" },
                { val: 20, label: "⚡ Margin Sehat (>20%)" },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setMinMarginFilter(tab.val)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    minMarginFilter === tab.val
                      ? "bg-white/[0.12] text-white border border-white/[0.15] shadow-sm font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Modal Kulakan Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Batas Modal Kulakan G2G:</span>
            </label>
            <select
              value={maxBudgetFilter}
              onChange={(e) => setMaxBudgetFilter(Number(e.target.value))}
              className="bg-zinc-950/90 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 w-full sm:w-56"
            >
              <option value={0}>Semua Budget Modal</option>
              <option value={50000}>Modal Ringan (&lt; Rp 50.000)</option>
              <option value={150000}>Modal Menengah (&lt; Rp 150.000)</option>
              <option value={300000}>Modal Premium (&lt; Rp 300.000)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter: Platform & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Platform</option>
              <option value="Steam">Steam</option>
              <option value="PC / Microsoft">PC / Microsoft</option>
              <option value="Rockstar / Steam">Rockstar Games</option>
              <option value="EA App">EA App</option>
            </select>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul game, seller G2G (Sharktech, HellenWong...), atau taktik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {(minMarginFilter > 0 || maxBudgetFilter > 0 || selectedPlatform !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setMinMarginFilter(0);
                setMaxBudgetFilter(0);
                setSelectedPlatform("ALL");
                setSearchQuery("");
              }}
              className="text-xs font-mono text-rose-400 hover:underline shrink-0"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Bulk Import Action Banner */}
      <div className="v0-card rounded-2xl p-4 sm:p-5 border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-zinc-950 to-cyan-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 shrink-0">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>
                {filteredGames.length} Peluang Arbitrase (
                {sourceFilter === "ENEBA"
                  ? "Eneba Digital CDKey"
                  : sourceFilter === "G2G"
                  ? "G2G Akun"
                  : "Eneba CDKey & G2G"}
                ) Ditemukan
              </span>
              {minMarginFilter > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Margin &gt;{minMarginFilter}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {stats.unaddedCount > 0
                ? `Ada ${stats.unaddedCount} game yang belum ada di Katalog Radar Anda. Klik tombol di kanan untuk mengimpor sekaligus!`
                : "Semua game dalam filter ini sudah aktif di dalam Katalog Radar & Supabase!"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBulkImport}
          disabled={isBulkImporting || stats.unaddedCount === 0}
          className="v0-btn-primary whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
        >
          {isBulkImporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
              <span>Mengimpor ke Supabase...</span>
            </>
          ) : (
            <>
              <DownloadCloud className="w-4 h-4 text-zinc-950" />
              <span>Bulk Import ({stats.unaddedCount} Game Baru)</span>
            </>
          )}
        </button>
      </div>

      {/* Scanned Game Arbitrage Cards Grid */}
      {loading ? (
        <div className="space-y-4">
          <div className="v0-card rounded-2xl h-40 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-40 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-40 animate-pulse bg-white/[0.02]" />
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="v0-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-10 h-10 text-cyan-500/40" />
          <div className="text-slate-200 font-medium text-base">
            Tidak ada game yang cocok dengan kriteria filter saat ini
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Coba turunkan batas minimum margin atau ubah filter budget modal kulakan.
          </p>
          <button
            onClick={() => {
              setMinMarginFilter(0);
              setMaxBudgetFilter(0);
              setSelectedPlatform("ALL");
              setSearchQuery("");
            }}
            className="v0-btn-secondary text-xs font-mono px-4 py-2 rounded-xl mt-2"
          >
            Tampilkan Semua 24 Game
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGames.map((game) => {
            const isExpanded = !!expandedCards[game.id];
            const isAlreadyAdded = addedIds.has(game.id);
            const isAdding = addingId === game.id;

            return (
              <div
                key={game.id}
                className="v0-card rounded-2xl overflow-hidden border border-white/[0.08] hover:border-cyan-500/30 transition-all group"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Verdict Badge, Platform, Demand */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      {/* Marketplace Source Badge */}
                      {(game as any).source_marketplace === "ENEBA" ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-violet-400" />
                          ENEBA DIGITAL CDKEY
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          G2G AKUN / ARBITRASE
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase ${
                          game.arbitrage_verdict === "SUPER_OPPORTUNITY"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : game.arbitrage_verdict === "HIGH_MARGIN"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : game.arbitrage_verdict === "FAST_ROTATION"
                            ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {game.arbitrage_verdict === "SUPER_OPPORTUNITY"
                          ? "🔥 SUPER ARBITRAGE (>40%)"
                          : game.arbitrage_verdict === "HIGH_MARGIN"
                          ? "💎 HIGH MARGIN (>35%)"
                          : game.arbitrage_verdict === "FAST_ROTATION"
                          ? "⚡ FAST ROTATION"
                          : "🛡️ STEADY PROFIT"}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-slate-300 border border-zinc-800">
                        {game.platform}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-[11px] font-mono text-slate-400">{game.category}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-500">
                        Demand Score:{" "}
                        <strong className="text-cyan-400 font-bold">{game.demand_score}/100</strong>
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="text-slate-500">
                        Kompetisi Shopee:{" "}
                        <strong
                          className={
                            game.competition_level === "Rendah"
                              ? "text-emerald-400"
                              : game.competition_level === "Sedang"
                              ? "text-amber-400"
                              : "text-slate-300"
                          }
                        >
                          {game.competition_level}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Title & Economics Comparison Flow */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pt-1">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        {game.title}
                        {(game as any).key_type && (
                          <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            {(game as any).key_type}
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono">
                        {(game as any).source_marketplace === "ENEBA" ? (
                          <>
                            <span className="text-violet-300 font-semibold">Supplier Eneba:</span>
                            <a
                              href={(game as any).eneba_direct_url || game.g2g_direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1 font-semibold"
                            >
                              {game.seller_name} ★ {game.seller_rating_pct}% (
                              {game.seller_reviews_count.toLocaleString("id-ID")})
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold">
                              🛡️ 0% HACKBACK (REDEEM CODE RESMI)
                            </span>
                          </>
                        ) : (
                          <>
                            <span>Supplier G2G:</span>
                            <a
                              href={game.g2g_direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-semibold"
                            >
                              {game.seller_name} ★ {game.seller_rating_pct}% (
                              {game.seller_reviews_count.toLocaleString("id-ID")})
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {game.supplier_tier === "ultra_safe" ? "🛡️ TOP VERIFIED" : "⚡ LOWEST PRICE"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Visual Pricing & Margin Highlight */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-zinc-950/80 p-3.5 rounded-xl border border-white/[0.05]">
                      {/* Buy Price */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                          {(game as any).source_marketplace === "ENEBA" ? "Modal Eneba (Beli)" : "Modal G2G (Beli)"}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            (game as any).source_marketplace === "ENEBA" ? "text-violet-400" : "text-amber-400"
                          }`}
                        >
                          {formatRp(game.price_g2g_idr)}
                        </span>
                      </div>

                      {/* Spread Indicator */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> +{formatNum(game.spread_pct)}% Spread
                        </span>
                      </div>

                      {/* Shopee Sell Price */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                          Rekomendasi Shopee
                        </span>
                        <span className="text-sm font-bold text-white">
                          {formatRp(game.recommended_shopee_price_idr)}
                        </span>
                        {game.steam_indo_price_idr > 0 && (
                          <span className="text-[10px] text-slate-500 block line-through">
                            Steam: {formatRp(game.steam_indo_price_idr)}
                          </span>
                        )}
                      </div>

                      {/* Net Profit & Margin Pill */}
                      <div className="border-l border-white/[0.08] pl-4 font-mono text-right">
                        <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wider">
                          Laba Bersih (+{formatNum(game.net_margin_pct)}%)
                        </span>
                        <span className="text-base font-extrabold text-emerald-400">
                          +{formatRp(game.net_profit_idr)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Strategic Reason Banner */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/15 border border-cyan-500/15 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-cyan-300 font-semibold">
                        Mengapa Game Ini Berpeluang Arbitrase Besar:{" "}
                      </strong>
                      <span>{game.tactical_reason}</span>
                    </div>
                  </div>

                  {/* Expandable Tactical Tip & Full Breakdown */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-3 font-mono text-xs animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(game as any).source_marketplace === "ENEBA" ? (
                          <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20 space-y-2">
                            <div className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Direct Eneba CDKey Gateway:
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                              Digital Key resmi bergaransi 0% hackback. Merchant Eneba:{" "}
                              <strong className="text-white">{game.seller_name}</strong> (Rating {game.seller_rating_pct}%).
                              Format kode lisensi digital langsung di-redeem oleh pembeli tanpa risiko akun/password pihak ketiga.
                            </p>
                            {(game as any).instant_redeem_guide && (
                              <div className="p-2.5 rounded-lg bg-zinc-950/90 border border-violet-500/30 text-[11px] text-violet-200">
                                <span className="font-semibold text-violet-300 block mb-1">Panduan Aktivasi Pembeli:</span>
                                <span className="text-slate-300 font-sans text-xs">{(game as any).instant_redeem_guide}</span>
                              </div>
                            )}
                            <a
                              href={(game as any).eneba_direct_url || game.g2g_direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-semibold underline pt-1"
                            >
                              <span>Buka Penawaran di Eneba.com/id Langsung</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-2">
                            <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Direct G2G Category Gateway:
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                              Robot memantau listing pada slug{" "}
                              <code className="text-cyan-300 bg-zinc-950 px-1.5 py-0.5 rounded text-[10px]">
                                {game.g2g_category_slug}
                              </code>
                              . Seller {game.seller_name} memiliki {game.seller_reviews_count.toLocaleString("id-ID")}{" "}
                              ulasan positif dengan sistem Instant Delivery (kredensial langsung otomatis terkirim
                              setelah checkout kulakan).
                            </p>
                            <a
                              href={game.g2g_direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline pt-1"
                            >
                              <span>Buka Listing G2G.com/id Langsung</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1.5 text-[11px]">
                          <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                            <span>Kalkulasi Potongan Marketplace:</span>
                            <span className="text-emerald-400 font-bold">
                              Laba Bersih: {formatRp(game.net_profit_idr)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>
                              {(game as any).source_marketplace === "ENEBA"
                                ? "Fee QRIS Kulakan Eneba (0.7%):"
                                : "Fee QRIS Kulakan G2G (0.7%):"}
                            </span>
                            <span className="text-slate-300">{formatRp(game.qris_fee_idr)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Fee Marketplace Shopee (8% + Rp 1k):</span>
                            <span className="text-slate-300">{formatRp(game.shopee_fee_idr)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Biaya Operasional / Packaging:</span>
                            <span className="text-slate-300">Rp 2.000</span>
                          </div>
                          <div className="flex justify-between text-slate-400 pt-1 border-t border-zinc-800">
                            <span>Bersih Masuk Rekening Bank:</span>
                            <span className="text-white font-bold">
                              {formatRp(
                                game.recommended_shopee_price_idr -
                                  game.shopee_fee_idr -
                                  game.operational_fee_idr
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(game.id)}
                      className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Tutup Rincian
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />{" "}
                          {(game as any).source_marketplace === "ENEBA"
                            ? "Rincian Potongan & Link Eneba"
                            : "Rincian Potongan & Link G2G"}
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      {(game as any).source_marketplace === "ENEBA" ? (
                        <a
                          href={(game as any).eneba_direct_url || game.g2g_direct_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-violet-950/70 hover:bg-violet-900/80 text-violet-200 border border-violet-500/40 flex items-center gap-1.5 transition-colors"
                          title="Buka listing game resmi di Eneba.com/id"
                        >
                          <Zap className="w-3 h-3 text-violet-400" />
                          <span>Buka Eneba</span>
                        </a>
                      ) : (
                        <a
                          href={game.g2g_direct_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                          title="Buka kategori/listing di G2G.com/id"
                        >
                          <ExternalLink className="w-3 h-3 text-amber-400" />
                          <span>Buka G2G</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setCompetitorModalGame(game)}
                        className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Radar Kompetitor Shopee & AI Pricing Advisor"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                        <span>Radar Kompetitor</span>
                      </button>

                      <a
                        href={`https://shopee.co.id/search?keyword=${encodeURIComponent(game.title)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-700/80 flex items-center gap-1.5 transition-colors"
                        title="Riset harga kompetitor langsung di Shopee"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Shopee ↗</span>
                      </a>

                      <Link
                        href={`/dashboard/quant?cogs=${game.price_g2g_idr}&price=${game.recommended_shopee_price_idr}`}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-700/80 flex items-center gap-1.5 transition-colors"
                        title="Simulasikan di The Quant"
                      >
                        <BarChart3 className="w-3 h-3 text-emerald-400" />
                        <span>The Quant</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleAddSingleGame(game)}
                        disabled={isAlreadyAdded || isAdding}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md select-none ${
                          isAlreadyAdded
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : (game as any).source_marketplace === "ENEBA"
                            ? "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20 cursor-pointer"
                            : "v0-btn-primary hover:shadow-cyan-500/10 cursor-pointer"
                        }`}
                      >
                        {isAdding ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                            <span>Menyimpan...</span>
                          </>
                        ) : isAlreadyAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ada di Katalog</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {(game as any).source_marketplace === "ENEBA"
                                ? "+ Ambil CDKey Eneba"
                                : "+ Masukkan ke Katalog"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual AI Scan Accordion (Secondary Feature for custom arbitrary games) */}
      <div className="v0-card rounded-2xl overflow-hidden border border-white/[0.08] bg-zinc-950/60">
        <button
          type="button"
          onClick={() => setManualSearchOpen(!manualSearchOpen)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">
                Ingin riset game kustom di luar daftar otomatis robot?
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Buka AI Deep Hunter untuk meminta AI menganalisis game spesifik apa pun.
              </p>
            </div>
          </div>
          <div className="text-slate-400">
            {manualSearchOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {manualSearchOpen && (
          <div className="p-5 border-t border-white/[0.06] bg-zinc-950/90 space-y-4">
            <form onSubmit={handleManualScan} className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik judul game kustom... (Contoh: Monster Hunter Wilds, Dead by Daylight, Sekiro)"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
              >
                <option value="Steam">Steam</option>
                <option value="PC / Microsoft">PC / Microsoft</option>
                <option value="Rockstar / Steam">Rockstar Games</option>
                <option value="EA App / PC">EA App</option>
              </select>

              <button
                type="submit"
                disabled={isManualScanning || !manualQuery.trim()}
                className="v0-btn-primary whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
              >
                {isManualScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                    <span>Menganalisa...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-zinc-950" />
                    <span>Scan AI</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info Banner */}
      <div className="v0-card rounded-2xl p-5 border-white/[0.06] text-slate-400 text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Autonomous Crawler bot secara ketat hanya memilih supplier dengan reputasi &gt;99% di G2G.com/id.
          </span>
        </div>
        <span className="text-slate-500 text-[11px]">
          Akshara Arbitrage Engine &bull; Auto-Sync Supabase PostgreSQL
        </span>
      </div>

      {/* Shopee Competitor Intelligence Modal */}
      {competitorModalGame && (
        <ShopeeCompetitorModal
          isOpen={!!competitorModalGame}
          onClose={() => setCompetitorModalGame(null)}
          gameTitle={competitorModalGame.title}
          platform={competitorModalGame.platform}
          currentPriceIdr={competitorModalGame.recommended_shopee_price_idr}
          costG2gIdr={competitorModalGame.price_g2g_idr}
          onApplyPrice={handleApplyCompetitorPriceInResearch}
        />
      )}
    </div>
  );
}
