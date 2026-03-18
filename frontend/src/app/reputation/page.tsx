"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import {
  Star,
  Lock,
  Eye,
  EyeOff,
  Send,
  User,
  BarChart3,
  Activity,
  ArrowLeftRight,
} from "lucide-react";

interface TradeEvent {
  id: string;
  counterparty: string;
  type: string;
  timestamp: number;
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ReputationPage() {
  const { account } = useWallet();
  const [ratingRevealed, setRatingRevealed] = useState(false);
  const [tradeEvents] = useState<TradeEvent[]>([]);
  const [rateForm, setRateForm] = useState({
    counterparty: "",
    rating: 0,
  });

  const starCount = 5;

  const handleRate = () => {
    if (!account || !rateForm.counterparty || rateForm.rating === 0) return;
    setRateForm({ counterparty: "", rating: 0 });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
          <Star size={20} className="text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Reputation</h1>
          <p className="text-sm text-gray-400">
            Encrypted trader ratings averaged on-chain
          </p>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="glass rounded-xl p-4 flex items-start gap-3 border-l-2 border-orange-500/50">
        <Lock size={16} className="text-orange-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400">
          Individual ratings are never exposed — only you can see your aggregate score. Ratings
          are encrypted with <span className="text-orange-300 font-mono">euint8</span> and
          averaged using <span className="text-orange-300 font-mono">FHE.div(totalScore, count)</span>.
          If the Reputation contract fails, trading continues unaffected.
        </p>
      </div>

      {!account ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Lock size={32} className="text-orange-400/50 mx-auto" />
          <p className="text-gray-400 text-sm">Connect your wallet to view your reputation</p>
        </div>
      ) : (
        <>
          {/* Your Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <BarChart3 size={12} />
                Trade Count
              </div>
              <p className="text-2xl font-bold text-gray-100">0</p>
              <p className="text-xs text-gray-500">Completed trades (public)</p>
            </div>
            <div className="glass rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Star size={12} />
                Average Rating
              </div>
              {ratingRevealed ? (
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-100">-.-</p>
                  <span className="text-xs text-gray-500">/ 5.0</span>
                  <button onClick={() => setRatingRevealed(false)}>
                    <EyeOff size={14} className="text-gray-500 hover:text-gray-300 transition-colors" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRatingRevealed(true)}
                  className="flex items-center gap-2 group"
                >
                  <Lock size={18} className="text-purple-400" />
                  <span className="text-sm text-purple-300 group-hover:text-purple-200 transition-colors">
                    Click to unseal
                  </span>
                  <Eye size={14} className="text-purple-400" />
                </button>
              )}
            </div>
            <div className="glass rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Star size={12} />
                Star Visualization
              </div>
              <div className="flex items-center gap-1 pt-1">
                {Array.from({ length: starCount }).map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={ratingRevealed ? "text-gray-600" : "text-gray-700"}
                    fill={ratingRevealed ? "transparent" : "transparent"}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {ratingRevealed ? "No ratings yet" : "Unseal to view"}
              </p>
            </div>
          </div>

          {/* Rate a Trader */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <User size={18} className="text-orange-400" />
              Rate a Trader
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Counterparty Address</label>
                <input
                  type="text"
                  value={rateForm.counterparty}
                  onChange={(e) => setRateForm({ ...rateForm, counterparty: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">
                  Encrypted Rating
                  <Lock size={10} className="inline ml-1 text-orange-400" />
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {Array.from({ length: starCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRateForm({ ...rateForm, rating: i + 1 })}
                      className="transition-colors"
                    >
                      <Star
                        size={24}
                        className={i < rateForm.rating ? "text-orange-400" : "text-gray-600 hover:text-gray-400"}
                        fill={i < rateForm.rating ? "currentColor" : "transparent"}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-gray-500 ml-2">
                    {rateForm.rating > 0 ? `${rateForm.rating}/5` : "Select"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRate}
              disabled={!rateForm.counterparty || rateForm.rating === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-medium hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={14} />
              Submit Encrypted Rating
            </button>
          </div>

          {/* Recent Trades */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} />
              Recent Trades
            </h2>
            {tradeEvents.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm">No trade events recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tradeEvents.map((event) => (
                  <div key={event.id} className="glass rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                        <ArrowLeftRight size={12} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-300">{event.type}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          with {truncateAddress(event.counterparty)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{formatTime(event.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
