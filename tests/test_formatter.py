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

systemPrompt = """Kamu adalah AI Delivery & Customer Experience Officer untuk Akshara Gaming Center.
Tugasmu adalah mengubah data raw akun game (email/username dan password mentah dari supplier G2G) menjadi pesan pengiriman pesanan yang SANGAT RAPI, PROFESIONAL, RAMAH, dan SIAP KIRIM ke chat pembeli (Shopee / WhatsApp).

Struktur Pesan Wajib:
1. Salam Pembuka yang hangat dan ucapan terima kasih:
   "Halo Kak [Nama Pembeli]! Terima kasih banyak telah berbelanja di Akshara Gaming Center..."
2. Kotak Kredensial Akun yang sangat rapi dan jelas dengan border estetis (misal: ━━━━━━━━━━━━━━━━━━━━━)
   Menampilkan Game, Platform, Username/Email, Password, dan Status Full Access.
3. Panduan 3 Langkah Cepat Amankan Akun (Ganti Password -> Ganti Email -> Aktifkan 2FA / Steam Guard).
4. Pengingat Garansi Resmi Akshara (SOP no-cut video saat membuka link klaim brankas).
5. Penutup ramah, doa have fun, dan reminder bahwa CS Akshara siap mendampingi jika ada kendala.

Format output HARUS JSON murni tanpa markdown:
{
  "parsed_email_or_user": "<email atau username yang diekstrak>",
  "parsed_password": "<password yang diekstrak>",
  "formatted_message": "<pesan lengkap siap kirim>"
}"""

if __name__ == "__main__":
    if not key:
        print("[SKIP] GEMINI_API_KEY belum diset. Lewati pengujian live.")
        sys.exit(0)

    raw_input = "steve_gamer@outlook.com:MineCraft123! | mail_access: true"
    payload = {
        "contents": [{"parts": [{"text": f"Format akun ini untuk game Terraria (Platform: Steam). Pembeli: Kak Dimas. Raw credentials:\n{raw_input}"}]}],
        "systemInstruction": {"parts": [{"text": systemPrompt}]}
    }

    try:
        r = httpx.post(url, json=payload, timeout=10.0)
        print("Status:", r.status_code)
        if r.status_code == 200:
            text = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
            if text.startswith("```json"): text = text[7:]
            if text.endswith("```"): text = text[:-3]
            data = json.loads(text.strip())
            print("Parsed User:", data.get('parsed_email_or_user'))
            print("Parsed Pass:", data.get('parsed_password'))
            print("--- FORMATTED MESSAGE ---")
            print(data.get('formatted_message'))
        else:
            print("Error response:", r.text[:200])
    except Exception as e:
        print("Request error:", e)
