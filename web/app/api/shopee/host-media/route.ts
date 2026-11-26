import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getHostedMediaStats, pruneOldHostedMedia, saveHostedMedia } from "@/lib/mediaHost";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB Shopee rule

export async function GET() {
  try {
    const stats = await getHostedMediaStats();
    return NextResponse.json({ status: "success", stats });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Gagal mengambil statistik media." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const daysParam = Number(req.nextUrl.searchParams.get("olderThanDays") || "30");
    const deletedCount = await pruneOldHostedMedia(daysParam);
    const stats = await getHostedMediaStats();
    return NextResponse.json({
      status: "success",
      deletedCount,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Gagal membersihkan media lama." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dataUrl = String(body.dataUrl || "").trim();
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!match) {
      return NextResponse.json(
        { status: "error", message: "Format dataUrl gambar tidak valid (PNG/JPG/WEBP)." },
        { status: 400 }
      );
    }

    const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    const base64Data = match[2];
    const byteLength = Buffer.byteLength(base64Data, "base64");
    if (byteLength > MAX_BYTES) {
      return NextResponse.json(
        { status: "error", message: "Ukuran gambar melebihi batas Shopee 2 MB." },
        { status: 400 }
      );
    }

    const prefix = String(body.prefix || "thumb")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 32);
    const hash = crypto.createHash("sha1").update(base64Data).digest("hex").slice(0, 12);
    const id = `${prefix}-${hash}`;
    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";

    const saved = await saveHostedMedia(id, mimeType, base64Data, `${prefix}-`);
    return NextResponse.json({
      status: "success",
      id: saved.id,
      persisted_db: saved.persistedDb,
      path: `/api/public/media/${saved.id}.${ext}`,
      bytes: byteLength,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Gagal meng-host gambar thumbnail." },
      { status: 500 }
    );
  }
}
