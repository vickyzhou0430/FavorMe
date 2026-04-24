export type Gender = "female" | "male" | "other";

export type FocusArea = "career" | "relationship" | "wealth" | "wellbeing";

export type UserProfile = {
  userId: string;
  /** 登录手机号，作为多账号隔离与持久化的主键（演示环境） */
  phone?: string;
  name: string;
  birthday: string; // YYYY-MM-DD
  gender: Gender;
  avatar?: string;
  account?: string;
  mbti?: string;
  birthTime?: string; // HH:mm
  focusArea?: FocusArea;
  onboardingDone?: boolean;
};

export const USER_STORAGE_KEY = "favor_me_user";

/** 演示环境：固定验证码 */
export const MOCK_SMS_CODE = "0430";

const PHONE_ACCOUNTS_KEY = "favor_me_phone_accounts";
const ACTIVE_PHONE_KEY = "favor_me_active_phone";

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "").slice(0, 11);
}

function loadPhoneAccounts(): Record<string, UserProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PHONE_ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, UserProfile> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const n = normalizeProfile(v as UserProfile & Record<string, unknown>);
      if (n) out[normalizePhone(k)] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function writePhoneAccounts(accounts: Record<string, UserProfile>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PHONE_ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * 演示登录：同一手机号始终对应同一 userId 与同一份本地档案；不同手机号互相隔离。
 */
export function loginOrLoadPhoneAccount(phoneDigits: string): UserProfile {
  const phone = normalizePhone(phoneDigits);
  if (phone.length !== 11) {
    throw new Error("invalid_phone");
  }
  const accounts = loadPhoneAccounts();
  const existing = accounts[phone];
  if (existing) {
    const normalized = normalizeProfile(existing as UserProfile & Record<string, unknown>);
    if (!normalized) {
      delete accounts[phone];
      writePhoneAccounts(accounts);
    } else {
      accounts[phone] = normalized;
      writePhoneAccounts(accounts);
      localStorage.setItem(ACTIVE_PHONE_KEY, phone);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  }
  const userId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const created: UserProfile = {
    userId,
    phone,
    account: phone,
    name: "",
    birthday: "",
    gender: "female",
    focusArea: "career",
    onboardingDone: false,
  };
  accounts[phone] = created;
  writePhoneAccounts(accounts);
  localStorage.setItem(ACTIVE_PHONE_KEY, phone);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(created));
  return created;
}

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
    phone: parsed.phone ? normalizePhone(String(parsed.phone)) : undefined,
    name: String(parsed.name ?? ""),
    birthday: String(parsed.birthday ?? ""),
    gender,
    avatar: parsed.avatar ? String(parsed.avatar) : undefined,
    account: parsed.account ? String(parsed.account) : undefined,
    mbti: parsed.mbti ? String(parsed.mbti) : undefined,
    birthTime: parsed.birthTime ? String(parsed.birthTime) : undefined,
    focusArea,
    onboardingDone: Boolean(parsed.onboardingDone),
  };
}

export function loadUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const active = localStorage.getItem(ACTIVE_PHONE_KEY);
    if (active) {
      const accounts = loadPhoneAccounts();
      const p = normalizePhone(active);
      if (accounts[p]) {
        const normalized = normalizeProfile(accounts[p] as UserProfile & Record<string, unknown>);
        if (normalized) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
          return normalized;
        }
      }
    }
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
  let normalized = normalizeProfile(profile as UserProfile & Record<string, unknown>);
  if (!normalized) return;
  /** 已登录手机号会话：档案里必须带 phone，并写回「手机号 → 完整档案」映射 */
  const active = localStorage.getItem(ACTIVE_PHONE_KEY);
  if (active) {
    const p = normalizePhone(active);
    if (!normalized.phone) {
      normalized = { ...normalized, phone: p };
    }
  }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
  if (normalized.phone) {
    const p = normalizePhone(normalized.phone);
    const accounts = loadPhoneAccounts();
    accounts[p] = { ...normalized, phone: p };
    writePhoneAccounts(accounts);
    localStorage.setItem(ACTIVE_PHONE_KEY, p);
  }
}

export function clearUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_PHONE_KEY);
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

/** 按用户隔离的 localStorage 键（收藏、运势缓存、解读次数等均应使用） */
export function storageKeyFortuneCache(userId: string | undefined) {
  const id = userId?.trim() || "guest";
  return `favor_me_fortune_cache_v5_zh_${id}`;
}

export function storageKeyGuideDailyLimit(userId: string | undefined) {
  return `favor_me_guide_daily_limit_${userId?.trim() || "guest"}`;
}

export function storageKeyFuturePreview(userId: string | undefined) {
  return `favor_me_future_preview_${userId?.trim() || "guest"}`;
}

/** 从旧的全局 key 迁到当前 userId（仅当新 key 尚无数据时执行一次） */
export function migrateUserScopedStorage(userId: string | undefined) {
  if (typeof window === "undefined" || !userId?.trim()) return;
  const id = userId.trim();

  const fortuneNew = storageKeyFortuneCache(id);
  if (!localStorage.getItem(fortuneNew)) {
    const legacy = localStorage.getItem("favor_me_fortune_cache_v4_zh");
    if (legacy) localStorage.setItem(fortuneNew, legacy);
  }

  const limitNew = storageKeyGuideDailyLimit(id);
  if (!localStorage.getItem(limitNew)) {
    const legacy = localStorage.getItem("favor_me_guide_daily_limit");
    if (legacy) localStorage.setItem(limitNew, legacy);
  }

  const futNew = storageKeyFuturePreview(id);
  if (!localStorage.getItem(futNew)) {
    const legacy = localStorage.getItem("favor_me_future_preview_counter");
    if (legacy) localStorage.setItem(futNew, legacy);
  }
}
