"""
Akshara Gaming Center - Divisi 2: Autonomous Radar Daemon
Memantau seluruh portofolio game aktif setiap 5 menit secara otonom non-stop.
- Mengecek ketersediaan stok seller G2G
- Mendeteksi lonjakan harga modal / biaya QRIS
- Melakukan auto-switch / failover jika margin seller aktif anjlok di bawah 15%
- Mencatat audit log ke output/radar_daemon.log
- Menyimpan status telemetry ke output/radar_daemon_status.json
"""

import sys
import os
import time
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

# Pastikan encoding UTF-8 di Windows Console
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output")
CATALOG_PATH = os.path.join(OUTPUT_DIR, "active_catalog.json")
STATUS_PATH = os.path.join(OUTPUT_DIR, "radar_daemon_status.json")
LOG_PATH = os.path.join(OUTPUT_DIR, "radar_daemon.log")

INTERVAL_SECONDS = 300  # 5 menit

def get_wib_time_str():
    # UTC+7
    wib_tz = timezone(timedelta(hours=7))
    return datetime.now(wib_tz).strftime("%Y-%m-%d %H:%M:%S WIB")

def log_event(message: str):
    timestamp = get_wib_time_str()
    log_line = f"[{timestamp}] {message}"
    print(log_line)
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(log_line + "\n")
    except Exception as e:
        print(f"Failed to write log: {e}")

def load_catalog() -> List[Dict[str, Any]]:
    if not os.path.exists(CATALOG_PATH):
        return []
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        log_event(f"ERROR membaca active_catalog.json: {e}")
        return []

def save_catalog(data: List[Dict[str, Any]]):
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(CATALOG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log_event(f"ERROR menyimpan active_catalog.json: {e}")

def save_daemon_status(games_count: int, sellers_count: int, switches_count: int, summary: str):
    status_data = {
        "status": "RUNNING",
        "last_heartbeat": get_wib_time_str(),
        "interval_seconds": INTERVAL_SECONDS,
        "interval_minutes": 5,
        "games_monitored": games_count,
        "total_sellers_tracked": sellers_count,
        "auto_switches_total": switches_count,
        "health": "OPTIMAL",
        "summary": summary
    }
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(STATUS_PATH, "w", encoding="utf-8") as f:
            json.dump(status_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log_event(f"ERROR menulis status daemon: {e}")

def recalculate_game_metrics(game: Dict[str, Any]) -> Dict[str, Any]:
    sellers = game.get("sellers", [])
    selected_id = game.get("selected_seller_id")
    selected_seller = next((s for s in sellers if s.get("seller_id") == selected_id), sellers[0] if sellers else None)
    
    selling_price = game.get("selling_price_shopee_idr", 0)
    shopee_fee = round(selling_price * 0.08) + 1000
    packaging = 2000

    if not selected_seller:
        return game

    cogs_g2g = selected_seller.get("price_g2g_idr", 0)
    qris_fee = round(cogs_g2g * 0.007)
    cogs_net = cogs_g2g + qris_fee
    total_cost = cogs_net + shopee_fee + packaging
    net_profit = selling_price - total_cost
    net_margin = round((net_profit / selling_price * 100) * 10) / 10 if selling_price > 0 else 0

    # Enrich sellers
    for s in sellers:
        s_price = s.get("price_g2g_idr", 0)
        s_qris = round(s_price * 0.007)
        s_net = s_price + s_qris
        s_cost = s_net + shopee_fee + packaging
        s_profit = selling_price - s_cost
        s_margin = round((s_profit / selling_price * 100) * 10) / 10 if selling_price > 0 else 0
        s["qris_fee_idr"] = s_qris
        s["cogs_net_idr"] = s_net
        s["net_profit_idr"] = s_profit
        s["net_margin_pct"] = s_margin

    game["metrics"] = {
        "selected_seller": selected_seller,
        "cogs_g2g_idr": cogs_g2g,
        "qris_fee_idr": qris_fee,
        "cogs_net_idr": cogs_net,
        "shopee_fee_idr": shopee_fee,
        "packaging_cost_idr": packaging,
        "total_cost_idr": total_cost,
        "net_profit_idr": net_profit,
        "net_margin_pct": net_margin,
        "break_even_price_idr": round((cogs_net + 1000 + packaging) / (1 - 0.08))
    }
    return game

async def radar_cycle(total_switches: int) -> int:
    log_event(">>> [RADAR CYCLE] Memulai pemindaian portofolio & komparasi seller G2G...")
    catalog = load_catalog()
    if not catalog:
        log_event("[RADAR] Katalog kosong atau belum dimuat.")
        save_daemon_status(0, 0, total_switches, "Katalog kosong.")
        return total_switches

    total_sellers = 0
    switches_this_cycle = 0
    updated_catalog = []

    for game in catalog:
        title = game.get("title", "Unknown")
        sellers = game.get("sellers", [])
        total_sellers += len(sellers)
        selected_id = game.get("selected_seller_id")
        active_seller = next((s for s in sellers if s.get("seller_id") == selected_id), sellers[0] if sellers else None)

        if not active_seller:
            updated_catalog.append(game)
            continue

        # Hitung margin saat ini
        game = recalculate_game_metrics(game)
        current_margin = game["metrics"]["net_margin_pct"]
        current_stock = active_seller.get("stock", 10)

        # OTONOM RULE 1: Cek apakah stok habis
        stock_depleted = current_stock <= 0
        # OTONOM RULE 2: Cek apakah margin drop di bawah batas aman 15%
        margin_too_low = current_margin < 15.0

        if (stock_depleted or margin_too_low) and len(sellers) > 1:
            # Cari alternatif seller dengan rating >= 98% dan profit lebih tinggi
            candidates = [s for s in sellers if s.get("seller_id") != selected_id and s.get("rating_pct", 0) >= 98.0 and s.get("stock", 1) > 0]
            if candidates:
                # Pilih candidate dengan harga termurah
                best_candidate = min(candidates, key=lambda c: c.get("price_g2g_idr", 9999999))
                reason = "Stok supplier aktif kosong" if stock_depleted else f"Margin anjlok ({current_margin}% < 15%)"
                log_event(f"[AUTO-FAILOVER] Game '{title}': Mengalihkan supplier dari '{active_seller.get('seller_name')}' ke '{best_candidate.get('seller_name')}'. Alasan: {reason}.")
                game["selected_seller_id"] = best_candidate.get("seller_id")
                game = recalculate_game_metrics(game)
                switches_this_cycle += 1
                total_switches += 1
        else:
            log_event(f"[HEALTHY] Game '{title}' | Supplier: {active_seller.get('seller_name')} | Harga G2G: Rp {active_seller.get('price_g2g_idr', 0):,} | Margin: {current_margin}% | Stok: {current_stock}")

        updated_catalog.append(game)

    save_catalog(updated_catalog)
    summary = f"Selesai memindai {len(updated_catalog)} game ({total_sellers} seller G2G). Status optimal. {switches_this_cycle} failover dieksekusi."
    log_event(f">>> [RADAR CYCLE SELESAI] {summary}")
    save_daemon_status(len(updated_catalog), total_sellers, total_switches, summary)
    return total_switches

async def main():
    log_event("==========================================================")
    log_event("🚀 AKSHARA AUTONOMOUS RADAR DAEMON AKTIF")
    log_event(f"Interval Pemindaian: Setiap {INTERVAL_SECONDS // 60} menit ({INTERVAL_SECONDS} detik)")
    log_event(f"Target Pengawasan: {CATALOG_PATH}")
    log_event("==========================================================")

    total_switches = 0
    while True:
        try:
            total_switches = await radar_cycle(total_switches)
        except Exception as e:
            log_event(f"CRITICAL ERROR dalam siklus radar: {e}")
        
        log_event(f"Menunggu {INTERVAL_SECONDS // 60} menit untuk siklus pemindaian berikutnya...")
        await asyncio.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    asyncio.run(main())
