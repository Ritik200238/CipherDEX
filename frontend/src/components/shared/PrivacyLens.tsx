"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Hash } from "lucide-react";

interface PrivacyLensRow {
  label: string;
  /** What the chain sees — ciphertext hash or public value */
  chainValue: string;
  /** What the owner sees — unsealed plaintext */
  ownerValue: string;
  /** Whether this value is encrypted on-chain */
  encrypted: boolean;
}

interface PrivacyLensProps {
  rows: PrivacyLensRow[];
  title?: string;
}

/**
 * Split-screen component showing what the chain sees vs what the owner sees.
 * Toggling flips between ciphertext hashes and unsealed values.
 */
export function PrivacyLens({ rows, title = "Privacy Lens" }: PrivacyLensProps) {
  const [showOwner, setShowOwner] = useState(false);

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {showOwner ? (
            <Eye size={14} className="text-[var(--cipher-cyan)]" />
          ) : (
            <EyeOff size={14} className="text-[var(--cipher-violet)]" />
          )}
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {title}
          </span>
        </div>
        <button
          onClick={() => setShowOwner((p) => !p)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300
            ${showOwner
              ? "bg-[var(--cipher-cyan)]/10 border border-[var(--cipher-cyan)]/20 text-[var(--cipher-cyan)]"
              : "bg-[var(--cipher-violet)]/10 border border-[var(--cipher-violet)]/20 text-[var(--cipher-violet)]"
            }
          `}
        >
          {showOwner ? <Eye size={10} /> : <Lock size={10} />}
          {showOwner ? "Your View" : "Chain View"}
        </button>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {rows.map((row, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)] font-medium">{row.label}</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={showOwner ? "owner" : "chain"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5"
              >
                {row.encrypted && !showOwner ? (
                  <>
                    <Hash size={10} className="text-[var(--cipher-violet)]/60" />
                    <span className="font-mono-cipher text-xs text-[var(--cipher-violet)]/70 max-w-[200px] truncate">
                      {row.chainValue}
                    </span>
                  </>
                ) : (
                  <span className={`text-sm font-semibold ${
                    showOwner && row.encrypted ? "text-[var(--cipher-cyan)]" : "text-[var(--text-primary)]"
                  }`}>
                    {showOwner ? row.ownerValue : row.chainValue}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
