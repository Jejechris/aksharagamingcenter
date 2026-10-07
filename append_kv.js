const fs = require('fs');

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

fs.appendFileSync('claim-web/lib/db.ts', txt);
fs.appendFileSync('web/lib/db.ts', txt);
