import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKV, setKV } from "@/lib/db";

async function readLedgerTransactions(): Promise<any[]> {
  const dbData = await getKV("financial_ledger");
  if (dbData) {
    if (Array.isArray(dbData)) return dbData;
    if (Array.isArray(dbData.transactions)) return dbData.transactions;
  }

  // Path ke ledger finansial riil yang dihasilkan oleh Python Orchestrator (dev lokal)
  const ledgerPath = path.resolve(process.cwd(), "..", "output", "financial_ledger.json");
  // Fallback path ke seed data internal untuk deployment serverless Vercel
  const bundledPath = path.resolve(process.cwd(), "data", "financial_ledger.json");

  if (fs.existsSync(ledgerPath)) {
    try {
      const raw = fs.readFileSync(ledgerPath, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.transactions || []);
    } catch (e) {}
  } else if (fs.existsSync(bundledPath)) {
    try {
      const raw = fs.readFileSync(bundledPath, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.transactions || []);
    } catch (e) {}
  }
  return [];
}

export async function GET() {
  try {
    const transactions = await readLedgerTransactions();

    const totalOrders = transactions.length;
    const totalGmv = transactions.reduce((acc, t) => acc + (Number(t.gross_revenue_idr) || 0), 0);
    const totalCogs = transactions.reduce((acc, t) => acc + (Number(t.cogs_net_idr) || 0), 0);
    const totalPlatformFees = transactions.reduce((acc, t) => acc + (Number(t.platform_fee_idr) || 0), 0);
    const totalPackaging = transactions.reduce((acc, t) => acc + (Number(t.packaging_cost_idr) || 0), 0);
    const totalNetProfit = transactions.reduce((acc, t) => acc + (Number(t.net_profit_idr) || 0), 0);
    const avgMargin = totalGmv > 0 ? (totalNetProfit / totalGmv) * 100 : 0;

    const targetMonthly = 10000000;
    const targetAchievementPct = Math.min(100, Math.round((totalNetProfit / targetMonthly) * 100 * 10) / 10);

    return NextResponse.json({
      status: "success",
      data: {
        total_orders: totalOrders,
        total_gmv_idr: Math.round(totalGmv),
        total_cogs_idr: Math.round(totalCogs),
        total_platform_fees_idr: Math.round(totalPlatformFees),
        total_packaging_cost_idr: Math.round(totalPackaging),
        total_net_profit_idr: Math.round(totalNetProfit),
        average_net_margin_pct: Math.round(avgMargin * 10) / 10,
        target_monthly_profit_idr: targetMonthly,
        target_achievement_pct: targetAchievementPct,
        transactions
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentTransactions = await readLedgerTransactions();

    if (Array.isArray(body)) {
      await setKV("financial_ledger", body);
      return NextResponse.json({ status: "success", total: body.length });
    }

    // Single transaction record
    const newTx = {
      ...body,
      recorded_at: body.recorded_at || new Date().toISOString(),
    };
    currentTransactions.unshift(newTx);

    // Save to Cloud KV
    await setKV("financial_ledger", currentTransactions);

    // Backup to local file
    try {
      const bundledPath = path.resolve(process.cwd(), "data", "financial_ledger.json");
      fs.writeFileSync(bundledPath, JSON.stringify(currentTransactions, null, 2), "utf-8");
      const outputPath = path.resolve(process.cwd(), "..", "output", "financial_ledger.json");
      if (fs.existsSync(path.dirname(outputPath))) {
        fs.writeFileSync(outputPath, JSON.stringify(currentTransactions, null, 2), "utf-8");
      }
    } catch (e) {}

    return NextResponse.json({
      status: "success",
      message: "Transaksi baru berhasil dicatat di cloud financial ledger.",
      data: newTx,
      total: currentTransactions.length
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
