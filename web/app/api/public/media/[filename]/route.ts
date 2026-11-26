import { NextResponse } from "next/server";
import { getHostedMedia } from "@/lib/mediaHost";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: { filename: string } }
) {
  const raw = String(context?.params?.filename || "").trim();
  const id = raw.replace(/\.(png|jpe?g|webp)$/i, "");
  if (!id || !/^[a-zA-Z0-9_-]{4,96}$/.test(id)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const asset = await getHostedMedia(id);
  if (!asset) {
    return new NextResponse("Media Not Found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.buffer), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType || "image/png",
      "Content-Length": String(asset.buffer.length),
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
