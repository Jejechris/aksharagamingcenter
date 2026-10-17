# 🛰️ AKSHARA GAMING CENTER — SYSTEM CONTEXT & HANDOVER DOSSIER

> **DOKUMEN RESMI SERAH TERIMA SISTEM KEPADA AI AGENT BARU / DEVELOPER BARU**  
> *Tanggal Dibuat:* 07 Oktober 2026  
> *Repository Utama:* [https://github.com/Jejechris/aksharagamingcenter.git](https://github.com/Jejechris/aksharagamingcenter.git)  
> *Secondary Claim Repo:* [https://github.com/Jejechris/claimakshara.git](https://github.com/Jejechris/claimakshara.git)  
> *Admin Telegram Chat ID:* `process.env.TELEGRAM_ADMIN_CHAT_ID`  
> *Production Web Deck:* `https://asksharagaming.vercel.app`  
> *Production Claim Vault:* `https://claimakshara.vercel.app`  

---

## ⚡ PETUNJUK KHUSUS UNTUK AI AGENT DI DEVICE BARU (READ THIS FIRST!)

Halo Agent! Anda menerima dokumen ini karena Anda baru saja diinisialisasi pada perangkat kerja baru Senna. Tugas utama Anda adalah **melanjutkan pengembangan tanpa kehilangan konteks operasional sedikit pun**, menjaga integritas data, dan memastikan semua layanan bekerja sinkron.

### 📋 Checklist Segera (Lakukan Langkah-Langkah Ini Saat Pertama Kali Aktif):
1. **Clone Monorepo Utama:**
   ```bash
   git clone https://github.com/Jejechris/aksharagamingcenter.git
   cd aksharagamingcenter
   ```
2. **Setup Python Virtual Environment & Install Dependencies:**
   ```bash
   python -m venv venv
   # Di Windows:
   .\venv\Scripts\activate
   # Di Linux/Mac:
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Setup Website Command Center (Port 3000):**
   ```bash
   cd web
   npm install
   npm run build
   ```
4. **Setup Website Customer Claim Portal (Port 3001):**
   ```bash
   cd ../claim-web
   npm install
   npm run build
   ```
5. **Buat File Konfigurasi `.env` & `.env.local`** sesuai panduan kredensial di Bab 3.
6. **Validasi Layanan:**
   - Jalankan `npm run dev` di `web` (`http://localhost:3000`)
   - Jalankan `npm run dev` di `claim-web` (`http://localhost:3001`)
   - Jalankan `python run_telegram_bot.py` di root untuk mengetes koneksi bot Telegram.

---

## 1. 🏢 PROFIL BISNIS & ARSITEKTUR JIT (JUST-IN-TIME)

**Akshara Gaming Center** adalah ekosistem otomatisasi bisnis penjualan lisensi game digital (Steam, Microsoft/Xbox, EA, Rockstar, GOG) di marketplace Indonesia (Shopee) dengan prinsip **Zero Dead-Stock Arbitrage**:
1. **Sourcing Tanpa Modal Menumpuk:** Kami tidak menyimpan stok akun basi. Saat pesanan Shopee masuk, sistem membeli lisensi secara *real-time* dari supplier terverifikasi di **G2G SLS API** atau membeli kode CDKey resmi di **Eneba** (0% risiko hackback, aktivasi langsung di akun pribadi pembeli).
2. **Pengiriman Fisik + Digital (Bypass Shopee Non-Fisik):** Karena Shopee Indonesia membatasi produk non-fisik, kami mengirimkan amplop fisik resmi berisi **Kartu Garansi A6 Ber-hologram/QR Code** ke alamat pembeli, sementara lisensi game dapat langsung diklaim secara instan melalui **Portal Brankas Klaim**.
3. **Garansi 30 Hari & Proteksi Anti-Fraud:** Syarat mutlak klaim garansi adalah rekaman **Video Unboxing Tanpa Putus (No-Cut)** sejak amplop fisik dibuka hingga login/redeem kode. Klaim tanpa video no-cut otomatis ditolak oleh AI Triage.

---

## 2. 🗂️ STRUKTUR DIREKTORI REPOSITORY (MONOREPO)

```text
aksharagamingcenter/
├── .github/
│   └── workflows/
│       └── market-sentry-cron.yml       # GitHub Actions 24/7 (Audit stok tiap 15 menit via cloud)
├── bot/                                 # Modul Telegram Commander & Daemon
│   ├── telegram_commander.py            # 1,200+ baris: Interactive Wizard, Inline Menus, Alerts
│   ├── market_sentry.py                 # Realtime stock scanner (G2G SLS & Eneba resolver)
│   ├── canvas_drawer.py                 # Engine perender gambar Cover Shopee 1080x1080
│   ├── eneba_data.py                    # Static catalog database Eneba
│   └── formatter_data.py                # Template delivery Shopee
├── claim-web/                           # NEXT.JS APP #1: Customer Claim Vault (claimakshara.vercel.app)
│   ├── app/
│   │   ├── page.tsx                     # Landing page pencarian klaim & panduan SOP
│   │   ├── claim/[code]/page.tsx        # Portal interaktif ganda (Kode + Passcode PIN)
│   │   ├── api/verify/route.ts          # Endpoint verifikasi kode klaim
│   │   └── api/reveal/route.ts          # Endpoint buka kredensial + log IP & alert Telegram
│   ├── data/
│   │   └── claimed_credentials.json     # Database klaim lokal/backup
│   └── package.json                     # Port default: 3001
├── web/                                 # NEXT.JS APP #2: Operations Command Center (asksharagaming.vercel.app)
│   ├── app/
│   │   ├── page.tsx                     # Overview personal dashboard
│   │   ├── dashboard/
│   │   │   ├── page.tsx                 # Command Deck & 5 Divisi Bento Grid
│   │   │   ├── catalog/page.tsx         # Radar Katalog (13+ Games, Smart Merge)
│   │   │   ├── stock/page.tsx           # Live Stock Inspector (G2G SLS API Real-Time)
│   │   │   ├── research/page.tsx        # Opportunities Hunter & AI Sourcing
│   │   │   ├── eneba/page.tsx           # Terminal Khusus Eneba CDKey (QRIS/DANA ready)
│   │   │   ├── quant/page.tsx           # Divisi 1: Simulator Profit & BEP
│   │   │   ├── risk/page.tsx            # Divisi 2: Supplier Audit & Fraud Radar
│   │   │   ├── operator/page.tsx        # Divisi 3: Buku Kas & Ledger Keuangan
│   │   │   ├── marketer/page.tsx        # Divisi 4: Desain Kartu A6 & Voucher
│   │   │   ├── support/page.tsx         # Divisi 5: AI Warranty Triage & SOP
│   │   │   ├── description/page.tsx     # Shopee Listing SEO & 1080p Canvas Generator
│   │   │   ├── formatter/page.tsx       # Shopee Delivery Formatter
│   │   │   ├── claims/page.tsx          # Token Klaim Manager & Audit Forensik
│   │   │   ├── autonomous/page.tsx      # Autonomous Daemon Pipeline
│   │   │   ├── bot/page.tsx             # Bot Telegram Status & Control
│   │   │   └── health/page.tsx          # Diagnostik Sistem & Server
│   │   └── api/                         # 20+ API Endpoints (Catalog, Sentry, Webhook, AI, etc.)
│   ├── data/
│   │   ├── active_catalog.json          # Master Authoritative Catalog (G2G + Eneba)
│   │   └── starter_catalog_backup.json  # Fail-safe backup
│   ├── lib/
│   │   ├── catalog.ts                   # Core Catalog Engine & Smart Merge Sync
│   │   ├── g2g.ts                       # G2G Category, Seller, & Dead-Offer Rerouter
│   │   ├── g2gStock.ts                  # Direct G2G SLS API Parser
│   │   └── eneba.ts                     # Eneba Search & Direct URL Resolver
│   └── package.json                     # Port default: 3000
├── divisi_1_quant/                      # Modul Python: Profit Engine
├── divisi_2_risk/                       # Modul Python: Supplier Scraper & Filter
├── divisi_3_marketer/                   # Modul Python: Generator Kartu A6 PDF
├── divisi_4_operator/                   # Modul Python: Order Queue & Ledger
├── divisi_5_support/                    # Modul Python: AI Triage Decision Tree
├── output/                              # Output JSON, PDF sertifikat, dan log
├── config.py                            # Pydantic configuration loader
├── run_telegram_bot.py                  # Local Python Bot launcher
├── run_bot.bat                          # One-click Windows runner untuk bot
├── run_sentry_daemon.bat                # One-click Windows runner untuk Sentry
├── run_web.ps1                          # One-click PowerShell web runner
├── requirements.txt                     # Daftar paket Python pip
└── AKSHARA_PROJECT_CONTEXT_HANDOVER.md  # File ini
```

---

## 3. 🔑 KREDENSIAL & ENVIRONMENT VARIABLES

Semua environment variables telah terkonfigurasi pada file `.env` di lingkungan live. Berikut adalah file yang harus Anda buat di device baru jika tidak terbawa oleh git:

### A. Root `.env` (Untuk Python, Bot, IMAP & Financial Engine)
Path: `aksharagamingcenter/.env`
```env
# AKSHARA GAMING CENTER - LIVE ENVIRONMENT CONFIGURATION

# Telegram Bot HITL (Human-in-the-Loop)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_ADMIN_CHAT_ID=your_telegram_admin_chat_id_here

# Shopee Email Listener (IMAP Gmail Resmi Akshara)
IMAP_SERVER=imap.gmail.com
IMAP_PORT=993
IMAP_EMAIL=your_email@gmail.com
IMAP_APP_PASSWORD=your_app_password

# Google Gemini AI Integration (Default: gemini-3.5-flash-lite)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_DEFAULT_MODEL=gemini-3.5-flash-lite

# Financial Defaults
DEFAULT_USD_IDR_RATE=16350.0
DEFAULT_CARD_FX_FEE_PCT=2.0
DEFAULT_SHOPEE_ADMIN_FEE_PCT=8.0
DEFAULT_SHOPEE_FIXED_FEE_IDR=1000.0
DEFAULT_PACKAGING_COST_IDR=2000.0
DEFAULT_TARGET_NET_MARGIN_PCT=25.0
```

### B. Web App `.env.local` (Command Center)
Path: `aksharagamingcenter/web/.env.local`
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_DEFAULT_MODEL=gemini-3.5-flash-lite
NEXT_PUBLIC_AI_MODEL=gemini-3.5-flash-lite
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_ADMIN_CHAT_ID=your_telegram_admin_chat_id_here
```

### C. Claim Vault `.env.local` (Customer Portal)
Path: `aksharagamingcenter/claim-web/.env.local`
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_ADMIN_CHAT_ID=your_telegram_admin_chat_id_here
NEXT_PUBLIC_SITE_NAME="Akshara Digital License Vault"
```

---

## 4. 🧠 BUSINESS LOGIC & ARSITEKTUR 5 DIVISI OTONOM

### Divisi 1: The Quant (Kalkulator Arbitrase & Margin)
- **Rumus Margin Shopee:**
  $$\text{COGS Net} = \text{Modal Beli (G2G/Eneba)} + \text{QRIS Fee (0.7\%)}$$
  $$\text{Potongan Shopee} = (\text{Harga Jual Shopee} \times 8\%) + \text{Rp } 1.000$$
  $$\text{Biaya Kemasan} = \text{Rp } 2.000 \text{ (Amplop cokelat + Print Kartu A6)}$$
  $$\text{Total Biaya} = \text{COGS Net} + \text{Potongan Shopee} + \text{Biaya Kemasan}$$
  $$\text{Profit Bersih} = \text{Harga Jual} - \text{Total Biaya}$$
  $$\text{Margin Bersih} = \left(\frac{\text{Profit Bersih}}{\text{Harga Jual}}\right) \times 100\%$$
- **Break-Even Price (BEP):**
  $$\text{BEP} = \left\lceil \frac{\text{COGS Net} + 1.000 + 2.000}{1 - 0.08} \right\rceil$$

### Divisi 2: The Risk Officer (Audit Supplier & Anti-Hackback)
- **4 Filter Ketat Supplier G2G:**
  1. *Rating Toko:* Wajib $\ge 98.0\%$
  2. *Total Ulasan:* Wajib $\ge 5.000$ transaksi
  3. *Metode Pengiriman:* Wajib *Instant Delivery* (0 detik via sistem API)
  4. *Akses Akun:* Wajib *Full Access* (bisa ganti email dan password sendiri oleh pembeli)
- **Sourcing Eneba CDKey:** 100% aman (0% hackback) karena berupa kode redeem aktivasi permanen di akun pribadi pembeli.

### Divisi 3: The Operator (Buku Kas & Antrean Pesanan)
- Mengelola data transaksi riil dari `financial_ledger.json`.
- Menghitung Gross Merchandise Value (GMV), total laba bersih berjalan, dan progres menuju target omzet bulanan.

### Divisi 4: The Marketer (Kartu Garansi A6 & Voucher)
- Menghasilkan desain kartu fisik ukuran A6 (105 x 148 mm, Art Carton 260gsm) siap cetak dengan QR Code unik mengarah ke `https://claimakshara.vercel.app/claim/{claim_code}`.
- Mengelola kupon diskon Shopee: `AKSHARA-VIP15` (Diskon 15%), `AKSHARA-MEMBER10` (Diskon 10%).

### Divisi 5: The Support (AI Warranty Triage & Customer Care)
- **Pohon Keputusan Komplain (Decision Tree):**
  - Komplain masuk $\rightarrow$ Cek Video Unboxing No-Cut:
    - *TIDAK ADA:* Otomatis **DITOLAK** (`REJECTED_NO_UNCUT_VIDEO`). Kirim pesan edukasi SOP.
    - *VIDEO DIEDIT/TERPOTONG:* **DITOLAK** (`REJECTED_VIDEO_EDITED`). Minta video utuh tanpa edit.
    - *ADA VIDEO VALID & MENUNJUKKAN MASALAH:* **DISETUJUI** (`APPROVED_FOR_REPLACEMENT`). Otomatis sediakan akun/key pengganti dari G2G/Eneba.

---

## 5. 🛠️ DETAIL TEKNIS FITUR TERBARU & SOLUSI BUG KRITIS

### A. Smart Catalog Merging (Anti-Data Hilang di Vercel)
- **Masalah Lama:** Vercel serverless filesystem beroperasi di lingkungan *read-only* (`EROFS`). Setiap kali halaman `/dashboard/catalog` dimuat, server mengembalikan 6 game bawaan dan menimpa `localStorage`, menyebabkan game Eneba/kustom yang baru ditambahkan hilang.
- **Solusi Terpasang:** 
  1. `web/data/active_catalog.json` kini dibundel permanen dengan **13 game** (6 Akun G2G + 7 Eneba CDKey: Project Zomboid, Stardew Valley, Hollow Knight, Don't Starve Together, Cyberpunk 2077, Terraria Key, Minecraft Key).
  2. Fungsi `fetchCatalog()` di `web/app/dashboard/catalog/page.tsx` menggunakan algoritma **Smart Merge**: menggabungkan data server dengan data `localStorage` (union map). Data lokal kustom **TIDAK PERNAH DIHAPUS**.
  3. Pencocokan katalog membedakan `category` sehingga game CDKey tidak bertabrakan dengan akun Full Access.

### B. Link Produk Terverifikasi & Anti-404 di Telegram
- **Masalah Lama:** Notifikasi Telegram menampilkan *"listing telah tidak ada atau dihapus"* karena fallback URL menghasilkan `https://www.g2g.com/offer/` tanpa ID atau menggunakan offer yang sudah delisted.
- **Solusi Terpasang:**
  1. Untuk produk **Eneba**, URL selalu dialihkan ke format pencarian merchant resmi:
     `https://www.eneba.com/store/all?text=<clean_title>` (HTTP 200, bebas 404, langsung menampilkan harga termurah dari semua seller aktif).
  2. Untuk produk **G2G**, fungsi `resolveG2GProductUrl` di `web/lib/g2g.ts` dan `bot/market_sentry.py` mendeteksi dead offer secara otomatis dan me-reroute ke live replacement atau etalase kategori.

### C. Wizard Token Klaim & Passcode Interaktif (Anti-Duplikasi)
- **Alur Kerja:**
  1. Seller menjalankan `/claim` di Telegram. Bot memandu memilih game dan username pembeli.
  2. Sistem menghasilkan kode klaim `AKSH-XXXX-YY` dan **Passcode PIN 6-digit acak** (misal `849201`).
  3. PIN diverifikasi agar tidak bertumpuk dengan transaksi lain.
  4. Pembeli membuka link di `https://claimakshara.vercel.app/claim/{code}`.
  5. Pembeli memasukkan Passcode PIN dan mencentang persetujuan video unboxing.
  6. Saat tombol *"Buka Kredensial"* ditekan:
     - Kredensial ditampilkan.
     - Sistem mencatat IP publik, User-Agent, dan jam WIB pembeli.
     - Bot Telegram langsung mengirimkan notifikasi audit forensik ke smartphone Senna!

### D. Generator Listing Shopee & Cover 1080x1080 (`/dashboard/description`)
- Menghasilkan:
  1. **Judul SEO Shopee** (Maksimal 120 karakter, mematuhi standar Shopee: *Merek + Model + Spesifikasi + Kata Kunci*).
  2. **Deskripsi Shopee Siap Copas** lengkap dengan fitur, cara klaim garansi, dan SOP unboxing.
  3. **Canvas Visual 1080x1080** dengan pilihan badge: *GARANSI 30 HARI*, *0% HACKBACK*, *INSTANT REDEEM*, *FULL ACCESS*, *ORIGINAL GLOBAL KEY*. Bisa di-export ke PNG atau SVG.

---

## 6. 🤖 BOT TELEGRAM & AUTOMATION DAEMON

### Command Lengkap Bot Telegram (`@aksharagamingbot`):
| Perintah | Deskripsi & Contoh |
| :--- | :--- |
| `/menu` atau `/start` | Membuka menu navigasi interaktif dengan inline keyboard buttons |
| `/stock` | Laporan live stock real-time dari server G2G SLS API dan Eneba CDKey |
| `/eneba <game>` | Scan live peluang arbitrase CDKey Eneba (Contoh: `/eneba zomboid`) |
| `/g2g <offer_id>` | Inspeksi mendalam offer G2G (Contoh: `/g2g G1703129821471UK`) |
| `/claim` | Wizard interaktif pembuatan token klaim dan generate passcode PIN |
| `/claims` | Menampilkan daftar seluruh token klaim aktif dan status bukanya |
| `/cek <kode_klaim>` | Cek status klaim tertentu (Contoh: `/cek AKSH-9921-MC`) |
| `/shopee <game>` | Generator instan judul SEO, deskripsi, dan rekomendasi cover Shopee |
| `/format <game> \| <buyer> \| <key>` | Buat format pengiriman pesanan resmi Shopee siap kirim ke chat |
| `/quant <jual> <modal>` | Simulasi profit instan (Contoh: `/quant 219000 135000`) |
| `/briefing` | Ringkasan operasional harian, kurs FX, dan checklist toko |

### Mode Operasional Bot (Dual Mode):
1. **Mode Cloud 24/7 (Vercel Webhook):**
   - URL Webhook: `https://asksharagaming.vercel.app/api/telegram/webhook`
   - Beroperasi 24 jam nonstop tanpa perlu laptop Senna menyala.
   - Pengecekan stok berkala dijalankan oleh GitHub Actions cron (`market-sentry-cron.yml`) setiap 15 menit.
2. **Mode Workstation Lokal (Polling):**
   - Dijalankan via `run_bot.bat` atau `python run_telegram_bot.py`.
   - Menggunakan async long-polling untuk respons latensi rendah saat Senna sedang bekerja di depan workstation.

---

## 7. 🚀 PANDUAN RUNNING & PENGUJIAN DI PERANGKAT BARU

### A. Menjalankan Website Command Center
```bash
cd web
npm install
npm run dev
# Buka browser di http://localhost:3000
```

### B. Menjalankan Customer Claim Vault
```bash
cd claim-web
npm install
npm run dev
# Buka browser di http://localhost:3001
```

### C. Menjalankan Python Telegram Bot & Sentry
```bash
pip install -r requirements.txt
python run_telegram_bot.py
```

### D. Melakukan Build & Verifikasi Produksi
```bash
# Uji build web utama
cd web
npm run build

# Uji build claim web
cd ../claim-web
npm run build
```

---

## 8. 🛡️ ATURAN KERJA & KOMITMEN PENGEMBANGAN (RULES FOR AI AGENT)

1. **Jaga Integritas Data Katalog:** Jangan pernah membuat kode yang menimpa `localStorage` secara membabi buta. Selalu gunakan pola *Smart Merge*.
2. **Anti-Broken Link:** Setiap kali membuat link produk untuk Telegram atau dashboard, pastikan URL mengarah ke domain valid (format `https://www.eneba.com/store/all?text=...` untuk Eneba, dan `resolveG2GProductUrl` untuk G2G).
3. **Desain UI Konsisten:** Gunakan design tokens yang sudah ada: `v0-card`, `v0-btn-primary`, `v0-btn-secondary`, palet Tailwind `zinc` (dark mode neutral), aksen `emerald` (sukses/profit), `violet` (Eneba), dan `amber` (peringatan).
4. **Git Sync Disiplin:** Setelah melakukan perubahan, selalu pastikan build lulus (`npm run build`), lalu commit dan push ke `origin main`. Jika ada folder replika, sinkronkan juga.
5. **Human-in-the-Loop Safe:** Bot Telegram dan sistem otomatisasi dirancang untuk mempercepat pekerjaan Senna, bukan menggantikannya tanpa pengawasan. Notifikasi kritis harus selalu dikirim ke admin Telegram (`TELEGRAM_ADMIN_CHAT_ID`).

---
*Dokumen ini adalah ringkasan arsitektur final dan terverifikasi dari Akshara Gaming Center. Selamat bekerja di workstation baru!* 🚀
