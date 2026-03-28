"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/components/UserContext";
import { loadHandbook, weeklySummary } from "@/lib/handbook";

function fmt(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export default function HandbookPage() {
  const { user } = useUser();

  const records = useMemo(() => {
    if (!user?.userId) return [];
    return loadHandbook(user.userId);
  }, [user?.userId]);

  const weekly = useMemo(() => {
    if (!user?.userId) return null;
    return weeklySummary(user.userId);
  }, [user?.userId]);

  return (
    <AppShell
      title="Handbook"
      subtitle="Every conversion becomes evidence you can revisit."
    >
      <div className="flex w-full min-w-0 max-w-full flex-col gap-4">
        <Card title="Weekly recap" subtitle="Each shift compounds your luck.">
          {weekly ? (
            <div className="break-words text-sm leading-relaxed text-white/90">
              This week you reframed{" "}
              <span className="font-semibold text-white">{weekly.count}</span> moments and stacked{" "}
              <span className="font-semibold text-white">{weekly.compoundPercent}%</span> compound
              “luck.”
            </div>
          ) : (
            <div className="text-sm text-white/80">Sign in to see your weekly recap.</div>
          )}
        </Card>

        <Card
          title="History"
          subtitle={records.length ? `${records.length} saved` : "Nothing saved yet—try Insight once."}
        >
          <div className="grid min-w-0 gap-3">
            {records.map((r) => (
              <details
                key={r.id}
                className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/12 bg-white/6 px-4 py-3"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">
                      {r.dump}
                    </div>
                    <div className="shrink-0 text-right text-xs text-white/60">{fmt(r.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-center text-xs text-white/60">Tap to expand</div>
                </summary>
                <div className="mt-3 grid min-w-0 gap-3 text-sm text-white/90">
                  <section>
                    <div className="text-xs font-semibold text-[rgba(255,215,120,0.95)]">
                      Cognitive upgrade
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{r.cognitive_upgrade}</div>
                  </section>
                  <section>
                    <div className="text-xs font-semibold text-[rgba(255,215,120,0.95)]">
                      Risk reframe
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{r.risk_avoidance}</div>
                  </section>
                  <section>
                    <div className="text-xs font-semibold text-[rgba(255,215,120,0.95)]">
                      Future seed
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{r.future_seed}</div>
                  </section>
                  <section>
                    <div className="text-xs font-semibold text-white/70">One small step</div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-white/85">
                      {r.one_small_step}
                    </div>
                  </section>
                </div>
              </details>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
