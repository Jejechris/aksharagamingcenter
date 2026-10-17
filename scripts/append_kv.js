const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const claimWebDb = path.join(rootDir, 'claim-web', 'lib', 'db.ts');
const webDb = path.join(rootDir, 'web', 'lib', 'db.ts');

const txt = `
// App KV Store Helpers
export async function getKV(key: string): Promise<any> {
  if (!isDbConfigured()) return null;
  try {
    const rows = await queryDb("SELECT value FROM app_kv WHERE key = $1", [key]);
    if (rows && rows.length > 0) return rows[0].value;
  } catch (err) {}
  return null;
}

export async function setKV(key: string, value: any): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await queryDb("INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP", [key, JSON.stringify(value)]);
    return true;
  } catch (err) {}
  return false;
}
`;

console.log("Checking if KV helpers are present...");
if (fs.existsSync(claimWebDb)) {
  const content = fs.readFileSync(claimWebDb, 'utf8');
  if (!content.includes("export async function getKV")) {
    fs.appendFileSync(claimWebDb, txt);
    console.log("Appended KV helpers to claim-web/lib/db.ts");
  } else {
    console.log("KV helpers already present in claim-web/lib/db.ts");
  }
}

if (fs.existsSync(webDb)) {
  const content = fs.readFileSync(webDb, 'utf8');
  if (!content.includes("export async function getKV")) {
    fs.appendFileSync(webDb, txt);
    console.log("Appended KV helpers to web/lib/db.ts");
  } else {
    console.log("KV helpers already present in web/lib/db.ts");
  }
}
