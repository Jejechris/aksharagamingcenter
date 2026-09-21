"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  X,
  RefreshCw,
  Send,
  MessageSquare,
  Bot,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Tag,
  DollarSign
} from "lucide-react";

interface Competitor {
  shop_name: string;
  price_idr: number;
  sold_count: string;
  rating: number;
  product_title: string;
  delivery_type: string;
  badge: string;
}

interface CompetitorData {
  game_title: string;
  platform: string;
  current_price_idr: number;
  cost_g2g_idr: number;
  min_price_idr: number;
  avg_price_idr: number;
  max_price_idr: number;
  recommended_price_idr: number;
  tactical_tip: string;
  competitors: Competitor[];
  economics: {
    recommended_price_idr: number;
    cogs_idr: number;
    shopee_fee_idr: number;
    qris_fee_idr: number;
    packaging_cost_idr: number;
    net_profit_idr: number;
    net_margin_pct: number;
    spread_vs_min_pct: number;
  };
  shopee_search_url: string;
}

interface ShopeeCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  platform?: string;
  currentPriceIdr?: number;
  costG2gIdr?: number;
  onApplyPrice?: (newPrice: number) => void;
}

export default function ShopeeCompetitorModal({
  isOpen,
  onClose,
  gameTitle,
  platform = "Steam",
  currentPriceIdr = 0,
  costG2gIdr = 0,
  onApplyPrice,
}: ShopeeCompetitorModalProps) {
  const [data, setData] = useState<CompetitorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Discussion Chat State
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const formatRp = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  const fetchCompetitors = async () => {
    if (!gameTitle) return;
    setIsLoading(true);
    setError("");
    setAppliedSuccess(false);

    try {
      const res = await fetch("/api/ai/shopee-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          game_title: gameTitle,
          platform,
          current_price_idr: currentPriceIdr,
          cost_g2g_idr: costG2gIdr,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        setData(json.data);
        // Initial welcome suggestion in discussion
        setMessages([
          {
            role: "ai",
            text: `Halo! Saya bot Pricing Strategist Shopee Akshara. Berdasarkan pantauan kompetitor untuk "${gameTitle}", kompetitor terlaris mematok harga ${formatRp(
              json.data.min_price_idr
            )}. Saya menyarankan harga ${formatRp(
              json.data.recommended_price_idr
            )} agar tokomu langsung jadi pilihan nomor 1 di Shopee. Ada yang ingin kamu tanyakan atau diskusikan?`,
          },
        ]);
      } else {
        setError(json.message || "Gagal memuat data kompetitor.");
      }
    } catch (e: any) {
      setError("Kesalahan jaringan saat memindai kompetitor Shopee.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && gameTitle) {
      fetchCompetitors();
    }
  }, [isOpen, gameTitle, currentPriceIdr, costG2gIdr]);

  const handleSendQuestion = async (customPrompt?: string) => {
    const question = customPrompt || inputQuestion.trim();
    if (!question || isAnswering || !data) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInputQuestion("");
    setIsAnswering(true);

    try {
      const res = await fetch("/api/ai/shopee-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discuss",
          game_title: gameTitle,
          platform,
          current_price_idr: currentPriceIdr || data.recommended_price_idr,
          cost_g2g_idr: costG2gIdr || data.cost_g2g_idr,
          message: question,
          competitor_context: {
            min_price: data.min_price_idr,
            avg_price: data.avg_price_idr,
            recommended_price: data.recommended_price_idr,
          },
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        setMessages((prev) => [...prev, { role: "ai", text: json.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: "Maaf, terjadi kendala saat memproses kalkulasi strategi. Silakan coba lagi." },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Terjadi kesalahan koneksi saat menghubungi server AI." },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleApply = (priceToApply: number) => {
    if (onApplyPrice) {
      onApplyPrice(priceToApply);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="v0-card rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-orange-500/30 bg-zinc-950 shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-zinc-900/60 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Radar Kompetitor Shopee &amp; AI Pricing Advisor
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                  LIVE SHOPEE BOT
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Game: <strong className="text-zinc-200">{gameTitle}</strong> ({platform})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 flex-1 text-zinc-200">
          {isLoading ? (
            <div className="py-16 text-center space-y-3 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-400 mx-auto" />
              <p className="text-zinc-400">Robot sedang menganalisa harga kompetitor Shopee untuk &quot;{gameTitle}&quot;...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Benchmark Summary 3-Col KPI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Lowest Competitor */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Kompetitor Termurah
                  </span>
                  <div className="text-xl font-bold font-mono text-rose-400">
                    {formatRp(data.min_price_idr)}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    Halaman 1 pencarian Shopee
                  </span>
                </div>

                {/* 2. Market Average */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Rata-Rata Pasar Shopee
                  </span>
                  <div className="text-xl font-bold font-mono text-zinc-200">
                    {formatRp(data.avg_price_idr)}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    Range: {formatRp(data.min_price_idr)} - {formatRp(data.max_price_idr)}
                  </span>
                </div>

                {/* 3. Recommended Price (Akshara Optimal) */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-transparent border border-emerald-500/40 space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                      Rekomendasi Optimal AI
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      REKOMENDASI
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-400">
                    {formatRp(data.recommended_price_idr)}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-300/80 flex items-center justify-between pt-1">
                    <span>Laba: {formatRp(data.economics.net_profit_idr)}</span>
                    <span className="font-bold">+{data.economics.net_margin_pct}% Margin</span>
                  </div>
                </div>
              </div>

              {/* Action Strip: Apply Recommended Price & Direct Shopee Link */}
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-mono text-orange-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>
                    Harga sekarang: <strong>{currentPriceIdr > 0 ? formatRp(currentPriceIdr) : "Belum diatur"}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <a
                    href={data.shopee_search_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-700 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Cek Langsung di Shopee</span>
                    <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                  </a>

                  {onApplyPrice && (
                    <button
                      type="button"
                      onClick={() => handleApply(data.recommended_price_idr)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all select-none"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{appliedSuccess ? "✅ Berhasil Diterapkan!" : `Terapkan ${formatRp(data.recommended_price_idr)}`}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* AI Strategic Reasoning Banner */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs leading-relaxed space-y-1">
                <div className="text-orange-400 font-bold font-mono text-[11px] flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Analisis Posisi Pasar &amp; Taktik AI:
                </div>
                <p className="text-slate-300 font-sans text-xs">{data.tactical_tip}</p>
              </div>

              {/* Real Competitor Listings Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                    Daftar Kompetitor Terpantau di Shopee:
                  </span>
                  <span className="text-[11px] text-slate-500">3 Toko Teratas</span>
                </div>

                <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[550px]">
                      <thead className="bg-zinc-900/90 text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                        <tr>
                          <th className="p-3">Nama Toko &amp; Status</th>
                          <th className="p-3">Judul Listing Shopee</th>
                          <th className="p-3 text-right">Harga Jual</th>
                          <th className="p-3 text-center">Penjualan</th>
                          <th className="p-3 text-center">Pengiriman</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04] bg-zinc-950/40">
                        {data.competitors.map((comp, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{comp.shop_name}</span>
                              </div>
                              <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                                ★ {comp.rating}
                              </span>
                            </td>
                            <td className="p-3 max-w-[240px]">
                              <p className="truncate text-slate-300 font-sans text-xs">{comp.product_title}</p>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 mt-1">
                                {comp.badge}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-rose-300 font-mono">
                              {formatRp(comp.price_idr)}
                            </td>
                            <td className="p-3 text-center text-slate-400 text-[11px]">
                              {comp.sold_count}
                            </td>
                            <td className="p-3 text-center text-[11px] text-slate-400">
                              {comp.delivery_type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Economics Breakdown */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 pb-1 border-b border-white/[0.06]">
                  <span>Rincian Simulasi Laba pada Harga Rekomendasi ({formatRp(data.recommended_price_idr)}):</span>
                  <span className="text-emerald-400 font-extrabold">Bersih: {formatRp(data.economics.net_profit_idr)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>
                    <span className="block text-slate-500 text-[10px]">Modal G2G (COGS):</span>
                    <span className="text-zinc-200 font-bold">{formatRp(data.economics.cogs_idr)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">Shopee Fee (8%+1k):</span>
                    <span className="text-zinc-200 font-bold">{formatRp(data.economics.shopee_fee_idr)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">QRIS Kulakan (0.7%):</span>
                    <span className="text-zinc-200 font-bold">{formatRp(data.economics.qris_fee_idr)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">Biaya Amplop/Pack:</span>
                    <span className="text-zinc-200 font-bold">Rp 2.000</span>
                  </div>
                </div>
              </div>

              {/* Interactive AI Strategy Discussion Panel */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-cyan-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs font-bold">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>Diskusikan Strategi Harga dengan AI Advisor</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Gemini E-Commerce Engine</span>
                </div>

                {/* Chat Stream Box */}
                <div className="max-h-56 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex gap-2.5 leading-relaxed ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {m.role === "ai" && (
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 text-[10px]">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`p-2.5 rounded-xl max-w-[85%] ${
                          m.role === "user"
                            ? "bg-orange-500/20 text-orange-200 border border-orange-500/30 font-sans"
                            : "bg-zinc-900 text-slate-300 border border-white/[0.06] font-sans"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isAnswering && (
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>AI sedang menghitung kalkulasi pasar...</span>
                    </div>
                  )}
                </div>

                {/* Quick Suggestion Prompts */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  <span className="text-slate-500 text-[10px]">Tanya Cepat:</span>
                  {[
                    "Apakah aman jika banting harga di bawah kompetitor?",
                    "Berapa laba jika pasang harga rekomendasi?",
                    "Trik bundling agar bisa jual lebih mahal?",
                  ].map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendQuestion(promptText)}
                      disabled={isAnswering}
                      className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors disabled:opacity-40"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>

                {/* Input Text Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuestion();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="Tanyakan apapun tentang penetapan harga, strategi diskon, atau fee Shopee..."
                    disabled={isAnswering}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-sans text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isAnswering || !inputQuestion.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
