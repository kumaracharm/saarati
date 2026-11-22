"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import VoiceInput from "./VoiceInput";
import { useLanguage } from "./LanguageProvider";
import { readJson, PROFILE_KEY, MATCHES_KEY } from "../lib/storage";
import { matchLocally } from "../lib/localMatcher";
import { translate } from "../lib/i18n";

import type {
  CertifiedCategory,
  EligibilityRule,
  IncomeRange,
  MatchResponse,
  MatchStatus,
  RuleOutcome,
  RuleResult,
  Scheme,
  SchemeMatch,
  StudentProfile,
} from "../lib/types";

interface Bilingual {
  en: string;
  kn: string;
}

type IncomeUnit = "rupee" | "lakh";

interface WhatIfState {
  incomeAmount: string;
  incomeUnit: IncomeUnit;
  marks: string;
  category: CertifiedCategory | "";
}

const INITIAL_WHAT_IF: WhatIfState = {
  incomeAmount: "",
  incomeUnit: "lakh",
  marks: "",
  category: "",
};

// Kannada text: review by a Kannada speaker before release.
const INCOME_UNIT_CHOICES: ReadonlyArray<{ value: IncomeUnit; en: string; kn: string }> = [
  { value: "lakh", en: "lakhs", kn: "ಲಕ್ಷ" },
  { value: "rupee", en: "rupees", kn: "ರೂಪಾಯಿ" },
];

// Kannada text: review by a Kannada speaker before release.
const INCOME_CHOICES: ReadonlyArray<{ value: IncomeRange; en: string; kn: string }> = [
  { value: "below_2_5_lakh", en: "Below ₹2.5 lakh", kn: "₹2.5 ಲಕ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ" },
  { value: "2_5_to_5_lakh", en: "₹2.5–5 lakh", kn: "₹2.5–5 ಲಕ್ಷ" },
  { value: "5_to_8_lakh", en: "₹5–8 lakh", kn: "₹5–8 ಲಕ್ಷ" },
  { value: "above_8_lakh", en: "Above ₹8 lakh", kn: "₹8 ಲಕ್ಷಕ್ಕಿಂತ ಹೆಚ್ಚು" },
];

// Kannada text: review by a Kannada speaker before release.
const CATEGORY_CHOICES: ReadonlyArray<{ value: CertifiedCategory; en: string; kn: string }> = [
  { value: "general", en: "General", kn: "ಸಾಮಾನ್ಯ" },
  { value: "obc", en: "OBC", kn: "ಹಿಂದುಳಿದ ವರ್ಗ (OBC)" },
  { value: "sc", en: "SC", kn: "ಪರಿಶಿಷ್ಟ ಜಾತಿ (SC)" },
  { value: "st", en: "ST", kn: "ಪರಿಶಿಷ್ಟ ಪಂಗಡ (ST)" },
  { value: "ews", en: "EWS", kn: "ಆರ್ಥಿಕ ದುರ್ಬಲ ವರ್ಗ (EWS)" },
];

// Keyword groups map plain-language words to the eligibility rule field they concern.
const KEYWORD_FIELDS: ReadonlyArray<{ words: ReadonlyArray<string>; field: string }> = [
  { words: ["percentage", "marks"], field: "academic_percentage" },
  { words: ["income"], field: "family_income_range" },
  { words: ["category", "caste", "sc", "st", "obc"], field: "officially_certified_category" },
  { words: ["gender", "female"], field: "gender" },
  { words: ["state", "karnataka"], field: "state" },
  { words: ["institution", "college"], field: "institution_type" },
  { words: ["education", "class"], field: "education_level" },
];

// Kannada text: review by a Kannada speaker before release.
const OUTCOME_TEXT: Record<RuleOutcome, Bilingual> = {
  PASS: { en: "Met", kn: "ಪೂರೈಸಿದೆ" },
  FAIL: { en: "Not met", kn: "ಪೂರೈಸಿಲ್ಲ" },
  UNKNOWN: { en: "Needs more information", kn: "ಇನ್ನಷ್ಟು ಮಾಹಿತಿ ಬೇಕು" },
  NOT_APPLICABLE: { en: "Does not apply to you", kn: "ನಿಮಗೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ" },
};

// Text badges so the outcome never relies on colour alone.
const BADGE_TEXT: Record<RuleOutcome, string> = {
  PASS: "PASS",
  FAIL: "FAIL",
  UNKNOWN: "UNKNOWN",
  NOT_APPLICABLE: "NOT APPLICABLE",
};

// Kannada text: review by a Kannada speaker before release.
const VERDICTS: Record<MatchStatus, Bilingual> = {
  likely_eligible: {
    en: "Likely eligible",
    kn: "ಅರ್ಹತೆ ಇರಬಹುದು",
  },
  potential_match: { en: "Needs more information", kn: "ಇನ್ನಷ್ಟು ಮಾಹಿತಿ ಬೇಕು" },
  not_matched: { en: "Not matched", kn: "ಹೊಂದಾಣಿಕೆ ಆಗಲಿಲ್ಲ" },
};

function wordPattern(word: string): RegExp {
  return new RegExp(`\\b${word}\\b`, "i");
}

function matchRules(rules: EligibilityRule[], query: string): EligibilityRule[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }
  const hitWords: string[] = [];
  const targetFields = new Set<string>();
  for (const group of KEYWORD_FIELDS) {
    for (const word of group.words) {
      if (wordPattern(word).test(trimmed)) {
        targetFields.add(group.field);
        hitWords.push(word);
      }
    }
  }
  if (hitWords.length === 0) {
    return [];
  }
  return rules.filter((rule) => {
    if (targetFields.has(rule.field)) {
      return true;
    }
    const haystack = `${rule.id} ${rule.description} ${rule.description_kn ?? ""} ${rule.field}`;
    return hitWords.some((word) => wordPattern(word).test(haystack));
  });
}

function parseMarks(raw: string): number | null {
  if (raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return null;
  }
  return value;
}

// Maps an entered amount onto the existing income bands. Blank or invalid input returns null.
function incomeRangeFromInput(raw: string, unit: IncomeUnit): IncomeRange | null {
  if (raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  const rupees = unit === "lakh" ? value * 100000 : value;
  if (rupees < 250000) {
    return "below_2_5_lakh";
  }
  if (rupees <= 500000) {
    return "2_5_to_5_lakh";
  }
  if (rupees <= 800000) {
    return "5_to_8_lakh";
  }
  return "above_8_lakh";
}

function findSchemeMatch(response: MatchResponse | null, schemeId: string): SchemeMatch | null {
  if (!response) {
    return null;
  }
  const all = [...response.likely_eligible, ...response.potential_match, ...response.not_matched];
  return all.find((match) => match.scheme_id === schemeId) ?? null;
}

function findRuleResult(match: SchemeMatch | null, ruleId: string): RuleResult | null {
  return match?.rule_results.find((result) => result.rule_id === ruleId) ?? null;
}

function verdictText(status: MatchStatus, lang: string): string {
  const text = VERDICTS[status];
  return lang === "kn" ? text.kn : text.en;
}

function OutcomeText({ outcome, lang }: { outcome: RuleOutcome; lang: string }) {
  const text = OUTCOME_TEXT[outcome];
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="rounded border-2 border-current px-2 py-0.5 text-xs font-bold tracking-wide">
        {BADGE_TEXT[outcome]}
      </span>
      <span>{lang === "kn" ? text.kn : text.en}</span>
    </span>
  );
}

function ResultLine({ result, lang }: { result: RuleResult; lang: string }) {
  return (
    <p className="text-sm font-medium">
      <OutcomeText outcome={result.outcome} lang={lang} />
      <span className="block text-xs font-normal text-slate-700">{result.reason}</span>
    </p>
  );
}

export default function SchemeInspector({ scheme }: { scheme: Scheme }) {
  const { lang } = useLanguage();
  const searchInputId = useId();
  const incomeInputId = useId();

  const [query, setQuery] = useState("");
  const [savedProfile, setSavedProfile] = useState<StudentProfile | null>(null);
  const [savedResponse, setSavedResponse] = useState<MatchResponse | null>(null);
  const [whatIf, setWhatIf] = useState<WhatIfState>(INITIAL_WHAT_IF);

  // Saved data is read only on the client, after mount. Hypothetical data is never written back.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is client-only; reading it on mount avoids an SSR/hydration mismatch.
    setSavedProfile(readJson<StudentProfile | null>(PROFILE_KEY, null, "local"));
    setSavedResponse(readJson<MatchResponse | null>(MATCHES_KEY, null, "session"));
  }, []);

  const savedMatch = useMemo(
    () => findSchemeMatch(savedResponse, scheme.id),
    [savedResponse, scheme.id],
  );

  // What-if runs the deterministic local matcher on this one scheme. No network, no storage writes.
  // A blank or invalid income amount leaves income to the saved profile; missing data stays UNKNOWN.
  const incomeBand = incomeRangeFromInput(whatIf.incomeAmount, whatIf.incomeUnit);
  const hypoMatch = useMemo<SchemeMatch | null>(() => {
    const overrides: StudentProfile = {};
    if (incomeBand !== null) {
      overrides.family_income_range = incomeBand;
    }
    const marks = parseMarks(whatIf.marks);
    if (marks !== null) {
      overrides.academic_percentage = marks;
    }
    if (whatIf.category !== "") {
      overrides.officially_certified_category = whatIf.category;
    }
    const response = matchLocally({ ...(savedProfile ?? {}), ...overrides }, [scheme]);
    const all = [
      ...response.likely_eligible,
      ...response.potential_match,
      ...response.not_matched,
    ];
    return all[0] ?? null;
  }, [savedProfile, scheme, whatIf, incomeBand]);

  const matchedRules = useMemo(
    () => matchRules(scheme.eligibility_rules, query),
    [scheme.eligibility_rules, query],
  );

  const documents = scheme.documents_checklist ?? [];
  // Portal and verification fields are read defensively; the print notice falls back to official_url.
  const schemeExtra = scheme as Scheme & {
    official_portal_url?: string;
    last_verified_date?: string;
  };

  return (
    <div className="space-y-6">
      <section className="no-print space-y-4 rounded-lg border border-slate-300 p-4">
        <h2 className="text-lg font-semibold">{translate(lang, "search.heading")}</h2>
        <div>
          <label htmlFor={searchInputId} className="block text-sm font-medium">
            {translate(lang, "search.label")}
          </label>

          <input
            id={searchInputId}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-md border border-slate-400 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-900"
          />
        </div>
        <VoiceInput onTranscript={setQuery} />

        {query.trim() !== "" && matchedRules.length === 0 && (
          <p role="status" className="text-sm">
            {translate(lang, "search.noMatch")}
          </p>

        )}

        {matchedRules.length > 0 && (
          <div className="space-y-3">
            {savedMatch ? (
              <p className="text-sm font-medium">{verdictText(savedMatch.status, lang)}</p>
            ) : (
              <p className="text-sm">
                {translate(lang, "search.runMatch")}{" "}
                <Link
                  href="/profile"
                  className="font-medium text-[#7f1d1d] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-900"
                >
                  {translate(lang, "search.openProfile")}

                </Link>
              </p>
            )}
            <ul className="space-y-2">
              {matchedRules.map((rule) => {
                const result = findRuleResult(savedMatch, rule.id);
                return (
                  <li
                    key={rule.id}
                    className="print-highlight rounded-md border-l-4 border-rose-900 bg-rose-900 p-3 ring-2 ring-rose-900"
                  >
                    <p className="text-xs font-semibold">{translate(lang, "search.matchedQuestion")}</p>
                    <p className="text-sm">{rule.description}</p>

                    {rule.description_kn && (
                      <p className="text-sm">
                        <span className="text-xs font-medium text-slate-700">ಕನ್ನಡ: </span>
                        {rule.description_kn}
                      </p>
                    )}
                    {savedMatch &&
                      (result ? (
                        <ResultLine result={result} lang={lang} />
                      ) : (
                        <p className="text-sm text-slate-700">
                          {translate(lang, "search.notInSaved")}

                        </p>
                      ))}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <fieldset className="no-print space-y-4 rounded-lg border border-slate-300 p-4">
        <legend className="px-1 text-lg font-semibold">{translate(lang, "whatIf.heading")}</legend>


        <div className="flex flex-col gap-1 text-sm font-medium">
          <label htmlFor={incomeInputId}>{translate(lang, "whatIf.income")}</label>
          <div className="flex gap-2">
            <input
              id={incomeInputId}
              type="number"
              min={0}
              inputMode="decimal"
              value={whatIf.incomeAmount}
              onChange={(event) => {
                const next = event.target.value;
                setWhatIf((previous) => ({ ...previous, incomeAmount: next }));
              }}
              className="min-h-[44px] min-w-0 flex-1 rounded-md border border-slate-400 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-900"
            />
            <select
              aria-label={lang === "kn" ? "ಘಟಕ" : "Income unit"}
              value={whatIf.incomeUnit}
              onChange={(event) => {
                const picked = INCOME_UNIT_CHOICES.find(
                  (choice) => choice.value === event.target.value,
                );
                if (picked) {
                  setWhatIf((previous) => ({ ...previous, incomeUnit: picked.value }));
                }
              }}
              className="min-h-[44px] rounded-md border border-slate-400 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-900"
            >
              {INCOME_UNIT_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {lang === "kn" ? choice.kn : choice.en}
                </option>
              ))}
            </select>
          </div>
          {incomeBand !== null && (
            <span className="text-xs font-normal text-slate-700">
              {translate(lang, "whatIf.income")}:{" "}
              {INCOME_CHOICES.find((choice) => choice.value === incomeBand)?.[lang === "kn" ? "kn" : "en"]}
            </span>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {translate(lang, "whatIf.marks")}

          <input
            type="number"
            min={0}
            max={100}
            inputMode="decimal"
            value={whatIf.marks}
            onChange={(event) => {
              const next = event.target.value;
              setWhatIf((previous) => ({ ...previous, marks: next }));
            }}
            className="min-h-[44px] rounded-md border border-slate-400 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {translate(lang, "whatIf.category")}
          <select
            value={whatIf.category}
            onChange={(event) => {
              const picked = CATEGORY_CHOICES.find(
                (choice) => choice.value === event.target.value,
              );
              setWhatIf((previous) => ({ ...previous, category: picked?.value ?? "" }));
            }}
            className="min-h-[44px] rounded-md border border-slate-400 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-900"
          >
            <option value="">{translate(lang, "whatIf.useSaved")}</option>
            {CATEGORY_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {lang === "kn" ? choice.kn : choice.en}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 space-y-2">

          <p className="text-sm font-medium">{translate(lang, "whatIf.note")}</p>
          {hypoMatch && (
            <>
              <p className="text-sm font-medium">{verdictText(hypoMatch.status, lang)}</p>
              <ul className="space-y-2">
                {hypoMatch.rule_results.map((result) => {
                  const rule = scheme.eligibility_rules.find(
                    (candidate) => candidate.id === result.rule_id,
                  );
                  return (
                    <li
                      key={result.rule_id}
                      className="print-highlight rounded-md border-l-4 border-rose-900 bg-slate-50 p-3"
                    >
                      <p className="text-xs font-semibold">{translate(lang, "whatIf.clauseLabel")}</p>
                      <p className="text-sm">{result.description}</p>
                      {rule?.description_kn && (
                        <p className="text-sm">
                          <span className="text-xs font-medium text-slate-700">ಕನ್ನಡ: </span>
                          {rule.description_kn}
                        </p>
                      )}
                      <ResultLine result={result} lang={lang} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </fieldset>


      <div className="no-print">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[44px] rounded-md border border-slate-500 px-4 py-2 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-900"
        >
          {translate(lang, "print.button")}
        </button>
      </div>

      <section id="print-sheet" className="print-only print-sheet space-y-4">
        <h2 className="text-xl font-bold">
          {translate("en", "print.heading")} / {translate("kn", "print.heading")}
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-semibold">{translate(lang, "print.scheme")}</dt>
          <dd>{scheme.name}</dd>
          <dt className="font-semibold">{translate(lang, "print.provider")}</dt>
          <dd>{scheme.provider}</dd>
          <dt className="font-semibold">{translate(lang, "print.jurisdiction")}</dt>
          <dd>{scheme.jurisdiction}</dd>
          <dt className="font-semibold">{translate(lang, "print.officialLink")}</dt>
          <dd>{scheme.official_url || translate(lang, "provenance.check")}</dd>
          <dt className="font-semibold">{translate(lang, "print.guidePdf")}</dt>
          <dd>{scheme.guideline_pdf_url || translate(lang, "provenance.check")}</dd>
        </dl>

        <div className="print-notice space-y-1 border-y py-2 text-sm">
          <p className="font-semibold">Check official portal before applying.</p>
          <p className="text-sm">
            ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.
          </p>
          <p>
            Official portal: {schemeExtra.official_portal_url || scheme.official_url || translate(lang, "provenance.check")}
          </p>
          <p>
            Last verified: {schemeExtra.last_verified_date || translate(lang, "provenance.check")}
          </p>
        </div>

        <div className="text-sm">
          <p className="font-medium">
            {savedMatch ? VERDICTS[savedMatch.status].en : translate("en", "search.runMatch")}
          </p>
          <p>
            {savedMatch ? VERDICTS[savedMatch.status].kn : translate("kn", "search.runMatch")}
          </p>
        </div>

        <h3 className="font-semibold">{translate(lang, "print.rules")}</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-1 text-left">{translate(lang, "print.rule")}</th>
              <th className="border p-1 text-left">{translate(lang, "print.requirement")}</th>
            </tr>
          </thead>
          <tbody>
            {scheme.eligibility_rules.map((rule) => (
              <tr key={rule.id}>
                <td className="border p-1">
                  <p>{rule.description}</p>
                  {rule.description_kn && <p>{rule.description_kn}</p>}
                </td>
                <td className="border p-1">
                  {translate(lang, rule.mandatory ? "required" : "optional")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="font-semibold">{translate(lang, "print.documents")}</h3>
        {documents.length > 0 ? (
          <ul className="list-disc pl-5 text-sm">
            {documents.map((document, index) => (
              <li key={`${document.name}-${index}`}>{document.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">{translate(lang, "print.docsCheck")}</p>
        )}

        <div className="print-disclaimer space-y-1 border-t pt-3">
          <p className="text-sm font-medium">{translate("en", "print.disclaimer")}</p>
          <p className="text-sm">{translate("kn", "print.disclaimer")}</p>
        </div>
      </section>

    </div>
  );
}
