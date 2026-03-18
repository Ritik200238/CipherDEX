"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import {
  Users,
  Plus,
  Lock,
  Clock,
  MessageSquare,
  ArrowRight,
  Send,
  X,
  Anchor,
} from "lucide-react";

type RequestStatus = "ACTIVE" | "QUOTED" | "FILLED" | "EXPIRED";

interface OTCRequest {
  id: string;
  poster: string;
  tokenWanted: string;
  tokenOffered: string;
  deadline: number;
  status: RequestStatus;
  quoteCount: number;
}

const STATUS_STYLE: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Active", color: "text-indigo-400", bg: "bg-indigo-500/20" },
  QUOTED: { label: "Quoted", color: "text-amber-400", bg: "bg-amber-500/20" },
  FILLED: { label: "Filled", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  EXPIRED: { label: "Expired", color: "text-gray-400", bg: "bg-gray-500/20" },
};

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDeadline(ts: number) {
  const remaining = Math.max(0, ts - Math.floor(Date.now() / 1000));
  if (remaining === 0) return "Expired";
  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default function OTCPage() {
  const { account } = useWallet();
  const [requests] = useState<OTCRequest[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({
    tokenWanted: "cETH",
    tokenOffered: "cUSDC",
    encryptedAmount: "",
    encryptedMinPrice: "",
    encryptedMaxPrice: "",
    deadline: "",
  });
  const [quoteForm, setQuoteForm] = useState({
    encryptedPrice: "",
    encryptedAmount: "",
  });

  const handlePost = () => {
    if (!account) return;
    setShowPostForm(false);
  };

  const handleQuote = () => {
    if (!account) return;
    setShowQuoteForm(null);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Users size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Private OTC Board</h1>
            <p className="text-sm text-gray-400">
              Large-block trades with hidden request amounts
            </p>
          </div>
        </div>
        {account && (
          <button
            onClick={() => setShowPostForm(!showPostForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-600/30 transition-colors"
          >
            <Plus size={16} />
            Post Request
          </button>
        )}
      </div>

      {/* Whale Note */}
      <div className="glass rounded-xl p-4 flex items-start gap-3 border-l-2 border-indigo-500/50">
        <Anchor size={16} className="text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400">
          Order sizes are encrypted — trade large volumes without moving the market. Counterparties
          see your request exists but not the size. Quotes are verified with{" "}
          <span className="text-indigo-300 font-mono">FHE.gte()</span> and{" "}
          <span className="text-indigo-300 font-mono">FHE.lte()</span> to stay within your range.
        </p>
      </div>

      {/* Post Request Form */}
      {showPostForm && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">Post OTC Request</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Token Wanted</label>
              <select
                value={postForm.tokenWanted}
                onChange={(e) => setPostForm({ ...postForm, tokenWanted: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 focus:border-indigo-500/40 focus:outline-none"
              >
                <option value="cETH">cETH</option>
                <option value="cUSDC">cUSDC</option>
                <option value="cDAI">cDAI</option>
                <option value="cWBTC">cWBTC</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Token Offered</label>
              <select
                value={postForm.tokenOffered}
                onChange={(e) => setPostForm({ ...postForm, tokenOffered: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 focus:border-indigo-500/40 focus:outline-none"
              >
                <option value="cUSDC">cUSDC</option>
                <option value="cETH">cETH</option>
                <option value="cDAI">cDAI</option>
                <option value="cWBTC">cWBTC</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Encrypted Amount
                <Lock size={10} className="inline ml-1 text-indigo-400" />
              </label>
              <input
                type="number"
                value={postForm.encryptedAmount}
                onChange={(e) => setPostForm({ ...postForm, encryptedAmount: e.target.value })}
                placeholder="Hidden from others"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Deadline (hours)</label>
              <input
                type="number"
                value={postForm.deadline}
                onChange={(e) => setPostForm({ ...postForm, deadline: e.target.value })}
                placeholder="e.g. 24"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Encrypted Min Price
                <Lock size={10} className="inline ml-1 text-indigo-400" />
              </label>
              <input
                type="number"
                value={postForm.encryptedMinPrice}
                onChange={(e) => setPostForm({ ...postForm, encryptedMinPrice: e.target.value })}
                placeholder="Minimum acceptable"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Encrypted Max Price
                <Lock size={10} className="inline ml-1 text-indigo-400" />
              </label>
              <input
                type="number"
                value={postForm.encryptedMaxPrice}
                onChange={(e) => setPostForm({ ...postForm, encryptedMaxPrice: e.target.value })}
                placeholder="Maximum acceptable"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePost}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all"
            >
              Post Request
            </button>
            <button
              onClick={() => setShowPostForm(false)}
              className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Request Grid */}
      {!account ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Lock size={32} className="text-indigo-400/50 mx-auto" />
          <p className="text-gray-400 text-sm">Connect your wallet to view and post OTC requests</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Users size={32} className="text-indigo-400/30 mx-auto" />
          <p className="text-gray-400 text-sm">No OTC requests posted yet. Be the first to post a private trade request.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => {
            const statusConf = STATUS_STYLE[req.status];
            return (
              <div key={req.id} className="glass rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-mono">{truncateAddress(req.poster)}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusConf.color} ${statusConf.bg}`}>
                    {statusConf.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">Want</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-xs font-mono">
                      {req.tokenWanted}
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-gray-600" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">Offer</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-xs font-mono">
                      {req.tokenOffered}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Lock size={10} className="text-purple-400" />
                    Amount encrypted
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDeadline(req.deadline)}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={10} />
                    {req.quoteCount} quotes
                  </div>
                </div>
                {req.status === "ACTIVE" && req.poster.toLowerCase() !== account?.toLowerCase() && (
                  <>
                    {showQuoteForm === req.id ? (
                      <div className="pt-2 border-t border-purple-500/10 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">
                              Quote Price <Lock size={8} className="inline text-indigo-400" />
                            </label>
                            <input
                              type="number"
                              value={quoteForm.encryptedPrice}
                              onChange={(e) => setQuoteForm({ ...quoteForm, encryptedPrice: e.target.value })}
                              placeholder="Your price"
                              className="w-full px-2.5 py-2 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-xs text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/40 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">
                              Quote Amount <Lock size={8} className="inline text-indigo-400" />
                            </label>
                            <input
                              type="number"
                              value={quoteForm.encryptedAmount}
                              onChange={(e) => setQuoteForm({ ...quoteForm, encryptedAmount: e.target.value })}
                              placeholder="Your amount"
                              className="w-full px-2.5 py-2 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-xs text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/40 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleQuote}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs hover:bg-indigo-600/30 transition-colors"
                          >
                            <Send size={10} />
                            Submit Quote
                          </button>
                          <button
                            onClick={() => setShowQuoteForm(null)}
                            className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-500 text-xs hover:text-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowQuoteForm(req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 transition-colors"
                      >
                        <MessageSquare size={12} />
                        Submit Quote
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
