"use client";

import { WalletConnect } from "@/components/shared/WalletConnect";
import { FaucetButton } from "@/components/shared/FaucetButton";
import { FHENIX_TESTNET } from "@/lib/constants";
import { useWallet } from "@/providers/WalletProvider";
import { Globe } from "lucide-react";

/**
 * Top navigation bar with wallet connection, network indicator, and faucet button.
 * Sits to the right of the sidebar.
 */
export function Navbar() {
  const { isCorrectChain, account } = useWallet();

  return (
    <header
      className="fixed top-0 left-64 right-0 h-16
                 bg-[#0d0e1a]/80 backdrop-blur-md border-b border-purple-500/10
                 flex items-center justify-between px-6
                 z-30"
    >
      {/* Left: Network indicator */}
      <div className="flex items-center gap-3">
        {account && (
          <div className="flex items-center gap-2 text-xs">
            <Globe size={14} className="text-gray-500" />
            <span
              className={
                isCorrectChain ? "text-emerald-400" : "text-amber-400"
              }
            >
              {isCorrectChain ? FHENIX_TESTNET.name : "Wrong Network"}
            </span>
          </div>
        )}
      </div>

      {/* Right: Faucet + Wallet */}
      <div className="flex items-center gap-4">
        <FaucetButton />
        <WalletConnect />
      </div>
    </header>
  );
}
