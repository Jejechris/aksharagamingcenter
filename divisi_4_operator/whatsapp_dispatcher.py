"""
Akshara Gaming Center - Divisi 4: Order Dispatch & Fulfillment (The Operator)
Komponen 3: WhatsApp Credentials Dispatcher
Mengirimkan data kredensial login akun resmi beserta instruksi pengamanan ke WhatsApp pembeli secara instan.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Dict, Any
import httpx
from models import AccountCredentials, ShopeeOrder
from config import SETTINGS


class WhatsAppDispatcher:
    def __init__(self, api_token: str = None, api_url: str = None):
        self.api_token = api_token or SETTINGS.fonnte_api_token
        self.api_url = api_url or SETTINGS.fonnte_api_url

    def build_credentials_message(self, order: ShopeeOrder, creds: AccountCredentials) -> str:
        """Membuat format pesan WhatsApp yang rapi dan mudah dibaca oleh pembeli."""
        msg = (
            f"Halo kak *{order.buyer_username}*! Terima kasih telah berbelanja di *Akshara Gaming Center* 🎮\n\n"
            f"Pesanan Anda: *{order.product_title}* (No. Pesanan: `{order.order_id}`)\n"
            f"Telah berhasil diproses dan diverifikasi oleh sistem kami.\n\n"
            f"🔑 *DETAIL KREDENSIAL AKUN ORIGINAL ANDA:*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📧 *Email Login:* `{creds.game_email}`\n"
            f"🔒 *Password:* `{creds.game_password}`\n"
            f"🆔 *Serial Garansi:* `{creds.serial_number}`\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📌 *PANDUAN WAJIB & PENTING:*\n"
            f"1. Segera buka https://account.microsoft.com lalu login dengan data di atas.\n"
            f"2. Ganti password dan tambahkan email/nomor HP pribadi Anda sebagai keamanan 2-Langkah.\n"
            f"3. Amplop fisik berisi *Kartu Garansi Resmi 30 Hari + Lembar Panduan Fisik + Voucher Diskon VIP 15%* "
            f"sedang dalam perjalanan via ekspedisi Shopee.\n\n"
            f"⚠️ *PENTING:* Mohon rekam video saat pertama kali login tanpa jeda (no-cut video) untuk memvalidasi garansi penggantian baru.\n\n"
            f"Jika butuh bantuan, tim support kami siap membantu di chat ini. Selamat bermain! ✨"
        )
        return msg

    async def dispatch_credentials(
        self, 
        order: ShopeeOrder, 
        creds: AccountCredentials
    ) -> Dict[str, Any]:
        """Mengirimkan pesan kredensial via Fonnte / Wablas API."""
        message_text = self.build_credentials_message(order, creds)
        
        # Jika token Fonnte disetel nyata
        if self.api_token and "mock" not in self.api_token:
            headers = {"Authorization": self.api_token}
            payload = {
                "target": order.buyer_phone or "081234567890",
                "message": message_text
            }
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(self.api_url, headers=headers, json=payload)
                    return resp.json()
            except Exception:
                pass

        return {
            "status": "success",
            "simulated": True,
            "recipient": order.buyer_username,
            "phone": order.buyer_phone or "081234567890",
            "message_preview": message_text
        }
