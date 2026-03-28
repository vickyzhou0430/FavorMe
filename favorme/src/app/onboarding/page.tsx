"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/components/UserContext";
import { saveUser, type Gender, type UserProfile } from "@/lib/user-store";

const genders: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "女" },
  { value: "male", label: "男" },
  { value: "other", label: "其他" },
];

const mbtiOptions = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
];

const shichenOptions = [
  "子时（23:00-00:59）",
  "丑时（01:00-02:59）",
  "寅时（03:00-04:59）",
  "卯时（05:00-06:59）",
  "辰时（07:00-08:59）",
  "巳时（09:00-10:59）",
  "午时（11:00-12:59）",
  "未时（13:00-14:59）",
  "申时（15:00-16:59）",
  "酉时（17:00-18:59）",
  "戌时（19:00-20:59）",
  "亥时（21:00-22:59）",
];

const introSlides = [
  {
    title: "今日运势",
    desc: "每天为你生成温柔寄语、行动建议和幸运小事，帮你从焦虑中找回可执行的小节奏。",
  },
  {
    title: "心安指南",
    desc: "遇到纠结时，先给你一句答案之书，再提供专属解读和低风险行动建议。",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, hydrated, setUser } = useUser();

  useEffect(() => {
    if (!hydrated) return;
    if (user?.onboardingDone) router.replace("/fortune");
  }, [hydrated, router, user?.onboardingDone]);

  useEffect(() => {
    if (!user) return;
    if (user.name) setName(user.name);
    if (user.birthday) setBirthday(user.birthday);
    if (user.avatar) setAvatar(user.avatar);
    if (user.gender) setGender(user.gender);
    if (user.mbti) setMbti(user.mbti);
    if (user.birthTime) setBirthTime(user.birthTime);
    if (user.account) setAccount(user.account);
  }, [user]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [account, setAccount] = useState(user?.account || "");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [birthday, setBirthday] = useState("");
  const [avatar, setAvatar] = useState("");
  const [mbti, setMbti] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [introIdx, setIntroIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const canNextInfo = name.trim() && birthday && avatar;

  const zodiac = useMemo(() => {
    if (!birthday) return "";
    const md = birthday.slice(5);
    const ranges: Array<[string, string, string]> = [
      ["03-21", "04-19", "白羊座"],
      ["04-20", "05-20", "金牛座"],
      ["05-21", "06-21", "双子座"],
      ["06-22", "07-22", "巨蟹座"],
      ["07-23", "08-22", "狮子座"],
      ["08-23", "09-22", "处女座"],
      ["09-23", "10-23", "天秤座"],
      ["10-24", "11-22", "天蝎座"],
      ["11-23", "12-21", "射手座"],
      ["12-22", "12-31", "摩羯座"],
      ["01-01", "01-19", "摩羯座"],
      ["01-20", "02-18", "水瓶座"],
      ["02-19", "03-20", "双鱼座"],
    ];
    const hit = ranges.find(([start, end]) => md >= start && md <= end);
    return hit?.[2] || "";
  }, [birthday]);

  function next() {
    setStep((s) => (s === 4 ? 4 : ((s + 1) as 1 | 2 | 3 | 4)));
  }
  function back() {
    setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3 | 4)));
  }

  function commit() {
    const userId =
      user?.userId ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    const profile: UserProfile = {
      userId,
      phone: user?.phone,
      account: account.trim() || user?.phone || "手机号用户",
      name: name.trim(),
      gender,
      birthday,
      avatar,
      mbti: mbti || undefined,
      birthTime,
      onboardingDone: true,
    };
    saveUser(profile);
    setUser(profile);
    router.replace("/fortune");
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  function onIntroTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(e.touches[0]?.clientX ?? null);
  }

  function onIntroTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (dx <= -50) setIntroIdx((v) => Math.min(v + 1, introSlides.length - 1));
    if (dx >= 50) setIntroIdx((v) => Math.max(v - 1, 0));
    setTouchStartX(null);
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
      <div className="starfield absolute inset-0 -z-10" />
      <div className="w-full max-w-[460px]">
        <div className="mb-4 text-center">
          <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1 text-sm text-white/80 backdrop-blur-xl">
            引导 {step} / 4
          </div>
        </div>

        {step === 1 && (
          <Card title="填写基础信息" subtitle="用于生成你的个性化运势内容">
            <div className="grid gap-4">
              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">账号（可选）</div>
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="ios-input"
                  placeholder="手机号 / 微信昵称"
                />
              </label>
              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">姓名（必填）</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ios-input"
                  placeholder="请输入你的姓名"
                />
              </label>
              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">头像（必填）</div>
                <div className="flex items-center gap-3">
                  <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-white/18 bg-white/8">
                    {avatar ? (
                      <img src={avatar} alt="avatar" className="size-full object-cover" />
                    ) : (
                      <span className="text-xs text-white/60">未上传</span>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-2xl border border-white/16 bg-white/10 px-3 py-2 text-sm text-white/90">
                    拍照/相册上传
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      style={{ display: "none" }}
                      onChange={onPickAvatar}
                    />
                  </label>
                </div>
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">生日（必填）</div>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="ios-input"
                />
                {zodiac && <div className="text-xs text-white/70">已识别星座：{zodiac}</div>}
              </label>

              <div className="grid grid-cols-3 gap-2">
                {genders.map((g) => {
                  const active = gender === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "border-2 border-white bg-white/[0.10] text-white shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                          : "border border-white/[0.10] bg-white/[0.03] text-white/55 hover:border-white/16 hover:bg-white/[0.06] hover:text-white/80"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>

              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">MBTI（选填）</div>
                <select value={mbti} onChange={(e) => setMbti(e.target.value)} className="ios-input">
                  <option value="">请选择 MBTI</option>
                  {mbtiOptions.map((it) => (
                    <option key={it} value={it}>
                      {it}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">出生时间（选填）</div>
                <select
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="ios-input"
                >
                  <option value="">请选择时辰</option>
                  {shichenOptions.map((it) => (
                    <option key={it} value={it}>
                      {it}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-2 flex justify-end">
                <Button disabled={!canNextInfo} onClick={next}>
                  下一步
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card
            title="功能介绍"
            subtitle="支持左右滑动查看「今日运势」和「心安指南」"
          >
            <div
              className="grid gap-4"
              onTouchStart={onIntroTouchStart}
              onTouchEnd={onIntroTouchEnd}
            >
              <div className="rounded-3xl border border-white/14 bg-white/8 p-4">
                <div className="text-base font-semibold text-white">{introSlides[introIdx].title}</div>
                <div className="mt-2 text-sm leading-relaxed text-white/80">
                  {introSlides[introIdx].desc}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                {introSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setIntroIdx(idx)}
                    className={`h-2 rounded-full transition ${
                      idx === introIdx ? "w-6 bg-white" : "w-2 bg-white/40"
                    }`}
                  />
                ))}
              </div>
              <div className="text-center text-xs text-white/65">左右滑动可切换引导页</div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={back}>
                  上一步
                </Button>
                <Button onClick={next}>下一步</Button>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card title="给你的一封信" subtitle="来自心安小指南">
            <div className="grid gap-3">
              <div className="rounded-3xl border border-white/14 bg-white/8 p-4 text-sm leading-relaxed text-white/85">
                嗨，{name || "你"}：
                <br />
                欢迎来到 FavorMe。这里不会给你压力，也不会用夸张结论吓你。
                <br />
                我们只做三件小事：帮你整理情绪、给你可执行建议、提醒你看见生活里的小确幸。
                <br />
                愿你在每一次犹豫里，都能温柔地找到方向。
                <br />
                —— 心安小指南
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={back}>
                  上一步
                </Button>
                <Button onClick={next}>下一步</Button>
              </div>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card title="开始你的治愈之旅" subtitle="已完成新手引导">
            <div className="grid gap-3">
              <div className="rounded-3xl border border-white/14 bg-white/8 p-4 text-sm text-white/85">
                <div>欢迎你，{name}。</div>
                <div className="mt-2">接下来你可以查看今日运势，也可以进入心安指南获得专属建议。</div>
                <div className="mt-2 text-white/70">
                  已记录：{zodiac || "星座待识别"} {mbti ? `· ${mbti}` : ""}{" "}
                  {birthTime ? `· ${birthTime}` : ""}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={back}>
                  上一步
                </Button>
                <Button disabled={!canNextInfo} onClick={commit}>
                  完成并进入首页
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
