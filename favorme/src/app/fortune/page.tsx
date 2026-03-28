"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/ui/Spinner";
import { chatComplete } from "@/lib/ai-service";
import { useUser } from "@/components/UserContext";
import { DAILY_FORTUNE_PROMPT } from "@/lib/ai-config";
import { addFortuneFavorite } from "@/lib/handbook";
import { Heart, MoreHorizontal } from "lucide-react";
import { storageKeyFortuneCache, storageKeyFuturePreview } from "@/lib/user-store";

type FortuneData = {
  gentle_message: string;
  today_actions: string[];
  lucky_events: string[];
};

type FortuneCache = Record<string, FortuneData>;

const MAX_CACHE_DAYS = 7;
const FUTURE_LIMIT_PER_DAY = 2;

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

function isFortuneValid(f: FortuneData) {
  return Boolean(f.gentle_message?.trim()) && f.today_actions?.length > 0 && f.lucky_events?.length > 0;
}

function parseFortuneJson(raw: string): FortuneData | null {
  const direct = stripCodeFence(raw);
  try {
    const j = JSON.parse(direct) as FortuneData;
    if (isFortuneValid(j)) return j;
  } catch {}

  const match = direct.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as FortuneData;
    if (isFortuneValid(j)) return j;
  } catch {}
  return null;
}

function fallbackFortune(date: string): FortuneData {
  const seed = Number(date.replaceAll("-", "")) % 5;
  const message = [
    "今天不必一口气做到完美，先把第一小步走稳就很好。",
    "你的节奏正在回到你手里，慢一点也会到达。",
    "你不是卡住了，你只是在为更合适的答案留空间。",
    "今天的你，比昨天更会照顾自己了。",
    "很多好事都从微小的决定开始，今天也一样。",
  ];
  const actions = [
    ["先整理桌面 5 分钟，再做今天最重要的一件事。", "中午给自己留 10 分钟安静呼吸。"],
    ["把待办缩成 3 条最关键事项。", "给重要的人发一句真诚问候。"],
    ["把手机通知静音 30 分钟，完成一个小任务。", "喝一杯热饮，让身体慢下来。"],
    ["出门前对镜子笑一下，提醒自己今天会顺一点。", "下班后散步 15 分钟，让情绪落地。"],
    ["把一个拖延已久的小事立刻做掉。", "睡前写下今天 1 个小收获。"],
  ];
  const events = [
    ["会遇到一句刚好安慰你的话。", "某个小流程会比你想象中更顺利。", "桌面整理后心情会亮一点。"],
    ["随机播放会播到你想听的歌。", "会收到一个温暖的小回应。", "路过的小店刚好有你想吃的味道。"],
    ["会在路上看到让你心情变好的细节。", "今天有机会提前完成一项任务。", "阳光会刚好落在你常坐的位置。"],
    ["会有人主动给你一个实用建议。", "你会发现原来事情没有那么难。", "一杯热饮会让节奏慢下来。"],
    ["会有一个意外的小空档，刚好让你喘口气。", "会得到一个积极信号，增强你的信心。", "换张壁纸都像换了个心情。"],
  ];
  return {
    gentle_message: message[seed],
    today_actions: actions[seed],
    lucky_events: events[seed],
  };
}

function getCacheForUser(cacheKey: string): FortuneCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return {};
    return JSON.parse(raw) as FortuneCache;
  } catch {
    return {};
  }
}

function setCacheForUser(cacheKey: string, cache: FortuneCache) {
  if (typeof window === "undefined") return;
  localStorage.setItem(cacheKey, JSON.stringify(cache));
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

function getFutureCounter(today: string, userId: string | undefined) {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(storageKeyFuturePreview(userId));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; count: number };
    if (parsed.date !== today) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

function setFutureCounter(today: string, count: number, userId: string | undefined) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKeyFuturePreview(userId), JSON.stringify({ date: today, count }));
}

export default function FortunePage() {
  const { user } = useUser();
  const fortuneCacheKey = useMemo(() => storageKeyFortuneCache(user?.userId), [user?.userId]);
  const [loading, setLoading] = useState(false);
  const today = useMemo(() => isoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  /** Date string that `fortune` was loaded for (avoids showing yesterday while fetching today). */
  const [fortuneDate, setFortuneDate] = useState<string | null>(null);
  const loadSeqRef = useRef(0);
  const [hint, setHint] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [futurePreviewCount, setFuturePreviewCount] = useState(0);
  const startXRef = useRef<number | null>(null);
  const gradient = useMemo(() => hourGradient(new Date().getHours()), []);
  const greetingName = user?.name?.trim() || "你";

  const greetingPrefix = useMemo(() => {
    if (selectedDate !== today) return "你好";
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "早安";
    if (h >= 12 && h < 18) return "午安";
    return "晚安";
  }, [selectedDate, today]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(""), 1800);
    return () => clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    setFuturePreviewCount(getFutureCounter(today, user?.userId));
  }, [today, user?.userId]);

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
      const cache = trimCache(getCacheForUser(fortuneCacheKey), today);
      const cached = cache[date];
      if (cached && isFortuneValid(cached)) {
        if (seq !== loadSeqRef.current) return;
        setFortune(cached);
        setFortuneDate(date);
        return;
      }
      if (cached && !isFortuneValid(cached)) {
        delete cache[date];
        setCacheForUser(fortuneCacheKey, cache);
      }

      const profile = user
        ? `姓名=${user.name}; 生日=${user.birthday}; 性别=${user.gender}; MBTI=${user.mbti || "未填写"}`
        : "游客用户（请输出通用版本）";

      const out = await chatComplete({
        userText: `${DAILY_FORTUNE_PROMPT}

上下文：
- 日期：${date}
- 当前时间：${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}
- 用户档案：${profile}
- 风格：温柔清新、治愈不玄学、逻辑务实`,
      });
      if (seq !== loadSeqRef.current) return;
      let parsed = parseFortuneJson(out);
      if (parsed && !isFortuneValid(parsed)) parsed = null;
      const final = parsed || fallbackFortune(date);
      const nextCache = trimCache({ ...cache, [date]: final }, today);
      setCacheForUser(fortuneCacheKey, nextCache);
      setFortune(final);
      setFortuneDate(date);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadFortune(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedDate,
    user?.userId,
    user?.name,
    user?.birthday,
    user?.gender,
    user?.focusArea,
    fortuneCacheKey,
  ]);

  function goYesterday() {
    const next = shiftDate(selectedDate, -1);
    const min = shiftDate(today, -(MAX_CACHE_DAYS - 1));
    if (next < min) {
      setHint("仅保留最近 7 天的运势记录。");
      return;
    }
    setSelectedDate(next);
  }

  function tryGoTomorrow() {
    if (selectedDate >= today) {
      const nextCount = futurePreviewCount + 1;
      if (nextCount > FUTURE_LIMIT_PER_DAY) {
        setHint("明日运势查看次数已用完，明天再来吧。");
        return;
      }
      setFuturePreviewCount(nextCount);
      setFutureCounter(today, nextCount, user?.userId);
      setSelectedDate(shiftDate(selectedDate, 1));
      setHint(`已使用未来运势次数 ${nextCount}/${FUTURE_LIMIT_PER_DAY}`);
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

  const fortuneText = [
    `${selectedDate} · ${greetingPrefix}，${greetingName}`,
    `一句寄语：${displayFortune.gentle_message}`,
    "今日建议：",
    ...displayFortune.today_actions.map((it) => `- ${it}`),
    "幸运小事：",
    ...displayFortune.lucky_events.map((it) => `- ${it}`),
  ].join("\n");

  async function shareFortune() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "FavorMe 今日运势",
          text: fortuneText,
        });
      } else {
        await navigator.clipboard.writeText(fortuneText);
        setHint("已复制到剪贴板，可直接粘贴分享。");
      }
    } catch {
      setHint("分享已取消。");
    } finally {
      setMenuOpen(false);
    }
  }

  function saveAsTextFile() {
    const blob = new Blob([fortuneText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favorme-运势-${selectedDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setHint("已下载为文本，可保存到相册/云盘。");
    setMenuOpen(false);
  }

  function saveFavorite() {
    if (!user?.userId) {
      setHint("请先完成登录与引导后再收藏。");
      return;
    }
    addFortuneFavorite(user.userId, {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `f_${Date.now()}`,
      createdAt: new Date().toISOString(),
      date: selectedDate,
      greeting: `${greetingPrefix}，${greetingName}`,
      message: displayFortune.gentle_message,
      actions: displayFortune.today_actions,
      luckyEvents: displayFortune.lucky_events,
    });
    setHint("已加入「运势信箱」。");
  }

  return (
    <AppShell title="今日运势" subtitle="每一天，都有可被看见的小确幸">
      <div className="relative flex h-[calc(100dvh-190px)] min-h-0 flex-col">
        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/20 bg-gradient-to-b ${gradient} px-5 py-5 text-white shadow-[0_18px_36px_rgba(4,8,42,0.34)]`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative shrink-0 px-1 text-center">
            <div className="text-xs text-[#f2e7c3]/85">{selectedDate}</div>
            <div className="mt-1 text-lg font-semibold text-[#f2e7c3] sm:text-xl">
              {greetingPrefix}，{greetingName}
            </div>
            <p className="fortune-gentle-message mt-3 text-balance rounded-[999px] border border-white/55 bg-white/10 px-4 py-3 text-sm font-medium leading-relaxed">
              {displayFortune.gentle_message}
            </p>
            <div className="absolute right-0 top-0 flex gap-1">
              <button
                type="button"
                className="rounded-full bg-white/15 p-2"
                aria-label="收藏"
                onClick={saveFavorite}
              >
                <Heart className="size-4 text-white" />
              </button>
              <button
                type="button"
                className="rounded-full bg-white/15 p-2"
                aria-label="更多"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <MoreHorizontal className="size-4 text-white" />
              </button>
            </div>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 grid w-40 gap-1 rounded-2xl border border-white/14 bg-[rgba(10,26,98,0.95)] p-2 text-left text-xs">
                <button className="rounded-xl px-2 py-2 hover:bg-white/10" onClick={saveAsTextFile}>
                  保存到相册（下载）
                </button>
                <button className="rounded-xl px-2 py-2 hover:bg-white/10" onClick={shareFortune}>
                  分享
                </button>
              </div>
            )}
          </div>

          {showFortuneLoading ? (
            <div className="relative mt-6 flex min-h-[120px] shrink-0 flex-col items-center justify-center gap-2 px-2 text-center text-sm text-white/90">
              <Spinner className="!border-white/40 !border-t-white/90" />
              <span>正在生成今日运势…</span>
              <span className="text-xs text-white/65">{selectedDate}</span>
            </div>
          ) : (
            <div className="relative mt-5 min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
              <div className="grid gap-3 pb-1">
                <section>
                  <div className="flex flex-col rounded-2xl border border-white/18 bg-white/6 px-4 py-3">
                    <div className="shrink-0 text-[11px] font-semibold tracking-[0.1em] text-white/70">
                      今日建议做什么
                    </div>
                    <div className="mt-1.5 max-h-[min(40vh,280px)] min-h-0 overflow-y-auto overscroll-y-contain text-sm leading-relaxed text-white/90 [-webkit-overflow-scrolling:touch]">
                      <ul className="list-disc space-y-1 pl-4">
                        {displayFortune.today_actions.map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
                <section>
                  <div className="flex flex-col rounded-2xl border border-white/18 bg-white/6 px-4 py-3">
                    <div className="shrink-0 text-[11px] font-semibold tracking-[0.1em] text-white/70">
                      幸运小事
                    </div>
                    <div className="mt-1.5 max-h-[min(40vh,280px)] min-h-0 overflow-y-auto overscroll-y-contain text-sm leading-relaxed text-white/90 [-webkit-overflow-scrolling:touch]">
                      <ul className="list-disc space-y-1 pl-4">
                        {displayFortune.lucky_events.map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
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
            ← 昨天
          </button>
          <span className="text-xs text-white/70">{selectedDate === today ? "今天" : selectedDate}</span>
          <button
            type="button"
            onClick={tryGoTomorrow}
            className="rounded-full border border-white/20 bg-white/85 px-3.5 py-1.5 font-medium text-[#37445f] shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
          >
            明天 →
          </button>
        </div>

        {hint && <div className="mt-1 text-center text-xs text-white/75">{hint}</div>}
      </div>
    </AppShell>
  );
}
