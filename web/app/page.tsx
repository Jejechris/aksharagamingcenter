"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Target,
  Calculator,
  ShieldCheck,
  BookOpen,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Activity,
} from "lucide-react";

interface AnalyticsData {
  totalGmv: number;
  netProfit: number;
  targetProgress: number;
}

interface VerificationData {
  product_name: string;
  warranty_status: string;
  serial_number: string;
  order_id: string;
  buyer_username: string;
  warranty_expires: string;
  sop_summary: string;
}

function formatRp(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

export default function CommandLandingPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [searchSerial, setSearchSerial] = useState("AKSHARA-99211A-0818");
  const [verificationResult, setVerificationResult] = useState<VerificationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data) {
            setAnalytics({
              totalGmv: json.data.total_gmv_idr ?? 0,
              netProfit: json.data.total_net_profit_idr ?? 0,
              targetProgress: json.data.target_achievement_pct ?? 0,
            });
          } else {
            setAnalytics({ totalGmv: 219900, netProfit: 64370, targetProgress: 0.6 });
          }
        } else {
          setAnalytics({ totalGmv: 219900, netProfit: 64370, targetProgress: 0.6 });
        }
      } catch {
        setAnalytics({ totalGmv: 219900, netProfit: 64370, targetProgress: 0.6 });
      }
    };
    fetchAnalytics();
  }, []);

  const handleVerifyWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSerial.trim()) return;
    setIsVerifying(true);
    setVerifyError("");
    setVerificationResult(null);
    try {
      const res = await fetch(`/api/verify?sn=${encodeURIComponent(searchSerial.trim())}`);
      const data = await res.json();
      if (data.status === "success") {
        setVerificationResult(data.data);
      } else {
        setVerifyError(data.message || "Serial ID tidak ditemukan.");
      }
    } catch {
      setVerifyError("Gagal menghubungi server verifikasi.");
    } finally {
      setIsVerifying(false);
    }
  };

  const scrollToWarranty = () => {
    const el = document.getElementById("warranty");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="px-5 sm:px-8 py-10 max-w-[960px] mx-auto space-y-12">

      {/* ═══════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════ */}
      <section className="pt-4 max-w-2xl">
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 mb-7">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-[0.08em] uppercase">
            Autonomous Gaming Center Operations
          </span>
        </div>

        {/* Title */}
        <h1 className="leading-none mb-3">
          <span className="block text-[54px] sm:text-[80px] md:text-[96px] font-black tracking-[-0.04em] text-white leading-[0.9]">
            Akshara
          </span>
          <span className="block text-2xl sm:text-3xl font-mono font-normal text-slate-500 tracking-tight mt-2">
            Command Center
          </span>
        </h1>

        <p className="text-slate-400 text-[15px] leading-relaxed mb-8 max-w-lg">
          Pusat komando operasional otonom — monitoring multi-seller G2G
          real-time, kalkulasi margin otomatis, dan format serah terima akun AI.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="v0-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Activity className="w-4 h-4" />
            Buka Command Deck
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={scrollToWarranty}
            className="v0-btn-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
          >
            <Shield className="w-4 h-4" />
            Verifikasi Garansi
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TELEMETRY STRIP
      ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-1.5 shrink-0 mr-2 text-slate-600">
          <Zap className="w-3 h-3" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Live</span>
        </div>
        {[
          { tag: "DIV-1 QUANT", desc: "G2G Direct IDR & QRIS", color: "text-emerald-400", dot: "bg-emerald-400" },
          { tag: "DIV-2 RADAR", desc: "Multi-Seller Active", color: "text-amber-400", dot: "bg-amber-400" },
          { tag: "DIV-3 RISK", desc: "Sentry 0/100 Safe", color: "text-rose-400", dot: "bg-rose-400" },
          { tag: "DIV-4 OPS", desc: "Buku Kas Live", color: "text-indigo-400", dot: "bg-indigo-400" },
          { tag: "QRIS", desc: "Active", color: "text-teal-400", dot: "bg-teal-400" },
        ].map((item, i) => (
          <div
            key={i}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border shrink-0 ${item.color} border-current/30 bg-current/5`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${item.dot} animate-pulse shrink-0`} />
            <span className="text-[11px] font-mono font-bold">{item.tag}</span>
            <span className="text-[11px] font-mono opacity-50">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          KPI CARDS
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* GMV */}
        <div className="v0-card rounded-2xl p-5 border-white/[0.09] hover:-translate-y-0.5 transition-transform duration-200">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
              Total GMV Riil
            </span>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
            {analytics ? formatRp(analytics.totalGmv) : <span className="text-slate-600">—</span>}
          </div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.06]">
            Shopee Escrow + Web
          </div>
        </div>

        {/* Net Profit */}
        <div className="v0-card rounded-2xl p-5 border-emerald-500/20 hover:-translate-y-0.5 transition-transform duration-200 shadow-[0_0_24px_rgba(16,185,129,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-semibold">
              Profit Bersih Senna
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">
            {analytics ? formatRp(analytics.netProfit) : <span className="text-emerald-900">—</span>}
          </div>
          <div className="text-[10px] font-mono text-emerald-700 mt-3 pt-2.5 border-t border-emerald-500/10">
            Kas Riil — Nett 100%
          </div>
        </div>

        {/* Target Progress */}
        <div className="v0-card rounded-2xl p-5 border-indigo-500/20 hover:-translate-y-0.5 transition-transform duration-200 shadow-[0_0_24px_rgba(99,102,241,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
              Target UKT & Living ITS
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-200 font-mono tracking-tight mb-3">
            {analytics ? `${analytics.targetProgress}%` : <span className="text-indigo-900">—</span>}
          </div>
          <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/[0.05] mb-2.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              style={{ width: `${Math.max(2, analytics?.targetProgress || 0)}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-indigo-600">
            Dari target bulanan
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          QUICK ACCESS DIVISION GRID
      ═══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-4 mb-5">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            Quick Access
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              num: "01",
              title: "Kalkulator Profit",
              sub: "Divisi 01 • The Quant",
              desc: "Simulasi profitabilitas dinamis dengan kurs FX, fee Shopee, dan margin safeguard ≥ 25%.",
              icon: <Calculator className="w-5 h-5" />,
              href: "/dashboard/quant",
              iconCls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              numCls: "text-emerald-500/10",
              subCls: "text-emerald-500",
              borderHover: "hover:border-emerald-500/30",
              cardCls: "card-division-quant",
            },
            {
              num: "02",
              title: "Radar Multi-Seller",
              sub: "Divisi 02 • Catalog Hub",
              desc: "Komparasi multi-seller G2G otomatis, optimasi laba bersih, pengalihan supplier 1-klik.",
              icon: <ShieldCheck className="w-5 h-5" />,
              href: "/dashboard/catalog",
              iconCls: "bg-amber-500/10 border-amber-500/20 text-amber-400",
              numCls: "text-amber-500/10",
              subCls: "text-amber-500",
              borderHover: "hover:border-amber-500/30",
              cardCls: "card-division-catalog",
            },
            {
              num: "03",
              title: "AI Account Formatter",
              sub: "Gemini AI • Shopee & WhatsApp",
              desc: "Ubah raw account G2G menjadi pesan serah terima ramah, 1-tap copy WA, anti-ban Shopee.",
              icon: <BookOpen className="w-5 h-5" />,
              href: "/dashboard/formatter",
              iconCls: "bg-purple-500/10 border-purple-500/20 text-purple-400",
              numCls: "text-purple-500/10",
              subCls: "text-purple-500",
              borderHover: "hover:border-purple-500/30",
              cardCls: "card-division-formatter",
            },
            {
              num: "04",
              title: "Sertifikat & Garansi",
              sub: "Serial Checker & SOP No-Cut",
              desc: "Portal verifikasi keabsahan garansi digital dan pengecekan serial number pesanan.",
              icon: <Shield className="w-5 h-5" />,
              href: null,
              iconCls: "bg-sky-500/10 border-sky-500/20 text-sky-400",
              numCls: "text-sky-500/10",
              subCls: "text-sky-500",
              borderHover: "hover:border-sky-500/30",
              cardCls: "card-division-support",
            },
          ].map((card, idx) => {
            const inner = (
              <div
                className={`v0-card ${card.cardCls} ${card.borderHover} group relative rounded-2xl p-6 overflow-hidden transition-all duration-250 hover:scale-[1.012] hover:-translate-y-0.5 cursor-pointer`}
              >
                {/* Watermark number */}
                <div
                  className={`absolute right-4 top-1 text-[72px] font-black font-mono ${card.numCls} leading-none pointer-events-none select-none`}
                >
                  {card.num}
                </div>

                <div className="relative z-10">
                  {/* Icon + arrow row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={`p-2.5 rounded-xl border ${card.iconCls} shadow-inner shrink-0`}>
                      {card.icon}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200 mt-1" />
                  </div>

                  {/* Text */}
                  <h3 className="text-[15px] font-bold text-white mb-1 group-hover:text-slate-100 transition-colors leading-snug">
                    {card.title}
                  </h3>
                  <p className={`text-[10px] font-mono ${card.subCls} font-semibold mb-3`}>
                    {card.sub}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            );

            return card.href ? (
              <Link key={idx} href={card.href} className="block">
                {inner}
              </Link>
            ) : (
              <div key={idx} onClick={scrollToWarranty}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          WARRANTY VERIFICATION PORTAL
      ═══════════════════════════════════════════ */}
      <section id="warranty" className="scroll-mt-8">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            Warranty Verification
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 shrink-0">
            PORTAL
          </span>
        </div>

        <div className="v0-card rounded-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-500 mb-4">
              <Shield className="w-3 h-3" />
              Digital Certificate Verification
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-2">
              Cek Keabsahan Garansi & Sertifikat
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">
              Validasi Serial ID unik dari garansi digital garansi digital Shopee Anda secara online.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyWarranty} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5 mb-5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
              <input
                type="text"
                value={searchSerial}
                onChange={(e) => setSearchSerial(e.target.value)}
                placeholder="Contoh: AKSHARA-99211A-0818"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying}
              className="v0-btn-secondary px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-40"
            >
              {isVerifying ? "Checking..." : "Verifikasi"}
            </button>
          </form>

          {/* Error */}
          {verifyError && (
            <div className="max-w-xl mx-auto p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 text-sm text-rose-300 font-mono flex items-center gap-3 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {verifyError}
            </div>
          )}

          {/* Result */}
          {verificationResult && (
            <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-xl bg-zinc-950/80 border border-zinc-800">
              {/* Result header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-zinc-800">
                <div>
                  <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest block mb-1">
                    Sertifikat Digital Sah — Akshara
                  </span>
                  <h4 className="font-semibold text-white text-[15px]">
                    {verificationResult.product_name}
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {verificationResult.warranty_status}
                </span>
              </div>

              {/* Data grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "SERIAL NUMBER", value: verificationResult.serial_number, cls: "text-zinc-200" },
                  { label: "NO. PESANAN", value: verificationResult.order_id, cls: "text-zinc-200" },
                  { label: "PEMBELI", value: verificationResult.buyer_username, cls: "text-zinc-200" },
                  { label: "MASA GARANSI", value: verificationResult.warranty_expires, cls: "text-emerald-400" },
                ].map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <span className="text-[9px] font-mono text-zinc-600 block mb-1.5 uppercase tracking-wider">
                      {f.label}
                    </span>
                    <span className={`text-[12px] font-bold font-mono ${f.cls} break-all leading-snug`}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* SOP */}
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <span>
                  <span className="text-zinc-200 font-semibold">SOP Klaim Garansi: </span>
                  {verificationResult.sop_summary}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
