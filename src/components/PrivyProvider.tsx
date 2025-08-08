"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export function PrivyClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID as string;

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "passkey", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#FFAB40", // OneBalance accent color
        },
        embeddedWallets: {
          // Create embedded wallets for users who don't have a wallet
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
