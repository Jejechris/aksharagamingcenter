"""
Akshara Gaming Center - Delivery Formatter & Shopee Copywriter
Generates instant 3-step delivery templates with anti-hackback instructions.
"""

import random
import datetime
from typing import Dict, Any, Optional


def generate_warranty_code(order_id_or_random: Optional[str] = None) -> str:
    """Membuat serial kode garansi unik resmi Akshara."""
    now = datetime.datetime.now()
    date_part = now.strftime("%y%m%d")
    rnd_part = "".join(random.choices("0123456789ABCDEF", k=4))
    return f"AKSHARA-{date_part}-{rnd_part}"


def format_delivery_message(
    game_title: str,
    buyer_name: str,
    credential_or_key: str,
    platform: str = "Steam / PC",
    order_id: Optional[str] = None,
    warranty_code: Optional[str] = None
) -> str:
    """
    Format pesan pengiriman 3-langkah resmi Shopee Akshara Gaming Center.
    Didesain khusus untuk mencegah buyer remorse, menjamin garansi, dan zero hackback.
    """
    w_code = warranty_code or generate_warranty_code(order_id)
    ord_id = order_id or f"SHP-{datetime.datetime.now().strftime('%y%m%d%H%M')}"
    
    # Deteksi apakah CDKey atau Akun
    is_key = ("key" in credential_or_key.lower() or 
              "-" in credential_or_key and len(credential_or_key.split("-")) >= 3)
    
    if is_key:
        step_1_text = (
            "1️⃣ *AKTIVASI REDEEM KEY RESMI:*\n"
            "• Buka launcher platform Anda (Steam/Microsoft/EA/dll).\n"
            "• Klik menu *'Activate a Product on Steam'* atau *'Redeem Code'*.\n"
            "• Masukkan CDKey di bawah ini. Game otomatis aktif permanen di akun pribadi Anda!"
        )
    else:
        step_1_text = (
            "1️⃣ *LOGIN & AMANKAN AKUN (WAJIB DILAKUKAN SEGERA):*\n"
            "• Login ke launcher menggunakan email & password di bawah.\n"
            "• Masuk ke menu profil > Keamanan > Segera ganti Password & Email ke milik Anda pribadi.\n"
            "• Aktifkan 2FA (Two-Factor Authentication) untuk keamanan 100%!"
        )

    msg = (
        f"🎮 *[PENGIRIMAN PESANAN RESMI — AKSHARA GAMING CENTER]*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"Halo kak *{buyer_name}*, terima kasih telah berbelanja di *Akshara Gaming Center*! "
        f"Pesanan game *{game_title}* kakak telah selesai diproses secara instan.\n\n"
        f"📦 *DETAIL LISENSI & KREDENSIAL:*\n"
        f"• *Game:* `{game_title}`\n"
        f"• *Platform:* `{platform}`\n"
        f"• *No. Pesanan Shopee:* `{ord_id}`\n"
        f"• *DATA LISENSI / KEY:*\n"
        f"```{credential_or_key}```\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🛡️ *PANDUAN 3-LANGKAH PENGGUNAAN AMAN:*\n\n"
        f"{step_1_text}\n\n"
        f"2️⃣ *KONFIRMASI PENERIMAAN:*\n"
        f"• Mohon periksa dan pastikan game dapat dimainkan dengan baik.\n"
        f"• Klik *'Pesanan Diterima'* di aplikasi Shopee dan berikan ulasan bintang 5 untuk mengaktifkan garansi resmi toko.\n\n"
        f"3️⃣ *KLAIM & SERTIFIKAT GARANSI DIGITAL:*\n"
        f"• *Serial Garansi Anda:* `{w_code}`\n"
        f"• Simpan kartu garansi fisik A6 yang dikirimkan ke alamat Anda.\n"
        f"• Status garansi dapat dicek kapan saja di portal resmi kami.\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"💬 *Bantuan & Customer Care:* Hubungi kami via chat Shopee jika membutuhkan bantuan aktivasi.\n"
        f"✨ *Selamat Bermain & Happy Gaming!* 🚀"
    )
    return msg
