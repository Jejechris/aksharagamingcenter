const fs = require('fs');

let content = fs.readFileSync('lib/g2g.ts', 'utf8');

// The line is: return `https://www.g2g.com/offer/${oid}`;
// We replace it with category inclusion.
content = content.replace(
  /return `https:\/\/www\.g2g\.com\/offer\/\$\{oid\}`;/,
  `const catUrl = getG2GGameCategoryUrl(gameTitle || "");
    if (catUrl.includes("/categories/")) {
      return \`\${catUrl}/offer/\${oid}\`;
    }
    return \`https://www.g2g.com/id/offer/\${oid}\`;`
);

// We also need to fix defaultOffers in VERIFIED_G2G_CATALOG
content = content.replace(/https:\/\/www\.g2g\.com\/offer\/G/g, 'https://www.g2g.com/id/offer/G');

fs.writeFileSync('lib/g2g.ts', content);
console.log('Fixed g2g.ts');
