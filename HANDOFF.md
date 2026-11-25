# Akshara Gaming Center — Multi-Device Handoff & Sync Guide

> **Canonical Handoff Document (Updated through FASE 18)**  
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
  - **Shopee 4-Step Launchpad (`/dashboard/shopee-launchpad`) & Thumbnail Studio**: Wizard 4 langkah + unified `ThumbnailStudio` canvas 1080x1080 + safe image proxy (`/api/image-proxy`) dan multi-source artwork (`/api/ai/game-artwork`) bebas Unsplash acak.
  - **Tools Operasional**: `/dashboard/quant` (Kalkulator Margin/BEP, biaya packaging digital `Rp 0`), `/dashboard/description`, `/dashboard/formatter`, `/dashboard/research`, `/dashboard/claims`, `/dashboard/autonomous`, `/dashboard/bot`, `/dashboard/health`, `/dashboard/support`.
  - **Komponen & Library Penting**:
    - `web/lib/sellerTrust.ts`: Composite Trust & Value Score (0–100: 40% harga/margin, 35% rating, 15% volume order, 10% stok & kecepatan kirim), klasifikasi `Safe (A+)` / `Moderate (B)` / `Caution (C)`, serta hard-reject rule untuk rating `< 92%` atau transaksi rendah mencurigakan.
    - `web/lib/envLoader.ts` & `web/next.config.mjs`: Fallback loader untuk memuat environment variables dari root `.env` (`../.env`) saat Next.js berjalan di `web/`.
    - `web/app/api/health/route.ts`: Audit koneksi PostgreSQL aktual + deteksi status `HEALTHY`/`DEGRADED` secara jujur (tidak memalsukan status sehat saat DB offline/tak terkonfigurasi).
    - `web/app/api/research/eneba-crawler/route.ts`: Ditambah `action: "autonomous_scan"` (menggabungkan Steam Store `featuredcategories` `top_sellers`/`specials` + CheapShark Deals API dengan `User-Agent` valid) + fallback Steam live untuk `discover_trend`.
    - `web/lib/pricing.ts`: Single Source of Truth kalkulasi Shopee (`calculateShopeeEconomics`, `calculateBreakEvenPrice`, `calculateTargetSellingPrice`), preset program biaya Shopee (`reguler` 8%+1k, `xtra_ongkir` 12%+1k, `flash_promo` 14.5%+1k), QRIS 0.7%, dan FX Volatility Buffer (`+1.5%`). Disinkronkan ke Quant, Launchpad, Catalog, Eneba Terminal (`/dashboard/eneba`), dan Research Center (`/dashboard/research`).
    - `web/app/api/orders/finalize/route.ts`: 1-Klik Finalisasi Order (`POST /api/orders/finalize`) untuk membuat token Claim Vault terenkripsi, mencatat laba bersih ke `financial_ledger` (`/dashboard/operator`), mengupdate order di `/dashboard/autonomous`, serta menghasilkan template pesan Shopee chat siap salin.
    - `web/app/api/cron/sentry/route.ts`: Cron Market Sentry dengan Trust Guard (auto-failover memfilter keluar seller berisiko tinggi via `evaluateSellerTrust` dan memprioritaskan `Safe (A+)`).
    - `web/lib/gemini.ts`: Memakai `process.env.GEMINI_API_KEY` (tanpa fallback hardcoded key) dengan `FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"]` dan dukungan `jsonMode`.
    - `web/lib/catalog.ts`, `web/lib/g2g.ts`, `web/lib/g2gStock.ts`, `web/lib/eneba.ts`, `web/lib/steamPrice.ts`: Engine katalog (full `await` pada write Supabase/JSON), G2G live IDR pricing (`converted_unit_price` / `display_price`), dan zero-empty links (`?q=<SellerName>` sudah dihapus).
    - `web/app/components/GameSelectorCombobox.tsx`: Searchable combobox memakai `ReactDOM.createPortal(..., document.body)` dengan `position: fixed` dan `z-[9999]` agar selalu di atas kartu `.app-card`.
    - `web/middleware.ts`: Proteksi `/dashboard/*` via cookie `akshara_admin_session` (`/login`) dan API sensitif via session / `x-admin-secret` / localhost dev bypass.
- **`bot/`** — Telegram Commander & Market Sentry Python:
  - `bot/market_sentry.py`: Cek stok live G2G SLS (`fetch_g2g_offer_live`, `audit_all_catalog_sellers`) dengan ekstraksi `total_success_order`, `total_rating`, `satisfaction_rate`, serta badge rating & `trust_tier` pada laporan Telegram (`build_stock_summary_report`, `get_critical_stock_alerts`).
  - `bot/eneba_data.py`, `bot/telegram_commander.py`, `bot/canvas_drawer.py`, `bot/formatter_data.py`.
- **`claim-web/`** — Portal klaim pembeli terpisah (`claimakshara.vercel.app`).
- **`.github/workflows/ci-web.yml`** — CI otomatis di GitHub Actions untuk mengecek `npx tsc --noEmit`, `npm run build` di `web/`, dan `python -m py_compile` pada `bot/*.py` di setiap push/PR ke `main`.
- **`scripts/`** — Utility sanitasi & inisialisasi katalog (`scripts/sanitize_catalog.js`, `scripts/init_db.js`).

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
- **`claim-web/.env.local`**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, variabel Supabase (jika aktif).

---

## 4. Perintah Verifikasi Standar

```powershell
# TypeScript & Next.js production build
cd web
npx tsc --noEmit
npm run build

# Syntax check Python bot
cd ..
python -m py_compile bot/market_sentry.py bot/telegram_commander.py bot/eneba_data.py
```

---

## 5. Status Terkini (Per FASE 18)

- **Selesai:** FASE 7 s/d FASE 18 (termasuk Unified Pricing & Shopee Promo Presets, Trust Guard pada Cron Auto-Failover, 1-Klik Finalisasi Order -> Claim + Kas Ledger, GitHub Actions CI `ci-web.yml`, Root `.env` fallback loader, Honest DB `/api/health`, serta **Autonomous CDKey Scanner** + sinkronisasi filter **`Saring Margin Bersih`** di `/dashboard/eneba` & `/dashboard/research`).
- **Catatan Penting Environment (`web/.env.local` & Vercel):**
  - Pastikan `GEMINI_API_KEY` menggunakan API Key valid dari Google AI Studio (`AIza...`, bukan token `AQ.A...` agar tidak 401 `ACCESS_TOKEN_TYPE_UNSUPPORTED`).
  - Pastikan `VAULT_ENCRYPTION_SECRET` terisi string acak 32+ karakter di lokal & Vercel agar enkripsi kredensial di brankas aman.
- **Tugas Berikutnya:** Siap melanjutkan ke fase fitur berikutnya setelah memastikan `git pull` terbaru dari `origin/main`.
