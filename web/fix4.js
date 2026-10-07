const fs = require('fs');

let risk = fs.readFileSync('app/dashboard/risk/page.tsx', 'utf-8');
risk = risk.replace('const firstGame = json.data[0];', 'const firstGame = mergedData[0];');
fs.writeFileSync('app/dashboard/risk/page.tsx', risk);

let quant = fs.readFileSync('app/dashboard/quant/page.tsx', 'utf-8');
quant = quant.replace('if (json.data.length > 0) {', 'if (mergedData.length > 0) {');
quant = quant.replace('const matched = json.data.find((g: any) => g.id === currentGameId) || json.data[0];', 'const matched = mergedData.find((g: any) => g.id === currentGameId) || mergedData[0];');
fs.writeFileSync('app/dashboard/quant/page.tsx', quant);

let formatter = fs.readFileSync('app/dashboard/formatter/page.tsx', 'utf-8');
formatter = formatter.replace('if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {', 'if (Array.isArray(mergedData) && mergedData.length > 0) {');
formatter = formatter.replace('setCatalogGames(json.data);', 'setCatalogGames(mergedData);');
formatter = formatter.replace('const first = json.data[0];', 'const first = mergedData[0];');
fs.writeFileSync('app/dashboard/formatter/page.tsx', formatter);

let desc = fs.readFileSync('app/dashboard/description/page.tsx', 'utf-8');
desc = desc.replace('const found = json.data.find((g: any) =>', 'const found = mergedData.find((g: any) =>');
desc = desc.replace('const first = json.data[0];', 'const first = mergedData[0];');
fs.writeFileSync('app/dashboard/description/page.tsx', desc);

console.log('Done!');
