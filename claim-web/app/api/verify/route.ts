import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbClaimByCode, updateDbClaimState, getWarrantyBySerialOrOrder } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

function maskBuyerName(name?: string | null): string {
  const s = (name || "Customer").trim();
  if (s.length <= 2) return `${s[0] || "*"}***`;
  return `${s.slice(0, 2)}${"*".repeat(Math.min(5, Math.max(2, s.length - 3)))}${s.slice(-1)}`;
}

async function notifyTelegramBruteForceAlert(claim: any, ip: string, userAgent: string) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;
  try {
    const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const msg =
      `🚨 *[ALERT KEAMANAN: BRUTE-FORCE DETECTED]*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "⚠️ *Upaya pembobolan PIN terdeteksi di Portal Publik!*\n"
      + `🎮 *Game:* \`${claim.product_title}\`\n`
      + `👤 *Pembeli:* \`${claim.buyer_username}\`\n`
      + `📦 *Order:* \`${claim.order_id}\`\n`
      + `🔑 *Kode Klaim:* \`${claim.claim_code}\`\n`
      + `📍 *IP Address:* \`${ip}\`\n`
      + `📱 *User-Agent:* \`${userAgent.slice(0, 80)}\`\n`
      + `⏱️ *Waktu:* ${timeStr} WIB\n`
      + "🔒 *Tindakan:* Akun otomatis DIKUNCI sementara selama 15 menit demi keamanan sistem.";

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: msg,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch {}
}

function readLocalFallbackClaims(): any[] {
  const localPath = path.join(process.cwd(), "data", "claimed_credentials.json");
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, "utf-8"));
    } catch {}
  }
  return [];
}

function syncLocalFallbackClaims(claims: any[]) {
  const localPath = path.join(process.cwd(), "data", "claimed_credentials.json");
  try {
    if (fs.existsSync(path.dirname(localPath))) {
      fs.writeFileSync(localPath, JSON.stringify(claims, null, 2), "utf-8");
    }
  } catch {}
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sn = searchParams.get("sn")?.trim().toUpperCase();
  const orderId = searchParams.get("order")?.trim().toUpperCase();
  const query = sn || orderId || "";

  if (!query) {
    return NextResponse.json(
      {
        status: "error",
        message: "Masukkan Serial Garansi, Kode Klaim, atau Nomor Pesanan untuk memverifikasi garansi.",
      },
      { status: 400 }
    );
  }

  let match = await getWarrantyBySerialOrOrder(query);
  if (!match) {
    const localClaims = readLocalFallbackClaims();
    match = localClaims.find(
      (c: any) =>
        (c.warranty_code || "").toUpperCase() === query ||
        (c.claim_code || "").toUpperCase() === query ||
        (c.order_id || "").toUpperCase() === query
    );
  }

  if (!match) {
    return NextResponse.json(
      {
        status: "not_found",
        verified: false,
        message:
          "Serial ID atau Nomor Pesanan tidak ditemukan di database Akshara Gaming Center. Pastikan kode sesuai dengan chat pesanan atau kartu garansi Anda.",
      },
      { status: 404 }
    );
  }

  const createdAt = match.created_at ? new Date(match.created_at) : new Date();
  const warrantyDays = Number(match.warranty_days) || 30;
  const expiresAt = new Date(createdAt.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
  const isExpired = expiresAt.getTime() < Date.now();

  return NextResponse.json({
    status: "success",
    verified: true,
    data: {
      serial_number: match.warranty_code || match.claim_code,
      order_id: match.order_id || "-",
      buyer_username: maskBuyerName(match.buyer_username),
      product_name: match.product_title,
      purchase_date: createdAt.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      warranty_status: isExpired ? "MASA GARANSI BERAKHIR" : "AKTIF & TERLINDUNGI",
      warranty_days_total: warrantyDays,
      warranty_expires: expiresAt.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      authenticity: `100% Original ${match.platform || "PC Digital"} License`,
      sop_summary:
        "Wajib menyertakan video screen recording tanpa jeda (no-cut) mulai sebelum membuka brankas hingga login pertama kali untuk klaim garansi.",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code?.trim().toUpperCase();
    const passcode = body.passcode?.trim();

    if (!code) {
      return NextResponse.json({ status: "error", message: "Kode klaim wajib diisi." }, { status: 400 });
    }

    let claim = await getDbClaimByCode(code);
    let claims = claim ? [] : readLocalFallbackClaims();
    let claimIndex = -1;

    if (!claim) {
      claimIndex = claims.findIndex((c: any) => (c.claim_code || "").toUpperCase() === code);
      if (claimIndex !== -1) claim = claims[claimIndex];
    }

    if (!claim) {
      return NextResponse.json(
        {
          status: "not_found",
          message: "Kode klaim tidak ditemukan. Pastikan kode sesuai dengan yang diberikan di chat pesanan.",
        },
        { status: 404 }
      );
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    if (claim.locked_until && new Date(claim.locked_until) > new Date()) {
      return NextResponse.json(
        {
          status: "rate_limited",
          message: "Terlalu banyak percobaan PIN salah. Akun dikunci sementara selama 15 menit demi keamanan.",
        },
        { status: 429 }
      );
    }

    let isPasscodeValid = false;
    if (passcode) {
      isPasscodeValid = claim.passcode === passcode;
      if (!isPasscodeValid) {
        claim.failed_attempts = (claim.failed_attempts || 0) + 1;
        const isLocked = claim.failed_attempts >= 5;
        if (isLocked) {
          claim.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await notifyTelegramBruteForceAlert(claim, ip, userAgent);
        }

        await updateDbClaimState(claim);
        if (claimIndex !== -1) {
          claims[claimIndex] = claim;
          syncLocalFallbackClaims(claims);
        }

        if (isLocked) {
          return NextResponse.json(
            {
              status: "rate_limited",
              message: "Terlalu banyak percobaan PIN salah. Akun dikunci sementara selama 15 menit demi keamanan.",
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            status: "invalid_passcode",
            message: `Passcode PIN salah! Sisa percobaan: ${5 - claim.failed_attempts}. Harap periksa PIN rahasia dari chat pesanan.`,
          },
          { status: 401 }
        );
      } else if (claim.failed_attempts || claim.locked_until) {
        claim.failed_attempts = 0;
        claim.locked_until = null;
        await updateDbClaimState(claim);
        if (claimIndex !== -1) {
          claims[claimIndex] = claim;
          syncLocalFallbackClaims(claims);
        }
      }
    }

    return NextResponse.json({
      status: "success",
      data: {
        claim_code: claim.claim_code,
        order_id: claim.order_id,
        buyer_username: claim.buyer_username,
        product_title: claim.product_title,
        platform: claim.platform,
        warranty_days: claim.warranty_days,
        warranty_code: claim.warranty_code,
        status: claim.status,
        is_already_revealed: claim.status === "REVEALED",
        revealed_at: claim.revealed_at,
        reveal_count: claim.reveal_count || 0,
        passcode_verified: isPasscodeValid,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
