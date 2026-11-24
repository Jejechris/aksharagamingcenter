// Akshara Gaming Center - Centralized Admin Auth Utility
// 100% Edge Runtime Compatible (No Node.js 'crypto' or 'fs')

if (process.env.NODE_ENV === "production") {
  if (!process.env.ADMIN_ACCESS_PIN) {
    console.warn("⚠️ [SECURITY WARNING] ADMIN_ACCESS_PIN is not set in production! Using fallback PIN.");
  }
  if (!process.env.VAULT_ENCRYPTION_SECRET) {
    console.warn("⚠️ [SECURITY WARNING] VAULT_ENCRYPTION_SECRET is not set in production! Vault security compromised.");
  }
}

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
  const prefix = typeof Buffer !== "undefined"
    ? Buffer.from(pin).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)
    : btoa(pin).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
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

/**
 * Helper to verify Cron or Admin requests.
 * Returns true if ANY of the following match:
 * 1. Authorization header matches Bearer ${CRON_SECRET} or Bearer ${ADMIN_ACCESS_PIN || 'akshara2026'}
 * 2. x-admin-secret header matches verifyAdminSecretHeader
 * 3. Cookie 'akshara_admin_session' matches verifyAdminSession (enables manual dashboard triggers)
 * 4. Local development mode (NODE_ENV !== "production")
 */
export function verifyCronOrAdminRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  // 1. Check Authorization Bearer header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const cronSecret = process.env.CRON_SECRET;
    const adminPin = process.env.ADMIN_ACCESS_PIN || "akshara2026";
    if ((cronSecret && token === cronSecret) || token === adminPin) {
      return true;
    }
  }

  // 2. Check x-admin-secret header
  const adminSecretHeader = request.headers.get("x-admin-secret");
  if (verifyAdminSecretHeader(adminSecretHeader)) {
    return true;
  }

  // 3. Check admin session cookie (from cookie header)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)akshara_admin_session=([^;]*)/);
    if (match) {
      const sessionValue = decodeURIComponent(match[1]);
      if (verifyAdminSession(sessionValue)) {
        return true;
      }
    }
  }

  return false;
}
