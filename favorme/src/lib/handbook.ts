export type FortuneFavorite = {
  id: string;
  userId: string;
  createdAt: string; // ISO
  date: string; // YYYY-MM-DD
  greeting: string;
  message: string;
  actions: string[];
  luckyEvents: string[];
};

export type GuideFavorite = {
  id: string;
  userId: string;
  createdAt: string; // ISO
  question: string;
  answerBook: string;
  emotionalInsight: string;
  actionGuide: string;
};

const MAX_ITEMS = 200;

function fortuneKey(userId: string) {
  return `favor_me_fortune_favorites_${userId}`;
}

function guideKey(userId: string) {
  return `favor_me_guide_favorites_${userId}`;
}

function loadList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ITEMS)));
}

export function loadFortuneFavorites(userId: string): FortuneFavorite[] {
  return loadList<FortuneFavorite>(fortuneKey(userId));
}

export function addFortuneFavorite(
  userId: string,
  item: Omit<FortuneFavorite, "userId">,
): FortuneFavorite[] {
  const list = loadFortuneFavorites(userId);
  const deduped = list.filter((it) => it.date !== item.date);
  const next: FortuneFavorite[] = [{ ...item, userId }, ...deduped];
  saveList(fortuneKey(userId), next);
  return next;
}

export function removeFortuneFavorite(userId: string, id: string) {
  const list = loadFortuneFavorites(userId).filter((it) => it.id !== id);
  saveList(fortuneKey(userId), list);
  return list;
}

export function loadGuideFavorites(userId: string): GuideFavorite[] {
  return loadList<GuideFavorite>(guideKey(userId));
}

export function addGuideFavorite(userId: string, item: Omit<GuideFavorite, "userId">) {
  const list = loadGuideFavorites(userId);
  const deduped = list.filter((it) => it.id !== item.id);
  const next: GuideFavorite[] = [{ ...item, userId }, ...deduped];
  saveList(guideKey(userId), next);
  return next;
}

export function removeGuideFavorite(userId: string, id: string) {
  const list = loadGuideFavorites(userId).filter((it) => it.id !== id);
  saveList(guideKey(userId), list);
  return list;
}

