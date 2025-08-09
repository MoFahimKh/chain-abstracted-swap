// src/app/dashboard/NavBar.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useOneBalance } from "@/hooks/useOneBalance";

type Props = {
  title?: string;
};

export const NavBar: React.FC<Props> = ({
  title = "Chain Abstracted Swap",
}) => {
  const { connectedLabel, connectedRaw, accountAddress, handleLogout } =
    useOneBalance();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const addr = accountAddress || connectedRaw || "";
  const label = connectedLabel || "Connected";

  const copy = async () => {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
    } catch {}
  };

  const viewOnExplorer = () => {
    if (!addr) return;
    window.open(
      `https://blockscan.com/address/${addr}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <nav className="sticky top-0 z-20 w-full backdrop-blur-xl bg-[#0B0F17]/60 border-b border-white/10">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <h1 className="text-base md:text-lg tracking-wide text-white/90">
          {title}
        </h1>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#FFAB40]/40"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span
              className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.45)]"
              aria-hidden
            />
            <span className="truncate max-w-[160px]" title={label}>
              {label}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
            </svg>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0B0F17]/80 backdrop-blur-xl shadow-lg overflow-hidden"
            >
              <button
                onClick={() => {
                  setOpen(false);
                  copy();
                }}
                className="block w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10"
              >
                Copy address
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  viewOnExplorer();
                }}
                className="block w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10"
              >
                View on explorer
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
