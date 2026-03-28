"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WheelPicker } from "@/components/ui/WheelPicker";
import { useUser } from "@/components/UserContext";
import { MoonCloudHero } from "@/components/ui/MoonCloudHero";
import {
  calcLifeNumber,
  saveUser,
  type FocusArea,
  type Gender,
  type UserProfile,
} from "@/lib/user-store";
import { Sparkles, Sun, Moon, Flame, Leaf, Star } from "lucide-react";

const genders: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "She" },
  { value: "male", label: "He" },
  { value: "other", label: "They" },
];

const focusAreas: Array<{ value: FocusArea; title: string; desc: string }> = [
  { value: "career", title: "Career", desc: "Smoother progress and better openings" },
  { value: "relationship", title: "Relationships", desc: "Softer connection, freer expression" },
  { value: "wealth", title: "Wealth", desc: "Calmer building, wiser spending" },
  { value: "wellbeing", title: "Mind & body", desc: "Steadier energy, lighter rhythm" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function iconForLifeNumber(n: number) {
  if (n === 1) return Sun;
  if (n === 2) return Moon;
  if (n === 3) return Flame;
  if (n === 4) return Leaf;
  if (n === 5) return Star;
  if (n === 6) return Sparkles;
  if (n === 7) return Star;
  if (n === 8) return Flame;
  return Leaf;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, hydrated, setUser } = useUser();

  useEffect(() => {
    if (!hydrated) return;
    if (user) router.replace("/fortune");
  }, [hydrated, router, user]);

  const now = new Date();
  const years = useMemo(() => {
    const max = now.getFullYear();
    const min = max - 80;
    const opts = [];
    for (let y = max; y >= min; y--) opts.push({ value: y, label: `${y}` });
    return opts;
  }, [now]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [year, setYear] = useState(years[0]?.value ?? 2000);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [focusArea, setFocusArea] = useState<FocusArea>("career");

  const daysInMonth = useMemo(() => {
    const d = new Date(year, month, 0).getDate();
    return d;
  }, [month, year]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} mo` })),
    [],
  );
  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => ({
        value: i + 1,
        label: `${i + 1} d`,
      })),
    [daysInMonth],
  );
  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${pad2(i)} h` })),
    [],
  );
  const minutes = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ value: i, label: `${pad2(i)} m` })),
    [],
  );

  const birthday = `${year}-${pad2(month)}-${pad2(Math.min(day, daysInMonth))}`;
  const birthTime = `${pad2(hour)}:${pad2(minute)}`;
  const lifeNumber = calcLifeNumber(birthday);
  const LifeIcon = iconForLifeNumber(lifeNumber);
  const focusTitle = focusAreas.find((f) => f.value === focusArea)?.title ?? focusArea;

  function next() {
    setStep((s) => (s === 4 ? 4 : ((s + 1) as 1 | 2 | 3 | 4)));
  }
  function back() {
    setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3 | 4)));
  }

  function commit() {
    const userId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const profile: UserProfile = {
      userId,
      name: name.trim(),
      gender,
      birthday,
      birthTime,
      focusArea,
    };
    saveUser(profile);
    setUser(profile);
    router.replace("/fortune");
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
      <div className="starfield absolute inset-0 -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[460px]"
      >
        <div className="mb-4 grid gap-3">
          <div className="-translate-y-3 sm:-translate-y-5 -mb-1">
            <MoonCloudHero
              title="Onboarding"
              subtitle="Welcome to your FavorMe journey"
            />
          </div>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-sm text-white/80 backdrop-blur-xl">
              <Sparkles className="size-4 text-white" />
              Step {step} / 4
            </div>
          </div>
        </div>

        {step === 1 && (
          <Card
            title="Step 1 · Name"
            subtitle="What should the universe call you? This becomes your energy tag."
          >
            <div className="grid gap-3">
              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">Your name</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ios-input"
                  placeholder="e.g. River"
                />
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

              <div className="mt-2 flex justify-end">
                <Button disabled={!name.trim()} onClick={next}>
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card
            title="Step 2 · Time & place"
            subtitle="Pick birthday and birth time. Clearer coordinates, clearer guidance."
          >
            <div className="grid gap-3">
              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">Birthday</div>
                <div className="grid grid-cols-3 gap-2">
                  <WheelPicker
                    ariaLabel="Year"
                    value={year}
                    options={years}
                    onChange={(v) => setYear(v)}
                  />
                  <WheelPicker
                    ariaLabel="Month"
                    value={month}
                    options={months}
                    onChange={(v) => {
                      setMonth(v);
                      setDay(1);
                    }}
                  />
                  <WheelPicker
                    ariaLabel="Day"
                    value={Math.min(day, daysInMonth)}
                    options={days}
                    onChange={(v) => setDay(v)}
                  />
                </div>
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">Birth time</div>
                <div className="grid grid-cols-2 gap-2">
                  <WheelPicker
                    ariaLabel="Hour"
                    value={hour}
                    options={hours}
                    density="tight"
                    onChange={(v) => setHour(v)}
                  />
                  <WheelPicker
                    ariaLabel="Minute"
                    value={minute}
                    options={minutes}
                    density="tight"
                    onChange={(v) => setMinute(v)}
                  />
                </div>
              </label>

              <div className="glass-surface rounded-2xl p-3">
                <div className="text-sm font-semibold text-white/90">Life path number</div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/12">
                    <LifeIcon className="size-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-semibold text-white">{lifeNumber}</div>
                    <div className="text-xs text-white/65">
                      {birthday} · {birthTime}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button onClick={next}>Continue</Button>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card
            title="Step 3 · Focus"
            subtitle="Where do you want a little more cosmic bias lately? Pick one."
          >
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {focusAreas.map((fa) => {
                  const active = focusArea === fa.value;
                  return (
                    <button
                      key={fa.value}
                      type="button"
                      onClick={() => setFocusArea(fa.value)}
                      className={`rounded-3xl p-4 text-left transition ${
                        active
                          ? "border-2 border-white bg-white/[0.10] shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                          : "border border-white/[0.10] bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${active ? "text-white" : "text-white/60"}`}
                      >
                        {fa.title}
                      </div>
                      <div
                        className={`mt-1 text-xs ${active ? "text-white/75" : "text-white/45"}`}
                      >
                        {fa.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button onClick={next}>Create contract</Button>
              </div>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card
            title="Step 4 · Your card"
            subtitle="Your contract card is ready. Enter the app and start transforming."
          >
            <div className="grid gap-3">
              <div className="relative overflow-hidden rounded-3xl border border-white/14 bg-white/10 p-5">
                <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(125,93,255,0.25)] blur-3xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-24 size-64 rounded-full bg-[rgba(73,195,255,0.18)] blur-3xl" />

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug text-white sm:text-base">
                      {name.trim() || "You"}, your positive field is on
                    </div>
                    <div className="mt-2 text-sm text-white/70">
                      Life path {lifeNumber} · Focus {focusTitle}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Coordinates: {birthday} {birthTime}
                    </div>
                  </div>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-3xl bg-white/12">
                    <LifeIcon className="size-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button disabled={!name.trim()} onClick={commit}>
                  Enter
                </Button>
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </main>
  );
}
