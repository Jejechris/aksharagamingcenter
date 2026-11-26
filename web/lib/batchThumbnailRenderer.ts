/**
 * Browser Canvas Batch Renderer untuk Shopee Mass Upload Studio.
 * Menghasilkan Cover 1080x1080 (Slide 1) yang 100% konsisten dengan style otentik
 * ThumbnailStudio (frame harmonis dominan poster, Ambient Blur Smart Fit tanpa memotong poster,
 * pill AKSHARA GAMING CENTER VERIFIED, micro-security guilloche border, dog-ear corner peel,
 * dan badge platform di pojok kanan bawah) serta Slide 2 (Aturan & Garansi Resmi Digital).
 */

const PLATFORM_THEME_MAP: Record<
  string,
  { frame: string; badgeAsset: string; shape: "circle" | "squircle" | "shield" }
> = {
  minecraft: { frame: "#059669", badgeAsset: "/assets/platforms/mojang.svg", shape: "squircle" },
  mojang: { frame: "#059669", badgeAsset: "/assets/platforms/mojang.svg", shape: "squircle" },
  xbox: { frame: "#107c10", badgeAsset: "/assets/platforms/xbox.svg", shape: "circle" },
  microsoft: { frame: "#0078d4", badgeAsset: "/assets/platforms/xbox.svg", shape: "circle" },
  rockstar: { frame: "#b45309", badgeAsset: "/assets/platforms/rockstar.svg", shape: "squircle" },
  ea: { frame: "#1e3a8a", badgeAsset: "/assets/platforms/ea.svg", shape: "circle" },
  epic: { frame: "#1e293b", badgeAsset: "/assets/platforms/epic.svg", shape: "shield" },
  playstation: { frame: "#003791", badgeAsset: "/assets/platforms/playstation.svg", shape: "circle" },
  ubisoft: { frame: "#0055ff", badgeAsset: "/assets/platforms/ubisoft.svg", shape: "circle" },
  battlenet: { frame: "#0f172a", badgeAsset: "/assets/platforms/battlenet.svg", shape: "circle" },
  valorant: { frame: "#9f1239", badgeAsset: "/assets/platforms/valorant.svg", shape: "squircle" },
  roblox: { frame: "#0f172a", badgeAsset: "/assets/platforms/roblox.svg", shape: "squircle" },
  steam: { frame: "#1e40af", badgeAsset: "/assets/platforms/steam.svg", shape: "circle" },
};

function resolveTheme(title: string, platform: string) {
  const low = `${title} ${platform}`.toLowerCase();
  // Game-specific curated frame colors first (matches ThumbnailStudio aesthetic)
  if (low.includes("minecraft") || low.includes("mojang")) {
    return { ...PLATFORM_THEME_MAP.minecraft, frame: "#059669", preferCuratedColor: true };
  }
  if (/grand theft auto|\bgta\b/i.test(low)) {
    return { ...PLATFORM_THEME_MAP.rockstar, frame: "#18181B", preferCuratedColor: true };
  }
  if (/red dead/i.test(low)) {
    return { ...PLATFORM_THEME_MAP.rockstar, frame: "#881337", preferCuratedColor: true };
  }
  if (/wukong/i.test(low)) {
    return { ...PLATFORM_THEME_MAP.steam, frame: "#1E3A8A", preferCuratedColor: true };
  }
  if (/terraria/i.test(low)) {
    return { ...PLATFORM_THEME_MAP.steam, frame: "#047857", preferCuratedColor: true };
  }
  if (/\b(rockstar)\b/i.test(low)) return { ...PLATFORM_THEME_MAP.rockstar, preferCuratedColor: false };
  if (/\b(ea|ea app|electronic arts|ea sports|fifa|fc\s?2[456])\b/i.test(low)) {
    return { ...PLATFORM_THEME_MAP.ea, preferCuratedColor: false };
  }
  if (low.includes("xbox") || low.includes("microsoft")) return { ...PLATFORM_THEME_MAP.xbox, preferCuratedColor: false };
  if (low.includes("playstation") || /\bps[45n]\b/i.test(low)) {
    return { ...PLATFORM_THEME_MAP.playstation, preferCuratedColor: false };
  }
  if (/\bepic\b/i.test(low)) return { ...PLATFORM_THEME_MAP.epic, preferCuratedColor: false };
  if (low.includes("ubisoft")) return { ...PLATFORM_THEME_MAP.ubisoft, preferCuratedColor: false };
  if (low.includes("battle.net") || low.includes("blizzard")) return { ...PLATFORM_THEME_MAP.battlenet, preferCuratedColor: false };
  if (low.includes("valorant") || low.includes("riot")) return { ...PLATFORM_THEME_MAP.valorant, preferCuratedColor: false };
  if (low.includes("roblox")) return { ...PLATFORM_THEME_MAP.roblox, preferCuratedColor: false };
  return { ...PLATFORM_THEME_MAP.steam, preferCuratedColor: false };
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 7000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Ekstrak warna border harmonis dari mayoritas area poster menggunakan histogram bucket
 * sehingga piksel kecil yang mencolok (misal langit biru kecil di sudut) tidak mengalahkan warna utama poster.
 */
function extractVibrantFrameColor(img: HTMLImageElement, fallbackHex: string): string {
  try {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 24;
    sampleCanvas.height = 24;
    const sctx = sampleCanvas.getContext("2d");
    if (!sctx) return fallbackHex;
    sctx.drawImage(img, 0, 0, 24, 24);
    const { data } = sctx.getImageData(0, 0, 24, 24);

    const buckets = new Map<
      string,
      { count: number; sumR: number; sumG: number; sumB: number; satSum: number }
    >();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Abaikan piksel terlalu terang atau hampir hitam murni
      if (lum > 0.72 || lum < 0.08) continue;

      const key = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;
      const prev = buckets.get(key) || { count: 0, sumR: 0, sumG: 0, sumB: 0, satSum: 0 };
      prev.count += 1;
      prev.sumR += r;
      prev.sumG += g;
      prev.sumB += b;
      prev.satSum += sat;
      buckets.set(key, prev);
    }

    let bestBucket: { count: number; sumR: number; sumG: number; sumB: number; satSum: number } | null = null;
    let bestRank = -1;
    buckets.forEach((bk) => {
      if (bk.count < 8) return; // Abaikan aksen kecil di bawah ~1.5% gambar
      const avgSat = bk.satSum / bk.count;
      const rank = bk.count * (1 + avgSat * 0.8);
      if (rank > bestRank) {
        bestRank = rank;
        bestBucket = bk;
      }
    });

    if (!bestBucket) return fallbackHex;
    const chosen = bestBucket as { count: number; sumR: number; sumG: number; sumB: number };
    const rAvg = chosen.sumR / chosen.count;
    const gAvg = chosen.sumG / chosen.count;
    const bAvg = chosen.sumB / chosen.count;

    // Pastikan kontras nyaman dengan teks judul putih
    const lum = (0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg) / 255;
    const factor = lum > 0.46 ? 0.46 / lum : lum < 0.16 ? 1.15 : 1;
    const rr = Math.min(200, Math.max(18, Math.round(rAvg * factor)));
    const gg = Math.min(200, Math.max(18, Math.round(gAvg * factor)));
    const bb = Math.min(200, Math.max(18, Math.round(bAvg * factor)));
    return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
  } catch {
    return fallbackHex;
  }
}

export interface ArtworkCandidate {
  id: string;
  label: string;
  rawUrl: string;
  proxyUrl: string;
  resolution?: string;
}

async function hostCanvasJpeg(
  canvas: HTMLCanvasElement,
  prefix: string,
  publicOrigin: string
): Promise<string> {
  // JPEG 0.91 menjaga kualitas tajam dan ukuran << 450KB (di bawah batas 2MB Shopee)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.91);
  const res = await fetch("/api/shopee/host-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, dataUrl }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success" || !json.path) {
    throw new Error(json.message || "Gagal meng-host gambar ke server.");
  }
  const cleanOrigin = publicOrigin.replace(/\/$/, "");
  return `${cleanOrigin}${json.path}`;
}

export async function uploadCustomCoverImage(params: {
  id: string;
  dataUrl: string;
  publicOrigin: string;
}): Promise<{ publicUrl: string; previewDataUrl: string }> {
  const slug = `cover-${params.id}`.replace(/[^a-z0-9_-]/gi, "-").slice(0, 28);
  const res = await fetch("/api/shopee/host-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: slug, dataUrl: params.dataUrl }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success" || !json.path) {
    throw new Error(json.message || "Gagal meng-host gambar custom ke server.");
  }
  const cleanOrigin = params.publicOrigin.replace(/\/$/, "");
  return {
    publicUrl: `${cleanOrigin}${json.path}`,
    previewDataUrl: params.dataUrl,
  };
}

export async function renderAndHostBatchCover(params: {
  id: string;
  title: string;
  platform: string;
  category?: string;
  priceIdr: number;
  warrantyDays?: number;
  publicOrigin: string;
  customArtworkUrl?: string;
  customFrameColor?: string;
}): Promise<{
  publicUrl: string;
  previewDataUrl: string;
  hasArtwork: boolean;
  artworkCandidates: ArtworkCandidate[];
  selectedArtworkUrl: string;
  frameColor: string;
}> {
  const { frame: defaultFrame, badgeAsset, shape, preferCuratedColor } = resolveTheme(
    params.title,
    params.platform
  );
  const storeBrandName = "Akshara Gaming Center";

  // Fetch official game artwork candidates via internal API
  const artworkCandidates: ArtworkCandidate[] = [];
  let artworkSrc = "";
  let selectedArtworkUrl = "";
  try {
    const res = await fetch("/api/ai/game-artwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_title: params.title, platform: params.platform }),
    });
    const json = await res.json();
    const list = Array.isArray(json?.artworks) ? json.artworks : [];
    for (const a of list.slice(0, 8)) {
      const raw = String(a?.url || a?.thumbnail || "");
      if (!raw) continue;
      const proxyUrl =
        raw.startsWith("/api/") || raw.startsWith("data:")
          ? raw
          : `/api/image-proxy?url=${encodeURIComponent(raw)}`;
      artworkCandidates.push({
        id: String(a?.id || artworkCandidates.length),
        label: String(a?.label || "Official Art"),
        rawUrl: String(a?.raw_url || raw),
        proxyUrl,
        resolution: a?.resolution ? String(a.resolution) : undefined,
      });
    }
  } catch {}

  if (params.customArtworkUrl?.trim()) {
    const trimmed = params.customArtworkUrl.trim();
    selectedArtworkUrl = trimmed;
    artworkSrc =
      trimmed.startsWith("/api/") || trimmed.startsWith("data:")
        ? trimmed
        : `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  } else {
    // Prioritaskan Box Art 1:1 / Official Library Poster agar proporsinya mengisi penuh seperti gaya Wukong/Minecraft
    const preferred =
      artworkCandidates.find((c) => /box\s*art/i.test(c.label)) ||
      artworkCandidates.find((c) => /library\s*poster|poster/i.test(c.label)) ||
      artworkCandidates.find((c) => /capsule|hero/i.test(c.label)) ||
      artworkCandidates[0];
    if (preferred) {
      selectedArtworkUrl = preferred.rawUrl;
      artworkSrc = preferred.proxyUrl;
    }
  }

  const artImg = await loadImageSafe(artworkSrc);
  const frameColor =
    params.customFrameColor?.trim() ||
    (preferCuratedColor || !artImg
      ? defaultFrame
      : extractVibrantFrameColor(artImg, defaultFrame));

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  // 1. Base Solid Frame Color (harmonis dengan poster game)
  ctx.fillStyle = frameColor;
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Top Header Title (x=54, y=64) — Format konsisten: "Judul Game (Platform) - Private / CD-Key"
  const typeSuffix = /key|cdkey/i.test(params.category || "") ? "CD-Key" : "Private";
  const platClean = (params.platform || "Steam").trim();
  const hasPlatInTitle = params.title.toLowerCase().includes(platClean.toLowerCase());
  const topTitle = hasPlatInTitle
    ? `${params.title} - ${typeSuffix}`
    : `${params.title} (${platClean}) - ${typeSuffix}`;

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let fontSize = 36;
  ctx.font = `bold ${fontSize}px 'Inter', system-ui, -apple-system, sans-serif`;
  while (ctx.measureText(topTitle).width > 972 && fontSize > 22) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px 'Inter', system-ui, -apple-system, sans-serif`;
  }
  const finalTopTitle =
    ctx.measureText(topTitle).width > 972 ? topTitle.slice(0, 48) + "…" : topTitle;
  ctx.fillText(finalTopTitle, 54, 64);

  // 3. Inner Card Clipping Path with Dog-Ear Corner Cutout (54,100 -> 1026,1026)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(54, 100);
  ctx.lineTo(1026, 100);
  ctx.lineTo(1026, 860);
  ctx.lineTo(860, 1026);
  ctx.lineTo(54, 1026);
  ctx.closePath();
  ctx.clip();

  const boxW = 972;
  const boxH = 926;

  if (artImg) {
    const imgRatio = artImg.width / artImg.height;
    const boxRatio = boxW / boxH;

    if (Math.abs(imgRatio - boxRatio) <= 0.16) {
      // Poster kotak / near-square (seperti Minecraft 1:1): Full-bleed rapi tanpa celah hitam kiri/kanan!
      const coverScale = Math.max(boxW / artImg.width, boxH / artImg.height);
      const drawW = artImg.width * coverScale;
      const drawH = artImg.height * coverScale;
      const dx = 54 + (boxW - drawW) / 2;
      const dy = 100 + (boxH - drawH) / 2;
      ctx.drawImage(artImg, dx, dy, drawW, drawH);
    } else {
      // --- SMART AMBIENT BLUR FIT (Zero Cropping untuk poster portrait/landscape) ---
      const bgScale = Math.max(boxW / artImg.width, boxH / artImg.height) * 1.25;
      const bgW = artImg.width * bgScale;
      const bgH = artImg.height * bgScale;
      const bgX = 54 + (boxW - bgW) / 2;
      const bgY = 100 + (boxH - bgH) / 2;

      ctx.save();
      ctx.filter = "blur(32px) brightness(0.68)";
      ctx.drawImage(artImg, bgX, bgY, bgW, bgH);
      ctx.restore();

      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fillRect(54, 100, boxW, boxH);

      const scale = Math.min(boxW / artImg.width, boxH / artImg.height);
      const cw = artImg.width * scale;
      const ch = artImg.height * scale;
      const cx = 54 + (boxW - cw) / 2;
      const cy = 100 + (boxH - ch) / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(artImg, cx, cy, cw, ch);
      ctx.restore();
    }
  } else {
    const grad = ctx.createLinearGradient(54, 100, 1026, 1026);
    grad.addColorStop(0, "#18181b");
    grad.addColorStop(1, "#09090b");
    ctx.fillStyle = grad;
    ctx.fillRect(54, 100, boxW, boxH);
  }

  // Layer 1: Micro-Security Nano-Text Guilloche Border
  ctx.save();
  ctx.font = "600 10px 'Courier New', monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const microTop =
    `• ${storeBrandName.toUpperCase()} OFFICIAL LICENSED STORE • AUTHENTIC PRODUCT • DO NOT COPY • `.repeat(
      4
    );
  ctx.fillText(microTop, 62, 106);
  const microBottom =
    `• SECURED FOR ${storeBrandName.toUpperCase()} • ANTI-FRAUD VERIFIED • ALL RIGHTS RESERVED • `.repeat(
      3
    );
  ctx.fillText(microBottom, 62, 1012);
  ctx.restore();

  // Layer 2: Subtle Diagonal Brand Watermark (transparan, tidak menutup artwork)
  ctx.save();
  ctx.translate(540, 560);
  ctx.rotate((-35 * Math.PI) / 180);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.font = "bold 32px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${storeBrandName.toUpperCase()} • ORIGINAL`, 0, -90);
  ctx.fillText(`AUTHENTIC PRODUCT • ${storeBrandName.toUpperCase()}`, 0, 90);
  ctx.restore();

  ctx.restore(); // End inner poster clip

  // 4. Soft Drop Shadow behind Curled Flap
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

  // 5. Curled Fold Flap (Seamless White Corner Curl)
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

  // 6. Shape-Aware Platform Emblem in Revealed Corner (942, 942, 92, 92)
  const badgeImg = await loadImageSafe(badgeAsset);
  if (badgeImg) {
    ctx.save();
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(988, 988, 46, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(badgeImg, 942, 942, 92, 92);
    } else if (shape === "squircle") {
      ctx.beginPath();
      ctx.roundRect(942, 942, 92, 92, 18);
      ctx.clip();
      ctx.drawImage(badgeImg, 942, 942, 92, 92);
    } else {
      ctx.drawImage(badgeImg, 942, 942, 92, 92);
    }
    ctx.restore();
  }

  // 7. Holographic Store Trust Seal (Top-Left, kompak & elegan)
  ctx.save();
  const sealW = 248;
  const sealX = 66;
  const sealY = 116;
  const sealH = 34;
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.beginPath();
  ctx.roundRect(sealX, sealY, sealW, sealH, 8);
  ctx.fill();

  const holoGrad = ctx.createLinearGradient(sealX, sealY, sealX + sealW, sealY + sealH);
  holoGrad.addColorStop(0, "#06b6d4");
  holoGrad.addColorStop(0.33, "#a855f7");
  holoGrad.addColorStop(0.66, "#ec4899");
  holoGrad.addColorStop(1, "#3b82f6");
  ctx.strokeStyle = holoGrad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10.5px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`🛡️ ${storeBrandName.slice(0, 22).toUpperCase()}`, sealX + 10, sealY + sealH / 2);

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "right";
  ctx.fillText("VERIFIED", sealX + sealW - 8, sealY + sealH / 2);
  ctx.restore();

  // 8. Cryptographic Watermark Line at Bottom Frame Margin
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
  ctx.font = "500 10px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "AUTH-SIG: [AKSHARA-GAMING-CENTER] • CERT-ID: AKSHARA-1080P-SECURED",
    54,
    1054
  );
  ctx.restore();

  const slug = `cover-${params.id}`.replace(/[^a-z0-9_-]/gi, "-").slice(0, 28);
  const publicUrl = await hostCanvasJpeg(canvas, slug, params.publicOrigin);
  return {
    publicUrl,
    previewDataUrl: canvas.toDataURL("image/jpeg", 0.78),
    hasArtwork: Boolean(artImg),
    artworkCandidates,
    selectedArtworkUrl,
    frameColor,
  };
}

export async function renderAndHostBatchRulesSlide(params: {
  publicOrigin: string;
  warrantyDays?: number;
}): Promise<{ publicUrl: string; previewDataUrl: string }> {
  const warrantyDays = Number(params.warrantyDays) || 30;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 34px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("ATURAN & GARANSI RESMI DIGITAL", 54, 62);

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(54, 100, 972, 926, 12);
  ctx.fill();

  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(54, 100, 972, 112);
  ctx.fillStyle = "#0F172A";
  ctx.font = "800 28px 'Inter', sans-serif";
  ctx.fillText(`PANDUAN GARANSI DIGITAL ${warrantyDays} HARI`, 84, 152);
  ctx.fillStyle = "#475569";
  ctx.font = "500 16px 'Inter', sans-serif";
  ctx.fillText("100% Pengiriman Digital Instan via Chat Shopee + Kartu Garansi Digital QR.", 84, 188);

  const cards = [
    {
      badge: "01",
      title: "GARANSI RESMI DIGITAL",
      x: 84,
      y: 236,
      bg: "#F0FDF4",
      border: "#86EFAC",
      accent: "#059669",
      lines: [
        `✓ Garansi aktif ${warrantyDays} Hari sejak beli`,
        "✓ Wajib video rekam layar no-cut",
        "✓ Penggantian unit baru penuh SOP",
      ],
    },
    {
      badge: "02",
      title: "LARANGAN (HANGUS)",
      x: 552,
      y: 236,
      bg: "#FFF1F2",
      border: "#FDA4AF",
      accent: "#E11D48",
      lines: [
        "✕ Dilarang ubah Negara/Region akun",
        "✕ Dilarang ubah data tanpa konfirmasi",
        "✕ Dilarang pakai cheat / mod ilegal",
      ],
    },
    {
      badge: "03",
      title: "KEAMANAN AKUN",
      x: 84,
      y: 548,
      bg: "#EEF2FF",
      border: "#A5B4FC",
      accent: "#4F46E5",
      lines: [
        "• Amankan akun sesuai panduan chat",
        "• Aktifkan 2FA setelah akun aman",
        "• Jaga kerahasiaan data login",
      ],
    },
    {
      badge: "04",
      title: "TRANSAKSI SHOPEE",
      x: 552,
      y: 548,
      bg: "#F8FAFC",
      border: "#CBD5E1",
      accent: "#0F172A",
      lines: [
        "• Proses resmi via Chat Shopee",
        "• Klik Pesanan Diterima + Bintang 5",
        "• Admin CS siap bantu setiap hari",
      ],
    },
  ];

  for (const c of cards) {
    ctx.fillStyle = c.bg;
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, 444, 280, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.roundRect(c.x + 22, c.y + 22, 38, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(c.badge, c.x + 41, c.y + 36);

    ctx.textAlign = "left";
    ctx.fillStyle = "#0F172A";
    ctx.font = "800 20px 'Inter', sans-serif";
    ctx.fillText(c.title, c.x + 72, c.y + 36);

    ctx.fillStyle = "#1E293B";
    ctx.font = "600 18px 'Inter', sans-serif";
    c.lines.forEach((ln, idx) => {
      ctx.fillText(ln, c.x + 22, c.y + 96 + idx * 48);
    });
  }

  ctx.fillStyle = "#0F172A";
  ctx.beginPath();
  ctx.roundRect(84, 856, 912, 134, 18);
  ctx.fill();
  ctx.fillStyle = "#34D399";
  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillText("🛡️ AKSHARA GAMING CENTER • 100% PENGIRIMAN DIGITAL", 114, 896);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 22px 'Inter', sans-serif";
  ctx.fillText("Kartu Akses & Sertifikat Garansi Digital dikirim langsung di Chat Shopee.", 114, 940);

  const publicUrl = await hostCanvasJpeg(canvas, `rules-${warrantyDays}h`, params.publicOrigin);
  return { publicUrl, previewDataUrl: canvas.toDataURL("image/jpeg", 0.78) };
}
