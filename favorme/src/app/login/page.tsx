"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useUser } from "@/components/UserContext";
import { loginOrLoadPhoneAccount, MOCK_SMS_CODE, normalizePhone } from "@/lib/user-store";

export default function LoginPage() {
  const router = useRouter();
  const { user, hydrated, setUser } = useUser();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (user?.onboardingDone) router.replace("/fortune");
    else if (user?.phone) router.replace("/onboarding");
  }, [hydrated, router, user?.onboardingDone, user?.phone]);

  function loginWithPhone() {
    const p = normalizePhone(phone);
    if (p.length !== 11) {
      setHint("请输入 11 位手机号");
      return;
    }
    if (code !== MOCK_SMS_CODE) {
      setHint(`演示环境验证码固定为 ${MOCK_SMS_CODE}`);
      return;
    }
    try {
      const profile = loginOrLoadPhoneAccount(p);
      setUser(profile);
      setHint("");
      router.replace(profile.onboardingDone ? "/fortune" : "/onboarding");
    } catch {
      setHint("登录失败，请重试");
    }
  }

  function goDemoOther() {
    setHint("演示环境请使用手机号 + 验证码登录");
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center px-4 py-8">
      <div className="starfield absolute inset-0 -z-10" />
      <section className="glass-card grid gap-4 rounded-[28px] p-5">
        <header className="text-center">
          <h1 className="text-xl font-semibold text-white">欢迎来到 FavorMe</h1>
          <p className="mt-1 text-sm text-white/70">登录后开启你的治愈之旅</p>
        </header>

        <div className="grid gap-2">
          <label className="text-xs font-semibold text-white/75">手机号</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
            className="ios-input"
            placeholder="请输入手机号"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-semibold text-white/75">验证码（演示固定 {MOCK_SMS_CODE}）</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, MOCK_SMS_CODE.length))}
              className="ios-input"
              placeholder={`请输入 ${MOCK_SMS_CODE}`}
              inputMode="numeric"
            />
            <Button
              variant="ghost"
              className="shrink-0"
              disabled={phone.length !== 11}
              onClick={() => {
                setSent(true);
                setCode(MOCK_SMS_CODE);
              }}
            >
              {sent ? "已填入" : "获取验证码"}
            </Button>
          </div>
        </div>

        {hint ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-100">
            {hint}
          </div>
        ) : null}

        <p className="text-center text-[11px] leading-relaxed text-white/55">
          演示未接短信服务：任意 11 位手机号均可，验证码始终为 {MOCK_SMS_CODE}。不同号码为不同账号，同一号码再次登录数据保持一致。
        </p>

        <Button disabled={phone.length !== 11 || code !== MOCK_SMS_CODE} onClick={loginWithPhone}>
          手机号验证码登录
        </Button>

        <div className="relative my-1 text-center text-xs text-white/50">
          <span className="bg-[rgba(13,31,110,0.9)] px-2">或</span>
        </div>

        <div className="grid gap-2">
          <Button variant="ghost" type="button" onClick={goDemoOther}>
            微信登录
          </Button>
          <Button variant="ghost" type="button" onClick={goDemoOther}>
            Apple ID 登录
          </Button>
        </div>
      </section>
    </main>
  );
}
