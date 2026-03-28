"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export function BottomSheet({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="w-[min(480px,100vw)] mobile-nav-safe rounded-t-[28px] border border-white/14 bg-white/10 p-4 shadow-[0_-18px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
            {(title || subtitle) && (
              <div className="mb-3">
                {title && <div className="text-base font-semibold text-white">{title}</div>}
                {subtitle && <div className="mt-1 text-xs text-white/70">{subtitle}</div>}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

