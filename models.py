"""
Akshara Gaming Center - Complete Domain Models
Mendefinisikan entitas data untuk seluruh 5 Divisi AI dan lifecycle transaksi.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class DeliverySpeed(str, Enum):
    INSTANT = "Instant Delivery"
    AUTOMATIC = "Automatic"
    MANUAL = "Manual"


class RiskStatus(str, Enum):
    APPROVED = "APPROVED"
    WARNING = "WARNING"
    REJECTED = "REJECTED"


class OrderStatus(str, Enum):
    RECEIVED = "RECEIVED"               # Pesanan baru masuk via Email / Webhook
    RISK_CHECKED = "RISK_CHECKED"       # Supplier sudah diaudit
    WAITING_HITL = "WAITING_HITL"       # Menunggu konfirmasi Senna di Telegram
    PURCHASING = "PURCHASING"           # Membeli akun di G2G
    FULFILLED = "FULFILLED"             # Kredensial terkirim & PDF garansi dicetak
    REJECTED = "REJECTED"               # Dibatalkan karena fraud / risiko tinggi
    CANCELLED = "CANCELLED"


class WarrantyClaimStatus(str, Enum):
    PENDING_TRIAGE = "PENDING_TRIAGE"
    APPROVED_FOR_REPLACEMENT = "APPROVED_FOR_REPLACEMENT"
    REJECTED_NO_UNCUT_VIDEO = "REJECTED_NO_UNCUT_VIDEO"
    ESCALATED_TO_SENNA = "ESCALATED_TO_SENNA"


class SupplierListing(BaseModel):
    """Data penawaran akun game dari supplier G2G Indonesia (g2g.com/id)"""
    id: str
    product_name: str
    supplier_name: str
    supplier_rating_pct: float
    total_sales_or_reviews: int
    price_idr: float = 0.0
    price_usd: Optional[float] = 0.0
    currency: str = "IDR"
    payment_method: str = "QRIS"
    delivery_speed: DeliverySpeed = DeliverySpeed.MANUAL
    stock_available: int = 1
    account_type: str = "Full Access (Changeable Email)"
    warranty_hours: int = 24
    listing_url: Optional[str] = None


class RiskAssessment(BaseModel):
    """Hasil audit risiko supplier oleh Divisi 2"""
    listing_id: str
    supplier_name: str
    status: RiskStatus
    risk_score: float
    reasons: List[str] = Field(default_factory=list)
    is_orderable: bool


class MarginCalculation(BaseModel):
    """Hasil kalkulasi margin bersih oleh Divisi 1 berbasis G2G IDR & QRIS"""
    product_name: str
    supplier_name: str
    cogs_g2g_idr: float
    qris_fee_pct: float = 0.7
    qris_fee_idr: float = 0.0
    cogs_idr_net: float  # cogs_g2g_idr + qris_fee_idr
    cogs_usd: Optional[float] = 0.0
    exchange_rate_usd_idr: Optional[float] = 16350.0
    card_spread_fee_pct: Optional[float] = 0.0
    selling_price_shopee_idr: float
    shopee_admin_fee_pct: float
    shopee_admin_fee_idr: float
    shopee_service_fee_idr: float
    packaging_and_envelope_cost_idr: float
    total_cost_idr: float
    net_profit_idr: float
    net_margin_pct: float
    break_even_price_idr: float
    recommended_min_price_idr: float


class ShopeeOrder(BaseModel):
    """Objek pesanan yang diekstrak dari notifikasi Shopee (Metode A)"""
    order_id: str
    buyer_username: str
    buyer_phone: Optional[str] = None
    product_title: str
    product_variation: str
    selling_price_idr: float
    order_timestamp: str
    shipping_address_city: Optional[str] = "Surabaya"
    status: OrderStatus = OrderStatus.RECEIVED


class AccountCredentials(BaseModel):
    """Kredensial akun game hasil fulfillment dari supplier"""
    game_email: str
    game_password: str
    original_email_login: Optional[str] = None
    original_email_password: Optional[str] = None
    serial_number: str
    delivery_notes: str = "Segera ganti email & password akun ini ke email pribadi Anda."


class WarrantyCardData(BaseModel):
    """Data untuk dicetak ke PDF Kartu Garansi A6 (Metode Amplop Fisik)"""
    order_id: str
    serial_number: str
    buyer_name: str
    purchase_date: str
    warranty_until: str
    product_name: str
    vip_voucher_code: str = "AKSHARA-VIP15"
    vip_voucher_discount_pct: int = 15
    support_wa: str = "0812-XXXX-XXXX"
    activation_guide_url: str = "https://akshara-game.id/panduan"


class WarrantyClaim(BaseModel):
    """Pengajuan klaim garansi dari pembeli"""
    claim_id: str
    order_id: str
    buyer_username: str
    issue_description: str
    has_uncut_video_proof: bool = False
    video_proof_url: Optional[str] = None
    claim_status: WarrantyClaimStatus = WarrantyClaimStatus.PENDING_TRIAGE
    decision_reason: Optional[str] = None
