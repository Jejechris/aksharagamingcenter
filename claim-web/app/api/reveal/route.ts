import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbClaimByCode, updateDbClaimState } from "@/lib/db";
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
  } catch {}
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
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;
  try {
    const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const emoji = isFirstTime ? "🔓" : "⚠️";
    const statusTitle = isFirstTime
      ? "KREDENSIAL DIBUKA (PORTAL PUBLIK CLAIM VAULT)"
      : `KREDENSIAL DIAKSES ULANG (TOTAL ${claim.reveal_count}x)`;

    const vpnStatusStr = forensicsReport.is_vpn_or_proxy
      ? "⚠️ TERDETEKSI VPN/HOSTING/DATACENTER (Risiko Tinggi)"
      : "🛡️ AMAN (Residential ISP / Tanpa VPN)";

    const msg =
      `${emoji} *[AUDIT FORENSIK — ${statusTitle}]*\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + `🎮 *Game:* \`${claim.product_title}\`\n`
      + `👤 *Pembeli:* \`${claim.buyer_username}\`\n`
      + `📦 *No. Pesanan:* \`${claim.order_id}\`\n`
      + `🔑 *Kode Klaim:* \`${claim.claim_code}\`\n`
      + `🔒 *Passcode Digunakan:* \`${claim.passcode}\` (VALID)\n\n`
      + "📍 *BUKTI FORENSIK DIGITAL RESMI (ANTI-FRAUD):*\n"
      + `• *Waktu Akses:* ${timeStr} WIB\n`
      + `• *IP Address Pembeli:* \`${ip}\`\n`
      + `• *Lokasi & ISP:* \`${forensicsReport.city}, ${forensicsReport.regionName}, ${forensicsReport.country}\` (${forensicsReport.isp})\n`
      + `• *Status VPN/Proxy:* ${vpnStatusStr}\n`
      + `• *Resolusi & Timezone:* \`${forensicsReport.screen_resolution}\` | \`${forensicsReport.timezone}\`\n`
      + `• *Perangkat / User-Agent:* \`${userAgent.slice(0, 80)}\`\n`
      + `• *Status Garansi:* AKTIF (${claim.warranty_days} Hari)\n`
      + "━━━━━━━━━━━━━━━━━━━━━━\n"
      + "_Catatan: Bukti ini sah dan tersimpan permanen._";

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

async function notifyTelegramBruteForceAlert(claim: any, ip: string, userAgent: string) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;
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
      + "🔒 *Tindakan:* Akun otomatis DIKUNCI sementara selama 15 menit.";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code?.trim().toUpperCase();
    const passcode = body.passcode?.trim();

    if (!code || !passcode) {
      return NextResponse.json(
        { status: "error", message: "Kode klaim dan Passcode PIN wajib diisi." },
        { status: 400 }
      );
    }

    let claim = await getDbClaimByCode(code);
    const localPath = path.join(process.cwd(), "data", "claimed_credentials.json");
    let localClaims: any[] = [];
    let localIdx = -1;

    if (!claim && fs.existsSync(localPath)) {
      try {
        localClaims = JSON.parse(fs.readFileSync(localPath, "utf-8"));
        localIdx = localClaims.findIndex((c: any) => (c.claim_code || "").toUpperCase() === code);
        if (localIdx !== -1) claim = localClaims[localIdx];
      } catch {}
    }

    if (!claim) {
      return NextResponse.json({ status: "not_found", message: "Kode klaim tidak valid." }, { status: 404 });
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

    const syncLocalDisk = () => {
      if (localIdx === -1) return;
      try {
        localClaims[localIdx] = claim;
        fs.writeFileSync(localPath, JSON.stringify(localClaims, null, 2), "utf-8");
      } catch {}
    };

    if (claim.passcode !== passcode) {
      claim.failed_attempts = (claim.failed_attempts || 0) + 1;
      const isLocked = claim.failed_attempts >= 5;
      if (isLocked) {
        claim.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await notifyTelegramBruteForceAlert(claim, ip, userAgent);
      }

      await updateDbClaimState(claim);
      syncLocalDisk();

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
    }

    claim.failed_attempts = 0;
    claim.locked_until = null;

    const isFirstTime = claim.status !== "REVEALED";
    const nowIso = new Date().toISOString();
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

    claim.status = "REVEALED";
    if (!claim.revealed_at) {
      claim.revealed_at = nowIso;
      claim.revealed_ip = ip;
      claim.revealed_user_agent = userAgent;
      claim.forensics = forensicsReport;
    }
    claim.reveal_count = (claim.reveal_count || 0) + 1;
    if (!Array.isArray(claim.reveal_history)) claim.reveal_history = [];
    claim.reveal_history.push({
      timestamp: nowIso,
      ip,
      userAgent: userAgent.slice(0, 150),
      forensics: forensicsReport,
    });

    await updateDbClaimState(claim);
    syncLocalDisk();
    await notifyTelegramReveal(claim, ip, userAgent, isFirstTime, forensicsReport);

    const decryptedCreds = decryptCredential(claim.credential_data, passcode);

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
        reveal_count: claim.reveal_count,
        access_ip: ip,
        forensics: forensicsReport,
      },
    });
  } catch (error: any) {
    console.error("[Reveal Error]", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
