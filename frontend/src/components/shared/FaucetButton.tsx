"use client";

import { useState, useCallback } from "react";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/providers/WalletProvider";
import { Droplets, Loader2, Check, AlertCircle } from "lucide-react";

type FaucetStatus = "idle" | "pending" | "confirming" | "success" | "error";

/**
 * One-click faucet button that calls ConfidentialToken.faucet().
 * Visible on every page so judges never have to hunt for test tokens.
 */
export function FaucetButton() {
  const { account, isCorrectChain } = useWallet();
  const tokenContract = useContract("ConfidentialToken");

  const [status, setStatus] = useState<FaucetStatus>("idle");
  const [message, setMessage] = useState("");

  const handleFaucet = useCallback(async () => {
    if (!tokenContract || !account) return;

    setStatus("pending");
    setMessage("");

    try {
      const tx = await tokenContract.faucet();
      setStatus("confirming");

      await tx.wait();

      setStatus("success");
      setMessage("Tokens received!");

      // Reset after a few seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 4000);
    } catch (err: unknown) {
      setStatus("error");
      const errorMsg = err instanceof Error ? err.message : "Faucet request failed";
      // Extract a user-friendly portion
      if (errorMsg.includes("user rejected")) {
        setMessage("Transaction rejected");
      } else {
        setMessage("Faucet failed — try again");
      }
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 4000);
    }
  }, [tokenContract, account]);

  // Don't render if wallet is not connected or wrong chain
  if (!account || !isCorrectChain) return null;

  const isDisabled = status === "pending" || status === "confirming" || !tokenContract;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleFaucet}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
          ${
            status === "success"
              ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-300"
              : status === "error"
                ? "bg-red-600/20 border border-red-500/40 text-red-300"
                : "bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 hover:border-cyan-500/50"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {status === "pending" || status === "confirming" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : status === "success" ? (
          <Check size={14} />
        ) : status === "error" ? (
          <AlertCircle size={14} />
        ) : (
          <Droplets size={14} />
        )}
        {status === "pending"
          ? "Sending..."
          : status === "confirming"
            ? "Confirming..."
            : status === "success"
              ? "Received!"
              : status === "error"
                ? "Failed"
                : "Get Test Tokens"}
      </button>
      {message && (
        <span
          className={`text-xs ${
            status === "success" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
