"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/ui/Spinner";
import { chatComplete } from "@/lib/ai-service";
import { useUser } from "@/components/UserContext";
import { DAILY_FORTUNE_PROMPT } from "@/lib/ai-config";

type FortuneData = {
  /** Short headline phrase from the API — "today's lucky password" for that date. */
  lucky_password: string;
  lucky_todo: string;
  lucky_event: string;
  gentle_reminder: string;
};

type FortuneCache = Record<string, FortuneData>;

/** Bump version when output language / format changes so stale local cache is not reused. */
const CACHE_KEY = "favor_me_fortune_cache_v3_en";
const MAX_CACHE_DAYS = 7;

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function stripCodeFence(raw: string) {
  const t = raw.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : t;
}

/** Model sometimes ignores English-only; reject CJK so we can fall back cleanly. */
function hasCjk(s: string) {
  return /[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/.test(s);
}

function isEnglishFortune(f: FortuneData) {
  return (
    Boolean(f.lucky_password?.trim()) &&
    !hasCjk(f.lucky_password) &&
    !hasCjk(f.lucky_todo) &&
    !hasCjk(f.lucky_event) &&
    !hasCjk(f.gentle_reminder)
  );
}

function parseFortuneJson(raw: string): FortuneData | null {
  const direct = stripCodeFence(raw);
  try {
    const j = JSON.parse(direct) as FortuneData;
    if (j?.lucky_password && j?.lucky_todo && j?.lucky_event && j?.gentle_reminder) return j;
  } catch {}

  const match = direct.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as FortuneData;
    if (j?.lucky_password && j?.lucky_todo && j?.lucky_event && j?.gentle_reminder) return j;
  } catch {}
  return null;
}

function fallbackFortune(date: string): FortuneData {
  const seed = Number(date.replaceAll("-", "")) % 4;
  const passwords = [
    "Soft gold open door",
    "Quiet breath bright thread",
    "Small step wide sky",
    "Gentle yes steady light",
  ];
  const todos = [
    "Wear something light and give yourself a smile before you step out.",
    "Tidy your desk for five minutes, then start your most important task.",
    "Take a ten-minute afternoon walk and play one song that relaxes you.",
    "Send someone you care about a sincere message—let connection flow.",
  ];
  const events = [
    "You’ll notice a tiny scene around the corner that brightens your mood.",
    "Shuffle will land on a song you needed—like a quiet reply from the universe.",
    "You’ll hear one warm sentence that reminds you you’re getting better.",
    "A small win today will give you back time and a calmer rhythm.",
  ];
  const reminders = [
    "Better to sleep a little earlier tonight—luck stacks while you rest.",
    "Better to anchor on one small step in front of you—the pace will follow.",
    "Better to reduce information noise—leave quiet room to breathe.",
    "Better to honor how your body feels first—your energy is today’s best card.",
  ];
  return {
    lucky_password: passwords[seed],
    lucky_todo: todos[seed],
    lucky_event: events[seed],
    gentle_reminder: reminders[seed],
  };
}

function getCache(): FortuneCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FortuneCache;
  } catch {
    return {};
  }
}

function setCache(cache: FortuneCache) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function trimCache(cache: FortuneCache, today: string) {
  const result: FortuneCache = {};
  for (let i = 0; i < MAX_CACHE_DAYS; i++) {
    const d = shiftDate(today, -i);
    if (cache[d]) result[d] = cache[d];
  }
  return result;
}

function hourGradient(hour: number) {
  if (hour >= 5 && hour < 10) {
    return "from-[#4966c2]/80 to-[#3f57b8]/86";
  }
  if (hour >= 10 && hour < 17) {
    return "from-[#4a6ed1]/78 to-[#4260bd]/86";
  }
  return "from-[#4561bf]/76 to-[#334ea7]/90";
}

export default function FortunePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const today = useMemo(() => isoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  /** Date string that `fortune` was loaded for (avoids showing yesterday while fetching today). */
  const [fortuneDate, setFortuneDate] = useState<string | null>(null);
  const loadSeqRef = useRef(0);
  const [hint, setHint] = useState("");
  const startXRef = useRef<number | null>(null);
  const gradient = useMemo(() => hourGradient(new Date().getHours()), []);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(""), 1800);
    return () => clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  async function loadFortune(date: string) {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const cache = trimCache(getCache(), today);
      const cached = cache[date];
      if (cached && isEnglishFortune(cached)) {
        if (seq !== loadSeqRef.current) return;
        setFortune(cached);
        setFortuneDate(date);
        return;
      }
      // Stale or non-English cache: drop this date so we refetch
      if (cached && !isEnglishFortune(cached)) {
        delete cache[date];
        setCache(cache);
      }

      const profile = user
        ? `name=${user.name}; birthday=${user.birthday}; gender=${user.gender}; focus=${user.focusArea || "career"}`
        : "guest user (output a general version)";

      const out = await chatComplete({
        userText: `${DAILY_FORTUNE_PROMPT}

Context (for this request only):
- Date: ${date}
- Local time: ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
- Profile: ${profile}

Remember: JSON only; every string value in English (Latin script).`,
      });
      if (seq !== loadSeqRef.current) return;
      let parsed = parseFortuneJson(out);
      if (parsed && !isEnglishFortune(parsed)) parsed = null;
      const final = parsed || fallbackFortune(date);
      const nextCache = trimCache({ ...cache, [date]: final }, today);
      setCache(nextCache);
      setFortune(final);
      setFortuneDate(date);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadFortune(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user?.name, user?.birthday, user?.gender, user?.focusArea]);

  function goYesterday() {
    const next = shiftDate(selectedDate, -1);
    const min = shiftDate(today, -(MAX_CACHE_DAYS - 1));
    if (next < min) {
      setHint("Only the last 7 days are kept in memory.");
      return;
    }
    setSelectedDate(next);
  }

  function tryGoTomorrow() {
    if (selectedDate >= today) {
      setHint("Tomorrow’s luck is still brewing…");
      return;
    }
    setSelectedDate(shiftDate(selectedDate, 1));
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    startXRef.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (startXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? startXRef.current;
    const dx = endX - startXRef.current;
    if (dx <= -60) goYesterday();
    if (dx >= 60) tryGoTomorrow();
    startXRef.current = null;
  }

  const fortuneReady = Boolean(fortune && fortuneDate === selectedDate);
  const showFortuneLoading = loading || !fortuneReady;
  const displayFortune =
    fortune && fortuneDate === selectedDate ? fortune : fallbackFortune(selectedDate);

  return (
    <AppShell
      title="Fortune Mood"
      subtitle="Let today’s luck land as softly as it can."
    >
      <div className="relative flex h-[calc(100dvh-190px)] min-h-0 flex-col">
        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/20 bg-gradient-to-b ${gradient} px-5 py-5 text-white shadow-[0_18px_36px_rgba(4,8,42,0.34)]`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative shrink-0 px-1 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f2e7c3]/75">
              Today&apos;s lucky password
            </div>
            <div className="mt-1.5 text-balance text-[22px] font-semibold leading-snug text-[#f2e7c3] sm:text-[26px]">
              {displayFortune.lucky_password}
            </div>
          </div>

          {showFortuneLoading ? (
            <div className="relative mt-6 flex min-h-[120px] shrink-0 flex-col items-center justify-center gap-2 px-2 text-center text-sm text-white/90">
              <Spinner className="!border-white/40 !border-t-white/90" />
              <span>Loading this day’s fortune…</span>
              <span className="text-xs text-white/65">{selectedDate}</span>
            </div>
          ) : (
            <div className="relative mt-5 min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
              <div className="grid gap-3 pb-1">
                <section>
                  <div className="flex flex-col rounded-2xl border border-white/18 bg-white/6 px-4 py-3">
                    <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Lucky to-do
                    </div>
                    <div className="mt-1.5 max-h-[min(40vh,280px)] min-h-0 overflow-y-auto overscroll-y-contain text-sm leading-relaxed text-white/90 [-webkit-overflow-scrolling:touch]">
                      {displayFortune.lucky_todo}
                    </div>
                  </div>
                </section>
                <section>
                  <div className="flex flex-col rounded-2xl border border-white/18 bg-white/6 px-4 py-3">
                    <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Tiny lucky moment
                    </div>
                    <div className="mt-1.5 max-h-[min(40vh,280px)] min-h-0 overflow-y-auto overscroll-y-contain text-sm leading-relaxed text-white/90 [-webkit-overflow-scrolling:touch]">
                      {displayFortune.lucky_event}
                    </div>
                  </div>
                </section>
                <section>
                  <div className="flex flex-col rounded-2xl border border-white/18 bg-white/6 px-4 py-3">
                    <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Gentle reminder
                    </div>
                    <div className="mt-1.5 max-h-[min(40vh,280px)] min-h-0 overflow-y-auto overscroll-y-contain text-sm leading-relaxed text-white/90 [-webkit-overflow-scrolling:touch]">
                      {displayFortune.gentle_reminder}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-between px-1 text-sm text-white/82">
          <button
            type="button"
            onClick={goYesterday}
            className="rounded-full border border-white/20 bg-white/85 px-3.5 py-1.5 font-medium text-[#37445f] shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
          >
            ← Yesterday
          </button>
          <span className="text-xs text-white/70">{selectedDate === today ? "Today" : selectedDate}</span>
          <button
            type="button"
            onClick={tryGoTomorrow}
            className="rounded-full border border-white/20 bg-white/85 px-3.5 py-1.5 font-medium text-[#37445f] shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
          >
            Tomorrow →
          </button>
        </div>

        {hint && <div className="mt-1 text-center text-xs text-white/75">{hint}</div>}
      </div>
    </AppShell>
  );
}
