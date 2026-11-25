const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

function loadEnvFile(envPath) {
  try {
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const idx = t.indexOf("=");
      const k = t.slice(0, idx).trim();
      let v = t.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k && v && !process.env[k]) process.env[k] = v;
    }
  } catch {}
}

loadEnvFile(path.join(__dirname, "..", "web", ".env.local"));
loadEnvFile(path.join(__dirname, "..", ".env"));

let pgModule;
try {
  pgModule = require("pg");
} catch {
  pgModule = require(path.join(__dirname, "..", "web", "node_modules", "pg"));
}
const { Client } = pgModule;

function upsertEnvVar(content, key, value) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  return content.trimEnd() + eol + `${key}=${value}` + eol;
}

async function main() {
  const adminUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!adminUrl) {
    console.error("DATABASE_URL admin is required.");
    process.exit(1);
  }

  const parsedAdmin = new URL(adminUrl);
  const host = parsedAdmin.hostname;
  const port = parsedAdmin.port || "6543";
  const dbName = parsedAdmin.pathname.replace(/^\//, "") || "postgres";
  const userParts = parsedAdmin.username.split(".");
  const projectRef = userParts.length > 1 ? userParts[1] : "";

  const claimEnvPath = path.join(__dirname, "..", "claim-web", ".env.local");
  const webEnvPath = path.join(__dirname, "..", "web", ".env.local");
  const claimEnvRaw = fs.existsSync(claimEnvPath) ? fs.readFileSync(claimEnvPath, "utf8") : "";
  const webEnvRaw = fs.existsSync(webEnvPath) ? fs.readFileSync(webEnvPath, "utf8") : "";

  // Reuse or generate dedicated password for least-privilege public portal role
  let rolePassword = "";
  const existingClaimDbMatch = claimEnvRaw.match(/^DATABASE_URL=(.*)$/m);
  if (existingClaimDbMatch && existingClaimDbMatch[1].includes("akshara_public_portal")) {
    try {
      rolePassword = decodeURIComponent(new URL(existingClaimDbMatch[1].trim()).password);
    } catch {}
  }
  if (!rolePassword) {
    rolePassword = crypto.randomBytes(24).toString("hex");
  }

  const client = new Client({
    connectionString: adminUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected with admin role to configure least-privilege isolation...");

  const safePasswordLit = rolePassword.replace(/'/g, "''");

  // 1. Create or update least-privilege role `akshara_public_portal`
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'akshara_public_portal') THEN
        CREATE ROLE akshara_public_portal LOGIN PASSWORD '${safePasswordLit}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
      ELSE
        ALTER ROLE akshara_public_portal WITH LOGIN PASSWORD '${safePasswordLit}';
      END IF;
    END
    $$;
  `);

  // 2. Revoke default/broad access and grant strictly minimum column-level permissions
  await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM akshara_public_portal;`);
  await client.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM akshara_public_portal;`);
  await client.query(`GRANT USAGE ON SCHEMA public TO akshara_public_portal;`);

  // catalog_games: strictly PUBLIC columns ONLY (NO sellers, NO target_margin_pct, NO selected_seller_id)
  await client.query(`
    GRANT SELECT (id, title, platform, category, selling_price_shopee_idr, status, updated_at)
    ON TABLE public.catalog_games TO akshara_public_portal;
  `);

  // claims_vault: strictly SELECT + narrow UPDATE on reveal/lockout columns (NO INSERT, NO DELETE, NO altering credentials/passcode)
  await client.query(`
    GRANT SELECT ON TABLE public.claims_vault TO akshara_public_portal;
    GRANT UPDATE (status, revealed_at, revealed_ip, revealed_user_agent, reveal_count, failed_attempts, locked_until, forensics, reveal_history)
    ON TABLE public.claims_vault TO akshara_public_portal;
  `);

  // 3. Ensure RLS enabled on all 5 tables + scoped policies ONLY for akshara_public_portal (anon remains locked)
  for (const tbl of ["app_kv", "claims_vault", "catalog_games", "inventory_vault", "autonomous_orders"]) {
    await client.query(`ALTER TABLE IF EXISTS public."${tbl}" ENABLE ROW LEVEL SECURITY;`);
  }

  await client.query(`DROP POLICY IF EXISTS public_portal_read_active_catalog ON public.catalog_games;`);
  await client.query(`
    CREATE POLICY public_portal_read_active_catalog ON public.catalog_games
    FOR SELECT TO akshara_public_portal
    USING (COALESCE(status, 'active') != 'paused');
  `);

  await client.query(`DROP POLICY IF EXISTS public_portal_read_claims ON public.claims_vault;`);
  await client.query(`
    CREATE POLICY public_portal_read_claims ON public.claims_vault
    FOR SELECT TO akshara_public_portal
    USING (true);
  `);

  await client.query(`DROP POLICY IF EXISTS public_portal_update_claims ON public.claims_vault;`);
  await client.query(`
    CREATE POLICY public_portal_update_claims ON public.claims_vault
    FOR UPDATE TO akshara_public_portal
    USING (true)
    WITH CHECK (true);
  `);

  console.log("✓ PostgreSQL role `akshara_public_portal` & RLS policies verified.");
  await client.end();

  // 4. Sync claim-web/.env.local cleanly (least-privilege DB URL + identical VAULT_ENCRYPTION_SECRET)
  const poolerUser = projectRef ? `akshara_public_portal.${projectRef}` : "akshara_public_portal";
  const publicPortalDbUrl = `postgresql://${poolerUser}:${encodeURIComponent(rolePassword)}@${host}:${port}/${dbName}`;

  const vaultMatch = webEnvRaw.match(/^VAULT_ENCRYPTION_SECRET=(.*)$/m);
  const vaultSecret = vaultMatch ? vaultMatch[1].trim() : "";

  let updatedClaimEnv = claimEnvRaw;
  updatedClaimEnv = upsertEnvVar(updatedClaimEnv, "DATABASE_URL", publicPortalDbUrl);
  if (vaultSecret) {
    updatedClaimEnv = upsertEnvVar(updatedClaimEnv, "VAULT_ENCRYPTION_SECRET", vaultSecret);
  }
  fs.writeFileSync(claimEnvPath, updatedClaimEnv, "utf8");
  console.log(`✓ claim-web/.env.local updated (${poolerUser}@${host}:${port}) with synced VAULT_ENCRYPTION_SECRET.`);
}

main().catch((err) => {
  console.error("Failed to setup least-privilege roles:", err);
  process.exit(1);
});
