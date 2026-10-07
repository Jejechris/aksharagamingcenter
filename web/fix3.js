const fs = require('fs');
let c = fs.readFileSync('app/dashboard/description/page.tsx', 'utf-8');
c = c.replace(/json\.data/g, 'mergedData');
fs.writeFileSync('app/dashboard/description/page.tsx', c);
console.log('Fixed description!');
