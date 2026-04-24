"use client";

import { useEffect, useMemo, useRef } from "react";

type Option<T extends string | number> = { value: T; label: string };

export function WheelPicker<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  compact = true,
  density = "default",
}: {
  value: T;
  options: Array<Option<T>>;
  onChange: (v: T) => void;
  ariaLabel: string;
  /** Shorter column — matches onboarding card density; set false for a taller wheel. */
  compact?: boolean;
  /** Extra-short column (e.g. birth time). Only applies when `compact` is true. */
  density?: "default" | "tight";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const index = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const row = el.querySelector<HTMLButtonElement>(`button[data-idx="${index}"]`);
    if (row) row.scrollIntoView({ block: "center" });
  }, [index]);

  const tight = compact && density === "tight";
  const h = !compact ? "h-44" : tight ? "h-24" : "h-[7.25rem]"; /* 176 / 96 / 116 px */
  const py = !compact ? "py-10" : tight ? "py-8" : "py-10";
  const fade = !compact ? "h-10" : tight ? "h-5" : "h-7";
  const rowClass = !compact
    ? "h-10 rounded-2xl text-sm"
    : tight
      ? "h-8 rounded-lg text-xs"
      : "h-9 rounded-xl text-sm";
  const midClass = !compact
    ? "h-10 rounded-2xl"
    : tight
      ? "h-8 rounded-lg"
      : "h-9 rounded-xl";
  const outerRound = !compact ? "rounded-3xl" : tight ? "rounded-xl" : "rounded-2xl";

  return (
    <div
      className={`relative w-full overflow-hidden border border-white/12 bg-white/6 backdrop-blur-xl ${outerRound} ${h}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border border-white/14 bg-white/8 ${midClass}`}
      />
      <div
        ref={ref}
        className={`h-full snap-y snap-mandatory overflow-y-auto px-1.5 ${py} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        role="listbox"
        aria-label={ariaLabel}
      >
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <button
              key={`${opt.value}`}
              type="button"
              data-idx={i}
              onClick={() => onChange(opt.value)}
              className={`flex w-full snap-center items-center justify-center transition ${rowClass} ${
                active ? "font-semibold text-white" : "text-white/65 hover:text-white/85"
              }`}
              role="option"
              aria-selected={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent ${fade}`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/20 to-transparent ${fade}`}
      />
    </div>
  );
}

