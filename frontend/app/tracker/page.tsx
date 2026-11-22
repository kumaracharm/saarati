"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/LanguageProvider";
import { getScheme } from "../../lib/api";
import {
  enqueueEdit,
  getChecklist,
  getMeta,
  getTrackerState,
  saveChecklistItem,
  saveTrackerState,
  type ChecklistRecord,
} from "../../lib/offline/store";
import { SAVED_KEY, TRACKER_KEY, readJson, writeJson } from "../../lib/storage";
import type { Scheme } from "../../lib/types";

// Local to this page: the shared storage module is not changed for the tracker.
const DOCUMENTS_KEY = "entitleiq.documents";

const TRACKER_STATUSES = [
  "Saved",
  "Preparing documents",
  "Submitted",
  "Outcome received",
] as const;

type TrackerStatus = (typeof TRACKER_STATUSES)[number];

const STATUS_LABEL_KEYS: Record<TrackerStatus, string> = {
  Saved: "tracker.status.saved",
  "Preparing documents": "tracker.status.preparing",
  Submitted: "tracker.status.submitted",
  "Outcome received": "tracker.status.outcome",
};

type TrackerRecord = Record<string, TrackerStatus>;

/** Checked document names per saved scheme id. */
type DocumentRecord = Record<string, string[]>;

/** Loaded scheme per saved id; null means the scheme details could not be loaded. */
type SchemeMap = Record<string, Scheme | null>;

/** Old status values (e.g. "Not started", "Applied") are read as "Saved". */
function normalizeStatus(value: unknown): TrackerStatus {
  return TRACKER_STATUSES.find((status) => status === value) ?? "Saved";
}

/** Checklist items: official document list if present, otherwise the plain required list. */
function documentNames(scheme: Scheme): string[] {
  const fromChecklist = (scheme.documents_checklist ?? []).map((doc) => doc.name);
  if (fromChecklist.length > 0) {
    return fromChecklist;
  }
  return scheme.required_documents;
}

// Runs an IndexedDB write without ever breaking the page: failures are logged and ignored.
function persistOffline(write: () => Promise<unknown>): void {
  Promise.resolve()
    .then(write)
    .catch((err) => console.warn("[offline] tracker write not saved to IndexedDB", err));
}

async function currentCatalogueVersion(): Promise<string> {
  return (await getMeta("catalogueVersion")) ?? "";
}

export default function TrackerPage() {
  const [ready, setReady] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [tracker, setTracker] = useState<TrackerRecord>({});
  const [documents, setDocuments] = useState<DocumentRecord>({});
  const [schemes, setSchemes] = useState<SchemeMap>({});
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    const savedIds = readJson<string[]>(SAVED_KEY, []);
    const rawTracker = readJson<Record<string, unknown>>(TRACKER_KEY, {});
    const record: TrackerRecord = {};
    for (const id of Object.keys(rawTracker)) {
      record[id] = normalizeStatus(rawTracker[id]);
    }
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setIds(savedIds);
      setTracker(record);
      setDocuments(readJson<DocumentRecord>(DOCUMENTS_KEY, {}));
      setReady(true);
    });

    function loadSchemes(list: string[]) {
      Promise.allSettled(list.map((id) => getScheme(id))).then((results) => {
        if (cancelled) {
          return;
        }
        const map: SchemeMap = {};
        results.forEach((result, index) => {
          const id = list[index];
          map[id] = result.status === "fulfilled" ? result.value : null;
        });
        setSchemes(map);
      });
    }

    if (savedIds.length > 0 || Object.keys(rawTracker).length > 0) {
      loadSchemes(savedIds);
    } else {
      // localStorage is empty: hydrate from IndexedDB. Failures keep the empty state.
      (async () => {
        try {
          const rows = await getTrackerState();
          if (cancelled || rows.length === 0) {
            return;
          }
          const hydratedIds = rows.map((row) => row.schemeId);
          const hydratedTracker: TrackerRecord = {};
          for (const row of rows) {
            hydratedTracker[row.schemeId] = normalizeStatus(row.status);
          }
          const checklists = await Promise.all(
            hydratedIds.map((id) => getChecklist(id).catch((): ChecklistRecord[] => [])),
          );
          if (cancelled) {
            return;
          }
          const hydratedDocs: DocumentRecord = {};
          hydratedIds.forEach((id, index) => {
            hydratedDocs[id] = checklists[index]
              .filter((item) => item.checked)
              .map((item) => item.documentId);
          });
          setIds(hydratedIds);
          setTracker(hydratedTracker);
          setDocuments(hydratedDocs);
          writeJson(SAVED_KEY, hydratedIds);
          writeJson(TRACKER_KEY, hydratedTracker);
          writeJson(DOCUMENTS_KEY, hydratedDocs);
          loadSchemes(hydratedIds);
        } catch (err) {
          console.warn("[offline] could not hydrate tracker", err);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function removeScheme(id: string) {
    const nextIds = ids.filter((item) => item !== id);
    const nextTracker: TrackerRecord = { ...tracker };
    delete nextTracker[id];
    const nextDocuments: DocumentRecord = { ...documents };
    delete nextDocuments[id];
    setIds(nextIds);
    setTracker(nextTracker);
    setDocuments(nextDocuments);
    writeJson(SAVED_KEY, nextIds);
    writeJson(TRACKER_KEY, nextTracker);
    writeJson(DOCUMENTS_KEY, nextDocuments);
    // Removal is queued for sync; the store has no delete call for tracker rows.
    persistOffline(async () =>
      enqueueEdit({
        entity: "tracker",
        entityId: id,
        payload: { removed: true },
        catalogueVersion: await currentCatalogueVersion(),
        baseVersion: null,
      }),
    );
  }

  function changeStatus(id: string, value: TrackerStatus) {
    const nextTracker: TrackerRecord = { ...tracker, [id]: value };
    setTracker(nextTracker);
    writeJson(TRACKER_KEY, nextTracker);
    persistOffline(() => saveTrackerState(id, value, null, ""));
  }

  function toggleDocument(id: string, name: string, checked: boolean) {
    const current = documents[id] ?? [];
    const next = checked
      ? current.includes(name)
        ? current
        : [...current, name]
      : current.filter((item) => item !== name);
    const nextDocuments: DocumentRecord = { ...documents, [id]: next };
    setDocuments(nextDocuments);
    writeJson(DOCUMENTS_KEY, nextDocuments);
    persistOffline(() => saveChecklistItem(id, name, checked));
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="status" className="text-slate-700">
          {t("tracker.loading")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          {t("tracker.heading")}
        </h1>
        <p className="text-slate-700">
          {t("tracker.storageNote")}
        </p>
      </header>

      {ids.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-slate-700">
            {t("tracker.empty")}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/profile"
              className="font-medium text-[#7f1d1d] underline hover:text-[#881337]"
            >
              {t("tracker.goProfile")}
            </Link>
            <Link
              href="/schemes"
              className="font-medium text-[#7f1d1d] underline hover:text-[#881337]"
            >
              {t("tracker.browse")}
            </Link>
          </div>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("tracker.savedHeading")}
          </h2>
          <ul className="flex flex-col gap-4">
            {ids.map((id) => {
              const loaded = Object.prototype.hasOwnProperty.call(schemes, id);
              const scheme = loaded ? schemes[id] : null;
              const status = tracker[id] ?? "Saved";
              const selectId = `status-${id}`;
              const checkedNames = documents[id] ?? [];
              const docItems = scheme ? documentNames(scheme) : [];
              return (
                <li
                  key={id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
                >
                  {!loaded ? (
                    <p className="text-slate-700">
                      {t("tracker.loadingScheme")}
                    </p>
                  ) : scheme ? (
                    <h2 className="text-lg font-semibold text-slate-900">
                      <Link
                        href={`/schemes/${id}`}
                        className="underline hover:text-[#7f1d1d]"
                      >
                        {scheme.name}
                      </Link>
                    </h2>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-slate-900">
                        <Link
                          href={`/schemes/${id}`}
                          className="underline hover:text-[#7f1d1d]"
                        >
                          {t("tracker.savedScheme")}
                        </Link>
                      </h2>
                      <p role="alert" className="text-red-800">
                        {t("tracker.loadError")}
                      </p>
                    </>
                  )}

                  {scheme ? (
                    <p className="text-slate-700">
                      {scheme.official_url ? (
                        <a
                          href={scheme.official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#7f1d1d] underline hover:text-[#881337]"
                        >
                          {t("tracker.portal")}
                        </a>
                      ) : (
                        t("tracker.notVerified")
                      )}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor={selectId}
                      className="font-medium text-slate-800"
                    >
                      {t("tracker.status")}
                    </label>
                    <select
                      id={selectId}
                      aria-label={t("tracker.statusLabel").replace(
                        "{name}",
                        scheme?.name ?? id,
                      )}
                      value={status}
                      onChange={(event) =>
                        changeStatus(id, normalizeStatus(event.target.value))
                      }
                      className="rounded-md border border-slate-500 bg-white px-2 py-1 text-slate-900"
                    >
                      {TRACKER_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {t(STATUS_LABEL_KEYS[option])}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeScheme(id)}
                      className="rounded-md border border-slate-500 px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100:bg-slate-800"
                    >
                      {t("tracker.remove")}
                    </button>
                  </div>

                  {scheme ? (
                    <section className="flex flex-col gap-2">
                      <h3 className="font-medium text-slate-800">
                        {t("tracker.documents")}
                      </h3>
                      {docItems.length === 0 ? (
                        <p className="text-slate-700">
                          {t("tracker.docsMissing")}
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {docItems.map((name, index) => {
                            const checkId = `doc-${id}-${index}`;
                            return (
                              <li key={checkId} className="flex items-center gap-2">
                                <input
                                  id={checkId}
                                  type="checkbox"
                                  checked={checkedNames.includes(name)}
                                  onChange={(event) =>
                                    toggleDocument(id, name, event.target.checked)
                                  }
                                  className="h-4 w-4"
                                />
                                <label
                                  htmlFor={checkId}
                                  className="text-slate-900"
                                >
                                  {name}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
