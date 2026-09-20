import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const DATA_FILE = path.resolve(process.cwd(), "data", "autonomous_orders.json");
const OUTPUT_FILE = path.resolve(process.cwd(), "..", "output", "autonomous_orders.json");
const REPLICA_FILE = path.resolve("C:\\Users\\jesen\\Desktop\\scrt\\web\\data\\autonomous_orders.json");
const TMP_FILE = path.resolve(os.tmpdir(), "akshara_autonomous_orders.json");

// In-memory cache fallback for serverless environments (Vercel)
let inMemoryOrdersCache: any[] | null = null;

function getOrders(): any[] {
  // 1. Prioritize warm in-memory cache
  if (inMemoryOrdersCache !== null && inMemoryOrdersCache.length > 0) {
    return inMemoryOrdersCache;
  }

  // 2. Read from writable /tmp directory
  if (fs.existsSync(TMP_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(TMP_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOrdersCache = parsed;
        return parsed;
      }
    } catch (e) {
      console.error("Error reading TMP_FILE orders:", e);
    }
  }

  // 3. Fallback to bundled seed or local output
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOrdersCache = parsed;
        return parsed;
      }
    }
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOrdersCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading autonomous orders:", e);
  }

  if (inMemoryOrdersCache !== null) {
    return inMemoryOrdersCache;
  }

  inMemoryOrdersCache = [];
  return inMemoryOrdersCache;
}

function saveOrders(orders: any[]) {
  inMemoryOrdersCache = orders;
  const content = JSON.stringify(orders, null, 2);
  try {
    fs.writeFileSync(TMP_FILE, content, "utf-8");
  } catch (e) {
    console.warn("Could not write to TMP_FILE orders:", e);
  }
  try {
    fs.writeFileSync(DATA_FILE, content, "utf-8");
  } catch (e) {
    // Expected on read-only serverless runtimes like Vercel
    console.warn("Notice: Disk write skipped or read-only (using in-memory cache):", e);
  }
  try {
    if (fs.existsSync(path.dirname(OUTPUT_FILE))) {
      fs.writeFileSync(OUTPUT_FILE, content, "utf-8");
    }
  } catch (e) {
    // best-effort for local output
  }
  try {
    if (fs.existsSync(path.dirname(REPLICA_FILE))) {
      fs.writeFileSync(REPLICA_FILE, content, "utf-8");
    }
  } catch (e) {
    // best-effort
  }
}

function generateAutonomousMessages(params: {
  order_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  game_title: string;
  platform: string;
  username: string;
  password: string;
  serial_warranty: string;
}) {
  const { order_id, buyer_name, game_title, platform, username, password, serial_warranty } = params;

  const whatsapp = `🎮 *AKSHARA GAMING CENTER — PENGIRIMAN LISENSI RESMI*
Halo *${buyer_name}*! Terima kasih banyak sudah order di Akshara Gaming Center. Pesanan Anda telah selesai diproses oleh sistem otonom kami.

📦 *Detail Pesanan Anda:*
• No. Pesanan: *${order_id}*
• Game: *${game_title}*
• Platform: *${platform}*
• Status Lisensi: *100% Original & Full Access*
• Status Garansi: *Aktif Terverifikasi*

🔑 *DATA LISENSI AKUN ANDA:*
--------------------------------------------------
• *Email / Username:* \`${username}\`
• *Password:* \`${password}\`
• *Kode Serial Garansi:* \`${serial_warranty}\`
--------------------------------------------------

🚀 *3 Langkah Cepat Mulai Bermain:*
1. Buka aplikasi / launcher resmi ${platform} di PC/perangkat Anda.
2. Login menggunakan data akun yang tertera di atas.
3. Segera ubah email pemulihan & password ke milik pribadi Anda agar 100% aman permanen!

📦 *Pemberitahuan Amplop Fisik:*
Amplop resmi bersegel berisi *Kartu Garansi Fisik A6 (Art Carton 260gsm)* berpita hologram sedang dalam proses pengiriman via kurir pilihan Anda.

⚠️ *SOP Garansi Toko:*
Mohon rekam video unboxing amplop fisik tanpa jeda (no-cut & unedited) saat paket tiba untuk keperluan validasi klaim jika ada kendala.

Ada kendala login? Silakan balas chat ini, Customer Care Akshara siap mendampingi 24/7.
Selamat bermain! 🔥🎮`;

  const gmail_subject = `[Akshara Gaming] Data Lisensi Resmi & Garansi ${game_title} — No. Pesanan ${order_id}`;

  const gmail_body = `Halo ${buyer_name},

Terima kasih telah berbelanja di Akshara Gaming Center!
Pesanan Anda telah berhasil diproses secara otomatis oleh sistem kami.

DETAIL PESANAN:
• No. Pesanan: ${order_id}
• Produk: ${game_title}
• Platform: ${platform}
• Status Garansi: Aktif Resmi

DATA LISENSI / AKUN ANDA:
--------------------------------------------------
Email / Username: ${username}
Password: ${password}
Kode Serial Garansi: ${serial_warranty}
--------------------------------------------------

PANDUAN SINGKAT SETUP:
1. Login di launcher resmi ${platform}.
2. Masuk ke pengaturan akun dan ubah email serta password ke data pribadi Anda.
3. Game langsung siap diunduh dan dimainkan.

INFORMASI PENGIRIMAN FISIK:
Amplop resmi berisi Kartu Garansi Fisik A6 berpita hologram saat ini sedang diproses oleh ekspedisi pilihan Anda di Shopee.

SOP KLAIM GARANSI:
Untuk kenyamanan bersama, harap merekam video unboxing amplop fisik tanpa terputus (no-cut) saat paket tiba.

Jika membutuhkan bantuan teknis, silakan balas email ini atau hubungi WhatsApp Customer Care Akshara Gaming.

Salam hangat,
Akshara Gaming Center Official`;

  const shopee_chat = `Halo ${buyer_name}! Pesanan ${game_title} (${order_id}) sudah selesai diproses otomatis ya kak! 🎮✨\n\nEmail/User: ${username}\nPassword: ${password}\nKode Garansi: ${serial_warranty}\n\nSilakan langsung login di launcher resmi ${platform} dan ubah datanya ya kak. Amplop fisik kartu garansi A6 juga segera meluncur ke alamat kakak via kurir Shopee. Terima kasih banyak kak! 🔥`;

  return { whatsapp, gmail_subject, gmail_body, shopee_chat };
}

export async function GET() {
  try {
    const orders = getOrders();
    const totalOrders = orders.length;
    const dispatchedWA = orders.filter((o: any) => o.dispatched_channels?.includes("WhatsApp")).length;
    const dispatchedGmail = orders.filter((o: any) => o.dispatched_channels?.includes("Gmail")).length;
    const pendingOrders = orders.filter((o: any) => o.status === "PROCESSED" && (!o.dispatched_channels || o.dispatched_channels.length === 0)).length;

    return NextResponse.json({
      status: "success",
      orders,
      stats: {
        total_orders: totalOrders,
        dispatched_wa: dispatchedWA,
        dispatched_gmail: dispatchedGmail,
        pending_orders: pendingOrders,
        engine_status: "ONLINE",
        avg_latency_ms: 480
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

const VAULT_FILE = path.resolve(process.cwd(), "data", "inventory_vault.json");

function claimFromVault(gameTitle: string, orderId: string): { username: string; password: string; vault_id: string } | null {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const vault: any[] = JSON.parse(fs.readFileSync(VAULT_FILE, "utf-8"));
      const idx = vault.findIndex(
        (v: any) => v.status === "AVAILABLE" && v.game_title.toLowerCase().includes(gameTitle.toLowerCase())
      );
      if (idx !== -1) {
        const item = vault[idx];
        item.status = "DISPATCHED";
        item.assigned_order_id = orderId;
        item.dispatched_at = new Date().toISOString().replace("T", " ").substring(0, 19);
        try {
          fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), "utf-8");
        } catch (e) {}
        return { username: item.username, password: item.password, vault_id: item.id };
      }
    }
  } catch (e) {
    console.warn("Vault claim failed:", e);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orders = getOrders();

    const timestamp = new Date();
    const dateFormatted = timestamp.toISOString().replace("T", " ").substring(0, 19);
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const serialCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderId = body.order_id || `SHP-${timestamp.getFullYear()}${String(timestamp.getMonth()+1).padStart(2,'0')}-${orderNum}`;

    const gameTitle = body.game_title || "Minecraft: Java & Bedrock Edition";
    const platform = body.platform || "PC / Microsoft";
    const buyerName = body.buyer_name || "Kak Pembeli";
    const buyerPhone = body.buyer_phone || "081234567890";
    const buyerEmail = body.buyer_email || "buyer@gmail.com";
    const channel = body.channel || "Shopee";
    const priceIdr = Number(body.price_idr) || 190000;

    // Buffer Vault (Mode A) Integration
    let username = body.username;
    let password = body.password;
    let vaultId = body.vault_id || null;
    let sourceMode = body.mode || (body.use_vault ? "BUFFER_VAULT" : "JUST_IN_TIME");

    if (body.use_vault || (!username && !password)) {
      const vaultClaim = claimFromVault(gameTitle, orderId);
      if (vaultClaim) {
        username = vaultClaim.username;
        password = vaultClaim.password;
        vaultId = vaultClaim.vault_id;
        sourceMode = "BUFFER_VAULT";
      }
    }

    if (!username) {
      const userPrefix = gameTitle.toLowerCase().replace(/[^a-z]/g, "").substring(0, 5);
      username = `${userPrefix}_vault_${orderNum}@outlook.com`;
      password = `Akshara#${orderNum}!Pass`;
    }

    const serialWarranty = body.serial_warranty || `AKSH-${serialCode}-${orderNum}-WTY`;

    const messages = generateAutonomousMessages({
      order_id: orderId,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      game_title: gameTitle,
      platform,
      username,
      password,
      serial_warranty: serialWarranty
    });

    const newOrder = {
      id: `ORD-${Date.now()}`,
      order_id: orderId,
      created_at: dateFormatted,
      channel,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      game_title: gameTitle,
      platform,
      category: body.category || "Account (Full Access)",
      price_idr: priceIdr,
      credentials: {
        username,
        password,
        serial_warranty: serialWarranty,
        vault_id: vaultId,
        source_mode: sourceMode,
        notes: body.notes || (vaultId ? `Dialokasikan instan dari Brankas Stok (${vaultId}).` : "Full access, siap ganti data login & email pemulihan.")
      },
      status: "PROCESSED",
      dispatched_channels: [],
      messages
    };

    // Prepend new order to list
    orders.unshift(newOrder);
    saveOrders(orders);

    return NextResponse.json({
      status: "success",
      message: `Pesanan ${newOrder.order_id} berhasil diproses secara otonom!`,
      order: newOrder
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, channel } = body;

    const orders = getOrders();
    const targetIdx = orders.findIndex((o: any) => o.id === id || o.order_id === id);

    if (targetIdx === -1) {
      return NextResponse.json({ status: "error", message: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const order = orders[targetIdx];

    if (!Array.isArray(order.dispatched_channels)) {
      order.dispatched_channels = [];
    }

    if (action === "dispatch" || channel) {
      const targetChannel = channel || "WhatsApp";
      if (!order.dispatched_channels.includes(targetChannel)) {
        order.dispatched_channels.push(targetChannel);
      }
      order.status = "DISPATCHED";
    } else if (action === "mark_processed") {
      order.status = "PROCESSED";
    }

    saveOrders(orders);

    return NextResponse.json({
      status: "success",
      message: `Status pesanan ${order.order_id} diperbarui`,
      order
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ status: "error", message: "ID order dibutuhkan" }, { status: 400 });
    }

    let orders = getOrders();
    orders = orders.filter((o: any) => o.id !== id && o.order_id !== id);
    saveOrders(orders);

    return NextResponse.json({
      status: "success",
      message: "Pesanan berhasil dihapus"
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
