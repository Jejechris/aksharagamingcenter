const fs = require('fs');
const path = require('path');

// Read all files
function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            /* Recurse into a subdirectory */
            results = results.concat(walkDir(file));
        } else { 
            /* Is a file */
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('app');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;

    // description/page.tsx replacements
    if (file.includes('description/page.tsx')) {
        content = content.replace(/const \[includePhysicalCard, setIncludePhysicalCard\] = useState\(true\);/g, 'const [includePhysicalCard, setIncludePhysicalCard] = useState(false);');
        content = content.replace(/const \[includeUnboxingSop, setIncludeUnboxingSop\] = useState\(true\);/g, 'const [includeUnboxingSop, setIncludeUnboxingSop] = useState(false);');
        content = content.replace(/ctx\.fillText\("📦 DILENGKAPI KARTU GARANSI FISIK A6 RESMI DENGAN SERIAL QR CODE", width \/ 2, 882\);/g, '');
        content = content.replace(/Dilindungi SOP Video Unboxing/g, 'Digital Full Access');
        
        // Remove checkboxes UI
        const checkboxRegex = /<label className="flex items-center gap-2 cursor-pointer">[\s\S]*?<span[^>]*>📦 Sertakan Pengiriman Fisik Kartu Garansi A6<\/span>[\s\S]*?<\/label>/;
        content = content.replace(checkboxRegex, '');
        
        const checkboxRegex2 = /<label className="flex items-center gap-2 cursor-pointer">[\s\S]*?<span[^>]*>⚠️ Sertakan SOP Video Unboxing \(Anti-Fraud\)<\/span>[\s\S]*?<\/label>/;
        content = content.replace(checkboxRegex2, '');
    }

    // marketer/page.tsx replacements
    if (file.includes('marketer/page.tsx')) {
        content = content.replace(/Sertifikat Fisik A6/g, 'Digital Certificate');
        content = content.replace(/Fisik A6/g, 'Sertifikat Digital');
        content = content.replace(/Preview A6 Card/g, 'Preview Sertifikat');
        content = content.replace(/Cetak \/ Print A6/g, 'Download Sertifikat');
        
        // Remove unboxing mentions
        content = content.replace(/1\. Video Unboxing:/g, '1. Garansi Digital:');
        content = content.replace(/Wajib merekam video pembukaan fisik tanpa jeda\./g, 'Klaim garansi dapat dilakukan secara digital melalui CS kami.');
    }

    // autonomous/route.ts
    if (file.includes('autonomous/route.ts')) {
        content = content.replace(/📦 \*Pemberitahuan Amplop Fisik:\*[\s\S]*?Jika tidak, garansi dianggap hangus\.\*\\n\\n/g, '');
        content = content.replace(/INFORMASI PENGIRIMAN FISIK:[\s\S]*?pesanan selesai di Shopee\.\\n\\n/g, '');
        content = content.replace(/Amplop fisik kartu garansi A6 juga segera meluncur ke alamat kakak via kurir Shopee\./g, 'Kredensial pesanan akan dikirimkan secara langsung via chat.');
    }

    // webhook/route.ts
    if (file.includes('webhook/route.ts')) {
        content = content.replace(/• Amplop & Kartu A6: -Rp \$\{packagingCost\.toLocaleString\("id-ID"\)\}\\n\\n/g, '');
        content = content.replace(/• Simpan kartu fisik A6 resmi yang dikirimkan ke alamat Anda\.\\n\\n/g, '');
        content = content.replace(/ \+ KARTU A6/g, '');
        content = content.replace(/✅ BONUS KARTU GARANSI FISIK:[^\n]*\\n\\n/g, '');
        content = content.replace(/1\. Wajib membuat VIDEO UNBOXING amplop kartu garansi fisik tanpa jeda \(no-cut\) dari awal paket masih tersegel rapi\.\\n/g, '');
        content = content.replace(/Q: Apakah dikirim paket fisik ke alamat rumah\?\\n[^\n]*\\n\\n/g, '');
    }

    // triage/route.ts
    if (file.includes('triage/route.ts')) {
        content = content.replace(/2\. Kartu fisik garansi A6 beserta serial number harus tampak jelas di video\./g, '');
        content = content.replace(/SOP Garansi Akshara mewajibkan video unboxing amplop fisik no-cut untuk validasi klaim\./g, 'SOP Garansi Akshara mewajibkan bukti screenshot untuk validasi klaim.');
        content = content.replace(/setiap klaim kendala akun wajib melampirkan rekaman video unboxing amplop fisik tanpa jeda \(no-cut\)/g, 'setiap klaim kendala akun wajib melampirkan screenshot kendala');
    }

    // general replacements
    content = content.replace(/kartu garansi fisik A6/gi, 'garansi digital');
    content = content.replace(/kartu garansi A6/gi, 'garansi digital');
    content = content.replace(/kartu fisik/gi, 'garansi digital');
    content = content.replace(/amplop fisik/gi, 'garansi digital');
    content = content.replace(/video unboxing no-cut/gi, 'screenshot kendala');
    content = content.replace(/video unboxing/gi, 'screenshot kendala');
    content = content.replace(/amplop/gi, 'garansi digital');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});

console.log('Cleanup complete');
