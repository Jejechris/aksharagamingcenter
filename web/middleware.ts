import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Deteksi apakah pengguna mengakses via domain klaim terpisah (misal: claim.aksharagaming.com atau claim-*.vercel.app)
  const isClaimDomain =
    hostname.startsWith("claim.") ||
    hostname.startsWith("claim-") ||
    hostname.includes("claim") ||
    process.env.CLAIM_DOMAIN === hostname;

  if (isClaimDomain) {
    // 1. Jika akses root '/' di domain klaim -> arahkan langsung ke halaman portal klaim
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/claim", request.url));
    }

    // 2. Short link support: jika akses '/c/AKSH-XXXX' -> arahkan ke '/claim/AKSH-XXXX'
    if (pathname.startsWith("/c/")) {
      const code = pathname.replace("/c/", "");
      return NextResponse.rewrite(new URL(`/claim/${code}`, request.url));
    }

    // 3. KEAMANAN TINGKAT TINGGI: Cegah pembeli di domain klaim mengakses dashboard admin / API internal
    if (pathname.startsWith("/dashboard")) {
      // Return 404 Not Found agar pembeli tidak tahu ada admin dashboard di balik website ini
      return NextResponse.rewrite(new URL("/claim", request.url));
    }
  }

  // Domain utama (Command Deck Ops) berjalan seperti biasa
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
