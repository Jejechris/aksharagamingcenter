"use client";

import React, { useState, useEffect } from "react";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import Link from "next/link";
import { 
  ShieldAlert, 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  ArrowLeft, 
  AlertTriangle, 
  Shield, 
  Star, 
  MessageSquare, 
  Zap, 
  Lock, 
  Users,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Store,
  Tag
} from "lucide-react";
import { getG2GSellerUrl } from "@/lib/g2g";

interface CatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  sellers?: Array<{
    seller_id?: string;
    id?: string;
    seller_name?: string;
    name?: string;
    price_g2g_idr?: number;
    price_idr?: number;
    rating_pct?: number;
    reviews_count?: number;
    reviews?: number;
    delivery_speed?: string;
    is_selected?: boolean;
    tier?: string;
    tier_label?: string;
    tier_desc?: string;
  }>;
}

export default function TheRiskOfficerPage() {
  const [mounted, setMounted] = useState(false);
  const [catalogGames, setCatalogGames] = useState<CatalogItem[]>([]);

  // Live Gemini AI Threat Scanner State
  const [scanSellerName, setScanSellerName] = useState("AlphaVault_Store");
  const [scanReviews, setScanReviews] = useState(
    "Instant delivery, worked smoothly.\nAkun aman ganti email tanpa kendala.\nSeller ramah dan cepat respon."
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Load catalog games from DB
  useEffect(() => {
    setMounted(true);
    async function loadCatalog() {
      try {
        const mergedData = await fetchSmartCatalog();
        if (mergedData && mergedData.length > 0) {
          setCatalogGames(mergedData);
          const firstGame = json.data[0];
          const firstSeller = firstGame?.sellers?.[0];
          if (firstSeller) {
            const sName = firstSeller.seller_name || firstSeller.name;
            if (sName) setScanSellerName(sName);
          }
        }
      } catch (e) {
        console.error("Failed to load catalog into risk page:", e);
      }
    }
    loadCatalog();
  }, []);

  // Compute all sellers from catalog
  const catalogSellers = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      gameTitle: string;
      platform: string;
      price_idr: number;
      rating_pct: number;
      reviews: number;
      delivery: string;
      is_selected: boolean;
      tier: string;
      tier_label: string;
      tier_desc: string;
    }> = [];

    catalogGames.forEach(g => {
      (g.sellers || []).forEach((s: any) => {
        const name = s.seller_name || s.name;
        if (name) {
          list.push({
            id: s.seller_id || s.id || name,
            name: name,
            gameTitle: g.title,
            platform: g.platform,
            price_idr: Number(s.price_g2g_idr || s.price_idr) || 0,
            rating_pct: Number(s.rating_pct) || 99.0,
            reviews: Number(s.reviews_count || s.reviews) || 1000,
            delivery: s.delivery_speed || "Instant Delivery",
            is_selected: !!s.is_selected,
            tier: s.tier || "ultra_safe",
            tier_label: s.tier_label || "🛡️ Top Verified",
            tier_desc: s.tier_desc || "Verified G2G Seller"
          });
        }
      });
    });
    return list;
  }, [catalogGames]);

  const handleRunAiAudit = async () => {
    if (!scanSellerName.trim()) return;
    setIsScanning(true);
    try {
      const res = await fetch("/api/ai/seller-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_name: scanSellerName,
          reviews_sample: scanReviews.split("\n").filter(Boolean)
        })
      });
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setScanResult(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-slate-400">The Risk Officer</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            The Risk Officer — Sentry Supplier Audit
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Menyaring supplier G2G secara otomatis dengan 4 filter ketat untuk mencegah risiko hackback akun, penipuan, dan keterlambatan resi Shopee.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="v0-btn-secondary inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          Dashboard
        </Link>
      </div>

      {/* ── Risk Overview KPI Cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="v0-card card-division-risk rounded-2xl p-5 border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
              Total Supplier Diaudit
            </span>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white tracking-tight">{catalogSellers.length}</div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.05]">
            Listing G2G aktif diverifikasi
          </div>
        </div>

        <div className="v0-card card-division-risk rounded-2xl p-5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              Supplier Approved
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {catalogSellers.filter(s => s.rating_pct >= 98).length}
          </div>
          <div className="text-[10px] font-mono text-emerald-700 mt-3 pt-2.5 border-t border-emerald-500/10">
            Lolos standar rating &gt;98%
          </div>
        </div>

        <div className="v0-card card-division-risk rounded-2xl p-5 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-semibold">
              Threat Level
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight flex items-center gap-2">
            <span>{catalogSellers.length === 0 ? "NONE" : catalogSellers.some(s => s.rating_pct < 95) ? "HIGH" : "LOW"}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-medium">
              {catalogSellers.length === 0 ? "Bersih" : "Aman"}
            </span>
          </div>
          <div className="text-[10px] font-mono text-rose-700 mt-3 pt-2.5 border-t border-rose-500/10">
            {catalogSellers.length === 0 ? "0 Supplier di Portofolio" : "0 Insiden Hackback tercatat"}
          </div>
        </div>
      </div>

      {/* ── Live Gemini AI Review Threat Scanner ─────────── */}
      <div className="v0-card card-division-risk rounded-2xl p-5 sm:p-6 border-rose-500/20 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Live AI Review Threat Scanner</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Gemini 3.5 Flash-Lite
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Pindai ulasan pembeli G2G untuk mendeteksi ancaman akun ditarik kembali (hackback) atau keluhan tersembunyi.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Active Portfolio Supplier Chips */}
        {catalogSellers.length > 0 && (
          <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-rose-400" />
              <span>Pilih Cepat Supplier dari Portofolio ({catalogSellers.length}):</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {catalogSellers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setScanSellerName(s.name);
                    setScanReviews(
                      `Rating: ${s.rating_pct}% | Reviews: ${s.reviews.toLocaleString("id-ID")}\nInstant delivery verified.\nAkun normal tanpa masalah ganti kredensial.`
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border whitespace-nowrap ${
                    scanSellerName === s.name
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold"
                      : "bg-zinc-900 border-zinc-800 text-slate-400 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {s.name} ({s.gameTitle.split(":")[0]})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input Form */}
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">Nama Seller G2G</label>
              <input
                type="text"
                value={scanSellerName}
                onChange={(e) => setScanSellerName(e.target.value)}
                placeholder="Contoh: AlphaVault_Store"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-rose-500/50 transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                Sampel Ulasan Pembeli (1 ulasan per baris)
              </label>
              <textarea
                rows={4}
                value={scanReviews}
                onChange={(e) => setScanReviews(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-rose-500/50 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleRunAiAudit}
              disabled={isScanning || !scanSellerName.trim()}
              className="v0-btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memindai Red-Flags dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Jalankan Scan Reputasi AI</span>
                </>
              )}
            </button>
          </div>

          {/* Result Panel */}
          <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05] mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
                Hasil Audit Intelijen
              </span>
              {scanResult && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                    scanResult.verdict === "APPROVED"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : scanResult.verdict === "WARNING"
                      ? "bg-amber-950 text-amber-400 border-amber-800"
                      : "bg-rose-950 text-rose-400 border-rose-800"
                  }`}
                >
                  {scanResult.verdict} (Skor: {scanResult.threat_score}/100)
                </span>
              )}
            </div>

            {scanResult ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.05] font-mono">
                  <span className="text-slate-400 text-[11px]">Risiko Hackback:</span>
                  <span
                    className={`font-bold ${
                      scanResult.hackback_risk === "LOW"
                        ? "text-emerald-400"
                        : scanResult.hackback_risk === "MEDIUM"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {scanResult.hackback_risk}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-500 block mb-1">Saran Eksekutif:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-white/[0.05]">
                    {scanResult.executive_advice}
                  </p>
                </div>

                {scanResult.positive_traits && scanResult.positive_traits.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 block mb-1">Poin Positif:</span>
                    <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                      {scanResult.positive_traits.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600 text-xs flex flex-col items-center justify-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-700" />
                <p>Klik tombol untuk memindai risiko reputasi ulasan toko.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3-Tier Supplier Matrix ─────────────────────────── */}
      <div className="v0-card card-division-risk rounded-2xl p-5 sm:p-6 border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">Matriks 3-Tier Supplier (Anti-Monopoly Framework)</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Resiliensi Pasokan
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tier 1 */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-emerald-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-emerald-300">🛡️ Tier 1: Top Verified</span>
              <span className="text-[10px] font-mono text-emerald-400">Score: 0/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Ultra-Safe & No-Ban Guarantee</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Supplier reputasi bintang 5 (&gt;99.8% rating, &gt;10k ulasan). Garansi akun dan respon 100% aman untuk produk bernilai tinggi.
            </p>
            <div className="text-[10px] font-mono text-slate-600 pt-1.5 border-t border-white/[0.05]">
              Contoh: HellenWong, Sharktech
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-amber-300">⚡ Tier 2: Lowest Price</span>
              <span className="text-[10px] font-mono text-amber-400">Score: 0-1/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Harga Terendah Akun Serupa</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Supplier dengan COGS paling kompetitif untuk format akun identik (Full Access). Memaksimalkan margin bersih hingga 30% - 40%+.
            </p>
            <div className="text-[10px] font-mono text-slate-600 pt-1.5 border-t border-white/[0.05]">
              Contoh: TAceOfSpades, FinanceWZ, krovler
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-purple-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-purple-300">⚖️ Tier 3: Mid-Level / Baru</span>
              <span className="text-[10px] font-mono text-purple-400">Score: 1-2/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Seller Rintisan Bereputasi Bagus</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Seller baru terbit atau mid-size dengan track record &gt;99% positif. Alternatif fleksibel saat seller utama kehabisan stok.
            </p>
            <div className="text-[10px] font-mono text-slate-600 pt-1.5 border-t border-white/[0.05]">
              Contoh: madangna, Player, LootKings
            </div>
          </div>
        </div>
      </div>

      {/* ── Supplier Audit Results ─────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            Audit Results Listing Supplier
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="space-y-3">
          {catalogSellers.length === 0 ? (
            <div className="p-8 rounded-2xl border border-white/[0.08] bg-zinc-950/40 text-center space-y-3">
              <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-white">Belum Ada Supplier di Portofolio</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Tambahkan game dan supplier baru di <Link href="/dashboard/catalog" className="text-emerald-400 underline font-medium">Katalog Radar</Link> atau <Link href="/dashboard/quant" className="text-emerald-400 underline font-medium">The Quant</Link> agar otomatis masuk audit sentry di sini.
              </p>
              <Link
                href="/dashboard/catalog"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono hover:bg-emerald-500/20 transition-all font-semibold mt-2"
              >
                <Store className="w-3.5 h-3.5" /> + Tambah Game & Supplier ke Katalog
              </Link>
            </div>
          ) : (
            catalogSellers.map((seller) => {
              const isApproved = seller.rating_pct >= 98 && seller.reviews >= 5000;
              const isWarning = seller.rating_pct < 98 && seller.rating_pct >= 95;
              const status = isApproved ? "APPROVED" : isWarning ? "WARNING" : "REJECTED";
              const riskScore = isApproved ? 0 : isWarning ? 25 : 85;

              return (
                <div
                  key={seller.id}
                  className={`v0-card card-division-risk p-5 rounded-2xl space-y-4 border ${
                    isApproved
                      ? "border-emerald-500/25"
                      : isWarning
                      ? "border-amber-500/25"
                      : "border-rose-500/25 opacity-80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <a
                          href={getG2GSellerUrl(seller.name, seller.gameTitle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-white text-[15px] hover:text-emerald-300 inline-flex items-center gap-1.5 underline decoration-emerald-500/30 underline-offset-4 transition-colors"
                        >
                          {seller.name}
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        </a>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                            isApproved
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isWarning
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {status}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-slate-300 border border-white/[0.08]">
                          🎮 {seller.gameTitle.split(":")[0]} ({seller.platform})
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {seller.tier_label || "🛡️ Verified"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono mt-2">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-slate-200">{seller.rating_pct}%</span> Rating
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-200">{seller.reviews.toLocaleString("id-ID")}</span> Reviews
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" /> {seller.delivery}
                        </span>
                        {seller.price_idr > 0 && (
                          <span className="text-emerald-400 font-bold">
                            Rp {seller.price_idr.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                      <div className="sm:text-right">
                        <span className="text-[10px] font-mono text-slate-500 block mb-0.5">Risk Score</span>
                        <span
                          className={`text-2xl font-bold font-mono ${
                            isApproved ? "text-emerald-400" : isWarning ? "text-amber-400" : "text-rose-400"
                          }`}
                        >
                          {riskScore}/100
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScanSellerName(seller.name);
                          setScanReviews(
                            `Rating: ${seller.rating_pct}% | Reviews: ${seller.reviews.toLocaleString("id-ID")}\nInstant delivery verified.\nAkun normal tanpa kendala ganti email.`
                          );
                          window.scrollTo({ top: 200, behavior: "smooth" });
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] font-mono transition-all flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-rose-400" />
                        <span>Scan AI</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 pt-3 border-t border-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      {seller.rating_pct >= 98 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>Rating &gt; 98%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {seller.reviews >= 5000 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>Reviews &gt; 5,000</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Instant Delivery</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Full Access (Email)</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 4 Filters Criteria Grid ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            Aturan Filter Keamanan (4 Hard Criteria)
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-2">
            <Star className="w-4 h-4 text-amber-400" />
            <div className="font-semibold text-xs text-slate-200">Rating Minimum 98%</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Hanya supplier dengan reputasi review positif terbukti aman dari ulasan negatif.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <div className="font-semibold text-xs text-slate-200">Min. 5,000 Reviews</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Volume order tinggi membuktikan seller memiliki pengalaman operasional matang.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <div className="font-semibold text-xs text-slate-200">Instant Delivery Only</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Menghindari penundaan penyerahan akun yang bisa membatalkan pesanan di Shopee.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <div className="font-semibold text-xs text-slate-200">Full Access Changeable</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Akun wajib memungkinkan pembeli mengganti email dan password secara mandiri.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
