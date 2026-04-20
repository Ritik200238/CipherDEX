"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Zap, ArrowRight, Eye, Lock, Rocket } from "lucide-react";

const STORAGE_KEY = "cipherdex-onboarding-seen";

interface Screen {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  points: string[];
  gradient: string;
}

const SCREENS: Screen[] = [
  {
    icon: Eye,
    title: "The Problem",
    subtitle: "Every trade you make is public",
    points: [
      "MEV bots front-run your orders, costing traders $500M+ annually",
      "Auction bids are visible, enabling sniping and manipulation",
      "Portfolio values are exposed, making you a target",
    ],
    gradient: "from-red-600 to-orange-600",
  },
  {
    icon: Shield,
    title: "The Solution",
    subtitle: "Fully Homomorphic Encryption",
    points: [
      "Prices, bids, and balances are encrypted on-chain",
      "Smart contracts compute on encrypted data without decrypting",
      "Only you can see your own values via cryptographic permits",
    ],
    gradient: "from-[var(--cipher-violet)] to-[var(--cipher-blue)]",
  },
  {
    icon: Rocket,
    title: "Pick Your Path",
    subtitle: "Start using CipherDEX",
    points: [
      "Trade: Submit hidden limit orders for MEV-proof swaps",
      "Auction: Create sealed-bid auctions nobody can front-run",
      "Pay: Split payments with encrypted amounts",
    ],
    gradient: "from-[var(--cipher-cyan)] to-[var(--cipher-green)]",
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // noop
    }
  };

  const next = () => {
    if (step < SCREENS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const screen = SCREENS[step];
  const Icon = screen.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={dismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-elevated rounded-2xl w-full max-w-md overflow-hidden"
        >
          {/* Top gradient bar */}
          <div className={`h-1 bg-gradient-to-r ${screen.gradient}`} />

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${screen.gradient} flex items-center justify-center shadow-lg`}>
                <Icon size={24} className="text-white" />
              </div>
              <button
                onClick={dismiss}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{screen.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{screen.subtitle}</p>
                </div>

                <ul className="space-y-3">
                  {screen.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-[var(--void-4)] flex items-center justify-center shrink-0">
                        <Lock size={10} className="text-[var(--cipher-violet)]" />
                      </div>
                      <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {SCREENS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-[var(--cipher-violet)]"
                        : i < step
                          ? "w-1.5 bg-[var(--cipher-violet)]/40"
                          : "w-1.5 bg-[var(--void-5)]"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={dismiss}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                             bg-gradient-to-r from-[var(--cipher-violet)] to-[var(--cipher-blue)]
                             text-white hover:shadow-lg hover:shadow-[var(--cipher-violet)]/25
                             transition-all duration-300"
                >
                  {step === SCREENS.length - 1 ? "Get Started" : "Next"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
