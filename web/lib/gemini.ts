// Google Gemini AI Client for Akshara Command Center
// Valid, fast production models with optional strict JSON output mode
import { ensureRootEnvLoaded } from "@/lib/envLoader";

export const DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];

export interface CallGeminiOptions {
  jsonMode?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  options?: CallGeminiOptions
): Promise<string> {
  ensureRootEnvLoaded();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di environment variables.");
  }

  const generationConfig: Record<string, any> = {
    temperature: options?.temperature ?? 0.3,
    maxOutputTokens: options?.maxOutputTokens ?? 1024,
  };

  if (options?.jsonMode === true) {
    generationConfig.responseMimeType = "application/json";
  }

  for (const model of FALLBACK_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        console.warn(`Gemini model ${model} failed with ${res.status}:`, errText);
      }
    } catch (e) {
      console.error(`Error calling Gemini with ${model}:`, e);
    }
  }

  throw new Error("Semua model Gemini gagal merespon atau kuota habis.");
}
