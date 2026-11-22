/**
 * SAARTHI offline IndexedDB schema and low-level transaction helpers.
 *
 * Privacy: no Aadhaar, OTP, bank account numbers, passwords, or tokens are ever stored.
 *
 * Browser-only. Nothing here touches `indexedDB` or `window` at import time;
 * all access happens inside functions after a `typeof indexedDB` check.
 */

export const DB_NAME = "saarthi-offline";
export const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens (and on first use creates/upgrades) the offline database.
 * The connection promise is cached; rejects when IndexedDB is unavailable.
 */
export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }

  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("schemes")) {
        db.createObjectStore("schemes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("profile")) {
        db.createObjectStore("profile", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("checklists")) {
        db.createObjectStore("checklists", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("tracker")) {
        db.createObjectStore("tracker", { keyPath: "schemeId" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        const queue = db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
        queue.createIndex("by_status", "sync_status", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      // Another tab is upgrading or deleting the DB: release our handle and drop the cache.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("Failed to open IndexedDB"));
    };

    req.onblocked = () => {
      console.warn("[offline] IndexedDB open is blocked by another open connection");
    };
  });

  dbPromise = pending;
  return pending;
}

/**
 * Closes the cached connection (if any) and forgets it, so the next openDb() reopens.
 * Safe to call when the database was never opened.
 */
export async function closeDb(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (!pending) return;
  try {
    const db = await pending;
    db.close();
  } catch {
    // Opening failed earlier; nothing to close.
  }
}

/**
 * Runs a single transaction over one or more stores and resolves on transaction complete.
 * If `fn` returns an IDBRequest, the resolved value is that request's result.
 */
export function transact<T = undefined>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeNames, mode);
        let result: T | undefined;

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction error"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));

        try {
          const req = fn(tx);
          if (req) {
            req.onsuccess = () => {
              result = req.result;
            };
          }
        } catch (err) {
          try {
            tx.abort();
          } catch {
            // Transaction may already be finished.
          }
          reject(err);
        }
      }),
  );
}

/**
 * Single-store convenience wrapper around `transact`.
 */
export function withStore<T = undefined>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return transact<T>(storeName, mode, (tx) => fn(tx.objectStore(storeName)));
}
