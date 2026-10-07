const fs = require('fs');
let c = fs.readFileSync('app/dashboard/autonomous/page.tsx', 'utf-8');
const search = `          setFormPrice(first.selling_price_shopee_idr);
        }
      }
    } catch (e) {`;
const repl = `          setFormPrice(first.selling_price_shopee_idr);
        }
    } catch (e) {`;
c = c.replace(search, repl);
fs.writeFileSync('app/dashboard/autonomous/page.tsx', c);
