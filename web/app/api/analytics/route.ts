import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Path ke ledger finansial riil yang dihasilkan oleh Python Orchestrator (dev lokal)
    const ledgerPath = path.resolve(process.cwd(), "..", "output", "financial_ledger.json");
    // Fallback path ke seed data internal untuk deployment serverless Vercel
    const bundledPath = path.resolve(process.cwd(), "data", "financial_ledger.json");
    
    let transactions: any[] = [];
    if (fs.existsSync(ledgerPath)) {
      const raw = fs.readFileSync(ledgerPath, "utf-8");
      transactions = JSON.parse(raw);
    } else if (fs.existsSync(bundledPath)) {
      const raw = fs.readFileSync(bundledPath, "utf-8");
      transactions = JSON.parse(raw);
    }



    const totalOrders = transactions.length;
    const totalGmv = transactions.reduce((acc, t) => acc + (t.gross_revenue_idr || 0), 0);
    const totalCogs = transactions.reduce((acc, t) => acc + (t.cogs_net_idr || 0), 0);
    const totalPlatformFees = transactions.reduce((acc, t) => acc + (t.platform_fee_idr || 0), 0);
    const totalPackaging = transactions.reduce((acc, t) => acc + (t.packaging_cost_idr || 0), 0);
    const totalNetProfit = transactions.reduce((acc, t) => acc + (t.net_profit_idr || 0), 0);
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
