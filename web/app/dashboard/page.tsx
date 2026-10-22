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
  Radio,
  ChevronRight,
  Layers,
  ArrowRight
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
    const duration = 1000;
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
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
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
      desc: "Simulasi profitabilitas dinamis dengan mode target margin & kalkulasi QRIS 0.7%.",
      stat: "Formula v2.2",
      cardClass: "card-division-quant",
      iconBox: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      dot: "bg-emerald-400",
      statClass: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10",
    },
    {
      title: "Catalog Radar",
      route: "/dashboard/catalog",
      icon: <Store className="w-5 h-5 text-amber-400" />,
      number: "02",
      desc: "Komparasi multi-seller G2G, audit margin bersih, dan pengalihan supplier 1-klik.",
      stat: "Multi-Seller",
      cardClass: "card-division-catalog",
      iconBox: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      dot: "bg-amber-400",
      statClass: "text-amber-300 border-amber-500/20 bg-amber-500/10",
    },
    {
      title: "Risk Officer",
      route: "/dashboard/risk",
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      number: "03",
      desc: "Audit otomatis supplier G2G untuk memproteksi akun dari risiko hackback & penipuan.",
      stat: "0/100 Safe",
      cardClass: "card-division-risk",
      iconBox: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      dot: "bg-rose-400",
      statClass: "text-rose-300 border-rose-500/20 bg-rose-500/10",
    },
    {
      title: "The Operator",
      route: "/dashboard/operator",
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
      number: "04",
      desc: "Buku kas digital real-time, tersinkronisasi langsung dari financial ledger riil.",
      stat: `${transactions.length} Order`,
      cardClass: "card-division-operator",
      iconBox: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      dot: "bg-indigo-400",
      statClass: "text-indigo-300 border-indigo-500/20 bg-indigo-500/10",
    },
    {
      title: "The Marketer",
      route: "/dashboard/marketer",
      icon: <FileText className="w-5 h-5 text-fuchsia-400" />,
      number: "05",
      desc: "Fulfillment & Brand Hub: AI Delivery Formatter, Sertifikat Digital, & Voucher VIP.",
      stat: "AI Formatter",
      cardClass: "card-division-marketer",
      iconBox: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400",
      dot: "bg-fuchsia-400",
      statClass: "text-fuchsia-300 border-fuchsia-500/20 bg-fuchsia-500/10",
    },
    {
      title: "The Support",
      route: "/dashboard/support",
      icon: <Headphones className="w-5 h-5 text-sky-400" />,
      number: "06",
      desc: "SOP penanganan klaim garansi dan triage komplain pembeli anti-fraud.",
      stat: "0 Klaim",
      cardClass: "card-division-support",
      iconBox: "bg-sky-500/10 border-sky-500/20 text-sky-400",
      dot: "bg-sky-400",
      statClass: "text-sky-300 border-sky-500/20 bg-sky-500/10",
    },
    {
      title: "Deskripsi Maker",
      route: "/dashboard/description",
      icon: <Sparkles className="w-5 h-5 text-orange-400" />,
      number: "07",
      desc: "Shopee AI Copywriter: Generate deskripsi konversi tinggi, judul SEO, & FAQ otomatis.",
      stat: "Shopee SEO",
      cardClass: "card-division-catalog",
      iconBox: "bg-orange-500/10 border-orange-500/20 text-orange-400",
      dot: "bg-orange-400",
      statClass: "text-orange-300 border-orange-500/20 bg-orange-500/10",
    },
    {
      title: "Auto-Fulfillment",
      route: "/dashboard/autonomous",
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      number: "08",
      desc: "Full Autonomous Fulfillment: Order masuk otomatis dibuatkan lisensi brankas enkripsi.",
      stat: "Auto-Dispatch",
      cardClass: "card-division-quant",
      iconBox: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      dot: "bg-emerald-400",
      statClass: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10",
    },
    {
      title: "Research Center",
      route: "/dashboard/research",
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      number: "09",
      desc: "Autonomous G2G Robot: Crawling otomatis peluang arbitrase margin tinggi (>40%).",
      stat: "Robot Crawler",
      cardClass: "card-division-quant",
      iconBox: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
      dot: "bg-cyan-400",
      statClass: "text-cyan-300 border-cyan-500/20 bg-cyan-500/10",
    },
    {
      title: "Eneba CDKey Terminal",
      route: "/dashboard/eneba",
      icon: <Key className="w-5 h-5 text-violet-400" />,
      number: "10",
      desc: "Official Digital Key Radar: Kurasi CDKey Steam/Xbox/GOG resmi bergaransi 0% Hackback.",
      stat: "0% Hackback",
      cardClass: "card-division-quant",
      iconBox: "bg-violet-500/10 border-violet-500/20 text-violet-400",
      dot: "bg-violet-400",
      statClass: "text-violet-300 border-violet-500/20 bg-violet-500/10",
    },
    {
      title: "Stock Sentry",
      route: "/dashboard/stock",
      icon: <PackageSearch className="w-5 h-5 text-amber-400" />,
      number: "11",
      desc: "Live Reseller Stock Radar: Monitor stok supplier real-time dengan self-healing failover.",
      stat: "Anti-Misskom Sync",
      cardClass: "card-division-catalog",
      iconBox: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      dot: "bg-amber-400",
      statClass: "text-amber-300 border-amber-500/20 bg-amber-500/10",
    },
  ];

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[1040px] mx-auto space-y-7">
      {/* ═══ COMMAND DECK HEADER (MACHINED DOUBLE-BEZEL) ═══════════════ */}
      <div className="machined-card">
        <div className="machined-card-inner p-5 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6">
            {/* Left Header */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.10] bg-black/60 text-[10px] font-mono font-semibold text-slate-300 shadow-inner">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  COMMAND DECK
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  RADAR DAEMON: ACTIVE (5M SYNC)
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Akshara Gaming Center
                <span className="text-slate-600 font-normal mx-2.5">/</span>
                <span className="text-slate-400 font-medium text-lg sm:text-2xl">Operations</span>
              </h1>

              {currentTime && (
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-2.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{currentTime} WIB</span>
                </div>
              )}
            </div>

            {/* Right — Monthly Target & Live Sync */}
            <div className="flex items-center gap-4 bg-black/50 p-4 rounded-2xl border border-white/[0.08] shadow-inner shrink-0">
              <div className="min-w-0">
                <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1 font-semibold">
                  Target UKT & Living ITS
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-white flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-xs text-slate-500">Rp</span>
                  <AnimatedNumber value={targetMonthly} isCurrency={true} />
                  <span className="text-xs font-normal text-slate-500">/bln</span>
                </div>
              </div>
              <button
                onClick={fetchAnalytics}
                className="v0-btn-secondary p-2.5 rounded-xl shrink-0"
                title="Sinkronisasi Data Riil"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin text-white" : "text-slate-400"}`}
                />
              </button>
            </div>
          </div>

          {/* Progress Bar Target */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Realisasi Kas Bersih (Nett Senna):
              </span>
              <span className="text-white font-bold font-mono">
                <span className="text-emerald-400 font-black">
                  <AnimatedNumber value={progressPct} decimals={1} />%
                </span>
                {" "}&bull; Rp{" "}
                <AnimatedNumber value={totalNetProfit} isCurrency={true} />
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden border border-white/[0.08]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(52,211,153,0.5)] relative"
                style={{ width: `${Math.max(2, Math.min(100, progressPct))}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ AI STRATEGIC BRIEFING ═════════════════════════════ */}
      <div className="relative rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/30 via-slate-900/50 to-transparent p-5 sm:p-6 backdrop-blur-xl shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider">
                  Executive AI Briefing
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono font-semibold">
                  Gemini Flash Autonomous
                </span>
              </div>
              <button
                onClick={fetchBriefing}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-mono transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isBriefingLoading ? "animate-spin text-indigo-400" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isBriefingLoading ? (
                <span className="text-slate-500 font-mono text-xs animate-pulse">
                  Menyusun laporan analisa strategis inventori dan laba harian...
                </span>
              ) : (
                aiBriefing || (
                  <span className="text-slate-500 text-xs">Briefing AI siap menerima telemetri.</span>
                )
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ TELEMETRY METRIC CARDS ════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold mb-3">
            <span>Total Omzet</span>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            <span className="text-xs text-slate-500 font-normal mr-0.5">Rp</span>
            <AnimatedNumber value={totalGmv} isCurrency={true} />
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2.5 border-t border-white/[0.06] flex justify-between items-center">
            <span>Escrow + Web</span>
            <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
              <ArrowUpRight className="w-3 h-3" /> Riil
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 border-emerald-500/25 hover:-translate-y-1 transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.06)]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold mb-3">
            <span>Profit Bersih</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            <span className="text-xs text-emerald-600 font-normal mr-0.5">Rp</span>
            <AnimatedNumber value={totalNetProfit} isCurrency={true} />
          </div>
          <div className="text-[10px] font-mono text-emerald-600 mt-3 pt-2.5 border-t border-emerald-500/15 flex justify-between items-center">
            <span>Kas Bersih Senna</span>
            <span className="text-emerald-400 font-bold">+100% Valid</span>
          </div>
        </div>

        {/* Avg Margin */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 border-cyan-500/25 hover:-translate-y-1 transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.06)]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold mb-3">
            <span>Avg Margin</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 tracking-tight">
            <AnimatedNumber value={avgMargin} decimals={1} />
            <span className="text-base text-cyan-500 ml-0.5">%</span>
          </div>
          <div className="text-[10px] font-mono text-cyan-600 mt-3 pt-2.5 border-t border-cyan-500/15 flex justify-between items-center">
            <span>Threshold Minimum</span>
            <span className="text-cyan-400 font-bold">&ge; 25%</span>
          </div>
        </div>

        {/* Transactions */}
        <div className="v0-card rounded-2xl p-4 sm:p-5 border-indigo-500/25 hover:-translate-y-1 transition-all duration-200 shadow-[0_0_20px_rgba(99,102,241,0.06)]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold mb-3">
            <span>Transaksi</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-200 tracking-tight">
            <AnimatedNumber value={transactions.length} />
            <span className="text-xs font-normal text-indigo-400 ml-1">Order</span>
          </div>
          <div className="text-[10px] font-mono text-indigo-500 mt-3 pt-2.5 border-t border-indigo-500/15 flex justify-between items-center">
            <span>0% Hackback</span>
            <span className="text-indigo-400 font-bold">0 Refund</span>
          </div>
        </div>
      </div>

      {/* ═══ DIVISION GRID ════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-4 mb-5">
          <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
            Divisi &amp; Modul Operasional
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.10] to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {divisions.map((div, idx) => (
            <Link
              key={idx}
              href={div.route}
              className={`group relative v0-card ${div.cardClass} p-5 rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 hover:-translate-y-1`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl border ${div.iconBox} flex items-center justify-center shrink-0 shadow-inner`}>
                    {div.icon}
                  </div>
                  <span className="text-3xl font-black text-white/[0.05] group-hover:text-white/[0.14] transition-colors font-mono tracking-tighter">
                    {div.number}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                  {div.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {div.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${div.dot} opacity-75`} />
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${div.dot}`} />
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase font-mono">
                    ONLINE
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${div.statClass}`}>
                  {div.stat}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ AI FORMATTER BANNER ═════════════════════════════ */}
      <div className="v0-card p-5 sm:p-6 rounded-2xl border-purple-500/25 bg-gradient-to-r from-purple-950/25 via-indigo-950/15 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden group shadow-lg">
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-white">AI Account Delivery Formatter</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 inline-flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Anti-Ban Shopee Filter
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Konversi kredensial raw supplier menjadi template pesan ramah pembeli dengan format garansi dan SOP unboxing otomatis.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/formatter"
          className="relative z-10 v0-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-800" />
          Buka Formatter
        </Link>
      </div>

      {/* ═══ ACTIVITY FEED ══════════════════════════════════ */}
      <div className="v0-card rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold text-white">Live Telemetry &amp; Aktivitas Sistem</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
            REALTIME
          </span>
        </div>

        <div className="space-y-4">
          {[
            {
              text: "Sinkronisasi financial ledger otomatis berhasil",
              time: "Baru saja",
              icon: <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />,
            },
            {
              text: "Audit supplier G2G: Status Evergreen Active (Risk Score: 0/100 Safe)",
              time: "2 menit lalu",
              icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
            },
            {
              text: "Auto-fulfillment token brankas terbit (#AKSHARA-CLAIM)",
              time: "15 menit lalu",
              icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
            },
            {
              text: "Proteksi firewall & verifikasi token AES-256 aktif",
              time: "1 jam lalu",
              icon: <Zap className="w-3.5 h-3.5 text-indigo-400" />,
            },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
              <div className="w-7 h-7 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-300 leading-snug">
                  {item.text}
                </p>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 whitespace-nowrap">
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
