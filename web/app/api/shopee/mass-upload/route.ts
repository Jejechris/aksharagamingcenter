import { NextRequest, NextResponse } from "next/server";
import { readAuthoritativeCatalog, calculateItemMetrics } from "@/lib/catalog";
import {
  buildPureDigitalListingCopy,
  generateShopeeMassUpdateWorkbook,
  generateShopeeMassUploadWorkbook,
  inferShopeeCategoryId,
  ShopeeMassProductInput,
  validateMassUploadItems,
} from "@/lib/shopeeMassUpload";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function computeSafeShopeeStock(game: any): number {
  const sellers = Array.isArray(game.sellers) ? game.sellers : [];
  const selected =
    sellers.find((s: any) => s.seller_id === game.selected_seller_id) || sellers[0];
  const rawStock = Number(selected?.stock ?? 0);
  if (!Number.isFinite(rawStock) || rawStock <= 0) return 0;
  return Math.max(1, Math.min(25, Math.floor(rawStock * 0.7)));
}

export async function GET() {
  try {
    const raw = await readAuthoritativeCatalog();
    const enriched = raw.map(calculateItemMetrics);

    const mappedRows: ShopeeMassProductInput[] = enriched.map((g: any) => {
      const { seoTitle, description } = buildPureDigitalListingCopy({
        title: g.title,
        platform: g.platform || "PC / Steam",
        category: g.category,
        warrantyDays: 30,
      });

      const safeStock = computeSafeShopeeStock(g);
      return {
        id: g.id,
        title: g.title,
        platform: g.platform || "Steam",
        category_type: g.category || "Digital License",
        shopee_category_id: inferShopeeCategoryId(g.title, g.platform || "", g.category),
        seo_title: seoTitle,
        description,
        price_idr: g.selling_price_shopee_idr || 99000,
        stock: safeStock > 0 ? safeStock : 10,
        sku_parent: g.id,
        cover_image_url: "",
        image_1_url: "",
        weight_grams: 1,
        shipping_active: true,
        pre_order_days: "",
      };
    });

    return NextResponse.json(
      {
        status: "success",
        count: mappedRows.length,
        data: mappedRows,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Gagal menyiapkan data Mass Upload." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: ShopeeMassProductInput[] = Array.isArray(body.items) ? body.items : [];
    const mode = body.mode === "mass_update" ? "mass_update" : "mass_upload";
    const action = body.action === "validate" ? "validate" : "export";

    if (items.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Pilih minimal 1 produk untuk di-export." },
        { status: 400 }
      );
    }

    const issues = validateMassUploadItems(items);
    if (action === "validate") {
      return NextResponse.json({
        status: "success",
        valid: !issues.some((i) => i.severity === "error"),
        issues,
      });
    }

    const errors = issues.filter((i) => i.severity === "error");
    if (errors.length > 0 && !body.ignoreWarnings) {
      return NextResponse.json(
        {
          status: "error",
          message: `Ada ${errors.length} validasi Shopee yang perlu diperbaiki terlebih dahulu (${errors[0].title}: ${errors[0].message}).`,
          issues,
        },
        { status: 400 }
      );
    }

    const buffer =
      mode === "mass_update"
        ? await generateShopeeMassUpdateWorkbook(items)
        : await generateShopeeMassUploadWorkbook(items, {
            customTemplateBase64: body.customTemplateBase64,
          });

    const dateTag = new Date().toISOString().slice(0, 10);
    const filename =
      mode === "mass_update"
        ? `shopee-mass-update-${dateTag}.xlsx`
        : `shopee-mass-upload-${dateTag}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Gagal menghasilkan file Excel Mass Upload." },
      { status: 500 }
    );
  }
}
