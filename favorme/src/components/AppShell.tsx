"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Menu, User, Wand2, CalendarHeart, Dice5, Heart } from "lucide-react";
import { useEffect } from "react";
import { useUser } from "@/components/UserContext";

const items = [
  { href: "/fortune", label: "Fortune", icon: CalendarHeart },
  { href: "/decision", label: "Decision", icon: Dice5 },
  { href: "/board", label: "Insight", icon: Wand2 },
  { href: "/profile", label: "Me", icon: User },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated } = useUser();
  const isHandbook = pathname === "/handbook";

  useEffect(() => {
    if (pathname?.startsWith("/onboarding")) return;
    if (!hydrated) return;
    if (!user) router.replace("/onboarding");
  }, [pathname, router, user, hydrated]);

  return (
    <div className="mobile-shell relative flex flex-col">
      <div className="starfield absolute inset-0 -z-10" />
      <header className="fixed left-1/2 top-0 z-[90] w-[min(480px,100vw)] -translate-x-1/2 px-[max(14px,env(safe-area-inset-left,0px))] pr-[max(14px,env(safe-area-inset-right,0px))] pt-[calc(env(safe-area-inset-top,0px)+6px)]">
        <div className="relative flex items-center justify-between px-1 py-2">
          {isHandbook ? (
            <button
              type="button"
              aria-label="返回"
              onClick={() => router.back()}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/14 text-white/90 shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Menu"
              className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/14 text-white/90 shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
            >
              <Menu className="size-5" />
            </button>
          )}
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-[46%] text-center">
            <div className="app-h1 truncate">
              {title || "Fortune Mood"}
            </div>
            <div className="app-meta mt-0.5 truncate">
              {subtitle || "Let today’s luck land softly."}
            </div>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center gap-2">
            {!isHandbook ? (
              <Link
                href="/handbook"
                className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/14 text-white/90 shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
                aria-label="Handbook"
              >
                <Heart className="size-5" />
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <div className="h-[88px]" />

      <main className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-hidden">
        {children}
      </main>

      <nav className="mobile-nav-safe fixed bottom-0 left-1/2 z-50 w-[min(480px,100vw)] -translate-x-1/2 border-t border-white/10 bg-[rgba(8,22,86,0.88)] px-2 pt-1.5 pb-2 backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center rounded-2xl px-1.5 py-1.5 text-[10px] transition ${
                  active ? "text-white" : "text-white/72"
                }`}
              >
                <div
                  className={`mb-1 flex size-9 items-center justify-center rounded-2xl ${
                    active
                      ? "bg-[rgba(146,154,255,0.52)] shadow-[0_10px_22px_rgba(94,107,255,0.36)]"
                      : "bg-transparent"
                  }`}
                >
                  <Icon className="size-[18px]" />
                </div>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

