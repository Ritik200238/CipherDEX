"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown,
  Lock,
  X,
  Plus,
  Loader2,
  Timer,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Zap,
  Shield,
  ArrowDown,
  DollarSign,
} from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useCofhe } from "@/hooks/useCofhe";
import { useEncrypt } from "@/hooks/useEncrypt";
import { useContract, useReadContract } from "@/hooks/useContract";
import { EncryptionProgress } from "@/components/shared/EncryptionProgress";
import { TransactionStatus, type TxState } from "@/components/shared/TransactionStatus";
import { FaucetButton } from "@/components/shared/FaucetButton";
import { CONTRACTS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DutchAuctionData {
  id: number;
  seller: string;
  token: string;
  paymentToken: string;
  amount: string;
  startPrice: string;
  endPrice: string;
  startTime: number;
  endTime: number;
  totalSold: string;
  status: number; // 0=ACTIVE 1=SETTLED 2=CANCELLED
  currentPrice: string;
}

type ModalView = "none" | "create" | "buy";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<number, string> = { 0: "ACTIVE", 1: "SETTLED", 2: "CANCELLED" };
const STATUS_STYLE: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  1: { bg: "bg-gray-500/15",    text: "text-gray-400",    border: "border-gray-500/20" },
  2: { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20" },
};

const DURATION_OPTS = [
  { label: "15 min", value: 900 },
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "24 hrs", value: 86400 },
];

const TOKEN_OPTIONS = [
  { label: "CDEX", address: CONTRACTS.ConfidentialToken, symbol: "CDEX" },
];

function tokenSymbol(addr: string): string {
  const hit = TOKEN_OPTIONS.find((t) => t.address.toLowerCase() === addr.toLowerCase());
  return hit ? hit.symbol : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  Live price hook                                                    */
/* ------------------------------------------------------------------ */

function useLivePrice(startPrice: number, endPrice: number, startTime: number, endTime: number): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (now >= endTime) return endPrice;
  if (now <= startTime) return startPrice;

  const elapsed = now - startTime;
  const duration = endTime - startTime;
  const decay = (startPrice - endPrice) * (elapsed / duration);
  return Math.floor(startPrice - decay);
}

function LivePriceDisplay({ startPrice, endPrice, startTime, endTime }: {
  startPrice: number; endPrice: number; startTime: number; endTime: number;
}) {
  const price = useLivePrice(startPrice, endPrice, startTime, endTime);
  const now = Math.floor(Date.now() / 1000);
  const pctElapsed = Math.min(100, Math.max(0, ((now - startTime) / (endTime - startTime)) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Current Price</span>
        <span className="text-lg font-bold text-amber-400 font-mono-cipher">
          {price.toLocaleString()}
        </span>
      </div>
      {/* Decay bar */}
      <div className="h-1.5 rounded-full bg-[var(--void-4)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-1000"
          style={{ width: `${100 - pctElapsed}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>Start: {startPrice.toLocaleString()}</span>
        <span>Floor: {endPrice.toLocaleString()}</span>
      </div>
    </div>
  );
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
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function CountdownBadge({ deadline }: { deadline: number }) {
  const str = useCountdown(deadline);
  const now = Math.floor(Date.now() / 1000);
  const ended = deadline <= now;
  return (
    <span className={`font-mono text-xs ${ended ? "text-gray-500" : "text-cyan-400"}`}>{str}</span>
  );
}

/* ================================================================== */
/*  DutchAuctionPage                                                   */
/* ================================================================== */

export default function DutchAuctionPage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();
  const { encrypt, stage, encrypting } = useEncrypt();
  const auctionContract = useContract("DutchAuction");
  const auctionRead = useReadContract("DutchAuction");

  const [auctions, setAuctions] = useState<DutchAuctionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalView, setModalView] = useState<ModalView>("none");
  const [selectedAuction, setSelectedAuction] = useState<DutchAuctionData | null>(null);

  /* ---- create form ---- */
  const [cToken, setCToken] = useState<string>(CONTRACTS.ConfidentialToken);
  const [cPayToken, setCPayToken] = useState<string>("");
  const [cAmount, setCAmount] = useState("");
  const [cStartPrice, setCStartPrice] = useState("");
  const [cEndPrice, setCEndPrice] = useState("");
  const [cDuration, setCDuration] = useState(3600);

  const [buyAmount, setBuyAmount] = useState("");

  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const busyRef = useRef<Set<string>>(new Set());
  const deployed = CONTRACTS.DutchAuction !== "0x0000000000000000000000000000000000000000";

  const isSeller = (a: DutchAuctionData) =>
    account !== null && a.seller.toLowerCase() === account.toLowerCase();

  /* ---------------------------------------------------------------- */
  /*  Fetch                                                            */
  /* ---------------------------------------------------------------- */

  const fetchAuctions = useCallback(async () => {
    if (!auctionRead) return;
    setLoading(true);
    try {
      const total = Number(await auctionRead.getAuctionCount());
      const list: DutchAuctionData[] = [];
      for (let i = 0; i < total; i++) {
        const a = await auctionRead.getAuction(i);
        let currentPrice = "0";
        try {
          currentPrice = (await auctionRead.getCurrentPrice(i)).toString();
        } catch { /* auction may have ended */ }
        list.push({
          id: i,
          seller: a[0],
          token: a[1],
          paymentToken: a[2],
          amount: a[3].toString(),
          startPrice: a[4].toString(),
          endPrice: a[5].toString(),
          startTime: Number(a[6]),
          endTime: Number(a[7]),
          totalSold: a[8].toString(),
          status: Number(a[9]),
          currentPrice,
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

  /* ---- tx helpers ---- */

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
    if (!auctionContract || !cToken || !cPayToken || !cAmount || !cStartPrice || !cEndPrice) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);
    try {
      const tx = await auctionContract.createAuction(
        cToken, cPayToken, BigInt(cAmount), BigInt(cStartPrice), BigInt(cEndPrice), BigInt(cDuration),
      );
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setCAmount(""); setCStartPrice(""); setCEndPrice("");
      setModalView("none");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [auctionContract, cToken, cPayToken, cAmount, cStartPrice, cEndPrice, cDuration]);

  const handleBuy = useCallback(async () => {
    if (!auctionContract || !initialized || !selectedAuction || !buyAmount) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);
    try {
      const { Encryptable } = await import("cofhejs/web");
      const enc = await encrypt([Encryptable.uint128(BigInt(buyAmount))]);
      if (!enc) throw new Error("Encryption failed");
      const tx = await auctionContract.buy(selectedAuction.id, enc[0]);
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setBuyAmount("");
      setModalView("none");
      setSelectedAuction(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [auctionContract, initialized, selectedAuction, buyAmount, encrypt]);

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
          <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
            <TrendingDown size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text-warm">Dutch Auctions</h1>
            <p className="text-sm text-gray-400">
              Price decays over time -- buy when it hits your target
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          {account && (
            <button
              onClick={() => { setModalView("create"); setTxState("idle"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-medium
                         hover:from-amber-500 hover:to-orange-500 transition-all"
            >
              <Plus size={16} />
              Create Dutch
            </button>
          )}
        </div>
      </div>

      {!account && (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-600/30 to-orange-600/30 flex items-center justify-center">
            <TrendingDown size={24} className="text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Connect your wallet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Watch prices decay in real-time and buy at the price you want.
            Purchase amounts are encrypted with FHE.
          </p>
        </div>
      )}

      {account && !deployed && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">DutchAuction contract not deployed yet</p>
            <p className="text-xs text-gray-400 mt-1">Deploy the contracts and update the address in constants.ts.</p>
          </div>
        </div>
      )}

      {account && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <ArrowDown size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300/80">
            <strong>Dutch auction:</strong> Price starts high and decays linearly toward a floor
            price. Buy at any time -- the current price is what you pay. Your purchase amount
            is encrypted with FHE.
          </p>
        </div>
      )}

      <TransactionStatus state={txState} txHash={txHash} error={txError} onDismiss={() => setTxState("idle")} />
      <EncryptionProgress stage={stage} visible={encrypting} />

      {account && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{auctions.length} auction{auctions.length !== 1 ? "s" : ""}</p>
          <button onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-300 transition-colors disabled:opacity-50">
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
              <Loader2 size={24} className="text-amber-400 animate-spin" />
            </div>
          ) : auctions.length === 0 ? (
            <div className="glass rounded-xl py-20 text-center space-y-3">
              <TrendingDown size={36} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-500">No Dutch auctions yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {auctions.map((auction) => {
                const style = STATUS_STYLE[auction.status] ?? STATUS_STYLE[0];
                const mine = isSeller(auction);
                const nowSec = Math.floor(Date.now() / 1000);
                const ended = auction.endTime <= nowSec;

                return (
                  <motion.div
                    key={auction.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl overflow-hidden hover:border-amber-500/25 transition-all"
                  >
                    <div className="px-5 py-4 border-b border-amber-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{auction.id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                          {STATUS_LABEL[auction.status]}
                        </span>
                      </div>
                      {mine && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Your Auction</span>
                      )}
                    </div>

                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Selling</p>
                          <p className="text-lg font-bold text-gray-100">
                            {auction.amount}{" "}
                            <span className="text-sm font-medium text-amber-400">{tokenSymbol(auction.token)}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Time Left</p>
                          <CountdownBadge deadline={auction.endTime} />
                        </div>
                      </div>

                      {/* Live price decay */}
                      {auction.status === 0 && !ended && (
                        <LivePriceDisplay
                          startPrice={Number(auction.startPrice)}
                          endPrice={Number(auction.endPrice)}
                          startTime={auction.startTime}
                          endTime={auction.endTime}
                        />
                      )}

                      {auction.status === 0 && ended && (
                        <div className="text-center py-2">
                          <p className="text-xs text-gray-500">Final Price</p>
                          <p className="text-lg font-bold text-amber-400 font-mono-cipher">{auction.endPrice}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <Lock size={10} className="text-amber-500/40" />
                        Purchase amounts encrypted with FHE
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-amber-500/5 flex items-center gap-2">
                      {auction.status === 0 && !mine && (
                        <button
                          onClick={() => { setSelectedAuction(auction); setBuyAmount(""); setModalView("buy"); setTxState("idle"); }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 transition-all"
                        >
                          <DollarSign size={12} /> Buy Now
                        </button>
                      )}
                      {auction.status === 0 && mine && ended && (
                        <button onClick={() => handleSettle(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25 transition-all">
                          <CheckCircle2 size={12} /> Settle
                        </button>
                      )}
                      {auction.status === 0 && mine && !ended && Number(auction.totalSold) === 0 && (
                        <button onClick={() => handleCancel(auction.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                          <X size={12} /> Cancel
                        </button>
                      )}
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
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-amber-500/20 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <TrendingDown size={18} className="text-amber-400" /> Create Dutch Auction
                </h3>
                <button onClick={() => setModalView("none")} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Token to Sell</label>
                <select value={cToken} onChange={(e) => setCToken(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-amber-500/10 text-sm text-gray-200 focus:outline-none focus:border-amber-500/40 transition-colors">
                  {TOKEN_OPTIONS.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Payment Token</label>
                <select value={cPayToken} onChange={(e) => setCPayToken(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-amber-500/10 text-sm text-gray-200 focus:outline-none focus:border-amber-500/40 transition-colors">
                  <option value="">Select token</option>
                  {TOKEN_OPTIONS.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Amount</label>
                <input type="number" value={cAmount} onChange={(e) => setCAmount(e.target.value)} placeholder="0" min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-amber-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Start Price</label>
                  <input type="number" value={cStartPrice} onChange={(e) => setCStartPrice(e.target.value)} placeholder="1000" min="0"
                    className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-amber-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Floor Price</label>
                  <input type="number" value={cEndPrice} onChange={(e) => setCEndPrice(e.target.value)} placeholder="100" min="0"
                    className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-amber-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTS.map((d) => (
                    <button key={d.value} type="button" onClick={() => setCDuration(d.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                        cDuration === d.value
                          ? "bg-amber-600/15 border-amber-500/30 text-amber-300"
                          : "bg-[#0a0b14] border-amber-500/10 text-gray-400 hover:border-amber-500/20"
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price preview */}
              {cStartPrice && cEndPrice && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDown size={12} className="text-amber-400" />
                    <span className="text-xs text-amber-300/80 font-semibold">Price Decay Preview</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Start: <span className="text-amber-300 font-mono-cipher">{Number(cStartPrice).toLocaleString()}</span></span>
                    <span className="text-gray-400">Floor: <span className="text-amber-300 font-mono-cipher">{Number(cEndPrice).toLocaleString()}</span></span>
                  </div>
                </div>
              )}

              <button onClick={handleCreate}
                disabled={txState === "signing" || txState === "confirming" || !cAmount || !cPayToken || !cStartPrice || !cEndPrice}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {txState === "signing" || txState === "confirming" ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Plus size={16} /> Create Dutch Auction</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== BUY MODAL ======================== */}
      <AnimatePresence>
        {modalView === "buy" && selectedAuction && (
          <motion.div key="buy-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}>
            <motion.div key="buy-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-md p-6 space-y-5 border border-amber-500/20 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <DollarSign size={18} className="text-amber-400" /> Buy at Current Price
                </h3>
                <button onClick={() => setModalView("none")} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <LivePriceDisplay
                startPrice={Number(selectedAuction.startPrice)}
                endPrice={Number(selectedAuction.endPrice)}
                startTime={selectedAuction.startTime}
                endTime={selectedAuction.endTime}
              />

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Amount to Buy</label>
                <input type="number" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} placeholder="0" min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-amber-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 transition-colors" />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Shield size={12} className="text-amber-400 shrink-0" />
                <p className="text-[10px] text-amber-300/70">
                  Your purchase amount is encrypted. The seller sees only that a buy occurred, not the quantity.
                </p>
              </div>

              <button onClick={handleBuy}
                disabled={txState === "signing" || txState === "confirming" || encrypting || !buyAmount}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {encrypting ? (
                  <><Loader2 size={16} className="animate-spin" /> Encrypting amount...</>
                ) : txState === "signing" || txState === "confirming" ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Lock size={16} /> Buy with Encrypted Amount</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
