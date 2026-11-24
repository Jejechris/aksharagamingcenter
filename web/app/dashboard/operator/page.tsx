"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  Inbox,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
  Target,
} from "lucide-react";

function formatCurrency(amount: number) {
  return "Rp " + Math.round(amount || 0).toLocaleString("id-ID");
}

export default function OperatorPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [data, setData] = useState<any>(null);

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

  // Toast Banner
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchLedger = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success") {
          setData(json.data);
          showToast("Data buku kas berhasil disinkronisasi!");
        }
      }
    } catch (e) {
      console.error("Gagal sinkronisasi buku kas:", e);
      showToast("Gagal mengambil data buku kas.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const transactions = data?.transactions || [];
  const totalRevenue = data?.total_gmv_idr || 0;
  const totalCogs = data?.total_cogs_idr || 0;
  const netProfit = data?.total_net_profit_idr || 0;
  const avgMargin = data?.average_net_margin_pct || 0;
  const targetMonthly = data?.target_monthly_profit_idr || 10000000;
  const targetAchievementPct = data?.target_achievement_pct || (targetMonthly > 0 ? (netProfit / targetMonthly) * 100 : 0);
  const sisaTarget = Math.max(0, targetMonthly - netProfit);

  // Checkbox handlers
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
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
      let ordersToBatch: Array<{
        order_id: string;
        buyer_username?: string;
        product_name?: string;
        status_chat?: string;
      }> = [];

      // 1. Gather from table checkmarks
      if (selectedOrderIds.length > 0) {
        ordersToBatch = transactions
          .filter((t: any) => selectedOrderIds.includes(t.order_id))
          .map((t: any) => ({
            order_id: t.order_id,
            buyer_username: t.buyer_username,
            product_name: t.product_name,
            status_chat: "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat",
          }));
      }

      // 2. Gather from manual input box
      if (batchRawInput.trim()) {
        const lines = batchRawInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const parts = line.split(/[:|]/).map((p) => p.trim());
          const oId = parts[0] || "";
          if (oId && !ordersToBatch.some((o) => o.order_id === oId)) {
            ordersToBatch.push({
              order_id: oId,
              buyer_username: parts[1] || "buyer",
              product_name: parts[2] || "Akun Game Digital",
              status_chat: "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat",
            });
          }
        }
      }

      // Default to all transactions if none specified
      if (ordersToBatch.length === 0 && transactions.length > 0) {
        ordersToBatch = transactions.map((t: any) => ({
          order_id: t.order_id,
          buyer_username: t.buyer_username,
          product_name: t.product_name,
          status_chat: "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat",
        }));
      }

      if (ordersToBatch.length === 0) {
        showToast("Pilih pesanan dari tabel atau ketik Nomor Pesanan di kolom input.");
        setIsGeneratingBatch(false);
        return;
      }

      const res = await fetch("/api/ai/shopee-cs-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: ordersToBatch }),
      });

      const json = await res.json();
      if (json.status === "success" && json.data) {
        setBatchData(json.data);
        showToast("Rekap pesan batch CS Shopee berhasil dibuat!");
      } else {
        showToast("Gagal menghasilkan rekap pesan batch CS.");
      }
    } catch (err) {
      console.error("Batch CS generation failed:", err);
      showToast("Terjadi kesalahan jaringan.");
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const copyToClipboard = (text: string, isBatch: boolean = true, idx?: number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isBatch) {
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2000);
      showToast("Format CS Shopee disalin ke clipboard!");
    } else if (idx !== undefined) {
      setCopiedFollowupIdx(idx);
      setTimeout(() => setCopiedFollowupIdx(null), 2000);
      showToast("Balasan cepat disalin!");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ─── 1. Header Halaman ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Buku Kas &amp; Operator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Financial ledger real-time, audit laba bersih, dan expediter batch CS Shopee untuk pelepasan dana escrow.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/formatter"
            className="btn-secondary text-xs font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Buka AI Formatter &rarr;</span>
          </Link>

          <button
            onClick={fetchLedger}
            disabled={isSyncing}
            className="btn-primary text-xs font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Sinkronisasi Data Buku Kas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-white" : ""}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Compact Financial Strip (4 KPI Cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omzet */}
        <div className="app-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Omzet
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{transactions.length} Transaksi tercatat</p>
          </div>
        </div>

        {/* Modal COGS */}
        <div className="app-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Modal (COGS)
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-700 tabular-nums">
              {formatCurrency(totalCogs)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Biaya supplier &amp; kulakan</p>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="app-card p-4 sm:p-5 flex flex-col justify-between border-emerald-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
              Laba Bersih (Nett)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">
              +{formatCurrency(netProfit)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Setelah fee platform &amp; modal</p>
          </div>
        </div>

        {/* Rata-rata Margin */}
        <div className="app-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Rata-rata Margin
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {avgMargin.toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Threshold sehat &ge; 20%</p>
          </div>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="app-card p-4 sm:p-5 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-900">
              Target Bulanan: {formatCurrency(targetMonthly)}/bln
            </span>
            <span className="text-xs text-slate-500">(Target UKT &amp; Living ITS)</span>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            Terkumpul: <strong className="text-emerald-700 font-bold">{formatCurrency(netProfit)}</strong> ({targetAchievementPct.toFixed(1)}%) &bull;{" "}
            <span className="text-slate-500">
              Sisa target: <strong className="text-slate-800">{formatCurrency(sisaTarget)}</strong>
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, targetAchievementPct))}%` }}
          />
        </div>
      </div>

      {/* ─── 3. Selection Action Bar (Mengambang/Inline saat ada order dipilih) ─── */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>{selectedOrderIds.length}</strong> pesanan dipilih dari buku kas.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded"
            >
              Batalkan Pilihan
            </button>
            <button
              onClick={handleGenerateBatch}
              disabled={isGeneratingBatch}
              className="btn-primary text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>{isGeneratingBatch ? "Menyusun..." : "Generate Rekap CS Shopee"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 4. Tabel Buku Kas Digital ─── */}
      <div className="app-card overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Catatan Transaksi Penjualan
            </h3>
            <p className="text-xs text-slate-500">
              Buku kas tersinkronisasi otomatis dari database dan transaksi operasional
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {transactions.length} Order
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedOrderIds.length === transactions.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">No. Pesanan</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Item Game</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-right">Modal COGS</th>
                <th className="px-4 py-3 text-right">Laba Bersih</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isSyncing && transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                      <p className="text-xs">Menghubungkan ke buku kas...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="w-6 h-6 text-slate-400" />
                      <p className="text-xs">Belum ada transaksi di financial ledger.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((trx: any, index: number) => {
                  const isSelected = selectedOrderIds.includes(trx.order_id);
                  const gross = Number(trx.gross_revenue_idr) || 0;
                  const cogs = Number(trx.cogs_net_idr) || 0;
                  const profit = Number(trx.net_profit_idr) || 0;
                  const margin = Number(trx.net_margin_pct) || (gross > 0 ? (profit / gross) * 100 : 0);

                  return (
                    <tr
                      key={trx.order_id || index}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? "bg-emerald-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(trx.order_id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-slate-900 block">
                          {trx.order_id}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          @{trx.buyer_username || "pembeli"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {trx.timestamp || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                        {trx.product_name || "Game Digital"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">
                        {formatCurrency(gross)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                        {formatCurrency(cogs)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-emerald-600 font-semibold block">
                          +{formatCurrency(profit)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          ({margin.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Fulfilled
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {transactions.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold text-xs border-t border-slate-200 text-slate-700">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right uppercase text-[10px] tracking-wider text-slate-500">
                    Total Kas:
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 font-bold">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {formatCurrency(totalCogs)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-bold">
                    +{formatCurrency(netProfit)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ─── 5. Shopee CS Batch Expediter (Light Mode) ─── */}
      <div className="app-card p-5 sm:p-6 space-y-5 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Shopee CS Batch Expediter (Pelepasan Dana Escrow)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate draf resmi untuk CS Live Agent Shopee agar pesanan yang sudah diserahkan di Shopee Chat dapat segera diselesaikan tanpa menunggu pembeli mengklik &quot;Pesanan Diterima&quot;.
          </p>
        </div>

        {/* Collapsible Panduan Termasuk Ongkos Kirim */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs space-y-2">
          <button
            onClick={() => setShowUnlockGuide(!showUnlockGuide)}
            className="w-full flex items-center justify-between text-amber-900 font-semibold hover:text-amber-950 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span>SOP Pelepasan Dana: Fitur Termasuk Ongkos Kirim (Digital Goods)</span>
            </span>
            {showUnlockGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showUnlockGuide && (
            <div className="pt-2 text-slate-700 space-y-1.5 border-t border-amber-200/60 leading-relaxed text-[11px]">
              <p>
                <strong>1. Aturan Shopee:</strong> Pembeli produk digital seringkali lupa mengklik tombol &quot;Pesanan Diterima&quot;. Tanpa resi fisik, dana tertahan di sistem escrow hingga 7 hari kerja.
              </p>
              <p>
                <strong>2. Solusi Fast-Track:</strong> Hubungi Live Agent CS Shopee via Live Chat, serahkan No. Pesanan di bawah beserta bukti chat konfirmasi pembeli (&quot;Akun game sudah diserahkan dan pembeli konfirmasi login berhasil&quot;).
              </p>
              <p>
                <strong>3. Eksekusi Agen:</strong> CS Shopee akan melakukan pengecekan chat dan memicu pelepasan saldo escrow ke Saldo Penjual dalam 1&times;24 jam.
              </p>
            </div>
          )}
        </div>

        {/* Manual Input or Extra Order IDs */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Daftar No. Pesanan Tambahan (Opsional)
          </label>
          <textarea
            rows={2}
            value={batchRawInput}
            onChange={(e) => setBatchRawInput(e.target.value)}
            placeholder="Ketik No. Pesanan tambahan per baris jika ada (contoh: 241015ABCD:Kak Dimas:Terraria)"
            className="w-full p-2.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-400 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateBatch}
            disabled={isGeneratingBatch}
            className="btn-primary text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isGeneratingBatch ? "Menyusun Draf CS..." : "Generate Draf CS Shopee"}</span>
          </button>
          <span className="text-xs text-slate-500">
            {selectedOrderIds.length > 0
              ? `${selectedOrderIds.length} pesanan dari tabel siap direkap`
              : "Semua pesanan di buku kas akan dimasukkan secara otomatis jika tidak ada yang dipilih"}
          </span>
        </div>

        {/* Hasil Batch Output */}
        {batchData && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Pesan Siap Salin untuk CS Shopee ({batchData.total_orders_batched} Pesanan):
              </span>
              <button
                onClick={() => copyToClipboard(batchData.cs_batch_message, true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
              >
                {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBatch ? "Tersalin!" : "Salin Pesan"}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] whitespace-pre-wrap text-slate-800 leading-relaxed max-h-80 overflow-y-auto">
              {batchData.cs_batch_message}
            </pre>

            {/* Quick Followups */}
            {batchData.quick_followups && batchData.quick_followups.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Template Jawaban Cepat untuk Pertanyaan CS:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {batchData.quick_followups.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-900 text-[11px]">{f.trigger}</span>
                        <button
                          onClick={() => copyToClipboard(f.reply, false, idx)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Salin balasan"
                        >
                          {copiedFollowupIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-mono">{f.reply}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
