const fs = require('fs');
const path = require('path');

const targetFiles = [
  'web/app/dashboard/stock/page.tsx',
  'web/app/dashboard/quant/page.tsx',
  'web/app/dashboard/risk/page.tsx',
  'web/app/dashboard/operator/page.tsx',
  'web/app/dashboard/formatter/page.tsx',
  'web/app/dashboard/description/page.tsx',
  'web/app/dashboard/marketer/components/ThumbnailStudio.tsx',
  'web/app/dashboard/autonomous/page.tsx',
  'web/app/dashboard/catalog/page.tsx'
];

targetFiles.forEach(file => {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) {
      console.log("Not found:", p);
      return;
  }
  let content = fs.readFileSync(p, 'utf8');
  let modified = false;

  if (file.includes('catalog/page.tsx')) {
    if (!content.includes('fetchSmartCatalog')) {
        content = content.replace(/import [^\n]+;\n/, match => match + `import { fetchSmartCatalog } from "@/lib/catalogClient";\n`);
    }
    const fetchBlockRegex = /const fetchCatalog = async \(\) => \{[\s\S]*?setLoading\(false\);\n\s*\}\n\s*\};/;
    if (fetchBlockRegex.test(content)) {
       content = content.replace(fetchBlockRegex, `const fetchCatalog = async () => {\n    setLoading(true);\n    try {\n      const mergedList = await fetchSmartCatalog();\n      updateCatalogState(mergedList);\n    } catch (err) {\n      console.error(err);\n    } finally {\n      setLoading(false);\n    }\n  };`);
       modified = true;
    }
  } else {
    if (content.includes('fetch("/api/catalog")') || content.includes("fetch('/api/catalog')") || content.includes('fetch(`/api/catalog`)')) {
      if (!content.includes('fetchSmartCatalog')) {
          content = content.replace(/import [^\n]+;\n/, match => match + `import { fetchSmartCatalog } from "@/lib/catalogClient";\n`);
      }
      
      const regex1 = /const\s+res\s*=\s*await\s+fetch\(['"`]\/api\/catalog['"`]\);\s*const\s+json\s*=\s*await\s+res\.json\(\);\s*if\s*\([^\{]+\)\s*\{\s*setCatalog\(json\.data\);\s*\}/g;
      if (regex1.test(content)) {
          content = content.replace(regex1, `const mergedData = await fetchSmartCatalog();\n      setCatalog(mergedData);`);
          modified = true;
      }
      
      const regex2 = /const\s+res\s*=\s*await\s+fetch\(['"`]\/api\/catalog['"`]\);\s*const\s+json\s*=\s*await\s+res\.json\(\);\s*if\s*\([^\{]+\)\s*\{\s*setGames\(json\.data\);\s*\}/g;
      if (regex2.test(content)) {
          content = content.replace(regex2, `const mergedData = await fetchSmartCatalog();\n      setGames(mergedData);`);
          modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(p, content);
    console.log("Patched", file);
  } else {
    console.log("No match for", file);
  }
});
