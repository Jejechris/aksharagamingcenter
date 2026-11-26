"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import ThumbnailStudio from "@/app/dashboard/marketer/components/ThumbnailStudio";
import GameSelectorCombobox from "@/app/components/GameSelectorCombobox";
import MassUploadStudio from "./components/MassUploadStudio";
import { formatCleanShopeeTitle, stripEmojisAndUnsafeSymbols } from "@/lib/shopeeCompliance";
import {
  SHOPEE_FEE_PRESETS,
  ShopeeFeePresetId,
  DEFAULT_FX_BUFFER_PCT,
  calculateShopeeEconomics,
  calculateTargetSellingPrice,
} from "@/lib/pricing";
import {
  ShoppingBag,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Shield,
  ShieldCheck,
  Zap,
  Tag,
  FileText,
  Sliders,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Layers,
  Image as ImageIcon,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  Info,
  FileSpreadsheet
} from "lucide-react";

interface CatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  metrics?: {
    cogs_g2g_idr?: number;
    cogs_net_idr?: number;
    net_profit_idr?: number;
    net_margin_pct?: number;
  };
}

export default function ShopeeLaunchpadPage() {
  const [launchpadMode, setLaunchpadMode] = useState<"single" | "mass_upload">("single");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "mass_upload") {
      setLaunchpadMode("mass_upload");
    }
  }, []);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string>("custom");

  // Product Inputs
  const [gameTitle, setGameTitle] = useState("Minecraft: Java & Bedrock Edition");
  const [platform, setPlatform] = useState("PC / Microsoft");
  const [category, setCategory] = useState("Full Access Account");
  const [price, setPrice] = useState<number>(189000);
  const [cogsEstimate, setCogsEstimate] = useState<number>(115000);
  const [warrantyDays, setWarrantyDays] = useState<number>(30);
  const [feePreset, setFeePreset] = useState<ShopeeFeePresetId>("reguler");
  const [fxBufferEnabled, setFxBufferEnabled] = useState<boolean>(false);

  // Description Customizer Toggles
  const [includeSopUnboxing, setIncludeSopUnboxing] = useState(true);
  const [includeActivationGuide, setIncludeActivationGuide] = useState(true);
  const [includeFaq, setIncludeFaq] = useState(true);
  const [includeVipPromo, setIncludeVipPromo] = useState(true);
  const [customBonusNotes, setCustomBonusNotes] = useState("");

  // Outputs (User Editable in Steps 2 & 3)
  const [seoTitle, setSeoTitle] = useState("");
  const [generatedDesc, setGeneratedDesc] = useState("");
  const [seoTags, setSeoTags] = useState("");

  // Copy Feedbacks
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedPrice, setCopiedPrice] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedAttr, setCopiedAttr] = useState<string | null>(null);

  // Checklist State
  const [checklist, setChecklist] = useState({
    cover: false,
    title: false,
    desc: false,
    price: false,
  });

  // Helper: Build Clean Shopee Title matching Cover 1:1
  const generateDefaultTitle = useCallback((title: string, plat: string, _days: number, cat?: string) => {
    return formatCleanShopeeTitle({ title, platform: plat, category: cat });
  }, []);

  // Helper: Build Clean Shopee Description (100% Polos Tanpa Emoji, Tanpa ALL CAPS Spam, Zero-Link)
  const generateDefaultDesc = useCallback((
    title: string,
    plat: string,
    cat: string,
    days: number,
    guide: boolean,
    unboxing: boolean,
    faq: boolean,
    vip: boolean,
    bonus: string
  ) => {
    const cleanT = (title || "Game Original").trim();
    const coverTitle = formatCleanShopeeTitle({ title: cleanT, platform: plat, category: cat });

    let desc = `${coverTitle}\n`;
    desc += `Platform: ${plat} | Tipe: ${cat}\n`;
    desc += `Garansi Toko Resmi: ${days} Hari Penuh\n`;
    desc += `--------------------------------------------------\n\n`;

    desc += `KEUNGGULAN PRODUK AKSHARA GAMING CENTER:\n`;
    desc += `- 100% Lisensi Game Asli dan Legal.\n`;
    desc += `- Akses Penuh Pribadi untuk 1 Pembeli (Bukan Akun Bersama).\n`;
    desc += `- Pengiriman Instan 100% Digital via Chat Shopee.\n`;
    desc += `- Perlindungan garansi toko resmi selama ${days} hari penuh.\n\n`;

    if (guide) {
      desc += `CARA AKTIVASI DAN PENGAMBILAN KREDENSIAL (100% DIGITAL QR):\n`;
      desc += `1. Selesaikan pembayaran pesanan Anda di Shopee.\n`;
      desc += `2. Admin akan mengirimkan Kartu Akses dan Sertifikat Garansi Digital PNG (berisi QR Code + Kode Klaim + PIN) langsung melalui Chat Shopee.\n`;
      desc += `3. Scan QR Code pada gambar kartu menggunakan kamera HP Anda atau masukkan Kode Klaim & PIN untuk membuka kredensial / CD-Key secara instan.\n`;
      desc += `4. Login ke launcher resmi (${plat}) dan selamat bermain.\n\n`;
    }

    if (unboxing) {
      desc += `SYARAT DAN KETENTUAN KLAIM GARANSI:\n`;
      desc += `- Wajib merekam video rekaman layar (screen recording) tanpa jeda (no-cut) mulai dari sebelum membuka brankas kredensial hingga mencoba login pertama kali.\n`;
      desc += `- Garansi meliputi akun tidak bisa login saat serah terima atau kendala lisensi selama masa garansi ${days} hari.\n`;
      desc += `- Ulasan bintang 5 dan konfirmasi penerimaan pesanan akan mengaktifkan Sertifikat Garansi Digital secara otomatis.\n\n`;
    }

    if (faq) {
      desc += `PERTANYAAN UMUM (F.A.Q):\n`;
      desc += `Q: Apakah ini permanen?\n`;
      desc += `A: Ya, game menjadi milik Anda permanen dan dapat dimainkan online/offline sesuai fitur resmi game.\n`;
      desc += `Q: Apakah ada pengiriman paket atau amplop fisik?\n`;
      desc += `A: Tidak ada. 100% Pengiriman Digital instan melalui Chat Shopee menggunakan Kartu Akses dan Garansi Digital QR resmi.\n\n`;
    }

    if (vip) {
      desc += `BONUS MEMBER VIP REPEAT ORDER:\n`;
      desc += `Pesanan berstatus garansi aktif otomatis tercatat pada ID Sertifikat Garansi Digital Akshara untuk benefit prioritas dan promo repeat order.\n\n`;
    }

    if (bonus.trim()) {
      desc += `CATATAN TAMBAHAN:\n${bonus.trim()}\n\n`;
    }

    // Hashtags
    const cleanWords = cleanT.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
    const tags = [
      `#${cleanWords.join("")}`,
      `#Jual${cleanWords[0] || "Game"}`,
      "#GamePC",
      "#AksharaGaming",
      "#GaransiResmi",
      `#${plat.replace(/[^a-zA-Z0-9]/g, "") || "PCGame"}`,
      "#DigitalLicense"
    ].slice(0, 7).join(" ");

    desc += `--------------------------------------------------\n${tags}`;
    return { desc: stripEmojisAndUnsafeSymbols(desc), tags };
  }, []);

  // Fetch Catalog on Mount
  useEffect(() => {
    async function loadCatalog() {
      setIsLoadingCatalog(true);
      try {
        const data = await fetchSmartCatalog();
        if (Array.isArray(data) && data.length > 0) {
          setCatalog(data);
          const first = data[0];
          setSelectedGameId(first.id);
          setGameTitle(first.title);
          setPlatform(first.platform);
          setCategory(first.category);
          setPrice(first.selling_price_shopee_idr);
          const cogs = first.metrics?.cogs_g2g_idr || Math.round(first.selling_price_shopee_idr * 0.6);
          setCogsEstimate(cogs);

          const initTitle = generateDefaultTitle(first.title, first.platform, 30, first.category);
          setSeoTitle(initTitle);

          const { desc, tags } = generateDefaultDesc(
            first.title,
            first.platform,
            first.category,
            30,
            true,
            true,
            true,
            true,
            ""
          );
          setGeneratedDesc(desc);
          setSeoTags(tags);
        }
      } catch (e) {
        console.error("Failed to load catalog", e);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, [generateDefaultTitle, generateDefaultDesc]);

  // Handle Game Selection from Catalog
  const handleSelectGame = (id: string) => {
    setSelectedGameId(id);
    let newTitle = "Custom Game Title";
    let newPlat = "Steam";
    let newCat = "Steam CD-Key Global";
    let newPrice = 150000;
    let newCogs = 95000;

    if (id !== "custom") {
      const found = catalog.find((g) => g.id === id);
      if (found) {
        newTitle = found.title;
        newPlat = found.platform;
        newCat = found.category;
        newPrice = found.selling_price_shopee_idr;
        newCogs = found.metrics?.cogs_g2g_idr || Math.round(found.selling_price_shopee_idr * 0.6);
      }
    }

    setGameTitle(newTitle);
    setPlatform(newPlat);
    setCategory(newCat);
    setPrice(newPrice);
    setCogsEstimate(newCogs);

    // Auto-sync SEO outputs
    const defTitle = generateDefaultTitle(newTitle, newPlat, warrantyDays, newCat);
    setSeoTitle(defTitle);

    const { desc, tags } = generateDefaultDesc(
      newTitle,
      newPlat,
      newCat,
      warrantyDays,
      includeActivationGuide,
      includeSopUnboxing,
      includeFaq,
      includeVipPromo,
      customBonusNotes
    );
    setGeneratedDesc(desc);
    setSeoTags(tags);

    // Reset step checklist for new game
    setChecklist({ cover: false, title: false, desc: false, price: false });
  };

  // Re-generate Description based on toggles
  const handleRebuildDesc = () => {
    const { desc, tags } = generateDefaultDesc(
      gameTitle,
      platform,
      category,
      warrantyDays,
      includeActivationGuide,
      includeSopUnboxing,
      includeFaq,
      includeVipPromo,
      customBonusNotes
    );
    setGeneratedDesc(desc);
    setSeoTags(tags);
  };

  // Re-generate SEO Title
  const handleRebuildTitle = () => {
    const defTitle = generateDefaultTitle(gameTitle, platform, warrantyDays, category);
    setSeoTitle(defTitle);
  };

  // Quick Keyword Chips (Shopee-Safe Title Case)
  const KEYWORD_CHIPS = [
    "Private",
    "CD-Key",
    "Full Access",
    `Garansi ${warrantyDays} Hari`,
    "Global",
    "Digital QR",
    "REGION FREE"
  ];

  const handleToggleKeyword = (chip: string) => {
    if (seoTitle.toUpperCase().includes(chip.toUpperCase())) {
      // Remove keyword
      const regex = new RegExp(`\\b${chip}\\b`, "gi");
      const updated = seoTitle.replace(regex, "").replace(/\s{2,}/g, " ").trim();
      setSeoTitle(updated);
    } else {
      // Append keyword
      const updated = `${seoTitle.trim()} ${chip}`.trim();
      setSeoTitle(updated);
    }
  };

  // Copy Handlers
  const handleCopyText = (text: string, type: "title" | "desc" | "tags" | "price" | "all") => {
    navigator.clipboard.writeText(text);
    if (type === "title") {
      setCopiedTitle(true);
      setChecklist((prev) => ({ ...prev, title: true }));
      setTimeout(() => setCopiedTitle(false), 2000);
    } else if (type === "desc") {
      setCopiedDesc(true);
      setChecklist((prev) => ({ ...prev, desc: true }));
      setTimeout(() => setCopiedDesc(false), 2000);
    } else if (type === "tags") {
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 2000);
    } else if (type === "price") {
      setCopiedPrice(true);
      setChecklist((prev) => ({ ...prev, price: true }));
      setTimeout(() => setCopiedPrice(false), 2000);
    } else if (type === "all") {
      setCopiedAll(true);
      setChecklist({ cover: true, title: true, desc: true, price: true });
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleCopyAttr = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedAttr(key);
    setTimeout(() => setCopiedAttr(null), 1800);
  };

  // Synchronized Digital Pricing Formula (Packaging = Rp 0)
  const activeFxBufferPct = fxBufferEnabled ? DEFAULT_FX_BUFFER_PCT : 0;
  const economics = calculateShopeeEconomics({
    sellingPriceIdr: price,
    cogsIdr: cogsEstimate,
    presetId: feePreset,
    fxBufferPct: activeFxBufferPct,
    packagingCostIdr: 0,
  });
  const qrisFee = economics.qrisFeeIdr + economics.fxBufferIdr;
  const shopeeFee = economics.shopeeFeeIdr;
  const netEarnings = Math.max(0, economics.netProfitIdr);
  const netMarginPct = economics.netMarginPct.toFixed(1);
  const isLowMargin = economics.netMarginPct < 15 || economics.netProfitIdr <= 0;
  const suggestedSafePrice = calculateTargetSellingPrice({
    cogsIdr: cogsEstimate,
    presetId: feePreset,
    fxBufferPct: activeFxBufferPct,
    packagingCostIdr: 0,
    targetMarginPct: 18,
  });

  // Wizard Steps Metadata
  const STEPS = [
    {
      id: 1,
      key: "cover" as const,
      title: "Cover 1080×1080",
      icon: ImageIcon,
      description: "Desain cover otentik Slide 1 & Slide 2",
    },
    {
      id: 2,
      key: "title" as const,
      title: "Judul SEO",
      icon: Tag,
      description: "Optimasi 120 karakter kata kunci tinggi",
    },
    {
      id: 3,
      key: "desc" as const,
      title: "Deskripsi & SOP",
      icon: FileText,
      description: "Format klaim brankas & anti-komplain",
    },
    {
      id: 4,
      key: "price" as const,
      title: "Harga & Publish",
      icon: ShoppingBag,
      description: "Kalkulasi laba bersih & final checklist",
    },
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-clip bg-[#F8FAFC] text-slate-900 pb-16">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 min-w-0">
        
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 1. TOP CONTROL BAR (SELALU TAMPIL DI ATAS - COMPACT 1 APP-CARD)   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="app-card p-4 sm:p-5 bg-white border border-slate-200 shadow-sm space-y-4">
          
          {/* Baris Atas: Judul, Selector Game & Quick Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    Shopee Listing Launchpad
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                    {launchpadMode === "single" ? "4-STEP FLOW" : "MASS UPLOAD"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {launchpadMode === "single"
                    ? "Eksekusi satu alur cover, judul SEO, SOP zero-link, hingga penetapan harga."
                    : "Export massal template Excel resmi Shopee Seller Centre + auto-render cover 1080x1080."}
                </p>
              </div>
            </div>

            {/* Mode Switcher + Quick Action */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto min-w-0">
              <div className="inline-flex flex-wrap sm:flex-nowrap p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setLaunchpadMode("single")}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    launchpadMode === "single"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Wizard Satuan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLaunchpadMode("mass_upload")}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    launchpadMode === "mass_upload"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>Batch Mass Upload</span>
                </button>
              </div>

              {launchpadMode === "single" && (
                <div className="relative w-full md:w-[320px] md:flex-none min-w-0">
                  <GameSelectorCombobox
                    games={catalog}
                    selectedGameId={selectedGameId}
                    selectedGameTitle={gameTitle}
                    showCustomOption={true}
                    onSelectCustom={() => handleSelectGame("custom")}
                    onSelect={(g) => handleSelectGame(g.id)}
                    placeholder="Pilih game atau ketik manual..."
                  />
                </div>
              )}

              <a
                href="https://seller.shopee.co.id/portal/product/new"
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Shopee Seller Center"
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 btn-tactile"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Seller Center</span>
              </a>
            </div>
          </div>

          {/* Baris Bawah: 4-Step Interactive Horizontal Stepper (Hanya di Wizard Satuan) */}
          {launchpadMode === "single" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const isActive = activeStep === s.id;
                const isDone = checklist[s.key];

                let stepStyle = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100";
                if (isActive) {
                  stepStyle = "bg-emerald-600 border-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20";
                } else if (isDone) {
                  stepStyle = "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70";
                }

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveStep(s.id)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left flex items-center gap-2 sm:gap-3 transition-all cursor-pointer min-w-0 ${stepStyle}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-white/20 text-white"
                          : isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-300 text-slate-500"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <span>{s.id}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : isDone ? "text-emerald-700" : "text-slate-400"}`} />
                        <span className="text-xs font-bold truncate">{s.title}</span>
                      </div>
                      <span className={`text-[10px] block truncate ${isActive ? "text-emerald-100" : "text-slate-400"}`}>
                        {isDone ? "Sudah Siap ✓" : s.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 1B. KONTEN BATCH MASS UPLOAD STUDIO (MODE MASS UPLOAD EXCEL)       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {launchpadMode === "mass_upload" && (
          <div className="animate-fade-up">
            <MassUploadStudio />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2. KONTEN WIZARD (HANYA 1 STEP AKTIF PER LAYAR - PERSISTENT STATE) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className={launchpadMode === "single" ? "space-y-5" : "hidden"}>

        {/* ── STEP 1: COVER 1080x1080 (CSS block/hidden agar state studio awet) ── */}
        <div className={activeStep === 1 ? "block animate-fade-up" : "hidden"}>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Langkah 1: Studio Cover Otentik 1080x1080
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Slide 1 (Cover Utama) &amp; Slide 2 (Rules &amp; Terms)
              </span>
            </div>

            {/* Thumbnail Studio Compact */}
            <ThumbnailStudio
              compact
              externalGameTitle={gameTitle}
              externalPlatform={platform}
              externalCategory={category}
              externalPrice={`Rp ${Math.round(price).toLocaleString("id-ID")}`}
              onCoverDownloaded={() => setChecklist((prev) => ({ ...prev, cover: true }))}
            />
          </div>
        </div>

        {/* ── STEP 2: JUDUL SEO (CSS block/hidden) ────────────────────────── */}
        <div className={activeStep === 2 ? "block animate-fade-up" : "hidden"}>
          <div className="app-card p-5 sm:p-6 bg-white border border-slate-200 shadow-sm space-y-6">
            
            {/* Header Step 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Langkah 2: Optimasi Judul Produk Shopee (SEO)
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Judul maksimal 120 karakter dengan susunan kata kunci yang sering dicari pembeli game di Shopee.
                </p>
              </div>

              {/* Character Counter Badge */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRebuildTitle}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Kembalikan judul ke template default"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset Default</span>
                </button>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                    seoTitle.length <= 120
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  {seoTitle.length} / 120 Karakter
                </span>
              </div>
            </div>

            {/* Quick Metadata Inputs */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Metadata Inti Produk
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Nama Game:
                  </label>
                  <input
                    type="text"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Platform:
                  </label>
                  <input
                    type="text"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Format / Tipe Lisensi:
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Main Title Editor */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Editor Judul Shopee:</span>
                <span className="text-[11px] font-normal text-slate-400">
                  Dapat diedit bebas langsung di bawah ini
                </span>
              </label>
              <textarea
                rows={2}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Masukkan judul listing Shopee..."
                className="w-full bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 font-mono font-bold leading-relaxed focus:outline-none transition-colors shadow-2xs"
              />
            </div>

            {/* Quick Keyword Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Keyword Chips (1-Klik Tambah / Hapus):
                </span>
                <span className="text-[11px] text-slate-400">
                  Klik chip untuk menyelipkan kata kunci
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {KEYWORD_CHIPS.map((chip) => {
                  const isPresent = seoTitle.toUpperCase().includes(chip.toUpperCase());
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleToggleKeyword(chip)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPresent
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <span>{chip}</span>
                      {isPresent ? (
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      ) : (
                        <span className="text-slate-400 text-xs">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Search Result Preview */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                Simulasi Tampilan di Hasil Pencarian Mobile Shopee:
              </span>
              <div className="max-w-sm bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="bg-[#EE4D2D] text-white text-[9px] font-bold px-1 py-0.5 rounded">
                        Star+
                      </span>
                      <span className="text-[10px] text-slate-400">Garansi Shopee</span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 line-clamp-2 leading-snug">
                      {seoTitle || "Judul produk akan muncul di sini..."}
                    </p>
                    <div className="text-sm font-bold text-[#EE4D2D] font-mono tabular-nums">
                      Rp {Math.round(price).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar Step 2 */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopyText(seoTitle, "title")}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                {copiedTitle ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedTitle ? "Judul Berhasil Disalin!" : "Salin Judul Produk"}</span>
              </button>

              <span className="text-xs text-slate-500 text-center sm:text-right">
                Klik tombol di atas untuk menandai checklist judul selesai.
              </span>
            </div>

          </div>
        </div>

        {/* ── STEP 3: DESKRIPSI & SOP (CSS block/hidden) ─────────────────── */}
        <div className={activeStep === 3 ? "block animate-fade-up" : "hidden"}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Kiri: Toggle Opsi Struktur SOP (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="app-card p-5 bg-white border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-purple-600" />
                    Modul Struktur SOP
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold">
                    ANTI-KOMPLAIN
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="flex items-start gap-2.5 text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeActivationGuide}
                      onChange={(e) => {
                        setIncludeActivationGuide(e.target.checked);
                      }}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">Panduan Klaim Brankas</span>
                      <span className="text-[11px] text-slate-500">Instruksi 4 langkah buka brankas digital</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeSopUnboxing}
                      onChange={(e) => {
                        setIncludeSopUnboxing(e.target.checked);
                      }}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">SOP Video Layar No-Cut</span>
                      <span className="text-[11px] text-slate-500">Syarat klaim garansi anti-fraud pembeli</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeFaq}
                      onChange={(e) => {
                        setIncludeFaq(e.target.checked);
                      }}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">FAQ Anti-Komplain</span>
                      <span className="text-[11px] text-slate-500">Jawaban status permanen &amp; lisensi</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeVipPromo}
                      onChange={(e) => {
                        setIncludeVipPromo(e.target.checked);
                      }}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">Voucher VIP Repeat Order</span>
                      <span className="text-[11px] text-slate-500">Kupon potongan Rp 15.000 pesanan kedua</span>
                    </div>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Catatan Tambahan / Bonus Khusus:
                  </label>
                  <textarea
                    rows={3}
                    value={customBonusNotes}
                    onChange={(e) => setCustomBonusNotes(e.target.value)}
                    placeholder="Contoh: Bonus mod pack installer atau save file 100%..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRebuildDesc}
                  className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Terapkan Modul ke Deskripsi</span>
                </button>
              </div>
            </div>

            {/* Kanan: Editor Deskripsi Lengkap (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="app-card p-5 bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Editor Deskripsi Produk Shopee
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold border ${
                      generatedDesc.length <= 3000
                        ? "bg-slate-50 border-slate-200 text-slate-600"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    {generatedDesc.length} / 3000 Karakter
                  </span>
                </div>

                <textarea
                  rows={14}
                  value={generatedDesc}
                  onChange={(e) => setGeneratedDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl p-3.5 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none transition-colors"
                />

                {/* Action Buttons Step 3 */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(generatedDesc, "desc")}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      {copiedDesc ? <Check className="w-4 h-4 text-white stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedDesc ? "Deskripsi Disalin!" : "Salin Deskripsi Lengkap"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(seoTags, "tags")}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold font-mono text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedTags ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTags ? "Hashtags Disalin!" : "Salin Hashtags"}</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Disertai 8+ tagar SEO relevan
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ── STEP 4: HARGA & PUBLISH (CSS block/hidden) ──────────────────── */}
        <div className={activeStep === 4 ? "block animate-fade-up" : "hidden"}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Kiri: Parameter Harga & Kalkulasi Margin (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="app-card p-5 bg-white border border-slate-200 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Parameter Harga &amp; Modal Supplier
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(String(price), "price")}
                    className="text-xs font-mono text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPrice ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrice ? "Harga Disalin!" : "Salin Harga"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Harga Jual Shopee (Rp):
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Modal Supplier (COGS Rp):
                    </label>
                    <input
                      type="number"
                      value={cogsEstimate}
                      onChange={(e) => setCogsEstimate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Masa Garansi Toko (Hari):
                  </label>
                  <input
                    type="number"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                  />
                </div>

                {/* Shopee Fee Preset & FX Guard */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Mode Program Shopee
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fxBufferEnabled}
                        onChange={(e) => setFxBufferEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Buffer Kurs +{DEFAULT_FX_BUFFER_PCT}%</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.values(SHOPEE_FEE_PRESETS).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFeePreset(preset.id)}
                        title={preset.description}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                          feePreset === preset.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Financial Breakdown Grid */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Kalkulasi Laba Bersih Transaksi:
                    </span>
                    {isLowMargin && (
                      <button
                        type="button"
                        onClick={() => setPrice(suggestedSafePrice)}
                        className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                      >
                        Set Harga Aman (Rp {suggestedSafePrice.toLocaleString("id-ID")})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">Harga Jual:</span>
                      <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                        Rp {Math.round(price).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">
                        Fee Shopee ({economics.adminFeePct}%+1k):
                      </span>
                      <span className="text-sm font-bold font-mono text-rose-600 tabular-nums">
                        -Rp {shopeeFee.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">
                        Modal + QRIS{fxBufferEnabled ? "+FX" : ""}:
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-700 tabular-nums">
                        -Rp {(cogsEstimate + qrisFee).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isLowMargin ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
                      <span className={`text-[10px] font-mono block uppercase font-bold ${isLowMargin ? "text-rose-800" : "text-emerald-800"}`}>
                        Kas Bersih Diterima:
                      </span>
                      <span className={`text-sm font-bold font-mono tabular-nums ${isLowMargin ? "text-rose-700" : "text-emerald-700"}`}>
                        Rp {netEarnings.toLocaleString("id-ID")} ({netMarginPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Warning if Low Margin */}
                  {isLowMargin && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Peringatan Margin Rendah (&lt;15%)!</span>
                        <span className="text-[11px] leading-relaxed">
                          Margin bersih berada di bawah ambang batas sehat. Disarankan menaikkan harga jual Shopee atau mencari supplier alternatif yang lebih murah.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
                    <span>Packaging: Rp 0 (Digital)</span>
                    <span>Penyelesaian Otomatis: Brankas</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Kanan: Atribut Shopee & Final Checklist (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="app-card p-5 bg-white border border-slate-200 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Atribut Shopee Siap Isi
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    KLIK UNTUK SALIN
                  </span>
                </div>

                {/* Attributes Table */}
                <div className="space-y-2 text-xs font-mono">
                  {[
                    { label: "Kategori Shopee", val: "Gaming > Game > Game PC", key: "cat" },
                    { label: "Merek", val: "Tidak Ada Merek / Original", key: "brand" },
                    { label: "Tipe Garansi", val: `Garansi Penjual (${warrantyDays} Hari Ganti Baru)`, key: "warranty" },
                    { label: "Wilayah Lisensi", val: "Global / Region Free", key: "region" },
                    { label: "Tipe Lisensi", val: category, key: "type" },
                  ].map((attr) => (
                    <div
                      key={attr.key}
                      onClick={() => handleCopyAttr(attr.key, attr.val)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <span className="text-slate-500">{attr.label}:</span>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <span>{attr.val}</span>
                        {copiedAttr === attr.key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Checklist Summary */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Status Checklist Listing ({completedCount}/4)
                    </span>
                    <button
                      type="button"
                      onClick={() => setChecklist({ cover: false, title: false, desc: false, price: false })}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-mono"
                    >
                      Reset Checklist
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "cover", label: "1. Cover HD 1:1", done: checklist.cover },
                      { key: "title", label: "2. Judul SEO", done: checklist.title },
                      { key: "desc", label: "3. Deskripsi SOP", done: checklist.desc },
                      { key: "price", label: "4. Harga & Laba", done: checklist.price },
                    ].map((c) => (
                      <div
                        key={c.key}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-semibold ${
                          c.done
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                            c.done ? "bg-emerald-600 text-white" : "border border-slate-300"
                          }`}
                        >
                          {c.done ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : "•"}
                        </div>
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleCopyText(`${seoTitle}\n\n${generatedDesc}`, "all")}
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-4 h-4 text-emerald-600" />
                    <span>{copiedAll ? "Semua Berhasil Disalin!" : "Salin Judul + Deskripsi Sekaligus"}</span>
                  </button>

                  <a
                    href="https://seller.shopee.co.id/portal/product/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Buka Shopee Seller Center (Tambah Produk)</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 3. STICKY / BOTTOM WIZARD NAVIGATION BAR                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="app-card p-4 bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Kiri: Tombol Back */}
          <div className="w-full sm:w-auto">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali: {STEPS[activeStep - 2]?.title}</span>
              </button>
            ) : (
              <div className="hidden sm:block text-xs font-mono text-slate-400">
                Langkah 1 dari 4: Cover Produk
              </div>
            )}
          </div>

          {/* Tengah: Indikator Progress Langkah */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700">
              Langkah {activeStep} dari 4:
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {STEPS[activeStep - 1]?.title}
            </span>
          </div>

          {/* Kanan: Tombol Lanjut / Publish */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            {activeStep < 4 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(4, prev + 1))}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span>Lanjut: {STEPS[activeStep]?.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a
                href="https://seller.shopee.co.id/portal/product/new"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span>Buka Shopee Seller Center ↗</span>
              </a>
            )}
          </div>

        </div>

        </div>

      </div>
    </div>
  );
}
