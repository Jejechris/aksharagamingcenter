import { NextResponse } from "next/server";
import { getPublicStorefrontCatalog, PublicCatalogProduct } from "@/lib/db";
import { resolvePublicArtworkUrl } from "@/lib/artworkLookup";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_FALLBACK_CATALOG: PublicCatalogProduct[] = [
  {
    id: "game-mc-01",
    title: "Minecraft: Java & Bedrock Edition",
    platform: "PC / Microsoft",
    category: "Full Access Account",
    selling_price_shopee_idr: 189000,
    warranty_days: 30,
  },
  {
    id: "game-pz-02",
    title: "Project Zomboid",
    platform: "Steam",
    category: "Steam CD-Key Global",
    selling_price_shopee_idr: 149000,
    warranty_days: 30,
  },
  {
    id: "game-wukong-03",
    title: "Black Myth: Wukong",
    platform: "Steam",
    category: "Steam Account Global",
    selling_price_shopee_idr: 499000,
    warranty_days: 30,
  },
  {
    id: "game-gtav-04",
    title: "Grand Theft Auto V: Premium Edition",
    platform: "Rockstar / Epic",
    category: "Full Access Account",
    selling_price_shopee_idr: 165000,
    warranty_days: 30,
  },
  {
    id: "game-terraria-05",
    title: "Terraria",
    platform: "Steam",
    category: "Steam CD-Key Global",
    selling_price_shopee_idr: 95000,
    warranty_days: 30,
  },
  {
    id: "game-fc25-06",
    title: "EA SPORTS FC 25",
    platform: "EA App / PC",
    category: "Standard Account Global",
    selling_price_shopee_idr: 549000,
    warranty_days: 30,
  },
];

export async function GET() {
  try {
    const rows = await getPublicStorefrontCatalog();
    const baseList = rows && rows.length > 0 ? rows : PUBLIC_FALLBACK_CATALOG;
    const list = await Promise.all(
      baseList.map(async (item) => ({
        ...item,
        artwork_url: await resolvePublicArtworkUrl(item.title),
      }))
    );
    return NextResponse.json(
      {
        status: "success",
        count: list.length,
        data: list,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err: any) {
    const list = await Promise.all(
      PUBLIC_FALLBACK_CATALOG.map(async (item) => ({
        ...item,
        artwork_url: await resolvePublicArtworkUrl(item.title),
      }))
    );
    return NextResponse.json({
      status: "success",
      count: list.length,
      data: list,
    });
  }
}
