"""
Akshara Gaming Center - Telegram Commander & Market Sentry Launcher
Jalankan bot ini kapan saja di workstation Senna:
python run_telegram_bot.py
"""

import os
import sys
import asyncio
from rich.console import Console
from rich.panel import Panel

# Paksa UTF-8 stdout
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

console = Console()

from bot.telegram_commander import TelegramCommander, get_env_credentials


def main():
    token, chat_id = get_env_credentials()
    
    console.print(Panel(
        f"[bold cyan]AKSHARA GAMING CENTER — TELEGRAM COMMANDER & MARKET SENTRY[/bold cyan]\n"
        f"• Status: [bold green]ONLINE[/bold green]\n"
        f"• Admin Chat ID: [bold yellow]{chat_id}[/bold yellow]\n"
        f"• Fitur: [white]Live Stock Alert (G2G SLS), Canvas 1080x1080, Delivery Formatter, The Quant, Eneba Radar[/white]\n"
        f"• Mode: [bold magenta]Async Long-Polling (Aman tanpa Port Forwarding/Ngrok)[/bold magenta]",
        title="🤖 TELEGRAM BOT DAEMON",
        border_style="cyan"
    ))

    if not token:
        console.print("[red]Error: TELEGRAM_BOT_TOKEN belum disetel di file .env![/red]")
        sys.exit(1)

    commander = TelegramCommander(token=token, admin_chat_id=chat_id)
    try:
        asyncio.run(commander.start_polling())
    except KeyboardInterrupt:
        console.print("\n[yellow]Bot Telegram dihentikan oleh pengguna.[/yellow]")


if __name__ == "__main__":
    main()
