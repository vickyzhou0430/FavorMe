"use client";

import { useEffect, useMemo, useState } from "react";
import { Sun, Moon, Flame, Leaf, Star, Sparkles, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/components/UserContext";
import {
  calcLifeNumber,
  clearAllFavorMeStorage,
  type FocusArea,
  type Gender,
  type UserProfile,
} from "@/lib/user-store";

const genders: Gender[] = ["female", "male", "other"];
const focusAreas: FocusArea[] = ["career", "relationship", "wealth", "wellbeing"];

const genderLabel: Record<Gender, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
};

const focusLabel: Record<FocusArea, string> = {
  career: "Career",
  relationship: "Relationships",
  wealth: "Wealth",
  wellbeing: "Mind & body",
};

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
      <AppShell title="Energy center" subtitle="Your rhythm, gently kept.">
        <Card title="Not activated yet" subtitle="Finish onboarding first.">
          <div className="text-sm text-white/80">Go to `/onboarding` to begin.</div>
        </Card>
      </AppShell>
    );
  }

  const canSave = form.name.trim() && form.birthday.trim();
  const lifeNumber = calcLifeNumber(form.birthday);
  const LifeIcon = iconForLifeNumber(lifeNumber);

  return (
    <AppShell title="Energy center" subtitle="Your rhythm, gently kept.">
      <div className="grid gap-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-3xl bg-white/12">
                <LifeIcon className="size-7 text-white" />
              </div>
              <div>
                <div className="text-base font-semibold text-white">{form.name}</div>
                <div className="mt-1 text-xs text-white/65">
                  When: {form.birthday} {form.birthTime || "—"}
                  {form.focusArea ? ` · Focus: ${focusLabel[form.focusArea]}` : ""}
                </div>
                <div className="mt-1 text-[11px] text-white/55">User ID: {form.userId}</div>
              </div>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/85">
              <LifeIcon className="size-4" />
              Life path {lifeNumber}
            </div>
          </div>
        </Card>

        <Card title="Edit" subtitle="Update anytime—energy follows your choices.">
          <div className="grid gap-4">
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-white/90">Basics</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <div className="text-xs font-semibold text-white/70">Name</div>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
                    className="ios-input"
                  />
                </label>
                <label className="grid gap-1">
                  <div className="text-xs font-semibold text-white/70">Gender</div>
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
                <div className="text-sm font-semibold text-white/90">Time calibration</div>
                <div className="text-xs text-white/60">Changing birthday recalculates fortunes.</div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <div className="text-xs font-semibold text-white/70">Birthday</div>
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
                <div className="text-xs font-semibold text-white/70">Birth time</div>
                <input
                  type="time"
                  value={form.birthTime || ""}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, birthTime: e.target.value } : p))
                  }
                  className="ios-input"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <div className="text-sm font-semibold text-white/90">Preferences</div>
                <div className="text-xs text-white/60">Update MBTI or life focus.</div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <div className="text-xs font-semibold text-white/70">MBTI (optional)</div>
                <input
                  value={form.mbti || ""}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, mbti: e.target.value } : p))
                  }
                  className="ios-input"
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs font-semibold text-white/70">Focus</div>
                <select
                  value={form.focusArea || "career"}
                  onChange={(e) =>
                    setForm((p) =>
                      p ? { ...p, focusArea: e.target.value as FocusArea } : p,
                    )
                  }
                  className="ios-input"
                >
                  {focusAreas.map((fa) => (
                    <option key={fa} value={fa}>
                      {focusLabel[fa]}
                    </option>
                  ))}
                </select>
              </label>
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
                      mbti: form.mbti?.trim() || undefined,
                      birthTime: form.birthTime?.trim() || undefined,
                      focusArea: (form.focusArea || "career") as FocusArea,
                    };
                    updateUser(next);
                    setSaved(true);
                  }}
                >
                  Save
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
                  Reset journey
                </Button>
              </div>
              {saved && (
                <div className="text-center text-sm font-semibold text-white/90">Saved</div>
              )}
            </div>

            <div className="pt-1 text-center text-xs text-white/65">
              Data stays on this device only.
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
