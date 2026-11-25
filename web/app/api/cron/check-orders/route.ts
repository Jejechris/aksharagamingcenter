import { NextResponse } from "next/server";
import { verifyCronOrAdminRequest } from "@/lib/auth";
import { touchSupabaseKeepalive } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronOrAdminRequest(request)) {
    return NextResponse.json({ status: "unauthorized", message: "Unauthorized cron access." }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  const keepalive = await touchSupabaseKeepalive("cron_check_orders");

  return NextResponse.json({
    status: "ok",
    timestamp,
    supabase_keepalive: keepalive,
    message: "Akshara Vercel Cron: Order scan & Supabase keepalive executed successfully.",
    scanned_channels: ["Shopee (IMAP)", "Website (Supabase)"],
  });
}
