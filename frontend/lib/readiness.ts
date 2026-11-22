// Document readiness scoring and document ranking. Pure functions: no React, no network.
import type { Scheme } from "./schemeTypes";

export type ReadinessState = "ready" | "almost" | "started" | "not_started";

export type Readiness = { total: number; checked: number; percent: number; state: ReadinessState };

/** Normalises a document label for comparison: trimmed, lowercase, single spaces. */
export function normKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Readiness of one scheme against the documents the user has checked off. */
export function readinessFor(scheme: Scheme, checkedDocs: Set<string>): Readiness {
  const checkedKeys = new Set(Array.from(checkedDocs, normKey));
  const total = scheme.documents.length;
  const checked = scheme.documents.filter(
    (d) => checkedKeys.has(normKey(d.en)) || checkedKeys.has(normKey(d.kn)),
  ).length;
  const percent = total > 0 ? Math.round((100 * checked) / total) : 0;
  let state: ReadinessState = "not_started";
  if (total > 0 && checked === total) state = "ready";
  else if (percent >= 50) state = "almost";
  else if (checked > 0) state = "started";
  return { total, checked, percent, state };
}

/** Groups schemes by readiness state; each group is sorted by percent, highest first. */
export function groupByReadiness(
  schemes: Scheme[],
  checkedDocs: Set<string>,
): { ready: Scheme[]; almost: Scheme[]; started: Scheme[]; not_started: Scheme[] } {
  const groups = { ready: [] as Scheme[], almost: [] as Scheme[], started: [] as Scheme[], not_started: [] as Scheme[] };
  const percentOf = new Map<string, number>();
  for (const scheme of schemes) {
    const r = readinessFor(scheme, checkedDocs);
    percentOf.set(scheme.id, r.percent);
    groups[r.state].push(scheme);
  }
  const byPercent = (a: Scheme, b: Scheme) => (percentOf.get(b.id) ?? 0) - (percentOf.get(a.id) ?? 0);
  groups.ready.sort(byPercent);
  groups.almost.sort(byPercent);
  groups.started.sort(byPercent);
  groups.not_started.sort(byPercent);
  return groups;
}

/** Counts how many schemes list each document, most-used first (ties broken by name). */
export function rankDocuments(
  schemes: Scheme[],
): { doc: string; schemeCount: number; schemeIds: string[] }[] {
  const byKey = new Map<string, { doc: string; schemeIds: string[] }>();
  for (const scheme of schemes) {
    const seen = new Set<string>();
    for (const d of scheme.documents) {
      const key = normKey(d.en);
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = byKey.get(key) ?? { doc: d.en, schemeIds: [] };
      entry.schemeIds.push(scheme.id);
      byKey.set(key, entry);
    }
  }
  return Array.from(byKey.values())
    .map((e) => ({ doc: e.doc, schemeCount: e.schemeIds.length, schemeIds: e.schemeIds }))
    .sort((a, b) => b.schemeCount - a.schemeCount || a.doc.localeCompare(b.doc));
}
