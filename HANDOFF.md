# Akshara Gaming Center — Multi-Device Handoff & Sync Guide

> **Canonical Handoff Document (Updated through FASE 22+ — Mobile Responsive, Anti-Hackback, Strict Guard, & Eneba Deep Discover)**  
> **Repository:** `https://github.com/Jejechris/aksharagamingcenter.git` (`main`)  
> **Legacy Reference:** [AKSHARA_PROJECT_CONTEXT_HANDOVER.md](./AKSHARA_PROJECT_CONTEXT_HANDOVER.md) *(arsip awal Oktober 2026 — gunakan dokumen ini sebagai status terbaru)*

---

## 1. Multi-Device Workflow (WAJIB Dibaca Sebelum Mulai Kerja)

Karena riwayat chat Antigravity tersimpan lokal di tiap perangkat (`~/.gemini/antigravity`), sinkronisasi antar perangkat dilakukan melalui **GitHub + dokumen ini**:

1. **Saat mulai sesi di perangkat mana pun:**
   ```bash
   git fetch origin
   git status -sb
   git rev-list --left-right --count origin/main...HEAD
   ```
   - Jika `origin/main` lebih baru, jalankan `git pull --rebase origin main` (atau review diff terlebih dahulu bila ada perubahan lokal).
   - Baca `HANDOFF.md` untuk menangkap status fase terakhir.
2. **Saat selesai sesi / sebelum pindah perangkat:**
   - Pastikan build dan pengecekan lulus (`tsc --noEmit`, `npm run build`, `py_compile`).
   - Perbarui bagian **Status Terkini** / **Next Steps** di `HANDOFF.md` jika ada perubahan arsitektur atau tugas menggantung.
   - Commit dan push ke `origin main` (jangan pernah commit `.env`, `.env.local`, `node_modules/`, atau `.next/`).

---

## 2. Arsitektur Monorepo & Modul Utama

- **`web/`** — Next.js 14 App Router Operations Command Center:
  - UI Design System: Clean Light Mode SaaS (`#F8FAFC`, `.app-card`, `Plus_Jakarta_Sans`, `JetBrains_Mono`, `tabular-nums`, tanpa `alert()`/`confirm()`).
  - **Sentry & Risk Hub (`/dashboard/stock-sentry`)**: Konsolidasi penuh antara pemantauan stok live (`Stock Sentry`) dan audit risiko/keamanan seller (`Risk Officer`).
    - Route redirect aktif: `/dashboard/risk-officer` -> `/dashboard/stock-sentry?tab=risk`, `/dashboard/risk` -> `/dashboard/stock-sentry?tab=risk`, `/dashboard/stock` -> `/dashboard/stock-sentry`.
  - **Catalog Radar (`/dashboard/catalog`) & Auto-Find Sellers (`/api/catalog/auto-find-sellers`)**: Smart Seller Finder langsung dari API live G2G SLS dengan filter anti-clickbait/price-floor, scoring reputasi, badge trust, serta filter `Hanya Seller Aman (≥ 95% & ≥ 20 Transaksi)`.
  - **Eneba CDKey Terminal (`/dashboard/eneba`)**: Filter region/platform dengan slug `drms[]` resmi Eneba yang sudah diverifikasi, resolver URL bebas-0-hasil (`web/lib/eneba.ts`), plus rating & trust tier badge.
  - **Shopee Launchpad & Mass Upload Studio (`/dashboard/shopee-launchpad`)**:
  - Mode 1 (**Wizard Satuan 4-Step**): `ThumbnailStudio` canvas 1080×1080 + judul SEO + SOP Pure Digital bebas URL + kalkulasi harga (`web/lib/pricing.ts`).
  - Mode 2 (**Batch Mass Upload `.xlsx`**): Terintegrasi di tab `Batch Mass Upload (.xlsx)` & shortcut `/dashboard/catalog`. Menghasilkan file Excel resmi Seller Centre 38 kolom (`ps_category|0|0`, signature `basic,32d05d7b1ef8cb794e3c2d4c91ae9cb8,0,1935832174`, sheet `Template` + `Kategori`, variasi garansi 30H/90H, serta mode Mass Update Harga & Stok).
  - **Shopee Strict Guard Mode (`web/lib/shopeeCompliance.ts`)**: Format judul simpel seragam 1:1 dengan Cover (`Judul Game (Platform) - Private / CD-Key`), tanpa `ALL CAPS`, tanpa kata spam promosi, deskripsi 100% teks alfanumerik polos **tanpa emoji & tanpa simbol dekoratif unik**, bebas link eksternal, bebas kata pemicu ban, dan auto-uncheck produk berisiko HAKI tinggi (`Windows`/`Office`/`Adobe`) di Mass Upload Studio.
  - **Public Image Hosting & Batch Renderer**: `web/lib/batchThumbnailRenderer.ts` merender Cover Slide 1 (full-bleed untuk square art seperti Minecraft + Ambient Blur bebas potong untuk poster portrait + warna border kurasi/histogram dominan + color picker + dog-ear peel + logo platform) & Slide 2 Rules, mengunggah ke `POST /api/shopee/host-media` (tersimpan di PostgreSQL `hosted_media` via `web/lib/mediaHost.ts` dengan **auto-overwrite per prefix game** + statistik & tombol `Bersihkan >30H` via `GET`/`DELETE /api/shopee/host-media`), dan dilayani publik tanpa auth di `GET /api/public/media/[filename]` (bypass di `web/middleware.ts`, default origin `https://asksharagaming.vercel.app`).
- **100% Pure Digital & Zero-Link Shopee QR Workflow**: Seluruh modul website (`web/`), Portal Publik (`claim-web/`), dan Bot Telegram/Marketer Python (`bot/canvas_drawer.py`, `bot/formatter_data.py`, `bot/telegram_commander.py`, `divisi_3_marketer/listing_copywriter.py`) telah disinkronkan 100% ke Pure Digital QR tanpa amplop/kartu A6 fisik. Pengiriman Shopee bebas tautan URL eksternal tersensor dan diganti dengan **Kartu Akses & Sertifikat Garansi Digital PNG ber-QR** (`web/lib/digitalWarrantyCard.ts`, tombol `Kartu QR` + `Chat Shopee` di `/dashboard/claims`).
- **Komparasi Kanal Penjualan (`Shopee` vs `Direct Storefront`)**: `/api/analytics` & `/dashboard/operator` menampilkan perbandingan omzet, fee marketplace, laba bersih, dan margin antara order **Shopee Marketplace** vs **Direct Storefront (0% Fee)**.
  - **Price & Incident Guard (`/dashboard/alerts`) & Notifikasi Global**: Antrean peringatan lonjakan harga supplier / diskon habis (`PRICE_SPIKE`, `DISCOUNT_ENDED`), stok habis (`STOCK_OUT`), auto-pause Storefront (`AUTO_PAUSED`), serta gangguan teknis (`TECH_INCIDENT`) via `web/lib/alerts.ts` & `/api/alerts`. Dilengkapi Lonceng Notifikasi real-time + banner peringatan di `SidebarLayout.tsx`, **Circuit Breaker Anti-Rugi** (auto-pause Storefront jika margin <5% tanpa backup di `/api/cron/sentry`), `1-Klik Update Harga & Aktifkan Storefront`, dan export Mass Update Shopee `.xlsx` khusus item terdampak.
  - **Tools Operasional**: `/dashboard/quant` (Kalkulator Margin/BEP, biaya packaging digital `Rp 0`), `/dashboard/description`, `/dashboard/formatter`, `/dashboard/research`, `/dashboard/claims`, `/dashboard/autonomous`, `/dashboard/bot`, `/dashboard/health`, `/dashboard/support`.
  - **Komponen & Library Penting**:
    - `web/lib/sellerTrust.ts`: Composite Trust & Value Score (0–100: 40% harga/margin, 35% rating, 15% volume order, 10% stok & kecepatan kirim + bonus freshness), klasifikasi `Safe (A+)` / `Moderate (B)` / `Caution (C)`, hard-reject rule untuk rating `< 92%` / transaksi rendah mencurigakan, serta **Anti-Hackback Steam Freshness Engine** (`evaluateSteamAccountFreshness`, `isSteamAccountProduct`) yang memblokir akun pernah dimainkan (`0-300 hours played`, `10+ hours`), akun lama/archive/cracked/random playtime, `+ Bonus / Other Paid Games`, dan akun kena ban (`Community/VAC Ban`), serta memprioritaskan `0 Hours Fresh` + `First Email / OGE` + `Full Data Change` (terintegrasi penuh ke `auto-find-sellers`, `g2g-crawler`, `cron/sentry`, `SellerReviewModal`, `Catalog`, `Stock Sentry`, dan `Research Center`).
    - `web/lib/envLoader.ts` & `web/next.config.mjs`: Fallback loader untuk memuat environment variables dari root `.env` (`../.env`) saat Next.js berjalan di `web/`.
    - `web/lib/gemini.ts` & `ai_engine.py`: Mengirim `GEMINI_API_KEY` melalui header `x-goog-api-key` (bukan `?key=` di URL) sehingga mendukung penuh format kunci Google AI Studio baru (`AQ.A...`) maupun `AIza...`.
    - `web/lib/db.ts`, `scripts/init_db.js`, & `.github/workflows/supabase-keepalive.yml`: Semua 5 tabel Supabase (`app_kv`, `claims_vault`, `catalog_games`, `inventory_vault`, `autonomous_orders`) diaktifkan dengan **Row Level Security (`RLS`)** dan dilengkapi heartbeat anti-pause (`touchSupabaseKeepalive`) pada row tunggal `app_kv('supabase_keepalive')` yang dipicu oleh cron (`/api/cron/sentry`, `/api/cron/check-orders`, `/api/health?keepalive=1`) setiap 15 menit & 12 jam.
    - **Penting untuk Supabase:** Gunakan Transaction Pooler URL (`aws-0-ap-northeast-1.pooler.supabase.com:6543`, username `postgres.<ref>`) pada `DATABASE_URL` lokal (`web/.env.local` / `.env`) dan Vercel karena hostname langsung `db.<ref>.supabase.co` hanya melayani IPv6.
    - `web/app/api/research/eneba-crawler/route.ts`: Ditambah `action: "autonomous_scan"` (menggabungkan Steam Store `featuredcategories` `top_sellers`/`specials` + CheapShark Deals API dengan `User-Agent` valid) + fallback Steam live untuk `discover_trend`.
    - `web/lib/pricing.ts`: Single Source of Truth kalkulasi Shopee (`calculateShopeeEconomics`, `calculateBreakEvenPrice`, `calculateTargetSellingPrice`), preset program biaya Shopee (`reguler` 8%+1k, `xtra_ongkir` 12%+1k, `flash_promo` 14.5%+1k), QRIS 0.7%, dan FX Volatility Buffer (`+1.5%`). Disinkronkan ke Quant, Launchpad, Catalog, Eneba Terminal (`/dashboard/eneba`), dan Research Center (`/dashboard/research`).
    - `web/app/api/orders/finalize/route.ts`: 1-Klik Finalisasi Order (`POST /api/orders/finalize`) untuk membuat token Claim Vault terenkripsi, mencatat laba bersih ke `financial_ledger` (`/dashboard/operator`), mengupdate order di `/dashboard/autonomous`, serta menghasilkan template pesan Shopee chat siap salin.
    - `web/app/api/cron/sentry/route.ts`: Cron Market Sentry dengan Trust Guard (auto-failover memfilter keluar seller berisiko tinggi via `evaluateSellerTrust` dan memprioritaskan `Safe (A+)`).
    - `web/lib/gemini.ts`: Memakai `process.env.GEMINI_API_KEY` (tanpa fallback hardcoded key) dengan `FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"]` dan dukungan `jsonMode`.
    - `web/lib/catalog.ts`, `web/lib/g2g.ts`, `web/lib/g2gStock.ts`, `web/lib/eneba.ts`, `web/lib/steamPrice.ts`: Engine katalog (full `await` pada write Supabase/JSON), G2G live IDR pricing (`converted_unit_price` / `display_price`), dan zero-empty links (`?q=<SellerName>` sudah dihapus).
    - `web/app/components/GameSelectorCombobox.tsx`: Searchable combobox memakai `ReactDOM.createPortal(..., document.body)` dengan `position: fixed` dan `z-[9999]` agar selalu di atas kartu `.app-card`.
    - `web/middleware.ts`: Proteksi `/dashboard/*` via cookie `akshara_admin_session` (`/login`), proteksi **seluruh** endpoint `/api/*` termasuk `GET /api/catalog`, `/api/claim/*`, `/api/verify` via session / `x-admin-secret` / localhost dev bypass, serta redirect `claim.*` dan `/claim/*` ke portal publik (`NEXT_PUBLIC_CLAIM_URL` / `https://claimakshara.vercel.app`).
- **`bot/`** — Telegram Commander & Market Sentry Python:
  - `bot/market_sentry.py`: Cek stok live G2G SLS (`fetch_g2g_offer_live`, `audit_all_catalog_sellers`) dengan ekstraksi `total_success_order`, `total_rating`, `satisfaction_rate`, serta badge rating & `trust_tier` pada laporan Telegram (`build_stock_summary_report`, `get_critical_stock_alerts`).
  - `bot/eneba_data.py`, `bot/telegram_commander.py`, `bot/canvas_drawer.py`, `bot/formatter_data.py`.
- **`claim-web/`** — Portal Publik Terpadu: **Storefront + Warranty Verifier + Customer Claim Vault** (`claimakshara.vercel.app`):
  - `/` (`claim-web/app/page.tsx`): Storefront publik Akshara Gaming Center dengan **Game Cover Artwork Resmi** (`claim-web/lib/artworkLookup.ts` via Steam/Microsoft CDN + fallback elegan), Quick Claim input, VIP Voucher box, Fast-Lane WhatsApp Checkout (`NEXT_PUBLIC_ADMIN_WHATSAPP` via `claim-web/lib/storeConfig.ts`), serta verifikasi sertifikat garansi real-time (`/api/verify?sn=...`). Zero link atau akses ke `/dashboard` admin.
  - `/claim` (`claim-web/app/claim/page.tsx`) & `/claim/[code]`: Login klaim & dekripsi brankas AES-256-GCM (`/api/verify`, `/api/reveal`), SOP Rekam Layar No-Cut, serta **VIP Retention Funnel** dengan tombol **`Belanja Storefront VIP`** (`/?vip=...#katalog`) untuk mengarahkan pembeli Shopee ke repeat order direct 0% fee.
  - **Least-Privilege DB (`akshara_public_portal`)**: Dikonfigurasi via `scripts/setup_least_privilege_roles.js`. Role database ini hanya punya akses `SELECT` kolom publik `catalog_games` (tanpa `sellers`/`margin`) dan `SELECT` + `UPDATE` terbatas (telemetry/lockout/reveal) pada `claims_vault` — ditolak total (`42501 permission denied`) pada `inventory_vault`, `autonomous_orders`, `app_kv`, maupun `INSERT`/`DELETE`.
- **`.github/workflows/ci-web.yml`** — CI otomatis di GitHub Actions untuk mengecek `npx tsc --noEmit` & `npm run build` di `web/` dan `claim-web/`, serta `python -m py_compile` pada `bot/*.py` di setiap push/PR ke `main`.
- **`scripts/`** — Utility sanitasi, inisialisasi DB, & isolasi role (`scripts/sanitize_catalog.js`, `scripts/init_db.js`, `scripts/setup_least_privilege_roles.js`).

---

## 3. Setup Ulang di Perangkat Baru

### Prasyarat & Install
```bash
git clone https://github.com/Jejechris/aksharagamingcenter.git
cd aksharagamingcenter

# Python Bot & Sentry
python -m venv venv
# Windows: .\venv\Scripts\activate   |   Linux/macOS: source venv/bin/activate
pip install -r requirements.txt

# Web Command Center
cd web
npm install

# Claim Portal (opsional jika menjalankan claim-web terpisah)
cd ../claim-web
npm install
```

### Environment Variables yang Dibutuhkan (Jangan Pernah Commit ke Git!)
Buat file `.env` (root), `web/.env.local`, dan `claim-web/.env.local` sesuai kebutuhan environment masing-masing perangkat:
- **Root `.env`**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `IMAP_SERVER`, `IMAP_PORT`, `IMAP_EMAIL`, `IMAP_APP_PASSWORD`, `GEMINI_API_KEY`.
- **`web/.env.local`**: `GEMINI_API_KEY`, `ADMIN_ACCESS_PIN`, `ADMIN_SECRET` / auth session secret, `VAULT_ENCRYPTION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, variabel **Supabase** (URL & key sesuai proyek Supabase aktif), dan `CRON_SECRET` jika dipakai.
- **`claim-web/.env.local`**: `DATABASE_URL` (gunakan role terbatas `akshara_public_portal.<ref>` hasil `node scripts/setup_least_privilege_roles.js`), `VAULT_ENCRYPTION_SECRET` (sinkron dengan `web/.env.local`), `NEXT_PUBLIC_ADMIN_WHATSAPP` (nomor WA admin format `62812...` untuk Fast-Lane Checkout & VIP Claim), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`.

---

## 4. Perintah Verifikasi Standar

```powershell
# TypeScript & Next.js production build (Admin Web + Public Portal)
cd web; npx tsc --noEmit; npm run build
cd ..\claim-web; npx tsc --noEmit; npm run build

# Audit isolasi DB role least-privilege
cd ..; node scripts/setup_least_privilege_roles.js

# Syntax check Python bot
python -m py_compile bot/market_sentry.py bot/telegram_commander.py bot/eneba_data.py
```

---

## 5. Status Terkini (Per FASE 22+ — Siap Pindah Device)

- **Selesai:**
  - **FASE 7 s/d FASE 20**: Pemisahan penuh antara **Internal Admin Command Center (`web/` -> `https://asksharagaming.vercel.app`)** dan **Public Storefront + Warranty Verifier + Claim Vault (`claim-web/` -> `https://claimakshara.vercel.app`)**, penguncian middleware `web/`, serta provisioning PostgreSQL least-privilege role `akshara_public_portal`.
  - **FASE 21+ (Shopee Mass Upload Studio + Pure Digital Zero-Link QR)**: Penghapusan total mode amplop/kartu fisik dari website, konversi Shopee Chat & Deskripsi menjadi Zero-Link + Kartu Akses Digital PNG ber-QR (`web/lib/digitalWarrantyCard.ts`), Shopee Mass Upload `.xlsx` Generator (`web/lib/shopeeMassUpload.ts` + `MassUploadStudio.tsx`), Public Media Host PostgreSQL (`hosted_media`), dan Visual Cover Inspector Modal dengan default domain `https://asksharagaming.vercel.app`.
  - **FASE 22+ (Shopee Strict Guard, Price & Incident Guard, Anti-Hackback Steam 0-Hours Shield, Eneba Deep Discover, & Mobile Responsive Overhaul)**: Penyesuaian judul/deskripsi aman Shopee (`web/lib/shopeeCompliance.ts`), pusat insiden lonjakan harga & Circuit Breaker (`/dashboard/alerts`), penyaringan ketat Anti-Hackback Steam pada G2G (`freshOnly` default ON, pemblokiran akun played `>0h`/`0-300h`/`Community Ban`/`Corrupted Email`/`+ Bonus Games`/multi-game log, prioritas `0 Hours Fresh` + `OGE`), **Title Relevance Guard** + pencarian `&q=` untuk kategori umum (`steam-global-account`, `GTA V`), pemetaan `fc-26-accounts`, **Eneba Deep Multi-Page Auto-Discover** (`web/lib/marketResearch.ts`), serta audit & perbaikan **100% Mobile Responsive (`375x812`, `0px` horizontal overflow)** di `web/` (shell `SidebarLayout.tsx`, mobile Bell sheet, stacked Alert Banner, card view mobile `md:hidden` untuk `MassUploadStudio`, `Catalog` seller drawer, `Claims`, `Stock Sentry`, `Operator`, serta perbaikan `Marketer`/`ThumbnailStudio`, `Quant`, `Research`, `Eneba`, `Shopee Launchpad`) dan `claim-web/` (`/`, `/claim`, `/claim/[code]`).
- **Catatan Penting Environment (`web/.env.local`, `claim-web/.env.local`, & Vercel):**
  - Pastikan project Vercel **`claimakshara`** memakai environment variable `DATABASE_URL` dengan role **`akshara_public_portal.<ref>`** dan `VAULT_ENCRYPTION_SECRET` yang identik dengan project admin `web/`.
  - Pastikan `VAULT_ENCRYPTION_SECRET` terisi string acak 32+ karakter di lokal & Vercel agar enkripsi kredensial di brankas aman.
- **Panduan Lanjut di Device Baru:**
  1. `git pull origin main`
  2. Cek apakah `.env`, `web/.env.local`, `claim-web/.env.local` sudah terpasang (file env tidak pernah di-push ke git).
  3. Jalankan `cd web && npm install` (termasuk package `exceljs` yang baru ditambahkan) sebelum menjalankan `npm run dev` atau `npm run build`.
