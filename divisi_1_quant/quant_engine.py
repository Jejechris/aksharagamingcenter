"""
Akshara Gaming Center - Divisi 1: Market Intelligence & Dynamic Pricing (The Quant)
Menghitung struktur biaya menyeluruh, kurs valas + spread kartu, potongan Shopee, dan margin bersih.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import SupplierListing, MarginCalculation
from config import FinancialConfig, SETTINGS


class QuantEngine:
    def __init__(self, config: FinancialConfig = SETTINGS.financial):
        self.config = config

    def calculate_cogs_idr(self, listing: SupplierListing):
        """
        Menghitung modal pengadaan di G2G.com/id (Rupiah) + Fee QRIS (0.7%).
        Jika listing berupa USD, otomatis dikonversikan ke IDR.
        """
        if listing.price_idr > 0:
            cogs_g2g_idr = listing.price_idr
        else:
            cogs_g2g_idr = round(listing.price_usd * self.config.usd_idr_exchange_rate, 2)
            
        qris_fee_idr = round(cogs_g2g_idr * (self.config.qris_payment_fee_pct / 100.0), 2)
        cogs_idr_net = round(cogs_g2g_idr + qris_fee_idr, 2)
        return cogs_g2g_idr, qris_fee_idr, cogs_idr_net

    def calculate_margin(
        self, 
        listing: SupplierListing, 
        selling_price_shopee_idr: float
    ) -> MarginCalculation:
        """Menghitung struktur biaya menyeluruh dan profit bersih berbasis G2G IDR & QRIS."""
        cogs_g2g_idr, qris_fee_idr, cogs_idr_net = self.calculate_cogs_idr(listing)
        
        # Potongan biaya Shopee
        shopee_admin_fee = selling_price_shopee_idr * (self.config.shopee_admin_fee_pct / 100.0)
        shopee_service_fee = self.config.shopee_fixed_fee_idr
        packaging_cost = self.config.packaging_and_envelope_cost_idr
        
        # Total Pengeluaran (Modal G2G + QRIS Fee + Shopee Fee + Packaging)
        total_costs_idr = cogs_idr_net + shopee_admin_fee + shopee_service_fee + packaging_cost
        
        # Profit Bersih
        net_profit_idr = selling_price_shopee_idr - total_costs_idr
        net_margin_pct = (net_profit_idr / selling_price_shopee_idr) * 100.0 if selling_price_shopee_idr > 0 else 0.0
        
        # Break-Even Price (Titik Impas)
        # Formula: BEP = (COGS Net + Biaya Tetap) / (1 - Biaya Variabel Pct)
        fixed_and_cogs = cogs_idr_net + shopee_service_fee + packaging_cost
        variable_multiplier = 1.0 - (self.config.shopee_admin_fee_pct / 100.0)
        break_even_price = round(fixed_and_cogs / variable_multiplier, 0)
        
        # Rekomendasi Harga Jual Minimum untuk mencapai target margin (default: 25%)
        target_margin_rate = self.config.target_min_net_margin_pct / 100.0
        recommended_multiplier = 1.0 - (self.config.shopee_admin_fee_pct / 100.0) - target_margin_rate
        if recommended_multiplier > 0:
            recommended_min_price = round(fixed_and_cogs / recommended_multiplier, 0)
            recommended_min_price = round(recommended_min_price / 1000.0) * 1000.0 - 100.0
        else:
            recommended_min_price = break_even_price * 1.35

        return MarginCalculation(
            product_name=listing.product_name,
            supplier_name=listing.supplier_name,
            cogs_g2g_idr=cogs_g2g_idr,
            qris_fee_pct=self.config.qris_payment_fee_pct,
            qris_fee_idr=qris_fee_idr,
            cogs_idr_net=cogs_idr_net,
            cogs_usd=listing.price_usd or round(cogs_g2g_idr / self.config.usd_idr_exchange_rate, 2),
            exchange_rate_usd_idr=self.config.usd_idr_exchange_rate,
            card_spread_fee_pct=0.0,
            selling_price_shopee_idr=selling_price_shopee_idr,
            shopee_admin_fee_pct=self.config.shopee_admin_fee_pct,
            shopee_admin_fee_idr=round(shopee_admin_fee, 2),
            shopee_service_fee_idr=shopee_service_fee,
            packaging_and_envelope_cost_idr=packaging_cost,
            total_cost_idr=round(total_costs_idr, 2),
            net_profit_idr=round(net_profit_idr, 2),
            net_margin_pct=round(net_margin_pct, 2),
            break_even_price_idr=break_even_price,
            recommended_min_price_idr=recommended_min_price
        )
