"use client";

import { motion } from "framer-motion";
import { Moon, Cloud } from "lucide-react";

export function MoonCloudHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <div className="flex w-12 shrink-0 justify-start sm:w-14">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          className="flex size-11 items-center justify-center sm:size-12"
          aria-hidden
        >
          <Moon className="size-7 text-[rgba(255,233,166,0.95)] sm:size-8" />
        </motion.div>
      </div>

      <div className="min-w-0 flex-1 px-1 text-center">
        <div className="text-lg font-semibold leading-tight text-white">{title}</div>
        {subtitle && (
          <div className="mt-1 text-xs leading-snug text-white/75">{subtitle}</div>
        )}
      </div>

      <div className="flex w-12 shrink-0 justify-end gap-0.5 sm:w-14">
        <motion.div
          animate={{ x: [0, 4, 0], y: [0, -2, 0] }}
          transition={{ duration: 5.1, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-0.5"
          aria-hidden
        >
          <Cloud className="size-5 text-white/90 sm:size-[1.35rem]" />
          <Cloud className="size-4 text-white/75 sm:size-[1.15rem]" />
        </motion.div>
      </div>
    </div>
  );
}
