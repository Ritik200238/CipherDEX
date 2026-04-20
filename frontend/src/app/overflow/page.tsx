"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Lock,
  X,
  Plus,
  Loader2,
  Timer,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Users,
  Shield,
  TrendingUp,
  PieChart,
  Download,
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

interface SaleData {
  id: number;
  creator: string;
  token: string;
  paymentToken: string;
  totalSupply: string;
  pricePerToken: string;
  deadline: number;
  depositCount: number;
  status: number; // 0=OPEN 1=SETTLED 2=CANCELLED
  oversubscribed: boolean;
  myAllocation: string | null;
}

type ModalView = "none" | "create" | "deposit";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<number, string> = { 0: "OPEN", 1: "SETTLED", 2: "CANCELLED" };
const STATUS_STYLE: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  1: { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20" },
  2: { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20" },
};

const DURATION_OPTS = [
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "24 hrs", value: 86400 },
  { label: "7 days", value: 604800 },
];

const TOKEN_OPTIONS = [
  { label: "CDEX", address: CONTRACTS.ConfidentialToken, symbol: "CDEX" },
];

function tokenSymbol(addr: string): string {
  const hit = TOKEN_OPTIONS.find((t) => t.address.toLowerCase() === addr.toLowerCase());
  return hit ? hit.symbol : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
/*  OverflowSalePage                                                   */
/* ================================================================== */

export default function OverflowSalePage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();
  const { encrypt, stage, encrypting } = useEncrypt();
  const { unseal, unsealing } = useUnseal();
  const saleContract = useContract("OverflowSale");
  const saleRead = useReadContract("OverflowSale");

  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalView, setModalView] = useState<ModalView>("none");
  const [selectedSale, setSelectedSale] = useState<SaleData | null>(null);

  /* ---- create form ---- */
  const [cToken, setCToken] = useState<string>(CONTRACTS.ConfidentialToken);
  const [cPayToken, setCPayToken] = useState<string>("");
  const [cSupply, setCSupply] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [cDuration, setCDuration] = useState(86400);

  const [depositAmount, setDepositAmount] = useState("");
  const [revealAlloc, setRevealAlloc] = useState(false);

  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const busyRef = useRef<Set<string>>(new Set());
  const deployed = CONTRACTS.OverflowSale !== "0x0000000000000000000000000000000000000000";

  const isCreator = (s: SaleData) =>
    account !== null && s.creator.toLowerCase() === account.toLowerCase();

  /* ---------------------------------------------------------------- */
  /*  Fetch                                                            */
  /* ---------------------------------------------------------------- */

  const fetchSales = useCallback(async () => {
    if (!saleRead) return;
    setLoading(true);
    try {
      const total = Number(await saleRead.getSaleCount());
      const list: SaleData[] = [];
      for (let i = 0; i < total; i++) {
        const s = await saleRead.getSale(i);
        list.push({
          id: i,
          creator: s[0],
          token: s[1],
          paymentToken: s[2],
          totalSupply: s[3].toString(),
          pricePerToken: s[4].toString(),
          deadline: Number(s[5]),
          depositCount: Number(s[6]),
          status: Number(s[7]),
          oversubscribed: s[8],
          myAllocation: null,
        });
      }
      list.reverse();
      setSales(list);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [saleRead]);

  useEffect(() => { fetchSales(); }, [fetchSales, refreshKey]);

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
    if (!saleContract || !cToken || !cPayToken || !cSupply || !cPrice) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);
    try {
      const tx = await saleContract.createSale(
        cToken, cPayToken, BigInt(cSupply), BigInt(cPrice), BigInt(cDuration),
      );
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setCSupply(""); setCPrice("");
      setModalView("none");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [saleContract, cToken, cPayToken, cSupply, cPrice, cDuration]);

  const handleDeposit = useCallback(async () => {
    if (!saleContract || !initialized || !selectedSale || !depositAmount) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);
    try {
      const { Encryptable } = await import("cofhejs/web");
      const enc = await encrypt([Encryptable.uint128(BigInt(depositAmount))]);
      if (!enc) throw new Error("Encryption failed");
      const tx = await saleContract.deposit(selectedSale.id, enc[0]);
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setDepositAmount("");
      setModalView("none");
      setSelectedSale(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [saleContract, initialized, selectedSale, depositAmount, encrypt]);

  const handleSettle = useCallback(
    (id: number) => guardedAction(`settle-${id}`, async () => {
      const tx = await saleContract!.settle(id);
      setTxState("confirming"); setTxHash(tx.hash); await tx.wait(); setTxState("success");
    }),
    [saleContract, guardedAction],
  );

  const handleClaim = useCallback(
    (id: number) => guardedAction(`claim-${id}`, async () => {
      const tx = await saleContract!.claim(id);
      setTxState("confirming"); setTxHash(tx.hash); await tx.wait(); setTxState("success");
    }),
    [saleContract, guardedAction],
  );

  const handleUnsealAllocation = useCallback(async (sale: SaleData) => {
    if (!saleContract || !account) return;
    try {
      const hash = await saleContract.getMyAllocation(sale.id);
      const val = await unseal(BigInt(hash), 5);
      if (val !== null) {
        setSales((prev) =>
          prev.map((s) => (s.id === sale.id ? { ...s, myAllocation: val.toString() } : s))
        );
        setRevealAlloc(true);
      }
    } catch {
      // no allocation or unseal failed
    }
  }, [saleContract, account, unseal]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
            <Droplets size={20} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Overflow Sale</h1>
            <p className="text-sm text-gray-400">
              Fixed price, pro-rata allocation if oversubscribed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          {account && (
            <button
              onClick={() => { setModalView("create"); setTxState("idle"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-medium
                         hover:from-teal-500 hover:to-cyan-500 transition-all"
            >
              <Plus size={16} />
              Create Sale
            </button>
          )}
        </div>
      </div>

      {!account && (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-teal-600/30 to-cyan-600/30 flex items-center justify-center">
            <Droplets size={24} className="text-teal-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Connect your wallet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Participate in token sales with encrypted deposit amounts.
            If oversubscribed, tokens are allocated pro-rata.
          </p>
        </div>
      )}

      {account && !deployed && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">OverflowSale contract not deployed yet</p>
            <p className="text-xs text-gray-400 mt-1">Deploy the contracts and update the address in constants.ts.</p>
          </div>
        </div>
      )}

      {account && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-teal-500/5 border border-teal-500/10">
          <TrendingUp size={16} className="text-teal-400 shrink-0" />
          <p className="text-xs text-teal-300/80">
            <strong>Fair overflow:</strong> Deposit encrypted amounts at a fixed price.
            If total deposits exceed supply, each participant gets a pro-rata share.
            Excess funds are refunded. Deposit amounts stay private.
          </p>
        </div>
      )}

      <TransactionStatus state={txState} txHash={txHash} error={txError} onDismiss={() => setTxState("idle")} />
      <EncryptionProgress stage={stage} visible={encrypting} />

      {account && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{sales.length} sale{sales.length !== 1 ? "s" : ""}</p>
          <button onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-300 transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      )}

      {/* Sale grid */}
      {account && (
        <>
          {loading && sales.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-teal-400 animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="glass rounded-xl py-20 text-center space-y-3">
              <Droplets size={36} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-500">No overflow sales yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sales.map((sale) => {
                const style = STATUS_STYLE[sale.status] ?? STATUS_STYLE[0];
                const mine = isCreator(sale);
                const nowSec = Math.floor(Date.now() / 1000);
                const ended = sale.deadline <= nowSec;

                return (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl overflow-hidden hover:border-teal-500/25 transition-all"
                  >
                    <div className="px-5 py-4 border-b border-teal-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{sale.id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                          {STATUS_LABEL[sale.status]}
                        </span>
                        {sale.oversubscribed && sale.status === 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-amber-500/15 text-amber-400 border-amber-500/20">
                            OVERSUBSCRIBED
                          </span>
                        )}
                      </div>
                      {mine && (
                        <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">Your Sale</span>
                      )}
                    </div>

                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Supply</p>
                          <p className="text-lg font-bold text-gray-100">
                            {sale.totalSupply}{" "}
                            <span className="text-sm font-medium text-teal-400">{tokenSymbol(sale.token)}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="text-sm font-bold text-gray-100 font-mono-cipher">
                            {sale.pricePerToken}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Timer size={12} className="text-cyan-500/60" />
                          <CountdownBadge deadline={sale.deadline} />
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Users size={12} className="text-teal-500/60" />
                          {sale.depositCount} deposit{sale.depositCount !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* Allocation (after settle) */}
                      {sale.status === 1 && sale.myAllocation !== null && (
                        <div className="rounded-lg bg-teal-500/5 border border-teal-500/10 px-3 py-2">
                          <p className="text-[10px] text-teal-400/60 uppercase tracking-wider font-semibold">Your Allocation</p>
                          <p className="text-sm text-teal-300 font-semibold font-mono-cipher">{sale.myAllocation} tokens</p>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <Lock size={10} className="text-teal-500/40" />
                        Deposit amounts encrypted with FHE
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-teal-500/5 flex items-center gap-2">
                      {sale.status === 0 && !ended && !mine && (
                        <button
                          onClick={() => { setSelectedSale(sale); setDepositAmount(""); setModalView("deposit"); setTxState("idle"); }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500 transition-all"
                        >
                          <Lock size={12} /> Deposit
                        </button>
                      )}
                      {sale.status === 0 && mine && ended && (
                        <button onClick={() => handleSettle(sale.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-blue-500/15 border border-blue-500/20 text-blue-300 hover:bg-blue-500/25 transition-all">
                          <CheckCircle2 size={12} /> Settle
                        </button>
                      )}
                      {sale.status === 1 && !mine && (
                        <button onClick={() => handleClaim(sale.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25 transition-all">
                          <Download size={12} /> Claim Tokens
                        </button>
                      )}
                      {sale.status === 1 && sale.myAllocation === null && !mine && (
                        <button onClick={() => handleUnsealAllocation(sale)}
                          disabled={unsealing}
                          className="rounded-lg px-3 py-2 text-xs font-medium bg-white/[0.03] border border-teal-500/10 text-gray-400
                                     hover:text-gray-200 hover:bg-white/[0.06] transition-all disabled:opacity-50">
                          {unsealing ? <Loader2 size={12} className="animate-spin" /> : <PieChart size={12} />}
                          {unsealing ? "..." : "Allocation"}
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
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-teal-500/20 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Droplets size={18} className="text-teal-400" /> Create Overflow Sale
                </h3>
                <button onClick={() => setModalView("none")} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Token to Sell</label>
                <select value={cToken} onChange={(e) => setCToken(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-teal-500/10 text-sm text-gray-200 focus:outline-none focus:border-teal-500/40 transition-colors">
                  {TOKEN_OPTIONS.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Payment Token</label>
                <select value={cPayToken} onChange={(e) => setCPayToken(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-teal-500/10 text-sm text-gray-200 focus:outline-none focus:border-teal-500/40 transition-colors">
                  <option value="">Select token</option>
                  {TOKEN_OPTIONS.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Total Supply</label>
                  <input type="number" value={cSupply} onChange={(e) => setCSupply(e.target.value)} placeholder="10000" min="0"
                    className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-teal-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Price per Token</label>
                  <input type="number" value={cPrice} onChange={(e) => setCPrice(e.target.value)} placeholder="100" min="0"
                    className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-teal-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTS.map((d) => (
                    <button key={d.value} type="button" onClick={() => setCDuration(d.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                        cDuration === d.value
                          ? "bg-teal-600/15 border-teal-500/30 text-teal-300"
                          : "bg-[#0a0b14] border-teal-500/10 text-gray-400 hover:border-teal-500/20"
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleCreate}
                disabled={txState === "signing" || txState === "confirming" || !cSupply || !cPrice || !cPayToken}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {txState === "signing" || txState === "confirming" ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Plus size={16} /> Create Overflow Sale</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== DEPOSIT MODAL ======================== */}
      <AnimatePresence>
        {modalView === "deposit" && selectedSale && (
          <motion.div key="deposit-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}>
            <motion.div key="deposit-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-md p-6 space-y-5 border border-teal-500/20 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Lock size={18} className="text-teal-400" /> Deposit
                </h3>
                <button onClick={() => setModalView("none")} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-lg bg-teal-500/5 border border-teal-500/10 px-4 py-3 space-y-1">
                <p className="text-xs text-gray-500">Sale #{selectedSale.id}</p>
                <p className="text-sm font-semibold text-gray-100">
                  {selectedSale.totalSupply} {tokenSymbol(selectedSale.token)} @ {selectedSale.pricePerToken} each
                </p>
                <p className="text-xs text-gray-500">{selectedSale.depositCount} deposits so far</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Deposit Amount</label>
                <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0" min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-teal-500/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 transition-colors" />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/5 border border-teal-500/10">
                <Shield size={12} className="text-teal-400 shrink-0" />
                <p className="text-[10px] text-teal-300/70">
                  Your deposit amount is encrypted. If oversubscribed, you receive a proportional allocation and a refund.
                </p>
              </div>

              <button onClick={handleDeposit}
                disabled={txState === "signing" || txState === "confirming" || encrypting || !depositAmount}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {encrypting ? (
                  <><Loader2 size={16} className="animate-spin" /> Encrypting deposit...</>
                ) : txState === "signing" || txState === "confirming" ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Lock size={16} /> Deposit Encrypted Amount</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
