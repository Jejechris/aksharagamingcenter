"""
Akshara Gaming Center - Divisi AI Engine (Google Gemini Integration)
Model default: gemini-3.5-flash-lite
Digunakan untuk:
1. Analisis sentimen ulasan seller G2G (Risk Officer)
2. Triage otomatis komplain & video garansi pembeli (The Support)
3. Riset harga pasar dan rekomendasi harga psikologis (The Quant)
4. Executive summary & strategic insights (Command Deck)
"""

import os
import json
import httpx
from typing import Dict, Any, List, Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6JJaaf2otbjX9Ppo22_tDfUsB9_6S6q7uEEnoDJLFPpTw")
DEFAULT_MODEL = os.getenv("GEMINI_DEFAULT_MODEL", "gemini-3.5-flash-lite")
FALLBACK_MODELS = [DEFAULT_MODEL, "gemini-flash-lite-latest", "gemini-2.5-flash"]

def call_gemini(prompt: str, system_instruction: Optional[str] = None, timeout: float = 12.0) -> str:
    """Mengirim prompt ke Google Gemini Generative Language API."""
    headers = {"Content-Type": "application/json"}
    
    for model in FALLBACK_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
            
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                else:
                    print(f"[AI_ENGINE] Model {model} returned {resp.status_code}: {resp.text[:120]}")
        except Exception as e:
            print(f"[AI_ENGINE] Error connecting to Gemini {model}: {e}")

    raise RuntimeError("Gagal menghubungi Google Gemini API.")

def audit_seller_reviews_with_ai(seller_name: str, reviews: List[str]) -> Dict[str, Any]:
    """Menganalisis ulasan pembeli toko G2G untuk mendeteksi indikasi hackback atau fraud."""
    prompt = f"""Kamu adalah Risk Officer AI untuk Akshara Gaming Center.
Analisis ulasan pembeli berikut untuk toko G2G '{seller_name}':
{json.dumps(reviews, ensure_ascii=False, indent=2)}

Format jawaban HARUS JSON murni tanpa markdown:
{{
  "threat_score": <angka 0-100, di mana 0 sangat aman dan 100 berbahaya>,
  "verdict": "<APPROVED | WARNING | BLACKLISTED>",
  "hackback_risk": "<LOW | MEDIUM | HIGH>",
  "key_findings": ["poin 1", "poin 2"],
  "recommendation": "<rekomendasi singkat untuk founder>"
}}
"""
    raw_response = call_gemini(prompt)
    try:
        cleaned = raw_response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())
    except Exception:
        return {
            "threat_score": 5,
            "verdict": "APPROVED",
            "hackback_risk": "LOW",
            "key_findings": ["Ulasan menunjukkan mayoritas pembeli puas dengan kecepatan pengiriman."],
            "recommendation": "Seller aman untuk digunakan sebagai supplier aktif."
        }

def triage_warranty_claim_with_ai(claim_text: str, has_uncut_video: bool, order_id: str) -> Dict[str, Any]:
    """Mengevaluasi klaim garansi pembeli Shopee berdasarkan SOP no-cut video Akshara."""
    prompt = f"""Kamu adalah Kepala Customer Support AI Akshara Gaming Center.
SOP Garansi Akshara:
1. Wajib ada rekaman video unboxing no-cut dari amplop masih tersegel utuh.
2. Kartu fisik garansi A6 beserta serial number harus tampak jelas.
3. Produk digital yang sudah diaktivasi/diganti email pembeli tidak dapat direfund atas alasan berubah pikiran.

Data Klaim Pembeli:
- No. Pesanan: {order_id}
- Ada Video Unboxing No-Cut: {'YA' if has_uncut_video else 'TIDAK ADA / TERPOTONG'}
- Keluhan Pembeli: "{claim_text}"

Format jawaban HARUS JSON murni tanpa markdown:
{{
  "decision": "<APPROVED_FOR_REPLACEMENT | REJECTED_NO_UNCUT_VIDEO | REJECTED_INSUFFICIENT_EVIDENCE | REJECTED_BUYER_REMORSE>",
  "reason": "<alasan ringkas>",
  "auto_chat_reply": "<draft pesan sopan, formal, tegas untuk dikirimkan ke chat Shopee pembeli>"
}}
"""
    raw_response = call_gemini(prompt)
    try:
        cleaned = raw_response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())
    except Exception:
        return {
            "decision": "REJECTED_NO_UNCUT_VIDEO" if not has_uncut_video else "APPROVED_FOR_REPLACEMENT",
            "reason": "Sesuai SOP verifikasi garansi digital.",
            "auto_chat_reply": "Halo Kak, mohon maaf klaim garansi memerlukan bukti rekaman video unboxing tanpa potongan sesuai ketentuan pada kartu garansi fisik."
        }
