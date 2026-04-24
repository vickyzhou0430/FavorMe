"use client";

import { motion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";

/** motion.button reserves drag/animation handlers — omit DOM variants that clash with Framer Motion types */
type Props = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
> & {
  variant?: "primary" | "ghost";
};

export function Button({ className = "", variant = "primary", ...props }: Props) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "btn-primary hover:brightness-110 focus-visible:ring-white/20"
      : "btn-ghost hover:bg-white/12 focus-visible:ring-white/20";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`${base} ${styles} ${className}`}
      {...props}
    />
  );
}

