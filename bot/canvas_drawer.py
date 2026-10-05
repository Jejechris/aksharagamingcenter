"""
Akshara Gaming Center - Automated Image Canvas & Shopee Thumbnail Generator
Generates high-resolution 1080x1080 px product graphics for Shopee listings.
"""

import io
import math
from typing import List, Optional
from PIL import Image, ImageDraw, ImageFont, ImageFilter


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Mengambil font dari sistem Windows dengan fallback aman."""
    font_names = ["arialbd.ttf" if bold else "arial.ttf", "segoeuib.ttf" if bold else "segoeui.ttf", "tahoma.ttf"]
    for font_name in font_names:
        try:
            return ImageFont.truetype(font_name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def generate_game_canvas(
    game_title: str,
    platform: str = "PC / STEAM KEY",
    price_str: Optional[str] = None,
    tagline: str = "OFFICIAL DIGITAL LICENSE • 100% ORIGINAL",
    features: Optional[List[str]] = None,
    theme_color: str = "violet"  # 'violet', 'emerald', 'amber', 'cyan'
) -> io.BytesIO:
    """
    Men-generate gambar 1080x1080 pixel dengan desain Dark Tech Akshara Gaming.
    Mengembalikan objek io.BytesIO berformat PNG.
    """
    width, height = 1080, 1080
    img = Image.new("RGBA", (width, height), (9, 9, 11, 255))  # Zinc-950
    draw = ImageDraw.Draw(img)

    # Palet Warna Berdasarkan Tema
    palettes = {
        "violet": {
            "primary": (139, 92, 246),      # Violet-500
            "primary_glow": (109, 40, 217), # Violet-700
            "accent": (216, 180, 254),      # Violet-300
            "gradient_top": (26, 16, 44),
        },
        "emerald": {
            "primary": (16, 185, 129),      # Emerald-500
            "primary_glow": (4, 120, 87),   # Emerald-700
            "accent": (167, 243, 208),      # Emerald-200
            "gradient_top": (10, 36, 26),
        },
        "cyan": {
            "primary": (6, 182, 212),       # Cyan-500
            "primary_glow": (14, 116, 144), # Cyan-700
            "accent": (165, 243, 252),      # Cyan-200
            "gradient_top": (12, 34, 46),
        },
        "amber": {
            "primary": (245, 158, 11),      # Amber-500
            "primary_glow": (180, 83, 9),   # Amber-700
            "accent": (253, 230, 138),      # Amber-200
            "gradient_top": (42, 28, 10),
        }
    }
    pal = palettes.get(theme_color, palettes["violet"])

    # 1. Subtle Background Vertical Gradient
    for y in range(height):
        ratio = y / height
        r = int(pal["gradient_top"][0] * (1 - ratio) + 9 * ratio)
        g = int(pal["gradient_top"][1] * (1 - ratio) + 9 * ratio)
        b = int(pal["gradient_top"][2] * (1 - ratio) + 11 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # 2. Modern Grid Dot Pattern (Engineering Aesthetic)
    dot_color = (255, 255, 255, 15)
    for gx in range(40, width - 40, 60):
        for gy in range(40, height - 40, 60):
            draw.ellipse([(gx - 1, gy - 1), (gx + 1, gy + 1)], fill=dot_color)

    # 3. Outer Glowing Double Frame
    # Outer Border
    draw.rounded_rectangle([(30, 30), (width - 30, height - 30)], radius=36, outline=(255, 255, 255, 30), width=2)
    # Inner Neon Border
    draw.rounded_rectangle([(44, 44), (width - 44, height - 44)], radius=28, outline=(*pal["primary"], 120), width=3)

    # Corner Decorative Tech Brackets
    c_len = 36
    for cx, cy in [(44, 44), (width - 44, 44), (44, height - 44), (width - 44, height - 44)]:
        dx = 1 if cx == 44 else -1
        dy = 1 if cy == 44 else -1
        draw.line([(cx, cy), (cx + dx * c_len, cy)], fill=pal["accent"], width=5)
        draw.line([(cx, cy), (cx, cy + dy * c_len)], fill=pal["accent"], width=5)

    # 4. Header Bar: Brand Name & Shield Badge
    font_brand = get_font(32, bold=True)
    font_sub_brand = get_font(18, bold=False)
    
    brand_text = "AKSHARA GAMING CENTER"
    draw.text((80, 80), brand_text, fill=(255, 255, 255), font=font_brand)
    draw.text((80, 122), tagline, fill=(161, 161, 170), font=font_sub_brand)

    # Verified Official Badge (Top Right)
    badge_x = width - 360
    draw.rounded_rectangle([(badge_x, 80), (width - 80, 140)], radius=18, fill=(*pal["primary"], 40), outline=(*pal["primary"], 160), width=2)
    font_badge = get_font(20, bold=True)
    draw.text((badge_x + 22, 98), "OFFICIAL VERIFIED", fill=pal["accent"], font=font_badge)

    # 5. Platform Pill Badge
    font_plat = get_font(22, bold=True)
    plat_w = int(draw.textlength(platform, font=font_plat)) + 40
    plat_x = 80
    plat_y = 200
    draw.rounded_rectangle([(plat_x, plat_y), (plat_x + plat_w, plat_y + 46)], radius=12, fill=(39, 39, 42, 220), outline=(*pal["primary"], 180), width=2)
    draw.text((plat_x + 20, plat_y + 11), platform, fill=(244, 244, 245), font=font_plat)

    # 6. Hero Center: Game Title Block
    title_clean = game_title.upper()
    # Dynamic font sizing based on length
    if len(title_clean) > 28:
        title_font_size = 54
    elif len(title_clean) > 18:
        title_font_size = 66
    else:
        title_font_size = 80

    font_title = get_font(title_font_size, bold=True)

    # Word wrapping for title
    words = title_clean.split(" ")
    lines = []
    current_line = []
    for w in words:
        test_line = " ".join(current_line + [w])
        if draw.textlength(test_line, font=font_title) < (width - 180):
            current_line.append(w)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [w]
    if current_line:
        lines.append(" ".join(current_line))

    # Render title with shadow/glow
    title_y_start = 280
    for i, line in enumerate(lines):
        line_y = title_y_start + (i * (title_font_size + 14))
        # Drop shadow
        draw.text((82, line_y + 4), line, fill=(0, 0, 0, 200), font=font_title)
        # Main text
        draw.text((80, line_y), line, fill=(255, 255, 255), font=font_title)

    current_y = title_y_start + (len(lines) * (title_font_size + 14)) + 20

    # 7. Price Banner / Pill (If Provided)
    if price_str:
        font_price_label = get_font(20, bold=False)
        font_price = get_font(46, bold=True)
        draw.text((80, current_y), "HARGA RESMI PROMO:", fill=(161, 161, 170), font=font_price_label)
        draw.text((80, current_y + 26), price_str, fill=pal["accent"], font=font_price)
        current_y += 90

    # 8. Feature Badges (2x2 Bento Grid)
    default_features = [
        "100% Garansi Uang Kembali",
        "Pengiriman Otomatis 1-5 Menit",
        "0% Hackback Anti-Komplain",
        "Termasuk Kartu Garansi Fisik A6"
    ]
    feats = features or default_features
    grid_y = max(current_y + 20, 580)

    font_feat = get_font(24, bold=True)
    bento_w = 440
    bento_h = 100
    positions = [
        (80, grid_y),
        (560, grid_y),
        (80, grid_y + 120),
        (560, grid_y + 120)
    ]

    icons = ["[GARANSI]", "[INSTAN]", "[AMAN]", "[FISIK A6]"]

    for idx, feat in enumerate(feats[:4]):
        fx, fy = positions[idx]
        # Card Background
        draw.rounded_rectangle([(fx, fy), (fx + bento_w, fy + bento_h)], radius=18, fill=(24, 24, 27, 200), outline=(255, 255, 255, 25), width=2)
        # Left Accent Stripe
        draw.rounded_rectangle([(fx, fy), (fx + 8, fy + bento_h)], radius=4, fill=pal["primary"])
        # Text
        draw.text((fx + 26, fy + 18), icons[idx], fill=pal["accent"], font=get_font(18, bold=True))
        draw.text((fx + 26, fy + 48), feat, fill=(244, 244, 245), font=font_feat)

    # 9. Bottom Footer Bar
    footer_y = height - 120
    draw.line([(80, footer_y), (width - 80, footer_y)], fill=(255, 255, 255, 25), width=1)
    
    font_footer = get_font(20, bold=False)
    footer_text = "AKSHARA GAMING CENTER • LISENSI RESMI & LEGAL • ANTI FRAUD HITL"
    foot_w = draw.textlength(footer_text, font=font_footer)
    draw.text(((width - foot_w) // 2, footer_y + 30), footer_text, fill=(113, 113, 122), font=font_footer)

    # Export to BytesIO
    output = io.BytesIO()
    img.save(output, format="PNG", quality=95)
    output.seek(0)
    return output


if __name__ == "__main__":
    # Test script locally
    test_stream = generate_game_canvas(
        game_title="PROJECT ZOMBOID",
        platform="PC / STEAM KEY",
        price_str="Rp 149.000",
        theme_color="violet"
    )
    with open("test_canvas_sample.png", "wb") as f:
        f.write(test_stream.getvalue())
    print("Test canvas generated successfully: test_canvas_sample.png")
