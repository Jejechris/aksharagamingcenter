import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getDbVault, saveDbVaultItem, deleteDbVaultItem, getKV, setKV } from "@/lib/db";

const DATA_FILE = path.resolve(process.cwd(), "data", "inventory_vault.json");
const OUTPUT_FILE = path.resolve(process.cwd(), "..", "output", "inventory_vault.json");
const TMP_FILE = path.resolve(os.tmpdir(), "akshara_inventory_vault.json");

export interface VaultItem {
  id: string;
  game_title: string;
  platform: string;
  category: string;
  username: string;
  password: string;
  cost_idr: number;
  supplier_name: string;
  status: "AVAILABLE" | "RESERVED" | "DISPATCHED";
  added_at: string;
  dispatched_at?: string;
  assigned_order_id?: string;
  notes?: string;
}

// In-memory cache fallback for serverless environments (Vercel)
let inMemoryVaultCache: VaultItem[] | null = null;

function getVault(): VaultItem[] {
  // 1. Prioritize warm in-memory cache
  if (inMemoryVaultCache !== null && inMemoryVaultCache.length > 0) {
    return inMemoryVaultCache;
  }

  // 2. Read from writable /tmp directory
  if (fs.existsSync(TMP_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(TMP_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryVaultCache = parsed;
        return parsed;
      }
    } catch (e) {
      console.error("Error reading TMP_FILE vault:", e);
    }
  }

  // 3. Fallback to bundled seed or local output
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryVaultCache = parsed;
        return parsed;
      }
    }
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryVaultCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading inventory vault:", e);
  }

  if (inMemoryVaultCache !== null) {
    return inMemoryVaultCache;
  }

  inMemoryVaultCache = [];
  return inMemoryVaultCache;
}

function saveVault(items: VaultItem[]) {
  inMemoryVaultCache = items;
  const content = JSON.stringify(items, null, 2);
  try {
    fs.writeFileSync(TMP_FILE, content, "utf-8");
  } catch (e) {
    console.warn("Could not write to TMP_FILE vault:", e);
  }
  try {
    fs.writeFileSync(DATA_FILE, content, "utf-8");
  } catch (e) {
    console.warn("Notice: Disk write skipped or read-only (using in-memory cache):", e);
  }
  try {
    if (fs.existsSync(path.dirname(OUTPUT_FILE))) {
      fs.writeFileSync(OUTPUT_FILE, content, "utf-8");
    }
  } catch (e) {
    // best-effort
  }
  setKV("inventory_vault", items).catch(() => {});
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get("game");
    const status = searchParams.get("status");

    const dbVault = await getDbVault();
    let allItems: VaultItem[];
    if (dbVault !== null && dbVault.length > 0) {
      allItems = dbVault;
      inMemoryVaultCache = dbVault;
    } else {
      // 2. Try KV table if relational is empty/unconfigured
      const kvVault = await getKV("inventory_vault");
      if (kvVault && Array.isArray(kvVault) && kvVault.length > 0) {
        allItems = kvVault;
        inMemoryVaultCache = kvVault;
      } else {
        allItems = getVault();
      }
    }
    let filtered = allItems;

    if (game) {
      filtered = filtered.filter(i => i.game_title.toLowerCase().includes(game.toLowerCase()));
    }
    if (status && status !== "ALL") {
      filtered = filtered.filter(i => i.status === status);
    }

    // Calculate aggregated statistics
    const totalItems = allItems.length;
    const availableItems = allItems.filter(i => i.status === "AVAILABLE").length;
    const dispatchedItems = allItems.filter(i => i.status === "DISPATCHED").length;
    const totalCapitalValueIdr = allItems
      .filter(i => i.status === "AVAILABLE")
      .reduce((acc, curr) => acc + (curr.cost_idr || 0), 0);

    // Group by game for low-stock monitoring
    const gameMap: Record<string, { platform: string; available: number; dispatched: number }> = {};
    for (const item of allItems) {
      if (!gameMap[item.game_title]) {
        gameMap[item.game_title] = { platform: item.platform, available: 0, dispatched: 0 };
      }
      if (item.status === "AVAILABLE") {
        gameMap[item.game_title].available += 1;
      } else if (item.status === "DISPATCHED") {
        gameMap[item.game_title].dispatched += 1;
      }
    }

    const defaultThreshold = 2;
    const gameBreakdown = Object.entries(gameMap).map(([title, stats]) => ({
      game_title: title,
      platform: stats.platform,
      available_count: stats.available,
      dispatched_count: stats.dispatched,
      threshold: defaultThreshold,
      is_low_stock: stats.available <= defaultThreshold
    }));

    const lowStockAlerts = gameBreakdown.filter(g => g.is_low_stock);

    return NextResponse.json({
      status: "success",
      items: filtered,
      stats: {
        total_items: totalItems,
        available_items: availableItems,
        dispatched_items: dispatchedItems,
        total_capital_value_idr: totalCapitalValueIdr,
        game_breakdown: gameBreakdown,
        low_stock_alerts: lowStockAlerts
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const vault = getVault();
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Mode A: Bulk Import via multiline text (action: "bulk_import" or body.bulk_raw/raw_lines)
    const rawInput = body.raw_lines || body.bulk_raw;
    if (body.action === "bulk_import" || (rawInput && typeof rawInput === "string")) {
      const lines = String(rawInput || "")
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .slice(0, 50); // 1 sampai 50 baris

      const addedItems: VaultItem[] = [];
      const gameTitle = body.game_title || "Minecraft: Java & Bedrock Edition";
      const platform = body.platform || "PC / Microsoft";
      const category = body.category || "Account (Full Access)";
      const costIdr = Number(body.cost_idr) || 125000;
      const supplierName = body.supplier_name || "G2G Verified";

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        let username = "";
        let password = "";

        if (line.includes(":")) {
          const parts = line.split(":");
          username = parts[0].trim();
          password = parts.slice(1).join(":").trim();
        } else if (line.includes("|")) {
          const parts = line.split("|");
          username = parts[0].trim();
          password = parts.slice(1).join("|").trim();
        } else if (line.includes("\t") || line.includes("   ")) {
          const parts = line.split(/\s+/);
          username = parts[0].trim();
          password = parts.slice(1).join(" ").trim();
        } else {
          username = line.trim();
          password = "(Digital Key / Direct Access)";
        }

        const idSuffix = Date.now().toString().slice(-6) + String(idx).padStart(2, "0");
        const newItem: VaultItem = {
          id: `VLT-${idSuffix}`,
          game_title: gameTitle,
          platform: platform,
          category: category,
          username: username,
          password: password,
          cost_idr: costIdr,
          supplier_name: supplierName,
          status: "AVAILABLE",
          added_at: nowStr,
          notes: body.notes || "Bulk imported buffer stock."
        };

        vault.unshift(newItem);
        addedItems.push(newItem);
      }

      saveVault(vault);
      Promise.all(addedItems.map((item) => saveDbVaultItem(item))).catch((e) =>
        console.warn("Supabase vault bulk save notice:", e)
      );

      return NextResponse.json({
        status: "success",
        message: `Berhasil menambahkan ${addedItems.length} unit stok ke Brankas Buffer!`,
        count: addedItems.length,
        items: addedItems
      });
    }

    // Single item add
    const idSuffix = Date.now().toString().slice(-6);
    const newItem: VaultItem = {
      id: `VLT-${idSuffix}`,
      game_title: body.game_title || "Minecraft: Java & Bedrock Edition",
      platform: body.platform || "PC / Microsoft",
      category: body.category || "Account (Full Access)",
      username: body.username || `vault_user_${idSuffix}@outlook.com`,
      password: body.password || "Akshara#Vault2026!",
      cost_idr: Number(body.cost_idr) || 125000,
      supplier_name: body.supplier_name || "G2G Verified",
      status: "AVAILABLE",
      added_at: nowStr,
      notes: body.notes || "Ready in vault buffer."
    };

    vault.unshift(newItem);
    saveVault(vault);
    await saveDbVaultItem(newItem);

    return NextResponse.json({
      status: "success",
      message: `Unit ${newItem.game_title} (${newItem.id}) berhasil dimasukkan ke Brankas!`,
      item: newItem
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const vault = getVault();
    const { action, id, game_title, order_id } = body;

    // Action: claim_for_order (Used by Autonomous Fulfillment to consume 1 buffer item)
    if (action === "claim_for_order") {
      const matchIdx = vault.findIndex(
        item => item.status === "AVAILABLE" &&
        (!game_title || item.game_title.toLowerCase().includes(game_title.toLowerCase()))
      );

      if (matchIdx === -1) {
        return NextResponse.json({
          status: "empty",
          message: `Stok buffer untuk game "${game_title || 'yang diminta'}" habis. Silakan gunakan Mode JIT atau restock brankas.`
        }, { status: 404 });
      }

      const item = vault[matchIdx];
      item.status = "DISPATCHED";
      item.assigned_order_id = order_id || `ORD-${Date.now().toString().slice(-4)}`;
      item.dispatched_at = new Date().toISOString().replace("T", " ").substring(0, 19);

      saveVault(vault);
      await saveDbVaultItem(item);

      return NextResponse.json({
        status: "success",
        message: `Kredensial dari Brankas (${item.id}) berhasil diklaim untuk pesanan ${item.assigned_order_id}!`,
        item
      });
    }

    // Action: update_item
    if (id) {
      const targetIdx = vault.findIndex(item => item.id === id);
      if (targetIdx === -1) {
        return NextResponse.json({ status: "error", message: "Item tidak ditemukan." }, { status: 404 });
      }

      const item = vault[targetIdx];
      if (body.username !== undefined) item.username = body.username;
      if (body.password !== undefined) item.password = body.password;
      if (body.cost_idr !== undefined) item.cost_idr = Number(body.cost_idr);
      if (body.status !== undefined) item.status = body.status;
      if (body.notes !== undefined) item.notes = body.notes;
      if (body.status === "AVAILABLE") {
        delete item.assigned_order_id;
        delete item.dispatched_at;
      }

      saveVault(vault);
      await saveDbVaultItem(item);

      return NextResponse.json({
        status: "success",
        message: `Data item ${item.id} berhasil diperbarui`,
        item
      });
    }

    return NextResponse.json({ status: "error", message: "Parameter tidak valid" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ status: "error", message: "ID item diperlukan" }, { status: 400 });
    }

    let vault = getVault();
    vault = vault.filter(item => item.id !== id);
    saveVault(vault);
    await deleteDbVaultItem(id);

    return NextResponse.json({
      status: "success",
      message: `Item ${id} berhasil dihapus dari brankas.`
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
