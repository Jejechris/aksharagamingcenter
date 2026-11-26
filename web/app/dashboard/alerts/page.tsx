"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wrench,
} from "lucide-react";

interface AlertItem {
  id: string;
  category: "PRICE_SPIKE" | "DISCOUNT_ENDED" | "STOCK_OUT" | "AUTO_PAUSED" | "TECH_INCIDENT";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  game_id?: string;
  game_title?: string;
  old_cogs_idr?: number;
  new_cogs_idr?: number;
  current_selling_price_idr?: number;
  recommended_selling_price_idr?: number;
  current_margin_pct?: number;
  auto_paused?: boolean;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
  source?: string;
}

function formatRp(val?: number) {
  if (!val && val !== 0) return "-";
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

export default function PriceAndIncidentGuardPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "price" | "stock" | "tech" | "resolved">("active");
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const list: AlertItem[] = Array.isArray(json.alerts) ? json.alerts : [];
        setAlerts(list);
        const initPrices: Record<string, number> = {};
        for (const a of list) {
          if (a.recommended_selling_price_idr && a.id) {
            initPrices[a.id] = a.recommended_selling_price_idr;
          }
        }
        setCustomPrices((prev) => ({ ...initPrices, ...prev }));
      }
    } catch {
      showToast("Gagal memuat daftar peringatan.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan_now" }),
      });
      const json = await res.json();
      if (res.ok) {
        if (Array.isArray(json.alerts)) {
          setAlerts(json.alerts);
          const nextPrices: Record<string, number> = {};
          for (const a of json.alerts) {
            if (a.recommended_selling_price_idr) {
              nextPrices[a.id] = a.recommended_selling_price_idr;
            }
          }
          setCustomPrices((prev) => ({ ...nextPrices, ...prev }));
        }
        showToast(
          `✅ Pemindaian selesai (${json.checkedCount || 0} produk dicek, ${json.triggeredCount || 0} peringatan terdeteksi).`
        );
      } else {
        showToast(json?.message || "Pemindaian gagal.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan saat memindai harga live.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRepriceGame = async (alert: AlertItem) => {
    if (!alert.game_id) return;
    const targetPrice = customPrices[alert.id] || alert.recommended_selling_price_idr || alert.current_selling_price_idr || 0;
    if (!targetPrice || targetPrice <= 0) {
      showToast("Masukkan nominal harga baru yang valid.", "error");
      return;
    }
    setBusyId(alert.id);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reprice_game",
          alertId: alert.id,
          gameId: alert.game_id,
          newSellingPriceIdr: targetPrice,
          unpause: true,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`✅ ${json.message}`);
        await loadAlerts();
      } else {
        showToast(json?.message || "Gagal memperbarui harga.", "error");
      }
    } catch {
      showToast("Gagal menghubungi server.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveOne = async (id: string) => {
    setBusyId(id);
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", id }),
      });
      await loadAlerts();
      showToast("Peringatan ditandai selesai.");
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveAll = async () => {
    setBusyId("ALL");
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_all" }),
      });
      await loadAlerts();
      showToast("Semua peringatan aktif ditandai selesai.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExportAffectedShopeeExcel = async () => {
    setIsExportingExcel(true);
    try {
      const gameIds = Array.from(
        new Set(alerts.filter((a) => !a.resolved && a.game_id).map((a) => String(a.game_id)))
      );
      if (gameIds.length === 0) {
        showToast("Tidak ada game bermasalah aktif yang perlu di-export ke Shopee.", "error");
        return;
      }
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_shopee_update", gameIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err?.message || "Export Mass Update gagal.", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shopee-price-guard-update-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`✅ Excel Mass Update Shopee diunduh (${gameIds.length} produk terdampak)!`);
    } catch {
      showToast("Gagal mengekspor Excel Mass Update Shopee.", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const stats = useMemo(() => {
    const active = alerts.filter((a) => !a.resolved);
    return {
      activeCount: active.length,
      priceCount: active.filter((a) =>
        ["PRICE_SPIKE", "DISCOUNT_ENDED", "AUTO_PAUSED"].includes(a.category)
      ).length,
      pausedCount: active.filter((a) => a.auto_paused || a.category === "AUTO_PAUSED" || a.category === "STOCK_OUT").length,
      techCount: active.filter((a) => a.category === "TECH_INCIDENT").length,
    };
  }, [alerts]);

  const visibleAlerts = useMemo(() => {
    if (activeTab === "resolved") return alerts.filter((a) => a.resolved);
    const active = alerts.filter((a) => !a.resolved);
    if (activeTab === "price") {
      return active.filter((a) => ["PRICE_SPIKE", "DISCOUNT_ENDED", "AUTO_PAUSED"].includes(a.category));
    }
    if (activeTab === "stock") {
      return active.filter((a) => a.category === "STOCK_OUT" || a.auto_paused);
    }
    if (activeTab === "tech") {
      return active.filter((a) => a.category === "TECH_INCIDENT");
    }
    return active;
  }, [alerts, activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-800"
              : "bg-slate-900 border-slate-800 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Price &amp; Incident Guard
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold uppercase">
              Circuit Breaker
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Antrean peringatan perubahan harga supplier, diskon habis, auto-pause Storefront, dan insiden teknis real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleScanNow}
            disabled={isScanning}
            className="btn-primary text-xs font-semibold px-3.5 py-2 rounded-lg gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Memindai..." : "Pindai Harga & Sistem"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAffectedShopeeExcel}
            disabled={isExportingExcel || stats.activeCount === 0}
            className="px-3.5 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-orange-600" />
            <span>{isExportingExcel ? "Menyiapkan..." : "Download Mass Update Shopee (.xlsx)"}</span>
          </button>

          {stats.activeCount > 0 && (
            <button
              type="button"
              onClick={handleResolveAll}
              disabled={busyId === "ALL"}
              className="btn-secondary text-xs font-medium px-3 py-2 rounded-lg gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tandai Semua Selesai</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Alert Aktif</span>
            <Bell className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{stats.activeCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Butuh tinjauan atau update harga</p>
        </div>

        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Harga / Diskon Habis</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">{stats.priceCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Lonjakan modal atau margin &lt;12%</p>
        </div>

        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Auto-Paused Storefront</span>
            <PauseCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums">{stats.pausedCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Dijeda otomatis agar tidak rugi</p>
        </div>

        <div className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Insiden Teknis</span>
            <Wrench className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{stats.techCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Gangguan DB / API / Cron</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "active", label: `Semua Aktif (${stats.activeCount})` },
          { id: "price", label: `Harga & Margin (${stats.priceCount})` },
          { id: "stock", label: `Stok & Auto-Pause (${stats.pausedCount})` },
          { id: "tech", label: `Teknis (${stats.techCount})` },
          { id: "resolved", label: "Riwayat Selesai" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="app-card p-10 text-center text-xs text-slate-500">Memuat data Price &amp; Incident Guard...</div>
        ) : visibleAlerts.length === 0 ? (
          <div className="app-card p-12 text-center space-y-2.5">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Tidak Ada Peringatan pada Filter Ini</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Seluruh harga supplier, margin jual, stok, dan koneksi sistem saat ini berada pada batas aman. Klik &quot;Pindai Harga &amp; Sistem&quot; kapan saja untuk audit live.
            </p>
          </div>
        ) : (
          visibleAlerts.map((al) => {
            const isCrit = al.severity === "critical";
            const suggested = customPrices[al.id] ?? al.recommended_selling_price_idr ?? al.current_selling_price_idr ?? 0;

            return (
              <div
                key={al.id}
                className={`app-card p-5 space-y-4 ${
                  !al.resolved && isCrit ? "border-rose-300 bg-rose-50/20" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                          isCrit
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : al.severity === "warning"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}
                      >
                        {al.category}
                      </span>
                      {al.auto_paused && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          STOREFRONT AUTO-PAUSED
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(al.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">{al.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{al.message}</p>
                  </div>

                  {!al.resolved && (
                    <button
                      type="button"
                      disabled={busyId === al.id}
                      onClick={() => handleResolveOne(al.id)}
                      className="btn-secondary text-[11px] px-3 py-1.5 shrink-0 gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tandai Selesai</span>
                    </button>
                  )}
                </div>

                {/* Price & Margin Action Strip if Game Alert */}
                {al.game_id && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Modal Lama &rarr; Baru</span>
                        <span className="font-semibold text-slate-700">
                          {formatRp(al.old_cogs_idr)} &rarr;{" "}
                          <strong className="text-rose-700">{formatRp(al.new_cogs_idr)}</strong>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Harga Jual Lama</span>
                        <span className="font-semibold text-slate-800">{formatRp(al.current_selling_price_idr)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Margin Live</span>
                        <span
                          className={`font-bold ${
                            (al.current_margin_pct ?? 0) < 12 ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {(al.current_margin_pct ?? 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {!al.resolved && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-700">Harga Baru (Rp):</span>
                          <input
                            type="number"
                            value={suggested}
                            onChange={(e) =>
                              setCustomPrices((prev) => ({
                                ...prev,
                                [al.id]: Number(e.target.value) || 0,
                              }))
                            }
                            className="w-28 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={busyId === al.id}
                          onClick={() => handleRepriceGame(al)}
                          className="btn-primary-emerald text-xs px-3.5 py-1.5 gap-1.5"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Update Harga &amp; Aktifkan Storefront</span>
                        </button>
                        <Link
                          href="/dashboard/catalog"
                          className="btn-secondary text-xs px-3 py-1.5 gap-1"
                        >
                          <span>Cek Seller</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
