const fs = require('fs');

let c = fs.readFileSync('app/api/catalog/route.ts', 'utf8');

// Fix generic matches in findGameIndex
c = c.replace(/\|\| combined\.includes\("tr-"\) \|\| combined\.includes\("tr_"\)/g, '');
c = c.replace(/\|\| combined\.includes\("wk-"\)/g, '');
c = c.replace(/\|\| combined\.includes\("tf-"\)/g, '');
c = c.replace(/\|\| combined\.includes\("fc-"\)/g, '');

// Fix stock bug for `add_seller`
c = c.replace(
  /stock: typeof new_seller\.stock === 'number' \? new_seller\.stock : \(new_seller\.stock !== undefined && !isNaN\(Number\(new_seller\.stock\)\) \? Number\(new_seller\.stock\) : 100\),/g,
  `stock: typeof new_seller.stock === 'number' ? new_seller.stock : (!isNaN(Number(new_seller.stock)) ? Number(new_seller.stock) : 100),`
);

// Fix stock bug for UPSERT
c = c.replace(
  /stock: Number\(incoming\.stock\) \|\| 20,/g,
  `stock: typeof incoming.stock === 'number' ? incoming.stock : (!isNaN(Number(incoming.stock)) ? Number(incoming.stock) : 20),`
);

// Fix stock bug for INSERT NEW
c = c.replace(
  /stock: Number\(s\.stock\) \|\| 20,/g,
  `stock: typeof s.stock === 'number' ? s.stock : (!isNaN(Number(s.stock)) ? Number(s.stock) : 20),`
);

fs.writeFileSync('app/api/catalog/route.ts', c);
console.log('Fixed catalog route');
