"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminWhatsappNumber } from "@/lib/storeConfig";
import {
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Tag,
  Sparkles,
  ShoppingBag,
  Gift,
  Clock,
  MessageCircle,
  X,
  ShieldCheck,
  Award,
  KeyRound,
  ArrowRight,
  Lock,
  Gamepad2,
} from "lucide-react";

interface GameCatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  warranty_days?: number;
  artwork_url?: string;
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

export default function AksharaUnifiedPublicPortal() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<GameCatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");

  // Quick Claim Input
  const [quickClaimCode, setQuickClaimCode] = useState("");

  // VIP Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedVipCode, setAppliedVipCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");

  // Checkout Modal State
  const [selectedGame, setSelectedGame] = useState<GameCatalogItem | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [brokenArtworkIds, setBrokenArtworkIds] = useState<Record<string, boolean>>({});

  // Warranty Verification State
  const [searchSerial, setSearchSerial] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const vipParam = urlParams.get("vip") || urlParams.get("coupon");
      if (vipParam && vipParam.toUpperCase().startsWith("VIP-")) {
        setAppliedVipCode(vipParam.toUpperCase());
        setCouponInput(vipParam.toUpperCase());
      }
    }

    const fetchCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const res = await fetch("/api/catalog");
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && Array.isArray(json.data)) {
            setCatalog(json.data);
          }
        }
      } catch {
        setCatalog([]);
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, []);

  const handleQuickClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickClaimCode.trim().toUpperCase();
    if (!cleaned) {
      router.push("/claim");
      return;
    }
    router.push(`/claim/${encodeURIComponent(cleaned)}`);
  };

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
  };

  const handleRemoveCoupon = () => {
    setAppliedVipCode(null);
    setCouponInput("");
    setCouponError("");
  };

  const calculatePrices = (shopeePrice: number) => {
    const directPrice = Math.round((shopeePrice * 0.9) / 1000) * 1000;
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
    const targetWa = getAdminWhatsappNumber();

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
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚡ Halo Admin Akshara! Saya ingin checkout langsung dengan harga diskon direct 0% fee marketplace.`;

    window.open(`https://wa.me/${targetWa}?text=${encodeURIComponent(text)}`, "_blank");
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
      if (res.ok && data.status === "success") {
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
      {/* ── TOP UTILITY NAVIGATION BAR ── */}
      <header className="sticky top-0 z-40 bg-[#06070a]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
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
                  Store &amp; Claim Vault
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Lisensi Game Resmi &bull; Hemat 10% Direct Store &bull; Brankas Klaim AES-256
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#katalog"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Katalog</span>
            </a>

            <a
              href="#warranty"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Cek Garansi</span>
            </a>

            <Link
              href="/claim"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-[0_2px_14px_rgba(16,185,129,0.35)]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Buka Brankas Klaim</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-10 pt-8">
        {/* ── HERO BANNER ── */}
        <section className="machined-card">
          <div className="machined-card-inner p-6 sm:p-10 relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono font-semibold mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>0% MARKETPLACE ADMIN FEE &bull; 5-SEC VAULT DISPATCH</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] mb-4 text-gradient-silver">
                Beli Lisensi Game Original Lebih Hemat &amp; Klaim Instan di Brankas Resmi.
              </h1>

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-7 max-w-2xl">
                Portal pelanggan resmi Akshara Gaming Center: beli langsung tanpa markup biaya marketplace Shopee, verifikasi sertifikat garansi 30 hari, dan buka kredensial akun/CDKey terenkripsi AES-256.
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-white/[0.08]">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Auto-Fulfill 5 Detik</span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-white/[0.08]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Garansi Resmi 30 Hari</span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 px-3.5 py-2 rounded-xl border border-white/[0.08]">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>100% Original &amp; Legal</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── QUICK ACCESS: PORTAL KLAIM BRANKAS ── */}
        <section className="v0-card rounded-2xl p-5 sm:p-6 border border-emerald-500/25">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400 shrink-0" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Sudah Order via Shopee / WhatsApp? Buka Brankas Klaim
                </h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Masukkan Kode Klaim (contoh <code className="text-emerald-300 font-mono bg-black/50 px-1.5 py-0.5 rounded">AKSH-9921-MC</code>) untuk langsung menuju halaman verifikasi Passcode PIN Anda.
              </p>
            </div>

            <form onSubmit={handleQuickClaimSubmit} className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto">
              <input
                type="text"
                value={quickClaimCode}
                onChange={(e) => setQuickClaimCode(e.target.value.toUpperCase())}
                placeholder="Kode Klaim: AKSH-XXXX-YY"
                className="bg-black/70 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs font-mono uppercase text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 w-full sm:w-56"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Buka Klaim</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </section>

        {/* ── VIP MEMBER COUPON BOX ── */}
        <section className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-amber-500/[0.09] via-indigo-500/[0.05] to-emerald-500/[0.09] border border-amber-500/30">
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
                Pelanggan setia Shopee dapat memasukkan kupon <code className="text-amber-300 font-mono font-bold bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30">VIP-9921-MC</code> untuk potongan ekstra <strong className="text-emerald-300">Rp 15.000</strong>.
              </p>
            </div>

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
                      className="bg-black/70 border border-amber-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono uppercase text-amber-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 w-full sm:w-64"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold font-mono uppercase cursor-pointer"
                  >
                    Klaim Diskon
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 block uppercase font-bold">
                      Voucher VIP Aktif
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {appliedVipCode} &bull; Hemat Rp 15.000
                    </span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="p-1 text-slate-400 hover:text-white ml-2">
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

        {/* ── FILTER & SEARCH BAR ── */}
        <div id="katalog" className="scroll-mt-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["ALL", "STEAM", "MICROSOFT", "ROCKSTAR", "EA"].map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 border cursor-pointer ${
                  selectedPlatform === plat
                    ? "bg-white text-black border-white"
                    : "bg-white/[0.03] text-slate-400 border-white/[0.08] hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {plat === "ALL" ? "Semua Platform" : plat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul game (Minecraft, Wukong...)"
              className="w-full bg-white/[0.03] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* ── LIVE GAME CATALOG GRID ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>Katalog Game Pilihan</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Harga langsung hemat 10% dibanding marketplace tanpa biaya admin
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              {filteredCatalog.length} Produk Tersedia
            </span>
          </div>

          {isLoadingCatalog ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-white/[0.08] p-6 h-64 skeleton-shimmer" />
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
                const { shopeePrice, finalPrice, totalSaving } = calculatePrices(game.selling_price_shopee_idr);
                const hasArt = Boolean(game.artwork_url) && !brokenArtworkIds[game.id];

                return (
                  <div
                    key={game.id}
                    className="v0-card rounded-2xl overflow-hidden hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1"
                  >
                    <div>
                      <div className="relative h-40 w-full bg-gradient-to-br from-slate-900 via-[#0d1424] to-slate-950 overflow-hidden border-b border-white/[0.06]">
                        {hasArt ? (
                          <img
                            src={game.artwork_url}
                            alt={game.title}
                            onError={() =>
                              setBrokenArtworkIds((prev) => ({ ...prev, [game.id]: true }))
                            }
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="w-10 h-10 text-emerald-500/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-black/25 to-transparent" />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-black/75 backdrop-blur-md border border-white/[0.15] text-slate-200">
                            {game.platform}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-400/30">
                            <Zap className="w-3 h-3" />
                            Instant 5-Sec
                          </span>
                        </div>
                      </div>

                      <div className="p-5 pb-0">
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors mb-1 line-clamp-2">
                          {game.title}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500 mb-4">
                          {game.category || "Original Digital Product"}
                        </p>

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
                    </div>

                    <div className="p-5 pt-4 border-t border-white/[0.06]">
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
                          <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${appliedVipCode ? "text-amber-400" : "text-white"}`}>
                            {formatRp(finalPrice)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => openCheckout(game)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Beli Langsung (Fast-Lane)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 1-CLICK CHECKOUT MODAL ── */}
        {checkoutModalOpen && selectedGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="relative w-full max-w-lg rounded-2xl bg-[#0b0e17] border border-white/[0.14] p-6 shadow-2xl space-y-5">
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                  ⚡ 1-Click Fast-Lane Checkout
                </span>
                <h3 className="text-lg font-bold text-white">{selectedGame.title}</h3>
                <span className="text-xs font-mono text-slate-400">
                  {selectedGame.platform} &bull; {selectedGame.category}
                </span>
              </div>

              {(() => {
                const { shopeePrice, directPrice, vipDiscount, finalPrice } = calculatePrices(selectedGame.selling_price_shopee_idr);
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

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Nama / Username Anda</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Contoh: Senna Gamers"
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">No. WhatsApp Aktif</label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>

              <button
                onClick={handleWhatsAppCheckout}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Beli via WhatsApp Fast-Lane</span>
              </button>
            </div>
          </div>
        )}

        {/* ── WARRANTY VERIFICATION PORTAL ── */}
        <section id="warranty" className="scroll-mt-20 pt-6">
          <div className="v0-card rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-400 mb-4">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Digital Certificate Verification</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
                Cek Keabsahan Garansi &amp; Sertifikat Digital
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Masukkan Kode Klaim, Serial Garansi, atau Nomor Pesanan Shopee Anda untuk memvalidasi masa perlindungan aktif.
              </p>
            </div>

            <form onSubmit={handleVerifyWarranty} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5 mb-5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
                <input
                  type="text"
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(e.target.value)}
                  placeholder="Contoh: AKSH-9921-MC atau AKSHARA-..."
                  className="w-full bg-black/60 border border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying}
                className="v0-btn-secondary px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap disabled:opacity-40 cursor-pointer"
              >
                {isVerifying ? "Memvalidasi..." : "Verifikasi"}
              </button>
            </form>

            {verifyError && (
              <div className="max-w-xl mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 font-mono flex items-center gap-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {verificationResult && (
              <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/[0.12] shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-white/[0.08]">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-1 font-bold">
                      Sertifikat Digital Sah &bull; Akshara Vault
                    </span>
                    <h4 className="font-bold text-white text-[16px]">{verificationResult.product_name}</h4>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {verificationResult.warranty_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "SERIAL / KODE", value: verificationResult.serial_number, cls: "text-white" },
                    { label: "NO. PESANAN", value: verificationResult.order_id, cls: "text-slate-300" },
                    { label: "PEMBELI", value: verificationResult.buyer_username, cls: "text-slate-300" },
                    { label: "MASA GARANSI", value: verificationResult.warranty_expires, cls: "text-emerald-400" },
                  ].map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-mono text-slate-500 block mb-1.5 uppercase tracking-wider font-semibold">
                        {f.label}
                      </span>
                      <span className={`text-[12px] font-bold font-mono ${f.cls} break-all leading-snug`}>{f.value}</span>
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
