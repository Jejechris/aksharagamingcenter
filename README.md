# AKSHARA GAMING CENTER - MULTI-AGENT WORKFORCE
**Chief Technical Co-founder & Lead AI Systems Architect**

Repositori sistem otonom 5 Divisi AI untuk operasional bisnis digital arbitrage game PC/Console:

---

## 📁 Struktur Direktori
```
C:\Users\jesen\Desktop\scrt\
├── .env.example                     # Template konfigurasi token API & kredensial
├── config.py                        # Konfigurasi finansial, threshold risiko, dan kredensial
├── models.py                        # Pydantic schema lengkap untuk seluruh 5 divisi
├── orchestrator.py                  # Master Autonomous Controller penghubung 5 divisi
├── main.py                          # CLI control dashboard & live/simulation runner
│
├── divisi_1_quant/                  # Divisi Market Intelligence & Dynamic Pricing
│   └── quant_engine.py              # Kalkulator margin, BEP, potongan Shopee & kurs valas
│
├── divisi_2_risk/                   # Divisi Supplier Sentry & Risk Control
│   ├── risk_officer.py              # Evaluasi rating, instant delivery, filter anti-hackback
│   └── scraper.py                   # Extractor feed G2G dengan resilient fallback
│
├── divisi_3_marketer/               # Divisi Creative & Physical Fulfillment
│   ├── warranty_card_generator.py   # Render PDF Kartu Garansi & Lembar Aktivasi A6 siap cetak
│   └── listing_copywriter.py        # Generator copy listing Shopee yang DMCA-safe
│
├── divisi_4_operator/               # Divisi Order Dispatch & Fulfillment
│   ├── email_order_listener.py      # Metode A (IMAP Shopee Email Order Parser - Zero Ban)
│   ├── telegram_hitl_bot.py         # Human-in-the-Loop approval bot via Telegram Bot API
│   └── whatsapp_dispatcher.py       # Pengirim kredensial otomatis via Fonnte/Wablas gateway
│
├── divisi_5_support/                # Divisi Customer Support & Warranty Triage
│   └── support_triage.py            # Bot panduan Steam Families & filter klaim unboxing video
│
└── output/                          # Direktori penyimpanan PDF Kartu Garansi A6 siap cetak
```

---

## 🚀 Cara Menjalankan

### 1. Menjalankan Simulasi Autonomous Penuh
Menguji alur kerja end-to-end dari order masuk $\rightarrow$ audit risiko $\rightarrow$ approval Telegram $\rightarrow$ akuisisi akun $\rightarrow$ cetak PDF A6 $\rightarrow$ kirim WhatsApp $\rightarrow$ uji komplain CS:
```powershell
python main.py
```

### 2. Menampilkan Copy Listing Shopee DMCA-Safe
```powershell
python main.py --copy
```

---

## ⚙️ Integrasi Production (Saat Toko Shopee Aktif)
1. Salin `.env.example` menjadi `.env`.
2. Masukkan token Telegram bot dari `@BotFather` dan Chat ID Anda dari `@userinfobot`.
3. Masukkan Google App Password untuk email toko Anda pada `IMAP_APP_PASSWORD`.
4. Masukkan token WhatsApp gateway (Fonnte / Wablas) pada `FONNTE_API_TOKEN`.
