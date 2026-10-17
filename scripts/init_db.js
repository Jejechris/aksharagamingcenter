const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
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

  // Seed claims_vault from claimed_credentials.json if empty
  const countRes = await client.query('SELECT COUNT(*) FROM claims_vault');
  const count = parseInt(countRes.rows[0].count, 10);
  if (count === 0) {
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

  await client.end();
}

main().catch(console.error);
