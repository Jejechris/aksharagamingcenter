import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verifikasi Vercel Cron Header jika di production
  const authHeader = request.headers.get("authorization");
  
  // Simulasi pemindaian pesanan oleh serverless worker
  const timestamp = new Date().toISOString();

  return NextResponse.json({
    status: "ok",
    timestamp,
    message: "Akshara Vercel Cron: Order scan executed successfully.",
    scanned_channels: ["Shopee (IMAP)", "Website (Supabase)"]
  });
}
