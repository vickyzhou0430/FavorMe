export type DeepInsightRecord = {
  id: string;
  userId: string;
  createdAt: string; // ISO
  dump: string;
  cognitive_upgrade: string;
  risk_avoidance: string;
  future_seed: string;
  one_small_step: string;
};

function keyForUser(userId: string) {
  return `favor_me_handbook_${userId}`;
}

export function loadHandbook(userId: string): DeepInsightRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeepInsightRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHandbook(userId: string, items: DeepInsightRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyForUser(userId), JSON.stringify(items.slice(0, 200)));
}

export function addRecord(userId: string, record: Omit<DeepInsightRecord, "userId">) {
  const list = loadHandbook(userId);
  const next: DeepInsightRecord[] = [{ ...record, userId }, ...list].slice(0, 200);
  saveHandbook(userId, next);
  return next;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = (day + 6) % 7; // Monday=0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function weeklySummary(userId: string, now = new Date()) {
  const items = loadHandbook(userId);
  const start = startOfWeek(now).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  const count = items.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= start && t < end;
  }).length;
  const compound = Math.min(99, Math.round(count * 6)); // demo：每次转化 +6%
  return { count, compoundPercent: compound };
}

