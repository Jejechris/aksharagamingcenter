import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKV } from "@/lib/db";

async function getClaimsData(): Promise<any[]> {
  const dbData = await getKV("claimed_credentials");
  if (dbData && Array.isArray(dbData)) {
    return dbData;
  }

  // Cek lokal data atau fallback ke shared data
  const candidates = [
    path.join(process.cwd(), "data", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "web", "data", "claimed_credentials.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
      } catch (e) {}
    }
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code?.trim().toUpperCase();
    const passcode = body.passcode?.trim();

    if (!code) {
      return NextResponse.json({ status: "error", message: "Kode klaim wajib diisi." }, { status: 400 });
    }

    const claims = await getClaimsData();
    const claim = claims.find((c: any) => c.claim_code.toUpperCase() === code);

    if (!claim) {
      return NextResponse.json({
        status: "not_found",
        message: "Kode klaim tidak ditemukan. Pastikan kode sesuai dengan yang diberikan di chat Shopee."
      }, { status: 404 });
    }

    // Jika passcode disertakan, periksa apakah cocok
    let isPasscodeValid = false;
    if (passcode) {
      isPasscodeValid = claim.passcode === passcode;
      if (!isPasscodeValid) {
        return NextResponse.json({
          status: "invalid_passcode",
          message: "Passcode PIN salah! Harap periksa PIN rahasia yang diberikan penjual di chat Shopee."
        }, { status: 401 });
      }
    }

    return NextResponse.json({
      status: "success",
      data: {
        claim_code: claim.claim_code,
        order_id: claim.order_id,
        buyer_username: claim.buyer_username,
        product_title: claim.product_title,
        platform: claim.platform,
        warranty_days: claim.warranty_days,
        warranty_code: claim.warranty_code,
        status: claim.status,
        is_already_revealed: claim.status === "REVEALED",
        revealed_at: claim.revealed_at,
        reveal_count: claim.reveal_count || 0,
        passcode_verified: isPasscodeValid,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
