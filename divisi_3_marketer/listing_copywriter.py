"""
Akshara Gaming Center - Divisi 3: Creative & SEO Listing (The Marketer)
Generator deskripsi produk dan judul listing Shopee yang aman dari blacklist algoritma hak cipta (DMCA-safe),
100% Pure Digital + Kartu Garansi Digital QR tanpa link URL eksternal maupun amplop fisik.
"""

from typing import Dict


class ListingCopywriter:
    @staticmethod
    def generate_shopee_listing(product_name: str) -> Dict[str, str]:
        """
        Menghasilkan judul dan deskripsi listing Shopee 100% Digital & bebas link URL eksternal.
        """
        if "minecraft" in product_name.lower():
            title = "[ORIGINAL RESMI] Minecraft Java & Bedrock Edition PC - Full Access Digital QR"
            description = (
                "SELAMAT DATANG DI AKSHARA GAMING CENTER\n"
                "Penyedia Lisensi & Akses Game PC Original, Bergaransi Digital QR, dan Terpercaya.\n\n"
                "=========================================\n"
                "KELENGKAPAN PENGIRIMAN DIGITAL (TANPA PAKET FISIK):\n"
                "=========================================\n"
                "1. Pengiriman Instan 100% Digital langsung via Chat Shopee.\n"
                "2. Sertifikat & Kartu Garansi Digital PNG ber-QR Code Resmi (Garansi 30 Hari).\n"
                "3. Panduan Aktivasi Langkah demi Langkah di dalam Kartu Akses.\n"
                "4. Bonus Member VIP Akshara tercatat otomatis pada ID Garansi Digital.\n"
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
                "- 100% Pengiriman Digital via Chat Shopee (tidak ada pengiriman amplop atau kurir fisik).\n"
                "- Scan QR Code pada Kartu Akses Digital untuk mengambil kredensial dengan Passcode PIN Anda.\n"
                "- Wajib merekam video rekam layar (screen recording) tanpa jeda (no-cut) dari sebelum membuka data hingga login pertama.\n\n"
                "Silakan langsung di-checkout, stok selalu diperbarui setiap hari!"
            )
        elif "tf2" in product_name.lower():
            title = "[INSTANT TRADE] Mann Co Supply Crate Key TF2 - Steam Trade Offer Resmi & Cepat"
            description = (
                "SELAMAT DATANG DI AKSHARA GAMING CENTER\n"
                "Solusi Saldo Steam Wallet & TF2 Key Legal Terpercaya.\n\n"
                "Mekanisme Pengiriman (100% Digital):\n"
                "1. Kirimkan Steam Trade URL Anda di catatan pesanan / chat Shopee.\n"
                "2. Sistem kami akan mengirimkan trade offer secara instan.\n"
                "3. Sertifikat Transaksi & Garansi Digital QR dikirim langsung melalui Chat Shopee (tanpa paket fisik).\n"
            )
        else:
            title = f"[ORIGINAL PC] {product_name} - Lisensi Digital Resmi + Garansi QR"
            description = (
                f"Akses Resmi Game {product_name} untuk PC (100% Digital Instan via Chat Shopee).\n"
                "Termasuk Kartu Akses & Sertifikat Garansi Digital ber-QR Code dari Akshara Gaming Center tanpa pengiriman paket fisik."
            )

        return {
            "title": title,
            "description": description
        }
