"use client";

import { motion } from "framer-motion";
import { ENCRYPT_STAGES } from "@/lib/constants";
import type { EncryptStage } from "@/hooks/useEncrypt";
import { Lock, Check, Loader2 } from "lucide-react";

interface EncryptionProgressProps {
  stage: EncryptStage;
  visible: boolean;
}

const STAGE_ORDER: EncryptStage[] = ["extract", "pack", "prove", "verify", "replace", "done"];

/**
 * 6-stage progress bar that visualizes the cofhejs.encrypt() pipeline.
 * Each stage lights up as the encryption proceeds through:
 * Extract -> Pack -> Prove -> Verify -> Replace -> Done
 */
export function EncryptionProgress({ stage, visible }: EncryptionProgressProps) {
  if (!visible || stage === "idle") return null;

  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-purple-300">
        <Lock size={14} />
        Secure Processing
      </div>

      <div className="flex gap-1">
        {ENCRYPT_STAGES.map((s, i) => {
          const isComplete = currentIndex > i || stage === "done";
          const isCurrent = currentIndex === i && stage !== "done";
          const isPending = currentIndex < i && stage !== "done";

          return (
            <div key={s.key} className="flex-1 flex flex-col gap-1.5">
              {/* Progress bar segment */}
              <div className="h-1.5 rounded-full overflow-hidden bg-gray-700/50">
                <motion.div
                  className={`h-full rounded-full ${
                    isComplete
                      ? "bg-emerald-500"
                      : isCurrent
                        ? "bg-purple-500"
                        : "bg-transparent"
                  }`}
                  initial={{ width: "0%" }}
                  animate={{
                    width: isComplete ? "100%" : isCurrent ? "60%" : "0%",
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              {/* Label */}
              <div className="flex items-center gap-1">
                {isComplete ? (
                  <Check size={10} className="text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 size={10} className="text-purple-400 animate-spin" />
                ) : null}
                <span
                  className={`text-[10px] ${
                    isComplete
                      ? "text-emerald-400"
                      : isCurrent
                        ? "text-purple-300"
                        : isPending
                          ? "text-gray-500"
                          : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {stage === "error" && (
        <p className="text-xs text-red-400">Encryption failed. Please try again.</p>
      )}
    </motion.div>
  );
}
