// Google Gemini AI Client for Akshara Command Center
// Default Model: gemini-3.5-flash-lite (as requested by user)

export const DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || "gemini-3.5-flash-lite";
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash"];

export async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6JJaaf2otbjX9Ppo22_tDfUsB9_6S6q7uEEnoDJLFPpTw";

  for (const model of FALLBACK_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const body: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
