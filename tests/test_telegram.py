"""
Akshara Gaming Center - Telegram Connection Diagnostic Tool
Jalankan script ini untuk menguji apakah bot Telegram Anda sudah terhubung ke HP Anda:
python tests/test_telegram.py
"""

import os
import sys
import asyncio
import httpx
from rich.console import Console
from rich.panel import Panel

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

console = Console()

async def test_telegram_connection():
    console.print("\n[bold cyan]=== PENGUJIAN KONEKSI TELEGRAM BOT (AKSHARA GAMING CENTER) ===[/bold cyan]\n")
    
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID")

    # Cek file .env jika env variable belum terbaca
    if not token or not chat_id:
        env_file = os.path.join(BASE_DIR, ".env")
        if os.path.exists(env_file):
            with open(env_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("TELEGRAM_BOT_TOKEN="):
                        token = line.split("=", 1)[1].strip().strip('"').strip("'")
                    elif line.startswith("TELEGRAM_ADMIN_CHAT_ID="):
                        chat_id = line.split("=", 1)[1].strip().strip('"').strip("'")

    if not token or not chat_id or "your_" in token or "mock" in token:
        console.print("[bold yellow]PANDUAN SETUP CEPAT TELEGRAM:[/bold yellow]")
        console.print("1. Buka Telegram, cari bot [bold]@BotFather[/bold]")
        console.print("2. Ketik [bold]/newbot[/bold], ikuti instruksi, lalu salin [bold]HTTP API Token[/bold] yang diberikan.")
        console.print("3. Cari bot [bold]@userinfobot[/bold], ketik [bold]/start[/bold], salin angka [bold]Id[/bold] Anda.")
        console.print("4. Buka bot baru Anda yang dibuat di langkah 1, lalu klik [bold]Start[/bold] (Wajib agar bot bisa chat ke Anda).")
        console.print("5. Masukkan token & ID ke file [bold].env[/bold]:")
        console.print("   TELEGRAM_BOT_TOKEN=...\n   TELEGRAM_ADMIN_CHAT_ID=...")
        return

    console.print(f"[green]Token Terbaca:[/green] {token[:8]}...{token[-4:]}")
    console.print(f"[green]Admin Chat ID:[/green] {chat_id}")
    console.print("\n[cyan]Mencoba mengirim pesan uji coba ke Telegram Anda...[/cyan]")

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": (
            "🚀 *[AKSHARA GAMING CENTER — SYSTEM CHECK]*\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Halo Senna! Koneksi Telegram Bot berhasil terverifikasi.\n"
            "Sistem siap menerima komando otomatisasi dan mengirimkan notifikasi 24/7."
        ),
        "parse_mode": "Markdown"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                console.print(Panel(
                    "[bold green]BERHASIL TERHUBUNG![/bold green]\n"
                    "Pesan uji coba telah terkirim ke Telegram Anda.\n"
                    "Silakan cek smartphone Anda sekarang!",
                    title="STATUS PENGUJIAN",
                    border_style="green"
                ))
            else:
                console.print(Panel(
                    f"[bold red]GAGAL MENGIRIM PESAN (HTTP {resp.status_code})[/bold red]\n"
                    f"Respons Telegram:\n{resp.text}\n\n"
                    "[yellow]Kemungkinan Penyebab:[/yellow]\n"
                    "1. Anda belum pernah klik 'Start' di bot Telegram Anda.\n"
                    "2. Chat ID salah (pastikan angka numerik murni dari @userinfobot).\n"
                    "3. Token bot salah.",
                    title="STATUS PENGUJIAN",
                    border_style="red"
                ))
    except Exception as e:
        console.print(f"[bold red]Kesalahan Jaringan/Koneksi:[/bold red] {e}")

if __name__ == "__main__":
    asyncio.run(test_telegram_connection())
