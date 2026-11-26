/**
 * Konfigurasi publik Storefront & Portal Klaim Akshara Gaming Center.
 * Atur `NEXT_PUBLIC_ADMIN_WHATSAPP` di Vercel / .env.local (format: 62812xxxxxxx).
 */
export const DEFAULT_PLACEHOLDER_WA = "6282299887766";

export function getAdminWhatsappNumber(): string {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ||
    process.env.NEXT_PUBLIC_SUPPORT_WA ||
    DEFAULT_PLACEHOLDER_WA;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits.length >= 9 ? digits : DEFAULT_PLACEHOLDER_WA;
}
