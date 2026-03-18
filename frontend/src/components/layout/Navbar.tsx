"use client";

import { WalletConnect } from "@/components/shared/WalletConnect";
import { FaucetButton } from "@/components/shared/FaucetButton";
import { FHENIX_TESTNET } from "@/lib/constants";
import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import { Shield, Radio } from "lucide-react";

export function Navbar() {
  const { isCorrectChain, account } = useWallet();
  const { initialized } = useCofhe();

  return (
    <header
      className="fixed top-0 left-[68px] right-0 h-14
                 bg-[var(--void-0)]/80 backdrop-blur-xl
                 border-b border-[var(--border-subtle)]
                 flex items-center justify-between px-6
                 z-40"
    >
      {/* Left: Protocol status badges */}
      <div className="flex items-center gap-3">
        {account && (
          <>
            {/* Network badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--void-3)] border border-[var(--border-subtle)]">
              <div className={`w-1.5 h-1.5 rounded-full ${isCorrectChain ? "bg-[var(--cipher-green)]" : "bg-[var(--cipher-amber)]"}`} />
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                {isCorrectChain ? FHENIX_TESTNET.name : "Wrong Network"}
              </span>
            </div>

            {/* FHE status badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--void-3)] border border-[var(--border-subtle)]">
              <Shield size={10} className={initialized ? "text-[var(--cipher-violet)]" : "text-[var(--text-muted)]"} />
              <span className={`text-[11px] font-medium ${initialized ? "text-[var(--cipher-violet)]" : "text-[var(--text-muted)]"}`}>
                {initialized ? "FHE Active" : "FHE Offline"}
              </span>
              {initialized && (
                <Radio size={8} className="text-[var(--cipher-violet)] animate-pulse" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Faucet + Wallet */}
      <div className="flex items-center gap-3">
        <FaucetButton />
        <WalletConnect />
      </div>
    </header>
  );
}
