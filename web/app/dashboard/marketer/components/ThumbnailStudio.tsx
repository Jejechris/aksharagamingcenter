"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import { 
  Sparkles, Download, RefreshCw, Eye, Check, Copy, 
  Layers, ShieldCheck, Tag, ShoppingBag, Monitor, 
  Image as ImageIcon, Search, CheckCircle2, Sliders, 
  ChevronDown, FileText, Palette, Wand2, Maximize2, 
  Focus, MoveVertical, HelpCircle, Shield, Lock, 
  Fingerprint, Award
} from "lucide-react";

export interface AuthenticPalette {
  name: string;
  hex: string;
  game: string;
}

export const AUTHENTIC_PALETTES: AuthenticPalette[] = [
  { name: "Sky Blue", hex: "#1897fe", game: "inZOI / Fabledom" },
  { name: "Forest Green", hex: "#2a4034", game: "Sons Of The Forest" },
  { name: "Crimson Maroon", hex: "#3d1a1a", game: "Spider-Man Remastered" },
  { name: "Slate Violet", hex: "#383345", game: "Spider-Man : Miles Morales" },
  { name: "Teal Navy", hex: "#1f607e", game: "Helldivers 2" },
  { name: "Dark Graphite", hex: "#191013", game: "GTA V Premium" },
  { name: "Military Taupe", hex: "#3e3d36", game: "Hearts of Iron IV" },
  { name: "Rich Azure", hex: "#2172b8", game: "Fabledom" },
  { name: "Netflix Red", hex: "#e50914", game: "Netflix 4K UHD" },
  { name: "Emerald", hex: "#10b981", game: "Minecraft Original" },
  { name: "Wukong Bronze", hex: "#26211c", game: "Black Myth: Wukong" },
  { name: "EA FC Blue", hex: "#1e3a8a", game: "EA SPORTS FC 25" },
  { name: "PlayStation Blue", hex: "#003791", game: "PlayStation Exclusive" },
  { name: "Pure Black", hex: "#000000", game: "CapCut Pro / Minimalist" }
];

export interface PlatformBadgeOption {
  id: string;
  name: string;
  asset: string;
  shape: "circle" | "squircle" | "shield" | "square";
  rx?: number;
}

export const PLATFORM_BADGE_OPTIONS: PlatformBadgeOption[] = [
  { id: "steam", name: "Steam", asset: "/assets/platforms/steam.svg", shape: "circle" },
  { id: "netflix", name: "Netflix", asset: "/assets/platforms/netflix.svg", shape: "squircle", rx: 18 },
  { id: "spotify", name: "Spotify", asset: "/assets/platforms/spotify.svg", shape: "circle" },
  { id: "youtube", name: "YouTube", asset: "/assets/platforms/youtube.svg", shape: "squircle", rx: 20 },
  { id: "chatgpt", name: "ChatGPT / OpenAI", asset: "/assets/platforms/chatgpt.svg", shape: "squircle", rx: 18 },
  { id: "discord", name: "Discord Nitro", asset: "/assets/platforms/discord.svg", shape: "squircle", rx: 18 },
  { id: "disney", name: "Disney+", asset: "/assets/platforms/disney.svg", shape: "squircle", rx: 18 },
  { id: "canva", name: "Canva Pro", asset: "/assets/platforms/canva.svg", shape: "circle" },
  { id: "prime", name: "Prime Video", asset: "/assets/platforms/prime.svg", shape: "squircle", rx: 18 },
  { id: "capcut", name: "CapCut Pro", asset: "/assets/platforms/capcut.svg", shape: "squircle", rx: 18 },
  { id: "rockstar", name: "Rockstar Games", asset: "/assets/platforms/rockstar.svg", shape: "squircle", rx: 18 },
  { id: "mojang", name: "Mojang Studios", asset: "/assets/platforms/mojang.svg", shape: "squircle", rx: 14 },
  { id: "playstation", name: "PlayStation", asset: "/assets/platforms/playstation.svg", shape: "circle" },
  { id: "ea", name: "EA App", asset: "/assets/platforms/ea.svg", shape: "circle" },
  { id: "xbox", name: "Xbox", asset: "/assets/platforms/xbox.svg", shape: "circle" },
  { id: "epic", name: "Epic Games", asset: "/assets/platforms/epic.svg", shape: "shield" },
  { id: "valorant", name: "Valorant / Riot", asset: "/assets/platforms/valorant.svg", shape: "squircle", rx: 18 },
  { id: "roblox", name: "Roblox", asset: "/assets/platforms/roblox.svg", shape: "squircle", rx: 18 },
  { id: "ubisoft", name: "Ubisoft", asset: "/assets/platforms/ubisoft.svg", shape: "circle" },
  { id: "battlenet", name: "Battle.net", asset: "/assets/platforms/battlenet.svg", shape: "circle" }
];

export interface ArtworkOption {
  id: string;
  type: "hero" | "screenshot" | "capsule" | "wallpaper";
  label: string;
  url: string;
  thumbnail: string;
  resolution: string;
}

export interface GamePreset {
  id: string;
  title: string;
  platform: string;
  category: string;
  price: string;
  cleanTitle: string;
  frameColor: string;
  platformBadge: string;
  accessType: string;
  bgUrl: string;
}

export const GAME_PRESETS: GamePreset[] = [
  {
    id: "inzoi",
    title: "inZOI",
    platform: "Steam",
    category: "Account (Private)",
    price: "Rp 349.000",
    cleanTitle: "inZOI (Steam) - Private",
    frameColor: "#1897fe",
    platformBadge: "steam",
    accessType: "Private",
    bgUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "forest",
    title: "Sons Of The Forest",
    platform: "Steam",
    category: "Account (Private)",
    price: "Rp 219.000",
    cleanTitle: "Sons Of The Forest (Steam) - Private",
    frameColor: "#2a4034",
    platformBadge: "steam",
    accessType: "Private",
    bgUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "gtav",
    title: "Grand Theft Auto V",
    platform: "Rockstar",
    category: "Key (Full Access)",
    price: "Rp 249.000",
    cleanTitle: "GTA V Premium Edition - Rockstar Key | Full Access, Langsung Main!",
    frameColor: "#191013",
    platformBadge: "rockstar",
    accessType: "Rockstar Key | Full Access",
    bgUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "spiderman",
    title: "Marvel's Spider-Man Remastered",
    platform: "Steam",
    category: "Account (Private)",
    price: "Rp 329.000",
    cleanTitle: "Marvel's Spider-Man Remastered (Steam) | Private",
    frameColor: "#3d1a1a",
    platformBadge: "steam",
    accessType: "Private",
    bgUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "helldivers",
    title: "Helldivers 2",
    platform: "Steam",
    category: "Account (Private)",
    price: "Rp 289.000",
    cleanTitle: "Helldivers 2 (Steam) - Private",
    frameColor: "#1f607e",
    platformBadge: "steam",
    accessType: "Private",
    bgUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "minecraft",
    title: "Minecraft: Java & Bedrock Edition",
    platform: "PC / Microsoft",
    category: "Account (Full Access)",
    price: "Rp 249.900",
    cleanTitle: "Minecraft: Java & Bedrock Edition (PC) - Full Access",
    frameColor: "#10b981",
    platformBadge: "mojang",
    accessType: "Full Access",
    bgUrl: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "wukong",
    title: "Black Myth: Wukong Standard",
    platform: "Steam",
    category: "Account (Private)",
    price: "Rp 389.000",
    cleanTitle: "Black Myth: Wukong (Steam) - Private",
    frameColor: "#26211c",
    platformBadge: "steam",
    accessType: "Private",
    bgUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
  }
];

export default function ThumbnailStudio() {
  const [activePreset, setActivePreset] = useState<string>("inzoi");
  const [gameTitle, setGameTitle] = useState("inZOI");
  const [platform, setPlatform] = useState("Steam");
  const [category, setCategory] = useState("Account (Private)");
  const [price, setPrice] = useState("Rp 349.000");
  
  // Classic SMA Signature States
  const [activeSlide, setActiveSlide] = useState<"cover" | "rules">("cover");
  const [cleanTitle, setCleanTitle] = useState("inZOI (Steam) - Private");
  const [frameColor, setFrameColor] = useState("#1897fe");
  const [platformBadge, setPlatformBadge] = useState("steam");
  const [accessType, setAccessType] = useState("Private");
  const [bgUrl, setBgUrl] = useState("https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop");
  const [aiReasoning, setAiReasoning] = useState<string | null>(
    "Signature Minimalist SMA: Frame Biru Langit (#1897fe) harmonis dengan poster inZOI, judul bersih di atas, dan emblem Steam resmi di pojok kanan bawah."
  );

  // AI Smart Image Auto-Fit Engine States
  const [fitMode, setFitMode] = useState<"ambient_blur" | "focal_crop">("focal_crop");
  const [focalPosition, setFocalPosition] = useState<"center" | "top" | "bottom">("center");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panY, setPanY] = useState<number>(0);
  const [detectedAspect, setDetectedAspect] = useState<string | null>(null);

  // Official Artwork Auto-Search State (Strict Non-AI)
  const [availableArtworks, setAvailableArtworks] = useState<ArtworkOption[]>([]);
  const [isSearchingArt, setIsSearchingArt] = useState(false);
  const [artSource, setArtSource] = useState<string | null>("Valve Steam CDN");

  // Anti-Theft Combined Defense Suite (4-in-1 Protection)
  const [antiTheftMode, setAntiTheftMode] = useState<"full" | "subtle" | "off">("full");
  const [storeBrandName, setStoreBrandName] = useState<string>("AKSHARA GAMING CENTER");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(28);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<"canvas" | "shopee_app">("canvas");
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Autonomous 1-Input AI Studio States
  const [aiSearchInput, setAiSearchInput] = useState("");
  const [suggestedPalettes, setSuggestedPalettes] = useState<string[]>([
    "#1897fe", "#141414", "#0f1e36", "#a82020"
  ]);

  // Catalog Portfolio Games
  const [catalogGames, setCatalogGames] = useState<any[]>([]);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const mergedData = await fetchSmartCatalog();
        if (mergedData && mergedData.length > 0) {
          setCatalogGames(mergedData);
        }
      } catch (e) {
        console.error("Failed to load catalog into ThumbnailStudio:", e);
      }
    }
    loadCatalog();
  }, []);

  // Smart Aspect Ratio Auto-Detector
  const detectImageAspectAndAutoFit = (url: string) => {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;

      if (ratio > 1.25) {
        setDetectedAspect(`${w}x${h} (Landscape 16:9)`);
        setFitMode("ambient_blur");
        setToastMessage(`🪄 AI Auto-Fit: Gambar Landscape (${w}x${h}) terdeteksi! Mengaktifkan Ambient Blur agar poster tidak terpotong.`);
      } else if (ratio < 0.85) {
        setDetectedAspect(`${w}x${h} (Portrait)`);
        setFitMode("ambient_blur");
      } else {
        setDetectedAspect(`${w}x${h} (Square / Presisi)`);
        setFitMode("focal_crop");
      }
      setTimeout(() => setToastMessage(null), 4500);
    };
    img.src = url;
  };

  // Run aspect detection when background changes
  useEffect(() => {
    detectImageAspectAndAutoFit(bgUrl);
  }, [bgUrl]);

  // Auto-fetch real official artwork from Steam Store CDN or Developer Press Kit
  const handleFetchOfficialArtwork = async (titleToSearch?: string, autoSelectPrimary: boolean = true) => {
    const query = titleToSearch || gameTitle;
    if (!query || !query.trim()) return;
    setIsSearchingArt(true);
    try {
      const res = await fetch("/api/ai/game-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_title: query })
      });
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.artworks) && json.artworks.length > 0) {
        setAvailableArtworks(json.artworks);
        const sourceLabel = json.source === "steam_official_cdn" 
          ? "Valve Steam Store CDN" 
          : "Official Developer Press Kit";
        setArtSource(sourceLabel);
        if (autoSelectPrimary && json.primary_bg) {
          setBgUrl(json.primary_bg);
        }
        setToastMessage(`🎮 Ditemukan ${json.artworks.length} artwork resmi untuk "${json.official_title || query}" (${sourceLabel})!`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error("Gagal mengambil artwork resmi:", err);
    } finally {
      setIsSearchingArt(false);
    }
  };

  // Populate initial artwork on mount
  useEffect(() => {
    handleFetchOfficialArtwork("inZOI", false);
  }, []);

  // =========================================================================
  // UNIFIED AUTONOMOUS 1-INPUT AI RESEARCH & DESIGN ENGINE
  // User enters game/product name -> AI automatically researches artwork,
  // market price, frame color palette, platform emblem, clean title & rules.
  // =========================================================================
  const handleAutonomousAiDesign = async (customGame?: string) => {
    const query = (customGame || aiSearchInput || gameTitle).trim();
    if (!query) return;
    setIsGenerating(true);
    setGameTitle(query);

    try {
      // 1. Fetch official artwork from Steam Store CDN or Developer Press Kit
      const artPromise = fetch("/api/ai/game-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_title: query })
      }).then((r) => r.json()).catch(() => null);

      // 2. Fetch market research & pricing calibration
      const pricePromise = fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      }).then((r) => r.json()).catch(() => null);

      // 3. Fetch Creative Director copy & design decisions
      const copyPromise = fetch("/api/ai/thumbnail-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_title: query })
      }).then((r) => r.json()).catch(() => null);

      const [artJson, priceJson, copyJson] = await Promise.all([artPromise, pricePromise, copyPromise]);

      // Apply Artwork
      if (artJson?.status === "success" && Array.isArray(artJson.artworks) && artJson.artworks.length > 0) {
        setAvailableArtworks(artJson.artworks);
        if (artJson.primary_bg) {
          setBgUrl(artJson.primary_bg);
        }
        const sourceLabel = artJson.source === "steam_official_cdn" 
          ? "Valve Steam CDN" 
          : "Official Developer Press Kit";
        setArtSource(sourceLabel);
      }

      // Apply Price
      if (priceJson?.status === "success" && priceJson.data?.recommended_shopee_price) {
        const p = Number(priceJson.data.recommended_shopee_price);
        setPrice(`Rp ${p.toLocaleString('id-ID')}`);
      }

      // Apply Creative Director (Frame Color, Platform Emblem, Clean Title, Reasoning)
      if (copyJson?.status === "success" && copyJson.data) {
        const d = copyJson.data;
        if (d.frame_color) {
          setFrameColor(d.frame_color);
          // Set 4 harmonic palette alternatives (primary + obsidian + navy + crimson)
          setSuggestedPalettes([
            d.frame_color,
            "#141414", // Signature Obsidian Black
            "#0f1e36", // Signature Deep Royal Navy
            "#a82020", // Signature Crimson
          ]);
        }
        if (d.clean_title) setCleanTitle(d.clean_title);
        if (d.platform_logo) setPlatformBadge(d.platform_logo);
        if (d.access_type) setAccessType(d.access_type);
        if (d.ai_reasoning) setAiReasoning(d.ai_reasoning);

        setToastMessage(`⚡ AI Autonomous Studio: Riset & Desain "${query}" selesai 100%!`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (e) {
      console.error("AI Generation failed:", e);
      setToastMessage("Gagal melakukan auto-design, silakan coba lagi.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Backwards compatibility alias
  const handleAiAutoDirector = async (customGame?: string) => {
    return handleAutonomousAiDesign(customGame);
  };

  // Switch preset
  const handleSelectPreset = (preset: GamePreset) => {
    setActivePreset(preset.id);
    setGameTitle(preset.title);
    setPlatform(preset.platform);
    setCategory(preset.category);
    setPrice(preset.price);
    setCleanTitle(preset.cleanTitle);
    setFrameColor(preset.frameColor);
    setPlatformBadge(preset.platformBadge);
    setAccessType(preset.accessType);
    setBgUrl(preset.bgUrl);
    handleFetchOfficialArtwork(preset.title, false);
  };

  // Helper for word-wrap in Canvas
  const drawCanvasWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    align: "left" | "center" = "center"
  ): number => {
    const lines = text.split("\n");
    let currentY = y;

    for (const paragraph of lines) {
      const words = paragraph.split(" ");
      let line = "";
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.textAlign = align;
          ctx.fillText(line.trim(), x, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.textAlign = align;
      ctx.fillText(line.trim(), x, currentY);
      currentY += lineHeight;
    }
    return currentY;
  };

  // =========================================================================
  // HIGH-RESOLUTION 1080x1080 CANVAS DOWNLOAD HANDLER
  // =========================================================================
  const handleDownloadThumbnail = async (slideTarget?: "cover" | "rules") => {
    const currentSlide = slideTarget || activeSlide;
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Base Solid Frame Color
      ctx.fillStyle = frameColor;
      ctx.fillRect(0, 0, 1080, 1080);

      // 2. Header Title at Top Margin (x=54, y=64)
      const topTitle = currentSlide === "rules" ? "RULES & TERMS" : cleanTitle;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px 'Inter', system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(topTitle, 54, 64);

      // 3. Inner Card Clipping Path with Corner Cut (Harmonized to 54,100 -> 1026,1026)
      // Box: x=54, y=100, w=972, h=926 (Right: 1026, Bottom: 1026)
      // Crease: (1026, 860) to (860, 1026)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(54, 100);
      ctx.lineTo(1026, 100);
      ctx.lineTo(1026, 860);
      ctx.lineTo(860, 1026);
      ctx.lineTo(54, 1026);
      ctx.closePath();
      ctx.clip();

      if (currentSlide === "cover") {
        // Draw Game Artwork with AI Smart Fit Engine
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const boxW = 972;
            const boxH = 926;
            const imgW = img.width;
            const imgH = img.height;

            if (fitMode === "ambient_blur") {
              // --- SMART AMBIENT BLUR FIT (Zero Cropping, 100% Poster Intact) ---
              // Layer 1: Ambient Blurred Backdrop
              const bgScale = Math.max(boxW / imgW, boxH / imgH) * 1.2;
              const bgW = imgW * bgScale;
              const bgH = imgH * bgScale;
              const bgX = 54 + (boxW - bgW) / 2;
              const bgY = 100 + (boxH - bgH) / 2;

              ctx.save();
              ctx.filter = "blur(28px) brightness(0.6)";
              ctx.drawImage(img, bgX, bgY, bgW, bgH);
              ctx.restore();

              // Subtle dark tint over blur
              ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
              ctx.fillRect(54, 100, boxW, boxH);

              // Layer 2: Center Crisp Poster at Natural Aspect Ratio
              const scale = Math.min(boxW / imgW, boxH / imgH);
              const cw = imgW * scale;
              const ch = imgH * scale;
              const cx = 54 + (boxW - cw) / 2;
              const cy = 100 + (boxH - ch) / 2;

              // Soft Drop Shadow behind Center Poster
              ctx.save();
              ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
              ctx.shadowBlur = 24;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 8;
              ctx.fillStyle = "#000000";
              ctx.fillRect(cx, cy, cw, ch);
              ctx.restore();

              // Draw Center Poster Crisp
              ctx.drawImage(img, cx, cy, cw, ch);

            } else {
              // --- FOCAL CROP MODE (Full Container Fit with Custom Zoom & Pan) ---
              const baseScale = Math.max(boxW / imgW, boxH / imgH);
              const effectiveScale = baseScale * (zoomLevel / 100);
              const scaledW = imgW * effectiveScale;
              const scaledH = imgH * effectiveScale;

              let posX = 54 + (boxW - scaledW) / 2;
              let posY = 100 + (boxH - scaledH) / 2;

              if (focalPosition === "top") {
                posY = 100;
              } else if (focalPosition === "bottom") {
                posY = 100 + (boxH - scaledH);
              }

              // Apply manual vertical pan offset
              posY += (panY / 100) * (boxH * 0.3);

              ctx.drawImage(img, posX, posY, scaledW, scaledH);
            }
            resolve();
          };
          img.onerror = () => {
            const bgGrad = ctx.createLinearGradient(54, 100, 1026, 1026);
            bgGrad.addColorStop(0, "#18181b");
            bgGrad.addColorStop(1, "#09090b");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(54, 100, 972, 926);
            resolve();
          };
          img.src = bgUrl;
        });

      } else {
        // Slide 2: Rules & Terms White Card
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(54, 100, 972, 926);

        // Draw Typography
        ctx.fillStyle = "#111827";
        ctx.font = "bold 23px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("1. Ketentuan Garansi", 540, 155);

        ctx.font = "500 17px 'Inter', sans-serif";
        ctx.fillStyle = "#1f2937";
        let y = 195;
        y = drawCanvasWrappedText(ctx, "• Garansi berlaku selama 1 bulan sejak tanggal pembelian.", 540, y, 820, 26, "center");
        y = drawCanvasWrappedText(ctx, "• Garansi hanya berlaku jika pembeli mematuhi seluruh aturan yang ditetapkan penjual.", 540, y, 820, 26, "center");
        y = drawCanvasWrappedText(ctx, "• Garansi hangus jika pembeli melakukan pelanggaran terhadap aturan berikut:", 540, y, 820, 26, "center");
        ctx.font = "500 16px 'Inter', sans-serif";
        ctx.fillStyle = "#374151";
        y = drawCanvasWrappedText(ctx, "1. Mengubah negara akun dalam waktu 2-4 minggu setelah pembelian.", 540, y, 820, 24, "center");
        y = drawCanvasWrappedText(ctx, "2. Melakukan perubahan data penting pada akun tanpa izin penjual.", 540, y, 820, 24, "center");
        y = drawCanvasWrappedText(ctx, "3. Melakukan tindakan yang dilarang oleh developer game atau marketplace.", 540, y, 820, 24, "center");

        // Section 2
        ctx.fillStyle = "#111827";
        ctx.font = "bold 23px 'Inter', sans-serif";
        ctx.fillText("2. Aturan Khusus Akun Game", 540, 420);

        ctx.font = "500 17px 'Inter', sans-serif";
        ctx.fillStyle = "#1f2937";
        y = 460;
        y = drawCanvasWrappedText(ctx, "• Dilarang mengubah negara akun selama minimal 2-4 minggu setelah pembelian. Jika aturan ini dilanggar, garansi otomatis hangus.", 540, y, 820, 26, "center");
        y = drawCanvasWrappedText(ctx, "• Segala bentuk perubahan data akun (email, password, negara, dsb.) tanpa konfirmasi penjual dapat menyebabkan garansi tidak berlaku.", 540, y, 820, 26, "center");
        y = drawCanvasWrappedText(ctx, "• Penjual tidak bertanggung jawab atas kerusakan atau kehilangan akses akun akibat pelanggaran aturan ini.", 540, y, 820, 26, "center");

        // Section 3
        ctx.fillStyle = "#111827";
        ctx.font = "bold 23px 'Inter', sans-serif";
        ctx.fillText("4. Proses Transaksi & Pengiriman", 540, 645);

        ctx.font = "500 17px 'Inter', sans-serif";
        ctx.fillStyle = "#1f2937";
        y = 685;
        y = drawCanvasWrappedText(ctx, "• Semua transaksi dan komunikasi dilakukan melalui fitur chat resmi marketplace.", 540, y, 820, 26, "center");
        y = drawCanvasWrappedText(ctx, "• Penjual wajib mengirimkan akun sesuai dengan pesanan dan dalam kondisi sesuai deskripsi.", 540, y, 820, 26, "center");
        y = drawCanvasWrappedText(ctx, "• Pembeli disarankan segera mengamankan akun setelah menerima data dari penjual", 540, y, 820, 26, "center");

        // Section 4
        ctx.fillStyle = "#111827";
        ctx.font = "bold 23px 'Inter', sans-serif";
        ctx.fillText("5. Lain-lain", 540, 810);

        ctx.font = "500 17px 'Inter', sans-serif";
        ctx.fillStyle = "#1f2937";
        y = 850;
        drawCanvasWrappedText(ctx, "Penjual dan pembeli wajib mematuhi seluruh kebijakan marketplace terkait penjualan produk digital dan akun game.", 540, y, 820, 26, "center");
      }

      // --- COMBINED ANTI-THEFT: INNER OVERLAYS (INSIDE POSTER CLIP) ---
      if (antiTheftMode !== "off") {
        // Layer 1: Micro-Security Nano-Text Guilloche Border (Banknote-style microprint)
        ctx.save();
        ctx.font = "600 10px 'Courier New', monospace";
        ctx.fillStyle = currentSlide === "rules" ? "rgba(0, 0, 0, 0.28)" : "rgba(255, 255, 255, 0.35)";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const microTop = `• ${storeBrandName.toUpperCase()} OFFICIAL LICENSED STORE • AUTHENTIC PRODUCT • DO NOT COPY • `.repeat(4);
        ctx.fillText(microTop, 62, 106);

        const microBottom = `• SECURED FOR ${storeBrandName.toUpperCase()} • ANTI-FRAUD VERIFIED • ALL RIGHTS RESERVED • `.repeat(3);
        ctx.fillText(microBottom, 62, 1012);
        ctx.restore();

        // Layer 3: Anti-AI Watermark Removal Poisoning (Disrupts inpainting AI)
        if (antiTheftMode === "full") {
          ctx.save();
          ctx.translate(540, 560);
          ctx.rotate((-35 * Math.PI) / 180);
          const poisonAlpha = (watermarkOpacity / 100) * 0.35;
          ctx.fillStyle = currentSlide === "rules" ? `rgba(0, 0, 0, ${poisonAlpha * 0.65})` : `rgba(255, 255, 255, ${poisonAlpha})`;
          ctx.font = "bold 32px 'Inter', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${storeBrandName.toUpperCase()} • ORIGINAL`, 0, -90);
          ctx.fillText(`AUTHENTIC PRODUCT • ${storeBrandName.toUpperCase()}`, 0, 90);
          ctx.restore();
        }
      }

      ctx.restore(); // Restore clip from inner card

      // 4. Soft Drop Shadow behind Curled Flap (Fold from 1026,860 to 860,1026 with tip at 860,860)
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = -4;
      ctx.shadowOffsetY = -4;
      ctx.beginPath();
      ctx.moveTo(860, 1026);
      ctx.lineTo(860, 860);
      ctx.lineTo(1026, 860);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fill();
      ctx.restore();

      // 5. Curled Fold Flap (Seamless Connection with Poster Cutout)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(860, 1026);
      ctx.lineTo(860, 860);
      ctx.lineTo(1026, 860);
      ctx.closePath();
      const flapGrad = ctx.createLinearGradient(940, 940, 860, 860);
      flapGrad.addColorStop(0, "#d5d5d5");
      flapGrad.addColorStop(0.35, "#f0f0f0");
      flapGrad.addColorStop(1, "#ffffff");
      ctx.fillStyle = flapGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 6. Shape-Aware Platform Emblem in Revealed Corner (DRAWN ON TOP OF EVERYTHING!)
      // Centered at (988, 988), size 92x92 -> (942, 942)
      const currentBadgeOption = PLATFORM_BADGE_OPTIONS.find(b => b.id === platformBadge) || PLATFORM_BADGE_OPTIONS[0];
      await new Promise<void>((resolve) => {
        const platImg = new Image();
        platImg.onload = () => {
          ctx.save();
          const bx = 942;
          const by = 942;
          const bw = 92;
          const bh = 92;

          if (currentBadgeOption.shape === "circle") {
            ctx.beginPath();
            ctx.arc(988, 988, 46, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(platImg, bx, by, bw, bh);
          } else if (currentBadgeOption.shape === "squircle") {
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, currentBadgeOption.rx || 18);
            ctx.clip();
            ctx.drawImage(platImg, bx, by, bw, bh);
          } else {
            ctx.drawImage(platImg, bx, by, bw, bh);
          }
          ctx.restore();
          resolve();
        };
        platImg.onerror = () => resolve();
        platImg.src = currentBadgeOption.asset;
      });

      // --- COMBINED ANTI-THEFT: OUTER OVERLAYS ---
      if (antiTheftMode !== "off") {
        // Layer 2: Holographic Store Trust Seal (Pill Badge at Top-Left)
        ctx.save();
        const sealX = 66;
        const sealY = 114;
        const sealW = 216;
        const sealH = 34;
        const sealAlpha = Math.min(Math.max(watermarkOpacity / 100, 0.3), 0.9);

        ctx.globalAlpha = sealAlpha;
        // Dark glassy backing
        ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
        ctx.beginPath();
        ctx.roundRect(sealX, sealY, sealW, sealH, 8);
        ctx.fill();

        // Holographic dynamic stroke
        const holoGrad = ctx.createLinearGradient(sealX, sealY, sealX + sealW, sealY + sealH);
        holoGrad.addColorStop(0, "#06b6d4");
        holoGrad.addColorStop(0.33, "#a855f7");
        holoGrad.addColorStop(0.66, "#ec4899");
        holoGrad.addColorStop(1, "#3b82f6");
        ctx.strokeStyle = holoGrad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Seal brand name
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'Inter', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`🛡️ ${storeBrandName.slice(0, 17).toUpperCase()}`, sealX + 10, sealY + sealH / 2);

        // Official tag
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "right";
        ctx.fillText("VERIFIED", sealX + sealW - 8, sealY + sealH / 2);
        ctx.restore();

        // Layer 4: Cryptographic Watermark & Digital Fingerprint
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "500 10px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const certId = `AUTH-SIG: [${storeBrandName.replace(/\s+/g, '-').toUpperCase()}] • CERT-ID: AKSHARA-1080P-SECURED`;
        ctx.fillText(certId, 54, 1054);
        ctx.restore();

        // Steganographic Invisible LSB watermark on 8x8 corner pixels
        try {
          const imgData = ctx.getImageData(0, 0, 8, 8);
          for (let i = 0; i < imgData.data.length; i += 4) {
            imgData.data[i] = (imgData.data[i] & ~1) | ((i % 2 === 0) ? 1 : 0);
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // Safe fallback
        }
      }

      // Download PNG
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const fileSlug = activePreset || "game";
      const slideSlug = currentSlide === "rules" ? "slide2-rules-garansi" : "slide1-cover-utama";
      a.download = `akshara-${fileSlug}-${slideSlug}-1080x1080.png`;
      a.click();

      setToastMessage(`✅ Berhasil mengunduh ${currentSlide === "rules" ? "Slide 2 (Rules & Terms)" : "Slide 1 (Cover Game)"} 1080x1080 PNG!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Canvas export failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Download both slides sequentially
  const handleDownloadBothSlides = async () => {
    await handleDownloadThumbnail("cover");
    setTimeout(async () => {
      await handleDownloadThumbnail("rules");
    }, 1200);
  };

  // Active badge metadata
  const currentBadge = PLATFORM_BADGE_OPTIONS.find(b => b.id === platformBadge) || PLATFORM_BADGE_OPTIONS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 text-xs flex items-center justify-between shadow-lg shadow-emerald-950/40">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">Siap Pakai</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INNOVATIVE AUTONOMOUS AI DESIGN COMMAND BAR (1-INPUT STUDIO)              */}
      {/* User types any game/product -> AI handles research, artwork, palette,    */}
      {/* platform emblem, title formatting, and rules automatically.              */}
      {/* ========================================================================= */}
      <div className="v0-card rounded-2xl p-6 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-zinc-900 to-emerald-950/30 space-y-4 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header bar with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Thumbnail Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  Autonomous 1-Input Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ketik nama game / produk apa saja. AI otomatis meriset cover resmi, warna bingkai, logo brand, dan aturan garansi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowSampleModal(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sampel Asli SMA</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadThumbnail()}
              disabled={isDownloading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? "Merender..." : "Download 1080x1080 PNG"}</span>
            </button>
          </div>
        </div>

        {/* Command Search Input Bar */}
        <div className="space-y-3 relative z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAutonomousAiDesign();
            }}
            className="flex flex-col sm:flex-row items-stretch gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-emerald-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={aiSearchInput}
                onChange={(e) => setAiSearchInput(e.target.value)}
                placeholder="Ketik nama game atau software (contoh: GTA V, Black Myth Wukong, Minecraft, Netflix, CapCut, Elden Ring)..."
                className="w-full pl-11 pr-8 py-3 rounded-xl bg-zinc-950/90 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-zinc-500 transition-all font-medium"
              />
              {aiSearchInput && (
                <button
                  type="button"
                  onClick={() => setAiSearchInput("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "AI Sedang Meriset & Mendesain..." : "⚡ Riset & Desain Otomatis"}</span>
            </button>
          </form>

          {/* Quick 1-Click Game Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap mr-1">
              {catalogGames.length > 0 ? "Portofolio Aktif:" : "Rekomendasi Cepat:"}
            </span>
            {catalogGames.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setAiSearchInput(g.title);
                  handleAutonomousAiDesign(g.title);
                }}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono whitespace-nowrap transition-all flex items-center gap-1 disabled:opacity-50 font-semibold shadow-sm"
              >
                <span>🎮 {g.title.split(":")[0]}</span>
              </button>
            ))}
            {[
              { label: "inZOI", query: "inZOI" },
              { label: "Grand Theft Auto V", query: "Grand Theft Auto V" },
              { label: "Minecraft", query: "Minecraft: Java & Bedrock Edition" },
              { label: "Black Myth: Wukong", query: "Black Myth: Wukong" },
              { label: "Netflix Premium", query: "Netflix Premium 4K" },
              { label: "CapCut Pro", query: "CapCut Pro" },
              { label: "Elden Ring", query: "Elden Ring" },
              { label: "Valorant", query: "Valorant" },
              { label: "Sons of the Forest", query: "Sons of the Forest" },
              { label: "Cyberpunk 2077", query: "Cyberpunk 2077" }
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setAiSearchInput(chip.query);
                  handleAutonomousAiDesign(chip.query);
                }}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-300 border border-zinc-800 hover:border-emerald-500/50 text-[11px] font-mono whitespace-nowrap transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live AI Decision Telemetry HUD */}
        {aiReasoning && (
          <div className="p-4 rounded-xl bg-zinc-950/90 border border-emerald-500/40 text-xs space-y-3 shadow-md relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-emerald-300 font-mono text-xs">
                  Keputusan AI untuk: <strong className="text-white">{gameTitle}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span>Platform: <strong className="text-emerald-400">{platformBadge.toUpperCase()}</strong></span>
                <span>•</span>
                <span>Harga: <strong className="text-white">{price}</strong></span>
                <span>•</span>
                <span>Artwork: <strong className="text-cyan-400">{availableArtworks.length} Resmi</strong></span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] text-zinc-300">
              <p className="leading-relaxed text-zinc-300 max-w-2xl">
                {aiReasoning}
              </p>

              {/* Quick Frame Color Swatches for instant alternate testing */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-zinc-500">Warna Frame:</span>
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                  {suggestedPalettes.map((hex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFrameColor(hex)}
                      title={`Ganti frame ke ${hex}`}
                      className={`w-5 h-5 rounded-md transition-all border ${
                        frameColor.toLowerCase() === hex.toLowerCase()
                          ? "border-white scale-110 shadow-sm"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  <input
                    type="color"
                    value={frameColor}
                    onChange={(e) => setFrameColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 opacity-80 hover:opacity-100 p-0"
                    title="Pilih warna kustom"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SLIDE SWITCHER TABS: SLIDE 1 (COVER GAME) vs SLIDE 2 (RULES & TERMS)       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSlide("cover")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeSlide === "cover"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Slide 1: Cover Game Utama</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSlide("rules")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeSlide === "rules"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Slide 2: Rules & Terms / Garansi Toko</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleDownloadBothSlides()}
            disabled={isDownloading}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Download Paket (Slide 1 & 2)</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Controls / Right Live Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ========================================================================= */}
        {/* LEFT PANEL: INPUTS & CUSTOMIZATIONS                                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Form Controls */}
          <div className="v0-card rounded-2xl p-5 border-slate-700/40 space-y-4 text-xs font-mono">
            
            {/* Input 1: Judul Produk Game */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">1</span>
                  Nama Game
                </label>
                <button
                  type="button"
                  onClick={() => handleFetchOfficialArtwork(gameTitle, true)}
                  disabled={isSearchingArt}
                  className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>{isSearchingArt ? "Mencari..." : "Cari Steam CDN"}</span>
                </button>
              </div>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => {
                  setGameTitle(e.target.value);
                  setCleanTitle(`${e.target.value} (${platform}) - ${accessType}`);
                }}
                placeholder="Contoh: inZOI, Sons Of The Forest, GTA V"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Input 2: Background Game Resmi (Strict Non-AI) */}
            <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">2</span>
                  Pilih Cover Resmi (Non-AI)
                </label>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> 100% Asli Steam
                </span>
              </div>

              {/* Artworks Visual Gallery */}
              {availableArtworks.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>{availableArtworks.length} Pilihan Artwork Resmi:</span>
                    <span className="text-emerald-400 font-bold">{artSource || "Steam Store CDN"}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                    {availableArtworks.map((art) => {
                      const isSelected = bgUrl === art.url;
                      return (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => {
                            setBgUrl(art.url);
                            setToastMessage(`🖼️ Background aktif: ${art.label}`);
                            setTimeout(() => setToastMessage(null), 3000);
                          }}
                          className={`relative rounded-lg overflow-hidden border text-left group transition-all aspect-video flex flex-col justify-end p-1.5 ${
                            isSelected
                              ? "border-emerald-400 ring-2 ring-emerald-500/50 scale-[1.02]"
                              : "border-zinc-800 hover:border-zinc-600 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={art.thumbnail || art.url}
                            alt={art.label}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] font-bold z-10 shadow">
                              ✓
                            </span>
                          )}

                          <div className="relative z-10 space-y-0.5">
                            <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/80 text-zinc-200 block truncate font-medium">
                              {art.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFetchOfficialArtwork(gameTitle, true)}
                  disabled={isSearchingArt}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-zinc-700 shadow-sm"
                >
                  <Search className={`w-3.5 h-3.5 text-emerald-400 ${isSearchingArt ? "animate-spin" : ""}`} />
                  <span>Ambil Poster Resmi dari Steam CDN</span>
                </button>
              )}

              {/* Custom Image URL / Upload input */}
              <div className="pt-1">
                <input
                  type="text"
                  value={bgUrl}
                  onChange={(e) => setBgUrl(e.target.value)}
                  placeholder="Atau tempel URL gambar custom (JPG / PNG)"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* AI SMART IMAGE AUTO-FIT ENGINE (LANDSCAPE & CUSTOM IMAGES)                */}
            {/* ========================================================================= */}
            <div className="pt-3 border-t border-white/[0.08] space-y-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI Smart Image Auto-Fit</span>
                </div>
                {detectedAspect && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {detectedAspect}
                  </span>
                )}
              </div>

              <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                Mencegah gambar landscape 16:9 atau banner gepeng dan terpotong di dalam kotak 1:1.
              </p>

              {/* Fit Mode Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFitMode("ambient_blur")}
                  className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                    fitMode === "ambient_blur"
                      ? "bg-emerald-950/60 border-emerald-500/80 text-white font-bold ring-1 ring-emerald-500/40"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Maximize2 className="w-3 h-3 text-emerald-400" />
                    <span>Ambient Blur (Utuh 100%)</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-sans">Poster di tengah, latar blur senada</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFitMode("focal_crop")}
                  className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                    fitMode === "focal_crop"
                      ? "bg-emerald-950/60 border-emerald-500/80 text-white font-bold ring-1 ring-emerald-500/40"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Focus className="w-3 h-3 text-emerald-400" />
                    <span>Focal Crop (Penuh Kotak)</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-sans">Crop fokus karakter/wajah</span>
                </button>
              </div>

              {/* Controls for Focal Crop Mode */}
              {fitMode === "focal_crop" && (
                <div className="space-y-2 pt-1 border-t border-zinc-800 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Titik Fokus Gambar:</span>
                    <div className="flex items-center gap-1">
                      {(["top", "center", "bottom"] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setFocalPosition(pos)}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                            focalPosition === pos
                              ? "bg-emerald-500 text-slate-950 font-bold"
                              : "bg-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {pos === "top" ? "Atas" : pos === "center" ? "Tengah" : "Bawah"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400 text-[10px] whitespace-nowrap">Zoom ({zoomLevel}%):</span>
                    <input 
                      type="range" 
                      min="100" 
                      max="180" 
                      value={zoomLevel} 
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400 text-[10px] whitespace-nowrap">Geser Vertikal:</span>
                    <input 
                      type="range" 
                      min="-25" 
                      max="25" 
                      value={panY} 
                      onChange={(e) => setPanY(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Input 3: Estimasi Harga */}
            <div className="space-y-1 pt-2 border-t border-white/[0.08]">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">3</span>
                Estimasi Harga Jual (Rp)
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Rp 249.900"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* ========================================================================= */}
            {/* SIGNATURE CUSTOMIZATIONS: TITLE, FRAME COLOR, & HARDENED BADGES           */}
            {/* ========================================================================= */}
            <div className="pt-3 border-t border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Kustomisasi Signature Classic SMA
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">100% Sesuai Sampel Asli</span>
              </div>

              {/* Header Clean Title */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold text-[11px]">
                  {activeSlide === "rules" ? "Judul Slide Garansi:" : "Teks Header Bersih (Atas):"}
                </label>
                {activeSlide === "cover" ? (
                  <input
                    type="text"
                    value={cleanTitle}
                    onChange={(e) => setCleanTitle(e.target.value)}
                    placeholder="Contoh: Sons Of The Forest (Steam) - Private"
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-emerald-500"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs">
                    RULES & TERMS
                  </div>
                )}
              </div>

              {/* Frame Color Swatches & Custom Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-[11px]">
                    Warna Bingkai Luar (Harmonis):
                  </label>
                  <span className="font-mono text-[10px] text-zinc-400">{frameColor}</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {AUTHENTIC_PALETTES.map((pal) => (
                    <button
                      key={pal.hex}
                      type="button"
                      onClick={() => setFrameColor(pal.hex)}
                      title={`${pal.name} (${pal.game})`}
                      className={`w-full aspect-square rounded-lg border transition-all flex items-center justify-center ${
                        frameColor.toLowerCase() === pal.hex.toLowerCase()
                          ? "ring-2 ring-white border-white scale-110 z-10"
                          : "border-black/40 hover:scale-105"
                      }`}
                      style={{ backgroundColor: pal.hex }}
                    >
                      {frameColor.toLowerCase() === pal.hex.toLowerCase() && (
                        <Check className="w-3 h-3 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={frameColor}
                    onChange={(e) => setFrameColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={frameColor}
                    onChange={(e) => setFrameColor(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-zinc-300 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Hardened Platform Badge Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-[11px]">
                    Emblem Platform Resmi:
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                    {currentBadge.name}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {PLATFORM_BADGE_OPTIONS.map((badge) => {
                    const isSelected = platformBadge === badge.id;
                    return (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => setPlatformBadge(badge.id)}
                        className={`p-2 rounded-xl border flex items-center gap-2 transition-all text-left ${
                          isSelected
                            ? "bg-zinc-800 border-emerald-400 ring-2 ring-emerald-500/40"
                            : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                          <img 
                            src={badge.asset} 
                            alt={badge.name} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-200 truncate">
                          {badge.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipe Akses Quick Buttons */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-[11px]">
                  Tipe Akses Produk:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["Private", "Full Access", "Rockstar Key | Full Access", "Steam Key", "Sharing"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setAccessType(t);
                        setCleanTitle(`${gameTitle} (${platform}) - ${t}`);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
                        accessType === t
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* COMBINED 4-IN-1 ANTI-THEFT SUITE CONTROLS                                 */}
              {/* ========================================================================= */}
              <div className="pt-3 border-t border-white/[0.08] space-y-3 bg-gradient-to-b from-zinc-900/40 to-emerald-950/20 p-3 rounded-xl border border-emerald-900/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    Sistem Anti-Maling & Hak Cipta
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    4-in-1 Suite
                  </span>
                </div>

                <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                  Kombinasi 4 proteksi: Segel Hologram, Garis Mikro Guilloche, Anti-AI Watermark Poisoning, dan Sidik Jari Kriptografis Steganografi.
                </p>

                {/* Mode Selector */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "full", label: "4-in-1 Full", desc: "Maksimal" },
                    { id: "subtle", label: "Subtle Shield", desc: "Elegan" },
                    { id: "off", label: "Nonaktif", desc: "Polos" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAntiTheftMode(m.id as "full" | "subtle" | "off")}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        antiTheftMode === m.id
                          ? "bg-emerald-950/80 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/50"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-[11px] font-bold">{m.label}</div>
                      <div className="text-[9px] text-zinc-500">{m.desc}</div>
                    </button>
                  ))}
                </div>

                {antiTheftMode !== "off" && (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/80 text-[11px]">
                    {/* Brand Name Input */}
                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold text-[10px] flex items-center justify-between">
                        <span>Nama Brand / Toko Anda:</span>
                        <span className="text-emerald-400 font-mono text-[9px]">Stempel Otomatis</span>
                      </label>
                      <input
                        type="text"
                        value={storeBrandName}
                        onChange={(e) => setStoreBrandName(e.target.value)}
                        placeholder="AKSHARA GAMING CENTER"
                        className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 uppercase tracking-wide"
                      />
                    </div>

                    {/* Watermark Opacity Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400">Intensitas Segel & Watermark:</span>
                        <span className="font-mono text-emerald-400 font-bold">{watermarkOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="60"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Active Layers Checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono text-zinc-300">
                      <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded border border-zinc-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">Hologram Seal</span>
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded border border-zinc-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">Micro-Guilloche</span>
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded border border-zinc-800">
                        <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${antiTheftMode === "full" ? "text-emerald-400" : "text-zinc-600"}`} />
                        <span className={`truncate ${antiTheftMode === "full" ? "" : "text-zinc-500"}`}>Anti-AI Poison</span>
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded border border-zinc-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">Stego Metadata</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: LIVE CANVAS PREVIEW & DOWNLOAD CONTROLS                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* View Mode Switcher: Clean Canvas vs Shopee App Simulation */}
          <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">Pratinjau:</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                {activeSlide === "rules" ? "Slide 2: Garansi & SOP" : "Slide 1: Cover Game"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("canvas")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  viewMode === "canvas"
                    ? "bg-zinc-800 text-white font-bold border border-zinc-600"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Kanvas 1:1 Bersih
              </button>
              <button
                type="button"
                onClick={() => setViewMode("shopee_app")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  viewMode === "shopee_app"
                    ? "bg-orange-500 text-slate-950 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Simulasi Shopee</span>
              </button>
            </div>
          </div>

          {/* The Canvas Preview Box */}
          <div className="v0-card rounded-2xl p-5 border-slate-700/40 flex flex-col items-center justify-center space-y-4 bg-zinc-950/60">
            
            {/* 1:1 Square Frame Container */}
            <div className="relative w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden shadow-2xl transition-all select-none border-4 border-black/40">
              
              {/* ============================================================= */}
              {/* CLASSIC SMA SIGNATURE (SVG VECTOR PRECISION PREVIEW)          */}
              {/* ============================================================= */}
              <svg viewBox="0 0 1080 1080" className="w-full h-full block">
                <defs>
                  {/* Poster clipping path with corner cutout (Harmonized to 54,100 -> 1026,1026) */}
                  <clipPath id="innerPosterClip">
                    <polygon points="54,100 1026,100 1026,860 860,1026 54,1026" />
                  </clipPath>

                  {/* Shape-aware badge clip paths (Centered at 988,988, size 92x92) */}
                  <clipPath id="badgeCircleClip">
                    <circle cx="988" cy="988" r="46" />
                  </clipPath>
                  <clipPath id="badgeSquircleClip">
                    <rect x="942" y="942" width="92" height="92" rx={currentBadge.rx || 18} />
                  </clipPath>

                  {/* Soft paper curl drop shadow filter */}
                  <filter id="flapShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="-4" dy="-4" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
                  </filter>

                  {/* Ambient blur filter for landscape auto-fit */}
                  <filter id="ambientBlur" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="24" />
                    <feColorMatrix type="matrix" values="0.7 0 0 0 0  0 0.7 0 0 0  0 0 0.7 0 0  0 0 0 1 0" />
                  </filter>

                  {/* Drop shadow for center poster in ambient mode */}
                  <filter id="centerPosterShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000000" floodOpacity="0.6" />
                  </filter>

                  {/* Realistic paper flap gradient */}
                  <linearGradient id="flapGrad" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#d5d5d5" />
                    <stop offset="35%" stopColor="#f0f0f0" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>

                  {/* Holographic dynamic gradient */}
                  <linearGradient id="holoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="33%" stopColor="#a855f7" />
                    <stop offset="66%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* 1. Outer Frame Color */}
                <rect width="1080" height="1080" fill={frameColor} />

                {/* 2. Top Header Text */}
                <text 
                  x="54" 
                  y="66" 
                  fill="#ffffff" 
                  fontSize="36" 
                  fontWeight="bold" 
                  fontFamily="Inter, system-ui, sans-serif"
                  letterSpacing="-0.5px"
                >
                  {activeSlide === "rules" ? "RULES & TERMS" : cleanTitle}
                </text>

                {/* 3. Inner Poster or Rules Card */}
                {activeSlide === "cover" ? (
                  <g clipPath="url(#innerPosterClip)">
                    {fitMode === "ambient_blur" ? (
                      <>
                        {/* Layer 1: Ambient Blurred Background */}
                        <image 
                          href={bgUrl} 
                          x="54" 
                          y="100" 
                          width="972" 
                          height="926" 
                          preserveAspectRatio="xMidYMid slice" 
                          filter="url(#ambientBlur)"
                        />
                        <rect x="54" y="100" width="972" height="926" fill="rgba(0,0,0,0.25)" />

                        {/* Layer 2: Center Crisp Artwork at Natural Aspect Ratio */}
                        <image 
                          href={bgUrl} 
                          x="54" 
                          y="100" 
                          width="972" 
                          height="926" 
                          preserveAspectRatio="xMidYMid meet" 
                          filter="url(#centerPosterShadow)"
                        />
                      </>
                    ) : (
                      /* Focal Crop Mode */
                      <image 
                        href={bgUrl} 
                        x="54" 
                        y={100 + (panY * 2)} 
                        width="972" 
                        height="926" 
                        preserveAspectRatio={
                          focalPosition === "top" ? "xMidYMin slice" :
                          focalPosition === "bottom" ? "xMidYMax slice" : "xMidYMid slice"
                        }
                      />
                    )}

                    {/* --- ANTI-THEFT: INSIDE POSTER CLIP (Cover Slide) --- */}
                    {antiTheftMode !== "off" && (
                      <>
                        {/* Layer 1: Micro-Security Nano-Text Guilloche Border */}
                        <text x="62" y="116" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace" fontWeight="600" letterSpacing="1px">
                          {`• ${storeBrandName.toUpperCase()} OFFICIAL LICENSED STORE • AUTHENTIC PRODUCT • DO NOT COPY • `.repeat(3)}
                        </text>
                        <text x="62" y="1016" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace" fontWeight="600" letterSpacing="1px">
                          {`• SECURED FOR ${storeBrandName.toUpperCase()} • ANTI-FRAUD VERIFIED • ALL RIGHTS RESERVED • `.repeat(2)}
                        </text>

                        {/* Layer 3: Anti-AI Watermark Removal Poisoning */}
                        {antiTheftMode === "full" && (
                          <g transform="translate(540, 560) rotate(-35)">
                            <text 
                              x="0" 
                              y="-90" 
                              textAnchor="middle" 
                              fill="rgba(255,255,255,0.18)" 
                              fontSize="32" 
                              fontWeight="bold" 
                              fontFamily="Inter, sans-serif"
                              opacity={watermarkOpacity / 100}
                            >
                              {`${storeBrandName.toUpperCase()} • ORIGINAL`}
                            </text>
                            <text 
                              x="0" 
                              y="90" 
                              textAnchor="middle" 
                              fill="rgba(255,255,255,0.18)" 
                              fontSize="32" 
                              fontWeight="bold" 
                              fontFamily="Inter, sans-serif"
                              opacity={watermarkOpacity / 100}
                            >
                              {`AUTHENTIC PRODUCT • ${storeBrandName.toUpperCase()}`}
                            </text>
                          </g>
                        )}
                      </>
                    )}
                  </g>
                ) : (
                  /* Slide 2: Rules & Terms White Card */
                  <g clipPath="url(#innerPosterClip)">
                    <rect x="54" y="100" width="972" height="926" fill="#ffffff" />
                    
                    {/* Section 1 */}
                    <text x="540" y="155" fill="#111827" fontSize="23" fontWeight="bold" fontFamily="Inter, sans-serif" textAnchor="middle">
                      1. Ketentuan Garansi
                    </text>
                    <text x="540" y="195" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Garansi berlaku selama 1 bulan sejak tanggal pembelian.
                    </text>
                    <text x="540" y="225" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Garansi hanya berlaku jika pembeli mematuhi seluruh aturan yang ditetapkan penjual.
                    </text>
                    <text x="540" y="255" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Garansi hangus jika pembeli melakukan pelanggaran terhadap aturan berikut:
                    </text>
                    <text x="540" y="285" fill="#374151" fontSize="16" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      1. Mengubah negara akun dalam waktu 2-4 minggu setelah pembelian.
                    </text>
                    <text x="540" y="312" fill="#374151" fontSize="16" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      2. Melakukan perubahan data penting pada akun tanpa izin penjual.
                    </text>
                    <text x="540" y="339" fill="#374151" fontSize="16" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      3. Melakukan tindakan yang dilarang oleh developer game atau marketplace.
                    </text>

                    {/* Section 2 */}
                    <text x="540" y="420" fill="#111827" fontSize="23" fontWeight="bold" fontFamily="Inter, sans-serif" textAnchor="middle">
                      2. Aturan Khusus Akun Game
                    </text>
                    <text x="540" y="460" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Dilarang mengubah negara akun selama minimal 2-4 minggu setelah pembelian. Jika aturan ini dilanggar, garansi otomatis hangus.
                    </text>
                    <text x="540" y="492" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Segala bentuk perubahan data akun (email, password, negara, dsb.) tanpa konfirmasi penjual dapat menyebabkan garansi tidak berlaku.
                    </text>
                    <text x="540" y="524" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Penjual tidak bertanggung jawab atas kerusakan atau kehilangan akses akun akibat pelanggaran aturan ini.
                    </text>

                    {/* Section 3 */}
                    <text x="540" y="645" fill="#111827" fontSize="23" fontWeight="bold" fontFamily="Inter, sans-serif" textAnchor="middle">
                      4. Proses Transaksi & Pengiriman
                    </text>
                    <text x="540" y="685" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Semua transaksi dan komunikasi dilakukan melalui fitur chat resmi marketplace.
                    </text>
                    <text x="540" y="715" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Penjual wajib mengirimkan akun sesuai dengan pesanan dan dalam kondisi sesuai deskripsi.
                    </text>
                    <text x="540" y="745" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      • Pembeli disarankan segera mengamankan akun setelah menerima data dari penjual
                    </text>

                    {/* Section 4 */}
                    <text x="540" y="810" fill="#111827" fontSize="23" fontWeight="bold" fontFamily="Inter, sans-serif" textAnchor="middle">
                      5. Lain-lain
                    </text>
                    <text x="540" y="850" fill="#1f2937" fontSize="17" fontWeight="500" fontFamily="Inter, sans-serif" textAnchor="middle">
                      Penjual dan pembeli wajib mematuhi seluruh kebijakan marketplace terkait penjualan produk digital dan akun game.
                    </text>

                    {/* --- ANTI-THEFT: INSIDE POSTER CLIP (Rules Slide) --- */}
                    {antiTheftMode !== "off" && (
                      <>
                        <text x="62" y="116" fill="rgba(0,0,0,0.3)" fontSize="10" fontFamily="monospace" fontWeight="600" letterSpacing="1px">
                          {`• ${storeBrandName.toUpperCase()} OFFICIAL LICENSED STORE • AUTHENTIC PRODUCT • DO NOT COPY • `.repeat(3)}
                        </text>
                        <text x="62" y="1016" fill="rgba(0,0,0,0.3)" fontSize="10" fontFamily="monospace" fontWeight="600" letterSpacing="1px">
                          {`• SECURED FOR ${storeBrandName.toUpperCase()} • ANTI-FRAUD VERIFIED • ALL RIGHTS RESERVED • `.repeat(2)}
                        </text>
                      </>
                    )}
                  </g>
                )}

                {/* 4. Dog-Ear Paper Flap with Soft Shadow (Fold from 1026,860 to 860,1026 with tip at 860,860) */}
                <polygon 
                  points="860,1026 860,860 1026,860" 
                  fill="url(#flapGrad)" 
                  filter="url(#flapShadow)"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="1.5"
                />

                {/* 5. Official Platform Badge in Revealed Corner (DRAWN ON TOP OF EVERYTHING!) */}
                {currentBadge.shape === "circle" ? (
                  <image 
                    href={currentBadge.asset} 
                    x="942" 
                    y="942" 
                    width="92" 
                    height="92" 
                    clipPath="url(#badgeCircleClip)"
                  />
                ) : currentBadge.shape === "squircle" ? (
                  <image 
                    href={currentBadge.asset} 
                    x="942" 
                    y="942" 
                    width="92" 
                    height="92" 
                    clipPath="url(#badgeSquircleClip)"
                  />
                ) : (
                  <image 
                    href={currentBadge.asset} 
                    x="942" 
                    y="942" 
                    width="92" 
                    height="92" 
                  />
                )}

                {/* --- ANTI-THEFT: OUTER OVERLAYS --- */}
                {antiTheftMode !== "off" && (
                  <>
                    {/* Layer 2: Holographic Store Trust Seal */}
                    <g opacity={Math.min(Math.max(watermarkOpacity / 100, 0.35), 0.95)}>
                      <rect x="66" y="114" width="216" height="34" rx="8" fill="rgba(10, 15, 29, 0.88)" stroke="url(#holoGrad)" strokeWidth="1.5" />
                      <text x="78" y="136" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="Inter, sans-serif">
                        {`🛡️ ${storeBrandName.slice(0, 17).toUpperCase()}`}
                      </text>
                      <text x="272" y="135" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                        VERIFIED
                      </text>
                    </g>

                    {/* Layer 4: Cryptographic Watermark & Digital Fingerprint */}
                    <text x="54" y="1056" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace" fontWeight="500">
                      {`AUTH-SIG: [${storeBrandName.replace(/\s+/g, '-').toUpperCase()}] • CERT-ID: AKSHARA-1080P-SECURED`}
                    </text>
                  </>
                )}
              </svg>

            </div>

            {/* Shopee App Feed Simulation Card */}
            {viewMode === "shopee_app" && (
              <div className="w-full max-w-[480px] bg-zinc-900 rounded-xl p-3 border border-orange-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[11px] font-medium text-orange-400">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Preview Hasil Tampilan di Aplikasi Shopee:</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-orange-500 text-slate-950 text-[9px] font-bold px-1 rounded">Mall</span>
                    <span className="font-semibold text-zinc-100 truncate">{cleanTitle}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 font-mono">
                    <span className="text-orange-400 font-bold text-sm">{price}</span>
                    <span className="text-zinc-500 text-[10px]">1,2RB Terjual</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 pt-0.5">
                    <span className="text-amber-400 flex items-center">★ 5.0</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono">Gratis Ongkir XTRA</span>
                  </div>
                </div>
              </div>
            )}

            {/* Download Action Footer */}
            <div className="w-full max-w-[480px] flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-zinc-400 font-mono">
                1080 x 1080 px • Format: PNG HD • Mode: {activeSlide === "rules" ? "Slide 2 (Rules)" : "Slide 1 (Cover)"}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleDownloadThumbnail()}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? "Merender..." : `Download ${activeSlide === "rules" ? "Slide 2" : "Slide 1"} PNG`}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Quick Showcase Card: Compare with Original High School Sample */}
          <div className="v0-card rounded-2xl p-4 border-slate-700/40 bg-zinc-950/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-500/40 flex-shrink-0">
                <img 
                  src="/samples/test_recreated_sample.png" 
                  alt="Sample Mockup" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Reinkarnasi Edisi SMA Otentik</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    Signature
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Desain bersih, minimalis, dan elegan. Tidak ada stiker atau pita neon yang mengganggu artwork game.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSampleModal(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium whitespace-nowrap transition-colors"
            >
              Perbesar
            </button>
          </div>

        </div>

      </div>

      {/* Modal: Full Resolution Sample Viewer */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Sampel Desain Asli Edisi SMA</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-mono"
              >
                [Tutup ✕]
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 block text-center">Slide 1: Cover Game</span>
                <div className="rounded-xl overflow-hidden border border-zinc-700 aspect-square">
                  <img 
                    src="/samples/test_recreated_sample.png" 
                    alt="Sons Of The Forest Sample" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 block text-center">Slide 2: Rules & Garansi</span>
                <div className="rounded-xl overflow-hidden border border-zinc-700 aspect-square">
                  <img 
                    src="/samples/rules_terms_canvas.png" 
                    alt="Rules & Terms Sample" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono text-zinc-400">
              <div className="flex justify-between">
                <span>Rasio: <strong className="text-zinc-200">1:1 Square (1080x1080 px)</strong></span>
                <span>Gaya: <strong className="text-emerald-400">Signature SMA Minimalist</strong></span>
              </div>
              <p className="text-[11px] text-zinc-500 font-sans">
                Formula desain otentik yang pernah Anda gunakan: Outer border berwarna harmonis dengan poster game, teks judul putih rapi di atas, sudut kertas terlipat (dog-ear peel), dan logo platform di pojok kanan bawah.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
