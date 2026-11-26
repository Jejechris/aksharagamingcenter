import QRCode from "qrcode";

export interface DigitalWarrantyCardInput {
  side?: "front" | "back";
  buyerName: string;
  gameTitle: string;
  platform: string;
  productType?: string;
  orderId: string;
  serialNumber: string;
  issueDate: string;
  warrantyDays: number;
  vipVoucher?: string;
  claimCode?: string;
  passcode?: string;
  claimBaseUrl?: string;
}

export function buildVerificationOrClaimUrl(input: {
  serialNumber: string;
  claimCode?: string;
  claimBaseUrl?: string;
}): string {
  const base = (input.claimBaseUrl || "https://claimakshara.vercel.app").replace(/\/$/, "");
  if (input.claimCode && input.claimCode.trim()) {
    return `${base}/claim/${encodeURIComponent(input.claimCode.trim())}`;
  }
  return `${base}/?sn=${encodeURIComponent(input.serialNumber.trim() || "AKSHARA")}#warranty`;
}

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 340,
    margin: 1,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}

/**
 * Render 1240 x 1754 px (HD A6 Portrait, 100% Digital) Certificate PNG.
 * Bisa dikirim langsung sebagai gambar via Chat Shopee (bebas sensor link URL eksternal!)
 */
export async function renderDigitalWarrantyCardPng(
  input: DigitalWarrantyCardInput
): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const side = input.side || "front";
  const W = 1240;
  const H = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const targetUrl = buildVerificationOrClaimUrl({
    serialNumber: input.serialNumber,
    claimCode: input.claimCode,
    claimBaseUrl: input.claimBaseUrl,
  });
  const qrDataUrl = await generateQrDataUrl(targetUrl).catch(() => "");

  // 1. Dark Obsidian Metallic Background matching claimakshara.vercel.app
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#070B14");
  bgGrad.addColorStop(0.55, "#0B1120");
  bgGrad.addColorStop(1, "#090D16");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

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

  ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `• AKSHARA GAMING CENTER • OFFICIAL DIGITAL CERTIFICATE • ${input.serialNumber} •`,
    W / 2,
    86
  );

  // Header Banner
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
  ctx.fillText("GAMING CENTER • 100% DIGITAL VAULT PASS", 134, 232);

  ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
  ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
  ctx.beginPath();
  ctx.roundRect(W - 386, 162, 254, 68, 16);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#FCD34D";
  ctx.font = "800 22px 'JetBrains Mono', monospace";
  ctx.fillText(
    side === "front" ? `GARANSI ${input.warrantyDays} HARI` : "SOP & VIP CARD",
    W - 259,
    204
  );

  if (side === "front") {
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(96, 326, 110, 8);

    ctx.textAlign = "left";
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "800 52px 'Inter', sans-serif";
    ctx.fillText(
      input.claimCode ? "Kartu Akses & Garansi Digital" : "Sertifikat Garansi Digital",
      96,
      398
    );
    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 24px 'Inter', sans-serif";
    ctx.fillText(
      "Lisensi game 100% original, legal & terlindungi proteksi penuh toko.",
      96,
      446
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(96, 502, W - 192, 220, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#34D399";
    ctx.font = "700 20px 'JetBrains Mono', monospace";
    ctx.fillText(
      `${input.platform.toUpperCase()} • ${(input.productType || "100% DIGITAL LICENSE").toUpperCase()}`,
      132,
      556
    );

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 40px 'Inter', sans-serif";
    const clippedGame =
      input.gameTitle.length > 36 ? input.gameTitle.slice(0, 35) + "…" : input.gameTitle;
    ctx.fillText(clippedGame, 132, 622);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 22px 'JetBrains Mono', monospace";
    ctx.fillText("Status Verifikasi: AKTIF & TERDAFTAR DI SISTEM DIGITAL", 132, 678);

    const rows = [
      { label: "PEMILIK LISENSI", val: input.buyerName || "-", x: 96, y: 760 },
      { label: "NOMOR PESANAN", val: input.orderId || "-", x: 636, y: 760 },
      {
        label: input.claimCode ? "KODE KLAIM VAULT" : "TANGGAL TERBIT",
        val: input.claimCode ? input.claimCode : input.issueDate || "-",
        x: 96,
        y: 954,
      },
      {
        label: input.passcode ? "PASSCODE PIN RAHASIA" : "MASA PERLINDUNGAN",
        val: input.passcode ? input.passcode : `${input.warrantyDays} HARI PENUH`,
        x: 636,
        y: 954,
      },
    ];
    for (const box of rows) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle =
        box.label.includes("PIN") || box.label.includes("MASA")
          ? "rgba(16, 185, 129, 0.45)"
          : "rgba(255, 255, 255, 0.09)";
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, 508, 166, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#64748B";
      ctx.font = "700 18px 'JetBrains Mono', monospace";
      ctx.fillText(box.label, box.x + 28, box.y + 48);

      ctx.fillStyle =
        box.label.includes("PIN") || box.label.includes("MASA") ? "#34D399" : "#F8FAFC";
      ctx.font = "800 32px 'JetBrains Mono', monospace";
      const valText = box.val.length > 23 ? box.val.slice(0, 22) + "…" : box.val;
      ctx.fillText(valText, box.x + 28, box.y + 108);
    }

    // Bottom Scannable QR Verification / Claim Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
    ctx.beginPath();
    ctx.roundRect(96, 1264, W - 192, 366, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "700 19px 'JetBrains Mono', monospace";
    ctx.fillText(
      input.claimCode
        ? "SCAN QR CODE VIA KAMERA / GOOGLE LENS UNTUK BUKA AKUN"
        : "SERIAL SERTIFIKAT DIGITAL (SCAN QR UNTUK VALIDASI ONLINE)",
      132,
      1322
    );

    ctx.fillStyle = "#34D399";
    ctx.font = "800 34px 'JetBrains Mono', monospace";
    ctx.fillText(input.serialNumber, 132, 1384);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "500 22px 'Inter', sans-serif";
    ctx.fillText(
      input.claimCode
        ? "1. Rekam layar (no-cut) sebelum scan QR ini"
        : "Tgl Terbit: " + input.issueDate + " • Garansi " + input.warrantyDays + " Hari",
      132,
      1452
    );
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 22px 'JetBrains Mono', monospace";
    ctx.fillText(
      input.claimCode
        ? `2. Scan QR -> Masukkan PIN: ${input.passcode || "-"}`
        : "Portal Resmi: claimakshara.vercel.app/#warranty",
      132,
      1498
    );

    ctx.fillStyle = "#FCD34D";
    ctx.font = "600 20px 'Inter', sans-serif";
    ctx.fillText("✦ Disahkan 100% digital oleh Akshara Command Vault", 132, 1564);

    if (qrDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.roundRect(W - 386, 1322, 258, 258, 20);
          ctx.fill();
          ctx.drawImage(img, W - 372, 1336, 230, 230);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = qrDataUrl;
      });
    }
  } else {
    ctx.textAlign = "left";
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "800 44px 'Inter', sans-serif";
    ctx.fillText("SOP Klaim & Ketentuan Garansi Digital", 96, 360);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 23px 'Inter', sans-serif";
    ctx.fillText("Ikuti 3 langkah wajib ini agar proteksi garansi digital diproses kilat:", 96, 406);

    const sopSteps = [
      {
        no: "01",
        title: "Wajib Rekam Layar Tanpa Jeda (No-Cut)",
        desc1: "Rekam layar (Screen Recording) tanpa jeda mulai sebelum",
        desc2: "scan QR / buka brankas klaim hingga proses login pertama berhasil.",
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
    ctx.fillText(input.vipVoucher || "AKSHARA-VIP15", 132, 1356);

    ctx.fillStyle = "#FEF3C7";
    ctx.font = "500 22px 'Inter', sans-serif";
    ctx.fillText("Tunjukkan kode ini di Chat CS untuk diskon khusus order berikutnya!", 132, 1418);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "600 22px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `DIGITAL CERTIFICATE • SERIAL: ${input.serialNumber}`,
      W / 2,
      1564
    );
  }

  ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `• ENCRYPTED BY AKSHARA CLAIM VAULT • ${input.issueDate.toUpperCase()} • 100% DIGITAL •`,
    W / 2,
    H - 70
  );

  return canvas.toDataURL("image/png", 1.0);
}
