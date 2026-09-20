import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

interface ThumbnailCopyRequest {
  game_title: string;
  platform?: string;
  category?: string;
  selling_price?: string | number;
}

function getPlatformBadge(game: string, platformStr?: string): string {
  const p = (platformStr || "").toLowerCase();
  const g = game.toLowerCase();

  if (p.includes("netflix") || g.includes("netflix")) return "netflix";
  if (p.includes("spotify") || g.includes("spotify")) return "spotify";
  if (p.includes("youtube") || g.includes("youtube")) return "youtube";
  if (p.includes("chatgpt") || p.includes("openai") || g.includes("chatgpt") || g.includes("openai")) return "chatgpt";
  if (p.includes("discord") || g.includes("discord") || g.includes("nitro")) return "discord";
  if (p.includes("disney") || g.includes("disney")) return "disney";
  if (p.includes("canva") || g.includes("canva")) return "canva";
  if (p.includes("capcut") || g.includes("capcut")) return "capcut";
  if (p.includes("prime") || g.includes("prime video") || g.includes("amazon prime")) return "prime";
  if (p.includes("valorant") || p.includes("riot") || g.includes("valorant") || g.includes("riot")) return "valorant";
  if (p.includes("roblox") || g.includes("roblox") || g.includes("robux")) return "roblox";
  if (p.includes("ubisoft") || g.includes("assassin") || g.includes("rainbow six") || g.includes("far cry")) return "ubisoft";
  if (p.includes("battle") || p.includes("blizzard") || g.includes("overwatch") || g.includes("diablo") || g.includes("warcraft")) return "battlenet";
  if (p.includes("rockstar") || g.includes("gta") || g.includes("red dead") || g.includes("rdr")) return "rockstar";
  if (p.includes("mojang") || g.includes("minecraft")) return "mojang";
  if (p.includes("ea") || p.includes("origin") || g.includes("fifa") || g.includes("fc 25") || g.includes("battlefield") || g.includes("sims")) return "ea";
  if (p.includes("playstation") || p.includes("psn") || p.includes("ps5") || p.includes("ps4") || g.includes("god of war") || g.includes("gran turismo")) return "playstation";
  if (p.includes("xbox") || p.includes("microsoft") || g.includes("forza") || g.includes("halo")) return "xbox";
  if (p.includes("epic") || g.includes("fortnite")) return "epic";
  return "steam";
}

function getFallbackCopy(game: string, userPlatform?: string) {
  const g = game.toLowerCase();
  const platformBadge = getPlatformBadge(game, userPlatform);

  if (g.includes("inzoi")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#1897fe", // inZOI sky blue
      clean_title: "inZOI (Steam) - Private",
      platform_logo: "steam",
      access_type: "Private",
      ai_reasoning: "Signature SMA: Frame Biru Langit (#1897fe) harmonis dengan cover inZOI, judul bersih di atas, dan emblem Steam resmi."
    };
  }

  if (g.includes("sons of the forest") || g.includes("forest")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#2a4034", // Dark Forest Green
      clean_title: "Sons Of The Forest (Steam) - Private",
      platform_logo: "steam",
      access_type: "Private",
      ai_reasoning: "Signature SMA: Frame Hijau Hutan Gelap (#2a4034) khas Sons of the Forest dengan emblem Steam otentik."
    };
  }

  if (g.includes("spider-man") || g.includes("spiderman")) {
    const isMiles = g.includes("miles");
    return {
      recommended_layout: "classic_sma",
      frame_color: isMiles ? "#383345" : "#3d1a1a",
      clean_title: isMiles 
        ? "Marvel Spider-Man : Miles Morales (Steam) | Private"
        : "Marvel's Spider-Man Remastered (Steam) | Private",
      platform_logo: "steam",
      access_type: "Private",
      ai_reasoning: "Signature SMA: Frame Crimson/Slate (#3d1a1a) khas Marvel Spider-Man agar artwork tampil gagah dan bersih."
    };
  }

  if (g.includes("helldivers")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#1f607e", // Teal Navy
      clean_title: "Helldivers 2 (Steam) - Private",
      platform_logo: "steam",
      access_type: "Private",
      ai_reasoning: "Signature SMA: Frame Teal Navy (#1f607e) matching atmosfer Super Earth Helldivers 2."
    };
  }

  if (g.includes("gta")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#191013", // Dark Graphite
      clean_title: "GTA V Premium Edition - Rockstar Key | Full Access, Langsung Main!",
      platform_logo: "rockstar",
      access_type: "Rockstar Key | Full Access",
      ai_reasoning: "Signature SMA: Frame Dark Graphite (#191013) dan emblem squircle kuning Rockstar Games otentik."
    };
  }

  if (g.includes("wukong")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#26211c", // Dark Bronze
      clean_title: "Black Myth: Wukong (Steam) - Private",
      platform_logo: "steam",
      access_type: "Private",
      ai_reasoning: "Signature SMA: Frame Dark Bronze (#26211c) khas mitologi Black Myth: Wukong."
    };
  }

  if (g.includes("minecraft")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#10b981", // Emerald
      clean_title: "Minecraft: Java & Bedrock Edition (PC) - Full Access",
      platform_logo: "mojang",
      access_type: "Full Access",
      ai_reasoning: "Signature SMA: Frame Emerald (#10b981) dengan emblem resmi Mojang Studios."
    };
  }

  if (g.includes("fc") || g.includes("fifa")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#1e3a8a", // EA Sports Deep Blue
      clean_title: "EA SPORTS FC 25 (EA App) - Full Access",
      platform_logo: "ea",
      access_type: "Full Access",
      ai_reasoning: "Signature SMA: Frame Deep Blue (#1e3a8a) dan emblem resmi EA App."
    };
  }

  if (g.includes("playstation") || g.includes("god of war") || g.includes("gran turismo")) {
    return {
      recommended_layout: "classic_sma",
      frame_color: "#003791",
      clean_title: `${game} (PlayStation) - Private`,
      platform_logo: "playstation",
      access_type: "Private",
      ai_reasoning: "Signature SMA: Frame PlayStation Deep Blue (#003791) dan emblem resmi PlayStation."
    };
  }

  // Generic Smart Fallback
  return {
    recommended_layout: "classic_sma",
    frame_color: "#1e293b",
    clean_title: `${game} (${platformBadge.toUpperCase()}) - Private`,
    platform_logo: platformBadge,
    access_type: "Private",
    ai_reasoning: `Signature SMA: AI memilih frame warna harmonis dan emblem ${platformBadge.toUpperCase()} untuk ${game}.`
  };
}

export async function POST(req: Request) {
  try {
    const body: ThumbnailCopyRequest = await req.json();
    const game = (body.game_title || "inZOI").trim();
    const platform = body.platform || "Steam";
    const category = body.category || "Account (Private)";
    const price = body.selling_price || "Rp 249.900";

    const prompt = `Anda adalah Autonomous E-Commerce Art Director untuk toko game ternama "Akshara Gaming Center".
Toko ini HANYA menggunakan 1 Signature Design Klasik Edisi SMA yang legendaris:
- Konsep: Minimalis, bersih, elegan, 100% tanpa elemen neon/stiker ramai.
- Anatomi Desain:
  1. Outer Solid Frame (1080x1080 px): Bingkai luar solid dengan warna yang HARMONIS & MATCHING dengan atmosfer cover game (misal inZOI = sky blue #1897fe, Sons of the Forest = dark forest green #2a4034, GTA V = dark graphite #191013, Spider-Man = crimson #3d1a1a, Helldivers 2 = teal navy #1f607e, Minecraft = emerald #10b981).
  2. Top Clean Header Text: Teks tebal putih bersih di margin atas: "{Game Title} ({Platform}) - {Access Type}" (contoh: "inZOI (Steam) - Private", "GTA V Premium Edition - Rockstar Key | Full Access, Langsung Main!").
  3. Inner Artwork: Poster resmi game tampil murni di tengah tanpa ditutup stiker atau pita promo apapun.
  4. Dog-Ear Folded Corner: Sudut kertas terlipat (paper peel 3D) di pojok kanan bawah.
  5. Platform Badge: Emblem resmi platform ("steam", "rockstar", "mojang", "xbox", "ea", "epic", "playstation", "netflix", "capcut").

Input:
- Game: "${game}"
- Platform: "${platform}"
- Estimasi Harga: "${price}"

Tugas Anda:
1. "clean_title": Teks judul atas yang rapi, profesional, dan presisi.
2. "frame_color": Kode HEX warna bingkai luar yang PALING COCOK dengan tema cover game tersebut.
3. "platform_logo": pilih salah satu dari: "steam" | "rockstar" | "mojang" | "xbox" | "ea" | "epic" | "playstation" | "netflix" | "capcut".
4. "access_type": "Private" atau "Full Access" atau "Sharing".
5. "ai_reasoning": 1 kalimat santun bahasa Indonesia menjelaskan alasan pemilihan warna bingkai dan emblem.

Format JSON:
{
  "clean_title": "Nama Game (Platform) - Tipe Akses",
  "frame_color": "#hexcode",
  "platform_logo": "steam | rockstar | mojang | xbox | ea | epic | playstation | netflix | capcut",
  "access_type": "Private | Full Access",
  "ai_reasoning": "Penjelasan singkat alasan pemilihan warna dan emblem"
}`;

    let aiResultText = "";
    try {
      aiResultText = await callGemini(prompt, "Hasilkan output murni JSON valid tanpa pembungkus markdown.");
    } catch (e) {
      console.warn("Gemini call failed, using heuristic fallback:", e);
    }

    if (aiResultText) {
      try {
        const cleaned = aiResultText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.clean_title || parsed.frame_color) {
          return NextResponse.json({
            status: "success",
            source: "gemini",
            data: {
              recommended_layout: "classic_sma",
              clean_title: parsed.clean_title || `${game} (${platform}) - Private`,
              frame_color: parsed.frame_color || "#1e293b",
              platform_logo: parsed.platform_logo || getPlatformBadge(game, platform),
              access_type: parsed.access_type || "Private",
              ai_reasoning: parsed.ai_reasoning || "AI menyesuaikan warna bingkai dan emblem resmi sesuai tema game."
            }
          });
        }
      } catch (e) {
        console.warn("Failed to parse Gemini JSON, falling back to heuristic:", e);
      }
    }

    // Heuristic Fallback
    const fallback = getFallbackCopy(game, platform);
    return NextResponse.json({
      status: "success",
      source: "fallback",
      data: fallback
    });

  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to generate thumbnail design" },
      { status: 500 }
    );
  }
}
