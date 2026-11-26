/**
 * Browser Canvas Batch Renderer untuk Shopee Mass Upload Studio.
 * Menggambar Cover 1080x1080 (Slide 1) & Rules/Garansi 1080x1080 (Slide 2)
 * lalu mengunggah ke `/api/shopee/host-media` agar URL HTTPS publik otomatis siap di Excel Shopee.
 */

const PLATFORM_THEME_MAP: Record<string, { frame: string; badgeAsset: string }> = {
  steam: { frame: "#0F172A", badgeAsset: "/assets/badges/steam.png" },
  minecraft: { frame: "#064E3B", badgeAsset: "/assets/badges/minecraft.png" },
  xbox: { frame: "#14532D", badgeAsset: "/assets/badges/xbox.png" },
  microsoft: { frame: "#1E3A8A", badgeAsset: "/assets/badges/xbox.png" },
  rockstar: { frame: "#422006", badgeAsset: "/assets/badges/rockstar.png" },
  ea: { frame: "#312E81", badgeAsset: "/assets/badges/ea.png" },
  nintendo: { frame: "#7F1D1D", badgeAsset: "/assets/badges/switch.png" },
};

function resolveTheme(title: string, platform: string) {
  const low = `${title} ${platform}`.toLowerCase();
  for (const [k, v] of Object.entries(PLATFORM_THEME_MAP)) {
    if (low.includes(k)) return v;
  }
  return { frame: "#1E1B4B", badgeAsset: "/assets/badges/steam.png" };
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 6500);
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

async function hostCanvasPng(
  canvas: HTMLCanvasElement,
  prefix: string,
  publicOrigin: string
): Promise<string> {
  // JPEG 0.90 menjaga ukuran << 450KB (jauh di bawah batas 2MB Shopee)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
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

export async function renderAndHostBatchCover(params: {
  id: string;
  title: string;
  platform: string;
  category?: string;
  priceIdr: number;
  warrantyDays?: number;
  publicOrigin: string;
}): Promise<{ publicUrl: string; previewDataUrl: string }> {
  const { frame, badgeAsset } = resolveTheme(params.title, params.platform);
  const warrantyDays = Number(params.warrantyDays) || 30;
  const priceLabel = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(params.priceIdr || 0));

  // Fetch official game artwork via internal API
  let artworkSrc = "";
  try {
    const res = await fetch("/api/ai/game-artwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: params.title, platform: params.platform }),
    });
    const json = await res.json();
    const first = Array.isArray(json?.artworks) ? json.artworks[0] : null;
    if (first?.url || first?.thumbnail) {
      const raw = String(first.url || first.thumbnail);
      artworkSrc = raw.startsWith("/api/") ? raw : `/api/image-proxy?url=${encodeURIComponent(raw)}`;
    }
  } catch {}

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  // Base outer frame
  ctx.fillStyle = frame;
  ctx.fillRect(0, 0, 1080, 1080);

  // Header game title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 34px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const headerText = `${params.title} (${params.platform})`;
  ctx.fillText(headerText.length > 42 ? headerText.slice(0, 41) + "…" : headerText, 54, 62);

  // Inner Card Clip with Corner Curl
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(54, 100);
  ctx.lineTo(1026, 100);
  ctx.lineTo(1026, 860);
  ctx.lineTo(860, 1026);
  ctx.lineTo(54, 1026);
  ctx.closePath();
  ctx.clip();

  const artImg = await loadImageSafe(artworkSrc);
  if (artImg) {
    // Cover-crop fit
    const boxW = 972;
    const boxH = 926;
    const imgRatio = artImg.width / artImg.height;
    const boxRatio = boxW / boxH;
    let drawW = boxW;
    let drawH = boxH;
    let dx = 54;
    let dy = 100;
    if (imgRatio > boxRatio) {
      drawW = boxH * imgRatio;
      dx = 54 - (drawW - boxW) / 2;
    } else {
      drawH = boxW / imgRatio;
      dy = 100 - (drawH - boxH) / 2;
    }
    ctx.drawImage(artImg, dx, dy, drawW, drawH);
  } else {
    const grad = ctx.createLinearGradient(54, 100, 1026, 1026);
    grad.addColorStop(0, "#0F172A");
    grad.addColorStop(1, "#1E293B");
    ctx.fillStyle = grad;
    ctx.fillRect(54, 100, 972, 926);
  }

  // Dark Bottom Overlay Gradient for Price & Badges
  const shade = ctx.createLinearGradient(0, 560, 0, 1026);
  shade.addColorStop(0, "rgba(2, 6, 23, 0)");
  shade.addColorStop(0.55, "rgba(2, 6, 23, 0.72)");
  shade.addColorStop(1, "rgba(2, 6, 23, 0.94)");
  ctx.fillStyle = shade;
  ctx.fillRect(54, 560, 972, 466);

  // Bottom-Left Badges
  ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
  ctx.beginPath();
  ctx.roundRect(84, 796, 260, 42, 10);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 18px 'Inter', sans-serif";
  ctx.fillText(`100% ORIGINAL • ${warrantyDays}H`, 102, 817);

  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(356, 796, 238, 42, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#FCD34D";
  ctx.fillText(/key|cdkey/i.test(params.category || "") ? "CDKEY DIGITAL" : "FULL ACCESS", 376, 817);

  // Price Banner
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "900 54px 'Inter', sans-serif";
  ctx.fillText(priceLabel, 84, 898);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillText("AKSHARA GAMING CENTER • PENGIRIMAN DIGITAL INSTAN", 84, 954);

  // Top-Left Brand Trust Pill
  ctx.fillStyle = "rgba(10, 15, 29, 0.86)";
  ctx.strokeStyle = "rgba(52, 211, 153, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(74, 124, 290, 38, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 14px 'Inter', sans-serif";
  ctx.fillText("🛡️ AKSHARA DIGITAL VAULT", 90, 143);

  ctx.restore();

  // Corner Curl Flap
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(860, 1026);
  ctx.lineTo(860, 860);
  ctx.lineTo(1026, 860);
  ctx.closePath();
  const flapGrad = ctx.createLinearGradient(940, 940, 860, 860);
  flapGrad.addColorStop(0, "#D4D4D8");
  flapGrad.addColorStop(1, "#FFFFFF");
  ctx.fillStyle = flapGrad;
  ctx.fill();
  ctx.restore();

  const badgeImg = await loadImageSafe(badgeAsset);
  if (badgeImg) {
    ctx.drawImage(badgeImg, 942, 942, 92, 92);
  }

  const slug = `cover-${params.id}`.replace(/[^a-z0-9_-]/gi, "-").slice(0, 28);
  const publicUrl = await hostCanvasPng(canvas, slug, params.publicOrigin);
  return { publicUrl, previewDataUrl: canvas.toDataURL("image/jpeg", 0.7) };
}

export async function renderAndHostBatchRulesSlide(params: {
  publicOrigin: string;
  warrantyDays?: number;
}): Promise<string> {
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

  return hostCanvasPng(canvas, `rules-${warrantyDays}h`, params.publicOrigin);
}
