"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { login, ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/swap");
    }
  }, [ready, authenticated, router]);

  return (
    <main className="relative min-h-screen overflow-hidden text-gray-100 bg-[#0B0F17]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#FFAB40]/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <header className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white/90">
              Novulari.ai's — Chain Abstracted Swap
            </h1>
            <p className="mt-3 text-sm text-white/60">
              Powered by OneBalance + Privy.
            </p>
          </header>

          <button
            onClick={login}
            className="w-full py-3.5 px-4 rounded-xl font-semibold transition-all
                       bg-gradient-to-r from-[#FFAB40] to-amber-400 text-black
                       hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(255,171,64,0.8)]
                       focus:outline-none focus:ring-2 focus:ring-[#FFAB40]/40"
          >
            Login with Privy
          </button>

          <p className="mt-4 text-[11px] text-white/60 text-center">
            Sign in with email, social, or connect a wallet to get started.
          </p>
        </section>
      </div>
    </main>
  );
}
