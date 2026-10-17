import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PIN, getExpectedAdminToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const inputPin = (body.pin || body.password || "").toString().trim();
    const expectedPin = (process.env.ADMIN_ACCESS_PIN || "akshara2026").trim();

    if (!inputPin || inputPin !== expectedPin) {
      return NextResponse.json(
        { ok: false, error: "PIN Otorisasi Salah! Akses Command Center Ditolak." },
        { status: 401 }
      );
    }

    const token = getExpectedAdminToken();
    const response = NextResponse.json({
      ok: true,
      message: "Otorisasi Berhasil. Membuka Command Center...",
    });

    response.cookies.set({
      name: "akshara_admin_session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
