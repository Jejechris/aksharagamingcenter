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
  Image as ImageIcon
} from "lucide-react";
import ThumbnailStudio from "./components/ThumbnailStudio";

export default function MarketerPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"formatter" | "cs_batch" | "thumbnail_studio" | "warranty_card" | "vouchers">("thumbnail_studio");

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
      }
    } catch (err) {
      console.error("Format error:", err);
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
  const [batchData, setBatchData] = useState<{
    total_orders_batched: number;
    cs_batch_message: string;
    quick_followups: Array<{ trigger: string; reply: string }>;
    best_practices: string[];
  } | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedFollowupIdx, setCopiedFollowupIdx] = useState<number | null>(null);
  const [showUnlockGuide, setShowUnlockGuide] = useState(false);

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
        alert("Pilih pesanan dari tabel atau ketik Nomor Pesanan di kolom input.");
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

  // ==========================================
  // TAB 3: WARRANTY CARD STATE
  // ==========================================
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [cardBuyer, setCardBuyer] = useState("Dimas Prasetyo");
  const [cardGame, setCardGame] = useState("Terraria (Steam Account)");
  const [cardSerial, setCardSerial] = useState("AK-2026-9827364");
  const [cardDate, setCardDate] = useState("16 September 2026");

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
  };

  useEffect(() => {
    setMounted(true);
    fetchLedger();
  }, []);

  const copyText = (text: string, cb: () => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    cb();
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
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors">
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-slate-400">The Marketer</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
              <FileText className="w-5 h-5 text-fuchsia-400" />
            </div>
            Marketer Hub
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Fulfillment & Brand Engine. Hub komando serah terima pesanan: AI Account Formatter, Shopee CS Batch Expediter, Digital Certificate, dan Engine Voucher VIP.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/60 border border-white/[0.06] overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap min-w-[120px] ${
              activeTab === tab.id 
                ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-lg shadow-fuchsia-500/5' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "formatter" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">AI Formatter</h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`v0-card card-division-marketer rounded-2xl p-4 border transition-all ${
              channel === "Shopee" ? "border-fuchsia-500/50 bg-fuchsia-500/5" : "border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Format Shopee Chat</h2>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bebas sensor nomor HP / link luar. Pembatas bergaris ascii bersih dan ajakan klik "Pesanan Diterima".
              </p>
            </div>

            <div className={`v0-card card-division-marketer rounded-2xl p-4 border transition-all ${
              channel === "WhatsApp" ? "border-fuchsia-500/50 bg-fuchsia-500/5" : "border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Format WhatsApp Chat</h2>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kredensial dibungkus monospace sehingga di HP pembeli tinggal ketuk 1x langsung tersalin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <form onSubmit={handleGenerateFormat} className="v0-card card-division-marketer rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Key className="w-4 h-4 text-fuchsia-400" />
                  Input Kredensial
                </h2>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 block">Pilih Channel:</label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-1 rounded-xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setChannel("Shopee")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        channel === "Shopee"
                          ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Shopee
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel("WhatsApp")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        channel === "WhatsApp"
                          ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 block">Mode Pengiriman:</label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-1 rounded-xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode("digital")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        deliveryMode === "digital"
                          ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Digital
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode("physical_envelope")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        deliveryMode === "physical_envelope"
                          ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Sertifikat Digital
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-slate-400 block">Format Bebas:</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleLoadSample("terraria")} className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300">Terraria</button>
                      <button type="button" onClick={() => handleLoadSample("minecraft")} className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300">MC</button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={rawCredentials}
                    onChange={(e) => setRawCredentials(e.target.value)}
                    placeholder="email:pass"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Game</label>
                    <input
                      type="text"
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Steam">Steam</option>
                      <option value="PC / Microsoft">PC / Microsoft</option>
                      <option value="Rockstar / Steam">Rockstar / Steam</option>
                      <option value="EA App">EA App</option>
                      <option value="PlayStation 5">PlayStation 5</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Pembeli</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all appearance-none cursor-pointer"
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
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:bg-zinc-200 mt-2"
                >
                  {isFormatting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isFormatting ? "Merangkai Format..." : `Generate Pesan (${channel})`}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="v0-card card-division-marketer rounded-2xl p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-fuchsia-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      Hasil Pesan ({channel})
                    </h2>
                  </div>

                  {formattedData && (
                    <button
                      type="button"
                      onClick={() => copyText(formattedData.formatted_message, () => {
                        setCopiedFormatted(true);
                        setTimeout(() => setCopiedFormatted(false), 2000);
                      })}
                      className="text-xs font-mono text-fuchsia-400 hover:text-fuchsia-300 inline-flex items-center gap-1 font-bold bg-fuchsia-500/10 px-3 py-1.5 rounded-xl border border-fuchsia-500/30 transition-all"
                    >
                      {copiedFormatted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedFormatted ? "Tersalin!" : "Salin Pesan"}
                    </button>
                  )}
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-slate-200 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 shadow-inner min-h-[250px]">
                  {formattedData?.formatted_message || (
                    <span className="text-slate-500 italic">
                      Generate pesan serah terima...
                    </span>
                  )}
                </div>
                
                {formattedData && (
                  <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/[0.06]">
                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-slate-500 block">User / Email</span>
                      <span className="text-xs font-mono font-bold text-white truncate block">{formattedData.parsed_user || "-"}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-slate-500 block">Password</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 truncate block">{formattedData.parsed_password || "-"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cs_batch" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Shopee CS Batch</h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="v0-card card-division-marketer rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Daftar Pesanan
                  </h3>
                  <button
                    type="button"
                    onClick={selectAllOrders}
                    className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 font-mono bg-fuchsia-500/10 px-2 py-1 rounded-md"
                  >
                    {selectedOrderIds.length === transactions.length && transactions.length > 0 ? "Batal Semua" : "Pilih Semua"}
                  </button>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 min-h-[160px] max-h-[240px] overflow-y-auto space-y-1.5 text-xs">
                  {transactions.length > 0 ? (
                    transactions.map((trx) => {
                      const isChecked = selectedOrderIds.includes(trx.order_id);
                      return (
                        <label
                          key={trx.order_id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isChecked ? "bg-fuchsia-500/10 border border-fuchsia-500/20" : "hover:bg-zinc-900 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOrder(trx.order_id)}
                              className="rounded border-zinc-700 text-fuchsia-500 focus:ring-fuchsia-500 bg-zinc-950 cursor-pointer"
                            />
                            <span className="font-mono font-bold text-white">{trx.order_id}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{trx.product_name}</span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs py-8">
                      Belum ada data transaksi.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 block">Tambah Manual (Opsional):</label>
                  <textarea
                    rows={2}
                    value={batchRawInput}
                    onChange={(e) => setBatchRawInput(e.target.value)}
                    placeholder="NomorPesanan: Pembeli | Produk"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={isGeneratingBatch}
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
                >
                  {isGeneratingBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGeneratingBatch ? "Menyusun Rekap..." : "Buat Rekap Batch CS"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="v0-card card-division-marketer rounded-2xl p-5 sm:p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-fuchsia-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Pesan Tempel Live Chat
                    </h3>
                  </div>

                  {batchData && (
                    <button
                      type="button"
                      onClick={() => copyText(batchData.cs_batch_message, () => {
                        setCopiedBatch(true);
                        setTimeout(() => setCopiedBatch(false), 2000);
                      })}
                      className="text-xs font-mono text-fuchsia-400 hover:text-fuchsia-300 inline-flex items-center gap-1 font-bold bg-fuchsia-500/10 px-3 py-1.5 rounded-xl border border-fuchsia-500/30 transition-all"
                    >
                      {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedBatch ? "Tersalin!" : "Salin CS Batch"}
                    </button>
                  )}
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-slate-200 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 shadow-inner min-h-[250px]">
                  {batchData?.cs_batch_message || (
                    <span className="text-slate-500 italic font-sans">
                      Pilih pesanan lalu klik "Buat Rekap Batch CS".
                    </span>
                  )}
                </div>

                {batchData && batchData.quick_followups && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/[0.06]">
                    <span className="text-[10px] font-mono text-slate-400 block">Jawaban Kilat:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {batchData.quick_followups.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => copyText(item.reply, () => {
                            setCopiedFollowupIdx(idx);
                            setTimeout(() => setCopiedFollowupIdx(null), 2000);
                          })}
                          className="text-left p-3 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800 hover:border-fuchsia-500/40 transition-all group"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-fuchsia-400 mb-1">
                            <span className="truncate">{item.trigger.slice(0, 25)}...</span>
                            {copiedFollowupIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500 group-hover:text-white" />}
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans line-clamp-1">"{item.reply}"</p>
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

      {activeTab === "thumbnail_studio" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Thumbnail Studio</h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
          </div>
          <div className="v0-card card-division-marketer rounded-2xl p-5">
            <ThumbnailStudio />
          </div>
        </div>
      )}

      {activeTab === "warranty_card" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Warranty Card</h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="v0-card card-division-marketer rounded-2xl p-6 flex flex-col items-center justify-center min-h-[480px] [perspective:1000px]">
                <div className="flex items-center justify-between w-full mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Preview Sertifikat</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Interactive 3D view</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-slate-300 hover:text-white hover:bg-zinc-800 text-xs font-mono transition-all flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {cardSide === "front" ? "Sisi Belakang" : "Sisi Depan"}
                  </button>
                </div>

                <div className="relative w-full max-w-sm aspect-[1/1.414] transition-all duration-500 ease-out hover:[transform:rotateX(6deg)_rotateY(-8deg)] [transform-style:preserve-3d] shadow-2xl shadow-fuchsia-950/20 group cursor-pointer" onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}>
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black rounded-2xl border border-fuchsia-500/20 p-6 flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

                    {cardSide === "front" ? (
                      <div className="relative z-10 flex flex-col justify-between h-full [transform:translateZ(20px)]">
                        <div className="flex justify-between items-start border-b border-white/10 pb-3">
                          <div>
                            <div className="text-lg font-black tracking-widest text-white">AKSHARA</div>
                            <div className="text-[9px] uppercase tracking-wider text-fuchsia-400 font-mono">Gaming Center</div>
                          </div>
                          <Award className="w-6 h-6 text-fuchsia-400" />
                        </div>

                        <div className="space-y-2 py-4">
                          <div className="w-8 h-1 bg-fuchsia-500 rounded-full mb-3" />
                          <h4 className="text-lg font-serif text-slate-100 font-bold">Sertifikat Keaslian</h4>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            Lisensi game ini dijamin 100% legal dan dilindungi oleh garansi resmi.
                          </p>
                          <div className="pt-3 space-y-1.5 font-mono text-[10px]">
                            <div className="flex justify-between text-slate-500">
                              <span>Pemilik:</span>
                              <span className="text-white">{cardBuyer}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Item:</span>
                              <span className="text-fuchsia-300">{cardGame}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Aktivasi:</span>
                              <span className="text-slate-300">{cardDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                          <div>
                            <span className="text-[9px] font-mono text-slate-500 block uppercase">No. Seri</span>
                            <span className="text-xs font-mono font-bold text-slate-200">{cardSerial}</span>
                          </div>
                          <QrCode className="w-8 h-8 text-fuchsia-400" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col h-full [transform:translateZ(20px)] text-xs font-sans">
                        <div className="border-b border-white/10 pb-3 mb-4">
                          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            SOP Klaim Garansi
                          </span>
                        </div>
                        <div className="space-y-3 text-[10px] text-slate-300 flex-1">
                          <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <strong className="text-white block mb-0.5">1. Garansi Digital:</strong>
                            Klaim garansi dapat dilakukan secara digital melalui CS kami.
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <strong className="text-white block mb-0.5">2. Amankan Kredensial:</strong>
                            Ganti password dan email max 24 jam setelah serah terima.
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <strong className="text-white block mb-0.5">3. Support:</strong>
                            Scan QR untuk verifikasi keaslian via Akshara Concierge.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="v0-card card-division-marketer rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-fuchsia-400" />
                  Kustomisasi Kartu
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400">Nama Pembeli</label>
                    <input
                      type="text"
                      value={cardBuyer}
                      onChange={(e) => setCardBuyer(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400">Nama Game</label>
                    <input
                      type="text"
                      value={cardGame}
                      onChange={(e) => setCardGame(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400">No. Seri</label>
                    <input
                      type="text"
                      value={cardSerial}
                      onChange={(e) => setCardSerial(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400">Tanggal</label>
                    <input
                      type="text"
                      value={cardDate}
                      onChange={(e) => setCardDate(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-zinc-200 mt-2"
                >
                  <Printer className="w-4 h-4" />
                  Download Sertifikat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "vouchers" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">VIP Vouchers</h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="v0-card card-division-marketer rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-zinc-950/40">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-fuchsia-400" />
                    Daftar Voucher Loyalitas
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-zinc-900 px-2 py-0.5 rounded-md">{vouchers.length} Kode Aktif</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono min-w-[320px]">
                    <thead className="border-b border-white/[0.06] bg-zinc-950/60">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Kode</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Diskon</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Min. Belanja</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {vouchers.map((v) => (
                        <tr key={v.code} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                            {v.code}
                            <button
                              type="button"
                              onClick={() => copyText(v.code, () => {
                                setCopiedCode(v.code);
                                setTimeout(() => setCopiedCode(null), 2000);
                              })}
                              className="text-slate-500 hover:text-white transition-colors"
                            >
                              {copiedCode === v.code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-fuchsia-300 font-bold">{v.discount}</td>
                          <td className="px-4 py-3 text-slate-400">{v.minOrder}</td>
                          <td className="px-4 py-3">
                            {v.status === "ACTIVE" ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">AKTIF</span>
                            ) : (
                              <span className="text-[10px] text-slate-500 bg-zinc-900 px-2 py-0.5 rounded-md">EXPIRED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="v0-card card-division-marketer rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-fuchsia-400" />
                  Buat Voucher Baru
                </h3>

                <form onSubmit={handleAddVoucher} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 block">Kode Voucher</label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="AKSHARA-NEW"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 block">Besaran Diskon</label>
                    <select
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="5%">5%</option>
                      <option value="10%">10%</option>
                      <option value="15%">15%</option>
                      <option value="20%">20%</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-zinc-200 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Terbitkan Voucher
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
