"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Toast({
  show,
  text,
}: {
  show: boolean;
  text: string;
}) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-[calc(var(--safe-top)+10px)] z-[130] w-[min(480px,calc(100vw-12px))] -translate-x-1/2 px-2">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="glass-surface mx-auto w-fit rounded-2xl px-4 py-2 text-xs font-semibold text-white/90 shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

