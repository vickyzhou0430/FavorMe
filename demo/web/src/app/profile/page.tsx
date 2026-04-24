"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/components/UserContext";
import {
  clearAllFavorMeStorage,
  type Gender,
  type UserProfile,
} from "@/lib/user-store";

const genders: Gender[] = ["female", "male", "other"];

const genderLabel: Record<Gender, string> = {
  female: "女",
  male: "男",
  other: "其他",
};

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

function zodiacFromBirthday(birthday: string) {
  if (!birthday) return "未填写";
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
  return ranges.find(([s, e]) => md >= s && md <= e)?.[2] || "未识别";
}

export default function ProfilePage() {
  const { user, setUser, updateUser } = useUser();
  const [form, setForm] = useState<UserProfile | null>(user);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [saved]);

  useEffect(() => {
    setForm(user);
  }, [user]);

  if (!form) {
    return (
      <AppShell title="个人信息" subtitle="你的资料会用于个性化内容生成">
        <Card title="尚未完成引导" subtitle="请先登录并填写信息">
          <div className="text-sm text-white/80">进入 `/login` 完成登录后继续。</div>
        </Card>
      </AppShell>
    );
  }

  const canSave = form.name.trim() && form.birthday.trim() && form.gender;
  const zodiac = zodiacFromBirthday(form.birthday);
  const rising = form.birthTime?.includes("子时")
    ? "摩羯上升（示例）"
    : form.birthTime
      ? "上升待计算"
      : "未填写";

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm((p) => (p ? { ...p, avatar: String(reader.result || "") } : p));
    reader.readAsDataURL(f);
  }

  return (
    <AppShell title="个人信息" subtitle="可随时编辑，主页面会自动更新">
      <div className="grid gap-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center overflow-hidden rounded-3xl bg-white/12">
                {form.avatar ? (
                  <img src={form.avatar} alt="avatar" className="size-full object-cover" />
                ) : (
                  <span className="text-xs text-white/65">头像</span>
                )}
              </div>
              <div>
                <div className="text-base font-semibold text-white">{form.name}</div>
                <div className="mt-1 text-xs text-white/65">
                  账号：{form.account || "未填写"} · 生日：{form.birthday}
                </div>
                <div className="mt-1 text-[11px] text-white/55">User ID: {form.userId}</div>
              </div>
            </div>
            <label className="cursor-pointer rounded-2xl border border-white/16 bg-white/10 px-3 py-2 text-xs text-white/90">
              更换头像
              <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
            </label>
          </div>
        </Card>

        <Card title="编辑信息" subtitle="支持修改账号、生日、性别、MBTI、出生时间">
          <div className="grid gap-4">
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-white/90">基础信息</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <div className="text-xs font-semibold text-white/70">账号</div>
                  <input
                    value={form.account || ""}
                    onChange={(e) => setForm((p) => (p ? { ...p, account: e.target.value } : p))}
                    className="ios-input"
                  />
                </label>
                <label className="grid gap-1">
                  <div className="text-xs font-semibold text-white/70">姓名</div>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
                    className="ios-input"
                  />
                </label>
                <label className="grid gap-1">
                  <div className="text-xs font-semibold text-white/70">性别</div>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm((p) => (p ? { ...p, gender: e.target.value as Gender } : p))
                    }
                    className="ios-input"
                  >
                    {genders.map((g) => (
                      <option key={g} value={g}>
                        {genderLabel[g]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <div className="text-xs font-semibold text-white/70">生日</div>
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, birthday: e.target.value } : p))
                  }
                  className="ios-input"
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs font-semibold text-white/70">出生时间（时辰）</div>
                <select
                  value={form.birthTime || ""}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, birthTime: e.target.value } : p))
                  }
                  className="ios-input"
                >
                  <option value="">请选择</option>
                  {shichenOptions.map((it) => (
                    <option key={it} value={it}>
                      {it}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="grid gap-1">
                <div className="text-xs font-semibold text-white/70">MBTI（选填）</div>
                <input
                  value={form.mbti || ""}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, mbti: e.target.value } : p))
                  }
                  className="ios-input"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/75">
              自动计算：星座 {zodiac} · 上升星座 {rising} · 生辰 {form.birthTime || "未填写"}
            </div>

            <div className="mt-2 flex w-full flex-col gap-2">
              <div className="flex w-full items-stretch gap-2">
                <Button
                  disabled={!canSave}
                  className="min-w-0 flex-1"
                  onClick={() => {
                    const next: UserProfile = {
                      ...form,
                      name: form.name.trim(),
                      birthday: form.birthday.trim(),
                      account: form.account?.trim() || undefined,
                      mbti: form.mbti?.trim() || undefined,
                      birthTime: form.birthTime?.trim() || undefined,
                      onboardingDone: true,
                    };
                    updateUser(next);
                    setSaved(true);
                  }}
                >
                  保存
                </Button>
                <Button
                  variant="ghost"
                  className="shrink-0 px-4"
                  onClick={() => {
                    clearAllFavorMeStorage();
                    setUser(null);
                  }}
                >
                  <RotateCcw className="size-4" />
                  重置全部数据
                </Button>
              </div>
              {saved && (
                <div className="text-center text-sm font-semibold text-white/90">已保存</div>
              )}
            </div>

            <div className="pt-1 text-center text-xs text-white/65">
              资料仅保存在当前设备本地，不会自动上传。
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
