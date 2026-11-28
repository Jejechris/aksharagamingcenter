import { Pool } from "pg";
import { ensureRootEnvLoaded } from "@/lib/envLoader";

function getRawDbConnection(): string {
  ensureRootEnvLoaded();
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function isDbConfigured(): boolean {
  const raw = getRawDbConnection();
  if (!raw) return false;
  return raw.startsWith("postgres://") || raw.startsWith("postgresql://");
}

// Global singleton pool for Next.js / Serverless environments
declare global {
  var __supabase_pg_pool__: Pool | undefined;
  var __last_db_error__: string | null | undefined;
}

export function getLastDbError(): string | null {
  return global.__last_db_error__ || null;
}

export function getDbPool(): Pool | null {
  if (!isDbConfigured()) return null;
  const connectionString = getRawDbConnection();
  if (!global.__supabase_pg_pool__) {
    global.__supabase_pg_pool__ = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 8000,
    });
  }
  return global.__supabase_pg_pool__;
}

export async function queryDb<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getDbPool();
  if (!pool) return [] as T[];
  try {
    const res = await pool.query(text, params);
    global.__last_db_error__ = null;
    return res.rows as T[];
  } catch (err: any) {
    global.__last_db_error__ = err?.message || String(err);
    throw err;
  }
}

function toSafeBigInt(val: any, fallback: number = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return Math.max(0, Math.round(fallback));
  return Math.max(0, Math.round(num));
}

function toSafeNumeric(val: any, fallback: number = 0, decimals: number = 2): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

// -------------------------------------------------------------
// Catalog Helpers
// -------------------------------------------------------------
export async function getDbCatalog(): Promise<any[] | null> {
  if (!isDbConfigured()) return null;
  try {
    const rows = await queryDb(
      "SELECT id, title, platform, category, selling_price_shopee_idr, target_margin_pct, status, selected_seller_id, sellers FROM catalog_games ORDER BY LOWER(title) ASC, id ASC"
    );
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        ...r,
        selling_price_shopee_idr: Number(r.selling_price_shopee_idr) || 0,
        target_margin_pct: Number(r.target_margin_pct) || 0,
        sellers: typeof r.sellers === "string" ? JSON.parse(r.sellers) : r.sellers || [],
      }));
    }
  } catch (err) {
    console.warn("Notice: getDbCatalog failed, using fallback:", err);
  }
  return null;
}

export async function saveDbGame(game: any): Promise<boolean> {
  if (!isDbConfigured() || !game || !game.id || !game.title) return false;
  try {
    const sellers = Array.isArray(game.sellers) ? game.sellers : [];
    const safeSellingPrice = toSafeBigInt(game.selling_price_shopee_idr, 100000);
    const safeMargin = toSafeNumeric(game.target_margin_pct, 25, 2);
    const rawSelected = String(game.selected_seller_id || "").trim();
    const resolvedSelected =
      rawSelected && sellers.some((s: any) => s.seller_id === rawSelected)
        ? rawSelected
        : String(sellers[0]?.seller_id || rawSelected || "");

    await queryDb(
      `INSERT INTO catalog_games (id, title, platform, category, selling_price_shopee_idr, target_margin_pct, status, selected_seller_id, sellers, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         platform = EXCLUDED.platform,
         category = EXCLUDED.category,
         selling_price_shopee_idr = EXCLUDED.selling_price_shopee_idr,
         target_margin_pct = EXCLUDED.target_margin_pct,
         status = EXCLUDED.status,
         selected_seller_id = EXCLUDED.selected_seller_id,
         sellers = EXCLUDED.sellers,
         updated_at = NOW()`,
      [
        String(game.id).trim(),
        String(game.title).trim(),
        String(game.platform || "PC").trim(),
        String(game.category || "Digital Key / Account").trim(),
        safeSellingPrice,
        safeMargin,
        String(game.status || "active").trim(),
        resolvedSelected,
        JSON.stringify(sellers),
      ]
    );
    return true;
  } catch (err) {
    console.error("Error: saveDbGame failed:", err);
    return false;
  }
}

export async function deleteDbGame(gameId: string): Promise<boolean> {
  if (!isDbConfigured() || !gameId) return false;
  try {
    await queryDb("DELETE FROM catalog_games WHERE id = $1", [gameId]);
    return true;
  } catch (err) {
    console.error("Error: deleteDbGame failed:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Inventory Vault Helpers (Mode A)
// -------------------------------------------------------------
export async function getDbVault(): Promise<any[] | null> {
  try {
    const rows = await queryDb(
      "SELECT id, game_title, platform, category, username, password, cost_idr, supplier_name, status, assigned_order_id, added_at, dispatched_at, notes FROM inventory_vault ORDER BY added_at DESC"
    );
    if (rows) {
      return rows.map((r: any) => ({
        ...r,
        cost_idr: Number(r.cost_idr) || 0,
        added_at: r.added_at ? new Date(r.added_at).toISOString().replace("T", " ").substring(0, 19) : "",
        dispatched_at: r.dispatched_at ? new Date(r.dispatched_at).toISOString().replace("T", " ").substring(0, 19) : undefined,
      }));
    }
  } catch (err) {
    console.warn("Notice: getDbVault failed, using fallback:", err);
  }
  return null;
}

export async function saveDbVaultItem(item: any): Promise<boolean> {
  if (!isDbConfigured() || !item || !item.id) return false;
  try {
    const safeStatus = String(item.status || "AVAILABLE").trim();
    await queryDb(
      `INSERT INTO inventory_vault (id, game_title, platform, category, username, password, cost_idr, supplier_name, status, assigned_order_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         game_title = EXCLUDED.game_title,
         platform = EXCLUDED.platform,
         category = EXCLUDED.category,
         username = EXCLUDED.username,
         password = EXCLUDED.password,
         cost_idr = EXCLUDED.cost_idr,
         supplier_name = EXCLUDED.supplier_name,
         status = EXCLUDED.status,
         assigned_order_id = EXCLUDED.assigned_order_id,
         dispatched_at = CASE WHEN EXCLUDED.status = 'DISPATCHED' THEN COALESCE(inventory_vault.dispatched_at, NOW()) ELSE NULL END,
         notes = EXCLUDED.notes`,
      [
        String(item.id).trim(),
        String(item.game_title || "Game License").trim(),
        String(item.platform || "PC").trim(),
        String(item.category || "Account (Full Access)").trim(),
        String(item.username ?? "").trim() || "(Direct Key)",
        String(item.password ?? ""),
        toSafeBigInt(item.cost_idr, 0),
        String(item.supplier_name || "G2G Verified").trim(),
        safeStatus,
        item.assigned_order_id || null,
        String(item.notes ?? ""),
      ]
    );
    return true;
  } catch (err) {
    console.error("Error: saveDbVaultItem failed:", err);
    return false;
  }
}

export async function deleteDbVaultItem(itemId: string): Promise<boolean> {
  if (!isDbConfigured() || !itemId) return false;
  try {
    await queryDb("DELETE FROM inventory_vault WHERE id = $1", [itemId]);
    return true;
  } catch (err) {
    console.error("Error: deleteDbVaultItem failed:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Autonomous Orders Helpers
// -------------------------------------------------------------
export async function getDbOrders(): Promise<any[] | null> {
  try {
    const rows = await queryDb(
      "SELECT id, order_id, channel, buyer_name, buyer_phone, buyer_email, game_title, platform, category, price_idr, credentials, status, dispatched_channels, messages, created_at FROM autonomous_orders ORDER BY created_at DESC"
    );
    if (rows) {
      return rows.map((r: any) => ({
        ...r,
        price_idr: Number(r.price_idr) || 0,
        credentials: typeof r.credentials === "string" ? JSON.parse(r.credentials) : r.credentials || {},
        messages: typeof r.messages === "string" ? JSON.parse(r.messages) : r.messages || {},
        created_at: r.created_at ? new Date(r.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
      }));
    }
  } catch (err) {
    console.warn("Notice: getDbOrders failed, using fallback:", err);
  }
  return null;
}

export async function saveDbOrder(order: any): Promise<boolean> {
  if (!isDbConfigured() || !order || !order.id || !order.order_id) return false;
  try {
    await queryDb(
      `INSERT INTO autonomous_orders (id, order_id, channel, buyer_name, buyer_phone, buyer_email, game_title, platform, category, price_idr, credentials, status, dispatched_channels, messages, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       ON CONFLICT (id) DO UPDATE SET
         order_id = EXCLUDED.order_id,
         channel = EXCLUDED.channel,
         buyer_name = EXCLUDED.buyer_name,
         buyer_phone = EXCLUDED.buyer_phone,
         buyer_email = EXCLUDED.buyer_email,
         game_title = EXCLUDED.game_title,
         platform = EXCLUDED.platform,
         category = EXCLUDED.category,
         price_idr = EXCLUDED.price_idr,
         status = EXCLUDED.status,
         dispatched_channels = EXCLUDED.dispatched_channels,
         credentials = EXCLUDED.credentials,
         messages = EXCLUDED.messages,
         updated_at = NOW()`,
      [
        String(order.id).trim(),
        String(order.order_id).trim(),
        String(order.channel || "Shopee").trim(),
        String(order.buyer_name || "Kak Pembeli").trim(),
        String(order.buyer_phone || "-").trim(),
        String(order.buyer_email || "buyer@customer.akshara-game.id").trim(),
        String(order.game_title || "Game License").trim(),
        String(order.platform || "PC").trim(),
        String(order.category || "Account (Full Access)").trim(),
        toSafeBigInt(order.price_idr, 0),
        JSON.stringify(order.credentials || {}),
        String(order.status || "PROCESSED").trim(),
        Array.isArray(order.dispatched_channels) ? order.dispatched_channels : [],
        JSON.stringify(order.messages || {}),
      ]
    );
    return true;
  } catch (err) {
    console.error("Error: saveDbOrder failed:", err);
    return false;
  }
}

export async function deleteDbOrder(orderId: string): Promise<boolean> {
  if (!isDbConfigured() || !orderId) return false;
  try {
    await queryDb("DELETE FROM autonomous_orders WHERE id = $1 OR order_id = $1", [orderId]);
    return true;
  } catch (err) {
    console.error("Error: deleteDbOrder failed:", err);
    return false;
  }
}

// App KV Store Helpers
export async function getKV(key: string): Promise<any> {
  if (!isDbConfigured()) return null;
  try {
    const rows = await queryDb("SELECT value FROM app_kv WHERE key = $1", [key]);
    if (rows && rows.length > 0) return rows[0].value;
  } catch (err) {
    console.warn("Notice: getKV failed for key:", key, err);
  }
  return null;
}

export async function setKV(key: string, value: any): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await queryDb(
      "INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP",
      [key, JSON.stringify(value)]
    );
    return true;
  } catch (err) {
    console.error("Error: setKV failed for key:", key, err);
    return false;
  }
}

/**
 * Menjaga database Supabase tetap aktif (anti auto-pause 7 hari inaktif) dengan memperbarui
 * 1 baris heartbeat tunggal `supabase_keepalive` di `app_kv` tanpa membuat data sampah baru.
 */
export async function touchSupabaseKeepalive(source: string = "app_cron"): Promise<{
  ok: boolean;
  pinged_at: string;
  source: string;
}> {
  const pingedAt = new Date().toISOString();
  if (!isDbConfigured()) {
    return { ok: false, pinged_at: pingedAt, source };
  }
  try {
    await queryDb("SELECT 1 AS ping");
    const existing = await getKV("supabase_keepalive");
    const totalPings = Number(existing?.total_pings || 0) + 1;
    await setKV("supabase_keepalive", {
      pinged_at: pingedAt,
      source,
      status: "alive",
      total_pings: totalPings,
    });
    return { ok: true, pinged_at: pingedAt, source };
  } catch {
    return { ok: false, pinged_at: pingedAt, source };
  }
}

// -------------------------------------------------------------
// Atomic Claims Vault Helpers (Row-Level Concurrency Guard)
// -------------------------------------------------------------

function mapClaimRow(r: any): any {
  if (!r) return null;
  return {
    claim_code: r.claim_code,
    passcode: r.passcode,
    order_id: r.order_id,
    buyer_username: r.buyer_username,
    product_title: r.product_title,
    platform: r.platform,
    credential_data: r.credential_data,
    is_encrypted: Boolean(r.is_encrypted),
    warranty_days: Number(r.warranty_days) || 30,
    warranty_code: r.warranty_code,
    status: r.status,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    revealed_at: r.revealed_at ? new Date(r.revealed_at).toISOString() : null,
    revealed_ip: r.revealed_ip || null,
    revealed_user_agent: r.revealed_user_agent || null,
    reveal_count: Number(r.reveal_count) || 0,
    failed_attempts: Number(r.failed_attempts) || 0,
    locked_until: r.locked_until ? new Date(r.locked_until).toISOString() : null,
    forensics: typeof r.forensics === "string" ? JSON.parse(r.forensics) : r.forensics || {},
    reveal_history: typeof r.reveal_history === "string" ? JSON.parse(r.reveal_history) : r.reveal_history || [],
  };
}

export async function upsertDbClaim(claim: any): Promise<boolean> {
  if (!isDbConfigured() || !claim || !claim.claim_code) return false;
  try {
    await queryDb(
      `INSERT INTO claims_vault (
        claim_code, passcode, order_id, buyer_username, product_title, platform,
        credential_data, is_encrypted, warranty_days, warranty_code, status,
        created_at, revealed_at, revealed_ip, revealed_user_agent, reveal_count,
        failed_attempts, locked_until, forensics, reveal_history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (claim_code) DO UPDATE SET
        passcode = EXCLUDED.passcode,
        order_id = COALESCE(EXCLUDED.order_id, claims_vault.order_id),
        buyer_username = COALESCE(EXCLUDED.buyer_username, claims_vault.buyer_username),
        product_title = COALESCE(EXCLUDED.product_title, claims_vault.product_title),
        platform = COALESCE(EXCLUDED.platform, claims_vault.platform),
        credential_data = EXCLUDED.credential_data,
        is_encrypted = EXCLUDED.is_encrypted,
        warranty_days = EXCLUDED.warranty_days,
        warranty_code = COALESCE(EXCLUDED.warranty_code, claims_vault.warranty_code),
        status = EXCLUDED.status,
        revealed_at = EXCLUDED.revealed_at,
        revealed_ip = EXCLUDED.revealed_ip,
        revealed_user_agent = EXCLUDED.revealed_user_agent,
        reveal_count = EXCLUDED.reveal_count,
        failed_attempts = EXCLUDED.failed_attempts,
        locked_until = EXCLUDED.locked_until,
        forensics = EXCLUDED.forensics,
        reveal_history = EXCLUDED.reveal_history`,
      [
        String(claim.claim_code).trim().toUpperCase(),
        String(claim.passcode || "").trim(),
        claim.order_id || null,
        claim.buyer_username || "anonymous",
        claim.product_title || "Game Account",
        claim.platform || "PC",
        claim.credential_data || "",
        Boolean(claim.is_encrypted ?? (claim.credential_data && String(claim.credential_data).startsWith("ENCv1:"))),
        toSafeBigInt(claim.warranty_days, 30) || 30,
        claim.warranty_code || null,
        claim.status || "UNCLAIMED",
        claim.created_at || new Date().toISOString(),
        claim.revealed_at || null,
        claim.revealed_ip || null,
        claim.revealed_user_agent || null,
        toSafeBigInt(claim.reveal_count, 0),
        toSafeBigInt(claim.failed_attempts, 0),
        claim.locked_until || null,
        JSON.stringify(claim.forensics || {}),
        JSON.stringify(claim.reveal_history || []),
      ]
    );
    return true;
  } catch (err) {
    console.error("Error: upsertDbClaim failed:", err);
    return false;
  }
}

export async function getDbClaims(): Promise<any[] | null> {
  if (!isDbConfigured()) return null;
  try {
    const rows = await queryDb(
      "SELECT * FROM claims_vault ORDER BY created_at DESC"
    );
    if (rows && rows.length > 0) {
      return rows.map(mapClaimRow);
    }
    // Auto-seed from KV if table is empty
    const kvClaims = await getKV("claimed_credentials");
    if (Array.isArray(kvClaims) && kvClaims.length > 0) {
      for (const c of kvClaims) {
        await upsertDbClaim(c).catch(() => {});
      }
      return kvClaims;
    }
    return [];
  } catch (err) {
    console.warn("Notice: getDbClaims failed, falling back to KV:", err);
    return null;
  }
}

export async function getDbClaimByCode(code: string): Promise<any | null> {
  if (!isDbConfigured() || !code) return null;
  try {
    const rows = await queryDb(
      "SELECT * FROM claims_vault WHERE UPPER(claim_code) = UPPER($1) LIMIT 1",
      [code.trim()]
    );
    if (rows && rows.length > 0) {
      return mapClaimRow(rows[0]);
    }
  } catch (err) {
    console.warn("Notice: getDbClaimByCode failed:", err);
  }
  return null;
}

export async function deleteDbClaim(code: string): Promise<boolean> {
  if (!isDbConfigured() || !code) return false;
  try {
    await queryDb("DELETE FROM claims_vault WHERE UPPER(claim_code) = UPPER($1)", [code.trim()]);
    return true;
  } catch (err) {
    console.error("Error: deleteDbClaim failed:", err);
    return false;
  }
}
