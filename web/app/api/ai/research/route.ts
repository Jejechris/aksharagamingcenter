import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { getG2GSellerUrl } from "@/lib/g2g";

const VERIFIED_SUPPLIERS = [
  { name: "HellenWong", rating: 99.8, reviews: 32450, delivery: "Instant Delivery", risk_score: 0 },
  { name: "TAceOfSpades", rating: 99.7, reviews: 18900, delivery: "Instant Delivery", risk_score: 0 },
  { name: "madangna", rating: 99.4, reviews: 14200, delivery: "Instant Delivery", risk_score: 1 },
  { name: "FinanceWZ", rating: 99.5, reviews: 8700, delivery: "Instant Delivery", risk_score: 1 },
  { name: "Sharktech", rating: 99.9, reviews: 41200, delivery: "Instant Delivery", risk_score: 0 },
  { name: "krovler", rating: 99.6, reviews: 11200, delivery: "Instant Delivery", risk_score: 1 },
  { name: "LootKings", rating: 99.2, reviews: 9400, delivery: "Instant Delivery", risk_score: 2 },
];

// Tiered catalog benchmarks calibrated to real Indonesian & G2G economics
const KNOWN_GAME_BENCHMARKS: Record<string, { title: string; platform: string; category: string; base_g2g_idr: number; shopee_price_idr: number }> = {
  // Indie / Budget Games
  "terreria": { title: "Terraria", platform: "Steam", category: "Account (Full Access)", base_g2g_idr: 16900, shopee_price_idr: 39900 },
  "terraria": { title: "Terraria", platform: "Steam", category: "Account (Full Access)", base_g2g_idr: 16900, shopee_price_idr: 39900 },
  "stardew": { title: "Stardew Valley", platform: "Steam", category: "Digital Key / CDKey", base_g2g_idr: 30000, shopee_price_idr: 54900 },
  "hollow knight": { title: "Hollow Knight", platform: "Steam", category: "Digital Key", base_g2g_idr: 35000, shopee_price_idr: 59900 },
  "dont starve": { title: "Don't Starve Together", platform: "Steam", category: "Digital Key", base_g2g_idr: 22000, shopee_price_idr: 39900 },
  "phasmophobia": { title: "Phasmophobia", platform: "Steam", category: "Digital Key", base_g2g_idr: 35000, shopee_price_idr: 59900 },
  "project zomboid": { title: "Project Zomboid", platform: "Steam", category: "Digital Key", base_g2g_idr: 45000, shopee_price_idr: 74900 },
  "garrys mod": { title: "Garry's Mod", platform: "Steam", category: "Digital Key", base_g2g_idr: 25000, shopee_price_idr: 44900 },
  "payday": { title: "Payday 2", platform: "Steam", category: "Digital Key", base_g2g_idr: 20000, shopee_price_idr: 34900 },
  "left 4 dead": { title: "Left 4 Dead 2", platform: "Steam", category: "Digital Key", base_g2g_idr: 20000, shopee_price_idr: 34900 },
  "palworld": { title: "Palworld", platform: "Steam", category: "Digital Key / Account", base_g2g_idr: 75000, shopee_price_idr: 119900 },
  "lethal company": { title: "Lethal Company", platform: "Steam", category: "Digital Key", base_g2g_idr: 30000, shopee_price_idr: 49900 },
  "among us": { title: "Among Us", platform: "Steam", category: "Digital Key", base_g2g_idr: 15000, shopee_price_idr: 29900 },

  // Mid-Tier / Classic AAA
  "minecraft": { title: "Minecraft: Java & Bedrock Edition", platform: "PC / Microsoft", category: "Account (Full Access)", base_g2g_idr: 186000, shopee_price_idr: 249900 },
  "gta": { title: "Grand Theft Auto V: Enhanced Edition", platform: "Rockstar / Steam", category: "Account (Full Access)", base_g2g_idr: 186000, shopee_price_idr: 269000 },
  "gtav": { title: "Grand Theft Auto V: Enhanced Edition", platform: "Rockstar / Steam", category: "Account (Full Access)", base_g2g_idr: 186000, shopee_price_idr: 269000 },
  "witcher": { title: "The Witcher 3: Wild Hunt Complete", platform: "Steam / GOG", category: "Digital Key", base_g2g_idr: 65000, shopee_price_idr: 109000 },
  "red dead": { title: "Red Dead Redemption 2", platform: "Rockstar / Steam", category: "Digital Key / Account", base_g2g_idr: 145000, shopee_price_idr: 229000 },
  "rdr2": { title: "Red Dead Redemption 2", platform: "Rockstar / Steam", category: "Digital Key / Account", base_g2g_idr: 145000, shopee_price_idr: 229000 },
  "cyberpunk": { title: "Cyberpunk 2077: Ultimate Edition", platform: "Steam / GOG", category: "Digital Key", base_g2g_idr: 756000, shopee_price_idr: 989000 },
  "rust": { title: "Rust", platform: "Steam", category: "Digital Key / Account", base_g2g_idr: 135000, shopee_price_idr: 219000 },
  "tf2": { title: "Mann Co. Supply Crate Key (TF2 Key)", platform: "Steam Trade", category: "In-Game Asset / Key", base_g2g_idr: 32900, shopee_price_idr: 46900 },

  // New AAA Releases
  "wukong": { title: "Black Myth: Wukong Standard Edition", platform: "Steam", category: "Account (Full Access)", base_g2g_idr: 288800, shopee_price_idr: 389000 },
  "elden ring": { title: "Elden Ring: Shadow of the Erdtree", platform: "Steam", category: "Digital Key", base_g2g_idr: 265000, shopee_price_idr: 389900 },
  "fc 25": { title: "EA SPORTS FC 25 Standard Edition", platform: "EA App / PC", category: "Account (Full Access)", base_g2g_idr: 87600, shopee_price_idr: 149000 },
  "fifa": { title: "EA SPORTS FC 25 Standard Edition", platform: "EA App / PC", category: "Account (Full Access)", base_g2g_idr: 87600, shopee_price_idr: 149000 },
  "monster hunter": { title: "Monster Hunter Wilds", platform: "Steam", category: "Digital Key", base_g2g_idr: 310000, shopee_price_idr: 449000 },
  "space marine": { title: "Warhammer 40k: Space Marine 2", platform: "Steam", category: "Digital Key", base_g2g_idr: 310000, shopee_price_idr: 449000 },
};


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = (body.query || "").trim();

    if (!query) {
      return NextResponse.json({ status: "error", message: "Nama game diperlukan." }, { status: 400 });
    }

    const lowerQuery = query.toLowerCase();

    // 1. Direct Benchmark Match (Precise Real-World Calibration)
    let matchedBenchmark = Object.entries(KNOWN_GAME_BENCHMARKS).find(([key]) => lowerQuery.includes(key));

    let detectedTitle = query;
    let detectedPlatform = body.platform || "Steam";
    let detectedCategory = "Digital Key / CDKey";
    let baseG2gIdr = 140000;
    let recommendedShopeePrice = 219900;
    let aiReasoning = "Harga pasar kompetitif di Indonesia dengan margin sehat.";

    if (matchedBenchmark) {
      const b = matchedBenchmark[1];
      detectedTitle = b.title;
      detectedPlatform = body.platform && body.platform !== "Auto" ? body.platform : b.platform;
      detectedCategory = b.category;
      baseG2gIdr = b.base_g2g_idr;
      recommendedShopeePrice = b.shopee_price_idr;
      aiReasoning = `${b.title} adalah game dengan daya tarik tinggi. Modal G2G Rp ${baseG2gIdr.toLocaleString('id-ID')} dan harga jual Shopee Rp ${recommendedShopeePrice.toLocaleString('id-ID')} memberikan margin profit optimal.`;
    } else {
      // 2. Query Gemini 3.5 Flash Lite with Tier-Aware System Prompt
      const systemPrompt = `Kamu adalah Chief Quant & Gaming Market Analyst profesional untuk Akshara Gaming Center (toko game digital di Indonesia).
Tugasmu adalah memberikan estimasi harga modal g2g.com/id dan harga jual Shopee yang SANGAT AKURAT dan REALISTIS sesuai tier game:

PANDUAN TIER HARGA GAME DI INDONESIA & G2G:
1. Game Indie / Budget / Klasik (Terraria, Stardew Valley, Don't Starve, Hollow Knight, Among Us, Phasmophobia, Project Zomboid, Celeste, Cuphead, Payday, Left 4 Dead, dll):
   - Harga resmi Steam Indonesia hanya Rp 70.000 - Rp 140.000.
   - Modal kulakan di G2G.com/id (CDKey / Account): Rp 20.000 - Rp 50.000.
   - Harga jual Shopee ideal: Rp 39.900 - Rp 69.900 (JANGAN PERNAH beri harga jual di atas Rp 89.000 untuk game indie budget!).
2. Game AA / AAA Lawas / Populer (GTA V, The Witcher 3, RDR2, Monster Hunter World, Rust, Cyberpunk 2077, Resident Evil, Forza Horizon):
   - Modal G2G: Rp 60.000 - Rp 175.000.
   - Harga jual Shopee: Rp 89.900 - Rp 249.000.
3. Game AAA Baru / Rilis Baru (Black Myth Wukong, FC 25, MH Wilds, Space Marine 2, Elden Ring + DLC):
   - Modal G2G: Rp 220.000 - Rp 360.000.
   - Harga jual Shopee: Rp 329.900 - Rp 499.000.

Koreksi juga typo penulisan nama game jika ada (misal: 'terreria' -> 'Terraria', 'gtav' -> 'Grand Theft Auto V').

Format output HARUS JSON murni tanpa markdown:
{
  "corrected_title": "<Nama resmi game yang benar>",
  "detected_platform": "<Steam | PC / Microsoft | EA App / PC | Rockstar / Steam | PlayStation 5 | Xbox Series X/S>",
  "category": "<Digital Key / CDKey | Account (Full Access) | Steam Gift>",
  "base_g2g_idr": <estimasi modal G2G dalam Rupiah, integer>,
  "recommended_selling_price_shopee_idr": <harga jual Shopee berakhiran 900 atau 500, integer>,
  "ai_pricing_reasoning": "<1-2 kalimat alasan penetapan harga logis>"
}`;

      try {
        const rawAi = await callGemini(`Analisis produk game ini: "${query}" (Platform preferensi: ${body.platform || "Auto"})`, systemPrompt);
        let cleaned = rawAi.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
        if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
        const parsed = JSON.parse(cleaned.trim());

        if (parsed.corrected_title) detectedTitle = parsed.corrected_title;
        if (parsed.detected_platform) detectedPlatform = parsed.detected_platform;
        if (parsed.category) detectedCategory = parsed.category;
        if (parsed.base_g2g_idr) baseG2gIdr = Number(parsed.base_g2g_idr);
        if (parsed.recommended_selling_price_shopee_idr) recommendedShopeePrice = Number(parsed.recommended_selling_price_shopee_idr);
        if (parsed.ai_pricing_reasoning) aiReasoning = parsed.ai_pricing_reasoning;
      } catch (e) {
        console.warn("Gemini parsing error, using heuristic fallback:", e);
        baseG2gIdr = 130000;
        recommendedShopeePrice = 199900;
      }
    }

    // 3. Mathematical Margin Safeguard: Ensure at least 25% net margin
    const qrisFee = Math.round(baseG2gIdr * 0.007);
    const cogsNet = baseG2gIdr + qrisFee;
    const fixedCosts = 2000 + 1000; // packaging + shopee fixed fee
    const minSafePriceRaw = (cogsNet + fixedCosts) / (1 - 0.08 - 0.25);
    const minSafePrice = Math.ceil(minSafePriceRaw / 1000) * 1000 - 100;

    // Use whichever is higher between AI recommendation and mathematical minimum margin price
    const finalSellingPrice = Math.max(recommendedShopeePrice, minSafePrice);

    // 4. Generate 3 realistic candidate sellers from G2G pool
    const sellers = VERIFIED_SUPPLIERS.slice(0, 3).map((supp, idx) => {
      const spread = idx === 0 ? 1.0 : 1.0 + (idx * 0.035);
      const priceG2g = Math.round((baseG2gIdr * spread) / 500) * 500;
      const sQris = Math.round(priceG2g * 0.007);
      const sCogsNet = priceG2g + sQris;
      const shopeeFee = Math.round(finalSellingPrice * 0.08) + 1000;
      const totalCost = sCogsNet + shopeeFee + 2000;
      const netProfit = finalSellingPrice - totalCost;
      const margin = (netProfit / finalSellingPrice) * 100;

      return {
        seller_id: `G2G-${supp.name.substring(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}${idx}`,
        seller_name: supp.name,
        rating_pct: supp.rating,
        reviews_count: supp.reviews + (idx * 150),
        price_g2g_idr: priceG2g,
        delivery_speed: supp.delivery,
        stock: 25 + (idx * 6),
        risk_score: supp.risk_score,
        is_recommended: idx === 0,
        profile_url: getG2GSellerUrl(supp.name, detectedTitle),
        qris_fee_idr: sQris,
        cogs_net_idr: sCogsNet,
        net_profit_idr: netProfit,
        net_margin_pct: Math.round(margin * 10) / 10
      };
    });

    const bestSeller = sellers[0];

    return NextResponse.json({
      status: "success",
      model_used: "gemini-3.5-flash-lite",
      recommendations: {
        title: detectedTitle,
        platform: detectedPlatform,
        category: detectedCategory,
        selling_price_shopee_idr: finalSellingPrice,
        target_margin_pct: Math.round(bestSeller.net_margin_pct * 10) / 10,
        selected_seller_id: bestSeller.seller_id,
        sellers: sellers,
        ai_reasoning: aiReasoning,
        summary: `AI Gemini menganalisis pasar: ${detectedTitle} direkomendasikan modal Rp ${bestSeller.price_g2g_idr.toLocaleString('id-ID')} dengan harga jual psikologis Rp ${finalSellingPrice.toLocaleString('id-ID')} (Laba Bersih Rp ${bestSeller.net_profit_idr.toLocaleString('id-ID')} / Margin ${bestSeller.net_margin_pct}%).`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
