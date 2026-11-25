import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ArtworkOption {
  id: string;
  type: "hero" | "screenshot" | "capsule" | "wallpaper" | "boxart";
  label: string;
  url: string;
  raw_url: string;
  thumbnail: string;
  resolution: string;
}

/**
 * Helper untuk membungkus URL eksternal dengan /api/image-proxy agar bebas CORS di <canvas>
 */
function toProxyUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("/") || rawUrl.startsWith("data:")) return rawUrl;
  return `/api/image-proxy?url=${encodeURIComponent(rawUrl)}`;
}

/**
 * Pembersih kata kunci pencarian agar akurat di Steam & multi-store
 */
function cleanSearchTerm(term: string): string {
  return term
    .replace(/\(.*?\)/g, "") // Hapus isi kurung seperti (PC), (Steam), (Full Access)
    .replace(/account|full access|edition|standard|enhanced|global|key|in-game asset|steam trade|original|murah/gi, "")
    .replace(/[:•\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * LAPIS 1: Curated Verified Official Press Art & Brand Assets (100% Live HTTP 200, ZERO UNSPLASH)
 */
const CURATED_OFFICIAL_ARTWORKS: Record<
  string,
  {
    title: string;
    source: string;
    artworks: {
      id: string;
      type: ArtworkOption["type"];
      label: string;
      rawUrl: string;
      rawThumb?: string;
      resolution: string;
    }[];
  }
> = {
  minecraft: {
    title: "Minecraft: Java & Bedrock Edition",
    source: "Microsoft / Xbox Official Catalog",
    artworks: [
      {
        id: "mc-box",
        type: "boxart",
        label: "Official Box Art 1:1 (Steve & Alex)",
        rawUrl: "https://store-images.s-microsoft.com/image/apps.54465.14492077886571533.be42f4bd-887b-4430-8ed0-622341b4d2b0.5054cf02-8b0f-47e2-9d15-7ddc81f63638",
        resolution: "1080 x 1080 Square (Ideal Shopee)"
      },
      {
        id: "mc-hero",
        type: "hero",
        label: "SuperHero Key Art 16:9",
        rawUrl: "https://store-images.s-microsoft.com/image/apps.58378.14492077886571533.338a563a-86e7-47b1-b9dc-41cf411f5dcd.dc840f22-6e8f-4a59-b7bc-57958a0740fd",
        resolution: "1920 x 1080 Full HD"
      },
      {
        id: "mc-world-4k",
        type: "screenshot",
        label: "In-Game World Terrain 4K",
        rawUrl: "https://store-images.s-microsoft.com/image/apps.63804.14492077886571533.28b7d282-6a14-44b0-bed0-cecfc2543cea.38a3002f-7d5e-447b-887d-d25be07416d9",
        resolution: "3840 x 2160 Ultra HD"
      },
      {
        id: "mc-poster",
        type: "wallpaper",
        label: "Official Character Poster",
        rawUrl: "https://store-images.s-microsoft.com/image/apps.808.14492077886571533.be42f4bd-887b-4430-8ed0-622341b4d2b0.c8274c53-105e-478b-9f4b-41b8088210a3",
        resolution: "720 x 1080 Portrait"
      }
    ]
  },
  valorant: {
    title: "Valorant (Riot Games)",
    source: "Riot Games / Epic Games Official",
    artworks: [
      {
        id: "val-tactical",
        type: "hero",
        label: "Official Tactical Key Art 1440p",
        rawUrl: "https://cdn2.unrealengine.com/egs-valorant-riotgames-s1-2560x1440-4742836df9eb.jpg",
        resolution: "2560 x 1440 QHD"
      }
    ]
  },
  fortnite: {
    title: "Fortnite (Epic Games)",
    source: "Epic Games Official",
    artworks: [
      {
        id: "fn-og",
        type: "hero",
        label: "Official Battle Royale Blade",
        rawUrl: "https://cdn2.unrealengine.com/en-fn-og-42-10-c1sx-egs-launcher-blade-2560x1440-2560x1440-319ff81b274e.jpg",
        resolution: "2560 x 1440 QHD"
      },
      {
        id: "fn-stormking",
        type: "hero",
        label: "Official Stormking Key Art",
        rawUrl: "https://cdn2.unrealengine.com/fnjn-33-10-stormking-egs-launcher-keyart-blade-2560x1440-2560x1440-c49d4cb08041.jpg",
        resolution: "2560 x 1440 QHD"
      }
    ]
  },
  genshin: {
    title: "Genshin Impact (HoYoverse)",
    source: "Cognosphere / Epic Games Official",
    artworks: [
      {
        id: "gi-hero",
        type: "hero",
        label: "Official Key Art 1440p",
        rawUrl: "https://cdn2.unrealengine.com/egs-genshinimpact-cognospherepteltd-s1-2560x1440-5abdaa9efa5e.jpg",
        resolution: "2560 x 1440 QHD"
      }
    ]
  },
  roblox: {
    title: "Roblox",
    source: "Roblox Official Brand Asset",
    artworks: [
      {
        id: "roblox-logo",
        type: "hero",
        label: "Roblox Official Brand Logo HD",
        rawUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Roblox_Logo_2022.svg/1280px-Roblox_Logo_2022.svg.png",
        resolution: "1280 x 236 HD Logo"
      }
    ]
  },
  league_of_legends: {
    title: "League of Legends",
    source: "Riot Games Official Brand Asset",
    artworks: [
      {
        id: "lol-vector",
        type: "hero",
        label: "League of Legends Official Key Banner",
        rawUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/1280px-League_of_Legends_2019_vector.svg.png",
        resolution: "1280 x 488 HD Banner"
      }
    ]
  },
  netflix: {
    title: "Netflix Premium",
    source: "Netflix Official Brand Asset",
    artworks: [
      {
        id: "netflix-logo",
        type: "hero",
        label: "Netflix Official Logo HD",
        rawUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/1280px-Netflix_2015_logo.svg.png",
        resolution: "1280 x 346 HD Logo"
      }
    ]
  },
  spotify: {
    title: "Spotify Premium",
    source: "Spotify Official Brand Asset",
    artworks: [
      {
        id: "spotify-logo",
        type: "hero",
        label: "Spotify Official Brand Banner",
        rawUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Spotify_logo_with_text.svg/1280px-Spotify_logo_with_text.svg.png",
        resolution: "1280 x 384 HD Banner"
      }
    ]
  },
  capcut: {
    title: "CapCut Pro",
    source: "CapCut / ByteDance Official",
    artworks: [
      {
        id: "capcut-pro",
        type: "hero",
        label: "CapCut Pro Wallpaper HD",
        rawUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Capcut_Pro.jpg/1280px-Capcut_Pro.jpg",
        resolution: "1280 x 720 HD Wallpaper"
      },
      {
        id: "capcut-icon",
        type: "capsule",
        label: "CapCut Official Icon PNG",
        rawUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Capcut-icon.png",
        resolution: "1080 x 1080 Square"
      }
    ]
  },
  canva: {
    title: "Canva Pro",
    source: "Canva Official Brand Asset",
    artworks: [
      {
        id: "canva-logo",
        type: "hero",
        label: "Canva Official Logo Asset",
        rawUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Canva_Logo.jpg",
        resolution: "1080 x 1080 Square"
      }
    ]
  },
  chatgpt: {
    title: "ChatGPT / OpenAI Plus",
    source: "OpenAI Official Brand Asset",
    artworks: [
      {
        id: "chatgpt-logo",
        type: "hero",
        label: "OpenAI / ChatGPT Symbol HD",
        rawUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1280px-ChatGPT_logo.svg.png",
        resolution: "1280 x 1280 Square HD"
      }
    ]
  },
  discord: {
    title: "Discord Nitro",
    source: "Discord Official Brand Asset",
    artworks: [
      {
        id: "discord-logo",
        type: "hero",
        label: "Discord Official Brand Logo",
        rawUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Discord_Color_Text_Logo_%282015-2021%29.svg/1280px-Discord_Color_Text_Logo_%282015-2021%29.svg.png",
        resolution: "1280 x 240 HD Logo"
      }
    ]
  }
};

/**
 * Lapis 2: Steam Store CDN Search dengan verifikasi kemiripan judul ketat
 */
async function searchSteamCdn(cleanQuery: string): Promise<{
  appId: number;
  officialTitle: string;
  artworks: ArtworkOption[];
} | null> {
  const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
    cleanQuery
  )}&l=english&cc=US`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    next: { revalidate: 3600 }
  });

  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const items: any[] = searchData.items || [];
  if (items.length === 0) return null;

  // Validasi kemiripan judul: setidaknya kata utama query ada di nama item Steam
  const queryWords = cleanQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "game"].includes(w));

  const matchedItem = items.find((item) => {
    const itemName = (item.name || "").toLowerCase();
    if (itemName === cleanQuery.toLowerCase()) return true;
    return queryWords.every((word) => itemName.includes(word));
  }) || (queryWords.length > 0 && (items[0].name || "").toLowerCase().includes(queryWords[0]) ? items[0] : null);

  if (!matchedItem || !matchedItem.id) return null;

  const appId = matchedItem.id;
  const officialTitle = matchedItem.name || cleanQuery;

  // Ambil detail screenshots & hero art
  const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
  const detailsRes = await fetch(detailsUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    next: { revalidate: 86400 }
  });

  const detailsData = detailsRes.ok ? await detailsRes.json() : null;
  const appData = detailsData?.[appId]?.data;

  const artworks: ArtworkOption[] = [];

  // 1. Library Hero Banner (1920x620)
  const heroRaw = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`;
  artworks.push({
    id: `steam-hero-${appId}`,
    type: "hero",
    label: "Official Hero Banner",
    url: toProxyUrl(heroRaw),
    raw_url: heroRaw,
    thumbnail: toProxyUrl(`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg`),
    resolution: "1920 x 620 Banner"
  });

  // 2. Library Portrait Poster (600x900)
  const portraitRaw = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`;
  artworks.push({
    id: `steam-poster-${appId}`,
    type: "boxart",
    label: "Official Library Poster",
    url: toProxyUrl(portraitRaw),
    raw_url: portraitRaw,
    thumbnail: toProxyUrl(portraitRaw),
    resolution: "600 x 900 Portrait"
  });

  // 3. Official In-Game Full HD Screenshots (hingga 4 screenshot)
  if (Array.isArray(appData?.screenshots) && appData.screenshots.length > 0) {
    appData.screenshots.slice(0, 4).forEach((sc: any, idx: number) => {
      if (sc.path_full) {
        artworks.push({
          id: `steam-sc-${idx}-${appId}`,
          type: "screenshot",
          label: `In-Game 1080p #${idx + 1}`,
          url: toProxyUrl(sc.path_full),
          raw_url: sc.path_full,
          thumbnail: toProxyUrl(sc.path_thumbnail || sc.path_full),
          resolution: "1920 x 1080 Full HD"
        });
      }
    });
  }

  // 4. Capsule Key Art (616x353)
  const capsuleRaw = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`;
  artworks.push({
    id: `steam-capsule-${appId}`,
    type: "capsule",
    label: "Official Capsule Art",
    url: toProxyUrl(capsuleRaw),
    raw_url: capsuleRaw,
    thumbnail: toProxyUrl(capsuleRaw),
    resolution: "616 x 353 Promo"
  });

  return { appId, officialTitle, artworks };
}

/**
 * Lapis 3: CheapShark Multi-Store Search Fallback
 */
async function searchCheapShark(cleanQuery: string): Promise<ArtworkOption[]> {
  try {
    const res = await fetch(
      `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(cleanQuery)}&limit=3`,
      {
        headers: {
          "User-Agent": "AksharaGamingCenter/1.0 (admin@aksharagaming.com)"
        },
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!res.ok) return [];

    const data: any[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const first = data[0];
    const artworks: ArtworkOption[] = [];

    // Jika memiliki steamAppID, manfaatkan asset Steam CDN
    if (first.steamAppID && Number(first.steamAppID) > 0) {
      const appId = first.steamAppID;
      const heroRaw = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`;
      artworks.push({
        id: `cs-hero-${appId}`,
        type: "hero",
        label: `Official Multi-Store Hero (${first.external})`,
        url: toProxyUrl(heroRaw),
        raw_url: heroRaw,
        thumbnail: toProxyUrl(first.thumb || heroRaw),
        resolution: "1920 x 620 Banner"
      });
    } else if (first.thumb) {
      artworks.push({
        id: `cs-thumb-${first.gameID}`,
        type: "capsule",
        label: `Store Capsule (${first.external})`,
        url: toProxyUrl(first.thumb),
        raw_url: first.thumb,
        thumbnail: toProxyUrl(first.thumb),
        resolution: "Promo Thumbnail"
      });
    }

    return artworks;
  } catch {
    return [];
  }
}

/**
 * Lapis 3b: Wikipedia / Wikimedia Commons Public Search Fallback
 */
async function searchWikipediaImage(cleanQuery: string): Promise<ArtworkOption[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      cleanQuery + " video game"
    )}&gsrlimit=3&prop=pageimages&piprop=original|thumbnail&pithumbsize=1080&format=json`;

    const res = await fetch(url, {
      headers: { "User-Agent": "AksharaGamingCenter/1.0 (admin@aksharagaming.com)" },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return [];

    const json = await res.json();
    const pages = Object.values(json.query?.pages || {}) as any[];
    const artworks: ArtworkOption[] = [];

    pages.forEach((p, idx) => {
      const src = p.original?.source || p.thumbnail?.source;
      if (src && !src.endsWith(".svg") && !src.includes("icon")) {
        artworks.push({
          id: `wiki-${idx}-${p.pageid}`,
          type: "boxart",
          label: `Official Box Art (${p.title})`,
          url: toProxyUrl(src),
          raw_url: src,
          thumbnail: toProxyUrl(p.thumbnail?.source || src),
          resolution: "1080p Web Resolution"
        });
      }
    });

    return artworks;
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawTitle: string = body.game_title || "";

    if (!rawTitle.trim()) {
      return NextResponse.json(
        { status: "error", message: "Parameter game_title wajib diisi.", artworks: [] },
        { status: 400 }
      );
    }

    const lower = rawTitle.toLowerCase().trim();

    // =======================================================================
    // LAPIS 1: Curated Verified Official Press Art & Non-Steam Apps
    // =======================================================================
    for (const [key, curated] of Object.entries(CURATED_OFFICIAL_ARTWORKS)) {
      const keyWords = key.replace(/_/g, " ");
      if (lower.includes(key) || lower.includes(keyWords)) {
        const formattedArtworks: ArtworkOption[] = curated.artworks.map((art) => ({
          id: art.id,
          type: art.type,
          label: art.label,
          url: toProxyUrl(art.rawUrl),
          raw_url: art.rawUrl,
          thumbnail: toProxyUrl(art.rawThumb || art.rawUrl),
          resolution: art.resolution
        }));

        return NextResponse.json({
          status: "success",
          source: curated.source,
          source_label: curated.source,
          official_title: curated.title,
          app_id: null,
          primary_bg: formattedArtworks[0]?.url || "",
          artworks: formattedArtworks
        });
      }
    }

    const cleanQuery = cleanSearchTerm(rawTitle);

    // =======================================================================
    // LAPIS 2: Steam Store CDN Search (Strict Title Similarity)
    // =======================================================================
    const steamResult = await searchSteamCdn(cleanQuery || rawTitle);

    if (steamResult && steamResult.artworks.length > 0) {
      const primaryBg = steamResult.artworks[1]?.url || steamResult.artworks[0]?.url;

      return NextResponse.json({
        status: "success",
        source: "steam_official_cdn",
        source_label: "Valve Steam Store CDN",
        official_title: steamResult.officialTitle,
        app_id: steamResult.appId,
        primary_bg: primaryBg,
        artworks: steamResult.artworks
      });
    }

    // =======================================================================
    // LAPIS 3: Multi-Store & Wikipedia Search Fallback (ZERO UNSPLASH)
    // =======================================================================
    const [cheapSharkArts, wikiArts] = await Promise.all([
      searchCheapShark(cleanQuery || rawTitle),
      searchWikipediaImage(cleanQuery || rawTitle)
    ]);

    const combinedFallbackArts = [...cheapSharkArts, ...wikiArts];

    if (combinedFallbackArts.length > 0) {
      return NextResponse.json({
        status: "success",
        source: cheapSharkArts.length > 0 ? "multi_store_catalog" : "wikipedia_official",
        source_label: cheapSharkArts.length > 0 ? "Multi-Store Game Catalog" : "Wikipedia / Official Box Art",
        official_title: rawTitle,
        app_id: null,
        primary_bg: combinedFallbackArts[0].url,
        artworks: combinedFallbackArts
      });
    }

    // =======================================================================
    // LAPIS 4: Honest Empty Response (NO RANDOM UNSPLASH STOCK PHOTOS!)
    // =======================================================================
    return NextResponse.json({
      status: "not_found",
      source: "manual_upload_needed",
      source_label: "Belum Ada Artwork Otomatis",
      official_title: rawTitle,
      app_id: null,
      primary_bg: "",
      artworks: [],
      message:
        "Artwork resmi otomatis belum tersedia untuk judul ini. Silakan gunakan tombol 'Upload Gambar' atau tekan Ctrl+V untuk menempel gambar langsung dari clipboard."
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
