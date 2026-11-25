"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Target,
  ArrowRight,
  Zap,
  ShoppingBag,
  Store,
  ShieldCheck,
  Sparkles,
  Inbox,
  Clock,
  Plus,
} from "lucide-react";

function formatRp(value: number) {
  return Math.round(value || 0).toLocaleString("id-ID");
}

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [todayDate, setTodayDate] = useState("");
  const [aiBriefing, setAiBriefing] = useState<string>("");
  const [isBriefingLoading, setIsBriefingLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      setTodayDate(
        new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }).format(new Date())
      );
    } catch {
      setTodayDate("");
    }
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (json.status === "success") {
        setAnalytics(json.data);
      }
    } catch (e) {
      console.error("Gagal sinkronisasi data analitik:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBriefing = async () => {
    setIsBriefingLoading(true);
    try {
      const res = await fetch("/api/ai/briefing");
      const json = await res.json();
      if (json.status === "success" && json.briefing) {
        setAiBriefing(json.briefing);
      }
    } catch (e) {
      console.error("Gagal mengambil AI briefing:", e);
    } finally {
      setIsBriefingLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchBriefing();
  }, []);

  const handleSyncAll = () => {
    fetchAnalytics();
    fetchBriefing();
  };

  const transactions = analytics?.transactions || [];
  const totalGmv = analytics?.total_gmv_idr || 0;
  const totalNetProfit = analytics?.total_net_profit_idr || 0;
  const avgMargin = analytics?.average_net_margin_pct || 0;
  const targetMonthly = analytics?.target_monthly_profit_idr || 10000000;
  const progressPct = analytics?.target_achievement_pct || (targetMonthly > 0 ? (totalNetProfit / targetMonthly) * 100 : 0);
  const sisaTarget = Math.max(0, targetMonthly - totalNetProfit);

  // Status Margin Pill Helper
  const getMarginStatus = (margin: number) => {
    if (margin === 0) {
      return {
        label: "Belum ada data",
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
    }
    if (margin >= 20) {
      return {
        label: "Sehat (≥20%)",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (margin >= 10) {
      return {
        label: "Waspada (10-19%)",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    return {
      label: "Rendah (<10%)",
      className: "bg-rose-50 text-rose-700 border-rose-200",
    };
  };

  const marginStatus = getMarginStatus(avgMargin);

  // Take latest 6 transactions
  const recentTransactions = Array.isArray(transactions)
    ? [...transactions].reverse().slice(0, 6)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ─── 1. Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Overview Operasional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {todayDate ? `${todayDate} (WIB)` : "Waktu Indonesia Barat"} &bull; Real-time Executive Telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncAll}
            disabled={isLoading || isBriefingLoading}
            className="btn-secondary text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            title="Sinkronisasi Data Riil"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${
                isLoading || isBriefingLoading ? "animate-spin text-slate-800" : ""
              }`}
            />
            <span>Sync Data</span>
          </button>

          <Link
            href="/dashboard/autonomous"
            className="btn-primary text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Proses Order</span>
          </Link>
        </div>
      </div>

      {/* ─── 2. 4 KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: GMV */}
        <div className="app-card card-interactive animate-fade-up stagger-1 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Omzet (GMV)
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
              Rp {formatRp(totalGmv)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Escrow Shopee &amp; Direct
            </p>
          </div>
        </div>

        {/* KPI 2: Net Profit */}
        <div className="app-card card-interactive animate-fade-up stagger-2 p-5 flex flex-col justify-between border-emerald-200/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
              Profit Bersih
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums tracking-tight">
              Rp {formatRp(totalNetProfit)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-emerald-700 tabular-nums">
                {progressPct.toFixed(1)}%
              </span>{" "}
              dari target bulanan
            </p>
          </div>
        </div>

        {/* KPI 3: Avg Margin */}
        <div className="app-card card-interactive animate-fade-up stagger-3 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Rata-rata Margin
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                {avgMargin.toFixed(1)}%
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${marginStatus.className}`}
              >
                {marginStatus.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Threshold target sehat: &ge; 20%
            </p>
          </div>
        </div>

        {/* KPI 4: Total Transactions */}
        <div className="app-card card-interactive animate-fade-up stagger-4 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Transaksi
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
              {transactions.length}{" "}
              <span className="text-sm font-normal text-slate-500">Order</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tercatat di financial ledger
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. Target Bulanan Card (Compact & Actionable) ─── */}
      <div className="app-card animate-fade-up p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Target Bulanan: Rp {formatRp(targetMonthly)}/bln
            </h2>
            <span className="text-xs text-slate-500">
              (Target UKT &amp; Living ITS)
            </span>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            Terkumpul:{" "}
            <span className="font-bold text-slate-900">
              Rp {formatRp(totalNetProfit)}
            </span>{" "}
            &bull;{" "}
            <span className="text-slate-500">
              Sisa target:{" "}
              <strong className="text-slate-800">
                Rp {formatRp(sisaTarget)}
              </strong>
            </span>
          </div>
        </div>

        {/* Progress Bar Solid */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
          />
        </div>
      </div>

      {/* ─── 4. Main Workspace 2 Kolom ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Tabel Transaksi Terbaru (col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="app-card overflow-hidden">
            {/* Header Card */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Transaksi Terbaru
                </h3>
                <p className="text-xs text-slate-500">
                  Data riil dari financial ledger toko
                </p>
              </div>
              <Link
                href="/dashboard/operator"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
              >
                <span>Lihat semua di Buku Kas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Table Content */}
            {recentTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Order / Waktu</th>
                      <th className="px-4 py-3">Produk &amp; Pembeli</th>
                      <th className="px-4 py-3 text-right">Omzet</th>
                      <th className="px-4 py-3 text-right">Profit Bersih</th>
                      <th className="px-5 py-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.map((trx: any, idx: number) => {
                      const orderId = trx.order_id || `TRX-${idx + 1}`;
                      const buyer = trx.buyer_username || trx.buyer_name || trx.buyer || "buyer";
                      const product = trx.product_name || trx.game_title || trx.title || "Order Produk Game";
                      const timestamp = trx.timestamp || trx.created_at || "Baru saja";
                      const gross = Number(trx.gross_revenue_idr) || 0;
                      const profit = Number(trx.net_profit_idr) || 0;
                      const margin = Number(trx.net_margin_pct) || (gross > 0 ? (profit / gross) * 100 : 0);

                      return (
                        <tr
                          key={orderId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-medium text-slate-900 block">
                              {orderId}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {timestamp}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 max-w-[220px]">
                            <span className="font-medium text-slate-900 block truncate" title={product}>
                              {product}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              @{buyer}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-800 tabular-nums">
                            Rp {formatRp(gross)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 tabular-nums">
                            +Rp {formatRp(profit)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-slate-600 tabular-nums">
                            {margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty State Bersih */
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Belum ada transaksi tercatat
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Transaksi dari Shopee dan Direct akan otomatis masuk ke sini saat diproses.
                  </p>
                </div>
                <Link
                  href="/dashboard/autonomous"
                  className="btn-primary text-xs font-medium px-4 py-2 rounded-lg mt-2 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buka Auto-Fulfillment</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Card A & Card B (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card A: Executive AI Briefing */}
          <div className="app-card p-5 border-l-4 border-l-indigo-500 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Gemini AI
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  Executive Briefing
                </span>
              </div>
              <button
                onClick={fetchBriefing}
                disabled={isBriefingLoading}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors disabled:opacity-50"
                title="Perbarui analisa AI"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isBriefingLoading ? "animate-spin text-indigo-600" : ""
                  }`}
                />
              </button>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed min-h-[72px]">
              {isBriefingLoading ? (
                <div className="space-y-2 py-1">
                  <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-5/6 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse" />
                </div>
              ) : (
                aiBriefing || (
                  <p className="text-slate-500 italic">
                    Ringkasan strategi AI siap menerima telemetri penjualan harian.
                  </p>
                )
              )}
            </div>
          </div>

          {/* Card B: Aksi Cepat Shopee */}
          <div className="app-card p-5 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Aksi Cepat Shopee
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pintasan operasional toko harian
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {/* Shortcut 1 */}
              <Link
                href="/dashboard/autonomous"
                className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center justify-between">
                    <span>Auto-Fulfillment Order</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Proses order instan &amp; brankas lisensi
                  </p>
                </div>
              </Link>

              {/* Shortcut 2 */}
              <Link
                href="/dashboard/shopee-launchpad"
                className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600 shrink-0 mt-0.5">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-orange-700 transition-colors flex items-center justify-between">
                    <span>Buat Listing Shopee (1-Flow)</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Generate listing Shopee lengkap otomatis
                  </p>
                </div>
              </Link>

              {/* Shortcut 3 */}
              <Link
                href="/dashboard/catalog"
                className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-700 transition-colors flex items-center justify-between">
                    <span>Audit Katalog &amp; Stok G2G</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Cek harga beli supplier &amp; stok live
                  </p>
                </div>
              </Link>

              {/* Shortcut 4 */}
              <Link
                href="/dashboard/claims"
                className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors flex items-center justify-between">
                    <span>Kelola Brankas Klaim</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Manajemen garansi &amp; verifikasi token
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
