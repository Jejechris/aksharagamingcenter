const fs = require('fs');
const path = require('path');

const targetFiles = [
  'web/app/dashboard/quant/page.tsx',
  'web/app/dashboard/risk/page.tsx',
  'web/app/dashboard/operator/page.tsx',
  'web/app/dashboard/formatter/page.tsx',
  'web/app/dashboard/description/page.tsx',
  'web/app/dashboard/marketer/components/ThumbnailStudio.tsx',
  'web/app/dashboard/autonomous/page.tsx',
  'web/app/dashboard/stock/page.tsx'
];

targetFiles.forEach(file => {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  let modified = false;

  // Include import
  if (!content.includes('fetchSmartCatalog')) {
    content = content.replace(/import [^\n]+;/, match => match + `\nimport { fetchSmartCatalog } from "@/lib/catalogClient";`);
    modified = true;
  }

  // Replace fetch block for setCatalogGames
  const regexGames = /const res = await fetch\(['"]\/api\/catalog['"]\);\s*const json = await res\.json\(\);\s*if\s*\(json\.status === ['"]success['"]\s*&&\s*Array\.isArray\(json\.data\)\)\s*\{\s*setCatalogGames\(json\.data\);/g;
  
  if (regexGames.test(content)) {
    content = content.replace(regexGames, `const mergedData = await fetchSmartCatalog();\n        if (mergedData && mergedData.length > 0) {\n          setCatalogGames(mergedData);`);
    modified = true;
  }
  
  // Replace fetch block for setCatalog
  const regexCatalog = /const res = await fetch\(['"]\/api\/catalog['"]\);\s*const json = await res\.json\(\);\s*if\s*\(json\.status === ['"]success['"]\s*&&\s*Array\.isArray\(json\.data\)\)\s*\{\s*setCatalog\(json\.data\);/g;
  
  if (regexCatalog.test(content)) {
    content = content.replace(regexCatalog, `const mergedData = await fetchSmartCatalog();\n      if (mergedData && mergedData.length > 0) {\n        setCatalog(mergedData);`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(p, content);
    console.log("Patched", file);
  } else {
    console.log("No match for", file);
  }
});
