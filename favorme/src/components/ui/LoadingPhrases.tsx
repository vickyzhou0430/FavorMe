"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Routing a little extra luck your way…",
  "Rewriting the story underneath this moment…",
  "Looking for the gold hidden in this thread…",
];

export function LoadingPhrases({ active }: { active: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    setIdx(0);
    const t = setInterval(() => setIdx((p) => (p + 1) % PHRASES.length), 1400);
    return () => clearInterval(t);
  }, [active]);

  return (
    <div className="flex min-h-[2.875rem] min-w-0 flex-1 items-center">
      <p className="line-clamp-2 w-full text-sm leading-relaxed text-white/75">{PHRASES[idx]}</p>
    </div>
  );
}
