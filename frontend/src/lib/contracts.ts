/**
 * Contract ABIs and factory functions for CipherDEX.
 *
 * ABIs are copied from Hardhat artifacts via `node copy-abis.js`.
 * Run that script after recompiling contracts to keep these in sync.
 * Deployed addresses come from constants.ts — update those after deployment.
 */
import { ethers } from "ethers";
import { CONTRACTS, type ContractName } from "./constants";

/* ---------- ABI imports (local copies, avoids # in parent path) ---------- */

import ConfidentialTokenAbi from "./abis/ConfidentialToken.json";
import SettlementVaultAbi from "./abis/SettlementVault.json";
import PlatformRegistryAbi from "./abis/PlatformRegistry.json";
import OrderBookAbi from "./abis/OrderBook.json";
import SealedAuctionAbi from "./abis/SealedAuction.json";
import EscrowAbi from "./abis/Escrow.json";
import LimitOrderEngineAbi from "./abis/LimitOrderEngine.json";
import BatchAuctionAbi from "./abis/BatchAuction.json";
import PortfolioTrackerAbi from "./abis/PortfolioTracker.json";
import ReputationAbi from "./abis/Reputation.json";
import OTCBoardAbi from "./abis/OTCBoard.json";

/** Map contract names to their ABIs */
export const ABIS: Record<ContractName, ethers.InterfaceAbi> = {
  ConfidentialToken: ConfidentialTokenAbi as ethers.InterfaceAbi,
  SettlementVault: SettlementVaultAbi as ethers.InterfaceAbi,
  PlatformRegistry: PlatformRegistryAbi as ethers.InterfaceAbi,
  OrderBook: OrderBookAbi as ethers.InterfaceAbi,
  SealedAuction: SealedAuctionAbi as ethers.InterfaceAbi,
  Escrow: EscrowAbi as ethers.InterfaceAbi,
  LimitOrderEngine: LimitOrderEngineAbi as ethers.InterfaceAbi,
  BatchAuction: BatchAuctionAbi as ethers.InterfaceAbi,
  PortfolioTracker: PortfolioTrackerAbi as ethers.InterfaceAbi,
  Reputation: ReputationAbi as ethers.InterfaceAbi,
  OTCBoard: OTCBoardAbi as ethers.InterfaceAbi,
};

/**
 * Create an ethers.Contract instance for a named CipherDEX contract.
 * Uses a read-only provider if no signer is given.
 */
export function getContract(
  name: ContractName,
  signerOrProvider: ethers.Signer | ethers.Provider,
): ethers.Contract {
  const address = CONTRACTS[name];
  if (address === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      `Contract "${name}" has not been deployed yet. Update CONTRACTS in constants.ts with the deployed address.`,
    );
  }
  return new ethers.Contract(address, ABIS[name], signerOrProvider);
}

/**
 * Create a read-only contract instance connected to a provider.
 */
export function getReadContract(
  name: ContractName,
  provider: ethers.Provider,
): ethers.Contract {
  return getContract(name, provider);
}
