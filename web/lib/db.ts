import { Pool } from "pg";

const rawConnection = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export function isDbConfigured(): boolean {
  if (!rawConnection) return false;
  if (rawConnection.includes("intwrunyezoikoanskdt")) return false; // obsolete dead placeholder
  return rawConnection.startsWith("postgres://") || rawConnection.startsWith("postgresql://");
}

const connectionString = isDbConfigured() ? rawConnection : "";

// Global singleton pool for Next.js / Serverless environments
declare global {
  var __supabase_pg_pool__: Pool | undefined;
}

export function getDbPool(): Pool | null {
  if (!isDbConfigured()) return null;
  if (!global.__supabase_pg_pool__) {
    global.__supabase_pg_pool__ = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 2000,
    });
  }
  return global.__supabase_pg_pool__;
}

export async function queryDb<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getDbPool();
  if (!pool) return [] as T[];
  const res = await pool.query(text, params);
  return res.rows as T[];
}

// -------------------------------------------------------------
// Catalog Helpers
// -------------------------------------------------------------
export async function getDbCatalog(): Promise<any[] | null> {
  if (!isDbConfigured()) return null;
  try {
    const rows = await queryDb(
      "SELECT id, title, platform, category, selling_price_shopee_idr, target_margin_pct, status, selected_seller_id, sellers FROM catalog_games ORDER BY updated_at DESC"
    );
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        ...r,
        selling_price_shopee_idr: Number(r.selling_price_shopee_idr),
        target_margin_pct: Number(r.target_margin_pct),
        sellers: typeof r.sellers === "string" ? JSON.parse(r.sellers) : r.sellers || [],
      }));
    }
  } catch (err) {
    console.warn("Notice: getDbCatalog failed, using fallback:", err);
  }
  return null;
}

export async function saveDbGame(game: any): Promise<boolean> {
  try {
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
        game.id,
        game.title,
        game.platform,
        game.category || "Digital Key / Account",
        Number(game.selling_price_shopee_idr) || 100000,
        Number(game.target_margin_pct) || 25,
        game.status || "active",
        game.selected_seller_id || "",
        JSON.stringify(game.sellers || []),
      ]
    );
    return true;
  } catch (err) {
    console.warn("Notice: saveDbGame failed:", err);
    return false;
  }
}

export async function deleteDbGame(gameId: string): Promise<boolean> {
  try {
    await queryDb("DELETE FROM catalog_games WHERE id = $1", [gameId]);
    return true;
  } catch (err) {
    console.warn("Notice: deleteDbGame failed:", err);
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
        cost_idr: Number(r.cost_idr),
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
  try {
    await queryDb(
      `INSERT INTO inventory_vault (id, game_title, platform, category, username, password, cost_idr, supplier_name, status, assigned_order_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         password = EXCLUDED.password,
         cost_idr = EXCLUDED.cost_idr,
         supplier_name = EXCLUDED.supplier_name,
         status = EXCLUDED.status,
         assigned_order_id = EXCLUDED.assigned_order_id,
         dispatched_at = CASE WHEN EXCLUDED.status = 'DISPATCHED' THEN NOW() ELSE NULL END,
         notes = EXCLUDED.notes`,
      [
        item.id,
        item.game_title,
        item.platform,
        item.category || "Account (Full Access)",
        item.username,
        item.password,
        Number(item.cost_idr) || 100000,
        item.supplier_name || "G2G Verified",
        item.status || "AVAILABLE",
        item.assigned_order_id || null,
        item.notes || "",
      ]
    );
    return true;
  } catch (err) {
    console.warn("Notice: saveDbVaultItem failed:", err);
    return false;
  }
}

export async function deleteDbVaultItem(itemId: string): Promise<boolean> {
  try {
    await queryDb("DELETE FROM inventory_vault WHERE id = $1", [itemId]);
    return true;
  } catch (err) {
    console.warn("Notice: deleteDbVaultItem failed:", err);
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
        price_idr: Number(r.price_idr),
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
  try {
    await queryDb(
      `INSERT INTO autonomous_orders (id, order_id, channel, buyer_name, buyer_phone, buyer_email, game_title, platform, category, price_idr, credentials, status, dispatched_channels, messages, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         dispatched_channels = EXCLUDED.dispatched_channels,
         credentials = EXCLUDED.credentials,
         updated_at = NOW()`,
      [
        order.id,
        order.order_id,
        order.channel || "Shopee",
        order.buyer_name,
        order.buyer_phone,
        order.buyer_email,
        order.game_title,
        order.platform,
        order.category || "Account (Full Access)",
        Number(order.price_idr) || 190000,
        JSON.stringify(order.credentials || {}),
        order.status || "PROCESSED",
        order.dispatched_channels || [],
        JSON.stringify(order.messages || {}),
      ]
    );
    return true;
  } catch (err) {
    console.warn("Notice: saveDbOrder failed:", err);
    return false;
  }
}

export async function deleteDbOrder(orderId: string): Promise<boolean> {
  try {
    await queryDb("DELETE FROM autonomous_orders WHERE id = $1 OR order_id = $1", [orderId]);
    return true;
  } catch (err) {
    console.warn("Notice: deleteDbOrder failed:", err);
    return false;
  }
}
