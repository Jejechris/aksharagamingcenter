"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GameSelectorCombobox from "@/app/components/GameSelectorCombobox";
import {
  FileText, Sparkles, Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Download, ShoppingBag, ShieldCheck, CheckCircle2, Sliders,
  HelpCircle, AlertTriangle, Smartphone, Eye, Tag, Zap,
  ExternalLink, Layers, Store, Award, Info, Palette, Image as ImageIcon
} from "lucide-react";

interface CatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
}

interface CoverRecommendation {
  suggested_ratio: string;
  headline_badges: string[];
  theme_color: string;
  ai_image_prompt: string;
  design_tips: string[];
}

function DescriptionMakerContent() {
  const searchParams = useSearchParams();
  const initialGameParam = searchParams.get("game") || "";

  // Catalog items from DB
  const [catalogGames, setCatalogGames] = useState<CatalogItem[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // Input states
  const [gameTitle, setGameTitle] = useState("Minecraft: Java & Bedrock Edition");
  const [platform, setPlatform] = useState("PC / Microsoft");
  const [category, setCategory] = useState("Account (Full Access)");
  const [price, setPrice] = useState<number>(190900);
  const [style, setStyle] = useState<"ultimate" | "clean" | "flash_sale" | "security">("ultimate");
  const [coverTheme, setCoverTheme] = useState<"violet" | "emerald" | "amber" | "cyan">("violet");

  // Options toggles
  const [includePhysicalCard, setIncludePhysicalCard] = useState(false);
  const [includeUnboxingSop, setIncludeUnboxingSop] = useState(false);
  const [includeFaq, setIncludeFaq] = useState(true);
  const [includeActivationSteps, setIncludeActivationSteps] = useState(true);
  const [customNotes, setCustomNotes] = useState("");

  // Output states
  const [seoTitle, setSeoTitle] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [seoHashtags, setSeoHashtags] = useState("");
  const [quickSpecs, setQuickSpecs] = useState<string[]>([]);
  const [coverRec, setCoverRec] = useState<CoverRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<string>("");

  // UI tabs & copy feedbacks
  const [viewTab, setViewTab] = useState<"editor" | "shopee_preview" | "cover_canvas">("editor");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedBadges, setCopiedBadges] = useState(false);
  const [copiedAllInOne, setCopiedAllInOne] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Canvas ref for 1080x1080 generator
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Fetch catalog games on mount
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const mergedData = await fetchSmartCatalog();
        if (mergedData && mergedData.length > 0) {
          setCatalogGames(mergedData);

          // If URL param provided, auto-select
          if (initialGameParam) {
            const found = mergedData.find((g: any) =>
              g.title.toLowerCase().includes(initialGameParam.toLowerCase())
            );
            if (found) {
              setSelectedGameId(found.id);
              setGameTitle(found.title);
              setPlatform(found.platform);
              setCategory(found.category);
              setPrice(found.selling_price_shopee_idr);
              return;
            }
          }

          // Default to first game (Minecraft)
          const first = mergedData[0];
          if (first) {
            setSelectedGameId(first.id);
            setGameTitle(first.title);
            setPlatform(first.platform);
            setCategory(first.category);
            setPrice(first.selling_price_shopee_idr);
          }
        }
      } catch (err) {
        console.error("Failed to load catalog:", err);
      }
    }
    fetchCatalog();
  }, [initialGameParam]);

  // Handle Preset Game Click
  const handleSelectPresetGame = (g: CatalogItem) => {
    setSelectedGameId(g.id);
    setGameTitle(g.title);
    setPlatform(g.platform);
    setCategory(g.category);
    setPrice(g.selling_price_shopee_idr);
    if (g.title.toLowerCase().includes("minecraft") || g.title.toLowerCase().includes("terraria")) {
      setCoverTheme("emerald");
    } else if (g.title.toLowerCase().includes("gta") || g.title.toLowerCase().includes("zomboid")) {
      setCoverTheme("amber");
    } else {
      setCoverTheme("violet");
    }
  };

  // Generate Description & Cover Recommendations
  const handleGenerate = useCallback(async () => {
    if (!gameTitle.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameTitle,
          platform,
          category,
          price,
          style,
          includePhysicalCard,
          includeUnboxingSop,
          includeFaq,
          includeActivationSteps,
          customNotes,
        })
      });

      const json = await res.json();
      if (json.status === "success" && json.data) {
        setSeoTitle(json.data.seo_title || "");
        setFullDescription(json.data.full_description || "");
        setSeoHashtags(json.data.seo_hashtags || "");
        setQuickSpecs(json.data.quick_specs || []);
        if (json.data.cover_recommendation) {
          setCoverRec(json.data.cover_recommendation);
          if (json.data.cover_recommendation.theme_color) {
            setCoverTheme(json.data.cover_recommendation.theme_color);
          }
        }
        setGenerationSource(json.source || "ai");
        showToast("✨ Deskripsi & Rekomendasi Cover Shopee Berhasil Digenerate!");
      } else {
        showToast("Gagal menghasilkan deskripsi.");
      }
    } catch (e) {
      console.error("Generate error:", e);
      showToast("Terjadi kesalahan jaringan.");
    } finally {
      setIsGenerating(false);
    }
  }, [gameTitle, platform, category, price, style, includePhysicalCard, includeUnboxingSop, includeFaq, includeActivationSteps, customNotes]);

  // Auto-generate initial description once gameTitle is set
  useEffect(() => {
    if (gameTitle && !fullDescription) {
      handleGenerate();
    }
  }, [gameTitle, fullDescription, handleGenerate]);

  // Draw 1080x1080 Shopee Cover Canvas
  const drawCoverCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Palette setups
    const palettes = {
      violet: { bg1: "#0b0814", bg2: "#1a102f", primary: "#8b5cf6", accent: "#d8b4fe", glow: "#7c3aed" },
      emerald: { bg1: "#06130e", bg2: "#0f2d21", primary: "#10b981", accent: "#a7f3d0", glow: "#059669" },
      amber: { bg1: "#140e06", bg2: "#2d1f0c", primary: "#f59e0b", accent: "#fde68a", glow: "#d97706" },
      cyan: { bg1: "#061217", bg2: "#0c2833", primary: "#06b6d4", accent: "#a5f3fc", glow: "#0891b2" },
    };
    const pal = palettes[coverTheme] || palettes.violet;

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, pal.bg1);
    bgGrad.addColorStop(0.5, pal.bg2);
    bgGrad.addColorStop(1, "#09090b");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Tech Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Ambient Glow Circles
    const radGlow = ctx.createRadialGradient(width / 2, 420, 50, width / 2, 420, 480);
    radGlow.addColorStop(0, pal.glow + "33");
    radGlow.addColorStop(1, "transparent");
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, width, height);

    // 4. Outer Border Frame
    ctx.strokeStyle = pal.primary + "66";
    ctx.lineWidth = 14;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // 5. Header Branding Bar
    ctx.fillStyle = "rgba(24, 24, 27, 0.85)";
    ctx.fillRect(50, 50, width - 100, 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("AKSHARA GAMING CENTER", 80, 100);

    ctx.fillStyle = pal.primary;
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("OFFICIAL DIGITAL LICENSE • 100% ORIGINAL", width - 80, 100);

    // 6. Platform Pill Badge
    ctx.fillStyle = pal.primary;
    const badgeW = 320;
    const badgeH = 52;
    const badgeX = (width - badgeW) / 2;
    const badgeY = 175;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 26);
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.font = "900 22px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(platform.toUpperCase() + " • GLOBAL REGION", width / 2, badgeY + 34);

    // 7. Large Game Title Box
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 56px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";

    // Split title if long
    const words = gameTitle.toUpperCase().split(" ");
    let line1 = "";
    let line2 = "";
    if (words.length > 3) {
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(" ");
      line2 = words.slice(mid).join(" ");
    } else {
      line1 = gameTitle.toUpperCase();
    }

    if (line2) {
      ctx.fillText(line1, width / 2, 310);
      ctx.fillStyle = pal.accent;
      ctx.fillText(line2, width / 2, 380);
    } else {
      ctx.fillText(line1, width / 2, 340);
    }

    // 8. Price Tag Highlight
    const priceStr = formatRp(price);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.roundRect(width / 2 - 220, 435, 440, 75, 20);
    ctx.fill();
    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#fbbf24"; // Amber gold
    ctx.font = "900 42px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(priceStr, width / 2, 488);

    // 9. 4 Feature Badges (2x2 Grid)
    const badges = [
      { icon: "🛡️", label: "100% ORIGINAL & LEGAL", sub: "Bukan Akun Shared / Bajakan" },
      { icon: "🔒", label: "FULL ACCESS EMAIL SENDIRI", sub: "Bebas Ganti Password & 2FA" },
      { icon: "⭐", label: "GARANSI RESMI 30 HARI", sub: "Digital Full Access" },
      { icon: "⚡", label: "PENGIRIMAN CEPAT KILAT", sub: "Proses Otomatis Tanpa Tunggu" },
    ];

    const boxW = 440;
    const boxH = 110;
    const startX = 85;
    const gapX = 30;
    const startY = 560;
    const gapY = 24;

    badges.forEach((b, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = startX + col * (boxW + gapX);
      const by = startY + row * (boxH + gapY);

      // Card BG
      ctx.fillStyle = "rgba(24, 24, 27, 0.75)";
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 16);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Icon & Text
      ctx.textAlign = "left";
      ctx.font = "bold 34px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(b.icon, bx + 24, by + 68);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 21px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(b.label, bx + 80, by + 48);

      ctx.fillStyle = pal.accent;
      ctx.font = "16px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(b.sub, bx + 80, by + 76);
    });

    // 10. Bottom Security / Seal
    ctx.fillStyle = "rgba(24, 24, 27, 0.9)";
    ctx.fillRect(50, 840, width - 100, 110);
    ctx.strokeStyle = pal.primary + "44";
    ctx.strokeRect(50, 840, width - 100, 110);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AKSHARA VERIFIED SYSTEM • 100% GARANSI TOKO", width / 2, 882);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "16px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Akshara Command Autonomous Verification • Standard Rasio 1:1 Shopee Feed", width / 2, 918);

    // 11. Bottom Authenticity Bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "14px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VERIFIED STORE: AKSHARA GAMING CENTER • 24/7 CUSTOMER SUPPORT", width / 2, 1010);

  }, [gameTitle, platform, price, coverTheme]);

  // Re-render canvas when trigger states change
  useEffect(() => {
    drawCoverCanvas();
  }, [drawCoverCanvas]);

  // Download Canvas as PNG
  const handleDownloadCoverPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `shopee_cover_1080p_${gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("🖼️ Cover Shopee 1080x1080 HD Berhasil Diunduh!");
  };

  // Copy helpers
  const copyToClipboard = (text: string, type: "title" | "desc" | "tags" | "prompt" | "badges" | "all") => {
    navigator.clipboard.writeText(text);
    if (type === "title") {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
      showToast("Judul SEO Shopee berhasil disalin!");
    } else if (type === "desc") {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
      showToast("Deskripsi Shopee berhasil disalin!");
    } else if (type === "tags") {
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 2000);
      showToast("Hashtags SEO berhasil disalin!");
    } else if (type === "prompt") {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
      showToast("Prompt AI Cover berhasil disalin!");
    } else if (type === "badges") {
      setCopiedBadges(true);
      setTimeout(() => setCopiedBadges(false), 2000);
      showToast("Teks badge cover berhasil disalin!");
    } else if (type === "all") {
      setCopiedAllInOne(true);
      setTimeout(() => setCopiedAllInOne(false), 2500);
      showToast("🚀 SEMUA (Judul + Deskripsi + Tips Cover) Berhasil Disalin!");
    }
  };

  // Master All-in-One Copy
  const handleCopyAllInOne = () => {
    const badgesText = coverRec?.headline_badges.join(" • ") || "100% ORIGINAL • FULL ACCESS • GARANSI 30 HARI • INSTANT DELIVERY";
    const textAll = [
      "=== JUDUL SHOPEE (MAKS 120 KARAKTER) ===",
      seoTitle,
      "",
      "=== REKOMENDASI COVER SHOPEE (1080x1080 PX) ===",
      `Rasio: 1:1 (Standar Shopee Feed)`,
      `Headline Badges: ${badgesText}`,
      `Prompt AI: ${coverRec?.ai_image_prompt || ""}`,
      "",
      "=== DESKRIPSI PRODUK LENGKAP ===",
      fullDescription,
      "",
      "=== HASHTAGS SEO ===",
      seoHashtags,
    ].join("\n");

    copyToClipboard(textAll, "all");
  };

  // Download as TXT
  const handleDownloadTxt = () => {
    const badgesText = coverRec?.headline_badges.join(" • ") || "100% ORIGINAL • FULL ACCESS • GARANSI 30 HARI • INSTANT DELIVERY";
    const fileData = [
      "=== JUDUL SHOPEE (MAX 120 KARAKTER) ===",
      seoTitle,
      "",
      "=== REKOMENDASI COVER 1080x1080 ===",
      `Rasio: 1:1`,
      `Badges: ${badgesText}`,
      `AI Image Prompt: ${coverRec?.ai_image_prompt || ""}`,
      "",
      "=== DESKRIPSI LENGKAP ===",
      fullDescription,
      "",
      "=== HASHTAGS SEO ===",
      seoHashtags
    ].join("\n");

    const blob = new Blob([fileData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopee_listing_${gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("File listing lengkap berhasil didownload!");
  };

  const formatRp = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num || 0);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Command Deck
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">Shopee Listing & Cover</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-700 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Listing Engine v3.0 Ready
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/formatter?game=${encodeURIComponent(gameTitle)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors"
              title="Buka AI Account Formatter untuk serah terima akun"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Formatter Pesanan
            </Link>
            <Link
              href="/dashboard/catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-amber-600" /> Katalog
            </Link>
            <Link
              href="/dashboard/quant"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-600" /> The Quant
            </Link>
          </div>
        </div>

        {/* Compact Banner to Shopee 1-Flow Launchpad */}
        <Link
          href="/dashboard/shopee-launchpad"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 hover:bg-orange-100/80 transition-colors shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-900">Butuh alur kilat siap listing di 1 layar berdampingan?</span>
                <span className="text-[10px] font-bold bg-orange-200/80 text-orange-800 px-2 py-0.5 rounded-full uppercase">
                  Rekomendasi
                </span>
              </div>
              <p className="text-[11px] text-orange-800/80 mt-0.5">
                Buka <strong>Shopee 1-Flow Launchpad</strong> untuk Cover HD 1080p, Judul SEO, Deskripsi Siap Copas, dan Kalkulasi Margin Bersih 1-Flow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 group-hover:text-orange-900 shrink-0">
            <span>Buka 1-Flow Launchpad</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Page Header Card */}
        <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                Shopee Listing & Cover Generator
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Pusat komando listing etalase Shopee: Dapatkan <strong className="text-slate-900">Judul SEO (maks 120 char)</strong>, <strong className="text-slate-900">Deskripsi Lengkap Siap Copas</strong>, dan <strong className="text-emerald-700">Rekomendasi Cover HD 1080x1080</strong> dengan 1-klik tanpa ribet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !gameTitle.trim()}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isGenerating ? "Sedang Menyusun..." : "Generate Ulang AI"}</span>
            </button>
          </div>
        </div>

        {/* Smart Searchable Game Portfolio Selector */}
        <div className="animate-fade-up">
          {catalogGames.length === 0 ? (
            <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-500 flex items-center justify-between w-full shadow-sm">
              <span>Portofolio masih kosong. Tambahkan game baru di <Link href="/dashboard/catalog" className="text-emerald-600 underline font-semibold">Katalog Radar</Link> atau ketik manual di bawah.</span>
              <Link href="/dashboard/catalog" className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium hover:bg-emerald-100 whitespace-nowrap ml-4">
                + Tambah Game
              </Link>
            </div>
          ) : (
            <GameSelectorCombobox
              label="Pilih Cepat Game dari Portofolio Aktif"
              actionLink={{ label: "+ Kelola di Katalog →", href: "/dashboard/catalog" }}
              games={catalogGames}
              selectedGameId={selectedGameId}
              selectedGameTitle={gameTitle}
              onSelect={(g) => handleSelectPresetGame(g)}
            />
          )}
        </div>

        {/* Master 1-Click Copy Bar */}
        <div className="app-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-900 font-bold">Aksi Cepat Salin (1-Click Paste):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copyToClipboard(seoTitle, "title")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>Salin Judul</span>
            </button>

            <button
              onClick={() => copyToClipboard(fullDescription, "desc")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copiedDesc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>Salin Deskripsi</span>
            </button>

            <button
              onClick={() => copyToClipboard(coverRec?.ai_image_prompt || `High-converting Shopee product cover for ${gameTitle}`, "prompt")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Palette className="w-3.5 h-3.5 text-purple-600" />}
              <span>Salin Prompt Cover</span>
            </button>

            <button
              onClick={handleCopyAllInOne}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              title="Salin Judul, Deskripsi Lengkap, dan Rekomendasi Cover sekaligus dalam 1 clipboard"
            >
              {copiedAllInOne ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 text-amber-200" />}
              <span>{copiedAllInOne ? "Tersalin Semua!" : "SALIN SEMUA SEKALIGUS"}</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Left Controls, Right Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Form Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">

            {/* Product Metadata Card */}
            <div className="app-card p-5 space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Parameter Produk Shopee
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Nama Game / Lisensi</label>
                  <input
                    type="text"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder="Contoh: Minecraft: Java & Bedrock Edition"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
                    >
                      <option value="Steam">Steam</option>
                      <option value="PC / Microsoft">PC / Microsoft</option>
                      <option value="Rockstar / Steam">Rockstar Games</option>
                      <option value="EA App / PC">EA App / Origin</option>
                      <option value="PlayStation 5">PlayStation 5</option>
                      <option value="Xbox Series X/S">Xbox Series</option>
                      <option value="Steam Trade">Steam Trade (Keys)</option>
                      <option value="Epic Games">Epic Games</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Kategori Lisensi</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
                    >
                      <option value="Account (Full Access)">Full Access Account</option>
                      <option value="Digital Key / CDKey">Digital CDKey (Global)</option>
                      <option value="Steam Gift">Steam Gift</option>
                      <option value="In-Game Asset / Key">Item In-Game / Key</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Harga Jual Shopee (IDR)</label>
                    <input
                      type="number"
                      step="1000"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Tema Warna Cover</label>
                    <select
                      value={coverTheme}
                      onChange={(e: any) => setCoverTheme(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
                    >
                      <option value="violet">💜 Violet Dark Tech</option>
                      <option value="emerald">💚 Emerald Pro</option>
                      <option value="amber">💛 Amber Gold</option>
                      <option value="cyan">💙 Cyan Cyber</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Copywriting Style Selection */}
            <div className="app-card p-5 space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Gaya Penulisan (Tone & Style)
              </h2>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStyle("ultimate")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "ultimate"
                      ? "bg-purple-50 border-purple-300 text-purple-900 ring-1 ring-purple-400/30"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💎 Top Seller</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Visual emoji lengkap, rapi, pembatas baris, konversi tertinggi.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("security")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "security"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-400/30"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🛡️ Anti-Hackback</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Fokus ke keamanan akun, full access, dan proteksi toko.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("flash_sale")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "flash_sale"
                      ? "bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-400/30"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🔥 Promo Urgency</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Diskon terbatas, dorong pembeli langsung checkout.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("clean")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "clean"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-400/30"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚡ Clean & Minimal</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Singkat, padat, elegan, fokus ke spesifikasi to-the-point.</p>
                </button>
              </div>
            </div>

            {/* Shopee Sections Toggles */}
            <div className="app-card p-5 space-y-3.5 text-xs">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Bagian Deskripsi yang Disertakan
              </h2>

              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includePhysicalCard}
                    onChange={(e) => setIncludePhysicalCard(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">📦 Sertakan Info Kartu Garansi Fisik A6 (Opsional)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeUnboxingSop}
                    onChange={(e) => setIncludeUnboxingSop(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">⚠️ Sertakan SOP Video Rekaman Layar / Unboxing (Anti-Fraud)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeFaq}
                    onChange={(e) => setIncludeFaq(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">❓ Sertakan FAQ Pembeli (Ready stok, VPN, dll)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeActivationSteps}
                    onChange={(e) => setIncludeActivationSteps(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">🚀 Sertakan Panduan Aktivasi 3 Langkah</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 mt-3 font-medium">Catatan Khusus Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Contoh: Server Hypixel unbanned, bonus 5 skins"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

          </div>

          {/* Right Column: Output & Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-5">

            {/* Shopee SEO Title Card */}
            <div className="app-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-600" />
                  Judul Produk Shopee (SEO Title)
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] tabular-nums font-semibold px-2 py-0.5 rounded ${
                    seoTitle.length <= 120 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {seoTitle.length} / 120 Karakter
                  </span>
                  <button
                    onClick={() => copyToClipboard(seoTitle, "title")}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedTitle ? "Disalin!" : "Salin Judul"}</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <button
                  onClick={() => setViewTab("editor")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                    viewTab === "editor" ? "bg-white text-slate-900 font-bold shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Editor Teks</span>
                </button>
                <button
                  onClick={() => setViewTab("cover_canvas")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                    viewTab === "cover_canvas" ? "bg-white text-purple-700 font-bold shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Rekomendasi Cover 1080p</span>
                </button>
                <button
                  onClick={() => setViewTab("shopee_preview")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                    viewTab === "shopee_preview" ? "bg-white text-orange-700 font-bold shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                  <span>Simulasi Shopee HP</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(seoHashtags, "tags")}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Salin kumpulan hashtag SEO"
                >
                  {copiedTags ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Tag className="w-3.5 h-3.5 text-purple-600" />}
                  <span>Salin Tags</span>
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Download sebagai file teks .txt"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600" />
                  <span>.TXT</span>
                </button>

                <button
                  onClick={() => copyToClipboard(fullDescription, "desc")}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {copiedDesc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDesc ? "Tersalin!" : "Salin Deskripsi"}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Text Editor */}
            {viewTab === "editor" && (
              <div className="app-card p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Engine: <span className="text-slate-800 font-semibold">{generationSource === "gemini-ai" ? "Gemini 3.5 AI" : "Akshara E-Com Engine"}</span></span>
                    <span>•</span>
                    <span>Format: Shopee Indonesia Standard</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-semibold tabular-nums ${
                    fullDescription.length <= 3000 ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-rose-700 bg-rose-50 border border-rose-200"
                  }`}>
                    {fullDescription.length} / 3000 Karakter
                  </span>
                </div>

                <textarea
                  rows={20}
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  placeholder="Deskripsi produk akan muncul di sini..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-900 leading-relaxed focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-y"
                />
              </div>
            )}

            {/* TAB 2: Rekomendasi Cover & Banner Canvas 1080x1080 */}
            {viewTab === "cover_canvas" && (
              <div className="app-card p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      Rekomendasi Cover Shopee (Rasio 1:1 • 1080x1080 px)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Standar rasio kotak 1:1 feeds Shopee dengan kontras tinggi & badge garansi resmi.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadCoverPng}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Cover HD (PNG)</span>
                    </button>
                  </div>
                </div>

                {/* Canvas Render Element */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: Canvas Live Preview Box */}
                  <div className="md:col-span-6 flex flex-col items-center">
                    <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md bg-slate-950 relative group">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full object-contain block cursor-pointer"
                        onClick={handleDownloadCoverPng}
                        title="Klik untuk mengunduh gambar cover 1080x1080 PNG"
                      />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-2 pointer-events-none">
                        <Download className="w-4 h-4" /> Klik untuk Unduh PNG
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2">
                      💡 Resolusi asli: 1080x1080 px (Ultra HD Sharp)
                    </span>
                  </div>

                  {/* Right: Badges, Guidelines & AI Image Prompt */}
                  <div className="md:col-span-6 space-y-4 text-xs">
                    
                    {/* Headline Badges Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          4 Headline Badges Teruji:
                        </span>
                        <button
                          onClick={() => copyToClipboard((coverRec?.headline_badges || []).join(" • "), "badges")}
                          className="text-[10px] text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                        >
                          {copiedBadges ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>Salin Teks Badge</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {(coverRec?.headline_badges || [
                          "100% ORIGINAL & LEGAL",
                          "GARANSI RESMI 30 HARI",
                          "FULL ACCESS GANTI EMAIL",
                          "PENGIRIMAN CEPAT 5 MENIT"
                        ]).map((b, i) => (
                          <div key={i} className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Prompt Box (For Midjourney / Canva) */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          Prompt AI Generator (Canva/Midjourney):
                        </span>
                        <button
                          onClick={() => copyToClipboard(coverRec?.ai_image_prompt || `High-converting Shopee product cover for ${gameTitle}`, "prompt")}
                          className="text-[10px] text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                        >
                          {copiedPrompt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>Salin Prompt</span>
                        </button>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 leading-relaxed break-words font-mono">
                        {coverRec?.ai_image_prompt || `High-converting Shopee product cover for "${gameTitle}" (${platform}), 1:1 ratio 1080x1080, dark modern tech aesthetic, centered key art, vibrant glowing badges: "100% ORIGINAL", "GARANSI RESMI 30 HARI".`}
                      </div>
                    </div>

                    {/* Shopee Algorithm Tips */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <span className="font-semibold text-slate-800 block mb-1">Checklist Algoritma Shopee:</span>
                      <div>• Rasio pas 1:1 (tidak gepeng/terpotong di feed).</div>
                      <div>• Teks di bawah 20% area agar direkomendasikan algoritma.</div>
                      <div>• Teks penting berada di safe zone tengah (tidak tertutup badge Star+).</div>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* TAB 3: Shopee Mobile Mockup Preview */}
            {viewTab === "shopee_preview" && (
              <div className="app-card p-6 space-y-4">
                <div className="max-w-md mx-auto bg-white rounded-3xl border-4 border-slate-800 shadow-xl overflow-hidden text-slate-900 font-sans">
                  
                  {/* Shopee Top App Bar Mockup */}
                  <div className="bg-[#ee4d2d] px-4 py-3 flex items-center justify-between text-white text-xs font-medium shadow-sm">
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      <span className="font-bold tracking-tight">Shopee Mall</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Mockup Product Header */}
                  <div className="p-4 bg-white border-b border-slate-200 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#ee4d2d] tabular-nums">{formatRp(price)}</span>
                      <span className="text-xs text-slate-400 line-through tabular-nums">{formatRp(Math.round(price * 1.35))}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-[#ee4d2d] border border-red-200 rounded">HEMAT 25%</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                      {seoTitle || gameTitle}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 text-amber-500 font-medium">★ 4.9</span>
                      <span>•</span>
                      <span>1.8RB Penilaian</span>
                      <span>•</span>
                      <span>2.4RB+ Terjual</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        🛡️ 100% Original & Legal
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        ⚡ Pengiriman Instan
                      </span>
                      {includePhysicalCard && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                          📦 Garansi Fisik A6
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mockup Seller Shop Profile */}
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#ee4d2d]/10 border border-[#ee4d2d]/30 flex items-center justify-center text-[#ee4d2d] font-bold text-xs">
                        AG
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          Akshara Gaming Center
                          <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">Star+</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Aktif beberapa menit lalu • Kota Surabaya</div>
                      </div>
                    </div>
                    <button className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#ee4d2d] text-[#ee4d2d]">
                      Kunjungi
                    </button>
                  </div>

                  {/* Mockup Product Description Body */}
                  <div className="p-4 space-y-3 bg-white max-h-96 overflow-y-auto text-xs leading-relaxed text-slate-700 font-mono whitespace-pre-wrap">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 font-sans">
                      Spesifikasi & Deskripsi Produk
                    </div>
                    <div>{fullDescription}</div>
                  </div>

                  {/* Mockup Bottom Checkout Bar */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      Garansi Shopee <span className="text-emerald-600 font-semibold">Aktif</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-medium">
                        Chat Penjual
                      </button>
                      <button className="px-4 py-1.5 rounded-lg bg-[#ee4d2d] text-white text-xs font-bold shadow-sm">
                        Beli Sekarang
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Quick Tips Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="text-slate-900 font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Tips Lolos Regulasi Shopee Produk Digital (Hybrid Mode):
              </div>
              <p className="text-[11px] leading-relaxed">
                Shopee mewajibkan resi pengiriman fisik nyata untuk menghindari penalti non-shipment atau penutupan toko.
                Dengan menyertakan opsi <span className="text-slate-900 font-semibold">Pengiriman Amplop Resi Fisik / Kartu Garansi A6</span> atau instant delivery compliant,
                toko Anda 100% compliant dengan kebijakan Shopee Indonesia dan terproteksi dari klaim buyer nakal!
              </p>
            </div>

          </div>

        </div>

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

export default function DescriptionMakerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] text-slate-500 p-8 font-mono text-xs">Memuat Shopee Listing Generator...</div>}>
      <DescriptionMakerContent />
    </Suspense>
  );
}
