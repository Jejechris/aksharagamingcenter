import { NextRequest, NextResponse } from "next/server";
import { processAutoFulfillment, AutoFulfillRequest } from "@/lib/autoFulfill";

export async function POST(req: NextRequest) {
  try {
    const body: AutoFulfillRequest = await req.json();

    if (!body.order_id || !body.game_title || !body.buyer_username) {
      return NextResponse.json(
        { status: "error", message: "order_id, game_title, dan buyer_username wajib diisi." },
        { status: 400 }
      );
    }

    const result = await processAutoFulfillment(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Auto-Fulfill API Error]", err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
