import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

interface BatchOrderItem {
  order_id: string;
  buyer_username?: string;
  product_name?: string;
  status_chat?: string;
}

interface ShopeeCsBatchRequest {
  orders: BatchOrderItem[];
  agent_tone?: string;
}

function buildFallbackCsBatchMessage(orders: BatchOrderItem[]): string {
  const orderLines = orders.map((o, idx) => {
    const buyer = o.buyer_username ? `@${o.buyer_username.replace(/^@/, "")}` : "-";
    const prod = o.product_name || "Produk Akun Game Digital";
    const status = o.status_chat || "Akun game telah diserahkan & pembeli sudah konfirmasi login sukses di Shopee Chat";
    return `${idx + 1}. No. Pesanan : ${o.order_id}
   Username   : ${buyer}
   Produk     : ${prod}
   Status     : ${status}`;
  }).join("\n\n");

  return `Halo Kakak CS Shopee yang bertugas, selamat siang. Salam hangat dari Seller Toko Akshara Gaming Center.

Mohon bantuannya untuk melakukan UPDATE STATUS PENGIRIMAN / SELESAI pada daftar pesanan produk digital (game license & akun legal) berikut, dikarenakan pesanan bersifat Non-Fisik dan seluruh kredensial akun telah berhasil diserahterimakan dan dikonfirmasi langsung oleh pembeli di riwayat Shopee Chat kami.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAFTAR PESANAN DIGITAL (${orders.length} PESANAN):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${orderLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Catatan Tambahan untuk Kakak CS:
1. Bukti chat serah terima kredensial & konfirmasi pembeli sudah lengkap di riwayat Shopee Chat masing-masing No. Pesanan di atas.
2. Tidak ada komplain/kendala dari pihak pembeli.
3. Mohon bantuannya untuk diteruskan/di-update status pesanannya agar transaksi dapat diselesaikan secara sistem.

Terima kasih banyak atas bantuan dan kerja samanya ya Kak! 🙏✨`;
}

export async function POST(req: Request) {
  try {
    const body: ShopeeCsBatchRequest = await req.json();
    const orders = Array.isArray(body.orders) ? body.orders.filter(o => o && o.order_id) : [];

    if (orders.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Minimal 1 No. Pesanan Shopee wajib disertakan." },
        { status: 400 }
      );
    }

    const orderCount = orders.length;

    const systemPrompt = `Kamu adalah Specialist Operasional Marketplace & Shopee Seller Relations untuk Akshara Gaming Center.
Tugasmu adalah menyusun SATU PESAN REKAP BATCH LENGKAP & FORMAL untuk dikirimkan ke Live Agent CS Shopee (Customer Service Shopee di Pusat Bantuan Seller Centre).

Konteks Masalah:
- Toko menjual produk digital legal (akun game Steam/Microsoft/Rockstar).
- Fitur Jasa Kirim "Termasuk Ongkos Kirim" (Non-Fisik) belum aktif di toko, sehingga pesanan tidak memiliki resi fisik kurir.
- Akun game SUDAH diserahkan ke pembeli dan pembeli SUDAH konfirmasi menerima akun via Shopee Chat.
- Seller menghubungi CS Shopee Live Chat untuk meminta update status pesanan menjadi "Terkirim / Selesai" secara manual backoffice.
- Seller tidak ingin chat 1 per 1 karena memakan waktu dan antrean lama, melainkan membundel ${orderCount} pesanan sekaligus dalam 1 pesan terstruktur yang sangat disukai CS Shopee.

Format Output Wajib JSON Murni:
{
  "cs_batch_message": "<Pesan batch lengkap, sopan, bernomor urut jelas, siap copy-paste ke Shopee Live Chat>",
  "quick_followups": [
    {
      "trigger": "Jika CS bertanya: 'Apakah pembeli sudah konfirmasi di chat?'",
      "reply": "Halo Kak, betul sekali. Di riwayat Shopee Chat untuk masing-masing pesanan tersebut, pembeli sudah konfirmasi akun diterima dan bisa login dengan baik. Kakak CS bisa langsung memeriksa log chat-nya ya Kak."
    },
    {
      "trigger": "Jika CS meminta bukti screenshot",
      "reply": "Semua bukti kredensial dan percakapan konfirmasi pembeli ada lengkap di Shopee Chat masing-masing No. Pesanan. Mohon dicek langsung di sistem internal Shopee ya Kak."
    },
    {
      "trigger": "Ucapan penutup apresiasi setelah CS selesai memproses",
      "reply": "Terima kasih banyak atas bantuan Kakak CS yang luar biasa cepat dan solutif! Bintang 5 untuk pelayanan Kakak hari ini! 🙏⭐"
    }
  ],
  "best_practices": [
    "Kirim pesan batch di jam kerja CS Shopee (08:00 - 17:00 WIB) untuk respon backoffice tercepat.",
    "Pastikan pembeli telah mengetik kata konfirmasi seperti 'oke kak', 'sudah bisa', atau 'makasih' di Shopee Chat sebelum pesanan diajukan ke CS.",
    "Cukup buka 1 sesi Live Chat dan serahkan seluruh daftar nomor pesanan sekaligus, jangan membuat tiket baru untuk tiap order."
  ]
}`;

    let result = {
      cs_batch_message: "",
      quick_followups: [
        {
          trigger: "Jika CS bertanya: 'Apakah pembeli sudah konfirmasi di chat?'",
          reply: "Halo Kak, betul sekali. Di riwayat Shopee Chat untuk masing-masing pesanan tersebut, pembeli sudah konfirmasi akun diterima dan bisa login dengan lancar. Kakak CS bisa langsung mengecek riwayat percakapan di sistem."
        },
        {
          trigger: "Jika CS meminta verifikasi kendala",
          reply: "Tidak ada kendala sama sekali Kak, pesanan murni produk digital non-fisik dan pembeli sudah puas menerima akunnya."
        },
        {
          trigger: "Ucapan penutup untuk CS",
          reply: "Terima kasih banyak atas bantuan Kakak CS yang sangat ramah dan responsif! Bintang 5 untuk Kakak! 🙏⭐"
        }
      ],
      best_practices: [
        "Kirim pesan batch di jam operasional CS Shopee (08:00 - 17:00 WIB).",
        "Pastikan ada chat pembeli yang mengonfirmasi bahwa akun berhasil dibuka/login.",
        "Gunakan 1 sesi chat CS untuk memproses hingga 10-15 pesanan sekaligus."
      ]
    };

    try {
      const userPrompt = `Daftar ${orderCount} Pesanan Shopee Digital:\n${JSON.stringify(orders, null, 2)}`;
      const aiResponse = await callGemini(userPrompt, systemPrompt);

      let cleaned = aiResponse.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

      const parsed = JSON.parse(cleaned.trim());
      if (parsed.cs_batch_message) {
        result.cs_batch_message = parsed.cs_batch_message;
      }
      if (Array.isArray(parsed.quick_followups) && parsed.quick_followups.length > 0) {
        result.quick_followups = parsed.quick_followups;
      }
      if (Array.isArray(parsed.best_practices) && parsed.best_practices.length > 0) {
        result.best_practices = parsed.best_practices;
      }
    } catch (aiErr) {
      console.warn("Gemini CS Batch fallback:", aiErr);
      result.cs_batch_message = buildFallbackCsBatchMessage(orders);
    }

    if (!result.cs_batch_message) {
      result.cs_batch_message = buildFallbackCsBatchMessage(orders);
    }

    return NextResponse.json({
      status: "success",
      model_used: "gemini-3.5-flash-lite",
      data: {
        total_orders_batched: orderCount,
        cs_batch_message: result.cs_batch_message,
        quick_followups: result.quick_followups,
        best_practices: result.best_practices
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
