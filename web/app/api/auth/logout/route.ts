import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    ok: true,
    message: "Sesi admin telah ditutup.",
  });

  response.cookies.set({
    name: "akshara_admin_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
