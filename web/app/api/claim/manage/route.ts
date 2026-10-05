import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getClaimsFilePath() {
  return path.join(process.cwd(), "data", "claimed_credentials.json");
}

function readClaims(): any[] {
  const p = getClaimsFilePath();
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch (e) {
      console.error("Error reading claims:", e);
    }
  }
  return [];
}

function saveClaims(claims: any[]) {
  const p = getClaimsFilePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(claims, null, 2), "utf-8");

  // Sinkronkan ke replika jika ada
  const replicaPaths = [
    "C:\\Users\\jesen\\Desktop\\scrt\\web\\data\\claimed_credentials.json",
    path.resolve(process.cwd(), "..", "output", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "claim-web", "data", "claimed_credentials.json"),
    "C:\\Users\\jesen\\Desktop\\scrt\\claim-web\\data\\claimed_credentials.json",
  ];
  for (const rPath of replicaPaths) {
    try {
      const d = path.dirname(rPath);
      if (fs.existsSync(d)) {
        fs.writeFileSync(rPath, JSON.stringify(claims, null, 2), "utf-8");
      }
    } catch (e) {}
  }
}

export async function GET() {
  const claims = readClaims();
  return NextResponse.json({
    status: "success",
    total: claims.length,
    unclaimed_count: claims.filter((c: any) => c.status !== "REVEALED").length,
    revealed_count: claims.filter((c: any) => c.status === "REVEALED").length,
    data: claims,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      product_title,
      buyer_username,
      credential_data,
      platform = "PC / Steam",
      order_id,
      warranty_days = 30,
      custom_code,
    } = body;

    if (!product_title || !buyer_username || !credential_data) {
      return NextResponse.json({
        status: "error",
        message: "Data produk, nama pembeli, dan data kredensial wajib diisi."
      }, { status: 400 });
    }

    const claims = readClaims();
    const rndCode = custom_code || `AKSH-${Math.floor(1000 + Math.random() * 9000)}-${product_title.slice(0, 2).toUpperCase()}`;
    const generatedPasscode = body.passcode || String(Math.floor(100000 + Math.random() * 900000));
    const nowIso = new Date().toISOString();
    const cleanOrderId = order_id || `SHP-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;
    const warrantySerial = `AKSHARA-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newClaim = {
      claim_code: rndCode.toUpperCase(),
      passcode: generatedPasscode,
      order_id: cleanOrderId,
      buyer_username: buyer_username.trim(),
      product_title: product_title.trim(),
      platform: platform.trim(),
      credential_data: credential_data.trim(),
      warranty_days: Number(warranty_days) || 30,
      warranty_code: warrantySerial,
      status: "UNCLAIMED",
      created_at: nowIso,
      revealed_at: null,
      revealed_ip: null,
      revealed_user_agent: null,
      reveal_count: 0,
      reveal_history: [],
    };

    claims.unshift(newClaim);
    saveClaims(claims);

    return NextResponse.json({
      status: "success",
      message: "Kode klaim berhasil dibuat.",
      data: newClaim,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ status: "error", message: "Kode klaim wajib diisi." }, { status: 400 });
  }

  const claims = readClaims();
  const filtered = claims.filter((c: any) => c.claim_code.toUpperCase() !== code);

  if (filtered.length === claims.length) {
    return NextResponse.json({ status: "not_found", message: "Kode tidak ditemukan." }, { status: 404 });
  }

  saveClaims(filtered);
  return NextResponse.json({ status: "success", message: "Kode klaim berhasil dihapus." });
}
