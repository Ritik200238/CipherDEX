"use client";

import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import Link from "next/link";
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
  ArrowRight,
  Eye,
  TrendingUp,
  Activity,
} from "lucide-react";

/* ─── Feature data ──────────────────────────────────────── */

const PRIMARY_FEATURES = [
  {
    title: "P2P Trading",
    subtitle: "Encrypted order matching",
    description: "Submit hidden prices. FHE.gte() matches orders without revealing either side.",
    href: "/trade",
    icon: ArrowLeftRight,
    gradient: "from-violet-600 to-indigo-600",
    glow: "shadow-violet-500/20",
    ops: ["FHE.gte", "FHE.select"],
  },
  {
    title: "Sealed Auctions",
    subtitle: "Anti-snipe bidding",
    description: "Encrypted bids. FHE.max() finds the winner. Losers learn nothing.",
    href: "/auctions",
    icon: Gavel,
    gradient: "from-indigo-600 to-blue-600",
    glow: "shadow-indigo-500/20",
    ops: ["FHE.gt", "FHE.max", "FHE.select"],
  },
  {
    title: "Encrypted Escrow",
    subtitle: "Hidden deal terms",
    description: "FHE.eq() verifies deposits match agreed terms. Nobody sees the amounts.",
    href: "/escrow",
    icon: ShieldCheck,
    gradient: "from-blue-600 to-cyan-600",
    glow: "shadow-blue-500/20",
    ops: ["FHE.eq", "FHE.and"],
  },
];

const SECONDARY_FEATURES = [
  { title: "Limit Orders", desc: "MEV-proof triggers", href: "/limits", icon: Target, color: "text-emerald-400" },
  { title: "Batch Auction", desc: "Fair clearing price", href: "/batch", icon: Layers, color: "text-amber-400" },
  { title: "Portfolio", desc: "Hidden valuations", href: "/portfolio", icon: PieChart, color: "text-pink-400" },
  { title: "OTC Board", desc: "Whale-sized trades", href: "/otc", icon: Users, color: "text-indigo-400" },
  { title: "Reputation", desc: "Encrypted ratings", href: "/reputation", icon: Star, color: "text-orange-400" },
];

/* ─── Page ──────────────────────────────────────────────── */

export default function DashboardPage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();

  return (
    <div className="space-y-10">
      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--void-2)] via-[var(--void-1)] to-[var(--void-2)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--cipher-violet)] rounded-full blur-[200px] opacity-[0.06]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-[var(--cipher-cyan)] rounded-full blur-[180px] opacity-[0.04]" />

        {/* Grid pattern overlay */}
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
              Trade with{" "}
              <span className="gradient-text">complete</span>
              <br />
              <span className="gradient-text">privacy</span>
              <span className="text-[var(--text-primary)]">.</span>
            </h1>

            {/* Subheadline */}
            <p className="animate-fade-up stagger-3 text-base md:text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg mb-8">
              Every order price, bid amount, and portfolio balance is encrypted on-chain.
              The protocol computes matches and settles trades on data{" "}
              <span className="text-[var(--text-primary)] font-medium">nobody can see</span>.
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
                    href="/trade"
                    className="group flex items-center gap-2.5 px-5 py-3 rounded-xl
                             bg-gradient-to-r from-[var(--cipher-violet)] to-[var(--cipher-blue)]
                             text-white text-sm font-semibold
                             hover:shadow-lg hover:shadow-[var(--cipher-violet)]/25
                             transition-all duration-300"
                  >
                    Start Trading
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/auctions"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl
                             bg-[var(--void-4)] border border-[var(--border-default)]
                             text-[var(--text-secondary)] text-sm font-medium
                             hover:text-[var(--text-primary)] hover:border-[var(--border-active)]
                             transition-all duration-300"
                  >
                    <Gavel size={14} />
                    Explore Auctions
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats (right side, absolute on desktop) */}
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

      {/* ═══════ PRIMARY FEATURES ═══════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em]">
            Core Protocol
          </h2>
          <div className="h-px flex-1 ml-4 bg-gradient-to-r from-[var(--border-subtle)] to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRIMARY_FEATURES.map((f, i) => (
            <Link
              key={f.href}
              href={f.href}
              className={`animate-fade-up stagger-${i + 1} group relative overflow-hidden rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition-all duration-500 hover:${f.glow} hover:shadow-xl`}
            >
              {/* Card gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500`} />

              <div className="relative p-6 space-y-4">
                {/* Icon + title row */}
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

                {/* FHE ops tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {f.ops.map((op) => (
                    <span
                      key={op}
                      className="px-2 py-0.5 rounded text-[10px] font-mono-cipher font-medium
                               bg-[var(--cipher-violet)]/8 text-[var(--cipher-violet)]/80 border border-[var(--cipher-violet)]/10"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════ SECONDARY FEATURES ═══════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em]">
            Advanced Features
          </h2>
          <div className="h-px flex-1 ml-4 bg-gradient-to-r from-[var(--border-subtle)] to-transparent" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SECONDARY_FEATURES.map((f, i) => (
            <Link
              key={f.href}
              href={f.href}
              className={`animate-fade-up stagger-${i + 1} group rounded-xl p-4 border border-[var(--border-subtle)]
                         bg-[var(--void-2)]/40 hover:bg-[var(--void-3)]/60
                         hover:border-[var(--border-default)] transition-all duration-300`}
            >
              <f.icon size={18} className={`${f.color} mb-3 opacity-60 group-hover:opacity-100 transition-opacity`} />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">{f.title}</h3>
              <p className="text-[11px] text-[var(--text-muted)]">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--void-2)]/30 p-8">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-6">
          How CipherDEX Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Encrypt", desc: "Your price is encrypted client-side via cofhejs with a ZK proof", color: "text-[var(--cipher-violet)]" },
            { step: "02", title: "Submit", desc: "The encrypted ciphertext is submitted to the smart contract on-chain", color: "text-[var(--cipher-blue)]" },
            { step: "03", title: "Compute", desc: "FHE operations match, compare, and settle without ever decrypting", color: "text-[var(--cipher-cyan)]" },
            { step: "04", title: "Unseal", desc: "Only you can decrypt your own data via permit — nobody else can see it", color: "text-[var(--cipher-green)]" },
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

      {/* ═══════ BOTTOM BAR ═══════ */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pb-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <TrendingUp size={10} />
            14+ FHE operations
          </span>
          <span>•</span>
          <span>11 smart contracts</span>
          <span>•</span>
          <span>8 encrypted features</span>
        </div>
        <span className="font-mono-cipher text-[10px]">
          Powered by Fhenix CoFHE
        </span>
      </div>
    </div>
  );
}
