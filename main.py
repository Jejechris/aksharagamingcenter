"""
AKSHARA GAMING CENTER - AUTONOMOUS MULTI-AGENT SYSTEM
Entry Point & CLI Control Dashboard
"""

import sys
import os

# Pastikan encoding UTF-8 di Windows Console
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import asyncio
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.table import Table

console = Console(force_terminal=True)

from orchestrator import AksharaOrchestrator
from models import WarrantyClaim, WarrantyClaimStatus
from divisi_4_operator.email_order_listener import EmailOrderListener
from divisi_3_marketer.listing_copywriter import ListingCopywriter
from divisi_5_support.support_triage import SupportTriage



async def run_full_autonomous_demo():
    """Menjalankan simulasi end-to-end seluruh 5 divisi AI."""
    orchestrator = AksharaOrchestrator()
    email_listener = EmailOrderListener()

    console.print()
    banner = Text(" AKSHARA GAMING CENTER ", style="bold white on blue")
    banner.append(" - Autonomous Multi-Agent Workforce (5 Divisi)\n", style="bold cyan")
    banner.append("Chief Technical Co-founder & Autonomous Workflow Demo", style="dim white")
    console.print(Panel(banner, border_style="blue", expand=False))

    # Simulasi order masuk via Metode A
    order = email_listener.simulate_incoming_order(
        order_id="240916MC99211A",
        buyer="alvin_surabaya_gamers",
        price=219900.0
    )

    # Eksekusi siklus hidup pesanan
    result = await orchestrator.process_order_lifecycle(order, auto_approve_hitl=True)

    # Rangkum hasil
    margin = result["margin"]
    summary_table = Table(title="[bold green]RINGKASAN EKSEKUSI OTONOM[/bold green]", show_lines=True)
    summary_table.add_column("Parameter", style="bold")
    summary_table.add_column("Nilai", justify="right")

    summary_table.add_row("Nomor Pesanan", result["order"].order_id)
    summary_table.add_row("Pembeli", result["order"].buyer_username)
    summary_table.add_row("Harga Jual Shopee", f"Rp {margin.selling_price_shopee_idr:,.0f}")
    summary_table.add_row("Modal Supplier (COGS Net)", f"Rp {margin.cogs_idr_net:,.0f}")
    summary_table.add_row("Potongan Shopee (Admin 8% + 1k)", f"Rp {margin.shopee_admin_fee_idr + margin.shopee_service_fee_idr:,.0f}")
    summary_table.add_row("Biaya Amplop & Percetakan A6", f"Rp {margin.packaging_and_envelope_cost_idr:,.0f}")
    summary_table.add_row("[bold green]Profit Bersih Masuk Rekening (Nett)[/bold green]", f"[bold green]Rp {margin.net_profit_idr:,.0f}[/bold green]")
    summary_table.add_row("[bold cyan]Net Margin Bersih[/bold cyan]", f"[bold cyan]{margin.net_margin_pct:.1f}%[/bold cyan]")
    summary_table.add_row("File PDF Kartu Garansi Fisik", result["pdf_warranty_path"])
    summary_table.add_row("Status Pengiriman WhatsApp", "Terkirim Instan (Simulasi Gateway)")

    console.print(summary_table)
    console.print()

    # DEMO DIVISI 5: Customer Support & Strict Warranty Filter
    console.print("[bold magenta]>>> PENGUJIAN DIVISI 5: CUSTOMER SUPPORT & WARRANTY TRIAGE[/bold magenta]")
    
    # Kasus 1: Klaim Tanpa Video Unboxing (Harus ditolak untuk lindungi toko)
    claim_bad = WarrantyClaim(
        claim_id="CLM-001",
        order_id=order.order_id,
        buyer_username=order.buyer_username,
        issue_description="Akun tidak bisa login kak, tolong ganti baru.",
        has_uncut_video_proof=False
    )
    res_bad = SupportTriage.triage_warranty_claim(claim_bad)
    console.print(f"[yellow]• Uji Kasus 1 (Tanpa Video Unboxing): {res_bad['status']}[/yellow]")
    console.print(f"  [dim]Pesan ke pembeli: {res_bad['message_to_buyer'][:120]}...[/dim]")

    # Kasus 2: Klaim Dengan Video Unboxing Valid
    claim_good = WarrantyClaim(
        claim_id="CLM-002",
        order_id=order.order_id,
        buyer_username=order.buyer_username,
        issue_description="Email salah sandi saat dicoba di video.",
        has_uncut_video_proof=True,
        video_proof_url="https://youtube.com/shorts/sample_video"
    )
    res_good = SupportTriage.triage_warranty_claim(claim_good)
    console.print(f"[green]• Uji Kasus 2 (Video Valid Tanpa Jeda): {res_good['status']}[/green]")
    console.print(f"  [dim]Pesan ke pembeli: {res_good['message_to_buyer'][:120]}...[/dim]\n")


def print_dmca_safe_copy():
    """Menampilkan contoh copy listing yang dihasilkan Divisi 3."""
    console.print("[bold cyan]>>> CONTOH LISTING SHOPEE DMCA-SAFE (DIVISI 3 - THE MARKETER):[/bold cyan]")
    copy = ListingCopywriter.generate_shopee_listing("Minecraft Java & Bedrock")
    console.print(Panel(f"[bold]{copy['title']}[/bold]\n\n{copy['description']}", title="Shopee Listing Copy", border_style="cyan"))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--copy":
        print_dmca_safe_copy()
    else:
        asyncio.run(run_full_autonomous_demo())
        print_dmca_safe_copy()
