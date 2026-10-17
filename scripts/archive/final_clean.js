const fs = require('fs');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    let newContent = content;
    for (let r of replacements) {
        newContent = newContent.replace(r.search, r.replace);
    }
    if (newContent !== content) {
        fs.writeFileSync(filepath, newContent);
        console.log(`Updated ${filepath}`);
    }
}

const files = [
    'app/dashboard/support/page.tsx',
    'app/dashboard/risk/page.tsx',
    'app/dashboard/page.tsx',
    'app/dashboard/operator/page.tsx',
    'app/dashboard/marketer/page.tsx',
    'app/dashboard/marketer/components/ThumbnailStudio.tsx',
    'app/dashboard/formatter/page.tsx',
    'app/dashboard/description/page.tsx',
    'app/dashboard/autonomous/page.tsx',
    'app/claim/page.tsx',
    'app/api/verify/route.ts',
    'app/api/telegram/webhook/route.ts',
    'app/api/orders/autonomous/route.ts',
    'app/api/ai/shopee-cs-batch/route.ts',
    'app/api/ai/shopee-competitors/route.ts',
    'app/api/ai/format-delivery/route.ts',
    'app/api/ai/triage/route.ts'
];

for (let file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = content;
        
        newContent = newContent.replace(/garansi digital A6/g, 'garansi digital');
        newContent = newContent.replace(/Kartu Garansi Fisik/g, 'Garansi Digital');
        newContent = newContent.replace(/kartu garansi fisik/g, 'garansi digital');
        newContent = newContent.replace(/INFORMASI PENGIRIMAN FISIK:/g, '');
        newContent = newContent.replace(/paket fisik \/ resi/gi, 'pengiriman digital');
        newContent = newContent.replace(/sertifikat fisik/gi, 'sertifikat digital');
        newContent = newContent.replace(/Sertifikat A6/gi, 'Sertifikat Digital');
        newContent = newContent.replace(/amplop/gi, 'pesan digital');
        newContent = newContent.replace(/Kartu Garansi Akshara A6/gi, 'Garansi Akshara');
        newContent = newContent.replace(/Q: Apakah dikirim pesan digital fisik ke alamat rumah\?\\n\s*\+\s*`A: Ya kak, garansi digital resmi berisi Garansi Akshara dikirim via kurir Shopee agar order Anda resmi dan aman regulasi\.\\n\\n`/g, '');
        newContent = newContent.replace(/1\. Rekam Unboxing/g, '1. Bukti Kendala');
        newContent = newContent.replace(/SOP unboxing/gi, 'SOP klaim digital');
        newContent = newContent.replace(/📦 Sertakan Pengiriman Fisik garansi digital/gi, '📦 Sertakan Garansi Digital');
        
        if (file.includes('format-delivery/route.ts')) {
            newContent = newContent.replace(/• pesan digital berisi Kartu Garansi Resmi A6 Akshara sedang kami kirimkan ke alamat Kakak via ekspedisi Shopee\./g, '');
            newContent = newContent.replace(/• Simpan garansi digital tersebut ya Kak\. Sesuai SOP, klaim garansi memerlukan screenshot kendala garansi digital tanpa jeda\/cut\./g, '');
            newContent = newContent.replace(/ATURAN MODE PENGIRIMAN: PAKET pesan digital FISIK \(garansi digital\):[\s\S]*?`ATURAN MODE PENGIRIMAN:/g, '`ATURAN MODE PENGIRIMAN:');
        }

        if (newContent !== content) {
            fs.writeFileSync(file, newContent);
            console.log(`Cleaned up ${file}`);
        }
    }
}
