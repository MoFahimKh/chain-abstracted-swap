# OneBalance Chain-Abstracted Swap App

A Next.js application demonstrating chain-abstracted token swaps using [OneBalance](https://onebalance.io) and [Privy](https://www.privy.io/) authentication.

## Features

* **Privy Authentication** for seamless onboarding with email, social login, or wallet.
* **Chain-Abstracted Swaps** allowing token swaps across any chain without bridging.
* **Gasless Transactions** with OneBalance smart accounts.
* **Glassmorphism Dark UI** design for a modern, sleek interface.
* **Real-time Transaction Monitoring** with automatic status polling.
* **Account Info & Balances** fetched via OneBalance APIs.

## Tech Stack

* **Framework:** Next.js 13 (App Router)
* **UI:** Tailwind CSS with custom GlassCard components
* **Auth:** Privy React Auth
* **Blockchain SDKs:** OneBalance API, viem
* **State Management:** React hooks

## Getting Started

### Prerequisites

* Node.js 18+
* npm or yarn
* Privy App ID and configuration
* OneBalance API credentials

### Installation

```bash
git clone https://github.com/MoFahimKh/chain-abstracted-swap
cd chain-abstracted-swap
pnpm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
ONEBALANCE_API_KEY=your_onebalance_api_key
```

### Running the App

```bash
pnpm run dev
```

The app will run at `http://localhost:3000`.

## Folder Structure

```
src/
  app/
    dashboard/
      page.tsx          # Dashboard UI
      SwapCard.tsx      # Swap interface
      NavBar.tsx        # Top navigation
      AccountInfoCard.tsx
      TransactionStatusCard.tsx
    page.tsx            # Landing/login page
  components/
    ui/GlassCard.tsx    # Reusable glassmorphism card
  hooks/
    useOneBalance.ts    # OneBalance logic hook
  lib/                  # API utilities
  utils/                # Helper functions
```

## How It Works

1. **User logs in** via Privy (email, social, or wallet).
2. **OneBalance account address** is predicted for the connected wallet.
3. **Balances** for USDC and ETH are fetched via OneBalance API.
4. **Swap flow:**

   * User enters amount & direction.
   * App fetches an estimated quote.
   * On confirmation, the quote is signed and executed.
   * Transaction status is polled until complete.
5. **UI updates** to reflect the new balances and status.

