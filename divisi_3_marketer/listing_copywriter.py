"""
Akshara Gaming Center - Divisi 3: Creative & SEO Listing (The Marketer)
Generator deskripsi produk dan judul listing Shopee yang aman dari blacklist algoritma hak cipta (DMCA-safe)
serta mematuhi kebijakan pengiriman fisik Shopee.
"""

from typing import Dict


class ListingCopywriter:
    @staticmethod
    def generate_shopee_listing(product_name: str) -> Dict[str, str]:
        """
        Menghasilkan judul dan deskripsi listing yang lolos kurasi algoritma Shopee,
        menghindari kata pemicu suspend barang digital, dan mengedepankan metode amplop fisik.
        """
        if "minecraft" in product_name.lower():
            title = "[ORIGINAL RESMI] Minecraft Java & Bedrock Edition PC - Paket Panduan & Kartu Garansi Fisik"
            description = (
                "SELAMAT DATANG DI AKSHARA GAMING CENTER\n"
                "Penyedia Lisensi & Akses Game PC Original, Bergaransi, dan Terpercaya.\n\n"
                "=========================================\n"
                "APA YANG ANDA DAPATKAN DI DALAM PAKET PENGIRIMAN:\n"
                "=========================================\n"
                "1. Amplop Segel Resmi Akshara Gaming Center.\n"
                "2. Kartu Garansi Fisik Resmi (Garansi 30 Hari Penggantian Baru).\n"
                "3. Lembar Panduan Aktivasi Langkah demi Langkah (Sangat mudah untuk pemula).\n"
                "4. Kartu Member VIP Akshara (Voucher Diskon Spesial 15% untuk repeat order).\n"
                "5. Detail Lisensi & Kredensial Akses Penuh (Full Access) yang siap dimigrasi ke email pribadi Anda.\n\n"
                "=========================================\n"
                "FITUR PRODUK:\n"
                "=========================================\n"
                "- Termasuk 2 Edisi Sekaligus: Java Edition + Bedrock Edition untuk PC Windows.\n"
                "- Bisa Mengubah Email, Password, Skin, dan Nickname (Gamertag).\n"
                "- Bebas Bermain di Server Resmi (Hypixel, Mineplex, dll.) tanpa batasan.\n"
                "- Garansi Aman Anti-Revoke dengan dukungan Customer Service Akshara.\n\n"
                "=========================================\n"
                "SOP PENGIRIMAN & KLAIM GARANSI:\n"
                "=========================================\n"
                "- Kami mengirimkan fisik amplop berisi Kartu Garansi resmi melalui ekspedisi reguler Shopee.\n"
                "- Untuk kenyamanan bermain segera, panduan & detail dapat diproses langsung begitu pesanan terverifikasi.\n"
                "- Wajib merekam video unboxing amplop dan percobaan pertama tanpa jeda (no-cut video) sebagai syarat aktivasi klaim garansi.\n\n"
                "Silakan langsung di-checkout, stok selalu diperbarui setiap hari!"
            )
        elif "tf2" in product_name.lower():
            title = "[INSTANT TRADE] Mann Co Supply Crate Key TF2 - Steam Trade Offer Resmi & Cepat"
            description = (
                "SELAMAT DATANG DI AKSHARA GAMING CENTER\n"
                "Solusi Saldo Steam Wallet & TF2 Key Legal Terpercaya.\n\n"
                "Mekanisme Pengiriman:\n"
                "1. Kirimkan Steam Trade URL Anda di catatan pesanan.\n"
                "2. Bot otomatis kami akan mengirimkan trade offer secara instan.\n"
                "3. Kartu Garansi & Invoice fisik tetap kami kirimkan via ekspedisi Shopee.\n"
            )
        else:
            title = f"[ORIGINAL PC] {product_name} - Paket Lisensi & Kartu Garansi Resmi"
            description = (
                f"Akses Resmi Game {product_name} untuk PC.\n"
                "Termasuk Kartu Garansi Fisik Resmi dan Panduan Setup Lengkap dari Akshara Gaming Center."
            )

        return {
            "title": title,
            "description": description
        }
