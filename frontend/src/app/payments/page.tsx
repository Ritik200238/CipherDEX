"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Lock,
  X,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Users,
  Copy,
  Trash2,
  Download,
  FileText,
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
import { PrivacyLens } from "@/components/shared/PrivacyLens";
import { CONTRACTS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SplitData {
  id: number;
  creator: string;
  token: string;
  recipientCount: number;
  createdAt: number;
  status: number; // 0=ACTIVE 1=COMPLETED
}

interface RecipientInfo {
  address: string;
  amount: string;
  claimed: boolean;
  unsealed: string | null;
}

type ModalView = "none" | "create" | "template" | "claim" | "detail";
type TabView = "splits" | "templates";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<number, string> = { 0: "ACTIVE", 1: "COMPLETED" };
const STATUS_STYLE: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  1: { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/20" },
};

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ================================================================== */
/*  PaymentsPage                                                       */
/* ================================================================== */

export default function PaymentsPage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();
  const { encrypt, stage, encrypting } = useEncrypt();
  const { unseal, unsealing } = useUnseal();
  const paymentsContract = useContract("PrivatePayments");
  const paymentsRead = useReadContract("PrivatePayments");

  /* ---- state ---- */
  const [splits, setSplits] = useState<SplitData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabView>("splits");

  /* ---- modals ---- */
  const [modalView, setModalView] = useState<ModalView>("none");
  const [selectedSplit, setSelectedSplit] = useState<SplitData | null>(null);
  const [recipients, setRecipients] = useState<RecipientInfo[]>([]);

  /* ---- create form ---- */
  const [newRecipients, setNewRecipients] = useState<{ address: string; amount: string }[]>([
    { address: "", amount: "" },
  ]);
  const [templateName, setTemplateName] = useState("");

  /* ---- tx feedback ---- */
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const deployed =
    CONTRACTS.PrivatePayments !== "0x0000000000000000000000000000000000000000";

  /* ---------------------------------------------------------------- */
  /*  Fetch splits                                                     */
  /* ---------------------------------------------------------------- */

  const fetchSplits = useCallback(async () => {
    if (!paymentsRead) return;
    setLoading(true);
    try {
      const total = Number(await paymentsRead.getSplitCount());
      const list: SplitData[] = [];

      for (let i = 0; i < total; i++) {
        const s = await paymentsRead.getSplit(i);
        list.push({
          id: i,
          creator: s[0],
          token: s[1],
          recipientCount: Number(s[2]),
          createdAt: Number(s[3]),
          status: Number(s[4]),
        });
      }

      list.reverse();
      setSplits(list);
    } catch {
      setSplits([]);
    } finally {
      setLoading(false);
    }
  }, [paymentsRead]);

  useEffect(() => { fetchSplits(); }, [fetchSplits, refreshKey]);

  /* ---------------------------------------------------------------- */
  /*  Tx helpers                                                       */
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
  /*  Create split                                                     */
  /* ---------------------------------------------------------------- */

  const handleCreateSplit = useCallback(async () => {
    if (!paymentsContract || !initialized) return;
    const valid = newRecipients.filter((r) => r.address && r.amount);
    if (valid.length === 0) return;

    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const { Encryptable } = await import("cofhejs/web");

      // Encrypt all amounts
      const encItems = valid.map((r) => Encryptable.uint128(BigInt(r.amount)));
      const encrypted = await encrypt(encItems);
      if (!encrypted) throw new Error("Encryption failed");

      const addresses = valid.map((r) => r.address);

      const tx = await paymentsContract.createSplit(
        CONTRACTS.ConfidentialToken,
        addresses,
        encrypted,
      );
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setNewRecipients([{ address: "", amount: "" }]);
      setModalView("none");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [paymentsContract, initialized, newRecipients, encrypt]);

  /* ---------------------------------------------------------------- */
  /*  Create template                                                  */
  /* ---------------------------------------------------------------- */

  const handleCreateTemplate = useCallback(async () => {
    if (!paymentsContract || !templateName) return;
    const valid = newRecipients.filter((r) => r.address);
    if (valid.length === 0) return;

    setTxState("signing");
    setTxError(undefined);

    try {
      const tx = await paymentsContract.createTemplate(
        templateName,
        valid.map((r) => r.address),
      );
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setTemplateName("");
      setNewRecipients([{ address: "", amount: "" }]);
      setModalView("none");
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [paymentsContract, templateName, newRecipients]);

  /* ---------------------------------------------------------------- */
  /*  Claim payment                                                    */
  /* ---------------------------------------------------------------- */

  const handleClaim = useCallback(async (splitId: number) => {
    if (!paymentsContract) return;
    setTxState("signing");
    setTxError(undefined);

    try {
      const tx = await paymentsContract.claim(splitId);
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [paymentsContract]);

  /* ---------------------------------------------------------------- */
  /*  Unseal my amount in a split                                      */
  /* ---------------------------------------------------------------- */

  const handleUnsealAmount = useCallback(async (splitId: number, index: number) => {
    if (!paymentsContract || !account) return;
    try {
      const hash = await paymentsContract.getMyAmount(splitId, index);
      const val = await unseal(BigInt(hash), 5);
      if (val !== null) {
        setRecipients((prev) =>
          prev.map((r, i) => (i === index ? { ...r, unsealed: val.toString() } : r))
        );
      }
    } catch {
      // no amount or unseal failed
    }
  }, [paymentsContract, account, unseal]);

  /* ---- helpers ---- */

  const addRecipient = () => {
    if (newRecipients.length >= 20) return;
    setNewRecipients((prev) => [...prev, { address: "", amount: "" }]);
  };

  const removeRecipient = (index: number) => {
    setNewRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: "address" | "amount", value: string) => {
    setNewRecipients((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const isCreator = (s: SplitData) =>
    account !== null && s.creator.toLowerCase() === account.toLowerCase();

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <CreditCard size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Private Payments</h1>
            <p className="text-sm text-gray-400">
              Encrypted splits -- recipients see only their own amount
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          {account && (
            <>
              <button
                onClick={() => {
                  setModalView("template");
                  setTxState("idle");
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                           bg-[var(--void-4)] border border-[var(--border-default)]
                           text-[var(--text-secondary)] text-sm font-medium
                           hover:text-[var(--text-primary)] hover:border-[var(--border-active)] transition-all"
              >
                <FileText size={16} />
                Template
              </button>
              <button
                onClick={() => {
                  setModalView("create");
                  setTxState("idle");
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                           bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-medium
                           hover:from-emerald-500 hover:to-cyan-500 transition-all"
              >
                <Plus size={16} />
                Create Split
              </button>
            </>
          )}
        </div>
      </div>

      {/* Not connected */}
      {!account && (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600/30 to-cyan-600/30 flex items-center justify-center">
            <CreditCard size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Connect your wallet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Create encrypted payment splits, save templates, and claim your payments --
            all with fully private amounts via FHE.
          </p>
        </div>
      )}

      {/* Not deployed */}
      {account && !deployed && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              PrivatePayments contract not deployed yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Deploy the contracts and update the address in constants.ts.
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      {account && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <Lock size={16} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300/80">
            <strong>Encrypted payments:</strong> Each recipient&apos;s amount is encrypted
            separately. Only the recipient can unseal their own share. The total and
            individual amounts remain hidden from all other parties.
          </p>
        </div>
      )}

      {/* Tx / encryption status */}
      <TransactionStatus
        state={txState}
        txHash={txHash}
        error={txError}
        onDismiss={() => setTxState("idle")}
      />
      <EncryptionProgress stage={stage} visible={encrypting} />

      {/* Toolbar */}
      {account && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {splits.length} split{splits.length !== 1 ? "s" : ""}
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

      {/* Split grid */}
      {account && (
        <>
          {loading && splits.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-emerald-400 animate-spin" />
            </div>
          ) : splits.length === 0 ? (
            <div className="glass rounded-xl py-20 text-center space-y-3">
              <CreditCard size={36} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-500">No payment splits yet</p>
              <p className="text-xs text-gray-600">
                Create the first encrypted payment split
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {splits.map((split) => {
                const style = STATUS_STYLE[split.status] ?? STATUS_STYLE[0];
                const mine = isCreator(split);

                return (
                  <motion.div
                    key={split.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl overflow-hidden hover:border-emerald-500/25 transition-all"
                  >
                    {/* Card header */}
                    <div className="px-5 py-4 border-b border-emerald-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{split.id}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {STATUS_LABEL[split.status]}
                        </span>
                      </div>
                      {mine && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Your Split
                        </span>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Creator</p>
                          <p className="text-sm font-mono text-gray-300">
                            {shortAddr(split.creator)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Recipients</p>
                          <p className="text-sm font-semibold text-gray-100 flex items-center gap-1 justify-end">
                            <Users size={12} className="text-emerald-500/60" />
                            {split.recipientCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <Lock size={10} className="text-emerald-500/40" />
                        All amounts encrypted with FHE
                      </div>
                    </div>

                    {/* Card actions */}
                    <div className="px-5 py-3 border-t border-emerald-500/5 flex items-center gap-2">
                      {split.status === 0 && !mine && (
                        <button
                          onClick={() => handleClaim(split.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-gradient-to-r from-emerald-600 to-cyan-600 text-white
                                     hover:from-emerald-500 hover:to-cyan-500 transition-all"
                        >
                          <Download size={12} />
                          Claim
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSplit(split);
                          setModalView("detail");
                          setTxState("idle");
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-medium
                                   bg-white/[0.03] border border-emerald-500/10 text-gray-400
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

      {/* ======================== CREATE SPLIT MODAL ======================== */}
      <AnimatePresence>
        {(modalView === "create" || modalView === "template") && (
          <motion.div
            key="modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}
          >
            <motion.div
              key="modal-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-emerald-500/20
                         shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-400" />
                  {modalView === "template" ? "Create Template" : "Create Split"}
                </h3>
                <button
                  onClick={() => setModalView("none")}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Template name (only for template) */}
              {modalView === "template" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Monthly Team Payment"
                    className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-emerald-500/10
                               text-sm text-gray-200 placeholder:text-gray-600
                               focus:outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>
              )}

              {/* Recipients */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 font-medium">Recipients</label>
                  <button
                    onClick={addRecipient}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>

                {newRecipients.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={r.address}
                      onChange={(e) => updateRecipient(i, "address", e.target.value)}
                      placeholder="0x..."
                      className="flex-1 rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-emerald-500/10
                                 text-sm text-gray-200 placeholder:text-gray-600 font-mono
                                 focus:outline-none focus:border-emerald-500/40 transition-colors"
                    />
                    {modalView === "create" && (
                      <input
                        type="number"
                        value={r.amount}
                        onChange={(e) => updateRecipient(i, "amount", e.target.value)}
                        placeholder="Amount"
                        min="0"
                        className="w-28 rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-emerald-500/10
                                   text-sm text-gray-200 placeholder:text-gray-600
                                   focus:outline-none focus:border-emerald-500/40 transition-colors"
                      />
                    )}
                    {newRecipients.length > 1 && (
                      <button
                        onClick={() => removeRecipient(i)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Encryption info */}
              {modalView === "create" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <Lock size={12} className="text-emerald-400 shrink-0" />
                  <p className="text-[10px] text-emerald-300/70">
                    Each amount will be individually encrypted. Recipients can only unseal their own.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={modalView === "template" ? handleCreateTemplate : handleCreateSplit}
                disabled={txState === "signing" || txState === "confirming" || encrypting}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-emerald-600 to-cyan-600 text-white
                           hover:from-emerald-500 hover:to-cyan-500 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {encrypting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Encrypting amounts...
                  </>
                ) : txState === "signing" || txState === "confirming" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    {modalView === "template" ? "Save Template" : "Create Encrypted Split"}
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== DETAIL MODAL ======================== */}
      <AnimatePresence>
        {modalView === "detail" && selectedSplit && (
          <motion.div
            key="detail-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}
          >
            <motion.div
              key="detail-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-emerald-500/20
                         shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-400" />
                  Split #{selectedSplit.id}
                </h3>
                <button
                  onClick={() => setModalView("none")}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <PrivacyLens
                title="Payment Privacy"
                rows={[
                  {
                    label: "Creator",
                    chainValue: selectedSplit.creator,
                    ownerValue: shortAddr(selectedSplit.creator),
                    encrypted: false,
                  },
                  {
                    label: "Recipients",
                    chainValue: `${selectedSplit.recipientCount} addresses`,
                    ownerValue: `${selectedSplit.recipientCount} addresses`,
                    encrypted: false,
                  },
                  {
                    label: "Individual Amounts",
                    chainValue: "0xc4f3...encrypted",
                    ownerValue: "Unseal to view",
                    encrypted: true,
                  },
                  {
                    label: "Total Amount",
                    chainValue: "0xa1b2...encrypted",
                    ownerValue: "Hidden from all",
                    encrypted: true,
                  },
                ]}
              />

              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium">Status</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border
                    ${STATUS_STYLE[selectedSplit.status]?.bg} ${STATUS_STYLE[selectedSplit.status]?.text} ${STATUS_STYLE[selectedSplit.status]?.border}`}>
                    {STATUS_LABEL[selectedSplit.status]}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created {new Date(selectedSplit.createdAt * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedSplit.status === 0 && !isCreator(selectedSplit) && (
                <button
                  onClick={() => handleClaim(selectedSplit.id)}
                  disabled={txState === "signing" || txState === "confirming"}
                  className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                             bg-gradient-to-r from-emerald-600 to-cyan-600 text-white
                             hover:from-emerald-500 hover:to-cyan-500 transition-all
                             disabled:opacity-50"
                >
                  <Download size={16} />
                  Claim My Payment
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
