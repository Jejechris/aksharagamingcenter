"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import {
  ShoppingBag,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Shield,
  ShieldCheck,
  Zap,
  Tag,
  Palette,
  Layers,
  Image as ImageIcon,
  DollarSign,
  Sliders,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  Upload,
  Cpu,
  Monitor,
  Award
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

interface CoverPalette {
  name: string;
  id: string;
  primary: string;
  glow: string;
  bgGrad1: string;
  bgGrad2: string;
  accent: string;
}

const COVER_PALETTES: CoverPalette[] = [
  {
    name: "Emerald Cyber",
    id: "emerald",
    primary: "#10b981",
    glow: "#059669",
    bgGrad1: "#04140e",
    bgGrad2: "#0d281e",
    accent: "#6ee7b7",
  },
  {
    name: "Neon Azure",
    id: "azure",
    primary: "#0ea5e9",
    glow: "#0284c7",
    bgGrad1: "#04121a",
    bgGrad2: "#082333",
    accent: "#7dd3fc",
  },
  {
    name: "Royal Violet",
    id: "violet",
    primary: "#8b5cf6",
    glow: "#7c3aed",
    bgGrad1: "#0b0714",
    bgGrad2: "#190f2e",
    accent: "#c4b5fd",
  },
  {
    name: "Amber Gold",
    id: "amber",
    primary: "#f59e0b",
    glow: "#d97706",
    bgGrad1: "#140c03",
    bgGrad2: "#2a1906",
    accent: "#fde68a",
  },
  {
    name: "Crimson Red",
    id: "crimson",
    primary: "#ef4444",
    glow: "#dc2626",
    bgGrad1: "#140404",
    bgGrad2: "#2b0a0a",
    accent: "#fca5a5",
  },
  {
    name: "Obsidian Stealth",
    id: "stealth",
    primary: "#94a3b8",
    glow: "#475569",
    bgGrad1: "#06070a",
    bgGrad2: "#0f172a",
    accent: "#f1f5f9",
  },
];

const PLATFORM_PRESETS = [
  { id: "steam", label: "Steam", icon: "🎮", text: "STEAM GLOBAL" },
  { id: "microsoft", label: "PC / Microsoft", icon: "🪟", text: "PC / MICROSOFT" },
  { id: "playstation", label: "PlayStation", icon: "🕹️", text: "PLAYSTATION" },
  { id: "xbox", label: "Xbox", icon: "💚", text: "XBOX SERIES" },
  { id: "ea", label: "EA App", icon: "⚽", text: "EA APP / ORIGIN" },
  { id: "rockstar", label: "Rockstar", icon: "⭐", text: "ROCKSTAR GAMES" },
  { id: "epic", label: "Epic Games", icon: "⚡", text: "EPIC GAMES STORE" },
];

export default function ShopeeLaunchpadPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string>("custom");

  // Product Inputs
  const [gameTitle, setGameTitle] = useState("Minecraft: Java & Bedrock Edition");
  const [platform, setPlatform] = useState("PC / Microsoft");
  const [category, setCategory] = useState("Full Access Account");
  const [price, setPrice] = useState<number>(189000);
  const [cogsEstimate, setCogsEstimate] = useState<number>(115000);
  const [warrantyDays, setWarrantyDays] = useState<number>(30);

  // Cover Customizer
  const [coverPalette, setCoverPalette] = useState<string>("emerald");
  const [badgeHeadline, setBadgeHeadline] = useState("100% GARANSI RESMI 30 HARI");
  const [badgeDelivery, setBadgeDelivery] = useState("⚡ PENGIRIMAN INSTAN 5 DETIK");
  const [badgeAccess, setBadgeAccess] = useState("FULL ACCESS & BEBAS GANTI EMAIL/PASS");
  const [coverArtworkUrl, setCoverArtworkUrl] = useState<string>("");
  const [uploadedArtwork, setUploadedArtwork] = useState<string | null>(null);

  // Description Customizer
  const [copyStyle, setCopyStyle] = useState<"ultimate" | "clean" | "promo" | "security">("ultimate");
  const [includeSopUnboxing, setIncludeSopUnboxing] = useState(true);
  const [includeActivationGuide, setIncludeActivationGuide] = useState(true);
  const [includeFaq, setIncludeFaq] = useState(true);
  const [includeVipPromo, setIncludeVipPromo] = useState(true);
  const [customBonusNotes, setCustomBonusNotes] = useState("");

  // Generated Outputs
  const [seoTitle, setSeoTitle] = useState("");
  const [generatedDesc, setGeneratedDesc] = useState("");
  const [seoTags, setSeoTags] = useState("");

  // Copy Feedbacks
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedPrice, setCopiedPrice] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Checklist State
  const [checklist, setChecklist] = useState({
    title: false,
    cover: false,
    desc: false,
    price: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch Catalog
  useEffect(() => {
    async function loadCatalog() {
      setIsLoadingCatalog(true);
      try {
        const data = await fetchSmartCatalog();
        if (Array.isArray(data) && data.length > 0) {
          setCatalog(data);
          // Default to first game
          const first = data[0];
          setSelectedGameId(first.id);
          setGameTitle(first.title);
          setPlatform(first.platform);
          setCategory(first.category);
          setPrice(first.selling_price_shopee_idr);
          setCogsEstimate(first.metrics?.cogs_g2g_idr || Math.round(first.selling_price_shopee_idr * 0.6));
        }
      } catch (e) {
        console.error("Failed to load catalog", e);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Handle Game Selection
  const handleSelectGame = (id: string) => {
    setSelectedGameId(id);
    if (id === "custom") {
      setGameTitle("Custom Game Title");
      setPlatform("Steam");
      setCategory("Steam CD-Key Global");
      setPrice(150000);
      setCogsEstimate(95000);
      return;
    }
    const found = catalog.find((g) => g.id === id);
    if (found) {
      setGameTitle(found.title);
      setPlatform(found.platform);
      setCategory(found.category);
      setPrice(found.selling_price_shopee_idr);
      setCogsEstimate(found.metrics?.cogs_g2g_idr || Math.round(found.selling_price_shopee_idr * 0.6));
    }
  };

  // Generate SEO Title & Description
  const buildOutputs = useCallback(() => {
    const cleanT = gameTitle.toUpperCase().trim();
    const platClean = platform.toUpperCase().trim();

    // 1. Shopee SEO Title (Max 120 chars, high conversion)
    let titleStr = `${cleanT} [${platClean}] ORIGINAL FULL ACCESS GARANSI RESMI ${warrantyDays} HARI`;
    if (titleStr.length > 120) {
      titleStr = titleStr.slice(0, 117) + "...";
    }
    setSeoTitle(titleStr);

    // 2. Formatting Description
    const formattedPrice = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);

    let desc = `🎮 ${cleanT} — ORIGINAL DIGITAL LICENSE\n`;
    desc += `Platform: ${platform} | Tipe: ${category}\n`;
    desc += `Garansi Toko Resmi: ${warrantyDays} Hari Penuh\n`;
    desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    desc += `⚡ KEUNGGULAN PRODUK AKSHARA GAMING CENTER:\n`;
    desc += `✓ 100% Lisensi Game Asli & Legal (Bukan bajakan / bukan sharing bebas).\n`;
    desc += `✓ ${badgeAccess}.\n`;
    desc += `✓ ${badgeDelivery} langsung melalui sistem Brankas Digital Terenkripsi.\n`;
    desc += `✓ Proteksi garansi toko ${warrantyDays} hari ganti baru anti-hackback.\n\n`;

    if (includeActivationGuide) {
      desc += `📥 CARA AKTIVASI & PENGAMBILAN KREDENSIAL:\n`;
      desc += `1. Selesaikan pembayaran pesanan Anda di Shopee.\n`;
      desc += `2. Cek chat Shopee Anda untuk mendapatkan link Brankas Kredensial Resmi beserta Passcode PIN rahasia.\n`;
      desc += `3. Buka link brankas, masukkan PIN, dan langsung dapatkan akses email/pass atau serial CD-Key Anda.\n`;
      desc += `4. Login ke launcher resmi (${platform}) & selamat bermain!\n\n`;
    }

    if (includeSopUnboxing) {
      desc += `🛡️ SYARAT & KETENTUAN KLAIM GARANSI:\n`;
      desc += `• Wajib merekam video unboxing / screen recording tanpa jeda (no-cut) mulai dari sebelum membuka link brankas hingga mencoba login pertama kali.\n`;
      desc += `• Garansi meliputi akun tidak bisa login saat serah terima atau kendala lisensi selama masa garansi ${warrantyDays} hari.\n`;
      desc += `• Ulasan bintang 5 dan konfirmasi penerimaan pesanan akan mengaktifkan masa garansi otomatis.\n\n`;
    }

    if (includeFaq) {
      desc += `❓ PERTANYAAN UMUM (F.A.Q):\n`;
      desc += `Q: Apakah ini permanen?\n`;
      desc += `A: Ya, game menjadi milik Anda permanen dan dapat dimainkan online/offline sesuai fitur game.\n`;
      desc += `Q: Apakah butuh kirim paket fisik?\n`;
      desc += `A: Pengiriman digital otomatis instan 5 detik via chat. Kartu bukti fisik opsional dapat disertakan bila dibutuhkan.\n\n`;
    }

    if (includeVipPromo) {
      desc += `🎁 BONUS MEMBER VIP REPEAT ORDER:\n`;
      desc += `Dapatkan kartu voucher diskon Rp 15.000 untuk pembelian game selanjutnya di official store direct kami!\n\n`;
    }

    if (customBonusNotes.trim()) {
      desc += `📝 CATATAN TAMBAHAN:\n${customBonusNotes.trim()}\n\n`;
    }

    // Hashtags
    const cleanWords = cleanT.replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
    const tags = [
      `#${cleanWords.join("")}`,
      `#Jual${cleanWords[0] || "Game"}Original`,
      "#GameOriginal",
      "#AksharaGaming",
      "#GaransiResmi",
      `#${platform.replace(/[^a-zA-Z0-9]/g, "")}Gaming`,
      "#ShopeeGameID",
      "#DigitalLicense"
    ].join(" ");

    desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${tags}`;

    setGeneratedDesc(desc);
    setSeoTags(tags);
  }, [
    gameTitle,
    platform,
    category,
    price,
    warrantyDays,
    badgeAccess,
    badgeDelivery,
    includeActivationGuide,
    includeSopUnboxing,
    includeFaq,
    includeVipPromo,
    customBonusNotes,
  ]);

  useEffect(() => {
    buildOutputs();
  }, [buildOutputs]);

  // Render Live Canvas Cover 1080x1080
  const renderCoverCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const pal = COVER_PALETTES.find((p) => p.id === coverPalette) || COVER_PALETTES[0];

    // 1. Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, pal.bgGrad1);
    bgGrad.addColorStop(0.6, pal.bgGrad2);
    bgGrad.addColorStop(1, "#06070a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Cyber Telemetry Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 54) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Ambient Glow Circles
    const radGlow = ctx.createRadialGradient(width / 2, 450, 40, width / 2, 450, 480);
    radGlow.addColorStop(0, pal.glow + "33");
    radGlow.addColorStop(1, "transparent");
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, width, height);

    // 4. Double-Bezel Outer Frame
    ctx.strokeStyle = pal.primary + "88";
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, width - 84, height - 84);

    // 5. Top Brand Bar Pill
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    ctx.roundRect(65, 65, width - 130, 90, 24);
    ctx.fill();
    ctx.strokeStyle = pal.primary + "66";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("AKSHARA GAMING CENTER", 100, 122);

    ctx.fillStyle = pal.primary;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "right";
    ctx.fillText("OFFICIAL LICENSE STORE", width - 100, 120);

    // 6. Platform Pill
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.roundRect(65, 180, 360, 68, 20);
    ctx.fill();

    ctx.fillStyle = "#04140e";
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(platform.toUpperCase(), 245, 224);

    // 7. Middle Big Game Title Card
    ctx.fillStyle = "rgba(10, 14, 24, 0.88)";
    ctx.beginPath();
    ctx.roundRect(65, 275, width - 130, 420, 32);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Game Title text wrap
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, sans-serif";

    const words = gameTitle.split(" ");
    let line1 = "";
    let line2 = "";
    for (let i = 0; i < words.length; i++) {
      if (i < Math.ceil(words.length / 2)) {
        line1 += words[i] + " ";
      } else {
        line2 += words[i] + " ";
      }
    }

    if (line2.trim()) {
      ctx.fillText(line1.trim(), width / 2, 420);
      ctx.fillText(line2.trim(), width / 2, 495);
    } else {
      ctx.fillText(line1.trim(), width / 2, 460);
    }

    // Category / Edition Tag
    ctx.fillStyle = pal.accent;
    ctx.font = "bold 32px monospace";
    ctx.fillText(`[ ${category.toUpperCase()} ]`, width / 2, 570);

    // 8. Bottom 3 Value Badges
    const badges = [
      { text: badgeHeadline, y: 725, bg: "rgba(0, 0, 0, 0.8)", border: pal.primary },
      { text: badgeDelivery, y: 815, bg: "rgba(0, 0, 0, 0.8)", border: "#06b6d4" },
      { text: "100% LEGAL & ANTI-HACKBACK", y: 905, bg: "rgba(0, 0, 0, 0.8)", border: "#f59e0b" },
    ];

    badges.forEach((b) => {
      ctx.fillStyle = b.bg;
      ctx.beginPath();
      ctx.roundRect(65, b.y, width - 130, 72, 20);
      ctx.fill();
      ctx.strokeStyle = b.border + "88";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.text, width / 2, b.y + 46);
    });

    // 9. Floating Price Tag on Bottom-Right
    const priceFormatted = "Rp " + Math.round(price).toLocaleString("id-ID");
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.roundRect(width - 440, 995, 375, 45, 12);
    ctx.fill();

    ctx.fillStyle = "#04140e";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`SHOPEE: ${priceFormatted}`, width - 252, 1026);
  }, [coverPalette, gameTitle, platform, category, badgeHeadline, badgeDelivery, price]);

  useEffect(() => {
    renderCoverCanvas();
  }, [renderCoverCanvas]);

  // Copy Handlers
  const handleCopyText = (text: string, type: "title" | "desc" | "price" | "tags" | "all") => {
    navigator.clipboard.writeText(text);
    if (type === "title") {
      setCopiedTitle(true);
      setChecklist((prev) => ({ ...prev, title: true }));
      setTimeout(() => setCopiedTitle(false), 2000);
    } else if (type === "desc") {
      setCopiedDesc(true);
      setChecklist((prev) => ({ ...prev, desc: true }));
      setTimeout(() => setCopiedDesc(false), 2000);
    } else if (type === "price") {
      setCopiedPrice(true);
      setChecklist((prev) => ({ ...prev, price: true }));
      setTimeout(() => setCopiedPrice(false), 2000);
    } else if (type === "tags") {
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 2000);
    } else if (type === "all") {
      setCopiedAll(true);
      setChecklist({ title: true, cover: true, desc: true, price: true });
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  // Download HD Cover PNG
  const handleDownloadCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const safeTitle = gameTitle.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    link.download = `shopee_cover_${safeTitle}_1080x1080.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setChecklist((prev) => ({ ...prev, cover: true }));
  };

  // Copy Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopiedCover(true);
        setChecklist((prev) => ({ ...prev, cover: true }));
        setTimeout(() => setCopiedCover(false), 2000);
      });
    } catch (e) {
      console.warn("ClipboardItem image copy failed", e);
      handleDownloadCover();
    }
  };

  // Profit Margins
  const shopeeFee = Math.round(price * 0.085); // 8.5% fee
  const netEarnings = Math.max(0, price - shopeeFee - cogsEstimate);
  const netMarginPct = price > 0 ? ((netEarnings / price) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen text-slate-100 px-4 sm:px-8 py-8 max-w-7xl mx-auto space-y-7">
      {/* ── TOP HEADER & QUICK LAUNCHPAD ──────────────────────────── */}
      <div className="machined-card">
        <div className="machined-card-inner p-5 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  SHOPEE 1-FLOW LAUNCHPAD
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  ALL-IN-ONE LISTING TOWER
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Pusat Eksekusi Produk Shopee dalam Satu Layar
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Tidak perlu lagi buka-tutup tab berbeda. Dapatkan Cover HD 1080x1080, Judul SEO, Deskripsi Lengkap, dan Kalkulasi Laba Bersih secara bersamaan siap copy-paste langsung ke Shopee Seller Center.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={() => handleCopyText(`${seoTitle}\n\n${generatedDesc}`, "all")}
                className="v0-btn-secondary px-5 py-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 group active:scale-95 shadow-md"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>{copiedAll ? "Semua Disalin!" : "Salin Judul + Deskripsi"}</span>
              </button>

              <a
                href="https://seller.shopee.co.id/portal/product/new"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cyber-emerald px-6 py-3 rounded-xl text-xs font-mono font-extrabold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-95"
              >
                <span>Buka Shopee Seller Center</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Interactive Checklist Tracker */}
          <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "cover", label: "1. Cover HD 1:1", done: checklist.cover },
              { key: "title", label: "2. Judul Shopee", done: checklist.title },
              { key: "desc", label: "3. Deskripsi Lengkap", done: checklist.desc },
              { key: "price", label: "4. Harga & Laba", done: checklist.price },
            ].map((step) => (
              <div
                key={step.key}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                  step.done
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-inner"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    step.done
                      ? "bg-emerald-400 text-slate-950 font-bold"
                      : "border border-slate-600 text-slate-500"
                  }`}
                >
                  {step.done ? <Check className="w-3 h-3 stroke-[3]" /> : "•"}
                </div>
                <span className="text-xs font-mono font-semibold">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN SPLIT SCREEN WORKSPACE ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* ══ LEFT COLUMN: CUSTOMIZER & CONTROLS (5 COLS) ═══════════ */}
        <div className="lg:col-span-5 space-y-6">
          {/* Box 1: Game & Catalog Selector */}
          <div className="v0-card p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                Pilih Produk Katalog / Custom
              </span>
              <span className="text-[10px] font-mono text-slate-500">1-KLIK AUTOFILL</span>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                Ambil Data dari Katalog Aktif:
              </label>
              <select
                value={selectedGameId}
                onChange={(e) => handleSelectGame(e.target.value)}
                className="w-full bg-black/70 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 transition-all"
              >
                <option value="custom">-- Input Manual (Game Baru / Custom) --</option>
                {catalog.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.platform}) &bull; Rp {Math.round(g.selling_price_shopee_idr).toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Nama Game / Produk:
                </label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Platform:
                  </label>
                  <input
                    type="text"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Tipe / Format:
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Harga Jual Shopee (Rp):
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Modal Supplier (COGS Rp):
                  </label>
                  <input
                    type="number"
                    value={cogsEstimate}
                    onChange={(e) => setCogsEstimate(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Cover Thumbnail Customizer */}
          <div className="v0-card p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                Kustomisasi Cover 1080x1080
              </span>
              <span className="text-[10px] font-mono text-cyan-400">LIVE RENDER</span>
            </div>

            {/* Palette selection */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-2">
                Tema Warna Frame Cover:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COVER_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    onClick={() => setCoverPalette(pal.id)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-2 transition-all ${
                      coverPalette === pal.id
                        ? "bg-white/[0.10] border-white text-white font-bold shadow-sm"
                        : "bg-black/40 border-white/[0.08] text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pal.primary }} />
                    <span className="truncate">{pal.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Badges Input */}
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Headline Badge 1:
                </label>
                <input
                  type="text"
                  value={badgeHeadline}
                  onChange={(e) => setBadgeHeadline(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Delivery Badge 2:
                </label>
                <input
                  type="text"
                  value={badgeDelivery}
                  onChange={(e) => setBadgeDelivery(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.10] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Box 3: Description Copywriting Options */}
          <div className="v0-card p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Opsi Struktur Deskripsi
              </span>
              <span className="text-[10px] font-mono text-purple-400">ANTI-BAN SHOPEE</span>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors">
                <span className="text-xs text-slate-300">Sertakan Panduan Aktivasi Game</span>
                <input
                  type="checkbox"
                  checked={includeActivationGuide}
                  onChange={(e) => setIncludeActivationGuide(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-black"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors">
                <span className="text-xs text-slate-300">Sertakan SOP Garansi &amp; Unboxing Video</span>
                <input
                  type="checkbox"
                  checked={includeSopUnboxing}
                  onChange={(e) => setIncludeSopUnboxing(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-black"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors">
                <span className="text-xs text-slate-300">Sertakan FAQ Pembeli (Anti-Komplain)</span>
                <input
                  type="checkbox"
                  checked={includeFaq}
                  onChange={(e) => setIncludeFaq(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-black"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors">
                <span className="text-xs text-slate-300">Sertakan Reward Voucher Member VIP</span>
                <input
                  type="checkbox"
                  checked={includeVipPromo}
                  onChange={(e) => setIncludeVipPromo(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-black"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ══ RIGHT COLUMN: ALL-IN-ONE OUTPUTS READY TO COPY (7 COLS) ══ */}
        <div className="lg:col-span-7 space-y-6">
          {/* Output Block 1: Shopee SEO Title */}
          <div className="v0-card p-5 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  1. Judul Produk Shopee (SEO Optimal)
                </h3>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                seoTitle.length <= 120 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
              }`}>
                {seoTitle.length}/120 Karakter
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/70 border border-white/[0.10] font-mono text-xs text-white leading-relaxed">
              {seoTitle}
            </div>

            <button
              onClick={() => handleCopyText(seoTitle, "title")}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono font-bold text-white flex items-center justify-center gap-2 border border-white/[0.10] transition-all active:scale-[0.98]"
            >
              {copiedTitle ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span>{copiedTitle ? "Judul Shopee Berhasil Disalin!" : "Salin Judul Produk"}</span>
            </button>
          </div>

          {/* Output Block 2: Live Cover Canvas 1080x1080 */}
          <div className="v0-card p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  2. Cover Thumbnail Shopee 1:1 (1080x1080 HD)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                STANDAR RESMI SHOPEE
              </span>
            </div>

            {/* Live Canvas Box */}
            <div className="relative aspect-square w-full max-w-[420px] mx-auto rounded-2xl overflow-hidden border border-white/[0.12] shadow-2xl bg-black">
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>

            {/* Action Buttons for Cover */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleDownloadCover}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(6,182,212,0.3)] transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Cover HD (PNG)</span>
              </button>

              <button
                onClick={handleCopyImageToClipboard}
                className="py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono font-bold text-white flex items-center justify-center gap-2 border border-white/[0.10] transition-all active:scale-95"
              >
                {copiedCover ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                <span>{copiedCover ? "Gambar Disalin!" : "Salin Gambar"}</span>
              </button>
            </div>
          </div>

          {/* Output Block 3: Full Shopee Description */}
          <div className="v0-card p-5 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  3. Deskripsi Produk Shopee Lengkap
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                SIAP PUBLISH
              </span>
            </div>

            <div className="p-4 rounded-xl bg-black/70 border border-white/[0.10] font-mono text-xs text-slate-200 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-all">
              {generatedDesc}
            </div>

            <button
              onClick={() => handleCopyText(generatedDesc, "desc")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(168,85,247,0.3)] transition-all active:scale-[0.98]"
            >
              {copiedDesc ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedDesc ? "Deskripsi Berhasil Disalin!" : "Salin Deskripsi Lengkap"}</span>
            </button>
          </div>

          {/* Output Block 4: Shopee Attributes & Net Profit */}
          <div className="v0-card p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  4. Atribut &amp; Estimasi Kas Bersih Shopee
                </h3>
              </div>
              <button
                onClick={() => handleCopyText(String(price), "price")}
                className="text-[11px] font-mono text-amber-300 hover:text-white flex items-center gap-1"
              >
                {copiedPrice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Harga</span>
              </button>
            </div>

            {/* Financial Telemetry Pill */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Harga Jual Shopee:</span>
                <span className="text-sm font-bold font-mono text-white">
                  Rp {Math.round(price).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Fee Shopee (8.5%):</span>
                <span className="text-sm font-bold font-mono text-rose-400">
                  -Rp {shopeeFee.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Modal Supplier:</span>
                <span className="text-sm font-bold font-mono text-slate-300">
                  Rp {Math.round(cogsEstimate).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] font-mono text-emerald-400 block uppercase font-bold">Laba Bersih Senna:</span>
                <span className="text-sm font-bold font-mono text-emerald-300">
                  Rp {netEarnings.toLocaleString("id-ID")} ({netMarginPct}%)
                </span>
              </div>
            </div>

            {/* Quick Shopee Attributes Copy Table */}
            <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-slate-400">Kategori Shopee:</span>
                <span className="text-slate-200 font-semibold">Gaming &gt; Game &gt; Game PC</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-slate-400">Merek:</span>
                <span className="text-slate-200 font-semibold">Tidak Ada Merek / Original</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-slate-400">Tipe Garansi:</span>
                <span className="text-slate-200 font-semibold">Garansi Toko (30 Hari Ganti Baru)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
