"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function GoldParticles({
  text,
  active,
}: {
  text: string;
  active: boolean;
}) {
  const parts = useMemo(() => {
    const seed = text.length + text.charCodeAt(0 || 0);
    const rnd = mulberry32(seed || 1);
    const max = Math.min(60, Math.max(18, Math.floor(text.length / 2)));
    return Array.from({ length: max }, (_, i) => {
      const x = (rnd() - 0.5) * 220;
      const y = rnd() * 40;
      const drift = (rnd() - 0.5) * 160;
      const delay = rnd() * 0.25;
      const scale = 0.7 + rnd() * 0.8;
      const blur = rnd() < 0.25 ? 2 : 0;
      return { id: i, x, y, drift, delay, scale, blur };
    });
  }, [text]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="particles"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0"
        >
          {parts.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, x: p.x, y: 80 + p.y, scale: p.scale }}
              animate={{
                opacity: [0, 1, 0],
                x: p.x + p.drift,
                y: -120 - p.y,
              }}
              transition={{
                duration: 1.1,
                delay: p.delay,
                ease: "easeOut",
              }}
              className="absolute left-1/2 top-1/2 block size-1.5 rounded-full bg-[rgba(255,215,120,0.95)] shadow-[0_0_14px_rgba(255,215,120,0.55)]"
              style={{ filter: p.blur ? `blur(${p.blur}px)` : undefined }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

