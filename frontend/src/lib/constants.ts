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
  ConfidentialToken: "0xd5524d656477E803a6BE96b5C044CdBb492C8297",
  PlatformRegistry: "0xC4b6BB51F81eAd8dd65C6Aa26865f4793B2A438f",
  SettlementVault: "0xa5f512e526aE4E7CBd5e6f4593396d7fcaeE71Cd",
  OrderBook: "0xeAD0E2a126E3121FCacEb50470AaD38B6F3027a2",
  AuctionClaim: "0x9c95BEE65C81e1508b37e3f2c240dB65A508c51c",
  SealedAuction: "0x9F15192dA0520EB7256cDc04730D65D627E92f60",
  Escrow: "0x2019c9B7B045F782bD63ff7858d2e1fbA502050C",
  LimitOrderEngine: "0x83B4Df4CcE798a2Ec62Fed8445AdC0936bCF9878",
  BatchAuction: "0x4503315aD5993647212cd577A3B000053cd90106",
  PortfolioTracker: "0x9e3139C53c66dfAcd80a6c9f1E78B45939467ffB",
  Reputation: "0x23e5DdcaF6946123769BBe32BA0Fd6eDd7A973EB",
  OTCBoard: "0xe643654be7792d0Ba957bc8CECbE74C1e2c28c36",
  PrivatePayments: "0x04F8b006A299dfE677e108ebd616E2F21c722E34",
  FreelanceBidding: "0xef9c5d3457CcE981f9641213B81832272383C0FA",
  VickreyAuction: "0x04270b991B3a9aF98EEc50ee1cadA40Eabc3570e",
  DutchAuction: "0x44A04fFd7B3F14F279f3F8cEc530C2A21cb04845",
  OverflowSale: "0x6f5348fF3C725C2DD34E353F1B35d3AE778baA27",
  TokenVesting: "0x920ee2B93b1C7316811D8aC78F85bbA8bB8518Dc",
  AllowlistGate: "0x0579B82D5d0F35Ca76DDC0E384D96DfE589fC296",
  Referrals: "0xc7c63B43365997F02077188c664DE1a33Db3BC3D",
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
  { label: "Dashboard", href: "/", icon: "LayoutDashboard", group: "Overview" },
  { label: "Sealed", href: "/auctions", icon: "Gavel", group: "Token Launch" },
  { label: "Vickrey", href: "/vickrey", icon: "Eye", group: "Token Launch" },
  { label: "Dutch", href: "/dutch", icon: "TrendingDown", group: "Token Launch" },
  { label: "Batch", href: "/batch", icon: "Layers", group: "Token Launch" },
  { label: "Overflow", href: "/overflow", icon: "Droplets", group: "Token Launch" },
  { label: "Payments", href: "/payments", icon: "CreditCard", group: "Finance" },
  { label: "Freelance", href: "/freelance", icon: "Briefcase", group: "Finance" },
  { label: "Trade", href: "/trade", icon: "ArrowLeftRight", group: "Trading" },
  { label: "OTC", href: "/otc", icon: "Users", group: "Trading" },
  { label: "Escrow", href: "/escrow", icon: "ShieldCheck", group: "Trading" },
  { label: "Limits", href: "/limits", icon: "Target", group: "Trading" },
  { label: "Portfolio", href: "/portfolio", icon: "PieChart", group: "Analytics" },
  { label: "Reputation", href: "/reputation", icon: "Star", group: "Analytics" },
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
