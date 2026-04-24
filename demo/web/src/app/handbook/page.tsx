"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/components/UserContext";
import {
  loadFortuneFavorites,
  loadGuideFavorites,
  removeFortuneFavorite,
  removeGuideFavorite,
  type FortuneFavorite,
  type GuideFavorite,
} from "@/lib/handbook";
import { Button } from "@/components/ui/Button";

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
  const [tab, setTab] = useState<"fortune" | "guide">("fortune");
  const [fortuneList, setFortuneList] = useState<FortuneFavorite[]>([]);
  const [guideList, setGuideList] = useState<GuideFavorite[]>([]);

  useEffect(() => {
    if (!user?.userId) return;
    setFortuneList(loadFortuneFavorites(user.userId));
    setGuideList(loadGuideFavorites(user.userId));
  }, [user?.userId]);

  return (
    <AppShell title="我的收藏" subtitle="把让你安心的内容收进信箱与书卷">
      <div className="flex w-full min-w-0 max-w-full flex-col gap-4">
        <Card title="分类标签" subtitle="可切换查看运势收藏和指南收藏">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={tab === "fortune" ? "primary" : "ghost"} onClick={() => setTab("fortune")}>
              运势信箱
            </Button>
            <Button variant={tab === "guide" ? "primary" : "ghost"} onClick={() => setTab("guide")}>
              指南书卷
            </Button>
          </div>
        </Card>

        <Card title={tab === "fortune" ? "运势信箱" : "指南书卷"}>
          <div className="grid min-w-0 gap-3">
            {tab === "fortune" && fortuneList.length === 0 && (
              <div className="text-sm text-white/70">还没有收藏的运势卡片。</div>
            )}
            {tab === "guide" && guideList.length === 0 && (
              <div className="text-sm text-white/70">还没有收藏的指南解读。</div>
            )}

            {tab === "fortune" &&
              fortuneList.map((it) => (
                <details
                  key={it.id}
                  className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/12 bg-white/6 px-4 py-3"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white/92">{it.message}</div>
                        <div className="mt-1 text-xs text-white/65">{it.date}</div>
                      </div>
                      <div className="text-xs text-white/60">{fmt(it.createdAt)}</div>
                    </div>
                  </summary>
                  <div className="mt-3 grid gap-2 text-sm text-white/90">
                    <div className="text-xs text-white/70">{it.greeting}</div>
                    <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">
                      <div className="text-xs font-semibold text-white/70">今日建议</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {it.actions.map((v, idx) => (
                          <li key={idx}>{v}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">
                      <div className="text-xs font-semibold text-white/70">幸运小事</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {it.luckyEvents.map((v, idx) => (
                          <li key={idx}>{v}</li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!user?.userId) return;
                        const next = removeFortuneFavorite(user.userId, it.id);
                        setFortuneList(next);
                      }}
                    >
                      删除收藏
                    </Button>
                  </div>
                </details>
              ))}

            {tab === "guide" &&
              guideList.map((it) => (
                <details
                  key={it.id}
                  className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/12 bg-white/6 px-4 py-3"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white/92">{it.question}</div>
                        <div className="mt-1 text-xs text-white/65">{fmt(it.createdAt)}</div>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-3 grid gap-2 text-sm text-white/90">
                    <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">
                      <div className="text-xs font-semibold text-white/70">答案之书</div>
                      <div className="mt-1">{it.answerBook}</div>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">
                      <div className="text-xs font-semibold text-white/70">专属解读</div>
                      <div className="mt-1 whitespace-pre-wrap break-words">{it.emotionalInsight}</div>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">
                      <div className="text-xs font-semibold text-white/70">心意指引</div>
                      <div className="mt-1 whitespace-pre-wrap break-words">{it.actionGuide}</div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!user?.userId) return;
                        const next = removeGuideFavorite(user.userId, it.id);
                        setGuideList(next);
                      }}
                    >
                      删除收藏
                    </Button>
                  </div>
                </details>
              ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
