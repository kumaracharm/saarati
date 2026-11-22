export type StorageKind = "local" | "session";

export const PROFILE_KEY = "citizenProfile";
export const MATCHES_KEY = "entitleiq.matches";
export const SAVED_KEY = "entitleiq.saved";
export const TRACKER_KEY = "entitleiq.tracker";
export const THEME_KEY = "entitleiq.theme";

export const TRACKER_STATUSES = [
  "Not started",
  "Preparing documents",
  "Applied",
  "Awaiting result",
  "Accepted",
  "Not selected",
] as const;

export type TrackerStatus = (typeof TRACKER_STATUSES)[number];

function getStore(store: StorageKind): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return store === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    // Storage can be blocked by browser privacy settings.
    return null;
  }
}

export function readJson<T>(
  key: string,
  fallback: T,
  store: StorageKind = "local",
): T {
  const target = getStore(store);
  if (target === null) {
    return fallback;
  }
  try {
    const raw = target.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    // Missing or corrupt JSON falls back to the default value.
    return fallback;
  }
}

export function writeJson<T>(
  key: string,
  value: T,
  store: StorageKind = "local",
): void {
  const target = getStore(store);
  if (target === null) {
    return;
  }
  try {
    target.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or serialization failures are ignored; state stays in memory.
  }
}
