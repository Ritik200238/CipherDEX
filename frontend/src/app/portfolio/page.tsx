"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import {
  PieChart,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Calculator,
  Wallet,
  X,
} from "lucide-react";

interface TrackedToken {
  id: string;
  name: string;
  symbol: string;
  balance: string | null;
  revealed: boolean;
  percentage: number | null;
}

const AVAILABLE_TOKENS = [
  { name: "Confidential USDC", symbol: "cUSDC" },
  { name: "Confidential ETH", symbol: "cETH" },
  { name: "Confidential DAI", symbol: "cDAI" },
  { name: "Confidential WBTC", symbol: "cWBTC" },
  { name: "Confidential LINK", symbol: "cLINK" },
];

const TOKEN_COLORS = [
  "from-purple-500/20 to-purple-900/10 border-purple-500/20",
  "from-blue-500/20 to-blue-900/10 border-blue-500/20",
  "from-cyan-500/20 to-cyan-900/10 border-cyan-500/20",
  "from-pink-500/20 to-pink-900/10 border-pink-500/20",
  "from-emerald-500/20 to-emerald-900/10 border-emerald-500/20",
  "from-amber-500/20 to-amber-900/10 border-amber-500/20",
  "from-indigo-500/20 to-indigo-900/10 border-indigo-500/20",
  "from-orange-500/20 to-orange-900/10 border-orange-500/20",
  "from-red-500/20 to-red-900/10 border-red-500/20",
  "from-teal-500/20 to-teal-900/10 border-teal-500/20",
];

export default function PortfolioPage() {
  const { account } = useWallet();
  const [tokens, setTokens] = useState<TrackedToken[]>([]);
  const [showAddToken, setShowAddToken] = useState(false);
  const [totalRevealed, setTotalRevealed] = useState(false);

  const addToken = (symbol: string, name: string) => {
    if (tokens.length >= 10) return;
    if (tokens.find((t) => t.symbol === symbol)) return;
    setTokens([
      ...tokens,
      {
        id: `${symbol}-${Date.now()}`,
        name,
        symbol,
        balance: null,
        revealed: false,
        percentage: null,
      },
    ]);
    setShowAddToken(false);
  };

  const removeToken = (id: string) => {
    setTokens(tokens.filter((t) => t.id !== id));
  };

  const toggleBalance = (id: string) => {
    setTokens(tokens.map((t) => (t.id === id ? { ...t, revealed: !t.revealed } : t)));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center">
            <PieChart size={20} className="text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Hidden Portfolio</h1>
            <p className="text-sm text-gray-400">
              Encrypted token balances only you can see
            </p>
          </div>
        </div>
        {account && tokens.length < 10 && (
          <button
            onClick={() => setShowAddToken(!showAddToken)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600/20 border border-pink-500/30 text-pink-300 text-sm font-medium hover:bg-pink-600/30 transition-colors"
          >
            <Plus size={16} />
            Add Token
          </button>
        )}
      </div>

      {!account ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Lock size={32} className="text-pink-400/50 mx-auto" />
          <p className="text-gray-400 text-sm">Connect your wallet to view your encrypted portfolio</p>
        </div>
      ) : (
        <>
          {/* Total Value Card */}
          <div className="glass rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total Portfolio Value</p>
              {totalRevealed ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-100">$---.--</p>
                  <button onClick={() => setTotalRevealed(false)}>
                    <EyeOff size={16} className="text-gray-500 hover:text-gray-300 transition-colors" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setTotalRevealed(true)}
                  className="flex items-center gap-2 group"
                >
                  <Lock size={20} className="text-purple-400" />
                  <span className="text-lg font-semibold text-purple-300 group-hover:text-purple-200 transition-colors">
                    Click to view
                  </span>
                  <Eye size={16} className="text-purple-400" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium hover:from-purple-500 hover:to-cyan-500 transition-all">
                <Calculator size={14} />
                Compute Total Value
              </button>
            </div>
          </div>

          {/* Add Token Picker */}
          {showAddToken && (
            <div className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200">Select Token to Track</h3>
                <button onClick={() => setShowAddToken(false)}>
                  <X size={16} className="text-gray-500 hover:text-gray-300" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_TOKENS.filter(
                  (at) => !tokens.find((t) => t.symbol === at.symbol)
                ).map((at) => (
                  <button
                    key={at.symbol}
                    onClick={() => addToken(at.symbol, at.name)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-300 hover:border-pink-500/30 hover:text-pink-300 transition-colors text-left"
                  >
                    <Wallet size={14} className="text-gray-500" />
                    <div>
                      <p className="text-xs font-medium">{at.symbol}</p>
                      <p className="text-xs text-gray-500">{at.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {tokens.length}/10 tokens tracked
              </p>
            </div>
          )}

          {/* Token Positions */}
          {tokens.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center space-y-3">
              <PieChart size={32} className="text-pink-400/30 mx-auto" />
              <p className="text-gray-400 text-sm">
                No tokens tracked yet. Add tokens to view your encrypted balances.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tokens.map((token, idx) => (
                <div
                  key={token.id}
                  className={`rounded-xl p-4 border bg-gradient-to-br ${TOKEN_COLORS[idx % TOKEN_COLORS.length]}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">{token.symbol}</p>
                      <p className="text-xs text-gray-500">{token.name}</p>
                    </div>
                    <button
                      onClick={() => removeToken(token.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Balance</p>
                      {token.revealed ? (
                        <button
                          onClick={() => toggleBalance(token.id)}
                          className="flex items-center gap-1.5"
                        >
                          <span className="text-lg font-bold text-gray-100">---.--</span>
                          <EyeOff size={12} className="text-gray-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleBalance(token.id)}
                          className="flex items-center gap-1.5 group"
                        >
                          <Lock size={14} className="text-purple-400" />
                          <span className="text-sm text-purple-300 group-hover:text-purple-200">View</span>
                          <Eye size={12} className="text-purple-400" />
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">% of Total</p>
                      <p className="text-sm font-medium text-gray-400">--%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
