import crypto from "crypto";

const DEFAULT_VAULT_SECRET = process.env.VAULT_ENCRYPTION_SECRET || "AKSHARA-CORE-VAULT-2026-KEY";

/**
 * Derives a 32-byte key using scrypt from secret seed + passcode + salt.
 */
function deriveKey(passcode: string, salt: Buffer): Buffer {
  const secretSeed = `${DEFAULT_VAULT_SECRET}:${String(passcode || "").trim()}`;
  return crypto.scryptSync(secretSeed, salt, 32);
}

/**
 * Encrypts credential plaintext with AES-256-GCM.
 * Format: ENCv1:<salt_hex>:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptCredential(plainText: string, passcode: string): string {
  if (!plainText) return "";
  if (plainText.startsWith("ENCv1:")) return plainText; // already encrypted

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(passcode, salt);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `ENCv1:${salt.toString("hex")}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted credential.
 * If not encrypted (legacy record), returns original stored text.
 */
export function decryptCredential(storedText: string, passcode: string): string {
  if (!storedText) return "";
  if (!storedText.startsWith("ENCv1:")) {
    // Backward compatibility for legacy plaintext records
    return storedText;
  }

  const parts = storedText.split(":");
  if (parts.length !== 5) {
    console.warn("Invalid ENCv1 payload structure");
    return storedText;
  }

  const [, saltHex, ivHex, tagHex, cipherHex] = parts;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const key = deriveKey(passcode, salt);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("AES-256-GCM Decryption failed (invalid passcode or tampered ciphertext):", err);
    return "[ERROR: Gagal mendekripsi kredensial - passcode salah atau data rusak]";
  }
}
