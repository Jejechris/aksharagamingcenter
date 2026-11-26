import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSession, verifyAdminSecretHeader } from "@/lib/auth";

const PUBLIC_PORTAL_URL =
  process.env.NEXT_PUBLIC_CLAIM_URL ||
  process.env.NEXT_PUBLIC_CLAIM_BASE_URL ||
  "https://claimakshara.vercel.app";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";

  // 1. Jika traffic mendarat via domain claim.*, arahkan ke portal claim-web terpisah
  const isClaimDomain =
    hostname.startsWith("claim.") ||
    hostname.startsWith("claim-") ||
    process.env.CLAIM_DOMAIN === hostname;

  if (isClaimDomain || pathname === "/claim" || pathname.startsWith("/claim/")) {
    const cleanTarget = PUBLIC_PORTAL_URL.replace(/\/$/, "");
    const targetPath = pathname.startsWith("/claim") ? pathname : "/claim";
    return NextResponse.redirect(new URL(`${cleanTarget}${targetPath}`));
  }

  // 2. Cek token sesi admin dari cookie
  const sessionCookie = request.cookies.get("akshara_admin_session")?.value;
  const isSessionValid = verifyAdminSession(sessionCookie);

  // 3. Lindungi seluruh route /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!isSessionValid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Localhost bypass HANYA untuk development (anti IP spoofing di production)
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const isLocalhost =
    isDev &&
    (clientIp === "127.0.0.1" ||
      clientIp === "::1" ||
      clientIp === "localhost" ||
      hostname.startsWith("localhost") ||
      hostname.startsWith("127.0.0.1"));

  // Endpoint gambar thumbnail publik untuk ditarik oleh Shopee Mass Upload (read-only)
  if (pathname.startsWith("/api/public/")) {
    return NextResponse.next();
  }

  // 4. Lindungi seluruh API internal (termasuk /api/catalog, /api/verify, & /api/claim/* di app internal)
  const protectedApiPrefixes = [
    "/api/alerts",
    "/api/catalog",
    "/api/claim",
    "/api/verify",
    "/api/inventory",
    "/api/orders",
    "/api/analytics",
    "/api/shopee",
    "/api/ai/",
    "/api/research/",
  ];

  const isProtectedApi = protectedApiPrefixes.some((p) => pathname.startsWith(p));
  if (isProtectedApi) {
    const adminSecretHeader = request.headers.get("x-admin-secret");
    const isSecretValid = verifyAdminSecretHeader(adminSecretHeader);

    if (!isSessionValid && !isSecretValid && !isLocalhost) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Internal Command Center endpoint." },
        { status: 401 }
      );
    }
  }

  // 5. Auth (/api/auth/*), cron (memakai CRON_SECRET), webhook Telegram, health & daemon
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
