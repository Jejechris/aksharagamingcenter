import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

interface DescriptionRequest {
  gameTitle?: string;
  platform?: string;
  category?: string;
  price?: number;
  style?: "ultimate" | "clean" | "flash_sale" | "security";
  includePhysicalCard?: boolean;
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
      includePhysicalCard = false,
      includeUnboxingSop = true,
    includeFaq = true,
    includeActivationSteps = true,
    customNotes = "",
  } = params;

  const cleanTitle = gameTitle.toUpperCase();
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);

  // Optimized Shopee SEO Title (Max 120 chars)
  let seoTitle = `${cleanTitle} [${platform.toUpperCase()}] ORIGINAL FULL ACCESS GARANSI RESMI`;
  if (includePhysicalCard && seoTitle.length < 100) {
    seoTitle += " + KARTU FISIK A6";
  }
  if (seoTitle.length > 120) {
    seoTitle = seoTitle.substring(0, 117) + "...";
  }

  // Generate targeted hashtags
  const tagWords = cleanTitle.replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const baseTags = [
    `#${tagWords.join("")}`,
    `#Jual${tagWords[0] || "Game"}Original`,
    "#GameOriginal",
    "#AksharaGaming",
    "#GaransiResmi",
    `#Game${platform.replace(/[^a-zA-Z0-9]/g, "")}`,
    "#FullAccess",
    "#DigitalLicense",
    "#ShopeeGamingID"
  ];
  const seoHashtags = baseTags.slice(0, 8).join(" ");

  let content = "";

  if (style === "ultimate") {
    content = `AKSHARA GAMING CENTER — OFFICIAL DIGITAL LICENSE
PRODUK 100% ORIGINAL & LEGAL | PERMANENT OWNERSHIP
FULL ACCESS | BISA GANTI SEMUA DATA | GARANSI RESMI

==================================================
DETAIL PRODUK:
• Game: ${gameTitle}
• Platform: ${platform}
• Tipe Lisensi: ${category}
• Status: 100% Fresh & Original (Bukan Shared/Bajakan)
• Wilayah: GLOBAL (Bisa dimainkan di seluruh Indonesia tanpa VPN)
• Bahasa: Multi-language (Termasuk English)
==================================================

KEUNGGULAN BELI DI AKSHARA GAMING:
- FULL ACCESS 100%: Pembeli bebas ganti Email, Password, Nickname, & Pertanyaan Keamanan.
- ONLINE MULTIPLAYER RESMI: Bebas main online di seluruh server resmi publik & private.
- PERMANEN MILIK ANDA: Akun/Lisensi aktif selamanya, bukan sewa bulanan.
- PENGIRIMAN KILAT: Detail akun/lisensi dikirimkan secara cepat & aman via chat setelah order.
${includePhysicalCard ? "- BONUS KARTU GARANSI FISIK: Dilengkapi Kartu Garansi Resmi A6 (Art Carton 260gsm) berpita hologram & QR Code verifikasi serial terdaftar!\n" : ""}${customNotes ? `CATATAN TAMBAHAN: ${customNotes}\n` : ""}
==================================================
${includeActivationSteps ? `3 LANGKAH MUDAH AKTIVASI:
1. Selesaikan pembayaran di Shopee dan cek chat Shopee Anda.
2. Tim Akshara akan mengirimkan data lisensi beserta panduan setup instan.
3. Login ke launcher resmi ${platform}, ubah data sesuai keinginan, dan game siap dimainkan!

==================================================
` : ""}${includeUnboxingSop ? `SYARAT & KETENTUAN KLAIM GARANSI (SOP ANTI-FRAUD):
1. Wajib membuat VIDEO UNBOXING amplop kartu garansi fisik tanpa jeda (no-cut & unedited) dari awal paket masih tersegel rapi.
2. Segera lakukan pengecekan dan pergantian data setelah detail diterima.
3. Garansi tidak berlaku jika akun terindikasi menggunakan cheat/third-party mod ilegal/terkena ban aktivitas sendiri.
4. Tim Support Akshara siap membantu 24/7 jika ada kendala login awal.

==================================================
` : ""}${includeFaq ? `PERTANYAAN UMUM (FAQ):
Q: Apakah produk selalu ready stok?
A: Selalu READY STOK kak! Sistem kami autonomous, silakan langsung di-checkout saja.

Q: Apakah butuh VPN untuk login atau main?
A: Sama sekali TIDAK. 100% region Global dan aman koneksi internet Indonesia (Indihome, Biznet, Telkomsel, dll).

Q: Apakah dikirim paket fisik ke alamat rumah?
A: Ya kak, amplop resmi berisi Kartu Garansi Akshara A6 dikirim via kurir Shopee agar order Anda resmi, terdaftar, dan aman regulasi.

==================================================
` : ""}Terima kasih telah mempercayakan kebutuhan gaming Anda di Akshara Gaming Center!
Happy Gaming!

${seoHashtags}`;
  } else if (style === "security") {
    content = `AKSHARA GAMING CENTER — KEAMANAN LISENSI TERJAMIN 100%
${cleanTitle} [${platform}]
AKUN FULL ACCESS DENGAN PROTEKSI GARANSI RESMI

==================================================
KEAMANAN & LEGALITAS PRODUK:
• 100% Legal & Safe (Bukan hasil carding, phising, atau inject ilegal).
• Full Access can change email, password, and security info.
• Bukan Akun Shared / Sharing — 1 Akun hanya untuk 1 Pembeli selamanya.
• Server Resmi & Original Update otomatis dari developer.
==================================================

📦 KELENGKAPAN PESANAN:
1. Akun / Lisensi ${gameTitle} Original.
2. Panduan Keamanan Akun & Tips Mengamankan Akun dari Hackback.
${includePhysicalCard ? "3. Surat Lisensi & Kartu Garansi Fisik A6 resmi ber-QR Serial ID.\n" : ""}4. Layanan Purna Jual CS 24 Jam.

==================================================
SOP KLAIM GARANSI:
• Wajib video unboxing paket amplop fisik tanpa jeda (no cut).
• Penggantian akun baru diberikan jika data awal tidak valid saat pertama diterima.
• Akshara menerapkan Zero-Tolerance untuk seller scam & buyer fraud.

${seoHashtags}`;
  } else if (style === "flash_sale") {
    content = `PROMO SPESIAL HARI INI — DISKON SPESIAL AKSHARA GAMING!
${cleanTitle} — ${formattedPrice}
DAPATKAN LISENSI RESMI + BONUS KARTU GARANSI FISIK A6!

STOK TERBATAS! Harga promo bisa berubah sewaktu-waktu.
Langsung checkout sekarang sebelum kehabisan slot promo!

Kenapa harus beli di Akshara Gaming?
- Harga termurah se-Shopee dengan jaminan original
- Akun Full Access (Bisa ubah semua data)
- Pengiriman instan tanpa nunggu lama
- Garansi resmi toko terpercaya bintang 5
${customNotes ? `- ${customNotes}\n` : ""}
Langkah Order:
1. Klik Beli Sekarang & lakukan pembayaran.
2. Cek chat Shopee untuk panduan instalasi.
3. Paket fisik sertifikat garansi akan meluncur ke alamat Anda!

${seoHashtags}`;
  } else {
    // Clean & Minimalist
    content = `AKSHARA GAMING CENTER — ${cleanTitle}

Spesifikasi Produk:
• Platform: ${platform}
• Kategori: ${category}
• Region: Global (Tanpa VPN)
• Kepemilikan: Permanen & Full Access

Fitur Utama:
- Original legal developer license
- Akses penuh ganti email & password
- Support online multiplayer resmi
${includePhysicalCard ? "- Termasuk pengiriman sertifikat fisik kartu garansi A6 resmi\n" : ""}${includeUnboxingSop ? "- SOP Garansi: Wajib sertakan video unboxing amplop fisik tanpa jeda (no cut)\n" : ""}
Catatan: Silakan tanyakan CS jika membutuhkan bantuan panduan instalasi.

${seoHashtags}`;
  }

  return {
    seo_title: seoTitle,
    full_description: content.trim(),
    seo_hashtags: seoHashtags,
    character_count: content.trim().length,
    quick_specs: [
      `Platform: ${platform}`,
      `Lisensi: ${category}`,
      "100% Original & Legal",
      "Full Access (Bisa Ganti Email & Password)",
      "Garansi Resmi & Video Unboxing SOP",
      includePhysicalCard ? "Termasuk Kartu Garansi Fisik A6" : "Pengiriman Cepat"
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
      includePhysicalCard = false,
      includeUnboxingSop = true,
      includeFaq = true,
      includeActivationSteps = true,
      customNotes = "",
    } = body;

    const systemPrompt = `Kamu adalah Senior E-Commerce Copywriter & Shopee SEO Specialist spesialis produk game digital dan lisensi software di Indonesia untuk toko "Akshara Gaming Center".
Tugasmu adalah membuat deskripsi produk Shopee Indonesia yang SANGAT MENARIK, PROFESIONAL, PERSUASIF, BERSIH, RAMAH ALGORITMA SHOPEE, dan MEMILIKI KONVERSI PENJUALAN TINGGI, LENGKAP DENGAN REKOMENDASI COVER 1080x1080.

Aturan Penting Format Shopee:
1. Karakteristik pembeli Shopee Indonesia menyukai teks terstruktur rapi dengan pembatas garis (=== atau ---) dan bullet points yang jelas. JANGAN GUNAKAN EMOJI SAMA SEKALI karena bisa ditolak oleh sistem Shopee terbaru.
2. Judul SEO harus di bawah 120 karakter, huruf kapital rapi, mengandung kata kunci utama (Nama Game, Platform, Original, Full Access, Garansi).
3. Deskripsi harus memuat:
   - Header & Keunggulan Produk (100% Legal, Bukan Shared, Full Access bisa ganti email/pass, Region Global tanpa VPN).
   - Detail Spesifikasi (Platform, Bahasa, Fitur Online Multiplayer).
   - Kelengkapan Produk (Lisensi Akun + ${includePhysicalCard ? "Kartu Garansi Fisik Resmi A6" : "Panduan Aktivasi"}).
   ${includeActivationSteps ? "- Langkah Cara Aktivasi 3 Langkah Cepat." : ""}
   ${includeUnboxingSop ? "- SOP Garansi & Wajib Video Unboxing No-Cut (Penting untuk melindungi toko dari buyer nakal)." : ""}
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
}`;

    const userPrompt = `Buatkan deskripsi Shopee terbaik untuk:
- Game: ${gameTitle}
- Platform: ${platform}
- Kategori Lisensi: ${category}
- Harga Jual Shopee: Rp ${price.toLocaleString("id-ID")}
- Gaya Bahasa / Style: ${style} (ultimate = visual lengkap top seller, security = fokus anti-hackback, flash_sale = promo urgency, clean = minimalis to the point)
- Sertakan Kartu Fisik A6: ${includePhysicalCard ? "YA" : "TIDAK"}
- Sertakan SOP Video Unboxing: ${includeUnboxingSop ? "YA" : "TIDAK"}
- Sertakan FAQ: ${includeFaq ? "YA" : "TIDAK"}
- Sertakan Langkah Aktivasi: ${includeActivationSteps ? "YA" : "TIDAK"}
${customNotes ? `- Catatan Khusus Seller: ${customNotes}` : ""}

Pastikan formatnya sangat rapi dan siap langsung di-paste ke Seller Centre Shopee!`;

    try {
      const rawAiText = await callGemini(userPrompt, systemPrompt);
      const cleanJson = rawAiText.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.full_description && parsed.seo_title) {
        return NextResponse.json({
          status: "success",
          source: "gemini-ai",
          data: {
            seo_title: parsed.seo_title,
            full_description: parsed.full_description,
            seo_hashtags: parsed.seo_hashtags || "",
            quick_specs: parsed.quick_specs || [],
            character_count: parsed.full_description.length,
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
