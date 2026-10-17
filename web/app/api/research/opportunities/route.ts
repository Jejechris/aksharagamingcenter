import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { getG2GSellerUrl, resolveG2GProductUrl } from "@/lib/g2g";
import { getDbCatalog } from "@/lib/db";

export interface ArbitrageOpportunity {
  id: string;
  title: string;
  platform: string;
  category: string;
  tag: "🔥 HIGH MARGIN" | "💎 BLUECHIP POPULAR" | "⚡ FAST MOVER" | "🚀 VIRAL TREND";
  g2g_price_idr: number;
  best_supplier: {
    name: string;
    rating_pct: number;
    reviews_count: number;
    tier: string;
  };
  shopee_retail_price_idr: number;
  steam_indo_price_idr?: number;
  qris_fee_idr: number;
  shopee_fee_idr: number;
  net_profit_idr: number;
  net_margin_pct: number;
  spread_pct: number;
  demand_score: number; // 1 - 100
  competition_level: "Rendah" | "Sedang" | "Kompetitif";
  arbitrage_reason: string;
  tactical_tip: string;
  profile_url: string;
  shopee_search_query: string;
}

// Curated high-spread arbitrage opportunities calibrated to real G2G vs Shopee dynamics
const CURATED_ARBITRAGE_OPPORTUNITIES: ArbitrageOpportunity[] = [
  {
    id: "arb-terraria",
    title: "Terraria",
    platform: "Steam",
    category: "Account (Full Access)",
    tag: "🔥 HIGH MARGIN",
    g2g_price_idr: 16900,
    best_supplier: {
      name: "FinanceWZ",
      rating_pct: 99.5,
      reviews_count: 8700,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 49900,
    steam_indo_price_idr: 89999,
    qris_fee_idr: 118,
    shopee_fee_idr: 4992,
    net_profit_idr: 25890,
    net_margin_pct: 51.9,
    spread_pct: 195.3,
    demand_score: 94,
    competition_level: "Sedang",
    arbitrage_reason: "Modal G2G akun fresh sangat murah (Rp 16.900). Di Shopee laku keras di kisaran Rp 49.900 untuk mabar pelajar yang tidak punya kartu kredit/Steam Wallet.",
    tactical_tip: "Jual paket 'Siap Main + Panduan Multiplayer Co-op'. Margin bersih di atas 50% dengan repeat order tinggi.",
    profile_url: "https://www.g2g.com/categories/steam-accounts",
    shopee_search_query: "Terraria Steam Original",
  },
  {
    id: "arb-project-zomboid",
    title: "Project Zomboid",
    platform: "Steam",
    category: "Digital Key / CDKey",
    tag: "⚡ FAST MOVER",
    g2g_price_idr: 45000,
    best_supplier: {
      name: "Sharktech",
      rating_pct: 99.9,
      reviews_count: 41200,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 94900,
    steam_indo_price_idr: 139999,
    qris_fee_idr: 315,
    shopee_fee_idr: 8592,
    net_profit_idr: 39993,
    net_margin_pct: 42.1,
    spread_pct: 110.9,
    demand_score: 92,
    competition_level: "Sedang",
    arbitrage_reason: "Game survival zombie paling populer di Discord komunitas Indo. Supplier global menjual bundle CDKey regional jauh lebih murah dibanding harga toko resmi.",
    tactical_tip: "Tuliskan 'Garansi Aktif Permanen & Support Modding Workshop'. Pembeli Indonesia rela bayar premium demi jaminan tidak revoke.",
    profile_url: "https://www.g2g.com/categories/project-zomboid",
    shopee_search_query: "Project Zomboid Steam",
  },
  {
    id: "arb-wukong",
    title: "Black Myth: Wukong Standard Edition",
    platform: "Steam",
    category: "Account (Full Access)",
    tag: "💎 BLUECHIP POPULAR",
    g2g_price_idr: 288800,
    best_supplier: {
      name: "HellenWong",
      rating_pct: 99.8,
      reviews_count: 32450,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 399000,
    steam_indo_price_idr: 699000,
    qris_fee_idr: 2022,
    shopee_fee_idr: 32920,
    net_profit_idr: 73258,
    net_margin_pct: 18.4,
    spread_pct: 38.2,
    demand_score: 99,
    competition_level: "Kompetitif",
    arbitrage_reason: "Harga resmi Steam Indo Rp 700.000. Seller G2G menyediakan akun global region-free Rp 288.800. Dijual Rp 399.000 terlihat sangat murah bagi gamer lokal tapi laba Rp 73rb/unit.",
    tactical_tip: "Fokus ke 'Full Email Access + Bisa Ubah Password & Guard'. Cocok untuk target gamer casual berbudget sedang.",
    profile_url: "https://www.g2g.com/categories/black-myth-wukong",
    shopee_search_query: "Black Myth Wukong Steam",
  },
  {
    id: "arb-minecraft",
    title: "Minecraft: Java & Bedrock Edition",
    platform: "PC / Microsoft",
    category: "Account (Full Access)",
    tag: "💎 BLUECHIP POPULAR",
    g2g_price_idr: 186000,
    best_supplier: {
      name: "TAceOfSpades",
      rating_pct: 99.7,
      reviews_count: 18900,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 269000,
    steam_indo_price_idr: 410000,
    qris_fee_idr: 1302,
    shopee_fee_idr: 22520,
    net_profit_idr: 57178,
    net_margin_pct: 21.3,
    spread_pct: 44.6,
    demand_score: 97,
    competition_level: "Kompetitif",
    arbitrage_reason: "Produk sepanjang masa (Evergreen). Harga resmi Microsoft Store Rp 410.000. Banyak orang tua dan anak sekolah yang mencari di Shopee karena metode pembayaran transfer/SPayLater.",
    tactical_tip: "Tawarkan garansi ganti unit 30 hari & bonus launcher mod pack gratis. Ini memenangkan persaingan dari seller non-garansi.",
    profile_url: "https://www.g2g.com/categories/minecraft-accounts",
    shopee_search_query: "Minecraft Java Bedrock PC",
  },
  {
    id: "arb-gtav",
    title: "Grand Theft Auto V: Premium Edition",
    platform: "Rockstar / Steam",
    category: "Account (Full Access)",
    tag: "💎 BLUECHIP POPULAR",
    g2g_price_idr: 145000,
    best_supplier: {
      name: "Sharktech",
      rating_pct: 99.9,
      reviews_count: 41200,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 239000,
    steam_indo_price_idr: 401000,
    qris_fee_idr: 1015,
    shopee_fee_idr: 20120,
    net_profit_idr: 70865,
    net_margin_pct: 29.6,
    spread_pct: 64.8,
    demand_score: 96,
    competition_level: "Kompetitif",
    arbitrage_reason: "Game sejuta umat untuk main FiveM / Roleplay. Gamer Indo butuh akun GTA V bersih yang bisa langsung konek FiveM tanpa ribet verifikasi 2FA.",
    tactical_tip: "Pasang judul: 'GTA V Premium FiveM Ready + Bonus Cash Online'. Untung bersih Rp 70.000 per transaksi.",
    profile_url: "https://www.g2g.com/categories/gta-5-accounts",
    shopee_search_query: "GTA V FiveM Ready PC",
  },
  {
    id: "arb-stardew",
    title: "Stardew Valley",
    platform: "Steam",
    category: "Digital Key / CDKey",
    tag: "🔥 HIGH MARGIN",
    g2g_price_idr: 30000,
    best_supplier: {
      name: "krovler",
      rating_pct: 99.6,
      reviews_count: 11200,
      tier: "mid_level",
    },
    shopee_retail_price_idr: 69900,
    steam_indo_price_idr: 115999,
    qris_fee_idr: 210,
    shopee_fee_idr: 6592,
    net_profit_idr: 31098,
    net_margin_pct: 44.5,
    spread_pct: 133.0,
    demand_score: 90,
    competition_level: "Rendah",
    arbitrage_reason: "Update 1.6 membuat peminat Stardew Valley melonjak drastis, terutama gamer perempuan dan casual. Global CDKey G2G cuma Rp 30rb.",
    tactical_tip: "Desain thumbnail bergaya pastel & estetik di Thumbnail Studio. Pembeli Stardew sangat sensitif terhadap kerapian visual toko.",
    profile_url: "https://www.g2g.com/categories/stardew-valley",
    shopee_search_query: "Stardew Valley Steam Original",
  },
  {
    id: "arb-lethal-company",
    title: "Lethal Company",
    platform: "Steam",
    category: "Digital Key",
    tag: "🚀 VIRAL TREND",
    g2g_price_idr: 30000,
    best_supplier: {
      name: "FinanceWZ",
      rating_pct: 99.5,
      reviews_count: 8700,
      tier: "mid_level",
    },
    shopee_retail_price_idr: 64900,
    steam_indo_price_idr: 90999,
    qris_fee_idr: 210,
    shopee_fee_idr: 6192,
    net_profit_idr: 26498,
    net_margin_pct: 40.8,
    spread_pct: 116.3,
    demand_score: 88,
    competition_level: "Rendah",
    arbitrage_reason: "Game wajib mabar Discord. Seringkali 1 pembeli membeli 4 key sekaligus untuk teman-temannya (borongan).",
    tactical_tip: "Buat variasi 'Paket Mabar 4 Akun/Key' dengan sedikit diskon untuk memicu checkout dalam jumlah banyak.",
    profile_url: "https://www.g2g.com/categories/lethal-company",
    shopee_search_query: "Lethal Company Steam",
  },
  {
    id: "arb-rdr2",
    title: "Red Dead Redemption 2",
    platform: "Rockstar / Steam",
    category: "Account (Full Access)",
    tag: "💎 BLUECHIP POPULAR",
    g2g_price_idr: 145000,
    best_supplier: {
      name: "Sharktech",
      rating_pct: 99.9,
      reviews_count: 41200,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 239000,
    steam_indo_price_idr: 640000,
    qris_fee_idr: 1015,
    shopee_fee_idr: 20120,
    net_profit_idr: 70865,
    net_margin_pct: 29.6,
    spread_pct: 64.8,
    demand_score: 93,
    competition_level: "Sedang",
    arbitrage_reason: "Grafis spektakuler dan alur cerita masterpiece. Gamer PC Indonesia yang baru beli VGA selalu mengincar game ini sebagai benchmark.",
    tactical_tip: "Sediakan link download alternatif (Gdrive/Torrent) untuk mempermudah buyer yang koneksi internetnya lambat.",
    profile_url: "https://www.g2g.com/categories/red-dead-redemption-2",
    shopee_search_query: "Red Dead Redemption 2 PC Original",
  },
  {
    id: "arb-fc25",
    title: "EA SPORTS FC 25 Standard Edition",
    platform: "EA App / PC",
    category: "Account (Full Access)",
    tag: "⚡ FAST MOVER",
    g2g_price_idr: 87600,
    best_supplier: {
      name: "HellenWong",
      rating_pct: 99.8,
      reviews_count: 32450,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 159000,
    steam_indo_price_idr: 759000,
    qris_fee_idr: 613,
    shopee_fee_idr: 13720,
    net_profit_idr: 55067,
    net_margin_pct: 34.6,
    spread_pct: 81.5,
    demand_score: 95,
    competition_level: "Sedang",
    arbitrage_reason: "Pecinta bola di Indonesia sangat masif. Harga resmi EA Rp 759rb sangat memberatkan, sehingga akun offline/full access seharga Rp 159rb sangat diminati rental & pemain karir.",
    tactical_tip: "Jual dengan variasi 'Mode Karir Offline' dan 'Ultimate Team Online' agar buyer bisa memilih sesuai kebutuhan budget.",
    profile_url: "https://www.g2g.com/categories/ea-sports-fc-25",
    shopee_search_query: "FC 25 PC Original EA",
  },
  {
    id: "arb-rust",
    title: "Rust",
    platform: "Steam",
    category: "Account (Full Access)",
    tag: "⚡ FAST MOVER",
    g2g_price_idr: 135000,
    best_supplier: {
      name: "madangna",
      rating_pct: 99.4,
      reviews_count: 14200,
      tier: "mid_level",
    },
    shopee_retail_price_idr: 229000,
    steam_indo_price_idr: 349999,
    qris_fee_idr: 945,
    shopee_fee_idr: 19320,
    net_profit_idr: 71735,
    net_margin_pct: 31.3,
    spread_pct: 69.6,
    demand_score: 89,
    competition_level: "Rendah",
    arbitrage_reason: "Komunitas klan survival Indo di Rust sangat loyal dan rela membayar untuk akun alt (smurf/pvp clan).",
    tactical_tip: "Cantumkan 'Akun Bersih 0 Jam / Jam Rendah, Anti-HWID Ban'. Laba bersih lebih dari Rp 70.000 per akun.",
    profile_url: "https://www.g2g.com/categories/rust-accounts",
    shopee_search_query: "Rust Steam PC Original",
  },
  {
    id: "arb-elden-ring",
    title: "Elden Ring: Shadow of the Erdtree Edition",
    platform: "Steam",
    category: "Digital Key / Account",
    tag: "💎 BLUECHIP POPULAR",
    g2g_price_idr: 265000,
    best_supplier: {
      name: "TAceOfSpades",
      rating_pct: 99.7,
      reviews_count: 18900,
      tier: "ultra_safe",
    },
    shopee_retail_price_idr: 399000,
    steam_indo_price_idr: 799000,
    qris_fee_idr: 1855,
    shopee_fee_idr: 32920,
    net_profit_idr: 97225,
    net_margin_pct: 24.4,
    spread_pct: 50.6,
    demand_score: 96,
    competition_level: "Sedang",
    arbitrage_reason: "Bundle base game + DLC ekspansi raksasa. Gamer Indo yang baru mau main Soulsborne ingin paket komplit dengan harga miring.",
    tactical_tip: "Sediakan bonus 'Safe Save File / Starter Build Guide'. Untung bersih mendekati Rp 100.000 per transaksi.",
    profile_url: "https://www.g2g.com/categories/elden-ring",
    shopee_search_query: "Elden Ring Shadow of Erdtree Steam",
  },
  {
    id: "arb-phasmophobia",
    title: "Phasmophobia",
    platform: "Steam",
    category: "Digital Key",
    tag: "🔥 HIGH MARGIN",
    g2g_price_idr: 35000,
    best_supplier: {
      name: "FinanceWZ",
      rating_pct: 99.5,
      reviews_count: 8700,
      tier: "mid_level",
    },
    shopee_retail_price_idr: 74900,
    steam_indo_price_idr: 110999,
    qris_fee_idr: 245,
    shopee_fee_idr: 6992,
    net_profit_idr: 30663,
    net_margin_pct: 40.9,
    spread_pct: 114.0,
    demand_score: 87,
    competition_level: "Rendah",
    arbitrage_reason: "Game horor co-op favorit streamer Indonesia. Banyak penonton yang ikut beli setelah melihat konten YouTube Windah / streamer lokal.",
    tactical_tip: "Cocok dipromosikan menjelang akhir pekan (Jumat-Minggu) saat traffic mabar melonjak 300%.",
    profile_url: "https://www.g2g.com/categories/phasmophobia",
    shopee_search_query: "Phasmophobia Steam Original",
  },
];

export async function GET() {
  try {
    // Check which games are already inside user's portfolio
    const dbCatalog = await getDbCatalog();
    const existingTitles = new Set(
      (dbCatalog || []).map((g: any) => g.title.toLowerCase().trim())
    );

    const enriched = CURATED_ARBITRAGE_OPPORTUNITIES.map((opp) => {
      const isAlreadyInCatalog = Array.from(existingTitles).some((t) =>
        t.includes(opp.title.toLowerCase().trim()) || opp.title.toLowerCase().trim().includes(t)
      );

      return {
        ...opp,
        profile_url: resolveG2GProductUrl(opp.profile_url, opp.best_supplier?.name, opp.title),
        is_already_in_catalog: isAlreadyInCatalog,
      };
    });

    return NextResponse.json({
      status: "success",
      count: enriched.length,
      data: enriched,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

// POST: Run deep AI Arbitrage Scan for ANY specific query or genre
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = (body.query || "").trim();
    const platform = body.platform || "Steam";

    if (!query) {
      return NextResponse.json({ status: "error", message: "Masukkan nama game atau tema yang ingin di-scan." }, { status: 400 });
    }

    const systemPrompt = `Kamu adalah Chief Arbitrage Hunter & Quantitative Market Researcher untuk Akshara Gaming Center di Indonesia.
Tugasmu adalah menganalisis peluang arbitrase lintas batas (Cross-Border Arbitrage) antara supplier global (G2G.com) dan pasar e-commerce retail Indonesia (Shopee/Tokopedia).

ATURAN PERHITUNGAN:
- Biaya Shopee: 8% dari harga jual + Rp 1.000
- Biaya QRIS kulakan G2G: 0.7% dari harga modal G2G
- Net Profit = Harga Jual Shopee - (Harga Modal G2G + Biaya QRIS + Biaya Shopee + Packaging Rp 2.000)
- Net Margin = (Net Profit / Harga Jual Shopee) * 100%
- Spread = ((Harga Jual Shopee - Modal G2G) / Modal G2G) * 100%

Format JSON yang HARUS kamu kembalikan (HANYA JSON murni tanpa markdown triple backticks):
{
  "title": "Nama Game Lengkap",
  "platform": "Steam / PC / dll",
  "category": "Digital Key / Account (Full Access)",
  "tag": "🔥 HIGH MARGIN" / "💎 BLUECHIP POPULAR" / "⚡ FAST MOVER" / "🚀 VIRAL TREND",
  "g2g_price_idr": 150000,
  "best_supplier": {
    "name": "Sharktech",
    "rating_pct": 99.8,
    "reviews_count": 32000,
    "tier": "ultra_safe"
  },
  "shopee_retail_price_idr": 249000,
  "steam_indo_price_idr": 450000,
  "demand_score": 92,
  "competition_level": "Rendah" / "Sedang" / "Kompetitif",
  "arbitrage_reason": "Penjelasan mengapa game ini murah di global tapi bisa dijual mahal di Shopee Indonesia (min 2 kalimat).",
  "tactical_tip": "Tips praktis menjual di Shopee agar margin maksimal dan bebas komplain (1-2 kalimat)."
}`;

    const prompt = `Analisa peluang arbitrase untuk game: "${query}" pada platform "${platform}". Berikan data estimasi real-world yang paling akurat untuk pasar Indonesia saat ini.`;

    const aiText = await callGemini(prompt, systemPrompt);

    let cleaned = (aiText || "").trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      const g2gPrice = Number(parsed.g2g_price_idr) || 120000;
      const shopeePrice = Number(parsed.shopee_retail_price_idr) || 199000;
      const qrisFee = Math.round(g2gPrice * 0.007);
      const shopeeFee = Math.round(shopeePrice * 0.08) + 1000;
      const netProfit = shopeePrice - (g2gPrice + qrisFee + shopeeFee + 2000);
      const netMargin = Math.round((netProfit / shopeePrice) * 1000) / 10;
      const spread = Math.round(((shopeePrice - g2gPrice) / g2gPrice) * 1000) / 10;

      const opportunity: ArbitrageOpportunity = {
        id: `arb-ai-${Date.now()}`,
        title: parsed.title || query,
        platform: parsed.platform || platform,
        category: parsed.category || "Digital Key / Account",
        tag: parsed.tag || "⚡ FAST MOVER",
        g2g_price_idr: g2gPrice,
        best_supplier: {
          name: parsed.best_supplier?.name || "HellenWong",
          rating_pct: Number(parsed.best_supplier?.rating_pct) || 99.7,
          reviews_count: Number(parsed.best_supplier?.reviews_count) || 25000,
          tier: parsed.best_supplier?.tier || "ultra_safe",
        },
        shopee_retail_price_idr: shopeePrice,
        steam_indo_price_idr: Number(parsed.steam_indo_price_idr) || Math.round(shopeePrice * 1.5),
        qris_fee_idr: qrisFee,
        shopee_fee_idr: shopeeFee,
        net_profit_idr: netProfit,
        net_margin_pct: netMargin,
        spread_pct: spread,
        demand_score: Number(parsed.demand_score) || 88,
        competition_level: parsed.competition_level || "Sedang",
        arbitrage_reason: parsed.arbitrage_reason || "Potensi arbitrase signifikan antara rate global dan pasar retail lokal.",
        tactical_tip: parsed.tactical_tip || "Gunakan format pengiriman instan dan cantumkan garansi toko.",
        profile_url: getG2GSellerUrl(parsed.best_supplier?.name || "HellenWong", parsed.title || query),
        shopee_search_query: `${parsed.title || query} Original`,
      };

      return NextResponse.json({
        status: "success",
        data: opportunity,
      });
    } catch (parseErr) {
      return NextResponse.json({
        status: "error",
        message: "Gagal memproses kalkulasi AI.",
        raw: cleaned,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
