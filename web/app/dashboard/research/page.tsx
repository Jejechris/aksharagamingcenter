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
} from "lucide-react";
import { ArbitrageOpportunity } from "@/app/api/research/opportunities/route";
import { getG2GSellerUrl } from "@/lib/g2g";

export default function ResearchCenterPage() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // AI Live Scan state
  const [scanQuery, setScanQuery] = useState("");
  const [scanPlatform, setScanPlatform] = useState("Steam");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ArbitrageOpportunity | null>(null);

  // Adding to portfolio status
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Toast notification
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/research/opportunities");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        setOpportunities(json.data);
        const inCatalog = new Set<string>();
        json.data.forEach((item: ArbitrageOpportunity & { is_already_in_catalog?: boolean }) => {
          if (item.is_already_in_catalog) {
            inCatalog.add(item.id);
          }
        });
        setAddedIds(inCatalog);
      }
    } catch (err) {
      console.error("Failed to load opportunities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleRunAiScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = scanQuery.trim();
    if (!query) {
      showToast("Ketik nama game yang ingin dianalisis terlebih dahulu!", "error");
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/research/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          platform: scanPlatform,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success" && json.data) {
        setScanResult(json.data);
        // Prepend to current list so user can see it right away
        setOpportunities((prev) => [json.data, ...prev.filter((p) => p.id !== json.data.id)]);
        showToast(`AI berhasil memindai peluang arbitrase untuk "${json.data.title}"!`);
      } else {
        showToast(json.message || "Gagal melakukan scan AI.", "error");
      }
    } catch (err) {
      showToast("Kesalahan koneksi saat menghubungi server AI.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddToCatalog = async (opp: ArbitrageOpportunity) => {
    setAddingId(opp.id);
    try {
      const payload = {
        action: "add",
        title: opp.title,
        platform: opp.platform,
        category: opp.category,
        selling_price_shopee_idr: opp.shopee_retail_price_idr,
        target_margin_pct: Math.round(opp.net_margin_pct),
        selected_seller_id: `g2g-${opp.best_supplier.name.toLowerCase()}`,
        sellers: [
          {
            seller_id: `g2g-${opp.best_supplier.name.toLowerCase()}`,
            seller_name: opp.best_supplier.name,
            rating_pct: opp.best_supplier.rating_pct,
            reviews_count: opp.best_supplier.reviews_count,
            price_g2g_idr: opp.g2g_price_idr,
            delivery_speed: "Instant Delivery",
            stock: 35,
            risk_score: 0,
            tier: opp.best_supplier.tier || "ultra_safe",
            tier_label: "🛡️ TOP VERIFIED",
            tier_desc: "Supplier rekomendasi dari Research Center Arbitrage Scanner.",
            is_recommended: true,
            profile_url: opp.profile_url || getG2GSellerUrl(opp.best_supplier.name, opp.title),
          },
        ],
      };

      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        setAddedIds((prev) => new Set([...Array.from(prev), opp.id]));
        showToast(`✅ "${opp.title}" berhasil dimasukkan ke Radar Portofolio & Supabase!`);
      } else {
        showToast(json.message || "Gagal memasukkan game ke portofolio.", "error");
      }
    } catch (err) {
      showToast("Gagal menyimpan ke database (kesalahan jaringan).", "error");
    } finally {
      setAddingId(null);
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

  // KPI calculations
  const stats = useMemo(() => {
    const count = opportunities.length;
    let totalNetProfit = 0;
    let totalMarginSum = 0;
    let maxSpread = 0;
    let topPick = opportunities[0]?.title || "-";

    opportunities.forEach((o) => {
      totalNetProfit += o.net_profit_idr;
      totalMarginSum += o.net_margin_pct;
      if (o.spread_pct > maxSpread) {
        maxSpread = o.spread_pct;
      }
    });

    const avgMargin = count > 0 ? totalMarginSum / count : 0;

    return {
      count,
      totalNetProfit,
      avgMargin,
      maxSpread,
      topPick,
    };
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      const matchesSearch =
        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.arbitrage_reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = selectedTag === "ALL" || o.tag.includes(selectedTag);
      const matchesPlatform =
        selectedPlatform === "ALL" ||
        o.platform.toLowerCase().includes(selectedPlatform.toLowerCase());

      return matchesSearch && matchesTag && matchesPlatform;
    });
  }, [opportunities, searchQuery, selectedTag, selectedPlatform]);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[1080px] mx-auto space-y-7">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-zinc-950/95 border border-emerald-500/40 text-sm text-emerald-300 font-mono flex items-center gap-3 shadow-2xl backdrop-blur-md">
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
            Research Center — Cross-Border Arbitrage Scanner
          </h1>
          <p className="text-[13px] text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Mesin intelijen pasar otomatis. Menganalisis perbedaan harga (price spread) antara
            supplier global (G2G) dan e-commerce Indonesia (Shopee) untuk mengidentifikasi game
            berpeluang profit maksimal secara instan.
          </p>
          <div className="flex items-center gap-2 mt-3.5 text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-slate-400">
              Arbitrage Engine: <strong className="text-cyan-400 font-semibold">ONLINE</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">Shopee Fee (8% + Rp 1k) & QRIS (0.7%) Factored</span>
            <button
              onClick={fetchOpportunities}
              disabled={loading}
              className="ml-2 p-1 rounded-md text-slate-500 hover:text-white transition-colors"
              title="Refresh scan"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/catalog"
            className="v0-btn-secondary text-xs font-mono flex items-center gap-1.5 px-3.5 py-2 rounded-xl"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Lihat Katalog Radar</span>
          </Link>
          <Link
            href="/dashboard/quant"
            className="v0-btn-primary text-xs font-mono flex items-center gap-1.5 px-4 py-2 rounded-xl"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Kalkulator Quant</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="v0-card rounded-2xl p-5 border-cyan-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              Peluang Terdeteksi
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
            {stats.count} Game
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06]">
            Siap jual di Shopee Indo
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
            Setelah seluruh fee marketplace
          </div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-amber-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold">
              Spread Tertinggi
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            +{formatNum(stats.maxSpread)}%
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06]">
            Selisih harga beli vs jual
          </div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-indigo-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
              Potensi Laba / Rotasi
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tracking-tight">
            {formatRp(stats.totalNetProfit)}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06]">
            Jika terjual 1 unit/game
          </div>
        </div>
      </div>

      {/* Interactive AI Arbitrage Hunter Scanner */}
      <div className="v0-card rounded-2xl p-6 border-cyan-500/25 relative overflow-hidden bg-gradient-to-br from-cyan-950/20 via-zinc-950/70 to-indigo-950/20">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                AI Deep Arbitrage Hunter
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Gemini 3.5 Flash
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Scan game apa pun untuk kalkulasi otomatis G2G vs Shopee
            </span>
          </div>

          <form onSubmit={handleRunAiScan} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ketik judul game apa saja... (Contoh: Monster Hunter Wilds, Helldivers 2, Hogwarts Legacy, Dead by Daylight)"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
            </div>

            <select
              value={scanPlatform}
              onChange={(e) => setScanPlatform(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
            >
              <option value="Steam">Steam</option>
              <option value="PC / Microsoft">PC / Microsoft</option>
              <option value="Rockstar / Steam">Rockstar Games</option>
              <option value="EA App / PC">EA App</option>
              <option value="PlayStation 5">PlayStation 5</option>
              <option value="Xbox Series X/S">Xbox Series</option>
            </select>

            <button
              type="submit"
              disabled={isScanning || !scanQuery.trim()}
              className="v0-btn-primary whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Scanning Pasar...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-zinc-950" />
                  <span>Scan Peluang AI</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Tags */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] font-mono">
            <span className="text-slate-500">Scan Cepat:</span>
            {["Elden Ring DLC", "Palworld", "Cyberpunk 2077", "FC 25", "Space Marine 2"].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setScanQuery(sample);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-white/[0.06] transition-all"
              >
                + {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/60 border border-white/[0.06] overflow-x-auto w-full md:w-auto">
          {[
            { id: "ALL", label: "Semua Peluang" },
            { id: "HIGH MARGIN", label: "🔥 High Margin (>40%)" },
            { id: "BLUECHIP POPULAR", label: "💎 Bluechip Laris" },
            { id: "FAST MOVER", label: "⚡ Fast Mover" },
            { id: "VIRAL TREND", label: "🚀 Viral Trend" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTag(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                selectedTag === tab.id
                  ? "bg-white/[0.10] text-white border border-white/[0.12] shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-72">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari game atau alasan arbitrase..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Arbitrage Opportunities Grid */}
      {loading ? (
        <div className="space-y-4">
          <div className="v0-card rounded-2xl h-36 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-36 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-36 animate-pulse bg-white/[0.02]" />
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="v0-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-10 h-10 text-cyan-500/40" />
          <div className="text-slate-200 font-medium text-base">
            Tidak ada peluang yang sesuai filter
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Coba ubah kata kunci pencarian atau gunakan form AI Deep Hunter di atas untuk memindai
            game baru.
          </p>
          <button
            onClick={() => {
              setSelectedTag("ALL");
              setSearchQuery("");
            }}
            className="v0-btn-secondary text-xs font-mono px-4 py-2 rounded-xl mt-2"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map((opp) => {
            const isExpanded = !!expandedCards[opp.id];
            const isAlreadyAdded = addedIds.has(opp.id);
            const isAdding = addingId === opp.id;

            return (
              <div
                key={opp.id}
                className="v0-card rounded-2xl overflow-hidden border border-white/[0.08] hover:border-cyan-500/30 transition-all group"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Tags & Platform */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase ${
                          opp.tag.includes("HIGH MARGIN")
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : opp.tag.includes("BLUECHIP")
                            ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                            : opp.tag.includes("FAST")
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {opp.tag}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-slate-300 border border-zinc-800">
                        {opp.platform}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-[11px] font-mono text-slate-400">{opp.category}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-500">
                        Demand Score:{" "}
                        <strong className="text-cyan-400 font-bold">{opp.demand_score}/100</strong>
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="text-slate-500">
                        Kompetisi:{" "}
                        <strong
                          className={
                            opp.competition_level === "Rendah"
                              ? "text-emerald-400"
                              : opp.competition_level === "Sedang"
                              ? "text-amber-400"
                              : "text-slate-300"
                          }
                        >
                          {opp.competition_level}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Title & Economics Comparison Flow */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pt-1">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        {opp.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono">
                        <span>Supplier G2G:</span>
                        <a
                          href={opp.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-semibold"
                        >
                          {opp.best_supplier.name} ★ {opp.best_supplier.rating_pct}% (
                          {opp.best_supplier.reviews_count.toLocaleString("id-ID")})
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      </div>
                    </div>

                    {/* Visual Pricing & Margin Highlight */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-zinc-950/70 p-3.5 rounded-xl border border-white/[0.05]">
                      {/* G2G Buy Price */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                          Modal G2G (Beli)
                        </span>
                        <span className="text-sm font-bold text-amber-400">
                          {formatRp(opp.g2g_price_idr)}
                        </span>
                      </div>

                      {/* Spread Indicator */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> +{formatNum(opp.spread_pct)}% Spread
                        </span>
                      </div>

                      {/* Shopee Sell Price */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                          Jual di Shopee
                        </span>
                        <span className="text-sm font-bold text-white">
                          {formatRp(opp.shopee_retail_price_idr)}
                        </span>
                      </div>

                      {/* Net Profit & Margin Pill */}
                      <div className="border-l border-white/[0.08] pl-4 font-mono text-right">
                        <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wider">
                          Laba Bersih (+{formatNum(opp.net_margin_pct)}%)
                        </span>
                        <span className="text-base font-extrabold text-emerald-400">
                          +{formatRp(opp.net_profit_idr)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arbitrage Reason Summary Banner */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/15 border border-cyan-500/15 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-cyan-300 font-semibold">
                        Mengapa Peluang Ini Ada:{" "}
                      </strong>
                      <span>{opp.arbitrage_reason}</span>
                    </div>
                  </div>

                  {/* Expandable Tactical Tip & Full Breakdown */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-3 font-mono text-xs animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1.5">
                          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Taktik Penjualan di Shopee:
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                            {opp.tactical_tip}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1 text-[11px]">
                          <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                            <span>Struktur Biaya Transaksi:</span>
                            {opp.steam_indo_price_idr && (
                              <span className="text-slate-500">
                                Resmi Steam: {formatRp(opp.steam_indo_price_idr)}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Fee QRIS Kulakan G2G (0.7%):</span>
                            <span className="text-slate-300">{formatRp(opp.qris_fee_idr)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Fee Marketplace Shopee (8% + 1k):</span>
                            <span className="text-slate-300">{formatRp(opp.shopee_fee_idr)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Biaya Operasional / Packaging:</span>
                            <span className="text-slate-300">Rp 2.000</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(opp.id)}
                      className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Tutup Analisa
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Rincian Taktik & Biaya
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <a
                        href={`https://shopee.co.id/search?keyword=${encodeURIComponent(
                          opp.shopee_search_query
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-700/80 flex items-center gap-1.5 transition-colors"
                        title="Riset kompetitor di Shopee"
                      >
                        <ShoppingBag className="w-3 h-3 text-orange-400" />
                        <span>Cek Shopee</span>
                      </a>

                      <Link
                        href={`/dashboard/quant?cogs=${opp.g2g_price_idr}&price=${opp.shopee_retail_price_idr}`}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-700/80 flex items-center gap-1.5 transition-colors"
                        title="Simulasikan di The Quant"
                      >
                        <BarChart3 className="w-3 h-3 text-emerald-400" />
                        <span>Hitung Margin</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleAddToCatalog(opp)}
                        disabled={isAlreadyAdded || isAdding}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md select-none ${
                          isAlreadyAdded
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
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

      {/* Footer Info Banner */}
      <div className="v0-card rounded-2xl p-5 border-white/[0.06] text-slate-400 text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Seluruh data supplier terafiliasi dengan seller rating &gt;99% di G2G.com/id.
          </span>
        </div>
        <span className="text-slate-500 text-[11px]">
          Akshara Arbitrage Engine &bull; Auto-Sync Supabase
        </span>
      </div>
    </div>
  );
}
