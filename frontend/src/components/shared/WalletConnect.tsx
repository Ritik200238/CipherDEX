"use client";

import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import { Wallet, LogOut, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Wallet connection button with status indicators.
 * Shows: connect prompt | connecting spinner | wrong chain warning | connected address + FHE status
 */
export function WalletConnect() {
  const { account, connecting, isCorrectChain, error, connect, disconnect, switchToFhenix } =
    useWallet();
  const { initialized, initializing } = useCofhe();

  // Not connected
  if (!account) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={connect}
          disabled={connecting}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                     bg-gradient-to-r from-purple-600 to-blue-600 text-white
                     hover:from-purple-500 hover:to-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {connecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Wallet size={16} />
          )}
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && (
          <span className="text-xs text-red-400 max-w-48 truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  }

  // Connected but wrong chain
  if (!isCorrectChain) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={switchToFhenix}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                     bg-amber-600/20 border border-amber-500/40 text-amber-300
                     hover:bg-amber-600/30 transition-all duration-200"
        >
          <AlertTriangle size={16} />
          Switch to Fhenix
        </button>
        <button
          onClick={disconnect}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Disconnect"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  // Connected + correct chain
  const shortAddr = `${account.slice(0, 6)}...${account.slice(-4)}`;

  return (
    <div className="flex items-center gap-3">
      {/* FHE Status indicator */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            initialized
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
              : initializing
                ? "bg-amber-400 animate-pulse"
                : "bg-gray-500"
          }`}
        />
        <span className="text-xs text-gray-400">
          {initialized ? "FHE Ready" : initializing ? "Initializing FHE..." : "FHE Offline"}
        </span>
      </div>

      {/* Address chip */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2
                    glass text-sm font-mono text-gray-200"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        {shortAddr}
      </div>

      <button
        onClick={disconnect}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        title="Disconnect"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
