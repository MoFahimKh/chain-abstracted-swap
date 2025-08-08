"use client";

import React from "react";

type Props = {
  status: any;
};

export const TransactionStatusCard: React.FC<Props> = ({ status }) => {
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
              status.status === "COMPLETED"
                ? "text-emerald-300"
                : status.status === "FAILED"
                ? "text-rose-300"
                : "text-amber-300"
            }`}
          >
            {status.status || "Pending"}
          </span>
        </div>

        {status.originChainOperations?.length > 0 && (
          <ExplorerRow
            label="Origin Chain:"
            url={status.originChainOperations[0].explorerUrl}
          />
        )}
        {status.destinationChainOperations?.length > 0 && (
          <ExplorerRow
            label="Destination Chain:"
            url={status.destinationChainOperations[0].explorerUrl}
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
