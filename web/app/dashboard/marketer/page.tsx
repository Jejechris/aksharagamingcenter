"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, 
  ArrowLeft,
  Printer,
  Tag,
  CheckCircle2,
  Copy,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Check,
  ShieldCheck,
  Key,
  MessageSquare,
  Headphones,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Award,
  Sliders,
  QrCode,
  Zap,
  Plus,
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";
import ThumbnailStudio from "./components/ThumbnailStudio";
import WarrantyCardStudio from "./components/WarrantyCardStudio";

export default function MarketerPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"formatter" | "cs_batch" | "thumbnail_studio" | "warranty_card" | "vouchers">("thumbnail_studio");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // ==========================================
  // TAB 1: AI ACCOUNT DELIVERY FORMATTER STATE
  // ==========================================
  const [rawCredentials, setRawCredentials] = useState("");
  const [gameTitle, setGameTitle] = useState("Terraria");
  const [platform, setPlatform] = useState("Steam");
  const [buyerName, setBuyerName] = useState("Kak Dimas");
  const [channel, setChannel] = useState<"Shopee" | "WhatsApp">("Shopee");
  const [deliveryMode, setDeliveryMode] = useState<"digital" | "physical_envelope">("digital");
  const [tone, setTone] = useState("Ramah, Hangat & Profesional");
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedData, setFormattedData] = useState<{
    parsed_user: string;
    parsed_password: string;
    additional_info: string;
    formatted_message: string;
    security_steps: string[];
  } | null>(null);
  const [copiedFormatted, setCopiedFormatted] = useState(false);

  const handleLoadSample = (sampleType: "terraria" | "minecraft" | "gtav") => {
    if (sampleType === "terraria") {
      setGameTitle("Terraria");
      setPlatform("Steam");
      setBuyerName("Kak Dimas");
      setRawCredentials("terraria_player99:TerrariaGod2024! | steam_guard: off");
    } else if (sampleType === "minecraft") {
      setGameTitle("Minecraft: Java & Bedrock Edition");
      setPlatform("PC / Microsoft");
      setBuyerName("Kak Rian");
      setRawCredentials("minecrafter_id@outlook.com:DiamondPickaxe#999 | mail_access: full");
    } else if (sampleType === "gtav") {
      setGameTitle("Grand Theft Auto V: Premium Edition");
      setPlatform("Rockstar / Steam");
      setBuyerName("Kak Alvin");
      setRawCredentials("alvin_heist:LosSantos2025! | recovery_mail: active");
    }
  };

  const handleGenerateFormat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawCredentials.trim()) return;

    setIsFormatting(true);
    try {
      const res = await fetch("/api/ai/format-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_credentials: rawCredentials,
          game_title: gameTitle,
          platform: platform,
          buyer_name: buyerName,
          channel: channel,
          tone: tone,
          delivery_mode: deliveryMode
        })
      });

      const json = await res.json();
      if (json.status === "success" && json.data) {
        setFormattedData(json.data);
        showToast("Pesan serah terima berhasil digenerate!");
      }
    } catch (err) {
      console.error("Format error:", err);
      showToast("Gagal menyusun format pesan.");
    } finally {
      setIsFormatting(false);
    }
  };

  // ==========================================
  // TAB 2: SHOPEE CS BATCH EXPEDITER STATE
  // ==========================================
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchRawInput, setBatchRawInput] = useState("");
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchData, setBatchData] = useState<{
    total_orders_batched: number;
    cs_batch_message: string;
    quick_followups: Array<{ trigger: string; reply: string }>;
    best_practices: string[];
  } | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedFollowupIdx, setCopiedFollowupIdx] = useState<number | null>(null);

  const fetchLedger = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data?.transactions) {
          setTransactions(json.data.transactions);
        }
      }
    } catch (e) {
      console.error("Fetch ledger failed:", e);
    }
  };

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

  const handleGenerateBatch = async () => {
    setBatchError("");
    setIsGeneratingBatch(true);
    try {
      let ordersToBatch: Array<{ order_id: string; buyer_username?: string; product_name?: string; status_chat?: string }> = [];

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

      if (ordersToBatch.length === 0 && transactions.length > 0) {
        ordersToBatch = transactions.map((t: any) => ({
          order_id: t.order_id,
          buyer_username: t.buyer_username,
          product_name: t.product_name,
          status_chat: "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat"
        }));
      }

      if (ordersToBatch.length === 0) {
        setBatchError("Pilih pesanan dari tabel atau ketik Nomor Pesanan di kolom input.");
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
        showToast("Rekap batch CS Shopee siap digunakan!");
      }
    } catch (err) {
      console.error("Batch CS generation failed:", err);
      showToast("Gagal menghasilkan rekap CS.");
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // ==========================================
  // TAB 4: VOUCHER MANAGEMENT STATE
  // ==========================================
  const [vouchers, setVouchers] = useState([
    { code: "AKSHARA-VIP15", discount: "15%", status: "ACTIVE", uses: 42, minOrder: "Rp 150.000" },
    { code: "AKSHARA-MEMBER10", discount: "10%", status: "ACTIVE", uses: 128, minOrder: "Rp 100.000" },
    { code: "AKSHARA-REPEAT20", discount: "20%", status: "ACTIVE", uses: 67, minOrder: "Rp 200.000" },
    { code: "AKSHARA-NEW20", discount: "20%", status: "EXPIRED", uses: 350, minOrder: "Rp 100.000" },
  ]);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("10%");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setVouchers([
      { code: newCode.toUpperCase().trim(), discount: newDiscount, status: "ACTIVE", uses: 0, minOrder: "Rp 100.000" },
      ...vouchers
    ]);
    setNewCode("");
    showToast("Voucher baru berhasil diterbitkan!");
  };

  useEffect(() => {
    setMounted(true);
    fetchLedger();
  }, []);

  const copyText = (text: string, cb: () => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    cb();
    showToast("Tersalin ke clipboard!");
  };

  if (!mounted) return null;

  const tabs = [
    { id: "thumbnail_studio", label: "Thumbnail", icon: ImageIcon },
    { id: "formatter", label: "Formatter", icon: Sparkles },
    { id: "cs_batch", label: "CS Batch", icon: MessageSquare },
    { id: "warranty_card", label: "Warranty", icon: Award },
    { id: "vouchers", label: "Vouchers", icon: Tag }
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 font-medium">
              <Link href="/dashboard" className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Command Deck
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">The Marketer</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              Marketer Hub
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Fulfillment & Brand Engine. Hub komando serah terima pesanan: AI Account Formatter, Shopee CS Batch Expediter, Digital Certificate, dan Engine Voucher VIP.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 overflow-x-auto scrollbar-thin">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap min-w-[120px] ${
                activeTab === tab.id 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-purple-600' : 'text-slate-500'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: THUMBNAIL STUDIO */}
        {activeTab === "thumbnail_studio" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="app-card p-5 sm:p-6">
              <ThumbnailStudio />
            </div>
          </div>
        )}

        {/* TAB: FORMATTER */}
        {activeTab === "formatter" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`app-card p-4 transition-all ${
                channel === "Shopee" ? "border-purple-300 ring-1 ring-purple-400/20 bg-purple-50/30" : ""
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Format Shopee Chat</h2>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bebas sensor nomor HP / link luar. Pembatas bergaris ascii bersih dan ajakan klik "Pesanan Diterima".
                </p>
              </div>

              <div className={`app-card p-4 transition-all ${
                channel === "WhatsApp" ? "border-purple-300 ring-1 ring-purple-400/20 bg-purple-50/30" : ""
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Format WhatsApp Chat</h2>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kredensial dibungkus monospace sehingga di HP pembeli tinggal ketuk 1x langsung tersalin.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <form onSubmit={handleGenerateFormat} className="app-card p-5 space-y-4">
                  <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2 uppercase tracking-wider">
                    <Key className="w-4 h-4 text-purple-600" />
                    Input Kredensial
                  </h2>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 block">Pilih Channel:</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setChannel("Shopee")}
                        className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          channel === "Shopee"
                            ? "bg-white text-slate-900 shadow-sm font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Shopee
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannel("WhatsApp")}
                        className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          channel === "WhatsApp"
                            ? "bg-white text-slate-900 shadow-sm font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 block">Mode Pengiriman:</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDeliveryMode("digital")}
                        className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          deliveryMode === "digital"
                            ? "bg-white text-slate-900 shadow-sm font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Digital Instant
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMode("physical_envelope")}
                        className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          deliveryMode === "physical_envelope"
                            ? "bg-white text-slate-900 shadow-sm font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Sertifikat Fisik/Resi
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-600 block">Format Bebas (User:Pass):</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleLoadSample("terraria")} className="text-[10px] text-purple-600 hover:underline font-medium">Terraria</button>
                        <button type="button" onClick={() => handleLoadSample("minecraft")} className="text-[10px] text-purple-600 hover:underline font-medium">Minecraft</button>
                        <button type="button" onClick={() => handleLoadSample("gtav")} className="text-[10px] text-purple-600 hover:underline font-medium">GTA V</button>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={rawCredentials}
                      onChange={(e) => setRawCredentials(e.target.value)}
                      placeholder="email@example.com:Password123! | steam_guard: off"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">Game</label>
                      <input
                        type="text"
                        value={gameTitle}
                        onChange={(e) => setGameTitle(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">Platform</label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                      >
                        <option value="Steam">Steam</option>
                        <option value="PC / Microsoft">PC / Microsoft</option>
                        <option value="Rockstar / Steam">Rockstar / Steam</option>
                        <option value="EA App">EA App</option>
                        <option value="PlayStation 5">PlayStation 5</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">Nama Pembeli</label>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">Tone Suara</label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                      >
                        <option value="Ramah, Hangat & Profesional">Ramah & Hangat</option>
                        <option value="Singkat & Padat">Singkat & Padat</option>
                        <option value="Eksklusif VIP Member">Eksklusif VIP</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isFormatting || !rawCredentials.trim()}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2 shadow-sm"
                  >
                    {isFormatting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isFormatting ? "Merangkai Format..." : `Generate Pesan (${channel})`}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="app-card p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Hasil Pesan Serah Terima ({channel})
                      </h2>
                    </div>

                    {formattedData && (
                      <button
                        type="button"
                        onClick={() => copyText(formattedData.formatted_message, () => {
                          setCopiedFormatted(true);
                          setTimeout(() => setCopiedFormatted(false), 2000);
                        })}
                        className="text-xs font-medium text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors"
                      >
                        {copiedFormatted ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedFormatted ? "Tersalin!" : "Salin Pesan"}
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-900 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 min-h-[250px]">
                    {formattedData?.formatted_message || (
                      <span className="text-slate-400 italic font-sans">
                        Kredensial dan format serah terima akan muncul di sini setelah Anda mengklik tombol generate...
                      </span>
                    )}
                  </div>
                  
                  {formattedData && (
                    <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-200">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">User / Email</span>
                        <span className="text-xs font-mono font-bold text-slate-900 truncate block">{formattedData.parsed_user || "-"}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Password</span>
                        <span className="text-xs font-mono font-bold text-emerald-700 truncate block">{formattedData.parsed_password || "-"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CS BATCH */}
        {activeTab === "cs_batch" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {batchError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="app-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Daftar Pesanan Belum Selesai
                    </h3>
                    <button
                      type="button"
                      onClick={selectAllOrders}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold bg-purple-50 px-2 py-1 rounded-md border border-purple-200"
                    >
                      {selectedOrderIds.length === transactions.length && transactions.length > 0 ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[160px] max-h-[240px] overflow-y-auto space-y-1.5 text-xs">
                    {transactions.length > 0 ? (
                      transactions.map((trx) => {
                        const isChecked = selectedOrderIds.includes(trx.order_id);
                        return (
                          <label
                            key={trx.order_id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              isChecked ? "bg-purple-50 border border-purple-200 text-purple-950 font-medium" : "hover:bg-slate-100 border border-transparent text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectOrder(trx.order_id)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="font-mono font-bold">{trx.order_id}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate max-w-[140px]">{trx.product_name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs py-8">
                        Belum ada data transaksi di ledger lokal.
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600 block">Tambah Manual (Opsional):</label>
                    <textarea
                      rows={2}
                      value={batchRawInput}
                      onChange={(e) => setBatchRawInput(e.target.value)}
                      placeholder="NomorPesanan: Pembeli | Produk (per baris)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    disabled={isGeneratingBatch}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isGeneratingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isGeneratingBatch ? "Menyusun Rekap..." : "Buat Rekap Batch CS"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="app-card p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-purple-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Pesan Tempel Live Chat Shopee
                      </h3>
                    </div>

                    {batchData && (
                      <button
                        type="button"
                        onClick={() => copyText(batchData.cs_batch_message, () => {
                          setCopiedBatch(true);
                          setTimeout(() => setCopiedBatch(false), 2000);
                        })}
                        className="text-xs font-medium text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors"
                      >
                        {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedBatch ? "Tersalin!" : "Salin CS Batch"}
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-900 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 min-h-[250px]">
                    {batchData?.cs_batch_message || (
                      <span className="text-slate-400 italic font-sans">
                        Pilih pesanan lalu klik "Buat Rekap Batch CS" untuk menghasilkan teks follow-up massal.
                      </span>
                    )}
                  </div>

                  {batchData && batchData.quick_followups && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-700 block">Jawaban Kilat Konsumen:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {batchData.quick_followups.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => copyText(item.reply, () => {
                              setCopiedFollowupIdx(idx);
                              setTimeout(() => setCopiedFollowupIdx(null), 2000);
                            })}
                            className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-purple-300 transition-colors group"
                          >
                            <div className="flex items-center justify-between text-[10px] font-semibold text-purple-700 mb-0.5">
                              <span className="truncate">{item.trigger.slice(0, 25)}...</span>
                              {copiedFollowupIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />}
                            </div>
                            <p className="text-[11px] text-slate-600 font-sans line-clamp-1">"{item.reply}"</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: WARRANTY CARD */}
        {activeTab === "warranty_card" && (
          <WarrantyCardStudio onToast={showToast} />
        )}

        {/* TAB: VOUCHERS */}
        {activeTab === "vouchers" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Table */}
              <div className="lg:col-span-7 space-y-4">
                <div className="app-card overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-600" />
                      Daftar Voucher Loyalitas
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-xs">
                      {vouchers.length} Kode Aktif
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[320px]">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider">Kode</th>
                          <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider">Diskon</th>
                          <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider">Min. Belanja</th>
                          <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vouchers.map((v) => (
                          <tr key={v.code} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                              {v.code}
                              <button
                                type="button"
                                onClick={() => copyText(v.code, () => {
                                  setCopiedCode(v.code);
                                  setTimeout(() => setCopiedCode(null), 2000);
                                })}
                                className="text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                {copiedCode === v.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-purple-700 font-bold tabular-nums">{v.discount}</td>
                            <td className="px-4 py-3 text-slate-600 tabular-nums">{v.minOrder}</td>
                            <td className="px-4 py-3">
                              {v.status === "ACTIVE" ? (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">AKTIF</span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">EXPIRED</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Form New Voucher */}
              <div className="lg:col-span-5 space-y-4">
                <div className="app-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-purple-600" />
                    Terbitkan Voucher Baru
                  </h3>

                  <form onSubmit={handleAddVoucher} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 block">Kode Voucher</label>
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        placeholder="Contoh: AKSHARA-VIP25"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 uppercase transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 block">Besaran Diskon</label>
                      <select
                        value={newDiscount}
                        onChange={(e) => setNewDiscount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                      >
                        <option value="5%">5%</option>
                        <option value="10%">10%</option>
                        <option value="15%">15%</option>
                        <option value="20%">20%</option>
                        <option value="25%">25%</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors mt-2 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Terbitkan Voucher
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-white border border-emerald-300 text-xs text-slate-900 flex items-center gap-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
