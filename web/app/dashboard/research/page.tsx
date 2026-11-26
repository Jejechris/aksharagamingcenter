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
  Flame,
  Zap,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Info,
  ChevronDown,
  ChevronUp,
  Bot,
  Terminal,
  Sliders,
  DownloadCloud,
  Play,
} from "lucide-react";
import { G2GScannedGame } from "@/app/api/research/g2g-crawler/route";
import { resolveG2GProductUrl } from "@/lib/g2g";
import {
  SHOPEE_FEE_PRESETS,
  ShopeeFeePresetId,
  DEFAULT_FX_BUFFER_PCT,
  calculateShopeeEconomics,
} from "@/lib/pricing";
import ShopeeCompetitorModal from "@/app/components/ShopeeCompetitorModal";
import ResearchReviewModal from "@/app/components/ResearchReviewModal";

export default function ResearchCenterPage() {
  // G2G Autonomous Crawler State
  const [scannedGames, setScannedGames] = useState<G2GScannedGame[]>([]);
  const [latestLiveExtracted, setLatestLiveExtracted] = useState<G2GScannedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanningBot, setIsScanningBot] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "BOT KONEKSI: Siap menjelajahi g2g.com/id & eneba.com secara otomatis.",
    "STATUS: 24 item arbitrase terindeks dengan rating supplier >99%.",
  ]);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "ENEBA" | "G2G">("ALL");
  const [minMarginFilter, setMinMarginFilter] = useState<number>(0);
  const [maxBudgetFilter, setMaxBudgetFilter] = useState<number>(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [feePreset, setFeePreset] = useState<ShopeeFeePresetId>("reguler");
  const [fxBufferEnabled, setFxBufferEnabled] = useState(false);
  const [sortBy, setSortBy] = useState<"margin_desc" | "profit_desc" | "price_asc">("margin_desc");

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
  const [isDiscoveringTrend, setIsDiscoveringTrend] = useState(false);
  const [discoverCount, setDiscoverCount] = useState<number>(5);

  // Shopee Competitor Modal
  const [competitorModalGame, setCompetitorModalGame] = useState<G2GScannedGame | null>(null);

  // Pre-Save Research Staging Modal (Sort & Cek sebelum masuk DB)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewCandidates, setReviewCandidates] = useState<any[]>([]);
  const [reviewModalTitle, setReviewModalTitle] = useState("Review Hasil Research Sebelum Masuk Database");
  const [isSavingReview, setIsSavingReview] = useState(false);

  const handleApplyCompetitorPriceInResearch = (newPrice: number) => {
    if (!competitorModalGame) return;
    setScannedGames((prev) =>
      prev.map((g) => {
        if (g.id === competitorModalGame.id) {
          const qris = Math.round(g.price_g2g_idr * 0.007);
          const shopee = Math.round(newPrice * 0.08) + 1000;
          // Full Digital Mode: 0 operational fee
          const profit = newPrice - g.price_g2g_idr - qris - shopee;
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
        fetch("/api/research/g2g-crawler", { cache: "no-store" }),
        fetch("/api/research/eneba-crawler", { cache: "no-store" }),
      ]);
      const g2gJson = await g2gRes.json();
      const enebaJson = await enebaRes.json();

      const combined: any[] = [];
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

  const [freshSteamOnly, setFreshSteamOnly] = useState(true);

  // Trigger Autonomous Robot Crawler (Real G2G SLS Live Extraction)
  const handleRunRobotScanner = async () => {
    setIsScanningBot(true);
    setTerminalOpen(true);
    setTerminalLogs([
      `[${new Date().toLocaleTimeString("id-ID")}] [ROBOT-INIT] Mengaktifkan autonomous web scraper robot...`,
      `[${new Date().toLocaleTimeString("id-ID")}] [GATEWAY] Menghubungkan ke https://sls.g2g.com & Eneba live API...`,
    ]);

    try {
      const res = await fetch("/api/research/g2g-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "crawl", preview_only: true, freshOnly: freshSteamOnly }),
      });
      const json = await res.json();

      if (res.ok && json.status === "success") {
        if (Array.isArray(json.logs) && json.logs.length > 0) {
          setTerminalLogs(json.logs);
        }

        if (Array.isArray(json.extracted_results) && json.extracted_results.length > 0) {
          setLatestLiveExtracted(json.extracted_results);
          setReviewCandidates(json.extracted_results);
          setReviewModalTitle(`Review Hasil Robot Crawler G2G (${json.extracted_results.length} Kandidat)`);
          setReviewModalOpen(true);
          showToast(`🔍 Robot menemukan ${json.extracted_results.length} penawaran live. Silakan cek & sortir sebelum menyimpan ke DB!`);
        } else {
          showToast("🚀 Sinkronisasi live SLS selesai tanpa perubahan penawaran baru.");
        }
      } else {
        showToast(json.message || "Gagal menjalankan crawler robot.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Kesalahan jaringan saat menjalankan crawler.", "error");
    } finally {
      setIsScanningBot(false);
    }
  };

  // Auto-Discover Trend (Multi-Game Pre-Save Review Mode)
  const handleDiscoverTrend = async () => {
    setIsDiscoveringTrend(true);
    try {
      const res = await fetch("/api/research/eneba-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover_trend", count: discoverCount, preview_only: true }),
      });
      const json = await res.json();
      const rawItems = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      if (res.ok && json.status === "success" && rawItems.length > 0) {
        const mapped = rawItems.map((it: any) => ({
          ...it,
          source_marketplace: "ENEBA",
          price_g2g_idr: it.price_eneba_idr || it.price_g2g_idr,
          g2g_direct_url: it.eneba_direct_url || it.g2g_direct_url,
          g2g_category_slug: "eneba-cdkey",
        }));
        setReviewCandidates(mapped);
        setReviewModalTitle(`Review Auto-Discover Trend (${mapped.length} Game Terverifikasi)`);
        setReviewModalOpen(true);
        showToast(
          `🎯 Ditemukan ${mapped.length} game trending live. Sortir & cek harga asli sebelum simpan ke DB!`
        );
      } else {
        showToast(json.message || "Gagal mencari trend game saat ini.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan saat mencari trend.", "error");
    } finally {
      setIsDiscoveringTrend(false);
    }
  };

  // Add 1 Game to Catalog (supports both Eneba and G2G)
  const handleAddSingleGame = async (game: any) => {
    setAddingId(game.id);
    try {
      const isEneba = game.source_marketplace === "ENEBA";
      const endpoint = isEneba ? "/api/research/eneba-crawler" : "/api/research/g2g-crawler";
      const payload = { action: "single_import", game };

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
            localStorage.setItem("akshara_custom_catalog_v3", JSON.stringify(json.allGames));
          } catch (e) {}
        }
        showToast(
          `✅ "${game.title}" (${isEneba ? "Eneba CDKey" : "G2G"}) berhasil tersimpan ke Katalog!`
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
          body: JSON.stringify({ action: "bulk_import", games: enebaGames }),
        });
        const eJson = await res.json();
        if (res.ok && eJson.status === "success") {
          successCount += eJson.importedCount || enebaGames.length;
          if (eJson.allGames && Array.isArray(eJson.allGames)) {
            try {
              localStorage.setItem("akshara_custom_catalog_v3", JSON.stringify(eJson.allGames));
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
              localStorage.setItem("akshara_custom_catalog_v3", JSON.stringify(gJson.allGames));
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
          preview_only: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success" && json.data) {
        const isEnebaRes = json.source_marketplace === "ENEBA";
        const tel = json.market_telemetry || {};
        const customGame: any = {
          id: json.data.id || `manual-${Date.now()}`,
          title: json.data.title,
          platform: json.data.platform,
          category: json.data.category,
          source_marketplace: isEnebaRes ? "ENEBA" : "G2G",
          g2g_category_slug: isEnebaRes ? "eneba-cdkey" : "steam-accounts",
          g2g_direct_url: json.data.profile_url || "https://www.g2g.com/categories/steam-global-account",
          eneba_direct_url: isEnebaRes ? json.data.profile_url : undefined,
          price_eneba_idr: isEnebaRes ? json.data.g2g_price_idr : undefined,
          eneba_base_price_idr: tel.eneba_base_price_idr || 0,
          eneba_live_verified: Boolean(tel.eneba_live_verified),
          cheapshark_usd: tel.cheapshark_usd || undefined,
          arbitrage_viable: tel.arbitrage_viable ?? true,
          arbitrage_warning: tel.arbitrage_warning,
          data_source: tel.data_source || "ai_estimated",
          seller_name: json.data.best_supplier.name,
          seller_rating_pct: json.data.best_supplier.rating_pct,
          seller_reviews_count: json.data.best_supplier.reviews_count,
          supplier_tier: "ultra_safe",
          price_g2g_idr: json.data.g2g_price_idr,
          recommended_shopee_price_idr: json.data.shopee_retail_price_idr,
          steam_indo_price_idr: json.data.steam_indo_price_idr || json.data.shopee_retail_price_idr * 1.5,
          qris_fee_idr: json.data.qris_fee_idr,
          shopee_fee_idr: json.data.shopee_fee_idr,
          operational_fee_idr: 0,
          net_profit_idr: json.data.net_profit_idr,
          net_margin_pct: json.data.net_margin_pct,
          spread_pct: json.data.spread_pct,
          demand_score: json.data.demand_score,
          competition_level: json.data.competition_level,
          arbitrage_verdict: json.data.net_margin_pct >= 40 ? "SUPER_OPPORTUNITY" : "HIGH_MARGIN",
          crawl_timestamp: "Live Market Scan",
          tactical_reason: json.data.arbitrage_reason,
        };

        setReviewCandidates([customGame]);
        setReviewModalTitle(`Review Hasil Scan Manual: ${customGame.title}`);
        setReviewModalOpen(true);
        showToast(`🔍 Hasil scan "${customGame.title}" siap direview sebelum disimpan!`);
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

  const handleConfirmSaveReview = async (selectedItems: any[], alsoAddToCatalog: boolean) => {
    if (!selectedItems || selectedItems.length === 0) return;
    setIsSavingReview(true);
    try {
      const enebaItems = selectedItems.filter((g) => g.source_marketplace === "ENEBA");
      const g2gItems = selectedItems.filter((g) => g.source_marketplace !== "ENEBA");

      if (enebaItems.length > 0) {
        await fetch("/api/research/eneba-crawler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save_research", games: enebaItems }),
        });
        if (alsoAddToCatalog) {
          await fetch("/api/research/eneba-crawler", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bulk_import", games: enebaItems }),
          });
        }
      }

      if (g2gItems.length > 0) {
        await fetch("/api/research/g2g-crawler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save_research", games: g2gItems }),
        });
        if (alsoAddToCatalog) {
          await fetch("/api/research/g2g-crawler", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bulk_import", games: g2gItems }),
          });
        }
      }

      await fetchScannedGames();
      setReviewModalOpen(false);
      showToast(
        alsoAddToCatalog
          ? `✅ ${selectedItems.length} game disimpan ke DB Radar & Katalog Jualan!`
          : `✅ ${selectedItems.length} game pilihan Anda disimpan ke Database Radar!`
      );
    } catch {
      showToast("Gagal menyimpan hasil review ke database.", "error");
    } finally {
      setIsSavingReview(false);
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

  // Synchronized live margin & profit recalculation
  const gamesWithLiveEco = useMemo(() => {
    const fxPct = fxBufferEnabled ? DEFAULT_FX_BUFFER_PCT : 0;
    return scannedGames.map((g) => {
      const eco = calculateShopeeEconomics({
        sellingPriceIdr: g.recommended_shopee_price_idr,
        cogsIdr: g.price_g2g_idr,
        presetId: feePreset,
        fxBufferPct: fxPct,
        packagingCostIdr: 0,
      });
      return {
        ...g,
        qris_fee_idr: eco.qrisFeeIdr + eco.fxBufferIdr,
        shopee_fee_idr: eco.shopeeFeeIdr,
        net_profit_idr: eco.netProfitIdr,
        net_margin_pct: eco.netMarginPct,
      };
    });
  }, [scannedGames, feePreset, fxBufferEnabled]);

  const preMarginGames = useMemo(() => {
    return gamesWithLiveEco.filter((g) => {
      if (sourceFilter === "ENEBA" && (g as any).source_marketplace !== "ENEBA") return false;
      if (sourceFilter === "G2G" && (g as any).source_marketplace === "ENEBA") return false;
      if (maxBudgetFilter > 0 && g.price_g2g_idr > maxBudgetFilter) return false;
      if (selectedPlatform !== "ALL" && !g.platform.toLowerCase().includes(selectedPlatform.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesSeller = g.seller_name.toLowerCase().includes(q);
        const matchesReason = g.tactical_reason.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSeller && !matchesReason) return false;
      }
      return true;
    });
  }, [gamesWithLiveEco, sourceFilter, maxBudgetFilter, selectedPlatform, searchQuery]);

  const marginCounts = useMemo(() => {
    return {
      all: preMarginGames.length,
      positive: preMarginGames.filter((g) => g.net_profit_idr > 0).length,
      healthy: preMarginGames.filter((g) => g.net_margin_pct >= 15).length,
      good: preMarginGames.filter((g) => g.net_margin_pct >= 20).length,
      super: preMarginGames.filter((g) => g.net_margin_pct >= 30).length,
    };
  }, [preMarginGames]);

  // Filtered & Sorted Games Calculation
  const filteredGames = useMemo(() => {
    const list = preMarginGames.filter((g) => {
      if (minMarginFilter > 0 && minMarginFilter < 1) return g.net_profit_idr > 0;
      if (minMarginFilter >= 1 && g.net_margin_pct < minMarginFilter) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === "profit_desc") return b.net_profit_idr - a.net_profit_idr;
      if (sortBy === "price_asc") return a.price_g2g_idr - b.price_g2g_idr;
      return b.net_margin_pct - a.net_margin_pct;
    });
  }, [preMarginGames, minMarginFilter, sortBy]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-slate-900">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-slate-900 text-white text-sm font-sans flex items-center gap-3 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 max-w-md">
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="flex-1 leading-snug">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-base leading-none px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-800 font-mono transition-colors"
            >
              Command Deck
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-mono text-emerald-700 font-medium">Research Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Compass className="w-5 h-5" />
            </div>
            Research Center — Autonomous Arbitrage Crawler
          </h1>
          <p className="text-[13px] text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Sistem robot AI yang menjelajah <strong>g2g.com/id</strong> &amp; <strong>eneba.com</strong> secara otonom.
            Membandingkan harga beli supplier global vs harga retail Indonesia (Shopee &amp; Steam),
            memotong seluruh fee transaksi, dan memfilter game berpeluang laba bersih maksimal.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-[11px]">AUTONOMOUS CRAWLER ACTIVE</span>
            </div>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">Target: G2G.com/id &amp; Eneba</span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
              Verified Sellers &gt;99%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/catalog"
            className="text-xs font-mono flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium shadow-sm transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Katalog Radar</span>
          </Link>
          <div className="inline-flex items-center rounded-xl bg-amber-50 border border-amber-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={handleDiscoverTrend}
              disabled={isDiscoveringTrend || loading || isScanningBot}
              className="text-xs font-mono flex items-center gap-1.5 px-3 py-2 hover:bg-amber-100 text-amber-800 font-medium transition-colors disabled:opacity-50"
              title="Auto-discover beberapa game yang sedang tren di pasar global"
            >
              <Flame className={`w-3.5 h-3.5 text-amber-600 ${isDiscoveringTrend ? "animate-pulse" : ""}`} />
              <span>
                {isDiscoveringTrend
                  ? `Mencari ${discoverCount} Game...`
                  : `Auto-Discover Trend (${discoverCount})`}
              </span>
            </button>
            <select
              value={discoverCount}
              onChange={(e) => setDiscoverCount(Number(e.target.value))}
              disabled={isDiscoveringTrend || loading || isScanningBot}
              aria-label="Jumlah game Auto-Discover Trend"
              className="bg-amber-100/80 text-amber-900 font-mono text-[11px] font-bold px-2 py-2 border-l border-amber-200 focus:outline-none cursor-pointer"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={8}>8</option>
            </select>
          </div>
          <button
            onClick={handleRunRobotScanner}
            disabled={isScanningBot}
            className="text-xs font-mono flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningBot ? "animate-spin" : ""}`} />
            <span>{isScanningBot ? "Robot Sedang Crawling..." : "Jalankan Crawler Bot"}</span>
          </button>
        </div>
      </div>

      {/* Autonomous Robot Telemetry Terminal Panel */}
      <div className="app-card rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-mono text-xs text-slate-700">
            <Terminal className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-900">Console Telemetri Robot Autonomous (G2G &amp; Eneba)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              LIVE RADAR
            </span>
          </div>
          <button
            onClick={() => setTerminalOpen(!terminalOpen)}
            className="text-slate-500 hover:text-slate-800 text-xs font-mono flex items-center gap-1 transition-colors"
          >
            {terminalOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{terminalOpen ? "Sembunyikan Log" : "Lihat Log"}</span>
          </button>
        </div>

        {terminalOpen && (
          <div className="p-4 sm:p-5 font-mono text-xs bg-slate-950 text-slate-300 space-y-1.5 max-h-48 overflow-y-auto border-b border-slate-200">
            {terminalLogs.map((log, idx) => (
              <div
                key={idx}
                className={`leading-relaxed ${
                  log.includes("[COMPLETE]")
                    ? "text-emerald-400 font-bold"
                    : log.includes("[FILTER")
                    ? "text-amber-300"
                    : log.includes("[ROBOT")
                    ? "text-sky-300 font-semibold"
                    : "text-slate-400"
                }`}
              >
                {log}
              </div>
            ))}
            {isScanningBot && (
              <div className="text-sky-400 flex items-center gap-2 pt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span>Robot sedang menganalisa listings &amp; supplier tier di G2G &amp; Eneba...</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Robot Control Strip */}
        <div className="p-3.5 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-slate-600" />
              <span>Target: <strong className="text-slate-800">Steam Accounts, CDKeys &amp; Global Keys</strong></span>
            </span>
            <span className="text-slate-300">•</span>
            <span>Fee Deducted: <strong className="text-slate-800">Shopee 8%+1k &amp; QRIS 0.7% (Ops: Rp 0)</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <label
              title="Anti-Hackback: Prioritaskan & saring offer Steam ke akun 0 Hours Played / Fresh New Account + Original Email"
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 cursor-pointer select-none transition-colors ${
                freshSteamOnly
                  ? "bg-teal-50 border-teal-300 text-teal-900"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <input
                type="checkbox"
                checked={freshSteamOnly}
                onChange={(e) => setFreshSteamOnly(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>🛡️ Steam 0h Fresh Only</span>
            </label>
            <button
              onClick={handleRunRobotScanner}
              disabled={isScanningBot}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-sm font-medium text-[11px] flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 text-emerald-600" />
              <span>Crawl Ulang G2G Sekarang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Hasil Ekstraksi Live (Jika ada hasil crawl terkini) */}
      {latestLiveExtracted.length > 0 && (
        <div className="app-card rounded-2xl p-5 border border-emerald-200 bg-emerald-50/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Ringkasan Hasil Ekstraksi Live</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {latestLiveExtracted.length} ITEM DIEKSTRAK
                  </span>
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Data live ditarik langsung dari server SLS G2G dengan konversi IDR 100% faktual.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("scanned-games-list");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-mono font-semibold flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              <span>Lihat Semua Hasil</span>
              <span>↓</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-emerald-200 bg-white">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Game</th>
                  <th className="px-4 py-2.5 font-semibold">Seller G2G</th>
                  <th className="px-4 py-2.5 font-semibold">Modal (IDR)</th>
                  <th className="px-4 py-2.5 font-semibold">Rekomendasi Shopee</th>
                  <th className="px-4 py-2.5 font-semibold">Net Profit</th>
                  <th className="px-4 py-2.5 font-semibold">Margin</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {latestLiveExtracted.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{item.title}</td>
                    <td className="px-4 py-2.5 text-slate-600">{item.seller_name}</td>
                    <td className="px-4 py-2.5 text-slate-900 font-bold tabular-nums">Rp {item.price_g2g_idr.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2.5 text-slate-900 font-bold tabular-nums">Rp {item.recommended_shopee_price_idr.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2.5 text-emerald-600 font-bold tabular-nums">+Rp {item.net_profit_idr.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2.5 font-bold tabular-nums text-emerald-700">{item.net_margin_pct}%</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleAddSingleGame(item)}
                        disabled={addingId === item.id || addedIds.has(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          addedIds.has(item.id)
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {addedIds.has(item.id) ? "Tersimpan" : addingId === item.id ? "Menyimpan..." : "+ Impor"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Game Terfilter
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
            {stats.count} Game
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>Total hasil scan</span>
            {stats.unaddedCount > 0 && (
              <span className="text-amber-700 font-semibold">{stats.unaddedCount} belum diimpor</span>
            )}
          </div>
        </div>

        <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Rata-Rata Net Margin
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight tabular-nums">
            {formatNum(stats.avgMargin)}%
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            Bersih setelah seluruh fee Shopee &amp; QRIS
          </div>
        </div>

        <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Spread Beli vs Jual
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 tracking-tight tabular-nums">
            +{formatNum(stats.maxSpread)}%
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            Peluang spread harga kulakan tertinggi
          </div>
        </div>

        <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Potensi Laba Terfilter
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
            {formatRp(stats.totalProfit)}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            Total akumulasi profit 1 unit
          </div>
        </div>
      </div>

      {/* Interactive Margin & Budget Filter Controls */}
      <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        {/* Supplier Source Switcher */}
        <div className="space-y-2 pb-3.5 border-b border-slate-200">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-600 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-violet-600" />
              <span>Pilih Channel Supplier Arbitrase:</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">QRIS / DANA Ready</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSourceFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
                sourceFilter === "ALL"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Semua Supplier ({scannedGames.length})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter("ENEBA")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                sourceFilter === "ENEBA"
                  ? "bg-violet-50 text-violet-700 border-violet-300 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50/50 hover:text-violet-700"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-violet-600" />
              <span>Eneba (Digital CDKey / 0% Hackback)</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter("G2G")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                sourceFilter === "G2G"
                  ? "bg-amber-50 text-amber-800 border-amber-300 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50/50 hover:text-amber-800"
              }`}
            >
              <span>G2G (Akun Steam &amp; Global)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          {/* Synchronized Margin Selector Tabs */}
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-600 font-semibold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Saring Margin Bersih ({SHOPEE_FEE_PRESETS[feePreset].shortLabel}):</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {Object.values(SHOPEE_FEE_PRESETS).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setFeePreset(preset.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        feePreset === preset.id
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {preset.shortLabel}
                    </button>
                  ))}
                </div>
                <label className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fxBufferEnabled}
                    onChange={(e) => setFxBufferEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 cursor-pointer"
                  />
                  <span>FX +{DEFAULT_FX_BUFFER_PCT}%</span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 overflow-x-auto">
              {[
                { val: 0, label: `Semua (${marginCounts.all})` },
                { val: 0.1, label: `💸 Untung (>0%) • ${marginCounts.positive}` },
                { val: 15, label: `⚡ Sehat (≥15%) • ${marginCounts.healthy}` },
                { val: 20, label: `💎 Bagus (≥20%) • ${marginCounts.good}` },
                { val: 30, label: `🔥 Super (≥30%) • ${marginCounts.super}` },
              ].map((tab) => (
                <button
                  key={tab.val}
                  type="button"
                  onClick={() => setMinMarginFilter(tab.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    minMarginFilter === tab.val
                      ? "bg-white text-slate-900 border border-slate-200 shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Modal Kulakan & Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-600 font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>Batas Modal:</span>
              </label>
              <select
                value={maxBudgetFilter}
                onChange={(e) => setMaxBudgetFilter(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-44"
              >
                <option value={0}>Semua Budget</option>
                <option value={50000}>Ringan (&lt; Rp 50.000)</option>
                <option value={150000}>Menengah (&lt; Rp 150.000)</option>
                <option value={300000}>Premium (&lt; Rp 300.000)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-600 font-semibold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Urutkan:</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-40"
              >
                <option value="margin_desc">Margin % Tertinggi</option>
                <option value="profit_desc">Laba Bersih (Rp)</option>
                <option value="price_asc">Modal Termurah</option>
              </select>
            </div>
          </div>
        </div>

        {/* Secondary Filter: Platform & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Platform</option>
              <option value="Steam">Steam</option>
              <option value="PC / Microsoft">PC / Microsoft</option>
              <option value="Rockstar / Steam">Rockstar Games</option>
              <option value="EA App">EA App</option>
            </select>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul game, seller (Sharktech, HellenWong...), atau strategi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
              className="text-xs font-mono text-rose-600 hover:underline shrink-0"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Bulk Import Action Banner */}
      <div className="app-card rounded-2xl p-4 sm:p-5 border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
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
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                  Margin &gt;{minMarginFilter}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-mono">
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
          className="whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isBulkImporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Mengimpor ke Supabase...</span>
            </>
          ) : (
            <>
              <DownloadCloud className="w-4 h-4 text-white" />
              <span>Bulk Import ({stats.unaddedCount} Game Baru)</span>
            </>
          )}
        </button>
      </div>

      {/* Scanned Game Arbitrage Cards Grid */}
      {loading ? (
        <div className="space-y-4">
          <div className="app-card rounded-2xl h-40 animate-pulse bg-slate-100 border border-slate-200" />
          <div className="app-card rounded-2xl h-40 animate-pulse bg-slate-100 border border-slate-200" />
          <div className="app-card rounded-2xl h-40 animate-pulse bg-slate-100 border border-slate-200" />
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="app-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 shadow-sm">
          <Compass className="w-10 h-10 text-slate-300" />
          <div className="text-slate-800 font-semibold text-base">
            Tidak ada game yang cocok dengan kriteria filter saat ini
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Coba turunkan batas minimum margin atau ubah filter budget modal kulakan.
          </p>
          <button
            onClick={() => {
              setMinMarginFilter(0);
              setMaxBudgetFilter(0);
              setSelectedPlatform("ALL");
              setSearchQuery("");
            }}
            className="text-xs font-mono px-4 py-2 rounded-xl mt-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium shadow-sm transition-colors"
          >
            Tampilkan Semua {scannedGames.length} Game
          </button>
        </div>
      ) : (
        <div id="scanned-games-list" className="space-y-4">
          {filteredGames.map((game) => {
            const isExpanded = !!expandedCards[game.id];
            const isAlreadyAdded = addedIds.has(game.id);
            const isAdding = addingId === game.id;

            return (
              <div
                key={game.id}
                className="app-card rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Verdict Badge, Platform, Demand */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {(game as any).persisted_in_research_db && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-sky-50 text-sky-700 border border-sky-200">
                          💾 DB RADAR
                        </span>
                      )}
                      {(game as any).arbitrage_viable === false && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          ENEBA &gt; STEAM ID
                        </span>
                      )}
                      {/* Live Extracted Badge */}
                      {game.is_live_extracted && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          LIVE EXTRACTED
                        </span>
                      )}

                      {/* Marketplace Source Badge */}
                      {(game as any).source_marketplace === "ENEBA" ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-violet-600" />
                          ENEBA DIGITAL CDKEY
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          G2G AKUN / ARBITRASE
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase ${
                          game.arbitrage_verdict === "SUPER_OPPORTUNITY"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : game.arbitrage_verdict === "HIGH_MARGIN"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : game.arbitrage_verdict === "FAST_ROTATION"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {game.platform}
                      </span>
                      <span className="text-slate-300 text-xs">•</span>
                      <span className="text-[11px] font-mono text-slate-500">{game.category}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-500">
                        Demand Score:{" "}
                        <strong className="text-sky-700 font-bold">{game.demand_score}/100</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">
                        Kompetisi Shopee:{" "}
                        <strong
                          className={
                            game.competition_level === "Rendah"
                              ? "text-emerald-700"
                              : game.competition_level === "Sedang"
                              ? "text-amber-700"
                              : "text-slate-700"
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
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {game.title}
                        {(game as any).key_type && (
                          <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                            {(game as any).key_type}
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
                        {(game as any).source_marketplace === "ENEBA" ? (
                          <>
                            <span className="text-violet-700 font-semibold">Supplier Eneba:</span>
                            <a
                              href={(game as any).eneba_direct_url || game.g2g_direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-violet-700 hover:text-violet-900 hover:underline flex items-center gap-1 font-semibold"
                            >
                              {game.seller_name} ★ {game.seller_rating_pct}% (
                              {game.seller_reviews_count.toLocaleString("id-ID")})
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-bold">
                              🛡️ 0% HACKBACK (REDEEM CODE RESMI)
                            </span>
                          </>
                        ) : (
                          <>
                            <span>Supplier G2G:</span>
                            <a
                              href={resolveG2GProductUrl(game.g2g_direct_url, game.seller_name, game.title)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 font-semibold"
                            >
                              {game.seller_name} ★ {game.seller_rating_pct}% (
                              {game.seller_reviews_count.toLocaleString("id-ID")})
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {game.supplier_tier === "ultra_safe" ? "🛡️ TOP VERIFIED" : "⚡ LOWEST PRICE"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Visual Pricing & Margin Highlight */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      {/* Buy Price */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                          {(game as any).source_marketplace === "ENEBA" ? "Modal Eneba (Beli)" : "Modal G2G (Beli)"}
                        </span>
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            (game as any).source_marketplace === "ENEBA" ? "text-violet-700" : "text-amber-800"
                          }`}
                        >
                          {formatRp(game.price_g2g_idr)}
                        </span>
                      </div>

                      {/* Spread Indicator */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-mono text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> +{formatNum(game.spread_pct)}% Spread
                        </span>
                      </div>

                      {/* Shopee Sell Price */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                          Rekomendasi Shopee
                        </span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatRp(game.recommended_shopee_price_idr)}
                        </span>
                        {game.steam_indo_price_idr > 0 && (
                          <span className="text-[10px] text-slate-400 block line-through tabular-nums">
                            Steam: {formatRp(game.steam_indo_price_idr)}
                          </span>
                        )}
                      </div>

                      {/* Net Profit & Margin Pill */}
                      <div className="border-l border-slate-200 pl-4 font-mono text-right">
                        <span className="text-[10px] text-emerald-700 font-semibold block uppercase tracking-wider">
                          Laba Bersih (+{formatNum(game.net_margin_pct)}%)
                        </span>
                        <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                          +{formatRp(game.net_profit_idr)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Strategic Reason Banner */}
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-900 font-semibold">
                        Mengapa Game Ini Berpeluang Arbitrase Besar:{" "}
                      </strong>
                      <span>{game.tactical_reason}</span>
                    </div>
                  </div>

                  {/* Expandable Tactical Tip & Full Breakdown */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-200 space-y-3 font-mono text-xs animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(game as any).source_marketplace === "ENEBA" ? (
                          <div className="p-3.5 rounded-xl bg-violet-50/60 border border-violet-200 space-y-2">
                            <div className="text-[11px] font-bold text-violet-800 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-violet-600" /> Direct Eneba CDKey Gateway:
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed font-sans">
                              Digital Key resmi bergaransi 0% hackback. Merchant Eneba:{" "}
                              <strong className="text-slate-900">{game.seller_name}</strong> (Rating {game.seller_rating_pct}%).
                              Format kode lisensi digital langsung di-redeem oleh pembeli tanpa risiko akun/password pihak ketiga.
                            </p>
                            {(game as any).instant_redeem_guide && (
                              <div className="p-2.5 rounded-lg bg-white border border-violet-200 text-[11px] text-violet-900">
                                <span className="font-semibold text-violet-700 block mb-1">Panduan Aktivasi Pembeli:</span>
                                <span className="text-slate-600 font-sans text-xs">{(game as any).instant_redeem_guide}</span>
                              </div>
                            )}
                            <a
                              href={(game as any).eneba_direct_url || game.g2g_direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-violet-700 hover:text-violet-900 font-semibold underline pt-1"
                            >
                              <span>Buka Penawaran di Eneba.com/id Langsung</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Direct G2G Category Gateway:
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed font-sans">
                              Robot memantau listing pada slug{" "}
                              <code className="text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                                {game.g2g_category_slug}
                              </code>
                              . Seller {game.seller_name} memiliki {game.seller_reviews_count.toLocaleString("id-ID")}{" "}
                              ulasan positif dengan sistem Instant Delivery (kredensial langsung otomatis terkirim
                              setelah checkout kulakan).
                            </p>
                            <a
                              href={resolveG2GProductUrl(game.g2g_direct_url, game.seller_name, game.title)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline pt-1"
                            >
                              <span>Buka Listing G2G.com/id Langsung</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                          <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                            <span>Kalkulasi Potongan Marketplace:</span>
                            <span className="text-emerald-600 font-bold tabular-nums">
                              Laba Bersih: {formatRp(game.net_profit_idr)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>
                              {(game as any).source_marketplace === "ENEBA"
                                ? "Fee QRIS Kulakan Eneba (0.7%):"
                                : "Fee QRIS Kulakan G2G (0.7%):"}
                            </span>
                            <span className="text-slate-800 font-semibold tabular-nums">{formatRp(game.qris_fee_idr)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Fee Marketplace Shopee (8% + Rp 1k):</span>
                            <span className="text-slate-800 font-semibold tabular-nums">{formatRp(game.shopee_fee_idr)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Biaya Operasional / Packaging:</span>
                            <span className="text-slate-800 font-semibold">Rp 0 (Full Digital)</span>
                          </div>
                          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                            <span>Bersih Masuk Rekening Bank:</span>
                            <span className="text-slate-900 font-bold tabular-nums">
                              {formatRp(
                                game.recommended_shopee_price_idr - game.shopee_fee_idr
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleExpand(game.id)}
                      className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
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
                          className="px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1.5 transition-colors font-medium shadow-sm"
                          title="Buka listing game resmi di Eneba.com/id"
                        >
                          <Zap className="w-3 h-3 text-violet-600" />
                          <span>Buka Eneba</span>
                        </a>
                      ) : (
                        <a
                          href={resolveG2GProductUrl(game.g2g_direct_url, game.seller_name, game.title)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 transition-colors font-medium shadow-sm"
                          title="Buka kategori/listing di G2G.com/id"
                        >
                          <ExternalLink className="w-3 h-3 text-amber-600" />
                          <span>Buka G2G</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setCompetitorModalGame(game)}
                        className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1.5 transition-colors cursor-pointer font-medium shadow-sm"
                        title="Radar Kompetitor Shopee & AI Pricing Advisor"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                        <span>Radar Kompetitor</span>
                      </button>

                      <a
                        href={`https://shopee.co.id/search?keyword=${encodeURIComponent(game.title)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors font-medium shadow-sm"
                        title="Riset harga kompetitor langsung di Shopee"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Shopee ↗</span>
                      </a>

                      <Link
                        href={`/dashboard/quant?cogs=${game.price_g2g_idr}&price=${game.recommended_shopee_price_idr}`}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors font-medium shadow-sm"
                        title="Simulasikan di The Quant"
                      >
                        <BarChart3 className="w-3 h-3 text-emerald-600" />
                        <span>The Quant</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleAddSingleGame(game)}
                        disabled={isAlreadyAdded || isAdding}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all select-none ${
                          isAlreadyAdded
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                            : (game as any).source_marketplace === "ENEBA"
                            ? "bg-violet-600 hover:bg-violet-700 text-white shadow-sm cursor-pointer"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                        }`}
                      >
                        {isAdding ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Menyimpan...</span>
                          </>
                        ) : isAlreadyAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
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
      <div className="app-card rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setManualSearchOpen(!manualSearchOpen)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">
                Ingin riset game kustom di luar daftar otomatis robot?
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Buka AI Deep Hunter untuk meminta AI menganalisis game spesifik apa pun.
              </p>
            </div>
          </div>
          <div className="text-slate-400">
            {manualSearchOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {manualSearchOpen && (
          <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-4">
            <form onSubmit={handleManualScan} className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik judul game kustom... (Contoh: Monster Hunter Wilds, Dead by Daylight, Sekiro)"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
              >
                <option value="Steam">Steam</option>
                <option value="PC / Microsoft">PC / Microsoft</option>
                <option value="Rockstar / Steam">Rockstar Games</option>
                <option value="EA App / PC">EA App</option>
              </select>

              <button
                type="submit"
                disabled={isManualScanning || !manualQuery.trim()}
                className="whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {isManualScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Menganalisa...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-white" />
                    <span>Scan AI</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info Banner */}
      <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm text-slate-600 text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Autonomous Crawler bot secara ketat hanya memilih supplier dengan reputasi &gt;99% di G2G.com/id &amp; Eneba.
          </span>
        </div>
        <span className="text-slate-400 text-[11px]">
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

      <ResearchReviewModal
        open={reviewModalOpen}
        title={reviewModalTitle}
        candidates={reviewCandidates}
        isSaving={isSavingReview}
        onClose={() => setReviewModalOpen(false)}
        onConfirmSave={handleConfirmSaveReview}
      />
    </div>
  );
}
