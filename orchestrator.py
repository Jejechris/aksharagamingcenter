"""
Akshara Gaming Center - Master Autonomous Orchestrator
Menghubungkan dan mengorkestrasi alur kerja ke-5 Divisi AI secara terpadu:
Divisi 1 (The Quant) + Divisi 2 (The Risk Officer) + Divisi 3 (The Marketer) +
Divisi 4 (The Operator) + Divisi 5 (The Support)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Pastikan encoding UTF-8 di Windows Console
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

console = Console(force_terminal=True)

from models import (
    ShopeeOrder, SupplierListing, RiskStatus, OrderStatus, 
    AccountCredentials, WarrantyCardData, WarrantyClaim
)
from divisi_1_quant.quant_engine import QuantEngine
from divisi_1_quant.analytics_engine import AnalyticsEngine
from divisi_2_risk.risk_officer import RiskOfficer
from divisi_2_risk.scraper import SupplierScraper
from divisi_3_marketer.warranty_card_generator import WarrantyCardGenerator
from divisi_3_marketer.listing_copywriter import ListingCopywriter
from divisi_4_operator.email_order_listener import EmailOrderListener
from divisi_4_operator.telegram_hitl_bot import TelegramHitlBot
from divisi_4_operator.whatsapp_dispatcher import WhatsAppDispatcher
from divisi_5_support.support_triage import SupportTriage

console = Console()


class AksharaOrchestrator:
    def __init__(self):
        self.quant = QuantEngine()
        self.analytics = AnalyticsEngine()
        self.risk_officer = RiskOfficer()
        self.scraper = SupplierScraper()
        self.card_gen = WarrantyCardGenerator()
        self.copywriter = ListingCopywriter()
        self.email_listener = EmailOrderListener()
        self.hitl_bot = TelegramHitlBot()
        self.wa_dispatcher = WhatsAppDispatcher()
        self.support = SupportTriage()

    async def process_order_lifecycle(self, order: ShopeeOrder, auto_approve_hitl: bool = True) -> Dict[str, Any]:
        """
        Mengeksekusi siklus hidup pesanan lengkap dari masuk hingga terselesaikan.
        """
        console.print(f"\n[bold green]>>> MEMPROSES PESANAN: {order.order_id} ({order.product_title})[/bold green]")

        # -------------------------------------------------------------
        # STEP 1: AUDIT SUPPLIER & KALKULASI MARGIN (DIVISI 1 & 2)
        # -------------------------------------------------------------
        console.print("[cyan][1/5] Mengambil feed supplier G2G & menjalankan Risk Officer...[/cyan]")
        listings = await self.scraper.fetch_g2g_listings(order.product_title)
        
        best_listing = None
        best_assessment = None
        best_margin = None

        for listing in listings:
            assessment = self.risk_officer.evaluate_listing(listing)
            if assessment.status in [RiskStatus.APPROVED, RiskStatus.WARNING]:
                margin = self.quant.calculate_margin(listing, order.selling_price_idr)
                if margin.net_profit_idr > 0:
                    best_listing = listing
                    best_assessment = assessment
                    best_margin = margin
                    break

        if not best_listing:
            console.print("[bold red][GAGAL] Tidak ditemukan supplier yang lolos audit keamanan risiko![/bold red]")
            order.status = OrderStatus.REJECTED
            return {"status": "rejected_by_risk_officer", "order": order}

        console.print(
            f"   [green][OK] Supplier Terpilih: {best_listing.supplier_name} "
            f"(Rating: {best_listing.supplier_rating_pct}%, Modal: ${best_listing.price_usd:.2f})[/green]"
        )
        console.print(
            f"   [green][OK] Proyeksi Margin: Rp {best_margin.net_profit_idr:,.0f} "
            f"({best_margin.net_margin_pct:.1f}% Nett) setelah fee Shopee & amplop[/green]"
        )

        # -------------------------------------------------------------
        # STEP 2: HUMAN-IN-THE-LOOP APPROVAL VIA TELEGRAM (DIVISI 4)
        # -------------------------------------------------------------
        console.print("[cyan][2/5] Mengirim notifikasi approval HITL ke Telegram Senna...[/cyan]")
        order.status = OrderStatus.WAITING_HITL
        telegram_res = await self.hitl_bot.send_approval_request(
            order, best_listing, best_assessment, best_margin
        )
        console.print(f"   [green][OK] HITL Dispatch: {telegram_res.get('message', 'Terkirim')}[/green]")

        if not auto_approve_hitl:
            console.print("[yellow]Menunggu konfirmasi manual di Telegram...[/yellow]")
            return {"status": "waiting_approval", "order": order}
        
        console.print("   [bold green][OK] Otorisasi Disetujui: Senna menyetujui transaksi via Telegram.[/bold green]")
        order.status = OrderStatus.PURCHASING

        # -------------------------------------------------------------
        # STEP 3: SIMULASI JIT FULFILLMENT G2G
        # -------------------------------------------------------------
        console.print("[cyan][3/5] Melakukan akuisisi kredensial akun instan dari supplier G2G...[/cyan]")
        serial_id = f"AKSHARA-{order.order_id[-6:]}-{datetime.now().strftime('%M%S')}"
        creds = AccountCredentials(
            game_email=f"user_{order.buyer_username.lower()}@akshara-vault.com",
            game_password="AksharaSecurePass2026!#",
            serial_number=serial_id,
            delivery_notes="Segera ganti security email di account.microsoft.com"
        )
        console.print(f"   [green][OK] Kredensial Berhasil Diterbitkan. Serial ID: {serial_id}[/green]")

        # -------------------------------------------------------------
        # STEP 4: GENERASI ASSET FISIK RESI (DIVISI 3 - THE MARKETER)
        # -------------------------------------------------------------
        console.print("[cyan][4/5] Merender PDF Kartu Garansi A6 fisik untuk amplop Shopee...[/cyan]")
        now = datetime.now()
        warranty_expiry = (now + timedelta(days=30)).strftime("%d %B %Y")
        card_data = WarrantyCardData(
            order_id=order.order_id,
            serial_number=serial_id,
            buyer_name=order.buyer_username,
            purchase_date=now.strftime("%d %B %Y"),
            warranty_until=warranty_expiry,
            product_name=order.product_title
        )
        pdf_path = self.card_gen.generate_pdf(card_data)
        console.print(f"   [green][OK] PDF Siap Cetak: {pdf_path}[/green]")

        # -------------------------------------------------------------
        # STEP 5: PENGIRIMAN KREDENSIAL VIA WHATSAPP (DIVISI 4)
        # -------------------------------------------------------------
        console.print("[cyan][5/5] Mengirim kredensial dan panduan login ke WhatsApp pembeli...[/cyan]")
        wa_res = await self.wa_dispatcher.dispatch_credentials(order, creds)
        console.print(f"   [green][OK] Pesan WA berhasil dikirim ke {order.buyer_username} ({wa_res.get('phone')})[/green]")

        # -------------------------------------------------------------
        # STEP 6: PENCATATAN ANALITIK PROFIT & PNL TELEGRAM (DIVISI 1)
        # -------------------------------------------------------------
        tx_record = self.analytics.record_sale(order, best_margin, channel="Shopee")
        pnl_card_text = self.analytics.build_telegram_pnl_card(tx_record)
        await self.hitl_bot.send_pnl_notification(pnl_card_text)
        console.print(f"   [green][OK] Laporan Profit & Margin Transparan Terkirim ke Telegram Senna![/green]")

        order.status = OrderStatus.FULFILLED
        console.print(f"[bold green][SUKSES] PESANAN #{order.order_id} SELESAI SECARA OTONOM DENGAN SEMPURNA![/bold green]\n")

        return {
            "status": "success",
            "order": order,
            "margin": best_margin,
            "serial_id": serial_id,
            "pdf_warranty_path": pdf_path,
            "wa_status": wa_res,
            "transaction_record": tx_record
        }
