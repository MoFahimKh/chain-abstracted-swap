"use client";

import { GlassCard } from "../../components/ui/GlassCard";
import { NavBar } from "../../components/NavBar";
import { AccountInfoCard } from "./AccountInfoCard";
import { SwapCard } from "./SwapCard";
import { TransactionStatusCard } from "./TransactionStatusCard";
import { useOneBalance } from "@/hooks/useOneBalance";

export default function SwapPage() {
  const ob = useOneBalance();

  if (!ob.ready || !ob.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F17]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFAB40]" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen text-gray-100 bg-[#0B0F17]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#FFAB40]/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <NavBar title="Chain Abstracted Swap" />

      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <GlassCard className="mb-6">
          <AccountInfoCard />
        </GlassCard>

        <div className="grid grid-cols-1 gap-6">
          <GlassCard>
            <SwapCard />
          </GlassCard>

          {ob.error &&
            !(
              ob.error == "Failed to set up OneBalance account" &&
              ob.accountAddress
            ) && (
              <GlassCard>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{ob.error}</p>
                </div>
              </GlassCard>
            )}

          {ob.success && (
            <GlassCard>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <p className="font-medium">Success!</p>
                <p className="text-sm">
                  Your chain-abstracted swap has been initiated.
                  {ob.isPolling && " Monitoring transaction status..."}
                </p>
              </div>
            </GlassCard>
          )}

          {ob.status && (
            <GlassCard>
              <TransactionStatusCard />
            </GlassCard>
          )}
        </div>
      </div>
    </main>
  );
}
