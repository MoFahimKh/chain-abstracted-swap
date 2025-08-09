"use client";

import { useOneBalance } from "@/hooks/useOneBalance";
import { copyToClipboard } from "@/utils/copyToClipboard";
import React from "react";

export const AccountInfoCard: React.FC = () => {
  const ob = useOneBalance();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">
          Account Information
        </h2>

        <button
          onClick={() => copyToClipboard(ob.accountAddress ?? "")}
          className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
        >
          Copy
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-white/60">OneBalance Smart Account</div>
        <div className="font-mono text-sm text-white/90 break-all">
          {ob.accountAddress || (
            <span className="inline-block h-4 w-24 rounded bg-white/10 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
