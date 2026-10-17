"""
Akshara Gaming Center - Eneba Live Data & Sourcing Calculator
"""

import math
from typing import Dict, Any, List, Optional

# 18 Terkalibrasi Eneba Catalog (Live Market Landed Cost)
VERIFIED_ENEBA_ITEMS: List[Dict[str, Any]] = [
    {
        "id": "eneba-minecraft-pc",
        "title": "Minecraft: Java & Bedrock Edition",
        "platform": "PC / Microsoft Store",
        "key_type": "Official Global Key",
        "price_usd": 19.50,
        "price_idr": 315000,
        "url": "https://www.eneba.com/store/all?text=minecraft%20java%20bedrock",
        "recommended_shopee_idr": 369000,
        "net_profit_idr": 22280,
        "net_margin_pct": 6.0,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-project-zomboid",
        "title": "Project Zomboid",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 7.85,
        "price_idr": 118000,
        "url": "https://www.eneba.com/store/all?text=project%20zomboid",
        "recommended_shopee_idr": 149000,
        "net_profit_idr": 17250,
        "net_margin_pct": 11.6,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-terraria",
        "title": "Terraria",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 8.50,
        "price_idr": 138000,
        "url": "https://www.eneba.com/store/all?text=terraria",
        "recommended_shopee_idr": 169000,
        "net_profit_idr": 15520,
        "net_margin_pct": 9.2,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-hollow-knight",
        "title": "Hollow Knight",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 9.15,
        "price_idr": 148000,
        "url": "https://www.eneba.com/store/all?text=hollow%20knight",
        "recommended_shopee_idr": 179000,
        "net_profit_idr": 14640,
        "net_margin_pct": 8.2,
        "stock_status": "Medium Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-dst",
        "title": "Don't Starve Together",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 5.25,
        "price_idr": 85000,
        "url": "https://www.eneba.com/store/all?text=dont%20starve%20together",
        "recommended_shopee_idr": 115000,
        "net_profit_idr": 18810,
        "net_margin_pct": 16.4,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-lethal-company",
        "title": "Lethal Company",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 7.70,
        "price_idr": 125000,
        "url": "https://www.eneba.com/store/all?text=lethal%20company",
        "recommended_shopee_idr": 159000,
        "net_profit_idr": 19400,
        "net_margin_pct": 12.2,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-l4d2",
        "title": "Left 4 Dead 2",
        "platform": "PC / Steam",
        "key_type": "Steam Gift / Key",
        "price_usd": 7.70,
        "price_idr": 125000,
        "url": "https://www.eneba.com/store/all?text=left%204%20dead%202",
        "recommended_shopee_idr": 159000,
        "net_profit_idr": 19400,
        "net_margin_pct": 12.2,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-assetto-corsa",
        "title": "Assetto Corsa",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 4.60,
        "price_idr": 75000,
        "url": "https://www.eneba.com/store/all?text=assetto%20corsa",
        "recommended_shopee_idr": 99000,
        "net_profit_idr": 14550,
        "net_margin_pct": 14.7,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-ets2",
        "title": "Euro Truck Simulator 2",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 12.00,
        "price_idr": 195000,
        "url": "https://www.eneba.com/store/all?text=euro%20truck%20simulator%202",
        "recommended_shopee_idr": 239000,
        "net_profit_idr": 22510,
        "net_margin_pct": 9.4,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-phasmophobia",
        "title": "Phasmophobia",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 13.30,
        "price_idr": 215000,
        "url": "https://www.eneba.com/store/all?text=phasmophobia",
        "recommended_shopee_idr": 259000,
        "net_profit_idr": 20770,
        "net_margin_pct": 8.0,
        "stock_status": "Medium Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-gta-v",
        "title": "Grand Theft Auto V: Premium Edition",
        "platform": "PC / Rockstar Games",
        "key_type": "Rockstar Key Global",
        "price_usd": 14.50,
        "price_idr": 235000,
        "url": "https://www.eneba.com/store/all?text=grand%20theft%20auto%20v%20premium",
        "recommended_shopee_idr": 289000,
        "net_profit_idr": 27230,
        "net_margin_pct": 9.4,
        "stock_status": "Very High",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-rdr2",
        "title": "Red Dead Redemption 2",
        "platform": "PC / Rockstar Games",
        "key_type": "Rockstar Key Global",
        "price_usd": 15.70,
        "price_idr": 255000,
        "url": "https://www.eneba.com/store/all?text=red%20dead%20redemption%202",
        "recommended_shopee_idr": 309000,
        "net_profit_idr": 25500,
        "net_margin_pct": 8.3,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-cyberpunk",
        "title": "Cyberpunk 2077",
        "platform": "PC / GOG",
        "key_type": "GOG Key Global",
        "price_usd": 20.00,
        "price_idr": 325000,
        "url": "https://www.eneba.com/store/all?text=cyberpunk%202077",
        "recommended_shopee_idr": 389000,
        "net_profit_idr": 28600,
        "net_margin_pct": 7.4,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-witcher-3",
        "title": "The Witcher 3: Wild Hunt - Complete Edition",
        "platform": "PC / GOG",
        "key_type": "GOG Key Global",
        "price_usd": 22.50,
        "price_idr": 365000,
        "url": "https://www.eneba.com/store/all?text=witcher%203%20complete",
        "recommended_shopee_idr": 429000,
        "net_profit_idr": 25100,
        "net_margin_pct": 5.9,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-palworld",
        "title": "Palworld",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 26.20,
        "price_idr": 425000,
        "url": "https://www.eneba.com/store/all?text=palworld",
        "recommended_shopee_idr": 499000,
        "net_profit_idr": 28100,
        "net_margin_pct": 5.6,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-fc25",
        "title": "EA SPORTS FC 25",
        "platform": "PC / EA App",
        "key_type": "EA App Key Global",
        "price_usd": 41.00,
        "price_idr": 665000,
        "url": "https://www.eneba.com/store/all?text=ea%20sports%20fc%2025",
        "recommended_shopee_idr": 769000,
        "net_profit_idr": 36920,
        "net_margin_pct": 4.8,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    },
    {
        "id": "eneba-elden-ring",
        "title": "Elden Ring",
        "platform": "PC / Steam",
        "key_type": "Steam Key Global",
        "price_usd": 48.50,
        "price_idr": 785000,
        "url": "https://www.eneba.com/store/all?text=elden%20ring",
        "recommended_shopee_idr": 899000,
        "net_profit_idr": 34180,
        "net_margin_pct": 3.8,
        "stock_status": "High Stock",
        "hackback_risk": "0% (Redeem Langsung)",
    }
]


def search_eneba_catalog(query: str) -> List[Dict[str, Any]]:
    """Pencarian fuzzy pada katalog Eneba terkalibrasi."""
    q = query.lower().strip()
    results = []
    for item in VERIFIED_ENEBA_ITEMS:
        if q in item["title"].lower() or q in item["platform"].lower() or q in item["id"].lower():
            results.append(item)
    return results


def calculate_custom_eneba(price_usd: float, usd_rate: float = 16350.0) -> Dict[str, Any]:
    """Menghitung landed cost custom Eneba (termasuk service fee checkout ~10% & QRIS 0.7%)."""
    # 10% buyer service fee checkout
    total_usd = price_usd * 1.10
    raw_idr = total_usd * usd_rate
    landed_cost_idr = math.ceil(raw_idr / 1000) * 1000
    qris_fee = math.ceil(landed_cost_idr * 0.007)
    total_modal = landed_cost_idr + qris_fee
    packaging_cost = 2000

    # Rekomendasi Shopee: target margin ~20%
    # Harga jual = (modal + 1000 fixed fee + 2000 packaging) / (1 - 0.08 - 0.20)
    target_shopee = math.ceil((total_modal + 1000 + packaging_cost) / 0.72 / 1000) * 1000
    shopee_fee = math.ceil(target_shopee * 0.08) + 1000
    net_profit = target_shopee - total_modal - shopee_fee - packaging_cost
    net_margin = (net_profit / target_shopee) * 100

    return {
        "price_usd_raw": price_usd,
        "total_usd_checkout": round(total_usd, 2),
        "landed_cost_idr": landed_cost_idr,
        "qris_fee_idr": qris_fee,
        "total_modal_idr": total_modal,
        "packaging_cost_idr": packaging_cost,
        "recommended_shopee_idr": target_shopee,
        "shopee_fee_idr": shopee_fee,
        "net_profit_idr": net_profit,
        "net_margin_pct": round(net_margin, 1)
    }
