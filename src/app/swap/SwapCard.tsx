"use client";

import React from "react";
import { useOneBalance } from "@/hooks/useOneBalance";

const MIN_ETH = 1e-18;
const MIN_USDC = 1e-6;

export const SwapCard: React.FC = () => {
  const {
    swapAmount,
    estimatedAmount,
    fetchingQuote,
    swapDirection,
    handleSwapAmountChange,
    toggleSwapDirection,
    handleSwap,
    loading,
    swapping,
    usdcBalance,
    ethBalance,
    accountAddress,
  } = useOneBalance();

  const toSymbol = swapDirection === "USDC_TO_ETH" ? "ETH" : "USDC";
  const fromSymbol = swapDirection === "USDC_TO_ETH" ? "USDC" : "ETH";
  const fromBalance = fromSymbol === "USDC" ? usdcBalance : ethBalance;

  const parsedAmount = Number(swapAmount || 0);
  const parsedEst = estimatedAmount ? Number(estimatedAmount) : NaN;
  const estRate =
    !Number.isNaN(parsedAmount) && parsedAmount > 0 && !Number.isNaN(parsedEst)
      ? parsedEst / parsedAmount
      : null;

  const minValue = fromSymbol === "ETH" ? MIN_ETH : MIN_USDC;
  const isBelowMin = parsedAmount > 0 && parsedAmount < minValue;
  const isInvalid = parsedAmount <= 0 || isBelowMin;

  const hasBalance = Number(fromBalance || "0") > 0;
  const mustDisable = loading || !accountAddress || isInvalid || !hasBalance;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-sm font-semibold text-white/90">Swap</h2>
        <div className="text-[11px] text-white/60">
          Balance: {fromBalance ?? "—"} {fromSymbol}
        </div>
      </div>

      <div className="space-y-3">
        <div
          className={`rounded-2xl border p-4 ${
            isBelowMin
              ? "border-rose-400/40 bg-rose-400/5"
              : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <input
              inputMode="decimal"
              type="text"
              value={swapAmount}
              onChange={handleSwapAmountChange}
              placeholder="0.0"
              aria-label="From amount"
              className="flex-1 bg-transparent text-2xl md:text-3xl font-semibold tracking-tight text-white placeholder-white/30 focus:outline-none"
            />
            <TokenChip symbol={fromSymbol} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-white/50">From any chain</span>
            <span className="text-white/40">
              Min:{" "}
              {fromSymbol === "ETH"
                ? "0.000000000000000001 ETH"
                : "0.000001 USDC"}
            </span>
          </div>
          {!hasBalance && (
            <div className="mt-2 text-[11px] text-amber-300">
              Your {fromSymbol} balance is 0. Add tokens to your Smart Contract
              Account (SCA). Adding to an EOA will not work.
            </div>
          )}
          {isBelowMin && hasBalance && (
            <div className="mt-2 text-[11px] text-rose-300">
              Amount is below the minimum allowed for {fromSymbol}.
            </div>
          )}
        </div>

        <div className="flex justify-center -my-1">
          <button
            onClick={toggleSwapDirection}
            aria-label="Reverse swap direction"
            title="Reverse swap direction"
            className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-all shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_20px_2px_rgba(255,171,64,0.25)]"
          >
            ↕
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
            <TokenChip symbol={toSymbol} />
          </div>
          <div className="mt-2 text-[11px] text-white/50">To any chain</div>
        </div>
      </div>

      <div className="mt-3 md:mt-4 flex flex-col gap-1 text-xs text-white/60">
        {estRate !== null && (
          <div className="flex justify-between">
            <span>Est. rate</span>
            <span>
              1 {fromSymbol} ≈{" "}
              {toSymbol === "ETH" ? estRate.toFixed(6) : estRate.toFixed(2)}{" "}
              {toSymbol}
            </span>
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

      {fromSymbol === "USDC" && (
        <div className="mt-2 text-[11px] text-white/60 text-center">
          No gas tokens needed — fees are paid from your {fromSymbol} balance.
        </div>
      )}
    </div>
  );
};

const TokenChip: React.FC<{ symbol: string }> = ({ symbol }) => (
  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-white/90">
    <span className="inline-block h-5 w-5 rounded-full bg-white/20" />
    <span className="font-medium">{symbol}</span>
  </span>
);
