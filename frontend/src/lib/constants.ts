/**
 * Chain and contract configuration for CipherDEX on Fhenix.
 * Addresses are placeholders until deployment — update them after `npx hardhat deploy`.
 */

export const FHENIX_TESTNET = {
  chainId: 11155111,
  chainIdHex: "0xaa36a7",
  name: "Ethereum Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  blockExplorer: "https://sepolia.etherscan.io",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "ETH",
    decimals: 18,
  },
} as const;

/** Deployed contract addresses — Ethereum Sepolia */
export const CONTRACTS = {
  ConfidentialToken: "0x4F01e01649B5C174122065002e3abbC0a8d057B4",
  PlatformRegistry: "0x8e2d01c280839c21902405EEee037be51bBf29C3",
  SettlementVault: "0x0F7843fb5474aE806037A39EB56dF5e54B7AdC35",
  OrderBook: "0x4d054a38d60Ea29E33806f619DC6A0f5994D9135",
  SealedAuction: "0x5526C1e86a5c28c0e503dc5a45cCdb3487a7CDaf",
  Escrow: "0x582CB8E3E395Fb8571D204CfA2C8F1391bA65ADE",
  LimitOrderEngine: "0x532d003b31716568bf3A684c0a2c39c12FED53E0",
  BatchAuction: "0x634b8bfAA78224e0e12594447DC0fB1481C3f687",
  PortfolioTracker: "0xBeE4D40bFb9Fcab8CB800b29713ef8fC9b2f5FcA",
  Reputation: "0xDBA2b69d6688dA2c9aDb637F18E06Af40a560D05",
  OTCBoard: "0xC312FbFA6AE09E5d7d19809D8ED3386b0e0750f8",
} satisfies Record<string, string>;

export type ContractName = keyof typeof CONTRACTS;

/** Token metadata */
export const TOKEN_CONFIG = {
  name: "CipherDEX Token",
  symbol: "CDEX",
  decimals: 18,
  faucetAmount: "1000", // Amount minted per faucet call (human-readable)
} as const;

/** Navigation routes */
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Trade", href: "/trade", icon: "ArrowLeftRight" },
  { label: "Auctions", href: "/auctions", icon: "Gavel" },
  { label: "Escrow", href: "/escrow", icon: "ShieldCheck" },
  { label: "Limit Orders", href: "/limits", icon: "Target" },
  { label: "Batch Auction", href: "/batch", icon: "Layers" },
  { label: "Portfolio", href: "/portfolio", icon: "PieChart" },
  { label: "OTC Board", href: "/otc", icon: "Users" },
  { label: "Reputation", href: "/reputation", icon: "Star" },
] as const;

/** Encryption stage labels for progress display */
export const ENCRYPT_STAGES = [
  { key: "extract", label: "Processing" },
  { key: "pack", label: "Processing" },
  { key: "prove", label: "Processing" },
  { key: "verify", label: "Processing" },
  { key: "replace", label: "Processing" },
  { key: "done", label: "Complete" },
] as const;

/** Polling / timeout config for async FHE operations */
export const FHE_ASYNC = {
  pollIntervalMs: 3000,
  timeoutMs: 60000,
} as const;
