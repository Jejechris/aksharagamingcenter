import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Validasi ketat anti-SSRF:
 * Hanya izinkan protokol https: dan blokir loopback, private IP, serta link-local/cloud metadata.
 */
function isSsrfSafe(urlStr: string): { safe: boolean; error?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") {
      return { safe: false, error: "Hanya protokol https: yang diizinkan." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check loopback / localhost
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return { safe: false, error: "Akses ke host lokal / loopback dilarang." };
    }

    // Check private & link-local IP ranges
    // 10.0.0.0/8
    if (/^10\./.test(hostname)) {
      return { safe: false, error: "Akses ke IP private dilarang." };
    }
    // 172.16.0.0/12 (172.16 - 172.31)
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
      return { safe: false, error: "Akses ke IP private dilarang." };
    }
    // 192.168.0.0/16
    if (/^192\.168\./.test(hostname)) {
      return { safe: false, error: "Akses ke IP private dilarang." };
    }
    // 169.254.0.0/16 (Link local / AWS & Cloud Metadata)
    if (/^169\.254\./.test(hostname)) {
      return { safe: false, error: "Akses ke link-local / metadata dilarang." };
    }

    return { safe: true, parsedUrl: parsed };
  } catch {
    return { safe: false, error: "Format URL tidak valid." };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Query parameter 'url' wajib disertakan." },
      { status: 400 }
    );
  }

  const ssrfCheck = isSsrfSafe(targetUrl);
  if (!ssrfCheck.safe || !ssrfCheck.parsedUrl) {
    return NextResponse.json(
      { error: ssrfCheck.error || "URL ditolak karena alasan keamanan." },
      { status: 400 }
    );
  }

  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

  try {
    let currentUrl = ssrfCheck.parsedUrl.toString();
    let upstreamRes: Response | null = null;

    // Tangani redirect manual (maks 3 hop) dan validasi ulang SSRF pada setiap Location
    for (let hop = 0; hop <= 3; hop++) {
      const hopCheck = isSsrfSafe(currentUrl);
      if (!hopCheck.safe || !hopCheck.parsedUrl) {
        return NextResponse.json(
          { error: hopCheck.error || "URL redirect ditolak karena alasan keamanan." },
          { status: 400 }
        );
      }

      upstreamRes = await fetch(hopCheck.parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        },
        redirect: "manual",
        signal: AbortSignal.timeout(7000)
      });

      if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
        const location = upstreamRes.headers.get("location");
        if (!location) {
          return NextResponse.json(
            { error: "Redirect tanpa header location tidak valid." },
            { status: 400 }
          );
        }
        currentUrl = new URL(location, hopCheck.parsedUrl).toString();
        continue;
      }

      break;
    }

    if (!upstreamRes) {
      return NextResponse.json({ error: "Upstream tidak merespons." }, { status: 502 });
    }

    if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
      return NextResponse.json({ error: "Terlalu banyak redirect dari upstream." }, { status: 400 });
    }

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream merespons dengan status ${upstreamRes.status}` },
        { status: upstreamRes.status >= 400 && upstreamRes.status < 500 ? 400 : 502 }
      );
    }

    const contentLengthHeader = upstreamRes.headers.get("content-length");
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran gambar melebihi batas maksimal 10 MB." },
        { status: 413 }
      );
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: `Resource upstream bukan file gambar (content-type: ${contentType})` },
        { status: 400 }
      );
    }

    const imageBuffer = await upstreamRes.arrayBuffer();
    if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran gambar melebihi batas maksimal 10 MB." },
        { status: 413 }
      );
    }

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      }
    });
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "Timeout saat mengambil gambar dari upstream (7 detik)."
          : err?.message || "Gagal mengambil gambar dari upstream."
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
