"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Lock,
  X,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Users,
  Clock,
  Zap,
  Shield,
  Flag,
  ChevronDown,
  Target,
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

interface JobData {
  id: number;
  poster: string;
  title: string;
  escrowAmount: string;
  token: string;
  bidCount: number;
  assignee: string;
  status: number; // 0=OPEN 1=ASSIGNED 2=COMPLETED 3=DISPUTED
  milestoneCount: number;
}

interface MilestoneData {
  description: string;
  percentage: number;
  status: number; // 0=PENDING 1=DELIVERED 2=APPROVED 3=DISPUTED
}

type ModalView = "none" | "post" | "bid" | "detail";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const JOB_STATUS_LABEL: Record<number, string> = {
  0: "OPEN", 1: "ASSIGNED", 2: "COMPLETED", 3: "DISPUTED",
};
const JOB_STATUS_STYLE: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  1: { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20" },
  2: { bg: "bg-gray-500/15",    text: "text-gray-400",    border: "border-gray-500/20" },
  3: { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20" },
};

const MS_STATUS_LABEL: Record<number, string> = {
  0: "Pending", 1: "Delivered", 2: "Approved", 3: "Disputed",
};
const MS_STATUS_COLOR: Record<number, string> = {
  0: "text-gray-400", 1: "text-amber-400", 2: "text-emerald-400", 3: "text-red-400",
};

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ================================================================== */
/*  FreelancePage                                                      */
/* ================================================================== */

export default function FreelancePage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();
  const { encrypt, stage, encrypting } = useEncrypt();
  const { unseal, unsealing } = useUnseal();
  const freelanceContract = useContract("FreelanceBidding");
  const freelanceRead = useReadContract("FreelanceBidding");

  /* ---- state ---- */
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ---- modals ---- */
  const [modalView, setModalView] = useState<ModalView>("none");
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);

  /* ---- post job form ---- */
  const [jobTitle, setJobTitle] = useState("");
  const [jobEscrow, setJobEscrow] = useState("");
  const [jobMilestones, setJobMilestones] = useState<{ desc: string; pct: string }[]>([
    { desc: "", pct: "100" },
  ]);

  /* ---- bid form ---- */
  const [bidPrice, setBidPrice] = useState("");

  /* ---- tx feedback ---- */
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const busyRef = useRef<Set<string>>(new Set());
  const deployed =
    CONTRACTS.FreelanceBidding !== "0x0000000000000000000000000000000000000000";

  /* ---------------------------------------------------------------- */
  /*  Fetch jobs                                                       */
  /* ---------------------------------------------------------------- */

  const fetchJobs = useCallback(async () => {
    if (!freelanceRead) return;
    setLoading(true);
    try {
      const total = Number(await freelanceRead.getJobCount());
      const list: JobData[] = [];

      for (let i = 0; i < total; i++) {
        const j = await freelanceRead.getJob(i);
        list.push({
          id: i,
          poster: j[0],
          title: j[1],
          escrowAmount: j[2].toString(),
          token: j[3],
          bidCount: Number(j[4]),
          assignee: j[5],
          status: Number(j[6]),
          milestoneCount: Number(j[7]),
        });
      }

      list.reverse();
      setJobs(list);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [freelanceRead]);

  useEffect(() => { fetchJobs(); }, [fetchJobs, refreshKey]);

  /* ---- fetch milestones for a job ---- */

  const fetchMilestones = useCallback(async (job: JobData) => {
    if (!freelanceRead) return;
    const ms: MilestoneData[] = [];
    for (let i = 0; i < job.milestoneCount; i++) {
      const m = await freelanceRead.getMilestone(job.id, i);
      ms.push({
        description: m[0],
        percentage: Number(m[1]),
        status: Number(m[2]),
      });
    }
    setMilestones(ms);
  }, [freelanceRead]);

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

  /* ---------------------------------------------------------------- */
  /*  Post job                                                         */
  /* ---------------------------------------------------------------- */

  const handlePostJob = useCallback(async () => {
    if (!freelanceContract || !jobTitle || !jobEscrow) return;
    const valid = jobMilestones.filter((m) => m.desc && m.pct);
    if (valid.length === 0) return;

    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const tx = await freelanceContract.postJob(
        jobTitle,
        BigInt(jobEscrow),
        CONTRACTS.ConfidentialToken,
        valid.map((m) => m.desc),
        valid.map((m) => BigInt(m.pct)),
      );
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setJobTitle("");
      setJobEscrow("");
      setJobMilestones([{ desc: "", pct: "100" }]);
      setModalView("none");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [freelanceContract, jobTitle, jobEscrow, jobMilestones]);

  /* ---------------------------------------------------------------- */
  /*  Submit bid                                                       */
  /* ---------------------------------------------------------------- */

  const handleBid = useCallback(async () => {
    if (!freelanceContract || !initialized || !selectedJob || !bidPrice) return;
    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const { Encryptable } = await import("cofhejs/web");
      const enc = await encrypt([Encryptable.uint128(BigInt(bidPrice))]);
      if (!enc) throw new Error("Encryption failed");

      const tx = await freelanceContract.submitBid(selectedJob.id, enc[0]);
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");
      setBidPrice("");
      setModalView("none");
      setSelectedJob(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      handleTxError(err);
    }
  }, [freelanceContract, initialized, selectedJob, bidPrice, encrypt]);

  /* ---- milestone actions ---- */

  const handleDeliver = useCallback(
    (jobId: number, msIdx: number) =>
      guardedAction(`deliver-${jobId}-${msIdx}`, async () => {
        const tx = await freelanceContract!.deliverMilestone(jobId, msIdx);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
      }),
    [freelanceContract, guardedAction],
  );

  const handleApprove = useCallback(
    (jobId: number, msIdx: number) =>
      guardedAction(`approve-${jobId}-${msIdx}`, async () => {
        const tx = await freelanceContract!.approveMilestone(jobId, msIdx);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
      }),
    [freelanceContract, guardedAction],
  );

  const handleDispute = useCallback(
    (jobId: number, msIdx: number) =>
      guardedAction(`dispute-${jobId}-${msIdx}`, async () => {
        const tx = await freelanceContract!.disputeMilestone(jobId, msIdx);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
      }),
    [freelanceContract, guardedAction],
  );

  /* ---- helpers ---- */

  const isPoster = (j: JobData) =>
    account !== null && j.poster.toLowerCase() === account.toLowerCase();

  const isAssignee = (j: JobData) =>
    account !== null && j.assignee.toLowerCase() === account.toLowerCase();

  const addMilestone = () => {
    if (jobMilestones.length >= 10) return;
    setJobMilestones((prev) => [...prev, { desc: "", pct: "" }]);
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Briefcase size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Freelance Bidding</h1>
            <p className="text-sm text-gray-400">
              Encrypted bids -- hire without revealing budgets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          {account && (
            <button
              onClick={() => {
                setModalView("post");
                setTxState("idle");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium
                         hover:from-indigo-500 hover:to-purple-500 transition-all"
            >
              <Plus size={16} />
              Post Job
            </button>
          )}
        </div>
      </div>

      {/* Not connected */}
      {!account && (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center">
            <Briefcase size={24} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Connect your wallet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Post jobs with milestone escrow, submit encrypted bids, and manage deliverables --
            all with FHE-encrypted pricing.
          </p>
        </div>
      )}

      {/* Not deployed */}
      {account && !deployed && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              FreelanceBidding contract not deployed yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Deploy the contracts and update the address in constants.ts.
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      {account && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
          <Lock size={16} className="text-indigo-400 shrink-0" />
          <p className="text-xs text-indigo-300/80">
            <strong>Encrypted bidding:</strong> Freelancer bids are encrypted with FHE.
            The poster cannot see bid amounts until they accept. Milestone payments are
            released from escrow upon approval.
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
            {jobs.length} job{jobs.length !== 1 ? "s" : ""}
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

      {/* Job grid */}
      {account && (
        <>
          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="glass rounded-xl py-20 text-center space-y-3">
              <Briefcase size={36} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-500">No jobs posted yet</p>
              <p className="text-xs text-gray-600">
                Post the first job to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job) => {
                const style = JOB_STATUS_STYLE[job.status] ?? JOB_STATUS_STYLE[0];
                const mine = isPoster(job);

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl overflow-hidden hover:border-indigo-500/25 transition-all"
                  >
                    {/* Card header */}
                    <div className="px-5 py-4 border-b border-indigo-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{job.id}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {JOB_STATUS_LABEL[job.status]}
                        </span>
                      </div>
                      {mine && (
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          Your Job
                        </span>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="px-5 py-4 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-100 leading-snug">
                        {job.title}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Escrow</p>
                          <p className="text-sm font-bold text-gray-100">
                            {job.escrowAmount}{" "}
                            <span className="text-xs font-medium text-indigo-400">CDEX</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Milestones</p>
                          <p className="text-sm font-medium text-gray-300 flex items-center gap-1 justify-end">
                            <Target size={12} className="text-indigo-500/60" />
                            {job.milestoneCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Users size={12} className="text-indigo-500/60" />
                          {job.bidCount} bid{job.bidCount !== 1 ? "s" : ""}
                        </div>
                        {job.assignee !== "0x0000000000000000000000000000000000000000" && (
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <CheckCircle2 size={12} className="text-emerald-500/60" />
                            {shortAddr(job.assignee)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <Lock size={10} className="text-indigo-500/40" />
                        Bid prices encrypted with FHE
                      </div>
                    </div>

                    {/* Card actions */}
                    <div className="px-5 py-3 border-t border-indigo-500/5 flex items-center gap-2">
                      {job.status === 0 && !mine && (
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setBidPrice("");
                            setModalView("bid");
                            setTxState("idle");
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold
                                     bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                                     hover:from-indigo-500 hover:to-purple-500 transition-all"
                        >
                          <Lock size={12} />
                          Submit Bid
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          setSelectedJob(job);
                          setModalView("detail");
                          setTxState("idle");
                          await fetchMilestones(job);
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-medium
                                   bg-white/[0.03] border border-indigo-500/10 text-gray-400
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

      {/* ======================== POST JOB MODAL ======================== */}
      <AnimatePresence>
        {modalView === "post" && (
          <motion.div
            key="post-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}
          >
            <motion.div
              key="post-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-indigo-500/20
                         shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-400" />
                  Post Job
                </h3>
                <button
                  onClick={() => setModalView("none")}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Smart contract audit"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-indigo-500/10
                             text-sm text-gray-200 placeholder:text-gray-600
                             focus:outline-none focus:border-indigo-500/40 transition-colors"
                />
              </div>

              {/* Escrow */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Escrow Amount (CDEX)</label>
                <input
                  type="number"
                  value={jobEscrow}
                  onChange={(e) => setJobEscrow(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-indigo-500/10
                             text-sm text-gray-200 placeholder:text-gray-600
                             focus:outline-none focus:border-indigo-500/40 transition-colors"
                />
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 font-medium">Milestones</label>
                  <button
                    onClick={addMilestone}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>

                {jobMilestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={m.desc}
                      onChange={(e) => {
                        setJobMilestones((prev) =>
                          prev.map((ms, idx) => (idx === i ? { ...ms, desc: e.target.value } : ms))
                        );
                      }}
                      placeholder={`Milestone ${i + 1} description`}
                      className="flex-1 rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-indigo-500/10
                                 text-sm text-gray-200 placeholder:text-gray-600
                                 focus:outline-none focus:border-indigo-500/40 transition-colors"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={m.pct}
                        onChange={(e) => {
                          setJobMilestones((prev) =>
                            prev.map((ms, idx) => (idx === i ? { ...ms, pct: e.target.value } : ms))
                          );
                        }}
                        placeholder="%"
                        min="0"
                        max="100"
                        className="w-16 rounded-lg px-2 py-2.5 bg-[#0a0b14] border border-indigo-500/10
                                   text-sm text-gray-200 text-center placeholder:text-gray-600
                                   focus:outline-none focus:border-indigo-500/40 transition-colors"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handlePostJob}
                disabled={txState === "signing" || txState === "confirming"}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                           hover:from-indigo-500 hover:to-purple-500 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {txState === "signing" || txState === "confirming" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Post Job
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== BID MODAL ======================== */}
      <AnimatePresence>
        {modalView === "bid" && selectedJob && (
          <motion.div
            key="bid-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalView("none")}
          >
            <motion.div
              key="bid-card"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-md p-6 space-y-5 border border-indigo-500/20
                         shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Lock size={18} className="text-indigo-400" />
                  Submit Encrypted Bid
                </h3>
                <button
                  onClick={() => setModalView("none")}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-4 py-3">
                <p className="text-xs text-gray-500">Job</p>
                <p className="text-sm font-semibold text-gray-100">{selectedJob.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Escrow: {selectedJob.escrowAmount} CDEX
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Your Bid (CDEX)</label>
                <input
                  type="number"
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-indigo-500/10
                             text-sm text-gray-200 placeholder:text-gray-600
                             focus:outline-none focus:border-indigo-500/40 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <Shield size={12} className="text-indigo-400 shrink-0" />
                <p className="text-[10px] text-indigo-300/70">
                  Your bid price will be encrypted with FHE. The poster cannot see it until they accept.
                </p>
              </div>

              <button
                onClick={handleBid}
                disabled={txState === "signing" || txState === "confirming" || encrypting || !bidPrice}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold
                           bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                           hover:from-indigo-500 hover:to-purple-500 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {encrypting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Encrypting bid...
                  </>
                ) : txState === "signing" || txState === "confirming" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Submit Encrypted Bid
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================== DETAIL MODAL ======================== */}
      <AnimatePresence>
        {modalView === "detail" && selectedJob && (
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
              className="glass rounded-2xl w-full max-w-lg p-6 space-y-5 border border-indigo-500/20
                         shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-400" />
                  {selectedJob.title}
                </h3>
                <button
                  onClick={() => setModalView("none")}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Job info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[var(--void-3)] px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase">Escrow</p>
                  <p className="text-sm font-bold text-gray-100">{selectedJob.escrowAmount} CDEX</p>
                </div>
                <div className="rounded-lg bg-[var(--void-3)] px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase">Bids</p>
                  <p className="text-sm font-bold text-gray-100">{selectedJob.bidCount}</p>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium">Milestones</p>
                {milestones.length === 0 ? (
                  <p className="text-xs text-gray-600">Loading milestones...</p>
                ) : (
                  milestones.map((ms, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-[var(--void-3)] border border-[var(--border-subtle)] px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-200">
                          {i + 1}. {ms.description}
                        </p>
                        <span className={`text-[10px] font-semibold ${MS_STATUS_COLOR[ms.status]}`}>
                          {MS_STATUS_LABEL[ms.status]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{ms.percentage}% of escrow</span>
                        <div className="flex items-center gap-1.5">
                          {/* Deliver (assignee, pending) */}
                          {isAssignee(selectedJob) && ms.status === 0 && (
                            <button
                              onClick={() => handleDeliver(selectedJob.id, i)}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300
                                         hover:bg-blue-500/20 transition-colors"
                            >
                              Deliver
                            </button>
                          )}
                          {/* Approve (poster, delivered) */}
                          {isPoster(selectedJob) && ms.status === 1 && (
                            <button
                              onClick={() => handleApprove(selectedJob.id, i)}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300
                                         hover:bg-emerald-500/20 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {/* Dispute (poster, delivered) */}
                          {isPoster(selectedJob) && ms.status === 1 && (
                            <button
                              onClick={() => handleDispute(selectedJob.id, i)}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-300
                                         hover:bg-red-500/20 transition-colors"
                            >
                              Dispute
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
