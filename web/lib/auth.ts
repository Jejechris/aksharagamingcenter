// Akshara Gaming Center - Centralized Admin Auth Utility

export const ADMIN_PIN = process.env.ADMIN_ACCESS_PIN || "akshara2026";

export function getExpectedAdminToken(): string {
  const pin = process.env.ADMIN_ACCESS_PIN || "akshara2026";
  const secret = process.env.VAULT_ENCRYPTION_SECRET || "AKSHARA-CORE-VAULT-2026-KEY";
  let hash = 0;
  const str = `akshara_admin_v1:${pin}:${secret}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const prefix = Buffer.from(pin).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return `AKSH_SESS_${Math.abs(hash).toString(16)}_${prefix}`;
}

export function verifyAdminSession(token: string | null | undefined): boolean {
  if (!token) return false;
  return token === getExpectedAdminToken();
}

export function verifyAdminSecretHeader(headerVal: string | null | undefined): boolean {
  if (!headerVal) return false;
  const expectedPin = process.env.ADMIN_ACCESS_PIN || "akshara2026";
  return headerVal.trim() === expectedPin.trim();
}
