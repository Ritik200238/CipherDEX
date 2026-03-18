import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CipherDEX with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // ─── Step 1: Deploy ConfidentialToken (FHERC20) ───────────
  console.log("\n--- Step 1: ConfidentialToken ---");
  const Token = await ethers.getContractFactory("ConfidentialToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("ConfidentialToken deployed to:", tokenAddr);

  // ─── Step 2: Deploy PlatformRegistry ──────────────────────
  console.log("\n--- Step 2: PlatformRegistry ---");
  const Registry = await ethers.getContractFactory("PlatformRegistry");
  const registry = await Registry.deploy(
    deployer.address,  // admin
    50,                // 0.5% fee (50 basis points)
    deployer.address   // fee collector (deployer for testnet)
  );
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("PlatformRegistry deployed to:", registryAddr);

  // ─── Step 3: Deploy SettlementVault ───────────────────────
  console.log("\n--- Step 3: SettlementVault ---");
  const Vault = await ethers.getContractFactory("SettlementVault");
  const vault = await Vault.deploy(tokenAddr, registryAddr, deployer.address);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("SettlementVault deployed to:", vaultAddr);

  // ─── Step 4: Deploy Feature Contracts ─────────────────────
  console.log("\n--- Step 4: Feature Contracts ---");

  const OrderBook = await ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(vaultAddr, registryAddr);
  await orderBook.waitForDeployment();
  const orderBookAddr = await orderBook.getAddress();
  console.log("OrderBook deployed to:", orderBookAddr);

  const SealedAuction = await ethers.getContractFactory("SealedAuction");
  const auction = await SealedAuction.deploy(vaultAddr, registryAddr);
  await auction.waitForDeployment();
  const auctionAddr = await auction.getAddress();
  console.log("SealedAuction deployed to:", auctionAddr);

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(vaultAddr, registryAddr);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("Escrow deployed to:", escrowAddr);

  const LimitOrderEngine = await ethers.getContractFactory("LimitOrderEngine");
  const limitEngine = await LimitOrderEngine.deploy(vaultAddr, registryAddr, deployer.address);
  await limitEngine.waitForDeployment();
  const limitAddr = await limitEngine.getAddress();
  console.log("LimitOrderEngine deployed to:", limitAddr);

  const BatchAuction = await ethers.getContractFactory("BatchAuction");
  const batchAuction = await BatchAuction.deploy(vaultAddr, registryAddr, deployer.address);
  await batchAuction.waitForDeployment();
  const batchAddr = await batchAuction.getAddress();
  console.log("BatchAuction deployed to:", batchAddr);

  const PortfolioTracker = await ethers.getContractFactory("PortfolioTracker");
  const portfolio = await PortfolioTracker.deploy(vaultAddr);
  await portfolio.waitForDeployment();
  const portfolioAddr = await portfolio.getAddress();
  console.log("PortfolioTracker deployed to:", portfolioAddr);

  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy(registryAddr, deployer.address);
  await reputation.waitForDeployment();
  const reputationAddr = await reputation.getAddress();
  console.log("Reputation deployed to:", reputationAddr);

  const OTCBoard = await ethers.getContractFactory("OTCBoard");
  const otcBoard = await OTCBoard.deploy(vaultAddr, registryAddr);
  await otcBoard.waitForDeployment();
  const otcAddr = await otcBoard.getAddress();
  console.log("OTCBoard deployed to:", otcAddr);

  // ─── Step 5: Set Vault Permissions ────────────────────────
  console.log("\n--- Step 5: Vault Permissions ---");

  // Authorize feature contracts as settlers
  await vault.addAuthorizedSettler(orderBookAddr);
  console.log("Authorized OrderBook as settler");

  await vault.addAuthorizedSettler(auctionAddr);
  console.log("Authorized SealedAuction as settler");

  await vault.addAuthorizedSettler(escrowAddr);
  console.log("Authorized Escrow as settler");

  await vault.addAuthorizedSettler(limitAddr);
  console.log("Authorized LimitOrderEngine as settler");

  await vault.addAuthorizedSettler(batchAddr);
  console.log("Authorized BatchAuction as settler");

  await vault.addAuthorizedSettler(otcAddr);
  console.log("Authorized OTCBoard as settler");

  // ─── Step 6: Register Feature Contracts ───────────────────
  console.log("\n--- Step 6: Registry ---");

  await registry.registerContract(orderBookAddr);
  await registry.registerContract(auctionAddr);
  await registry.registerContract(escrowAddr);
  await registry.registerContract(limitAddr);
  await registry.registerContract(batchAddr);
  await registry.registerContract(portfolioAddr);
  await registry.registerContract(reputationAddr);
  await registry.registerContract(otcAddr);
  console.log("Registered all feature contracts");

  // ─── Step 7: Set Token Operator (Vault) ───────────────────
  console.log("\n--- Step 7: Token Operator ---");

  // Allow vault to transfer tokens on behalf of users
  // max uint48 expiration = no expiry
  await token.setOperator(vaultAddr, (2n ** 48n) - 1n);
  console.log("Set vault as token operator");

  // ─── Step 8: Authorize Reputation Callers ─────────────────
  console.log("\n--- Step 8: Reputation Callers ---");

  await reputation.addAuthorizedCaller(orderBookAddr);
  await reputation.addAuthorizedCaller(auctionAddr);
  await reputation.addAuthorizedCaller(escrowAddr);
  await reputation.addAuthorizedCaller(otcAddr);
  console.log("Authorized feature contracts to record trades");

  // ─── Summary ──────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║           CipherDEX Deployment Complete          ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║ ConfidentialToken:  ${tokenAddr}`);
  console.log(`║ PlatformRegistry:   ${registryAddr}`);
  console.log(`║ SettlementVault:    ${vaultAddr}`);
  console.log(`║ OrderBook:          ${orderBookAddr}`);
  console.log(`║ SealedAuction:      ${auctionAddr}`);
  console.log(`║ Escrow:             ${escrowAddr}`);
  console.log(`║ LimitOrderEngine:   ${limitAddr}`);
  console.log(`║ BatchAuction:       ${batchAddr}`);
  console.log(`║ PortfolioTracker:   ${portfolioAddr}`);
  console.log(`║ Reputation:         ${reputationAddr}`);
  console.log(`║ OTCBoard:           ${otcAddr}`);
  console.log("╚══════════════════════════════════════════════════╝");

  // Write addresses to file for frontend consumption
  const addresses = {
    ConfidentialToken: tokenAddr,
    PlatformRegistry: registryAddr,
    SettlementVault: vaultAddr,
    OrderBook: orderBookAddr,
    SealedAuction: auctionAddr,
    Escrow: escrowAddr,
    LimitOrderEngine: limitAddr,
    BatchAuction: batchAddr,
    PortfolioTracker: portfolioAddr,
    Reputation: reputationAddr,
    OTCBoard: otcAddr,
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nAddresses written to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
