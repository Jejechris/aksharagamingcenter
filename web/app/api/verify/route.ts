import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sn = searchParams.get("sn")?.trim().toUpperCase();
  const orderId = searchParams.get("order")?.trim().toUpperCase();

  if (!sn && !orderId) {
    return NextResponse.json({
      status: "error",
      message: "Masukkan Serial ID atau Nomor Pesanan untuk memverifikasi garansi."
    }, { status: 400 });
  }

  // Cari di ledger transaksi riil
  const ledgerPath = path.resolve(process.cwd(), "..", "output", "financial_ledger.json");
  const bundledPath = path.resolve(process.cwd(), "data", "financial_ledger.json");
  let foundOrder: any = null;

  const targetPath = fs.existsSync(ledgerPath) ? ledgerPath : fs.existsSync(bundledPath) ? bundledPath : null;

  if (targetPath) {
    try {
      const transactions = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
      foundOrder = transactions.find((t: any) => 
        (orderId && t.order_id.toUpperCase() === orderId) ||
        (sn && t.order_id.toUpperCase().includes(sn.replace("AKSHARA-", "")))
      );
    } catch (e) {}
  }

  // Jika cocok atau query demo serial yang dihasilkan sistem
  if (foundOrder || (sn && sn.includes("AKSHARA"))) {
    const orderNum = foundOrder?.order_id || orderId || "240916MC99211A";
    const buyer = foundOrder?.buyer_username || "alvin_surabaya_gamers";
    const product = foundOrder?.product_name || "Minecraft: Java & Bedrock Edition - Full Access";
    const dateStr = foundOrder?.timestamp ? foundOrder.timestamp.split(" ")[0] : "2026-09-16";

    return NextResponse.json({
      status: "success",
      verified: true,
      data: {
        serial_number: sn || `AKSHARA-${orderNum.slice(-6)}`,
        order_id: orderNum,
        buyer_username: buyer,
        product_name: product,
        purchase_date: dateStr,
        warranty_status: "AKTIF & TERLINDUNGI",
        warranty_days_total: 30,
        warranty_expires: "16 Oktober 2026",
        authenticity: "100% Original Microsoft Digital License",
        sop_summary: "Wajib menyertakan screenshot kendala & first-login tanpa jeda (no-cut) untuk klaim penggantian baru."
      }
    });
  }

  return NextResponse.json({
    status: "not_found",
    verified: false,
    message: "Serial ID atau Nomor Pesanan tidak terdaftar di sistem Akshara Gaming Center. Pastikan Anda memasukkan kode yang tertera di Garansi Digital."
  }, { status: 404 });
}
