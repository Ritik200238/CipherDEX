"use client";

import { useCallback, useState } from "react";
import { useCofhe } from "./useCofhe";

/**
 * Encryption stages reported by cofhejs during the encrypt() call.
 * Matches the EncryptStep enum from cofhejs/web.
 */
export type EncryptStage =
  | "idle"
  | "extract"
  | "pack"
  | "prove"
  | "verify"
  | "replace"
  | "done"
  | "error";

interface EncryptState {
  stage: EncryptStage;
  encrypting: boolean;
  error: string | null;
}

/**
 * Hook wrapping cofhejs.encrypt() with progress tracking.
 *
 * Usage:
 * ```ts
 * const { encrypt, stage, encrypting, error } = useEncrypt();
 * const result = await encrypt([Encryptable.uint128(price)]);
 * ```
 */
export function useEncrypt() {
  const { initialized } = useCofhe();
  const [state, setState] = useState<EncryptState>({
    stage: "idle",
    encrypting: false,
    error: null,
  });

  const encrypt = useCallback(
    async <T extends unknown[]>(items: [...T]) => {
      if (!initialized) {
        setState({ stage: "error", encrypting: false, error: "cofhejs not initialized" });
        return null;
      }

      setState({ stage: "extract", encrypting: true, error: null });

      try {
        const { cofhejs } = await import("cofhejs/web");

        const result = await cofhejs.encrypt(items, (step) => {
          setState((prev) => ({ ...prev, stage: step as EncryptStage }));
        });

        if (result.error) {
          throw new Error(String(result.error));
        }

        setState({ stage: "done", encrypting: false, error: null });
        return result.data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Encryption failed";
        setState({ stage: "error", encrypting: false, error: message });
        return null;
      }
    },
    [initialized],
  );

  const reset = useCallback(() => {
    setState({ stage: "idle", encrypting: false, error: null });
  }, []);

  return {
    encrypt,
    reset,
    stage: state.stage,
    encrypting: state.encrypting,
    error: state.error,
  };
}
