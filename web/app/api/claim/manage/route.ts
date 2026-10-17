import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbClaims, upsertDbClaim, deleteDbClaim, getKV, setKV } from "@/lib/db";
import { encryptCredential, decryptCredential } from "@/lib/cryptoVault";

function getClaimsFilePath() {
  return path.join(process.cwd(), "data", "claimed_credentials.json");
}

async function readClaims(): Promise<any[]> {
  const dbClaims = await getDbClaims();
  if (dbClaims && Array.isArray(dbClaims) && dbClaims.length > 0) {
    return dbClaims;
  }

  const dbData = await getKV("claimed_credentials");
  if (dbData && Array.isArray(dbData)) {
    return dbData;
  }

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

async function saveClaims(claims: any[]): Promise<void> {
  // 1. Simpan ke Supabase PostgreSQL KV (Backup Source of Truth)
  await setKV("claimed_credentials", claims).catch(() => {});

  // 2. Simpan ke file disk lokal sebagai fallback
  const replicaPaths = [
    getClaimsFilePath(),
    path.resolve(process.cwd(), "..", "output", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "claim-web", "data", "claimed_credentials.json"),
  ];
  for (const rPath of replicaPaths) {
    try {
      const d = path.dirname(rPath);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(rPath, JSON.stringify(claims, null, 2), "utf-8");
    } catch (e) {}
  }
}

export async function GET() {
  const claims = await readClaims();
  const decryptedClaims = claims.map((c: any) => ({
    ...c,
    credential_data: decryptCredential(c.credential_data, c.passcode),
    is_encrypted: Boolean(c.credential_data && c.credential_data.startsWith("ENCv1:")),
  }));

  return NextResponse.json({
    status: "success",
    total: claims.length,
    unclaimed_count: claims.filter((c: any) => c.status !== "REVEALED").length,
    revealed_count: claims.filter((c: any) => c.status === "REVEALED").length,
    data: decryptedClaims,
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

    const claims = await readClaims();
    
    // Otomatiskan PIN Passcode unik (Anti-Tabrakan)
    const existingPasscodes = new Set(claims.map((c: any) => String(c.passcode || "").trim()));
    let generatedPasscode = body.passcode?.trim();
    if (!generatedPasscode) {
      for (let i = 0; i < 10000; i++) {
        const pin = String(Math.floor(100000 + Math.random() * 900000));
        if (!existingPasscodes.has(pin)) {
          generatedPasscode = pin;
          break;
        }
      }
      if (!generatedPasscode) generatedPasscode = String(Date.now()).slice(-6);
    }

    // Otomatiskan Kode Klaim unik
    const existingCodes = new Set(claims.map((c: any) => String(c.claim_code || "").toUpperCase()));
    const cleanTag = (product_title.slice(0, 2).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MC");
    let rndCode = custom_code?.trim()?.toUpperCase();
    if (!rndCode) {
      for (let i = 0; i < 10000; i++) {
        const candidate = `AKSH-${Math.floor(1000 + Math.random() * 9000)}-${cleanTag}`;
        if (!existingCodes.has(candidate)) {
          rndCode = candidate;
          break;
        }
      }
      if (!rndCode) rndCode = `AKSH-${Date.now().toString().slice(-4)}-${cleanTag}`;
    }

    const nowIso = new Date().toISOString();
    const cleanOrderId = order_id || `SHP-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;
    const warrantySerial = `AKSHARA-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const rawCredentials = credential_data.trim();
    const encryptedCreds = encryptCredential(rawCredentials, generatedPasscode);

    const newClaim = {
      claim_code: rndCode.toUpperCase(),
      passcode: generatedPasscode,
      order_id: cleanOrderId,
      buyer_username: buyer_username.trim(),
      product_title: product_title.trim(),
      platform: platform.trim(),
      credential_data: encryptedCreds,
      is_encrypted: true,
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

    // Row-level atomic insert to PostgreSQL claims_vault
    await upsertDbClaim(newClaim).catch(() => {});

    claims.unshift(newClaim);
    await saveClaims(claims);

    return NextResponse.json({
      status: "success",
      message: "Kode klaim berhasil dibuat.",
      data: {
        ...newClaim,
        credential_data: rawCredentials, // return plaintext to the creator
      },
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

  // Row-level atomic delete from PostgreSQL claims_vault
  await deleteDbClaim(code).catch(() => {});

  const claims = await readClaims();
  const filtered = claims.filter((c: any) => c.claim_code.toUpperCase() !== code);

  if (filtered.length === claims.length) {
    return NextResponse.json({ status: "not_found", message: "Kode tidak ditemukan." }, { status: 404 });
  }

  await saveClaims(filtered);
  return NextResponse.json({ status: "success", message: "Kode klaim berhasil dihapus." });
}
