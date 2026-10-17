const fs = require('fs');
let c = fs.readFileSync('app/dashboard/autonomous/page.tsx', 'utf-8');
c = c.replace(/\\n/g, '\n');
c = c.replace(/\\'/g, "'");
fs.writeFileSync('app/dashboard/autonomous/page.tsx', c);
console.log('Fixed!');
