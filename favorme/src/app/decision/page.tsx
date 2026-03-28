"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { chatComplete } from "@/lib/ai-service";
import { buildNumerologyDecisionPrompt } from "@/lib/ai-config";
import { useUser } from "@/components/UserContext";
import {
  baseRuleSnippets,
  baseDecisionReasons,
  basePositiveReverse,
  compatibilityStars,
  energyLabel,
  getPersonalDay,
  getUniversalDay,
  reduceNumber,
  suggestedAction,
  universalTheme,
} from "@/lib/numerology";

const REQUIRED_ENDING = "This choice will ultimately serve your long-term growth.";
const LOADING_PHRASES = [
  "Calibrating your personal energy orbit…",
  "Aligning universal day with your personal day…",
  "Finding the best decision window for you…",
];

type DecisionJson = {
  compatibility_stars: 1 | 2 | 3 | 4 | 5;
  action: "Act" | "Wait";
  reasons: string[];
  positive_reverse: string;
};

function clampStars(n: number): 1 | 2 | 3 | 4 | 5 {
  const v = Math.max(1, Math.min(5, Math.round(n)));
  return v as 1 | 2 | 3 | 4 | 5;
}

function normalizeAction(a: unknown): "Act" | "Wait" | null {
  const s = String(a ?? "").trim();
  if (s === "Act" || s === "做") return "Act";
  if (s === "Wait" || s === "等") return "Wait";
  return null;
}

function parseDecision(raw: string): DecisionJson | null {
  const text = raw.trim();
  const tryParse = (j: DecisionJson) => {
    const act = normalizeAction(j.action);
    if (
      j?.compatibility_stars &&
      act &&
      Array.isArray(j?.reasons) &&
      j?.positive_reverse
    ) {
      return { ...j, compatibility_stars: clampStars(j.compatibility_stars), action: act };
    }
    return null;
  };
  try {
    const j = JSON.parse(text) as DecisionJson;
    const r = tryParse(j);
    if (r) return r;
  } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as DecisionJson;
    return tryParse(j);
  } catch {}
  return null;
}

function parseDecisionLoose(raw: string): DecisionJson | null {
  const text = raw.trim();
  if (!text) return null;

  const actEn = /(?:suggestion|action|verdict)?[:：]?\s*(Act|Wait)\b/i.exec(text)?.[1];
  const actZh = /(?:建议|结论|行动)?[:：]?\s*(做|等)/.exec(text)?.[1];
  let action: "Act" | "Wait" | undefined;
  if (actEn) action = actEn.toLowerCase() === "wait" ? "Wait" : "Act";
  else if (actZh === "做") action = "Act";
  else if (actZh === "等") action = "Wait";

  let stars: 1 | 2 | 3 | 4 | 5 = 3;
  const starNum = /([1-5])\s*(?:star|星)/i.exec(text)?.[1];
  if (starNum) stars = clampStars(Number(starNum));
  const starGlyphs = (text.match(/★/g) || []).length;
  if (starGlyphs > 0) stars = clampStars(starGlyphs);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const reasons = lines
    .filter((l) => /^[-*•]\s+/.test(l) || /^\d+[).、]/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, "").replace(/^\d+[).、]\s*/, ""))
    .filter((l) => l.length > 6)
    .slice(0, 4);

  const reverseMatch =
    /(?:positive reframe|reframe|note)[:：]\s*([\s\S]{6,})/i.exec(text) ||
    /(?:正向反转|反转)[:：]\s*([\s\S]{6,})/.exec(text);
  const positive_reverse =
    reverseMatch?.[1]?.split("\n")[0]?.trim() ||
    lines.find(
      (l) =>
        /universe|timing|cost|window/i.test(l) ||
        l.includes("宇宙") ||
        l.includes("准备时间"),
    ) ||
    "";

  if (!action && reasons.length === 0 && !positive_reverse) return null;
  return {
    compatibility_stars: stars,
    action: action || (stars >= 3 ? "Act" : "Wait"),
    reasons:
      reasons.length > 0
        ? reasons
        : ["Timing is realigning—steady the rhythm, then move."],
    positive_reverse:
      positive_reverse ||
      "This isn’t a no—it’s the universe buying you a better window and a smaller price.",
  };
}

function ensureEnding(text: string) {
  const trimmed = text.trim();
  if (trimmed.endsWith(REQUIRED_ENDING)) return trimmed;
  return `${trimmed}\n\n${REQUIRED_ENDING}`;
}

export default function DecisionPage() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [ritual, setRitual] = useState(false);
  const [decision, setDecision] = useState<DecisionJson | null>(null);
  const [rawText, setRawText] = useState("");
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);

  const lifeNumber = useMemo(() => {
    const b = user?.birthday || "";
    return b ? reduceNumber(b) : (9 as const);
  }, [user?.birthday]);

  const universalDay = useMemo(() => getUniversalDay(new Date()), []);
  const personalDay = useMemo(() => {
    const b = user?.birthday || "";
    const m = Number(b.split("-")[1] || 0);
    const d = Number(b.split("-")[2] || 0);
    if (!m || !d) return 9 as const;
    return getPersonalDay({ birthMonth: m, birthDay: d, date: new Date() });
  }, [user?.birthday]);

  const topLine = `Universal energy: ${universalDay} (${energyLabel(universalDay)}); your day: ${personalDay} (${energyLabel(personalDay)})`;
  const ballLabel = useMemo(() => {
    const t = query.trim();
    if (!t) return "Focus ball";
    return t.length > 18 ? `${t.slice(0, 18)}…` : t;
  }, [query]);

  useEffect(() => {
    if (!loading) return;
    setLoadingPhraseIdx(0);
    const t = window.setInterval(
      () => setLoadingPhraseIdx((p) => (p + 1) % LOADING_PHRASES.length),
      1300,
    );
    return () => window.clearInterval(t);
  }, [loading]);

  async function run() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setDecision(null);
    setRawText("");
    setRitual(true);
    try {
      const stars = compatibilityStars(personalDay, universalDay);
      const action = suggestedAction(stars);
      const base = {
        compatibility_stars: stars,
        action,
        reasons: baseDecisionReasons({ lifeNumber, personalDay, universalDay }),
        positive_reverse: basePositiveReverse(stars),
      } satisfies DecisionJson;

      await new Promise((r) => setTimeout(r, 1200));

      const out = await chatComplete({
        userText: buildNumerologyDecisionPrompt({
          rulesBlock: baseRuleSnippets(),
          lifeNumber,
          personalDay,
          universalDay,
          universalTheme: universalTheme(universalDay),
          question: q,
          requiredEnding: REQUIRED_ENDING,
        }),
      });
      const parsed = parseDecision(out) || parseDecisionLoose(out);
      setDecision(parsed || base);
      setRawText(ensureEnding(out));
    } finally {
      setLoading(false);
      setRitual(false);
    }
  }

  return (
    <AppShell
      title="Numerology ritual"
      subtitle="The stars have a take—you only need to name the knot."
    >
      <div className="grid gap-4">
        <Card
          title="Decision boost"
          subtitle={user ? topLine : "Finish onboarding for a closer match."}
        >
          <AnimatePresence mode="wait">
            {!decision ? (
              <motion.div
                key="ball-state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/80">
                    Tap the ball—say what you want to do or wait on today.
                  </div>
                </div>

                <div className="flex items-center justify-center py-4">
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="relative"
                    aria-label="Open input"
                  >
                    <div className="pointer-events-none absolute -inset-10 rounded-full bg-[rgba(120,203,255,0.10)] blur-2xl" />
                    <div className="pointer-events-none absolute -inset-12 rounded-full bg-[rgba(150,132,255,0.12)] blur-3xl" />

                    <motion.div
                      animate={
                        ritual
                          ? { scale: [1, 1.03, 1], rotate: [0, 1.2, 0] }
                          : { scale: [1, 1.04, 1] }
                      }
                      transition={{
                        duration: ritual ? 0.9 : 2.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative flex size-28 items-center justify-center rounded-full border border-white/18 bg-white/10 shadow-[0_18px_60px_rgba(132,118,255,0.22)] backdrop-blur-xl"
                    >
                      <div className="px-4 text-center text-[12px] font-semibold leading-4 text-white/95">
                        {ballLabel}
                      </div>

                      <AnimatePresence>
                        {ritual && (
                          <motion.div
                            key="rings-on-ball"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pointer-events-none absolute inset-[-18px]"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-0 rounded-full border border-white/25"
                            />
                            <motion.div
                              animate={{ rotate: -360 }}
                              transition={{ duration: 1.55, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-3 rounded-full border border-white/16"
                            />
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.9, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-6 rounded-full border border-white/10"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </button>
                </div>

                <div className="text-center text-xs text-white/65">
                  {loading
                    ? LOADING_PHRASES[loadingPhraseIdx]
                    : 'Try: "Should I confess?" "Quit today?" "Buy funds today?"'}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="expanded-result"
                initial={{ opacity: 0, y: 18, scale: 0.94, borderRadius: 999 }}
                animate={{ opacity: 1, y: 0, scale: 1, borderRadius: 24 }}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
                className="overflow-hidden rounded-3xl border border-white/14 bg-white/8 p-4"
              >
                <div className="grid gap-3 text-sm text-white/90">
                  <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
                    <div className="text-xs font-semibold text-white/70">Fit</div>
                    <div className="text-base font-semibold text-white">
                      {"★★★★★☆☆☆☆☆".slice(
                        5 - decision.compatibility_stars,
                        10 - decision.compatibility_stars,
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
                    <div className="text-xs font-semibold text-white/70">Advice</div>
                    <div className="mt-1 text-lg font-semibold text-white">{decision.action}</div>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
                    <div className="text-xs font-semibold text-white/70">Why</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-white/90">
                      {decision.reasons.slice(0, 4).map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
                    <div className="text-xs font-semibold text-white/70">Positive reframe</div>
                    <div className="mt-2 text-white/90">{decision.positive_reverse}</div>
                  </div>

                  <div className="pt-1 text-xs font-semibold text-white/85">{REQUIRED_ENDING}</div>

                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={() => {
                        setDecision(null);
                        setRawText("");
                        setQuery("");
                      }}
                    >
                      Ask another
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="glass-card w-full max-w-lg p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-base font-semibold text-white">Is today a good day to…</div>
              <div className="mt-1 text-xs text-white/65">
                e.g. confess · quit · buy funds · text them first
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ios-input mt-3 min-h-24 resize-none"
                placeholder="Name the knot (the more specific, the better)"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                  Not now
                </Button>
                <Button
                  onClick={async () => {
                    setOpen(false);
                    await run();
                  }}
                  disabled={!query.trim() || loading}
                >
                  Blend
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
