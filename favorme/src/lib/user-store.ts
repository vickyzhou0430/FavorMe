export type Gender = "female" | "male" | "other";

export type FocusArea = "career" | "relationship" | "wealth" | "wellbeing";

export type UserProfile = {
  userId: string;
  name: string;
  birthday: string; // YYYY-MM-DD
  gender: Gender;
  mbti?: string;
  birthTime?: string; // HH:mm
  focusArea?: FocusArea;
};

export const USER_STORAGE_KEY = "favor_me_user";

function migrateGender(g: unknown): Gender {
  if (g === "female" || g === "male" || g === "other") return g;
  if (g === "女") return "female";
  if (g === "男") return "male";
  if (g === "其他") return "other";
  return "female";
}

function migrateFocus(f: unknown): FocusArea {
  if (f === "career" || f === "relationship" || f === "wealth" || f === "wellbeing") return f;
  const map: Record<string, FocusArea> = {
    事业: "career",
    关系: "relationship",
    财富: "wealth",
    身心: "wellbeing",
  };
  return map[String(f)] ?? "career";
}

function normalizeProfile(parsed: Partial<UserProfile> & Record<string, unknown>): UserProfile | null {
  if (!parsed || typeof parsed !== "object") return null;

  let userId = parsed.userId as string | undefined;
  if (!userId) {
    userId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  const gender = migrateGender(parsed.gender);
  const focusArea = migrateFocus(parsed.focusArea);

  return {
    userId,
    name: String(parsed.name ?? ""),
    birthday: String(parsed.birthday ?? ""),
    gender,
    mbti: parsed.mbti ? String(parsed.mbti) : undefined,
    birthTime: parsed.birthTime ? String(parsed.birthTime) : undefined,
    focusArea,
  };
}

export function loadUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    const normalized = normalizeProfile(parsed as UserProfile & Record<string, unknown>);
    if (!normalized) return null;
    const prev = JSON.stringify(parsed);
    const next = JSON.stringify(normalized);
    if (prev !== next) saveUser(normalized);
    return normalized;
  } catch {
    return null;
  }
}

export function saveUser(profile: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
}

export function clearUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function clearAllFavorMeStorage() {
  if (typeof window === "undefined") return;
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith("favor_me_")) localStorage.removeItem(k);
  }
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function calcLifeNumber(birthday: string) {
  const digits = (birthday.match(/\d/g) || []).map((d) => Number(d));
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9) sum = String(sum).split("").reduce((a, b) => a + Number(b), 0);
  return sum === 0 ? 9 : sum;
}
