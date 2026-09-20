"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText, Sparkles, Copy, Check, ArrowLeft, RefreshCw,
  Download, ShoppingBag, ShieldCheck, CheckCircle2, Sliders,
  HelpCircle, AlertTriangle, Smartphone, Eye, Tag, Zap,
  ExternalLink, Layers, Store, Award, Info
} from "lucide-react";

interface CatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
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

  // Options toggles
  const [includePhysicalCard, setIncludePhysicalCard] = useState(true);
  const [includeUnboxingSop, setIncludeUnboxingSop] = useState(true);
  const [includeFaq, setIncludeFaq] = useState(true);
  const [includeActivationSteps, setIncludeActivationSteps] = useState(true);
  const [customNotes, setCustomNotes] = useState("");

  // Output states
  const [seoTitle, setSeoTitle] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [seoHashtags, setSeoHashtags] = useState("");
  const [quickSpecs, setQuickSpecs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<string>("");

  // UI tabs & copy feedbacks
  const [viewTab, setViewTab] = useState<"editor" | "shopee_preview">("editor");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Fetch catalog games on mount
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch("/api/catalog");
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data)) {
          setCatalogGames(json.data);

          // If URL param provided, auto-select
          if (initialGameParam) {
            const found = json.data.find((g: any) =>
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
          const first = json.data[0];
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
  };

  // Generate Description
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
        setGenerationSource(json.source || "ai");
        showToast("✨ Deskripsi Shopee berhasil digenerate!");
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

  // Copy helpers
  const copyToClipboard = (text: string, type: "title" | "desc" | "tags") => {
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
    }
  };

  // Download as TXT
  const handleDownloadTxt = () => {
    const fileData = `=== JUDUL SHOPEE (MAX 120 KARAKTER) ===\n${seoTitle}\n\n=== DESKRIPSI LENGKAP ===\n${fullDescription}\n\n=== HASHTAGS SEO ===\n${seoHashtags}\n`;
    const blob = new Blob([fileData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopee_deskripsi_${gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("File deskripsi berhasil didownload!");
  };

  const formatRp = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num || 0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Breadcrumb & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/dashboard" className="hover:text-zinc-200 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Command Deck
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 font-medium">Deskripsi Maker</span>
            <span className="text-zinc-600">/</span>
            <span className="text-fuchsia-400 font-mono text-xs px-2.5 py-0.5 rounded-full bg-fuchsia-950/60 border border-fuchsia-800/50 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Shopee SEO Optimizer v2.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" /> Radar Katalog
            </Link>
            <Link
              href="/dashboard/quant"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" /> The Quant
            </Link>
          </div>
        </div>

        {/* Title & Description Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-fuchsia-950/20 via-purple-950/10 to-transparent p-6 rounded-2xl border border-fuchsia-500/20">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              Deskripsi Maker — Shopee AI Copywriter
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
              Otomatisasi pembuatan deskripsi produk Shopee berdaya konversi tinggi. Dilengkapi dengan judul SEO (maks 120 karakter),
              highlight legalitas lisensi, SOP unboxing anti-fraud, panduan aktivasi, dan FAQ pembeli siap pakai.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !gameTitle.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isGenerating ? "Sedang Menyusun..." : "Generate Ulang AI"}</span>
            </button>
          </div>
        </div>

        {/* Quick Inventory Game Chips */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Pilih Cepat Game dari Portofolio Aktif:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {catalogGames.map((g) => {
              const isSelected = selectedGameId === g.id || gameTitle.toLowerCase() === g.title.toLowerCase();
              return (
                <button
                  key={g.id}
                  onClick={() => handleSelectPresetGame(g)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-mono transition-all border text-left ${
                    isSelected
                      ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-300 font-bold shadow-sm"
                      : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="truncate max-w-[200px]">{g.title.split(":")[0]}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{formatRp(g.selling_price_shopee_idr)} • {g.platform}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Left Controls, Right Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Form Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">

            {/* Product Metadata Card */}
            <div className="v0-card rounded-2xl p-5 space-y-4 border-zinc-800/80 bg-zinc-900/50">
              <h2 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-fuchsia-400" />
                Parameter Produk Shopee
              </h2>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-zinc-400 mb-1">Nama Game / Lisensi</label>
                  <input
                    type="text"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder="Contoh: Minecraft: Java & Bedrock Edition"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-fuchsia-500 transition-colors cursor-pointer"
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
                    <label className="block text-zinc-400 mb-1">Kategori Lisensi</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-fuchsia-500 transition-colors cursor-pointer"
                    >
                      <option value="Account (Full Access)">Full Access Account</option>
                      <option value="Digital Key / CDKey">Digital CDKey (Global)</option>
                      <option value="Steam Gift">Steam Gift</option>
                      <option value="In-Game Asset / Key">Item In-Game / Key</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Harga Jual Shopee (IDR)</label>
                  <input
                    type="number"
                    step="1000"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-amber-400 font-bold focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Copywriting Style Selection */}
            <div className="v0-card rounded-2xl p-5 space-y-4 border-zinc-800/80 bg-zinc-900/50">
              <h2 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Gaya Penulisan (Tone & Style)
              </h2>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setStyle("ultimate")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "ultimate"
                      ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-200"
                      : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💎 Top Seller</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-snug">Visual emoji lengkap, rapi, pembatas baris, konversi tertinggi.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("security")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "security"
                      ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200"
                      : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🛡️ Anti-Hackback</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-snug">Fokus ke keamanan akun, full access, dan proteksi toko.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("flash_sale")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "flash_sale"
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-200"
                      : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🔥 Promo Urgency</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-snug">Diskon terbatas, dorong pembeli langsung checkout.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("clean")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === "clean"
                      ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-200"
                      : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚡ Clean & Minimal</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-snug">Singkat, padat, elegan, fokus ke spesifikasi to-the-point.</p>
                </button>
              </div>
            </div>

            {/* Shopee Sections Toggles */}
            <div className="v0-card rounded-2xl p-5 space-y-3.5 border-zinc-800/80 bg-zinc-900/50 text-xs font-mono">
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Modul & Bagian yang Disertakan
              </h2>

              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={includePhysicalCard}
                    onChange={(e) => setIncludePhysicalCard(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-fuchsia-600 focus:ring-0"
                  />
                  <span>📦 Sertakan Pengiriman Fisik Kartu Garansi A6</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={includeUnboxingSop}
                    onChange={(e) => setIncludeUnboxingSop(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-fuchsia-600 focus:ring-0"
                  />
                  <span>⚠️ Sertakan SOP Video Unboxing (Anti-Fraud)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={includeFaq}
                    onChange={(e) => setIncludeFaq(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-fuchsia-600 focus:ring-0"
                  />
                  <span>❓ Sertakan FAQ Pembeli (Ready stok, VPN, dll)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={includeActivationSteps}
                    onChange={(e) => setIncludeActivationSteps(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-fuchsia-600 focus:ring-0"
                  />
                  <span>🚀 Sertakan Panduan Aktivasi 3 Langkah</span>
                </label>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 mt-3">Catatan Khusus Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Contoh: Server Hypixel unbanned, bonus 5 skins"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
              </div>
            </div>

          </div>

          {/* Right Column: Output & Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-5">

            {/* Shopee SEO Title Card */}
            <div className="v0-card rounded-2xl p-5 border-zinc-800/80 bg-zinc-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  Judul Produk Shopee (SEO Title)
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    seoTitle.length <= 120 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {seoTitle.length} / 120 Karakter
                  </span>
                  <button
                    onClick={() => copyToClipboard(seoTitle, "title")}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1 transition-colors"
                  >
                    {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTitle ? "Disalin!" : "Salin Judul"}</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* View Mode Switcher & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                <button
                  onClick={() => setViewTab("editor")}
                  className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    viewTab === "editor" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Editor Teks</span>
                </button>
                <button
                  onClick={() => setViewTab("shopee_preview")}
                  className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    viewTab === "shopee_preview" ? "bg-fuchsia-500/20 text-fuchsia-300 font-bold border border-fuchsia-500/30" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  <span>Simulasi Shopee Mobile</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(seoHashtags, "tags")}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 flex items-center gap-1.5 transition-colors"
                  title="Salin kumpulan hashtag SEO"
                >
                  {copiedTags ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Tag className="w-3.5 h-3.5 text-purple-400" />}
                  <span>Salin Tags</span>
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 flex items-center gap-1.5 transition-colors"
                  title="Download sebagai file teks .txt"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>.TXT</span>
                </button>

                <button
                  onClick={() => copyToClipboard(fullDescription, "desc")}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-md transition-all"
                >
                  {copiedDesc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDesc ? "Tersalin!" : "Salin Deskripsi"}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Text Editor */}
            {viewTab === "editor" ? (
              <div className="v0-card rounded-2xl p-5 border-zinc-800/80 bg-zinc-900/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span>Engine: <span className="text-zinc-300 font-semibold">{generationSource === "gemini-ai" ? "Gemini 3.5 AI" : "Akshara E-Com Engine"}</span></span>
                    <span>•</span>
                    <span>Format: Shopee Indonesia Standard</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded ${
                    fullDescription.length <= 3000 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                  }`}>
                    {fullDescription.length} / 3000 Karakter
                  </span>
                </div>

                <textarea
                  rows={20}
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  placeholder="Deskripsi produk akan muncul di sini..."
                  className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 text-xs font-mono text-zinc-200 leading-relaxed focus:outline-none focus:border-fuchsia-500/80 transition-all resize-y"
                />
              </div>
            ) : (
              /* TAB 2: Shopee Mobile Mockup Preview */
              <div className="v0-card rounded-2xl p-6 border-zinc-800/80 bg-zinc-950 space-y-4">
                <div className="max-w-md mx-auto bg-zinc-900 rounded-3xl border-4 border-zinc-800 shadow-2xl overflow-hidden text-zinc-100 font-sans">
                  
                  {/* Shopee Top App Bar Mockup */}
                  <div className="bg-[#ee4d2d] px-4 py-3 flex items-center justify-between text-white text-xs font-medium shadow">
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      <span className="font-bold tracking-tight">Shopee Mall</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Mockup Product Header */}
                  <div className="p-4 bg-zinc-900 border-b border-zinc-800 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#ee4d2d] font-mono">{formatRp(price)}</span>
                      <span className="text-xs text-zinc-500 line-through font-mono">{formatRp(Math.round(price * 1.35))}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-500/10 text-[#ee4d2d] rounded">HEMAT 25%</span>
                    </div>

                    <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                      {seoTitle || gameTitle}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                      <span className="flex items-center gap-1 text-amber-400 font-medium">★ 4.9</span>
                      <span>•</span>
                      <span>1.8RB Penilaian</span>
                      <span>•</span>
                      <span>2.4RB+ Terjual</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        🛡️ 100% Original & Legal
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        ⚡ Pengiriman Instan
                      </span>
                      {includePhysicalCard && (
                        <span className="px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 font-medium">
                          📦 Kartu Garansi A6
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mockup Seller Shop Profile */}
                  <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#ee4d2d]/20 border border-[#ee4d2d]/40 flex items-center justify-center text-[#ee4d2d] font-bold text-xs">
                        AG
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          Akshara Gaming Center
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-400">Star+</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">Aktif beberapa menit lalu • Kota Surabaya</div>
                      </div>
                    </div>
                    <button className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#ee4d2d] text-[#ee4d2d]">
                      Kunjungi
                    </button>
                  </div>

                  {/* Mockup Product Description Body */}
                  <div className="p-4 space-y-3 bg-zinc-900 max-h-96 overflow-y-auto text-xs leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap">
                    <div className="text-xs font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-1.5 font-sans">
                      Spesifikasi & Deskripsi Produk
                    </div>
                    <div>{fullDescription}</div>
                  </div>

                  {/* Mockup Bottom Checkout Bar */}
                  <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-xs text-zinc-400">
                      Garansi Shopee <span className="text-emerald-400 font-semibold">Aktif</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-medium">
                        Chat Penjual
                      </button>
                      <button className="px-4 py-1.5 rounded-lg bg-[#ee4d2d] text-white text-xs font-bold shadow">
                        Beli Sekarang
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Quick Tips Card */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs font-mono text-zinc-400 space-y-1.5">
              <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                Tips Lolos Regulasi Shopee Produk Digital:
              </div>
              <p className="text-[11px] leading-relaxed">
                Shopee mewajibkan resi pengiriman fisik nyata untuk menghindari penalti non-shipment atau penutupan toko.
                Dengan menyertakan <span className="text-zinc-200 font-semibold">Kartu Garansi Fisik Resmi A6</span> pada deskripsi dan pengiriman,
                toko Anda 100% compliant dengan kebijakan Shopee Indonesia dan terproteksi dari klaim buyer nakal!
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-zinc-900/95 border border-fuchsia-500/40 text-xs font-mono text-fuchsia-200 flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default function DescriptionMakerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-400 p-8 font-mono text-xs">Memuat Deskripsi Maker...</div>}>
      <DescriptionMakerContent />
    </Suspense>
  );
}
