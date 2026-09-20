const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.intwrunyezoikoanskdt:W8pX4Gczovlqpqw9@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('Connecting to Supabase PostgreSQL...');
  
  // 1. Create Tables
  const createTablesSql = `
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

    CREATE INDEX IF NOT EXISTS idx_catalog_games_title ON catalog_games(title);
    CREATE INDEX IF NOT EXISTS idx_vault_game_status ON inventory_vault(game_title, status);
    CREATE INDEX IF NOT EXISTS idx_orders_order_id ON autonomous_orders(order_id);
  `;

  await pool.query(createTablesSql);
  console.log('✓ Tables created / verified successfully on Supabase.');

  // 2. Seed catalog_games from active_catalog.json if table is empty
  const catalogCountRes = await pool.query('SELECT COUNT(*) FROM catalog_games');
  const count = parseInt(catalogCountRes.rows[0].count, 10);
  console.log(`Current catalog_games in Supabase: ${count}`);

  if (count === 0) {
    const catalogPath = path.resolve(__dirname, 'data', 'active_catalog.json');
    if (fs.existsSync(catalogPath)) {
      const games = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      for (const g of games) {
        await pool.query(
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
            g.selected_seller_id || '',
            JSON.stringify(g.sellers || []),
          ]
        );
      }
      console.log(`✓ Seeded ${games.length} games into Supabase catalog_games.`);
    }
  }

  // 3. Seed inventory_vault from inventory_vault.json if empty
  const vaultCountRes = await pool.query('SELECT COUNT(*) FROM inventory_vault');
  const vaultCount = parseInt(vaultCountRes.rows[0].count, 10);
  console.log(`Current inventory_vault in Supabase: ${vaultCount}`);

  if (vaultCount === 0) {
    const vaultPath = path.resolve(__dirname, 'data', 'inventory_vault.json');
    if (fs.existsSync(vaultPath)) {
      const items = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
      for (const item of items) {
        await pool.query(
          `INSERT INTO inventory_vault (id, game_title, platform, category, username, password, cost_idr, supplier_name, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            item.id,
            item.game_title,
            item.platform,
            item.category || 'Account (Full Access)',
            item.username,
            item.password,
            item.cost_idr || 100000,
            item.supplier_name || 'G2G Verified',
            item.status || 'AVAILABLE',
            item.notes || 'Seed buffer stock',
          ]
        );
      }
      console.log(`✓ Seeded ${items.length} units into Supabase inventory_vault.`);
    }
  }

  // 4. Test fetch
  const allGames = await pool.query('SELECT id, title, platform, selling_price_shopee_idr, jsonb_array_length(sellers) as seller_count FROM catalog_games');
  console.log('Sample games from Supabase:', allGames.rows);

  await pool.end();
  console.log('Supabase setup completed perfectly!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  pool.end();
  process.exit(1);
});
