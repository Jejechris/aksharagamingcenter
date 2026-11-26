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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      {/* ── TOP UTILITY NAVIGATION BAR ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900">
                  Akshara Gaming Center
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-semibold text-emerald-700 uppercase tracking-wider">
                  Store &amp; Claim Vault
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Portal Pelanggan Resmi &bull; 0% Fee Marketplace &bull; Brankas Lisensi Digital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#katalog"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
              <span>Katalog</span>
            </a>

            <a
              href="#warranty"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cek Garansi</span>
            </a>

            <Link
              href="/claim"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xs active:scale-[0.98]"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buka Brankas Klaim</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-6 pt-7">
        {/* ── HERO BANNER ── */}
        <section className="app-card p-6 sm:p-9 relative overflow-hidden bg-gradient-to-br from-white via-white to-emerald-50/50">
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-mono font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>0% MARKETPLACE ADMIN FEE &bull; INSTANT DIGITAL DELIVERY</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-3.5">
              Beli Lisensi Game Original Lebih Hemat &amp; Klaim Instan di Brankas Resmi.
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
              Portal pelanggan resmi Akshara Gaming Center: beli langsung tanpa markup biaya admin marketplace, verifikasi keabsahan sertifikat garansi digital, dan buka kredensial terenkripsi AES-256.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-700">
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Auto-Fulfill Instan</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Garansi Resmi 30 Hari</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>100% Original &amp; Legal</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2 ACTION STRIPS: QUICK CLAIM & VIP COUPON ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Quick Claim Card */}
          <section className="app-card p-5 sm:p-6 border-emerald-200/80 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <KeyRound className="w-4 h-4 shrink-0" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Sudah Order via Shopee / WA? Buka Brankas Klaim
                </h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan Kode Klaim pada Kartu Akses QR Anda (contoh{" "}
                <code className="text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  AKSH-9921-MC
                </code>
                ) untuk langsung menuju halaman verifikasi PIN.
              </p>
            </div>

            <form onSubmit={handleQuickClaimSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickClaimCode}
                onChange={(e) => setQuickClaimCode(e.target.value.toUpperCase())}
                placeholder="Kode Klaim: AKSH-XXXX-YY"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                className="btn-primary-emerald px-4 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Buka Klaim</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </section>

          {/* VIP Member Coupon Card */}
          <section className="app-card p-5 sm:p-6 border-amber-200 bg-gradient-to-br from-white to-amber-50/40 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                  <Gift className="w-4 h-4 shrink-0" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Punya Kode Voucher Member VIP?
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                  Hemat Rp 15rb
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pelanggan setia dapat memasukkan kode kupon{" "}
                <code className="text-amber-800 font-mono font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  VIP-9921-MC
                </code>{" "}
                untuk potongan ekstra <strong className="text-emerald-700">Rp 15.000</strong> di checkout direct.
              </p>
            </div>

            <div>
              {!appliedVipCode ? (
                <form onSubmit={handleApplyCoupon} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Contoh: VIP-9921-MC"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-all active:scale-[0.98] shrink-0 cursor-pointer"
                  >
                    Klaim Diskon
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-emerald-700 block uppercase font-bold">
                        Voucher VIP Aktif
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {appliedVipCode} &bull; Hemat Rp 15.000
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    aria-label="Hapus voucher"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] font-medium text-rose-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {couponError}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ── FILTER & SEARCH BAR ── */}
        <div id="katalog" className="scroll-mt-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["ALL", "STEAM", "MICROSOFT", "ROCKSTAR", "EA"].map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer ${
                  selectedPlatform === plat
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {plat === "ALL" ? "Semua Platform" : plat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul game (Minecraft, Wukong...)"
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* ── LIVE GAME CATALOG GRID ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <span>Katalog Game Pilihan</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Harga langsung hemat 10% dibanding marketplace tanpa biaya admin
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-subtle">
              {filteredCatalog.length} Produk Tersedia
            </span>
          </div>

          {isLoadingCatalog ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="app-card h-72 skeleton-shimmer" />
              ))}
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="app-card text-center py-16">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Tidak ada game yang sesuai pencarian.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPlatform("ALL");
                }}
                className="mt-3 text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
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
                    className="app-card overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="relative h-40 w-full bg-slate-900 overflow-hidden border-b border-slate-200">
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
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <Gamepad2 className="w-10 h-10 text-emerald-400/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/90 backdrop-blur-sm border border-white/60 text-slate-900 shadow-xs">
                            {game.platform}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600 text-white shadow-xs">
                            <Zap className="w-3 h-3" />
                            Instant 5-Sec
                          </span>
                        </div>
                      </div>

                      <div className="p-5 pb-0">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-1 line-clamp-2">
                          {game.title}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          {game.category || "Original Digital Product"}
                        </p>

                        <div className="flex items-center gap-2 mb-5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Garansi {game.warranty_days || 30} Hari
                          </span>
                          <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold">
                            0% Fee
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-4 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-1.5 tabular-nums">
                        <span className="text-xs font-mono text-slate-400 line-through">
                          Shopee: {formatRp(shopeePrice)}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Hemat {formatRp(totalSaving)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          <span className="text-[11px] font-medium text-slate-500 block">
                            {appliedVipCode ? "Harga Spesial VIP:" : "Harga Direct Resmi:"}
                          </span>
                          <span
                            className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight tabular-nums ${
                              appliedVipCode ? "text-amber-600" : "text-slate-900"
                            }`}
                          >
                            {formatRp(finalPrice)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => openCheckout(game)}
                        className="btn-primary-emerald w-full py-2.5 text-xs font-semibold gap-2 shadow-xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold inline-block mb-2">
                  ⚡ 1-Click Fast-Lane Checkout
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedGame.title}</h3>
                <span className="text-xs font-mono text-slate-500">
                  {selectedGame.platform} &bull; {selectedGame.category}
                </span>
              </div>

              {(() => {
                const { shopeePrice, directPrice, vipDiscount, finalPrice } = calculatePrices(selectedGame.selling_price_shopee_idr);
                return (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono tabular-nums">
                    <div className="flex justify-between text-slate-500">
                      <span>Harga Marketplace Shopee:</span>
                      <span className="line-through">{formatRp(shopeePrice)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Diskon Direct (0% Marketplace Fee):</span>
                      <span>-{formatRp(shopeePrice - directPrice)}</span>
                    </div>
                    {appliedVipCode && (
                      <div className="flex justify-between text-amber-700 font-semibold">
                        <span>Voucher Member VIP ({appliedVipCode}):</span>
                        <span>-{formatRp(vipDiscount)}</span>
                      </div>
                    )}
                    <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm text-slate-900">
                      <span>Total Tagihan Bersih:</span>
                      <span className="text-2xl text-emerald-600 font-extrabold font-mono">{formatRp(finalPrice)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nama / Username Anda</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Contoh: Senna Gamers"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">No. WhatsApp Aktif</label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <button
                onClick={handleWhatsAppCheckout}
                className="btn-primary-emerald w-full py-3 text-xs font-semibold gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Beli via WhatsApp Fast-Lane</span>
              </button>
            </div>
          </div>
        )}

        {/* ── WARRANTY VERIFICATION PORTAL ── */}
        <section id="warranty" className="scroll-mt-20 pt-2">
          <div className="app-card p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono font-semibold text-emerald-700 mb-3">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Digital Certificate Verification</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Cek Keabsahan Garansi &amp; Sertifikat Digital
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Masukkan Kode Klaim, Serial Garansi, atau Nomor Pesanan Shopee Anda untuk memvalidasi masa perlindungan aktif.
              </p>
            </div>

            <form onSubmit={handleVerifyWarranty} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5 mb-5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
                <input
                  type="text"
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(e.target.value)}
                  placeholder="Contoh: AKSH-9921-MC atau AKSHARA-..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying}
                className="btn-secondary px-6 py-2.5 text-sm font-semibold whitespace-nowrap disabled:opacity-40"
              >
                {isVerifying ? "Memvalidasi..." : "Verifikasi"}
              </button>
            </form>

            {verifyError && (
              <div className="max-w-xl mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2.5 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{verifyError}</span>
              </div>
            )}

            {verificationResult && (
              <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-700 uppercase tracking-widest block mb-1 font-bold">
                      Sertifikat Digital Sah &bull; Akshara Vault
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">{verificationResult.product_name}</h4>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {verificationResult.warranty_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "SERIAL / KODE", value: verificationResult.serial_number, cls: "text-slate-900" },
                    { label: "NO. PESANAN", value: verificationResult.order_id, cls: "text-slate-700" },
                    { label: "PEMBELI", value: verificationResult.buyer_username, cls: "text-slate-700" },
                    { label: "MASA GARANSI", value: verificationResult.warranty_expires, cls: "text-emerald-700" },
                  ].map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider font-semibold">
                        {f.label}
                      </span>
                      <span className={`text-xs font-bold font-mono ${f.cls} break-all leading-snug`}>{f.value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">SOP Klaim Garansi: </strong>
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
