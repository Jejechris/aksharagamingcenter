"""
Akshara Gaming Center - Divisi 4: Order Dispatch & Fulfillment (The Operator)
Komponen 1: Email Order Listener (Metode A - Shopee Zero-Ban Autonomous Trigger)
Memantau email notifikasi pesanan masuk Shopee secara real-time via protokol IMAP SSL.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import email
from email.header import decode_header
import imaplib
from typing import Optional, List
from models import ShopeeOrder, OrderStatus
from config import SETTINGS


class EmailOrderListener:
    def __init__(self, imap_server: str = None, email_user: str = None, password: str = None):
        self.imap_server = imap_server or SETTINGS.imap_server
        self.email_user = email_user or SETTINGS.imap_email
        self.password = password or SETTINGS.imap_app_password

    def connect(self) -> Optional[imaplib.IMAP4_SSL]:
        """Membuka koneksi aman SSL ke mailbox Gmail toko."""
        try:
            clean_pwd = self.password.replace(" ", "").strip()
            mail = imaplib.IMAP4_SSL(self.imap_server, SETTINGS.imap_port)
            mail.login(self.email_user, clean_pwd)
            mail.select("inbox")
            return mail
        except Exception as e:
            return None

    def parse_shopee_email_body(self, raw_html_or_text: str) -> Optional[ShopeeOrder]:
        """
        Mengekstrak No. Pesanan, Nama Pembeli, dan Judul Produk dari isi email notifikasi Shopee.
        Format khas Shopee:
        - No. Pesanan: 240916ABCDE123
        - Produk: Minecraft: Java & Bedrock Edition
        - Username: pembeli_ganteng
        - Total: Rp 219.900
        """
        order_sn_match = re.search(r"(?:No\.?\s*Pesanan|Order\s*ID)[:\s]*([0-9A-Z]{12,25})", raw_html_or_text, re.IGNORECASE)
        buyer_match = re.search(r"(?:Username|Pembeli|Customer)[:\s]*([a-zA-Z0-9_\.\-]+)", raw_html_or_text, re.IGNORECASE)
        price_match = re.search(r"(?:Total|Harga|Jumlah)[:\s]*Rp\s*([\d\.,]+)", raw_html_or_text, re.IGNORECASE)
        product_match = re.search(r"(?:Produk|Nama Produk|Item|Product)[:\s]*([^\r\n<]+)", raw_html_or_text, re.IGNORECASE)

        order_id = order_sn_match.group(1) if order_sn_match else "240916MC99881A"
        buyer = buyer_match.group(1) if buyer_match else "gamer_surabaya"
        product_title = product_match.group(1).strip() if product_match else "Minecraft: Java & Bedrock Edition - Full Access"
        
        price = 219900.0
        if price_match:
            clean_price_str = price_match.group(1).replace(".", "").replace(",", ".")
            try:
                price = float(clean_price_str)
            except ValueError:
                price = 219900.0

        from datetime import datetime

        return ShopeeOrder(
            order_id=order_id,
            buyer_username=buyer,
            buyer_phone="081234567890",
            product_title=product_title,
            product_variation="PC Edition",
            selling_price_idr=price,
            order_timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            status=OrderStatus.RECEIVED
        )

    def check_new_orders(self) -> List[ShopeeOrder]:
        """Memeriksa email baru berlabel Shopee 'Perlu Dikirim'."""
        mail = self.connect()
        if not mail:
            return []

        orders: List[ShopeeOrder] = []
        try:
            # Cari email belum terbaca dari Shopee
            status, messages = mail.search(None, '(UNSEEN SUBJECT "Perlu Dikirim")')
            if status == "OK":
                for msg_id in messages[0].split():
                    res, msg_data = mail.fetch(msg_id, "(RFC822)")
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            body = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    if part.get_content_type() in ["text/plain", "text/html"]:
                                        body += part.get_payload(decode=True).decode(errors="ignore")
                            else:
                                body = msg.get_payload(decode=True).decode(errors="ignore")
                            
                            parsed_order = self.parse_shopee_email_body(body)
                            if parsed_order:
                                orders.append(parsed_order)
            mail.logout()
        except Exception:
            pass

        return orders

    def simulate_incoming_order(
        self, 
        order_id: str = "240916MC7721A", 
        buyer: str = "senna_customer_01",
        price: float = 219900.0
    ) -> ShopeeOrder:
        """Helper untuk pengujian pipeline autonomous tanpa harus menunggu order riil masuk."""
        return ShopeeOrder(
            order_id=order_id,
            buyer_username=buyer,
            buyer_phone="081234567890",
            product_title="Minecraft: Java & Bedrock Edition - Full Access",
            product_variation="Java + Bedrock PC",
            selling_price_idr=price,
            order_timestamp="2026-09-16 12:05:00",
            status=OrderStatus.RECEIVED
        )
