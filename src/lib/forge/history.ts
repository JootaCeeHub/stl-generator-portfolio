import type { GenerationRecord } from "./types";

const KEY = "aura3d.history.v1";
const MAX = 30;

export function loadHistory(): GenerationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GenerationRecord[];
  } catch {
    return [];
  }
}

export function saveHistory(items: GenerationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

export function pushHistory(item: GenerationRecord): GenerationRecord[] {
  const items = [item, ...loadHistory().filter((x) => x.id !== item.id)].slice(0, MAX);
  saveHistory(items);
  return items;
}

export function clearHistory() {
  saveHistory([]);
}
