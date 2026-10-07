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
  // Tambahkan perlindungan otentikasi (Basic Auth) untuk mengakses Command Center
  const authHeader = request.headers.get("authorization");
  
  // Rute API webhook/cron tidak perlu auth agar sistem eksternal (Telegram/Github) tetap bisa akses
  if (!pathname.startsWith("/api")) {
    const ADMIN_USER = process.env.ADMIN_USER || "senna";
    const ADMIN_PASS = process.env.ADMIN_PASS || "akshara123";

    if (!authHeader) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Akshara Command Center", charset="UTF-8"',
        },
      });
    }

    const auth = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
    const user = auth[0];
    const pass = auth[1];

    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: {
          "WWW-Authenticate": 'Basic realm="Akshara Command Center", charset="UTF-8"',
        },
      });
    }
  }

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
