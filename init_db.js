const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = "postgresql://postgres:Jesen310108!@db.intwrunyezoikoanskdt.supabase.co:5432/postgres";

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to Supabase!");

  await client.query(`
    CREATE TABLE IF NOT EXISTS app_kv (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Table app_kv created or exists.");

  // Migrate active_catalog.json
  const activeCatalogPath = path.join(__dirname, 'web/data/active_catalog.json');
  if (fs.existsSync(activeCatalogPath)) {
      const activeCatalog = JSON.parse(fs.readFileSync(activeCatalogPath, 'utf8'));
      await client.query(
          'INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
          ['active_catalog', JSON.stringify(activeCatalog)]
      );
      console.log("Migrated active_catalog.json");
  }

  // Migrate financial_ledger.json
  const ledgerPath = path.join(__dirname, 'web/data/financial_ledger.json');
  if (fs.existsSync(ledgerPath)) {
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      await client.query(
          'INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
          ['financial_ledger', JSON.stringify(ledger)]
      );
      console.log("Migrated financial_ledger.json");
  }

  // Migrate claimed_credentials.json
  const claimPath = path.join(__dirname, 'claim-web/data/claimed_credentials.json');
  if (fs.existsSync(claimPath)) {
      const claims = JSON.parse(fs.readFileSync(claimPath, 'utf8'));
      await client.query(
          'INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
          ['claimed_credentials', JSON.stringify(claims)]
      );
      console.log("Migrated claimed_credentials.json");
  }
  
  // Create an extra entry to track ping
  await client.query(
      'INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      ['system_ping', JSON.stringify({ last_ping: new Date().toISOString() })]
  );
  console.log("Migrated system_ping");

  await client.end();
}

main().catch(console.error);
