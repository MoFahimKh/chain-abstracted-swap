# Nuvolari.ai's – Chain Abstracted Swap using privy authx`

A Next.js + TypeScript dApp demonstrating **chain-abstracted, gasless swaps** with the **OneBalance API** and **Privy** authentication/embedded wallets. Includes a dark **glassmorphism** UI.

## ✨ Features

- 🔐 Privy auth (email, social, embedded wallet)
- 🪄 USDC ⇄ ETH chain-abstracted swaps
- ⚡ Gasless: pay fees in USDC/ETH, no native token needed
- 🧾 Live quote estimation
- 📡 Transaction status polling
- 🎨 Apple-style glass UI, mobile-ready

## 🗂 Structure

```
src/
  app/
    page.tsx                  # Landing/Login (glass UI)
    dashboard/
      page.tsx                # Main dashboard
      NavBar.tsx
      SwapCard.tsx            # Uniswap-style form (calls useOneBalance)
      AccountInfoCard.tsx
      TransactionStatusCard.tsx
  components/ui/
    GlassCard.tsx
  hooks/
    useOneBalance.ts          # All wallet/account/swap logic
  lib/
    onebalance.ts             # OneBalance API calls
    privySigningUtils.ts      # Quote signing via Privy wallet
    types/
      quote.ts
  utils/
    copyToClipboard.ts
    truncateAddress.ts
```

## 🚀 Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Privy App ID
- OneBalance API key

### Install

```bash
pnpm install
# or
yarn
```

### Env

Create `.env`:

```bash

NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_ONEBALANCE_API_KEY=

```

### Run

```bash
pnpm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🧠 How It Works

### 1) Auth (Privy)

`usePrivy()` handles login/logout and exposes the embedded wallet address.

### 2) Smart Account Prediction

`predictAccountAddress(sessionAddress, adminAddress)` derives the OneBalance smart account (SCA) for the user.

### 3) Aggregated Balances

`getAggregatedBalance(accountAddress)` fetches USDC/ETH balances across supported chains.

### 4) Quote

`getQuote({ from, to })` returns an estimated destination amount for swaps.

### 5) Signing + Execute

`signQuote(quote, embeddedWallet)` signs the quote.
`executeQuote(signedQuote)` submits it to OneBalance.

### 6) Status Polling

`checkTransactionStatus(quoteId)` is polled until `COMPLETED` or `FAILED`.

All of the above is wrapped in `useOneBalance()` and consumed by UI components.

## 🔑 Key UX Details

- **SwapCard** computes an estimated rate (1 from ≈ X to) and disables the **Swap** button when:

  - Amount ≤ 0 or below minimum (ETH: `1 wei` → `1e-18`, USDC: `1e-6`)
  - No SCA balance for the selected “from” token

- Notes guide users to **fund their SCA** (funding an EOA won’t be used for swaps).

## 🧪 Useful Scripts

```bash
pnpm run dev        # local dev
pnpm run build      # production build
pnpm run start      # run prod build
pnpm run lint       # lint
```

## 📚 References

- OneBalance Docs: [https://docs.onebalance.io/](https://docs.onebalance.io/)
- Privy Docs: [https://docs.privy.io/](https://docs.privy.io/)
- Next.js: [https://nextjs.org/docs](https://nextjs.org/docs)
- viem: [https://viem.sh/](https://viem.sh/)

