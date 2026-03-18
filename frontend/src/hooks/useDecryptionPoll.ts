"use client";

import { useCallback, useRef, useState } from "react";
import { ethers } from "ethers";
import { FHE_ASYNC } from "@/lib/constants";

interface DecryptionPollState {
  polling: boolean;
  error: string | null;
  timedOut: boolean;
}

/**
 * Poll a contract's `getDecryptResultSafe()` view method for an async FHE decryption result.
 *
 * FHE decryption on Fhenix is asynchronous: you call FHE.decrypt() in one tx,
 * then poll getDecryptResultSafe(handle) until (value, true) is returned.
 *
 * Usage:
 * ```ts
 * const { poll, polling, error, timedOut } = useDecryptionPoll();
 * const value = await poll(contract, encryptedHandle);
 * ```
 */
export function useDecryptionPoll() {
  const [state, setState] = useState<DecryptionPollState>({
    polling: false,
    error: null,
    timedOut: false,
  });

  // Track whether we should abort polling (e.g. component unmount)
  const abortRef = useRef(false);

  const poll = useCallback(
    async (
      contract: ethers.Contract,
      encryptedHandle: bigint,
      methodName = "getDecryptResultSafe",
    ): Promise<bigint | null> => {
      setState({ polling: true, error: null, timedOut: false });
      abortRef.current = false;

      const startTime = Date.now();

      try {
        while (Date.now() - startTime < FHE_ASYNC.timeoutMs) {
          if (abortRef.current) {
            setState({ polling: false, error: "Polling cancelled", timedOut: false });
            return null;
          }

          try {
            const result = await contract[methodName](encryptedHandle);
            // getDecryptResultSafe returns (value, isReady)
            const value = result[0];
            const isReady = result[1];

            if (isReady) {
              setState({ polling: false, error: null, timedOut: false });
              return BigInt(value);
            }
          } catch {
            // Contract call may fail if decryption hasn't been requested yet — keep polling
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, FHE_ASYNC.pollIntervalMs));
        }

        // Timed out
        setState({
          polling: false,
          error: "FHE computation is taking longer than expected. Please try again in a moment.",
          timedOut: true,
        });
        return null;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Decryption polling failed";
        setState({ polling: false, error: message, timedOut: false });
        return null;
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    poll,
    cancel,
    polling: state.polling,
    error: state.error,
    timedOut: state.timedOut,
  };
}
