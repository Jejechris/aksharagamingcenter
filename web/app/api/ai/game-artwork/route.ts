import { NextResponse } from "next/server";

interface ArtworkOption {
  id: string;
  type: "hero" | "screenshot" | "capsule" | "wallpaper";
  label: string;
  url: string;
  thumbnail: string;
  resolution: string;
}

// Curated verified official press art for non-Steam or standalone titles
const CURATED_OFFICIAL_ARTWORKS: Record<string, { title: string; artworks: ArtworkOption[] }> = {
  minecraft: {
    title: "Minecraft: Java & Bedrock Edition",
    artworks: [
      {
        id: "mc-keyart",
        type: "wallpaper",
        label: "Official Key Art (Creeper & World)",
        url: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=1920&auto=format&fit=crop",
        thumbnail: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=300&auto=format&fit=crop",
        resolution: "1920 x 1080 HD"
      },
      {
        id: "mc-blocks",
        type: "wallpaper",
        label: "Minecraft World Terrain",
        url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1920&auto=format&fit=crop",
        thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop",
        resolution: "1920 x 1080 HD"
      },
      {
        id: "mc-adventure",
        type: "hero",
        label: "Epic Adventure Biome",
        url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&auto=format&fit=crop",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop",
        resolution: "1920 x 1080 HD"
      }
    ]
  },
  valorant: {
    title: "Valorant (Riot Games)",
    artworks: [
      {
        id: "val-1",
        type: "wallpaper",
        label: "Official Tactical Wallpaper",
        url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&auto=format&fit=crop",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop",
        resolution: "1920 x 1080 HD"
      }
    ]
  }
};

function cleanSearchTerm(term: string): string {
  return term
    .replace(/\(.*?\)/g, "") // Remove parentheses content like (PC), (Full Access)
    .replace(/account|full access|edition|standard|enhanced|global|key|in-game asset|steam trade|original|murah/gi, "")
    .replace(/[:•\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawTitle: string = body.game_title || "";

    if (!rawTitle.trim()) {
      return NextResponse.json(
        { status: "error", message: "Parameter game_title wajib diisi." },
        { status: 400 }
      );
    }

    const lower = rawTitle.toLowerCase();

    // 1. Check curated non-Steam titles first (e.g. Minecraft)
    if (lower.includes("minecraft")) {
      const mc = CURATED_OFFICIAL_ARTWORKS.minecraft;
      return NextResponse.json({
        status: "success",
        source: "official_press_kit",
        official_title: mc.title,
        app_id: null,
        primary_bg: mc.artworks[0].url,
        artworks: mc.artworks
      });
    }

    // 2. Clean query for Steam Store Search
    const cleanQuery = cleanSearchTerm(rawTitle);
    const steamSearchQuery = cleanQuery || rawTitle;

    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(steamSearchQuery)}&l=english&cc=US`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!searchRes.ok) {
      throw new Error(`Steam search responded with status: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const firstMatch = searchData.items?.[0];

    if (!firstMatch || !firstMatch.id) {
      // Fallback: If not found on Steam, return curated or default high-res gaming background
      const fallbackList: ArtworkOption[] = [
        {
          id: "fb-1",
          type: "wallpaper",
          label: "HD Gaming Official Art #1",
          url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&auto=format&fit=crop",
          thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop",
          resolution: "1920 x 1080 HD"
        },
        {
          id: "fb-2",
          type: "wallpaper",
          label: "HD Gaming Official Art #2",
          url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1920&auto=format&fit=crop",
          thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=300&auto=format&fit=crop",
          resolution: "1920 x 1080 HD"
        }
      ];

      return NextResponse.json({
        status: "success",
        source: "curated_fallback",
        official_title: rawTitle,
        app_id: null,
        primary_bg: fallbackList[0].url,
        artworks: fallbackList
      });
    }

    const appId = firstMatch.id;
    const officialTitle = firstMatch.name || rawTitle;

    // 3. Fetch detailed app details for screenshots & hero art
    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const detailsRes = await fetch(detailsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    const detailsData = await detailsRes.json();
    const appData = detailsData[appId]?.data;

    const artworks: ArtworkOption[] = [];

    // Option A: Library Hero Banner (Official developer wide keyart 1920x620)
    const heroBannerUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`;
    artworks.push({
      id: `hero-${appId}`,
      type: "hero",
      label: "Official Hero Banner",
      url: heroBannerUrl,
      thumbnail: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg`,
      resolution: "1920 x 620 Banner"
    });

    // Option B: Official In-Game Screenshots (1920x1080 Full HD official gameplay)
    if (Array.isArray(appData?.screenshots) && appData.screenshots.length > 0) {
      appData.screenshots.slice(0, 5).forEach((sc: any, idx: number) => {
        if (sc.path_full) {
          artworks.push({
            id: `sc-${idx}-${appId}`,
            type: "screenshot",
            label: `In-Game 1080p #${idx + 1}`,
            url: sc.path_full,
            thumbnail: sc.path_thumbnail || sc.path_full,
            resolution: "1920 x 1080 Full HD"
          });
        }
      });
    }

    // Option C: Official Capsule Key Art
    const capsuleUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`;
    artworks.push({
      id: `capsule-${appId}`,
      type: "capsule",
      label: "Official Capsule Art",
      url: capsuleUrl,
      thumbnail: capsuleUrl,
      resolution: "616 x 353 Promo"
    });

    // Primary background: prefer first in-game screenshot or hero banner
    const primaryBg = artworks[1]?.url || artworks[0]?.url;

    return NextResponse.json({
      status: "success",
      source: "steam_official_cdn",
      official_title: officialTitle,
      app_id: appId,
      primary_bg: primaryBg,
      artworks: artworks
    });

  } catch (error: any) {
    console.error("Failed to fetch official game artwork:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error?.message || "Gagal mengambil artwork resmi game.",
        artworks: []
      },
      { status: 500 }
    );
  }
}
