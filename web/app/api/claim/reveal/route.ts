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
      ? "KREDENSIAL DIBUKA PERTAMA KALI OLEH PEMBELI"
      : `KREDENSIAL DIAKSES ULANG (TOTAL ${claim.reveal_count}x)`;

    const msg =
      `${emoji} *[AUDIT KEAMANAN — ${statusTitle}]*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + `🎮 *Game:* \`${claim.product_title}\`\n`
      + `👤 *Pembeli:* \`${claim.buyer_username}\`\n`
      + `📦 *No. Pesanan:* \`${claim.order_id}\`\n`
      + `🔑 *Kode Klaim:* \`${claim.claim_code}\`\n\n`
      + "📍 *BUKTI FORENSIK DIGITAL (SHOPEE DISPUTE PROOF):*\n"
      + `• *Waktu Akses:* ${timeStr} WIB\n`
      + `• *IP Address Pembeli:* \`${ip}\`\n`
      + `• *Perangkat / User-Agent:* \`${userAgent.slice(0, 80)}\`\n`
      + `• *Status Garansi:* AKTIF (${claim.warranty_days} Hari)\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "_Catatan: Bukti ini sah dan permanen. Jika pembeli mengajukan komplain akun bermasalah setelah detik ini, wajib melampirkan screenshot kendala tanpa jeda dari sebelum link dibuka._";

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
    console.error("[Telegram Reveal Alert Error]", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ status: "error", message: "Kode klaim wajib diisi." }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data", "claimed_credentials.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ status: "error", message: "Database klaim tidak ditemukan." }, { status: 500 });
    }

    const claims = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const claimIndex = claims.findIndex((c: any) => c.claim_code.toUpperCase() === code);

    if (claimIndex === -1) {
      return NextResponse.json({ status: "not_found", message: "Kode klaim tidak valid." }, { status: 404 });
    }

    const claim = claims[claimIndex];
    const isFirstTime = claim.status !== "REVEALED";
    const nowIso = new Date().toISOString();

    // Deteksi IP Address Pembeli
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    // Update Status Forensik
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
    fs.writeFileSync(filePath, JSON.stringify(claims, null, 2), "utf-8");

    // Sinkronkan ke replika jika ada
    const replicaPaths = [
      "C:\\Users\\jesen\\Desktop\\scrt\\web\\data\\claimed_credentials.json",
      path.resolve(process.cwd(), "..", "output", "claimed_credentials.json")
    ];
    for (const rPath of replicaPaths) {
      try {
        const dir = path.dirname(rPath);
        if (fs.existsSync(dir)) {
          fs.writeFileSync(rPath, JSON.stringify(claims, null, 2), "utf-8");
        }
      } catch (e) {}
    }

    // Kirim Push Notification ke Telegram Senna
    await notifyTelegramReveal(claim, ip, userAgent, isFirstTime);

    // Kembalikan Kredensial Lengkap
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
        current_access_at: nowIso,
        reveal_count: claim.reveal_count,
        access_ip: ip,
      }
    });
  } catch (error: any) {
    console.error("[Claim Reveal Error]", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
