"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ChevronRight, 
  Cpu, 
  ArrowLeft, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Percent, 
  Inbox, 
  QrCode, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Copy, 
  Check, 
  Key, 
  MessageSquare, 
  Send,
  ShoppingBag,
  Headphones,
  CheckSquare,
  Square,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  ShieldAlert,
  Layers,
  FileCheck2
} from "lucide-react";

export default function OperatorPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Quick Account Delivery Formatter State
  const [quickRaw, setQuickRaw] = useState("");
  const [quickGame, setQuickGame] = useState("Terraria");
  const [quickBuyer, setQuickBuyer] = useState("Kak Dimas");
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedMessage, setFormattedMessage] = useState("");
  const [copiedQuick, setCopiedQuick] = useState(false);

  // Shopee CS Batch Expediter State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchRawInput, setBatchRawInput] = useState("");
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchData, setBatchData] = useState<{
    total_orders_batched: number;
    cs_batch_message: string;
    quick_followups: Array<{ trigger: string; reply: string }>;
    best_practices: string[];
  } | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedFollowupIdx, setCopiedFollowupIdx] = useState<number | null>(null);
  const [showUnlockGuide, setShowUnlockGuide] = useState(false);

  const handleQuickFormat = async () => {
    if (!quickRaw.trim()) return;
    setIsFormatting(true);
    try {
      const res = await fetch("/api/ai/format-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_credentials: quickRaw,
          game_title: quickGame,
          buyer_name: quickBuyer,
          channel: "Shopee",
          platform: "Steam",
          delivery_mode: "digital"
        })
      });
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setFormattedMessage(json.data.formatted_message);
      }
    } catch (e) {
      console.error("Quick format error:", e);
    } finally {
      setIsFormatting(false);
    }
  };

  const fetchLedger = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success") {
          setData(json.data);
        }
      }
    } catch (e) {
      console.error("Gagal sinkronisasi buku kas:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchLedger();
  }, []);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

  const transactions = data?.transactions || [];
  const totalRevenue = data?.total_gmv_idr || 0;
  const netProfit = data?.total_net_profit_idr || 0;
  const totalTransactions = data?.total_orders || 0;
  const avgMargin = data?.average_net_margin_pct || 0;
  const targetMonthly = data?.target_monthly_profit_idr || 10000000;
  const achievementPct = data?.target_achievement_pct || 0;

  // Selection handlers
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrderIds.length === transactions.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(transactions.map((t: any) => t.order_id));
    }
  };

  // Generate Batch CS Message
  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    try {
      let ordersToBatch: Array<{ order_id: string; buyer_username?: string; product_name?: string; status_chat?: string }> = [];

      // 1. Gather from table checkmarks
      if (selectedOrderIds.length > 0) {
        ordersToBatch = transactions
          .filter((t: any) => selectedOrderIds.includes(t.order_id))
          .map((t: any) => ({
            order_id: t.order_id,
            buyer_username: t.buyer_username,
            product_name: t.product_name,
            status_chat: "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat"
          }));
      }

      // 2. Gather from manual input box
      if (batchRawInput.trim()) {
        const lines = batchRawInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          const parts = line.split(/[:|]/).map(p => p.trim());
          const oId = parts[0] || "";
          if (oId && !ordersToBatch.some(o => o.order_id === oId)) {
            ordersToBatch.push({
              order_id: oId,
              buyer_username: parts[1] || "buyer",
              product_name: parts[2] || "Akun Game Digital",
              status_chat: "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat"
            });
          }
        }
      }

      // If nothing selected or typed, use all transactions as default batch
      if (ordersToBatch.length === 0 && transactions.length > 0) {
        ordersToBatch = transactions.map((t: any) => ({
          order_id: t.order_id,
          buyer_username: t.buyer_username,
          product_name: t.product_name,
          status_chat: "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat"
        }));
      }

      if (ordersToBatch.length === 0) {
        alert("Pilih pesanan dari tabel atau masukkan Nomor Pesanan di kolom input.");
        setIsGeneratingBatch(false);
        return;
      }

      const res = await fetch("/api/ai/shopee-cs-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: ordersToBatch })
      });

      const json = await res.json();
      if (json.status === "success" && json.data) {
        setBatchData(json.data);
      }
    } catch (err) {
      console.error("Batch CS generation failed:", err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const copyToClipboard = (text: string, isBatch: boolean = true, idx?: number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isBatch) {
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2500);
    } else if (typeof idx === "number") {
      setCopiedFollowupIdx(idx);
      setTimeout(() => setCopiedFollowupIdx(null), 2000);
    }
  };

  if (!mounted) return null;

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors">
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-slate-400">The Operator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            The Operator
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Pencatatan buku kas riil berbasis pesanan Shopee dan pemenuhan akun dari g2g.com/id via QRIS. 100% data transaksi nyata tanpa decoy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/formatter" 
            className="v0-btn-secondary inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            Format Akun AI
          </Link>
          <button 
            onClick={fetchLedger}
            disabled={isSyncing}
            className="v0-btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Menyinkronkan..." : "Sync Ledger"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Ikhtisar Kas</h2>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            title: "Total Omzet", 
            value: formatCurrency(totalRevenue), 
            sub: "Pendapatan Kotor", 
            icon: TrendingUp
          },
          { 
            title: "Profit Bersih", 
            value: formatCurrency(netProfit), 
            sub: "Uang Kas Senna", 
            icon: DollarSign
          },
          { 
            title: "Jumlah Transaksi", 
            value: `${totalTransactions} Order`, 
            sub: "0 Refund • 0 Hackback", 
            icon: ShoppingCart
          },
          { 
            title: "Rata-rata Margin", 
            value: `${avgMargin}%`, 
            sub: "Target Min: 25.0%", 
            icon: Percent
          }
        ].map((stat, i) => (
          <div key={i} className="v0-card rounded-2xl p-5 border-indigo-500/20 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">{stat.title}</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <stat.icon className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-white tracking-tight">{stat.value}</div>
            <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.06]">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Target UKT Progress */}
      <div className="v0-card rounded-2xl p-5 border-indigo-500/20">
        <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Target UKT & Biaya Hidup ITS</h2>
        <div className="flex items-end justify-between mb-2">
          <div className="text-2xl font-mono font-bold text-white">
            {formatCurrency(netProfit)}
            <span className="text-sm font-normal text-slate-500 ml-2">/ {formatCurrency(targetMonthly)}</span>
          </div>
          <span className="text-emerald-400 font-bold text-sm font-mono">{achievementPct}%</span>
        </div>
        <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/[0.06]">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
            style={{ width: `${Math.max(2, Math.min(achievementPct, 100))}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 font-mono mt-2">
          Kekurangan target: <b className="text-slate-300">{formatCurrency(Math.max(0, targetMonthly - netProfit))}</b>
        </p>
      </div>

      {/* Selection Action Bar (when orders are checked) */}
      {selectedOrderIds.length > 0 && (
        <div className="v0-card rounded-2xl p-4 border-amber-500/40 bg-amber-500/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">
                {selectedOrderIds.length} Pesanan Dipilih
              </span>
              <p className="text-xs text-slate-400">Siap di-bundle menjadi 1 pesan rekap CS Shopee.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="text-xs font-mono text-slate-400 hover:text-white"
            >
              Batalkan Pilihan
            </button>
            <button
              onClick={handleGenerateBatch}
              className="v0-btn-primary py-2 px-4 rounded-xl text-xs flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Rekap Batch CS
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-5">
        <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Riwayat Transaksi</h2>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
      </div>

      {/* Main Transaction Table */}
      <div className="v0-card rounded-2xl overflow-hidden border-indigo-500/20">
        <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAllOrders}
              className="text-slate-400 hover:text-indigo-400 transition-colors"
              title="Pilih Semua Pesanan"
            >
              {selectedOrderIds.length === transactions.length && transactions.length > 0 ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <h2 className="text-sm font-semibold text-white">Buku Kas Digital</h2>
            <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-0.5 rounded border border-white/[0.06]">
              {transactions.length} Entri
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
            <QrCode className="w-3 h-3" /> G2G IDR + QRIS
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-black/40 border-b border-white/[0.06]">
              <tr>
                <th className="w-10 px-4 py-3 text-center">Pilih</th>
                <th className="px-4 py-3 font-semibold">No. Pesanan</th>
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Item Game</th>
                <th className="px-4 py-3 font-semibold text-right">Harga Jual</th>
                <th className="px-4 py-3 font-semibold text-right">Modal G2G</th>
                <th className="px-4 py-3 font-semibold text-right">Profit Bersih</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!data && isSyncing ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
                      <p>Menghubungkan ke ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3 font-sans">
                      <Inbox className="w-8 h-8 text-slate-700" />
                      <p>Belum ada transaksi.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((trx: any, index: number) => {
                  const isSelected = selectedOrderIds.includes(trx.order_id);
                  return (
                    <tr 
                      key={trx.order_id || index} 
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-indigo-500/5 border-l-2 border-l-indigo-500" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(trx.order_id)}
                          className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 bg-black cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {trx.order_id}
                        <span className="block text-[10px] text-slate-500 font-normal">@{trx.buyer_username}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[10px]">{trx.timestamp}</td>
                      <td className="px-4 py-3 text-slate-300 font-sans text-xs">{trx.product_name}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(trx.gross_revenue_idr)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(trx.cogs_net_idr)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-400 font-medium">+{formatCurrency(trx.net_profit_idr)}</span>
                        <span className="block text-[10px] text-slate-500 font-normal">({trx.net_margin_pct?.toFixed(1)}%)</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          Fulfilled
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {transactions.length > 0 && (
              <tfoot className="bg-black/40 border-t border-white/[0.06] font-semibold text-xs">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-slate-500 uppercase text-[10px] tracking-widest">Total Kas:</td>
                  <td className="px-4 py-3 text-right text-white">{formatCurrency(totalRevenue)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(data?.total_cogs_idr || 0)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-bold">+{formatCurrency(netProfit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Shopee CS Expediter</h2>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
      </div>

      {/* SECTION: Shopee CS Batch Expediter */}
      <div id="cs-batch-expediter" className="v0-card rounded-2xl p-5 sm:p-6 card-division-marketer border-amber-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Batch CS Expediter
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Auto-Rekap
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bundel 5–20 pesanan digital sekaligus dalam 1 format terstruktur untuk Live Agent Shopee.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUnlockGuide(!showUnlockGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-medium text-slate-400 hover:text-white transition-all self-start sm:self-auto"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Panduan Buka Fitur Ongkir
            {showUnlockGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Collapsible Blueprint */}
        {showUnlockGuide && (
          <div className="bg-black/40 border border-amber-500/20 rounded-xl p-4 mb-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-[11px] font-mono uppercase tracking-widest">
              <Info className="w-3.5 h-3.5" />
              Blueprint Permanen: Buka Fitur "Termasuk Ongkos Kirim"
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Menghubungi CS Shopee adalah solusi darurat. Solusi permanen adalah membuka fitur resmi <strong>"Termasuk Ongkos Kirim"</strong> di Shopee Seller Centre sehingga saat pembeli order akun game, tombol pengiriman langsung berubah menjadi tombol <em>"Kirimkan"</em> digital tanpa perlu kurir!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                <span className="text-[10px] font-mono text-amber-400 font-bold block">1: KATEGORI PRODUK</span>
                <p className="text-[10px] text-slate-400">Pindahkan kategori ke: Voucher & Game &gt; Game Digital &gt; Akun & Item Game.</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                <span className="text-[10px] font-mono text-amber-400 font-bold block">2: FORMULIR</span>
                <p className="text-[10px] text-slate-400">Buka Pusat Edukasi Penjual dan isi "Formulir Pengajuan Jasa Kirim Non-Integrasi".</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                <span className="text-[10px] font-mono text-amber-400 font-bold block">3: BUKTI TRANSAKSI</span>
                <p className="text-[10px] text-slate-400">Lampirkan screenshot riwayat chat bahwa Anda telah menyerahkan kredensial akun.</p>
              </div>
            </div>
          </div>
        )}

        {/* Batch Generator Interactive Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input / Order Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Pesanan Terpilih:
                </label>
                <span className="text-[10px] text-amber-400 font-mono">
                  {selectedOrderIds.length > 0 ? `${selectedOrderIds.length} Pesanan` : "Semua Pesanan Kas"}
                </span>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 min-h-[90px] max-h-[140px] overflow-y-auto space-y-1 text-xs">
                {selectedOrderIds.length > 0 ? (
                  selectedOrderIds.map((id) => {
                    const trx = transactions.find((t: any) => t.order_id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-slate-400 font-mono py-1 border-b border-white/[0.04] last:border-0">
                        <span className="text-slate-200">{id}</span>
                        <span className="text-[10px] truncate max-w-[150px]">{trx?.product_name || "Game"}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 text-[10px] font-mono py-4 text-center">
                    Centang pesanan di tabel atas, ATAU biarkan kosong untuk membundel seluruh pesanan.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                Tambah Manual (Opsional):
              </label>
              <textarea
                rows={3}
                value={batchRawInput}
                onChange={(e) => setBatchRawInput(e.target.value)}
                placeholder="240916ABCD1234: @buyer1 | Terraria"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateBatch}
              disabled={isGeneratingBatch}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isGeneratingBatch ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Merangkai Pesan Batch...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Rekap Batch CS (AI)
                </>
              )}
            </button>
          </div>

          {/* Right: Formatted Output */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5" />
                Pesan Siap Tempel CS:
              </span>
              {batchData && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(batchData.cs_batch_message, true)}
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-semibold transition-colors"
                >
                  {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBatch ? "Tersalin!" : "Salin Pesan"}
                </button>
              )}
            </div>

            <div className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[260px] min-h-[160px]">
              {batchData?.cs_batch_message || (
                <span className="text-zinc-600 italic font-sans text-xs">
                  Pilih pesanan lalu klik Generate. Pesan resmi, sopan, dan bernomor urut jelas akan disusun oleh AI.
                </span>
              )}
            </div>

            {/* Quick Follow-ups */}
            {batchData && batchData.quick_followups && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                  Jawaban Kilat:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {batchData.quick_followups.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => copyToClipboard(item.reply, false, idx)}
                      className="text-left p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-amber-400 mb-1.5">
                        <span className="truncate pr-2">{item.trigger}</span>
                        {copiedFollowupIdx === idx ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-600 group-hover:text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans line-clamp-2">
                        "{item.reply}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Instant Formatter</h2>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
      </div>

      {/* Quick AI Delivery Formatter Box */}
      <div className="v0-card rounded-2xl p-5 card-division-formatter border-purple-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AI Delivery Formatter
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Instant
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Format cepat kredensial raw akun game menjadi pesan serah terima siap kirim.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/formatter"
            className="text-[11px] font-mono text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-purple-500/30 transition-all"
          >
            Buka Formatter Penuh <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input column */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1.5">Game</label>
                <input
                  type="text"
                  value={quickGame}
                  onChange={(e) => setQuickGame(e.target.value)}
                  placeholder="misal: Terraria"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1.5">Sapaan Pembeli</label>
                <input
                  type="text"
                  value={quickBuyer}
                  onChange={(e) => setQuickBuyer(e.target.value)}
                  placeholder="misal: Kak Dimas"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1.5">
                Raw Credentials
              </label>
              <textarea
                rows={3}
                value={quickRaw}
                onChange={(e) => setQuickRaw(e.target.value)}
                placeholder="steve@out.com:Pass123! | guard: off"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleQuickFormat}
              disabled={isFormatting || !quickRaw.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isFormatting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Memformat...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Format Pesan Serah Terima (AI)
                </>
              )}
            </button>
          </div>

          {/* Output column */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Hasil Pesan Siap Kirim:
              </span>
              {formattedMessage && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(formattedMessage);
                    setCopiedQuick(true);
                    setTimeout(() => setCopiedQuick(false), 2000);
                  }}
                  className="text-[10px] font-mono text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 font-semibold transition-colors"
                >
                  {copiedQuick ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedQuick ? "Tersalin!" : "Salin Pesan"}
                </button>
              )}
            </div>

            <div className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[220px] min-h-[140px]">
              {formattedMessage || (
                <span className="text-zinc-600 italic">
                  Masukkan akun mentah lalu klik "Format Pesan Serah Terima (AI)".
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
