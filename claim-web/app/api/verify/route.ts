import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbClaimByCode, upsertDbClaim, getDbClaims, getKV, setKV } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

async function notifyTelegramBruteForceAlert(claim: any, ip: string, userAgent: string) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.warn("[Telegram Security Alert] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not configured, skipping.");
    return;
  }
  try {
    const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const msg =
      `🚨 *[ALERT KEAMANAN: BRUTE-FORCE DETECTED]*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "⚠️ *Upaya pembobolan PIN terdeteksi!*\n"
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
  } catch (err) {
    console.error("[Telegram Security Alert Error]", err);
  }
}

async function getClaimsData(): Promise<any[]> {
  const dbClaims = await getDbClaims();
  if (dbClaims && Array.isArray(dbClaims) && dbClaims.length > 0) {
    return dbClaims;
  }

  const dbData = await getKV("claimed_credentials");
  if (dbData && Array.isArray(dbData)) {
    return dbData;
  }

  // Cek lokal data atau fallback ke shared data
  const candidates = [
    path.join(process.cwd(), "data", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "web", "data", "claimed_credentials.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
      } catch (e) {}
    }
  }
  return [];
}

function syncLocalDisk(claims: any[]) {
  const candidates = [
    path.join(process.cwd(), "data", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "web", "data", "claimed_credentials.json"),
  ];
  for (const p of candidates) {
    try {
      const d = path.dirname(p);
      if (fs.existsSync(d)) {
        fs.writeFileSync(p, JSON.stringify(claims, null, 2), "utf-8");
      }
    } catch (e) {}
  }
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
    const claims = await getClaimsData();
    const claimIndex = claims.findIndex((c: any) => c.claim_code.toUpperCase() === code);

    if (!claim && claimIndex !== -1) {
      claim = claims[claimIndex];
    }

    if (!claim) {
      return NextResponse.json({
        status: "not_found",
        message: "Kode klaim tidak ditemukan. Pastikan kode sesuai dengan yang diberikan di chat Shopee."
      }, { status: 404 });
    }

    // Deteksi IP Address Pembeli
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    // Cek apakah akun sedang terkunci karena brute-force PIN
    if (claim.locked_until && new Date(claim.locked_until) > new Date()) {
      return NextResponse.json({
        status: "rate_limited",
        message: "Terlalu banyak percobaan PIN salah. Akun dikunci sementara selama 15 menit demi keamanan."
      }, { status: 429 });
    }

    // Jika passcode disertakan, periksa apakah cocok
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

        // Simpan pembaruan atomic row-level ke PostgreSQL claims_vault
        await upsertDbClaim(claim).catch(() => {});

        if (claimIndex !== -1) {
          claims[claimIndex] = claim;
          await setKV("claimed_credentials", claims).catch(() => {});
          syncLocalDisk(claims);
        }

        if (isLocked) {
          return NextResponse.json({
            status: "rate_limited",
            message: "Terlalu banyak percobaan PIN salah. Akun dikunci sementara selama 15 menit demi keamanan."
          }, { status: 429 });
        }

        return NextResponse.json({
          status: "invalid_passcode",
          message: `Passcode PIN salah! Sisa percobaan: ${5 - claim.failed_attempts}. Harap periksa PIN rahasia yang diberikan penjual di chat Shopee.`
        }, { status: 401 });
      } else {
        // Reset counter saat passcode valid
        if (claim.failed_attempts || claim.locked_until) {
          claim.failed_attempts = 0;
          claim.locked_until = null;
          claims[claimIndex] = claim;
          await setKV("claimed_credentials", claims);
          syncLocalDisk(claims);
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
      }
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
