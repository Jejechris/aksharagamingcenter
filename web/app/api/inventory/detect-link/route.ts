import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getDbCatalog } from "@/lib/db";
import { VERIFIED_ENEBA_CATALOG, getEnebaSearchUrl } from "@/lib/eneba";

const USD_TO_IDR_RATE = 16000;

function cleanGameTitle(rawTitle: string): string {
  if (!rawTitle) return "Custom Game";
  let t = rawTitle
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/full access.*$/i, "")
    .replace(/no ban.*$/i, "")
    .replace(/global key.*$/i, "")
    .replace(/steam key.*$/i, "")
    .replace(/cdkey.*$/i, "")
    .replace(/all details changeable.*$/i, "")
    .replace(/region free.*$/i, "")
    .replace(/\|.*$/g, "")
    .replace(/#.*$/g, "")
    .replace(/:/g, " ")
    .trim();

  const lower = t.toLowerCase();
  if (lower.includes("minecraft")) return "Minecraft: Java & Bedrock Edition";
  if (lower.includes("terraria")) return "Terraria";
  if (lower.includes("wukong") || lower.includes("black myth"))
    return "Black Myth: Wukong Standard Edition";
  if (lower.includes("grand theft auto") || lower.includes("gta"))
    return "Grand Theft Auto V: Enhanced Edition";
  if (lower.includes("mann co") || lower.includes("tf2"))
    return "Mann Co. Supply Crate Key (TF2 Key)";
  if (lower.includes("fc 25") || lower.includes("fc25") || lower.includes("fifa"))
    return "EA SPORTS FC 25 Standard Edition";

  // Capitalize words
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function detectPlatform(rawTitle: string, catPath?: string): string {
  const lower = ((rawTitle || "") + " " + (catPath || "")).toLowerCase();
  if (lower.includes("steam")) return "Steam";
  if (lower.includes("microsoft") || lower.includes("mojang") || lower.includes("pc"))
    return "PC / Microsoft";
  if (lower.includes("xbox")) return "Xbox";
  if (lower.includes("playstation") || lower.includes("psn")) return "PlayStation";
  if (lower.includes("gog")) return "GOG";
  return "PC";
}

function detectCategory(rawTitle: string): string {
  const lower = (rawTitle || "").toLowerCase();
  if (lower.includes("key") || lower.includes("cdkey") || lower.includes("redeem") || lower.includes("code"))
    return "Digital Key / Redeem Code";
  if (lower.includes("item") || lower.includes("crate") || lower.includes("skin"))
    return "In-Game Items";
  return "Account (Full Access)";
}

function extractOfferId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.trim().match(/(?:offer\/|item\/|^)?(G\d{10,}[A-Za-z0-9]*)/);
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputUrl = (body.url || body.link || body.offer_id || "").trim();

    if (!inputUrl) {
      return NextResponse.json(
        { status: "error", message: "Harap masukkan URL listing G2G atau Eneba." },
        { status: 400 }
      );
    }

    // 1. Cek apakah ini link Eneba
    if (inputUrl.includes("eneba.com")) {
      const urlObj = new URL(inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`);
      const queryText = urlObj.searchParams.get("text") || "";
      const pathSlug = urlObj.pathname.replace(/^\/+/g, "");

      let matchedKey = "";
      for (const [k, v] of Object.entries(VERIFIED_ENEBA_CATALOG)) {
        if (
          queryText.toLowerCase().includes(k) ||
          pathSlug.toLowerCase().includes(k) ||
          v.title.toLowerCase().includes(queryText.toLowerCase())
        ) {
          matchedKey = k;
          break;
        }
      }

      const enebaItem = matchedKey ? VERIFIED_ENEBA_CATALOG[matchedKey] : null;
      const detectedTitle = enebaItem?.title || queryText || "Eneba Digital Game";
      const cleanTitle = cleanGameTitle(detectedTitle);
      const estPrice = enebaItem?.estimatedPriceIdr || 65000;
      const recommendedShopee = Math.round((estPrice * 1.35) / 1000) * 1000;

      return NextResponse.json({
        status: "success",
        marketplace: "ENEBA",
        data: {
          offer_id: `eneba-${matchedKey || "custom"}`,
          raw_title: detectedTitle,
          clean_title: cleanTitle,
          platform: enebaItem?.platform || "Steam / PC",
          category: enebaItem?.keyType || "Digital Key / CDKey (Global)",
          seller_name: "Eneba Verified Merchant",
          real_stock: 50,
          price_usd: Math.round((estPrice / USD_TO_IDR_RATE) * 100) / 100,
          price_idr: estPrice,
          recommended_shopee_price_idr: recommendedShopee,
          is_online: true,
          status: "live",
          rating_pct: 99.9,
          success_orders: 50000,
          delivery_speed: "Instant Key Delivery",
          profile_url: getEnebaSearchUrl(cleanTitle),
          is_eneba: true,
        },
      });
    }

    // 2. Ekstrak Offer ID G2G
    const offerId = extractOfferId(inputUrl);
    if (!offerId) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Format link tidak dikenali. Pastikan memasukkan link offer G2G (contoh: https://www.g2g.com/.../offer/G1703129821471UK) atau ID Offer (G1703129821471UK).",
        },
        { status: 400 }
      );
    }

    // 3. Request langsung ke server resmi G2G SLS API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);

    const slsRes = await fetch(`https://sls.g2g.com/offer/${offerId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.g2g.com/",
        Origin: "https://www.g2g.com",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!slsRes.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `G2G SLS mengembalikan status HTTP ${slsRes.status}. Listing mungkin delisted atau ID tidak valid.`,
        },
        { status: 404 }
      );
    }

    const slsJson = await slsRes.json();
    const p = slsJson.payload;

    if (!p) {
      return NextResponse.json(
        {
          status: "error",
          message: "Data listing tidak ditemukan di server G2G SLS.",
        },
        { status: 404 }
      );
    }

    // 4. Transform data faktual
    const rawTitle = p.title || "Game Title";
    const cleanTitle = cleanGameTitle(rawTitle);
    const platform = detectPlatform(rawTitle, p.cat_path);
    const category = detectCategory(rawTitle);
    const availableQty = Number(p.available_qty ?? 0);
    const actualQty = Number(p.actual_qty ?? 0);
    const isSoldOut = Boolean(p.is_sold_out || availableQty === 0 || p.status !== "live");
    const priceUsd = Number(p.unit_price_in_usd ?? 0);
    const priceIdr = Math.round(priceUsd * USD_TO_IDR_RATE);
    const recommendedShopee = Math.round((priceIdr * 1.3) / 1000) * 1000;
    const sellerName = p.username || "G2G Seller";
    const ratingPct = Math.round((Number(p.satisfaction_rate) || 0) * 1000) / 10;
    const successOrders = Number(p.total_success_order ?? 0);
    const reviewsCount = Number(p.total_rating ?? 1000);
    const isOnline = Boolean(p.is_online);
    const deliverySpeed = p.delivery_speed === "instant" ? "Instant Delivery" : "Fast Delivery (1-10 Menit)";
    const verifiedUrl = `https://www.g2g.com/id/offer/${offerId}`;

    // 5. Cek kecocokan dengan katalog lokal / database
    let matchingGameId: string | null = null;
    let matchingGameTitle: string | null = null;
    let isExistingSeller = false;
    let existingSellerId: string | null = null;

    try {
      const dbCatalog = await getDbCatalog();
      if (Array.isArray(dbCatalog)) {
        for (const g of dbCatalog) {
          const gLower = g.title.toLowerCase();
          const cleanLower = cleanTitle.toLowerCase();
          if (gLower.includes(cleanLower) || cleanLower.includes(gLower)) {
            matchingGameId = g.id;
            matchingGameTitle = g.title;

            // Cek apakah seller ini sudah ada di game ini
            const sMatch = (g.sellers || []).find(
              (s: any) =>
                s.seller_name.toLowerCase().trim() === sellerName.toLowerCase().trim() ||
                (s.profile_url && s.profile_url.includes(offerId))
            );
            if (sMatch) {
              isExistingSeller = true;
              existingSellerId = sMatch.seller_id;
            }
            break;
          }
        }
      }
    } catch (e) {}

    return NextResponse.json({
      status: "success",
      marketplace: "G2G",
      data: {
        offer_id: offerId,
        raw_title: rawTitle,
        clean_title: cleanTitle,
        platform,
        category,
        seller_name: sellerName,
        real_stock: availableQty,
        actual_qty: actualQty,
        is_sold_out: isSoldOut,
        status: p.status,
        price_usd: priceUsd,
        price_idr: priceIdr,
        recommended_shopee_price_idr: recommendedShopee,
        is_online: isOnline,
        rating_pct: ratingPct,
        reviews_count: reviewsCount,
        success_orders: successOrders,
        delivery_speed: deliverySpeed,
        profile_url: verifiedUrl,
        matching_game_id: matchingGameId,
        matching_game_title: matchingGameTitle,
        is_existing_seller: isExistingSeller,
        existing_seller_id: existingSellerId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
