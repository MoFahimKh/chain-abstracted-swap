"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
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

  const [status, setStatus] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Setup account + initial balances
  useEffect(() => {
    async function setup() {
      if (!embeddedWallet?.address) return;
      try {
        const predicted = await predictAccountAddress(
          embeddedWallet.address,
          embeddedWallet.address
        );
        setAccountAddress(predicted);
        await fetchBalances(predicted);
      } catch (err) {
        console.error("Error setting up account:", err);
        setError("Failed to set up OneBalance account");
      }
    }
    if (ready && authenticated) setup();

    return () => {
      if (statusPollingRef.current) clearInterval(statusPollingRef.current);
    };
  }, [embeddedWallet, ready, authenticated]);

  // Handlers
  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleSwapAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isNaN(Number(value)) || Number(value) <= 0) return;
    setSwapAmount(value);
    setEstimatedAmount(null);
    if (Number(value) > 0 && accountAddress && embeddedWallet)
      fetchEstimatedQuote(value);
  };

  const toggleSwapDirection = () => {
    setQuote(null);
    setEstimatedAmount(null);
    setSwapDirection((prev) =>
      prev === "USDC_TO_ETH" ? "ETH_TO_USDC" : "USDC_TO_ETH"
    );
    const nextDefault = swapDirection === "USDC_TO_ETH" ? "0.001" : "5.00";
    setSwapAmount(nextDefault);
    setTimeout(() => {
      if (accountAddress && embeddedWallet) fetchEstimatedQuote(nextDefault);
    }, 250);
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

  // Polling
  const startStatusPolling = (quoteId: string) => {
    if (statusPollingRef.current) clearInterval(statusPollingRef.current);
    setIsPolling(true);
    statusPollingRef.current = setInterval(async () => {
      try {
        const s = await checkTransactionStatus(quoteId);
        setStatus(s);
        if (s.status === "COMPLETED" || s.status === "FAILED") {
          if (statusPollingRef.current) {
            clearInterval(statusPollingRef.current);
            setIsPolling(false);
          }
          if (accountAddress && s.status === "COMPLETED")
            fetchBalances(accountAddress);
        }
      } catch (err) {
        console.error("Error polling status:", err);
        if (statusPollingRef.current) {
          clearInterval(statusPollingRef.current);
          setIsPolling(false);
        }
      }
    }, 1000);
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
      startStatusPolling(q.id);
      setSuccess(true);
    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err?.message || "Failed to complete swap");
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

    // balances
    usdcBalance,
    ethBalance,

    // swap state
    swapDirection,
    swapAmount,
    estimatedAmount,
    fetchingQuote,

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
    handleSwapAmountChange,
    toggleSwapDirection,
    handleSwap,
  } as const;
}
