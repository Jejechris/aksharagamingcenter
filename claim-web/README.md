# Akshara Claim Vault — Portal Klaim Lisensi & Kredensial Digital

> **Website Ke-2 (Customer Portal)** terpisah dari domain manajemen utama. Berfungsi sebagai brankas aman bagi pembeli Shopee untuk mengambil data akun/CDKey game bergaransi dengan perlindungan **Passcode PIN** dan audit forensik digital anti-curang.

---

## 🌟 Fitur Utama

1. **Autentikasi Ganda (Kode Klaim + Passcode PIN):**
   - Hanya pembeli sah yang memiliki Passcode PIN rahasia dari chat Shopee yang dapat membuka kredensial.
   - Melindungi lisensi dari penyalahgunaan URL acak atau akses tanpa izin.

2. **Deteksi Forensik IP & Device:**
   - Saat kredensial dibuka, sistem mencatat waktu presisi (WIB), alamat IP publik pembeli, dan User-Agent perangkat.
   - Mencegah penipuan klaim sepihak seperti *"akun belum pernah saya buka"* atau *"akun tidak bisa login padahal sudah dibuka pembeli"*.

3. **Notifikasi Telegram Real-Time ke Penjual:**
   - Bot Telegram otomatis mengirimkan notifikasi audit forensik ke smartphone Senna saat pembeli menekan tombol buka kredensial.
   - Format pesan mencantumkan IP, waktu, data game, dan konfirmasi validitas PIN.

4. **SOP Video Unboxing Non-Stop (No-Cut):**
   - Pembeli diwajibkan mencentang persetujuan SOP perekaman video unboxing tanpa jeda sebelum kredensial ditampilkan.
   - Menjadi dasar hukum resmi toko untuk klaim garansi 30 hari.

---

## 🚀 Panduan Deploy ke Vercel

1. Buka dashboard [Vercel](https://vercel.com) dan klik **Add New > Project**.
2. Hubungkan repository GitHub: `https://github.com/Jejechris/claimakshara`.
3. Framework Preset: **Next.js** (Root Directory: `./`).
4. Set Environment Variables di Vercel:
   - `TELEGRAM_BOT_TOKEN`: Token bot Telegram Anda.
   - `TELEGRAM_ADMIN_CHAT_ID`: Chat ID Telegram admin (e.g. didapat via @userinfobot).
5. Klik **Deploy**. Website akan langsung aktif (misalnya `https://claimakshara.vercel.app`).

---

## 🛠️ Menjalankan Lokal

```bash
# Masuk ke folder proyek
cd claim-web

# Install dependencies
npm install

# Jalankan server development
npm run dev
```

Buka browser di `http://localhost:3000`.

---

## 🔒 Struktur Data

Data klaim tersimpan pada `data/claimed_credentials.json` dengan skema:
- `claim_code`: Kode unik (misal `AKSH-9921-MC`)
- `passcode`: PIN 6-digit rahasia (misal `882194`)
- `buyer_username`: Username pembeli Shopee
- `product_title`: Judul game / produk
- `platform`: PC / Steam Key / Microsoft Account
- `credential_data`: Informasi login / serial key
- `warranty_days`: Durasi garansi (default 30 hari)
- `status`: `UNCLAIMED` | `REVEALED`
- `revealed_at`, `revealed_ip`, `reveal_history`
