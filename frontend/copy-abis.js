const fs = require('fs');
const path = require('path');

// __dirname is reliable even with # in path
const frontendDir = __dirname;
const base = path.dirname(frontendDir); // parent = cipherdex/
const destDir = path.join(frontendDir, 'src', 'lib', 'abis');

console.log('Frontend dir:', frontendDir);
console.log('Base dir:', base);
console.log('Dest dir:', destDir);

// Test if base dir is accessible
try {
  const items = fs.readdirSync(base);
  console.log('Base contents:', items);
} catch (e) {
  console.log('Cannot read base:', e.message);
}

const contracts = [
  ['ConfidentialToken', path.join('artifacts', 'contracts', 'core', 'ConfidentialToken.sol', 'ConfidentialToken.json')],
  ['SettlementVault', path.join('artifacts', 'contracts', 'core', 'SettlementVault.sol', 'SettlementVault.json')],
  ['PlatformRegistry', path.join('artifacts', 'contracts', 'core', 'PlatformRegistry.sol', 'PlatformRegistry.json')],
  ['OrderBook', path.join('artifacts', 'contracts', 'features', 'OrderBook.sol', 'OrderBook.json')],
  ['SealedAuction', path.join('artifacts', 'contracts', 'features', 'SealedAuction.sol', 'SealedAuction.json')],
  ['Escrow', path.join('artifacts', 'contracts', 'features', 'Escrow.sol', 'Escrow.json')],
  ['LimitOrderEngine', path.join('artifacts', 'contracts', 'features', 'LimitOrderEngine.sol', 'LimitOrderEngine.json')],
  ['BatchAuction', path.join('artifacts', 'contracts', 'features', 'BatchAuction.sol', 'BatchAuction.json')],
  ['PortfolioTracker', path.join('artifacts', 'contracts', 'features', 'PortfolioTracker.sol', 'PortfolioTracker.json')],
  ['Reputation', path.join('artifacts', 'contracts', 'features', 'Reputation.sol', 'Reputation.json')],
  ['OTCBoard', path.join('artifacts', 'contracts', 'features', 'OTCBoard.sol', 'OTCBoard.json')],
];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const [name, srcPath] of contracts) {
  const fullSrc = path.join(base, srcPath);
  try {
    const json = JSON.parse(fs.readFileSync(fullSrc, 'utf8'));
    const abiOnly = JSON.stringify(json.abi, null, 2);
    fs.writeFileSync(path.join(destDir, name + '.json'), abiOnly);
    console.log('OK:', name);
  } catch (e) {
    console.log('SKIP:', name, '-', e.message.substring(0, 100));
  }
}
