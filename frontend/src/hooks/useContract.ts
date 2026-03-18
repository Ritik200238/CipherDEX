"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/providers/WalletProvider";
import { getContract, getReadContract } from "@/lib/contracts";
import { CONTRACTS, type ContractName } from "@/lib/constants";

/**
 * Returns an ethers.Contract instance connected to the wallet signer (for write ops).
 * Returns null if the wallet is not connected or the contract is not deployed.
 */
export function useContract(name: ContractName): ethers.Contract | null {
  const { signer } = useWallet();

  return useMemo(() => {
    if (!signer) return null;
    if (CONTRACTS[name] === "0x0000000000000000000000000000000000000000") return null;

    try {
      return getContract(name, signer);
    } catch {
      return null;
    }
  }, [name, signer]);
}

/**
 * Returns a read-only ethers.Contract instance connected to the provider.
 * Returns null if no provider or contract is not deployed.
 */
export function useReadContract(name: ContractName): ethers.Contract | null {
  const { provider } = useWallet();

  return useMemo(() => {
    if (!provider) return null;
    if (CONTRACTS[name] === "0x0000000000000000000000000000000000000000") return null;

    try {
      return getReadContract(name, provider);
    } catch {
      return null;
    }
  }, [name, provider]);
}
