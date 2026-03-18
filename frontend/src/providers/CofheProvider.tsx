"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useWallet } from "./WalletProvider";

/* ---------- Types ---------- */

interface CofheState {
  /** Whether cofhejs has been initialized for the current signer */
  initialized: boolean;
  /** Initialization is in progress */
  initializing: boolean;
  /** Last initialization error */
  error: string | null;
}

interface CofheContextValue extends CofheState {
  /** Re-initialize (e.g. after account switch) */
  reinitialize: () => Promise<void>;
}

const CofheContext = createContext<CofheContextValue | null>(null);

/* ---------- Provider ---------- */

export function CofheProvider({ children }: { children: React.ReactNode }) {
  const { provider, signer, account, isCorrectChain } = useWallet();

  const [initialized, setInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which account we initialized for so we re-init on switch
  const initializedForRef = useRef<string | null>(null);

  const doInit = useCallback(async () => {
    if (!provider || !signer || !account || !isCorrectChain) {
      setInitialized(false);
      return;
    }

    // Already initialized for this account
    if (initializedForRef.current === account && initialized) return;

    setInitializing(true);
    setError(null);

    try {
      // Dynamic import — cofhejs/web includes WASM and must only run client-side
      const { cofhejs } = await import("cofhejs/web");

      const result = await cofhejs.initializeWithEthers({
        ethersProvider: provider,
        ethersSigner: signer,
        environment: "TESTNET",
      });

      if (result.error) {
        throw new Error(String(result.error));
      }

      initializedForRef.current = account;
      setInitialized(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "cofhejs initialization failed";
      setError(message);
      setInitialized(false);
    } finally {
      setInitializing(false);
    }
  }, [provider, signer, account, isCorrectChain, initialized]);

  // Auto-initialize when wallet connects or account changes
  useEffect(() => {
    if (account && isCorrectChain && !initialized && !initializing) {
      doInit();
    }
  }, [account, isCorrectChain, initialized, initializing, doInit]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!account) {
      setInitialized(false);
      setError(null);
      initializedForRef.current = null;
    }
  }, [account]);

  // Auto-rotate permit every 23 hours (permits last 24h)
  useEffect(() => {
    if (!initialized || !account) return;

    const interval = setInterval(async () => {
      try {
        const { cofhejs } = await import("cofhejs/web");
        await cofhejs.createPermit({ type: "self", issuer: account });
      } catch {
        // Permit refresh failed — will retry on next interval or next unseal
      }
    }, 23 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initialized, account]);

  const value = useMemo<CofheContextValue>(
    () => ({
      initialized,
      initializing,
      error,
      reinitialize: doInit,
    }),
    [initialized, initializing, error, doInit],
  );

  return <CofheContext.Provider value={value}>{children}</CofheContext.Provider>;
}

/* ---------- Hook ---------- */

export function useCofheContext(): CofheContextValue {
  const ctx = useContext(CofheContext);
  if (!ctx) {
    throw new Error("useCofheContext must be used within a CofheProvider");
  }
  return ctx;
}
