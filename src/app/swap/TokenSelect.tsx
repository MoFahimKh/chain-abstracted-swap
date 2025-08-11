"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TokenItem } from "@/hooks/useOneBalance";

type Props = {
  label: string;
  tokens: TokenItem[];
  selectedId: string | null;
  onSelect: (assetId: string) => void;
  disabled?: boolean;
};

export default function TokenSelect({
  label,
  tokens,
  selectedId,
  onSelect,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => tokens.find((t) => t.id === selectedId) || null,
    [tokens, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => {
      const hay = `${t.symbol} ${t.name} ${t.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tokens, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-white/60">{label}</span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition ${
          disabled
            ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
            : "border-white/10 bg-white/5 hover:bg-white/10 text-white"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Avatar letter={(selected?.name || selected?.symbol || "?")[0]} />
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">
            {selected ? selected.symbol : "Select token"}
          </div>
          <div className="text-xs text-white/60">
            {selected
              ? `${selected.balance} • $${(selected.fiatValue ?? 0).toFixed(2)}`
              : "—"}
          </div>
        </div>
        <span className="opacity-60">▾</span>
      </button>

      {open && (
        <div
          style={{ position: "absolute" }}
          role="listbox"
          className="mt-2 max-h-80 overflow-auto rounded-2xl border border-white/10 bg-[#0b0b0f] p-2 shadow-2xl"
        >
          <div className="p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search token"
              className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none"
            />
          </div>

          <ul className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-white/50">
                No tokens found
              </li>
            )}
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl text-left"
                  onClick={() => handleSelect(t.id)}
                >
                  <Avatar letter={(t.name || t.symbol)[0]} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">
                      {t.symbol}
                    </div>
                    <div className="text-xs text-white/60">{t.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">{t.balance}</div>
                    <div className="text-xs text-white/60">
                      ${(t.fiatValue ?? 0).toFixed(2)}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Avatar({ letter }: { letter: string }) {
  const ch = (letter || "?").toUpperCase();
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white">
      {ch}
    </span>
  );
}
