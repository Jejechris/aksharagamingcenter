import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { formatCleanShopeeTitle, stripEmojisAndUnsafeSymbols } from "@/lib/shopeeCompliance";

interface DescriptionRequest {
  gameTitle?: string;
  platform?: string;
  category?: string;
  price?: number;
  style?: "ultimate" | "clean" | "flash_sale" | "security";
  includeUnboxingSop?: boolean;
  includeFaq?: boolean;
  includeActivationSteps?: boolean;
  customNotes?: string;
}

function generateFallbackDescription(params: DescriptionRequest) {
    const {
      gameTitle = "Minecraft: Java & Bedrock Edition",
      platform = "PC / Microsoft",
      category = "Account (Full Access)",
      price = 190900,
      style = "ultimate",
      includeUnboxingSop = true,
    includeFaq = true,
    includeActivationSteps = true,
    customNotes = "",
  } = params;

  const cleanTitle = gameTitle.trim();
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);

  // Clean Shopee Title matching Cover 1:1 (e.g. "Minecraft: Java & Bedrock Edition (PC / Microsoft) - Private")
  const seoTitle = formatCleanShopeeTitle({
    title: cleanTitle,
    platform,
    category,
  });

  // Generate targeted hashtags
  const tagWords = cleanTitle.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const baseTags = [
    `#${tagWords.join("")}`,
    `#Jual${tagWords[0] || "Game"}`,
    "#GamePC",
    "#AksharaGaming",
    "#GaransiDigital",
    `#Game${platform.replace(/[^a-zA-Z0-9]/g, "")}`,
    "#DigitalLicense"
  ];
  const seoHashtags = baseTags.slice(0, 7).join(" ");

  let content = "";

  if (style === "ultimate") {
    content = `Akshara Gaming Center - Official Digital License
${seoTitle}

--------------------------------------------------
DETAIL PRODUK:
- Game: ${gameTitle}
- Platform: ${platform}
- Tipe Lisensi: ${category}
- Kepemilikan: Permanen (Akses Penuh Pribadi untuk 1 Pembeli)
- Wilayah: Global (Siap dimainkan dari Indonesia tanpa pengaturan khusus)
- Bahasa: Multi-language (Termasuk English)
--------------------------------------------------

KEUNGGULAN BELI DI AKSHARA GAMING:
- Full Access Pribadi: Pembeli dapat mengubah Email, Password, dan Pengaturan Keamanan.
- Online Multiplayer Resmi: Dapat dimainkan online di seluruh server resmi.
- Kepemilikan Permanen: Aktif selamanya, bukan sewa berkala.
- Pengiriman Kilat Digital: Kartu Akses dan Sertifikat Garansi Digital QR dikirim langsung via Chat Shopee.
${customNotes ? `CATATAN TAMBAHAN: ${customNotes}\n` : ""}
--------------------------------------------------
${includeActivationSteps ? `3 LANGKAH MUDAH AKTIVASI:
1. Selesaikan pembayaran di Shopee dan cek chat Shopee Anda.
2. Tim Akshara akan mengirimkan Kartu Akses + Kode Klaim dan panduan setup instan via Chat Shopee.
3. Login ke launcher resmi ${platform}, amankan data akun, dan game siap dimainkan.

--------------------------------------------------
` : ""}${includeUnboxingSop ? `SYARAT DAN KETENTUAN KLAIM GARANSI:
1. Wajib merekam video layar (Screen Recording) tanpa jeda (no-cut) dari sebelum membuka Kartu Akses / Brankas Klaim hingga login pertama kali berhasil.
2. Segera lakukan pengecekan dan pengamanan data setelah detail diterima.
3. Garansi tidak berlaku jika akun melanggar ketentuan resmi publisher game.
4. Tim Support Akshara siap membantu setiap hari jika ada kendala login awal.

--------------------------------------------------
` : ""}${includeFaq ? `PERTANYAAN UMUM (FAQ):
Q: Apakah produk ready stok?
A: Ready stok, silakan langsung di-checkout.

Q: Apakah bisa langsung dimainkan di Indonesia?
A: Ya, produk wilayah Global dan berjalan normal menggunakan koneksi internet Indonesia.

Q: Bagaimana cara pengirimannya? Apakah ada paket fisik?
A: Pesanan diproses 100% digital kilat via Chat Shopee + Kartu Akses dan Sertifikat Garansi Digital QR tanpa paket fisik.

--------------------------------------------------
` : ""}Terima kasih telah mempercayakan kebutuhan gaming Anda di Akshara Gaming Center.

${seoHashtags}`;
  } else if (style === "security") {
    content = `Akshara Gaming Center - Keamanan Lisensi Terjamin
${seoTitle}

--------------------------------------------------
KEAMANAN DAN LEGALITAS PRODUK:
- 100% Resmi dan Legal dari jalur distribusi terpercaya.
- Akses Penuh Pribadi: 1 lisensi khusus untuk 1 pembeli saja.
- Update otomatis langsung dari server resmi publisher.
--------------------------------------------------

KELENGKAPAN PESANAN:
1. Lisensi Resmi ${gameTitle}.
2. Panduan Pengamanan Akun Lengkap dan Langkah 2FA.
3. Sertifikat Garansi Digital QR Serial ID dan Panduan Setup Instan.
4. Layanan Purna Jual CS Responsif.

--------------------------------------------------
SOP KLAIM GARANSI:
- Wajib merekam video layar (Screen Recording) saat membuka brankas kredensial dan login pertama tanpa jeda (no-cut).
- Penggantian unit baru diberikan bila data awal bermasalah saat pertama diterima.

${seoHashtags}`;
  } else if (style === "flash_sale") {
    content = `Penawaran Spesial Akshara Gaming Center
${seoTitle} - ${formattedPrice}
Dapatkan Lisensi Resmi dan Kartu Garansi Digital QR.

Stok tersedia untuk pengiriman digital cepat via Chat Shopee:
- Akses Penuh Pribadi (Bisa ubah semua data keamanan)
- Pengiriman instan 100% digital tanpa menunggu kurir
- Garansi resmi toko terpercaya
${customNotes ? `- ${customNotes}\n` : ""}
Langkah Order:
1. Klik Beli Sekarang dan selesaikan pembayaran.
2. Cek Chat Shopee untuk menerima Kartu Akses Digital QR.
3. Scan QR atau masukkan Kode Klaim untuk membuka lisensi Anda.

${seoHashtags}`;
  } else {
    // Clean & Minimalist
    content = `Akshara Gaming Center - ${seoTitle}

Spesifikasi Produk:
- Platform: ${platform}
- Kategori: ${category}
- Region: Global (Siap dimainkan di Indonesia)
- Kepemilikan: Permanen (Akses Penuh Pribadi)

Fitur Utama:
- Lisensi resmi developer
- Akses penuh ganti email dan password
- Mendukung online multiplayer resmi
- Pengiriman 100% digital instan + Kartu Garansi Digital QR tanpa kurir fisik
${includeUnboxingSop ? `- SOP Garansi: Wajib sertakan video rekaman layar (screen recording) saat buka kredensial tanpa jeda (no-cut)\n` : ""}Catatan: Silakan hubungi CS via Chat Shopee jika membutuhkan panduan instalasi.

${seoHashtags}`;
  }

  const sanitizedContent = stripEmojisAndUnsafeSymbols(content);

  return {
    seo_title: seoTitle,
    full_description: sanitizedContent,
    seo_hashtags: seoHashtags,
    character_count: sanitizedContent.length,
    quick_specs: [
      `Platform: ${platform}`,
      `Lisensi: ${category}`,
      "100% Original & Legal",
      "Full Access (Bisa Ganti Email & Password)",
      "Garansi Resmi & Video SOP",
      "Pengiriman 100% Digital + Garansi QR"
    ],
    cover_recommendation: {
      suggested_ratio: "1:1 (1080 x 1080 px)",
      headline_badges: [
        "100% ORIGINAL & LEGAL",
        "GARANSI RESMI 30 HARI",
        category.includes("Key") ? "REDEEM CODE RESMI" : "FULL ACCESS GANTI EMAIL",
        "PENGIRIMAN CEPAT 5 MENIT"
      ],
      theme_color: gameTitle.toLowerCase().includes("minecraft") || gameTitle.toLowerCase().includes("terraria") ? "emerald" : (gameTitle.toLowerCase().includes("gta") || gameTitle.toLowerCase().includes("zomboid") ? "amber" : "violet"),
      ai_image_prompt: `High-converting Shopee product cover for "${gameTitle}" (${platform}), centered official artwork, 1:1 square ratio 1080x1080, dark modern tech aesthetic, vibrant glowing badges: "100% ORIGINAL", "GARANSI RESMI 30 HARI", "FULL ACCESS", clean typography, commercial ecommerce product photography, sharp focus.`,
      design_tips: [
        "Gunakan rasio 1:1 (1080x1080 px) resolusi tinggi agar tajam di semua jenis layar HP pembeli.",
        "Tempatkan judul & badge utama di safe area tengah (80%) agar tidak tertutup badge Shopee Star+ di pojok kiri atas.",
        "Batas teks maksimal 20% dari total luas gambar agar lolos rekomendasi algoritma feed Shopee.",
        "Sertakan badge 'GARANSI RESMI' dan 'FULL ACCESS' untuk membedakan toko dari penjual bajakan/ilegal."
      ]
    }
  };
}

export async function POST(req: Request) {
  try {
    const body: DescriptionRequest = await req.json();

    const {
      gameTitle = "Minecraft: Java & Bedrock Edition",
      platform = "PC / Microsoft",
      category = "Account (Full Access)",
      price = 190900,
      style = "ultimate",
      includeUnboxingSop = true,
      includeFaq = true,
      includeActivationSteps = true,
      customNotes = "",
    } = body;

    const systemPrompt = `Kamu adalah Senior E-Commerce Copywriter & Shopee SEO Specialist spesialis produk game digital dan lisensi software di Indonesia untuk toko "Akshara Gaming Center".
Tugasmu adalah membuat deskripsi produk Shopee Indonesia yang SANGAT MENARIK, PROFESIONAL, PERSUASIF, BERSIH, RAMAH ALGORITMA SHOPEE, dan MEMILIKI KONVERSI PENJUALAN TINGGI, LENGKAP DENGAN REKOMENDASI COVER 1080x1080.

Aturan Penting Format Shopee:
1. Gunakan teks polos alfanumerik standar + tanda baca biasa (---, :, -). DILARANG KERAS memakai emoji, simbol dekoratif unik, kata spam/clickbait ("100% Original", "Termurah", "Best Seller", "Diskon", "Hot Item"), ALL CAPS penuh, maupun kata pemicu filter ("bajakan", "sharing", "hackback", "crack", "carding", "VPN"). DILARANG KERAS mencantumkan tautan website luar (https://, .com, .vercel.app, bit.ly, wa.me).
2. Judul SEO HARUS simpel & seragam dengan cover produk dalam format Title Case: "${formatCleanShopeeTitle({ title: gameTitle, platform, category })}" (maks 120 karakter, tanpa ALL CAPS atau tanda kurung promosi).
3. Deskripsi harus memuat:
   - Header & Keunggulan Produk (Lisensi Resmi Pribadi 1 Pembeli, Bisa Ubah Data Keamanan, Region Global Indonesia).
   - Detail Spesifikasi (Platform, Bahasa, Fitur Online Multiplayer).
   - Kelengkapan Produk (Lisensi Akun + Kartu Garansi Digital QR & Panduan Aktivasi Digital Instan tanpa paket fisik/kurir).
   ${includeActivationSteps ? "- Langkah Cara Aktivasi 3 Langkah Cepat." : ""}
   ${includeUnboxingSop ? "- SOP Garansi & Wajib Video Tanpa Jeda (Wajib merekam video rekaman layar / screen recording saat buka brankas klaim & login pertama)." : ""}
   ${includeFaq ? "- FAQ Pertanyaan Umum (Ready stok, butuh VPN, online multiplayer)." : ""}
   - Hashtags SEO bertarget di bagian paling bawah.
4. Kembalikan HANYA JSON valid tanpa markdown backticks (atau markdown json) dengan format:
{
  "seo_title": "string (maks 120 char)",
  "full_description": "string (deskripsi lengkap siap copy-paste)",
  "seo_hashtags": "string (daftar hashtag #Game #Steam dll)",
  "quick_specs": ["bullet point 1", "bullet point 2", ...],
  "cover_recommendation": {
    "headline_badges": ["badge 1", "badge 2", "badge 3", "badge 4"],
    "ai_image_prompt": "string prompt image generator 1080x1080",
    "theme_color": "violet | emerald | amber | cyan",
    "design_tips": ["tip 1", "tip 2", ...]
  }
} `;

    const userPrompt = `Buatkan deskripsi Shopee terbaik untuk:
- Game: ${gameTitle}
- Platform: ${platform}
- Kategori Lisensi: ${category}
- Harga Jual Shopee: Rp ${price.toLocaleString("id-ID")}
- Gaya Bahasa / Style: ${style} (ultimate = visual lengkap top seller, security = fokus anti-hackback, flash_sale = promo urgency, clean = minimalis to the point)
- Mode Pengiriman: 100% DIGITAL INSTAN (Kartu Garansi Digital QR, TANPA pengiriman amplop/paket fisik)
- Sertakan SOP Video Tanpa Jeda: ${includeUnboxingSop ? "YA" : "TIDAK"}
- Sertakan FAQ: ${includeFaq ? "YA" : "TIDAK"}
- Sertakan Langkah Aktivasi: ${includeActivationSteps ? "YA" : "TIDAK"}
${customNotes ? `- Catatan Khusus Seller: ${customNotes}` : ""}

Pastikan formatnya sangat rapi, bebas link eksternal terlarang Shopee, dan siap langsung di-paste ke Seller Centre Shopee!`;

    try {
      const rawAiText = await callGemini(userPrompt, systemPrompt, { jsonMode: true });
      const cleanJson = rawAiText.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.full_description && parsed.seo_title) {
        const cleanAiTitle = stripEmojisAndUnsafeSymbols(String(parsed.seo_title)).slice(0, 120);
        const cleanAiDesc = stripEmojisAndUnsafeSymbols(String(parsed.full_description)).slice(0, 2990);
        return NextResponse.json({
          status: "success",
          source: "gemini-ai",
          data: {
            seo_title: cleanAiTitle,
            full_description: cleanAiDesc,
            seo_hashtags: stripEmojisAndUnsafeSymbols(parsed.seo_hashtags || ""),
            quick_specs: parsed.quick_specs || [],
            character_count: cleanAiDesc.length,
            cover_recommendation: parsed.cover_recommendation || {
              suggested_ratio: "1:1 (1080 x 1080 px)",
              headline_badges: [
                "100% ORIGINAL & LEGAL",
                "GARANSI RESMI 30 HARI",
                category.includes("Key") ? "REDEEM CODE RESMI" : "FULL ACCESS GANTI EMAIL",
                "PENGIRIMAN CEPAT 5 MENIT"
              ],
              theme_color: "violet",
              ai_image_prompt: `High-converting Shopee product cover for "${gameTitle}" (${platform}), 1:1 ratio 1080x1080, dark modern tech aesthetic, key art, badges: "100% ORIGINAL", "GARANSI RESMI".`,
              design_tips: [
                "Gunakan rasio 1:1 (1080x1080 px) resolusi tinggi.",
                "Area tengah 80% untuk teks utama agar tidak tertutup badge Shopee.",
                "Maksimal 20% area tertutup teks agar performa feed optimal."
              ]
            }
          }
        });
      }
    } catch (aiErr) {
      console.warn("Gemini AI description generation failed or returned invalid JSON, using fallback generator:", aiErr);
    }

    // High quality deterministic fallback generator
    const fallback = generateFallbackDescription(body);
    return NextResponse.json({
      status: "success",
      source: "template-engine",
      data: fallback
    });

  } catch (error: any) {
    console.error("Description API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
