"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadUser } from "@/lib/user-store";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const u = loadUser();
    if (!u) router.replace("/login");
    else if (!u.onboardingDone) router.replace("/onboarding");
    else router.replace("/fortune");
  }, [router]);

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
      <div className="starfield absolute inset-0 -z-10" />
      <div className="glass-card w-full max-w-md p-6 text-center">
        <div className="text-base font-semibold text-white">正在连接心安频道…</div>
        <div className="mt-2 text-sm text-white/70">即将进入 FavorMe</div>
      </div>
    </main>
  );
}
