"""
Akshara Gaming Center - Market Sentry & Real-Time Stock/Price Auditor
Monitors G2G SLS API & Eneba catalog, detecting inventory shortages and price volatility.
"""

import os
import json
import asyncio
import re
import math
from typing import Dict, Any, List, Optional, Tuple
import httpx

SLS_API_BASE = "https://sls.g2g.com/offer"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.g2g.com/",
    "Origin": "https://www.g2g.com",
}

KNOWN_DEAD_OFFERS = {
    "G1737050259610GZ": "https://www.g2g.com/offer/G1703314890265KW",
    "G1763801186859QT": "https://www.g2g.com/offer/G1703480907757CA",
}

GAME_CATEGORIES = {
    "minecraft": "https://www.g2g.com/categories/minecraft-account",
    "terraria": "https://www.g2g.com/categories/terraria-account",
    "wukong": "https://www.g2g.com/categories/black-myth-wukong-accounts",
    "gta": "https://www.g2g.com/categories/steam-global-account",
    "tf2": "https://www.g2g.com/categories/tf2-item",
    "fc 25": "https://www.g2g.com/categories/fc-25-accounts",
    "fc25": "https://www.g2g.com/categories/fc-25-accounts",
    "zomboid": "https://www.g2g.com/categories/project-zomboid-accounts",
    "stardew": "https://www.g2g.com/categories/stardew-valley-account",
    "dont starve": "https://www.g2g.com/categories/don-t-starve-together-accounts",
    "lethal company": "https://www.g2g.com/categories/lethal-company-accounts",
    "phasmophobia": "https://www.g2g.com/categories/phasmophobia-account",
    "hollow knight": "https://www.g2g.com/categories/hollow-knight-accounts",
    "garrys mod": "https://www.g2g.com/categories/garry-s-mod-account",
    "elden ring": "https://www.g2g.com/categories/elden-ring-account",
    "palworld": "https://www.g2g.com/categories/palworld-accounts",
    "rust": "https://www.g2g.com/categories/rust-accounts-buy",
    "left 4 dead": "https://www.g2g.com/categories/left-4-dead-2-account",
    "among us": "https://www.g2g.com/categories/among-us-account",
    "witcher": "https://www.g2g.com/categories/witcher-iii-wild-hunt-account",
    "ready or not": "https://www.g2g.com/categories/ready-or-not-account",
    "sons of the forest": "https://www.g2g.com/categories/sons-of-the-forest-accounts",
    "helldivers": "https://www.g2g.com/categories/helldivers-2-accounts",
    "forza": "https://www.g2g.com/categories/forza-horizon-5-account",
}

def resolve_g2g_product_url(oid: str, game_title: str = "", is_live: bool = True, seller_name: str = "") -> str:
    import urllib.parse
    
    lower = game_title.lower() if game_title else ""
    if "eneba" in lower or (oid and "eneba" in oid.lower()) or (seller_name and "eneba" in seller_name.lower()):
        clean = game_title.replace(":", " ").replace("&", " ").replace("-", " ").strip()
        return f"https://www.eneba.com/store/all?text={urllib.parse.quote_plus(clean)}"

    clean_seller = seller_name.strip() if seller_name and "default" not in seller_name.lower() else ""

    # Jika produk terdeteksi sudah tidak live/sold out, jangan berikan link offer (akan 404/dead page).
    # Berikan link ke kategori search seller yang 100% aktif.
    if not is_live:
        for k, v in GAME_CATEGORIES.items():
            if k in lower:
                if clean_seller:
                    return f"{v}?q={urllib.parse.quote_plus(clean_seller)}"
                return v
        if game_title and len(game_title.strip()) > 1:
            clean = game_title.replace(":", " ").replace("&", " ").replace("-", " ").strip()
            query_str = f"{clean} {clean_seller}".strip() if clean_seller else clean
            return f"https://www.g2g.com/search?q={urllib.parse.quote_plus(query_str)}"
        return "https://www.g2g.com/categories/steam-global-account"

    if oid in KNOWN_DEAD_OFFERS:
        return KNOWN_DEAD_OFFERS[oid]
    if oid and oid.startswith("G"):
        return f"https://www.g2g.com/offer/{oid}"

    for k, v in GAME_CATEGORIES.items():
        if k in lower:
            if clean_seller:
                return f"{v}?q={urllib.parse.quote_plus(clean_seller)}"
            return v

    if game_title and len(game_title.strip()) > 1:
        clean = game_title.replace(":", " ").replace("&", " ").replace("-", " ").strip()
        query_str = f"{clean} {clean_seller}".strip() if clean_seller else clean
        return f"https://www.g2g.com/search?q={urllib.parse.quote_plus(query_str)}"

    return "https://www.g2g.com/categories/steam-global-account"


def find_catalog_path() -> Optional[str]:
    """Mencari lokasi active_catalog.json di root atau web/data."""
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "data", "active_catalog.json"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", "active_catalog.json"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "active_catalog.json"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def extract_offer_id(url_or_id: Optional[str]) -> Optional[str]:
    """Mengekstrak G2G Offer ID (misal G1703129821471UK) dari teks atau URL."""
    if not url_or_id:
        return None
    val = url_or_id.strip()
    if re.match(r"^G\d+[A-Z0-9]+$", val, re.IGNORECASE):
        return val.upper()
    m = re.search(r"offer/(G\d+[A-Za-z0-9]+)", val, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    return None


async def fetch_g2g_offer_live(client: httpx.AsyncClient, offer_id: str) -> Dict[str, Any]:
    """Mengambil payload offer faktual langsung dari endpoint G2G SLS."""
    url = f"{SLS_API_BASE}/{offer_id}"
    try:
        res = await client.get(url, headers=HEADERS, timeout=8.0)
        if res.status_code == 200:
            data = res.json()
            payload = data.get("payload", {})
            return {
                "ok": True,
                "offer_id": offer_id,
                "seller_name": payload.get("username", "Unknown"),
                "status": payload.get("status", "unknown"),
                "is_sold_out": bool(payload.get("is_sold_out")),
                "available_qty": int(payload.get("available_qty", 0)),
                "price_usd": float(payload.get("unit_price_in_usd", 0.0) or 0.0),
                "is_online": bool(payload.get("is_online")),
                "satisfaction_rate": float(payload.get("satisfaction_rate", 0.0) or 0.0),
                "title": payload.get("title", ""),
            }
        else:
            return {
                "ok": False,
                "offer_id": offer_id,
                "status": f"HTTP {res.status_code}",
                "available_qty": 0,
                "price_usd": 0.0,
                "is_online": False,
                "error": f"HTTP {res.status_code}",
            }
    except Exception as e:
        return {
            "ok": False,
            "offer_id": offer_id,
            "status": "error",
            "available_qty": 0,
            "price_usd": 0.0,
            "is_online": False,
            "error": str(e),
        }


async def send_telegram_alert(text: str):
    """Mengirim alert darurat ke Telegram Senna."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
    if not bot_token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, json=payload)
    except Exception:
        pass


async def audit_all_catalog_sellers() -> List[Dict[str, Any]]:
    """
    Melakukan audit langsung ke SLS API untuk seluruh seller pada active_catalog.json.
    Mengembalikan daftar status stok riil, online/offline, dan skor kesehatan,
    serta melakukan Price Spike Detection & Auto-Failover secara otonom.
    """
    cat_path = find_catalog_path()
    if not cat_path or not os.path.exists(cat_path):
        return []

    with open(cat_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    # Kumpulkan seluruh offer_id unik beserta metadata margin & game
    audit_tasks = []
    limits = asyncio.Semaphore(4)

    async with httpx.AsyncClient(timeout=10.0) as client:
        for game in catalog:
            game_id = game.get("id", "")
            game_title = game.get("title", "Unknown Game")
            shopee_price = game.get("selling_price_shopee_idr", 100000)
            selected_seller_id = game.get("selected_seller_id", "")

            for s in game.get("sellers", []):
                raw_id = s.get("offer_id") or extract_offer_id(s.get("profile_url"))
                if raw_id:
                    offer_id = extract_offer_id(raw_id)
                    if offer_id:
                        seller_id = s.get("seller_id", "")
                        seller_name = s.get("seller_name", "Seller")
                        recorded_price = s.get("price_g2g_idr", 0)
                        is_selected = (seller_id == selected_seller_id)

                        async def bounded_fetch(
                            oid=offer_id,
                            gid=game_id,
                            gtitle=game_title,
                            sid=seller_id,
                            sname=seller_name,
                            rec_price=recorded_price,
                            sel_shopee=shopee_price,
                            selected=is_selected
                        ):
                            async with limits:
                                res = await fetch_g2g_offer_live(client, oid)
                                res["game_id"] = gid
                                res["game_title"] = gtitle
                                res["seller_id"] = sid
                                res["recorded_seller_name"] = sname
                                res["recorded_price_idr"] = rec_price
                                res["is_selected"] = selected
                                res["selling_price_shopee_idr"] = sel_shopee

                                # Evaluasi kesehatan stok
                                qty = res.get("available_qty", 0)
                                if res.get("is_sold_out") or qty == 0 or res.get("status") != "live":
                                    res["health"] = "CRITICAL"
                                elif qty <= 4:
                                    res["health"] = "WARNING"
                                else:
                                    res["health"] = "SAFE"

                                # Price Spike Guard calculations
                                usd = res.get("price_usd", 0.0)
                                live_price_idr = int(math.ceil(usd * 16350 / 100) * 100) if usd > 0 else rec_price
                                live_cogs_net = int(round(live_price_idr * 1.007))
                                shopee_fee = int(round(sel_shopee * 0.08)) + 1000
                                live_net_profit = sel_shopee - live_cogs_net - shopee_fee
                                live_margin_pct = (live_net_profit / sel_shopee * 100.0) if sel_shopee > 0 else 0.0

                                price_alert = "NORMAL"
                                is_price_spike = (live_margin_pct < 12.0) or (rec_price > 0 and live_price_idr > rec_price * 1.15)
                                if is_price_spike and usd > 0:
                                    price_alert = "MARGIN_DANGER"

                                res["live_price_idr"] = live_price_idr
                                res["live_margin_pct"] = live_margin_pct
                                res["price_alert"] = price_alert
                                return res

                        audit_tasks.append(bounded_fetch())

        results = await asyncio.gather(*audit_tasks, return_exceptions=True)

    cleaned_results = []
    for r in results:
        if isinstance(r, dict):
            cleaned_results.append(r)

    # Otonom: Deteksi Price Spike pada Selected Seller & Eksekusi Auto-Failover
    catalog_modified = False
    for r in cleaned_results:
        if r.get("is_selected") and r.get("price_alert") == "MARGIN_DANGER":
            target_game = None
            for game in catalog:
                if game.get("id") == r.get("game_id") or game.get("title") == r.get("game_title"):
                    target_game = game
                    break

            if target_game and isinstance(target_game.get("sellers"), list):
                # Cari seller cadangan di game yang sama dengan stock > 5 dan margin >= 15.0%
                backup_seller = None
                for bs in target_game.get("sellers", []):
                    if bs.get("seller_id") == r.get("seller_id"):
                        continue
                    b_stock = bs.get("stock", 0)
                    b_margin = bs.get("net_margin_pct", 0)
                    b_status = bs.get("live_status", "live")
                    if b_stock > 5 and b_margin >= 15.0 and b_status not in ("dead", "out_of_stock"):
                        backup_seller = bs
                        break

                if backup_seller:
                    target_game["selected_seller_id"] = backup_seller.get("seller_id")
                    catalog_modified = True
                    failover_msg = (
                        f"🚨 *[AUTO-FAILOVER: LONJAKAN HARGA SUPPLIER]*\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"🎮 *Game:* `{target_game.get('title')}`\n"
                        f"⚠️ *Lonjakan Terdeteksi:* Supplier utama (`{r.get('recorded_seller_name')}`) melonjak harganya!\n"
                        f"• Modal Baru: *Rp {r.get('live_price_idr', 0):,}* (Sebelumnya: Rp {r.get('recorded_price_idr', 0):,})\n"
                        f"• Proyeksi Margin: *{r.get('live_margin_pct', 0.0):.1f}%* (Batas Bahaya: < 12.0%)\n\n"
                        f"🛡️ *Tindakan Otonom:* Otomatis dialihkan ke Supplier Cadangan Sehat:\n"
                        f"• Supplier Baru: *{backup_seller.get('seller_name')}*\n"
                        f"• Margin Supplier Baru: *{backup_seller.get('net_margin_pct', 0):.1f}%* | Stok: *{backup_seller.get('stock', 0)} Unit*\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"⚡ _Katalog Shopee & Web Store telah diperbarui otonom tanpa jeda penjualan._"
                    )
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            loop.create_task(send_telegram_alert(failover_msg))
                    except Exception:
                        pass

    if catalog_modified:
        # Simpan pembaruan ke seluruh kandidat active_catalog.json
        candidate_paths = [
            cat_path,
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "data", "active_catalog.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", "active_catalog.json"),
        ]
        for cp in candidate_paths:
            try:
                os.makedirs(os.path.dirname(cp), exist_ok=True)
                with open(cp, "w", encoding="utf-8") as fw:
                    json.dump(catalog, fw, indent=2)
            except Exception:
                pass

    return cleaned_results


def build_stock_summary_report(audit_results: List[Dict[str, Any]]) -> str:
    """Format laporan ringkasan stok untuk command /stock."""
    if not audit_results:
        return "⚠️ *Katalog kosong atau file active_catalog.json tidak ditemukan.*"

    safe_count = sum(1 for r in audit_results if r.get("health") == "SAFE")
    warning_count = sum(1 for r in audit_results if r.get("health") == "WARNING")
    critical_count = sum(1 for r in audit_results if r.get("health") == "CRITICAL")

    lines = [
        "📦 *[LAPORAN LIVE STOK G2G SLS — AKSHARA]*",
        f"📊 *Total Seller:* {len(audit_results)} | 🟢 Aman: {safe_count} | 🟡 Waspada: {warning_count} | 🔴 Kritis: {critical_count}",
        "━━━━━━━━━━━━━━━━━━━━━━"
    ]

    for r in audit_results:
        health = r.get("health", "SAFE")
        emoji = "🟢" if health == "SAFE" else ("🟡" if health == "WARNING" else "🔴")
        online_badge = "🟢 On" if r.get("is_online") else "⚪ Off"
        game = r.get("game_title", "")
        seller = r.get("seller_name") or r.get("recorded_seller_name", "Seller")
        qty = r.get("available_qty", 0)
        usd = r.get("price_usd", 0.0)
        price_idr = int(math.ceil(usd * 16350 / 100) * 100) if usd > 0 else 0
        price_str = f"Rp {price_idr:,}" if price_idr > 0 else "-"
        oid = r.get("offer_id", "")
        is_live = health != "CRITICAL"

        product_url = resolve_g2g_product_url(oid, game, is_live=is_live)
        lines.append(
            f"{emoji} *{game}*\n"
            f"   • Seller: `{seller}` ({online_badge})\n"
            f"   • Stok Faktual: *{qty:,} Unit* | Modal: *{price_str}*\n"
            f"   • 🔗 URL Produk: {product_url}"
        )

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("⚡ _Data 100% real-time langsung dari server G2G SLS API._")
    return "\n".join(lines)


def get_critical_stock_alerts(audit_results: List[Dict[str, Any]]) -> List[str]:
    """Mendeteksi apakah ada seller yang masuk zona merah (0) atau kuning (<=4)."""
    alerts = []
    for r in audit_results:
        health = r.get("health")
        if health in ("CRITICAL", "WARNING"):
            qty = r.get("available_qty", 0)
            game = r.get("game_title", "Unknown")
            seller = r.get("seller_name") or r.get("recorded_seller_name", "Seller")
            oid = r.get("offer_id", "")
            url = resolve_g2g_product_url(oid, game, is_live=(health != "CRITICAL"))
            category_url = resolve_g2g_product_url("", game, is_live=False)
            
            if health == "CRITICAL":
                alerts.append(
                    f"🚨 *[PERINGATAN STOK HABIS / SOLD OUT]*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🎮 *Game:* `{game}`\n"
                    f"👤 *Seller:* `{seller}` (`{oid}`)\n"
                    f"🔴 *Sisa Stok:* *0 UNIT (KOSONG)*\n"
                    f"🔗 *Cek Listing:* {url}\n"
                    f"🌐 *Etalase Alternatif:* {category_url}\n"
                    f"⚠️ *TINDAKAN DIPERLUKAN:* Segera non-aktifkan listing di Shopee atau beralih ke seller cadangan!"
                )
            elif health == "WARNING":
                alerts.append(
                    f"🟡 *[PERINGATAN STOK MENIPIS]*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🎮 *Game:* `{game}`\n"
                    f"👤 *Seller:* `{seller}` (`{oid}`)\n"
                    f"⚠️ *Sisa Stok:* *HANYA {qty} UNIT TERSISA!*\n"
                    f"🔗 *Cek Live Offer:* {url}\n"
                    f"💡 *Saran:* Pantau pesanan masuk atau persiapkan supplier alternatif."
                )
    return alerts
