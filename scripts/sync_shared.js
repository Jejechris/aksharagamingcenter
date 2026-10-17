/**
 * scripts/sync_shared.js
 * Verifies and synchronizes shared cryptographic modules between `web/` and `claim-web/`.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const webCrypto = path.join(rootDir, 'web', 'lib', 'cryptoVault.ts');
const claimCrypto = path.join(rootDir, 'claim-web', 'lib', 'cryptoVault.ts');

function checkFile(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }
}

checkFile(webCrypto);
checkFile(claimCrypto);

const webContent = fs.readFileSync(webCrypto, 'utf8');
const claimContent = fs.readFileSync(claimCrypto, 'utf8');

const shouldSync = process.argv.includes('--sync') || process.argv.includes('-s');

if (webContent === claimContent) {
  console.log("✅ [SYNC SHARED] cryptoVault.ts is 100% IDENTICAL across web/ and claim-web/.");
  console.log(`   - web:       ${webCrypto}`);
  console.log(`   - claim-web: ${claimCrypto}`);
  process.exit(0);
} else {
  if (shouldSync) {
    fs.writeFileSync(claimCrypto, webContent, 'utf8');
    console.log("🔄 [SYNC SHARED] Synchronized web/lib/cryptoVault.ts -> claim-web/lib/cryptoVault.ts successfully.");
    process.exit(0);
  } else {
    console.warn("⚠️ [SYNC SHARED] Discrepancy detected between web/lib/cryptoVault.ts and claim-web/lib/cryptoVault.ts!");
    console.warn("   Run 'node scripts/sync_shared.js --sync' to synchronize automatically.");
    process.exit(1);
  }
}
