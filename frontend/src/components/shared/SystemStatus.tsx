"use client";

import { useState, useCallback } from "react";
import { Wifi, WifiOff, Shield, ShieldOff, Wallet, Lock, Unlock, Loader2 } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import { useUnseal } from "@/hooks/useUnseal";
import { useReadContract } from "@/hooks/useContract";

/**
 * Status bar showing wallet, FHE, network, and encrypted balance status.
 */
export function SystemStatus() {
  const { account, isCorrectChain, provider } = useWallet();
  const { initialized } = useCofhe();
  const { unseal, unsealing } = useUnseal();
  const tokenRead = useReadContract("ConfidentialToken");

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const handleUnsealBalance = useCallback(async () => {
    if (!tokenRead || !account) return;
    setBalanceLoading(true);
    try {
      const ctHash = await tokenRead.balanceOfEncrypted(account);
      const val = await unseal(BigInt(ctHash), 5); // euint64
      if (val !== null) {
        setBalance(val.toString());
      }
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [tokenRead, account, unseal]);

  return (
    <div className="flex items-center gap-3 text-[10px]">
      {/* Wallet */}
      <div className="flex items-center gap-1.5">
        <Wallet size={10} className={account ? "text-[var(--cipher-green)]" : "text-[var(--text-muted)]"} />
        <span className={account ? "text-[var(--cipher-green)]" : "text-[var(--text-muted)]"}>
          {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Disconnected"}
        </span>
      </div>

      <span className="text-[var(--text-muted)]">|</span>

      {/* FHE */}
      <div className="flex items-center gap-1.5">
        {initialized ? (
          <Shield size={10} className="text-[var(--cipher-violet)]" />
        ) : (
          <ShieldOff size={10} className="text-[var(--text-muted)]" />
        )}
        <span className={initialized ? "text-[var(--cipher-violet)]" : "text-[var(--text-muted)]"}>
          FHE {initialized ? "Ready" : "Pending"}
        </span>
      </div>

      <span className="text-[var(--text-muted)]">|</span>

      {/* Network */}
      <div className="flex items-center gap-1.5">
        {isCorrectChain ? (
          <Wifi size={10} className="text-[var(--cipher-cyan)]" />
        ) : (
          <WifiOff size={10} className="text-[var(--cipher-red)]" />
        )}
        <span className={isCorrectChain ? "text-[var(--cipher-cyan)]" : "text-[var(--cipher-red)]"}>
          {isCorrectChain ? "Connected" : "Wrong Network"}
        </span>
      </div>

      {/* Balance (only if connected) */}
      {account && (
        <>
          <span className="text-[var(--text-muted)]">|</span>
          <div className="flex items-center gap-1.5">
            {balance !== null ? (
              <>
                <Unlock size={10} className="text-[var(--cipher-green)]" />
                <span className="text-[var(--cipher-green)] font-mono-cipher">{balance} CDEX</span>
              </>
            ) : (
              <button
                onClick={handleUnsealBalance}
                disabled={unsealing || balanceLoading || !initialized}
                className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--cipher-violet)] transition-colors disabled:opacity-50"
              >
                {unsealing || balanceLoading ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Lock size={10} />
                )}
                <span>{unsealing || balanceLoading ? "Unsealing..." : "Show Balance"}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
