"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import {
  Layers,
  Lock,
  Clock,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRight,
  ShoppingCart,
  Tag,
} from "lucide-react";

type RoundStatus = "COLLECTING" | "COMPUTING" | "SETTLED";

interface AuctionRound {
  id: string;
  tokenPair: string;
  status: RoundStatus;
  deadline: number;
  buyOrderCount: number;
  sellOrderCount: number;
  clearingPrice: string | null;
  fillCount: number | null;
}

const STATUS_STYLE: Record<RoundStatus, { label: string; color: string; bg: string }> = {
  COLLECTING: { label: "Collecting", color: "text-amber-400", bg: "bg-amber-500/20" },
  COMPUTING: { label: "Computing", color: "text-blue-400", bg: "bg-blue-500/20" },
  SETTLED: { label: "Settled", color: "text-emerald-400", bg: "bg-emerald-500/20" },
};

function formatCountdown(deadline: number) {
  const remaining = Math.max(0, deadline - Math.floor(Date.now() / 1000));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export default function BatchPage() {
  const { account } = useWallet();
  const [rounds] = useState<AuctionRound[]>([]);
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [formData, setFormData] = useState({
    roundId: "",
    encryptedPrice: "",
    amount: "",
  });

  const handleSubmitOrder = () => {
    if (!account) return;
    setShowOrderForm(false);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
          <Layers size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Batch Auction</h1>
          <p className="text-sm text-gray-400">
            Fair clearing price computed over encrypted orders
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="glass rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
          <Info size={14} />
          How Batch Auctions Work
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300">
            <Lock size={12} />
            Prices encrypted
          </div>
          <ArrowRight size={14} className="text-gray-600" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300">
            <Layers size={12} />
            Clearing computed
          </div>
          <ArrowRight size={14} className="text-gray-600" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300">
            <TrendingUp size={12} />
            Same price for all
          </div>
        </div>
        <p className="text-xs text-gray-500">
          All order prices are encrypted during collection. A clearing price is computed via an
          on-chain price ladder, and everyone trades at the same fair price. Maximum 5 orders per
          round, 3 price steps.
        </p>
      </div>

      {/* Active Rounds */}
      {!account ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Lock size={32} className="text-amber-400/50 mx-auto" />
          <p className="text-gray-400 text-sm">Connect your wallet to participate in batch auctions</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Auction Rounds
            </h2>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-600/30 transition-colors"
            >
              <Tag size={14} />
              Submit Order
            </button>
          </div>

          {/* Submit Order Form */}
          {showOrderForm && (
            <div className="glass rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-200">Submit Batch Order</h2>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setOrderType("BUY")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    orderType === "BUY"
                      ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-300"
                      : "bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <ShoppingCart size={14} />
                  Buy Order
                </button>
                <button
                  onClick={() => setOrderType("SELL")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    orderType === "SELL"
                      ? "bg-red-600/20 border border-red-500/30 text-red-300"
                      : "bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <TrendingDown size={14} />
                  Sell Order
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Round ID</label>
                  <input
                    type="text"
                    value={formData.roundId}
                    onChange={(e) => setFormData({ ...formData, roundId: e.target.value })}
                    placeholder="Active round ID"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Amount</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Token amount"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 block mb-1.5">
                    Encrypted Price
                    <Lock size={10} className="inline ml-1 text-amber-400" />
                  </label>
                  <input
                    type="number"
                    value={formData.encryptedPrice}
                    onChange={(e) => setFormData({ ...formData, encryptedPrice: e.target.value })}
                    placeholder="Your price (encrypted on-chain)"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmitOrder}
                  className={`px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all ${
                    orderType === "BUY"
                      ? "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
                      : "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500"
                  }`}
                >
                  Submit {orderType === "BUY" ? "Buy" : "Sell"} Order
                </button>
                <button
                  onClick={() => setShowOrderForm(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rounds Grid */}
          {rounds.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center space-y-3">
              <Layers size={32} className="text-amber-400/30 mx-auto" />
              <p className="text-gray-400 text-sm">No active auction rounds. Rounds are created by the protocol when orders accumulate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rounds.map((round) => {
                const statusConf = STATUS_STYLE[round.status];
                return (
                  <div key={round.id} className="glass rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-200">{round.tokenPair}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusConf.color} ${statusConf.bg}`}>
                        {statusConf.label}
                      </span>
                    </div>
                    {round.status === "COLLECTING" && (
                      <div className="flex items-center gap-2 text-xs text-amber-300">
                        <Clock size={12} />
                        {formatCountdown(round.deadline)}
                      </div>
                    )}
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart size={12} className="text-emerald-400" />
                        <span className="text-gray-400">{round.buyOrderCount} buys</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingDown size={12} className="text-red-400" />
                        <span className="text-gray-400">{round.sellOrderCount} sells</span>
                      </div>
                    </div>
                    {round.status === "SETTLED" && round.clearingPrice && (
                      <div className="pt-2 border-t border-purple-500/10">
                        <p className="text-xs text-gray-500">Clearing Price</p>
                        <p className="text-lg font-bold text-emerald-400">${round.clearingPrice}</p>
                        <p className="text-xs text-gray-500 mt-1">{round.fillCount} orders filled</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
