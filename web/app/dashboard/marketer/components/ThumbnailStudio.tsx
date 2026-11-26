"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import { formatCleanShopeeTitle } from "@/lib/shopeeCompliance";
import { 
  Sparkles, Download, RefreshCw, Eye, Check, Copy, 
  Layers, ShieldCheck, Tag, ShoppingBag, Monitor, 
  Image as ImageIcon, Search, CheckCircle2, Sliders, 
  ChevronDown, FileText, Palette, Wand2, Maximize2, 
  Focus, MoveVertical, HelpCircle, Shield, Lock, 
  Fingerprint, Award, Upload
} from "lucide-react";

/**
 * Auto-proxy URL eksternal agar aman dari CORS di <canvas>
 */
export function autoProxyUrl(url: string): string {
  if (!url) return "";
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("/api/image-proxy") ||
    url.startsWith("/")
  ) {
    return url;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

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
    bgUrl: "/api/image-proxy?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fstore_item_assets%2Fsteam%2Fapps%2F2456740%2Flibrary_hero.jpg"
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
    bgUrl: "/api/image-proxy?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fstore_item_assets%2Fsteam%2Fapps%2F1326470%2Flibrary_hero.jpg"
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
    bgUrl: "/api/image-proxy?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fstore_item_assets%2Fsteam%2Fapps%2F271590%2Flibrary_hero.jpg"
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
    bgUrl: "/api/image-proxy?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fstore_item_assets%2Fsteam%2Fapps%2F1817070%2Flibrary_hero.jpg"
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
    bgUrl: "/api/image-proxy?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fstore_item_assets%2Fsteam%2Fapps%2F553850%2Flibrary_hero.jpg"
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
    bgUrl: "/api/image-proxy?url=https%3A%2F%2Fstore-images.s-microsoft.com%2Fimage%2Fapps.54465.14492077886571533.be42f4bd-887b-4430-8ed0-622341b4d2b0.5054cf02-8b0f-47e2-9d15-7ddc81f63638"
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
    bgUrl: "/api/image-proxy?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fstore_item_assets%2Fsteam%2Fapps%2F2358720%2Flibrary_hero.jpg"
  }
];

interface RulesCardConfig {
  badge: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
  border: string;
  accent: string;
  titleColor: string;
  bullets: string[][];
}

const RULES_SLIDE_CARDS: RulesCardConfig[] = [
  {
    badge: "01",
    title: "KETENTUAN GARANSI",
    x: 84,
    y: 232,
    w: 444,
    h: 298,
    bg: "#F0FDF4",
    border: "#86EFAC",
    accent: "#059669",
    titleColor: "#064E3B",
    bullets: [
      ["✓ Garansi aktif 30 Hari sejak tanggal", "   pembelian & ulasan bintang 5."],
      ["✓ Klaim wajib sertakan video rekaman", "   layar (screen rec) tanpa jeda (no-cut)."],
      ["✓ Penggantian unit baru penuh sesuai", "   prosedur SOP resmi toko."],
    ],
  },
  {
    badge: "02",
    title: "LARANGAN (HANGUS)",
    x: 552,
    y: 232,
    w: 444,
    h: 298,
    bg: "#FFF1F2",
    border: "#FDA4AF",
    accent: "#E11D48",
    titleColor: "#881337",
    bullets: [
      ["✕ Dilarang ubah Negara / Region akun", "   minimal 2–4 minggu setelah terima."],
      ["✕ Dilarang ubah Email atau Password", "   tanpa konfirmasi admin terlebih dulu."],
      ["✕ Dilarang pakai cheat, mod ilegal, atau", "   melanggar ToS publisher / Shopee."],
    ],
  },
  {
    badge: "03",
    title: "KEAMANAN AKUN",
    x: 84,
    y: 554,
    w: 444,
    h: 274,
    bg: "#EEF2FF",
    border: "#A5B4FC",
    accent: "#4F46E5",
    titleColor: "#1E1B4B",
    bullets: [
      ["• Segera amankan akun mengikuti", "  panduan resmi yang dikirim admin."],
      ["• Aktifkan 2FA / Steam Guard setelah", "  akun terverifikasi berjalan lancar."],
      ["• Jangan bagikan kredensial login ke", "  pihak ketiga atau publik."],
    ],
  },
  {
    badge: "04",
    title: "TRANSAKSI & KLAIM",
    x: 552,
    y: 554,
    w: 444,
    h: 274,
    bg: "#F8FAFC",
    border: "#CBD5E1",
    accent: "#0F172A",
    titleColor: "#0F172A",
    bullets: [
      ["• Semua komunikasi, panduan & klaim", "  diproses resmi via Chat Shopee."],
      ["• Klik 'Pesanan Diterima' setelah sukses", "  login agar garansi tercatat aktif."],
      ["• Tim CS siap membantu kendala", "  instalasi & aktivasi setiap hari."],
    ],
  },
];

export interface ThumbnailStudioProps {
  externalGameTitle?: string;
  externalPlatform?: string;
  externalCategory?: string;
  externalPrice?: string;
  compact?: boolean;
  onCoverDownloaded?: () => void;
}

export default function ThumbnailStudio(props: ThumbnailStudioProps = {}) {
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
  const [bgUrl, setBgUrl] = useState<string>(
    "/api/image-proxy?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fstore_item_assets%2Fsteam%2Fapps%2F2456740%2Flibrary_hero.jpg"
  );
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
  const [artSource, setArtSource] = useState<string | null>("Multi-Source Official");

  // Anti-Theft Combined Defense Suite (4-in-1 Protection)
  const [antiTheftMode, setAntiTheftMode] = useState<"full" | "subtle" | "off">("full");
  const [storeBrandName, setStoreBrandName] = useState<string>("AKSHARA GAMING CENTER");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(28);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [viewMode, setViewMode] = useState<"canvas" | "shopee_app">("canvas");
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File Upload Handler (JPG / PNG / WebP -> Data URL bebas CORS)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToastMessage("File yang diunggah harus berupa gambar (JPG, PNG, WebP).");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBgUrl(reader.result);
        setArtSource("Local File Upload");
        setToastMessage("✅ Gambar berhasil diunggah langsung ke kanvas!");
        setTimeout(() => setToastMessage(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Global Clipboard Paste Listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setBgUrl(reader.result);
              setArtSource("Pasted from Clipboard");
              setToastMessage("📋 Gambar dari clipboard berhasil ditempel ke cover!");
              setTimeout(() => setToastMessage(null), 3500);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

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
    img.src = autoProxyUrl(url);
  };

  // Run aspect detection when background changes
  useEffect(() => {
    detectImageAspectAndAutoFit(bgUrl);
  }, [bgUrl]);

  // Auto-fetch real official artwork from Multi-Source Official Engine
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
        const sourceLabel = json.source_label || (json.source === "steam_official_cdn" 
          ? "Valve Steam Store CDN" 
          : "Official Developer Press Kit");
        setArtSource(sourceLabel);
        if (autoSelectPrimary && json.primary_bg) {
          setBgUrl(json.primary_bg);
        }
        setToastMessage(`🎮 Ditemukan ${json.artworks.length} artwork resmi untuk "${json.official_title || query}" (${sourceLabel})!`);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setAvailableArtworks([]);
        setToastMessage(json.message || "Artwork otomatis belum tersedia. Silakan upload gambar atau tekan Ctrl+V.");
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error("Gagal mengambil artwork resmi:", err);
    } finally {
      setIsSearchingArt(false);
    }
  };

  // Populate initial artwork on mount if no external game title is provided
  useEffect(() => {
    if (!props.externalGameTitle) {
      handleFetchOfficialArtwork("inZOI", false);
    }
  }, []);

  // Synchronize with external props (e.g. from Shopee Launchpad)
  useEffect(() => {
    if (!props.externalGameTitle) return;

    const title = props.externalGameTitle.trim();
    setGameTitle(title);

    const rawPlat = (props.externalPlatform || "").toLowerCase();
    const rawCat = props.externalCategory || "";
    const rawTitle = title.toLowerCase();

    // Auto-detect platform badge & frame color
    let detectedBadge = "steam";
    let detectedFrame = "#1897fe"; // Sky Blue default

    if (rawPlat.includes("mojang") || rawTitle.includes("minecraft")) {
      detectedBadge = "mojang";
      detectedFrame = "#10b981"; // Emerald
    } else if (rawPlat.includes("rockstar") || rawTitle.includes("grand theft auto") || rawTitle.includes("gta") || rawTitle.includes("red dead")) {
      detectedBadge = "rockstar";
      detectedFrame = "#191013"; // Dark Graphite
    } else if (/\b(ea|ea app|electronic arts|origin)\b/i.test(rawPlat) || rawTitle.includes("fifa") || rawTitle.includes("fc 25") || rawTitle.includes("fc25")) {
      detectedBadge = "ea";
      detectedFrame = "#1e3a8a"; // EA FC Blue
    } else if (rawPlat.includes("xbox") || rawPlat.includes("microsoft")) {
      detectedBadge = "xbox";
      detectedFrame = "#107c10"; // Xbox Green
    } else if (rawPlat.includes("playstation") || rawPlat.includes("psn") || rawPlat.includes("ps4") || rawPlat.includes("ps5")) {
      detectedBadge = "playstation";
      detectedFrame = "#003791"; // PlayStation Blue
    } else if (rawPlat.includes("epic")) {
      detectedBadge = "epic";
      detectedFrame = "#191013";
    } else if (rawPlat.includes("ubisoft")) {
      detectedBadge = "ubisoft";
      detectedFrame = "#0055ff";
    } else if (rawPlat.includes("battle") || rawPlat.includes("blizzard")) {
      detectedBadge = "battlenet";
      detectedFrame = "#002244";
    } else if (rawPlat.includes("netflix") || rawTitle.includes("netflix")) {
      detectedBadge = "netflix";
      detectedFrame = "#e50914";
    } else if (rawPlat.includes("capcut") || rawTitle.includes("capcut")) {
      detectedBadge = "capcut";
      detectedFrame = "#000000";
    } else if (rawTitle.includes("wukong")) {
      detectedBadge = "steam";
      detectedFrame = "#26211c";
    } else if (rawTitle.includes("forest")) {
      detectedBadge = "steam";
      detectedFrame = "#2a4034";
    } else if (rawTitle.includes("spider-man")) {
      detectedBadge = "steam";
      detectedFrame = "#3d1a1a";
    } else if (rawTitle.includes("helldivers")) {
      detectedBadge = "steam";
      detectedFrame = "#1f607e";
    }

    setPlatformBadge(detectedBadge);
    setFrameColor(detectedFrame);
    setSuggestedPalettes([detectedFrame, "#141414", "#0f1e36", "#a82020"]);

    if (props.externalPlatform) {
      setPlatform(props.externalPlatform);
    }
    if (rawCat) {
      setCategory(rawCat);
    }
    if (props.externalPrice) {
      setPrice(props.externalPrice);
    }

    setCleanTitle(
      formatCleanShopeeTitle({
        title,
        platform: props.externalPlatform || "Steam",
        category: rawCat,
      })
    );

    handleFetchOfficialArtwork(title, true);
  }, [props.externalGameTitle, props.externalPlatform, props.externalCategory, props.externalPrice]);

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
        const sourceLabel = artJson.source_label || (artJson.source === "steam_official_cdn"
          ? "Valve Steam CDN"
          : "Official Developer Press Kit");
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
  // HIGH-RESOLUTION 1080x1080 CANVAS ENGINE & EXPORT SUITE
  // =========================================================================
  const renderSlideCanvas = async (slideTarget?: "cover" | "rules"): Promise<HTMLCanvasElement | null> => {
    const currentSlide = slideTarget || activeSlide;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Base Solid Frame Color
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Header Title at Top Margin (x=54, y=64)
    const topTitle = currentSlide === "rules" ? "ATURAN & GARANSI RESMI" : cleanTitle;
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
        img.src = autoProxyUrl(bgUrl);
      });

    } else {
      // Slide 2: Crisp Structured Editorial Rules & Terms Sheet
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(54, 100, 972, 926);

      // Top Header Ribbon (x: 54..1026, y: 100..212)
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(54, 100, 972, 112);
      ctx.fillStyle = "#E2E8F0";
      ctx.fillRect(54, 211, 972, 2);

      // Brand Eyebrow Pill
      ctx.fillStyle = "#0F172A";
      ctx.beginPath();
      ctx.roundRect(84, 118, 430, 26, 6);
      ctx.fill();
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "bold 12px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`SYARAT & KETENTUAN • ${storeBrandName.toUpperCase()}`, 96, 131);

      // Main Banner Title & Subtitle
      ctx.fillStyle = "#0F172A";
      ctx.font = "800 28px 'Inter', sans-serif";
      ctx.fillText("PANDUAN GARANSI & ATURAN AKUN RESMI", 84, 166);
      ctx.fillStyle = "#475569";
      ctx.font = "500 15px 'Inter', sans-serif";
      ctx.fillText("Wajib dibaca sebelum memesan agar masa garansi penuh tetap berlaku tanpa kendala.", 84, 195);

      // Render 4 Structured Modular Cards
      for (const card of RULES_SLIDE_CARDS) {
        ctx.fillStyle = card.bg;
        ctx.strokeStyle = card.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(card.x, card.y, card.w, card.h, 18);
        ctx.fill();
        ctx.stroke();

        // Card Header Number Badge
        ctx.fillStyle = card.accent;
        ctx.beginPath();
        ctx.roundRect(card.x + 22, card.y + 20, 38, 28, 8);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(card.badge, card.x + 41, card.y + 34);

        // Card Title
        ctx.fillStyle = card.titleColor;
        ctx.font = "800 20px 'Inter', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(card.title, card.x + 72, card.y + 34);

        // Divider Line
        ctx.fillStyle = card.border;
        ctx.fillRect(card.x + 22, card.y + 62, card.w - 44, 1.5);

        // Bullet Lines
        ctx.fillStyle = "#1E293B";
        ctx.font = "600 16.5px 'Inter', sans-serif";
        let cy = card.y + 92;
        for (const bullet of card.bullets) {
          for (let li = 0; li < bullet.length; li++) {
            ctx.fillText(bullet[li], card.x + 22, cy);
            cy += 24;
          }
          cy += 14;
        }
      }

      // Bottom Footer CTA Banner (x: 84, w: 745 -> safely avoids bottom-right 860,1026 curl!)
      ctx.fillStyle = "#0F172A";
      ctx.beginPath();
      ctx.roundRect(84, 852, 745, 136, 18);
      ctx.fill();
      ctx.fillStyle = "#34D399";
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🛡️ PERLINDUNGAN KONSUMEN & GARANSI DIGITAL", 112, 886);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px 'Inter', sans-serif";
      ctx.fillText("Butuh Bantuan atau Klaim Garansi?", 112, 922);
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "500 15.5px 'Inter', sans-serif";
      ctx.fillText("Hubungi CS Shopee Chat & siapkan No. Pesanan + Video Rekam Layar No-Cut.", 112, 956);
    }

    // --- COMBINED ANTI-THEFT: INNER OVERLAYS (INSIDE POSTER CLIP) ---
    if (antiTheftMode !== "off") {
      // Layer 1: Micro-Security Nano-Text Guilloche Border (Banknote-style microprint)
      ctx.save();
      ctx.font = "600 10px 'Courier New', monospace";
      ctx.fillStyle = currentSlide === "rules" ? "rgba(15, 23, 42, 0.22)" : "rgba(255, 255, 255, 0.35)";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const microTop = `• ${storeBrandName.toUpperCase()} OFFICIAL LICENSED STORE • AUTHENTIC PRODUCT • DO NOT COPY • `.repeat(4);
      ctx.fillText(microTop, 62, 106);

      const microBottom = `• SECURED FOR ${storeBrandName.toUpperCase()} • ANTI-FRAUD VERIFIED • ALL RIGHTS RESERVED • `.repeat(3);
      ctx.fillText(microBottom, 62, 1012);
      ctx.restore();

      // Layer 3: Anti-AI Watermark Removal Poisoning (keep Slide 2 very subtle so rules stay crisp)
      if (antiTheftMode === "full") {
        ctx.save();
        ctx.translate(540, 560);
        ctx.rotate((-35 * Math.PI) / 180);
        const poisonAlpha = (watermarkOpacity / 100) * 0.35;
        ctx.fillStyle = currentSlide === "rules" ? `rgba(15, 23, 42, ${poisonAlpha * 0.18})` : `rgba(255, 255, 255, ${poisonAlpha})`;
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
      // Layer 2: Holographic Store Trust Seal (Top-Right on Rules slide so banner pill stays clear)
      ctx.save();
      const sealW = 248;
      const sealX = currentSlide === "rules" ? 748 : 66;
      const sealY = 114;
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
      ctx.font = "bold 10.5px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`🛡️ ${storeBrandName.slice(0, 22).toUpperCase()}`, sealX + 10, sealY + sealH / 2);

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

    return canvas;
  };

  // =========================================================================
  // DOWNLOAD & CLIPBOARD HANDLERS
  // =========================================================================
  const handleDownloadThumbnail = async (slideTarget?: "cover" | "rules") => {
    const currentSlide = slideTarget || activeSlide;
    setIsDownloading(true);
    try {
      const canvas = await renderSlideCanvas(currentSlide);
      if (!canvas) return;

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const fileSlug = (activePreset || gameTitle || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const slideSlug = currentSlide === "rules" ? "slide2-rules-garansi" : "slide1-cover-utama";
      a.download = `akshara-${fileSlug}-${slideSlug}-1080x1080.png`;
      a.click();

      props.onCoverDownloaded?.();

      setToastMessage(`✅ Berhasil mengunduh ${currentSlide === "rules" ? "Slide 2 (Rules & Terms)" : "Slide 1 (Cover Game)"} 1080x1080 PNG!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Canvas export failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyImageToClipboard = async () => {
    setIsCopyingImage(true);
    try {
      const canvas = await renderSlideCanvas(activeSlide);
      if (!canvas) throw new Error("Gagal merender canvas");

      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengekspor gambar ke blob"));
            return;
          }
          try {
            if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob })
              ]);
              props.onCoverDownloaded?.();
              setToastMessage("📋 Cover berhasil disalin ke clipboard! Siap dipaste (Ctrl+V) ke Shopee Seller Center.");
              setTimeout(() => setToastMessage(null), 4000);
              resolve();
            } else {
              // Fallback jika ClipboardItem tidak didukung browser
              const dataUrl = canvas.toDataURL("image/png");
              const a = document.createElement("a");
              a.href = dataUrl;
              a.download = `akshara-${(gameTitle || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cover.png`;
              a.click();
              props.onCoverDownloaded?.();
              setToastMessage("📋 Fitur salin gambar langsung tidak didukung browser. Cover otomatis diunduh!");
              setTimeout(() => setToastMessage(null), 4000);
              resolve();
            }
          } catch (clipErr) {
            console.warn("ClipboardItem write failed, fallback download:", clipErr);
            const dataUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `akshara-${(gameTitle || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cover.png`;
            a.click();
            props.onCoverDownloaded?.();
            setToastMessage("📋 Cover otomatis diunduh sebagai alternatif clipboard!");
            setTimeout(() => setToastMessage(null), 4000);
            resolve();
          }
        }, "image/png");
      });
    } catch (err) {
      console.error("Gagal menyalin gambar:", err);
      setToastMessage("Gagal menyalin gambar ke clipboard.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsCopyingImage(false);
    }
  };

  // Download both slides sequentially
  const handleDownloadBothSlides = async () => {
    await handleDownloadThumbnail("cover");
    setTimeout(async () => {
      await handleDownloadThumbnail("rules");
      props.onCoverDownloaded?.();
    }, 1200);
  };

  // Active badge metadata
  const currentBadge = PLATFORM_BADGE_OPTIONS.find(b => b.id === platformBadge) || PLATFORM_BADGE_OPTIONS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-white border border-emerald-300 text-slate-900 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 font-semibold">Siap Pakai</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTONOMOUS AI DESIGN COMMAND BAR / COMPACT LAUNCHPAD STRIP                */}
      {/* ========================================================================= */}
      {props.compact ? (
        <div className="app-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="font-bold text-slate-900">
                Studio Cover 1080x1080: <strong className="text-emerald-700">{gameTitle}</strong>
              </span>
              <span className="text-slate-500 text-[11px] ml-2 font-mono">
                [{platformBadge.toUpperCase()} • {availableArtworks.length} {artSource || "Official Artwork"}]
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleCopyImageToClipboard()}
              disabled={isDownloading || isCopyingImage}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isCopyingImage ? "Menyalin..." : "Salin Gambar"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadThumbnail()}
              disabled={isDownloading || isCopyingImage}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? "Merender..." : "Download PNG"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="app-card p-6 space-y-4">
          {/* Header bar with Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 min-w-0">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <Wand2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  <span>AI Thumbnail Studio</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold whitespace-nowrap">
                    Autonomous 1-Input Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Ketik nama game / produk apa saja. AI otomatis meriset cover resmi, warna bingkai, logo brand, dan aturan garansi.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowSampleModal(true)}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Sampel Asli SMA</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyImageToClipboard()}
                disabled={isDownloading || isCopyingImage}
                className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isCopyingImage ? "Menyalin..." : "Salin Gambar"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadThumbnail()}
                disabled={isDownloading || isCopyingImage}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>{isDownloading ? "Merender..." : "Download 1080x1080 PNG"}</span>
              </button>
            </div>
          </div>

        {/* Command Search Input Bar */}
        <div className="space-y-3 min-w-0 w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAutonomousAiDesign();
            }}
            className="flex flex-col sm:flex-row items-stretch gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={aiSearchInput}
                onChange={(e) => setAiSearchInput(e.target.value)}
                placeholder="Ketik nama game atau software (contoh: GTA V, Black Myth Wukong, Minecraft, Netflix, CapCut, Elden Ring)..."
                className="w-full pl-10 pr-8 py-2.5 rounded-lg bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 placeholder-slate-400 transition-all font-medium"
              />
              {aiSearchInput && (
                <button
                  type="button"
                  onClick={() => setAiSearchInput("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "AI Sedang Meriset & Mendesain..." : "⚡ Riset & Desain Otomatis"}</span>
            </button>
          </form>

          {/* Quick 1-Click Game Shortcuts */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:overflow-x-auto pb-1 scrollbar-thin text-xs min-w-0 max-w-full">
            <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap mr-1">
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
                className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 disabled:opacity-50 font-semibold"
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
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live AI Decision Telemetry HUD */}
        {aiReasoning && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-900 text-xs">
                  Keputusan AI untuk: <strong className="text-emerald-700">{gameTitle}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span>Platform: <strong className="text-slate-800 font-semibold">{platformBadge.toUpperCase()}</strong></span>
                <span>•</span>
                <span>Harga: <strong className="text-slate-800 font-semibold tabular-nums">{price}</strong></span>
                <span>•</span>
                <span>Artwork: <strong className="text-emerald-700 font-semibold">{availableArtworks.length} Resmi</strong></span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] text-slate-600">
              <p className="leading-relaxed text-slate-600 max-w-2xl">
                {aiReasoning}
              </p>

              {/* Quick Frame Color Swatches */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-slate-500 font-medium">Warna Frame:</span>
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white border border-slate-200">
                  {suggestedPalettes.map((hex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFrameColor(hex)}
                      title={`Ganti frame ke ${hex}`}
                      className={`w-5 h-5 rounded-md transition-all border ${
                        frameColor.toLowerCase() === hex.toLowerCase()
                          ? "border-slate-900 scale-110 shadow-xs"
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
      )}

      {/* ========================================================================= */}
      {/* SLIDE SWITCHER TABS: SLIDE 1 (COVER GAME) vs SLIDE 2 (RULES & TERMS)       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSlide("cover")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeSlide === "cover"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
            <span>Slide 1: Cover Game Utama</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSlide("rules")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeSlide === "rules"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>Slide 2: Rules & Terms / Garansi Toko</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleDownloadBothSlides()}
            disabled={isDownloading}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
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
          <div className="app-card p-5 space-y-4 text-xs">
            
            {/* Input 1: Judul Produk Game */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-semibold flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">1</span>
                  Nama Game
                </label>
                <button
                  type="button"
                  onClick={() => handleFetchOfficialArtwork(gameTitle, true)}
                  disabled={isSearchingArt}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>{isSearchingArt ? "Mencari..." : "Cari Cover Resmi"}</span>
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
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              />
            </div>

            {/* Input 2: Background Game Resmi (Strict Non-AI) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-semibold flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">2</span>
                  Pilih Cover Resmi (Multi-Sumber)
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {artSource || "Official Artwork"}
                </span>
              </div>

              {/* Artworks Visual Gallery */}
              {availableArtworks.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>{availableArtworks.length} Pilihan Artwork Resmi:</span>
                    <span className="text-emerald-700 font-bold">{artSource || "Multi-Source Official"}</span>
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
                              ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.02]"
                              : "border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={art.thumbnail || art.url}
                            alt={art.label}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold z-10 shadow">
                              ✓
                            </span>
                          )}

                          <div className="relative z-10 space-y-0.5">
                            <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/80 text-white block truncate font-medium">
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
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200 shadow-sm"
                >
                  <Search className={`w-3.5 h-3.5 text-emerald-600 ${isSearchingArt ? "animate-spin" : ""}`} />
                  <span>Ambil Cover Resmi (Multi-Sumber)</span>
                </button>
              )}

              {/* Custom Image URL / Upload / Paste Controls */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bgUrl}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setBgUrl(val);
                      if (val) setArtSource("Custom Image URL");
                    }}
                    placeholder="Atau tempel URL gambar custom (JPG / PNG / WebP)"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <label className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>💡 Tips: Anda juga bisa copy gambar dari web lalu tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold">Ctrl+V</kbd> untuk paste instan!</span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* AI SMART IMAGE AUTO-FIT ENGINE (LANDSCAPE & CUSTOM IMAGES)                */}
            {/* ========================================================================= */}
            <div className="pt-3 border-t border-slate-200 space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI Smart Image Auto-Fit</span>
                </div>
                {detectedAspect && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {detectedAspect}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mencegah gambar landscape 16:9 atau banner gepeng dan terpotong di dalam kotak 1:1.
              </p>

              {/* Fit Mode Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFitMode("ambient_blur")}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-0.5 shadow-sm ${
                    fitMode === "ambient_blur"
                      ? "bg-white border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500/30"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Maximize2 className="w-3 h-3 text-emerald-600" />
                    <span>Ambient Blur (Utuh 100%)</span>
                  </div>
                  <span className="text-[9px] text-slate-500">Poster di tengah, latar blur senada</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFitMode("focal_crop")}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-0.5 shadow-sm ${
                    fitMode === "focal_crop"
                      ? "bg-white border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500/30"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Focus className="w-3 h-3 text-emerald-600" />
                    <span>Focal Crop (Penuh Kotak)</span>
                  </div>
                  <span className="text-[9px] text-slate-500">Crop fokus karakter/wajah</span>
                </button>
              </div>

              {/* Controls for Focal Crop Mode */}
              {fitMode === "focal_crop" && (
                <div className="space-y-2 pt-1 border-t border-slate-200 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Titik Fokus Gambar:</span>
                    <div className="flex items-center gap-1">
                      {(["top", "center", "bottom"] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setFocalPosition(pos)}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            focalPosition === pos
                              ? "bg-emerald-600 text-white font-bold"
                              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {pos === "top" ? "Atas" : pos === "center" ? "Tengah" : "Bawah"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600 text-[10px] font-medium whitespace-nowrap">Zoom ({zoomLevel}%):</span>
                    <input 
                      type="range" 
                      min="100" 
                      max="180" 
                      value={zoomLevel} 
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600 text-[10px] font-medium whitespace-nowrap">Geser Vertikal:</span>
                    <input 
                      type="range" 
                      min="-25" 
                      max="25" 
                      value={panY} 
                      onChange={(e) => setPanY(Number(e.target.value))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Input 3: Estimasi Harga */}
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <label className="text-slate-800 font-semibold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">3</span>
                Estimasi Harga Jual (Rp)
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Rp 249.900"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold tabular-nums focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* ========================================================================= */}
            {/* SIGNATURE CUSTOMIZATIONS: TITLE, FRAME COLOR, & HARDENED BADGES           */}
            {/* ========================================================================= */}
            <div className="pt-3 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-600" />
                  Kustomisasi Signature Classic SMA
                </span>
                <span className="text-[10px] text-slate-500">100% Sesuai Sampel Asli</span>
              </div>

              {/* Header Clean Title */}
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold text-[11px]">
                  {activeSlide === "rules" ? "Judul Slide Garansi:" : "Teks Header Bersih (Atas):"}
                </label>
                {activeSlide === "cover" ? (
                  <input
                    type="text"
                    value={cleanTitle}
                    onChange={(e) => setCleanTitle(e.target.value)}
                    placeholder="Contoh: Sons Of The Forest (Steam) - Private"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs">
                    RULES & TERMS
                  </div>
                )}
              </div>

              {/* Frame Color Swatches & Custom Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold text-[11px]">
                    Warna Bingkai Luar (Harmonis):
                  </label>
                  <span className="font-mono text-[10px] text-slate-500">{frameColor}</span>
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
                          ? "ring-2 ring-slate-900 border-white scale-110 z-10 shadow-xs"
                          : "border-black/20 hover:scale-105"
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
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Hardened Platform Badge Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold text-[11px]">
                    Emblem Platform Resmi:
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase">
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
                        className={`p-2 rounded-lg border flex items-center gap-2 transition-all text-left shadow-xs ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          <img 
                            src={badge.asset} 
                            alt={badge.name} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 truncate">
                          {badge.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipe Akses Quick Buttons */}
              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold text-[11px]">
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all shadow-xs ${
                        accessType === t
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
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
              <div className="pt-3 border-t border-slate-200 space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Sistem Anti-Maling & Hak Cipta
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    4-in-1 Suite
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
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
                      className={`p-1.5 rounded-lg border text-center transition-all shadow-xs ${
                        antiTheftMode === m.id
                          ? "bg-white border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500/30"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[11px] font-bold">{m.label}</div>
                      <div className="text-[9px] text-slate-500">{m.desc}</div>
                    </button>
                  ))}
                </div>

                {antiTheftMode !== "off" && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200 text-[11px]">
                    {/* Brand Name Input */}
                    <div className="space-y-1">
                      <label className="text-slate-700 font-semibold text-[10px] flex items-center justify-between">
                        <span>Nama Brand / Toko Anda:</span>
                        <span className="text-emerald-700 font-semibold text-[9px]">Stempel Otomatis</span>
                      </label>
                      <input
                        type="text"
                        value={storeBrandName}
                        onChange={(e) => setStoreBrandName(e.target.value)}
                        placeholder="AKSHARA GAMING CENTER"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 uppercase tracking-wide"
                      />
                    </div>

                    {/* Watermark Opacity Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">Intensitas Segel & Watermark:</span>
                        <span className="font-semibold text-emerald-700">{watermarkOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="60"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                        className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Active Layers Checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-slate-700">
                      <div className="flex items-center gap-1 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Hologram Seal</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Micro-Guilloche</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                        <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${antiTheftMode === "full" ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className={`truncate ${antiTheftMode === "full" ? "" : "text-slate-400"}`}>Anti-AI Poison</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
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
          <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">Pratinjau:</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-emerald-800 border border-slate-200 shadow-2xs">
                {activeSlide === "rules" ? "Slide 2: Garansi & SOP" : "Slide 1: Cover Game"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("canvas")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "canvas"
                    ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Kanvas 1:1 Bersih
              </button>
              <button
                type="button"
                onClick={() => setViewMode("shopee_app")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "shopee_app"
                    ? "bg-orange-500 text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Simulasi Shopee</span>
              </button>
            </div>
          </div>

          {/* The Canvas Preview Box */}
          <div className="app-card p-5 flex flex-col items-center justify-center space-y-4 bg-slate-50">
            
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
                  {activeSlide === "rules" ? "ATURAN & GARANSI RESMI" : cleanTitle}
                </text>

                {/* 3. Inner Poster or Rules Card */}
                {activeSlide === "cover" ? (
                  <g clipPath="url(#innerPosterClip)">
                    {fitMode === "ambient_blur" ? (
                      <>
                        {/* Layer 1: Ambient Blurred Background */}
                        <image 
                          href={autoProxyUrl(bgUrl)} 
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
                          href={autoProxyUrl(bgUrl)} 
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
                        href={autoProxyUrl(bgUrl)} 
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
                  /* Slide 2: Structured Editorial Rules & Terms Sheet (1:1 synced with Canvas PNG) */
                  <g clipPath="url(#innerPosterClip)">
                    <rect x="54" y="100" width="972" height="926" fill="#ffffff" />

                    {/* Top Header Ribbon */}
                    <rect x="54" y="100" width="972" height="112" fill="#F8FAFC" />
                    <rect x="54" y="211" width="972" height="2" fill="#E2E8F0" />
                    <rect x="84" y="118" width="430" height="26" rx="6" fill="#0F172A" />
                    <text x="96" y="135" fill="#F8FAFC" fontSize="12" fontWeight="bold" fontFamily="Inter, sans-serif">
                      {`SYARAT & KETENTUAN • ${storeBrandName.toUpperCase()}`}
                    </text>
                    <text x="84" y="175" fill="#0F172A" fontSize="28" fontWeight="800" fontFamily="Inter, sans-serif">
                      PANDUAN GARANSI &amp; ATURAN AKUN RESMI
                    </text>
                    <text x="84" y="200" fill="#475569" fontSize="15" fontWeight="500" fontFamily="Inter, sans-serif">
                      Wajib dibaca sebelum memesan agar masa garansi penuh tetap berlaku tanpa kendala.
                    </text>

                    {/* 4 Modular Structured Cards */}
                    {RULES_SLIDE_CARDS.map((card) => {
                      let lineCursor = card.y + 92;
                      return (
                        <g key={card.badge}>
                          <rect
                            x={card.x}
                            y={card.y}
                            width={card.w}
                            height={card.h}
                            rx="18"
                            fill={card.bg}
                            stroke={card.border}
                            strokeWidth="2"
                          />
                          <rect x={card.x + 22} y={card.y + 20} width="38" height="28" rx="8" fill={card.accent} />
                          <text
                            x={card.x + 41}
                            y={card.y + 39}
                            fill="#FFFFFF"
                            fontSize="14"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono, monospace"
                            textAnchor="middle"
                          >
                            {card.badge}
                          </text>
                          <text
                            x={card.x + 72}
                            y={card.y + 40}
                            fill={card.titleColor}
                            fontSize="20"
                            fontWeight="800"
                            fontFamily="Inter, sans-serif"
                          >
                            {card.title}
                          </text>
                          <rect x={card.x + 22} y={card.y + 62} width={card.w - 44} height="1.5" fill={card.border} />

                          {card.bullets.map((bullet, bi) => {
                            const items = bullet.map((lineText) => {
                              const currentY = lineCursor;
                              lineCursor += 24;
                              return (
                                <text
                                  key={`${bi}-${currentY}`}
                                  x={card.x + 22}
                                  y={currentY + 5}
                                  fill="#1E293B"
                                  fontSize="16.5"
                                  fontWeight="600"
                                  fontFamily="Inter, sans-serif"
                                >
                                  {lineText}
                                </text>
                              );
                            });
                            lineCursor += 14;
                            return items;
                          })}
                        </g>
                      );
                    })}

                    {/* Bottom Footer CTA Banner */}
                    <rect x="84" y="852" width="745" height="136" rx="18" fill="#0F172A" />
                    <text x="112" y="891" fill="#34D399" fontSize="14" fontWeight="bold" fontFamily="Inter, sans-serif">
                      🛡️ PERLINDUNGAN KONSUMEN &amp; GARANSI DIGITAL
                    </text>
                    <text x="112" y="928" fill="#FFFFFF" fontSize="22" fontWeight="bold" fontFamily="Inter, sans-serif">
                      Butuh Bantuan atau Klaim Garansi?
                    </text>
                    <text x="112" y="961" fill="#CBD5E1" fontSize="15.5" fontWeight="500" fontFamily="Inter, sans-serif">
                      Hubungi CS Shopee Chat &amp; siapkan No. Pesanan + Video Unboxing No-Cut.
                    </text>

                    {/* --- ANTI-THEFT: INSIDE POSTER CLIP (Rules Slide) --- */}
                    {antiTheftMode !== "off" && (
                      <>
                        <text x="62" y="114" fill="rgba(15,23,42,0.22)" fontSize="10" fontFamily="monospace" fontWeight="600" letterSpacing="1px">
                          {`• ${storeBrandName.toUpperCase()} OFFICIAL LICENSED STORE • AUTHENTIC PRODUCT • DO NOT COPY • `.repeat(3)}
                        </text>
                        <text x="62" y="1016" fill="rgba(15,23,42,0.22)" fontSize="10" fontFamily="monospace" fontWeight="600" letterSpacing="1px">
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
                      <rect
                        x={activeSlide === "rules" ? 748 : 66}
                        y="114"
                        width="248"
                        height="34"
                        rx="8"
                        fill="rgba(10, 15, 29, 0.88)"
                        stroke="url(#holoGrad)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={activeSlide === "rules" ? 758 : 76}
                        y="135"
                        fill="#ffffff"
                        fontSize="10.5"
                        fontWeight="bold"
                        fontFamily="Inter, sans-serif"
                      >
                        {`🛡️ ${storeBrandName.slice(0, 22).toUpperCase()}`}
                      </text>
                      <text
                        x={activeSlide === "rules" ? 988 : 306}
                        y="135"
                        fill="#10b981"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
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
              <div className="w-full max-w-[480px] bg-white rounded-xl p-3 border border-orange-200 shadow-sm space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-orange-700">
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                  <span>Preview Hasil Tampilan di Aplikasi Shopee:</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#ee4d2d] text-white text-[9px] font-bold px-1 rounded">Mall</span>
                    <span className="font-semibold text-slate-900 truncate">{cleanTitle}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 font-mono">
                    <span className="text-[#ee4d2d] font-bold text-sm tabular-nums">{price}</span>
                    <span className="text-slate-500 text-[10px]">1,2RB Terjual</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                    <span className="text-amber-500 flex items-center">★ 5.0</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">Gratis Ongkir XTRA</span>
                  </div>
                </div>
              </div>
            )}

            {/* Download Action Footer */}
            <div className="w-full max-w-[480px] flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">
                1080 x 1080 px • Format: PNG HD • Mode: {activeSlide === "rules" ? "Slide 2 (Rules)" : "Slide 1 (Cover)"}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleCopyImageToClipboard()}
                  disabled={isDownloading || isCopyingImage}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  title="Salin gambar langsung ke clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isCopyingImage ? "Menyalin..." : "Salin Gambar"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadThumbnail()}
                  disabled={isDownloading || isCopyingImage}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? "Merender..." : `Download ${activeSlide === "rules" ? "Slide 2" : "Slide 1"} PNG`}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Quick Showcase Card: Compare with Original High School Sample */}
          {!props.compact && (
            <div className="app-card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-xs">
                  <img 
                    src="/samples/test_recreated_sample.png" 
                    alt="Sample Mockup" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Reinkarnasi Edisi SMA Otentik</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Signature
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Desain bersih, minimalis, dan elegan. Tidak ada stiker atau pita neon yang mengganggu artwork game.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSampleModal(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap transition-colors"
              >
                Perbesar
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Modal: Full Resolution Sample Viewer */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Sampel Desain Asli Edisi SMA</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                [Tutup ✕]
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-500 block text-center">Slide 1: Cover Game</span>
                <div className="rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-sm">
                  <img 
                    src="/samples/test_recreated_sample.png" 
                    alt="Sons Of The Forest Sample" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-500 block text-center">Slide 2: Rules & Garansi</span>
                <div className="rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-sm">
                  <img 
                    src="/samples/rules_terms_canvas.png" 
                    alt="Rules & Terms Sample" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Rasio: <strong className="text-slate-900">1:1 Square (1080x1080 px)</strong></span>
                <span>Gaya: <strong className="text-emerald-700">Signature SMA Minimalist</strong></span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Formula desain otentik yang pernah Anda gunakan: Outer border berwarna harmonis dengan poster game, teks judul putih rapi di atas, sudut kertas terlipat (dog-ear peel), dan logo platform di pojok kanan bawah.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
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
