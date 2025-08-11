"use client";

import { useOneBalance } from "@/hooks/useOneBalance";
import React from "react";

export const TransactionStatusCard: React.FC = () => {
  const ob = useOneBalance();
  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-white/80 mb-3">
        Transaction Status
      </h3>
      <div className="text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-white/60">Status:</span>
          <span
            className={`font-medium ${
              ob.status?.status === "COMPLETED"
                ? "text-emerald-300"
                : ob.status?.status === "FAILED"
                ? "text-rose-300"
                : "text-amber-300"
            }`}
          >
            {ob.status?.status || "Pending"}
          </span>
        </div>

        {ob.status?.originChainOperations?.length > 0 && (
          <ExplorerRow
            label="Origin Chain:"
            url={ob.status?.originChainOperations?.[0]?.explorerUrl}
          />
        )}
        {ob.status?.destinationChainOperations?.length > 0 && (
          <ExplorerRow
            label="Destination Chain:"
            url={ob.status?.destinationChainOperations[0].explorerUrl}
          />
        )}
      </div>
    </div>
  );
};

const ExplorerRow: React.FC<{ label: string; url: string }> = ({
  label,
  url,
}) => (
  <div className="flex justify-between">
    <span className="text-white/60">{label}</span>
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-300 hover:underline truncate ml-2 max-w-[240px]"
    >
      View Transaction
    </a>
  </div>
);
