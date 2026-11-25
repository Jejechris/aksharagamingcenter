import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSession, verifyAdminSecretHeader } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";

  // 1. Deteksi domain klaim khusus (claim.aksharagaming.com)
  const isClaimDomain =
    hostname.startsWith("claim.") ||
    hostname.startsWith("claim-") ||
    hostname.includes("claim") ||
    process.env.CLAIM_DOMAIN === hostname;

  if (isClaimDomain) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/claim", request.url));
    }
    if (pathname.startsWith("/c/")) {
      const code = pathname.replace("/c/", "");
      return NextResponse.rewrite(new URL(`/claim/${code}`, request.url));
    }
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.rewrite(new URL("/claim", request.url));
    }
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

  // 4. Lindungi API mutasi & pembacaan data sensitif
  const sensitiveApiPrefixes = [
    "/api/claim/manage",
    "/api/inventory/vault",
    "/api/inventory/live-sync",
    "/api/inventory/detect-link",
    "/api/orders/autonomous",
    "/api/orders/auto-fulfill",
    "/api/orders/finalize",
    "/api/ai/",
    "/api/research/",
  ];

  const isSensitiveApi = sensitiveApiPrefixes.some((p) => pathname.startsWith(p));
  if (isSensitiveApi) {
    const adminSecretHeader = request.headers.get("x-admin-secret");
    const isSecretValid = verifyAdminSecretHeader(adminSecretHeader);

    if (!isSessionValid && !isSecretValid && !isLocalhost) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Admin session or x-admin-secret required." },
        { status: 401 }
      );
    }
  }

  // 5. Proteksi khusus untuk mutasi katalog (/api/catalog dengan POST/PUT/DELETE)
  // GET /api/catalog tetap terbuka untuk publik (Storefront /)
  if (pathname.startsWith("/api/catalog") && request.method !== "GET") {
    const adminSecretHeader = request.headers.get("x-admin-secret");
    const isSecretValid = verifyAdminSecretHeader(adminSecretHeader);

    if (!isSessionValid && !isSecretValid && !isLocalhost) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Admin session or x-admin-secret required for catalog mutations." },
        { status: 401 }
      );
    }
  }

  // 6. Rute publik (Storefront /, /login, /claim/*, /api/auth/*, /api/claim/reveal, webhook Telegram, cron) berjalan bebas
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
