@echo off
title Akshara 24/7 Market Sentry Realtime Daemon
cd /d "%~dp0"
echo ========================================================
echo   AKSHARA GAMING CENTER - MARKET SENTRY REALTIME DAEMON
echo   Pemeriksaan Stok & Harga Otomatis Setiap 2 Menit
echo   Kompatibel 100%% dengan Vercel Webhook di HP
echo ========================================================
python -u run_telegram_bot.py
pause
