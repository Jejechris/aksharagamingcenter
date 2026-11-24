"use client";
import { fetchSmartCatalog } from "@/lib/catalogClient";

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
  Sparkles,
} from "lucide-react";
import { VERIFIED_ENEBA_CATALOG, getEnebaSearchUrl } from "@/lib/eneba";
import { getG2GSellerUrl, resolveG2GProductUrl } from "@/lib/g2g";
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
  fallback_search_url?: string;
  net_profit_idr?: number;
  net_margin_pct?: number;
  is_online?: boolean;
  live_status?: string;
  total_success_order?: number;
  live_synced_at?: string;
  offer_id?: string;
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

function extractOfferId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^G\d+[A-Z0-9]+$/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/offer\/(G\d+[A-Z0-9]+)/i);
  return match ? match[1] : null;
}

function resolveDirectListingUrl(seller?: { profile_url?: string; fallback_search_url?: string; offer_id?: string; seller_name?: string; stock?: number }, gameTitle?: string, isLive: boolean = false): string {
  if (seller?.fallback_search_url) return seller.fallback_search_url;
  return resolveG2GProductUrl(seller?.profile_url || seller?.offer_id, seller?.seller_name, gameTitle, false);
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

  // Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // Edit stock modal state
  const [editingStockState, setEditingStockState] = useState<{
    gameId: string;
    gameTitle: string;
    sellerId: string;
    sellerName: string;
    currentStock: number;
  } | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  // Switch Supplier loading state
  const [switchingSupplierId, setSwitchingSupplierId] = useState<string | null>(null);

  // Copied buffer state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Competitor Modal
  const [competitorModalGame, setCompetitorModalGame] = useState<any | null>(null);

  // Detector Link Modal
  const [detectorUrl, setDetectorUrl] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedData, setDetectedData] = useState<any | null>(null);
  const [showDetectorModal, setShowDetectorModal] = useState(false);
  const [isApplyingDetected, setIsApplyingDetected] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch catalog on mount
  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const data = await fetchSmartCatalog();
      if (Array.isArray(data)) {
        setCatalog(data);
      }
    } catch (err) {
      console.error("Gagal mengambil katalog:", err);
      showToast("Gagal memuat katalog produk.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Run live sync audit
  const handleRunLiveAudit = async () => {
    try {
      setIsAuditing(true);
      setAuditProgress(10);
      showToast("🔄 Menghubungi G2G Live API untuk mengaudit stok real...", "warning");

      const interval = setInterval(() => {
        setAuditProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 400);

      const res = await fetch("/api/inventory/live-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_refresh: true }),
      });

      clearInterval(interval);
      setAuditProgress(100);

      const data = await res.json();
      if (data.status === "success") {
        setAuditLogs(data.audit_log || []);
        setShowAuditLogs(true);
        setLastAuditTime(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        await fetchCatalog();
        showToast(
          `✅ Audit selesai! ${data.synced_count || 0} seller berhasil diverifikasi live.`,
          "success"
        );
      } else {
        showToast(data.message || "Gagal sinkronisasi live.", "error");
      }
    } catch (err: any) {
      showToast("Terjadi kesalahan saat menghubungi server G2G SLS API.", "error");
    } finally {
      setIsAuditing(false);
    }
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

  // Link Detector Handlers
  const handleDetectLink = async (targetUrl?: string) => {
    const urlToTest = (targetUrl !== undefined ? targetUrl : detectorUrl).trim();
    if (!urlToTest) {
      showToast("Harap masukkan URL listing G2G atau Eneba.", "warning");
      return;
    }
    try {
      setIsDetecting(true);
      setShowDetectorModal(true);
      const res = await fetch("/api/inventory/detect-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToTest }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setDetectedData(json.data);
        showToast(
          `✅ Berhasil deteksi: ${json.data.clean_title} • Stok Faktual G2G: ${json.data.real_stock.toLocaleString()} Unit`,
          "success"
        );
      } else {
        setDetectedData(null);
        showToast(json.message || "Gagal mendeteksi link.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan saat menghubungi server G2G SLS.", "error");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleApplyDetectedToCatalog = async () => {
    if (!detectedData) return;
    try {
      setIsApplyingDetected(true);
      if (detectedData.matching_game_id) {
        const res = await fetch("/api/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_seller",
            game_id: detectedData.matching_game_id,
            new_seller: {
              seller_name: detectedData.seller_name,
              price_g2g_idr: detectedData.price_idr,
              rating_pct: detectedData.rating_pct,
              reviews_count: detectedData.reviews_count,
              delivery_speed: detectedData.delivery_speed,
              stock: detectedData.real_stock,
              is_recommended: true,
              profile_url: detectedData.profile_url,
              tier: "mid_level",
              tier_label: "⚖️ Seller Live G2G",
              tier_desc: `Terdeteksi live dari G2G Offer ${detectedData.offer_id}`,
            },
            set_selected: true,
          }),
        });
        const json = await res.json();
        if (json.status === "success") {
          await fetchCatalog();
          showToast(
            `✅ Seller "${detectedData.seller_name}" dengan stok live ${detectedData.real_stock.toLocaleString()} unit berhasil diterapkan ke ${detectedData.matching_game_title}!`,
            "success"
          );
          setShowDetectorModal(false);
        } else {
          showToast(json.message || "Gagal menerapkan seller.", "error");
        }
      } else {
        const res = await fetch("/api/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            title: detectedData.clean_title,
            platform: detectedData.platform,
            category: detectedData.category,
            selling_price_shopee_idr: detectedData.recommended_shopee_price_idr,
            target_margin_pct: 25,
            sellers: [
              {
                seller_name: detectedData.seller_name,
                price_g2g_idr: detectedData.price_idr,
                rating_pct: detectedData.rating_pct,
                reviews_count: detectedData.reviews_count,
                delivery_speed: detectedData.delivery_speed,
                stock: detectedData.real_stock,
                is_recommended: true,
                profile_url: detectedData.profile_url,
                tier: "lowest_price",
                tier_label: "⚡ Lowest Live",
              },
            ],
          }),
        });
        const json = await res.json();
        if (json.status === "success") {
          await fetchCatalog();
          showToast(
            `✅ Produk baru "${detectedData.clean_title}" berhasil dibuat di katalog dengan stok live ${detectedData.real_stock.toLocaleString()} unit!`,
            "success"
          );
          setShowDetectorModal(false);
        } else {
          showToast(json.message || "Gagal menambahkan produk baru.", "error");
        }
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi saat menerapkan seller.", "error");
    } finally {
      setIsApplyingDetected(false);
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-sans shadow-xl bg-white animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === "success"
                ? "border-emerald-200 text-slate-900"
                : toast.type === "warning"
                ? "border-amber-200 text-slate-900"
                : "border-rose-200 text-slate-900"
            }`}
          >
            {toast.type === "success" ? (
              <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : toast.type === "warning" ? (
              <div className="p-1 rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1 rounded-full bg-rose-100 text-rose-600">
                <XCircle className="w-4 h-4" />
              </div>
            )}
            <span className="font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
                Command Deck
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-700">Stock Sentry</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <PackageSearch className="w-6 h-6 text-emerald-600" />
              Stock Sentry & Multi-Supplier
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Monitoring ketersediaan stok supplier (G2G & Eneba) secara live. Mencegah penalti
              pembatalan pesanan Shopee (NFR) dengan sistem auto-failover ke seller cadangan.
            </p>
            {lastAuditTime && (
              <div className="mt-2 text-xs font-mono text-slate-500 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Audit Terakhir: <strong className="text-slate-700">{lastAuditTime} WIB</strong></span>
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowDetectorModal(true)}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Detektor Live Link</span>
            </button>

            <button
              onClick={handleRunLiveAudit}
              disabled={isAuditing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              <span>{isAuditing ? "Mengaudit Stok..." : "Scan & Audit Stok Live"}</span>
            </button>

            <a
              href="https://seller.shopee.co.id"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-orange-500" />
              <span>Shopee Seller Center</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* QUICK LINK DETECTOR BAR */}
        <div className="app-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 shrink-0">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Zap className="w-4 h-4" />
            </div>
            <span>DETEKTOR LIVE LINK G2G / ENEBA:</span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste link listing G2G atau Eneba (contoh: https://www.g2g.com/.../offer/G1703129821471UK atau ID: G1703314890265KW)..."
              value={detectorUrl}
              onChange={(e) => setDetectorUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDetectLink()}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
            <button
              onClick={() => handleDetectLink()}
              disabled={isDetecting || !detectorUrl.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isDetecting ? "Mendeteksi..." : "Deteksi Faktual Live"}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar during Live Audit */}
        {isAuditing && (
          <div className="app-card p-4 bg-white border border-emerald-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-700 flex items-center gap-1.5 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" /> Ping real-time langsung ke server G2G SLS API...
              </span>
              <span className="font-bold text-emerald-700">{auditProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${auditProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Live Audit Log Banner / Expander */}
        {auditLogs.length > 0 && (
          <div className="app-card p-4 bg-white border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  LAPORAN AUDIT LIVE G2G SLS ({auditLogs.length} SELLER TERSINKRONISASI) • {lastAuditTime} WIB
                </span>
              </div>
              <button
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
              >
                {showAuditLogs ? "Tutup Laporan ▲" : "Buka Tabel Faktual Live ▼"}
              </button>
            </div>

            {showAuditLogs && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
                <table className="w-full text-xs text-left text-slate-700 font-mono">
                  <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Game</th>
                      <th className="py-2.5 px-3">Seller (Offer ID)</th>
                      <th className="py-2.5 px-3">Status G2G</th>
                      <th className="py-2.5 px-3">Stok Live Faktual</th>
                      <th className="py-2.5 px-3">Status Online</th>
                      <th className="py-2.5 px-3">Tingkat Risiko</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{log.game_title}</td>
                        <td className="py-2 px-3">
                          <span className="text-slate-900 font-medium">{log.seller_name}</span>{" "}
                          <span className="text-slate-400 text-[11px]">({log.offer_id})</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-emerald-700 font-semibold">🟢 {log.status}</span>
                        </td>
                        <td className="py-2 px-3">
                          <strong
                            className={
                              log.live_stock === 0
                                ? "text-rose-600 font-bold"
                                : log.live_stock <= 4
                                ? "text-amber-600 font-bold"
                                : "text-emerald-600 font-bold"
                            }
                          >
                            {log.live_stock.toLocaleString()} Unit
                          </strong>
                        </td>
                        <td className="py-2 px-3">
                          {log.is_online ? (
                            <span className="text-emerald-700 font-medium">🟢 Online</span>
                          ) : (
                            <span className="text-slate-400">⚪ Offline</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {log.health === "CRITICAL" ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                              🔴 Kritis
                            </span>
                          ) : log.health === "WARNING" ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                              🟡 Menipis
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              🟢 Aman
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CRITICAL EARLY WARNING BANNER */}
        {criticalGames.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-rose-900 text-sm sm:text-base">
                      🚨 PERINGATAN KRITIS: {criticalGames.length} Game Memiliki Stok 0 di Supplier Utama!
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-100 text-rose-800 border border-rose-300 font-semibold">
                      Risiko Tinggi Penalti Shopee
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 mt-1 max-w-3xl leading-relaxed">
                    Supplier utama kehabisan stok. Jika pembeli Shopee memesan sekarang, order akan gagal dipenuhi
                    (misskomunikasi & poin penalti NFR). Segera lakukan tindakan:{" "}
                    <strong>Ubah stok Shopee jadi 0</strong> atau <strong>1-Click Switch ke Supplier Cadangan</strong> di bawah.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStatusFilter("CRITICAL")}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Filter Game Kritis ({criticalGames.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* WARNING BANNER: If low stock <= 3 */}
        {criticalGames.length === 0 && warningGames.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">
                    ⚠️ Perhatian: {warningGames.length} Game Stok Menipis (≤ 3 Unit) di Supplier
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Disarankan membatasi angka stok di listing Shopee agar tidak terjadi lonjakan pesanan yang melebihi kuota supplier.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter("WARNING")}
                className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 text-xs font-semibold cursor-pointer"
              >
                Lihat ({warningGames.length}) Game
              </button>
            </div>
          </div>
        )}

        {/* 5 KPI BENTO GRID (INTERACTIVE FILTER) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Total Products */}
          <div 
            onClick={() => setStatusFilter("ALL")}
            className={`app-card p-4 flex flex-col justify-between cursor-pointer transition-all ${
              statusFilter === "ALL" ? "ring-2 ring-slate-900 border-slate-900" : "hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
              <span className="font-medium">Total Produk</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{totalGames}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Portofolio aktif</p>
            </div>
          </div>

          {/* Safe Stock */}
          <div
            onClick={() => setStatusFilter(statusFilter === "SAFE" ? "ALL" : "SAFE")}
            className={`app-card p-4 flex flex-col justify-between cursor-pointer transition-all ${
              statusFilter === "SAFE"
                ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500"
                : "hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-emerald-700 font-semibold">Stok Aman</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">{safeGames.length}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">≥ 4 Unit di supplier</p>
            </div>
          </div>

          {/* Warning Stock */}
          <div
            onClick={() => setStatusFilter(statusFilter === "WARNING" ? "ALL" : "WARNING")}
            className={`app-card p-4 flex flex-col justify-between cursor-pointer transition-all ${
              statusFilter === "WARNING"
                ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500"
                : "hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-amber-700 font-semibold">Stok Menipis</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">{warningGames.length}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">1 - 3 Unit tersisa</p>
            </div>
          </div>

          {/* Critical Empty Stock */}
          <div
            onClick={() => setStatusFilter(statusFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
            className={`app-card p-4 flex flex-col justify-between cursor-pointer transition-all ${
              statusFilter === "CRITICAL"
                ? "border-rose-500 bg-rose-50/50 ring-2 ring-rose-500"
                : "hover:border-rose-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-rose-700 font-semibold">Stok Habis (0)</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-rose-600 tabular-nums">
                {criticalGames.length}
              </div>
              <p className="text-[11px] text-rose-600 mt-0.5 font-bold">Wajib Ubah Shopee!</p>
            </div>
          </div>

          {/* Total Ready Stock Units */}
          <div className="app-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
              <span className="font-medium">Unit Siap Kirim</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {totalActiveUnits}{" "}
                <span className="text-xs text-slate-400 font-normal">
                  (+{totalStandbyUnits} cadangan)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Akumulasi pasokan supplier</p>
            </div>
          </div>
        </div>

        {/* TABS & FILTER BAR */}
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("PORTFOLIO")}
              className={`pb-3 text-xs sm:text-sm font-medium transition-all relative cursor-pointer ${
                activeTab === "PORTFOLIO"
                  ? "text-slate-900 font-bold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Portofolio Aktif Shopee & G2G</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold">
                  {analyzedGames.length}
                </span>
              </div>
              {activeTab === "PORTFOLIO" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("ENEBA_KEYS")}
              className={`pb-3 text-xs sm:text-sm font-medium transition-all relative cursor-pointer ${
                activeTab === "ENEBA_KEYS"
                  ? "text-slate-900 font-bold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Eneba CDKey Sentry (Redeem Code)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono border border-indigo-200 font-semibold">
                  Verified Search
                </span>
              </div>
              {activeTab === "ENEBA_KEYS" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Filter Controls for Portfolio tab */}
          {activeTab === "PORTFOLIO" && (
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between app-card p-3 bg-white">
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari judul game atau nama supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Status:</span>
                {[
                  { id: "ALL", label: "Semua Status" },
                  { id: "SAFE", label: "🟢 Aman" },
                  { id: "WARNING", label: "🟡 Menipis" },
                  { id: "CRITICAL", label: "🔴 Habis" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id as any)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                      statusFilter === st.id
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Platform Filter */}
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Platform:</span>
                {["ALL", "Steam", "Microsoft", "Rockstar", "EA"].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setPlatformFilter(plat)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                      platformFilter === plat
                        ? "bg-emerald-600 text-white font-semibold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {plat === "ALL" ? "Semua" : plat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT AREA */}
        {loading ? (
          <div className="space-y-4">
            <div className="app-card h-40 animate-pulse bg-slate-100" />
            <div className="app-card h-40 animate-pulse bg-slate-100" />
            <div className="app-card h-40 animate-pulse bg-slate-100" />
          </div>
        ) : activeTab === "PORTFOLIO" ? (
          /* PORTFOLIO TAB CONTENT */
          filteredGames.length === 0 ? (
            <div className="app-card p-12 text-center space-y-3 bg-white">
              <PackageSearch className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-slate-800 font-semibold text-sm">
                Tidak ada game yang cocok dengan kriteria filter.
              </div>
              <p className="text-xs text-slate-500">
                Coba ubah kata kunci pencarian atau reset filter status/platform di atas.
              </p>
              <button
                onClick={() => {
                  setStatusFilter("ALL");
                  setPlatformFilter("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Reset Semua Filter
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
                    className={`app-card overflow-hidden transition-all bg-white shadow-xs ${
                      isCritical
                        ? "border-rose-300"
                        : isWarning
                        ? "border-amber-300"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Game Card Header Bar */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-semibold">
                          {game.platform}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base">{game.title}</h3>
                        <span className="text-xs text-slate-400 font-mono">({game.category})</span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> STOK SUPPLIER HABIS (0)
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" /> STOK SUPPLIER MENIPIS (≤ 3)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> PASOKAN STOK AMAN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dual Action Body */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
                      
                      {/* Left Panel: Primary Supplier (Cols 1-7) */}
                      <div className="lg:col-span-7 bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              SUPPLIER UTAMA AKTIF
                            </div>
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                {game.selectedSeller.is_online !== undefined && (
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      game.selectedSeller.is_online ? "bg-emerald-500" : "bg-slate-400"
                                    }`}
                                    title={game.selectedSeller.is_online ? "Seller Online di G2G" : "Seller Offline di G2G"}
                                  />
                                )}
                                {game.selectedSeller.seller_name}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-semibold">
                                {game.selectedSeller.tier_label || "⚖️ Mid-Level"}
                              </span>
                              
                              {/* Fix Offer ID: use seller.offer_id || seller.profile_url */}
                              {(() => {
                                const oid = extractOfferId(game.selectedSeller.offer_id || game.selectedSeller.profile_url);
                                if (!oid) return null;
                                return (
                                  <a
                                    href={resolveG2GProductUrl(oid, game.selectedSeller.seller_name, game.title, game.stockHealth !== "CRITICAL")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 text-indigo-700 transition-colors flex items-center gap-1 group/link"
                                    title={`Buka live offer ${oid} di G2G`}
                                  >
                                    <span>ID: {oid}</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover/link:opacity-100" />
                                  </a>
                                );
                              })()}
                              
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold">
                                <Zap className="w-2.5 h-2.5" /> Faktual G2G SLS
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                              <span>⭐ {game.selectedSeller.rating_pct}%</span>
                              <span>•</span>
                              <span>{game.selectedSeller.reviews_count.toLocaleString()} ulasan</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">
                                {game.selectedSeller.delivery_speed}
                              </span>
                              {game.selectedSeller.is_online !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className={game.selectedSeller.is_online ? "text-emerald-700 font-medium" : "text-slate-400"}>
                                    {game.selectedSeller.is_online ? "Online di G2G" : "Offline"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Live Stock Display & Edit */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-500 uppercase font-mono">
                                STOK LIVE SUPPLIER
                              </div>
                              <div
                                className={`text-xl font-mono font-bold tabular-nums ${
                                  isCritical
                                    ? "text-rose-600"
                                    : isWarning
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {game.activeStock}{" "}
                                <span className="text-xs font-normal text-slate-500">Unit</span>
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
                              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs transition-colors shadow-xs cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Supplier Direct Link & Actions */}
                        <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200/60 flex-wrap gap-2">
                          <a
                            href={resolveDirectListingUrl(game.selectedSeller, game.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium underline"
                          >
                            <span>Buka Listing Asli Supplier di G2G/Eneba</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setDetectorUrl(game.selectedSeller.profile_url);
                                handleDetectLink(game.selectedSeller.profile_url);
                              }}
                              className="text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 font-mono text-[11px] px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                              title="Inspeksi & Deteksi Live Link Supplier Ini"
                            >
                              <Zap className="w-3 h-3 text-indigo-600" />
                              <span>Inspeksi Link Asli Live</span>
                            </button>

                            <button
                              onClick={() =>
                                setCompetitorModalGame({
                                  title: game.title,
                                  platform: game.platform,
                                  cogs_idr: game.selectedSeller.price_g2g_idr,
                                  current_shopee_price_idr: game.selling_price_shopee_idr,
                                })
                              }
                              className="text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <span>Cek Kompetitor Shopee</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Panel: Shopee Safe Listing Guide & Sync (Cols 8-12) */}
                      <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <Store className="w-3.5 h-3.5 text-orange-500" />
                            PANDUAN STOK LISTING SHOPEE
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                              <span className="text-xs text-slate-700 font-medium">
                                Rekomendasi Stok Shopee:
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-lg font-mono font-bold tabular-nums ${
                                    game.safeShopeeStock === 0
                                      ? "text-rose-600"
                                      : "text-emerald-600"
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
                                  className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Salin angka stok aman untuk di-paste ke Shopee Seller Center"
                                >
                                  {copiedId === `shopee-stock-${game.id}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Formula: <strong>Stok Supplier - 1 Unit</strong> (Buffer proteksi race condition jika pembeli lain membeli bersamaan).
                            </p>
                          </div>
                        </div>

                        {/* Action Link to Shopee */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Sinkronkan di Shopee Seller Center
                          </span>
                          <a
                            href="https://seller.shopee.co.id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold underline"
                          >
                            <span>Buka Seller Center</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Standby Suppliers Section (Bottom Redundancy Grid) */}
                    {game.standbySellers.length > 0 && (
                      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-800">
                              Supplier Cadangan (Redundansi Stok): {game.standbySellers.length} Toko Tersedia
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-500">
                            Total Pasokan Cadangan:{" "}
                            <strong className="text-emerald-700 font-bold tabular-nums">
                              {game.standbyStockTotal} Unit
                            </strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {game.standbySellers.map((standby) => {
                            const isStandbyEmpty = standby.stock === 0;
                            // Fix Offer ID extraction:
                            const standbyOid = extractOfferId(standby.offer_id || standby.profile_url);

                            return (
                              <div
                                key={standby.seller_id}
                                className={`p-3 rounded-xl border bg-white flex flex-col justify-between space-y-2 shadow-xs ${
                                  isStandbyEmpty ? "border-slate-200 opacity-60" : "border-slate-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-xs text-slate-900 truncate">
                                      {standby.seller_name}
                                    </span>
                                    <span
                                      className={`text-xs font-mono font-bold tabular-nums ${
                                        isStandbyEmpty ? "text-rose-600" : "text-emerald-600"
                                      }`}
                                    >
                                      {standby.stock} Unit
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                                    <span>⭐ {standby.rating_pct}%</span>
                                    <span>•</span>
                                    <span>{formatRp(standby.price_g2g_idr)}</span>
                                  </div>

                                  {standbyOid && (
                                    <div className="mt-1 text-[10px] font-mono text-indigo-700">
                                      Offer ID: {standbyOid}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                  <a
                                    href={resolveDirectListingUrl(standby, game.title)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                  >
                                    <span>Cek Listing</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>

                                  <button
                                    disabled={switchingSupplierId === standby.seller_id || isStandbyEmpty}
                                    onClick={() =>
                                      handleSwitchSupplier(
                                        game.id,
                                        game.title,
                                        standby.seller_id,
                                        standby.seller_name
                                      )
                                    }
                                    className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                                  >
                                    {switchingSupplierId === standby.seller_id
                                      ? "Mengalihkan..."
                                      : "Switch ke Supplier Ini"}
                                  </button>
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
          )
        ) : (
          /* ENEBA KEYS TAB CONTENT */
          <div className="space-y-4">
            <div className="app-card p-4 bg-indigo-50/50 border border-indigo-200 text-xs text-indigo-900 leading-relaxed flex items-start gap-3">
              <Zap className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">
                  Eneba CDKey Sentry: Pasokan Digital Key Global 100% Instan
                </strong>
                Berbeda dengan akun sharing/primary, game tipe Digital CDKey (Steam/Xbox Global Key) di
                Eneba dikirimkan seketika dalam hitungan detik setelah checkout. Gunakan portal ini
                untuk verifikasi harga modal CDKey tercepat.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enebaList.map((item) => (
                <div
                  key={item.key}
                  className="app-card p-4 space-y-3 bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                        {item.platform}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ⚡ INSTANT CDKEY
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Estimasi Modal:{" "}
                      <strong className="text-slate-800 tabular-nums">
                        {formatRp(item.estimatedPriceIdr)}
                      </strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Region: Global</span>
                    <a
                      href={item.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Cari di Eneba</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDIT STOCK MODAL */}
        {editingStockState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="app-card rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl bg-white border-slate-200 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>Ubah / Simulasi Stok Supplier</span>
                </div>
                <button
                  onClick={() => setEditingStockState(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Game:</span>
                  <strong className="text-slate-900 text-sm">{editingStockState.gameTitle}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">Nama Seller:</span>
                  <strong className="text-slate-900">{editingStockState.sellerName}</strong>
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">
                    Angka Stok Real Baru (Unit):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStockValue}
                    onChange={(e) => setNewStockValue(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Isi 0 untuk mensimulasikan skenario stok habis (Critical failover warning).
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStockState(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStock}
                  onClick={handleSaveStockUpdate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingStock ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETEKTOR LIVE LINK MODAL */}
        {showDetectorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="app-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl bg-white border-slate-200 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span>Detektor & Inspektur Live Link G2G / Eneba</span>
                </div>
                <button
                  onClick={() => setShowDetectorModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Input Bar */}
              <div className="space-y-2">
                <label className="text-xs text-slate-600 font-medium">
                  URL Listing G2G / Eneba atau Offer ID:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={detectorUrl}
                    onChange={(e) => setDetectorUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDetectLink()}
                    placeholder="https://www.g2g.com/.../offer/G1703129821471UK..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <button
                    onClick={() => handleDetectLink()}
                    disabled={isDetecting || !detectorUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {isDetecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Deteksi</span>
                  </button>
                </div>
              </div>

              {/* Results */}
              {detectedData && (
                <div className="space-y-4 pt-2 border-t border-slate-200">
                  <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {detectedData.platform} • {detectedData.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                          {detectedData.clean_title}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">Stok Faktual G2G</div>
                        <div className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                          {detectedData.real_stock.toLocaleString()} Unit
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-200/60 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Toko Seller</span>
                        <strong className="text-slate-900">{detectedData.seller_name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Harga Modal G2G</span>
                        <strong className="text-slate-900 tabular-nums">{formatRp(detectedData.price_idr)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Saran Jual Shopee</span>
                        <strong className="text-emerald-700 tabular-nums">{formatRp(detectedData.recommended_shopee_price_idr)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Reputasi Toko</span>
                        <strong className="text-slate-900">{detectedData.rating_pct}% ({detectedData.reviews_count.toLocaleString()})</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowDetectorModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                    >
                      Tutup
                    </button>
                    <button
                      onClick={handleApplyDetectedToCatalog}
                      disabled={isApplyingDetected}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isApplyingDetected ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menerapkan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{detectedData.matching_game_id ? "Terapkan Sebagai Supplier" : "Tambahkan Game ke Katalog"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competitor Modal */}
        {competitorModalGame && (
          <ShopeeCompetitorModal
            isOpen={!!competitorModalGame}
            onClose={() => setCompetitorModalGame(null)}
            gameTitle={competitorModalGame.title}
            platform={competitorModalGame.platform}
            currentPriceIdr={competitorModalGame.current_shopee_price_idr}
            costG2gIdr={competitorModalGame.cogs_idr}
            onApplyPrice={() => {
              setCompetitorModalGame(null);
              fetchCatalog();
            }}
          />
        )}

      </div>
    </div>
  );
}
