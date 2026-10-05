"""
Akshara Gaming Center - Telegram Commander & Market Sentry Daemon
Provides interactive Telegram commands, HITL order approvals, and automated stock/price alerts.
"""

import os
import sys
import asyncio
import io
import math
import datetime
import traceback
from typing import Dict, Any, List, Optional
import httpx

# Ensure parent path is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from bot.canvas_drawer import generate_game_canvas
from bot.formatter_data import format_delivery_message, generate_warranty_code
from bot.eneba_data import VERIFIED_ENEBA_ITEMS, search_eneba_catalog, calculate_custom_eneba
from bot.market_sentry import (
    audit_all_catalog_sellers,
    build_stock_summary_report,
    get_critical_stock_alerts,
    fetch_g2g_offer_live,
    extract_offer_id
)

# Load Environment Variables from .env
def get_env_credentials() -> (str, str):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID")
    if not token or not chat_id:
        env_path = os.path.join(BASE_DIR, ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("TELEGRAM_BOT_TOKEN="):
                        token = line.split("=", 1)[1].strip()
                    elif line.startswith("TELEGRAM_ADMIN_CHAT_ID="):
                        chat_id = line.split("=", 1)[1].strip()
    return token or "", chat_id or ""


class TelegramCommander:
    def __init__(self, token: Optional[str] = None, admin_chat_id: Optional[str] = None):
        t, c = get_env_credentials()
        self.token = token or t
        self.admin_chat_id = str(admin_chat_id or c)
        self.api_url = f"https://api.telegram.org/bot{self.token}"
        self.is_running = False
        self.watcher_enabled = True
        self.last_stock_state: Dict[str, int] = {}
        self.check_interval_seconds = 900  # 15 menit

    async def send_message(
        self,
        chat_id: str,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: str = "Markdown"
    ) -> bool:
        """Kirim pesan teks ke Telegram."""
        url = f"{self.api_url}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                return resp.status_code == 200
        except Exception as e:
            print(f"[Telegram Error] sendMessage failed: {e}")
            return False

    async def send_photo(
        self,
        chat_id: str,
        photo_bytes: io.BytesIO,
        caption: str = "",
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Kirim gambar canvas ke Telegram via multipart/form-data."""
        url = f"{self.api_url}/sendPhoto"
        data = {
            "chat_id": chat_id,
            "caption": caption,
            "parse_mode": "Markdown"
        }
        if reply_markup:
            import json
            data["reply_markup"] = json.dumps(reply_markup)

        photo_bytes.seek(0)
        files = {
            "photo": ("canvas_thumbnail.png", photo_bytes.getvalue(), "image/png")
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, data=data, files=files)
                return resp.status_code == 200
        except Exception as e:
            print(f"[Telegram Error] sendPhoto failed: {e}")
            return False

    async def answer_callback(self, callback_id: str, text: str = "") -> None:
        """Menjawab event klik tombol callback."""
        url = f"{self.api_url}/answerCallbackQuery"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(url, json={"callback_query_id": callback_id, "text": text})
        except Exception:
            pass

    def get_main_menu_markup(self) -> Dict[str, Any]:
        """Membuat tombol menu interaktif (Inline Keyboard)."""
        return {
            "inline_keyboard": [
                [
                    {"text": "📦 Cek Stok Live (G2G)", "callback_data": "btn_stock"},
                    {"text": "⚡ Radar Eneba CDKey", "callback_data": "btn_eneba"}
                ],
                [
                    {"text": "🎨 Buat Banner Canvas", "callback_data": "btn_canvas_help"},
                    {"text": "📋 Format Pesanan Shopee", "callback_data": "btn_format_help"}
                ],
                [
                    {"text": "🧮 Hitung Quant & BEP", "callback_data": "btn_quant_help"},
                    {"text": "📊 Briefing Harian", "callback_data": "btn_briefing"}
                ]
            ]
        }

    async def handle_start(self, chat_id: str) -> None:
        """Handler untuk command /start atau /menu."""
        text = (
            "🚀 *AKSHARA GAMING CENTER — POCKET COMMAND DECK*\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Halo Senna! Sistem komando otonom Akshara siap melayani operasional Anda.\n\n"
            "⚡ *Fitur Komando Tersedia:*\n"
            "• `/stock` — Audit live stok seller ribuan unit & status online\n"
            "• `/canvas <game>` — Auto generate banner 1080x1080 Shopee\n"
            "• `/format <game> | <pembeli> | <key>` — Format chat pengiriman 3-langkah\n"
            "• `/quant <jual> <cogs_usd>` — Kalkulasi margin bersih, Shopee fee & BEP\n"
            "• `/eneba <query>` — Cek harga checkout landed cost Eneba\n"
            "• `/g2g <link_atau_id>` — Inspeksi offer & seller G2G langsung\n"
            "• `/briefing` — Ringkasan metrik eksekutif toko\n"
            "• `/help` — Panduan lengkap sintaks perintah\n\n"
            "Silakan gunakan tombol menu di bawah untuk akses cepat:"
        )
        await self.send_message(chat_id, text, reply_markup=self.get_main_menu_markup())

    async def handle_help(self, chat_id: str) -> None:
        """Handler untuk command /help."""
        text = (
            "📖 *PANDUAN LENGKAP COMMAND AKSHARA BOT*\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "1️⃣ *Live Stock & Sentry:*\n"
            "• `/stock` — Menampilkan audit real-time seluruh supplier di katalog aktif.\n"
            "• `/g2g <link/offer_id>` — Cek offer tertentu (contoh: `/g2g G1703129821471UK`).\n\n"
            "2️⃣ *Pemasaran & Konten Produk:*\n"
            "• `/canvas <nama_game>` — Membuat gambar thumbnail 1080x1080.\n"
            "  _Contoh:_ `/canvas Project Zomboid`\n"
            "  _Contoh:_ `/canvas Minecraft | Rp 219.000`\n\n"
            "3️⃣ *Pengiriman & Layanan Pembeli:*\n"
            "• `/format <game> | <buyer> | <key>` — Format chat pengiriman 3-langkah.\n"
            "  _Contoh:_ `/format Terraria | Budi Santoso | STEAM-XXXX-YYYY`\n\n"
            "4️⃣ *Kalkulasi Finansial (The Quant):*\n"
            "• `/quant <harga_jual> <cogs_usd>` — Hitung profit bersih setelah fee Shopee (8%+1k) & QRIS.\n"
            "  _Contoh:_ `/quant 219000 8.20`\n\n"
            "5️⃣ *Supplier Radar (Eneba):*\n"
            "• `/eneba <nama_game>` — Cek modal landed cost Eneba (kurs + checkout fee 10% + QRIS).\n"
            "  _Contoh:_ `/eneba minecraft` atau `/eneba zomboid`\n\n"
            "6️⃣ *Sistem Watcher:*\n"
            "• `/watcher` — Cek status background Sentry (pemantau stok berkala)."
        )
        await self.send_message(chat_id, text)

    async def handle_stock(self, chat_id: str) -> None:
        """Handler untuk command /stock."""
        await self.send_message(chat_id, "🔍 _Menghubungi server G2G SLS API... Mohon tunggu sebentar._")
        audit_res = await audit_all_catalog_sellers()
        report = build_stock_summary_report(audit_res)
        await self.send_message(chat_id, report)

    async def handle_canvas(self, chat_id: str, args_text: str) -> None:
        """Handler untuk command /canvas."""
        if not args_text.strip():
            msg = (
                "ℹ️ *Cara Pakai Command Canvas:*\n"
                "Ketik `/canvas <nama_game>` atau `/canvas <nama_game> | <harga_promo>`\n\n"
                "Contoh:\n"
                "• `/canvas Project Zomboid`\n"
                "• `/canvas Minecraft: Java & Bedrock | Rp 219.000`\n"
                "• `/canvas Terraria | Rp 99.000`"
            )
            await self.send_message(chat_id, msg)
            return

        parts = [p.strip() for p in args_text.split("|")]
        game_title = parts[0]
        price_str = parts[1] if len(parts) > 1 else None

        await self.send_message(chat_id, f"🎨 _Merender canvas ultra HD 1080x1080 untuk *{game_title}*..._")

        # Tentukan tema warna dinamis
        theme = "violet"
        if "minecraft" in game_title.lower() or "terraria" in game_title.lower():
            theme = "emerald"
        elif "gta" in game_title.lower() or "zomboid" in game_title.lower():
            theme = "amber"
        elif "cyberpunk" in game_title.lower() or "company" in game_title.lower():
            theme = "cyan"

        img_bytes = generate_game_canvas(
            game_title=game_title,
            price_str=price_str,
            theme_color=theme
        )

        caption = (
            f"🖼️ *CANVAS PRODUK RESMI AKSHARA: {game_title.upper()}*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ Resolusi: 1080x1080 px (1:1 Standar Shopee Feed / Thumbnail)\n"
            f"🛡️ Desain: Dark Tech Theme dengan Badge Garansi Akshara & 0% Hackback\n"
            f"💡 _Siap diunduh dan dipasang di etalase Shopee Anda!_"
        )
        await self.send_photo(chat_id, img_bytes, caption=caption)

    async def handle_format(self, chat_id: str, args_text: str) -> None:
        """Handler untuk command /format."""
        if not args_text.strip() or "|" not in args_text:
            msg = (
                "ℹ️ *Cara Pakai Command Format Pengiriman:*\n"
                "Ketik `/format <game> | <nama_pembeli> | <key_atau_akun>`\n\n"
                "Contoh:\n"
                "`/format Project Zomboid | Budi Santoso | STEAM-KEY-9821-LH88`\n\n"
                "Sistem akan langsung menyusun template 3-langkah lengkap dengan nomor garansi unik siap copas ke chat Shopee."
            )
            await self.send_message(chat_id, msg)
            return

        parts = [p.strip() for p in args_text.split("|")]
        game_title = parts[0]
        buyer_name = parts[1] if len(parts) > 1 else "Pelanggan"
        credential = parts[2] if len(parts) > 2 else "LMS-XXXX-YYYY-ZZZZ"

        msg = format_delivery_message(
            game_title=game_title,
            buyer_name=buyer_name,
            credential_or_key=credential
        )
        await self.send_message(chat_id, msg)

    async def handle_quant(self, chat_id: str, args_text: str) -> None:
        """Handler untuk command /quant [harga_jual] [cogs_usd]."""
        parts = args_text.strip().split()
        if len(parts) < 2:
            msg = (
                "ℹ️ *Cara Pakai Command Quant:*\n"
                "Ketik `/quant <harga_jual_idr> <cogs_usd>`\n\n"
                "Contoh:\n"
                "`/quant 219000 8.20`\n"
                "`/quant 149000 5.50`"
            )
            await self.send_message(chat_id, msg)
            return

        try:
            selling_price = float(parts[0].replace(".", "").replace(",", ""))
            cogs_usd = float(parts[1].replace("$", "").replace(",", "."))
        except ValueError:
            await self.send_message(chat_id, "❌ Format angka tidak valid. Contoh: `/quant 219000 8.20`")
            return

        usd_rate = 16350.0
        cogs_raw_idr = cogs_usd * usd_rate
        qris_fee_idr = cogs_raw_idr * 0.007
        cogs_net_idr = cogs_raw_idr + qris_fee_idr

        shopee_admin_fee = selling_price * 0.08
        shopee_service_fee = 1000.0
        packaging_cost = 2000.0

        total_costs = cogs_net_idr + shopee_admin_fee + shopee_service_fee + packaging_cost
        net_profit = selling_price - total_costs
        net_margin = (net_profit / selling_price) * 100.0 if selling_price > 0 else 0

        # BEP
        fixed_costs = cogs_net_idr + shopee_service_fee + packaging_cost
        bep = fixed_costs / 0.92

        health_emoji = "🟢 SEHAT" if net_margin >= 20 else ("🟡 TIPIS" if net_margin >= 10 else "🔴 RISIKO RUGI")

        res_msg = (
            f"🧮 *[HASIL SIMULASI PROFIT — THE QUANT]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💰 *Harga Jual Shopee:* Rp {selling_price:,.0f}\n"
            f"💵 *Modal Sourcing:* ${cogs_usd:.2f} (~Rp {cogs_raw_idr:,.0f})\n"
            f"💳 *Fee QRIS (0.7%):* Rp {qris_fee_idr:,.0f}\n"
            f"📦 *Modal Bersih (COGS Net):* Rp {cogs_net_idr:,.0f}\n\n"
            f"📉 *POTONGAN & BIAYA TETAP:*\n"
            f"• Shopee Admin (8%): -Rp {shopee_admin_fee:,.0f}\n"
            f"• Shopee Service Fee: -Rp {shopee_service_fee:,.0f}\n"
            f"• Amplop & Kartu A6: -Rp {packaging_cost:,.0f}\n\n"
            f"📊 *HASIL AKHIR:*\n"
            f"• *PROFIT BERSIH:* *Rp {net_profit:,.0f}*\n"
            f"• *Margin Bersih:* *{net_margin:.1f}%* ({health_emoji})\n"
            f"• *Titik Impas (BEP):* Rp {bep:,.0f}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━"
        )
        await self.send_message(chat_id, res_msg)

    async def handle_eneba(self, chat_id: str, query: str) -> None:
        """Handler untuk command /eneba."""
        q = query.strip()
        if not q:
            await self.send_message(chat_id, "ℹ️ Ketik `/eneba <nama_game>`\nContoh: `/eneba minecraft` atau `/eneba zomboid`")
            return

        results = search_eneba_catalog(q)
        if results:
            lines = [
                f"⚡ *[HASIL RADAR ENEBA CDKEY — {q.upper()}]*",
                "━━━━━━━━━━━━━━━━━━━━━━"
            ]
            for item in results[:4]:
                lines.append(
                    f"🎮 *{item['title']}*\n"
                    f"• Platform: `{item['platform']}` ({item['key_type']})\n"
                    f"• Modal Checkout Riil: *Rp {item['price_idr']:,}* (~${item['price_usd']:.2f})\n"
                    f"• Rekomendasi Shopee: *Rp {item['recommended_shopee_idr']:,}*\n"
                    f"• Potensi Margin: *+{item['net_margin_pct']}%* (+Rp {item['net_profit_idr']:,})\n"
                    f"• Risiko: 🛡️ *{item['hackback_risk']}*\n"
                    f"• Link: {item['url']}\n"
                )
            lines.append("━━━━━━━━━━━━━━━━━━━━━━")
            lines.append("💡 _Pricelist terkalibrasi kurs USD + fee checkout Eneba 10% + QRIS 0.7%._")
            await self.send_message(chat_id, "\n".join(lines))
        else:
            calc = calculate_custom_eneba(price_usd=15.0)
            msg = (
                f"🔍 Tidak ada game dengan nama *'{q}'* pada 18 katalog utama Eneba.\n\n"
                f"💡 *Kalkulator Formula Sourcing Eneba:* Jika Anda menemukan CDKey di Eneba seharga misal $15.00, maka landed cost adalah:\n"
                f"• Modal Checkout (+10% fee): Rp {calc['landed_cost_idr']:,}\n"
                f"• Rekomendasi Jual Shopee: Rp {calc['recommended_shopee_idr']:,}\n"
                f"• Potensi Laba Bersih: Rp {calc['net_profit_idr']:,} ({calc['net_margin_pct']}%)"
            )
            await self.send_message(chat_id, msg)

    async def handle_g2g(self, chat_id: str, query: str) -> None:
        """Handler untuk command /g2g [link/offer_id]."""
        offer_id = extract_offer_id(query)
        if not offer_id:
            await self.send_message(
                chat_id,
                "ℹ️ Masukkan link atau Offer ID G2G yang valid.\nContoh: `/g2g G1703129821471UK`"
            )
            return

        await self.send_message(chat_id, f"🔍 _Memeriksa offer `{offer_id}` ke server G2G SLS API..._")
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await fetch_g2g_offer_live(client, offer_id)

        if res.get("ok"):
            online_str = "🟢 ONLINE" if res.get("is_online") else "⚪ OFFLINE"
            status_str = "🟢 LIVE AKTIF" if res.get("status") == "live" else f"🔴 {res.get('status').upper()}"
            msg = (
                f"🎮 *[HASIL INSPEKSI OFFER G2G SLS]*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"📦 *Offer ID:* `{res['offer_id']}`\n"
                f"🏷️ *Judul:* {res.get('title') or '-'}\n"
                f"👤 *Seller:* `{res.get('seller_name')}` ({online_str})\n"
                f"⭐ *Rating:* {res.get('satisfaction_rate', 0)*100:.1f}%\n"
                f"📊 *Status:* {status_str}\n"
                f"📦 *Stok Faktual:* *{res.get('available_qty', 0):,} UNIT*\n"
                f"💵 *Harga Modal:* *${res.get('price_usd', 0.0):.2f}*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"⚡ _Data langsung ditarik detik ini dari sls.g2g.com._"
            )
        else:
            msg = f"❌ Gagal memeriksa offer `{offer_id}`: {res.get('error')}"

        await self.send_message(chat_id, msg)

    async def handle_briefing(self, chat_id: str) -> None:
        """Handler untuk ringkasan harian /briefing."""
        now_str = datetime.datetime.now().strftime("%d %b %Y, %H:%M WIB")
        msg = (
            f"📊 *[EXECUTIVE BRIEFING — AKSHARA GAMING CENTER]*\n"
            f"🕒 *Waktu Sistem:* {now_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🛡️ *Status Sentry:* 🟢 AKTIF (Monitoring G2G & Eneba)\n"
            f"⚡ *Gateway Aktif:* G2G SLS Direct & Eneba CDKey Terminal\n"
            f"💎 *Risiko Hackback:* 0% (Katalog Terverifikasi)\n"
            f"💳 *Metode Pembayaran:* QRIS Instant Pay (Fee 0.7%)\n\n"
            f"📦 *Pintasan Operasional:*\n"
            f"• Ketik `/stock` untuk audit live stok\n"
            f"• Ketik `/canvas <game>` untuk buat banner Shopee\n"
            f"• Ketik `/format <game> | <buyer> | <key>` untuk proses pesanan"
        )
        await self.send_message(chat_id, msg)

    async def handle_callback_query(self, query: Dict[str, Any]) -> None:
        """Handler untuk interaksi tombol inline keyboard."""
        callback_id = query.get("id", "")
        data = query.get("data", "")
        from_user = query.get("from", {})
        chat_id = str(from_user.get("id", self.admin_chat_id))

        await self.answer_callback(callback_id, "Memproses permintaan...")

        if data == "btn_stock":
            await self.handle_stock(chat_id)
        elif data == "btn_eneba":
            await self.handle_eneba(chat_id, "minecraft")
        elif data == "btn_canvas_help":
            await self.handle_canvas(chat_id, "")
        elif data == "btn_format_help":
            await self.handle_format(chat_id, "")
        elif data == "btn_quant_help":
            await self.handle_quant(chat_id, "")
        elif data == "btn_briefing":
            await self.handle_briefing(chat_id)
        elif data.startswith("approve_"):
            parts = data.split("_")
            order_id = parts[1] if len(parts) > 1 else "Unknown"
            await self.send_message(chat_id, f"✅ *[PESANAN DISETUJUI]*\nPesanan `{order_id}` telah diotorisasi untuk diproses di supplier!")
        elif data.startswith("reject_"):
            parts = data.split("_")
            order_id = parts[1] if len(parts) > 1 else "Unknown"
            await self.send_message(chat_id, f"❌ *[PESANAN DITOLAK]*\nPesanan `{order_id}` telah dibatalkan.")

    async def process_update(self, update: Dict[str, Any]) -> None:
        """Memproses satu update pesan atau interaksi dari Telegram."""
        if "callback_query" in update:
            await self.handle_callback_query(update["callback_query"])
            return

        message = update.get("message", {})
        text = message.get("text", "").strip()
        chat = message.get("chat", {})
        chat_id = str(chat.get("id", ""))

        if not text:
            return

        cmd = text.split()[0].lower()
        args_text = text[len(cmd):].strip()

        # Handle Commands
        if cmd in ("/start", "/menu"):
            await self.handle_start(chat_id)
        elif cmd in ("/help", "/panduan"):
            await self.handle_help(chat_id)
        elif cmd in ("/stock", "/cekstok", "/stok"):
            await self.handle_stock(chat_id)
        elif cmd in ("/canvas", "/banner", "/thumbnail"):
            await self.handle_canvas(chat_id, args_text)
        elif cmd in ("/format", "/kirim", "/delivery"):
            await self.handle_format(chat_id, args_text)
        elif cmd in ("/quant", "/hitung", "/calc"):
            await self.handle_quant(chat_id, args_text)
        elif cmd in ("/eneba", "/cdkey"):
            await self.handle_eneba(chat_id, args_text)
        elif cmd in ("/g2g", "/offer"):
            await self.handle_g2g(chat_id, args_text)
        elif cmd in ("/briefing", "/daily"):
            await self.handle_briefing(chat_id)
        elif cmd in ("/watcher", "/sentry"):
            status = "🟢 AKTIF" if self.watcher_enabled else "🔴 NONAKTIF"
            await self.send_message(chat_id, f"🛡️ *Status Market Watcher Sentry:* {status}\nInterval Pemeriksaan: {self.check_interval_seconds // 60} menit sekali.")
        else:
            # Fallback jika perintah tidak dikenali
            await self.send_message(
                chat_id,
                f"❓ Perintah `{cmd}` tidak dikenali.\nKetik `/menu` atau `/help` untuk melihat daftar komando."
            )

    async def run_market_watcher(self) -> None:
        """Background loop yang memeriksa stok & harga secara berkala."""
        print(f"[Market Sentry] Watcher started. Checking every {self.check_interval_seconds}s...")
        await asyncio.sleep(10)  # Tunggu 10s setelah bot start sebelum cek pertama
        
        while self.is_running:
            if self.watcher_enabled:
                try:
                    print("[Market Sentry] Running scheduled stock audit...")
                    audit_res = await audit_all_catalog_sellers()
                    alerts = get_critical_stock_alerts(audit_res)
                    if alerts and self.admin_chat_id:
                        for alert_msg in alerts:
                            await self.send_message(self.admin_chat_id, alert_msg)
                            await asyncio.sleep(1)
                except Exception as e:
                    print(f"[Market Sentry Error] {e}")

            await asyncio.sleep(self.check_interval_seconds)

    async def start_polling(self) -> None:
        """Memulai loop async long-polling Telegram bot."""
        if not self.token or "mock" in self.token:
            print("[Error] TELEGRAM_BOT_TOKEN belum disetel di .env!")
            return

        self.is_running = True
        print(f"🚀 [Telegram Commander] Bot polling started! Admin Chat ID: {self.admin_chat_id}")
        
        # Kirim notifikasi bot aktif ke admin
        if self.admin_chat_id:
            await self.send_message(
                self.admin_chat_id,
                "🚀 *[AKSHARA COMMAND DECK AKTIF]*\n"
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                "Bot Telegram dan Market Sentry resmi telah terhubung dan aktif di komputer Senna!\n"
                "Ketik `/menu` untuk membuka pusat kendali.",
                reply_markup=self.get_main_menu_markup()
            )

        # Jalankan background watcher task
        watcher_task = asyncio.create_task(self.run_market_watcher())

        offset = 0
        async with httpx.AsyncClient(timeout=35.0) as client:
            while self.is_running:
                try:
                    resp = await client.get(
                        f"{self.api_url}/getUpdates",
                        params={"offset": offset, "timeout": 25}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        updates = data.get("result", [])
                        for update in updates:
                            update_id = update["update_id"]
                            offset = update_id + 1
                            asyncio.create_task(self.process_update(update))
                    elif resp.status_code == 409:
                        print("[Telegram Warning] Conflict 409: Ada instance bot lain yang aktif. Menunggu 5s...")
                        await asyncio.sleep(5)
                    else:
                        print(f"[Telegram Polling Warning] HTTP {resp.status_code}: {resp.text}")
                        await asyncio.sleep(3)
                except (httpx.ReadTimeout, httpx.ConnectTimeout):
                    continue
                except Exception as e:
                    print(f"[Telegram Polling Error] {e}")
                    await asyncio.sleep(5)

        watcher_task.cancel()


if __name__ == "__main__":
    commander = TelegramCommander()
    try:
        asyncio.run(commander.start_polling())
    except KeyboardInterrupt:
        print("\n[Telegram Commander] Stopped by user.")
