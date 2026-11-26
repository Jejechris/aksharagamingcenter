import ExcelJS from "exceljs";

export interface ShopeeMassProductVariant {
  option_name: string; // e.g. "Standard Global", "Ultimate Edition" (max 20 chars)
  price_idr: number;
  stock: number;
  sku_variant?: string;
}

export interface ShopeeMassProductInput {
  id: string;
  title: string;
  platform: string;
  category_type?: string; // game catalog category ("Digital Key / CDKey", "Account (Full Access)")
  shopee_category_id?: string; // e.g. "101090"
  seo_title: string;
  description: string;
  price_idr: number;
  stock: number;
  sku_parent: string;
  cover_image_url: string;
  image_1_url?: string;
  image_2_url?: string;
  weight_grams?: number;
  shipping_active?: boolean;
  pre_order_days?: number | "";
  variation_name?: string; // e.g. "Edisi" (max 14 chars)
  variants?: ShopeeMassProductVariant[];
}

export interface ShopeeValidationIssue {
  sku: string;
  title: string;
  severity: "error" | "warning";
  message: string;
}

export const SHOPEE_CATEGORY_PRESETS = [
  { id: "101090", label: "101090 — Gaming & Konsol / Video Game / Game PC" },
  { id: "100772", label: "100772 — Tiket, Voucher, & Layanan / Gaming" },
  { id: "101937", label: "101937 — Komputer & Aksesoris / Software" },
  { id: "101083", label: "101083 — Gaming & Konsol / Video Game / Xbox" },
  { id: "101082", label: "101082 — Gaming & Konsol / Video Game / PlayStation" },
  { id: "101087", label: "101087 — Gaming & Konsol / Video Game / Switch" },
  { id: "101091", label: "101091 — Gaming & Konsol / Video Game / Lainnya" },
];

export function inferShopeeCategoryId(title: string, platform: string, category?: string): string {
  const combined = `${title} ${platform} ${category || ""}`.toLowerCase();
  if (/windows|office|software|antivirus|adobe|os license/.test(combined)) return "101937";
  if (/playstation|ps4|ps5|psn/.test(combined)) return "101082";
  if (/xbox/.test(combined)) return "101083";
  if (/nintendo|switch/.test(combined)) return "101087";
  return "101090"; // Gaming & Konsol / Video Game / Game PC
}

const FORBIDDEN_URL_RE = /(https?:\/\/|wa\.me|bit\.ly|vercel\.app|\.com\b|\.id\b|shopee\.co)/i;
const PHYSICAL_JUNK_RE = /(amplop fisik|kartu garansi fisik|ekspedisi kurir|video unboxing amplop)/i;

/**
 * Menghasilkan Judul SEO (maks 120 char) & Deskripsi Shopee-Compliant 100% Pure Digital
 * tanpa link eksternal agar lolos validasi & tidak kena sensor marketplace.
 */
export function buildPureDigitalListingCopy(params: {
  title: string;
  platform: string;
  category?: string;
  warrantyDays?: number;
}): { seoTitle: string; description: string } {
  const title = params.title.trim();
  const platform = (params.platform || "PC / Steam").trim();
  const category = (params.category || "Digital License").trim();
  const warrantyDays = Math.max(1, Number(params.warrantyDays) || 30);
  const isKey = /key|cdkey|redeem/i.test(category);

  let seoTitle = `[100% ORIGINAL] ${title.toUpperCase()} - ${platform.toUpperCase()} ${
    isKey ? "CDKEY RESMI" : "FULL ACCESS"
  } GARANSI ${warrantyDays} HARI`;
  if (seoTitle.length > 120) {
    seoTitle = seoTitle.slice(0, 117).trim() + "...";
  }

  const tagWords = title
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4);
  const hashtags = [
    ...tagWords.map((w) => `#${w}`),
    "#AksharaGaming",
    "#GameOriginal",
    "#GaransiDigital",
    `#${platform.replace(/[^a-zA-Z0-9]/g, "") || "PCGame"}`,
  ]
    .slice(0, 7)
    .join(" ");

  const description = [
    `AKSHARA GAMING CENTER - OFFICIAL DIGITAL LICENSE`,
    `PRODUK 100% ORIGINAL & LEGAL | 100% PENGIRIMAN DIGITAL INSTAN`,
    `==================================================`,
    `DETAIL PRODUK:`,
    `- Game: ${title}`,
    `- Platform: ${platform}`,
    `- Tipe Lisensi: ${category}`,
    `- Status: 100% Legal & Permanen (Bukan Shared / Bajakan)`,
    `- Region: GLOBAL (Aman tanpa VPN dari Indonesia)`,
    `==================================================`,
    ``,
    `KELENGKAPAN PENGIRIMAN DIGITAL (TANPA PAKET FISIK):`,
    `1. Akses lisensi / kredensial resmi dikirim langsung via Chat Shopee.`,
    `2. Kartu Akses & Sertifikat Garansi Digital ber-QR resmi (${warrantyDays} Hari).`,
    `3. Panduan setup & aktivasi lengkap didampingi CS ramah.`,
    ``,
    `SYARAT & KETENTUAN GARANSI RESMI:`,
    `- Wajib merekam layar (Screen Recording) tanpa jeda (no-cut) sebelum membuka Kartu Akses hingga login pertama berhasil.`,
    `- Dilarang mengubah Region/Negara akun (2-4 minggu) atau data akun tanpa konfirmasi admin.`,
    `- Klik "Pesanan Diterima" + Ulasan Bintang 5 setelah berhasil login untuk mengaktifkan garansi penuh ${warrantyDays} hari.`,
    ``,
    `${hashtags}`,
  ].join("\n");

  return {
    seoTitle,
    description: description.slice(0, 2990),
  };
}

export function validateMassUploadItems(items: ShopeeMassProductInput[]): ShopeeValidationIssue[] {
  const issues: ShopeeValidationIssue[] = [];
  const seenTitles = new Map<string, string>();
  const seenCovers = new Map<string, string>();
  const seenSkus = new Set<string>();

  for (const item of items) {
    const sku = (item.sku_parent || item.id).trim();
    const titleKey = (item.seo_title || item.title).trim().toLowerCase();

    if (!item.seo_title || item.seo_title.trim().length < 5 || item.seo_title.trim().length > 255) {
      issues.push({ sku, title: item.title, severity: "error", message: "Nama produk harus 5–255 karakter." });
    }
    if (!item.description || item.description.trim().length < 20 || item.description.trim().length > 3000) {
      issues.push({ sku, title: item.title, severity: "error", message: "Deskripsi produk harus 20–3000 karakter." });
    }
    if (FORBIDDEN_URL_RE.test(item.description || "") || FORBIDDEN_URL_RE.test(item.seo_title || "")) {
      issues.push({
        sku,
        title: item.title,
        severity: "error",
        message: "Terdeteksi URL/domain terlarang di Judul/Deskripsi Shopee — harap hapus tautan eksternal.",
      });
    }
    if (PHYSICAL_JUNK_RE.test(item.description || "")) {
      issues.push({
        sku,
        title: item.title,
        severity: "warning",
        message: "Masih ada kata amplop/kurir fisik dalam deskripsi.",
      });
    }
    if (seenTitles.has(titleKey)) {
      issues.push({
        sku,
        title: item.title,
        severity: "error",
        message: `Judul SEO duplikat dengan SKU ${seenTitles.get(titleKey)}.`,
      });
    } else {
      seenTitles.set(titleKey, sku);
    }

    if (seenSkus.has(sku)) {
      issues.push({ sku, title: item.title, severity: "error", message: `SKU Induk "${sku}" duplikat.` });
    } else {
      seenSkus.add(sku);
    }

    if (!item.cover_image_url || !/^https?:\/\//i.test(item.cover_image_url.trim())) {
      issues.push({
        sku,
        title: item.title,
        severity: "warning",
        message: "Foto Sampul belum berupa link HTTPS publik (klik 'Render & Host Thumbnail' terlebih dahulu).",
      });
    } else {
      const cov = item.cover_image_url.trim();
      if (/localhost|127\.0\.0\.1/i.test(cov)) {
        issues.push({
          sku,
          title: item.title,
          severity: "warning",
          message: "URL Foto Sampul masih localhost — isi Origin URL Vercel Anda agar bisa ditarik server Shopee.",
        });
      }
      if (seenCovers.has(cov)) {
        issues.push({
          sku,
          title: item.title,
          severity: "error",
          message: `Foto Sampul sama persis dengan ${seenCovers.get(cov)} (Shopee melarang foto duplikat).`,
        });
      } else {
        seenCovers.set(cov, sku);
      }
    }

    const variants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : null;
    if (variants) {
      if ((item.variation_name || "").trim().length > 14) {
        issues.push({ sku, title: item.title, severity: "error", message: "Nama Variasi 1 maksimal 14 karakter." });
      }
      const prices = variants.map((v) => Number(v.price_idr) || 0).filter((p) => p > 0);
      if (prices.length >= 2) {
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        if (maxP / minP > 7) {
          issues.push({
            sku,
            title: item.title,
            severity: "error",
            message: `Rasio harga variasi ${(maxP / minP).toFixed(1)}x melebihi batas Shopee (maks 7x).`,
          });
        }
      }
    } else if ((Number(item.price_idr) || 0) < 99 || (Number(item.price_idr) || 0) > 150000000) {
      issues.push({ sku, title: item.title, severity: "error", message: "Harga Shopee harus Rp 99 s/d Rp 150.000.000." });
    }
  }

  return issues;
}

// 38 exact Shopee Mass Upload template columns
const SHOPEE_INTERNAL_KEYS = [
  "ps_category|0|0",
  "ps_product_name|1|0",
  "ps_product_description|1|0",
  "ps_maximum_purchase_quantity|0|0",
  "ps_maximum_purchase_quantity_start_date|0|0",
  "ps_maximum_purchase_quantity_time_period|0|0",
  "ps_maximum_purchase_quantity_end_date|0|0",
  "ps_minimum_purchase_quantity|0|0",
  "ps_sku_parent_short|0|0",
  "ps_dangerous_goods|0|0",
  "et_title_variation_integration_no|0|0",
  "et_title_variation_1|0|0",
  "et_title_option_for_variation_1|0|0",
  "et_title_image_per_variation|0|3",
  "et_title_variation_2|0|0",
  "et_title_option_for_variation_2|0|0",
  "ps_price|1|1",
  "ps_stock|0|1",
  "ps_sku_short|0|0",
  "ps_new_size_chart|0|1",
  "et_title_size_chart|0|3",
  "ps_gtin_code|0|0",
  "ps_item_cover_image|1|3",
  "ps_item_image_1|0|3",
  "ps_item_image_2|0|3",
  "ps_item_image_3|0|3",
  "ps_item_image_4|0|3",
  "ps_item_image_5|0|3",
  "ps_item_image_6|0|3",
  "ps_item_image_7|0|3",
  "ps_item_image_8|0|3",
  "ps_weight|1|1",
  "ps_length|0|1",
  "ps_width|0|1",
  "ps_height|0|1",
  "channel_id.8003|0|0",
  "ps_product_pre_order_dts|0|1",
  "et_title_reason|0|0",
];

const SHOPEE_METADATA_ROW = [
  "basic",
  "32d05d7b1ef8cb794e3c2d4c91ae9cb8",
  "0",
  "1935832174",
  ...Array(SHOPEE_INTERNAL_KEYS.length - 4).fill(""),
];

const SHOPEE_HUMAN_HEADERS = [
  "Kategori",
  "Nama Produk",
  "Deskripsi Produk",
  "Maks. Jumlah Pembelian",
  "Maks. Jumlah Pembelian - Tanggal Mulai",
  "Maks. Jumlah Pembelian - Jumlah Hari",
  "Maks. Jumlah Pembelian - Tanggal Berakhir",
  "Min. Jumlah Pembelian",
  "SKU Induk",
  "Produk Berbahaya",
  "Kode Integrasi Variasi",
  "Nama Variasi 1",
  "Varian untuk Variasi 1",
  "Foto Produk per Varian",
  "Nama Variasi 2",
  "Varian untuk Variasi 2",
  "Harga",
  "Stok",
  "Kode Variasi",
  "Template Panduan Ukuran",
  "Foto Panduan Ukuran",
  "GTIN",
  "Foto Sampul",
  "Foto Produk 1",
  "Foto Produk 2",
  "Foto Produk 3",
  "Foto Produk 4",
  "Foto Produk 5",
  "Foto Produk 6",
  "Foto Produk 7",
  "Foto Produk 8",
  "Berat",
  "Panjang",
  "Lebar",
  "Tinggi",
  "Reguler (Cashless)",
  "Dikirim Dalam Pre-order",
  "Alasan Gagal",
];

const SHOPEE_REQUIRED_ROW = [
  "Opsional",
  "Wajib",
  "Wajib",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Opsional",
  "Opsional",
  "Opsional",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib",
  "Wajib Bersyarat",
  "Opsional",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Opsional",
  "Wajib",
  "Opsional",
  "Opsional",
  "Opsional",
  "Opsional",
  "Opsional",
  "Opsional",
  "Opsional",
  "Opsional",
  "Wajib",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Wajib Bersyarat",
  "Opsional",
  "",
];

function buildProductRowsForKeys(
  items: ShopeeMassProductInput[],
  keysRow: string[]
): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [];
  let integrationSeq = 101;

  for (const item of items) {
    const categoryId = (
      item.shopee_category_id || inferShopeeCategoryId(item.title, item.platform, item.category_type)
    ).trim();
    const skuParent = (item.sku_parent || item.id).slice(0, 100);
    const weight = Math.max(1, Math.round(Number(item.weight_grams) || 1));
    const shipStatus = item.shipping_active === false ? "Nonaktif" : "Aktif";
    const variants =
      Array.isArray(item.variants) && item.variants.length > 0
        ? item.variants
        : [{ option_name: "", price_idr: item.price_idr, stock: item.stock, sku_variant: skuParent }];
    const hasVariations = Array.isArray(item.variants) && item.variants.length > 0;
    const varIntegration = hasVariations ? String(integrationSeq++) : "";
    const varName = hasVariations ? (item.variation_name || "Edisi").slice(0, 14) : "";

    variants.forEach((v, vIdx) => {
      const isFirstRow = vIdx === 0;
      const cleanDesc = isFirstRow ? (item.description || "").slice(0, 3000) : "";
      const cleanTitle = isFirstRow ? (item.seo_title || item.title).slice(0, 255) : "";

      const rowArr = keysRow.map((rawKey) => {
        const key = String(rawKey || "").split("|")[0].trim();
        switch (key) {
          case "ps_category":
            return categoryId;
          case "ps_product_name":
            return cleanTitle;
          case "ps_product_description":
            return cleanDesc;
          case "ps_minimum_purchase_quantity":
            return isFirstRow ? 1 : "";
          case "ps_sku_parent_short":
            return skuParent;
          case "ps_dangerous_goods":
            return isFirstRow ? "No (ID)" : "";
          case "et_title_variation_integration_no":
            return varIntegration;
          case "et_title_variation_1":
            return varName;
          case "et_title_option_for_variation_1":
            return hasVariations ? v.option_name.slice(0, 20) : "";
          case "ps_price":
            return Math.max(99, Math.round(Number(v.price_idr) || Number(item.price_idr) || 99000));
          case "ps_stock":
            return Math.max(0, Math.round(Number(v.stock) ?? Number(item.stock) ?? 10));
          case "ps_sku_short":
            return (v.sku_variant || (hasVariations ? `${skuParent}-V${vIdx + 1}` : skuParent)).slice(0, 100);
          case "ps_item_cover_image":
            return isFirstRow ? (item.cover_image_url || "").trim() : "";
          case "ps_item_image_1":
            return isFirstRow ? (item.image_1_url || "").trim() : "";
          case "ps_item_image_2":
            return isFirstRow ? (item.image_2_url || "").trim() : "";
          case "ps_weight":
            return weight;
          case "channel_id.8003":
          case "channel_id_":
            return shipStatus;
          case "ps_product_pre_order_dts":
            return item.pre_order_days ? Number(item.pre_order_days) : "";
          default:
            return "";
        }
      });
      rows.push(rowArr);
    });
  }
  return rows;
}

/**
 * Menghasilkan file Excel (.xlsx) resmi untuk Shopee Seller Centre Mass Upload.
 * Jika `customTemplateBase64` dikirim (user upload file .xlsx kosong terbaru dari Seller Centre),
 * workbook tersebut dipertahankan header/metadata/hidden sheet-nya dan baris produk diinjeksikan langsung!
 */
export async function generateShopeeMassUploadWorkbook(
  items: ShopeeMassProductInput[],
  options?: { customTemplateBase64?: string }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  if (options?.customTemplateBase64) {
    const cleanB64 = options.customTemplateBase64.replace(/^data:[^;]+;base64,/, "").trim();
    const buf = Buffer.from(cleanB64, "base64");
    await wb.xlsx.load(buf as any);

    const sheet = wb.getWorksheet("Template") || wb.worksheets[0];
    if (!sheet) {
      throw new Error("Sheet Template tidak ditemukan pada file Excel yang diunggah.");
    }

    // Cari baris key internal Shopee (`ps_category...`) dan temukan baris pertama data
    let keysRowIdx = 1;
    let headerKeys: string[] = [];
    for (let r = 1; r <= Math.min(10, sheet.rowCount || 10); r++) {
      const vals = sheet.getRow(r).values as any[];
      const normalized = vals.slice(1).map((v) => String(v || "").trim());
      if (normalized.some((v) => v.startsWith("ps_category"))) {
        keysRowIdx = r;
        headerKeys = normalized;
        break;
      }
    }

    if (headerKeys.length === 0) {
      headerKeys = SHOPEE_INTERNAL_KEYS;
    }

    // Baris data dimulai setelah baris instruksi (umumnya keysRowIdx + 5 = baris 7)
    let dataStartRow = keysRowIdx + 5;
    for (let r = keysRowIdx + 1; r <= Math.min(12, sheet.rowCount || 12); r++) {
      const firstCell = String(sheet.getRow(r).getCell(1).value || "").trim();
      const secondCell = String(sheet.getRow(r).getCell(2).value || "").trim();
      if (firstCell === "Kategori" || firstCell === "Opsional" || secondCell.startsWith("Mohon") || secondCell.startsWith("Pilih")) {
        dataStartRow = r + 1;
      }
    }

    // Kosongkan sisa baris contoh lama jika ada
    for (let r = dataStartRow; r <= sheet.rowCount; r++) {
      sheet.getRow(r).values = [];
    }

    const generatedRows = buildProductRowsForKeys(items, headerKeys);
    generatedRows.forEach((rowVals, idx) => {
      const targetRow = sheet.getRow(dataStartRow + idx);
      rowVals.forEach((val, cIdx) => {
        targetRow.getCell(cIdx + 1).value = val === "" ? null : val;
      });
      targetRow.commit();
    });

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }

  // Build built-in Shopee Mass Upload .xlsx structure matching Seller Centre schema
  wb.creator = "Akshara Gaming Center";
  wb.created = new Date();

  const sheet = wb.addWorksheet("Template", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  sheet.addRow(SHOPEE_INTERNAL_KEYS);
  sheet.addRow(SHOPEE_METADATA_ROW);
  const humanHeaderRow = sheet.addRow(SHOPEE_HUMAN_HEADERS);
  humanHeaderRow.font = { bold: true, color: { argb: "FF0F172A" } };
  humanHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  sheet.addRow(SHOPEE_REQUIRED_ROW);
  sheet.addRow(
    SHOPEE_HUMAN_HEADERS.map((h) =>
      h === "Kategori"
        ? "Kode kategori Shopee (101090 untuk Game PC)."
        : h === "Nama Produk"
        ? "Judul SEO 5-255 karakter (hanya baris 1 jika bervariasi)."
        : h === "Deskripsi Produk"
        ? "Deskripsi lengkap 20-3000 karakter (bebas link URL)."
        : h === "Harga"
        ? "Harga IDR (99 - 150000000)."
        : h === "Foto Sampul"
        ? "Link gambar HTTPS unik per produk."
        : ""
    )
  );
  sheet.addRow(Array(SHOPEE_INTERNAL_KEYS.length).fill(""));

  const rows = buildProductRowsForKeys(items, SHOPEE_INTERNAL_KEYS);
  for (const r of rows) {
    const added = sheet.addRow(r.map((val) => (val === "" ? null : val)));
    added.alignment = { vertical: "top", wrapText: true };
  }

  // Tidy column widths for easy admin inspection before uploading
  sheet.columns.forEach((col, i) => {
    const key = SHOPEE_INTERNAL_KEYS[i] || "";
    if (key.startsWith("ps_product_name")) col.width = 42;
    else if (key.startsWith("ps_product_description")) col.width = 50;
    else if (key.startsWith("ps_item_")) col.width = 36;
    else if (key.startsWith("ps_sku")) col.width = 22;
    else if (key.startsWith("ps_category") || key.startsWith("ps_price") || key.startsWith("ps_stock")) col.width = 16;
    else col.width = 18;
  });

  // Add Category Reference Sheet matching Seller Centre
  const catSheet = wb.addWorksheet("Kategori");
  catSheet.addRow(["et_title_category_name", "et_title_category_id", "et_title_dts_range", "et_title_remark"]);
  catSheet.addRow(["Nama Kategori", "Kode Kategori", "Jangka Dikirim Dalam Pre-order", "Catatan"]);
  for (const preset of SHOPEE_CATEGORY_PRESETS) {
    catSheet.addRow([preset.label, preset.id, "3 - 30", "100% Pure Digital"]);
  }
  catSheet.getColumn(1).width = 55;
  catSheet.getColumn(2).width = 18;

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

/**
 * Menghasilkan Sheet "Mass Update Harga & Stok" (untuk sinkronisasi cepat ke listing Shopee yang sudah live)
 */
export async function generateShopeeMassUpdateWorkbook(
  items: ShopeeMassProductInput[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Mass_Update_Harga_Stok");
  const header = sheet.addRow([
    "SKU Induk",
    "Kode Variasi",
    "Nama Produk",
    "Harga Jual Shopee (IDR)",
    "Stok Aman Rekomendasi",
    "Status Listing",
  ]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

  for (const item of items) {
    const variants =
      Array.isArray(item.variants) && item.variants.length > 0
        ? item.variants
        : [{ option_name: "", price_idr: item.price_idr, stock: item.stock, sku_variant: item.sku_parent }];
    variants.forEach((v, idx) => {
      sheet.addRow([
        item.sku_parent,
        v.sku_variant || `${item.sku_parent}-V${idx + 1}`,
        item.seo_title || item.title,
        Math.round(Number(v.price_idr) || item.price_idr),
        Math.max(0, Math.round(Number(v.stock) ?? item.stock)),
        "AKTIF",
      ]);
    });
  }

  sheet.columns = [
    { width: 24 },
    { width: 24 },
    { width: 48 },
    { width: 24 },
    { width: 22 },
    { width: 16 },
  ];

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
