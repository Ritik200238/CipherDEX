# CipherDEX

**The private operating system for DAOs — launch tokens, pay teams, trade treasury, hire talent. All encrypted.**

CipherDEX is a private finance protocol built on Fhenix FHE (Fully Homomorphic Encryption). Every bid, payment amount, trade price, and reputation score is encrypted on-chain. The blockchain processes your finances without ever seeing the numbers.

[Launch App](https://cipher-dex.vercel.app) | [Etherscan Contracts](https://sepolia.etherscan.io/address/0xd5524d656477E803a6BE96b5C044CdBb492C8297)

---

## The Problem

Every transaction on a public blockchain is a postcard:

- **DAOs** — contributor salaries visible to everyone. Politics. Resentment.
- **Token launches** — bots see first bid, front-run with larger bid. Retail loses.
- **Large trades** — whale orders move the market before execution. 2-5% slippage.
- **Freelance hiring** — competitors see each other's bids, undercut to race-to-bottom.

Financial privacy isn't a feature request. It's missing infrastructure.

## The Solution

CipherDEX encrypts every sensitive value using FHE before it hits the chain. Smart contracts compare, add, and settle encrypted values. The plaintext never exists on-chain.

```
You bid $5,000          →  Encrypted in your browser (TFHE + ZK proof)
Smart contract runs     →  FHE.gt(newBid, highestBid) — computes on ciphertext
Winner determined       →  FHE.decrypt(winningBid) — only result revealed
Losing bids             →  Stay encrypted. Forever. Nobody ever sees them.
```

No trusted intermediary. No hardware enclaves. No commit-reveal. Pure math.

---

## Features

### 5 Auction Types

| Type | Mechanism | Privacy |
|------|-----------|---------|
| **Sealed Bid** | Highest bid wins. Anti-snipe timer. | Bids + reserve price encrypted forever |
| **Vickrey (2nd Price)** | Highest wins, pays 2nd price. Truthful bidding. | Both highest and 2nd tracked on ciphertext |
| **Dutch** | Price decays over time. Buy at current price. | Purchase amounts encrypted |
| **Batch Clearing** | Uniform price where supply meets demand. | Order volumes counted on ciphertext |
| **Overflow / Fixed** | Fixed price. Oversubscribed = pro-rata allocation. | Individual deposits encrypted |

### Private Payments

Send money to multiple recipients where each person sees only their own amount.

- Encrypted per-recipient amounts — nobody sees what anyone else got
- Reusable templates for recurring payroll
- Single-step claim — amount never decrypted on-chain (end-to-end encrypted)
- Payment history tracking

### OTC Desk

Private venue for large trades. No slippage. No front-running.

- Encrypted RFQ with hidden price range bounds
- Multi-quote competition (quoters blind to each other)
- Atomic settlement via shared encrypted vault
- Zero market impact

### Freelance Bidding

Clients post jobs. Freelancers bid encrypted prices. Lowest bid wins.

- Blind bidding — no undercutting
- Milestone-based escrow release
- 3-voter encrypted dispute resolution (votes private, majority computed on ciphertext)
- 14-day auto-release timer (Upwork-style protection)

### Infrastructure

| Component | Purpose |
|-----------|---------|
| **FHERC20 Token** | Encrypted balances. Built-in faucet. |
| **Settlement Vault** | Shared encrypted balance ledger. All features settle through here. |
| **Token Vesting** | Cliff + linear unlock with encrypted amounts. On-chain enforcement. |
| **Merkle Allowlists** | Whitelist-gated launches. KYC, NFT-holder, VIP rounds. |
| **FHE Referrals** | Referrer earns % without identity linked on-chain. |
| **Claim NFT (ERC721)** | Tradeable positions. Winner sells claim before maturity. |
| **Encrypted Reputation** | Composable credit bureau API. Other contracts query without seeing scores. |

---

## What's New — Innovations That Don't Exist Anywhere Else

### Blind Floor Auction

In every auction system ever built, the seller's reserve price is eventually revealed. In CipherDEX, the reserve is encrypted with FHE and **never decrypted**. Bidders cannot calculate the floor — they must bid their true value. This is a new game-theoretic equilibrium only possible with FHE.

### Encrypted Dispute Resolution

When a freelance milestone is disputed, 3 community voters submit encrypted votes (1 = approve, 0 = reject). The contract computes `FHE.add(vote1 + vote2 + vote3)` on ciphertext, decrypts only the sum. If >= 2, freelancer wins. Individual votes stay encrypted forever. No peer pressure. No retaliation.

### Cross-Feature Encrypted Flow

One vault. Four features. Zero plaintext touchpoints. Deposit once → bid on auction → win tokens → trade OTC → pay developer — all on encrypted balances that never touch plaintext between features.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                     CipherDEX Protocol                  │
│                                                         │
│  Core Infrastructure                                    │
│  ├── ConfidentialToken (FHERC20 + faucet)              │
│  ├── SettlementVault (encrypted balance ledger)         │
│  ├── PlatformRegistry (users, fees, pause)              │
│  ├── AuctionClaim (ERC721 tradeable positions)          │
│  ├── TokenVesting (cliff + linear, encrypted)           │
│  ├── AllowlistGate (Merkle whitelist)                   │
│  ├── Referrals (FHE-private earnings)                   │
│  └── Reputation (composable credit bureau)              │
│                                                         │
│  Token Launch (5 auction types)                         │
│  ├── SealedAuction (1st price + anti-snipe)            │
│  ├── VickreyAuction (2nd price)                         │
│  ├── DutchAuction (descending price)                    │
│  ├── BatchAuction (uniform clearing)                    │
│  └── OverflowSale (fixed price + pro-rata)             │
│                                                         │
│  Finance                                                │
│  ├── PrivatePayments (encrypted splits)                 │
│  ├── OTCBoard (whale trading)                           │
│  └── FreelanceBidding (blind bids + milestones)         │
│                                                         │
│  Trading                                                │
│  ├── OrderBook (P2P matching)                           │
│  ├── Escrow (encrypted term verification)               │
│  └── LimitOrderEngine (private triggers)                │
│                                                         │
│  Analytics                                              │
│  └── PortfolioTracker (encrypted valuation)             │
└────────────────────────────────────────────────────────┘
```

---

## Deployed Contracts

All 20 contracts deployed and verified on **Ethereum Sepolia (11155111)**.

| Contract | Address | Etherscan |
|----------|---------|-----------|
| ConfidentialToken | `0xd5524d...C8297` | [View](https://sepolia.etherscan.io/address/0xd5524d656477E803a6BE96b5C044CdBb492C8297#code) |
| PlatformRegistry | `0xC4b6BB...438f` | [View](https://sepolia.etherscan.io/address/0xC4b6BB51F81eAd8dd65C6Aa26865f4793B2A438f#code) |
| SettlementVault | `0xa5f512...71Cd` | [View](https://sepolia.etherscan.io/address/0xa5f512e526aE4E7CBd5e6f4593396d7fcaeE71Cd#code) |
| AuctionClaim | `0x9c95BE...c51c` | [View](https://sepolia.etherscan.io/address/0x9c95BEE65C81e1508b37e3f2c240dB65A508c51c#code) |
| SealedAuction | `0x9F1519...2f60` | [View](https://sepolia.etherscan.io/address/0x9F15192dA0520EB7256cDc04730D65D627E92f60#code) |
| VickreyAuction | `0x04270b...570e` | [View](https://sepolia.etherscan.io/address/0x04270b991B3a9aF98EEc50ee1cadA40Eabc3570e#code) |
| DutchAuction | `0x44A04f...4845` | [View](https://sepolia.etherscan.io/address/0x44A04fFd7B3F14F279f3F8cEc530C2A21cb04845#code) |
| BatchAuction | `0x450331...0106` | [View](https://sepolia.etherscan.io/address/0x4503315aD5993647212cd577A3B000053cd90106#code) |
| OverflowSale | `0x6f5348...aA27` | [View](https://sepolia.etherscan.io/address/0x6f5348fF3C725C2DD34E353F1B35d3AE778baA27#code) |
| PrivatePayments | `0x04F8b0...2E34` | [View](https://sepolia.etherscan.io/address/0x04F8b006A299dfE677e108ebd616E2F21c722E34#code) |
| OTCBoard | `0xe64365...8c36` | [View](https://sepolia.etherscan.io/address/0xe643654be7792d0Ba957bc8CECbE74C1e2c28c36#code) |
| FreelanceBidding | `0xef9c5d...C0FA` | [View](https://sepolia.etherscan.io/address/0xef9c5d3457CcE981f9641213B81832272383C0FA#code) |
| OrderBook | `0xeAD0E2...27a2` | [View](https://sepolia.etherscan.io/address/0xeAD0E2a126E3121FCacEb50470AaD38B6F3027a2#code) |
| Escrow | `0x2019c9...050C` | [View](https://sepolia.etherscan.io/address/0x2019c9B7B045F782bD63ff7858d2e1fbA502050C#code) |
| LimitOrderEngine | `0x83B4Df...9878` | [View](https://sepolia.etherscan.io/address/0x83B4Df4CcE798a2Ec62Fed8445AdC0936bCF9878#code) |
| PortfolioTracker | `0x9e3139...7ffB` | [View](https://sepolia.etherscan.io/address/0x9e3139C53c66dfAcd80a6c9f1E78B45939467ffB#code) |
| Reputation | `0x23e5Dd...73EB` | [View](https://sepolia.etherscan.io/address/0x23e5DdcaF6946123769BBe32BA0Fd6eDd7A973EB#code) |
| TokenVesting | `0x920ee2...18Dc` | [View](https://sepolia.etherscan.io/address/0x920ee2B93b1C7316811D8aC78F85bbA8bB8518Dc#code) |
| AllowlistGate | `0x0579B8...C296` | [View](https://sepolia.etherscan.io/address/0x0579B82D5d0F35Ca76DDC0E384D96DfE589fC296#code) |
| Referrals | `0xc7c63B...BC3D` | [View](https://sepolia.etherscan.io/address/0xc7c63B43365997F02077188c664DE1a33Db3BC3D#code) |

---

## Security

| Layer | Approach |
|-------|----------|
| **Privacy** | `FHE.select()` over `require()` — a revert leaks 1 bit. Enough reverts reconstruct a balance. CipherDEX never reverts on encrypted conditions. |
| **Encryption** | Every encrypted input is ZK-verified and signed by the CoFHE threshold network |
| **Access Control** | 4-tier FHE permit system: `allowThis` → `allowSender` → `allow` → `allowTransient` |
| **Contracts** | ReentrancyGuard on all state-changing functions. AccessControl for role-based permissions. |
| **Zero-Replacement** | Insufficient balance = transfer 0, not revert. Constant-time execution. |
| **Anti-Snipe** | Late bids extend auction deadline. Prevents last-second MEV. |
| **Emergency** | 7-day timeout on stuck decryption. Funds always recoverable. |
| **Auto-Release** | 14-day silence on freelance milestones = auto-release to freelancer. |

## FHE Operations Used

22+ distinct operations across 20 contracts:

`asEuint8` `asEuint64` `asEuint128` `asEaddress` `asEbool` `gt` `gte` `lt` `lte` `eq` `max` `min` `and` `or` `select` `add` `sub` `mul` `div` `decrypt` `allowThis` `allow` `allowTransient`

Each operation serves a clear purpose in business logic. Not padding.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Chain** | Ethereum Sepolia (11155111) |
| **Contracts** | Solidity 0.8.25, `@fhenixprotocol/cofhe-contracts`, OpenZeppelin |
| **FHE** | Fhenix CoFHE SDK, TFHE WASM, threshold decryption |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion |
| **Wallet** | ethers.js v6, MetaMask |
| **Testing** | Hardhat, Chai, CoFHE mock environment |
| **Deployment** | Vercel (frontend), Hardhat (contracts) |

---

## Getting Started

**Use the app:**

Visit [cipher-dex.vercel.app](https://cipher-dex.vercel.app), connect MetaMask on Sepolia, get test tokens from faucet, and start trading.

**Run locally:**

```bash
git clone https://github.com/Ritik200238/CipherDEX.git
cd CipherDEX

# Contracts
npm install
npx hardhat compile
npx hardhat test

# Frontend
cd frontend
npm install
npm run dev          # http://localhost:3000
```

**Deploy:**

```bash
cp .env.example .env
# Add PRIVATE_KEY and RPC URLs

npx hardhat run tasks/deploy-all.ts --network ethSepolia
npx hardhat run tasks/setup-permissions.ts --network ethSepolia
npx hardhat run tasks/verify-all.ts --network ethSepolia
```

---

## Testing

19 test files. 368 tests passing.

```bash
npx hardhat test
```

Covers: all auction types, private payments, freelance bidding with milestones + disputes, vesting, allowlists, referrals, settlement vault, reputation, token operations.

---

## License

MIT
