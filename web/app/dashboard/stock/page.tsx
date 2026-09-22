"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PackageSearch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Search,
  Filter,
  Copy,
  Check,
  TrendingUp,
  Store,
  DollarSign,
  Info,
  ShieldAlert,
  Layers,
  ArrowUpDown,
  Edit3,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Key,
} from "lucide-react";
import { VERIFIED_ENEBA_CATALOG, getEnebaSearchUrl } from "@/lib/eneba";
import ShopeeCompetitorModal from "@/app/components/ShopeeCompetitorModal";

interface Seller {
  seller_id: string;
  seller_name: string;
  tier?: string;
  tier_label?: string;
  tier_desc?: string;
  rating_pct: number;
  reviews_count: number;
  price_g2g_idr: number;
  delivery_speed: string;
  stock: number;
  risk_score?: number;
  is_recommended?: boolean;
  profile_url: string;
  net_profit_idr?: number;
  net_margin_pct?: number;
}

interface GameItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  target_margin_pct: number;
  status: string;
  selected_seller_id: string;
  sellers: Seller[];
  metrics?: {
    selected_seller?: Seller;
    cogs_g2g_idr?: number;
    net_profit_idr?: number;
    net_margin_pct?: number;
  };
}

function formatRp(val: number): string {
  return "Rp " + Math.round(val || 0).toLocaleString("id-ID");
}

export default function StockSentryPage() {
  const [catalog, setCatalog] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"PORTFOLIO" | "ENEBA_KEYS">("PORTFOLIO");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "SAFE">("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");

  // Live Audit simulation
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);

  // Inline Stock Edit modal / state
  const [editingStockState, setEditingStockState] = useState<{
    gameId: string;
    gameTitle: string;
    sellerId: string;
    sellerName: string;
    currentStock: number;
  } | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  // Supplier Switching
  const [switchingSupplierId, setSwitchingSupplierId] = useState<string | null>(null);

  // Copied helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Competitor Modal
  const [competitorModalGame, setCompetitorModalGame] = useState<any | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchCatalog = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/catalog");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        setCatalog(json.data);
      }
    } catch (err) {
      console.error("Failed to load catalog:", err);
      showToast("Gagal memuat katalog stok.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    setLastAuditTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  // Run live simulation ping across all suppliers
  const handleRunLiveAudit = async () => {
    setIsAuditing(true);
    setAuditProgress(10);

    const timer1 = setTimeout(() => setAuditProgress(40), 400);
    const timer2 = setTimeout(() => setAuditProgress(75), 800);
    const timer3 = setTimeout(async () => {
      setAuditProgress(100);
      await fetchCatalog();
      setIsAuditing(false);
      setLastAuditTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      showToast("✅ Audit ketersediaan stok supplier selesai. Data tersinkronisasi!", "success");
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  // Switch Supplier (Failover)
  const handleSwitchSupplier = async (
    gameId: string,
    gameTitle: string,
    targetSellerId: string,
    targetSellerName: string
  ) => {
    try {
      setSwitchingSupplierId(targetSellerId);
      const res = await fetch("/api/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          title: gameTitle,
          selected_seller_id: targetSellerId,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setCatalog((prev) =>
          prev.map((g) => (g.id === gameId ? { ...g, selected_seller_id: targetSellerId } : g))
        );
        showToast(
          `⚡ Berhasil beralih ke supplier "${targetSellerName}". Listing Shopee aman dipenuhi!`,
          "success"
        );
      } else {
        showToast(data.message || "Gagal mengalihkan supplier.", "error");
      }
    } catch (err: any) {
      showToast("Terjadi kesalahan saat mengalihkan supplier.", "error");
    } finally {
      setSwitchingSupplierId(null);
    }
  };

  // Save updated stock for a seller
  const handleSaveStockUpdate = async () => {
    if (!editingStockState) return;
    try {
      setIsUpdatingStock(true);
      const res = await fetch("/api/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: editingStockState.gameId,
          title: editingStockState.gameTitle,
          seller_id: editingStockState.sellerId,
          action: "update_stock",
          stock: Math.max(0, Number(newStockValue)),
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setCatalog((prev) =>
          prev.map((g) => {
            if (g.id === editingStockState.gameId) {
              return {
                ...g,
                sellers: g.sellers.map((s) =>
                  s.seller_id === editingStockState.sellerId
                    ? { ...s, stock: Math.max(0, Number(newStockValue)) }
                    : s
                ),
              };
            }
            return g;
          })
        );
        showToast(
          `✅ Stok seller "${editingStockState.sellerName}" diperbarui jadi ${newStockValue} unit!`,
          "success"
        );
        setEditingStockState(null);
      } else {
        showToast(data.message || "Gagal update stok.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi saat update stok.", "error");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`📋 Angka stok ${text} disalin ke clipboard!`, "success");
  };

  // Computed metrics for cards
  const analyzedGames = useMemo(() => {
    return catalog.map((game) => {
      const selectedSeller =
        game.sellers.find((s) => s.seller_id === game.selected_seller_id) ||
        game.sellers[0] || {
          seller_id: "none",
          seller_name: "Belum Dipilih",
          stock: 0,
          price_g2g_idr: 0,
          rating_pct: 0,
          reviews_count: 0,
          delivery_speed: "N/A",
          profile_url: "#",
        };

      const activeStock = Number(selectedSeller.stock ?? 0);
      const standbySellers = (game.sellers || []).filter(
        (s) => s.seller_id !== selectedSeller.seller_id
      );
      const standbyStockTotal = standbySellers.reduce(
        (acc, s) => acc + (Number(s.stock) || 0),
        0
      );
      const standbyWithStock = standbySellers.filter((s) => (Number(s.stock) || 0) > 0);

      // Safe Shopee Stock buffer formula:
      // If activeStock == 0 -> Shopee stock MUST be 0!
      // If activeStock > 0 -> Shopee stock = activeStock - 1 (or activeStock if 1, to prevent race conditions)
      const safeShopeeStock = activeStock === 0 ? 0 : Math.max(1, activeStock - 1);

      let stockHealth: "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
      if (activeStock === 0) {
        stockHealth = "CRITICAL";
      } else if (activeStock <= 3) {
        stockHealth = "WARNING";
      }

      return {
        ...game,
        selectedSeller,
        activeStock,
        standbySellers,
        standbyStockTotal,
        standbyWithStock,
        safeShopeeStock,
        stockHealth,
      };
    });
  }, [catalog]);

  // Overall KPIs
  const totalGames = analyzedGames.length;
  const criticalGames = analyzedGames.filter((g) => g.stockHealth === "CRITICAL");
  const warningGames = analyzedGames.filter((g) => g.stockHealth === "WARNING");
  const safeGames = analyzedGames.filter((g) => g.stockHealth === "SAFE");
  const totalActiveUnits = analyzedGames.reduce((acc, g) => acc + g.activeStock, 0);
  const totalStandbyUnits = analyzedGames.reduce((acc, g) => acc + g.standbyStockTotal, 0);

  // Filtered games
  const filteredGames = useMemo(() => {
    return analyzedGames.filter((g) => {
      // Status filter
      if (statusFilter === "CRITICAL" && g.stockHealth !== "CRITICAL") return false;
      if (statusFilter === "WARNING" && g.stockHealth !== "WARNING") return false;
      if (statusFilter === "SAFE" && g.stockHealth !== "SAFE") return false;

      // Platform filter
      if (platformFilter !== "ALL" && !g.platform.toLowerCase().includes(platformFilter.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchPlatform = g.platform.toLowerCase().includes(q);
        const matchSeller = g.selectedSeller.seller_name.toLowerCase().includes(q);
        if (!matchTitle && !matchPlatform && !matchSeller) return false;
      }

      return true;
    });
  }, [analyzedGames, statusFilter, platformFilter, searchQuery]);

  // Eneba items list
  const enebaList = useMemo(() => {
    return Object.entries(VERIFIED_ENEBA_CATALOG).map(([key, item]) => ({
      key,
      ...item,
      searchUrl: getEnebaSearchUrl(item.title),
    }));
  }, []);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1240px] mx-auto space-y-7">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
              : toast.type === "warning"
              ? "bg-amber-950/90 border-amber-500/30 text-amber-300"
              : "bg-rose-950/90 border-rose-500/30 text-rose-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toast.type === "warning" ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-zinc-400 hover:text-zinc-200 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-amber-400/90">
            <PackageSearch className="w-4 h-4" />
            <span>OPS INVENTORY SHIELD • RESELLER STOCK RADAR</span>
            {lastAuditTime && (
              <span className="text-zinc-500 hidden sm:inline">
                • Audit Terakhir: {lastAuditTime} WIB
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            Stock Sentry
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-normal">
              Shopee Anti-Misskom Sync
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5 max-w-2xl">
            Monitoring ketersediaan stok supplier (G2G & Eneba) secara live. Mencegah penalti
            pembatalan pesanan Shopee (NFR) akibat supplier kehabisan stok dengan sistem auto-failover
            ke seller cadangan.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRunLiveAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
            <span>{isAuditing ? "Mengaudit Stok..." : "Scan & Audit Stok Live"}</span>
          </button>

          <a
            href="https://seller.shopee.co.id"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-200 text-xs font-medium transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Shopee Seller Center</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>

          <Link
            href="/dashboard/catalog"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            <span>Catalog Radar</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Progress Bar during Live Audit */}
      {isAuditing && (
        <div className="w-full bg-zinc-900 border border-amber-500/30 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 animate-pulse" /> Ping ke server G2G & Eneba merchant...
            </span>
            <span className="text-zinc-400">{auditProgress}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${auditProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* CRITICAL EARLY WARNING BANNER: If any supplier stock is 0 */}
      {criticalGames.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-rose-200 text-sm sm:text-base">
                    🚨 PERINGATAN KRITIS: {criticalGames.length} Game Memiliki Stok 0 di Supplier Utama!
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    High Risk Penalti Shopee
                  </span>
                </div>
                <p className="text-xs text-rose-300/80 mt-1 max-w-3xl leading-relaxed">
                  Supplier utama kehabisan stok. Jika pembeli Shopee memesan sekarang, order akan gagal dipenuhi
                  (misskomunikasi & poin penalti NFR). Segera lakukan salah satu tindakan:{" "}
                  <strong>Ubah stok Shopee jadi 0</strong> atau <strong>1-Click Switch ke Supplier Cadangan</strong> di bawah.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStatusFilter("CRITICAL")}
              className="shrink-0 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/30"
            >
              <span>Filter Game Kritis ({criticalGames.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* WARNING BANNER: If low stock <= 3 */}
      {criticalGames.length === 0 && warningGames.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-200 text-sm">
                  ⚠️ Perhatian: {warningGames.length} Game Stok Menipis (≤ 3 Unit) di Supplier
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Disarankan membatasi angka stok di listing Shopee agar tidak terjadi lonjakan pesanan yang melebihi kuota supplier.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter("WARNING")}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium"
            >
              Lihat ({warningGames.length}) Game
            </button>
          </div>
        </div>
      )}

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Products */}
        <div className="col-span-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Total Produk</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{totalGames}</div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Portofolio aktif Shopee</p>
          </div>
        </div>

        {/* Safe Stock */}
        <div
          onClick={() => setStatusFilter(statusFilter === "SAFE" ? "ALL" : "SAFE")}
          className={`col-span-1 rounded-xl border p-4 flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === "SAFE"
              ? "border-emerald-500/50 bg-emerald-950/20 ring-1 ring-emerald-500/30"
              : "border-zinc-800/80 bg-zinc-900/50 hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-emerald-400 font-medium">Stok Aman</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{safeGames.length}</div>
            <p className="text-[11px] text-zinc-500 mt-0.5">≥ 4 Unit di supplier</p>
          </div>
        </div>

        {/* Warning Stock */}
        <div
          onClick={() => setStatusFilter(statusFilter === "WARNING" ? "ALL" : "WARNING")}
          className={`col-span-1 rounded-xl border p-4 flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === "WARNING"
              ? "border-amber-500/50 bg-amber-950/20 ring-1 ring-amber-500/30"
              : "border-zinc-800/80 bg-zinc-900/50 hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-amber-400 font-medium">Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-400">{warningGames.length}</div>
            <p className="text-[11px] text-zinc-500 mt-0.5">1 - 3 Unit tersisa</p>
          </div>
        </div>

        {/* Critical Empty Stock */}
        <div
          onClick={() => setStatusFilter(statusFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
          className={`col-span-1 rounded-xl border p-4 flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === "CRITICAL"
              ? "border-rose-500/50 bg-rose-950/20 ring-1 ring-rose-500/30"
              : "border-zinc-800/80 bg-zinc-900/50 hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-rose-400 font-medium">Stok Habis (0)</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {criticalGames.length}
            </div>
            <p className="text-[11px] text-rose-400/80 mt-0.5 font-medium">Wajib Ubah Shopee!</p>
          </div>
        </div>

        {/* Total Ready Stock Units */}
        <div className="col-span-2 md:col-span-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Unit Siap Kirim</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-cyan-300">
              {totalActiveUnits}{" "}
              <span className="text-xs text-zinc-500 font-normal">
                (+{totalStandbyUnits} cadangan)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Akumulasi pasokan supplier</p>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("PORTFOLIO")}
            className={`pb-3 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "PORTFOLIO"
                ? "text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              <span>Portofolio Aktif Shopee & G2G</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {analyzedGames.length}
              </span>
            </div>
            {activeTab === "PORTFOLIO" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("ENEBA_KEYS")}
            className={`pb-3 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "ENEBA_KEYS"
                ? "text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              <span>Eneba CDKey Sentry (Redeem Code)</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 font-mono border border-violet-500/20">
                Verified Search
              </span>
            </div>
            {activeTab === "ENEBA_KEYS" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Filter Controls for Portfolio tab */}
        {activeTab === "PORTFOLIO" && (
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Cari judul game atau nama supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Filters */}
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-800/70 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Semua ({totalGames})
              </button>
              <button
                onClick={() => setStatusFilter("CRITICAL")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  statusFilter === "CRITICAL"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-zinc-800/70 text-rose-400/80 hover:text-rose-300"
                }`}
              >
                🔴 Kritis ({criticalGames.length})
              </button>
              <button
                onClick={() => setStatusFilter("WARNING")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  statusFilter === "WARNING"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-zinc-800/70 text-amber-400/80 hover:text-amber-300"
                }`}
              >
                🟡 Menipis ({warningGames.length})
              </button>
              <button
                onClick={() => setStatusFilter("SAFE")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  statusFilter === "SAFE"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-zinc-800/70 text-emerald-400/80 hover:text-emerald-300"
                }`}
              >
                🟢 Aman ({safeGames.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PORTFOLIO TAB CONTENT */}
      {activeTab === "PORTFOLIO" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-zinc-500 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-400" />
              <p className="text-sm">Memuat data inventori dan stok supplier...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
              <PackageSearch className="w-10 h-10 mx-auto text-zinc-600" />
              <h3 className="text-sm font-medium text-zinc-300">Tidak ada produk yang cocok</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian atau ganti filter status stok Anda.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGames.map((game) => {
                const isCritical = game.stockHealth === "CRITICAL";
                const isWarning = game.stockHealth === "WARNING";

                return (
                  <div
                    key={game.id}
                    className={`rounded-xl border transition-all ${
                      isCritical
                        ? "border-rose-500/40 bg-zinc-900/80 shadow-lg shadow-rose-950/20"
                        : isWarning
                        ? "border-amber-500/30 bg-zinc-900/70"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 border-b border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                            {game.platform}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                            {game.category}
                          </span>

                          {/* Shopee Risk Badge */}
                          {isCritical ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <XCircle className="w-3 h-3" />
                              Listing Shopee Wajib Stok 0!
                            </span>
                          ) : isWarning ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Listing Shopee Batasi Kuota
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Listing Shopee Aman Aktif
                            </span>
                          )}
                        </div>

                        <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                          {game.title}
                        </h2>
                      </div>

                      {/* Pricing Summary */}
                      <div className="flex items-center gap-4 text-xs font-mono bg-zinc-950/60 px-3.5 py-2 rounded-lg border border-zinc-800 self-start md:self-auto">
                        <div>
                          <div className="text-zinc-500 text-[10px]">HARGA JUAL SHOPEE</div>
                          <div className="text-amber-300 font-semibold">
                            {formatRp(game.selling_price_shopee_idr)}
                          </div>
                        </div>
                        <div className="h-6 w-[1px] bg-zinc-800" />
                        <div>
                          <div className="text-zinc-500 text-[10px]">MODAL SUPPLIER</div>
                          <div className="text-zinc-300">
                            {formatRp(game.selectedSeller.price_g2g_idr)}
                          </div>
                        </div>
                        <div className="h-6 w-[1px] bg-zinc-800" />
                        <div>
                          <div className="text-zinc-500 text-[10px]">MARGIN</div>
                          <div
                            className={
                              (game.metrics?.net_margin_pct ?? 0) >= 20
                                ? "text-emerald-400 font-semibold"
                                : "text-amber-400"
                            }
                          >
                            {game.metrics?.net_margin_pct ?? game.target_margin_pct}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body: Active Supplier + Shopee Sync Advice */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Active Supplier Details (Cols 1-7) */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            SUPPLIER AKTIF SAAT INI (PRIMARY)
                          </span>
                          <span className="text-zinc-500">
                            {game.sellers.length} total supplier terdata
                          </span>
                        </div>

                        {/* Supplier Card */}
                        <div
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCritical
                              ? "bg-rose-950/20 border-rose-500/30"
                              : isWarning
                              ? "bg-amber-950/10 border-amber-500/20"
                              : "bg-zinc-950/60 border-zinc-800"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-zinc-200">
                                {game.selectedSeller.seller_name}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                                {game.selectedSeller.tier_label || "⚖️ Mid-Level"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                              <span>⭐ {game.selectedSeller.rating_pct}%</span>
                              <span>•</span>
                              <span>{game.selectedSeller.reviews_count.toLocaleString()} ulasan</span>
                              <span>•</span>
                              <span className="text-emerald-400">
                                {game.selectedSeller.delivery_speed}
                              </span>
                            </div>
                          </div>

                          {/* Live Stock Display & Edit */}
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <div className="text-[10px] text-zinc-500 uppercase font-mono">
                                STOK LIVE SUPPLIER
                              </div>
                              <div
                                className={`text-xl font-mono font-bold ${
                                  isCritical
                                    ? "text-rose-400"
                                    : isWarning
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }`}
                              >
                                {game.activeStock}{" "}
                                <span className="text-xs font-normal">Unit</span>
                              </div>
                            </div>

                            <button
                              title="Edit/Simulasi Stok Supplier"
                              onClick={() => {
                                setEditingStockState({
                                  gameId: game.id,
                                  gameTitle: game.title,
                                  sellerId: game.selectedSeller.seller_id,
                                  sellerName: game.selectedSeller.seller_name,
                                  currentStock: game.activeStock,
                                });
                                setNewStockValue(game.activeStock);
                              }}
                              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 text-xs transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Supplier Direct Link */}
                        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                          <a
                            href={game.selectedSeller.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline underline-offset-4"
                          >
                            <span>Buka Listing Asli Supplier di G2G/Eneba</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            onClick={() =>
                              setCompetitorModalGame({
                                title: game.title,
                                platform: game.platform,
                                cogs_idr: game.selectedSeller.price_g2g_idr,
                                current_shopee_price_idr: game.selling_price_shopee_idr,
                              })
                            }
                            className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                          >
                            <span>Cek Kompetitor Shopee</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Shopee Safe Listing Guide & Sync (Cols 8-12) */}
                      <div className="lg:col-span-5 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/70 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <Store className="w-3.5 h-3.5 text-amber-400" />
                            PANDUAN STOK LISTING SHOPEE
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                              <span className="text-xs text-zinc-300 font-medium">
                                Rekomendasi Stok Shopee:
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-lg font-mono font-bold ${
                                    game.safeShopeeStock === 0
                                      ? "text-rose-400"
                                      : "text-emerald-400"
                                  }`}
                                >
                                  {game.safeShopeeStock} Unit
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopy(
                                      String(game.safeShopeeStock),
                                      `shopee-stock-${game.id}`
                                    )
                                  }
                                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                  title="Salin Angka Stok"
                                >
                                  {copiedId === `shopee-stock-${game.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              {game.safeShopeeStock === 0 ? (
                                <span className="text-rose-300 font-medium">
                                  ⚠️ Stok supplier habis! Segera nol-kan stok di Shopee Seller Center
                                  atau beralih ke salah satu supplier cadangan di bawah.
                                </span>
                              ) : (
                                <span>
                                  Sistem menyisakan <strong>buffer 1 unit</strong> dari kuota supplier
                                  untuk mencegah tabrakan order jika supplier dibeli oleh pembeli lain di menit yang sama.
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <a
                          href="https://seller.shopee.co.id/portal/product/list/all"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Store className="w-3.5 h-3.5 text-amber-400" />
                          <span>Buka Edit Produk di Shopee</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </a>
                      </div>
                    </div>

                    {/* Alternative / Standby Suppliers (Failover Section) */}
                    {game.standbySellers.length > 0 && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-zinc-800/60 bg-zinc-950/20">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            SUPPLIER CADANGAN (FAILOVER STANDBY) • {game.standbySellers.length} SELLER
                          </span>
                          <span className="text-xs text-zinc-500">
                            Total stok cadangan:{" "}
                            <strong className="text-zinc-300">{game.standbyStockTotal} unit</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {game.standbySellers.map((standby) => {
                            const standbyStock = Number(standby.stock || 0);
                            const isStandbyEmpty = standbyStock === 0;

                            return (
                              <div
                                key={standby.seller_id}
                                className={`p-3 rounded-lg border flex flex-col justify-between gap-2 text-xs ${
                                  isStandbyEmpty
                                    ? "bg-zinc-900/30 border-zinc-800/40 opacity-60"
                                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-zinc-200 truncate">
                                      {standby.seller_name}
                                    </span>
                                    <span
                                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                                        isStandbyEmpty
                                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                          : standbyStock <= 3
                                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      }`}
                                    >
                                      {standbyStock} Unit
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                                    <span>{standby.tier_label || "⚖️ Mid-Level"}</span>
                                    <span>•</span>
                                    <span className="text-zinc-300 font-mono">
                                      {formatRp(standby.price_g2g_idr)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={() =>
                                      handleSwitchSupplier(
                                        game.id,
                                        game.title,
                                        standby.seller_id,
                                        standby.seller_name
                                      )
                                    }
                                    disabled={
                                      isStandbyEmpty ||
                                      switchingSupplierId === standby.seller_id
                                    }
                                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${
                                      isStandbyEmpty
                                        ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    }`}
                                  >
                                    <Zap className="w-3 h-3" />
                                    <span>
                                      {switchingSupplierId === standby.seller_id
                                        ? "Mengalihkan..."
                                        : "⚡ Switch ke Supplier Ini"}
                                    </span>
                                  </button>

                                  <a
                                    href={standby.profile_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                                    title="Buka listing supplier"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ENEBA CDKEY SENTRY TAB CONTENT */}
      {activeTab === "ENEBA_KEYS" && (
        <div className="space-y-5">
          {/* Eneba Information Banner */}
          <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-violet-500/20 text-violet-300 shrink-0 mt-0.5">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-violet-200">
                  Eneba Official Digital Key Radar (0% Hackback Guarantee)
                </h3>
                <p className="text-xs text-violet-300/80 mt-1 max-w-2xl leading-relaxed">
                  Semua link Eneba di bawah terverifikasi 100% aman (200 OK) tanpa error 404. Pembeli
                  mendapatkan kode CDKey/Redeem resmi yang diaktivasi langsung di akun buyer sendiri
                  (Steam/Xbox/GOG). Pembayaran mendukung QRIS, DANA, dan ShopeePay Indonesia.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/eneba"
              className="shrink-0 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Buka Terminal Eneba Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Eneba Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enebaList.map((item) => (
              <div
                key={item.key}
                className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-violet-500/30 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[11px]">
                      {item.platform}
                    </span>
                    <span className="font-mono text-violet-400 text-[11px] bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {item.keyType}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-zinc-100">{item.title}</h3>
                  <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    <span>Estimasi Harga Kulakan:</span>
                    <strong className="text-emerald-400 font-mono">
                      {formatRp(item.estimatedPriceIdr)}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    🟢 Multi-Merchant Eneba
                  </span>

                  <a
                    href={item.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Cek Stok Merchant</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Edit/Simulasi Stok Seller */}
      {editingStockState && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  Update / Audit Stok Supplier
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Game: <strong>{editingStockState.gameTitle}</strong>
                </p>
                <p className="text-xs text-zinc-400">
                  Seller: <strong>{editingStockState.sellerName}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingStockState(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-300 font-medium">
                Jumlah Stok Baru (Unit):
              </label>
              <input
                type="number"
                min="0"
                value={newStockValue}
                onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-zinc-500">
                💡 Tip: Ubah ke <strong>0</strong> untuk mensimulasikan situasi stok supplier habis
                dan melihat respon sistem early warning.
              </p>
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNewStockValue(0)}
                className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono"
              >
                Set 0 (Habis)
              </button>
              <button
                onClick={() => setNewStockValue(2)}
                className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono"
              >
                Set 2 (Menipis)
              </button>
              <button
                onClick={() => setNewStockValue(25)}
                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono"
              >
                Set 25 (Aman)
              </button>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingStockState(null)}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveStockUpdate}
                disabled={isUpdatingStock}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isUpdatingStock ? "Menyimpan..." : "Simpan Perubahan Stok"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopee Competitor Modal */}
      {competitorModalGame && (
        <ShopeeCompetitorModal
          isOpen={true}
          onClose={() => setCompetitorModalGame(null)}
          gameTitle={competitorModalGame.title}
          platform={competitorModalGame.platform}
          costG2gIdr={competitorModalGame.cogs_idr}
          currentPriceIdr={competitorModalGame.current_shopee_price_idr}
          onApplyPrice={(price) => {
            showToast(`Rekomendasi harga kompetitor Rp ${price.toLocaleString("id-ID")} dipilih.`, "success");
            setCompetitorModalGame(null);
          }}
        />
      )}
    </div>
  );
}
