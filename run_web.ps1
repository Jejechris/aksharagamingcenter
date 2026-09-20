# AKSHARA GAMING CENTER - WEB RUNNER SCRIPT
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "C:\Users\jesen\OneDrive\Desktop\Scrt\web"
Write-Host "Menjalankan Akshara Gaming Center Web di http://localhost:3000 ..." -ForegroundColor Cyan
& "C:\Program Files\nodejs\npm.cmd" run dev
