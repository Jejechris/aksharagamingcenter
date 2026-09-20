import httpx
import json

key = 'AQ.Ab8RN6JJaaf2otbjX9Ppo22_tDfUsB9_6S6q7uEEnoDJLFPpTw'
url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={key}'

systemPrompt = """Kamu adalah AI Delivery & Customer Experience Officer untuk Akshara Gaming Center.
Tugasmu adalah mengubah data raw akun game (email/username dan password mentah dari supplier G2G) menjadi pesan pengiriman pesanan yang SANGAT RAPI, PROFESIONAL, RAMAH, dan SIAP KIRIM ke chat pembeli (Shopee / WhatsApp).

Struktur Pesan Wajib:
1. Salam Pembuka yang hangat dan ucapan terima kasih:
   "Halo Kak [Nama Pembeli]! Terima kasih banyak telah berbelanja di Akshara Gaming Center..."
2. Kotak Kredensial Akun yang sangat rapi dan jelas dengan border estetis (misal: ━━━━━━━━━━━━━━━━━━━━━)
   Menampilkan Game, Platform, Username/Email, Password, dan Status Full Access.
3. Panduan 3 Langkah Cepat Amankan Akun (Ganti Password -> Ganti Email -> Aktifkan 2FA / Steam Guard).
4. Pengingat Garansi Resmi Akshara (SOP no-cut video unboxing dan simpan Kartu Garansi Fisik A6).
5. Penutup ramah, doa have fun, dan reminder bahwa CS Akshara siap mendampingi jika ada kendala.

Format output HARUS JSON murni tanpa markdown:
{
  "parsed_email_or_user": "<email atau username yang diekstrak>",
  "parsed_password": "<password yang diekstrak>",
  "formatted_message": "<pesan lengkap siap kirim>"
}"""

raw_input = "steve_gamer@outlook.com:MineCraft123! | mail_access: true"
payload = {
    "contents": [{"parts": [{"text": f"Format akun ini untuk game Terraria (Platform: Steam). Pembeli: Kak Dimas. Raw credentials:\n{raw_input}"}]}],
    "systemInstruction": {"parts": [{"text": systemPrompt}]}
}

r = httpx.post(url, json=payload, timeout=10.0)
print("Status:", r.status_code)
text = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
if text.startswith("```json"): text = text[7:]
if text.endswith("```"): text = text[:-3]
data = json.loads(text.strip())
print("Parsed User:", data.get('parsed_email_or_user'))
print("Parsed Pass:", data.get('parsed_password'))
print("--- FORMATTED MESSAGE ---")
print(data.get('formatted_message'))
