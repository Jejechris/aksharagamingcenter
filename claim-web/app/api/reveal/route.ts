import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8911523018:AAFvUAesNmjOov7gWiuL9Sf9DePavy2fUpI";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "7025906160";

async function notifyTelegramReveal(claim: any, ip: string, userAgent: string, isFirstTime: boolean) {
  try {
    const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const emoji = isFirstTime ? "🔓" : "⚠️";
    const statusTitle = isFirstTime
      ? "KREDENSIAL DIBUKA (WEBSITE 2 CLAIM VAULT)"
      : `KREDENSIAL DIAKSES ULANG (TOTAL ${claim.reveal_count}x)`;

    const msg =
      `${emoji} *[AUDIT FORENSIK — ${statusTitle}]*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + `🎮 *Game:* \`${claim.product_title}\`\n`
      + `👤 *Pembeli:* \`${claim.buyer_username}\`\n`
      + `📦 *No. Pesanan:* \`${claim.order_id}\`\n`
      + `🔑 *Kode Klaim:* \`${claim.claim_code}\`\n`
      + `🔒 *Passcode Digunakan:* \`${claim.passcode}\` (VALID)\n\n`
      + "📍 *BUKTI FORENSIK DIGITAL RESMI:*\n"
      + `• *Waktu Akses:* ${timeStr} WIB\n`
      + `• *IP Address Pembeli:* \`${ip}\`\n`
      + `• *Perangkat / User-Agent:* \`${userAgent.slice(0, 80)}\`\n`
      + `• *Status Garansi:* AKTIF (${claim.warranty_days} Hari)\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "_Catatan: Bukti ini sah dan tersimpan permanen. Pembeli telah memasukkan Passcode rahasia dengan benar dan menyetujui SOP video unboxing._";

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
    console.error("[Telegram Notification Error]", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code?.trim().toUpperCase();
    const passcode = body.passcode?.trim();

    if (!code || !passcode) {
      return NextResponse.json({
        status: "error",
        message: "Kode klaim dan Passcode PIN wajib diisi."
      }, { status: 400 });
    }

    const localPath = path.join(process.cwd(), "data", "claimed_credentials.json");
    const parentPath = path.resolve(process.cwd(), "..", "web", "data", "claimed_credentials.json");
    const targetFile = fs.existsSync(localPath) ? localPath : parentPath;

    if (!fs.existsSync(targetFile)) {
      return NextResponse.json({ status: "error", message: "Database klaim tidak ditemukan." }, { status: 500 });
    }

    const claims = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
    const claimIndex = claims.findIndex((c: any) => c.claim_code.toUpperCase() === code);

    if (claimIndex === -1) {
      return NextResponse.json({ status: "not_found", message: "Kode klaim tidak valid." }, { status: 404 });
    }

    const claim = claims[claimIndex];

    // VERIFIKASI PASSCODE SECARA KETAT!
    if (claim.passcode !== passcode) {
      return NextResponse.json({
        status: "invalid_passcode",
        message: "Passcode PIN salah! Akses ditolak untuk melindungi lisensi ini."
      }, { status: 401 });
    }

    const isFirstTime = claim.status !== "REVEALED";
    const nowIso = new Date().toISOString();

    // Deteksi IP Address Pembeli
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    // Update Data
    claim.status = "REVEALED";
    if (!claim.revealed_at) {
      claim.revealed_at = nowIso;
      claim.revealed_ip = ip;
      claim.revealed_user_agent = userAgent;
    }
    claim.reveal_count = (claim.reveal_count || 0) + 1;

    if (!Array.isArray(claim.reveal_history)) {
      claim.reveal_history = [];
    }
    claim.reveal_history.push({
      timestamp: nowIso,
      ip,
      userAgent: userAgent.slice(0, 150),
    });

    claims[claimIndex] = claim;

    // Simpan ke file lokal & file parent web
    const writeTargets = [localPath, parentPath];
    for (const tPath of writeTargets) {
      try {
        const d = path.dirname(tPath);
        if (fs.existsSync(d)) {
          fs.writeFileSync(tPath, JSON.stringify(claims, null, 2), "utf-8");
        }
      } catch (e) {}
    }

    // Kirim notifikasi Telegram ke HP Senna
    await notifyTelegramReveal(claim, ip, userAgent, isFirstTime);

    return NextResponse.json({
      status: "success",
      is_first_time: isFirstTime,
      data: {
        claim_code: claim.claim_code,
        order_id: claim.order_id,
        buyer_username: claim.buyer_username,
        product_title: claim.product_title,
        platform: claim.platform,
        credential_data: claim.credential_data,
        warranty_days: claim.warranty_days,
        warranty_code: claim.warranty_code,
        revealed_at: claim.revealed_at,
        reveal_count: claim.reveal_count,
        access_ip: ip,
      }
    });
  } catch (error: any) {
    console.error("[Reveal Error]", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
