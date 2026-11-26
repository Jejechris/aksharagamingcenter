import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getDbClaims,
  upsertDbClaim,
  getDbOrders,
  saveDbOrder,
  getKV,
  setKV,
} from "@/lib/db";
import { encryptCredential } from "@/lib/cryptoVault";
import { calculateShopeeEconomics, ShopeeFeePresetId } from "@/lib/pricing";

export const dynamic = "force-dynamic";

async function readClaimsSafe(): Promise<any[]> {
  try {
    const dbClaims = await getDbClaims();
    if (dbClaims && Array.isArray(dbClaims) && dbClaims.length > 0) return dbClaims;
  } catch {}
  try {
    const kvClaims = await getKV("claimed_credentials");
    if (kvClaims && Array.isArray(kvClaims)) return kvClaims;
  } catch {}
  const localPath = path.join(process.cwd(), "data", "claimed_credentials.json");
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, "utf-8"));
    } catch {}
  }
  return [];
}

async function saveClaimsSafe(claims: any[]): Promise<void> {
  await setKV("claimed_credentials", claims).catch(() => {});
  const targets = [
    path.join(process.cwd(), "data", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "output", "claimed_credentials.json"),
    path.resolve(process.cwd(), "..", "claim-web", "data", "claimed_credentials.json"),
  ];
  for (const target of targets) {
    try {
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(target, JSON.stringify(claims, null, 2), "utf-8");
    } catch {}
  }
}

async function readLedgerSafe(): Promise<any[]> {
  try {
    const dbLedger = await getKV("financial_ledger");
    if (Array.isArray(dbLedger)) return dbLedger;
    if (dbLedger && Array.isArray(dbLedger.transactions)) return dbLedger.transactions;
  } catch {}
  for (const p of [
    path.resolve(process.cwd(), "..", "output", "financial_ledger.json"),
    path.join(process.cwd(), "data", "financial_ledger.json"),
  ]) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        return Array.isArray(parsed) ? parsed : parsed.transactions || [];
      } catch {}
    }
  }
  return [];
}

async function saveLedgerSafe(transactions: any[]): Promise<void> {
  await setKV("financial_ledger", transactions).catch(() => {});
  for (const target of [
    path.join(process.cwd(), "data", "financial_ledger.json"),
    path.resolve(process.cwd(), "..", "output", "financial_ledger.json"),
  ]) {
    try {
      const dir = path.dirname(target);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(target, JSON.stringify(transactions, null, 2), "utf-8");
      }
    } catch {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = String(
      body.order_id ||
        `SHP-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${Math.floor(1000 + Math.random() * 9000)}`
    ).trim();
    const productTitle = String(body.product_title || body.game_title || "").trim();
    const buyerUsername = String(body.buyer_username || body.buyer_name || "Kak Pembeli").trim();
    const platform = String(body.platform || "PC / Digital").trim();
    const sellingPrice = Math.max(0, Number(body.selling_price_shopee_idr ?? body.price_idr ?? 0) || 0);
    const cogsIdr = Math.max(0, Number(body.cogs_g2g_idr ?? body.cogs_idr ?? 0) || 0);
    const presetId = (body.fee_preset || "reguler") as ShopeeFeePresetId;
    const fxBufferPct = Number(body.fx_buffer_pct ?? 0) || 0;
    const warrantyDays = Math.max(1, Number(body.warranty_days ?? 30) || 30);

    if (!productTitle) {
      return NextResponse.json(
        { status: "error", message: "Nama produk/game wajib diisi untuk finalisasi pesanan." },
        { status: 400 }
      );
    }

    const rawCreds =
      String(body.credential_data || "").trim() ||
      [
        body.username ? `User/Email: ${body.username}` : "",
        body.password ? `Password: ${body.password}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

    if (!rawCreds) {
      return NextResponse.json(
        { status: "error", message: "Data kredensial lisensi wajib tersedia sebelum membuat Claim Token." },
        { status: 400 }
      );
    }

    const eco = calculateShopeeEconomics({
      sellingPriceIdr: sellingPrice,
      cogsIdr,
      presetId,
      fxBufferPct,
      packagingCostIdr: 0,
    });

    // 1. Idempotent Claim Token Creation
    const claims = await readClaimsSafe();
    let claimEntry = claims.find((c: any) => String(c.order_id || "").trim() === orderId);

    if (!claimEntry) {
      const existingPasscodes = new Set(claims.map((c: any) => String(c.passcode || "").trim()));
      let passcode = String(body.passcode || "").trim();
      if (!passcode) {
        for (let i = 0; i < 5000; i++) {
          const pin = String(Math.floor(100000 + Math.random() * 900000));
          if (!existingPasscodes.has(pin)) {
            passcode = pin;
            break;
          }
        }
        if (!passcode) passcode = String(Date.now()).slice(-6);
      }

      const existingCodes = new Set(claims.map((c: any) => String(c.claim_code || "").toUpperCase()));
      const cleanTag = productTitle.slice(0, 2).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "AK";
      let claimCode = String(body.custom_code || "").trim().toUpperCase();
      if (!claimCode) {
        for (let i = 0; i < 5000; i++) {
          const cand = `AKSH-${Math.floor(1000 + Math.random() * 9000)}-${cleanTag}`;
          if (!existingCodes.has(cand)) {
            claimCode = cand;
            break;
          }
        }
        if (!claimCode) claimCode = `AKSH-${Date.now().toString().slice(-4)}-${cleanTag}`;
      }

      const warrantySerial = `AKSHARA-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      claimEntry = {
        claim_code: claimCode,
        passcode,
        order_id: orderId,
        buyer_username: buyerUsername,
        product_title: productTitle,
        platform,
        credential_data: encryptCredential(rawCreds, passcode),
        is_encrypted: true,
        warranty_days: warrantyDays,
        warranty_code: warrantySerial,
        status: "UNCLAIMED",
        created_at: new Date().toISOString(),
        revealed_at: null,
        revealed_ip: null,
        revealed_user_agent: null,
        reveal_count: 0,
        reveal_history: [],
      };

      await upsertDbClaim(claimEntry).catch(() => {});
      claims.unshift(claimEntry);
      await saveClaimsSafe(claims);
    }

    // 2. Idempotent Financial Ledger Recording
    const ledger = await readLedgerSafe();
    let ledgerEntry = ledger.find((t: any) => String(t.order_id || "").trim() === orderId);
    if (!ledgerEntry) {
      ledgerEntry = {
        order_id: orderId,
        buyer_username: buyerUsername,
        product_name: productTitle,
        platform,
        gross_revenue_idr: sellingPrice,
        cogs_base_idr: cogsIdr,
        cogs_net_idr: eco.cogsNetIdr,
        platform_fee_idr: eco.shopeeFeeIdr,
        packaging_cost_idr: eco.packagingCostIdr,
        net_profit_idr: eco.netProfitIdr,
        net_margin_pct: eco.netMarginPct,
        fee_preset: eco.presetId,
        claim_code: claimEntry.claim_code,
        recorded_at: new Date().toISOString(),
      };
      ledger.unshift(ledgerEntry);
      await saveLedgerSafe(ledger);
    }

    // 3. Sync Autonomous Order Queue if matching record exists
    try {
      let orders = await getDbOrders();
      if (!orders || orders.length === 0) {
        const kv = await getKV("autonomous_orders");
        if (Array.isArray(kv)) orders = kv;
      }
      if (Array.isArray(orders) && orders.length > 0) {
        const target = orders.find((o: any) => o.id === body.id || o.order_id === orderId);
        if (target) {
          target.status = "DISPATCHED";
          target.credentials = {
            ...(target.credentials || {}),
            claim_code: claimEntry.claim_code,
            passcode: claimEntry.passcode,
          };
          if (!Array.isArray(target.dispatched_channels)) target.dispatched_channels = [];
          if (!target.dispatched_channels.includes("ClaimVault")) {
            target.dispatched_channels.push("ClaimVault");
          }
          await saveDbOrder(target).catch(() => {});
          await setKV("autonomous_orders", orders).catch(() => {});
          try {
            const tmpPath = path.resolve(os.tmpdir(), "akshara_autonomous_orders.json");
            fs.writeFileSync(tmpPath, JSON.stringify(orders, null, 2), "utf-8");
          } catch {}
        }
      }
    } catch {}

    const claimBaseUrl = process.env.NEXT_PUBLIC_CLAIM_URL || "https://claimakshara.vercel.app";
    const claimUrl = `${claimBaseUrl.replace(/\/$/, "")}/claim/${claimEntry.claim_code}`;

    // Shopee-Safe Zero-Link Chat: tanpa URL eksternal agar tidak diblokir/disensor filter link Shopee!
    const shopeeChatMessage =
      `Halo kak ${buyerUsername}! Pesanan *${productTitle}* (${orderId}) sudah siap diakses 100% secara digital.\n\n` +
      `📌 *Kode Klaim:* ${claimEntry.claim_code}\n` +
      `🔑 *Passcode PIN:* ${claimEntry.passcode}\n` +
      `📜 *Serial Garansi Digital:* ${claimEntry.warranty_code}\n` +
      `📷 *Cara Buka:* Scan QR Code pada gambar *Kartu Akses & Garansi Digital* yang kami kirim di atas via Kamera / Google Lens, lalu masukkan Passcode PIN.\n` +
      `🛡️ *Garansi Resmi:* ${warrantyDays} Hari (Wajib rekam layar no-cut sebelum scan & login pertama).\n\n` +
      `Setelah sukses masuk, silakan klik Pesanan Diterima ya kak. Selamat bermain!`;

    const directPortalMessage =
      `Halo kak ${buyerUsername}! Pesanan *${productTitle}* (${orderId}) siap diakses:\n` +
      `🔐 Link Klaim: ${claimUrl}\n` +
      `📌 Kode Klaim: ${claimEntry.claim_code}\n` +
      `🔑 PIN: ${claimEntry.passcode}\n` +
      `🛡️ Garansi Digital: ${warrantyDays} Hari (No. Seri: ${claimEntry.warranty_code}).`;

    return NextResponse.json({
      status: "success",
      message: `Pesanan ${orderId} difinalisasi: Claim ${claimEntry.claim_code} dibuat & laba Rp ${eco.netProfitIdr.toLocaleString("id-ID")} dicatat ke Buku Kas.`,
      claim: {
        claim_code: claimEntry.claim_code,
        passcode: claimEntry.passcode,
        warranty_code: claimEntry.warranty_code,
      },
      claim_url: claimUrl,
      ledger_entry: ledgerEntry,
      economics: eco,
      shopee_chat_message: shopeeChatMessage,
      direct_portal_message: directPortalMessage,
    });
  } catch (error: any) {
    console.error("[Order Finalize Error]:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memfinalisasi pesanan." },
      { status: 500 }
    );
  }
}
