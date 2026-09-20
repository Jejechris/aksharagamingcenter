"""
Akshara Gaming Center - Divisi 4: Order Dispatch & Fulfillment (The Operator)
Komponen 2: Telegram HITL (Human-in-the-Loop) Approval Bot
Mengirimkan kartu persetujuan pesanan ke HP Senna sebelum transaksi G2G dieksekusi,
menjaga keamanan kartu debit dan memastikan Senna selalu memiliki kendali penuh atas kas modal.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from typing import Dict, Any, Optional
import httpx
from models import ShopeeOrder, SupplierListing, RiskAssessment, MarginCalculation
from config import SETTINGS


class TelegramHitlBot:
    def __init__(self, bot_token: str = None, chat_id: str = None):
        self.bot_token = bot_token or SETTINGS.telegram_bot_token
        self.chat_id = chat_id or SETTINGS.telegram_admin_chat_id
        self.api_base_url = f"https://api.telegram.org/bot{self.bot_token}"

    def build_approval_message(
        self,
        order: ShopeeOrder,
        listing: SupplierListing,
        risk: RiskAssessment,
        margin: MarginCalculation
    ) -> str:
        """Membuat template pesan rich Markdown untuk layar smartphone Senna."""
        status_emoji = "✅ LOLOS AUDIT" if risk.is_orderable else "❌ RISIKO TINGGI"
        
        message = (
            f"🎮 *[ORDER BARU SHOPEE MASUK - AKSHARA]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📦 *No. Pesanan:* `{order.order_id}`\n"
            f"👤 *Pembeli:* `{order.buyer_username}`\n"
            f"🎯 *Produk:* {order.product_title}\n"
            f"💰 *Harga Jual Shopee:* *Rp {order.selling_price_idr:,.0f}*\n\n"
            f"🛡️ *ANALISIS SUPPLIER G2G (THE SENTRY):*\n"
            f"• *Supplier:* `{listing.supplier_name}`\n"
            f"• *Rating:* `{listing.supplier_rating_pct:.1f}%` ({listing.total_sales_or_reviews:,} reviews)\n"
            f"• *Pengiriman:* `{listing.delivery_speed.value}`\n"
            f"• *Status Risiko:* {status_emoji} (Skor: {risk.risk_score:.0f}/100)\n\n"
            f"📊 *MARGIN BERSIH (THE QUANT):*\n"
            f"• *Modal G2G:* ${listing.price_usd:.2f} (~Rp {margin.cogs_idr_net:,.0f})\n"
            f"• *Potongan Shopee (8% + 1k):* Rp {margin.shopee_admin_fee_idr + margin.shopee_service_fee_idr:,.0f}\n"
            f"• *Biaya Amplop & Garansi:* Rp {margin.packaging_and_envelope_cost_idr:,.0f}\n"
            f"• *PROFIT BERSIH:* *Rp {margin.net_profit_idr:,.0f}* ({margin.net_margin_pct:.1f}%)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ *Otorisasi Senna Diperlukan:* Klik tombol di bawah untuk menyetujui pembelian di G2G."
        )
        return message

    async def send_approval_request(
        self,
        order: ShopeeOrder,
        listing: SupplierListing,
        risk: RiskAssessment,
        margin: MarginCalculation
    ) -> Dict[str, Any]:
        """
        Mengirim notifikasi dengan Inline Keyboard [SETUJUI BELI] & [TOLAK].
        Jika token belum disetel / mock mode, otomatis mencatat log simulasi approval.
        """
        text = self.build_approval_message(order, listing, risk, margin)
        
        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": f"✅ SETUJUI BELI (${listing.price_usd:.2f})",
                        "callback_data": f"approve_{order.order_id}_{listing.id}"
                    },
                    {
                        "text": "❌ TOLAK PESANAN",
                        "callback_data": f"reject_{order.order_id}"
                    }
                ]
            ]
        }

        # Cek apakah token Telegram aktif
        if self.bot_token and "mock" not in self.bot_token:
            payload = {
                "chat_id": self.chat_id,
                "text": text,
                "parse_mode": "Markdown",
                "reply_markup": reply_markup
            }
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(f"{self.api_base_url}/sendMessage", json=payload)
                    return resp.json()
            except Exception as e:
                pass

        return {
            "ok": True,
            "simulated": True,
            "message": "Pesan approval HITL terkirim ke Telegram Senna (Simulasi)",
            "content": text
        }

    async def send_pnl_notification(self, pnl_text: str) -> Dict[str, Any]:
        """Mengirimkan ringkasan laporan profit transparan ke Telegram Senna."""
        if self.bot_token and "mock" not in self.bot_token:
            payload = {
                "chat_id": self.chat_id,
                "text": pnl_text,
                "parse_mode": "Markdown"
            }
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(f"{self.api_base_url}/sendMessage", json=payload)
                    return resp.json()
            except Exception:
                pass

        return {"ok": True, "simulated": True, "content": pnl_text}

