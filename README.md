# CipherDEX — Confidential P2P Trading Protocol

**The first fully encrypted peer-to-peer trading protocol on Fhenix FHE.**

Every order price, bid amount, escrow term, limit trigger, portfolio balance, and reputation score is encrypted on-chain. CipherDEX computes matches, enforces conditions, and settles trades — all on data nobody can see.

No pools. No AMMs. Direct wallet-to-wallet settlement via encrypted FHERC20 tokens.

---

## Why FHE is Foundational

Remove FHE and the entire protocol breaks:

| Feature | FHE Operation | What Breaks Without It |
|---------|--------------|----------------------|
| P2P Matching | `FHE.gte(takerPrice, makerPrice)` | Prices are public → front-runnable |
| Sealed Auctions | `FHE.gt()` + `FHE.max()` | Bids visible → trivial gaming |
| Escrow | `FHE.eq(deposit, terms)` | Deal terms exposed on-chain |
| Limit Orders | `FHE.lte(oracle, trigger)` | Triggers visible → MEV exploitation |
| Batch Clearing | `FHE.add()` + `FHE.gte()` | Price manipulation possible |
| Portfolio | `FHE.mul()` + `FHE.add()` | Whale positions visible |
| Reputation | `FHE.add()` + `FHE.div()` | Individual ratings exposed |
| OTC | `FHE.gte()` + `FHE.lte()` | Large orders move market |

**14+ distinct FHE operations** used meaningfully in core business logic across 8 features.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Trading  │ │ Auction  │ │  Escrow  │ │Portfolio │ │   OTC    │ │
│  │Dashboard │ │  House   │ │  Center  │ │ Tracker  │ │  Board   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       └──────────┬──┴──────────┬┴────────────┬┴────────────┘       │
│            ┌─────┴──────┐ ┌────┴─────┐ ┌─────┴──────┐              │
│            │  cofhejs   │ │ ethers/  │ │  Permit    │              │
│            │ (encrypt)  │ │  viem    │ │  Manager   │              │
│            └─────┬──────┘ └────┬─────┘ └─────┬──────┘              │
└──────────────────┼─────────────┼─────────────┼─────────────────────┘
                   │             │             │
═══════════════════╪═════════════╪═════════════╪══════ EVM CHAIN ═════
                   ▼             ▼             ▼
   ┌──────────────────────────────────────────────────┐
   │         SettlementVault.sol (Central Custody)     │
   │  Encrypted balance ledger • FHERC20 settlement    │
   └──┬──────┬───────┬───────┬───────┬───────┬───┬────┘
      │      │       │       │       │       │   │
   ┌──┴──┐┌──┴───┐┌──┴──┐┌──┴───┐┌──┴───┐┌──┴┐┌─┴──┐
   │Order││Sealed││Escro││Limit ││Batch ││OTC││Rep │
   │Book ││Auctn ││  w  ││Order ││Auctn ││Brd││    │
   └─────┘└──────┘└─────┘└──────┘└──────┘└───┘└────┘
```

### Key Design Decision: SettlementVault Pattern

All 8 feature contracts settle through a single **SettlementVault**. Feature contracts never hold tokens directly — they instruct the vault to move funds. This gives us:
- **One audit surface** for token custody
- **One ACL setup** for user balances
- **Replaceable features** without migrating funds

---

## Privacy Model

| Data | Encrypted? | Who Sees It | How |
|------|-----------|-------------|-----|
| Order prices | `euint128` | Owner only | `cofhejs.unseal()` |
| Auction bids | `euint128` | Bidder only | `cofhejs.unseal()` |
| Winning bid | Decrypted | Everyone | `FHE.decrypt()` after close |
| Escrow terms | `euint128` | Both parties | `FHE.allow()` to each |
| Limit triggers | `euint128` | Owner only | `cofhejs.unseal()` |
| Portfolio balances | `euint64` | Owner only | `cofhejs.unseal()` |
| Individual ratings | `euint8` | Nobody | Used only in aggregation |
| OTC amounts | `euint128` | Requester only | `cofhejs.unseal()` |
| Token pairs, amounts, deadlines | Plaintext | Everyone | Needed for discoverability |

**Rule**: On-chain `FHE.decrypt()` makes data PUBLIC. Private data uses off-chain `cofhejs.unseal()` with permits.

---

## The 8 Features

### CORE: P2P Encrypted Order Matching
Makers post sell orders with encrypted prices (`euint128`). Takers submit their encrypted buy price. `FHE.gte(takerPrice, makerPrice)` determines if there's a match — nobody sees either price. Settlement via FHERC20 through the SettlementVault. Supports partial fills.

### 1. Sealed-Bid Auctions + Anti-Snipe
Seller lists tokens. Bidders submit encrypted bids. `FHE.gt()` + `FHE.max()` track the highest bid without revealing any individual bids. Anti-snipe: late bids extend the deadline (bid amounts stay hidden). Async 2-step: close → reveal → settle.

### 2. Encrypted Escrow
Two parties agree off-chain. Both deposit with encrypted terms. `FHE.eq()` verifies deposits match agreed amounts. Match → auto-release. Mismatch → refund. Nobody on-chain sees the deal terms.

### 3. Private Limit Orders
Users set encrypted trigger prices. A manual oracle pushes plaintext prices. `FHE.lte(oraclePrice, encryptedTrigger)` checks if triggered. MEV bots can't front-run because the trigger price is hidden.

### 4. Batch Auction (Clearing Price)
Collects buy/sell orders over a time window (all prices encrypted). Computes a clearing price using a plaintext price ladder with `FHE.gte()` comparisons. Everyone trades at the same price — completely eliminates front-running.

### 5. Hidden Portfolio Tracker
Users track multiple token positions. `FHE.mul(balance, price)` + `FHE.add()` computes total portfolio value. Only the owner can unseal their total — nobody else sees holdings.

### 6. Reputation System (Non-Blocking)
After trades, parties rate each other (encrypted `euint8`, 1-5). `FHE.add()` accumulates scores, `FHE.div()` computes averages. Users see own reputation. Individual ratings are never exposed. Feature contracts emit events — if Reputation is down, trading continues.

### 7. Anti-Snipe Auction Timer
Bids in the last 60 seconds extend the deadline. Snipers see the extension (metadata) but NOT the bid amount. Sniping is pointless when you can't see what to outbid.

### 8. Private OTC Board
Users post requests with encrypted amounts and price ranges. Counterparties see requests exist but not sizes. `FHE.gte()` + `FHE.lte()` verify quotes are within range. Whales trade without moving the market.

---

## Smart Contract Reference

| Contract | Lines | Purpose | Key FHE Ops |
|----------|-------|---------|-------------|
| `ConfidentialToken` | 52 | FHERC20 token + testnet faucet | Inherits FHERC20 |
| `PlatformRegistry` | 143 | Users, fees, pause | None (admin) |
| `SettlementVault` | 190 | Central custody + encrypted settlement | add, sub, lte, select |
| `OrderBook` | 206 | P2P order matching | gte, select |
| `SealedAuction` | 265 | Sealed-bid + anti-snipe | gt, max, select, decrypt |
| `Escrow` | 240 | Encrypted term verification | eq, and, select |
| `LimitOrderEngine` | 230 | Private trigger orders | lte, gte, or, select |
| `BatchAuction` | 285 | Clearing price discovery | gte, lte, add, select, decrypt |
| `PortfolioTracker` | 136 | Portfolio valuation | mul, add |
| `Reputation` | 157 | Encrypted ratings | gte, lte, and, select, add, div |
| `OTCBoard` | 220 | Private whale trading | gte, lte, and, select |

**Total: 2,242 lines of Solidity across 16 files (11 contracts + 4 interfaces + 1 library)**

---

## Demo Instructions (5 Minutes)

### Prerequisites
- MetaMask browser extension
- Arbitrum Sepolia testnet configured
- Some Arbitrum Sepolia ETH ([faucet](https://faucet.arbitrum.io/))

### Steps

1. **Visit** the app (deployed URL)
2. **Connect** MetaMask wallet (Arbitrum Sepolia)
3. **Get tokens** — Click "Get Test Tokens" (mints 1000 CDEX)
4. **Deposit** — Go to Dashboard → Deposit tokens into the vault
5. **Trade** — Go to Trade → Fill a pre-existing sell order with your encrypted price
6. **Auction** — Go to Auctions → Place an encrypted bid on an active auction
7. **View balances** — Go to Portfolio → See your encrypted balance, click to unseal
8. **Check reputation** — Go to Reputation → See your trade count and rating

Each interaction follows: **Enter value → Encrypt (6-stage progress) → Confirm TX → Done**

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| FHE Contracts | `@fhenixprotocol/cofhe-contracts` | 0.1.0 |
| Confidential Tokens | `fhenix-confidential-contracts` | 0.2.0 |
| Client SDK | `cofhejs` | 0.3.1 |
| Hardhat Plugin | `cofhe-hardhat-plugin` | 0.3.1 |
| Smart Contracts | Solidity 0.8.25 | Cancun EVM |
| Dev Framework | Hardhat | 2.22+ |
| Frontend | Next.js 14 + React 18 | App Router |
| Wallet | ethers.js v6 | 6.13+ |
| Styling | Tailwind CSS + shadcn/ui | Latest |
| Deployment | Vercel (frontend) | — |

---

## Local Development

```bash
# Clone
git clone https://github.com/your-repo/cipherdex.git
cd cipherdex

# Install contracts dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests (mock FHE environment)
npx hardhat test

# Start frontend
cd frontend
npm install
npm run dev
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### Deploy to Testnet

```bash
# Arbitrum Sepolia (recommended)
npx hardhat run tasks/deploy-all.ts --network arbSepolia
```

---

## Market Opportunity

- **$500M+ lost to MEV annually** — CipherDEX eliminates front-running by encrypting order prices
- **$2T+ OTC market** — whales need privacy to trade without moving prices
- **Institutional demand** — funds and treasuries can't use transparent DEXs without leaking strategy
- **Every private trader is our user** — from retail avoiding sandwich attacks to DAOs managing treasury

---

## License

MIT
