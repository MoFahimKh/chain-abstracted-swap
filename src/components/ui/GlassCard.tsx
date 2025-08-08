"use client";

import React from "react";

export const GlassCard: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ children, className }) => {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${
        className ?? ""
      }`}
    >
      {children}
    </section>
  );
};
