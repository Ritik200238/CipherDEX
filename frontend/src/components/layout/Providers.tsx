"use client";

import { WalletProvider } from "@/providers/WalletProvider";
import { CofheProvider } from "@/providers/CofheProvider";

/**
 * Client-side provider tree. Wraps the entire app with wallet and FHE contexts.
 * Kept separate from layout.tsx so the root layout can remain a server component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <CofheProvider>{children}</CofheProvider>
    </WalletProvider>
  );
}
