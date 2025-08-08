"use client";
import { useOneBalance } from "@/hooks/useOneBalance";

export function AccountSetup() {
  const { accountAddress } = useOneBalance();
  return (
    <div>
      {accountAddress ? (
        <p>Your OneBalance Smart Account: {accountAddress}</p>
      ) : (
        <p>Loading account address...</p>
      )}
    </div>
  );
}
