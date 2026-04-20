"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
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
  Info,
} from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import { useEncrypt } from "@/hooks/useEncrypt";
import { useUnseal } from "@/hooks/useUnseal";
import { useContract, useReadContract } from "@/hooks/useContract";
import { EncryptionProgress } from "@/components/shared/EncryptionProgress";
import { TransactionStatus, type TxState } from "@/components/shared/TransactionStatus";
import { FaucetButton } from "@/components/shared/FaucetButton";
import { RevealAnimation } from "@/components/shared/RevealAnimation";
import { CONTRACTS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VickreyAuctionData {
  id: number;
  seller: string;
  token: string;
  paymentToken: string;
  amount: string;
  deadline: number;
  bidCount: number;
  status: number; // 0=OPEN 1=CLOSED 2=REVEALED 3=SETTLED 4=CANCELLED
  winnerBid: string;
  winner: string;
  secondPrice: string;
  myBidUnsealed: string | null;
}

type ModalView = "none" | "create" | "bid" | "detail";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<number, string> = {
  0: "OPEN", 1: "CLOSED", 2: "REVEALED", 3: "SETTLED", 4: "CANCELLED",
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

const TOKEN_OPTIONS = [
  { label: "CDEX", address: CONTRACTS.ConfidentialToken, symbol: "CDEX" },
];

function tokenSymbol(addr: string): string {
  const hit = TOKEN_OPTIONS.find((t) => t.address.toLowerCase() === addr.toLowerCase());
  return hit ? hit.symbol : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  Countdown                                                          */
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
    <span className={`font-mono text-xs ${ended ? "text-gray-500" : urgent ? "text-red-400 animate-pulse" : "text-cyan-400"}`}>
      {str}
    </span>
  );
}

/* ================================================================== */
/*  VickreyAuctionsPage                                                */
/* ================================================================== */

export default function VickreyAuctionsPage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();
  const { encrypt, stage, encrypting } = useEncrypt();
  const { unseal, unsealing } = useUnseal();
  const auctionContract = useContract("VickreyAuction");
  const auctionRead = useReadContract("VickreyAuction");

  const [auctions, setAuctions] = useState<VickreyAuctionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalView, setModalView] = useState<ModalView>("none");
  const [selectedAuction, setSelectedAuction] = useState<VickreyAuctionData | null>(null);

  /* ---- create form ---- */
  const [cToken, setCToken] = useState<string>(CONTRACTS.ConfidentialToken);
  const [cPayToken, setCPayToken] = useState<string>("");
  const [cAmount, setCAmount] = useState("");
  const [cDuration, setCDuration] = useState(3600);

  const [bidAmount, setBidAmount] = useState("");
  const [revealActive, setRevealActive] = useState(false);

  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const busyRef = useRef<Set<string>>(new Set());
  const deployed = CONTRACTS.VickreyAuction !== "0x0000000000000000000000000000000000000000";
  const nowSec = Math.floor(Date.now() / 1000);

  const isSeller = (a: VickreyAuctionData) =>
    account !== null && a.seller.toLowerCase() === account.toLowerCase();

  /* ---------------------------------------------------------------- */
  /*  Fetch                                                            */
  /* ---------------------------------------------------------------- */

  const fetchAuctions = useCallback(async () => {
    if (!auctionRead) return;
    setLoading(true);
    try {
      const total = Number(await auctionRead.getAuctionCount());
      const list: VickreyAuctionData[] = [];
      for (let i = 0; i < total; i++) {
        const a = await auctionRead.getAuction(i);
        list.push({
          id: i,
          seller: a[0],
          token: a[1],
          paymentToken: a[2],
          amount: a[3].toString(),
          deadline: Number(a[4]),
          bidCount: Number(a[5]),
          status: Number(a[6]),
          winnerBid: a[7].toString(),
          winner: a[8],
          secondPrice: a[9].toString(),
          myBidUnsealed: null,
        });
      }
      list.reverse();
      setAuctions(list);
    } catch {
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  }, [auctionRead]);

  useEffect(() => { fetchAuctions(); }, [fetchAuctions, refreshKey]);

  /* ---------------------------------------------------------------- */
  /*  Tx helpers                                                       */
  /* ---------------------------------------------------------------- */

  function handleTxError(err: unknown) {
    setTxState("error");
    setTxError(
      err instanceof Error
        ? err.message.includes("user rejected") ? "Transaction rejected" : err.message.slice(0, 120)
        : "Transaction failed",
    );
  }

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

  /* ---- actions ---- */

  const handleCreate = useCallback(async () => {
    if (!auctionContract || !cToken || !cPayToken || !cAmount) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);
    try {
      const tx = await auctionContract.createAuction(
        cToken, cPayToken, BigInt(cAmount), BigInt(cDuration),
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
  }, [auctionContract, cToken, cPayToken, cAmount, cDuration]);

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

  const handleClose = useCallback(
    (id: number) => guardedAction(`close-${id}`, async () => {
      const tx = await auctionContract!.closeAuction(id);
      setTxState("confirming"); setTxHash(tx.hash); await tx.wait(); setTxState("success");
    }),
    [auctionContract, guardedAction],
  );

  const handleReveal = useCallback(
    (id: number) => guardedAction(`reveal-${id}`, async () => {
      const tx = await auctionContract!.revealWinner(id);
      setTxState("confirming"); setTxHash(tx.hash); await tx.wait();
      setTxState("success");
      setRevealActive(true);
    }),
    [auctionContract, guardedAction],
  );

  const handleSettle = useCallback(
    (id: number) => guardedAction(`settle-${id}`, async () => {
      const tx = await auctionContract!.settleAuction(id);
      setTxState("confirming"); setTxHash(tx.hash); await tx.wait(); setTxState("success");
    }),
    [auctionContract, guardedAction],
  );

  const handleCancel = useCallback(
    (id: number) => guardedAction(`cancel-${id}`, async () => {
      const tx = await auctionContract!.cancelAuction(id);
      setTxState("confirming"); setTxHash(tx.hash); await tx.wait(); setTxState("success");
    }),
    [auctionContract, guardedAction],
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Eye size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Vickrey Auctions</h1>
            <p className="text-sm text-gray-400">
              Second-price sealed bids -- winner pays the 2nd highest bid
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          {account && (
            <button
              onClick={() => { setModalView("create"); setTxState("idle"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium
                         hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              <Plus size={16} />
              Create Vickrey
            </button>
          )}
        </div>
      </div>

      {/* Not connected */}
      {!account && (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center">
            <Eye size={24} className="text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Connect your wallet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Create and participate in second-price sealed-bid auctions
            with fully encrypted bids.
          </p>
        </div>
      )}

      {/* Not deployed */}
      {account && !deployed && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">VickreyAuction contract not deployed yet</p>
            <p className="text-xs text-gray-400 mt-1">Deploy the contracts and update the address in constants.ts.</p>
          </div>
        </div>
      )}

      {/* Vickrey explanation */}
      {account && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
          <Info size={16} className="text-violet-400 shrink-0" />
          <p className="text-xs text-violet-300/80">
            <strong>Second-price auction:</strong> The highest bidder wins, but pays
            the <em>second-highest</em> bid amount. This incentivizes truthful bidding --
            you always bid your true valuation. All bids are encrypted with FHE until reveal.
          </p>
        </div>
      )}

      <TransactionStatus state={txState} txHash={txHash} error={txError} onDismiss={() => setTxState("idle")} />
      <EncryptionProgress stage={stage} visible={encrypting} />

      {/* Reveal animation */}
      {revealActive && selectedAuction && selectedAuction.secondPrice !== "0" && (
        <RevealAnimation
          value={selectedAuction.secondPrice}
          active={revealActive}
          label="Second Price (You Pay)"
          onComplete={() => setTimeout(() => setRevealActive(false), 3000)}
        />
      )}

      {/* Toolbar */}
      {account && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{auctions.length} auction{auctions.length !== 1 ? "s" : ""}</p>
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

      {/* Auction grid */}
      {account && (
        <>
          {loading && auctions.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-violet-400 animate-spin" />
            </div>
          ) : auctions.length === 0 ? (
            <div className="glass rounded-xl py-20 text-center space-y-3">
              <Eye size={36} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-500">No Vickrey auctions yet</p>
              <p className="text-xs text-gray-600">Create the first second-price auction</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {auctions.map((auction) => {
                const style = STATUS_STYLE[auction.status] ?? STATUS_STYLE[0];
                const mine = isSeller(auction);
                const ended = auction.deadline <= nowSec;

                return (
                  <motion.div
                    key={auction.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl overflow-hidden hover:border-violet-500/25 transition-all"
                  >
                    <div className="px-5 py-4 border-b border-violet-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{auction.id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                          {STATUS_LABEL[auction.status]}
                        </span>
                      </div>
                      {mine && (
                        <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">Your Auction</span>
                      )}
                    </div>

                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Selling</p>
                          <p className="text-lg font-bold text-gray-100">
                            {auction.amount}{" "}
                            <span className="text-sm font-medium text-violet-400">{tokenSymbol(auction.token)}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Payment</p>
                          <p className="text-sm font-medium text-gray-300">{tokenSymbol(auction.paymentToken)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Timer size={12} className="text-cyan-500/60" />
                          <CountdownBadge deadline={auction.deadline} />
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Users size={12} className="text-violet-500/60" />
                          {auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* Second price info (after reveal) */}
                      {auction.status >= 2 && auction.winner !== "0x0000000000000000000000000000000000000000" && (
                        <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 px-3 py-2 space-y-1">
                          <p className="text-[10px] text-violet-400/60 uppercase tracking-wider font-semibold">
                            Winner pays 2nd price
                          </p>
                          <p className="text-xs text-gray-300 font-mono">{shortAddr(auction.winner)}</p>
                          <p className="text-sm text-violet-300 font-semibold">
                            Pays: {auction.secondPrice} (2nd highest)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-3 border-t border-violet-500/5 flex items-center gap-2">
                      {auction.status === 0 && !ended && !mine && (
                        <button
                          onClick={() => { setSelectedAuction(auction); setBidAmount(""); setModalView("bid"); setTxState("idle"); }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all"
                        >
                          <Lock size={12} /> Place Bid
                        </button>
                      )}
                      {auction.status === 0 && mine && ended && auction.bidCount > 0 && (
                        <button onClick={() => handleClose(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-amber-500/15 border border-amber-500/20 text-amber-300 hover:bg-amber-500/25 transition-all">
                          <Clock size={12} /> Close
                        </button>
                      )}
                      {auction.status === 0 && mine && auction.bidCount === 0 && (
                        <button onClick={() => handleCancel(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                          <X size={12} /> Cancel
                        </button>
                      )}
                      {auction.status === 1 && (
                        <button onClick={() => { setSelectedAuction(auction); handleReveal(auction.id); }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-blue-500/15 border border-blue-500/20 text-blue-300 hover:bg-blue-500/25 transition-all">
                          <Zap size={12} /> Reveal Winner
                        </button>
                      )}
                      {auction.status === 2 && (
                        <button onClick={() => handleSettle(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25 transition-all">
                          <CheckCircle2 size={12} /> Settle
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedAuction(auction); setModalView("detail"); setTxState("idle"); }}
                        className="rounded-lg px-3 py-2 text-xs font-medium bg-white/[0.03] border border-violet-500/10 text-gray-400
                                   hover:text-gray-200 hover:bg-white/[0.06] transition-all">
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

      {/* ======================== CREATE MODAL ======================== */}
      <AnimatePresence>
        {modalView === "create" && (
          <motion.div key="create-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}>
            <motion.div key="create-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-violet-500/20 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Eye size={18} className="text-violet-400" /> Create Vickrey Auction
                </h3>
                <button onClick={() => setModalView("none")} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Token selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Token to Auction</label>
                <select value={cToken} onChange={(e) => setCToken(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-violet-500/10 text-sm text-gray-200 focus:outline-none focus:border-violet-500/40 transition-colors">
                  {TOKEN_OPTIONS.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Payment Token</label>
                <select value={cPayToken} onChange={(e) => setCPayToken(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-violet-500/10 text-sm text-gray-200 focus:outline-none focus:border-violet-500/40 transition-colors">
                  <option value="">Select token</option>
                  {TOKEN_OPTIONS.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Amount</label>
                <input type="number" value={cAmount} onChange={(e) => setCAmount(e.target.value)} placeholder="0" min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-violet-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTS.map((d) => (
                    <button key={d.value} type="button" onClick={() => setCDuration(d.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                        cDuration === d.value
                          ? "bg-violet-600/15 border-violet-500/30 text-violet-300"
                          : "bg-[#0a0b14] border-violet-500/10 text-gray-400 hover:border-violet-500/20"
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleCreate}
                disabled={txState === "signing" || txState === "confirming" || !cAmount || !cPayToken}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {txState === "signing" || txState === "confirming" ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Plus size={16} /> Create Vickrey Auction</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== BID MODAL ======================== */}
      <AnimatePresence>
        {modalView === "bid" && selectedAuction && (
          <motion.div key="bid-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}>
            <motion.div key="bid-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-md p-6 space-y-5 border border-violet-500/20 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Lock size={18} className="text-violet-400" /> Place Sealed Bid
                </h3>
                <button onClick={() => setModalView("none")} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 px-4 py-3 space-y-1">
                <p className="text-xs text-gray-500">Auction #{selectedAuction.id}</p>
                <p className="text-sm font-semibold text-gray-100">
                  {selectedAuction.amount} {tokenSymbol(selectedAuction.token)}
                </p>
              </div>

              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-4 py-3">
                <p className="text-xs text-indigo-300/80">
                  <strong>Vickrey rule:</strong> Bid your true valuation. If you win, you pay the
                  second-highest bid, not yours. Overbidding has no extra cost.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Your Bid Amount</label>
                <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="0" min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-violet-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
              </div>

              <button onClick={handleBid}
                disabled={txState === "signing" || txState === "confirming" || encrypting || !bidAmount}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {encrypting ? (
                  <><Loader2 size={16} className="animate-spin" /> Encrypting bid...</>
                ) : txState === "signing" || txState === "confirming" ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Lock size={16} /> Submit Encrypted Bid</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
