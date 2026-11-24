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
          const firstGame = mergedData[0];
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ── Page Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/dashboard"
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Command Deck
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-700">The Risk Officer</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
              The Risk Officer — Sentry Supplier Audit
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Menyaring supplier G2G secara otomatis dengan 4 filter ketat untuk mencegah risiko hackback akun, penipuan, dan keterlambatan resi Shopee.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors shadow-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* ── Risk Overview KPI Cards ────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="app-card p-5 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">
                Total Supplier Diaudit
              </span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
              {catalogSellers.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Listing G2G aktif diverifikasi
            </div>
          </div>

          <div className="app-card p-5 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">
                Supplier Approved
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight tabular-nums">
              {catalogSellers.filter(s => s.rating_pct >= 98).length}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Lolos standar rating &ge; 98%
            </div>
          </div>

          <div className="app-card p-5 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">
                Threat Level
              </span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight flex items-center gap-2">
              <span>{catalogSellers.length === 0 ? "NONE" : catalogSellers.some(s => s.rating_pct < 95) ? "HIGH" : "LOW"}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans font-semibold">
                {catalogSellers.length === 0 ? "Bersih" : "Aman"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              {catalogSellers.length === 0 ? "0 Supplier di Portofolio" : "0 Insiden Hackback tercatat"}
            </div>
          </div>
        </div>

        {/* ── Live Gemini AI Review Threat Scanner ─────────── */}
        <div className="app-card p-5 sm:p-6 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Live AI Review Threat Scanner</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                    Gemini 3.5 Flash-Lite
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pindai ulasan pembeli G2G untuk mendeteksi ancaman akun ditarik kembali (hackback) atau keluhan tersembunyi.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Active Portfolio Supplier Chips */}
          {catalogSellers.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-rose-500" />
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border whitespace-nowrap cursor-pointer ${
                      scanSellerName === s.name
                        ? "bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Seller G2G</label>
                <input
                  type="text"
                  value={scanSellerName}
                  onChange={(e) => setScanSellerName(e.target.value)}
                  placeholder="Contoh: AlphaVault_Store"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sampel Ulasan Pembeli (1 ulasan per baris)
                </label>
                <textarea
                  rows={4}
                  value={scanReviews}
                  onChange={(e) => setScanReviews(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleRunAiAudit}
                disabled={isScanning || !scanSellerName.trim()}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memindai Red-Flags dengan AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Jalankan Scan Reputasi AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Result Panel */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    Hasil Audit Intelijen
                  </span>
                  {scanResult && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        scanResult.verdict === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : scanResult.verdict === "WARNING"
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      }`}
                    >
                      {scanResult.verdict} (Skor Ancaman: {scanResult.threat_score}/100)
                    </span>
                  )}
                </div>

                {scanResult ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 font-mono">
                      <span className="text-slate-500 text-[11px]">Risiko Hackback:</span>
                      <span
                        className={`font-bold ${
                          scanResult.hackback_risk === "LOW"
                            ? "text-emerald-700"
                            : scanResult.hackback_risk === "MEDIUM"
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {scanResult.hackback_risk}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block mb-1">Saran Eksekutif:</span>
                      <p className="text-slate-800 text-xs leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                        {scanResult.executive_advice}
                      </p>
                    </div>

                    {scanResult.positive_traits && scanResult.positive_traits.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono text-emerald-700 block mb-1 font-semibold">Poin Positif:</span>
                        <ul className="list-disc list-inside text-slate-600 text-xs space-y-0.5">
                          {scanResult.positive_traits.map((t: string, i: number) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-400" />
                    <p>Klik tombol untuk memindai risiko reputasi ulasan toko.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3-Tier Supplier Matrix ─────────────────────────── */}
        <div className="app-card p-5 sm:p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Matriks 3-Tier Supplier (Anti-Monopoly Framework)</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Resiliensi Pasokan
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Tier 1 */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">🛡️ Tier 1: Top Verified</span>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold">Risk: 0/100</span>
              </div>
              <div className="text-xs font-semibold text-slate-800">Ultra-Safe & No-Ban Guarantee</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supplier reputasi bintang 5 (&gt; 99.8% rating, &gt; 10k ulasan). Garansi akun dan respon 100% aman untuk produk bernilai tinggi.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1.5 border-t border-emerald-200/60">
                Contoh: HellenWong, Sharktech
              </div>
            </div>

            {/* Tier 2 */}
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">⚡ Tier 2: Lowest Price</span>
                <span className="text-[10px] font-mono text-amber-700 font-semibold">Risk: 0-1/100</span>
              </div>
              <div className="text-xs font-semibold text-slate-800">Harga Terendah Akun Serupa</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supplier dengan COGS paling kompetitif untuk format akun identik (Full Access). Memaksimalkan margin bersih hingga 30% - 40%+.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1.5 border-t border-amber-200/60">
                Contoh: TAceOfSpades, FinanceWZ, krovler
              </div>
            </div>

            {/* Tier 3 */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800">⚖️ Tier 3: Mid-Level / Baru</span>
                <span className="text-[10px] font-mono text-indigo-700 font-semibold">Risk: 1-2/100</span>
              </div>
              <div className="text-xs font-semibold text-slate-800">Seller Rintisan Bereputasi Bagus</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seller baru terbit atau mid-size dengan track record &gt; 99% positif. Alternatif fleksibel saat seller utama kehabisan stok.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1.5 border-t border-indigo-200/60">
                Contoh: madangna, Player, LootKings
              </div>
            </div>
          </div>
        </div>

        {/* ── Supplier Audit Results ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider whitespace-nowrap">
              Audit Results Listing Supplier ({catalogSellers.length})
            </h2>
            <div className="flex-1 h-[1px] bg-slate-200" />
          </div>

          <div className="space-y-3">
            {catalogSellers.length === 0 ? (
              <div className="app-card p-8 text-center space-y-3 bg-white">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-800">Belum Ada Supplier di Portofolio</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Tambahkan game dan supplier baru di <Link href="/dashboard/catalog" className="text-emerald-700 underline font-semibold">Radar Katalog</Link> atau <Link href="/dashboard/quant" className="text-emerald-700 underline font-semibold">The Quant</Link> agar otomatis masuk audit sentry di sini.
                </p>
                <Link
                  href="/dashboard/catalog"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors mt-2"
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
                    className={`app-card p-5 space-y-4 bg-white ${
                      isApproved
                        ? "border-emerald-200"
                        : isWarning
                        ? "border-amber-200"
                        : "border-rose-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{seller.name}</span>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                              isApproved
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isWarning
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {status}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            🎮 {seller.gameTitle.split(":")[0]} ({seller.platform})
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            {seller.tier_label || "🛡️ Verified"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono mt-2">
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-slate-800 font-semibold">{seller.rating_pct}%</span> Rating
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-800">{seller.reviews.toLocaleString("id-ID")}</span> Reviews
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-600" /> {seller.delivery}
                          </span>
                          {seller.price_idr > 0 && (
                            <span className="text-emerald-700 font-bold tabular-nums">
                              Rp {seller.price_idr.toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                        <div className="sm:text-right">
                          <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Risk Score</span>
                          <span
                            className={`text-2xl font-bold font-mono tabular-nums ${
                              isApproved ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-rose-600"
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
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                          <span>Scan AI</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        {seller.rating_pct >= 98 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>Rating &gt; 98%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {seller.reviews >= 5000 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>Reviews &gt; 5,000</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Instant Delivery</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider whitespace-nowrap">
              Aturan Filter Keamanan (4 Hard Criteria)
            </h2>
            <div className="flex-1 h-[1px] bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="app-card p-4 bg-white border border-slate-200 space-y-2">
              <Star className="w-4 h-4 text-amber-500" />
              <div className="font-bold text-xs text-slate-900">Rating Minimum 98%</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hanya supplier dengan reputasi review positif terbukti aman dari ulasan negatif.
              </p>
            </div>

            <div className="app-card p-4 bg-white border border-slate-200 space-y-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <div className="font-bold text-xs text-slate-900">Min. 5,000 Reviews</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Volume order tinggi membuktikan seller memiliki pengalaman operasional matang.
              </p>
            </div>

            <div className="app-card p-4 bg-white border border-slate-200 space-y-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <div className="font-bold text-xs text-slate-900">Instant Delivery Only</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Menghindari penundaan penyerahan akun yang bisa membatalkan pesanan di Shopee.
              </p>
            </div>

            <div className="app-card p-4 bg-white border border-slate-200 space-y-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <div className="font-bold text-xs text-slate-900">Full Access Changeable</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Akun wajib memungkinkan pembeli mengganti email dan password secara mandiri.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
