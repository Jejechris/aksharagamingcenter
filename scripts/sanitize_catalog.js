/**
 * scripts/sanitize_catalog.js
 * Sanitizes active_catalog.json across web/data/, output/, and web/data/starter_catalog_backup.json
 * Fixes all 404 and delisted G2G URL patterns:
 * - Eliminates dead `/offer/G...` and `/categories/.../offer/G...` paths
 * - Sets profile_url and fallback_search_url to EVERGREEN G2G Category + Seller Search URLs
 * - Strips internal suffixes (_Hypixel, _TLauncher, _SaveGame, _FiveM) from seller names in ?q=
 * - Removes `/id/` prefix from all G2G and Eneba URLs
 * - Sanitizes game.metrics.selected_seller.profile_url
 * - Synchronizes with Supabase app_kv under BOTH "active_catalog" AND "catalog_games", plus catalog_games SQL table
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const webCatalogPath = path.join(rootDir, 'web', 'data', 'active_catalog.json');
const outputCatalogPath = path.join(rootDir, 'output', 'active_catalog.json');
const starterCatalogPath = path.join(rootDir, 'web', 'data', 'starter_catalog_backup.json');

const G2G_CATEGORY_SLUGS = {
  minecraft: "minecraft-account",
  terraria: "terraria-account",
  wukong: "black-myth-wukong-accounts",
  gta: "steam-global-account",
  tf2: "tf2-item",
  fc25: "fc-25-accounts",
  "fc 25": "fc-25-accounts",
  zomboid: "project-zomboid-accounts",
  stardew: "stardew-valley-account",
  "dont starve": "don-t-starve-together-accounts",
  "lethal company": "lethal-company-accounts",
  phasmophobia: "phasmophobia-account",
  "hollow knight": "hollow-knight-accounts",
  "garrys mod": "garry-s-mod-account",
  "elden ring": "elden-ring-account",
  palworld: "palworld-accounts",
  rust: "rust-accounts-buy",
  "left 4 dead": "left-4-dead-2-account",
  "among us": "among-us-account",
  witcher: "witcher-iii-wild-hunt-account",
  "ready or not": "ready-or-not-account",
  "sons of the forest": "sons-of-the-forest-accounts",
  helldivers: "helldivers-2-accounts",
  forza: "forza-horizon-5-account",
};

function resolveCategorySlug(title = "") {
  const lower = title.toLowerCase();
  for (const [k, slug] of Object.entries(G2G_CATEGORY_SLUGS)) {
    if (lower.includes(k)) return slug;
  }
  return "steam-global-account";
}

/**
 * Membersihkan nama seller dari suffix internal (seperti _Hypixel, _TLauncher, _SaveGame, _FiveM)
 * dan mengabaikan nama generik sehingga filter ?q= di G2G mencocokkan seller riil.
 */
function cleanSellerUsername(sellerName) {
  if (!sellerName) return "";
  let s = String(sellerName).trim();
  s = s.replace(/_(?:hypixel|tlauncher|savegame|fivem|vip|store|indo|acc|global|key)$/i, "");
  s = s.replace(/^g2g[-_]/i, "");
  s = s.trim();

  const lower = s.toLowerCase();
  if (
    lower.includes("lowest") ||
    lower.includes("default") ||
    lower.includes("unknown") ||
    lower === "seller" ||
    lower === "g2g seller" ||
    lower === "verified seller" ||
    lower === "verified merchant"
  ) {
    return "";
  }
  return s;
}

/**
 * Menghasilkan URL Evergreen G2G (Category + Seller Search)
 */
function getEvergreenUrl(catSlug, sellerName) {
  const clean = cleanSellerUsername(sellerName);
  if (clean) {
    return `https://www.g2g.com/categories/${catSlug}?q=${encodeURIComponent(clean)}`;
  }
  return `https://www.g2g.com/categories/${catSlug}`;
}

function sanitizeUrl(rawUrl, gameTitle, sellerName) {
  if (!rawUrl) return "";
  let url = String(rawUrl).trim();

  // 1. Eneba clean
  if (url.includes("eneba.com")) {
    const cleanEneba = url.replace("eneba.com/id/store", "eneba.com/store");
    return {
      profile_url: cleanEneba,
      offer_id: null,
      fallback_search_url: cleanEneba,
    };
  }

  // 2. Extract Offer ID if present for inventory tracking, but NEVER as user-facing link
  const offerMatch = url.match(/(?:offer\/|item\/|^)?(G\d{10,}[A-Za-z0-9]*)/i);
  const oid = offerMatch ? offerMatch[1] : null;

  const catSlug = resolveCategorySlug(gameTitle);
  const evergreenUrl = getEvergreenUrl(catSlug, sellerName);

  return {
    profile_url: evergreenUrl,
    offer_id: oid,
    fallback_search_url: evergreenUrl,
  };
}

function sanitizeSeller(seller, gameTitle) {
  let changed = false;
  const orig = seller.profile_url || "";
  const result = sanitizeUrl(orig, gameTitle, seller.seller_name);

  if (result.profile_url !== orig) {
    seller.profile_url = result.profile_url;
    changed = true;
  }
  if (result.offer_id && !seller.offer_id) {
    seller.offer_id = result.offer_id;
  }
  if (seller.fallback_search_url !== result.fallback_search_url) {
    seller.fallback_search_url = result.fallback_search_url;
    changed = true;
  }

  // Clean /id/ in profile_url or fallback_search_url
  if (seller.profile_url && seller.profile_url.includes("g2g.com/id/")) {
    seller.profile_url = seller.profile_url.replace("g2g.com/id/", "g2g.com/");
    changed = true;
  }
  if (seller.fallback_search_url && seller.fallback_search_url.includes("g2g.com/id/")) {
    seller.fallback_search_url = seller.fallback_search_url.replace("g2g.com/id/", "g2g.com/");
    changed = true;
  }

  // Clean /id/ in Eneba
  if (seller.profile_url && seller.profile_url.includes("eneba.com/id/store")) {
    seller.profile_url = seller.profile_url.replace("eneba.com/id/store", "eneba.com/store");
    changed = true;
  }
  return changed;
}

function sanitizeCatalog(catalog) {
  let count = 0;
  catalog.forEach((game) => {
    const title = game.title || "";
    (game.sellers || []).forEach((seller) => {
      if (sanitizeSeller(seller, title)) {
        count++;
      }
    });

    // Sanitize nested metrics.selected_seller if exists
    if (game.metrics && game.metrics.selected_seller) {
      if (sanitizeSeller(game.metrics.selected_seller, title)) {
        count++;
      }
    }
  });
  return count;
}

// Process web catalog
async function run() {
  if (fs.existsSync(webCatalogPath)) {
    const data = JSON.parse(fs.readFileSync(webCatalogPath, 'utf8'));
    const fixed = sanitizeCatalog(data);
    fs.writeFileSync(webCatalogPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Sanitized ${fixed} URLs in ${webCatalogPath}`);

    // Also sync to outputCatalogPath
    const outputDir = path.dirname(outputCatalogPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputCatalogPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Synchronized to ${outputCatalogPath}`);

    // Also sync starter if exists
    if (fs.existsSync(starterCatalogPath)) {
      const starterData = JSON.parse(fs.readFileSync(starterCatalogPath, 'utf8'));
      const starterFixed = sanitizeCatalog(starterData);
      fs.writeFileSync(starterCatalogPath, JSON.stringify(starterData, null, 2), 'utf8');
      console.log(`✅ Sanitized ${starterFixed} URLs in ${starterCatalogPath}`);
    }

    // Sync to PostgreSQL / Supabase if configured
    let DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
    const envFile = path.join(rootDir, '.env');
    if (!DB_URL && fs.existsSync(envFile)) {
      const lines = fs.readFileSync(envFile, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=')) {
          DB_URL = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        } else if (line.startsWith('POSTGRES_URL=') && !DB_URL) {
          DB_URL = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }

    if (DB_URL) {
      try {
        let Client;
        try {
          Client = require('pg').Client;
        } catch {
          Client = require(path.join(rootDir, 'web', 'node_modules', 'pg')).Client;
        }
        const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
        await client.connect();

        // Write to app_kv under BOTH "active_catalog" AND "catalog_games"
        await client.query(
          "INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP",
          ["active_catalog", JSON.stringify(data)]
        );
        await client.query(
          "INSERT INTO app_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP",
          ["catalog_games", JSON.stringify(data)]
        );
        console.log("✅ Synchronized sanitized catalog to Supabase app_kv under BOTH 'active_catalog' and 'catalog_games'.");

        // If table catalog_games exists, update each row
        const tableCheck = await client.query("SELECT to_regclass('public.catalog_games') as exists");
        if (tableCheck.rows[0]?.exists) {
          for (const g of data) {
            await client.query(`
              INSERT INTO catalog_games (id, title, platform, category, selling_price_shopee_idr, target_margin_pct, status, selected_seller_id, sellers)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                platform = EXCLUDED.platform,
                category = EXCLUDED.category,
                selling_price_shopee_idr = EXCLUDED.selling_price_shopee_idr,
                target_margin_pct = EXCLUDED.target_margin_pct,
                status = EXCLUDED.status,
                selected_seller_id = EXCLUDED.selected_seller_id,
                sellers = EXCLUDED.sellers
            `, [
              g.id,
              g.title,
              g.platform || "PC",
              g.category || "Account (Full Access)",
              g.selling_price_shopee_idr || 0,
              g.target_margin_pct || 20,
              g.status || "active",
              g.selected_seller_id || "",
              JSON.stringify(g.sellers || [])
            ]);
          }
          console.log(`✅ Synchronized ${data.length} games to PostgreSQL table catalog_games.`);
        }
        await client.end();
      } catch (dbErr) {
        console.warn("Notice: Database sync skipped/optional:", dbErr.message);
      }
    }
  } else {
    console.warn(`File not found: ${webCatalogPath}`);
  }
}

run().catch(console.error);


