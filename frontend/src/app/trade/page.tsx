"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Lock,
  X,
  ChevronDown,
  Loader2,
  Plus,
  Eye,
  Trash2,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
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
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface OrderData {
  id: number;
  maker: string;
  tokenSell: string;
  tokenBuy: string;
  amountSell: string;
  encPriceHash: bigint;
  side: number; // 0 = BUY, 1 = SELL
  status: number; // 0 = ACTIVE, 1 = FILLED, 2 = CANCELLED
  createdAt: number;
  unsealedPrice: string | null;
}

type ModalView = "none" | "fill";

/* ------------------------------------------------------------------ */
/* Token helpers                                                       */
/* ------------------------------------------------------------------ */

const TOKEN_OPTIONS = [
  { label: "CDEX", address: CONTRACTS.ConfidentialToken, symbol: "CDEX" },
];

function tokenSymbol(addr: string): string {
  const found = TOKEN_OPTIONS.find(
    (t) => t.address.toLowerCase() === addr.toLowerCase(),
  );
  return found ? found.symbol : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/* Token dropdown                                                      */
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
          <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 mt-1 w-full rounded-lg border border-purple-500/20 bg-[#111227] shadow-xl overflow-hidden"
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
/* TradePage                                                           */
/* ================================================================== */

export default function TradePage() {
  const { account } = useWallet();
  const { initialized } = useCofhe();
  const { encrypt, stage, encrypting } = useEncrypt();
  const { unseal, unsealing } = useUnseal();
  const orderBookContract = useContract("OrderBook");
  const orderBookRead = useReadContract("OrderBook");

  /* ---- State ---- */
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create order form
  const [sellToken, setSellToken] = useState<string>(CONTRACTS.ConfidentialToken);
  const [buyToken, setBuyToken] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [side, setSide] = useState<0 | 1>(1);

  // Fill order modal
  const [modalView, setModalView] = useState<ModalView>("none");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [takerPrice, setTakerPrice] = useState("");

  // Transaction
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const contractDeployed =
    CONTRACTS.OrderBook !== "0x0000000000000000000000000000000000000000";

  /* ---------------------------------------------------------------- */
  /* Fetch active orders from chain                                    */
  /* ---------------------------------------------------------------- */

  const fetchOrders = useCallback(async () => {
    if (!orderBookRead) return;
    setLoading(true);
    try {
      const count = await orderBookRead.getActiveOrderCount();
      const num = Number(count);
      const fetched: OrderData[] = [];

      for (let i = 0; i < num; i++) {
        const orderId = await orderBookRead.getActiveOrderId(i);
        const o = await orderBookRead.getOrder(orderId);
        fetched.push({
          id: Number(orderId),
          maker: o[0],
          tokenSell: o[1],
          tokenBuy: o[2],
          amountSell: o[3].toString(),
          encPriceHash: BigInt(o[4]),
          side: Number(o[5]),
          status: Number(o[6]),
          createdAt: Number(o[7]),
          unsealedPrice: null,
        });
      }

      setOrders(fetched);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [orderBookRead]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshKey]);

  /* ---------------------------------------------------------------- */
  /* Unseal own order price                                            */
  /* ---------------------------------------------------------------- */

  const unsealPrice = useCallback(
    async (order: OrderData) => {
      if (!account || order.maker.toLowerCase() !== account.toLowerCase()) return;
      // FheTypes.Uint128 = 5
      const value = await unseal(order.encPriceHash, 5);
      if (value !== null) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, unsealedPrice: value.toString() } : o,
          ),
        );
      }
    },
    [account, unseal],
  );

  /* ---------------------------------------------------------------- */
  /* Create order                                                      */
  /* ---------------------------------------------------------------- */

  const handleCreateOrder = useCallback(async () => {
    if (!orderBookContract || !initialized || !amount || !price || !sellToken || !buyToken) return;

    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const { Encryptable } = await import("cofhejs/web");
      const encrypted = await encrypt([Encryptable.uint128(BigInt(price))]);
      if (!encrypted) throw new Error("Encryption failed");

      const tx = await orderBookContract.createOrder(
        sellToken,
        buyToken,
        BigInt(amount),
        encrypted[0],
        side,
      );
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");

      setAmount("");
      setPrice("");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setTxState("error");
      setTxError(
        err instanceof Error
          ? err.message.includes("user rejected")
            ? "Transaction rejected"
            : err.message.slice(0, 120)
          : "Transaction failed",
      );
    }
  }, [orderBookContract, initialized, amount, price, sellToken, buyToken, side, encrypt]);

  /* ---------------------------------------------------------------- */
  /* Fill order                                                        */
  /* ---------------------------------------------------------------- */

  const handleFillOrder = useCallback(async () => {
    if (!orderBookContract || !initialized || !selectedOrder || !takerPrice) return;

    setTxState("signing");
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const { Encryptable } = await import("cofhejs/web");
      const encrypted = await encrypt([Encryptable.uint128(BigInt(takerPrice))]);
      if (!encrypted) throw new Error("Encryption failed");

      const tx = await orderBookContract.fillOrder(selectedOrder.id, encrypted[0]);
      setTxState("confirming");
      setTxHash(tx.hash);
      await tx.wait();
      setTxState("success");

      setModalView("none");
      setSelectedOrder(null);
      setTakerPrice("");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setTxState("error");
      setTxError(
        err instanceof Error
          ? err.message.includes("user rejected")
            ? "Transaction rejected"
            : err.message.slice(0, 120)
          : "Transaction failed",
      );
    }
  }, [orderBookContract, initialized, selectedOrder, takerPrice, encrypt]);

  /* ---------------------------------------------------------------- */
  /* Cancel order                                                      */
  /* ---------------------------------------------------------------- */

  const handleCancelOrder = useCallback(
    async (orderId: number) => {
      if (!orderBookContract) return;
      setTxState("signing");
      setTxError(undefined);
      setTxHash(undefined);

      try {
        const tx = await orderBookContract.cancelOrder(orderId);
        setTxState("confirming");
        setTxHash(tx.hash);
        await tx.wait();
        setTxState("success");
        setRefreshKey((k) => k + 1);
      } catch (err: unknown) {
        setTxState("error");
        setTxError(
          err instanceof Error
            ? err.message.includes("user rejected")
              ? "Transaction rejected"
              : err.message.slice(0, 120)
            : "Transaction failed",
        );
      }
    },
    [orderBookContract],
  );

  /* ---------------------------------------------------------------- */
  /* Helpers                                                           */
  /* ---------------------------------------------------------------- */

  const isOwner = (order: OrderData) =>
    account !== null && order.maker.toLowerCase() === account.toLowerCase();

  const myOrders = orders.filter((o) => isOwner(o));

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <ArrowLeftRight size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">P2P Trading</h1>
            <p className="text-sm text-gray-400">
              Encrypted order matching -- nobody sees your price
            </p>
          </div>
        </div>
        <FaucetButton />
      </div>

      {/* ---- Wallet not connected ---- */}
      {!account && (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center">
            <Lock size={24} className="text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-200">
            Connect your wallet to trade
          </h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            All order prices are encrypted with FHE. Connect MetaMask to create
            orders, fill orders, and view your positions.
          </p>
        </div>
      )}

      {/* ---- Contract not deployed ---- */}
      {account && !contractDeployed && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              OrderBook contract not deployed yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Deploy the contracts first, then update the address in
              constants.ts to enable live trading.
            </p>
          </div>
        </div>
      )}

      {/* Transaction + encryption status */}
      <TransactionStatus
        state={txState}
        txHash={txHash}
        error={txError}
        onDismiss={() => setTxState("idle")}
      />
      <EncryptionProgress stage={stage} visible={encrypting} />

      {/* ---- Main layout ---- */}
      {account && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ================= ORDER BOOK (left 2/3) ================= */}
          <div className="lg:col-span-2 glass rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-500/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                Order Book
              </h2>
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {loading && orders.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={22} className="text-purple-400 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <ArrowLeftRight size={32} className="mx-auto text-gray-600" />
                <p className="text-sm text-gray-500">No active orders</p>
                <p className="text-xs text-gray-600">
                  Create the first encrypted order to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-purple-500/5">
                      <th className="text-left px-5 py-3 font-medium">ID</th>
                      <th className="text-left px-5 py-3 font-medium">Pair</th>
                      <th className="text-left px-5 py-3 font-medium">Side</th>
                      <th className="text-right px-5 py-3 font-medium">Amount</th>
                      <th className="text-right px-5 py-3 font-medium">Price</th>
                      <th className="text-center px-5 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const mine = isOwner(order);
                      const isBuy = order.side === 0;

                      return (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-purple-500/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-3.5 font-mono text-gray-400 text-xs">
                            #{order.id}
                          </td>
                          <td className="px-5 py-3.5 text-gray-200 font-medium">
                            {tokenSymbol(order.tokenSell)}/{tokenSymbol(order.tokenBuy)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wide ${
                                isBuy
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/15 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {isBuy ? "BUY" : "SELL"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-gray-200">
                            {order.amountSell}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {mine ? (
                              order.unsealedPrice !== null ? (
                                <span className="font-mono text-purple-300">
                                  {order.unsealedPrice}
                                </span>
                              ) : (
                                <button
                                  onClick={() => unsealPrice(order)}
                                  disabled={unsealing || !initialized}
                                  className="inline-flex items-center gap-1.5 text-xs text-purple-400
                                             hover:text-purple-300 transition-colors disabled:opacity-50"
                                >
                                  <Eye size={12} />
                                  Reveal
                                </button>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-gray-500 text-xs">
                                <Lock size={11} className="text-purple-500/60" />
                                Encrypted
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {mine ? (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                                           bg-red-500/10 border border-red-500/20 text-red-400
                                           hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                              >
                                <Trash2 size={12} />
                                Cancel
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setTakerPrice("");
                                  setModalView("fill");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                                           bg-purple-500/10 border border-purple-500/20 text-purple-300
                                           hover:bg-purple-500/20 hover:border-purple-500/30 transition-all"
                              >
                                <ShoppingCart size={12} />
                                Fill Order
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer note */}
            <div className="px-5 py-3 border-t border-purple-500/5 flex items-center gap-2 text-[11px] text-gray-600">
              <Lock size={10} className="text-purple-500/40" />
              All prices are encrypted on-chain via FHE. Only order owners can unseal their own price.
            </div>
          </div>

          {/* ================= CREATE ORDER FORM (right 1/3) ================= */}
          <div className="glass rounded-xl p-5 space-y-5 h-fit sticky top-24">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-purple-400" />
              <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                Create Order
              </h2>
            </div>

            {/* Side toggle */}
            <div className="flex rounded-lg overflow-hidden border border-purple-500/10">
              <button
                type="button"
                onClick={() => setSide(0)}
                className={`flex-1 py-2.5 text-sm font-bold tracking-wide transition-all ${
                  side === 0
                    ? "bg-emerald-500/15 text-emerald-400 border-r border-emerald-500/20"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border-r border-purple-500/10"
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide(1)}
                className={`flex-1 py-2.5 text-sm font-bold tracking-wide transition-all ${
                  side === 1
                    ? "bg-red-500/15 text-red-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                }`}
              >
                SELL
              </button>
            </div>

            <TokenDropdown
              label="Token to Sell"
              value={sellToken}
              onChange={setSellToken}
            />
            <TokenDropdown
              label="Token to Buy"
              value={buyToken}
              onChange={setBuyToken}
            />

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-purple-500/10
                           text-sm text-gray-200 placeholder:text-gray-600
                           focus:outline-none focus:border-purple-500/40 transition-colors"
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <Lock size={10} className="text-purple-400" />
                Price per unit
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-purple-500/10
                           text-sm text-gray-200 placeholder:text-gray-600
                           focus:outline-none focus:border-purple-500/40 transition-colors"
              />
              <p className="text-[10px] text-purple-400/60 flex items-center gap-1">
                <Lock size={8} />
                Encrypted on submit -- nobody sees your price
              </p>
            </div>

            {/* Submit */}
            <button
              onClick={handleCreateOrder}
              disabled={
                !initialized ||
                !amount ||
                !price ||
                !sellToken ||
                !buyToken ||
                encrypting ||
                txState === "signing" ||
                txState === "confirming"
              }
              className="w-full rounded-lg py-3 text-sm font-semibold text-white
                         bg-gradient-to-r from-purple-600 to-blue-600
                         hover:from-purple-500 hover:to-blue-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-200 flex items-center justify-center gap-2"
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
                  Encrypt &amp; Submit
                </>
              )}
            </button>

            {/* Privacy note */}
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 px-4 py-3 space-y-1">
              <p className="text-[10px] text-purple-300/60 leading-relaxed">
                Your price is encrypted client-side via cofhejs and submitted
                as a ciphertext. The contract uses FHE.gte() to match orders
                without decrypting either price.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= MY ORDERS ================= */}
      {account && myOrders.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-500/10">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              My Orders
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-purple-500/5">
                  <th className="text-left px-5 py-3 font-medium">ID</th>
                  <th className="text-left px-5 py-3 font-medium">Pair</th>
                  <th className="text-left px-5 py-3 font-medium">Side</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  <th className="text-right px-5 py-3 font-medium">
                    Price (Unsealed)
                  </th>
                  <th className="text-center px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map((order) => {
                  const isBuy = order.side === 0;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-purple-500/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-gray-400 text-xs">
                        #{order.id}
                      </td>
                      <td className="px-5 py-3.5 text-gray-200 font-medium">
                        {tokenSymbol(order.tokenSell)}/{tokenSymbol(order.tokenBuy)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wide ${
                            isBuy
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/15 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {isBuy ? "BUY" : "SELL"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-gray-200">
                        {order.amountSell}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {order.unsealedPrice !== null ? (
                          <span className="font-mono text-purple-300">
                            {order.unsealedPrice}
                          </span>
                        ) : (
                          <button
                            onClick={() => unsealPrice(order)}
                            disabled={unsealing || !initialized}
                            className="inline-flex items-center gap-1.5 text-xs text-purple-400
                                       hover:text-purple-300 transition-colors disabled:opacity-50"
                          >
                            <Eye size={12} />
                            Unseal
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                                     bg-red-500/10 border border-red-500/20 text-red-400
                                     hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                        >
                          <Trash2 size={12} />
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= FILL ORDER MODAL ================= */}
      <AnimatePresence>
        {modalView === "fill" && selectedOrder && (
          <motion.div
            key="fill-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              setModalView("none");
              setSelectedOrder(null);
            }}
          >
            <motion.div
              key="fill-panel"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-md p-6 space-y-5 border border-purple-500/20 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-purple-400" />
                  Fill Order #{selectedOrder.id}
                </h3>
                <button
                  onClick={() => {
                    setModalView("none");
                    setSelectedOrder(null);
                  }}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Order details card */}
              <div className="space-y-2.5 rounded-xl bg-[#0a0b14]/80 p-4 border border-purple-500/5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pair</span>
                  <span className="text-gray-200 font-medium">
                    {tokenSymbol(selectedOrder.tokenSell)}/
                    {tokenSymbol(selectedOrder.tokenBuy)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-mono text-gray-200">
                    {selectedOrder.amountSell}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Maker</span>
                  <span className="font-mono text-gray-400 text-xs">
                    {shortAddr(selectedOrder.maker)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Maker&apos;s Price</span>
                  <span className="inline-flex items-center gap-1 text-purple-400/80 text-xs">
                    <Lock size={11} />
                    Hidden
                  </span>
                </div>
              </div>

              {/* Taker price input */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Lock size={10} className="text-purple-400" />
                  Your Price
                </label>
                <input
                  type="number"
                  value={takerPrice}
                  onChange={(e) => setTakerPrice(e.target.value)}
                  placeholder="Enter your price"
                  min="0"
                  className="w-full rounded-lg px-3 py-2.5 bg-[#0a0b14] border border-purple-500/10
                             text-sm text-gray-200 placeholder:text-gray-600
                             focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>

              {/* Privacy explanation */}
              <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 px-4 py-3">
                <p className="text-xs text-purple-300/80 leading-relaxed">
                  If your price &gt;= the maker&apos;s hidden price, the trade
                  executes via FHE. If not, nothing happens -- neither party
                  sees the other&apos;s price.
                </p>
              </div>

              {/* Encryption progress */}
              <EncryptionProgress stage={stage} visible={encrypting} />

              {/* Submit */}
              <button
                onClick={handleFillOrder}
                disabled={
                  !initialized ||
                  !takerPrice ||
                  encrypting ||
                  txState === "signing" ||
                  txState === "confirming"
                }
                className="w-full rounded-lg py-3 text-sm font-semibold text-white
                           bg-gradient-to-r from-purple-600 to-blue-600
                           hover:from-purple-500 hover:to-blue-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-200 flex items-center justify-center gap-2"
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
                ) : (
                  <>
                    <Lock size={14} />
                    Encrypt &amp; Submit
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
