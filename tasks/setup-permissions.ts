import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json", "utf8"));
  const [deployer] = await ethers.getSigners();
  console.log("Setting up permissions with:", deployer.address);

  const vault = await ethers.getContractAt("SettlementVault", addresses.SettlementVault);
  const registry = await ethers.getContractAt("PlatformRegistry", addresses.PlatformRegistry);
  const token = await ethers.getContractAt("ConfidentialToken", addresses.ConfidentialToken);
  const reputation = await ethers.getContractAt("Reputation", addresses.Reputation);

  // Check which settlers are already authorized
  const settlers = [
    { name: "OrderBook", addr: addresses.OrderBook },
    { name: "SealedAuction", addr: addresses.SealedAuction },
    { name: "Escrow", addr: addresses.Escrow },
    { name: "LimitOrderEngine", addr: addresses.LimitOrderEngine },
    { name: "BatchAuction", addr: addresses.BatchAuction },
    { name: "OTCBoard", addr: addresses.OTCBoard },
  ];

  for (const s of settlers) {
    const isAuth = await vault.authorizedSettlers(s.addr);
    if (!isAuth) {
      const tx = await vault.addAuthorizedSettler(s.addr);
      await tx.wait();
      console.log(`Authorized ${s.name} as settler`);
    } else {
      console.log(`${s.name} already authorized`);
    }
  }

  // Register all contracts
  const contracts = [
    addresses.OrderBook, addresses.SealedAuction, addresses.Escrow,
    addresses.LimitOrderEngine, addresses.BatchAuction, addresses.PortfolioTracker,
    addresses.Reputation, addresses.OTCBoard,
  ];
  for (const addr of contracts) {
    const isReg = await registry.registeredContracts(addr);
    if (!isReg) {
      const tx = await registry.registerContract(addr);
      await tx.wait();
      console.log(`Registered contract ${addr.slice(0, 10)}...`);
    }
  }

  // Set vault as token operator
  const isOp = await token.isOperator(deployer.address, addresses.SettlementVault);
  if (!isOp) {
    const tx = await token.setOperator(addresses.SettlementVault, (2n ** 48n) - 1n);
    await tx.wait();
    console.log("Set vault as token operator");
  } else {
    console.log("Vault already operator");
  }

  // Authorize reputation callers
  const repCallers = [addresses.OrderBook, addresses.SealedAuction, addresses.Escrow, addresses.OTCBoard];
  for (const addr of repCallers) {
    try {
      const tx = await reputation.addAuthorizedCaller(addr);
      await tx.wait();
      console.log(`Reputation: authorized ${addr.slice(0, 10)}...`);
    } catch {
      console.log(`Reputation: ${addr.slice(0, 10)}... already authorized or error`);
    }
  }

  console.log("\n✓ All permissions set!");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
