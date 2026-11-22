"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useLanguage } from "../../components/LanguageProvider";
import { MatchCard } from "../../components/MatchCard";
import { AnimatedPercent } from "../../components/AnimatedPercent";
import { matchAll } from "../../lib/matcher";
import type { MatchResult } from "../../lib/matcher";
import { LIKELY_MATCH_THRESHOLD, scoreScheme, whatIfDelta } from "../../lib/scoreEngine";
import { generateFullCatalogue } from "../../lib/schemeCatalogue";
import { rankDocuments, readinessFor } from "../../lib/readiness";
import { overlapNotes } from "../../lib/schemeGroups";
import { PORTAL_NOTE } from "../../lib/verification";
import { MATCHES_KEY, PROFILE_KEY, SAVED_KEY, readJson, writeJson } from "../../lib/storage";
import type { MatchResponse, MatchStatus, SchemeMatch } from "../../lib/types";
import type { Profile } from "../../lib/schemeTypes";

const PANEL = "rounded-xl border border-stone-200 bg-white/85 shadow-sm backdrop-blur-md";
const LINK = "text-sm font-semibold text-[#7f1d1d] underline hover:text-[#881337]";

const WHATIF_CATEGORY_OPTIONS = [
  { value: "SC", label: "SC / ಎಸ್ಸಿ" },
  { value: "ST", label: "ST / ಎಸ್ಟಿ" },
  { value: "OBC", label: "OBC / ಒಬಿಸಿ" },
  { value: "MINORITY", label: "Minority / ಅಲ್ಪಸಂಖ್ಯಾತ" },
  { value: "GM", label: "General / ಸಾಮಾನ್ಯ" },
];

type DomainKey =
  | "all"
  | "scholarship"
  | "hostel_stipend"
  | "fee_reimbursement"
  | "health_cover"
  | "insurance_protection"
  | "fellowship_skill";

const DOMAIN_TABS: ReadonlyArray<{ key: DomainKey; labelKey: string }> = [
  { key: "all", labelKey: "filter.all" },
  { key: "scholarship", labelKey: "domain.scholarship" },
  { key: "hostel_stipend", labelKey: "domain.hostel_stipend" },
  { key: "fee_reimbursement", labelKey: "domain.fee_reimbursement" },
  { key: "health_cover", labelKey: "domain.health_cover" },
  { key: "insurance_protection", labelKey: "domain.insurance_protection" },
  { key: "fellowship_skill", labelKey: "domain.fellowship_skill" },
];

function readProfile(): Profile {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? (parsed as Profile) : {};
  } catch {
    return {};
  }
}

export default function ResultsPage() {
  const { t, lang } = useLanguage();
  const [matches, setMatches] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [domain, setDomain] = useState<DomainKey>("all");
  const [selectedDocFilter, setSelectedDocFilter] = useState<string | null>(null);
  const [whatIfCategory, setWhatIfCategory] = useState<string>("");
  const [whatIfIncome, setWhatIfIncome] = useState<string>("");
  const [profile, setProfile] = useState<Profile>({});

  const fullCatalogue = useMemo(() => generateFullCatalogue(), []);
  const catalogueById = useMemo(
    () => new Map(fullCatalogue.map((scheme) => [scheme.id, scheme])),
    [fullCatalogue],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const prof = readProfile();
      setProfile(prof);
      setSavedIds(readJson<string[]>(SAVED_KEY, []));

      const storedMatches = readJson<MatchResponse | null>(MATCHES_KEY, null);
      if (storedMatches && (storedMatches.likely_eligible.length > 0 || storedMatches.potential_match.length > 0)) {
        setMatches(storedMatches);
        setLoading(false);
      } else {
        const localMatches: MatchResult[] = matchAll(prof, fullCatalogue);
        const response: MatchResponse = {
          likely_eligible: [],
          potential_match: [],
          not_matched: [],
          disclaimer: "Offline generated matches",
        };
        for (const m of localMatches) {
          const item: SchemeMatch = {
            scheme_id: m.scheme.id,
            scheme_name: lang === "kn" ? m.scheme.name.kn : m.scheme.name.en,
            status:
              m.status === "Likely Eligible"
                ? "likely_eligible"
                : m.status === "Potential Match"
                ? "potential_match"
                : "not_matched",
            rule_results: m.verdicts.map((v, i) => ({
              rule_id: m.scheme.eligibility[i]?.id ?? `rule-${i}`,
              field: String(m.scheme.eligibility[i]?.field ?? ""),
              outcome: v.verdict === "PASS" ? "PASS" : v.verdict === "FAIL" ? "FAIL" : v.verdict === "UNKNOWN" ? "UNKNOWN" : "NOT_APPLICABLE",
              mandatory: true,
              description: m.scheme.eligibility[i]?.text.en ?? "",
              reason: String(v.verdict),
            })),
            explanation: m.reasons.map((r) => (lang === "kn" ? r.kn : r.en)).join(". "),
            is_demonstration: false,
          };
          response[item.status].push(item);
        }
        setMatches(response);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fullCatalogue, lang]);

  const whatIfOverrides = useMemo(() => {
    const res: Partial<Profile> = {};
    if (whatIfCategory) res.category = whatIfCategory;
    if (whatIfIncome) res.annual_family_income_inr = Number(whatIfIncome);
    return res;
  }, [whatIfCategory, whatIfIncome]);

  const baselineById = useMemo(
    () => new Map(fullCatalogue.map((s) => [s.id, scoreScheme(s, profile)])),
    [fullCatalogue, profile],
  );

  const moveById = useMemo(
    () => new Map(whatIfDelta(fullCatalogue, profile, whatIfOverrides).map((m) => [m.schemeId, m])),
    [fullCatalogue, profile, whatIfOverrides],
  );

  // Overlap notes & document unlock leaderboard
  const overlaps = useMemo(() => overlapNotes(fullCatalogue), [fullCatalogue]);
  const topDocs = useMemo(() => rankDocuments(fullCatalogue), [fullCatalogue]);

  function toggleSave(schemeId: string) {
    const next = savedIds.includes(schemeId)
      ? savedIds.filter((id) => id !== schemeId)
      : [...savedIds, schemeId];
    setSavedIds(next);
    writeJson(SAVED_KEY, next);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = DOMAIN_TABS[(index + step + DOMAIN_TABS.length) % DOMAIN_TABS.length];
    if (next) {
      setDomain(next.key);
      document.getElementById(`domain-tab-${next.key}`)?.focus();
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="status" className="text-gray-900 font-medium">
          {t("results.loadingMatches")}
        </p>
      </main>
    );
  }

  if (!matches) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 text-gray-900">
        <h1 className="text-2xl font-bold">{t("results.noMatchesHeading")}</h1>
        <p>{t("results.noMatchesBody")}</p>
        <Link href="/profile" className={LINK}>
          {t("tracker.goProfile")}
        </Link>
      </main>
    );
  }

  // Filter helper with deduplication and document leaderboard filter
  function filterMatches(list: SchemeMatch[]): SchemeMatch[] {
    const seen = new Set<string>();
    return list.filter((m) => {
      if (seen.has(m.scheme_id)) return false;
      seen.add(m.scheme_id);

      const entry = catalogueById.get(m.scheme_id);
      if (domain !== "all" && entry && entry.domain !== domain) return false;

      if (selectedDocFilter && entry) {
        const hasDoc = entry.documents.some((d) => d.en.toLowerCase() === selectedDocFilter.toLowerCase());
        if (!hasDoc) return false;
      }
      return true;
    });
  }

  const likelyList = filterMatches(matches.likely_eligible);
  const potentialList = filterMatches(matches.potential_match);
  const notMatchedList = filterMatches(matches.not_matched);
  const totalVisible = likelyList.length + potentialList.length + notMatchedList.length;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6 text-gray-900">
      <div id="print-sheet" className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                {t("results.heading")}
              </h1>
              {selectedDocFilter && (
                <div className="flex items-center gap-2 rounded-full border border-[#7f1d1d] bg-rose-50 px-3 py-1 text-xs text-[#7f1d1d] font-semibold print:hidden">
                  <span>Filtered by document: {selectedDocFilter}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDocFilter(null)}
                    className="hover:underline font-bold"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}
            </div>

            <p
              role="note"
              className="rounded-xl border border-stone-200 border-l-4 border-l-[#7f1d1d] bg-white/85 p-4 text-sm font-medium text-gray-900 shadow-sm backdrop-blur-md"
            >
              {t("disclaimer")}
            </p>

            {/* Combined Single Filter Bar & What-If Live Simulator Row */}
            <div className={`${PANEL} p-4 flex flex-col gap-4 print:hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Live What-If:
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    Category:
                    <select
                      value={whatIfCategory}
                      onChange={(e) => setWhatIfCategory(e.target.value)}
                      className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]"
                    >
                      <option value="">(Saved Profile)</option>
                      {WHATIF_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    Income:
                    <select
                      value={whatIfIncome}
                      onChange={(e) => setWhatIfIncome(e.target.value)}
                      className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]"
                    >
                      <option value="">(Saved Profile)</option>
                      <option value="150000">₹1.5 Lakh</option>
                      <option value="250000">₹2.5 Lakh</option>
                      <option value="500000">₹5.0 Lakh</option>
                      <option value="800000">₹8.0 Lakh</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Link href="/profile" className={LINK}>
                    {t("results.editDetails")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-gray-900 hover:bg-stone-50"
                  >
                    {t("results.print")}
                  </button>
                </div>
              </div>

              {/* Compressed Domain Tabs */}
              <div
                role="tablist"
                aria-label={t("results.benefitType")}
                className="flex flex-wrap gap-1.5"
              >
                {DOMAIN_TABS.map((tab, idx) => {
                  const selected = tab.key === domain;
                  return (
                    <button
                      key={tab.key}
                      id={`domain-tab-${tab.key}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setDomain(tab.key)}
                      onKeyDown={(e) => handleTabKeyDown(e, idx)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        selected
                          ? "bg-[#7f1d1d] text-white shadow-sm"
                          : "border border-stone-200 bg-white text-gray-700 hover:bg-stone-100"
                      }`}
                    >
                      {t(tab.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Scheme Sections */}
          <div className="flex flex-col gap-8">
            {/* Likely Eligible */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h2 className="text-xl font-bold text-[#7f1d1d]">
                  {t("status.likelyEligible")} ({likelyList.length})
                </h2>
              </div>
              {likelyList.length === 0 ? (
                <p className="text-sm text-gray-600">{t("results.emptyLikely")}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {likelyList.map((match) => {
                    const entry = catalogueById.get(match.scheme_id);
                    const move = entry ? moveById.get(entry.id) : undefined;
                    const score = entry
                      ? (whatIfCategory || whatIfIncome) && move
                        ? move.after
                        : baselineById.get(entry.id)
                      : undefined;
                    return (
                      <div
                        key={match.scheme_id}
                        className={`flex flex-col gap-2 ${
                          move?.movedIntoLikelyMatch ? "score-moved" : ""
                        }`}
                      >
                        {score && (
                          <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-1.5 text-xs">
                            <span className="font-semibold text-gray-900">
                              Score: <AnimatedPercent value={score.percent} /> ({score.matched} met, {score.missing} unknown)
                            </span>
                            {score.likelyMatch && (
                              <span className="rounded bg-[#7f1d1d] px-2 py-0.5 text-[10px] font-bold text-white">
                                &gt;={LIKELY_MATCH_THRESHOLD}% Likely Match
                              </span>
                            )}
                          </div>
                        )}
                        <MatchCard
                          match={match}
                          saved={savedIds.includes(match.scheme_id)}
                          onToggleSave={toggleSave}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Potential Match */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h2 className="text-xl font-bold text-[#881337]">
                  {t("status.needsInfo")} ({potentialList.length})
                </h2>
              </div>
              {potentialList.length === 0 ? (
                <p className="text-sm text-gray-600">{t("results.emptyNeeds")}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {potentialList.map((match) => {
                    const entry = catalogueById.get(match.scheme_id);
                    const move = entry ? moveById.get(entry.id) : undefined;
                    const score = entry
                      ? (whatIfCategory || whatIfIncome) && move
                        ? move.after
                        : baselineById.get(entry.id)
                      : undefined;
                    return (
                      <div
                        key={match.scheme_id}
                        className={`flex flex-col gap-2 ${
                          move?.movedIntoLikelyMatch ? "score-moved" : ""
                        }`}
                      >
                        {score && (
                          <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-1.5 text-xs">
                            <span className="font-semibold text-gray-900">
                              Score: <AnimatedPercent value={score.percent} /> ({score.matched} met, {score.missing} missing info)
                            </span>
                          </div>
                        )}
                        <MatchCard
                          match={match}
                          saved={savedIds.includes(match.scheme_id)}
                          onToggleSave={toggleSave}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Not Matched */}
            {notMatchedList.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h2 className="text-xl font-bold text-gray-700">
                    {t("status.notMatched")} ({notMatchedList.length})
                  </h2>
                </div>
                <div className="flex flex-col gap-4">
                  {notMatchedList.map((match) => (
                    <MatchCard
                      key={match.scheme_id}
                      match={match}
                      saved={savedIds.includes(match.scheme_id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right-side Summary & Document Leaderboard Panel */}
        <aside
          aria-label="Summary and Document Priority"
          className="flex flex-col gap-4 print:hidden lg:sticky lg:top-6"
        >
          {/* Match Counts & Overview */}
          <div className={`${PANEL} p-4 flex flex-col gap-3`}>
            <h2 className="text-base font-bold text-[#7f1d1d]">Results Overview</h2>
            <div className="flex items-baseline justify-between border-b border-stone-100 pb-2">
              <span className="text-sm font-medium text-gray-700">Total Schemes</span>
              <span className="text-2xl font-black text-gray-900">{totalVisible}</span>
            </div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex justify-between">
                <span className="text-gray-700">Likely Match (&ge;70%)</span>
                <span className="font-bold text-[#7f1d1d]">{likelyList.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700">Needs More Info</span>
                <span className="font-bold text-[#881337]">{potentialList.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700">Not Matched</span>
                <span className="font-bold text-gray-600">{notMatchedList.length}</span>
              </li>
              <li className="flex justify-between border-t border-stone-100 pt-1.5">
                <span className="text-gray-700">Active Domain</span>
                <span className="font-semibold text-gray-900">{domain}</span>
              </li>
            </ul>
          </div>

          {/* High-Impact Document Unlock Leaderboard */}
          <div className={`${PANEL} p-4 flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7f1d1d]">
                Document Unlock Leaderboard
              </h3>
              {selectedDocFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedDocFilter(null)}
                  className="text-[10px] text-gray-500 underline hover:text-[#7f1d1d]"
                >
                  Clear filter
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600">
              Ranked by schemes unlocked. Click any document to filter schemes:
            </p>
            <ul className="space-y-1.5 text-xs">
              {topDocs.slice(0, 6).map((item, idx) => {
                const isSelected = selectedDocFilter?.toLowerCase() === item.doc.toLowerCase();
                return (
                  <li key={item.doc}>
                    <button
                      type="button"
                      onClick={() => setSelectedDocFilter(isSelected ? null : item.doc)}
                      className={`w-full flex items-center justify-between rounded border p-2 text-left transition-colors ${
                        isSelected
                          ? "border-[#7f1d1d] bg-rose-50/70 font-semibold text-[#7f1d1d]"
                          : "border-stone-200 bg-stone-50/70 text-gray-800 hover:bg-stone-100"
                      }`}
                    >
                      <span className="truncate pr-2">
                        {idx + 1}. {item.doc}
                      </span>
                      <span className="shrink-0 rounded bg-white border border-stone-200 px-1.5 py-0.5 text-[10px] font-bold text-[#7f1d1d]">
                        {item.schemeCount} schemes
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* State vs Central Domain Overlap Note */}
          {overlaps.length > 0 && (
            <div className={`${PANEL} p-4 flex flex-col gap-2 border-l-4 border-l-[#881337]`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#881337]">
                State vs. Central Overlap
              </h3>
              <p className="text-xs leading-relaxed text-gray-800">
                {lang === "kn" ? overlaps[0].note.kn : overlaps[0].note.en}
              </p>
            </div>
          )}

          {/* Official Portal Notice */}
          <div className={`${PANEL} p-4 text-xs text-gray-600 space-y-1`}>
            <p className="font-semibold text-gray-800">Portal Verification Note</p>
            <p>{lang === "kn" ? PORTAL_NOTE.kn : PORTAL_NOTE.en}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
