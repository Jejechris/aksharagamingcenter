"""
Akshara Gaming Center - Divisi 3: Creative & Physical Fulfillment (The Marketer)
HARDENED A6 WARRANTY CARD & ACTIVATION CERTIFICATE GENERATOR
Menghasilkan dokumen fisik premium sekelas sertifikat lisensi resmi berukuran A6 (105 x 148 mm).
Dilengkapi QR Code verifikasi dinamis, voucher VIP keemasan, dan layout standar korporasi gaming.
"""

import sys
import os
import io
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import qrcode
from PIL import Image

from reportlab.lib.pagesizes import A6
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
)
from reportlab.graphics.shapes import Drawing, Rect, String
from models import WarrantyCardData


class WarrantyCardGenerator:
    def __init__(self, output_dir: str = None):
        if output_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            output_dir = os.path.join(base_dir, "output")
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def _create_qr_code_image(self, payload_text: str) -> io.BytesIO:
        """Membuat QR code PNG dinamis dalam buffer memori BytesIO."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=4,
            border=1,
        )
        qr.add_data(payload_text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return buffer

    def generate_pdf(self, data: WarrantyCardData) -> str:
        """
        Menghasilkan file PDF A6 presisi dengan layout kartu lisensi premium.
        """
        file_name = f"KARTU_GARANSI_{data.order_id}_{data.serial_number}.pdf"
        file_path = os.path.join(self.output_dir, file_name)

        # Margin 10pt (~3.5mm) untuk memaksimalkan ruang di kertas A6 (lebar: 297.6pt, tinggi: 419.5pt)
        doc = SimpleDocTemplate(
            file_path,
            pagesize=A6,
            leftMargin=10,
            rightMargin=10,
            topMargin=10,
            bottomMargin=10
        )

        styles = getSampleStyleSheet()

        # Palet Warna Premium (Navy, Cyber Blue, Gold, Slate)
        COLOR_PRIMARY = colors.HexColor("#0F172A")    # Deep Navy / Black Slate
        COLOR_ACCENT = colors.HexColor("#2563EB")     # Cyber Blue
        COLOR_GOLD = colors.HexColor("#B45309")       # Rich Gold
        COLOR_GOLD_BG = colors.HexColor("#FEF3C7")    # Light Amber / Gold Box
        COLOR_DARK_TEXT = colors.HexColor("#1E293B")  # Slate 800
        COLOR_MUTED_TEXT = colors.HexColor("#64748B") # Slate 500
        COLOR_RED_ALERT = colors.HexColor("#DC2626")  # Red Alert

        # Typography Styles
        brand_title_style = ParagraphStyle(
            'BrandTitle',
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=13,
            textColor=colors.white,
            alignment=1
        )

        brand_badge_style = ParagraphStyle(
            'BrandBadge',
            fontName='Helvetica-Bold',
            fontSize=6.5,
            leading=8,
            textColor=colors.HexColor("#93C5FD"),
            alignment=1
        )

        label_bold = ParagraphStyle(
            'LabelBold',
            fontName='Helvetica-Bold',
            fontSize=6.2,
            leading=8,
            textColor=COLOR_DARK_TEXT
        )

        val_style = ParagraphStyle(
            'ValStyle',
            fontName='Helvetica',
            fontSize=6.2,
            leading=8,
            textColor=COLOR_PRIMARY
        )

        val_serial = ParagraphStyle(
            'ValSerial',
            fontName='Helvetica-Bold',
            fontSize=6.5,
            leading=8,
            textColor=COLOR_ACCENT
        )

        sop_heading = ParagraphStyle(
            'SopHeading',
            fontName='Helvetica-Bold',
            fontSize=7,
            leading=9,
            textColor=COLOR_PRIMARY
        )

        sop_text = ParagraphStyle(
            'SopText',
            fontName='Helvetica',
            fontSize=5.8,
            leading=7.8,
            textColor=COLOR_DARK_TEXT
        )

        alert_box_text = ParagraphStyle(
            'AlertText',
            fontName='Helvetica-Bold',
            fontSize=5.8,
            leading=7.6,
            textColor=COLOR_RED_ALERT,
            alignment=1
        )

        voucher_title = ParagraphStyle(
            'VoucherTitle',
            fontName='Helvetica-Bold',
            fontSize=7.5,
            leading=9.5,
            textColor=COLOR_GOLD,
            alignment=1
        )

        voucher_desc = ParagraphStyle(
            'VoucherDesc',
            fontName='Helvetica',
            fontSize=5.8,
            leading=7.5,
            textColor=colors.HexColor("#78350F"),
            alignment=1
        )

        footer_text = ParagraphStyle(
            'FooterText',
            fontName='Helvetica',
            fontSize=5,
            leading=6.5,
            textColor=COLOR_MUTED_TEXT,
            alignment=1
        )

        story = []

        # =========================================================================
        # 1. HEADER BANNER (DEEP SLATE NAVY WITH BRANDING & VERIFIED BADGE)
        # =========================================================================
        header_data = [
            [Paragraph("AKSHARA GAMING CENTER", brand_title_style)],
            [Paragraph("AUTHENTICITY CERTIFICATE & OFFICIAL WARRANTY", brand_badge_style)],
            [Paragraph("★ 100% ORIGINAL PRODUCT • VERIFIED DIGITAL ASSET • LIFETIME COMPLIANT ★", brand_badge_style)]
        ]
        header_table = Table(header_data, colWidths=[277])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 4))

        # =========================================================================
        # 2. METADATA SECTION + DYNAMIC QR CODE VERIFICATION
        # =========================================================================
        # Generate real QR Code linking to verification endpoint
        verify_url = f"https://akshara-game.id/verify?sn={data.serial_number}&order={data.order_id}"
        qr_buffer = self._create_qr_code_image(verify_url)
        qr_img = RLImage(qr_buffer, width=48, height=48)

        metadata_rows = [
            [Paragraph("No. Pesanan:", label_bold), Paragraph(data.order_id, val_style)],
            [Paragraph("Serial ID Lisensi:", label_bold), Paragraph(data.serial_number, val_serial)],
            [Paragraph("Nama Pelanggan:", label_bold), Paragraph(data.buyer_name, val_style)],
            [Paragraph("Item Game:", label_bold), Paragraph(data.product_name, val_style)],
            [Paragraph("Masa Garansi:", label_bold), Paragraph(f"30 Hari Resmi (s/d {data.warranty_until})", val_style)],
        ]
        meta_table = Table(metadata_rows, colWidths=[65, 145])
        meta_table.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 1.2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))

        # Gabungkan tabel info dengan QR Code di sebelah kanan
        qr_caption = Paragraph("<font size=4.5 color='#64748B'>SCAN UNTUK CEK LISENSI</font>", footer_text)
        qr_cell = [qr_img, Spacer(1, 2), qr_caption]

        sec_grid = [
            [meta_table, qr_cell]
        ]
        sec_table = Table(sec_grid, colWidths=[215, 62])
        sec_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(sec_table)
        story.append(Spacer(1, 4))

        # =========================================================================
        # 3. SOP AKTIVASI STEP-BY-STEP & SYARAT KLAIM
        # =========================================================================
        story.append(Paragraph("STANDAR OPERASIONAL PROSEDUR (SOP) AKTIVASI & KLAIM:", sop_heading))
        story.append(Spacer(1, 2))

        sop_items = (
            "<b>1. Detail Login Resmi:</b> Kredensial akun (email & password) telah dikirimkan ke WhatsApp Anda.<br/>"
            "<b>2. Migrasi Keamanan:</b> Segera login ke <u>https://account.microsoft.com</u>. Ganti password dan pasang email pribadi Anda sebagai <i>Primary Alias</i>.<br/>"
            "<b>3. Fitur Steam Families:</b> Untuk game Steam AAA, kaitkan akun ke Family Group untuk menikmati game di library akun utama Anda.<br/>"
            "<b>4. Bantuan Kendala:</b> Hubungi Customer Service jika mengalami kendala login saat pertama kali aktivasi."
        )
        story.append(Paragraph(sop_items, sop_text))
        story.append(Spacer(1, 3))

        # Alert Box: Ketentuan Wajib No-Cut Video (Mencegah Buyer Fraud)
        alert_content = [
            [Paragraph("⚠️ SYARAT MUTLAK KLAIM GARANSI PENGGANTIAN AKUN:", alert_box_text)],
            [Paragraph("Wajib merekam <b>Video Unboxing Amplop ini dan Percobaan First-Login Tanpa Jeda / No-Cut</b>. Klaim tanpa bukti video tidak dapat diproses demi keamanan bersama.", alert_box_text)]
        ]
        alert_table = Table(alert_content, colWidths=[277])
        alert_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#FCA5A5")),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(alert_table)
        story.append(Spacer(1, 4))

        # =========================================================================
        # 4. GOLDEN VIP VOUCHER (RETENTION FLYWHEEL KE WEBSITE MANDIRI)
        # =========================================================================
        voucher_data = [
            [Paragraph(f"🎟️ KARTU MEMBER VIP — VOUCHER DISKON {data.vip_voucher_discount_pct}% OFF", voucher_title)],
            [Paragraph(
                f"Klaim diskon repeat order Anda dengan kode kupon: <b><font size=7 color='#B45309'>{data.vip_voucher_code}</font></b><br/>"
                f"Belanja langsung di Website Mandiri: <b>{data.activation_guide_url}</b><br/>"
                f"<font size=5 color='#92400E'>(Harga 10-15% lebih murah dibanding Shopee karena bebas biaya admin marketplace)</font>",
                voucher_desc
            )]
        ]
        voucher_table = Table(voucher_data, colWidths=[277])
        voucher_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_GOLD_BG),
            ('BOX', (0, 0), (-1, -1), 1, COLOR_GOLD),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#FCD34D")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(voucher_table)
        story.append(Spacer(1, 4))

        # =========================================================================
        # 5. FOOTER & AUTHENTICATION WATERMARK
        # =========================================================================
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=2))
        story.append(Paragraph(
            f"Akshara Gaming Center Support WA: {data.support_wa} | Keamanan Lisensi Dijamin 100% Legal & Aman<br/>"
            f"Dokumen Resmi Terbitan Sistem Otonom Akshara • All Rights Reserved", 
            footer_text
        ))

        # Render PDF
        doc.build(story)
        return file_path
