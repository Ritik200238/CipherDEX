"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel,
  Lock,
  X,
  Plus,
  Loader2,
  Timer,
  Users,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  Shield,
  Eye,
} from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import { useEncrypt } from "@/hooks/useEncrypt";
import { useUnseal } from "@/hooks/useUnseal";
import { useContract, useReadContract } from "@/hooks/useContract";
import { EncryptionProgress } from "@/components/shared/EncryptionProgress";
import { TransactionStatus, type TxState } from "@/components/shared/TransactionStatus";
import { FaucetButton } from "@/components/shared/FaucetButton";
import { CONTRACTS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuctionData {
  id: number;
  seller: string;
  token: string;
  paymentToken: string;
  amount: string;
  deadline: number;
  bidCount: number;
  status: number; // 0=OPEN  1=CLOSED  2=REVEALED  3=SETTLED  4=CANCELLED
  revealedBid: string;
  revealedBidder: string;
  myBidUnsealed: string | null;
}

type ModalView = "none" | "create" | "bid" | "detail";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<number, string> = {
  0: "OPEN",
  1: "CLOSED",
  2: "REVEALED",
  3: "SETTLED",
  4: "CANCELLED",
};

const STATUS_STYLE: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  1: { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/20" },
  2: { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20" },
  3: { bg: "bg-gray-500/15",    text: "text-gray-400",    border: "border-gray-500/20" },
  4: { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20" },
};

const DURATION_OPTS = [
  { label: "5 min",  value: 300 },
  { label: "15 min", value: 900 },
  { label: "1 hour", value: 3600 },
  { label: "24 hrs", value: 86400 },
];

const SNIPE_OPTS = [
  { label: "30 s",  value: 30 },
  { label: "60 s",  value: 60 },
  { label: "120 s", value: 120 },
];

const TOKEN_OPTIONS = [
  { label: "CDEX", address: CONTRACTS.ConfidentialToken, symbol: "CDEX" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function tokenSymbol(addr: string): string {
  const hit = TOKEN_OPTIONS.find((t) => t.address.toLowerCase() === addr.toLowerCase());
  return hit ? hit.symbol : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  Countdown hook (ticks every second)                                */
/* ------------------------------------------------------------------ */

function useCountdown(deadline: number): string {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = deadline - now;
  if (diff <= 0) return "Ended";

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function CountdownBadge({ deadline }: { deadline: number }) {
  const str = useCountdown(deadline);
  const now = Math.floor(Date.now() / 1000);
  const ended = deadline <= now;
  const urgent = !ended && deadline - now < 60;

  return (
    <span
      className={`font-mono text-xs ${
        ended ? "text-gray-500" : urgent ? "text-red-400 animate-pulse" : "text-cyan-400"
      }`}
    >
      {str}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Token dropdown (reusable)                                          */
/* ------------------------------------------------------------------ */

function TokenDropdown({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5
                     bg-[#0a0b14] border border-purple-500/10 text-sm text-gray-200
                     hover:border-purple-500/30 transition-colors"
        >
          <span>{value ? tokenSymbol(value) : "Select token"}</span>
          <ChevronDown
            size={14}
            className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 mt-1 w-full rounded-lg border border-purple-500/20
                         bg-[#111227] shadow-xl overflow-hidden"
            >
              {TOKEN_OPTIONS.map((t) => (
                <button
                  key={t.address}
                  onClick={() => {
                    onChange(t.address);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    value === t.address
                      ? "bg-purple-600/15 text-purple-300"
                      : "text-gray-200 hover:bg-purple-600/10"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  AuctionsPage                                                       */
/* ================================================================== */

export default function AuctionsPage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();
  const { encrypt, stage, encrypting } = useEncrypt();
  const { unseal, unsealing } = useUnseal();
  const auctionContract = useContract("SealedAuction");
  const auctionRead     = useReadContract("SealedAuction");

  /* ---- core state ---- */
  const [auctions, setAuctions]     = useState<AuctionData[]>([]);
  const [loading, setLoading]       = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ---- modals ---- */
  const [modalView, setModalView]             = useState<ModalView>("none");
  const [selectedAuction, setSelectedAuction] = useState<AuctionData | null>(null);

  /* ---- create-auction form ---- */
  const [cToken, setCToken]       = useState<string>(CONTRACTS.ConfidentialToken);
  const [cPayToken, setCPayToken] = useState<string>("");
  const [cAmount, setCAmount]     = useState("");
  const [cDuration, setCDuration] = useState(3600);
  const [cSnipe, setCSnipe]       = useState(120);

  /* ---- bid form ---- */
  const [bidAmount, setBidAmount] = useState("");

  /* ---- tx feedback ---- */
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash]   = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const busyRef = useRef<Set<string>>(new Set());

  const deployed =
    CONTRACTS.SealedAuction !== "0x0000000000000000000000000000000000000000";

  const nowSec = Math.floor(Date.now() / 1000);

  const isSeller = (a: AuctionData) =>
    account !== null && a.seller.toLowerCase() === account.toLowerCase();

  /* ---------------------------------------------------------------- */
  /*  Fetch all auctions from chain                                    */
  /* ---------------------------------------------------------------- */

  const fetchAuctions = useCallback(async () => {
    if (!auctionRead) return;
    setLoading(true);
    try {
      const total = Number(await auctionRead.getAuctionCount());
      const list: AuctionData[] = [];

      for (let i = 0; i < total; i++) {
        const a = await auctionRead.getAuction(i);
        list.push({
          id: i,
          seller:         a[0],
          token:          a[1],
          paymentToken:   a[2],
          amount:         a[3].toString(),
          deadline:       Number(a[4]),
          bidCount:       Number(a[5]),
          status:         Number(a[6]),
          revealedBid:    a[7].toString(),
          revealedBidder: a[8],
          myBidUnsealed:  null,
        });
      }

      list.reverse();          // newest first
      setAuctions(list);
    } catch {
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  }, [auctionRead]);

  useEffect(() => { fetchAuctions(); }, [fetchAuctions, refreshKey]);

  /* ---------------------------------------------------------------- */
  /*  Tx helper (reduces boilerplate)                                  */
  /* ---------------------------------------------------------------- */

  function handleTxError(err: unknown) {
    setTxState("error");
    setTxError(
      err instanceof Error
        ? err.message.includes("user rejected")
          ? "Transaction rejected"
          : err.message.slice(0, 120)
        : "Transaction failed",
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Unseal own bid                                                   */
  /* ---------------------------------------------------------------- */

  const unsealMyBid = useCallback(
    async (auction: AuctionData) => {
      if (!auctionContract || !account) return;
      try {
        const hash = await auctionContract.getMyBid(auction.id);
        const val  = await unseal(BigInt(hash), 5);      // Uint128
        if (val !== null) {
          setAuctions((prev) =>
            prev.map((a) =>
              a.id === auction.id ? { ...a, myBidUnsealed: val.toString() } : a,
            ),
          );
          // Also update selectedAuction if open
          setSelectedAuction((prev) =>
            prev && prev.id === auction.id
              ? { ...prev, myBidUnsealed: val.toString() }
              : prev,
          );
        }
      } catch {
        /* no bid placed or unseal failed — expected */
      }
    },
    [auctionContract, account, unseal],
  );

  /* ---------------------------------------------------------------- */
  /*  Create auction                                                   */
  /* ---------------------------------------------------------------- */

  const handleCreate = useCallback(async () => {
    if (!auctionContract || !cToken || !cPayToken || !cAmount) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const tx = await auctionContract.createAuction(
        cToken,
        cPayToken,
        BigInt(cAmount),
        BigInt(cDuration),
        BigInt(cSnipe),
      );
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setCAmount("");
      setModalView("none");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [auctionContract, cToken, cPayToken, cAmount, cDuration, cSnipe]);

  /* ---------------------------------------------------------------- */
  /*  Place bid                                                        */
  /* ---------------------------------------------------------------- */

  const handleBid = useCallback(async () => {
    if (!auctionContract || !initialized || !selectedAuction || !bidAmount) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const { Encryptable } = await import("cofhejs/web");
      const enc = await encrypt([Encryptable.uint128(BigInt(bidAmount))]);
      if (!enc) throw new Error("Encryption failed");

      const tx = await auctionContract.bid(selectedAuction.id, enc[0]);
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setBidAmount("");
      setModalView("none");
      setSelectedAuction(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [auctionContract, initialized, selectedAuction, bidAmount, encrypt]);

  /* ---- single-use action helpers (close / reveal / settle / cancel) */

  const guardedAction = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      if (busyRef.current.has(key)) return;
      busyRef.current.add(key);
      setTxState("signing");
      setTxError(undefined);
      setTxHash(undefined);
      try {
        await fn();
        setRefreshKey((k) => k + 1);
      } catch (err: unknown) {
        handleTxError(err);
      } finally {
        busyRef.current.delete(key);
      }
    },
    [],
  );

  const handleClose = useCallback(
    (id: number) =>
      guardedAction(`close-${id}`, async () => {
        const tx = await auctionContract!.closeAuction(id);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
      }),
    [auctionContract, guardedAction],
  );

  const handleReveal = useCallback(
    (id: number) =>
      guardedAction(`reveal-${id}`, async () => {
        const tx = await auctionContract!.revealWinner(id);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
      }),
    [auctionContract, guardedAction],
  );

  const handleSettle = useCallback(
    (id: number) =>
      guardedAction(`settle-${id}`, async () => {
        const tx = await auctionContract!.settleAuction(id);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
      }),
    [auctionContract, guardedAction],
  );

  const handleCancel = useCallback(
    (id: number) =>
      guardedAction(`cancel-${id}`, async () => {
        const tx = await auctionContract!.cancelAuction(id);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
      }),
    [auctionContract, guardedAction],
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ---------- header ---------- */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Gavel size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Sealed-Bid Auctions</h1>
            <p className="text-sm text-gray-400">
              Encrypted bids -- highest wins, losers learn nothing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          {account && (
            <button
              onClick={() => {
                setModalView("create");
                setTxState("idle");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium
                         hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              <Plus size={16} />
              Create Auction
            </button>
          )}
        </div>
      </div>

      {/* ---------- not connected ---------- */}
      {!account && (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center">
            <Gavel size={24} className="text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Connect your wallet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Create auctions, place sealed bids, and discover winners -- all with
            fully encrypted bid amounts via FHE.
          </p>
        </div>
      )}

      {/* ---------- contract not deployed ---------- */}
      {account && !deployed && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              SealedAuction contract not deployed yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Deploy the contracts and update the address in constants.ts.
            </p>
          </div>
        </div>
      )}

      {/* ---------- anti-snipe info ---------- */}
      {account && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <Timer size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300/80">
            <strong>Anti-snipe protection:</strong> Bids in the last 60 seconds
            extend the deadline. Bid amounts stay encrypted -- snipers cannot see
            what to outbid.
          </p>
        </div>
      )}

      {/* ---------- tx / encryption status ---------- */}
      <TransactionStatus
        state={txState}
        txHash={txHash}
        error={txError}
        onDismiss={() => setTxState("idle")}
      />
      <EncryptionProgress stage={stage} visible={encrypting} />

      {/* ---------- toolbar ---------- */}
      {account && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {auctions.length} auction{auctions.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      )}

      {/* ================= AUCTION GRID ================= */}
      {account && (
        <>
          {loading && auctions.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-blue-400 animate-spin" />
            </div>
          ) : auctions.length === 0 ? (
            <div className="glass rounded-xl py-20 text-center space-y-3">
              <Gavel size={36} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-500">No auctions yet</p>
              <p className="text-xs text-gray-600">
                Create the first sealed-bid auction to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {auctions.map((auction) => {
                const style = STATUS_STYLE[auction.status] ?? STATUS_STYLE[0];
                const mine  = isSeller(auction);
                const ended = auction.deadline <= nowSec;

                return (
                  <motion.div
                    key={auction.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl overflow-hidden hover:border-purple-500/25 transition-all"
                  >
                    {/* ---- card header ---- */}
                    <div className="px-5 py-4 border-b border-purple-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{auction.id}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {STATUS_LABEL[auction.status]}
                        </span>
                      </div>
                      {mine && (
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                          Your Auction
                        </span>
                      )}
                    </div>

                    {/* ---- card body ---- */}
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Selling</p>
                          <p className="text-lg font-bold text-gray-100">
                            {auction.amount}{" "}
                            <span className="text-sm font-medium text-purple-400">
                              {tokenSymbol(auction.token)}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Payment</p>
                          <p className="text-sm font-medium text-gray-300">
                            {tokenSymbol(auction.paymentToken)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Timer size={12} className="text-cyan-500/60" />
                          <CountdownBadge deadline={auction.deadline} />
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Users size={12} className="text-purple-500/60" />
                          {auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {auction.status === 0 && !ended && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                          <Shield size={10} className="text-cyan-500/40" />
                          Anti-snipe protection active
                        </div>
                      )}

                      {/* winner (after reveal) */}
                      {auction.status >= 2 &&
                        auction.revealedBidder !==
                          "0x0000000000000000000000000000000000000000" && (
                          <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2 space-y-1">
                            <p className="text-[10px] text-blue-400/60 uppercase tracking-wider font-semibold">
                              Winner
                            </p>
                            <p className="text-xs text-gray-300 font-mono">
                              {shortAddr(auction.revealedBidder)}
                            </p>
                            <p className="text-sm text-blue-300 font-semibold">
                              Bid: {auction.revealedBid}
                            </p>
                          </div>
                        )}
                    </div>

                    {/* ---- card actions ---- */}
                    <div className="px-5 py-3 border-t border-purple-500/5 flex items-center gap-2">
                      {/* OPEN + not seller + not ended => Place Bid */}
                      {auction.status === 0 && !ended && !mine && (
                        <button
                          onClick={() => {
                            setSelectedAuction(auction);
                            setBidAmount("");
                            setModalView("bid");
                            setTxState("idle");
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-gradient-to-r from-purple-600 to-blue-600 text-white
                                     hover:from-purple-500 hover:to-blue-500 transition-all"
                        >
                          <Lock size={12} />
                          Place Bid
                        </button>
                      )}

                      {/* OPEN + seller + ended + bids => Close */}
                      {auction.status === 0 && mine && ended && auction.bidCount > 0 && (
                        <button
                          onClick={() => handleClose(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-amber-500/15 border border-amber-500/20 text-amber-300
                                     hover:bg-amber-500/25 transition-all"
                        >
                          <Clock size={12} />
                          Close Auction
                        </button>
                      )}

                      {/* OPEN + seller + no bids => Cancel */}
                      {auction.status === 0 && mine && auction.bidCount === 0 && (
                        <button
                          onClick={() => handleCancel(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-red-500/10 border border-red-500/20 text-red-400
                                     hover:bg-red-500/20 transition-all"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                      )}

                      {/* CLOSED => Reveal Winner */}
                      {auction.status === 1 && (
                        <button
                          onClick={() => handleReveal(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-blue-500/15 border border-blue-500/20 text-blue-300
                                     hover:bg-blue-500/25 transition-all"
                        >
                          <Zap size={12} />
                          Reveal Winner
                        </button>
                      )}

                      {/* REVEALED => Settle */}
                      {auction.status === 2 && (
                        <button
                          onClick={() => handleSettle(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-emerald-500/15 border border-emerald-500/20 text-emerald-300
                                     hover:bg-emerald-500/25 transition-all"
                        >
                          <CheckCircle2 size={12} />
                          Settle
                        </button>
                      )}

                      {/* Details (always) */}
                      <button
                        onClick={() => {
                          setSelectedAuction(auction);
                          setModalView("detail");
                          setTxState("idle");
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-medium
                                   bg-white/[0.03] border border-purple-500/10 text-gray-400
                                   hover:text-gray-200 hover:bg-white/[0.06] transition-all"
                      >
                        Details
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================== CREATE AUCTION MODAL ======================== */}
      <AnimatePresence>
        {modalView === "create" && (
          <motion.div
            key="create-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}
          >
            <motion.div
              key="create-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-purple-500/20
                         shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Gavel size={18} className="text-blue-400" />
                  Create Auction
                </h3>
                <button
                  onClick={() => setModalView("none")}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <TokenDropdown label="Token to Auction" value={cToken} onChange={setCToken} />
              <TokenDropdown label="Payment Token" value={cPayToken} onChange={setCPayToken} />

              {/* amount */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Amount</label>
                <input
                  type="number"
                  value={cAmount}
                  onChange={(e) => setCAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-purple-500/10
                             text-sm text-gray-200 placeholder:text-gray-600
                             focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>

              {/* duration */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setCDuration(d.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                        cDuration === d.value
                          ? "bg-purple-600/15 border-purple-500/30 text-purple-300"
                          : "bg-[#0a0b14] border-purple-500/10 text-gray-400 hover:border-purple-500/20"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* snipe extension */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Shield size={10} className="text-cyan-400" />
                  Anti-Snipe Extension
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SNIPE_OPTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setCSnipe(s.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                        cSnipe === s.value
                          ? "bg-cyan-600/15 border-cyan-500/30 text-cyan-300"
                          : "bg-[#0a0b14] border-purple-500/10 text-gray-400 hover:border-purple-500/20"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600">
                  Bids in the last 60 s extend the deadline by this amount
                </p>
              </div>

              {/* submit */}
              <button
                onClick={handleCreate}
                disabled={
                  !cToken ||
                  !cPayToken ||
                  !cAmount ||
                  txState === "signing" ||
                  txState === "confirming"
                }
                className="w-full rounded-lg py-3 text-sm font-semibold text-white
                           bg-gradient-to-r from-purple-600 to-blue-600
                           hover:from-purple-500 hover:to-blue-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all flex items-center justify-center gap-2"
              >
                {txState === "signing" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sign in wallet...
                  </>
                ) : txState === "confirming" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Gavel size={14} />
                    Create Auction
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== BID MODAL ======================== */}
      <AnimatePresence>
        {modalView === "bid" && selectedAuction && (
          <motion.div
            key="bid-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              setModalView("none");
              setSelectedAuction(null);
            }}
          >
            <motion.div
              key="bid-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-md p-6 space-y-5 border border-purple-500/20 shadow-2xl"
            >
              {/* header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Lock size={18} className="text-purple-400" />
                  Place Sealed Bid
                </h3>
                <button
                  onClick={() => {
                    setModalView("none");
                    setSelectedAuction(null);
                  }}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* auction info */}
              <div className="space-y-2.5 rounded-xl bg-[#0a0b14]/80 p-4 border border-purple-500/5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Auction</span>
                  <span className="text-gray-200 font-mono">#{selectedAuction.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Selling</span>
                  <span className="text-gray-200 font-medium">
                    {selectedAuction.amount} {tokenSymbol(selectedAuction.token)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Token</span>
                  <span className="text-gray-200">{tokenSymbol(selectedAuction.paymentToken)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time Left</span>
                  <CountdownBadge deadline={selectedAuction.deadline} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bids</span>
                  <span className="text-gray-200">{selectedAuction.bidCount}</span>
                </div>
              </div>

              {/* bid input */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Lock size={10} className="text-purple-400" />
                  Your Bid Amount
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount"
                  min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-purple-500/10
                             text-sm text-gray-200 placeholder:text-gray-600
                             focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>

              {/* privacy note */}
              <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 px-4 py-3">
                <p className="text-xs text-purple-300/80 leading-relaxed">
                  Your bid is encrypted -- nobody sees it until the auction
                  closes. The highest bid wins, discovered via FHE.gt() and
                  FHE.max() without revealing losing bids.
                </p>
              </div>

              {/* encryption progress */}
              <EncryptionProgress stage={stage} visible={encrypting} />

              {/* submit */}
              <button
                onClick={handleBid}
                disabled={
                  !initialized ||
                  !bidAmount ||
                  encrypting ||
                  txState === "signing" ||
                  txState === "confirming"
                }
                className="w-full rounded-lg py-3 text-sm font-semibold text-white
                           bg-gradient-to-r from-purple-600 to-blue-600
                           hover:from-purple-500 hover:to-blue-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all flex items-center justify-center gap-2"
              >
                {encrypting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Encrypting...
                  </>
                ) : txState === "signing" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sign in wallet...
                  </>
                ) : txState === "confirming" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Encrypt &amp; Submit Bid
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== DETAIL MODAL ======================== */}
      <AnimatePresence>
        {modalView === "detail" && selectedAuction && (
          <motion.div
            key="detail-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              setModalView("none");
              setSelectedAuction(null);
            }}
          >
            <motion.div
              key="detail-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-purple-500/20
                         shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100">
                  Auction #{selectedAuction.id}
                </h3>
                <button
                  onClick={() => {
                    setModalView("none");
                    setSelectedAuction(null);
                  }}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* status */}
              {(() => {
                const s = STATUS_STYLE[selectedAuction.status] ?? STATUS_STYLE[0];
                return (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}
                  >
                    {STATUS_LABEL[selectedAuction.status]}
                  </span>
                );
              })()}

              {/* countdown */}
              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Timer size={14} className="text-cyan-400" />
                  <span className="uppercase tracking-wider font-semibold">Timer</span>
                </div>
                <div className="text-2xl font-bold text-cyan-400">
                  <CountdownBadge deadline={selectedAuction.deadline} />
                </div>
                {selectedAuction.status === 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    <Shield size={10} className="text-cyan-500/40" />
                    Anti-snipe: late bids extend the deadline
                  </div>
                )}
              </div>

              {/* details */}
              <div className="space-y-2.5 rounded-xl bg-[#0a0b14]/80 p-4 border border-purple-500/5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Seller</span>
                  <span className="font-mono text-gray-300 text-xs">
                    {shortAddr(selectedAuction.seller)}
                    {isSeller(selectedAuction) && (
                      <span className="ml-2 text-purple-400">(you)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Selling</span>
                  <span className="text-gray-200 font-medium">
                    {selectedAuction.amount} {tokenSymbol(selectedAuction.token)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Token</span>
                  <span className="text-gray-200">{tokenSymbol(selectedAuction.paymentToken)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Bids</span>
                  <span className="text-gray-200">{selectedAuction.bidCount}</span>
                </div>
              </div>

              {/* your bid */}
              {account && (
                <div className="glass rounded-xl p-4 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Your Bid
                  </p>
                  {selectedAuction.myBidUnsealed !== null ? (
                    <p className="text-lg font-bold text-purple-300 font-mono">
                      {selectedAuction.myBidUnsealed}
                    </p>
                  ) : (
                    <button
                      onClick={() => unsealMyBid(selectedAuction)}
                      disabled={unsealing || !initialized}
                      className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300
                                 transition-colors disabled:opacity-50"
                    >
                      {unsealing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Eye size={12} />
                      )}
                      {unsealing ? "Unsealing..." : "Unseal My Bid"}
                    </button>
                  )}
                </div>
              )}

              {/* winner */}
              {selectedAuction.status >= 2 &&
                selectedAuction.revealedBidder !==
                  "0x0000000000000000000000000000000000000000" && (
                  <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4 space-y-2">
                    <p className="text-xs text-blue-400/60 uppercase tracking-wider font-semibold">
                      Winner
                    </p>
                    <p className="text-sm text-gray-200 font-mono">
                      {shortAddr(selectedAuction.revealedBidder)}
                    </p>
                    <p className="text-lg font-bold text-blue-300">
                      Winning Bid: {selectedAuction.revealedBid}
                    </p>
                  </div>
                )}

              {/* flow steps */}
              <div className="rounded-xl bg-[#0a0b14]/60 border border-purple-500/5 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Auction Flow
                </p>
                <div className="space-y-2">
                  {[
                    { n: 1, label: "Bidding",  desc: "Bidders submit encrypted bids",                      done: selectedAuction.status >= 1 },
                    { n: 2, label: "Close",    desc: "Seller closes after deadline, triggers FHE decrypt",  done: selectedAuction.status >= 1 },
                    { n: 3, label: "Reveal",   desc: "Retrieve decrypted winner from co-processor",        done: selectedAuction.status >= 2 },
                    { n: 4, label: "Settle",   desc: "Tokens transfer to winner, payment to seller",       done: selectedAuction.status >= 3 },
                  ].map((s) => (
                    <div key={s.n} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          s.done
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-gray-700/30 text-gray-500 border border-gray-600/20"
                        }`}
                      >
                        {s.done ? <CheckCircle2 size={12} /> : s.n}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${s.done ? "text-emerald-400" : "text-gray-400"}`}>
                          {s.label}
                        </p>
                        <p className="text-[10px] text-gray-600">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* action buttons */}
              <div className="flex gap-3">
                {selectedAuction.status === 0 &&
                  !isSeller(selectedAuction) &&
                  selectedAuction.deadline > nowSec && (
                    <button
                      onClick={() => {
                        setBidAmount("");
                        setModalView("bid");
                      }}
                      className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white
                                 bg-gradient-to-r from-purple-600 to-blue-600
                                 hover:from-purple-500 hover:to-blue-500 transition-all
                                 flex items-center justify-center gap-2"
                    >
                      <Lock size={14} />
                      Place Bid
                    </button>
                  )}

                {selectedAuction.status === 0 &&
                  isSeller(selectedAuction) &&
                  selectedAuction.deadline <= nowSec &&
                  selectedAuction.bidCount > 0 && (
                    <button
                      onClick={() => handleClose(selectedAuction.id)}
                      className="flex-1 rounded-lg py-2.5 text-sm font-semibold
                                 bg-amber-500/15 border border-amber-500/20 text-amber-300
                                 hover:bg-amber-500/25 transition-all
                                 flex items-center justify-center gap-2"
                    >
                      <Clock size={14} />
                      Close Auction
                    </button>
                  )}

                {selectedAuction.status === 1 && (
                  <button
                    onClick={() => handleReveal(selectedAuction.id)}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold
                               bg-blue-500/15 border border-blue-500/20 text-blue-300
                               hover:bg-blue-500/25 transition-all
                               flex items-center justify-center gap-2"
                  >
                    <Zap size={14} />
                    Reveal Winner
                  </button>
                )}

                {selectedAuction.status === 2 && (
                  <button
                    onClick={() => handleSettle(selectedAuction.id)}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold
                               bg-emerald-500/15 border border-emerald-500/20 text-emerald-300
                               hover:bg-emerald-500/25 transition-all
                               flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    Settle
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
