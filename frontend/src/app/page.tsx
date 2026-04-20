"use client";

import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import Link from "next/link";
import {
  Rocket,
  CreditCard,
  ArrowLeftRight,
  Briefcase,
  Lock,
  Shield,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
  TrendingUp,
  Activity,
  Sparkles,
  Gavel,
  AlertTriangle,
  Workflow,
} from "lucide-react";

/* ─── Capability cards ─────────────────────────────────────── */

const CAPABILITIES = [
  {
    title: "Launch",
    subtitle: "5 auction types",
    description: "Sealed, Vickrey, Dutch, Batch, Overflow -- every token launch format with encrypted bids.",
    href: "/auctions",
    icon: Rocket,
    gradient: "from-violet-600 to-indigo-600",
    glow: "shadow-violet-500/20",
  },
  {
    title: "Pay",
    subtitle: "Private splits",
    description: "Split payments across recipients. Each sees only their own encrypted amount.",
    href: "/payments",
    icon: CreditCard,
    gradient: "from-emerald-600 to-cyan-600",
    glow: "shadow-emerald-500/20",
  },
  {
    title: "Trade",
    subtitle: "MEV-proof orders",
    description: "Hidden limit orders, P2P matching, OTC board. Zero front-running possible.",
    href: "/trade",
    icon: ArrowLeftRight,
    gradient: "from-blue-600 to-cyan-600",
    glow: "shadow-blue-500/20",
  },
  {
    title: "Hire",
    subtitle: "Encrypted bidding",
    description: "Post jobs, receive sealed bids, milestone escrow. Budgets stay confidential.",
    href: "/freelance",
    icon: Briefcase,
    gradient: "from-indigo-600 to-purple-600",
    glow: "shadow-indigo-500/20",
  },
];

/* ─── Innovation highlights ────────────────────────────────── */

const INNOVATIONS = [
  {
    title: "Blind Floor",
    description: "Dutch auctions with encrypted purchase amounts. See the price, hide the size.",
    icon: EyeOff,
    color: "text-amber-400",
  },
  {
    title: "Encrypted Disputes",
    description: "Freelance milestone disputes resolved without revealing bid prices to arbitrators.",
    icon: AlertTriangle,
    color: "text-red-400",
  },
  {
    title: "Cross-Feature Flow",
    description: "Launch tokens via auction, pay contributors via splits, trade on OTC -- one protocol.",
    icon: Workflow,
    color: "text-[var(--cipher-cyan)]",
  },
];

/* ─── Page ──────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();

  return (
    <div className="space-y-10">
      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--void-2)] via-[var(--void-1)] to-[var(--void-2)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--cipher-violet)] rounded-full blur-[200px] opacity-[0.06]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-[var(--cipher-cyan)] rounded-full blur-[180px] opacity-[0.04]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--cipher-violet) 1px, transparent 1px), linear-gradient(90deg, var(--cipher-violet) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 px-8 py-10 md:py-14 md:px-12">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="animate-fade-up stagger-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--cipher-violet)]/10 border border-[var(--cipher-violet)]/20 mb-6">
              <Shield size={12} className="text-[var(--cipher-violet)]" />
              <span className="text-[11px] font-semibold text-[var(--cipher-violet)] tracking-wide uppercase">
                Fully Homomorphic Encryption
              </span>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-up stagger-2 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4">
              The Private{" "}
              <span className="gradient-text">Operating System</span>
              <br />
              for{" "}
              <span className="gradient-text">DAOs</span>
              <span className="text-[var(--text-primary)]">.</span>
            </h1>

            {/* Subheadline */}
            <p className="animate-fade-up stagger-3 text-base md:text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg mb-8">
              Launch tokens. Pay contributors. Trade privately. Hire talent.
              Every operation is encrypted on-chain with FHE --{" "}
              <span className="text-[var(--text-primary)] font-medium">nobody sees the numbers</span>.
            </p>

            {/* CTA */}
            <div className="animate-fade-up stagger-4 flex items-center gap-4">
              {!account ? (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[var(--void-4)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm">
                  <Lock size={16} className="text-[var(--cipher-violet)]" />
                  Connect wallet to enter the encrypted protocol
                </div>
              ) : (
                <>
                  <Link
                    href="/auctions"
                    className="group flex items-center gap-2.5 px-5 py-3 rounded-xl
                             bg-gradient-to-r from-[var(--cipher-violet)] to-[var(--cipher-blue)]
                             text-white text-sm font-semibold
                             hover:shadow-lg hover:shadow-[var(--cipher-violet)]/25
                             transition-all duration-300"
                  >
                    Try in 60 Seconds
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/trade"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl
                             bg-[var(--void-4)] border border-[var(--border-default)]
                             text-[var(--text-secondary)] text-sm font-medium
                             hover:text-[var(--text-primary)] hover:border-[var(--border-active)]
                             transition-all duration-300"
                  >
                    <ArrowLeftRight size={14} />
                    Start Trading
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats (right side) */}
          {account && (
            <div className="mt-8 md:mt-0 md:absolute md:right-12 md:top-1/2 md:-translate-y-1/2 flex flex-col gap-3">
              {[
                { label: "FHE Operations", value: "14+", icon: Zap, color: "text-[var(--cipher-violet)]" },
                { label: "Privacy Level", value: "Full", icon: Eye, color: "text-[var(--cipher-cyan)]" },
                { label: "Protocol", value: "CoFHE", icon: Activity, color: "text-[var(--cipher-green)]" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`animate-fade-up stagger-${i + 5} flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--void-3)]/60 backdrop-blur border border-[var(--border-subtle)]`}
                >
                  <stat.icon size={16} className={stat.color} />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════ PROBLEM ═══════ */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--void-2)]/30 p-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={18} className="text-[var(--cipher-red)]" />
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em]">
            The Problem
          </h2>
        </div>
        <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          MEV bots extract <span className="text-[var(--text-primary)] font-semibold">$500M+</span> annually
          by front-running trades. Auction bids are visible, enabling sniping. Portfolio values are public,
          making holders targets. <span className="text-[var(--cipher-red)] font-medium">Every number on-chain is exposed.</span>
        </p>
      </section>

      {/* ═══════ 4 CAPABILITIES ═══════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em]">
            Four Capabilities
          </h2>
          <div className="h-px flex-1 ml-4 bg-gradient-to-r from-[var(--border-subtle)] to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAPABILITIES.map((f, i) => (
            <Link
              key={f.href}
              href={f.href}
              className={`animate-fade-up stagger-${i + 1} group relative overflow-hidden rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition-all duration-500 hover:${f.glow} hover:shadow-xl`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500`} />

              <div className="relative p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg`}>
                    <f.icon size={20} className="text-white" />
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-all mt-1" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-0.5">{f.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">{f.subtitle}</p>
                </div>

                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {f.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════ WHAT'S NEW ═══════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--cipher-violet)]" />
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em]">
              Innovation
            </h2>
          </div>
          <div className="h-px flex-1 ml-4 bg-gradient-to-r from-[var(--border-subtle)] to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INNOVATIONS.map((inn, i) => (
            <div
              key={inn.title}
              className={`animate-fade-up stagger-${i + 1} rounded-xl p-5 border border-[var(--border-subtle)]
                         bg-[var(--void-2)]/40 space-y-3`}
            >
              <inn.icon size={18} className={`${inn.color} opacity-80`} />
              <h3 className="text-[13px] font-bold text-[var(--text-primary)]">{inn.title}</h3>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{inn.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ HOW FHE WORKS ═══════ */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--void-2)]/30 p-8">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-6">
          How FHE Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Encrypt Client-Side", desc: "Your values are encrypted via cofhejs before leaving your browser. A ZK proof guarantees validity.", color: "text-[var(--cipher-violet)]" },
            { step: "02", title: "Compute on Ciphertext", desc: "Smart contracts run FHE operations (add, compare, select) on encrypted data. Values never decrypt on-chain.", color: "text-[var(--cipher-blue)]" },
            { step: "03", title: "Unseal Your Data", desc: "Only you can decrypt your own results via cryptographic permits. Nobody else -- not even validators -- can see.", color: "text-[var(--cipher-cyan)]" },
          ].map((s, i) => (
            <div key={s.step} className={`animate-fade-up stagger-${i + 1}`}>
              <div className={`text-2xl font-extrabold ${s.color} opacity-30 mb-2 font-mono-cipher`}>
                {s.step}
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">{s.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ PRIVACY LENS PREVIEW ═══════ */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--void-2)]/30 p-8">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={14} className="text-[var(--cipher-cyan)]" />
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em]">
            Privacy Lens
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-5">
          Every feature has a Privacy Lens. See what the chain stores vs what only you can read.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-[var(--void-3)] border border-[var(--border-subtle)] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--cipher-violet)]">
              <Lock size={12} /> What chain sees
            </div>
            <div className="space-y-2 font-mono-cipher text-[10px] text-[var(--cipher-violet)]/50">
              <p>bid: 0xc4f3...a1b2</p>
              <p>amount: 0x7e9d...f3c8</p>
              <p>balance: 0x2b1a...9e4f</p>
            </div>
          </div>
          <div className="rounded-lg bg-[var(--void-3)] border border-[var(--cipher-cyan)]/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--cipher-cyan)]">
              <Eye size={12} /> What you see
            </div>
            <div className="space-y-2 font-mono-cipher text-[10px] text-[var(--cipher-cyan)]">
              <p>bid: 1,250 CDEX</p>
              <p>amount: 500 CDEX</p>
              <p>balance: 10,000 CDEX</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "FHE Operations", value: "14+", color: "text-[var(--cipher-violet)]" },
          { label: "Smart Contracts", value: "16", color: "text-[var(--cipher-blue)]" },
          { label: "Encrypted Features", value: "12", color: "text-[var(--cipher-cyan)]" },
          { label: "Privacy Level", value: "Full", color: "text-[var(--cipher-green)]" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-[var(--void-2)]/40 border border-[var(--border-subtle)] px-4 py-3 text-center"
          >
            <p className={`text-lg font-bold font-mono-cipher ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ═══════ BOTTOM BAR ═══════ */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pb-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <TrendingUp size={10} />
            14+ FHE operations
          </span>
          <span>-</span>
          <span>16 smart contracts</span>
          <span>-</span>
          <span>12 encrypted features</span>
        </div>
        <span className="font-mono-cipher text-[10px]">
          Powered by Fhenix CoFHE
        </span>
      </div>
    </div>
  );
}
