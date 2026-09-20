@echo off
title Push Akshara Gaming Center to GitHub
echo ===================================================
echo   AKSHARA GAMING CENTER - PUSH TO GITHUB
echo ===================================================
echo.
echo Memeriksa remote origin: https://github.com/Jejechris/aksharagamingcenter.git
echo.
cd /d "%~dp0"
git status
echo.
echo Menjalankan git push -u origin main...
echo (Jika muncul jendela browser GitHub, silakan klik 'Sign in with your browser' / 'Authorize')
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ===================================================
    echo  BERHASIL! Kode telah ter-push ke GitHub.
    echo  Sekarang Anda dapat langsung deploy ke Vercel!
    echo ===================================================
) else (
    echo ---------------------------------------------------
    echo  Catatan: Jika repository belum dibuat di GitHub:
    echo  1. Buka https://github.com/new
    echo  2. Beri nama: aksharagamingcenter
    echo  3. Klik 'Create repository'
    echo  4. Jalankan kembali script ini.
    echo ---------------------------------------------------
)
echo.
pause
