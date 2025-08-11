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
import { Quote } from "@/lib/types/quote";
import { truncateAddress } from "@/utils/truncateAddress";

export type SwapDirection = "USDC_TO_ETH" | "ETH_TO_USDC";

type TxStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "UNKNOWN";

export function useOneBalance() {
  const router = useRouter();
  const { user, ready, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();

  // Prefer the Privy embedded wallet; fallback to first
  const embeddedWallet = useMemo(() => {
    return wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  }, [wallets]);

  // Core state
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);

  const [swapDirection, setSwapDirection] =
    useState<SwapDirection>("USDC_TO_ETH");
  const [swapAmount, setSwapAmount] = useState("5.00");
  const [estimatedAmount, setEstimatedAmount] = useState<string | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);

  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [status, setStatus] = useState<{
    status: TxStatus;
    [k: string]: any;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for intervals/timeouts & “mounted” guard
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQuoteIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  // Setup account + initial balances
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
        await fetchBalances(predicted);
      } catch (err) {
        console.error("Error setting up account:", err);
        !accountAddress && setError("Failed to set up OneBalance account");
      }
    }

    if (ready && authenticated) setup();

    // Cleanup: clear timers on unmount
    return () => {
      mountedRef.current = false;
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, [embeddedWallet, ready, authenticated]);

  // Handlers
  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const toggleSwapDirection = () => {
    setQuote(null);
    setEstimatedAmount(null);

    // compute next direction & sensible default
    const nextDirection =
      swapDirection === "USDC_TO_ETH" ? "ETH_TO_USDC" : "USDC_TO_ETH";
    const nextDefault = nextDirection === "USDC_TO_ETH" ? "5.00" : "0.001";

    setSwapDirection(nextDirection);
    setSwapAmount(nextDefault);

    // refetch estimate with the new direction
    setTimeout(() => {
      if (accountAddress && embeddedWallet) fetchEstimatedQuote(nextDefault);
    }, 200);
  };

  // Data
  const fetchBalances = async (address: string) => {
    try {
      const data = await getAggregatedBalance(address);
      const usdc = data.balanceByAggregatedAsset?.find(
        (a: any) => a.aggregatedAssetId === "ds:usdc"
      );
      const eth = data.balanceByAggregatedAsset?.find(
        (a: any) => a.aggregatedAssetId === "ds:eth"
      );
      setUsdcBalance(
        usdc
          ? parseFloat(formatUnits(BigInt(usdc.balance), 6)).toFixed(2)
          : "0.00"
      );
      setEthBalance(
        eth
          ? parseFloat(formatUnits(BigInt(eth.balance), 18)).toFixed(6)
          : "0.000000"
      );

      if (address && embeddedWallet) fetchEstimatedQuote(swapAmount);
    } catch (err) {
      console.error("Error fetching balances:", err);
      setUsdcBalance("0.00");
      setEthBalance("0.000000");
    }
  };

  const fetchEstimatedQuote = async (amountStr: string) => {
    if (!accountAddress || !embeddedWallet) return;
    try {
      setFetchingQuote(true);
      const amount =
        swapDirection === "USDC_TO_ETH"
          ? (parseFloat(amountStr) * 1_000_000).toString()
          : (parseFloat(amountStr) * 1e18).toString();

      const request = {
        from: {
          account: {
            sessionAddress: embeddedWallet.address,
            adminAddress: embeddedWallet.address,
            accountAddress,
          },
          asset: {
            assetId: swapDirection === "USDC_TO_ETH" ? "ds:usdc" : "ds:eth",
          },
          amount,
        },
        to: {
          asset: {
            assetId: swapDirection === "USDC_TO_ETH" ? "ds:eth" : "ds:usdc",
          },
        },
      } as const;

      const q = await getQuote(request);
      setQuote(q);

      if (q.destinationToken?.amount) {
        if (swapDirection === "USDC_TO_ETH") {
          setEstimatedAmount(
            parseFloat(
              formatUnits(BigInt(q.destinationToken.amount), 18)
            ).toFixed(6)
          );
        } else {
          setEstimatedAmount(
            parseFloat(
              formatUnits(BigInt(q.destinationToken.amount), 6)
            ).toFixed(2)
          );
        }
      }
    } catch (err) {
      console.error("Error fetching quote for estimation:", err);
      setEstimatedAmount(null);
    } finally {
      setFetchingQuote(false);
    }
  };

  // Polling (robust)
  const clearStatusTimers = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  };

  const startStatusPolling = (quoteId: string) => {
    clearStatusTimers();
    activeQuoteIdRef.current = quoteId;
    setIsPolling(true);

    // Start with “pending” immediately
    setStatus({ status: "PENDING" });

    // Fail-safe: stop after 2 minutes if no terminal state
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

    // Poll every 3s
    statusIntervalRef.current = setInterval(async () => {
      try {
        const s = await checkTransactionStatus(quoteId);
        if (!mountedRef.current) return;
        // Ignore late responses for an older quote
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
            fetchBalances(accountAddress);
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
        clearStatusTimers();
        setIsPolling(false);
        setStatus({ status: "UNKNOWN", error: "Polling error" });
      }
    }, 3000);
  };

  // Swap
  const handleSwap = async () => {
    if (!accountAddress || !embeddedWallet) {
      setError("Wallet not connected or OneBalance account not set up");
      return;
    }
    setLoading(true);
    setSwapping(true);
    setError(null);
    setSuccess(false);
    setStatus({ status: "PENDING" }); // reset UI for a fresh swap

    try {
      let q = quote;
      if (!q) {
        const amount =
          swapDirection === "USDC_TO_ETH"
            ? (parseFloat(swapAmount) * 1_000_000).toString()
            : (parseFloat(swapAmount) * 1e18).toString();
        const request = {
          from: {
            account: {
              sessionAddress: embeddedWallet.address,
              adminAddress: embeddedWallet.address,
              accountAddress,
            },
            asset: {
              assetId: swapDirection === "USDC_TO_ETH" ? "ds:usdc" : "ds:eth",
            },
            amount,
          },
          to: {
            asset: {
              assetId: swapDirection === "USDC_TO_ETH" ? "ds:eth" : "ds:usdc",
            },
          },
        } as const;
        q = await getQuote(request);
        setQuote(q);
      }
      if (!q) throw new Error("Failed to get a quote for the swap");

      const signed = await signQuote(q, embeddedWallet);
      await executeQuote(signed);

      // begin polling this specific quote id
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
  };

  const connectedRaw = embeddedWallet?.address || user?.email?.address || "";
  const connectedLabel = truncateAddress(connectedRaw);

  return {
    // session
    ready,
    authenticated,

    // identity
    connectedRaw,
    connectedLabel,
    accountAddress,
    embeddedWallet,

    // balances
    usdcBalance,
    ethBalance,

    // swap state
    swapDirection,
    swapAmount,
    estimatedAmount,
    fetchingQuote,
    setSwapAmount,
    setEstimatedAmount,
    fetchEstimatedQuote,

    // exec state
    loading,
    swapping,
    error,
    success,

    // status
    status,
    isPolling,

    // handlers
    handleLogout,
    toggleSwapDirection,
    handleSwap,
  } as const;
}
