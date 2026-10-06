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


async def audit_all_catalog_sellers() -> List[Dict[str, Any]]:
    """
    Melakukan audit langsung ke SLS API untuk seluruh seller pada active_catalog.json.
    Mengembalikan daftar status stok riil, online/offline, dan skor kesehatan.
    """
    cat_path = find_catalog_path()
    if not cat_path or not os.path.exists(cat_path):
        return []

    with open(cat_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    # Kumpulkan seluruh offer_id unik
    audit_tasks = []
    items_map = []

    limits = asyncio.Semaphore(4)

    async with httpx.AsyncClient(timeout=10.0) as client:
        for game in catalog:
            game_title = game.get("title", "Unknown Game")
            for s in game.get("sellers", []):
                raw_id = s.get("offer_id") or extract_offer_id(s.get("profile_url"))
                if raw_id:
                    offer_id = extract_offer_id(raw_id)
                    if offer_id:
                        async def bounded_fetch(oid=offer_id, gtitle=game_title, sname=s.get("seller_name", "Seller")):
                            async with limits:
                                res = await fetch_g2g_offer_live(client, oid)
                                res["game_title"] = gtitle
                                res["recorded_seller_name"] = sname
                                # Evaluasi kesehatan stok
                                qty = res.get("available_qty", 0)
                                if res.get("is_sold_out") or qty == 0 or res.get("status") != "live":
                                    res["health"] = "CRITICAL"
                                elif qty <= 4:
                                    res["health"] = "WARNING"
                                else:
                                    res["health"] = "SAFE"
                                return res

                        audit_tasks.append(bounded_fetch())

        results = await asyncio.gather(*audit_tasks, return_exceptions=True)

    cleaned_results = []
    for r in results:
        if isinstance(r, dict):
            cleaned_results.append(r)

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

        lines.append(
            f"{emoji} *{game}*\n"
            f"   • Seller: `{seller}` ({online_badge})\n"
            f"   • Stok Faktual: *{qty:,} Unit* | Modal: *{price_str}*\n"
            f"   • 🔗 URL Produk: https://www.g2g.com/offer/{oid}"
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
            url = f"https://www.g2g.com/offer/{oid}" if oid else "https://www.g2g.com"
            
            if health == "CRITICAL":
                alerts.append(
                    f"🚨 *[PERINGATAN STOK HABIS / SOLD OUT]*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🎮 *Game:* `{game}`\n"
                    f"👤 *Seller:* `{seller}` (`{oid}`)\n"
                    f"🔴 *Sisa Stok:* *0 UNIT (KOSONG)*\n"
                    f"🔗 *Cek Live Offer:* {url}\n"
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
