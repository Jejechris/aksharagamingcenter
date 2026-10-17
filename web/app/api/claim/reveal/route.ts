import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbClaimByCode, upsertDbClaim, getDbClaims, getKV, setKV } from "@/lib/db";
import { decryptCredential } from "@/lib/cryptoVault";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

async function inspectIpForensics(ip: string) {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return {
      status: "local",
      country: "Indonesia",
      regionName: "Localhost / Internal Dev",
      city: "Jakarta",
      isp: "Development ISP / Local",
      org: "Internal Network",
      as: "AS0",
      is_vpn_or_proxy: false,
    };
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,as,proxy,hosting`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        return {
          status: "success",
          country: data.country || "Indonesia",
          regionName: data.regionName || "Unknown Region",
          city: data.city || "Unknown City",
          isp: data.isp || "Unknown ISP",
          org: data.org || "",
          as: data.as || "",
          is_vpn_or_proxy: Boolean(data.proxy || data.hosting),
        };
      }
    }
  } catch (e) {
    console.warn("[IP Forensics] Lookup timed out or failed:", e);
  }
  return {
    status: "unknown",
    country: "Indonesia",
    regionName: "Unknown Region",
    city: "Unknown City",
    isp: "Unknown ISP",
    org: "",
    as: "",
    is_vpn_or_proxy: false,
  };
}

async function notifyTelegramReveal(claim: any, ip: string, userAgent: string, isFirstTime: boolean, forensicsReport: any) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.warn("[Telegram Reveal Alert] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not configured, skipping.");
    return;
  }
  try {
    const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const emoji = isFirstTime ? "🔓" : "⚠️";
    const statusTitle = isFirstTime
      ? "KREDENSIAL DIBUKA PERTAMA KALI OLEH PEMBELI"
      : `KREDENSIAL DIAKSES ULANG (TOTAL ${claim.reveal_count}x)`;

    const vpnStatusStr = forensicsReport.is_vpn_or_proxy
      ? "⚠️ TERDETEKSI VPN/HOSTING/DATACENTER (Risiko Tinggi)"
      : "🛡️ AMAN (Residential ISP / Tanpa VPN)";

    const msg =
      `${emoji} *[AUDIT KEAMANAN & FORENSIK — ${statusTitle}]*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + `🎮 *Game:* \`${claim.product_title}\`\n`
      + `👤 *Pembeli:* \`${claim.buyer_username}\`\n`
      + `📦 *No. Pesanan:* \`${claim.order_id}\`\n`
      + `🔑 *Kode Klaim:* \`${claim.claim_code}\`\n`
      + `🔒 *Passcode Digunakan:* \`${claim.passcode}\` (VALID)\n\n`
      + "📍 *BUKTI FORENSIK DIGITAL (SHOPEE DISPUTE PROOF):*\n"
      + `• *Waktu Akses:* ${timeStr} WIB\n`
      + `• *IP Address Pembeli:* \`${ip}\`\n`
      + `• *Lokasi & ISP:* \`${forensicsReport.city}, ${forensicsReport.regionName}, ${forensicsReport.country}\` (${forensicsReport.isp})\n`
      + `• *Status VPN/Proxy:* ${vpnStatusStr}\n`
      + `• *Resolusi & Timezone:* \`${forensicsReport.screen_resolution}\` | \`${forensicsReport.timezone}\`\n`
      + `• *Perangkat / User-Agent:* \`${userAgent.slice(0, 80)}\`\n`
      + `• *Status Garansi:* AKTIF (${claim.warranty_days} Hari)\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "_Catatan: Bukti ini sah dan permanen. Pembeli telah menyetujui SOP video tanpa jeda saat membuka kredensial._";

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

function syncLocalDisk(claims: any[]) {
  const localPath = path.join(process.cwd(), "data", "claimed_credentials.json");
  const parentPath = path.resolve(process.cwd(), "..", "claim-web", "data", "claimed_credentials.json");
  const outputPath = path.resolve(process.cwd(), "..", "output", "claimed_credentials.json");
  for (const tPath of [localPath, parentPath, outputPath]) {
    try {
      const d = path.dirname(tPath);
      if (fs.existsSync(d)) {
        fs.writeFileSync(tPath, JSON.stringify(claims, null, 2), "utf-8");
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

    // 1. Ambil data dari claims_vault (Row-Level Atomic) atau KV Cloud Database
    let claims: any[] = [];
    const dbClaims = await getDbClaims();
    if (dbClaims && Array.isArray(dbClaims) && dbClaims.length > 0) {
      claims = dbClaims;
    } else {
      const dbKv = await getKV("claimed_credentials");
      if (dbKv && Array.isArray(dbKv)) {
        claims = dbKv;
      } else {
        const filePath = path.join(process.cwd(), "data", "claimed_credentials.json");
        if (fs.existsSync(filePath)) {
          claims = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
      }
    }

    let claim = await getDbClaimByCode(code);
    let claimIndex = claims.findIndex((c: any) => c.claim_code.toUpperCase() === code);
    if (!claim && claimIndex !== -1) {
      claim = claims[claimIndex];
    }

    if (!claim) {
      return NextResponse.json({ status: "not_found", message: "Kode klaim tidak valid." }, { status: 404 });
    }

    // Deteksi IP Address & Perangkat Pembeli
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

    // Validasi passcode jika claim memiliki passcode
    if (claim.passcode) {
      if (!passcode || claim.passcode !== passcode) {
        claim.failed_attempts = (claim.failed_attempts || 0) + 1;
        const isLocked = claim.failed_attempts >= 5;
        if (isLocked) {
          claim.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await notifyTelegramBruteForceAlert(claim, ip, userAgent);
        }

        // Simpan pembaruan atomic row-level ke claims_vault
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
          message: `Passcode PIN salah! Sisa percobaan: ${5 - claim.failed_attempts}. Harap masukkan PIN rahasia dari penjual.`
        }, { status: 401 });
      }
    }

    // Passcode valid -> reset status lock
    claim.failed_attempts = 0;
    claim.locked_until = null;

    const isFirstTime = claim.status !== "REVEALED";
    const nowIso = new Date().toISOString();

    // Extract client forensics & IP inspection
    const clientForensics = body.forensics || {};
    const ipForensics = await inspectIpForensics(ip);

    const forensicsReport = {
      ip,
      isp: ipForensics.isp,
      city: ipForensics.city,
      region: ipForensics.regionName,
      country: ipForensics.country,
      is_vpn_or_proxy: ipForensics.is_vpn_or_proxy,
      screen_resolution: clientForensics.screen_resolution || "Unknown",
      timezone: clientForensics.timezone || "Asia/Jakarta",
      language: clientForensics.language || "id-ID",
      platform_os: clientForensics.platform_os || "Unknown",
      hardware_concurrency: clientForensics.hardware_concurrency || 0,
      device_hash: clientForensics.device_hash || "N/A",
    };

    // Update Status Forensik
    claim.status = "REVEALED";
    if (!claim.revealed_at) {
      claim.revealed_at = nowIso;
      claim.revealed_ip = ip;
      claim.revealed_user_agent = userAgent;
      claim.forensics = forensicsReport;
    }
    claim.reveal_count = (claim.reveal_count || 0) + 1;

    if (!Array.isArray(claim.reveal_history)) {
      claim.reveal_history = [];
    }
    claim.reveal_history.push({
      timestamp: nowIso,
      ip,
      userAgent: userAgent.slice(0, 150),
      forensics: forensicsReport,
    });

    // 1. Simpan pembaruan atomic row-level ke PostgreSQL claims_vault
    await upsertDbClaim(claim).catch(() => {});

    if (claimIndex !== -1) {
      claims[claimIndex] = claim;
    } else {
      claims.unshift(claim);
    }

    // 2. Simpan ke KV Database (Cloud Supabase) sebagai backup
    await setKV("claimed_credentials", claims).catch(() => {});

    // 3. Simpan ke disk replika lokal sebagai backup
    syncLocalDisk(claims);

    // Kirim Push Notification ke Telegram Senna
    await notifyTelegramReveal(claim, ip, userAgent, isFirstTime, forensicsReport);

    // Dekripsi kredensial untuk dikirimkan ke pembeli
    const decryptedCreds = decryptCredential(claim.credential_data, passcode);

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
        credential_data: decryptedCreds,
        warranty_days: claim.warranty_days,
        warranty_code: claim.warranty_code,
        revealed_at: claim.revealed_at,
        current_access_at: nowIso,
        reveal_count: claim.reveal_count,
        access_ip: ip,
        forensics: forensicsReport,
      }
    });
  } catch (error: any) {
    console.error("[Claim Reveal Error]", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
