"""
Akshara Gaming Center - System Configuration
Pengaturan menyeluruh parameter keuangan, threshold risiko, dan kredensial API.
"""

import os
from typing import List
from pydantic import BaseModel, Field

# Auto-load file .env jika tersedia
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    with open(_env_path, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())


USD_IDR_RATE = 16350.0
QRIS_FEE_PCT = 0.007
SHOPEE_ADMIN_FEE_PCT = 0.08
SHOPEE_FIXED_FEE_IDR = 1000.0
PACKAGING_COST_IDR = 2000.0


class RiskConfig(BaseModel):
    min_rating_pct: float = Field(default=98.0, description="Rating minimal seller G2G (%)")
    min_reviews_count: int = Field(default=5000, description="Batas minimum total transaksi/review seller")
    require_instant_delivery: bool = Field(default=True, description="Wajib instant delivery untuk efisiensi JIT")
    min_warranty_hours: int = Field(default=24, description="Garansi minimal dari supplier G2G (jam)")
    seller_blacklist: List[str] = Field(
        default_factory=lambda: ["sketchy_gaming_shop", "cheap_accounts_xyz", "dodgy_seller_99"]
    )
    flagged_keywords: List[str] = Field(
        default_factory=lambda: [
            "shared", "temporary", "non-changeable", "crack", "cracked", 
            "no warranty", "offline only", "bypass", "family share only"
        ]
    )


class FinancialConfig(BaseModel):
    # G2G Indonesia (g2g.com/id) Payment & Currency Settings
    g2g_portal_url: str = "https://www.g2g.com/id"
    g2g_currency: str = "IDR"
    qris_payment_fee_pct: float = QRIS_FEE_PCT  # Standard QRIS MDR (0.7%)
    
    # Marketplace Selling Fees (Shopee)
    shopee_admin_fee_pct: float = SHOPEE_ADMIN_FEE_PCT * 100.0
    shopee_fixed_fee_idr: float = SHOPEE_FIXED_FEE_IDR
    packaging_and_envelope_cost_idr: float = PACKAGING_COST_IDR
    target_min_net_margin_pct: float = float(os.getenv("DEFAULT_TARGET_NET_MARGIN_PCT", "25.0"))
    
    # Fallback USD/IDR reference if listing is quoted in USD
    usd_idr_exchange_rate: float = USD_IDR_RATE
    card_fx_fee_pct: float = float(os.getenv("DEFAULT_CARD_FX_FEE_PCT", "2.0"))


class SystemConfig(BaseModel):
    # Telegram Bot HITL Credentials
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_admin_chat_id: str = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
    
    # WhatsApp Gateway (Fonnte)
    fonnte_api_token: str = os.getenv("FONNTE_API_TOKEN", "mock_fonnte_token")
    fonnte_api_url: str = os.getenv("FONNTE_API_URL", "https://api.fonnte.com/send")
    
    # Email IMAP Settings (Metode A)
    imap_server: str = os.getenv("IMAP_SERVER", "imap.gmail.com")
    imap_port: int = int(os.getenv("IMAP_PORT", "993"))
    imap_email: str = os.getenv("IMAP_EMAIL", "akshara.store.orders@gmail.com")
    imap_app_password: str = os.getenv("IMAP_APP_PASSWORD", "mock_app_password")
    
    # Sub-configs
    risk: RiskConfig = RiskConfig()
    financial: FinancialConfig = FinancialConfig()


# Global Singleton
SETTINGS = SystemConfig()
