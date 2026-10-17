const fs = require('fs');

let eneba = fs.readFileSync('app/dashboard/eneba/page.tsx', 'utf8');

// Regex replace to handle \r\n or \n
eneba = eneba.replace(/<span>\{aiScannerOpen \? "Tutup Scanner AI" : "Scan CDKey Baru"\}<\/span>\s*<\/button>\s*<\/div>/, 
`<span>{aiScannerOpen ? "Tutup Scanner AI" : "Scan CDKey Baru"}</span>
          </button>
          
          <button
            type="button"
            onClick={handleDiscoverTrend}
            disabled={isDiscoveringTrend || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer select-none"
          >
            <Flame className={\`w-3.5 h-3.5 \${isDiscoveringTrend ? "animate-pulse" : ""}\`} />
            <span>{isDiscoveringTrend ? "Mencari Trend..." : "Auto-Discover Trend"}</span>
          </button>
        </div>`);

fs.writeFileSync('app/dashboard/eneba/page.tsx', eneba);


let res = fs.readFileSync('app/dashboard/research/page.tsx', 'utf8');
res = res.replace(/<span>\{manualSearchOpen \? "Tutup Scanner AI" : "Pencarian AI Manual"\}<\/span>\s*<\/button>\s*<\/div>/, 
`<span>{manualSearchOpen ? "Tutup Scanner AI" : "Pencarian AI Manual"}</span>
          </button>
          
          <button
            type="button"
            onClick={handleDiscoverTrend}
            disabled={isDiscoveringTrend || loading || isScanningBot}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 cursor-pointer select-none"
          >
            <Flame className={\`w-3.5 h-3.5 \${isDiscoveringTrend ? "animate-pulse" : ""}\`} />
            <span>{isDiscoveringTrend ? "Mencari Trend..." : "Auto-Discover Trend"}</span>
          </button>
        </div>`);
fs.writeFileSync('app/dashboard/research/page.tsx', res);

console.log("Done");
