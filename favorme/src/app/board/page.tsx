"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { chatComplete } from "@/lib/ai-service";
import { useUser } from "@/components/UserContext";
import { buildGuideUserMessage } from "@/lib/ai-config";
import { addGuideFavorite } from "@/lib/handbook";
import { buildGuideProfileNarrative } from "@/lib/guide-profile";
import { storageKeyGuideDailyLimit } from "@/lib/user-store";
import { Mic, MicOff } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

type GuideResult = {
  answer_book: string;
  emotional_insight: string;
  action_guide: string;
};

const DAILY_LIMIT = 2;

function stripFence(raw: string) {
  const t = raw.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : t;
}

function parseGuideFull(raw: string): GuideResult | null {
  const direct = stripFence(raw);
  try {
    const j = JSON.parse(direct) as GuideResult;
    if (
      j?.answer_book?.trim() &&
      j?.emotional_insight?.trim() &&
      j?.action_guide?.trim()
    ) {
      return {
        answer_book: j.answer_book.trim(),
        emotional_insight: j.emotional_insight.trim(),
        action_guide: j.action_guide.trim(),
      };
    }
  } catch {}
  const m = direct.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as GuideResult;
    if (
      j?.answer_book?.trim() &&
      j?.emotional_insight?.trim() &&
      j?.action_guide?.trim()
    ) {
      return {
        answer_book: j.answer_book.trim(),
        emotional_insight: j.emotional_insight.trim(),
        action_guide: j.action_guide.trim(),
      };
    }
  } catch {}
  return null;
}

function fallbackGuide(): GuideResult {
  return {
    answer_book: "先把心安下来，答案会跟着清晰一点",
    emotional_insight:
      "你愿意把烦恼说出来，本身就是在照顾自己的情绪，这已经很不容易。很多纠结来自既想被理解、又怕结果不如意，两种心情同时存在并不矛盾。先不必逼自己立刻选对，允许自己把感受理顺，就已经在降低内耗。",
    action_guide: "给自己一小段不被评判的时间，再决定下一步，你值得被温柔对待。",
  };
}

function todayDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLimitCount(userId: string | undefined) {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(storageKeyGuideDailyLimit(userId));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; count: number };
    return parsed.date === todayDate() ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function setLimitCount(count: number, userId: string | undefined) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKeyGuideDailyLimit(userId), JSON.stringify({ date: todayDate(), count }));
}

export default function BoardPage() {
  const { user } = useUser();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GuideResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [limitCount, setLimit] = useState(0);
  const [toast, setToast] = useState("");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setLimit(getLimitCount(user?.userId));
  }, [user?.userId]);

  const canShowDetail = useMemo(() => limitCount < DAILY_LIMIT, [limitCount]);

  async function runGuide() {
    const q = question.trim();
    if (!q) {
      setToast("请先输入你想聊的内容");
      return;
    }
    setLoading(true);
    try {
      setShowDetail(false);
      const profile = buildGuideProfileNarrative(user ?? null);
      const out = await chatComplete({
        userText: buildGuideUserMessage(profile, q),
      });
      const parsed = parseGuideFull(out);
      setResult(parsed ?? fallbackGuide());
    } finally {
      setLoading(false);
    }
  }

  function revealDetail() {
    if (!result?.answer_book) return;
    if (!canShowDetail) {
      setToast("今日解读次数已用完，明天再来吧。");
      return;
    }
    const next = limitCount + 1;
    setLimit(next);
    setLimitCount(next, user?.userId);
    setShowDetail(true);
  }

  async function shareGuide() {
    if (!result) return;
    const text = [
      `问题：${question}`,
      `答案之书：${result.answer_book}`,
      `专属解读：${result.emotional_insight}`,
      `心意指引：${result.action_guide}`,
    ].join("\n");
    if (navigator.share) {
      await navigator.share({ title: "FavorMe 心安指南", text });
    } else {
      await navigator.clipboard.writeText(text);
      setToast("已复制内容，可直接分享。");
    }
  }

  function saveGuide() {
    if (!result || !user?.userId) {
      setToast("请先完成登录与引导。");
      return;
    }
    addGuideFavorite(user.userId, {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `g_${Date.now()}`,
      createdAt: new Date().toISOString(),
      question: question.trim(),
      answerBook: result.answer_book,
      emotionalInsight: result.emotional_insight,
      actionGuide: result.action_guide,
    });
    setToast("已加入「指南书卷」。");
  }

  function saveAsText() {
    if (!result) return;
    const text = [
      `问题：${question}`,
      `答案之书：${result.answer_book}`,
      `专属解读：${result.emotional_insight}`,
      `心意指引：${result.action_guide}`,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favorme-心安指南-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("已下载为文本。");
  }

  function toggleVoiceInput() {
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SR) {
      setToast("当前浏览器不支持语音输入。");
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setRecording(true);
    rec.onend = () => setRecording(false);
    rec.onerror = () => {
      setRecording(false);
      setToast("语音识别失败，请改用键盘输入。");
    };
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      if (text) setQuestion((p) => `${p}${p ? " " : ""}${text}`);
    };
    rec.start();
  }

  return (
    <AppShell title="心安指南" subtitle="给你的问题，一个低风险、可执行的方向">
      <Toast show={Boolean(toast)} text={toast} />
      <div className="grid gap-4 pb-4">
        <Card title="输入你的问题" subtitle="支持语音输入或键盘输入">
          <div className="grid gap-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="dump-input min-h-28 resize-none"
              placeholder="例如：要不要换工作？要不要主动联系 ta？"
              disabled={loading}
            />
            <div className="flex min-w-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                className="shrink-0"
                onClick={toggleVoiceInput}
                disabled={loading}
              >
                {recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {recording ? "录音中…" : "语音输入"}
              </Button>
              <Button
                type="button"
                className="min-w-0 flex-1 touch-manipulation"
                disabled={loading}
                onClick={runGuide}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> 生成中…
                  </span>
                ) : (
                  "生成答案之书"
                )}
              </Button>
            </div>
          </div>
        </Card>

        {result && (
          <Card title="答案之书寄语" subtitle="先看一句话指引；展开后可见专属解读与心意指引（同一次生成，语感一致）">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white/92">
                {result.answer_book}
              </div>

              {!showDetail ? (
                <div className="grid gap-2">
                  <Button onClick={revealDetail}>查看解读</Button>
                  <div className="text-center text-xs text-white/65">
                    今日完整解读次数：{limitCount}/{DAILY_LIMIT}
                  </div>
                  {!canShowDetail && (
                    <div className="text-center text-xs text-amber-200">
                      今日解读次数已用完，明天再来吧
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 text-sm text-white/90">
                  <section className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
                    <div className="text-xs font-semibold text-white/70">【专属解读】</div>
                    <div className="mt-2 whitespace-pre-wrap break-words">{result.emotional_insight}</div>
                  </section>
                  <section className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
                    <div className="text-xs font-semibold text-white/70">【心意指引】</div>
                    <div className="mt-2 whitespace-pre-wrap break-words">{result.action_guide}</div>
                  </section>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={saveGuide}>
                      收藏
                    </Button>
                    <Button variant="ghost" onClick={shareGuide}>
                      分享
                    </Button>
                    <Button variant="ghost" onClick={saveAsText}>
                      保存到相册（下载）
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
