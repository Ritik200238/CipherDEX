"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import {
  ShieldCheck,
  Plus,
  Clock,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

type DealStatus = "CREATED" | "FUNDED_A" | "FUNDED_BOTH" | "RELEASED" | "CANCELLED";

interface Deal {
  id: string;
  partyA: string;
  partyB: string;
  tokenA: string;
  tokenB: string;
  status: DealStatus;
  deadline: number;
  createdAt: number;
}

const STATUS_CONFIG: Record<DealStatus, { label: string; color: string; bg: string }> = {
  CREATED: { label: "Created", color: "text-gray-400", bg: "bg-gray-500/20" },
  FUNDED_A: { label: "Party A Funded", color: "text-amber-400", bg: "bg-amber-500/20" },
  FUNDED_BOTH: { label: "Both Funded", color: "text-blue-400", bg: "bg-blue-500/20" },
  RELEASED: { label: "Released", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  CANCELLED: { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/20" },
};

const TIMELINE_STEPS: DealStatus[] = ["CREATED", "FUNDED_A", "FUNDED_BOTH", "RELEASED"];

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDeadline(blockNumber: number) {
  const remaining = blockNumber - Math.floor(Date.now() / 12000);
  if (remaining <= 0) return "Expired";
  const hours = Math.floor(remaining / 300);
  const mins = Math.floor((remaining % 300) / 5);
  return `${hours}h ${mins}m`;
}

export default function EscrowPage() {
  const { account } = useWallet();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deals] = useState<Deal[]>([]);
  const [formData, setFormData] = useState({
    counterparty: "",
    tokenA: "cUSDC",
    tokenB: "cETH",
    termsA: "",
    termsB: "",
    deadline: "",
  });

  const handleCreateDeal = () => {
    if (!account) return;
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Encrypted Escrow</h1>
            <p className="text-sm text-gray-400">
              Hidden deal terms with automatic settlement verification
            </p>
          </div>
        </div>
        {account && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-600/30 transition-colors"
          >
            <Plus size={16} />
            Create Deal
          </button>
        )}
      </div>

      {/* Privacy Note */}
      <div className="glass rounded-xl p-4 flex items-start gap-3 border-l-2 border-cyan-500/50">
        <Lock size={16} className="text-cyan-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400">
          Deal terms are encrypted — only the two parties can see the amounts. Settlement verification
          uses <span className="text-cyan-300 font-mono">FHE.eq()</span> to confirm deposits match
          agreed terms without exposing them.
        </p>
      </div>

      {/* Create Deal Form */}
      {showCreateForm && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">New Escrow Deal</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1.5">Counterparty Address</label>
              <input
                type="text"
                value={formData.counterparty}
                onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
                placeholder="0x..."
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/40 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Your Token (A)</label>
              <select
                value={formData.tokenA}
                onChange={(e) => setFormData({ ...formData, tokenA: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 focus:border-cyan-500/40 focus:outline-none"
              >
                <option value="cUSDC">cUSDC</option>
                <option value="cETH">cETH</option>
                <option value="cDAI">cDAI</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Their Token (B)</label>
              <select
                value={formData.tokenB}
                onChange={(e) => setFormData({ ...formData, tokenB: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 focus:border-cyan-500/40 focus:outline-none"
              >
                <option value="cETH">cETH</option>
                <option value="cUSDC">cUSDC</option>
                <option value="cDAI">cDAI</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Your Encrypted Terms (A)</label>
              <input
                type="number"
                value={formData.termsA}
                onChange={(e) => setFormData({ ...formData, termsA: e.target.value })}
                placeholder="Amount to deposit"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Their Encrypted Terms (B)</label>
              <input
                type="number"
                value={formData.termsB}
                onChange={(e) => setFormData({ ...formData, termsB: e.target.value })}
                placeholder="Amount they deposit"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/40 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1.5">Deadline (blocks from now)</label>
              <input
                type="number"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                placeholder="e.g. 7200 (~24 hours)"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0b14] border border-purple-500/15 text-sm text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreateDeal}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              Create Escrow Deal
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

      {/* Deal List */}
      {!account ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <Lock size={32} className="text-cyan-400/50 mx-auto" />
          <p className="text-gray-400 text-sm">Connect your wallet to view and create escrow deals</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <ShieldCheck size={32} className="text-cyan-400/30 mx-auto" />
          <p className="text-gray-400 text-sm">No escrow deals yet. Create your first encrypted deal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const statusConf = STATUS_CONFIG[deal.status];
            const activeStep = TIMELINE_STEPS.indexOf(deal.status);
            return (
              <div key={deal.id} className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-400">
                        {truncateAddress(deal.partyA)}
                      </span>
                      <ArrowRight size={14} className="inline mx-2 text-gray-600" />
                      <span className="text-gray-400">
                        {truncateAddress(deal.partyB)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">
                        {deal.tokenA}
                      </span>
                      <ArrowRight size={10} className="text-gray-600" />
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">
                        {deal.tokenB}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock size={12} />
                      {formatDeadline(deal.deadline)}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusConf.color} ${statusConf.bg}`}>
                      {statusConf.label}
                    </span>
                  </div>
                </div>
                {/* Timeline */}
                <div className="flex items-center gap-1">
                  {TIMELINE_STEPS.map((step, i) => {
                    const reached = i <= activeStep;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${reached ? "bg-cyan-500/30" : "bg-gray-700/30"}`}>
                          {reached ? (
                            <CheckCircle2 size={12} className="text-cyan-400" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                          )}
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-px mx-1 ${i < activeStep ? "bg-cyan-500/40" : "bg-gray-700/30"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Action */}
                {(deal.status === "CREATED" || deal.status === "FUNDED_A") && (
                  <button className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-600/30 transition-colors">
                    Fund Deal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
