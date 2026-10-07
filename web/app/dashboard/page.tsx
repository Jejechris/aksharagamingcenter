"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Cpu,
  FileText,
  Headphones,
  CheckCircle2,
  ArrowUpRight,
  Target,
  RefreshCw,
  Sliders,
  Activity,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Store,
  Sparkles,
  Zap,
  Compass,
  Key,
  PackageSearch,
} from "lucide-react";

function formatRp(value: number) {
  return value.toLocaleString("id-ID");
}

const AnimatedNumber = ({
  value,
  isCurrency = false,
  decimals = 0,
}: {
  value: number;
  isCurrency?: boolean;
  decimals?: number;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(value * easeOut);
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(value);
    };
    requestAnimationFrame(animate);
  }, [value]);

  if (isCurrency) return <span>{Math.round(count).toLocaleString("id-ID")}</span>;
  return <span>{count.toFixed(decimals)}</span>;
};

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [aiBriefing, setAiBriefing] = useState<string>("");
  const [isBriefingLoading, setIsBriefingLoading] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (json.status === "success") setAnalytics(json.data);
    } catch (e) {
      console.error("Failed to sync ledger", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBriefing = async () => {
    setIsBriefingLoading(true);
    try {
      const res = await fetch("/api/ai/briefing");
      const json = await res.json();
      if (json.status === "success" && json.briefing) setAiBriefing(json.briefing);
    } catch (e) {
      console.error("Failed to fetch AI briefing", e);
    } finally {
      setIsBriefingLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchBriefing();
  }, []);

  const transactions = analytics?.transactions || [];
  const totalGmv = analytics?.total_gmv_idr || 0;
  const totalNetProfit = analytics?.total_net_profit_idr || 0;
  const avgMargin = analytics?.average_net_margin_pct || 0;
  const targetMonthly = analytics?.target_monthly_profit_idr || 10000000;
  const progressPct = analytics?.target_achievement_pct || 0;

  const divisions = [
    {
      title: "The Quant",
      route: "/dashboard/quant",
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      number: "01",
      desc: "Simulasi profitabilitas dinamis untuk game apapun dengan mode target margin & QRIS 0.7%.",
      stat: "Formula v2.2",
      cardClass: "card-division-quant",
      iconBox: "bg-emerald-500/10 border-emerald-500/20",
      dot: "bg-emerald-400",
      statClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/8",
    },
    {
      title: "Catalog Radar",
      route: "/dashboard/catalog",
      icon: <Store className="w-5 h-5 text-amber-400" />,
      number: "02",
      desc: "Komparasi multi-seller G2G, optimasi laba bersih, dan pengalihan supplier 1-klik.",
      stat: "Multi-Seller",
      cardClass: "card-division-catalog",
      iconBox: "bg-amber-500/10 border-amber-500/20",
      dot: "bg-amber-400",
      statClass: "text-amber-400 border-amber-500/20 bg-amber-500/8",
    },
    {
      title: "Risk Officer",
      route: "/dashboard/risk",
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      number: "03",
      desc: "Audit otomatis supplier G2G untuk memproteksi akun dari hackback & seller penipu.",
      stat: "0/100 Safe",
      cardClass: "card-division-risk",
      iconBox: "bg-rose-500/10 border-rose-500/20",
      dot: "bg-rose-400",
      statClass: "text-rose-400 border-rose-500/20 bg-rose-500/8",
    },
    {
      title: "The Operator",
      route: "/dashboard/operator",
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
      number: "04",
      desc: "Buku kas digital real-time, sinkronisasi otomatis dari financial ledger riil.",
      stat: `${transactions.length} Order`,
      cardClass: "card-division-operator",
      iconBox: "bg-indigo-500/10 border-indigo-500/20",
      dot: "bg-indigo-400",
      statClass: "text-indigo-300 border-indigo-500/20 bg-indigo-500/8",
    },
    {
      title: "The Marketer",
      route: "/dashboard/marketer",
      icon: <FileText className="w-5 h-5 text-fuchsia-400" />,
      number: "05",
      desc: "Fulfillment & Brand Hub: AI Delivery Formatter, CS Batch, Sertifikat Digital, & Voucher VIP.",
      stat: "AI Formatter",
      cardClass: "card-division-marketer",
      iconBox: "bg-fuchsia-500/10 border-fuchsia-500/20",
      dot: "bg-fuchsia-400",
      statClass: "text-fuchsia-300 border-fuchsia-500/20 bg-fuchsia-500/8",
    },
    {
      title: "The Support",
      route: "/dashboard/support",
      icon: <Headphones className="w-5 h-5 text-sky-400" />,
      number: "06",
      desc: "SOP penanganan klaim garansi dan triage komplain pembeli anti-fraud.",
      stat: "0 Klaim",
      cardClass: "card-division-support",
      iconBox: "bg-sky-500/10 border-sky-500/20",
      dot: "bg-sky-400",
      statClass: "text-sky-300 border-sky-500/20 bg-sky-500/8",
    },
    {
      title: "Deskripsi Maker",
      route: "/dashboard/description",
      icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />,
      number: "07",
      desc: "Shopee AI Copywriter: Generate deskripsi konversi tinggi, judul SEO, SOP klaim digital, & FAQ otomatis.",
      stat: "Shopee SEO",
      cardClass: "card-division-marketer",
      iconBox: "bg-fuchsia-500/10 border-fuchsia-500/20",
      dot: "bg-fuchsia-400",
      statClass: "text-fuchsia-300 border-fuchsia-500/20 bg-fuchsia-500/8",
    },
    {
      title: "Auto-Fulfillment",
      route: "/dashboard/autonomous",
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      number: "08",
      desc: "Full Autonomous Fulfillment: Pesanan masuk otomatis dibuatkan lisensi & siap kirim via WhatsApp, Gmail, & Shopee.",
      stat: "Auto-Dispatch",
      cardClass: "card-division-quant",
      iconBox: "bg-emerald-500/10 border-emerald-500/20",
      dot: "bg-emerald-400",
      statClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/8",
    },
    {
      title: "Research Center",
      route: "/dashboard/research",
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      number: "09",
      desc: "Autonomous G2G Robot: Crawling otomatis peluang arbitrase margin tinggi (>40%) & bulk import ke katalog.",
      stat: "Robot Crawler",
      cardClass: "card-division-quant",
      iconBox: "bg-cyan-500/10 border-cyan-500/20",
      dot: "bg-cyan-400",
      statClass: "text-cyan-400 border-cyan-500/20 bg-cyan-500/8",
    },
    {
      title: "Eneba CDKey Terminal",
      route: "/dashboard/eneba",
      icon: <Key className="w-5 h-5 text-violet-400" />,
      number: "10",
      desc: "Official Digital Key Radar: Kurasi CDKey Steam/Xbox/GOG resmi bergaransi 0% Hackback & pembayaran QRIS 0.7%.",
      stat: "0% Hackback",
      cardClass: "card-division-quant",
      iconBox: "bg-violet-500/10 border-violet-500/20",
      dot: "bg-violet-400",
      statClass: "text-violet-400 border-violet-500/20 bg-violet-500/8",
    },
    {
      title: "Stock Sentry",
      route: "/dashboard/stock",
      icon: <PackageSearch className="w-5 h-5 text-amber-400" />,
      number: "11",
      desc: "Live Reseller Stock Radar: Monitor stok supplier G2G & Eneba real-time, cegah penalti Shopee akibat stok habis & auto-failover.",
      stat: "Anti-Misskom Sync",
      cardClass: "card-division-catalog",
      iconBox: "bg-amber-500/10 border-amber-500/20",
      dot: "bg-amber-400",
      statClass: "text-amber-400 border-amber-500/20 bg-amber-500/8",
    },
  ];

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">

      {/* ═══ COMMAND DECK HEADER ═══════════════════════════ */}
      <div className="relative">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-emerald-500/15 via-transparent to-indigo-500/15 blur-sm opacity-60 animate-[border-glow_5s_ease-in-out_infinite] pointer-events-none" />
        <div className="relative v0-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-950 text-[10px] font-mono font-semibold text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  COMMAND DECK
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-800/40 bg-emerald-950/25 text-[10px] font-mono font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  RADAR DAEMON: AUTO-5M
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                Akshara Gaming Center
                <span className="text-slate-600 font-normal mx-2">·</span>
                <span className="text-slate-400 font-medium text-lg sm:text-xl">Operations</span>
              </h1>

              {currentTime && (
                <div className="text-[11px] text-zinc-600 font-mono flex items-center gap-1.5 mt-2">
                  <Clock className="w-3 h-3 shrink-0" />
                  {currentTime} WIB
                </div>
              )}
            </div>

            {/* Right — Target & sync */}
            <div className="flex items-center gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80 shrink-0">
              <div className="min-w-0">
                <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mb-1">
                  Target UKT & Living ITS
                </div>
                <div className="text-[17px] font-bold font-mono text-white flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-[12px] text-zinc-600">Rp</span>
                  <AnimatedNumber value={targetMonthly} isCurrency={true} />
                  <span className="text-[11px] font-normal text-zinc-600">/bln</span>
                </div>
              </div>
              <button
                onClick={fetchAnalytics}
                className="v0-btn-secondary p-2.5 rounded-xl shrink-0"
                title="Sinkronisasi Data Riil"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-white" : "text-zinc-400"}`}
                />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-2">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Realisasi Kas Bersih (Nett Senna):
              </span>
              <span className="text-zinc-300 font-semibold">
                <AnimatedNumber value={progressPct} decimals={1} />% — Rp{" "}
                <AnimatedNumber value={totalNetProfit} isCurrency={true} />
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800/50">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.3)] relative"
                style={{ width: `${Math.max(2, progressPct)}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ AI BRIEFING ══════════════════════════════════ */}
      <div className="relative rounded-2xl border border-indigo-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/25 via-purple-950/10 to-transparent pointer-events-none" />
        <div className="relative p-5 flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/25 flex items-center justify-center text-indigo-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-indigo-300 font-mono uppercase tracking-wider">
                  AI Executive Briefing
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  Gemini 3.5 Flash-Lite
                </span>
              </div>
              <button
                onClick={fetchBriefing}
                className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-[11px] font-mono transition-colors"
              >
                <RefreshCw className={`w-3 h-3 shrink-0 ${isBriefingLoading ? "animate-spin text-indigo-400" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
            <p className="text-[13px] text-slate-300 leading-relaxed">
              {isBriefingLoading ? (
                <span className="text-slate-600 font-mono text-[12px] animate-pulse">
                  Menyusun briefing harian...
                </span>
              ) : (
                aiBriefing || (
                  <span className="text-slate-600 text-[12px]">Briefing tidak tersedia.</span>
                )
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ KPI CARDS ════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 hover:-translate-y-0.5 transition-transform duration-200">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold mb-4">
            <span>Total Omzet</span>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
              <DollarSign className="w-3 h-3 text-slate-500" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            <span className="text-[13px] text-slate-500 font-normal mr-0.5">Rp</span>
            <AnimatedNumber value={totalGmv} isCurrency={true} />
          </div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.05] flex justify-between">
            <span>Escrow + Web</span>
            <span className="text-slate-400 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3 text-emerald-500" />Riil</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 border-emerald-500/18 hover:-translate-y-0.5 transition-transform duration-200 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-semibold mb-4">
            <span>Profit Bersih</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            <span className="text-[13px] text-emerald-700 font-normal mr-0.5">Rp</span>
            <AnimatedNumber value={totalNetProfit} isCurrency={true} />
          </div>
          <div className="text-[10px] font-mono text-emerald-700 mt-3 pt-2.5 border-t border-emerald-500/10 flex justify-between">
            <span>Kas Bersih</span>
            <span className="text-emerald-500 font-semibold">+100% Real</span>
          </div>
        </div>

        {/* Avg Margin */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 border-teal-500/18 hover:-translate-y-0.5 transition-transform duration-200 shadow-[0_0_20px_rgba(20,184,166,0.05)]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-teal-400 font-semibold mb-4">
            <span>Avg Margin</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <Sliders className="w-3 h-3 text-teal-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-teal-300 tracking-tight">
            <AnimatedNumber value={avgMargin} decimals={1} />
            <span className="text-lg">%</span>
          </div>
          <div className="text-[10px] font-mono text-teal-700 mt-3 pt-2.5 border-t border-teal-500/10 flex justify-between">
            <span>Threshold min</span>
            <span className="text-teal-400">≥ 25%</span>
          </div>
        </div>

        {/* Transactions */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 border-indigo-500/18 hover:-translate-y-0.5 transition-transform duration-200 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold mb-4">
            <span>Transaksi</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <CheckCircle2 className="w-3 h-3 text-indigo-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-200 tracking-tight">
            <AnimatedNumber value={transactions.length} />
            <span className="text-[14px] font-normal text-indigo-400 ml-1">Order</span>
          </div>
          <div className="text-[10px] font-mono text-indigo-700 mt-3 pt-2.5 border-t border-indigo-500/10 flex justify-between">
            <span>0 Hackback</span>
            <span>0 Refund</span>
          </div>
        </div>
      </div>

      {/* ═══ DIVISION GRID ════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            Divisi &amp; Modul Operasional
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {divisions.map((div, idx) => (
            <Link
              key={idx}
              href={div.route}
              className={`group relative v0-card ${div.cardClass} p-5 rounded-2xl flex flex-col overflow-hidden transition-all duration-250 hover:scale-[1.015] hover:-translate-y-0.5`}
            >
              {/* Shimmer */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

              <div className="relative z-10 flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl border ${div.iconBox} flex items-center justify-center shrink-0`}>
                  {div.icon}
                </div>
                <span className="text-3xl font-black text-white/[0.06] group-hover:text-white/[0.12] transition-colors font-mono tracking-tighter">
                  {div.number}
                </span>
              </div>

              <div className="relative z-10 flex-1">
                <h3 className="text-[13px] font-bold text-white mb-1.5">
                  {div.title}
                </h3>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {div.desc}
                </p>
              </div>

              <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${div.dot} opacity-75`} />
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${div.dot}`} />
                  </span>
                  <span className="text-[9px] font-semibold text-slate-600 tracking-widest uppercase">
                    AKTIF
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${div.statClass}`}>
                  {div.stat}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ AI FORMATTER BANNER ═════════════════════════ */}
      <div className="v0-card p-5 sm:p-6 rounded-2xl border-purple-500/18 bg-gradient-to-r from-purple-950/20 via-indigo-950/12 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden group">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl group-hover:bg-purple-500/12 transition-all pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 border border-purple-500/20 text-purple-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-white">AI Account Delivery Formatter</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 inline-flex items-center gap-1 whitespace-nowrap">
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                Anti-Ban Shopee & WhatsApp 1-Tap
              </span>
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Ubah kredensial raw G2G menjadi pesan serah terima sopan, aman, dan tersinkron dengan filter sensor Shopee.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/formatter"
          className="relative z-10 v0-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-700" />
          Buka Formatter
        </Link>
      </div>

      {/* ═══ ACTIVITY FEED ══════════════════════════════ */}
      <div className="v0-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-zinc-600 shrink-0" />
          <h3 className="text-sm font-semibold text-white">Aktivitas Terbaru</h3>
        </div>
        <div className="pl-1">
          {[
            {
              text: "Sinkronisasi ledger berhasil (Auto-sync)",
              time: "Baru saja",
              icon: <RefreshCw className="w-3.5 h-3.5 text-blue-400" />,
            },
            {
              text: "Supplier AlphaVault audit passed (Score: 0/100)",
              time: "2 menit lalu",
              icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
            },
            {
              text: "Transaksi Minecraft fulfilled (#240916MC99211A)",
              time: "15 menit lalu",
              icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
            },
            {
              text: "Upaya login mencurigakan ditolak (Firewall)",
              time: "1 jam lalu",
              icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
            },
          ].map((item, idx, arr) => (
            <div key={idx} className="flex gap-4 relative group/item">
              {idx !== arr.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-8px] w-[1px] bg-zinc-800/80" />
              )}
              <div className="w-[22px] h-[22px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 z-10 mt-0.5">
                {item.icon}
              </div>
              <div className="pb-5 min-w-0">
                <p className="text-[12px] text-zinc-400 group-hover/item:text-zinc-200 transition-colors leading-snug">
                  {item.text}
                </p>
                <p className="text-[10px] text-zinc-700 font-mono mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
