/**
 * Sync lifecycle for SAARTHI offline storage.
 *
 * Nothing in this module touches `window` or `indexedDB` at import time; browser-only
 * APIs are accessed inside functions and guarded with typeof checks.
 *
 * Note: there is no catalogue-meta endpoint on the backend, so the catalogue version is
 * derived from the schemes response (see computeCatalogueVersion).
 */

import { ApiError, getSchemes } from "../api";
import type { Scheme } from "../types";
import {
  countByStatus,
  getMeta,
  listPendingEdits,
  saveSchemes,
  setMeta,
  updateSyncOp,
  type SchemeInput,
  type SyncOp,
} from "./store";

export type SyncState = {
  online: boolean;
  lastSyncAt: string | null;
  catalogueVersion: string | null;
  serverCatalogueVersion: string | null;
  pendingCount: number;
  conflictCount: number;
  staleReasons: string[];
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type Versioned = { updated_at?: string; id: string };

function updatedAtOf(item: Versioned): string | undefined {
  return item.updated_at;
}

/**
 * Deterministic catalogue version: `${count}:${maxUpdatedAt}`.
 * There is no catalogue-meta endpoint, so this is derived from the schemes response.
 */
export function computeCatalogueVersion(schemes: Array<{ updated_at?: string; id: string }>): string {
  let maxUpdatedAt = "";
  for (const scheme of schemes) {
    const updatedAt = updatedAtOf(scheme);
    if (updatedAt && updatedAt > maxUpdatedAt) maxUpdatedAt = updatedAt;
  }
  return `${schemes.length}:${maxUpdatedAt || "unknown"}`;
}

/** Downloads the scheme catalogue into IndexedDB and records the version and sync time. */
export async function downloadCatalogue(): Promise<string> {
  const schemes: Scheme[] = await getSchemes();
  const version = computeCatalogueVersion(schemes);
  const now = new Date().toISOString();

  const records: SchemeInput[] = schemes.map((scheme) => ({
    id: scheme.id,
    data: scheme,
    catalogue_version: version,
    updated_at: updatedAtOf(scheme) ?? now,
  }));
  await saveSchemes(records);

  await setMeta("catalogueVersion", version);
  await setMeta("lastSyncAt", now);
  return version;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Reconciles pending local edits against the server.
 * - Scheme ops are compared with the server scheme of the same id.
 * - Other entities have no server endpoint yet, so they are local-only.
 * Conflicts are flagged, never overwritten. Network failures skip the run without
 * changing any sync status.
 */
export async function reconcile(): Promise<{ applied: number; conflicts: number; skipped: boolean }> {
  if (!isOnline()) return { applied: 0, conflicts: 0, skipped: true };

  try {
    const schemes: Scheme[] = await getSchemes();
    const serverVersion = computeCatalogueVersion(schemes);
    const schemeById = new Map<string, Scheme>(schemes.map((s) => [s.id, s]));

    const pending: SyncOp[] = await listPendingEdits();
    let applied = 0;
    let conflicts = 0;

    for (const op of pending) {
      if (op.id === undefined) continue;

      let conflict: boolean;
      if (op.entity === "scheme") {
        const serverValue = schemeById.get(op.entityId) ?? null;
        const differs = JSON.stringify(serverValue) !== JSON.stringify(op.payload);
        conflict = serverVersion !== op.baseVersion && differs;
      } else {
        // No server endpoint for this entity yet: local-only, safe only if the base is current.
        conflict = !(op.baseVersion === null || op.baseVersion === serverVersion);
      }

      if (conflict) {
        await updateSyncOp(op.id, { sync_status: "conflict" });
        conflicts += 1;
      } else {
        await updateSyncOp(op.id, { sync_status: "synced" });
        applied += 1;
      }
    }

    await setMeta("lastSyncAt", new Date().toISOString());
    await setMeta("catalogueVersion", serverVersion);
    return { applied, conflicts, skipped: false };
  } catch (err) {
    if (err instanceof ApiError && err.kind === "network") {
      return { applied: 0, conflicts: 0, skipped: true };
    }
    throw err;
  }
}

/**
 * Reads the current sync state. Pass `serverVersion` when it is known (e.g. from a
 * recent reconcile or a schemes fetch) to get a stale reason when local data differs.
 */
export async function getSyncState(serverVersion?: string): Promise<SyncState> {
  const [lastSyncAt, catalogueVersion, pendingCount, conflictCount] = await Promise.all([
    getMeta("lastSyncAt"),
    getMeta("catalogueVersion"),
    countByStatus("pending"),
    countByStatus("conflict"),
  ]);

  const online = isOnline();
  const staleReasons: string[] = [];

  if (!online) staleReasons.push("Device is offline");
  if (serverVersion !== undefined && serverVersion !== catalogueVersion) {
    staleReasons.push("Local catalogue version differs from the server");
  }
  if (lastSyncAt === null) {
    staleReasons.push("Catalogue data was never synced");
  } else {
    const parsed = Date.parse(lastSyncAt);
    if (!Number.isNaN(parsed) && Date.now() - parsed > SEVEN_DAYS_MS) {
      staleReasons.push("Last sync is older than 7 days");
    }
  }

  return {
    online,
    lastSyncAt,
    catalogueVersion,
    serverCatalogueVersion: serverVersion ?? null,
    pendingCount,
    conflictCount,
    staleReasons,
  };
}

/**
 * Starts the browser sync lifecycle. Runs reconcile on start (when online) and on every
 * "online" event, calling onChange with fresh state; "offline" emits state immediately.
 * Returns a cleanup function that removes the listeners.
 */
export function startSyncLifecycle(onChange: (s: SyncState) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let active = true;

  const emit = async (): Promise<void> => {
    try {
      const state = await getSyncState();
      if (active) onChange(state);
    } catch (err) {
      console.warn("[offline] could not read sync state", err);
    }
  };

  const runSync = async (): Promise<void> => {
    try {
      await reconcile();
    } catch (err) {
      console.warn("[offline] reconcile failed", err);
    }
    await emit();
  };

  const handleOnline = () => {
    void runSync();
  };
  const handleOffline = () => {
    void emit();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  if (navigator.onLine) void runSync();

  return () => {
    active = false;
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
