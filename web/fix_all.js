const fs = require('fs');
const files = [
  'app/dashboard/stock/page.tsx',
  'app/dashboard/risk/page.tsx',
  'app/dashboard/quant/page.tsx',
  'app/dashboard/operator/page.tsx',
  'app/dashboard/marketer/components/ThumbnailStudio.tsx',
  'app/dashboard/formatter/page.tsx',
  'app/dashboard/description/page.tsx',
  'app/dashboard/catalog/page.tsx',
  'app/dashboard/autonomous/page.tsx'
];
for(let f of files) {
  let c = fs.readFileSync(f, 'utf-8');
  let newC = c;
  let idx = 0;
  while((idx = newC.indexOf('fetchSmartCatalog', idx)) !== -1) {
    let startIdx = newC.lastIndexOf('try', idx);
    if(startIdx === -1) startIdx = newC.lastIndexOf('{', idx);
    let endIdx = newC.indexOf('catch', idx);
    if(endIdx === -1) endIdx = newC.indexOf('}', idx + 100);
    
    let block = newC.substring(startIdx, endIdx);
    let varName = f.includes('catalog/page') ? 'mergedList' : 'mergedData';
    let newBlock = block.replace(/json\.data/g, varName);
    
    // Check if the file still has `if (json.status === "success"`
    newBlock = newBlock.replace(/const json = await res\.json\(\);/, '');
    newBlock = newBlock.replace(/if\s*\(\s*json\.status\s*===\s*"success"\s*&&\s*json\.data\s*\)/, `if (${varName})`);
    newBlock = newBlock.replace(/if\s*\(\s*json\.status\s*===\s*"success"\s*\)/, `if (${varName})`);
    
    newC = newC.substring(0, startIdx) + newBlock + newC.substring(endIdx);
    idx = startIdx + newBlock.length;
  }
  if(newC !== c) {
    fs.writeFileSync(f, newC);
    console.log('Fixed', f);
  }
}
