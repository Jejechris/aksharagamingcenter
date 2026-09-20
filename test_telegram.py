"""
Akshara Gaming Center - Telegram Connection Diagnostic Tool
Jalankan script ini untuk menguji apakah bot Telegram Anda sudah terhubung ke HP Anda:
python test_telegram.py
"""

import os
import sys
import asyncio
import httpx
from rich.console import Console
from rich.panel import Panel

console = Console()


async def test_telegram_connection():
    console.print("\n[bold cyan]=== PENGUJIAN KONEKSI TELEGRAM BOT (AKSHARA GAMING CENTER) ===[/bold cyan]\n")
    
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID")

    # Cek file .env jika env variable belum terbaca
    if not token or not chat_id:
        env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        if os.path.exists(env_file):
            with open(env_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("TELEGRAM_BOT_TOKEN="):
                        token = line.split("=", 1)[1].strip()
                    elif line.startswith("TELEGRAM_ADMIN_CHAT_ID="):
                        chat_id = line.split("=", 1)[1].strip()

    if not token or not chat_id or "your_" in token or "mock" in token:
        console.print("[bold yellow]PANDUAN SETUP CEPAT TELEGRAM:[/bold yellow]")
        console.print("1. Buka Telegram, cari bot [bold]@BotFather[/bold]")
        console.print("2. Ketik [bold]/newbot[/bold], ikuti instruksi, lalu salin [bold]HTTP API Token[/bold] yang diberikan.")
        console.print("3. Cari bot [bold]@userinfobot[/bold], ketik [bold]/start[/bold], salin angka [bold]Id[/bold] Anda.")
        console.print("4. Buka bot baru Anda yang dibuat di langkah 1, lalu klik [bold]Start[/bold] (Wajib agar bot bisa chat ke Anda).")
        console.print("5. Isi [bold]TELEGRAM_BOT_TOKEN[/bold] dan [bold]TELEGRAM_ADMIN_CHAT_ID[/bold] di file [bold].env[/bold]")
        console.print("\n[red]Error: Token atau Chat ID belum dikonfigurasi di file .env![/red]\n")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": (
            "🚀 *AKSHARA GAMING CENTER — HITL BOT TERHUBUNG!*\n\n"
            "Halo Senna! Sistem otonom Akshara berhasil tersambung ke Telegram Anda.\n"
            "Setiap ada pesanan baru Shopee masuk, kartu persetujuan margin dan tombol otorisasi "
            "akan langsung muncul di sini."
        ),
        "parse_mode": "Markdown"
    }

    console.print(f"Mengirim pesan uji coba ke Chat ID: [bold]{chat_id}[/bold]...")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(url, json=payload)
            data = res.json()
            if data.get("ok"):
                console.print(Panel(
                    f"[bold green]SUKSES BESAR![/bold green]\n"
                    f"Pesan uji coba telah terkirim ke Telegram HP Anda!\n"
                    f"Message ID: {data['result']['message_id']}",
                    border_style="green"
                ))
            else:
                console.print(Panel(
                    f"[bold red]Gagal mengirim pesan:[/bold red]\n"
                    f"Kode Error: {data.get('error_code')}\n"
                    f"Deskripsi: {data.get('description')}\n\n"
                    f"[dim]Tip: Pastikan Anda sudah membuka bot Anda di Telegram dan menekan tombol /start[/dim]",
                    border_style="red"
                ))
    except Exception as e:
        console.print(f"[red]Koneksi gagal: {e}[/red]")


if __name__ == "__main__":
    asyncio.run(test_telegram_connection())
