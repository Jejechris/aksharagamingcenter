import os
import sys
import httpx
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

key = os.getenv("GEMINI_API_KEY", "")
if not key:
    env_file = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                if line.startswith("GEMINI_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={key}"

systemPrompt = """Kamu adalah Chief Quant & Gaming Market Analyst profesional untuk Akshara Gaming Center (toko game digital di Indonesia).
Tugasmu adalah memberikan estimasi harga modal g2g.com/id dan harga jual Shopee yang SANGAT AKURAT dan REALISTIS sesuai tier/kategori game:

PANDUAN HARGA PASAR INDONESIA & G2G:
1. Game Indie / Budget / Klasik (Terraria, Stardew Valley, Don't Starve, Hollow Knight, Among Us, Phasmophobia, Project Zomboid, Celeste, Cuphead, Garry's Mod, Payday 2, Left 4 Dead, dll):
   - Harga resmi Steam Indonesia hanya Rp 70.000 - Rp 140.000.
   - Modal kulakan di G2G.com/id (CDKey / Account): Rp 25.000 - Rp 50.000.
   - Harga jual Shopee ideal: Rp 39.900 - Rp 69.900 (JANGAN PERNAH jual game indie di atas Rp 89.000!).
2. Game AA / AAA Lawas / Populer (GTA V, The Witcher 3, RDR2, Monster Hunter World, Rust, Cyberpunk 2077, Resident Evil, Forza Horizon 4):
   - Modal G2G: Rp 60.000 - Rp 175.000.
   - Harga jual Shopee: Rp 89.900 - Rp 249.000.
3. Game AAA Baru / Rilis Baru (Black Myth Wukong, FC 25, MH Wilds, Space Marine 2, Elden Ring + DLC):
   - Modal G2G: Rp 220.000 - Rp 360.000.
   - Harga jual Shopee: Rp 329.900 - Rp 499.000.

Koreksi juga typo penulisan nama game jika ada (misal: 'terreria' -> 'Terraria', 'gtav' -> 'Grand Theft Auto V').

Format output HARUS JSON murni tanpa markdown:
{
  "corrected_title": "<Nama resmi game yang benar, misal Terraria>",
  "detected_platform": "<Steam | PC / Microsoft | EA App / PC | Rockstar / Steam | PlayStation 5 | Xbox Series X/S>",
  "category": "<Digital Key / CDKey | Account (Full Access) | Steam Gift>",
  "game_tier": "<Indie Budget | AAA Populer | AAA Rilis Baru>",
  "base_g2g_idr": <estimasi harga kulakan modal termurah di g2g.com/id dalam Rupiah, integer>,
  "recommended_selling_price_shopee_idr": <harga jual psikologis Shopee berakhiran 900 atau 500, integer>,
  "target_margin_pct": <target margin persen realistis 20-35, float>,
  "ai_pricing_reasoning": "<1-2 kalimat penjelasan logis penetapan harga>"
}"""

if __name__ == "__main__":
    if not key:
        print("[SKIP] GEMINI_API_KEY belum diset. Lewati pengujian live.")
        sys.exit(0)

    payload = {
        'contents': [{'parts': [{'text': 'Analisis produk game ini: "terreria"'}]}],
        'systemInstruction': {'parts': [{'text': systemPrompt}]}
    }
    try:
        r = httpx.post(url, json=payload, timeout=10.0)
        print('Status:', r.status_code)
        if r.status_code == 200:
            print('Output:', r.json()['candidates'][0]['content']['parts'][0]['text'])
        else:
            print('Error response:', r.text[:200])
    except Exception as e:
        print('Request error:', e)
