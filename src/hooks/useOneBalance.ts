"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { formatUnits } from "viem";
import {
  getQuote,
  executeQuote,
  checkTransactionStatus,
  predictAccountAddress,
  getAggregatedBalance,
} from "@/lib/onebalance";
import { signQuote } from "@/lib/privySigningUtils";
import { truncateAddress } from "@/utils/truncateAddress";

type TxStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "UNKNOWN";

export type TokenItem = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  balanceRaw: bigint;
  balance: string;
  fiatValue?: number;
};

type QuoteRequest = {
  from: {
    account: {
      sessionAddress: string;
      adminAddress: string;
      accountAddress: string;
    };
    asset: { assetId: string };
    amount: string;
  };
  to: { asset: { assetId: string } };
};

const DEFAULT_FROM_ASSET = "ds:usdc";
const DEFAULT_TO_ASSET = "ds:eth";

function inferDecimals(assetId: string): number {
  const lower = assetId.toLowerCase();
  if (lower.includes("usdc") || lower.includes("usdt")) return 6;
  return 18;
}

function toSymbol(id: string): string {
  const raw = id.split(":")[1] || id;
  return raw.toUpperCase();
}

function toName(id: string): string {
  return toSymbol(id);
}

function formatByDecimals(raw: bigint, decimals: number): string {
  const s = formatUnits(raw, decimals);
  const n = Number(s);
  const fixed = decimals <= 6 ? 2 : 6;
  return Number.isFinite(n) ? n.toFixed(fixed) : s;
}

function parseAmountToAtomic(amountStr: string, decimals: number): bigint {
  const sanitized = amountStr.trim();
  if (!sanitized || !/^\d*\.?\d*$/.test(sanitized)) return BigInt(0);
  const [intPart = "0", fracPartRaw = ""] = sanitized.split(".");
  const frac = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
  const full = `${intPart}${frac}`;
  const clean = full.replace(/^0+/, "") || "0";
  return BigInt(clean);
}

export function useOneBalance() {
  const router = useRouter();
  const { user, ready, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === "privy") || wallets[0],
    [wallets]
  );

  const [accountAddress, setAccountAddress] = useState<string | null>(null);

  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const tokenMap = useMemo(
    () => new Map(tokens.map((t) => [t.id, t] as const)),
    [tokens]
  );

  const [fromAssetId, setFromAssetId] = useState<string>(DEFAULT_FROM_ASSET);
  const [toAssetId, setToAssetId] = useState<string>(DEFAULT_TO_ASSET);

  const fromToken = tokenMap.get(fromAssetId) || null;
  const toToken = tokenMap.get(toAssetId) || null;

  const [swapAmount, setSwapAmount] = useState("5.00");
  const [estimatedAmount, setEstimatedAmount] = useState<string | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [quote, setQuote] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [status, setStatus] = useState<{
    status: TxStatus;
    [k: string]: any;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQuoteIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function setup() {
      if (!embeddedWallet?.address) return;
      try {
        const predicted = await predictAccountAddress(
          embeddedWallet.address,
          embeddedWallet.address
        );
        if (!mountedRef.current) return;
        setAccountAddress(predicted);
        await bootstrapBalances(predicted);
      } catch (err) {
        if (!accountAddress) setError("Failed to set up OneBalance account");
        console.error("Error setting up account:", err);
      }
    }

    if (ready && authenticated) setup();

    return () => {
      mountedRef.current = false;
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, [embeddedWallet, ready, authenticated]);

  async function bootstrapBalances(address: string) {
    const data = await getAggregatedBalance(address);
    const items: TokenItem[] =
      (data?.balanceByAggregatedAsset || []).map((a: any) => {
        const decimals = inferDecimals(a.aggregatedAssetId);
        const raw = BigInt(a.balance ?? "0");
        return {
          id: a.aggregatedAssetId,
          symbol: toSymbol(a.aggregatedAssetId),
          name: toName(a.aggregatedAssetId),
          decimals,
          balanceRaw: raw,
          balance: formatByDecimals(raw, decimals),
          fiatValue: typeof a.fiatValue === "number" ? a.fiatValue : undefined,
        };
      }) || [];

    setTokens(items);

    const hasFrom = items.some((t) => t.id === fromAssetId);
    const hasTo = items.some((t) => t.id === toAssetId);

    if (!hasFrom || !hasTo) {
      const pickFrom =
        items.find((t) => t.id === DEFAULT_FROM_ASSET) || items[0];
      const pickTo =
        items.find((t) => t.id === DEFAULT_TO_ASSET) ||
        items.find((t) => t.id !== pickFrom?.id) ||
        items[1] ||
        items[0];

      if (pickFrom) setFromAssetId(pickFrom.id);
      if (pickTo) setToAssetId(pickTo.id);
    }

    if (address && embeddedWallet && swapAmount) {
      fetchEstimatedQuote(swapAmount, items, fromAssetId, toAssetId);
    }
  }

  function clearStatusTimers() {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  }

  function startStatusPolling(quoteId: string) {
    clearStatusTimers();
    activeQuoteIdRef.current = quoteId;
    setIsPolling(true);
    setStatus({ status: "PENDING" });

    statusTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      clearStatusTimers();
      setIsPolling(false);
      setStatus((prev) =>
        prev?.status === "COMPLETED" || prev?.status === "FAILED"
          ? prev
          : {
              status: "UNKNOWN",
              reason: "Timeout while waiting for completion",
            }
      );
    }, 120_000);

    statusIntervalRef.current = setInterval(async () => {
      try {
        const s = await checkTransactionStatus(quoteId);
        if (!mountedRef.current) return;
        if (activeQuoteIdRef.current !== quoteId) return;

        const normalized: TxStatus =
          s?.status === "COMPLETED" || s?.status === "FAILED"
            ? s.status
            : s?.status === "PROCESSING"
            ? "PROCESSING"
            : "PENDING";

        setStatus({ ...s, status: normalized });

        if (normalized === "COMPLETED" || normalized === "FAILED") {
          clearStatusTimers();
          setIsPolling(false);
          if (accountAddress && normalized === "COMPLETED") {
            await bootstrapBalances(accountAddress);
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
        clearStatusTimers();
        setIsPolling(false);
        setStatus({ status: "UNKNOWN", error: "Polling error" });
      }
    }, 3000);
  }

  async function fetchEstimatedQuote(
    amountStr: string,
    list = tokens,
    fromId = fromAssetId,
    toId = toAssetId
  ) {
    if (!accountAddress || !embeddedWallet) return;
    const from = list.find((t) => t.id === fromId);
    const to = list.find((t) => t.id === toId);
    if (!from || !to) return;

    const atomic = parseAmountToAtomic(amountStr, from.decimals);
    if (atomic <= BigInt(0)) {
      setEstimatedAmount(null);
      setQuote(null);
      return;
    }

    try {
      setFetchingQuote(true);

      const request: QuoteRequest = {
        from: {
          account: {
            sessionAddress: embeddedWallet.address,
            adminAddress: embeddedWallet.address,
            accountAddress,
          },
          asset: { assetId: from.id },
          amount: atomic.toString(),
        },
        to: { asset: { assetId: to.id } },
      };

      const q = await getQuote(request as any);
      setQuote(q);

      if (q?.destinationToken?.amount) {
        const destAtomic = BigInt(q.destinationToken.amount);
        const est = formatUnits(destAtomic, to.decimals);
        const fixed =
          to.decimals <= 6 ? Number(est).toFixed(2) : Number(est).toFixed(6);
        setEstimatedAmount(fixed);
      } else {
        setEstimatedAmount(null);
      }
    } catch (err) {
      console.error("Error fetching quote:", err);
      setEstimatedAmount(null);
      setQuote(null);
    } finally {
      setFetchingQuote(false);
    }
  }

  function toggleSwapDirection() {
    setQuote(null);
    setEstimatedAmount(null);
    setFromAssetId((prevFrom) => {
      setToAssetId(prevFrom);
      return toAssetId;
    });
    setTimeout(() => {
      if (accountAddress && embeddedWallet) fetchEstimatedQuote(swapAmount);
    }, 200);
  }

  function onSelectFrom(assetId: string) {
    if (assetId === toAssetId) {
      setToAssetId(fromAssetId);
    }
    setFromAssetId(assetId);
    setEstimatedAmount(null);
    if (accountAddress && embeddedWallet) {
      setTimeout(
        () => fetchEstimatedQuote(swapAmount, tokens, assetId, toAssetId),
        50
      );
    }
  }

  function onSelectTo(assetId: string) {
    if (assetId === fromAssetId) {
      setFromAssetId(toAssetId);
    }
    setToAssetId(assetId);
    setEstimatedAmount(null);
    if (accountAddress && embeddedWallet) {
      setTimeout(
        () => fetchEstimatedQuote(swapAmount, tokens, fromAssetId, assetId),
        50
      );
    }
  }

  async function handleSwap() {
    if (!accountAddress || !embeddedWallet || !fromToken || !toToken) {
      setError("Wallet not connected or OneBalance account not set up");
      return;
    }
    if (fromToken.id === toToken.id) {
      setError("Select two different tokens");
      return;
    }

    setLoading(true);
    setSwapping(true);
    setError(null);
    setSuccess(false);
    setStatus({ status: "PENDING" });

    try {
      let q = quote;
      if (!q) {
        const atomic = parseAmountToAtomic(swapAmount, fromToken.decimals);
        if (atomic <= BigInt(0)) throw new Error("Enter a valid amount");

        const request: QuoteRequest = {
          from: {
            account: {
              sessionAddress: embeddedWallet.address,
              adminAddress: embeddedWallet.address,
              accountAddress,
            },
            asset: { assetId: fromToken.id },
            amount: atomic.toString(),
          },
          to: { asset: { assetId: toToken.id } },
        };

        q = await getQuote(request as any);
        setQuote(q);
      }
      if (!q) throw new Error("Failed to get a quote for the swap");

      const signed = await signQuote(q, embeddedWallet);
      await executeQuote(signed);

      startStatusPolling(q.id);
      setSuccess(true);
    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err?.message || "Failed to complete swap");
      setStatus({ status: "FAILED", error: err?.message || "Swap failed" });
      clearStatusTimers();
      setIsPolling(false);
    } finally {
      setLoading(false);
      setSwapping(false);
    }
  }

  const connectedRaw = embeddedWallet?.address || user?.email?.address || "";
  const connectedLabel = truncateAddress(connectedRaw);

  const fromBalance = fromToken?.balance || "0";
  const hasBalance = Number(fromBalance || "0") > 0;
  const rawAmount = (swapAmount ?? "").trim();
  const parsedAmount = rawAmount === "" ? 0 : Number(rawAmount);
  const isNaNAmount = rawAmount !== "" && Number.isNaN(parsedAmount);
  const isZeroOrNeg = parsedAmount <= 0;
  const isOverBalance = parsedAmount > Number(fromBalance || "0");
  const isInvalid = isNaNAmount || isZeroOrNeg || isOverBalance;

  const isBusy =
    status?.status === "PENDING" || status?.status === "PROCESSING";
  const mustDisable =
    isBusy || !accountAddress || loading || !hasBalance || isInvalid;

  return {
    ready,
    authenticated,
    connectedRaw,
    connectedLabel,
    accountAddress,
    embeddedWallet,

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

    loading,
    swapping,
    error,
    success,

    status,
    isPolling,

    handleLogout: async () => {
      await logout();
      router.push("/");
    },
    toggleSwapDirection,
    handleSwap,

    ui: {
      fromBalance,
      isInvalid,
      isBusy,
      mustDisable,
    },
  } as const;
}
