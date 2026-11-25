const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'web', '.env.local') });
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!DB_URL) {
  console.error("DATABASE_URL or POSTGRES_URL environment variable is required.");
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to Supabase PostgreSQL!");

  // 1. Table app_kv
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_kv (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table app_kv verified.");

  // 2. Table claims_vault (Atomic Row-Level Claims Storage)
  await client.query(`
    CREATE TABLE IF NOT EXISTS claims_vault (
      claim_code VARCHAR(64) PRIMARY KEY,
      passcode VARCHAR(32) NOT NULL,
      order_id VARCHAR(64),
      buyer_username VARCHAR(128),
      product_title VARCHAR(255),
      platform VARCHAR(128),
      credential_data TEXT NOT NULL,
      is_encrypted BOOLEAN DEFAULT TRUE,
      warranty_days INT DEFAULT 30,
      warranty_code VARCHAR(64),
      status VARCHAR(32) DEFAULT 'UNCLAIMED',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revealed_at TIMESTAMPTZ,
      revealed_ip VARCHAR(64),
      revealed_user_agent TEXT,
      reveal_count INT DEFAULT 0,
      failed_attempts INT DEFAULT 0,
      locked_until TIMESTAMPTZ,
      forensics JSONB DEFAULT '{}'::jsonb,
      reveal_history JSONB DEFAULT '[]'::jsonb
    );
  `);
  console.log("✓ Table claims_vault verified.");

  // 3. Table catalog_games
  await client.query(`
    CREATE TABLE IF NOT EXISTS catalog_games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      platform TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Digital Key / Account',
      selling_price_shopee_idr BIGINT NOT NULL DEFAULT 100000,
      target_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 25.0,
      status TEXT NOT NULL DEFAULT 'active',
      selected_seller_id TEXT,
      sellers JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_catalog_games_title ON catalog_games(title);
  `);
  console.log("✓ Table catalog_games verified.");

  // 4. Table inventory_vault
  await client.query(`
    CREATE TABLE IF NOT EXISTS inventory_vault (
      id TEXT PRIMARY KEY,
      game_title TEXT NOT NULL,
      platform TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Account (Full Access)',
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      cost_idr BIGINT NOT NULL DEFAULT 100000,
      supplier_name TEXT NOT NULL DEFAULT 'G2G Verified',
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      assigned_order_id TEXT,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      dispatched_at TIMESTAMPTZ,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_vault_game_status ON inventory_vault(game_title, status);
  `);
  console.log("✓ Table inventory_vault verified.");

  // 5. Table autonomous_orders
  await client.query(`
    CREATE TABLE IF NOT EXISTS autonomous_orders (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      channel TEXT NOT NULL DEFAULT 'Shopee',
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      game_title TEXT NOT NULL,
      platform TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Account (Full Access)',
      price_idr BIGINT NOT NULL DEFAULT 190000,
      credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'PROCESSED',
      dispatched_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
      messages JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_orders_order_id ON autonomous_orders(order_id);
  `);
  console.log("✓ Table autonomous_orders verified.");

  // Seed claims_vault from claimed_credentials.json if empty
  const countClaimsRes = await client.query('SELECT COUNT(*) FROM claims_vault');
  const countClaims = parseInt(countClaimsRes.rows[0].count, 10);
  if (countClaims === 0) {
    const claimPath = path.join(__dirname, '..', 'claim-web/data/claimed_credentials.json');
    const webClaimPath = path.join(__dirname, '..', 'web/data/claimed_credentials.json');
    let sourceClaims = [];
    if (fs.existsSync(claimPath)) {
      sourceClaims = JSON.parse(fs.readFileSync(claimPath, 'utf8'));
    } else if (fs.existsSync(webClaimPath)) {
      sourceClaims = JSON.parse(fs.readFileSync(webClaimPath, 'utf8'));
    }

    if (Array.isArray(sourceClaims) && sourceClaims.length > 0) {
      for (const c of sourceClaims) {
        await client.query(`
          INSERT INTO claims_vault (
            claim_code, passcode, order_id, buyer_username, product_title, platform,
            credential_data, is_encrypted, warranty_days, warranty_code, status,
            created_at, revealed_at, revealed_ip, revealed_user_agent, reveal_count,
            failed_attempts, locked_until, forensics, reveal_history
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (claim_code) DO NOTHING
        `, [
          c.claim_code,
          c.passcode || "123456",
          c.order_id || null,
          c.buyer_username || "anonymous",
          c.product_title || "Game",
          c.platform || "PC",
          c.credential_data || "",
          Boolean(c.is_encrypted ?? (c.credential_data && c.credential_data.startsWith("ENCv1:"))),
          c.warranty_days || 30,
          c.warranty_code || null,
          c.status || "UNCLAIMED",
          c.created_at || new Date().toISOString(),
          c.revealed_at || null,
          c.revealed_ip || null,
          c.revealed_user_agent || null,
          c.reveal_count || 0,
          c.failed_attempts || 0,
          c.locked_until || null,
          JSON.stringify(c.forensics || {}),
          JSON.stringify(c.reveal_history || [])
        ]);
      }
      console.log(`✓ Seeded ${sourceClaims.length} records into claims_vault.`);
    }
  }

  // Seed catalog_games from active_catalog.json if empty
  const countCatalogRes = await client.query('SELECT COUNT(*) FROM catalog_games');
  const countCatalog = parseInt(countCatalogRes.rows[0].count, 10);
  if (countCatalog === 0) {
    const catalogPath = path.join(__dirname, '..', 'web/data/active_catalog.json');
    if (fs.existsSync(catalogPath)) {
      const games = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      if (Array.isArray(games)) {
        for (const g of games) {
          await client.query(
            `INSERT INTO catalog_games (id, title, platform, category, selling_price_shopee_idr, target_margin_pct, status, selected_seller_id, sellers)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO NOTHING`,
            [
              g.id || `game-${Date.now()}-${Math.random()}`,
              g.title,
              g.platform,
              g.category || 'Digital Key / Account',
              g.selling_price_shopee_idr || 100000,
              g.target_margin_pct || 25,
              g.status || 'active',
              g.selected_seller_id || (g.sellers && g.sellers[0] ? g.sellers[0].id : null),
              JSON.stringify(g.sellers || []),
            ]
          );
        }
        console.log(`✓ Seeded ${games.length} games into catalog_games.`);
      }
    }
  }

  // Seed inventory_vault from JSON if empty
  const countVaultRes = await client.query('SELECT COUNT(*) FROM inventory_vault');
  const countVault = parseInt(countVaultRes.rows[0].count, 10);
  if (countVault === 0) {
    const vaultPath = path.join(__dirname, '..', 'web/data/inventory_vault.json');
    const outVaultPath = path.join(__dirname, '..', 'output/inventory_vault.json');
    let sourceVault = [];
    if (fs.existsSync(vaultPath)) {
      sourceVault = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
    } else if (fs.existsSync(outVaultPath)) {
      sourceVault = JSON.parse(fs.readFileSync(outVaultPath, 'utf8'));
    }
    if (Array.isArray(sourceVault) && sourceVault.length > 0) {
      for (const v of sourceVault) {
        await client.query(
          `INSERT INTO inventory_vault (id, game_title, platform, category, username, password, cost_idr, supplier_name, status, assigned_order_id, added_at, dispatched_at, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO NOTHING`,
          [
            v.id || `inv-${Date.now()}-${Math.random()}`,
            v.game_title || "Game",
            v.platform || "PC",
            v.category || "Account (Full Access)",
            v.username || "",
            v.password || "",
            v.cost_idr || 100000,
            v.supplier_name || "G2G Verified",
            v.status || "AVAILABLE",
            v.assigned_order_id || null,
            v.added_at || new Date().toISOString(),
            v.dispatched_at || null,
            v.notes || null
          ]
        );
      }
      console.log(`✓ Seeded ${sourceVault.length} items into inventory_vault.`);
    }
  }

  // Seed app_kv defaults
  const activeCatalogPath = path.join(__dirname, '..', 'web/data/active_catalog.json');
  if (fs.existsSync(activeCatalogPath)) {
    const activeCatalog = JSON.parse(fs.readFileSync(activeCatalogPath, 'utf8'));
    await client.query(
      'INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      ['active_catalog', JSON.stringify(activeCatalog)]
    );
    console.log("✓ app_kv: active_catalog seeded.");
  }

  const ledgerPath = path.join(__dirname, '..', 'web/data/financial_ledger.json');
  if (fs.existsSync(ledgerPath)) {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    await client.query(
      'INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      ['financial_ledger', JSON.stringify(ledger)]
    );
    console.log("✓ app_kv: financial_ledger seeded.");
  }

  await client.query(
    'INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    ['system_ping', JSON.stringify({ last_ping: new Date().toISOString() })]
  );
  console.log("✓ app_kv: system_ping updated.");

  await client.end();
  console.log("✓ All 5 tables initialized and verified successfully!");
}

main().catch(console.error);
