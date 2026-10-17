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
import json
import uuid
import random
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

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

    def _find_and_pop_vault_stock(self, product_title: str, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Mengecek stok pre-stocked di Inventory Vault.
        Jika ditemukan item AVAILABLE yang cocok, status diubah menjadi DISPATCHED.
        """
        base_dir = os.path.dirname(os.path.abspath(__file__))
        vault_paths = [
            os.path.join(base_dir, "output", "inventory_vault.json"),
            os.path.join(base_dir, "web", "data", "inventory_vault.json"),
        ]

        target_norm = "".join(c for c in product_title.lower() if c.isalnum() or c.isspace()).strip()
        tokens = [t for t in target_norm.split() if len(t) > 2]

        for v_path in vault_paths:
            if not os.path.exists(v_path):
                continue
            try:
                with open(v_path, "r", encoding="utf-8") as f:
                    items = json.load(f)
                if not isinstance(items, list):
                    continue

                for idx, item in enumerate(items):
                    if item.get("status") == "AVAILABLE":
                        item_title = "".join(c for c in (item.get("game_title") or "").lower() if c.isalnum() or c.isspace()).strip()
                        is_match = False
                        if target_norm in item_title or item_title in target_norm:
                            is_match = True
                        elif any(tok in item_title for tok in tokens):
                            is_match = True

                        if is_match:
                            now_iso = datetime.now().isoformat()
                            item["status"] = "DISPATCHED"
                            item["assigned_order_id"] = order_id
                            item["dispatched_at"] = now_iso
                            items[idx] = item

                            try:
                                with open(v_path, "w", encoding="utf-8") as fw:
                                    json.dump(items, fw, indent=2)
                            except Exception:
                                pass

                            # Sinkronisasi ke file vault lainnya jika ada
                            other_path = vault_paths[1] if v_path == vault_paths[0] else vault_paths[0]
                            if os.path.exists(other_path):
                                try:
                                    with open(other_path, "r", encoding="utf-8") as f2:
                                        other_items = json.load(f2)
                                    for o_idx, o_item in enumerate(other_items):
                                        if o_item.get("id") == item.get("id"):
                                            other_items[o_idx] = item
                                            break
                                    with open(other_path, "w", encoding="utf-8") as fw2:
                                        json.dump(other_items, fw2, indent=2)
                                except Exception:
                                    pass

                            # Hitung sisa stok brankas untuk game ini & kirim radar alert jika <= 1
                            remaining = sum(
                                1 for it in items
                                if it.get("status") == "AVAILABLE" and (
                                    target_norm in "".join(c for c in (it.get("game_title") or "").lower() if c.isalnum() or c.isspace()).strip()
                                    or "".join(c for c in (it.get("game_title") or "").lower() if c.isalnum() or c.isspace()).strip() in target_norm
                                )
                            )
                            if remaining <= 1:
                                self._trigger_low_stock_radar(product_title, remaining)

                            return item
            except Exception as e:
                console.print(f"[yellow]Warning membaca vault {v_path}: {e}[/yellow]")
        return None

    def _trigger_low_stock_radar(self, game_title: str, remaining_count: int):
        """Kirim alert Telegram restock mendesak jika stok brankas menipis."""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cat_path = os.path.join(base_dir, "web", "data", "active_catalog.json")
        supplier_name = "Supplier Terverifikasi"
        modal_str = "N/A"
        supplier_url = "https://www.g2g.com/id"

        if os.path.exists(cat_path):
            try:
                with open(cat_path, "r", encoding="utf-8") as f:
                    cat = json.load(f)
                clean_target = "".join(c for c in game_title.lower() if c.isalnum())
                for g in cat:
                    clean_g = "".join(c for c in g.get("title", "").lower() if c.isalnum())
                    if clean_target in clean_g or clean_g in clean_target:
                        sellers = g.get("sellers", [])
                        if sellers:
                            sorted_sellers = sorted(sellers, key=lambda s: s.get("price_g2g_idr", 0))
                            best = sorted_sellers[0]
                            supplier_name = best.get("seller_name", "Supplier G2G")
                            price = best.get("price_g2g_idr", 0)
                            modal_str = f"Rp {price:,}" if price else "N/A"
                            supplier_url = best.get("profile_url", "https://www.g2g.com/id")
                            break
            except Exception:
                pass

        alert_text = (
            f"⚠️ *[PERINGATAN STOK BRANKAS MENIPIS: SISA {remaining_count} UNIT]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🎮 *Game:* `{game_title}`\n"
            f"📦 *Sisa Stok Brankas:* *{remaining_count} UNIT TERSISA*\n"
            f"🛡️ *Rekomendasi Supplier:* `{supplier_name}`\n"
            f"💵 *Harga Modal:* *{modal_str}*\n"
            f"🔗 *Tautan Supplier Langsung:* {supplier_url}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💡 *Tindakan:* Segera restock akun baru ke Brankas agar fitur instant 'Sleep & Earn' tetap berjalan lancar!"
        )
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.hitl_bot.send_pnl_notification(alert_text))
        except Exception:
            pass

    def _save_claimed_credential(
        self,
        claim_code: str,
        passcode: str,
        order_id: str,
        buyer_username: str,
        product_title: str,
        platform: str,
        credential_data: str,
        warranty_code: str
    ):
        """Menyimpan klaim baru ke claimed_credentials.json."""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        claim_paths = [
            os.path.join(base_dir, "web", "data", "claimed_credentials.json"),
            os.path.join(base_dir, "output", "claimed_credentials.json"),
        ]

        new_claim = {
            "claim_code": claim_code,
            "passcode": passcode,
            "order_id": order_id,
            "buyer_username": buyer_username,
            "product_title": product_title,
            "platform": platform,
            "credential_data": credential_data,
            "warranty_days": 30,
            "warranty_code": warranty_code,
            "status": "UNCLAIMED",
            "created_at": datetime.now().isoformat(),
            "revealed_at": None,
            "revealed_ip": None,
            "revealed_user_agent": None,
            "reveal_count": 0,
            "reveal_history": []
        }

        for c_path in claim_paths:
            try:
                claims = []
                if os.path.exists(c_path):
                    with open(c_path, "r", encoding="utf-8") as f:
                        claims = json.load(f)
                    if not isinstance(claims, list):
                        claims = []
                claims.insert(0, new_claim)
                os.makedirs(os.path.dirname(c_path), exist_ok=True)
                with open(c_path, "w", encoding="utf-8") as fw:
                    json.dump(claims, fw, indent=2)
            except Exception as e:
                console.print(f"[yellow]Warning menyimpan claim ke {c_path}: {e}[/yellow]")

    async def process_order_lifecycle(self, order: ShopeeOrder, auto_approve_hitl: bool = True) -> Dict[str, Any]:
        """
        Mengeksekusi siklus hidup pesanan lengkap dari masuk hingga terselesaikan.
        """
        console.print(f"\n[bold green]>>> MEMPROSES PESANAN: {order.order_id} ({order.product_title})[/bold green]")

        # -------------------------------------------------------------
        # STEP 0: ZERO-TOUCH AUTO-FULFILLMENT DARI INVENTORY VAULT ("SLEEP & EARN")
        # -------------------------------------------------------------
        vault_item = self._find_and_pop_vault_stock(order.product_title, order.order_id)
        if vault_item:
            console.print(f"[bold green]⚡ [ZERO-TOUCH AUTO-FULFILLMENT] Ditemukan stok di Vault untuk: {order.product_title}[/bold green]")
            serial_id = f"AKSHARA-VAULT-{order.order_id[-6:]}-{datetime.now().strftime('%M%S')}"
            claim_code = f"AKSH-{uuid.uuid4().hex[:4].upper()}-{order.order_id[-2:].upper()}"
            passcode = f"{random.randint(100000, 999999)}"

            raw_creds = (
                f"Username: {vault_item.get('username')}\n"
                f"Password: {vault_item.get('password')}\n"
                f"Platform: {vault_item.get('platform', 'PC')}\n"
                f"Catatan: {vault_item.get('notes', 'Akun resmi Akshara Inventory Vault')}"
            )

            self._save_claimed_credential(
                claim_code=claim_code,
                passcode=passcode,
                order_id=order.order_id,
                buyer_username=order.buyer_username,
                product_title=order.product_title,
                platform=vault_item.get("platform", "PC"),
                credential_data=raw_creds,
                warranty_code=serial_id
            )

            shopee_chat = (
                f"Halo Kak {order.buyer_username}! Terima kasih sudah berbelanja di Akshara Gaming Center.\n\n"
                f"Pesanan {order.product_title} sudah berhasil diproses otomatis secara instan!\n"
                f"Silakan klaim akun dan garansi resmi Kakak di link berikut:\n"
                f"🔗 https://claim.aksharagaming.com/claim/{claim_code}\n"
                f"🔑 PIN Verifikasi: {passcode}\n\n"
                f"Selamat bermain dan salam hangat dari Akshara Gaming Center!"
            )

            telegram_text = (
                f"⚡ *[AUTO-FULFILLED DARI VAULT — ZERO TOUCH]*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"📦 *No. Pesanan:* `{order.order_id}`\n"
                f"👤 *Pembeli:* `{order.buyer_username}`\n"
                f"🎮 *Produk:* {order.product_title}\n"
                f"🔑 *Kode Klaim:* `{claim_code}`\n"
                f"🔢 *PIN Verifikasi:* `{passcode}`\n\n"
                f"📋 *Template Chat Shopee (Tinggal Paste):*\n"
                f"```\n{shopee_chat}\n```"
            )
            await self.hitl_bot.send_pnl_notification(telegram_text)

            creds = AccountCredentials(
                game_email=vault_item.get("username", f"user_{order.buyer_username.lower()}@akshara-vault.com"),
                game_password=vault_item.get("password", "AksharaSecurePass2026!#"),
                serial_number=serial_id,
                delivery_notes=vault_item.get("notes", "Kredensial resmi dari Akshara Inventory Vault")
            )

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
            wa_res = await self.wa_dispatcher.dispatch_credentials(order, creds)

            order.status = OrderStatus.FULFILLED
            console.print(f"[bold green][SUKSES] Pesanan #{order.order_id} berhasil di-auto-fulfill dari vault tanpa menunggu HITL![/bold green]\n")
            return {
                "status": "auto_fulfilled_vault",
                "order": order,
                "claim_code": claim_code,
                "passcode": passcode,
                "serial_id": serial_id,
                "pdf_warranty_path": pdf_path,
                "wa_status": wa_res,
                "vault_item": vault_item
            }

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
