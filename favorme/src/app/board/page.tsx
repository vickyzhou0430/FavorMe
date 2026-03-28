"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { chatStream } from "@/lib/ai-service";
import { useUser } from "@/components/UserContext";
import { DEEP_INSIGHT_PROMPT } from "@/lib/ai-config";
import { GoldParticles } from "@/components/ui/GoldParticles";
import { LoadingPhrases } from "@/components/ui/LoadingPhrases";
import { addRecord, weeklySummary, type DeepInsightRecord } from "@/lib/handbook";
import { BookmarkPlus, Sparkles } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

type Insight = {
  cognitive_upgrade: string;
  risk_avoidance: string;
  future_seed: string;
  one_small_step: string;
};

function parseInsight(raw: string): Insight | null {
  const t = raw.trim();
  try {
    const j = JSON.parse(t) as Insight;
    if (j?.cognitive_upgrade && j?.risk_avoidance && j?.future_seed) return j;
  } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Insight;
    if (j?.cognitive_upgrade && j?.risk_avoidance && j?.future_seed) return j;
  } catch {}
  return null;
}

function typewrite(setter: (s: string) => void, text: string, speed = 12) {
  let i = 0;
  setter("");
  const id = window.setInterval(() => {
    i += 1;
    setter(text.slice(0, i));
    if (i >= text.length) window.clearInterval(id);
  }, speed);
  return () => window.clearInterval(id);
}

export default function BoardPage() {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [phase, setPhase] = useState<"idle" | "dump" | "transform" | "reveal">("idle");
  const [saved, setSaved] = useState(false);
  const [seg1, setSeg1] = useState("");
  const [seg2, setSeg2] = useState("");
  const [seg3, setSeg3] = useState("");
  const [seg4, setSeg4] = useState("");
  const [toast, setToast] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<Array<() => void>>([]);

  const weekly = useMemo(() => {
    if (!user?.userId) return null;
    return weeklySummary(user.userId);
  }, [saved, user?.userId]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((c) => c());
      timersRef.current = [];
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function run() {
    setLoading(true);
    setRaw("");
    setInsight(null);
    setSaved(false);
    setSeg1("");
    setSeg2("");
    setSeg3("");
    setSeg4("");
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    timersRef.current.forEach((c) => c());
    timersRef.current = [];

    const profileLine = user
      ? `User: name=${user.name}; birthday=${user.birthday}; gender=${user.gender}; focus=${user.focusArea || "career"}; mbti=${user.mbti || "—"}`
      : `User: not signed in (give a general, actionable uplift)`;

    const userText = `The dump: ${input}\n\nTurn it into something I can hold onto.`;
    const extraSystemPrompt = `${profileLine}\n\n${DEEP_INSIGHT_PROMPT}`;

    try {
      setPhase("transform");
      await chatStream({
        userText,
        extraSystemPrompt,
        onToken: (t) => setRaw((p) => p + t),
        signal: ac.signal,
      });
    } finally {
      setLoading(false);
      setPhase("reveal");
    }
  }

  useEffect(() => {
    if (phase !== "reveal" || loading) return;
    const parsed = parseInsight(raw);
    setInsight(parsed);
    if (!parsed) return;

    const cleanups: Array<() => void> = [];
    cleanups.push(typewrite(setSeg1, parsed.cognitive_upgrade, 10));
    const t2 = window.setTimeout(() => cleanups.push(typewrite(setSeg2, parsed.risk_avoidance, 10)), 700);
    const t3 = window.setTimeout(() => cleanups.push(typewrite(setSeg3, parsed.future_seed, 10)), 1400);
    const t4 = window.setTimeout(
      () =>
        cleanups.push(
          typewrite(
            setSeg4,
            parsed.one_small_step || "Start with one tiny move—luck catches up faster.",
            10,
          ),
        ),
      2100,
    );
    timersRef.current.push(
      ...cleanups,
      () => window.clearTimeout(t2),
      () => window.clearTimeout(t3),
      () => window.clearTimeout(t4),
    );
  }, [loading, phase, raw]);

  return (
    <AppShell
      title="Deep Insight"
      subtitle="Leave the mood to the night—keep the answer gentle."
    >
      <Toast show={Boolean(toast)} text={toast} />
      <div className="grid min-w-0 gap-4">
        <Card
          title="Insight boost"
          subtitle={
            user
              ? "Pour out what’s heavy—we’ll hand back a calmer frame."
              : "Finish onboarding for guidance that fits your field."
          }
          right={
            loading ? (
              <div className="inline-flex shrink-0 items-center gap-2 text-sm text-white/70">
                <Spinner /> Transforming
              </div>
            ) : null
          }
        >
          <div className="relative grid gap-3">
            <motion.textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              className="dump-input min-h-28 resize-none"
              placeholder="Pour it out here—let it drift away"
              disabled={loading}
            />

            <GoldParticles text={input} active={phase === "transform" && loading} />

            <div className="flex w-full items-stretch gap-2">
              <Button
                disabled={input.length === 0 || loading}
                onClick={run}
                className="min-w-0 flex-1"
              >
                Send & transform
              </Button>
              <Button
                variant="ghost"
                disabled={loading}
                onClick={() => {
                  setInput("");
                  setRaw("");
                  setInsight(null);
                  setPhase("idle");
                }}
                className="shrink-0 px-4"
              >
                Clear
              </Button>
              {loading && (
                <Button
                  variant="ghost"
                  onClick={() => abortRef.current?.abort()}
                  className="shrink-0 px-4"
                >
                  Stop
                </Button>
              )}
            </div>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="glass-surface mt-2 flex items-center justify-between gap-3 rounded-3xl px-4 py-3"
                >
                  <LoadingPhrases active={loading} />
                  <Sparkles className="size-4 shrink-0 text-[rgba(255,215,120,0.95)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <AnimatePresence>
          {(phase === "reveal" && (insight || raw)) && (
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
            >
              <Card title="The reveal" subtitle="Three layers appear—take your time.">
                <div className="relative min-w-0 overflow-hidden rounded-3xl border border-white/14 bg-white/6 p-5">
                  <div className="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,120,0.22),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(255,215,120,0.12),transparent_60%)]" />
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-[rgba(255,215,120,0.22)]" />

                  <div className="relative grid gap-4 text-sm text-white/90">
                    <section>
                      <div className="text-xs font-semibold text-[rgba(255,215,120,0.95)]">
                        Cognitive upgrade
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-white/90">
                        {seg1 || insight?.cognitive_upgrade || ""}
                      </div>
                    </section>
                    <section>
                      <div className="text-xs font-semibold text-[rgba(255,215,120,0.95)]">
                        Risk reframe
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-white/90">
                        {seg2 || insight?.risk_avoidance || ""}
                      </div>
                    </section>
                    <section>
                      <div className="text-xs font-semibold text-[rgba(255,215,120,0.95)]">
                        Future seed
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-white/90">
                        {seg3 || insight?.future_seed || ""}
                      </div>
                    </section>
                    <section>
                      <div className="text-xs font-semibold text-white/70">One small step</div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-white/85">
                        {seg4 || insight?.one_small_step || ""}
                      </div>
                    </section>

                    <div className="mt-2 flex w-full flex-col items-center gap-2">
                      <Button
                        disabled={!user?.userId || !insight || saved}
                        className="max-w-full justify-center px-6"
                        onClick={() => {
                          if (!user?.userId || !insight) return;
                          const record: Omit<DeepInsightRecord, "userId"> = {
                            id:
                              typeof crypto !== "undefined" && "randomUUID" in crypto
                                ? crypto.randomUUID()
                                : `r_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                            createdAt: new Date().toISOString(),
                            dump: input.trim(),
                            ...insight,
                          };
                          addRecord(user.userId, record);
                          setSaved(true);
                          setToast("Saved to handbook");
                        }}
                      >
                        <BookmarkPlus className="size-4 shrink-0" />
                        {saved ? "Saved" : "Save to handbook"}
                      </Button>

                      {weekly && (
                        <div className="w-full max-w-md rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-center text-xs leading-relaxed text-white/75">
                          This week: {weekly.count} shifts · luck compound +{weekly.compoundPercent}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!insight && (
                  <div className="mt-3 text-xs text-white/60">
                    The reply didn’t match strict JSON yet—you still received the uplift. Try again for a
                    steadier three-part structure.
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
