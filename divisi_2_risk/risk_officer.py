"""
Akshara Gaming Center - Divisi 2: Supplier Sentry & Risk Control (The Risk Officer)
Sistem penyaring supplier untuk mencegah akun rawan hackback, revoke, dan delayed shipping.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import List
from models import SupplierListing, RiskAssessment, RiskStatus, DeliverySpeed
from config import RiskConfig, SETTINGS


class RiskOfficer:
    def __init__(self, config: RiskConfig = SETTINGS.risk):
        self.config = config

    def evaluate_listing(self, listing: SupplierListing) -> RiskAssessment:
        risk_score = 0.0
        reasons: List[str] = []

        # 1. Pengecekan Blacklist Seller
        if listing.supplier_name.lower() in [s.lower() for s in self.config.seller_blacklist]:
            return RiskAssessment(
                listing_id=listing.id,
                supplier_name=listing.supplier_name,
                status=RiskStatus.REJECTED,
                risk_score=100.0,
                reasons=["SELLER BLACKLISTED: Seller pernah dilaporkan bermasalah / penipuan."],
                is_orderable=False
            )

        # 2. Pengecekan Kata Kunci Berbahaya (Akun bajakan / temporary / shared / non-changeable)
        text_corpus = f"{listing.product_name} {listing.account_type}".lower()
        found_flagged_words = [word for word in self.config.flagged_keywords if word in text_corpus]
        if found_flagged_words:
            reasons.append(f"FLAGGED KEYWORDS: Terdeteksi ({', '.join(found_flagged_words)}) - Bukan Full Access.")
            risk_score += 45.0

        # 3. Pengecekan Rating Seller (Min 98%)
        if listing.supplier_rating_pct < self.config.min_rating_pct:
            deficit = self.config.min_rating_pct - listing.supplier_rating_pct
            reasons.append(f"RATING RENDAH: {listing.supplier_rating_pct:.1f}% di bawah standar {self.config.min_rating_pct}%.")
            risk_score += min(50.0, deficit * 20.0)

        # 4. Pengecekan Total Transaksi / Reputasi (Min 5.000)
        if listing.total_sales_or_reviews < self.config.min_reviews_count:
            reasons.append(
                f"REPUTASI BELUM TERUJI: {listing.total_sales_or_reviews:,} review di bawah standar ({self.config.min_reviews_count:,})."
            )
            risk_score += 30.0

        # 5. Pengecekan Waktu Delivery (Wajib Instant Delivery untuk JIT)
        if self.config.require_instant_delivery and listing.delivery_speed != DeliverySpeed.INSTANT:
            reasons.append(f"NON-INSTANT: Pengiriman {listing.delivery_speed.value} rawan keterlambatan resi Shopee.")
            risk_score += 25.0

        # 6. Pengecekan Masa Garansi Supplier
        if listing.warranty_hours < self.config.min_warranty_hours:
            reasons.append(f"GARANSI MINIM: Garansi supplier {listing.warranty_hours} jam (< {self.config.min_warranty_hours} jam).")
            risk_score += 15.0

        # 7. Cek Ketersediaan Stok
        if listing.stock_available <= 0:
            reasons.append("STOK HABIS: Supplier sedang out of stock.")
            risk_score += 100.0

        risk_score = min(100.0, max(0.0, risk_score))
        if risk_score >= 50.0 or listing.stock_available <= 0:
            status = RiskStatus.REJECTED
            is_orderable = False
        elif risk_score >= 20.0:
            status = RiskStatus.WARNING
            is_orderable = True
        else:
            status = RiskStatus.APPROVED
            is_orderable = True
            if not reasons:
                reasons.append("SUPPLIER LOLOS AUDIT: Rating tinggi, Instant Delivery, Full Access Changeable Email.")

        return RiskAssessment(
            listing_id=listing.id,
            supplier_name=listing.supplier_name,
            status=status,
            risk_score=risk_score,
            reasons=reasons,
            is_orderable=is_orderable
        )
