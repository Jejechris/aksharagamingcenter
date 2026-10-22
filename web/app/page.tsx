"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Tag,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Gift,
  ArrowRight,
  Clock,
  QrCode,
  MessageCircle,
  X,
  Check,
  ShieldCheck,
  Flame,
  Award,
  Radio,
  Copy,
  Lock,
  Cpu
} from "lucide-react";

interface CatalogSeller {
  seller_id?: string;
  seller_name?: string;
  price_g2g_idr?: number;
  delivery_speed?: string;
  stock?: number;
}

interface GameCatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  warranty_days?: number;
  cover_url?: string;
  active_seller?: CatalogSeller;
  sellers?: CatalogSeller[];
  status?: string;
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
  return "Rp " + Math.max(0, Math.round(value)).toLocaleString("id-ID");
}

export default function AksharaDirectStorefront() {
  const [catalog, setCatalog] = useState<GameCatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");

  // VIP Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedVipCode, setAppliedVipCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState(false);

  // Checkout Modal State
  const [selectedGame, setSelectedGame] = useState<GameCatalogItem | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [copiedPrice, setCopiedPrice] = useState(false);

  // Warranty Verification State
  const [searchSerial, setSearchSerial] = useState("AKSHARA-99211A-0818");
  const [verificationResult, setVerificationResult] = useState<VerificationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    // Check URL params for VIP coupon e.g. ?vip=VIP-9921-MC
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const vipParam = urlParams.get("vip") || urlParams.get("coupon");
      if (vipParam && vipParam.toUpperCase().startsWith("VIP-")) {
        setAppliedVipCode(vipParam.toUpperCase());
        setCouponInput(vipParam.toUpperCase());
        setCouponSuccess(true);
      }
    }

    const fetchCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const res = await fetch("/api/catalog");
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
            setCatalog(json.data);
          } else {
            setCatalog(getDefaultCatalog());
          }
        } else {
          setCatalog(getDefaultCatalog());
        }
      } catch {
        setCatalog(getDefaultCatalog());
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, []);

  const getDefaultCatalog = (): GameCatalogItem[] => [
    {
      id: "game-mc-01",
      title: "Minecraft: Java & Bedrock Edition",
      platform: "PC / Microsoft",
      category: "Full Access Account",
      selling_price_shopee_idr: 189000,
      warranty_days: 30,
    },
    {
      id: "game-pz-02",
      title: "Project Zomboid",
      platform: "Steam",
      category: "Steam CD-Key Global",
      selling_price_shopee_idr: 149000,
      warranty_days: 30,
    },
    {
      id: "game-wukong-03",
      title: "Black Myth: Wukong",
      platform: "Steam",
      category: "Steam Account Global",
      selling_price_shopee_idr: 499000,
      warranty_days: 30,
    },
    {
      id: "game-gtav-04",
      title: "Grand Theft Auto V: Premium Edition",
      platform: "Rockstar / Epic",
      category: "Full Access Account",
      selling_price_shopee_idr: 165000,
      warranty_days: 30,
    },
    {
      id: "game-terraria-05",
      title: "Terraria",
      platform: "Steam",
      category: "Steam CD-Key Global",
      selling_price_shopee_idr: 95000,
      warranty_days: 30,
    },
    {
      id: "game-fc25-06",
      title: "EA SPORTS FC 25",
      platform: "EA App / PC",
      category: "Standard Account Global",
      selling_price_shopee_idr: 549000,
      warranty_days: 30,
    },
  ];

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const cleaned = couponInput.trim().toUpperCase();
    if (!cleaned) {
      setCouponError("Masukkan kode voucher member VIP Anda.");
      return;
    }
    if (!cleaned.startsWith("VIP-") && cleaned.length < 5) {
      setCouponError("Format kupon tidak valid. Gunakan format VIP-XXXX (contoh: VIP-9921-MC).");
      return;
    }
    setAppliedVipCode(cleaned);
    setCouponSuccess(true);
  };

  const handleRemoveCoupon = () => {
    setAppliedVipCode(null);
    setCouponInput("");
    setCouponSuccess(false);
    setCouponError("");
  };

  const calculatePrices = (shopeePrice: number) => {
    // 10% direct saving from 0% marketplace fees
    const directPrice = Math.round((shopeePrice * 0.9) / 1000) * 1000;
    // Extra VIP discount: Rp 15.000
    const vipDiscount = appliedVipCode ? 15000 : 0;
    const finalPrice = Math.max(10000, directPrice - vipDiscount);
    const totalSaving = shopeePrice - finalPrice;

    return {
      shopeePrice,
      directPrice,
      vipDiscount,
      finalPrice,
      totalSaving,
    };
  };

  const openCheckout = (game: GameCatalogItem) => {
    setSelectedGame(game);
    setCheckoutModalOpen(true);
  };

  const handleWhatsAppCheckout = () => {
    if (!selectedGame) return;
    const { shopeePrice, finalPrice, vipDiscount } = calculatePrices(selectedGame.selling_price_shopee_idr);
    const targetWa = "6282299887766";
    
    let text = `🎮 *PESANAN DIRECT FAST-LANE — AKSHARA GAMING CENTER*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎮 *Game:* ${selectedGame.title}\n`;
    text += `🏷️ *Platform:* ${selectedGame.platform}\n`;
    text += `📦 *Kategori:* ${selectedGame.category}\n`;
    text += `💵 *Harga Marketplace:* ${formatRp(shopeePrice)}\n`;
    text += `⚡ *Harga Direct Resmi:* ${formatRp(finalPrice)}\n`;
    if (appliedVipCode) {
      text += `🎟️ *Voucher VIP:* \`${appliedVipCode}\` (-${formatRp(vipDiscount)})\n`;
    }
    text += `👤 *Nama Pembeli:* ${buyerName || "(Customer Baru)"}\n`;
    text += `📱 *No. WhatsApp:* ${buyerPhone || "-"}\n`;
    if (buyerNotes) {
      text += `📝 *Catatan:* ${buyerNotes}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚡ Halo Admin Akshara! Saya ingin checkout langsung dengan harga diskon direct 0% fee marketplace. Mohon kirim instruksi pembayaran QRIS / Bank Fast-Lane untuk pengiriman instan 5 detik brankas. Terima kasih!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${targetWa}?text=${encoded}`, "_blank");
  };

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
        setVerifyError(data.message || "Serial ID tidak ditemukan dalam database klaim.");
      }
    } catch {
      setVerifyError("Gagal menghubungi server verifikasi.");
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform =
      selectedPlatform === "ALL" ||
      item.platform.toUpperCase().includes(selectedPlatform.toUpperCase());
    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="min-h-screen text-slate-100 pb-24">
      {/* ── TOP UTILITY NAVIGATION BAR ──────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#06070a]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-indigo-500/30 to-purple-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white font-sans">
                  AKSHARA GAMING CENTER
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Direct Store
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Lisensi Game Resmi &bull; Hemat 10% Bebas Biaya Marketplace &bull; Garansi 30 Hari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="#warranty"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all hover:border-sky-400/30"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              Cek Garansi
            </a>

            {/* Discrete Admin Command Deck Button */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-white bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.12] hover:border-indigo-400/40 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.4)] group"
              title="Akses Admin Dashboard & Control Deck"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
              <span>Command Deck</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-10 pt-8">
        {/* ── HERO BANNER (MACHINED DOUBLE-BEZEL) ───────────────────── */}
        <section className="machined-card">
          <div className="machined-card-inner p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono font-semibold mb-5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <span>0% MARKETPLACE ADMIN FEE &bull; 5-SEC VAULT DISPATCH</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] mb-4 text-gradient-silver">
                Beli Lisensi Game Original Lebih Hemat Langsung dari Sumbernya.
              </h1>

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-7 max-w-2xl">
                Nikmati game PC & Console favorit Anda tanpa markup biaya marketplace Shopee.
                Akun resmi bergaransi 30 hari anti-hackback, dengan serah terima kredensial terenkripsi AES-256 instan 5 detik.
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-white/[0.08] shadow-inner">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Auto-Fulfill 5 Detik</span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-white/[0.08] shadow-inner">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Garansi Resmi 30 Hari</span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-white/[0.08] shadow-inner">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>100% Original & Legal</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── VIP MEMBER COUPON INTERACTIVE BOX ─────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-amber-500/[0.09] via-indigo-500/[0.05] to-emerald-500/[0.09] border border-amber-500/30 shadow-[0_4px_30px_rgba(245,158,11,0.08)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Punya Kode Voucher Member VIP?
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                  Diskon Langsung
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pelanggan setia yang pernah membeli via Shopee dapat memasukkan kode kupon dari kartu serah terima Anda (contoh: <code className="text-amber-300 font-mono font-bold bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30">VIP-9921-MC</code>) untuk potongan ekstra <strong className="text-emerald-300">Rp 15.000</strong> di semua game!
              </p>
            </div>

            {/* Input Form */}
            <div className="shrink-0 w-full md:w-auto">
              {!appliedVipCode ? (
                <form onSubmit={handleApplyCoupon} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Tag className="w-4 h-4 text-amber-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Contoh: VIP-9921-MC"
                      className="bg-black/70 border border-amber-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono uppercase text-amber-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 w-full sm:w-64 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-md active:scale-95"
                  >
                    Klaim Diskon
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 block uppercase font-bold tracking-wider">
                        Voucher VIP Aktif
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        {appliedVipCode} &bull; Hemat Rp 15.000
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all ml-2"
                    title="Hapus voucher"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] font-mono text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {couponError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── FILTER & SEARCH BAR ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Platform tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {["ALL", "PC", "STEAM", "MICROSOFT", "EA"].map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 border ${
                  selectedPlatform === plat
                    ? "bg-white text-black border-white shadow-[0_2px_12px_rgba(255,255,255,0.2)]"
                    : "bg-white/[0.03] text-slate-400 border-white/[0.08] hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {plat === "ALL" ? "Semua Platform" : plat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul game (Minecraft, Wukong...)"
              className="w-full bg-white/[0.03] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        {/* ── LIVE GAME CATALOG GRID ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>Katalog Game Pilihan</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Harga langsung hemat 10% dibanding marketplace tanpa potongan biaya admin
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              {filteredCatalog.length} Produk Tersedia
            </span>
          </div>

          {isLoadingCatalog ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 h-64 skeleton-shimmer"
                />
              ))}
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Tidak ada game yang sesuai pencarian.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPlatform("ALL");
                }}
                className="mt-3 text-xs font-mono text-emerald-400 hover:underline"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCatalog.map((game) => {
                const { shopeePrice, directPrice, vipDiscount, finalPrice, totalSaving } =
                  calculatePrices(game.selling_price_shopee_idr);

                return (
                  <div
                    key={game.id}
                    className="v0-card rounded-2xl p-5 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between shadow-lg group hover:-translate-y-1"
                  >
                    <div>
                      {/* Card Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/[0.06] border border-white/[0.10] text-slate-300">
                          {game.platform}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Zap className="w-3 h-3" />
                          Instant 5-Sec
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors mb-1 line-clamp-2">
                        {game.title}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500 mb-4">
                        {game.category || "Original Digital Product"}
                      </p>

                      {/* Warranty & Feature Pills */}
                      <div className="flex items-center gap-2 mb-5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300 bg-black/50 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Garansi {game.warranty_days || 30} Hari
                        </span>
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-semibold">
                          0% Fee
                        </span>
                      </div>
                    </div>

                    {/* Price & Action Box */}
                    <div className="pt-4 border-t border-white/[0.06]">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[11px] font-mono text-slate-500 line-through">
                          Shopee: {formatRp(shopeePrice)}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                          Hemat {formatRp(totalSaving)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {appliedVipCode ? "Harga Spesial VIP:" : "Harga Direct Resmi:"}
                          </span>
                          <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                            appliedVipCode ? "text-amber-400" : "text-white"
                          }`}>
                            {formatRp(finalPrice)}
                          </span>
                        </div>
                        {appliedVipCode && (
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20 font-bold">
                            VIP Applied
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => openCheckout(game)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] active:scale-98"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Beli Langsung (Fast-Lane)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 1-CLICK CHECKOUT MODAL ──────────────────────────────── */}
        {checkoutModalOpen && selectedGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="relative w-full max-w-lg rounded-2xl bg-[#0b0e17] border border-white/[0.14] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                  ⚡ 1-Click Fast-Lane Checkout
                </span>
                <h3 className="text-lg font-bold text-white">
                  {selectedGame.title}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {selectedGame.platform} &bull; {selectedGame.category}
                </span>
              </div>

              {/* Price Calculation Summary */}
              {(() => {
                const { shopeePrice, directPrice, vipDiscount, finalPrice, totalSaving } =
                  calculatePrices(selectedGame.selling_price_shopee_idr);

                return (
                  <div className="p-4 rounded-xl bg-black/50 border border-white/[0.08] space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Harga Marketplace Shopee:</span>
                      <span className="line-through">{formatRp(shopeePrice)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Diskon Direct (0% Marketplace Fee):</span>
                      <span>-{formatRp(shopeePrice - directPrice)}</span>
                    </div>
                    {appliedVipCode && (
                      <div className="flex justify-between text-amber-400">
                        <span>Voucher Member VIP ({appliedVipCode}):</span>
                        <span>-{formatRp(vipDiscount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-white/[0.10] flex justify-between items-baseline font-bold text-sm text-white">
                      <span>Total Tagihan Bersih:</span>
                      <span className="text-2xl text-emerald-400 font-mono">{formatRp(finalPrice)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Buyer Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Nama / Username Anda
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Contoh: Senna Gamers"
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    No. WhatsApp Aktif (Untuk Pengiriman Kredensial Brankas)
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleWhatsAppCheckout}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-98"
                >
                  <MessageCircle className="w-4 h-4" />
                  Beli via WhatsApp Fast-Lane (Instan 5 Detik)
                </button>

                <div className="text-center">
                  <p className="text-[10px] font-mono text-slate-500">
                    Kredensial akun dikirim otomatis melalui link Brankas Enkripsi Bergaransi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── WARRANTY VERIFICATION PORTAL ────────────────────────── */}
        <section id="warranty" className="scroll-mt-16 pt-8">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
              Verifikasi Garansi & Sertifikat
            </h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.10] to-transparent" />
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400 shrink-0">
              PORTAL FORENSIK
            </span>
          </div>

          <div className="v0-card rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-400 mb-4">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Digital Certificate Verification
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
                Cek Keabsahan Garansi & Sertifikat Digital
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Validasi Serial ID unik dari garansi digital pesanan Anda secara online & real-time.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleVerifyWarranty} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5 mb-5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
                <input
                  type="text"
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(e.target.value)}
                  placeholder="Contoh: AKSHARA-99211A-0818"
                  className="w-full bg-black/60 border border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying}
                className="v0-btn-secondary px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap disabled:opacity-40"
              >
                {isVerifying ? "Memvalidasi..." : "Verifikasi"}
              </button>
            </form>

            {/* Error */}
            {verifyError && (
              <div className="max-w-xl mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 font-mono flex items-center gap-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Result */}
            {verificationResult && (
              <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/[0.12] shadow-2xl animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-white/[0.08]">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-1 font-bold">
                      Sertifikat Digital Sah &bull; Akshara Vault
                    </span>
                    <h4 className="font-bold text-white text-[16px]">
                      {verificationResult.product_name}
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {verificationResult.warranty_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "SERIAL NUMBER", value: verificationResult.serial_number, cls: "text-white" },
                    { label: "NO. PESANAN", value: verificationResult.order_id, cls: "text-slate-300" },
                    { label: "PEMBELI", value: verificationResult.buyer_username, cls: "text-slate-300" },
                    { label: "MASA GARANSI", value: verificationResult.warranty_expires, cls: "text-emerald-400" },
                  ].map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-mono text-slate-500 block mb-1.5 uppercase tracking-wider font-semibold">
                        {f.label}
                      </span>
                      <span className={`text-[12px] font-bold font-mono ${f.cls} break-all leading-snug`}>
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">SOP Klaim Garansi: </strong>
                    {verificationResult.sop_summary}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
