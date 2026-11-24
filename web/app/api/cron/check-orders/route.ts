import { NextResponse } from "next/server";
import { verifyCronOrAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  if (!verifyCronOrAdminRequest(request)) {
    return NextResponse.json({ status: "unauthorized", message: "Unauthorized cron access." }, { status: 401 });
  }

  // Simulasi pemindaian pesanan oleh serverless worker
  const timestamp = new Date().toISOString();

  return NextResponse.json({
    status: "ok",
    timestamp,
    message: "Akshara Vercel Cron: Order scan executed successfully.",
    scanned_channels: ["Shopee (IMAP)", "Website (Supabase)"],
  });
}
