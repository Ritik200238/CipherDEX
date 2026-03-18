"use client";

import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import {
  ArrowLeftRight,
  Gavel,
  ShieldCheck,
  Target,
  Layers,
  PieChart,
  Users,
  Star,
  Lock,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";

const FEATURE_CARDS = [
  {
    title: "P2P Trading",
    description: "Encrypted order matching with hidden prices",
    href: "/trade",
    icon: ArrowLeftRight,
    color: "from-purple-600/20 to-purple-900/10",
    borderColor: "border-purple-500/20",
  },
  {
    title: "Sealed Auctions",
    description: "Bid without revealing your price",
    href: "/auctions",
    icon: Gavel,
    color: "from-blue-600/20 to-blue-900/10",
    borderColor: "border-blue-500/20",
  },
  {
    title: "Encrypted Escrow",
    description: "Hidden deal terms, automatic settlement",
    href: "/escrow",
    icon: ShieldCheck,
    color: "from-cyan-600/20 to-cyan-900/10",
    borderColor: "border-cyan-500/20",
  },
  {
    title: "Limit Orders",
    description: "MEV-proof trigger prices",
    href: "/limits",
    icon: Target,
    color: "from-emerald-600/20 to-emerald-900/10",
    borderColor: "border-emerald-500/20",
  },
  {
    title: "Batch Auction",
    description: "Fair clearing price computation",
    href: "/batch",
    icon: Layers,
    color: "from-amber-600/20 to-amber-900/10",
    borderColor: "border-amber-500/20",
  },
  {
    title: "Portfolio",
    description: "View your encrypted holdings",
    href: "/portfolio",
    icon: PieChart,
    color: "from-pink-600/20 to-pink-900/10",
    borderColor: "border-pink-500/20",
  },
  {
    title: "OTC Board",
    description: "Private large-block trades",
    href: "/otc",
    icon: Users,
    color: "from-indigo-600/20 to-indigo-900/10",
    borderColor: "border-indigo-500/20",
  },
  {
    title: "Reputation",
    description: "Encrypted trader ratings",
    href: "/reputation",
    icon: Star,
    color: "from-orange-600/20 to-orange-900/10",
    borderColor: "border-orange-500/20",
  },
];

export default function DashboardPage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-gray-400 text-sm">
          Fully encrypted peer-to-peer trading. Every price, bid, and balance is hidden on-chain.
        </p>
      </div>

      {/* Status cards */}
      {account && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Lock size={12} />
              Encryption
            </div>
            <p className={`text-lg font-semibold ${initialized ? "text-emerald-400" : "text-amber-400"}`}>
              {initialized ? "Active" : "Initializing..."}
            </p>
          </div>
          <div className="glass rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield size={12} />
              Privacy Level
            </div>
            <p className="text-lg font-semibold text-purple-400">Full FHE</p>
          </div>
          <div className="glass rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Zap size={12} />
              Protocol
            </div>
            <p className="text-lg font-semibold text-cyan-400">Fhenix CoFHE</p>
          </div>
        </div>
      )}

      {/* Connect prompt */}
      {!account && (
        <div className="glass rounded-xl p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center mx-auto">
            <Lock size={28} className="text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-200">Connect your wallet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Connect MetaMask to start trading with full on-chain privacy. All order
            prices, bid amounts, and balances are encrypted using Fully Homomorphic
            Encryption.
          </p>
        </div>
      )}

      {/* Feature grid */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Protocol Features
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`
                group rounded-xl p-4 border ${card.borderColor}
                bg-gradient-to-br ${card.color}
                hover:border-opacity-50 hover:shadow-lg hover:shadow-purple-500/5
                transition-all duration-300
              `}
            >
              <card.icon
                size={20}
                className="text-gray-400 group-hover:text-gray-200 transition-colors mb-3"
              />
              <h3 className="text-sm font-semibold text-gray-200 mb-1">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
