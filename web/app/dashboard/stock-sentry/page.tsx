"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import {
  evaluateSellerTrust,
  formatOrdersCompact,
  getTrustTierBadgeStyle,
} from "@/lib/sellerTrust";
import { resolveG2GProductUrl } from "@/lib/g2g";
import { getEnebaSearchUrl } from "@/lib/eneba";
import {
  ShieldAlert,
  ShieldCheck,
  PackageSearch,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Zap,
  Sparkles,
  Copy,
  Check,
  X,
  PauseCircle,
  PlayCircle,
  ArrowRightLeft,
  Star,
  Sliders,
  Info,
  Store,
} from "lucide-react";
import SellerReviewModal, {
  SellerPreviewGameEntry,
} from "@/app/components/SellerReviewModal";

interface Seller {
  seller_id: string;
  seller_name: string;
  tier?: string;
  tier_label?: string;
  tier_desc?: string;
  rating_pct?: number;
  reviews_count?: number;
  seller_rating?: number;
  seller_orders?: number;
  seller_level?: string;
  verified?: boolean;
  delivery_time?: string;
  trust_score?: number;
  trust_tier?: string;
  price_g2g_idr: number;
  delivery_speed?: string;
  stock: number;
  is_recommended?: boolean;
  profile_url?: string;
  fallback_search_url?: string;
  is_online?: boolean;
  live_status?: string;
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

interface RiskAlertItem {
  id: string;
  gameId: string;
  gameTitle: string;
  platform: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  sellerOrders: number;
  trustTier: string;
  severity: "CRITICAL" | "HIGH" | "WARNING";
  category: "STOCK_OUT" | "LOW_STOCK" | "LOW_MARGIN" | "LOW_TRUST";
  title: string;
  description: string;
  hasBackupSeller: boolean;
  bestBackup?: Seller;
  isPaused: boolean;
}

function formatRp(val: number): string {
  return "Rp " + Math.round(val || 0).toLocaleString("id-ID");
}

function resolveListingUrl(seller?: Partial<Seller>, gameTitle?: string): string {
  if (
    seller?.profile_url?.includes("eneba.com") ||
    seller?.fallback_search_url?.includes("eneba.com")
  ) {
    return (
      seller.profile_url ||
      seller.fallback_search_url ||
      getEnebaSearchUrl(gameTitle || "")
    );
  }
  const rawUrl =
    seller?.profile_url || seller?.offer_id || seller?.fallback_search_url;
  return resolveG2GProductUrl(
    rawUrl,
    seller?.seller_name,
    gameTitle,
    seller?.live_status !== "delisted"
  );
}

function SentryRiskHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "risk" ? "RISK" : "STOCK";

  const [activeTab, setActiveTab] = useState<"STOCK" | "RISK">(initialTab);
  const [catalog, setCatalog] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CRITICAL" | "SAFE">("ALL");
  const [safeOnlyFilter, setSafeOnlyFilter] = useState(false);
  const [freshSteamOnlyFilter, setFreshSteamOnlyFilter] = useState(true);

  // Live Sync Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);
  const [findingSellerGameId, setFindingSellerGameId] = useState<string | null>(null);
  const [switchingSellerId, setSwitchingSellerId] = useState<string | null>(null);
  const [sellerReviewOpen, setSellerReviewOpen] = useState(false);
  const [sellerReviewPreviews, setSellerReviewPreviews] = useState<SellerPreviewGameEntry[]>([]);
  const [isApplyingSellerReview, setIsApplyingSellerReview] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [pausingGameId, setPausingGameId] = useState<string | null>(null);

  // Detail Slide-Over Drawer
  const [detailGameId, setDetailGameId] = useState<string | null>(null);
  const [editingStockVal, setEditingStockVal] = useState<number>(0);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Threat Scan inside Drawer / Risk Tab
  const [aiScanLoading, setAiScanLoading] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<any | null>(null);

  // Link Detector Modal
  const [showDetectorModal, setShowDetectorModal] = useState(false);
  const [detectorUrl, setDetectorUrl] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedData, setDetectedData] = useState<any | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  useEffect(() => {
    if (searchParams.get("tab") === "risk") {
      setActiveTab("RISK");
    }
  }, [searchParams]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await fetchSmartCatalog();
      if (Array.isArray(data)) {
        setCatalog(data);
      }
    } catch (err) {
      console.error("Gagal memuat katalog:", err);
      showToast("Gagal memuat katalog produk.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Enrich each catalog item with live margin, risk status, and Seller Trust metrics
  const analyzedRows = useMemo(() => {
    return catalog.map((game) => {
      const selectedSeller =
        game.sellers?.find((s) => s.seller_id === game.selected_seller_id) ||
        game.sellers?.[0] || {
          seller_id: "none",
          seller_name: "Belum Dipilih",
          stock: 0,
          price_g2g_idr: 0,
          rating_pct: 0,
          reviews_count: 0,
          delivery_speed: "N/A",
        };

      const sellingPrice = Number(game.selling_price_shopee_idr || 0);
      const cogs = Number(selectedSeller.price_g2g_idr || 0);
      const trust = evaluateSellerTrust({
        rating: selectedSeller.seller_rating ?? selectedSeller.rating_pct,
        orders: selectedSeller.seller_orders ?? selectedSeller.reviews_count,
        reviews: selectedSeller.reviews_count,
        stock: selectedSeller.stock,
        priceIdr: cogs,
        sellingPriceShopeeIdr: sellingPrice,
        deliverySpeed: selectedSeller.delivery_time || selectedSeller.delivery_speed,
        isOnline: selectedSeller.is_online,
        sellerLevel: selectedSeller.seller_level,
        verified: selectedSeller.verified,
      });

      const activeStock = Number(selectedSeller.stock ?? 0);
      const safeShopeeStock = activeStock === 0 ? 0 : Math.max(1, activeStock - 1);
      const targetMargin = Number(game.target_margin_pct || 15);
      const isLowMargin = trust.net_margin_pct < Math.min(15, targetMargin);
      const isDelisted = selectedSeller.live_status === "delisted";

      let riskStatus: "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
      if (activeStock === 0 || isDelisted || trust.seller_rating < 92) {
        riskStatus = "CRITICAL";
      } else if (activeStock <= 3 || isLowMargin || trust.trust_tier === "Caution (C)") {
        riskStatus = "WARNING";
      }

      const backupSellers = (game.sellers || [])
        .filter((s) => s.seller_id !== selectedSeller.seller_id)
        .map((s) => ({
          ...s,
          trust: evaluateSellerTrust({
            rating: s.seller_rating ?? s.rating_pct,
            orders: s.seller_orders ?? s.reviews_count,
            reviews: s.reviews_count,
            stock: s.stock,
            priceIdr: s.price_g2g_idr,
            sellingPriceShopeeIdr: sellingPrice,
            deliverySpeed: s.delivery_time || s.delivery_speed,
            isOnline: s.is_online,
          }),
        }))
        .sort((a, b) => b.trust.trust_score - a.trust.trust_score);

      const bestHealthyBackup = backupSellers.find(
        (b) => Number(b.stock || 0) > 0 && b.trust.net_margin_pct >= 10 && !b.trust.is_hard_rejected
      );

      return {
        game,
        selectedSeller,
        trust,
        activeStock,
        safeShopeeStock,
        isLowMargin,
        isDelisted,
        riskStatus,
        backupSellers,
        bestHealthyBackup,
        isPaused: game.status === "paused",
      };
    });
  }, [catalog]);

  // Compact 4 KPI numbers
  const kpiStats = useMemo(() => {
    const stokKritis = analyzedRows.filter((r) => r.activeStock === 0 || r.isDelisted).length;
    const risikoAktif = analyzedRows.filter((r) => r.riskStatus !== "SAFE").length;
    const marginBelowTarget = analyzedRows.filter((r) => r.isLowMargin).length;
    const totalDipantau = analyzedRows.length;
    return { stokKritis, risikoAktif, marginBelowTarget, totalDipantau };
  }, [analyzedRows]);

  // Priority Risk Alerts for Tab 2
  const riskAlerts = useMemo(() => {
    const alerts: RiskAlertItem[] = [];
    for (const row of analyzedRows) {
      const base = {
        gameId: row.game.id,
        gameTitle: row.game.title,
        platform: row.game.platform,
        sellerId: row.selectedSeller.seller_id,
        sellerName: row.selectedSeller.seller_name,
        sellerRating: row.trust.seller_rating,
        sellerOrders: row.trust.seller_orders,
        trustTier: row.trust.trust_tier,
        hasBackupSeller: Boolean(row.bestHealthyBackup),
        bestBackup: row.bestHealthyBackup,
        isPaused: row.isPaused,
      };

      if (row.activeStock === 0 || row.isDelisted) {
        const id = `${row.game.id}-stockout`;
        if (!dismissedAlerts.has(id)) {
          alerts.push({
            ...base,
            id,
            severity: "CRITICAL",
            category: "STOCK_OUT",
            title: row.isDelisted ? "Offer G2G Delisted / Tutup" : "Stok Supplier Utama Habis (0 Unit)",
            description: "Berisiko gagal kirim (penalti NFR Shopee). Segera ganti ke supplier cadangan atau pause listing.",
          });
        }
      } else if (row.activeStock <= 3) {
        const id = `${row.game.id}-lowstock`;
        if (!dismissedAlerts.has(id)) {
          alerts.push({
            ...base,
            id,
            severity: "WARNING",
            category: "LOW_STOCK",
            title: `Stok Menipis (${row.activeStock} Unit Tersisa)`,
            description: "Siapkan supplier cadangan atau sesuaikan stok etalase Shopee agar tidak oversell.",
          });
        }
      }

      if (row.isLowMargin) {
        const id = `${row.game.id}-margin`;
        if (!dismissedAlerts.has(id)) {
          alerts.push({
            ...base,
            id,
            severity: row.trust.net_margin_pct <= 0 ? "CRITICAL" : "HIGH",
            category: "LOW_MARGIN",
            title: `Margin Bersih di Bawah Target (${row.trust.net_margin_pct}%)`,
            description: `Laba saat ini ${formatRp(row.trust.net_profit_idr)} dengan modal ${formatRp(row.selectedSeller.price_g2g_idr)}. Cari supplier lebih murah atau naikkan harga Shopee.`,
          });
        }
      }

      if (row.trust.trust_tier === "Caution (C)" || row.trust.seller_rating < 95 || row.trust.seller_orders < 20) {
        const id = `${row.game.id}-trust`;
        if (!dismissedAlerts.has(id)) {
          alerts.push({
            ...base,
            id,
            severity: row.trust.seller_rating < 92 ? "CRITICAL" : "HIGH",
            category: "LOW_TRUST",
            title: `Reputasi Seller Perlu Waspada (${row.trust.trust_tier})`,
            description: `Rating ${row.trust.seller_rating}% dengan ${row.trust.seller_orders} transaksi. Disarankan beralih ke seller Safe (A+).`,
          });
        }
      }
    }

    const orderWeight = { CRITICAL: 0, HIGH: 1, WARNING: 2 };
    return alerts.sort((a, b) => orderWeight[a.severity] - orderWeight[b.severity]);
  }, [analyzedRows, dismissedAlerts]);

  // Filtered Rows for Tab 1
  const filteredRows = useMemo(() => {
    return analyzedRows.filter((row) => {
      if (statusFilter === "CRITICAL" && row.riskStatus === "SAFE") return false;
      if (statusFilter === "SAFE" && row.riskStatus !== "SAFE") return false;
      if (safeOnlyFilter && (row.trust.seller_rating < 95 || row.trust.seller_orders < 20)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = row.game.title.toLowerCase().includes(q);
        const mPlat = row.game.platform.toLowerCase().includes(q);
        const mSeller = row.selectedSeller.seller_name.toLowerCase().includes(q);
        if (!mTitle && !mPlat && !mSeller) return false;
      }
      return true;
    });
  }, [analyzedRows, statusFilter, safeOnlyFilter, searchQuery]);

  // Active detail game for Slide-Over Drawer
  const detailRow = useMemo(() => {
    if (!detailGameId) return null;
    return analyzedRows.find((r) => r.game.id === detailGameId) || null;
  }, [analyzedRows, detailGameId]);

  useEffect(() => {
    if (detailRow) {
      setEditingStockVal(detailRow.activeStock);
      setAiScanResult(null);
    }
  }, [detailRow?.game.id]);

  // Actions
  const handleScanAllLive = async () => {
    try {
      setIsAuditing(true);
      showToast("Menghubungi G2G Live SLS API untuk audit stok & harga...", "warning");
      const res = await fetch("/api/inventory/live-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_refresh: true }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setLastAuditTime(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        await loadCatalog();
        showToast(`Audit live selesai! ${json.synced_count || 0} seller tersinkronisasi.`, "success");
      } else {
        showToast(json.message || "Gagal sinkronisasi live.", "error");
      }
    } catch {
      showToast("Koneksi ke G2G SLS gagal.", "error");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFindReplacementSeller = async (gameId: string, gameTitle: string) => {
    try {
      setFindingSellerGameId(gameId);
      const res = await fetch("/api/catalog/auto-find-sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          title: gameTitle,
          mode: "single",
          safeOnly: safeOnlyFilter,
          freshOnly: freshSteamOnlyFilter,
          preview_only: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success" && Array.isArray(json.sellers) && json.sellers.length > 0) {
        const target = json.game || catalog.find((g) => g.id === gameId);
        setSellerReviewPreviews([
          {
            game_id: gameId,
            game_title: target?.title || gameTitle,
            platform: target?.platform,
            selling_price_shopee_idr: target?.selling_price_shopee_idr || 100000,
            current_selected_seller_id: target?.selected_seller_id,
            recommended_selected_seller_id: json.recommended_selected_seller_id,
            candidates: json.sellers,
            filtered_out_clickbait_count: json.filtered_out_clickbait_count,
            filtered_out_non_fresh_count: json.filtered_out_non_fresh_count,
            verified_fresh_count: json.verified_fresh_count,
            fresh_fallback_warning: json.fresh_fallback_warning,
            clean_candidates_count: json.clean_candidates_count,
            total_raw_offers: json.total_raw_offers,
          },
        ]);
        setSellerReviewOpen(true);
        showToast(json.message || "Kandidat seller siap direview!", "success");
      } else {
        showToast(json.message || "Gagal mencari seller pengganti.", json.status === "warning" ? "warning" : "error");
      }
    } catch {
      showToast("Gagal menghubungi API auto-find-sellers.", "error");
    } finally {
      setFindingSellerGameId(null);
    }
  };

  const handleConfirmApplySellers = async (
    updates: Array<{ game_id: string; sellers: any[]; selected_seller_id: string }>
  ) => {
    if (updates.length === 0) return;
    setIsApplyingSellerReview(true);
    try {
      const res = await fetch("/api/catalog/auto-find-sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "apply_preview", updates }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        await loadCatalog();
        if (updates.length === 1) {
          setDetailGameId(updates[0].game_id);
        }
        setSellerReviewOpen(false);
        setSellerReviewPreviews([]);
        showToast(json.message || "Pilihan seller diterapkan & disimpan ke database!", "success");
      } else {
        showToast(json.message || "Gagal menyimpan pilihan seller.", "error");
      }
    } catch {
      showToast("Kesalahan jaringan saat menyimpan pilihan seller.", "error");
    } finally {
      setIsApplyingSellerReview(false);
    }
  };

  const handleSwitchSeller = async (
    gameId: string,
    gameTitle: string,
    sellerId: string,
    sellerName: string
  ) => {
    try {
      setSwitchingSellerId(sellerId);
      const res = await fetch("/api/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          title: gameTitle,
          selected_seller_id: sellerId,
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        await loadCatalog();
        showToast(`Berhasil beralih ke supplier "${sellerName}".`, "success");
      } else {
        showToast(json.message || "Gagal mengganti supplier.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan saat mengganti supplier.", "error");
    } finally {
      setSwitchingSellerId(null);
    }
  };

  const handleTogglePauseListing = async (gameId: string, gameTitle: string, currentlyPaused: boolean) => {
    try {
      setPausingGameId(gameId);
      const nextStatus = currentlyPaused ? "active" : "paused";
      const res = await fetch("/api/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          title: gameTitle,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        await loadCatalog();
        showToast(
          currentlyPaused
            ? `Listing "${gameTitle}" diaktifkan kembali.`
            : `Listing "${gameTitle}" di-pause sementara untuk mencegah penalti Shopee.`,
          "success"
        );
      } else {
        showToast(json.message || "Gagal memperbarui status listing.", "error");
      }
    } catch {
      showToast("Gagal menghubungi server katalog.", "error");
    } finally {
      setPausingGameId(null);
    }
  };

  const handleSaveStockDrawer = async () => {
    if (!detailRow) return;
    try {
      setIsSavingStock(true);
      const res = await fetch("/api/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: detailRow.game.id,
          title: detailRow.game.title,
          seller_id: detailRow.selectedSeller.seller_id,
          action: "update_stock",
          stock: Math.max(0, Number(editingStockVal)),
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        await loadCatalog();
        showToast(`Stok diperbarui menjadi ${editingStockVal} unit.`, "success");
      }
    } catch {
      showToast("Gagal menyimpan perubahan stok.", "error");
    } finally {
      setIsSavingStock(false);
    }
  };

  const handleRunSellerAiScan = async (sellerName: string, rating: number, orders: number) => {
    setAiScanLoading(true);
    setAiScanResult(null);
    try {
      const res = await fetch("/api/ai/seller-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_name: sellerName,
          reviews_sample: [
            `Rating positif: ${rating}% | Transaksi selesai: ${orders}`,
            "Instant delivery & Full Access account verification",
          ],
        }),
      });
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setAiScanResult(json.data);
      }
    } catch {
      showToast("Gagal menjalankan AI Threat Scan.", "error");
    } finally {
      setAiScanLoading(false);
    }
  };

  const handleDetectLink = async () => {
    const u = detectorUrl.trim();
    if (!u) return;
    setIsDetecting(true);
    try {
      const res = await fetch("/api/inventory/detect-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setDetectedData(json.data);
        showToast(`Terdeteksi: ${json.data.clean_title} (${json.data.real_stock} unit)`, "success");
      } else {
        showToast(json.message || "Gagal mendeteksi link.", "error");
      }
    } catch {
      showToast("Gagal menghubungi endpoint deteksi link.", "error");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCopyText = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
    showToast(`Disalin: ${val}`, "success");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border text-xs shadow-xl bg-white animate-fade-up ${
              toast.type === "success"
                ? "border-emerald-200"
                : toast.type === "warning"
                ? "border-amber-200"
                : "border-rose-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium text-slate-800">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LAPIS 1: HEADER & COMPACT KPI STRIP (1 BARIS)                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 text-emerald-600" />
                <span>Sentry &amp; Risk Hub</span>
              </h1>
              {lastAuditTime && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                  Sync {lastAuditTime} WIB
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Monitoring stok supplier live, reputasi seller, dan radar risiko margin dalam satu layar terpadu.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowDetectorModal(true)}
              className="btn-secondary btn-tactile text-xs px-3 py-2 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cek Link Offer</span>
            </button>

            <button
              type="button"
              onClick={handleScanAllLive}
              disabled={isAuditing}
              className="btn-primary-emerald btn-tactile text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              <span>{isAuditing ? "Memindai Live..." : "Scan Live Semua"}</span>
            </button>
          </div>
        </div>

        {/* 4 Compact KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="app-card p-3.5 flex items-center justify-between animate-fade-up stagger-1">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Stok Kritis</span>
              <span className="text-xl font-bold font-mono text-rose-600 tabular-nums">
                {kpiStats.stokKritis}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="app-card p-3.5 flex items-center justify-between animate-fade-up stagger-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Risiko Aktif</span>
              <span className="text-xl font-bold font-mono text-amber-600 tabular-nums">
                {riskAlerts.length}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="app-card p-3.5 flex items-center justify-between animate-fade-up stagger-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Margin &lt; Target</span>
              <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {kpiStats.marginBelowTarget}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <Sliders className="w-4 h-4" />
            </div>
          </div>

          <div className="app-card p-3.5 flex items-center justify-between animate-fade-up stagger-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Total Dipantau</span>
              <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
                {kpiStats.totalDipantau}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <PackageSearch className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LAPIS 2: TAB SWITCHER & CONTROLS                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* 2 Main Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => {
                setActiveTab("STOCK");
                router.replace("/dashboard/stock-sentry", { scroll: false });
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "STOCK"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PackageSearch className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Stock &amp; Supplier ({analyzedRows.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("RISK");
                router.replace("/dashboard/stock-sentry?tab=risk", { scroll: false });
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "RISK"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Risk Radar &amp; Audit</span>
              {riskAlerts.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-700">
                  {riskAlerts.length}
                </span>
              )}
            </button>
          </div>

          {/* Search, Quick Filter & Safe Seller Toggle */}
          {activeTab === "STOCK" && (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari game / seller..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-slate-200 text-xs">
                {(
                  [
                    { key: "ALL", label: "Semua" },
                    { key: "CRITICAL", label: "Kritis / Waspada" },
                    { key: "SAFE", label: "Aman" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      statusFilter === f.key
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-medium cursor-pointer select-none hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={safeOnlyFilter}
                  onChange={(e) => setSafeOnlyFilter(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Hanya Seller Aman (&ge;95% &amp; &ge;20 Transaksi)</span>
              </label>

              <label
                title="Anti-Hackback: Prioritaskan seller Steam 0 Hours Played / Fresh saat mencari pengganti"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-colors ${
                  freshSteamOnlyFilter
                    ? "bg-teal-50 border-teal-300 text-teal-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={freshSteamOnlyFilter}
                  onChange={(e) => setFreshSteamOnlyFilter(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>🛡️ 0h Fresh Steam</span>
              </label>
            </div>
          )}
        </div>

        {/* ── TAB 1: LIVE STOCK & SUPPLIER TABLE ───────────────────────────── */}
        {activeTab === "STOCK" && (
          <div className="app-card overflow-hidden bg-white animate-fade-up">
            {loading ? (
              <div className="p-8 space-y-3">
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <PackageSearch className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-800">
                  Tidak ada item sesuai filter saat ini
                </div>
                <p className="text-xs text-slate-500">
                  Ubah filter pencarian atau tambahkan produk di{" "}
                  <Link href="/dashboard/catalog" className="text-emerald-700 underline font-semibold">
                    Radar Katalog
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-200">
                  {filteredRows.map((row) => {
                    const isFinding = findingSellerGameId === row.game.id;
                    return (
                      <div
                        key={`mob-${row.game.id}`}
                        onClick={() => setDetailGameId(row.game.id)}
                        className="p-3.5 space-y-2.5 text-xs bg-white hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">{row.game.title}</span>
                              {row.isPaused && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                                  PAUSED
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                              {row.game.platform} &bull; {row.game.category}
                            </span>
                          </div>
                          {row.riskStatus === "CRITICAL" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                              Kritis
                            </span>
                          ) : row.riskStatus === "WARNING" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              Waspada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Aman
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-900">{row.selectedSeller.seller_name}</span>{" "}
                            <span className="text-amber-600">★ {row.trust.seller_rating}%</span>
                            <div className="text-[10px] text-slate-500">
                              Stok{" "}
                              <strong className={row.activeStock === 0 ? "text-rose-600" : row.activeStock <= 3 ? "text-amber-600" : "text-emerald-700"}>
                                {row.activeStock} unit
                              </strong>{" "}
                              &bull; {formatRp(row.selectedSeller.price_g2g_idr)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold block tabular-nums ${row.trust.net_margin_pct < 0 ? "text-rose-600" : row.isLowMargin ? "text-amber-600" : "text-emerald-700"}`}>
                              {row.trust.net_margin_pct.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-500 tabular-nums">
                              {formatRp(row.trust.net_profit_idr)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleFindReplacementSeller(row.game.id, row.game.title)}
                            disabled={isFinding}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-3 h-3 text-amber-600 ${isFinding ? "animate-spin" : ""}`} />
                            <span>{isFinding ? "Mencari..." : "Pengganti"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailGameId(row.game.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[680px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Game &amp; Platform</th>
                      <th className="px-3 py-3">Supplier + Rating Badge</th>
                      <th className="px-3 py-3">Stok &amp; Modal (IDR)</th>
                      <th className="px-3 py-3 text-right">Est. Margin</th>
                      <th className="px-3 py-3">Risiko</th>
                      <th className="px-3 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => {
                      const isFinding = findingSellerGameId === row.game.id;

                      return (
                        <tr
                          key={row.game.id}
                          onClick={() => setDetailGameId(row.game.id)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          {/* Game & Platform */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 truncate max-w-[180px]">
                                {row.game.title}
                              </span>
                              {row.isPaused && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                                  PAUSED
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 block mt-0.5 truncate max-w-[180px]">
                              {row.game.platform} &bull; {row.game.category}
                            </span>
                          </td>

                          {/* Supplier + Rating Badge */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {row.selectedSeller.seller_name}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getTrustTierBadgeStyle(
                                  row.trust.trust_tier
                                )}`}
                              >
                                {row.trust.trust_tier}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span className="text-amber-600 font-semibold">
                                ★ {row.trust.seller_rating}%
                              </span>
                              <span>&bull;</span>
                              <span>{formatOrdersCompact(row.trust.seller_orders)}</span>
                              <span>&bull;</span>
                              <span>Skor {row.trust.trust_score}/100</span>
                            </div>
                          </td>

                          {/* Stok & Modal */}
                          <td className="px-3 py-3 font-mono whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-bold tabular-nums ${
                                  row.activeStock === 0
                                    ? "text-rose-600"
                                    : row.activeStock <= 3
                                    ? "text-amber-600"
                                    : "text-emerald-700"
                                }`}
                              >
                                {row.activeStock} unit
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="font-semibold text-slate-800 tabular-nums">
                                {formatRp(row.selectedSeller.price_g2g_idr)}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 tabular-nums block mt-0.5">
                              Buffer aman: {row.safeShopeeStock} unit
                            </span>
                          </td>

                          {/* Est. Margin */}
                          <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                            <span
                              className={`font-bold tabular-nums block ${
                                row.trust.net_margin_pct < 0
                                  ? "text-rose-600"
                                  : row.isLowMargin
                                  ? "text-amber-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {row.trust.net_margin_pct.toFixed(1)}%
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {formatRp(row.trust.net_profit_idr)}
                            </span>
                          </td>

                          {/* Status Risiko */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            {row.riskStatus === "CRITICAL" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" />
                                <span>Kritis</span>
                              </span>
                            ) : row.riskStatus === "WARNING" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Waspada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aman</span>
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td
                            className="px-3 py-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleFindReplacementSeller(row.game.id, row.game.title)
                                }
                                disabled={isFinding}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Sparkles
                                  className={`w-3 h-3 text-amber-600 ${
                                    isFinding ? "animate-spin" : ""
                                  }`}
                                />
                                <span>{isFinding ? "Mencari..." : "Pengganti"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDetailGameId(row.game.id)}
                                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Detail
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 2: RISK RADAR & AUDIT ─────────────────────────────────────── */}
        {activeTab === "RISK" && (
          <div className="space-y-4 animate-fade-up">
            {riskAlerts.length === 0 ? (
              <div className="app-card p-10 text-center bg-white space-y-2.5">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">
                  Tidak Ada Peringatan Risiko Prioritas Tinggi
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Seluruh produk di portofolio memiliki stok cukup, margin sehat, dan seller bereputasi tinggi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {riskAlerts.map((alert) => {
                  const isFinding = findingSellerGameId === alert.gameId;
                  const isPausing = pausingGameId === alert.gameId;

                  return (
                    <div
                      key={alert.id}
                      className={`app-card p-4 sm:p-5 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        alert.severity === "CRITICAL"
                          ? "border-l-4 border-l-rose-500"
                          : alert.severity === "HIGH"
                          ? "border-l-4 border-l-amber-500"
                          : "border-l-4 border-l-yellow-400"
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              alert.severity === "CRITICAL"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {alert.gameTitle}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            ({alert.platform})
                          </span>
                          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {alert.sellerName} &bull; ★ {alert.sellerRating}% &bull;{" "}
                            {formatOrdersCompact(alert.sellerOrders)} &bull; {alert.trustTier}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-800">
                          {alert.title}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {alert.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {alert.hasBackupSeller && alert.bestBackup ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSwitchSeller(
                                alert.gameId,
                                alert.gameTitle,
                                alert.bestBackup!.seller_id,
                                alert.bestBackup!.seller_name
                              )
                            }
                            disabled={switchingSellerId === alert.bestBackup.seller_id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Ganti ke {alert.bestBackup.seller_name}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleFindReplacementSeller(alert.gameId, alert.gameTitle)
                            }
                            disabled={isFinding}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles
                              className={`w-3.5 h-3.5 ${isFinding ? "animate-spin" : ""}`}
                            />
                            <span>{isFinding ? "Mencari..." : "Ganti Seller"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleTogglePauseListing(
                              alert.gameId,
                              alert.gameTitle,
                              alert.isPaused
                            )
                          }
                          disabled={isPausing}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            alert.isPaused
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {alert.isPaused ? (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Aktifkan Listing</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>Pause Listing</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDismissedAlerts((prev) => {
                              const next = new Set(prev);
                              next.add(alert.id);
                              return next;
                            });
                            showToast("Alert ditandai selesai.", "success");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium cursor-pointer"
                        >
                          Tandai Selesai
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LAPIS 3: DETAIL SLIDE-OVER DRAWER (HANYA MUNCUL SAAT BARIS DIKLIK)  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {detailRow && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setDetailGameId(null)}
        >
          <div
            className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl border-l border-slate-200 p-5 sm:p-6 space-y-5 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  {detailRow.game.platform} &bull; {detailRow.game.category}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1.5">
                  {detailRow.game.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  ID: {detailRow.game.id} &bull; Status:{" "}
                  {detailRow.isPaused ? "PAUSED" : "ACTIVE"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailGameId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Profit Formula Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Breakdown Profit Full-Digital</span>
                <span className="font-mono text-emerald-700 tabular-nums">
                  {detailRow.trust.net_margin_pct.toFixed(1)}% ({formatRp(detailRow.trust.net_profit_idr)})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500 block font-sans">Harga Jual Shopee</span>
                  <strong className="text-slate-900 tabular-nums">
                    {formatRp(detailRow.game.selling_price_shopee_idr)}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500 block font-sans">Modal Supplier</span>
                  <strong className="text-slate-900 tabular-nums">
                    {formatRp(detailRow.selectedSeller.price_g2g_idr)}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500 block font-sans">Fee Shopee (8% + 1k)</span>
                  <strong className="text-rose-600 tabular-nums">
                    -{formatRp(Math.round(detailRow.game.selling_price_shopee_idr * 0.08) + 1000)}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500 block font-sans">QRIS (0.7%) + Pack (Rp 0)</span>
                  <strong className="text-slate-700 tabular-nums">
                    -{formatRp(Math.round(detailRow.selectedSeller.price_g2g_idr * 0.007))}
                  </strong>
                </div>
              </div>
            </div>

            {/* Active Stock & Quick Copy Buffer */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Kontrol Stok &amp; Tautan Supplier</span>
                <a
                  href={resolveListingUrl(detailRow.selectedSeller, detailRow.game.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <span>Buka Offer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={editingStockVal}
                  onChange={(e) => setEditingStockVal(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleSaveStockDrawer}
                  disabled={isSavingStock}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSavingStock ? "Menyimpan..." : "Update Stok"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      String(detailRow.safeShopeeStock),
                      `buf-${detailRow.game.id}`
                    )
                  }
                  className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === `buf-${detailRow.game.id}` ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin Aman: {detailRow.safeShopeeStock}</span>
                </button>
              </div>
            </div>

            {/* AI Review Threat Scan for Active Seller */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">
                    AI Threat Audit: {detailRow.selectedSeller.seller_name}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ★ {detailRow.trust.seller_rating}% &bull;{" "}
                    {formatOrdersCompact(detailRow.trust.seller_orders)} &bull; Skor{" "}
                    {detailRow.trust.trust_score}/100 ({detailRow.trust.trust_tier})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleRunSellerAiScan(
                      detailRow.selectedSeller.seller_name,
                      detailRow.trust.seller_rating,
                      detailRow.trust.seller_orders
                    )
                  }
                  disabled={aiScanLoading}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiScanLoading ? "animate-spin" : ""}`} />
                  <span>{aiScanLoading ? "Memindai..." : "Scan Risiko AI"}</span>
                </button>
              </div>

              {aiScanResult && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className="text-slate-900">Verdict: {aiScanResult.verdict}</span>
                    <span className="text-emerald-700">
                      Ancaman: {aiScanResult.threat_score}/100
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{aiScanResult.executive_advice}</p>
                </div>
              )}
            </div>

            {/* Alternative Sellers List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Alternatif Seller ({detailRow.backupSellers.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    handleFindReplacementSeller(detailRow.game.id, detailRow.game.title)
                  }
                  disabled={findingSellerGameId === detailRow.game.id}
                  className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Cari 3 Seller Live</span>
                </button>
              </div>

              {detailRow.backupSellers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  Belum ada seller cadangan tersimpan. Klik &ldquo;Auto-Cari 3 Seller Live&rdquo; di atas.
                </div>
              ) : (
                <div className="space-y-2">
                  {detailRow.backupSellers.map((alt) => (
                    <div
                      key={alt.seller_id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{alt.seller_name}</span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getTrustTierBadgeStyle(
                              alt.trust.trust_tier
                            )}`}
                          >
                            {alt.trust.trust_tier}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          ★ {alt.trust.seller_rating}% &bull;{" "}
                          {formatOrdersCompact(alt.trust.seller_orders)} &bull;{" "}
                          {formatRp(alt.price_g2g_idr)} ({alt.trust.net_margin_pct.toFixed(1)}%) &bull;{" "}
                          {alt.stock} unit
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleSwitchSeller(
                            detailRow.game.id,
                            detailRow.game.title,
                            alt.seller_id,
                            alt.seller_name
                          )
                        }
                        disabled={switchingSellerId === alt.seller_id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                      >
                        Pakai Seller Ini
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Detector Modal */}
      {showDetectorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={() => setShowDetectorModal(false)}
        >
          <div
            className="app-card w-full max-w-lg bg-white p-5 space-y-4 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                Detektor Live Link G2G / Eneba
              </span>
              <button
                type="button"
                onClick={() => setShowDetectorModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={detectorUrl}
                onChange={(e) => setDetectorUrl(e.target.value)}
                placeholder="Paste URL G2G offer/G... atau Eneba..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleDetectLink}
                disabled={isDetecting || !detectorUrl.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isDetecting ? "Mengecek..." : "Deteksi"}
              </button>
            </div>

            {detectedData && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
                <div className="font-bold text-slate-900 font-sans text-sm">
                  {detectedData.clean_title}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Seller: {detectedData.seller_name}</div>
                  <div>Stok Live: {detectedData.real_stock} unit</div>
                  <div>Modal: {formatRp(detectedData.price_idr)}</div>
                  <div>Rating: {detectedData.rating_pct}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <SellerReviewModal
        open={sellerReviewOpen}
        previews={sellerReviewPreviews}
        isSaving={isApplyingSellerReview}
        onClose={() => {
          if (!isApplyingSellerReview) {
            setSellerReviewOpen(false);
          }
        }}
        onConfirmApply={handleConfirmApplySellers}
      />
    </div>
  );
}

export default function SentryRiskHubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] p-8 flex items-center justify-center text-xs text-slate-500">
          Memuat Sentry &amp; Risk Hub...
        </div>
      }
    >
      <SentryRiskHubContent />
    </Suspense>
  );
}
