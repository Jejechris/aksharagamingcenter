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
import json
import random
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

CLAIM_SYNC_PATHS = [
    os.path.join(BASE_DIR, "web", "data", "claimed_credentials.json"),
    os.path.join(BASE_DIR, "claim-web", "data", "claimed_credentials.json"),
    r"C:\Users\jesen\Desktop\scrt\web\data\claimed_credentials.json",
    r"C:\Users\jesen\Desktop\scrt\claim-web\data\claimed_credentials.json",
]

def load_claimed_credentials() -> List[Dict[str, Any]]:
    for p in CLAIM_SYNC_PATHS:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                continue
    return []

def save_claimed_credentials_all(claims: List[Dict[str, Any]]) -> None:
    for target in CLAIM_SYNC_PATHS:
        try:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "w", encoding="utf-8") as f:
                json.dump(claims, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

def generate_unique_passcode(existing_claims: List[Dict[str, Any]]) -> str:
    """Menghasilkan PIN 6-digit unik yang terjamin belum pernah digunakan di database (Anti-Tabrakan)."""
    used_pins = {str(c.get("passcode", "")).strip() for c in existing_claims if c.get("passcode")}
    for _ in range(10000):
        pin = str(random.randint(100000, 999999))
        if pin not in used_pins:
            return pin
    # Fallback
    return str(random.randint(1000000, 9999999))

def generate_unique_claim_code(existing_claims: List[Dict[str, Any]], game_title: str) -> str:
    """Menghasilkan Kode Klaim unik yang belum pernah digunakan."""
    used_codes = {str(c.get("claim_code", "")).upper() for c in existing_claims if c.get("claim_code")}
    clean_tag = "".join(c for c in game_title[:2] if c.isalnum()).upper() or "MC"
    for _ in range(10000):
        code = f"AKSH-{random.randint(1000, 9999)}-{clean_tag}"
        if code not in used_codes:
            return code
    return f"AKSH-{random.randint(10000, 99999)}-{clean_tag}"

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
        self.sessions: Dict[str, Dict[str, Any]] = {}  # Wizard sesi interaktif per chat_id

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
                    {"text": "🛍️ Shopee Listing & Cover", "callback_data": "btn_shopee_help"},
                    {"text": "🎨 Buat Banner Canvas", "callback_data": "btn_canvas_help"}
                ],
                [
                    {"text": "🔑 Buat Token Klaim", "callback_data": "btn_new_claim_help"},
                    {"text": "📋 Daftar Token Klaim", "callback_data": "btn_claims_list"}
                ],
                [
                    {"text": "📋 Format Pesanan Shopee", "callback_data": "btn_format_help"},
                    {"text": "🧮 Hitung Quant & BEP", "callback_data": "btn_quant_help"}
                ],
                [
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
            "• `/shopee <game>` — Judul SEO, Deskripsi Lengkap & Render Cover Shopee 1080x1080\n"
            "• `/newclaim <game> | <buyer> | <kredensial>` — Terbitkan token klaim + Passcode PIN\n"
            "• `/claims` — Lihat 5 token klaim terbaru & status buka/IP\n"
            "• `/cekclaim <kode>` — Audit forensik IP pembeli & waktu buka kredensial\n"
            "• `/stock` — Audit live stok seller ribuan unit & link langsung (Rupiah)\n"
            "• `/canvas <game>` — Auto generate banner 1080x1080 Shopee\n"
            "• `/format <game> | <buyer> | <key>` — Format chat pengiriman Shopee\n"
            "• `/quant <jual> <cogs_usd>` — Kalkulasi margin bersih, Shopee fee & BEP\n"
            "• `/eneba <query>` — Cek harga checkout landed cost Eneba (Rupiah)\n"
            "• `/g2g <link_atau_id>` — Inspeksi offer & seller G2G langsung + link\n"
            "• `/briefing` — Ringkasan metrik eksekutif toko\n\n"
            "Silakan gunakan tombol menu di bawah untuk akses cepat:"
        )
        await self.send_message(chat_id, text, reply_markup=self.get_main_menu_markup())

    async def handle_help(self, chat_id: str) -> None:
        """Handler untuk command /help."""
        text = (
            "📖 *PANDUAN LENGKAP COMMAND AKSHARA BOT*\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🛍️ *1. Listing Shopee & Cover Generator:*\n"
            "• `/shopee <nama_game> [| <harga>]` — Generate Judul SEO, Deskripsi lengkap siap salin, & Render Cover Banner 1080x1080.\n"
            "  _Contoh:_ `/shopee Minecraft: Java & Bedrock`\n"
            "  _Contoh:_ `/shopee Project Zomboid | Rp 149.000`\n\n"
            "🔑 *2. Brankas Klaim & Passcode PIN (Website Ke-2):*\n"
            "• `/newclaim <game> | <buyer> | <kredensial> [| <passcode>]` — Terbitkan klaim baru.\n"
            "  _Contoh:_ `/newclaim Minecraft | budi_gamers | Email: mc@budi.com Pass: Secret123 | 882194`\n"
            "  _Contoh Auto PIN:_ `/newclaim Project Zomboid | alvin | STEAM-KEY-1234`\n"
            "• `/claims` — Tampilkan daftar token klaim aktif dan statusnya.\n"
            "• `/cekclaim <kode>` — Audit forensik IP & waktu saat pembeli membuka kredensial.\n\n"
            "📦 *3. Live Stock & Sentry:*\n"
            "• `/stock` — Audit real-time seluruh supplier di katalog aktif lengkap dengan URL produk asli.\n"
            "• `/g2g <link/offer_id>` — Cek offer tertentu (contoh: `/g2g G1703129821471UK`).\n\n"
            "🎨 *4. Pemasaran & Konten Produk:*\n"
            "• `/canvas <nama_game>` — Membuat gambar thumbnail 1080x1080.\n"
            "  _Contoh:_ `/canvas Project Zomboid`\n\n"
            "📋 *5. Pengiriman & Layanan Pembeli:*\n"
            "• `/format <game> | <buyer> | <key>` — Format chat pengiriman 3-langkah.\n\n"
            "🧮 *6. Finansial (The Quant) & Sourcing:*\n"
            "• `/quant <harga_jual> <cogs_usd>` — Hitung profit bersih setelah fee Shopee & QRIS.\n"
            "• `/eneba <game>` — Cek landed cost Eneba dalam Rupiah.\n"
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

    async def handle_shopee(self, chat_id: str, args_text: str) -> None:
        """Handler untuk command /shopee atau /listing: Buat Judul, Deskripsi & Render Cover Shopee."""
        if not args_text.strip():
            msg = (
                "ℹ️ *CARA PAKAI COMMAND SHOPEE LISTING:*\n"
                "Ketik `/shopee <nama_game> [| <harga_jual>]`\n\n"
                "Contoh:\n"
                "• `/shopee Minecraft: Java & Bedrock Edition`\n"
                "• `/shopee Project Zomboid | Rp 149.000`\n"
                "• `/shopee Terraria | 99000`\n\n"
                "💡 *Output Otomatis:*\n"
                "1. Judul SEO Shopee (Maksimal 120 Karakter)\n"
                "2. Deskripsi Lengkap Siap Copy-Paste (Spek, Fitur, Garansi 30 Hari, SOP Video Unboxing, FAQ)\n"
                "3. Gambar Cover Banner HD 1080x1080 Ter-Render & Terkirim Langsung!"
            )
            await self.send_message(chat_id, msg)
            return

        parts = [p.strip() for p in args_text.split("|")]
        game_title = parts[0]
        price_val = 199000
        price_str = "Rp 199.000"

        if len(parts) > 1:
            raw_p = parts[1].replace("Rp", "").replace(".", "").replace(",", "").strip()
            if raw_p.isdigit():
                price_val = int(raw_p)
                price_str = f"Rp {price_val:,}".replace(",", ".")
            else:
                price_str = parts[1]

        await self.send_message(chat_id, f"⚡ _Menyusun Judul SEO, Deskripsi Lengkap, dan Rendering Cover 1080x1080 untuk *{game_title}*..._")

        # 1. Judul SEO (Max 120 chars)
        clean_name = game_title.upper()
        seo_title = f"{clean_name} [PC / DIGITAL] ORIGINAL FULL ACCESS GARANSI RESMI + KARTU A6"
        if len(seo_title) > 120:
            seo_title = f"{clean_name} ORIGINAL FULL ACCESS GARANSI RESMI + KARTU A6"
        if len(seo_title) > 120:
            seo_title = seo_title[:117] + "..."

        # 2. Render Cover Banner 1080x1080
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

        caption_cover = (
            f"🖼️ *[REKOMENDASI COVER SHOPEE 1080x1080]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🎮 *Game:* `{game_title}`\n"
            f"📐 *Dimensi:* 1080x1080 px (1:1 Standar Utama Feed Shopee)\n"
            f"🏷️ *Badge Disertakan:* 100% Original, Garansi Resmi 30 Hari, Full Access, Instant Delivery\n"
            f"💡 _Unduh gambar ini dan pasang langsung sebagai Foto Utama produk di Shopee!_"
        )
        await self.send_photo(chat_id, img_bytes, caption=caption_cover)

        # 3. Judul SEO
        msg_title = (
            f"📌 *[JUDUL PRODUK SHOPEE — TINGGAL SALIN]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"`{seo_title}`\n\n"
            f"📏 *Panjang:* {len(seo_title)} / 120 Karakter (Optimal Algoritma Pencarian)"
        )
        await self.send_message(chat_id, msg_title)

        # 4. Deskripsi Lengkap Siap Salin
        clean_tags = "#JualGameOriginal #AksharaGaming #GamePC #GaransiResmi #ShopeeGamingID"
        desc_text = (
            f"🎮 AKSHARA GAMING CENTER — OFFICIAL DIGITAL LICENSE\n"
            f"⚡ PRODUK 100% ORIGINAL & LEGAL | PERMANENT OWNERSHIP\n"
            f"🛡️ FULL ACCESS | BISA GANTI SEMUA DATA | GARANSI RESMI\n\n"
            f"==================================================\n"
            f"🌟 DETAIL PRODUK:\n"
            f"• Game: {game_title}\n"
            f"• Platform: PC / Official Launcher\n"
            f"• Status: 100% Fresh & Original (Bukan Shared/Bajakan)\n"
            f"• Wilayah: GLOBAL (Bisa dimainkan di seluruh Indonesia tanpa VPN)\n"
            f"• Bahasa: Multi-language (Termasuk English)\n"
            f"==================================================\n\n"
            f"💎 KEUNGGULAN BELI DI AKSHARA GAMING:\n"
            f"✅ FULL ACCESS 100%: Pembeli bebas ganti Email, Password, & Pertanyaan Keamanan.\n"
            f"✅ ONLINE MULTIPLAYER RESMI: Bebas main online di seluruh server resmi.\n"
            f"✅ PERMANEN MILIK ANDA: Akun/Lisensi aktif selamanya, bukan sewa.\n"
            f"✅ PENGIRIMAN KILAT: Detail akun dikirim via chat segera setelah order terkonfirmasi.\n"
            f"✅ BONUS KARTU GARANSI FISIK: Dilengkapi Kartu Garansi Resmi A6 (Art Carton 260gsm) berpita hologram & QR Code serial terdaftar!\n\n"
            f"==================================================\n"
            f"🚀 3 LANGKAH MUDAH AKTIVASI:\n"
            f"1. Selesaikan pembayaran di Shopee dan cek chat Shopee Anda.\n"
            f"2. Tim Akshara akan mengirimkan data lisensi beserta panduan setup instan.\n"
            f"3. Login ke launcher resmi, ubah data sesuai keinginan, dan game siap dimainkan!\n\n"
            f"==================================================\n"
            f"⚠️ SYARAT & KETENTUAN KLAIM GARANSI (SOP ANTI-FRAUD):\n"
            f"1. Wajib membuat VIDEO UNBOXING amplop kartu garansi fisik tanpa jeda (no-cut & unedited) dari awal paket masih tersegel rapi.\n"
            f"2. Segera lakukan pengecekan dan pergantian data setelah detail diterima.\n"
            f"3. Garansi tidak berlaku jika akun terindikasi menggunakan cheat/third-party mod ilegal.\n"
            f"4. Tim Support Akshara siap membantu 24/7 jika ada kendala login awal.\n\n"
            f"==================================================\n"
            f"❓ PERTANYAAN UMUM (FAQ):\n"
            f"Q: Apakah produk selalu ready stok?\n"
            f"A: Selalu READY STOK kak! Sistem kami autonomous, silakan langsung di-checkout saja.\n\n"
            f"Q: Apakah butuh VPN untuk login atau main?\n"
            f"A: Sama sekali TIDAK. 100% region Global dan aman koneksi internet Indonesia.\n\n"
            f"Q: Apakah dikirim paket fisik ke alamat rumah?\n"
            f"A: Ya kak, amplop resmi berisi Kartu Garansi Akshara A6 dikirim via kurir Shopee agar order Anda resmi dan aman regulasi.\n\n"
            f"Terima kasih telah berbelanja di Akshara Gaming Center!\n"
            f"Happy Gaming! 🎮🔥\n\n"
            f"{clean_tags}"
        )

        msg_desc = (
            f"📝 *[DESKRIPSI LENGKAP SHOPEE — SIAP SALIN]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"```text\n{desc_text}\n```\n"
            f"💡 _Sentuh/tekan blok teks di atas untuk menyalin langsung ke Seller Centre Shopee!_"
        )

        markup = {
            "inline_keyboard": [
                [
                    {"text": "📦 Cek Stok Live", "callback_data": "btn_stock"},
                    {"text": "⚡ Radar Eneba", "callback_data": "btn_eneba"}
                ],
                [
                    {"text": "📋 Format Pesanan", "callback_data": "btn_format_help"},
                    {"text": "🧮 Hitung Quant", "callback_data": "btn_quant_help"}
                ]
            ]
        }
        await self.send_message(chat_id, msg_desc, reply_markup=markup)

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
            cogs_input = float(parts[1].replace("$", "").replace(".", "").replace(",", "."))
        except ValueError:
            await self.send_message(chat_id, "❌ Format angka tidak valid. Contoh: `/quant 219000 135000` atau `/quant 219000 8.20`")
            return

        usd_rate = 16350.0
        # Jika input di atas 1000 berarti sudah Rupiah, jika di bawah berarti USD
        if cogs_input > 1000:
            cogs_raw_idr = cogs_input
        else:
            cogs_raw_idr = cogs_input * usd_rate

        qris_fee_idr = math.ceil(cogs_raw_idr * 0.007)
        cogs_net_idr = cogs_raw_idr + qris_fee_idr

        shopee_admin_fee = math.ceil(selling_price * 0.08)
        shopee_service_fee = 1000.0
        packaging_cost = 2000.0

        total_costs = cogs_net_idr + shopee_admin_fee + shopee_service_fee + packaging_cost
        net_profit = selling_price - total_costs
        net_margin = (net_profit / selling_price) * 100.0 if selling_price > 0 else 0

        # BEP
        fixed_costs = cogs_net_idr + shopee_service_fee + packaging_cost
        bep = math.ceil(fixed_costs / 0.92)

        health_emoji = "🟢 SEHAT" if net_margin >= 20 else ("🟡 TIPIS" if net_margin >= 10 else "🔴 RISIKO RUGI")

        res_msg = (
            f"🧮 *[HASIL SIMULASI PROFIT — THE QUANT]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💰 *Harga Jual Shopee:* Rp {selling_price:,.0f}\n"
            f"💵 *Modal Sourcing:* Rp {cogs_raw_idr:,.0f}\n"
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
                    f"• Modal Checkout Riil: *Rp {item['price_idr']:,}*\n"
                    f"• Rekomendasi Shopee: *Rp {item['recommended_shopee_idr']:,}*\n"
                    f"• Potensi Margin: *+{item['net_margin_pct']}%* (+Rp {item['net_profit_idr']:,})\n"
                    f"• Risiko: 🛡️ *{item['hackback_risk']}*\n"
                    f"• Link: {item['url']}\n"
                )
            lines.append("━━━━━━━━━━━━━━━━━━━━━━")
            lines.append("💡 _Pricelist terkalibrasi kurs Rupiah + fee checkout Eneba 10% + QRIS 0.7%._")
            await self.send_message(chat_id, "\n".join(lines))
        else:
            calc = calculate_custom_eneba(price_usd=15.0)
            msg = (
                f"🔍 Tidak ada game dengan nama *'{q}'* pada 18 katalog utama Eneba.\n\n"
                f"💡 *Kalkulator Formula Sourcing Eneba:* Jika Anda menemukan CDKey di Eneba seharga misal Rp 245.000, maka landed cost adalah:\n"
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
            price_usd = float(res.get("price_usd", 0.0) or 0.0)
            price_idr = int(math.ceil(price_usd * 16350 / 100) * 100) if price_usd > 0 else 0
            price_str = f"Rp {price_idr:,}" if price_idr > 0 else "N/A"

            offer_url = f"https://www.g2g.com/offer/{res['offer_id']}"
            msg = (
                f"🎮 *[HASIL INSPEKSI OFFER G2G SLS]*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"📦 *Offer ID:* `{res['offer_id']}`\n"
                f"🏷️ *Judul:* {res.get('title') or '-'}\n"
                f"👤 *Seller:* `{res.get('seller_name')}` ({online_str})\n"
                f"⭐ *Rating:* {res.get('satisfaction_rate', 0)*100:.1f}%\n"
                f"📊 *Status:* {status_str}\n"
                f"📦 *Stok Faktual:* *{res.get('available_qty', 0):,} UNIT*\n"
                f"💵 *Harga Modal Kulakan:* *{price_str}*\n"
                f"🔗 *URL Produk Faktual:* {offer_url}\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"⚡ _Data langsung ditarik detik ini dari sls.g2g.com (dalam Rupiah)._"
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
            f"• Ketik `/newclaim` untuk terbitkan lisensi + Passcode PIN\n"
            f"• Ketik `/claims` untuk daftar klaim aktif\n"
            f"• Ketik `/stock` untuk audit live stok\n"
            f"• Ketik `/canvas <game>` untuk buat banner Shopee\n"
            f"• Ketik `/format <game> | <buyer> | <key>` untuk proses pesanan"
        )
        await self.send_message(chat_id, msg)

    async def handle_new_claim(self, chat_id: str, args_text: str) -> None:
        """Handler untuk membuat kredensial baru dengan Wizard Interaktif atau 1-Shot."""
        text = args_text.strip()
        if not text:
            # MEMULAI WIZARD INTERAKTIF STEP-BY-STEP!
            self.sessions[chat_id] = {"step": "AWAIT_GAME", "data": {}}
            games_markup = {
                "inline_keyboard": [
                    [
                        {"text": "⛏️ Minecraft", "callback_data": "wizard_game_Minecraft: Java & Bedrock Edition"},
                        {"text": "🧟 Project Zomboid", "callback_data": "wizard_game_Project Zomboid"}
                    ],
                    [
                        {"text": "🚗 Grand Theft Auto V", "callback_data": "wizard_game_Grand Theft Auto V: Premium Edition"},
                        {"text": "⚽ EA SPORTS FC 24", "callback_data": "wizard_game_EA SPORTS FC 24"}
                    ],
                    [
                        {"text": "🧱 Terraria", "callback_data": "wizard_game_Terraria"},
                        {"text": "🔨 Rust", "callback_data": "wizard_game_Rust"}
                    ],
                    [
                        {"text": "❌ Batal", "callback_data": "wizard_cancel"}
                    ]
                ]
            }
            guide = (
                "🔑 *[WIZARD KLAIM INTERAKTIF — LANGKAH 1/3]*\n"
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                "Mari terbitkan token klaim dan PIN unik secara interaktif tanpa repot tanda `|`!\n\n"
                "🎮 *Langkah 1: Tentukan Judul Game*\n"
                "• Klik salah satu game populer di bawah, ATAU\n"
                "• Ketik langsung judul game yang dipesan ke chat ini:\n\n"
                "🔒 _PIN Passcode otomatis dijamin 100% UNIK (Anti-Tabrakan)._"
            )
            await self.send_message(chat_id, guide, reply_markup=games_markup)
            return

        # Cek jika pengguna mengetik format 1-shot (misal dipisah pipe atau multi-line)
        parts = [p.strip() for p in text.split("|")]
        if len(parts) < 3:
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            if len(lines) >= 3:
                parts = lines

        if len(parts) < 3:
            # Pengguna mengetik nama game saja (misal: /newclaim Wukong)
            # Masukkan ke wizard langkah 2 (minta nama pembeli)
            self.sessions[chat_id] = {"step": "AWAIT_BUYER", "data": {"game": text}}
            cancel_markup = {"inline_keyboard": [[{"text": "❌ Batal", "callback_data": "wizard_cancel"}]]}
            await self.send_message(
                chat_id,
                f"👤 *[WIZARD KLAIM INTERAKTIF — LANGKAH 2/3]*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🎮 *Game:* `{text}`\n\n"
                f"Silakan ketik *Username Pembeli Shopee*:\n"
                f"_(Contoh: `budi_santoso` atau `alvin_gamers`)_",
                reply_markup=cancel_markup
            )
            return

        game = parts[0]
        buyer = parts[1]
        credential = parts[2]
        custom_pin = parts[3] if len(parts) > 3 and parts[3].strip() else None
        await self.finalize_new_claim(chat_id, game, buyer, credential, custom_pin)

    async def handle_wizard_input(self, chat_id: str, text: str, session: Dict[str, Any]) -> None:
        """Menangani pesan teks masuk selama sesi wizard interaktif aktif."""
        step = session.get("step")
        cancel_markup = {"inline_keyboard": [[{"text": "❌ Batal", "callback_data": "wizard_cancel"}]]}

        if step == "AWAIT_GAME":
            session["data"]["game"] = text.strip()
            session["step"] = "AWAIT_BUYER"
            await self.send_message(
                chat_id,
                f"👤 *[WIZARD KLAIM INTERAKTIF — LANGKAH 2/3]*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🎮 *Game Dipilih:* `{session['data']['game']}`\n\n"
                f"Silakan ketik *Username Pembeli Shopee*:\n"
                f"_(Contoh: `budi_santoso` atau `alvin_gamers`)_",
                reply_markup=cancel_markup
            )

        elif step == "AWAIT_BUYER":
            session["data"]["buyer"] = text.strip()
            session["step"] = "AWAIT_CREDENTIALS"
            await self.send_message(
                chat_id,
                f"🔐 *[WIZARD KLAIM INTERAKTIF — LANGKAH 3/3]*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🎮 *Game:* `{session['data']['game']}`\n"
                f"👤 *Pembeli:* `{session['data']['buyer']}`\n\n"
                f"Silakan *paste* akun login atau digital key dari supplier:\n"
                f"_(Bisa Email & Password, atau CDKey. Format bebas!)_",
                reply_markup=cancel_markup
            )

        elif step == "AWAIT_CREDENTIALS":
            session["data"]["credential"] = text.strip()
            game = session["data"]["game"]
            buyer = session["data"]["buyer"]
            credential = session["data"]["credential"]

            # Bersihkan session
            if chat_id in self.sessions:
                del self.sessions[chat_id]

            await self.finalize_new_claim(chat_id, game, buyer, credential)

    async def finalize_new_claim(
        self,
        chat_id: str,
        game: str,
        buyer: str,
        credential: str,
        custom_passcode: Optional[str] = None
    ) -> None:
        """Membuat token klaim, menghasilkan passcode unik anti-tabrakan, dan mengirimkan format Shopee."""
        claims = load_claimed_credentials()

        # Otomatiskan passcode PIN unik (Anti-Tabrakan)
        if custom_passcode and custom_passcode.strip():
            passcode = custom_passcode.strip()
        else:
            passcode = generate_unique_passcode(claims)

        claim_code = generate_unique_claim_code(claims, game)
        order_id = f"SHP-{datetime.datetime.now().strftime('%y%m%d')}{random.randint(1000, 9999)}"
        warranty_days = 30
        warranty_code = f"AKSHARA-{datetime.datetime.now().strftime('%y%m%d')}-{random.randint(1000, 9999)}"
        platform = "PC / Steam Key" if "key" in credential.lower() else "PC / Microsoft Account"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        new_claim = {
            "claim_code": claim_code,
            "passcode": passcode,
            "order_id": order_id,
            "buyer_username": buyer,
            "product_title": game,
            "platform": platform,
            "credential_data": credential,
            "warranty_days": warranty_days,
            "warranty_code": warranty_code,
            "status": "UNCLAIMED",
            "created_at": now_iso,
            "revealed_at": None,
            "revealed_ip": None,
            "revealed_user_agent": None,
            "reveal_count": 0,
            "reveal_history": []
        }

        claims.insert(0, new_claim)
        save_claimed_credentials_all(claims)

        claim_url = f"https://claimakshara.vercel.app/claim/{claim_code}"

        shopee_text = (
            f"🎮 [AKSHARA GAMING CENTER — PENGIRIMAN LISENSI RESMI]\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Halo kak {buyer}, pesanan game {game} kakak sudah siap!\n\n"
            f"🔑 KODE KLAIM: {claim_code}\n"
            f"🔒 PASSCODE PIN RAHASIA: {passcode}\n"
            f"🔗 LINK BUKA KREDENSIAL: {claim_url}\n\n"
            f"⚠️ PENTING: Sebelum membuka link & memasukkan passcode PIN, siapkan rekaman video unboxing tanpa jeda (no-cut) untuk mengaktifkan garansi resmi toko selama {warranty_days} hari. Sistem mencatat waktu dan IP saat kredensial dibuka.\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Terima kasih dan selamat bermain! 🚀"
        )

        resp_msg = (
            f"🎉 *[TOKEN KLAIM SUKSES DITERBITKAN]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🎮 *Game:* `{game}`\n"
            f"👤 *Pembeli:* `{buyer}`\n"
            f"🔑 *Kode Klaim:* `{claim_code}`\n"
            f"🔒 *Passcode PIN Unik:* `{passcode}` _(Auto Unik & Anti-Tabrakan)_\n"
            f"📦 *No. Pesanan:* `{order_id}`\n"
            f"🛡️ *Garansi:* {warranty_days} Hari (`{warranty_code}`)\n"
            f"🌐 *Sinkronisasi:* 2-Way Live Vault\n\n"
            f"📋 *[TINGGAL COPY-PASTE KE CHAT SHOPEE]:*\n"
            f"```\n{shopee_text}\n```"
        )

        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "🔍 Cek Status Klaim Ini", "callback_data": f"check_claim_{claim_code}"},
                    {"text": "📋 Daftar Semua Klaim", "callback_data": "btn_claims_list"}
                ],
                [
                    {"text": "➕ Buat Klaim Baru Lagi", "callback_data": "btn_new_claim_help"}
                ]
            ]
        }
        await self.send_message(chat_id, resp_msg, reply_markup=reply_markup)

    async def handle_list_claims(self, chat_id: str) -> None:
        """Handler untuk melihat daftar token kredensial."""
        claims = load_claimed_credentials()
        if not claims:
            await self.send_message(chat_id, "ℹ️ Belum ada token klaim terdaftar di brankas.")
            return

        lines = [
            "🔐 *[DAFTAR TOKEN KLAIM TERBARU — AKSHARA VAULT]*",
            "━━━━━━━━━━━━━━━━━━━━━━"
        ]

        for c in claims[:6]:
            status_emoji = "🟢" if c.get("status") != "REVEALED" else "🔓"
            status_text = "BELUM DIBUKA" if c.get("status") != "REVEALED" else f"DIBUKA ({c.get('reveal_count', 1)}x)"
            pin = c.get("passcode", "-")
            ip_info = f" • IP: `{c.get('revealed_ip')}`" if c.get("revealed_ip") else ""

            lines.append(
                f"{status_emoji} *{c.get('product_title')}*\n"
                f"   • Pembeli: `{c.get('buyer_username')}`\n"
                f"   • Kode: `{c.get('claim_code')}` | PIN: `{pin}`\n"
                f"   • Status: *{status_text}*{ip_info}"
            )

        lines.append("━━━━━━━━━━━━━━━━━━━━━━")
        lines.append("💡 _Ketik `/cekclaim <kode>` untuk audit detail IP & waktu akses._")
        await self.send_message(chat_id, "\n".join(lines))

    async def handle_check_claim(self, chat_id: str, code_query: str) -> None:
        """Handler untuk memeriksa audit forensik suatu kode klaim."""
        q = code_query.strip().upper()
        if not q:
            await self.send_message(chat_id, "ℹ️ Ketik `/cekclaim <kode_klaim>`\nContoh: `/cekclaim AKSH-9921-MC`")
            return

        claims = load_claimed_credentials()
        found = next((c for c in claims if c.get("claim_code", "").upper() == q), None)

        if not found:
            await self.send_message(chat_id, f"❌ Kode klaim `{q}` tidak ditemukan di brankas.")
            return

        is_rev = found.get("status") == "REVEALED"
        status_badge = "🔓 SUDAH DIBUKA (TERCATAT IP)" if is_rev else "🟢 BELUM DIBUKA (MASIH AMAN)"

        rev_time = "-"
        if found.get("revealed_at"):
            try:
                dt = datetime.datetime.fromisoformat(found["revealed_at"].replace("Z", "+00:00"))
                rev_time = (dt + datetime.timedelta(hours=7)).strftime("%d/%m/%Y %H:%M:%S WIB")
            except Exception:
                rev_time = found["revealed_at"]

        detail = (
            f"🛡️ *[AUDIT FORENSIK TOKEN — {found.get('claim_code')}]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🎮 *Game:* {found.get('product_title')}\n"
            f"👤 *Pembeli:* `{found.get('buyer_username')}`\n"
            f"📦 *No. Pesanan:* `{found.get('order_id')}`\n"
            f"🔒 *Passcode PIN:* `{found.get('passcode')}`\n"
            f"📊 *Status:* *{status_badge}*\n\n"
            f"📍 *DATA FORENSIK DIGITAL:*\n"
            f"• *Akses Pertama:* {rev_time}\n"
            f"• *Alamat IP:* `{found.get('revealed_ip') or '-'}`\n"
            f"• *Frekuensi Akses:* {found.get('reveal_count', 0)} kali\n"
            f"• *Perangkat:* `{str(found.get('revealed_user_agent', '-'))[:70]}`\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔑 *Kredensial Tersimpan:*\n"
            f"```\n{found.get('credential_data', '-')}\n```"
        )
        await self.send_message(chat_id, detail)

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
        elif data == "btn_new_claim_help":
            await self.handle_new_claim(chat_id, "")
        elif data.startswith("wizard_game_"):
            chosen_game = data.replace("wizard_game_", "")
            self.sessions[chat_id] = {
                "step": "AWAIT_BUYER",
                "data": {"game": chosen_game}
            }
            cancel_markup = {"inline_keyboard": [[{"text": "❌ Batal", "callback_data": "wizard_cancel"}]]}
            await self.send_message(
                chat_id,
                f"👤 *[WIZARD KLAIM INTERAKTIF — LANGKAH 2/3]*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🎮 *Game Dipilih:* `{chosen_game}`\n\n"
                f"Silakan ketik *Username Pembeli Shopee*:\n"
                f"_(Contoh: `budi_santoso` atau `alvin_gamers`)_",
                reply_markup=cancel_markup
            )
        elif data == "wizard_cancel":
            if chat_id in self.sessions:
                del self.sessions[chat_id]
            await self.send_message(chat_id, "❌ Wizard pembuatan klaim dibatalkan.")
        elif data == "btn_claims_list":
            await self.handle_list_claims(chat_id)
        elif data.startswith("check_claim_"):
            code = data.replace("check_claim_", "")
            await self.handle_check_claim(chat_id, code)
        elif data == "btn_shopee_help":
            await self.handle_shopee(chat_id, "")
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

        # 1. Cek pembatalan wizard
        if cmd in ("/batal", "/cancel"):
            if chat_id in self.sessions:
                del self.sessions[chat_id]
                await self.send_message(chat_id, "❌ Wizard pembuatan klaim telah dibatalkan.")
            else:
                await self.send_message(chat_id, "ℹ️ Tidak ada proses pembuatan klaim yang sedang berjalan.")
            return

        # 2. Cek apakah chat sedang dalam sesi interaktif Wizard
        if not text.startswith("/"):
            session = self.sessions.get(chat_id)
            if session:
                await self.handle_wizard_input(chat_id, text, session)
                return

        # Jika ada command slash baru saat session aktif, bersihkan session lama
        self.sessions.pop(chat_id, None)

        # Handle Commands
        if cmd in ("/start", "/menu"):
            await self.handle_start(chat_id)
        elif cmd in ("/help", "/panduan"):
            await self.handle_help(chat_id)
        elif cmd in ("/newclaim", "/buatklaim", "/tambahklaim", "/klaimbaru"):
            await self.handle_new_claim(chat_id, args_text)
        elif cmd in ("/claims", "/listklaim", "/daftarklaim", "/semuaklaim"):
            await self.handle_list_claims(chat_id)
        elif cmd in ("/cekclaim", "/cektoken", "/auditclaim"):
            await self.handle_check_claim(chat_id, args_text)
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
        elif cmd in ("/shopee", "/listing", "/deskripsi", "/cover"):
            await self.handle_shopee(chat_id, args_text)
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
