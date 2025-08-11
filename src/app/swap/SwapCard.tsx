"use client";

import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useOneBalance } from "@/hooks/useOneBalance";
import TokenSelect from "./TokenSelect";

export const SwapCard: React.FC = () => {
  const {
    tokens,
    fromAssetId,
    toAssetId,
    fromToken,
    toToken,
    onSelectFrom,
    onSelectTo,

    swapAmount,
    setSwapAmount,
    estimatedAmount,
    fetchingQuote,
    fetchEstimatedQuote,

    toggleSwapDirection,
    handleSwap,

    accountAddress,
    embeddedWallet,

    status,
    loading,
    swapping,

    ui: { fromBalance, isInvalid, isBusy, mustDisable },
  } = useOneBalance();

  const [flashStatus, setFlashStatus] = useState<string | null>(null);

  const rawAmount = (swapAmount ?? "").trim();
  const parsedAmount = rawAmount === "" ? 0 : Number(rawAmount);
  const parsedEst = estimatedAmount ? Number(estimatedAmount) : NaN;
  const estRate = useMemo(() => {
    return !Number.isNaN(parsedAmount) &&
      parsedAmount > 0 &&
      !Number.isNaN(parsedEst)
      ? parsedEst / parsedAmount
      : null;
  }, [parsedAmount, parsedEst]);

  useEffect(() => {
    const s = status?.status;
    if (!s) {
      setFlashStatus(null);
      return;
    }
    if (s === "PENDING" || s === "PROCESSING") {
      setFlashStatus(s);
      return;
    }
    setFlashStatus(s);
    const t = setTimeout(() => setFlashStatus(null), 3000);
    return () => clearTimeout(t);
  }, [status?.status]);

  function handleSwapAmountChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.trim();
    if (!/^\d*\.?\d*$/.test(raw)) return;

    setSwapAmount(raw);
    if (raw === "" || raw === ".") {
      return;
    }
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    if (accountAddress && embeddedWallet) {
      fetchEstimatedQuote(raw);
    }
  }

  function renderStatus() {
    const s =
      status?.status === "PENDING" || status?.status === "PROCESSING"
        ? status?.status
        : flashStatus;
    if (!s) return null;

    const base = "mt-3 text-center text-sm font-medium";
    if (s === "PENDING" || s === "PROCESSING") {
      return (
        <div className={`${base} text-yellow-300`}>
          ⏳ Transaction {s === "PENDING" ? "Pending" : "Processing"}...
        </div>
      );
    }
    if (s === "COMPLETED") {
      return (
        <div className={`${base} text-green-400`}>✅ Transaction Completed</div>
      );
    }
    if (s === "FAILED") {
      return (
        <div className={`${base} text-rose-400`}>❌ Transaction Failed</div>
      );
    }
    if (s === "UNKNOWN") {
      return (
        <div className={`${base} text-white/70`}>
          ⚠️ Status Unknown (timeout). Check later or refresh.
        </div>
      );
    }
    return null;
  }

  const rateText =
    estRate !== null && toToken && fromToken
      ? `1 ${fromToken.symbol} ≈ ${
          toToken.decimals <= 6 ? estRate.toFixed(2) : estRate.toFixed(6)
        } ${toToken.symbol}`
      : null;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-sm font-semibold text-white/90">Swap</h2>
        <div className="text-[11px] text-white/60">
          Balance: {fromBalance ?? "—"} {fromToken?.symbol ?? ""}
        </div>
      </div>

      <div className="space-y-3">
        <div
          className={`rounded-2xl border p-4 ${
            isInvalid
              ? "border-rose-400/40 bg-rose-400/5"
              : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <input
              inputMode="decimal"
              type="text"
              value={
                swapAmount === undefined ||
                swapAmount === null ||
                swapAmount === ""
                  ? "0"
                  : swapAmount
              }
              onChange={handleSwapAmountChange}
              placeholder="0"
              aria-label="From amount"
              className="flex-1 bg-transparent text-2xl md:text-3xl font-semibold tracking-tight text-white placeholder-white/30 focus:outline-none"
              pattern="[0-9]*[.]?[0-9]*"
            />
            <div className="w-52">
              <TokenSelect
                label="From"
                tokens={tokens}
                selectedId={fromAssetId}
                onSelect={onSelectFrom}
                disabled={isBusy}
              />
            </div>
          </div>

          {isInvalid && (
            <div className="mt-2 text-[11px] text-rose-300">
              Enter a valid amount (and not over balance).
            </div>
          )}
        </div>

        <div className="flex justify-center -my-1">
          <button
            onClick={toggleSwapDirection}
            aria-label="Reverse swap direction"
            title="Reverse swap direction"
            className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-all"
            disabled={isBusy}
          >
            ↕
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-h-[40px] flex-1 flex items-center">
              {fetchingQuote ? (
                <span className="inline-block w-24 h-6 bg-white/10 animate-pulse rounded" />
              ) : estimatedAmount ? (
                <span className="text-2xl md:text-3xl font-semibold text-white">
                  {estimatedAmount}
                </span>
              ) : (
                <span className="text-2xl md:text-3xl font-semibold text-white/40">
                  0.0
                </span>
              )}
            </div>
            <div className="w-52">
              <TokenSelect
                label="To"
                tokens={tokens}
                selectedId={toAssetId}
                onSelect={onSelectTo}
                disabled={isBusy}
              />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-white/50">To token</div>
        </div>
      </div>

      <div className="mt-3 md:mt-4 flex flex-col gap-1 text-xs text-white/60">
        {rateText && (
          <div className="flex justify-between">
            <span>Est. rate</span>
            <span>{rateText}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Network</span>
          <span>Auto • Gasless</span>
        </div>
        <div className="flex justify-between">
          <span>Slippage</span>
          <span>Auto</span>
        </div>
      </div>

      <button
        onClick={handleSwap}
        disabled={mustDisable}
        className={`mt-4 w-full py-3 md:py-3.5 rounded-2xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#FFAB40]/40 ${
          mustDisable
            ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
            : "bg-gradient-to-r from-[#FFAB40] to-amber-400 text-black hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(255,171,64,0.8)]"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
            {swapping ? "Swapping..." : "Processing..."}
          </div>
        ) : (
          "Swap"
        )}
      </button>

      {renderStatus()}
    </div>
  );
};

export default SwapCard;
