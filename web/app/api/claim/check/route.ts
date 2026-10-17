import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbClaimByCode, getDbClaims, getKV } from "@/lib/db";

async function getClaimsData(): Promise<any[]> {
  const dbClaims = await getDbClaims();
  if (dbClaims && Array.isArray(dbClaims) && dbClaims.length > 0) {
    return dbClaims;
  }

  const dbData = await getKV("claimed_credentials");
  if (dbData && Array.isArray(dbData)) {
    return dbData;
  }

  const filePath = path.join(process.cwd(), "data", "claimed_credentials.json");
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
      console.error("Error reading claimed_credentials.json:", e);
    }
  }
  return [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ status: "error", message: "Kode klaim tidak boleh kosong." }, { status: 400 });
  }

  // Row-level atomic lookup from claims_vault
  let claim = await getDbClaimByCode(code);
  if (!claim) {
    const claims = await getClaimsData();
    claim = claims.find((c: any) => c.claim_code.toUpperCase() === code);
  }

  if (!claim) {
    return NextResponse.json({
      status: "not_found",
      message: "Kode klaim tidak ditemukan. Pastikan Anda memasukkan kode unik yang sesuai dengan yang diberikan di chat Shopee."
    }, { status: 404 });
  }

  // JANGAN sertakan credential_data pada pengecekan awal!
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
      claim_status: claim.status, // "UNCLAIMED" atau "REVEALED"
      created_at: claim.created_at,
      revealed_at: claim.revealed_at,
      reveal_count: claim.reveal_count || 0,
      is_already_revealed: claim.status === "REVEALED",
      is_locked: !!(claim.locked_until && new Date(claim.locked_until) > new Date()),
    }
  });
}
