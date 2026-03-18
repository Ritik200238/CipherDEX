"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import {
  Target,
  Plus,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";

type Direction = "BUY_BELOW" | "SELL_ABOVE";
type OrderStatus = "ACTIVE" | "TRIGGERED" | "CANCELLED";

interface LimitOrder {
  id: string;
  owner: string;
  direction: Direction;
  tokenPair: string;
  amount: string;
  triggerPrice: string | null;
  status: OrderStatus;
}

const DIRECTION_CONFIG: Record<Direction, { label: string; icon: typeof ArrowUpRight; color: string }> = {
  BUY_BELOW: { label: "Buy Below", icon: ArrowDownRight, color: "text-emerald-400" },
  SELL_ABOVE: { label: "Sell Above", icon: ArrowUpRight, color: "text-red-400" },
};

export default function LimitsPage() {
  const { account } = useWallet();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orders] = useState<LimitOrder[]>([]);
  const [oraclePrice] = useState<string>("1842.50");
  const [revealedPrices, setRevealedPrices] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    direction: "BUY_BELOW" as Direction,
    tokenPair: "cETH/cUSDC",
    amount: "",
    triggerPrice: "",
  });

  const toggleReveal = (orderId: string) => {
    setRevealedPrices((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleCreate = () => {
    if (!account) return;
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <Target size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Private Limit Orders</h1>
            <p className="text-sm text-gray-400">
              MEV-proof trigger prices hidden from everyone
            </p>
          </div>
        </div>
        {account && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-600/30 transition-colors"
          >
            <Plus size={16} />
            Create Limit Order
          </button>
        )}
      </div>

      {/* Oracle Price + MEV Protection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Current Oracle Price (cETH/cUSDC)</p>
            <p className="text-2xl font-bold text-gray-100">${oraclePrice}</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/15 border border-purple-500/20 text-purple-300 text-xs hover:bg-purple-600/25 transition-colors">
            <RefreshCw size={12} />
            Update Price
          </button>
        </div>
        <div className="glass rounded-xl p-4 flex items-start gap-3 border-l-2 border-emerald-500/50">
          <Shield size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-emerald-300 mb-1">MEV Protection Active</p>
            <p className="text-xs text-gray-400">
              Your trigger price is encrypted — MEV bots cannot see where your limit sits.
              Matching uses <span className="text-emerald-300 font-mono">FHE.lte()</span> on-chain.
            </p>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">New Limit Order</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as Direction })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 focus:border-emerald-500/40 focus:outline-none"
              >
                <option value="BUY_BELOW">Buy Below (trigger when price drops)</option>
                <option value="SELL_ABOVE">Sell Above (trigger when price rises)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Token Pair</label>
              <select
                value={formData.tokenPair}
                onChange={(e) => setFormData({ ...formData, tokenPair: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 focus:border-emerald-500/40 focus:outline-none"
              >
                <option value="cETH/cUSDC">cETH / cUSDC</option>
                <option value="cDAI/cUSDC">cDAI / cUSDC</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Token amount"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-emerald-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Encrypted Trigger Price
                <Lock size={10} className="inline ml-1 text-emerald-400" />
              </label>
              <input
                type="number"
                value={formData.triggerPrice}
                onChange={(e) => setFormData({ ...formData, triggerPrice: e.target.value })}
                placeholder="Hidden from others"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-emerald-500/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-medium hover:from-emerald-500 hover:to-cyan-500 transition-all"
            >
              Place Limit Order
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      {!account ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Lock size={32} className="text-emerald-400/50 mx-auto" />
          <p className="text-gray-400 text-sm">Connect your wallet to view and create limit orders</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Target size={32} className="text-emerald-400/30 mx-auto" />
          <p className="text-gray-400 text-sm">No limit orders yet. Set your first encrypted trigger price.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Active Orders
          </h2>
          {orders.map((order) => {
            const dirConf = DIRECTION_CONFIG[order.direction];
            const DirIcon = dirConf.icon;
            const isRevealed = revealedPrices.has(order.id);
            const isOwner = order.owner.toLowerCase() === account?.toLowerCase();
            return (
              <div key={order.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${order.direction === "BUY_BELOW" ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                    <DirIcon size={16} className={dirConf.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${dirConf.color}`}>{dirConf.label}</span>
                      <span className="text-xs text-gray-500 font-mono">{order.tokenPair}</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-0.5">{order.amount} tokens</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Trigger Price</p>
                    {isOwner ? (
                      <button
                        onClick={() => toggleReveal(order.id)}
                        className="flex items-center gap-1 text-sm"
                      >
                        {isRevealed ? (
                          <>
                            <span className="text-gray-200">${order.triggerPrice}</span>
                            <EyeOff size={12} className="text-gray-500" />
                          </>
                        ) : (
                          <>
                            <Lock size={12} className="text-purple-400" />
                            <span className="text-purple-300 text-xs">Click to unseal</span>
                            <Eye size={12} className="text-purple-400" />
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Lock size={10} />
                        Encrypted
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === "ACTIVE" ? "text-emerald-400 bg-emerald-500/20" :
                    order.status === "TRIGGERED" ? "text-blue-400 bg-blue-500/20" :
                    "text-gray-400 bg-gray-500/20"
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
