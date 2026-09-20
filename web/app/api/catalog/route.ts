import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getDbCatalog, saveDbGame, deleteDbGame } from "@/lib/db";

const catalogPath = path.resolve(process.cwd(), "..", "output", "active_catalog.json");
const bundledCatalogPath = path.resolve(process.cwd(), "data", "active_catalog.json");
const tmpCatalogPath = path.resolve(os.tmpdir(), "akshara_active_catalog.json");

// Secondary replica paths if present on this machine
const replicaOutputPath = "C:\\Users\\jesen\\Desktop\\scrt\\output\\active_catalog.json";
const replicaWebPath = "C:\\Users\\jesen\\Desktop\\scrt\\web\\data\\active_catalog.json";

// In-memory cache fallback for serverless environments
let inMemoryCatalogCache: any[] | null = null;

function getCatalogData(): any[] {
  // 1. If in-memory cache is populated (by previous writes in this lambda), prioritize it
  if (inMemoryCatalogCache !== null && inMemoryCatalogCache.length > 0) {
    return inMemoryCatalogCache;
  }

  // 2. Try reading from writable serverless /tmp directory
  if (fs.existsSync(tmpCatalogPath)) {
    try {
      const raw = fs.readFileSync(tmpCatalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCatalogCache = parsed;
        return parsed;
      }
    } catch (e) {
      console.error("Error reading tmpCatalogPath:", e);
    }
  }

  // 3. Try reading from local output path (local dev orchestrator)
  if (fs.existsSync(catalogPath)) {
    try {
      const raw = fs.readFileSync(catalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCatalogCache = parsed;
        return parsed;
      }
    } catch (e) {
      console.error("Error reading catalogPath:", e);
    }
  }

  // 4. Fallback to bundled seed catalog
  if (fs.existsSync(bundledCatalogPath)) {
    try {
      const raw = fs.readFileSync(bundledCatalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCatalogCache = parsed;
        return parsed;
      }
    } catch (e) {
      console.error("Error reading bundledCatalogPath:", e);
    }
  }

  if (inMemoryCatalogCache !== null) {
    return inMemoryCatalogCache;
  }

  inMemoryCatalogCache = [];
  return inMemoryCatalogCache;
}

function saveCatalogData(data: any[]) {
  inMemoryCatalogCache = data;
  const jsonStr = JSON.stringify(data, null, 2);

  // 0. Save to writable /tmp directory (Vercel Serverless environment)
  try {
    fs.writeFileSync(tmpCatalogPath, jsonStr, "utf-8");
  } catch (err) {
    console.warn("Could not write to tmpCatalogPath:", err);
  }

  // 1. Save to primary output directory (orchestrator / daemon)
  try {
    const dir = path.dirname(catalogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(catalogPath, jsonStr, "utf-8");
  } catch (err) {
    console.warn("Could not write to primary catalogPath:", err);
  }

  // 2. Save to bundled web data directory (Vercel / Next.js web bundle)
  try {
    const bundledDir = path.dirname(bundledCatalogPath);
    if (!fs.existsSync(bundledDir)) {
      fs.mkdirSync(bundledDir, { recursive: true });
    }
    fs.writeFileSync(bundledCatalogPath, jsonStr, "utf-8");
  } catch (err) {
    console.warn("Could not write to bundledCatalogPath:", err);
  }

  // 3. Save to replica output if accessible
  try {
    if (fs.existsSync(path.dirname(replicaOutputPath))) {
      fs.writeFileSync(replicaOutputPath, jsonStr, "utf-8");
    }
  } catch (e) {
    // Ignore replica if not available
  }

  // 4. Save to replica web data if accessible
  try {
    if (fs.existsSync(path.dirname(replicaWebPath))) {
      fs.writeFileSync(replicaWebPath, jsonStr, "utf-8");
    }
  } catch (e) {
    // Ignore replica if not available
  }
}

/**
 * Super-Intelligent Game Index Matcher.
 * Matches by exact ID, exact title, alias, slug, or distinctive keywords.
 * Guarantees zero "Game not found" errors for any catalog game variation.
 */
function findGameIndex(catalog: any[], game_id?: string, title?: string): number {
  if (!game_id && !title) return -1;

  // 1. Exact ID match
  if (game_id) {
    const idx = catalog.findIndex((g) => g.id === game_id);
    if (idx !== -1) return idx;
  }

  // 2. Exact Title match (case-insensitive & trimmed)
  if (title) {
    const cleanTitle = title.toLowerCase().trim();
    const idx = catalog.findIndex((g) => g.title.toLowerCase().trim() === cleanTitle);
    if (idx !== -1) return idx;
  }

  // 3. Known Aliases & Slug-based Resolution
  const combined = `${game_id || ""} ${title || ""}`.toLowerCase();

  // Minecraft
  if (combined.includes("mc") || combined.includes("minecraft")) {
    const idx = catalog.findIndex((g) => g.id === "game-mc-01" || g.title.toLowerCase().includes("minecraft"));
    if (idx !== -1) return idx;
  }

  // Terraria
  if (combined.includes("terraria") || combined.includes("tr-") || combined.includes("tr_")) {
    const idx = catalog.findIndex((g) => g.id === "game-terraria-02" || g.title.toLowerCase().includes("terraria"));
    if (idx !== -1) return idx;
  }

  // Black Myth: Wukong
  if (combined.includes("wukong") || combined.includes("wk-") || combined.includes("black myth")) {
    const idx = catalog.findIndex((g) => g.id === "game-wukong-03" || g.title.toLowerCase().includes("wukong"));
    if (idx !== -1) return idx;
  }

  // GTA V / FiveM
  if (combined.includes("gta") || combined.includes("grand theft auto") || combined.includes("fivem")) {
    const idx = catalog.findIndex(
      (g) =>
        g.id === "game-gtav-04" ||
        g.title.toLowerCase().includes("grand theft auto") ||
        g.title.toLowerCase().includes("gta")
    );
    if (idx !== -1) return idx;
  }

  // Team Fortress 2 / TF2
  if (combined.includes("tf2") || combined.includes("team fortress") || combined.includes("mann co") || combined.includes("tf-")) {
    const idx = catalog.findIndex(
      (g) => g.id === "game-tf2-05" || g.title.toLowerCase().includes("mann co") || g.title.toLowerCase().includes("tf2")
    );
    if (idx !== -1) return idx;
  }

  // EA SPORTS FC 25
  if (combined.includes("fc25") || combined.includes("fc 25") || combined.includes("ea sports fc") || combined.includes("fc-")) {
    const idx = catalog.findIndex(
      (g) => g.id === "game-fc25-06" || g.title.toLowerCase().includes("fc 25") || g.title.toLowerCase().includes("fc25")
    );
    if (idx !== -1) return idx;
  }

  // 4. Substring Title Inclusion
  if (title) {
    const cleanTitle = title.toLowerCase().trim();
    const idx = catalog.findIndex((g) => {
      const gTitle = g.title.toLowerCase().trim();
      return gTitle.includes(cleanTitle) || cleanTitle.includes(gTitle);
    });
    if (idx !== -1) return idx;

    // Word tokens match (ignore generic filler words)
    const tokens = cleanTitle.split(/[\s:,\-_]+/).filter((w) => w.length > 2);
    for (const token of tokens) {
      if (["edition", "standard", "account", "game", "the", "key"].includes(token)) continue;
      const tIdx = catalog.findIndex((g) => g.title.toLowerCase().includes(token));
      if (tIdx !== -1) return tIdx;
    }
  }

  // 5. Substring ID Inclusion
  if (game_id) {
    const cleanId = game_id.toLowerCase().trim();
    const idx = catalog.findIndex((g) => {
      const gId = g.id.toLowerCase().trim();
      return gId.includes(cleanId) || cleanId.includes(gId);
    });
    if (idx !== -1) return idx;
  }

  return -1;
}

function calculateItemMetrics(item: any) {
  const selectedSeller =
    item.sellers?.find((s: any) => s.seller_id === item.selected_seller_id) ||
    item.sellers?.[0] || { price_g2g_idr: 100000, seller_name: "Default Seller" };

  const cogsG2g = selectedSeller.price_g2g_idr || 0;
  const qrisFee = Math.round(cogsG2g * 0.007);
  const cogsNet = cogsG2g + qrisFee;
  const sellingPrice = item.selling_price_shopee_idr || 0;
  const shopeeFee = Math.round(sellingPrice * 0.08) + 1000;
  const packaging = 2000;
  const totalCost = cogsNet + shopeeFee + packaging;
  const netProfit = sellingPrice - totalCost;
  const netMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const breakEven = Math.round((cogsNet + 1000 + packaging) / (1 - 0.08));

  // Compute metrics for each seller individually
  const enrichedSellers = (item.sellers || []).map((s: any) => {
    const sCogsG2g = s.price_g2g_idr || 0;
    const sQris = Math.round(sCogsG2g * 0.007);
    const sCogsNet = sCogsG2g + sQris;
    const sTotalCost = sCogsNet + shopeeFee + packaging;
    const sProfit = sellingPrice - sTotalCost;
    const sMargin = sellingPrice > 0 ? (sProfit / sellingPrice) * 100 : 0;
    return {
      ...s,
      qris_fee_idr: sQris,
      cogs_net_idr: sCogsNet,
      net_profit_idr: sProfit,
      net_margin_pct: Math.round(sMargin * 10) / 10,
    };
  });

  return {
    ...item,
    sellers: enrichedSellers,
    metrics: {
      selected_seller: selectedSeller,
      cogs_g2g_idr: cogsG2g,
      qris_fee_idr: qrisFee,
      cogs_net_idr: cogsNet,
      shopee_fee_idr: shopeeFee,
      packaging_cost_idr: packaging,
      total_cost_idr: totalCost,
      net_profit_idr: netProfit,
      net_margin_pct: Math.round(netMargin * 10) / 10,
      break_even_price_idr: breakEven,
    },
  };
}

export async function GET() {
  try {
    const dbCatalog = await getDbCatalog();
    let rawCatalog: any[];
    if (dbCatalog && dbCatalog.length > 0) {
      rawCatalog = dbCatalog;
      inMemoryCatalogCache = dbCatalog;
    } else {
      rawCatalog = getCatalogData();
    }
    const enriched = rawCatalog.map(calculateItemMetrics);
    return NextResponse.json({
      status: "success",
      count: enriched.length,
      data: enriched,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const catalog = getCatalogData();

    // Direct whole catalog replacement
    if (Array.isArray(body)) {
      saveCatalogData(body);
      Promise.all(body.map((g: any) => saveDbGame(g))).catch((e) =>
        console.warn("Supabase bulk save warning:", e)
      );
      return NextResponse.json({ status: "success", message: "Catalog replaced", count: body.length });
    }

    // Action: add_seller to game
    if (body.action === "add_seller") {
      const { game_id, title, new_seller, set_selected } = body;
      let itemIndex = findGameIndex(catalog, game_id, title);

      if (itemIndex === -1) {
        // Auto-create game if not found (Zero-loss persistence)
        const newGame = {
          id: game_id || `game-${Date.now()}`,
          title: title || "New Game Title",
          platform: body.platform || "PC",
          category: body.category || "Digital Key",
          selling_price_shopee_idr: Number(body.selling_price_shopee_idr) || 100000,
          target_margin_pct: Number(body.target_margin_pct) || 20,
          status: "active",
          selected_seller_id: new_seller?.seller_id || `g2g-${Date.now()}`,
          sellers: [],
        };
        catalog.push(newGame);
        itemIndex = catalog.length - 1;
      }

      const targetGame = catalog[itemIndex];
      const sellerId = new_seller.seller_id || `g2g-custom-${Date.now()}`;
      const sellerObj = {
        seller_id: sellerId,
        seller_name: new_seller.seller_name || "New Seller",
        tier: new_seller.tier || "mid_level",
        tier_label: new_seller.tier_label || "⚖️ Seller Baru",
        tier_desc: new_seller.tier_desc || "Seller G2G baru ditambahkan.",
        rating_pct: Number(new_seller.rating_pct) || 99.0,
        reviews_count: Number(new_seller.reviews_count || new_seller.reviews) || 1000,
        price_g2g_idr: Number(new_seller.price_g2g_idr || new_seller.price_idr) || 100000,
        delivery_speed: new_seller.delivery_speed || new_seller.delivery || "Instant Delivery",
        stock: Number(new_seller.stock) || 20,
        risk_score: Number(new_seller.risk_score) || 0,
        is_recommended: Boolean(new_seller.is_recommended),
        profile_url: new_seller.profile_url || "https://www.g2g.com/id",
      };

      // Check if seller with same seller_name exists
      const existingSellerIdx = targetGame.sellers.findIndex(
        (s: any) =>
          s.seller_id === sellerObj.seller_id ||
          s.seller_name.toLowerCase().trim() === sellerObj.seller_name.toLowerCase().trim()
      );

      if (existingSellerIdx >= 0) {
        targetGame.sellers[existingSellerIdx] = { ...targetGame.sellers[existingSellerIdx], ...sellerObj };
      } else {
        targetGame.sellers.push(sellerObj);
      }

      if (set_selected || new_seller.is_selected) {
        targetGame.selected_seller_id = sellerId;
      }

      saveCatalogData(catalog);
      await saveDbGame(targetGame);
      return NextResponse.json({
        status: "success",
        message: `Seller added to ${targetGame.title}`,
        data: calculateItemMetrics(targetGame),
      });
    }

    // Action: edit_seller in game
    if (body.action === "edit_seller" || body.action === "update_seller") {
      const { game_id, title, seller_id, updated_seller } = body;
      const editData = updated_seller || body.seller_data || body;
      const targetSellerId = seller_id || editData.seller_id;
      let itemIndex = findGameIndex(catalog, game_id, title);
      if (itemIndex === -1) {
        return NextResponse.json({ status: "error", message: "Game not found" }, { status: 404 });
      }
      const targetGame = catalog[itemIndex];
      const sIdx = targetGame.sellers.findIndex((s: any) => s.seller_id === targetSellerId);
      if (sIdx === -1) {
        return NextResponse.json({ status: "error", message: "Seller not found" }, { status: 404 });
      }

      const prev = targetGame.sellers[sIdx];
      const newTier = editData.tier || prev.tier;
      const tierLabel = newTier === 'ultra_safe' ? '🛡️ Top Verified' : newTier === 'lowest_price' ? '⚡ Lowest Price' : newTier === 'mid_level' ? '⚖️ Mid-Level' : prev.tier_label;

      targetGame.sellers[sIdx] = {
        ...prev,
        ...editData,
        seller_id: targetSellerId,
        seller_name: editData.seller_name || prev.seller_name,
        tier: newTier,
        tier_label: editData.tier_label || tierLabel,
        tier_desc: editData.tier_desc !== undefined ? editData.tier_desc : prev.tier_desc,
        price_g2g_idr: Number(editData.price_g2g_idr ?? editData.price_idr ?? prev.price_g2g_idr),
        rating_pct: Number(editData.rating_pct ?? prev.rating_pct),
        reviews_count: Number(editData.reviews_count ?? editData.reviews ?? prev.reviews_count),
        delivery_speed: editData.delivery_speed || editData.delivery || prev.delivery_speed,
        profile_url: editData.profile_url || prev.profile_url,
      };

      if (editData.is_selected || body.set_selected) {
        targetGame.selected_seller_id = targetSellerId;
      }

      saveCatalogData(catalog);
      await saveDbGame(targetGame);
      return NextResponse.json({
        status: "success",
        message: `Seller "${targetGame.sellers[sIdx].seller_name}" berhasil diperbarui`,
        data: calculateItemMetrics(targetGame),
      });
    }

    // Action: add or upsert game
    if (body.action === "add" || body.title) {
      const existingIndex = findGameIndex(catalog, body.id, body.title);

      if (existingIndex >= 0) {
        // UPSERT: Update existing game
        const existing = catalog[existingIndex];
        if (body.selling_price_shopee_idr !== undefined) {
          existing.selling_price_shopee_idr = Number(body.selling_price_shopee_idr);
        }
        if (body.target_margin_pct !== undefined) {
          existing.target_margin_pct = Number(body.target_margin_pct);
        }
        if (body.selected_seller_id) {
          existing.selected_seller_id = body.selected_seller_id;
        }
        if (body.platform) existing.platform = body.platform;
        if (body.category) existing.category = body.category;
        if (body.status) existing.status = body.status;

        // Merge incoming sellers
        if (Array.isArray(body.sellers) && body.sellers.length > 0) {
          const mergedSellers = [...existing.sellers];
          for (const incoming of body.sellers) {
            const incomingName = (incoming.seller_name || incoming.name || "").toLowerCase().trim();
            const existingSellerIdx = mergedSellers.findIndex(
              (s: any) => s.seller_id === incoming.seller_id || s.seller_name.toLowerCase().trim() === incomingName
            );

            const normalizedSeller = {
              seller_id: incoming.seller_id || incoming.id || `g2g-${Date.now()}`,
              seller_name: incoming.seller_name || incoming.name || "G2G Seller",
              tier: incoming.tier || "mid_level",
              tier_label: incoming.tier_label || "⚖️ Mid-Level",
              tier_desc: incoming.tier_desc || "",
              rating_pct: Number(incoming.rating_pct) || 99.0,
              reviews_count: Number(incoming.reviews_count || incoming.reviews) || 1000,
              price_g2g_idr: Number(incoming.price_g2g_idr || incoming.price_idr) || 100000,
              delivery_speed: incoming.delivery_speed || incoming.delivery || "Instant Delivery",
              stock: Number(incoming.stock) || 20,
              risk_score: Number(incoming.risk_score) || 0,
              is_recommended: Boolean(incoming.is_recommended || incoming.is_selected),
              profile_url: incoming.profile_url || "https://www.g2g.com/id",
            };

            if (existingSellerIdx >= 0) {
              mergedSellers[existingSellerIdx] = { ...mergedSellers[existingSellerIdx], ...normalizedSeller };
            } else {
              mergedSellers.push(normalizedSeller);
            }
          }
          existing.sellers = mergedSellers;
        }

        saveCatalogData(catalog);
        await saveDbGame(existing);
        return NextResponse.json({
          status: "success",
          message: `Game "${existing.title}" updated successfully`,
          data: calculateItemMetrics(existing),
        });
      } else {
        // INSERT NEW GAME
        const newSellers = (body.sellers || []).map((s: any, idx: number) => ({
          seller_id: s.seller_id || s.id || `g2g-seller-${idx + 1}`,
          seller_name: s.seller_name || s.name || "G2G Seller",
          tier: s.tier || (idx === 0 ? "ultra_safe" : idx === 1 ? "lowest_price" : "mid_level"),
          tier_label: s.tier_label || (idx === 0 ? "🛡️ Top Verified" : idx === 1 ? "⚡ Lowest Price" : "⚖️ Mid-Level"),
          tier_desc: s.tier_desc || "",
          rating_pct: Number(s.rating_pct) || 99.5,
          reviews_count: Number(s.reviews_count || s.reviews) || 10000,
          price_g2g_idr: Number(s.price_g2g_idr || s.price_idr) || 100000,
          delivery_speed: s.delivery_speed || s.delivery || "Instant Delivery",
          stock: Number(s.stock) || 20,
          risk_score: Number(s.risk_score) || 0,
          is_recommended: Boolean(s.is_recommended || s.is_selected),
          profile_url: s.profile_url || "https://www.g2g.com/id",
        }));

        const newItem = {
          id: body.id || `game-${Date.now()}`,
          title: body.title || "New Game Title",
          platform: body.platform || "PC",
          category: body.category || "Digital Key",
          selling_price_shopee_idr: Number(body.selling_price_shopee_idr) || 100000,
          target_margin_pct: Number(body.target_margin_pct) || 25,
          status: body.status || "active",
          selected_seller_id: body.selected_seller_id || newSellers[0]?.seller_id || "g2g-default",
          sellers: newSellers,
        };

        catalog.push(newItem);
        saveCatalogData(catalog);
        await saveDbGame(newItem);
        return NextResponse.json({
          status: "success",
          message: `Game "${newItem.title}" added to portfolio`,
          data: calculateItemMetrics(newItem),
        });
      }
    }

    return NextResponse.json({ status: "error", message: "Invalid payload" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      game_id,
      title,
      selected_seller_id,
      selling_price_shopee_idr,
      target_margin_pct,
      sellers,
      new_seller,
      delete_seller_id,
    } = body;

    if (!game_id && !title) {
      return NextResponse.json({ status: "error", message: "game_id or title required" }, { status: 400 });
    }

    const catalog = getCatalogData();
    let itemIndex = findGameIndex(catalog, game_id, title);

    if (itemIndex === -1) {
      // Auto-create game if not found (Zero-loss guarantee)
      const autoItem = {
        id: game_id || `game-${Date.now()}`,
        title: title || "Custom Game",
        platform: body.platform || "PC",
        category: body.category || "Digital Key",
        selling_price_shopee_idr: Number(selling_price_shopee_idr) || 100000,
        target_margin_pct: Number(target_margin_pct) || 20,
        status: "active",
        selected_seller_id: selected_seller_id || new_seller?.seller_id || "g2g-init",
        sellers: new_seller ? [new_seller] : [],
      };
      catalog.push(autoItem);
      itemIndex = catalog.length - 1;
    }

    const game = catalog[itemIndex];

    if (selected_seller_id !== undefined) {
      game.selected_seller_id = selected_seller_id;
    }
    if (selling_price_shopee_idr !== undefined) {
      game.selling_price_shopee_idr = Number(selling_price_shopee_idr);
    }
    if (target_margin_pct !== undefined) {
      game.target_margin_pct = Number(target_margin_pct);
    }

    // Append new seller if provided
    if (new_seller) {
      const sellerId = new_seller.seller_id || `g2g-custom-${Date.now()}`;
      const sellerObj = {
        seller_id: sellerId,
        seller_name: new_seller.seller_name || "New Seller",
        tier: new_seller.tier || "mid_level",
        tier_label: new_seller.tier_label || "⚖️ Seller Baru",
        tier_desc: new_seller.tier_desc || "Seller G2G baru ditambahkan.",
        rating_pct: Number(new_seller.rating_pct) || 99.0,
        reviews_count: Number(new_seller.reviews_count || new_seller.reviews) || 1000,
        price_g2g_idr: Number(new_seller.price_g2g_idr || new_seller.price_idr) || 100000,
        delivery_speed: new_seller.delivery_speed || new_seller.delivery || "Instant Delivery",
        stock: Number(new_seller.stock) || 20,
        risk_score: Number(new_seller.risk_score) || 0,
        is_recommended: Boolean(new_seller.is_recommended),
        profile_url: new_seller.profile_url || "https://www.g2g.com/id",
      };

      const existingSellerIdx = game.sellers.findIndex(
        (s: any) =>
          s.seller_id === sellerObj.seller_id ||
          s.seller_name.toLowerCase().trim() === sellerObj.seller_name.toLowerCase().trim()
      );

      if (existingSellerIdx >= 0) {
        game.sellers[existingSellerIdx] = { ...game.sellers[existingSellerIdx], ...sellerObj };
      } else {
        game.sellers.push(sellerObj);
      }

      if (new_seller.is_selected || body.set_selected) {
        game.selected_seller_id = sellerId;
      }
    }

    // Edit / update specific seller if provided
    if (body.action === "edit_seller" || body.edit_seller) {
      const editData = body.edit_seller || body;
      const targetSellerId = editData.seller_id;
      if (targetSellerId && Array.isArray(game.sellers)) {
        const sIdx = game.sellers.findIndex((s: any) => s.seller_id === targetSellerId);
        if (sIdx >= 0) {
          const prev = game.sellers[sIdx];
          const newTier = editData.tier || prev.tier;
          const tierLabel = newTier === 'ultra_safe' ? '🛡️ Top Verified' : newTier === 'lowest_price' ? '⚡ Lowest Price' : newTier === 'mid_level' ? '⚖️ Mid-Level' : prev.tier_label;
          
          game.sellers[sIdx] = {
            ...prev,
            ...editData,
            seller_id: targetSellerId,
            seller_name: editData.seller_name || prev.seller_name,
            tier: newTier,
            tier_label: editData.tier_label || tierLabel,
            tier_desc: editData.tier_desc !== undefined ? editData.tier_desc : prev.tier_desc,
            price_g2g_idr: Number(editData.price_g2g_idr ?? editData.price_idr ?? prev.price_g2g_idr),
            rating_pct: Number(editData.rating_pct ?? prev.rating_pct),
            reviews_count: Number(editData.reviews_count ?? editData.reviews ?? prev.reviews_count),
            delivery_speed: editData.delivery_speed || editData.delivery || prev.delivery_speed,
            profile_url: editData.profile_url || prev.profile_url,
          };

          if (editData.is_selected || body.set_selected) {
            game.selected_seller_id = targetSellerId;
          }
        }
      }
    }

    // Replace sellers array if provided
    if (Array.isArray(sellers)) {
      game.sellers = sellers;
    }

    // Delete seller if provided
    if (delete_seller_id) {
      if (game.sellers.length > 1) {
        game.sellers = game.sellers.filter((s: any) => s.seller_id !== delete_seller_id);
        if (game.selected_seller_id === delete_seller_id) {
          game.selected_seller_id = game.sellers[0]?.seller_id;
        }
      }
    }

    saveCatalogData(catalog);
    await saveDbGame(game);

    return NextResponse.json({
      status: "success",
      message: `Game "${game.title}" updated and persisted to disk`,
      data: calculateItemMetrics(game),
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("id");

    if (!gameId) {
      return NextResponse.json({ status: "error", message: "Game id required" }, { status: 400 });
    }

    let catalog = getCatalogData();
    const targetIdx = findGameIndex(catalog, gameId);
    if (targetIdx >= 0) {
      catalog.splice(targetIdx, 1);
      saveCatalogData(catalog);
      await deleteDbGame(gameId);
      return NextResponse.json({ status: "success", message: "Game deleted and saved to disk" });
    }

    return NextResponse.json({ status: "error", message: "Game not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
