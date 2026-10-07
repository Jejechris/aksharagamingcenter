"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  BarChart3,
  Flame,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  DownloadCloud,
  Layers,
  ArrowLeft,
  Key,
  Shield,
  Info,
  QrCode,
  Send,
} from "lucide-react";
import { EnebaScannedGame } from "@/app/api/research/eneba-crawler/route";
import { getEnebaSearchUrl, getEnebaProductUrl } from "@/lib/eneba";
import ShopeeCompetitorModal from "@/app/components/ShopeeCompetitorModal";

export default function EnebaTerminalPage() {
  const [games, setGames] = useState<EnebaScannedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedKeyType, setSelectedKeyType] = useState("ALL");
  const [minMarginFilter, setMinMarginFilter] = useState(0);
  const [maxBudgetFilter, setMaxBudgetFilter] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Card expanders
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Adding state
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // AI Live Custom Game Scanner
  const [aiScannerOpen, setAiScannerOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customPlatform, setCustomPlatform] = useState("Steam");
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [isDiscoveringTrend, setIsDiscoveringTrend] = useState(false);

  // Shopee Competitor Intelligence Modal
  const [competitorModalGame, setCompetitorModalGame] = useState<any | null>(null);

  // Toast Notification
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchEnebaGames = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/research/eneba-crawler");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        setGames(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat katalog CDKey Eneba:", err);
      showToast("Gagal memuat data dari server Eneba Crawler.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnebaGames();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEnebaGames();
    setRefreshing(false);
    showToast("✅ Data peluang CDKey Eneba berhasil diperbarui!");
  };

  // Add Single Game to Catalog
  const handleAddSingleGame = async (game: EnebaScannedGame) => {
    setAddingId(game.id);
    try {
      const res = await fetch("/api/research/eneba-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "single_import", game }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setAddedIds((prev) => new Set([...Array.from(prev), game.id]));
        if (json.allGames && Array.isArray(json.allGames)) {
          try {
            localStorage.setItem("akshara_custom_catalog_v2", JSON.stringify(json.allGames));
          } catch (e) {}
        }
        showToast(`✅ "${game.title}" (Eneba CDKey) berhasil disimpan aman ke Radar Katalog!`);
      } else {
        showToast(json.message || "Gagal menyimpan game.", "error");
      }
    } catch (err) {
      showToast("Kesalahan koneksi saat menyimpan game.", "error");
    } finally {
      setAddingId(null);
    }
  };

  // Bulk Import
  const handleBulkImport = async () => {
    const unaddedFiltered = filteredGames.filter((g) => !addedIds.has(g.id));
    if (unaddedFiltered.length === 0) {
      showToast("Semua CDKey dalam filter ini sudah ada di dalam katalog!", "error");
      return;
    }

    setIsBulkImporting(true);
    try {
      const res = await fetch("/api/research/eneba-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_import" }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setAddedIds((prev) => {
          const next = new Set(Array.from(prev));
          unaddedFiltered.forEach((g) => next.add(g.id));
          return next;
        });
        if (json.allGames && Array.isArray(json.allGames)) {
          try {
            localStorage.setItem("akshara_custom_catalog_v2", JSON.stringify(json.allGames));
          } catch (e) {}
        }
        showToast(`⚡ ${json.importedCount || unaddedFiltered.length} Digital CDKey berhasil diimpor dan tersimpan permanen di Katalog Radar!`);
      } else {
        showToast(json.message || "Gagal bulk import.", "error");
      }
    } catch (err) {
      showToast("Gagal melakukan bulk import karena masalah jaringan.", "error");
    } finally {
      setIsBulkImporting(false);
    }
  };

  // AI Live Scan
  
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
        showToast(`🎯 Trend Ditemukan: ${json.data.title} (${json.data.arbitrage_verdict})!`);
      } else {
        showToast(json.message || "Gagal menemukan trend.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan saat mencari trend.", "error");
    } finally {
      setIsDiscoveringTrend(false);
    }
  };

  const handleCustomAiScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    setIsAiScanning(true);
    try {
      const res = await fetch("/api/research/eneba-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search_ai",
          query: customTitle.trim(),
          platform: customPlatform,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success" && json.data) {
        setGames((prev) => [json.data, ...prev]);
        setCustomTitle("");
        showToast(`AI berhasil memindai Digital Key untuk "${json.data.title}"!`);
      } else {
        showToast(json.message || "Gagal memindai game via AI.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan saat menghubungi AI Eneba.", "error");
    } finally {
      setIsAiScanning(false);
    }
  };

  // Apply Competitor Price
  const handleApplyCompetitorPriceInEneba = (newPrice: number) => {
    if (!competitorModalGame) return;
    setGames((prev) =>
      prev.map((g) => {
        if (g.id === competitorModalGame.id) {
          const qris = Math.round(g.price_eneba_idr * 0.007);
          const shopee = Math.round(newPrice * 0.08) + 1000;
          const profit = newPrice - g.price_eneba_idr - qris - shopee - 2000;
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

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
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

  // Filtered CDKey Games
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      // Platform filter
      if (selectedPlatform !== "ALL" && !g.platform.toLowerCase().includes(selectedPlatform.toLowerCase())) {
        return false;
      }

      // Key Type filter
      if (selectedKeyType !== "ALL" && !g.key_type.toLowerCase().includes(selectedKeyType.toLowerCase())) {
        return false;
      }

      // Margin filter
      if (minMarginFilter > 0 && g.net_margin_pct < minMarginFilter) {
        return false;
      }

      // Budget filter
      if (maxBudgetFilter > 0 && g.price_eneba_idr > maxBudgetFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = g.title.toLowerCase().includes(q);
        const mSeller = g.seller_name.toLowerCase().includes(q);
        const mKey = g.key_type.toLowerCase().includes(q);
        const mReason = g.tactical_reason.toLowerCase().includes(q);
        if (!mTitle && !mSeller && !mKey && !mReason) return false;
      }

      return true;
    });
  }, [games, selectedPlatform, selectedKeyType, minMarginFilter, maxBudgetFilter, searchQuery]);

  // Statistics
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
        <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:max-w-md z-50 p-4 rounded-xl bg-zinc-950/95 border border-violet-500/40 text-sm text-violet-300 font-mono flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className={notification.type === "error" ? "text-rose-300" : ""}>
            {notification.message}
          </span>
          <button onClick={() => setNotification(null)} className="ml-auto text-slate-500 hover:text-white">
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
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-violet-400 font-semibold">
              Eneba CDKey Terminal
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <span>Eneba Terminal — Official Digital CDKey Radar</span>
          </h1>

          <p className="text-[13px] text-slate-400 mt-2 max-w-3xl leading-relaxed">
            Kurasi khusus Digital CDKey &amp; Redeem Code resmi dari <strong className="text-violet-300 font-semibold">eneba.com/id</strong>. 
            Keuntungan maksimal tanpa risiko komplain (<strong className="text-emerald-400 font-semibold">0% Hackback</strong>) karena kode langsung di-redeem ke akun pribadi pembeli. Mendukung pembayaran lokal Indonesia via <strong className="text-white">QRIS (Fee 0.7%)</strong>, DANA, dan OVO.
          </p>

          <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-950/40 border border-violet-500/30 text-[11px] font-mono text-violet-300">
            <span>💡</span>
            <span>
              <strong>Pricelist Terkalibrasi Live:</strong> Kurs USD aktual (~Rp 16.200) + service fee checkout Eneba (~10-12%). Contoh: Minecraft Java &amp; Bedrock (~Rp 315.000), Project Zomboid (~Rp 118.000).
            </span>
          </div>

          {/* Supplier Gateway Quick Switcher */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-1 text-[11px] font-mono">
            <span className="text-slate-500">Gateway Supplier:</span>
            <span className="px-3 py-1 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold flex items-center gap-1.5 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              ⚡ Eneba CDKey (Aktif)
            </span>
            <Link
              href="/dashboard/research"
              className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-colors font-medium"
              title="Buka Research Center G2G untuk produk Akun"
            >
              <span>🎮 G2G Research Center ↗</span>
            </Link>
            <Link
              href="/dashboard/catalog"
              className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-800 flex items-center gap-1.5 transition-colors"
            >
              <span>Portofolio Radar ↗</span>
            </Link>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="v0-btn-secondary px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 transition-all cursor-pointer select-none"
            title="Muat ulang data crawler Eneba"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-violet-400" : ""}`} />
            <span>{refreshing ? "Memuat..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => setAiScannerOpen(!aiScannerOpen)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20 cursor-pointer select-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiScannerOpen ? "Tutup Scanner AI" : "Scan CDKey Baru"}</span>
          </button>
          
          <button
            type="button"
            onClick={handleDiscoverTrend}
            disabled={isDiscoveringTrend || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer select-none"
          >
            <Flame className={`w-3.5 h-3.5 ${isDiscoveringTrend ? "animate-pulse" : ""}`} />
            <span>{isDiscoveringTrend ? "Mencari Trend..." : "Auto-Discover Trend"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="v0-card rounded-2xl p-4 border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-zinc-950 to-zinc-950">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-violet-400" />
            <span>Peluang Terindeks</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            {stats.count} <span className="text-xs font-normal text-violet-400">Digital Keys</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">100% Verified Eneba</div>
        </div>

        <div className="v0-card rounded-2xl p-4 border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rata-Rata Margin</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            +{formatNum(stats.avgMargin)}%
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">Bersih setelah fee Shopee</div>
        </div>

        <div className="v0-card rounded-2xl p-4 border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-zinc-950 to-zinc-950">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Potensi Profit Total</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400 tracking-tight">
            {formatRp(stats.totalProfit)}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">Akumulasi per 1 unit terjual</div>
        </div>

        <div className="v0-card rounded-2xl p-4 border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 via-zinc-950 to-zinc-950">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Keamanan Sourcing</span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-300 tracking-tight flex items-center gap-1.5">
            <span>0% Hackback</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">QRIS 0.7% Instant Pay</div>
        </div>
      </div>

      {/* AI Live Custom Game Scanner Box (Collapsible) */}
      {aiScannerOpen && (
        <div className="v0-card rounded-2xl p-5 border border-violet-500/30 bg-zinc-950/90 shadow-2xl animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Eneba AI Digital Key Arbitrage Scanner
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
              Powered by Gemini
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
            Ketikkan nama game apa saja yang ingin Anda telusuri di Eneba. AI kami akan menghitung perkiraan modal kulakan Eneba IDR, harga pasaran Shopee, potongan QRIS (0.7%), fee marketplace Shopee, serta panduan aktivasi resminya.
          </p>

          <form onSubmit={handleCustomAiScan} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Contoh: Monster Hunter Wilds, Dragon Ball Sparking Zero, Resident Evil..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                required
              />
            </div>

            <select
              value={customPlatform}
              onChange={(e) => setCustomPlatform(e.target.value)}
              className="w-full sm:w-44 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="Steam">Steam (Global)</option>
              <option value="Xbox / Microsoft">Xbox / Microsoft</option>
              <option value="GOG">GOG (DRM-Free)</option>
              <option value="EA App">EA App / PC</option>
              <option value="Nintendo Switch">Nintendo Switch</option>
            </select>

            <button
              type="submit"
              disabled={isAiScanning || !customTitle.trim()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isAiScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scan Peluang</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Filter Bar specifically tailored for Eneba CDKeys */}
      <div className="v0-card rounded-2xl p-4 sm:p-5 space-y-4 border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Minimum Margin Filter */}
          <div className="space-y-1.5 flex-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-violet-400" />
              <span>Saring Margin Bersih:</span>
            </label>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800 overflow-x-auto">
              {[
                { val: 0, label: `Semua (${filteredGames.length})` },
                { val: 35, label: "🔥 Super Arbitrage (>35%)" },
                { val: 25, label: "💎 High Margin (>25%)" },
                { val: 15, label: "⚡ Margin Sehat (>15%)" },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setMinMarginFilter(tab.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    minMarginFilter === tab.val
                      ? "bg-violet-600 text-white font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Batas Modal Kulakan Eneba:</span>
            </label>
            <select
              value={maxBudgetFilter}
              onChange={(e) => setMaxBudgetFilter(Number(e.target.value))}
              className="bg-zinc-950/90 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-violet-500 w-full sm:w-56"
            >
              <option value={0}>Semua Budget Modal</option>
              <option value={100000}>Budget Ringan (&lt; Rp 100.000)</option>
              <option value={200000}>Budget Menengah (&lt; Rp 200.000)</option>
              <option value={400000}>Budget Populer (&lt; Rp 400.000)</option>
              <option value={800000}>Budget AAA / Flagship (&lt; Rp 800.000)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter: Platform, Key Type, Live Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">Semua Platform</option>
              <option value="Steam">Steam (PC)</option>
              <option value="Xbox">Xbox / Microsoft</option>
              <option value="GOG">GOG</option>
              <option value="Nintendo">Nintendo</option>
              <option value="EA">EA App / Origin</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">Tipe Key:</span>
            <select
              value={selectedKeyType}
              onChange={(e) => setSelectedKeyType(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">Semua Tipe Key</option>
              <option value="Global">Global Key</option>
              <option value="Steam">Steam Key</option>
              <option value="GOG">GOG Key</option>
              <option value="Xbox">Xbox Key</option>
            </select>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul game, merchant Eneba, atau taktik CDKey..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          {(selectedPlatform !== "ALL" ||
            selectedKeyType !== "ALL" ||
            minMarginFilter > 0 ||
            maxBudgetFilter > 0 ||
            searchQuery) && (
            <button
              onClick={() => {
                setSelectedPlatform("ALL");
                setSelectedKeyType("ALL");
                setMinMarginFilter(0);
                setMaxBudgetFilter(0);
                setSearchQuery("");
              }}
              className="text-xs font-mono text-rose-400 hover:underline shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bulk Import Action Banner */}
      <div className="v0-card rounded-2xl p-4 sm:p-5 border-violet-500/30 bg-gradient-to-r from-violet-950/30 via-zinc-950 to-indigo-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 shrink-0">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{filteredGames.length} Peluang Digital CDKey Resmi Terpilih</span>
              {minMarginFilter > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Margin &gt;{minMarginFilter}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {stats.unaddedCount > 0
                ? `Ada ${stats.unaddedCount} Digital Key yang belum ada di Katalog Radar Anda. Klik tombol di kanan untuk mengimpor sekaligus!`
                : "Semua Digital Key dalam filter ini sudah aktif di dalam Katalog Radar & Supabase!"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBulkImport}
          disabled={isBulkImporting || stats.unaddedCount === 0}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 transition-all cursor-pointer select-none"
        >
          {isBulkImporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Mengimpor ke Supabase...</span>
            </>
          ) : (
            <>
              <DownloadCloud className="w-4 h-4 text-white" />
              <span>Bulk Import ({stats.unaddedCount} CDKey Baru)</span>
            </>
          )}
        </button>
      </div>

      {/* CDKey Opportunity Cards Grid */}
      {loading ? (
        <div className="space-y-4">
          <div className="v0-card rounded-2xl h-40 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-40 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-40 animate-pulse bg-white/[0.02]" />
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="v0-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Key className="w-10 h-10 text-violet-500/40" />
          <div className="text-slate-200 font-medium text-base">
            Tidak ada Digital CDKey yang cocok dengan kriteria filter saat ini
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Coba turunkan batas minimum margin atau ubah filter budget kulakan.
          </p>
          <button
            onClick={() => {
              setSelectedPlatform("ALL");
              setSelectedKeyType("ALL");
              setMinMarginFilter(0);
              setMaxBudgetFilter(0);
              setSearchQuery("");
            }}
            className="v0-btn-secondary text-xs font-mono px-4 py-2 rounded-xl mt-2"
          >
            Tampilkan Semua {games.length} Digital Key
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
                className="v0-card rounded-2xl overflow-hidden border border-white/[0.08] hover:border-violet-500/40 transition-all group"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Verdict Badge, Platform, Key Type, Demand */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-violet-400" />
                        ENEBA OFFICIAL CDKEY
                      </span>

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
                          ? "🔥 SUPER ARBITRAGE (>35%)"
                          : game.arbitrage_verdict === "HIGH_MARGIN"
                          ? "💎 HIGH MARGIN (>25%)"
                          : game.arbitrage_verdict === "FAST_ROTATION"
                          ? "⚡ FAST ROTATION"
                          : "🛡️ STEADY PROFIT"}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-slate-300 border border-zinc-800">
                        {game.platform}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-[11px] font-mono text-violet-300/80">{game.key_type}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-500">
                        Demand Score:{" "}
                        <strong className="text-violet-400 font-bold">{game.demand_score}/100</strong>
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
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono">
                        <span className="text-violet-300 font-semibold">Supplier Eneba:</span>
                        <a
                          href={game.eneba_direct_url}
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
                      </div>
                    </div>

                    {/* Visual Pricing & Margin Highlight */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-zinc-950/80 p-3.5 rounded-xl border border-white/[0.05]">
                      {/* Eneba Buy Price */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                          Modal Eneba (Beli)
                        </span>
                        <span className="text-sm font-bold text-violet-400">
                          {formatRp(game.price_eneba_idr)}
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
                  <div className="p-3.5 rounded-xl bg-violet-950/15 border border-violet-500/20 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-violet-300 font-semibold">
                        Keunggulan Arbitrase Digital CDKey Ini:{" "}
                      </strong>
                      <span>{game.tactical_reason}</span>
                    </div>
                  </div>

                  {/* Expandable Tactical Tip & Full Breakdown */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-3 font-mono text-xs animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/25 space-y-2">
                          <div className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Direct Eneba CDKey Gateway:
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                            Digital Key resmi bergaransi 0% hackback. Merchant Eneba:{" "}
                            <strong className="text-white">{game.seller_name}</strong> (Rating {game.seller_rating_pct}%).
                            Format kode lisensi digital langsung di-redeem oleh pembeli tanpa risiko akun/password pihak ketiga.
                          </p>
                          {game.instant_redeem_guide && (
                            <div className="p-2.5 rounded-lg bg-zinc-950/90 border border-violet-500/30 text-[11px] text-violet-200">
                              <span className="font-semibold text-violet-300 block mb-1">Panduan Aktivasi Pembeli:</span>
                              <span className="text-slate-300 font-sans text-xs">{game.instant_redeem_guide}</span>
                            </div>
                          )}
                          <a
                            href={game.eneba_direct_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-semibold underline pt-1"
                          >
                            <span>Buka Penawaran di Eneba.com/id Langsung</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1.5 text-[11px]">
                          <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                            <span>Kalkulasi Potongan Marketplace:</span>
                            <span className="text-emerald-400 font-bold">
                              Laba Bersih: {formatRp(game.net_profit_idr)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Fee QRIS Kulakan Eneba (0.7%):</span>
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
                          <ChevronDown className="w-3.5 h-3.5" /> Rincian Potongan &amp; Panduan Redeem
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      {/* Direct Eneba Listing */}
                      <a
                        href={game.eneba_direct_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-violet-950/70 hover:bg-violet-900/80 text-violet-200 border border-violet-500/40 flex items-center gap-1.5 transition-colors"
                        title="Buka listing game resmi di Eneba.com/id"
                      >
                        <Zap className="w-3 h-3 text-violet-400" />
                        <span>Buka Eneba</span>
                      </a>

                      {/* Shopee Competitor Radar Modal */}
                      <button
                        type="button"
                        onClick={() =>
                          setCompetitorModalGame({
                            id: game.id,
                            title: game.title,
                            platform: game.platform,
                            price_g2g_idr: game.price_eneba_idr,
                            recommended_shopee_price_idr: game.recommended_shopee_price_idr,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Radar Kompetitor Shopee & AI Pricing Advisor"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                        <span>Radar Kompetitor</span>
                      </button>

                      {/* Direct Shopee Search */}
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

                      {/* Connect to The Quant */}
                      <Link
                        href={`/dashboard/quant?cogs=${game.price_eneba_idr}&price=${game.recommended_shopee_price_idr}&title=${encodeURIComponent(
                          game.title
                        )}&supplier=Eneba`}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-700/80 flex items-center gap-1.5 transition-colors"
                        title="Simulasikan di The Quant"
                      >
                        <BarChart3 className="w-3 h-3 text-emerald-400" />
                        <span>The Quant</span>
                      </Link>

                      {/* Connect to AI Delivery Formatter */}
                      <Link
                        href={`/dashboard/formatter`}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-colors"
                        title="Buka AI Formatter Pengiriman"
                      >
                        <Send className="w-3 h-3 text-purple-400" />
                        <span>Formatter</span>
                      </Link>

                      {/* Single Add to Catalog */}
                      <button
                        type="button"
                        onClick={() => handleAddSingleGame(game)}
                        disabled={isAlreadyAdded || isAdding}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md select-none ${
                          isAlreadyAdded
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20 cursor-pointer"
                        }`}
                      >
                        {isAdding ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
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
                            <span>+ Masukkan ke Katalog</span>
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

      {/* Shopee Competitor Modal */}
      {competitorModalGame && (
        <ShopeeCompetitorModal
          isOpen={!!competitorModalGame}
          onClose={() => setCompetitorModalGame(null)}
          gameTitle={competitorModalGame.title}
          platform={competitorModalGame.platform}
          currentPriceIdr={competitorModalGame.recommended_shopee_price_idr}
          costG2gIdr={competitorModalGame.price_g2g_idr}
          onApplyPrice={handleApplyCompetitorPriceInEneba}
        />
      )}
    </div>
  );
}
