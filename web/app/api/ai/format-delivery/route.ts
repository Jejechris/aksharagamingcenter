import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

interface DeliveryFormatRequest {
  raw_credentials: string;
  game_title?: string;
  platform?: string;
  buyer_name?: string;
  channel?: "Shopee" | "WhatsApp" | "Tokopedia" | string;
  tone?: string;
  delivery_mode?: "digital" | "physical_envelope";
}

// Fallback regex credential parser if AI call encounters issues
function fallbackParseCredentials(raw: string): { user: string; pass: string; extra: string; isKey: boolean } {
  const clean = raw.trim();
  const cdKeyMatch = clean.match(/([A-Z0-9]{4,5}-[A-Z0-9]{4,5}-[A-Z0-9]{4,5}(-[A-Z0-9]{4,5})?(-[A-Z0-9]{4,5})?)/i);
  const isKey = !!cdKeyMatch || clean.toLowerCase().includes("cdkey") || clean.toLowerCase().includes("redeem") || clean.toLowerCase().startsWith("key:");

  if (isKey) {
    const key = cdKeyMatch ? cdKeyMatch[0].toUpperCase() : clean.replace(/^key:\s*/i, "");
    return {
      user: key,
      pass: "KODE REDEEM RESMI (0% Hackback)",
      extra: "Aktivasi permanen langsung ke akun pribadi Anda",
      isKey: true,
    };
  }

  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let user = "";
  let pass = "";
  let extra = "";

  const firstLine = lines[0] || "";
  if (firstLine.includes(":")) {
    const parts = firstLine.split(":");
    user = parts[0]?.trim() || "";
    const remaining = parts.slice(1).join(":");
    if (remaining.includes("|")) {
      const sub = remaining.split("|");
      pass = sub[0]?.trim() || "";
      extra = sub.slice(1).join(" | ").trim();
    } else {
      pass = remaining.trim();
    }
  } else if (firstLine.includes("|")) {
    const parts = firstLine.split("|");
    user = parts[0]?.trim() || "";
    pass = parts[1]?.trim() || "";
    if (parts.length > 2) extra = parts.slice(2).join(" | ").trim();
  } else if (lines.length >= 2) {
    user = lines[0];
    pass = lines[1];
    if (lines.length > 2) extra = lines.slice(2).join(" | ");
  } else {
    user = raw.trim();
    pass = "(Cek detail akun)";
  }

  return { user, pass, extra, isKey: false };
}

function buildFallbackTemplate(
  user: string,
  pass: string,
  extra: string,
  game: string,
  platform: string,
  buyer: string,
  channel: string,
  deliveryMode: "digital" | "physical_envelope" = "digital",
  isKey: boolean = false
): string {
  const buyerGreeting = buyer && buyer.toLowerCase() !== "kak" ? `Kak ${buyer.replace(/^Kak\s+/i, "")}` : "Kak";
  const isWhatsApp = channel.toLowerCase().includes("whatsapp") || channel.toLowerCase().includes("wa");
  const isDigital = deliveryMode === "digital";

  const warrantySectionWa = isDigital
    ? `🛡️ *PENGINGAT GARANSI RESMI:*
• Pesanan ini diproses 100% *DIGITAL* (Non-Fisik). Tidak ada paket/garansi digital yang dikirim melalui kurir ekspedisi.
• Garansi resmi Akshara Gaming Center otomatis aktif secara digital berdasarkan No. Pesanan & riwayat chat WhatsApp ini.`
    : `🛡️ *PENGINGAT GARANSI RESMI:*
• garansi digital berisi *garansi digital Akshara* sedang dikirimkan via ekspedisi.
• Simpan garansi digital tersebut ya Kak. Sesuai SOP, klaim garansi memerlukan *screenshot kendala garansi digital tanpa jeda (no-cut)*.`;

  const warrantySectionShopee = isDigital
    ? `🛡️ PENGINGAT GARANSI RESMI:
• Pesanan ini diproses 100% DIGITAL (Non-Fisik / Instant Delivery via Shopee Chat). Tidak ada paket/garansi digital yang dikirimkan ke kurir.
• Garansi resmi toko otomatis aktif secara digital berdasarkan No. Pesanan ini. Simpan bukti chat ini sebagai tiket garansi resmi Kakak.`
    : `🛡️ PENGINGAT GARANSI RESMI:
• garansi digital berisi Kartu Garansi Resmi A6 Akshara sedang kami kirimkan ke alamat Kakak via ekspedisi Shopee.
`;

  if (isKey) {
    if (isWhatsApp) {
      return `Halo *${buyerGreeting}*! ✨

Terima kasih banyak telah memesan di *Akshara Gaming Center*. Kode lisensi resmi *${game}* Kakak sudah siap dan bergaransi *0% Hackback*! 🎮

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 *KODE REDEEM RESMI (CDKEY)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• *Game:* ${game}
• *Platform:* ${platform}
• *Digital Key / Redeem Code:*
\`\`\`${user}\`\`\`
• *Status:* 🛡️ 100% Original & Permanen di Library Pribadi${extra ? `\n• *Catatan:* ${extra}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_(Ketuk kode di atas 1x untuk langsung menyalin)_

🚀 *3 LANGKAH MUDAH AKTIVASI:*
1. Buka aplikasi ${platform} di PC/laptop Kakak (atau login via web resmi).
2. Pilih menu *Games* di pojok kiri atas -> klik *Activate a Product on Steam...* (atau menu Redeem Code).
3. Masukkan kode CDKey di atas, klik *Confirm*, dan game otomatis masuk permanen ke akun pribadi Kakak!

${warrantySectionWa}

Selamat bermain dan have fun ya *${buyerGreeting}*! 🚀
_Jika ada kendala saat aktivasi, balas chat WhatsApp ini ya, CS Akshara siap mendampingi!_`;
    }

    return `Halo ${buyerGreeting}! ✨

Terima kasih banyak telah berbelanja di Akshara Gaming Center. Kode digital resmi ${game} Kakak telah siap untuk langsung di-redeem ke akun pribadi Kakak (0% Hackback)! 🎮

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 KODE REDEEM RESMI (DIGITAL CDKEY) ${game.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Game        : ${game}
• Platform    : ${platform}
• Kode CDKey  : ${user}
• Status      : 🛡️ Original & Permanen di Akun Pribadi Kakak${extra ? `\n• Catatan     : ${extra}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 3 LANGKAH MUDAH AKTIVASI:
1. Buka aplikasi ${platform} di PC/Laptop Kakak (atau login via web resmi).
2. Pilih menu Games di pojok kiri atas -> klik "Activate a Product on Steam..." (atau menu Redeem Code).
3. Masukkan kode CDKey di atas -> klik "Next / Confirm". Game akan otomatis aktif permanen di library akun Kakak!

${warrantySectionShopee}

Mohon bantu konfirmasi "Pesanan Diterima" di aplikasi Shopee setelah aktivasi berhasil dicek, dan berikan ulasan bintang 5 ⭐⭐⭐⭐⭐ jika Kakak puas dengan pelayanan kami.

Selamat bermain ya ${buyerGreeting}! 🚀
Jika ada kendala saat redeem, CS Akshara siap mendampingi via Chat Shopee ini.`;
  }

  if (isWhatsApp) {
    // WhatsApp native formatting (*bold*, ```monospace for tap-to-copy```, _italic_)
    return `Halo *${buyerGreeting}*! ✨

Terima kasih banyak telah memesan di *Akshara Gaming Center*. Pesanan *${game}* Kakak sudah siap dan berstatus *Full Access*! 🎮

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *DETAIL KREDENSIAL AKUN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• *Game:* ${game}
• *Platform:* ${platform}
• *Email / ID:*
\`\`\`${user}\`\`\`
• *Password:*
\`\`\`${pass}\`\`\`
• *Status:* Full Access (Bisa Ganti Email & Password)${extra ? `\n• *Catatan:* ${extra}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_(Ketuk kredensial di atas 1x untuk langsung menyalin)_

🔒 *3 LANGKAH CEPAT PENGAMANAN AKUN:*
1. *Login* ke aplikasi ${platform} resmi dan cek library game.
2. *Ganti Password* ke password pribadi Kakak yang aman.
3. *Ganti Email* & aktifkan *2-Factor Authentication* (Steam Guard / Authenticator).

${warrantySectionWa}

Selamat bermain dan have fun ya *${buyerGreeting}*! 🚀
_Jika ada pertanyaan atau kendala saat login, balas chat WhatsApp ini ya, CS Akshara siap mendampingi!_`;
  }

  // Shopee Chat Formatting: Clean text, strict anti-ban compliance (no external links, no WA mentions), Shopee order confirmation & 5-star call to action
  return `Halo ${buyerGreeting}! ✨

Terima kasih banyak telah berbelanja di Akshara Gaming Center. Pesanan ${game} Kakak telah kami siapkan dengan status Full Access & siap dimainkan! 🎮

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DETAIL KREDENSIAL AKUN ${game.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Game         : ${game}
• Platform     : ${platform}
• Email / ID   : ${user}
• Password     : ${pass}
• Status       : Full Access (Bebas Ganti Email & Password Sendiri)${extra ? `\n• Catatan      : ${extra}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 3 LANGKAH CEPAT AMANKAN AKUN:
1. Login ke aplikasi ${platform} resmi dan periksa lisensi game di library.
2. Segera ubah Password akun ke password pribadi Kakak yang aman.
3. Ubah Email akun ke email pribadi Kakak & aktifkan verifikasi 2-Factor Authentication (Steam Guard / 2FA).

${warrantySectionShopee}

Mohon bantu konfirmasi "Pesanan Diterima" di aplikasi Shopee setelah akun berhasil dicek, dan berikan ulasan bintang 5 ⭐⭐⭐⭐⭐ jika Kakak puas dengan pelayanan kami.

Selamat bermain dan have fun ya ${buyerGreeting}! 🚀
Jika ada kendala, CS Akshara siap mendampingi via Chat Shopee ini.`;
}

export async function POST(req: Request) {
  try {
    const body: DeliveryFormatRequest = await req.json();
    const rawInput = (body.raw_credentials || "").trim();
    const gameTitle = (body.game_title || "Game Digital").trim();
    const platform = (body.platform || "Steam").trim();
    const buyerName = (body.buyer_name || "Kak").trim();
    const channel = (body.channel || "Shopee").trim();
    const tone = (body.tone || "Ramah, Sopan & Profesional").trim();
    const deliveryMode = (body.delivery_mode === "physical_envelope" ? "physical_envelope" : "digital");

    if (!rawInput) {
      return NextResponse.json(
        { status: "error", message: "Raw credentials akun game wajib diisi." },
        { status: 400 }
      );
    }

    const isWhatsApp = channel.toLowerCase().includes("whatsapp") || channel.toLowerCase().includes("wa");
    const isDigital = deliveryMode === "digital";

    // Delivery Mode Directive
    const deliveryModeRules = isDigital
      ? `ATURAN MODE PENGIRIMAN: 100% DIGITAL (NON-FISIK / TANPA garansi digital / TANPA KURIR):
- DILARANG KERAS menyebutkan kata "garansi digital", "resi pengiriman kurir", atau "ekspedisi sedang mengantar paket"!
- Jelaskan bahwa pesanan ini diproses secara 100% DIGITAL langsung melalui chat ini.
- Jelaskan bahwa garansi toko otomatis aktif secara DIGITAL berbasis No. Pesanan dan riwayat chat ini.`
      : `ATURAN MODE PENGIRIMAN: PAKET AMPLUP FISIK (garansi digital):
- Sertakan pengingat bahwa garansi digital resmi berisi garansi digital Akshara sedang dikirimkan via kurir ekspedisi ke alamat pembeli.
- Ingatkan pembeli untuk merekam screenshot kendala garansi digital tanpa jeda/cut jika suatu saat membutuhkan klaim garansi.`;

    // Dynamic Channel Directives
    const channelRules = isWhatsApp
      ? `ATURAN KHUSUS WHATSAPP CHAT:
- Format HARUS menggunakan native WhatsApp Markdown:
  * Judul dan label penting gunakan *Bold* (misal: *Game:*, *Platform:*, *Password:*).
  * Untuk kredensial Email/ID dan Password / CDKey, letakkan di baris tersendiri dan BUNGKUS dengan tiga backtick monospace (\`\`\`credential\`\`\`) agar pembeli di Android/iOS WhatsApp dapat melakukan 1-tap copy (ketuk 1x langsung tersalin)!
  * Gunakan _Italic_ untuk catatan dan tips ramah.
- Boleh menyapa bahwa CS siap membantu langsung di chat WhatsApp ini.`
      : `ATURAN KHUSUS SHOPEE CHAT (STRICT MARKETPLACE COMPLIANCE):
- DILARANG KERAS menyertakan nomor HP, kata "WhatsApp", link luar (wa.me, bit.ly, dll), atau ajakan transaksi di luar Shopee! Pelanggaran aturan ini akan menyebabkan sensor otomatis atau penalti toko dari Shopee.
- Format visual clean: gunakan pembatas bergaris ascii (━━━━━━━━━━━━━━━━━━━━━━━━━━━━) dan bullet points (•). JANGAN gunakan tanda kutip kode triple backtick karena app Shopee mobile sering menampilkannya mentah/rusak.
- Sertakan instruksi spesifik Shopee: Ingatkan pembeli untuk menekan "Pesanan Diterima" di aplikasi Shopee dan memberikan ulasan bintang 5 ⭐⭐⭐⭐⭐ beserta ulasan positif.`;

    const systemPrompt = `Kamu adalah AI Delivery & Customer Experience Specialist untuk Akshara Gaming Center (toko game digital terpercaya di Indonesia).
Tugasmu adalah memproses raw data (bisa berupa akun email:password dari G2G ATAU kode redeem digital CDKey resmi dari Eneba/supplier) lalu merangkainya menjadi PESAN PENGIRIMAN SIAP KIRIM yang SANGAT ESTETIS, PROFESIONAL, RAMAH, dan AMAN untuk dikirimkan ke pembeli di ${channel}.

${channelRules}

${deliveryModeRules}

PENTING - DETEKSI PRODUK:
1. JIKA RAW DATA BERUPA KODE REDEEM / CDKEY (seperti kode format XXXXX-XXXXX-XXXXX, atau berisi kata 'key', 'redeem', lisensi digital key):
   - Box Utama: KODE REDEEM RESMI (DIGITAL CDKEY)
   - Tampilkan Kode Redeem dengan jelas (gunakan monospace backtick jika WhatsApp).
   - Tekankan bahwa ini adalah KODE ASLI / OFFICIAL KEY yang langsung di-redeem ke akun pribadi pembeli (0% Risiko Hackback).
   - 3 Langkah Aktivasi (Gantikan langkah ganti password dengan langkah redeem resmi di ${platform}):
     * Langkah 1: Buka aplikasi ${platform} di PC/laptop (atau menu redeem resmi).
     * Langkah 2: Buka menu redeem lisensi produk (misal di Steam: Games -> Activate a Product on Steam...).
     * Langkah 3: Masukkan kode CDKey di atas, konfirmasi, dan game otomatis permanen di library pribadi pembeli.
2. JIKA RAW DATA BERUPA KREDENSIAL AKUN (email:pass):
   - Gunakan format akun Full Access dan 3 langkah pengamanan akun standar (login, ubah pass, ubah email & 2FA).

STRUKTUR PESAN WAJIB:
1. Salam Pembuka yang hangat, sopan, dan apresiasi tulus atas pembelian. Sapa pembeli dengan: "${buyerName}".
2. Box Kredensial / CDKey yang rapi dan terstruktur.
3. 3 Langkah Cepat Pengamanan / Aktivasi (Actionable SOP bagi pembeli).
4. Catatan Garansi Akshara Gaming Center sesuai mode: ${isDigital ? "100% Digital via No. Pesanan & Chat" : "garansi digital via Ekspedisi + screenshot kendala"}.
5. Penutup yang hangat sesuai channel ${channel}, mendoakan have fun gaming, dan reminder review bintang 5.

FORMAT OUTPUT HARUS JSON MURNI TANPA MARKDOWN KUTIPAN KODE:
{
  "parsed_email_or_user": "<email/username atau kode CDKey yang diekstrak>",
  "parsed_password": "<password akun atau 'KODE REDEEM RESMI (0% HACKBACK)'>",
  "additional_info": "<info tambahan jika ada, atau kosongkan>",
  "formatted_message": "<pesan lengkap teks siap copy-paste>",
  "security_steps": [
    "<langkah 1>",
    "<langkah 2>",
    "<langkah 3>"
  ]
}`;

    let parsedResult = {
      parsed_email_or_user: "",
      parsed_password: "",
      additional_info: "",
      formatted_message: "",
      security_steps: [
        `Login ke platform ${platform} resmi dan periksa lisensi ${gameTitle}.`,
        "Ganti password akun ke kombinasi rahasia pribadi Anda.",
        "Ubah alamat email ke email pribadi Anda dan aktifkan verifikasi 2FA."
      ]
    };

    try {
      const userPrompt = `Data Akun Mentah:\n${rawInput}\n\nGame: ${gameTitle}\nPlatform: ${platform}\nNama Pembeli: ${buyerName}\nChannel: ${channel}\nMode Pengiriman: ${isDigital ? "Digital Murni (Non-Fisik)" : "Paket garansi digital"}\nTone: ${tone}`;
      const aiResponse = await callGemini(userPrompt, systemPrompt);

      let cleaned = aiResponse.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

      const parsed = JSON.parse(cleaned.trim());
      parsedResult = {
        parsed_email_or_user: parsed.parsed_email_or_user || "",
        parsed_password: parsed.parsed_password || "",
        additional_info: parsed.additional_info || "",
        formatted_message: parsed.formatted_message || "",
        security_steps: parsed.security_steps || parsedResult.security_steps
      };
    } catch (aiErr) {
      console.warn("Gemini format delivery fallback:", aiErr);
      const fb = fallbackParseCredentials(rawInput);
      parsedResult.parsed_email_or_user = fb.user;
      parsedResult.parsed_password = fb.pass;
      parsedResult.additional_info = fb.extra;
      parsedResult.formatted_message = buildFallbackTemplate(
        fb.user,
        fb.pass,
        fb.extra,
        gameTitle,
        platform,
        buyerName,
        channel,
        deliveryMode,
        fb.isKey
      );
    }

    // Ensure we always have formatted_message
    if (!parsedResult.formatted_message) {
      const fb = fallbackParseCredentials(rawInput);
      parsedResult.parsed_email_or_user = parsedResult.parsed_email_or_user || fb.user;
      parsedResult.parsed_password = parsedResult.parsed_password || fb.pass;
      parsedResult.formatted_message = buildFallbackTemplate(
        parsedResult.parsed_email_or_user,
        parsedResult.parsed_password,
        parsedResult.additional_info || fb.extra,
        gameTitle,
        platform,
        buyerName,
        channel,
        deliveryMode,
        fb.isKey
      );
    }

    return NextResponse.json({
      status: "success",
      model_used: "gemini-3.5-flash-lite",
      data: {
        game_title: gameTitle,
        platform: platform,
        buyer_name: buyerName,
        channel: channel,
        delivery_mode: deliveryMode,
        parsed_user: parsedResult.parsed_email_or_user,
        parsed_password: parsedResult.parsed_password,
        additional_info: parsedResult.additional_info,
        formatted_message: parsedResult.formatted_message,
        security_steps: parsedResult.security_steps
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

