import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { claim_text, has_uncut_video, order_id } = body;

    if (!claim_text) {
      return NextResponse.json({ status: "error", message: "Isi komplain pembeli diperlukan." }, { status: 400 });
    }

    const systemPrompt = `Kamu adalah Sistem AI Triage Garansi Otomatis untuk Akshara Gaming Center.
SOP Garansi Ketat Akshara:
1. Wajib ada rekaman video unboxing no-cut dari amplop masih tersegel utuh. Jika video tidak ada atau terpotong/diedit, klaim WAJIB DITOLAK (REJECTED_NO_UNCUT_VIDEO).
2. Kartu fisik garansi A6 beserta serial number harus tampak jelas di video.
3. Produk digital yang sudah diaktivasi tidak dapat di-refund karena alasan berubah pikiran (REJECTED_BUYER_REMORSE).
4. Jika video no-cut valid dan masalah terkonfirmasi (misal email lock), setujui penggantian akun (APPROVED_FOR_REPLACEMENT).

Format output HARUS JSON murni tanpa markdown:
{
  "decision": "<APPROVED_FOR_REPLACEMENT | REJECTED_NO_UNCUT_VIDEO | REJECTED_INSUFFICIENT_EVIDENCE | REJECTED_BUYER_REMORSE>",
  "reason": "<penjelasan singkat keputusan berdasarkan SOP>",
  "risk_level": "<LOW | MEDIUM | HIGH>",
  "auto_chat_reply": "<draf pesan sopan, jelas, dan tegas untuk dikirimkan ke chat Shopee pembeli>"
}`;

    const prompt = `Data Komplain Masuk:
- No. Pesanan: ${order_id || "#240916MC99211A"}
- Ada Video Unboxing No-Cut: ${has_uncut_video ? "YA, VIDEO VALID NO-CUT" : "TIDAK ADA / VIDEO TERPOTONG"}
- Komplain Pembeli: "${claim_text}"`;

    try {
      const raw = await callGemini(prompt, systemPrompt);
      let cleaned = raw.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      const parsed = JSON.parse(cleaned.trim());

      return NextResponse.json({
        status: "success",
        model: "gemini-3.5-flash-lite",
        data: parsed
      });
    } catch (aiErr) {
      console.warn("Gemini triage fallback:", aiErr);
      const decision = !has_uncut_video ? "REJECTED_NO_UNCUT_VIDEO" : "APPROVED_FOR_REPLACEMENT";
      const reason = !has_uncut_video
        ? "SOP Garansi Akshara mewajibkan video unboxing amplop fisik no-cut untuk validasi klaim."
        : "Video unboxing terverifikasi valid, disetujui untuk penanganan penggantian akun.";
      const riskLevel = !has_uncut_video ? "HIGH" : "LOW";
      const autoReply = !has_uncut_video
        ? "Halo Kak, mohon maaf sesuai SOP resmi toko yang tertera pada deskripsi produk dan amplop bersegel, setiap klaim kendala akun wajib melampirkan rekaman video unboxing amplop fisik tanpa jeda (no-cut). Mohon kirimkan video tersebut untuk kami proses lebih lanjut ya Kak."
        : "Halo Kak, terima kasih sudah melampirkan video unboxing valid sesuai SOP. Kami mohon maaf atas ketidaknyamanannya, tim support kami sedang menyiapkan kredensial akun pengganti baru untuk Anda dalam 5-15 menit.";

      return NextResponse.json({
        status: "success",
        model: "rule-engine-fallback",
        data: {
          decision,
          reason,
          risk_level: riskLevel,
          auto_chat_reply: autoReply
        }
      });
    }
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
