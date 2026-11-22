/**
 * Promise-based offline storage helpers for SAARTHI.
 * Every write is sanitized with sanitizeRecord before it reaches IndexedDB.
 * No Aadhaar, OTP, bank account numbers, passwords, or tokens are ever stored.
 */

import { closeDb, DB_NAME, transact, withStore } from "./db";
import { sanitizeRecord } from "./sanitize";

export type SyncStatus = "synced" | "pending" | "conflict" | "failed";
export type SyncEntity = "profile" | "checklist" | "tracker" | "scheme";
export type MetaKey = "lastSyncAt" | "catalogueVersion";

export interface SchemeInput {
  id: string;
  data: unknown;
  catalogue_version: string;
  updated_at: string;
}

export interface SchemeRecord {
  id: string;
  data: unknown;
  catalogue_version: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface ProfileRecord {
  key: "me";
  attributes: Record<string, unknown>;
  catalogue_version: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface ChecklistRecord {
  id: string;
  schemeId: string;
  documentId: string;
  checked: boolean;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface TrackerRecord {
  schemeId: string;
  status: string;
  reminderDate: string | null;
  notes: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface SyncOp {
  id?: number;
  entity: SyncEntity;
  entityId: string;
  payload: unknown;
  created_at: string;
  updated_at: string;
  catalogue_version: string;
  baseVersion: string | null;
  sync_status: SyncStatus;
}

export interface EnqueueEditInput {
  entity: SyncEntity;
  entityId: string;
  payload: unknown;
  catalogueVersion: string;
  baseVersion: string | null;
}

const LOCAL_STORAGE_KEYS = [
  "citizenProfile",
  "entitleiq.saved",
  "entitleiq.tracker",
  "entitleiq.theme",
  "entitleiq.documents",
];

const SESSION_STORAGE_KEYS = ["entitleiq.matches", "entitleiq.matchSource"];

function checklistId(schemeId: string, documentId: string): string {
  return `${schemeId}::${documentId}`;
}

/**
 * Queues a sync operation on an already-open transaction so that the local write and
 * its queue entry commit atomically. Returns the IDB request (its result is the new id).
 */
function queueOp(tx: IDBTransaction, input: EnqueueEditInput) {
  const now = new Date().toISOString();
  const row: SyncOp = sanitizeRecord({
    entity: input.entity,
    entityId: input.entityId,
    payload: input.payload,
    created_at: now,
    updated_at: now,
    catalogue_version: input.catalogueVersion,
    baseVersion: input.baseVersion,
    sync_status: "pending" as const,
  });
  return tx.objectStore("syncQueue").add(row);
}

/** Upserts scheme records (sync_status "synced"). */
export async function saveSchemes(records: SchemeInput[]): Promise<void> {
  const rows: SchemeRecord[] = records.map((r) =>
    sanitizeRecord({
      id: r.id,
      data: r.data,
      catalogue_version: r.catalogue_version,
      updated_at: r.updated_at,
      sync_status: "synced" as const,
    }),
  );
  await transact("schemes", "readwrite", (tx) => {
    const store = tx.objectStore("schemes");
    for (const row of rows) store.put(row);
  });
}

export async function getSchemes(): Promise<SchemeRecord[]> {
  const rows = await withStore<SchemeRecord[]>("schemes", "readonly", (s) => s.getAll());
  return rows ?? [];
}

/** Saves the profile and queues the edit in the same transaction. */
export async function saveProfile(
  attributes: Record<string, unknown>,
  catalogueVersion: string,
): Promise<void> {
  const now = new Date().toISOString();
  const row: ProfileRecord = sanitizeRecord({
    key: "me" as const,
    attributes,
    catalogue_version: catalogueVersion,
    updated_at: now,
    sync_status: "pending" as const,
  });
  await transact(["profile", "syncQueue"], "readwrite", (tx) => {
    tx.objectStore("profile").put(row);
    queueOp(tx, {
      entity: "profile",
      entityId: "me",
      payload: row.attributes,
      catalogueVersion,
      baseVersion: null,
    });
  });
}

export async function getProfile(): Promise<ProfileRecord | undefined> {
  return withStore<ProfileRecord>("profile", "readonly", (s) => s.get("me"));
}

/** Saves a checklist item and queues the edit in the same transaction. */
export async function saveChecklistItem(
  schemeId: string,
  documentId: string,
  checked: boolean,
): Promise<void> {
  const catalogueVersion = (await getMeta("catalogueVersion")) ?? "";
  const now = new Date().toISOString();
  const id = checklistId(schemeId, documentId);
  const row: ChecklistRecord = sanitizeRecord({
    id,
    schemeId,
    documentId,
    checked,
    updated_at: now,
    sync_status: "pending" as const,
  });
  await transact(["checklists", "syncQueue"], "readwrite", (tx) => {
    tx.objectStore("checklists").put(row);
    queueOp(tx, {
      entity: "checklist",
      entityId: id,
      payload: { schemeId, documentId, checked },
      catalogueVersion,
      baseVersion: null,
    });
  });
}

export async function getChecklist(schemeId: string): Promise<ChecklistRecord[]> {
  const rows = await withStore<ChecklistRecord[]>("checklists", "readonly", (s) => s.getAll());
  return (rows ?? []).filter((r) => r.schemeId === schemeId);
}

/** Saves tracker state for a scheme and queues the edit in the same transaction. */
export async function saveTrackerState(
  schemeId: string,
  status: string,
  reminderDate: string | null,
  notes: string,
): Promise<void> {
  const catalogueVersion = (await getMeta("catalogueVersion")) ?? "";
  const now = new Date().toISOString();
  const row: TrackerRecord = sanitizeRecord({
    schemeId,
    status,
    reminderDate,
    notes,
    updated_at: now,
    sync_status: "pending" as const,
  });
  await transact(["tracker", "syncQueue"], "readwrite", (tx) => {
    tx.objectStore("tracker").put(row);
    queueOp(tx, {
      entity: "tracker",
      entityId: schemeId,
      payload: { status, reminderDate, notes },
      catalogueVersion,
      baseVersion: null,
    });
  });
}

export async function getTrackerState(): Promise<TrackerRecord[]> {
  const rows = await withStore<TrackerRecord[]>("tracker", "readonly", (s) => s.getAll());
  return rows ?? [];
}

/** Queues a local edit for sync (sync_status "pending"). Returns the queue id. */
export async function enqueueEdit(op: EnqueueEditInput): Promise<number> {
  const key = await transact<IDBValidKey>("syncQueue", "readwrite", (tx) => queueOp(tx, op));
  return Number(key);
}

export async function listPendingEdits(): Promise<SyncOp[]> {
  const rows = await withStore<SyncOp[]>("syncQueue", "readonly", (s) =>
    s.index("by_status").getAll("pending"),
  );
  return rows ?? [];
}

export async function countByStatus(status: SyncStatus): Promise<number> {
  const count = await withStore<number>("syncQueue", "readonly", (s) =>
    s.index("by_status").count(status),
  );
  return count ?? 0;
}

/** Merges `patch` into an existing queue entry. No-op if the id does not exist. */
export async function updateSyncOp(id: number, patch: Partial<SyncOp>): Promise<void> {
  const cleanPatch: Partial<SyncOp> = sanitizeRecord({ ...patch });
  delete cleanPatch.id;
  await transact("syncQueue", "readwrite", (tx) => {
    const store = tx.objectStore("syncQueue");
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result as SyncOp | undefined;
      if (!current) return;
      store.put({ ...current, ...cleanPatch, id: current.id ?? id });
    };
  });
}

export async function getMeta(key: MetaKey): Promise<string | null> {
  const record = await withStore<{ key: MetaKey; value: string | null }>("meta", "readonly", (s) =>
    s.get(key),
  );
  return record?.value ?? null;
}

export async function setMeta(key: MetaKey, value: string | null): Promise<void> {
  await transact("meta", "readwrite", (tx) => {
    tx.objectStore("meta").put({ key, value });
  });
}

/**
 * Wipes all offline data on this device: closes the DB handle, deletes the IndexedDB
 * database, and removes the listed localStorage / sessionStorage keys only.
 */
export async function clearDeviceData(): Promise<void> {
  await closeDb();

  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to delete IndexedDB database"));
      req.onblocked = () => {
        console.warn("[offline] deleteDatabase is blocked; it will complete when other connections close");
        resolve();
      };
    });
  }

  if (typeof window !== "undefined") {
    try {
      if (window.localStorage) {
        for (const key of LOCAL_STORAGE_KEYS) window.localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn("[offline] could not clear localStorage", err);
    }
    try {
      if (window.sessionStorage) {
        for (const key of SESSION_STORAGE_KEYS) window.sessionStorage.removeItem(key);
      }
    } catch (err) {
      console.warn("[offline] could not clear sessionStorage", err);
    }
  }
}
