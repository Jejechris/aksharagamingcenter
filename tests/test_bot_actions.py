"""
Script pengujian tindakan bot Telegram:
Mengirimkan kartu sambutan interaktif dan contoh foto canvas 1080x1080 langsung ke Telegram Senna.
"""

import asyncio
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from bot.telegram_commander import TelegramCommander
from bot.canvas_drawer import generate_game_canvas

async def test_live_delivery():
    commander = TelegramCommander()
    chat_id = commander.admin_chat_id
    print(f"Menguji pengiriman ke Chat ID: {chat_id}...")

    # 1. Kirim pesan welcome menu interaktif
    await commander.handle_start(chat_id)
    print("1. Pesan welcome menu interaktif terkirim!")

    # 2. Render dan kirim foto canvas 1080x1080
    await commander.handle_canvas(chat_id, "PROJECT ZOMBOID | Rp 149.000")
    print("2. Foto Canvas 1080x1080 terkirim!")

    # 3. Kirim contoh format pengiriman
    await commander.handle_format(chat_id, "Project Zomboid | Budi Santoso | STEAM-KEY-PZ-9981-LH")
    print("3. Template format pengiriman 3-langkah terkirim!")

if __name__ == "__main__":
    asyncio.run(test_live_delivery())
