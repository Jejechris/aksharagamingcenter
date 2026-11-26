"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tag,
} from "lucide-react";

interface WarrantyCardStudioProps {
  onToast?: (msg: string) => void;
}

interface QuickClaimPreset {
  claim_code: string;
  warranty_code?: string;
  order_id: string;
  buyer_username: string;
  product_title: string;
  platform: string;
  warranty_days: number;
  created_at?: string;
}

const DEFAULT_CLAIM_URL_BASE = "https://claimakshara.vercel.app";

export default function WarrantyCardStudio({ onToast }: WarrantyCardStudioProps) {
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [buyerName, setBuyerName] = useState("Dimas Prasetyo");
  const [gameTitle, setGameTitle] = useState("Minecraft: Java & Bedrock Edition");
  const [platform, setPlatform] = useState("PC / Microsoft");
  const [productType, setProductType] = useState("Full Access / Official Key");
  const [orderId, setOrderId] = useState("2611268X94AKSH");
  const [serialNumber, setSerialNumber] = useState("AKSHARA-261126-9827");
  const [issueDate, setIssueDate] = useState(() =>
    new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  );
  const [warrantyDays, setWarrantyDays] = useState<number>(30);
  const [vipVoucher, setVipVoucher] = useState("AKSHARA-VIP15");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [recentClaims, setRecentClaims] = useState<QuickClaimPreset[]>([]);
  const [catalogTitles, setCatalogTitles] = useState<Array<{ title: string; platform: string }>>([]);

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const verificationUrl = `${DEFAULT_CLAIM_URL_BASE}/?sn=${encodeURIComponent(
    serialNumber.trim() || "AKSHARA"
  )}#warranty`;

  // Generate crisp real scannable QR code
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(verificationUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [verificationUrl]);

  // Autofill sources from Claims Vault + Catalog
  useEffect(() => {
    fetch("/api/claim/manage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.status === "success" && Array.isArray(json.data)) {
          setRecentClaims(json.data.slice(0, 12));
        }
      })
      .catch(() => {});

    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.status === "success" && Array.isArray(json.data)) {
          setCatalogTitles(
            json.data.map((g: any) => ({ title: g.title, platform: g.platform || "Steam" }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleRegenerateSerial = () => {
    const now = new Date();
    const yymmdd = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSerialNumber(`AKSHARA-${yymmdd}-${rand}`);
    notify("No. Seri garansi baru digenerate!");
  };

  const handleApplyClaimPreset = (claimCode: string) => {
    const found = recentClaims.find((c) => c.claim_code === claimCode);
    if (!found) return;
    setBuyerName(found.buyer_username || "Customer");
    setGameTitle(found.product_title || "Original Game License");
    setPlatform(found.platform || "Steam");
    setOrderId(found.order_id || "-");
    setSerialNumber(found.warranty_code || found.claim_code);
    setWarrantyDays(Number(found.warranty_days) || 30);
    if (found.created_at) {
      const dt = new Date(found.created_at);
      if (!Number.isNaN(dt.getTime())) {
        setIssueDate(
          dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        );
      }
    }
    notify(`Sertifikat otomatis diisi dari klaim ${found.claim_code}!`);
  };

  // High-resolution A6 (1240 x 1754 px @ ~300 DPI) Canvas PNG Renderer
  const renderCardSidePng = async (side: "front" | "back"): Promise<string | null> => {
    const W = 1240;
    const H = 1754;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Dark Obsidian Metallic Background matching claimakshara.vercel.app
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#070B14");
    bgGrad.addColorStop(0.55, "#0B1120");
    bgGrad.addColorStop(1, "#090D16");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ambient Emerald + Amber radial accents
    const glow1 = ctx.createRadialGradient(W - 140, 180, 20, W - 140, 180, 480);
    glow1.addColorStop(0, "rgba(16, 185, 129, 0.22)");
    glow1.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(160, H - 180, 20, 160, H - 180, 440);
    glow2.addColorStop(0, "rgba(245, 158, 11, 0.14)");
    glow2.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Outer Gold & Emerald Double Frame
    ctx.strokeStyle = "rgba(245, 158, 11, 0.42)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(38, 38, W - 76, H - 76, 42);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(56, 56, W - 112, H - 112, 32);
    ctx.stroke();

    // Top Microtext Security Strip
    ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
    ctx.font = "600 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `• AKSHARA GAMING CENTER • OFFICIAL LICENSED STORE • ${serialNumber} •`,
      W / 2,
      86
    );

    // Top Brand Header
    ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(96, 130, W - 192, 134, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 44px 'Inter', sans-serif";
    ctx.fillText("AKSHARA", 134, 190);
    ctx.fillStyle = "#34D399";
    ctx.font = "700 20px 'JetBrains Mono', monospace";
    ctx.fillText("GAMING CENTER • OFFICIAL VAULT CERTIFICATE", 134, 232);

    // Right Pill on Header
    ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
    ctx.beginPath();
    ctx.roundRect(W - 386, 162, 254, 68, 16);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#FCD34D";
    ctx.font = "800 22px 'JetBrains Mono', monospace";
    ctx.fillText(side === "front" ? `GARANSI ${warrantyDays} HARI` : "SOP & VIP CARD", W - 259, 204);

    if (side === "front") {
      // Certificate Title
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(96, 326, 110, 8);

      ctx.textAlign = "left";
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "800 54px 'Inter', sans-serif";
      ctx.fillText("Sertifikat Keaslian", 96, 398);
      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 25px 'Inter', sans-serif";
      ctx.fillText("Lisensi game 100% original, legal & terlindungi proteksi penuh toko.", 96, 448);

      // Game Highlight Box
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(96, 502, W - 192, 220, 26);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#34D399";
      ctx.font = "700 20px 'JetBrains Mono', monospace";
      ctx.fillText(`${platform.toUpperCase()} • ${productType.toUpperCase()}`, 132, 556);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 40px 'Inter', sans-serif";
      const clippedGame = gameTitle.length > 36 ? gameTitle.slice(0, 35) + "…" : gameTitle;
      ctx.fillText(clippedGame, 132, 622);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 22px 'JetBrains Mono', monospace";
      ctx.fillText(`Status Verifikasi: AKTIF & TERDAFTAR DI SISTEM`, 132, 678);

      // 4 Telemetry Detail Cards (2x2 Grid)
      const rows = [
        { label: "PEMILIK LISENSI", val: buyerName || "-", x: 96, y: 760 },
        { label: "NOMOR PESANAN", val: orderId || "-", x: 636, y: 760 },
        { label: "TANGGAL TERBIT", val: issueDate || "-", x: 96, y: 954 },
        { label: "MASA PERLINDUNGAN", val: `${warrantyDays} HARI PENUH`, x: 636, y: 954 },
      ];
      for (const box of rows) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, 508, 166, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#64748B";
        ctx.font = "700 18px 'JetBrains Mono', monospace";
        ctx.fillText(box.label, box.x + 28, box.y + 48);

        ctx.fillStyle = box.label === "MASA PERLINDUNGAN" ? "#34D399" : "#F8FAFC";
        ctx.font = "700 30px 'Inter', sans-serif";
        const valText = box.val.length > 23 ? box.val.slice(0, 22) + "…" : box.val;
        ctx.fillText(valText, box.x + 28, box.y + 108);
      }

      // Bottom Verification Banner with Embedded Scannable QR Code
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
      ctx.beginPath();
      ctx.roundRect(96, 1290, W - 192, 340, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "700 20px 'JetBrains Mono', monospace";
      ctx.fillText("SERIAL SERTIFIKAT RESMI (SCAN QR UNTUK CEK ONLINE)", 132, 1348);

      ctx.fillStyle = "#34D399";
      ctx.font = "800 38px 'JetBrains Mono', monospace";
      ctx.fillText(serialNumber, 132, 1412);

      ctx.fillStyle = "#CBD5E1";
      ctx.font = "500 22px 'Inter', sans-serif";
      ctx.fillText("Portal Validasi Resmi:", 132, 1484);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 23px 'JetBrains Mono', monospace";
      ctx.fillText("claimakshara.vercel.app/#warranty", 132, 1522);

      ctx.fillStyle = "#FCD34D";
      ctx.font = "600 20px 'Inter', sans-serif";
      ctx.fillText("✦ Disahkan secara digital oleh Akshara Command Vault", 132, 1582);

      // Draw Real Scannable QR Code
      if (qrDataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.roundRect(W - 376, 1336, 248, 248, 20);
            ctx.fill();
            ctx.drawImage(img, W - 362, 1350, 220, 220);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = qrDataUrl;
        });
      }
    } else {
      // BACK SIDE: SOP KLAIM GARANSI + VIP REPEAT ORDER VOUCHER
      ctx.textAlign = "left";
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "800 44px 'Inter', sans-serif";
      ctx.fillText("SOP Klaim & Ketentuan Garansi", 96, 360);
      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 23px 'Inter', sans-serif";
      ctx.fillText("Ikuti 3 langkah wajib ini agar klaim garansi diproses kilat:", 96, 406);

      const sopSteps = [
        {
          no: "01",
          title: "Wajib Video Tanpa Jeda (No-Cut)",
          desc1: "Rekam layar / unboxing amplop tanpa jeda mulai sebelum",
          desc2: "buka portal kredensial hingga proses login pertama berhasil.",
          accent: "#34D399",
        },
        {
          no: "02",
          title: "Jaga Keamanan & Aturan Region",
          desc1: "Dilarang ubah region akun (2–4 minggu) atau ubah email/",
          desc2: "password utama tanpa konfirmasi admin. Segera aktifkan 2FA.",
          accent: "#60A5FA",
        },
        {
          no: "03",
          title: "Aktivasi Garansi & Support 24/7",
          desc1: "Klik 'Pesanan Diterima' + Ulasan Bintang 5 di Shopee, lalu",
          desc2: "hubungi Chat CS resmi jika butuh bantuan setup atau klaim.",
          accent: "#FBBF24",
        },
      ];

      let sy = 456;
      for (const s of sopSteps) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.11)";
        ctx.beginPath();
        ctx.roundRect(96, sy, W - 192, 220, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = s.accent;
        ctx.beginPath();
        ctx.roundRect(130, sy + 30, 62, 48, 12);
        ctx.fill();

        ctx.fillStyle = "#0F172A";
        ctx.font = "900 24px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(s.no, 161, sy + 63);

        ctx.textAlign = "left";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "800 30px 'Inter', sans-serif";
        ctx.fillText(s.title, 214, sy + 64);

        ctx.fillStyle = "#CBD5E1";
        ctx.font = "500 23px 'Inter', sans-serif";
        ctx.fillText(s.desc1, 130, sy + 126);
        ctx.fillText(s.desc2, 130, sy + 162);

        sy += 248;
      }

      // Gold VIP Voucher Banner matching Python A6 generator
      const vGrad = ctx.createLinearGradient(96, 1226, W - 96, 1466);
      vGrad.addColorStop(0, "#78350F");
      vGrad.addColorStop(0.5, "#92400E");
      vGrad.addColorStop(1, "#451A03");
      ctx.fillStyle = vGrad;
      ctx.strokeStyle = "rgba(252, 211, 77, 0.65)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(96, 1230, W - 192, 236, 26);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FDE68A";
      ctx.font = "800 20px 'JetBrains Mono', monospace";
      ctx.fillText("★ VOUCHER EKSKLUSIF MEMBER REPEAT ORDER", 132, 1286);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 46px 'JetBrains Mono', monospace";
      ctx.fillText(vipVoucher, 132, 1356);

      ctx.fillStyle = "#FEF3C7";
      ctx.font = "500 22px 'Inter', sans-serif";
      ctx.fillText("Tunjukkan kode ini di Chat CS untuk diskon khusus order berikutnya!", 132, 1418);

      // Footer
      ctx.fillStyle = "#94A3B8";
      ctx.font = "600 22px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`VERIFY ONLINE: claimakshara.vercel.app • SERIAL: ${serialNumber}`, W / 2, 1564);
    }

    // Bottom Microtext
    ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
    ctx.font = "600 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `• ENCRYPTED BY AKSHARA CLAIM VAULT • ${issueDate.toUpperCase()} • DO NOT FORGE •`,
      W / 2,
      H - 70
    );

    return canvas.toDataURL("image/png", 1.0);
  };

  const handleDownloadPng = async (target: "front" | "back" | "both") => {
    setIsExporting(true);
    try {
      const slug = serialNumber.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
      if (target === "front" || target === "both") {
        const frontUrl = await renderCardSidePng("front");
        if (frontUrl) {
          const a = document.createElement("a");
          a.href = frontUrl;
          a.download = `akshara-warranty-front-${slug}.png`;
          a.click();
        }
      }
      if (target === "back" || target === "both") {
        if (target === "both") await new Promise((r) => setTimeout(r, 250));
        const backUrl = await renderCardSidePng("back");
        if (backUrl) {
          const a = document.createElement("a");
          a.href = backUrl;
          a.download = `akshara-warranty-back-${slug}.png`;
          a.click();
        }
      }
      notify(
        target === "both"
          ? "✅ Berhasil mengunduh Sertifikat Depan & Belakang HD PNG (A6 300 DPI)!"
          : `✅ Berhasil mengunduh Kartu Garansi (${target === "front" ? "Depan" : "Belakang"}) HD PNG!`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive 3D Dark-Obsidian A6 Certificate Preview (Identik dengan claimakshara.vercel.app) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="app-card p-5 sm:p-6 flex flex-col items-center justify-center bg-slate-100/70 border border-slate-200 [perspective:1200px]">
            <div className="flex flex-wrap items-center justify-between gap-2 w-full mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Sertifikat Garansi A6 Resmi
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Identik dengan Portal Klaim ({DEFAULT_CLAIM_URL_BASE.replace("https://", "")}) • Rasio A6 1:1.414
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCardSide("front")}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    cardSide === "front"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Sisi Depan
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide("back")}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    cardSide === "back"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Sisi Belakang (SOP)
                </button>
              </div>
            </div>

            {/* Print-target A6 Card */}
            <div
              id="warranty-card-printable"
              onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
              className="relative w-full max-w-[390px] aspect-[1/1.414] transition-transform duration-500 ease-out hover:[transform:rotateX(4deg)_rotateY(-5deg)] [transform-style:preserve-3d] shadow-2xl rounded-2xl cursor-pointer select-none"
              title="Klik kartu untuk membalik sisi depan/belakang"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#070B14] via-[#0B1120] to-[#090D16] rounded-2xl border-2 border-amber-500/40 p-5 flex flex-col justify-between overflow-hidden">
                {/* Ambient glows matching claim-web */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-[7px] rounded-xl border border-white/[0.08] pointer-events-none" />

                {/* Top Header Bar */}
                <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div>
                    <div className="text-sm font-black tracking-[0.14em] text-white leading-none">
                      AKSHARA
                    </div>
                    <div className="text-[8px] font-mono font-bold text-emerald-400 tracking-wider uppercase mt-1">
                      GAMING CENTER • OFFICIAL VAULT
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[9px] font-mono font-extrabold tracking-wide shrink-0">
                    {cardSide === "front" ? `GARANSI ${warrantyDays} HARI` : "SOP & VIP"}
                  </span>
                </div>

                {cardSide === "front" ? (
                  <div className="relative z-10 flex-1 flex flex-col justify-between py-3 space-y-2.5">
                    <div>
                      <div className="w-9 h-1 bg-amber-400 rounded-full mb-2" />
                      <h4 className="text-lg font-extrabold text-white tracking-tight leading-tight">
                        Sertifikat Keaslian
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                        Lisensi game 100% original, legal &amp; dilindungi garansi resmi Akshara Gaming Center.
                      </p>
                    </div>

                    {/* Product Identity Pill */}
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.11] space-y-1">
                      <div className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        {platform} • {productType}
                      </div>
                      <div className="text-xs font-extrabold text-white leading-snug line-clamp-2">
                        {gameTitle}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">
                        Status: <span className="text-emerald-300 font-semibold">AKTIF &amp; TERDAFTAR</span>
                      </div>
                    </div>

                    {/* 2x2 Telemetry Grid matching claim-web */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-white/[0.08]">
                        <div className="text-[8px] font-mono text-slate-500 uppercase font-semibold">
                          PEMILIK LISENSI
                        </div>
                        <div className="text-[10px] font-bold text-white truncate mt-0.5">{buyerName}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-white/[0.08]">
                        <div className="text-[8px] font-mono text-slate-500 uppercase font-semibold">
                          ORDER ID
                        </div>
                        <div className="text-[10px] font-mono font-bold text-slate-200 truncate mt-0.5">
                          {orderId}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-white/[0.08]">
                        <div className="text-[8px] font-mono text-slate-500 uppercase font-semibold">
                          TANGGAL TERBIT
                        </div>
                        <div className="text-[10px] font-semibold text-slate-200 truncate mt-0.5">
                          {issueDate}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-white/[0.08]">
                        <div className="text-[8px] font-mono text-slate-500 uppercase font-semibold">
                          PROTEKSI
                        </div>
                        <div className="text-[10px] font-mono font-bold text-emerald-400 truncate mt-0.5">
                          {warrantyDays} HARI PENUH
                        </div>
                      </div>
                    </div>

                    {/* Bottom Scannable QR Verification Strip */}
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-emerald-500/35 flex items-center justify-between gap-2.5">
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-[8px] font-mono text-slate-400 uppercase font-bold">
                          NO. SERI SERTIFIKAT
                        </div>
                        <div className="text-[11px] font-mono font-extrabold text-emerald-300 truncate">
                          {serialNumber}
                        </div>
                        <div className="text-[8.5px] font-mono text-slate-300 truncate">
                          claimakshara.vercel.app/#warranty
                        </div>
                        <div className="text-[8px] text-amber-300 font-semibold">
                          ✦ Scan QR untuk validasi online
                        </div>
                      </div>
                      <div className="p-1 bg-white rounded-lg shrink-0 shadow-md">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="QR Verifikasi Garansi Akshara"
                            className="w-14 h-14 object-contain block"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-slate-200 rounded" />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 flex-1 flex flex-col justify-between py-3 space-y-2.5">
                    <div>
                      <h4 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        SOP Klaim &amp; Aturan Garansi
                      </h4>
                      <p className="text-[9.5px] text-slate-400 mt-0.5">
                        Patuhi prosedur berikut agar proteksi garansi {warrantyDays} hari tetap sah:
                      </p>
                    </div>

                    <div className="space-y-2 text-[9.5px] text-slate-300 flex-1">
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1]">
                        <div className="font-bold text-emerald-300 mb-0.5">
                          01. Wajib Video Tanpa Jeda (No-Cut)
                        </div>
                        Sertakan rekaman unboxing/screen recording tanpa edit dari sebelum membuka brankas klaim hingga login pertama berhasil.
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1]">
                        <div className="font-bold text-sky-300 mb-0.5">
                          02. Larangan Ubah Region &amp; Keamanan
                        </div>
                        Dilarang mengubah negara/region (2–4 minggu) atau data akun tanpa konfirmasi admin. Aktifkan 2FA setelah akun aman.
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1]">
                        <div className="font-bold text-amber-300 mb-0.5">
                          03. Aktivasi &amp; Klaim Resmi Shopee Chat
                        </div>
                        Klik &ldquo;Pesanan Diterima&rdquo; + ulasan bintang 5. Semua klaim diproses kilat melalui Chat CS Shopee.
                      </div>
                    </div>

                    {/* Gold VIP Repeat Voucher */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-amber-900/70 to-amber-950/90 border border-amber-400/50">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[8px] font-mono font-bold text-amber-300 uppercase">
                            ★ VOUCHER REPEAT ORDER MEMBER
                          </div>
                          <div className="text-xs font-mono font-black text-white tracking-wider mt-0.5">
                            {vipVoucher}
                          </div>
                        </div>
                        <Tag className="w-5 h-5 text-amber-300 shrink-0" />
                      </div>
                      <div className="text-[8.5px] text-amber-100/90 mt-1">
                        Kirim kode ini di Chat Shopee untuk diskon ekstra pembelian berikutnya.
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative z-10 text-center text-[8px] font-mono text-slate-500 tracking-wider uppercase pt-1 border-t border-white/[0.07]">
                  AKSHARA VAULT CERTIFICATE • ANTI-FRAUD PROTECTED
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Klik kartu atau tombol di atas untuk melihat sisi Depan / Belakang.</span>
            </div>
          </div>
        </div>

        {/* Right: Controls, Live Autofill & Export Actions */}
        <div className="lg:col-span-6 space-y-4">
          <div className="app-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Kustomisasi Sertifikat Garansi A6
              </h3>
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>Buka Link QR Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Quick Autofill from Claims Vault / Catalog */}
            {(recentClaims.length > 0 || catalogTitles.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                {recentClaims.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Isi Otomatis dari Claims Vault
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleApplyClaimPreset(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Pilih data klaim tersimpan --</option>
                      {recentClaims.map((c) => (
                        <option key={c.claim_code} value={c.claim_code}>
                          {c.buyer_username} • {c.product_title} ({c.claim_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {catalogTitles.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Award className="w-3 h-3 text-indigo-500" />
                      Pilih Game dari Katalog
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const chosen = catalogTitles.find((g) => g.title === e.target.value);
                        if (chosen) {
                          setGameTitle(chosen.title);
                          setPlatform(chosen.platform);
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Pilih game katalog --</option>
                      {catalogTitles.map((g, idx) => (
                        <option key={`${g.title}-${idx}`} value={g.title}>
                          {g.title} ({g.platform})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nama Pembeli / Username</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">No. Pesanan / Order ID</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">Nama Game / Lisensi</label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Platform</label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Tipe Produk</label>
                <input
                  type="text"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">No. Seri Garansi (QR Sync)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateSerial}
                    title="Generate Nomor Seri Baru"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(serialNumber);
                      setCopiedSerial(true);
                      setTimeout(() => setCopiedSerial(false), 1800);
                      notify("No. Seri garansi disalin!");
                    }}
                    title="Salin Serial"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shrink-0 cursor-pointer"
                  >
                    {copiedSerial ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Tanggal Terbit</label>
                <input
                  type="text"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Durasi Garansi (Hari)</label>
                <select
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value={7}>7 Hari</option>
                  <option value={14}>14 Hari</option>
                  <option value={30}>30 Hari (Standar Resmi)</option>
                  <option value={90}>90 Hari (VIP)</option>
                  <option value={365}>365 Hari</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Kode Voucher Sisi Belakang</label>
                <input
                  type="text"
                  value={vipVoucher}
                  onChange={(e) => setVipVoucher(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Export / Print Buttons */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleDownloadPng("front")}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isExporting ? "Merender HD..." : "Download Depan HD PNG"}</span>
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleDownloadPng("back")}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Download Belakang HD PNG</span>
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleDownloadPng("both")}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Download 2 Sisi (A6 300 DPI)</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Print A6</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Isolation Rule so window.print() cleanly prints the A6 Warranty Card */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #warranty-card-printable,
          #warranty-card-printable * {
            visibility: visible !important;
          }
          #warranty-card-printable {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 105mm !important;
            height: 148mm !important;
            max-width: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
