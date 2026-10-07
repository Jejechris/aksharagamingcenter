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
  'web/app/dashboard/catalog/page.tsx'
];

targetFiles.forEach(file => {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  let modified = false;

  if (file.includes('catalog/page.tsx')) {
    if (!content.includes('fetchSmartCatalog')) {
        content = content.replace(/import [^\n]+;\r?\n/, match => match + `import { fetchSmartCatalog } from "@/lib/catalogClient";\n`);
    }
    const fetchBlockRegex = /const fetchCatalog = async \(\) => \{[\s\S]*?setLoading\(false\);\r?\n\s*\}\r?\n\s*\};/;
    if (fetchBlockRegex.test(content)) {
       content = content.replace(fetchBlockRegex, `const fetchCatalog = async () => {\n    setLoading(true);\n    try {\n      const mergedList = await fetchSmartCatalog();\n      updateCatalogState(mergedList);\n    } catch (err) {\n      console.error(err);\n    } finally {\n      setLoading(false);\n    }\n  };`);
       modified = true;
    }
  } else {
    // Let's replace:
    // const res = await fetch("/api/catalog");
    // const json = await res.json();
    // if (json.status === "success" && Array.isArray(json.data)) {
    //   setCatalogGames(json.data);
    // ...
    // }
    
    // Using a more generalized string search/replace
    if (content.includes('fetch("/api/catalog")') || content.includes("fetch('/api/catalog')")) {
      if (!content.includes('fetchSmartCatalog')) {
          content = content.replace(/import [^\n]+;\r?\n/, match => match + `import { fetchSmartCatalog } from "@/lib/catalogClient";\n`);
      }
      
      const parts = content.split(/(const\s+res\s*=\s*await\s+fetch\(['"`]\/api\/catalog['"`]\);[\s\S]*?json\.data\);?)/);
      for (let i = 1; i < parts.length; i += 2) {
          const match = parts[i];
          const setterMatch = match.match(/(set[A-Za-z0-9_]+)\(json\.data\)/);
          if (setterMatch) {
              const setter = setterMatch[1];
              parts[i] = `const mergedData = await fetchSmartCatalog();\n          ${setter}(mergedData);`;
              modified = true;
          }
      }
      content = parts.join('');
    }
  }

  if (modified) {
    fs.writeFileSync(p, content);
    console.log("Patched", file);
  } else {
    console.log("No match for", file);
  }
});
