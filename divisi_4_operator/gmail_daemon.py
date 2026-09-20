"""
Akshara Gaming Center - Divisi 4: Autonomous Gmail Daemon (Metode A Worker)
Memantau email notifikasi pesanan Shopee secara pasif di latar belakang.
Saat ada pesanan masuk, otomatis menganalisis supplier G2G dan melempar tombol approval ke Telegram Senna!
"""

import sys
import os
import time
import asyncio

# Pastikan encoding UTF-8 di Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from config import SETTINGS
from orchestrator import AksharaOrchestrator
from divisi_4_operator.email_order_listener import EmailOrderListener

console = Console(force_terminal=True)


async def run_gmail_daemon(poll_interval_seconds: int = 30):
    console.print("\n[bold cyan]=== AKSHARA GAMING CENTER: GMAIL AUTONOMOUS DAEMON (METODE A) ===[/bold cyan]")
    
    email_user = SETTINGS.imap_email
    app_pwd = SETTINGS.imap_app_password

    # Validasi konfigurasi akun Gmail
    if not app_pwd or "mock" in app_pwd or "your_" in app_pwd:
        help_panel = (
            "[bold yellow]CARA CEPAT MEMBUAT GOOGLE APP PASSWORD (1 MENIT):[/bold yellow]\n\n"
            "1. Buka akun Google toko Anda: [bold cyan]https://myaccount.google.com/security[/bold cyan]\n"
            "2. Pastikan [bold]Verifikasi 2-Langkah (2-Step Verification)[/bold] sudah Aktif.\n"
            "3. Di kotak pencarian atas, ketik: [bold]Sandi Aplikasi[/bold] (atau [bold]App passwords[/bold]).\n"
            "4. Beri nama aplikasi: [bold]Akshara Daemon[/bold] lalu klik Buat.\n"
            "5. Salin 16 digit kode sandi yang muncul (contoh: [dim]abcd efgh ijkl mnop[/dim]).\n"
            "6. Masukkan email & sandi tersebut ke file [bold].env[/bold]:\n"
            "   [bold green]IMAP_EMAIL=emailtokoanda@gmail.com[/bold green]\n"
            "   [bold green]IMAP_APP_PASSWORD=abcdefghijklmnop[/bold green]\n\n"
            "[red]Peringatan: Daemon tidak bisa membaca inbox Gmail tanpa Google App Password![/red]"
        )
        console.print(Panel(help_panel, border_style="yellow", title="Konfigurasi Kredensial"))
        return

    listener = EmailOrderListener(email_user=email_user, password=app_pwd)
    orchestrator = AksharaOrchestrator()

    console.print(f"[green][OK] Terhubung ke Mailbox: {email_user}[/green]")
    console.print(f"[cyan]Memulai pemantauan pasif setiap {poll_interval_seconds} detik. Tekan Ctrl+C untuk berhenti.[/cyan]\n")

    processed_order_ids = set()

    while True:
        try:
            current_time = time.strftime("%H:%M:%S")
            console.print(f"[dim][{current_time}] Memindai email pesanan Shopee baru...[/dim]", end="\r")

            new_orders = listener.check_new_orders()

            if new_orders:
                for order in new_orders:
                    if order.order_id in processed_order_ids:
                        continue
                    
                    console.print(f"\n[bold green]🚨 PESANAN SHOPEE BARU TERDETEKSI: #{order.order_id}[/bold green]")
                    console.print(f"• Pembeli: [bold]{order.buyer_username}[/bold]")
                    console.print(f"• Produk: {order.product_title}")
                    console.print(f"• Nilai: Rp {order.selling_price_idr:,.0f}")

                    # Jalankan siklus autonomous hingga notifikasi Telegram terkirim
                    result = await orchestrator.process_order_lifecycle(order, auto_approve_hitl=False)
                    processed_order_ids.add(order.order_id)
                    console.print(f"[green][OK] Notifikasi persetujuan telah mendarat di Telegram Senna![/green]\n")

            await asyncio.sleep(poll_interval_seconds)

        except KeyboardInterrupt:
            console.print("\n[yellow]Daemon dihentikan oleh pengguna.[/yellow]")
            break
        except Exception as e:
            console.print(f"\n[red][Koneksi Error]: {e}. Mencoba kembali dalam {poll_interval_seconds}s...[/red]")
            await asyncio.sleep(poll_interval_seconds)


if __name__ == "__main__":
    asyncio.run(run_gmail_daemon())
