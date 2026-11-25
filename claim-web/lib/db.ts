import { Pool } from "pg";

function getRawDbConnection(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function isDbConfigured(): boolean {
  const raw = getRawDbConnection();
  if (!raw) return false;
  return raw.startsWith("postgres://") || raw.startsWith("postgresql://");
}

declare global {
  var __claim_portal_pg_pool__: Pool | undefined;
}

export function getDbPool(): Pool | null {
  if (!isDbConfigured()) return null;
  const connectionString = getRawDbConnection();
  if (!global.__claim_portal_pg_pool__) {
    global.__claim_portal_pg_pool__ = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 2500,
    });
  }
  return global.__claim_portal_pg_pool__;
}

export async function queryDb<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getDbPool();
  if (!pool) return [] as T[];
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export interface PublicCatalogProduct {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  warranty_days: number;
}

/**
 * Mengambil HANYA kolom katalog publik yang aman (tanpa nama supplier G2G, COGS, atau margin).
 */
export async function getPublicStorefrontCatalog(): Promise<PublicCatalogProduct[] | null> {
  if (!isDbConfigured()) return null;
  try {
    const rows = await queryDb<{
      id: string;
      title: string;
      platform: string;
      category: string;
      selling_price_shopee_idr: string | number;
      status: string;
    }>(
      "SELECT id, title, platform, category, selling_price_shopee_idr, status FROM catalog_games WHERE COALESCE(status, 'active') != 'paused' ORDER BY updated_at DESC"
    );
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        platform: r.platform,
        category: r.category || "Original Digital License",
        selling_price_shopee_idr: Number(r.selling_price_shopee_idr) || 0,
        warranty_days: 30,
      }));
    }
    return [];
  } catch (err) {
    console.warn("Notice: getPublicStorefrontCatalog failed:", err);
    return null;
  }
}

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

export async function getDbClaimByCode(code: string): Promise<any | null> {
  if (!isDbConfigured() || !code) return null;
  try {
    const rows = await queryDb(
      `SELECT claim_code, passcode, order_id, buyer_username, product_title, platform,
              credential_data, is_encrypted, warranty_days, warranty_code, status,
              created_at, revealed_at, revealed_ip, revealed_user_agent, reveal_count,
              failed_attempts, locked_until, forensics, reveal_history
       FROM claims_vault
       WHERE UPPER(claim_code) = UPPER($1)
       LIMIT 1`,
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

/**
 * Hanya memperbarui status pembukaan/lockout/forensik pada claim yang sudah ada.
 * Role database publik tidak memerlukan hak INSERT atau DELETE pada claims_vault.
 */
export async function updateDbClaimState(claim: any): Promise<boolean> {
  if (!isDbConfigured() || !claim?.claim_code) return false;
  try {
    await queryDb(
      `UPDATE claims_vault SET
        status = $2,
        revealed_at = $3,
        revealed_ip = $4,
        revealed_user_agent = $5,
        reveal_count = $6,
        failed_attempts = $7,
        locked_until = $8,
        forensics = $9,
        reveal_history = $10
      WHERE UPPER(claim_code) = UPPER($1)`,
      [
        claim.claim_code,
        claim.status || "UNCLAIMED",
        claim.revealed_at || null,
        claim.revealed_ip || null,
        claim.revealed_user_agent || null,
        Number(claim.reveal_count) || 0,
        Number(claim.failed_attempts) || 0,
        claim.locked_until || null,
        JSON.stringify(claim.forensics || {}),
        JSON.stringify(claim.reveal_history || []),
      ]
    );
    return true;
  } catch (err) {
    console.warn("Notice: updateDbClaimState failed:", err);
    return false;
  }
}

/**
 * Verifikasi status garansi publik berdasarkan warranty_code, claim_code, atau order_id.
 * Tidak pernah mengambil passcode atau credential_data.
 */
export async function getWarrantyBySerialOrOrder(query: string): Promise<any | null> {
  if (!isDbConfigured() || !query) return null;
  const clean = query.trim().toUpperCase();
  try {
    const rows = await queryDb(
      `SELECT claim_code, warranty_code, order_id, buyer_username, product_title, platform, warranty_days, status, created_at
       FROM claims_vault
       WHERE UPPER(COALESCE(warranty_code, '')) = $1
          OR UPPER(claim_code) = $1
          OR UPPER(COALESCE(order_id, '')) = $1
       LIMIT 1`,
      [clean]
    );
    if (rows && rows.length > 0) {
      return rows[0];
    }
  } catch (err) {
    console.warn("Notice: getWarrantyBySerialOrOrder failed:", err);
  }
  return null;
}
