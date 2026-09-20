"""
Akshara Gaming Center - Divisi 1: Profit Analytics & Financial Ledger Engine
Mencatat setiap transaksi dan menganalisis profitabilitas riil secara transparan.
Menyediakan agregasi keuangan, metrik margin, dan format rekap real-time untuk Telegram & Web.
"""

import sys
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Pastikan path modul root terbaca
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import MarginCalculation, ShopeeOrder


class TransactionRecord(BaseModel):
    order_id: str
    timestamp: str
    channel: str = "Shopee"  # Shopee atau Website Mandiri
    product_name: str
    buyer_username: str
    gross_revenue_idr: float
    cogs_g2g_idr: Optional[float] = None
    qris_fee_idr: Optional[float] = None
    cogs_usd: Optional[float] = 0.0
    cogs_net_idr: float
    platform_fee_idr: float
    packaging_cost_idr: float
    net_profit_idr: float
    net_margin_pct: float


class AnalyticsSummary(BaseModel):
    total_orders: int
    total_gmv_idr: float
    total_cogs_idr: float
    total_platform_fees_idr: float
    total_packaging_cost_idr: float
    total_net_profit_idr: float
    average_net_margin_pct: float
    target_monthly_profit_idr: float = 10_000_000.0  # Target biaya kuliah mandiri & hidup
    target_achievement_pct: float = 0.0


class AnalyticsEngine:
    def __init__(self, ledger_file: str = None):
        if ledger_file is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ledger_file = os.path.join(base_dir, "output", "financial_ledger.json")
        self.ledger_file = ledger_file
        os.makedirs(os.path.dirname(self.ledger_file), exist_ok=True)
        self._ensure_ledger_exists()

    def _ensure_ledger_exists(self):
        if not os.path.exists(self.ledger_file):
            with open(self.ledger_file, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)

    def load_transactions(self) -> List[TransactionRecord]:
        try:
            with open(self.ledger_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [TransactionRecord(**item) for item in data]
        except Exception:
            return []

    def record_sale(
        self,
        order: ShopeeOrder,
        margin: MarginCalculation,
        channel: str = "Shopee"
    ) -> TransactionRecord:
        """Mencatat transaksi penjualan baru ke dalam buku kas transparan."""
        platform_fee = margin.shopee_admin_fee_idr + margin.shopee_service_fee_idr
        if channel.lower() == "website":
            # Jika di website mandiri, fee hanya QRIS ~0.7%
            platform_fee = round(margin.selling_price_shopee_idr * 0.007, 0)
        
        record = TransactionRecord(
            order_id=order.order_id,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            channel=channel,
            product_name=order.product_title,
            buyer_username=order.buyer_username,
            gross_revenue_idr=margin.selling_price_shopee_idr,
            cogs_g2g_idr=margin.cogs_g2g_idr,
            qris_fee_idr=margin.qris_fee_idr,
            cogs_usd=margin.cogs_usd,
            cogs_net_idr=margin.cogs_idr_net,
            platform_fee_idr=platform_fee,
            packaging_cost_idr=margin.packaging_and_envelope_cost_idr,
            net_profit_idr=margin.net_profit_idr,
            net_margin_pct=margin.net_margin_pct
        )

        transactions = self.load_transactions()
        # Hindari duplikasi jika order_id sudah ada
        transactions = [t for t in transactions if t.order_id != order.order_id]
        transactions.append(record)

        with open(self.ledger_file, "w", encoding="utf-8") as f:
            json.dump([t.model_dump() for t in transactions], f, indent=2)

        return record

    def get_summary(self) -> AnalyticsSummary:
        """Menghitung agregasi finansial dari seluruh riwayat penjualan."""
        transactions = self.load_transactions()
        if not transactions:
            return AnalyticsSummary(
                total_orders=0,
                total_gmv_idr=0.0,
                total_cogs_idr=0.0,
                total_platform_fees_idr=0.0,
                total_packaging_cost_idr=0.0,
                total_net_profit_idr=0.0,
                average_net_margin_pct=0.0,
                target_achievement_pct=0.0
            )

        total_gmv = sum(t.gross_revenue_idr for t in transactions)
        total_cogs = sum(t.cogs_net_idr for t in transactions)
        total_fees = sum(t.platform_fee_idr for t in transactions)
        total_packaging = sum(t.packaging_cost_idr for t in transactions)
        total_profit = sum(t.net_profit_idr for t in transactions)
        avg_margin = (total_profit / total_gmv * 100.0) if total_gmv > 0 else 0.0

        target_monthly = 10_000_000.0
        achievement_pct = round((total_profit / target_monthly) * 100.0, 1)

        return AnalyticsSummary(
            total_orders=len(transactions),
            total_gmv_idr=round(total_gmv, 2),
            total_cogs_idr=round(total_cogs, 2),
            total_platform_fees_idr=round(total_fees, 2),
            total_packaging_cost_idr=round(total_packaging, 2),
            total_net_profit_idr=round(total_profit, 2),
            average_net_margin_pct=round(avg_margin, 2),
            target_monthly_profit_idr=target_monthly,
            target_achievement_pct=achievement_pct
        )

    def build_telegram_pnl_card(self, record: TransactionRecord) -> str:
        """Format pesan transparan PnL untuk notifikasi Telegram Senna."""
        summary = self.get_summary()

        card = (
            f"📈 *[LAPORAN PROFIT REAL-TIME - AKSHARA GAMING]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📦 *No. Pesanan:* `{record.order_id}` ({record.channel})\n"
            f"🎮 *Item:* {record.product_name}\n"
            f"👤 *Pembeli:* `{record.buyer_username}`\n\n"
            f"💰 *OMZET KOTOR (GMV):* Rp {record.gross_revenue_idr:,.0f}\n"
            f"• Modal G2G.com/id (via QRIS): -Rp {record.cogs_net_idr:,.0f}\n"
            f"• Potongan Fee Shopee (8% + 1k): -Rp {record.platform_fee_idr:,.0f}\n"
            f"• Biaya Amplop & Resi A6: -Rp {record.packaging_cost_idr:,.0f}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💵 *PROFIT BERSIH (NETT):* *Rp {record.net_profit_idr:,.0f}* ({record.net_margin_pct:.1f}%)\n\n"
            f"🎯 *PROGRESS TARGET FINANSIAL SENNA:*\n"
            f"• Total Order Selesai: *{summary.total_orders} transaksi*\n"
            f"• Akumulasi Profit Bersih: *Rp {summary.total_net_profit_idr:,.0f}*\n"
            f"• Target Bulanan (Mandiri ITS): Rp {summary.target_monthly_profit_idr:,.0f}\n"
            f"• Progres: *{summary.target_achievement_pct}% tercapai* 🚀"
        )
        return card
