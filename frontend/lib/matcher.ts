// Pure, deterministic rule evaluation. No React, no I/O, no randomness, no network.
// Missing profile data is always UNKNOWN, never FAIL.
// PRIVACY: never collect or store Aadhaar numbers, OTPs, passwords or bank account numbers.

import {
  DOMAIN_CATEGORY,
  type Bilingual,
  type Clause,
  type MatchStatus,
  type ProviderTrack,
  type ProviderType,
  type Profile,
  type Scheme,
  type SchemeCategory,
  type SchemeDomain,
  type Jurisdiction,
  type SchemeScope,
  type SchemeVerdict,
  type Verdict,
} from "./schemeTypes";
import { SCHEME_CATALOGUE } from "./schemeCatalogue";

export type SchemeEvaluation = {
  scheme_id: string;
  /** Scheme-level verdict: "Likely eligible" | "Needs more information" | "Not matched". */
  verdict: SchemeVerdict;
  /** Legacy label derived from verdict (Likely Eligible / Potential Match / Not Matched). */
  status: MatchStatus;
  verdicts: { clause: Clause; verdict: Verdict }[];
  reasons: Bilingual[];
  /** 0-100, copied from the scheme. */
  verification_score: number;
};

export type MatchResult = SchemeEvaluation & { scheme: Scheme };

const VERDICT_RANK: Record<SchemeVerdict, number> = {
  "Likely eligible": 0,
  "Needs more information": 1,
  "Not matched": 2,
};

const LEGACY_STATUS: Record<SchemeVerdict, MatchStatus> = {
  "Likely eligible": "Likely Eligible",
  "Needs more information": "Potential Match",
  "Not matched": "Not Matched",
};

/** Returns true when the raw profile value counts as missing. */
function isMissing(raw: unknown): boolean {
  return raw === undefined || raw === null || raw === "";
}

/**
 * Evaluates one clause against a profile.
 * - applies_when gate that fails -> NOT_APPLICABLE
 * - gate or clause data missing -> UNKNOWN
 */
export function evaluateClause(clause: Clause, profile: Profile): Verdict {
  if (clause.applies_when) {
    const gate = clause.applies_when;
    const gateRaw = profile[gate.field];
    if (isMissing(gateRaw)) return "UNKNOWN";
    const gateOk =
      gate.op === "eq"
        ? gateRaw === gate.value
        : Array.isArray(gate.value) && gate.value.includes(gateRaw);
    if (!gateOk) return "NOT_APPLICABLE";
  }

  const raw = profile[clause.field];
  if (isMissing(raw)) return "UNKNOWN";

  // A null threshold means the limit is not published in this build: report UNKNOWN, never a guess.
  if ((clause.op === "gte" || clause.op === "lte") && (clause.value === null || clause.value === undefined)) {
    return "UNKNOWN";
  }

  let ok: boolean;
  switch (clause.op) {
    case "gte":
      ok = Number(raw) >= Number(clause.value);
      break;
    case "lte":
      ok = Number(raw) <= Number(clause.value);
      break;
    case "eq":
      ok = raw === clause.value;
      break;
    case "in":
      ok = Array.isArray(clause.value) && clause.value.includes(raw);
      break;
    case "bool":
      ok = raw === clause.value;
      break;
    default:
      return "UNKNOWN";
  }
  return ok ? "PASS" : "FAIL";
}

/**
 * Evaluates a scheme. Verdict over applicable clauses (NOT_APPLICABLE ignored):
 * any FAIL -> Not matched; any UNKNOWN -> Needs more information; otherwise Likely eligible.
 * A definite FAIL is checked before UNKNOWN, so a failed clause is never masked by missing data.
 */
export function evaluateScheme(scheme: Scheme, profile: Profile): SchemeEvaluation {
  const verdicts = scheme.eligibility.map((clause) => ({
    clause,
    verdict: evaluateClause(clause, profile),
  }));
  const applicable = verdicts.filter((v) => v.verdict !== "NOT_APPLICABLE");

  let verdict: SchemeVerdict;
  if (applicable.some((v) => v.verdict === "FAIL")) {
    verdict = "Not matched";
  } else if (applicable.some((v) => v.verdict === "UNKNOWN")) {
    verdict = "Needs more information";
  } else {
    verdict = "Likely eligible";
  }

  return {
    scheme_id: scheme.id,
    verdict,
    status: LEGACY_STATUS[verdict],
    verdicts,
    reasons: scheme.eligibility.map((clause) => clause.text),
    verification_score: scheme.verification_score,
  };
}

/** Evaluates every scheme in the list. Input order is preserved. */
export function evaluateAll(schemes: Scheme[], profile: Profile): SchemeEvaluation[] {
  return schemes.map((scheme) => evaluateScheme(scheme, profile));
}

/** Evaluates all schemes and sorts: Likely eligible, then Needs more information, then Not matched; ties by name. */
export function matchAll(profile: Profile, schemes: Scheme[] = SCHEME_CATALOGUE): MatchResult[] {
  return schemes
    .map((scheme) => ({ scheme, ...evaluateScheme(scheme, profile) }))
    .sort((a, b) => {
      const byVerdict = VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
      if (byVerdict !== 0) return byVerdict;
      return a.scheme.name.en.localeCompare(b.scheme.name.en);
    });
}

const LAKH_WORDS = ["lakh", "lakhs", "lac", "lacs", "ಲಕ್ಷ"];
const CRORE_WORDS = ["crore", "crores", "ಕೋಟಿ"];

/**
 * Parses income text such as "2.5 lakh", "2,50,000", "250000", "2.5 ಲಕ್ಷ", "2 crore".
 * Returns rupees as an integer, or null if unparsable.
 */
export function parseIncomeInput(text: string): number | null {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/₹|\brs\.?|\binr\b/g, "")
    .trim();
  if (cleaned === "") return null;

  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([a-z\u0C80-\u0CFF]+)?$/);
  if (!match) return null;

  const num = Number(match[1]);
  const unit = match[2];
  let multiplier = 1;
  if (unit !== undefined) {
    if (LAKH_WORDS.includes(unit)) multiplier = 100000;
    else if (CRORE_WORDS.includes(unit)) multiplier = 10000000;
    else return null;
  }

  const value = Math.round(num * multiplier);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Returns a new profile with the what-if overrides applied. The input profile is not mutated. */
export function applyWhatIf(profile: Profile, overrides: Partial<Profile>): Profile {
  return { ...profile, ...overrides };
}

const CATEGORY_WORDS: Record<string, string> = {
  sc: "SC",
  st: "ST",
  obc: "OBC",
  gm: "GM",
  general: "GM",
  minority: "MINORITY",
};

const EDUCATION_WORDS: Record<string, string> = {
  school: "school",
  ug: "ug",
  undergraduate: "ug",
  pg: "pg",
  postgraduate: "pg",
  diploma: "diploma",
};

/**
 * Parses a what-if question such as "What if income is 2.5 lakh?" or "What if marks are 72%?".
 * Recognised: income, category, marks percentage, hostel status, education level.
 * Only fields that are found are returned.
 */
export function parseWhatIfQuery(text: string): Partial<Profile> {
  const overrides: Partial<Profile> = {};
  const lower = text.toLowerCase();

  const incomeMatch = lower.match(/income\D*?(\d[\d,.]*\s*(?:lakhs?|lacs?|crores?|ಲಕ್ಷ|ಕೋಟಿ)?)/);
  if (incomeMatch) {
    const income = parseIncomeInput(incomeMatch[1]);
    if (income !== null) overrides.annual_family_income_inr = income;
  }

  const marksMatch = lower.match(/(?:marks?|percentage|percent)\D*?(\d+(?:\.\d+)?)/);
  if (marksMatch) {
    const marks = Number(marksMatch[1]);
    if (Number.isFinite(marks) && marks >= 0 && marks <= 100) overrides.marks_percent = marks;
  }

  const categoryMatch = lower.match(/\b(sc|st|obc|gm|general|minority)\b/);
  if (categoryMatch) overrides.category = CATEGORY_WORDS[categoryMatch[1]];

  if (/\bhostel\b/.test(lower)) {
    overrides.is_hostel_resident = !/\b(not|no|non)\b/.test(lower);
  }

  if (/\bhousehold\b/.test(lower) && /\b(bpl|ration)\b/.test(lower)) {
    overrides.has_bpl_or_ration_card = !/\b(not|no|non)\b/.test(lower);
  }

  const educationMatch = lower.match(/\b(school|undergraduate|ug|postgraduate|pg|diploma)\b/);
  if (educationMatch) overrides.education_level = EDUCATION_WORDS[educationMatch[1]];

  return overrides;
}

/** Evaluates one scheme under what-if overrides. Does not change the stored profile. */
export function whatIf(scheme: Scheme, profile: Profile, overrides: Partial<Profile>): SchemeEvaluation {
  return evaluateScheme(scheme, applyWhatIf(profile, overrides));
}

export function clauseHighlightVerdict(clause: Clause, profile: Profile): Verdict {
  return evaluateClause(clause, profile);
}

/** Result of a what-if run: the baseline and changed evaluations, and which clauses moved. */
export type WhatIfResult = {
  scheme_id: string;
  overrides: Partial<Profile>;
  baseline: SchemeEvaluation;
  what_if: SchemeEvaluation;
  /** True when the scheme-level outcome label changed. */
  changed: boolean;
  changed_clauses: { clause: Clause; before: Verdict; after: Verdict }[];
};

/**
 * Evaluates one scheme before and after what-if overrides (income in rupees, marks, category,
 * hostel and household status). Returns both outcomes and whether the label changed.
 */
export function whatIfChange(scheme: Scheme, profile: Profile, overrides: Partial<Profile>): WhatIfResult {
  const baseline = evaluateScheme(scheme, profile);
  const what_if = evaluateScheme(scheme, applyWhatIf(profile, overrides));
  const changed_clauses = baseline.verdicts
    .map((b, i) => ({ clause: b.clause, before: b.verdict, after: what_if.verdicts[i].verdict }))
    .filter((c) => c.before !== c.after);
  return {
    scheme_id: scheme.id,
    overrides,
    baseline,
    what_if,
    changed: baseline.verdict !== what_if.verdict,
    changed_clauses,
  };
}

/** Provider track (display) to provider_type (internal) mapping. */
const TRACK_TO_TYPE: Record<ProviderTrack, ProviderType> = {
  Government: "government",
  "Private/CSR": "private_csr",
  "Aided/Institutional": "aided_institutional",
};

/** A single facet value, or several values that combine with OR. */
export type OneOrMany<T> = T | readonly T[];

/**
 * Facet filters. Every field is optional; an omitted or empty field does not filter.
 * Values within one facet combine with OR; different facets combine with AND.
 */
export type SchemeFilters = {
  /** Accepts the internal value or the display track name. */
  provider_type?: OneOrMany<ProviderType | ProviderTrack>;
  scope?: OneOrMany<SchemeScope>;
  category?: OneOrMany<SchemeCategory>;
  domain?: OneOrMany<SchemeDomain>;
  jurisdiction?: OneOrMany<Jurisdiction>;
};

/** Reads a map entry only for own keys, so inputs such as "constructor" never match a prototype member. */
function ownValue<V>(record: Record<string, V>, key: string): V | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** Normalises one value or a list to a list. Returns undefined when the facet is absent or empty. */
function facetList<T>(value: OneOrMany<T> | undefined): readonly T[] | undefined {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? (value as readonly T[]) : [value as T];
  return list.length > 0 ? list : undefined;
}

/** Maps a display track name to its internal provider_type; internal values pass through unchanged. */
function internalProvider(provider: ProviderType | ProviderTrack): ProviderType {
  return ownValue(TRACK_TO_TYPE as Record<string, ProviderType>, provider) ?? (provider as ProviderType);
}

/** Returns the schemes for one provider track, keeping the tracks separate. Input order is preserved. */
export function filterByProviderType(
  schemes: Scheme[],
  provider: ProviderType | ProviderTrack,
): Scheme[] {
  const internal = internalProvider(provider);
  return schemes.filter((s) => s.provider_type === internal);
}

/** Thematic category of a scheme; derived from domain when the field is absent. */
export function categoryOf(scheme: Scheme): SchemeCategory {
  return scheme.category ?? DOMAIN_CATEGORY[scheme.domain];
}

/** Applies facet filters only. Input order is preserved. */
export function filterSchemes(schemes: Scheme[], filters: SchemeFilters = {}): Scheme[] {
  const providers = facetList(filters.provider_type)?.map(internalProvider);
  const scopes = facetList(filters.scope);
  const categories = facetList(filters.category);
  const domains = facetList(filters.domain);
  const jurisdictions = facetList(filters.jurisdiction);
  return schemes.filter((s) => {
    if (providers && !providers.includes(s.provider_type)) return false;
    if (scopes && !scopes.includes(s.scope)) return false;
    if (categories && !categories.includes(categoryOf(s))) return false;
    if (domains && !domains.includes(s.domain)) return false;
    if (jurisdictions && (s.jurisdiction === undefined || !jurisdictions.includes(s.jurisdiction))) return false;
    return true;
  });
}


/** Text searched by keyword: names, summaries, issuers, documents and clause labels, in both languages. */
function searchableText(s: Scheme): string {
  const parts: string[] = [
    s.name.en,
    s.name.kn,
    s.summary.en,
    s.summary.kn,
    s.issuer.en,
    s.issuer.kn,
    s.domain,
    categoryOf(s),
    s.scope,
    s.provider_type,
    ...s.documents.flatMap((d) => [d.en, d.kn]),
    ...s.eligibility.flatMap((c) => [c.text.en, c.text.kn]),
  ];
  return parts.join(" ").toLowerCase();
}

/**
 * Keyword search plus facet filters. Every whitespace-separated query term must appear
 * (case-insensitive, English or Kannada). An empty query applies the facets only.
 */
export function searchSchemes(schemes: Scheme[], query: string, filters: SchemeFilters = {}): Scheme[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  return filterSchemes(schemes, filters).filter((s) => {
    if (terms.length === 0) return true;
    const text = searchableText(s);
    return terms.every((t) => text.includes(t));
  });
}

/** Per-scheme status. Same vocabulary as Verdict, applied to a whole scheme. */
export type SchemeStatus = Verdict;

/** User-facing label per status. Eligibility is framed as "Likely eligible", never as a guarantee. */
export const SCHEME_STATUS_LABEL: Record<SchemeStatus, string> = {
  PASS: "Likely eligible",
  UNKNOWN: "Needs more information",
  FAIL: "Not matched",
  NOT_APPLICABLE: "Not applicable to this profile",
};

/** Shown for any figure, amount or deadline the catalogue has not verified. */
export const CHECK_PORTAL_NOTE = "Check official portal";

/** What-if inputs. Omitted fields stay unknown; nothing is guessed. */
export type WhatIfInput = {
  /** Annual family income in rupees, e.g. 250000 for "2.5 lakh". */
  annual_income_inr?: number;
  /** Marks percentage, 0-100. */
  marks_percent?: number;
  /** Category code such as "SC", "ST", "OBC", "MINORITY", "GM"; "general" is accepted. */
  category?: string;
  /** Maps to the "lives in a hostel" clause. */
  needs_hostel?: boolean;
  /**
   * true: applying as a household. false: not applying as a household, so household-scope
   * schemes are NOT_APPLICABLE. Omitted: household-scope schemes are evaluated normally.
   */
  household?: boolean;
};

export type SchemeStatusResult = {
  scheme_id: string;
  status: SchemeStatus;
  label: string;
  /** True when the catalogue marks the rule, amount or deadline as unverified. */
  needs_portal_check: boolean;
  /** CHECK_PORTAL_NOTE when needs_portal_check is true, otherwise null. */
  portal_note: string | null;
};

/** Maps what-if inputs to profile fields. Only valid, supplied fields are set; the rest stay absent. */
export function profileFromWhatIfInput(input: WhatIfInput): Profile {
  const profile: Profile = {};
  const income = input.annual_income_inr;
  if (typeof income === "number" && Number.isFinite(income) && income >= 0) {
    profile.annual_family_income_inr = income;
  }
  const marks = input.marks_percent;
  if (typeof marks === "number" && Number.isFinite(marks) && marks >= 0 && marks <= 100) {
    profile.marks_percent = marks;
  }
  if (typeof input.category === "string" && input.category.trim() !== "") {
    const code = input.category.trim();
    profile.category = ownValue(CATEGORY_WORDS, code.toLowerCase()) ?? code.toUpperCase();
  }
  if (typeof input.needs_hostel === "boolean") {
    profile.is_hostel_resident = input.needs_hostel;
  }
  return profile;
}

/**
 * Deterministic status of one scheme for a profile. Exactly one of:
 * - NOT_APPLICABLE: household-scope scheme while household is explicitly false, or every clause is gated out.
 * - FAIL: an applicable clause is violated by supplied data.
 * - UNKNOWN: no violation, but an applicable clause needs data that was not supplied.
 * - PASS: every applicable clause is satisfied by supplied data.
 * A scheme with no clauses cannot be assessed and returns UNKNOWN.
 */
export function schemeStatus(scheme: Scheme, profile: Profile, household?: boolean): SchemeStatus {
  if (scheme.scope === "household" && household === false) return "NOT_APPLICABLE";
  if (scheme.eligibility.length === 0) return "UNKNOWN";
  const applicable = scheme.eligibility
    .map((clause) => evaluateClause(clause, profile))
    .filter((v) => v !== "NOT_APPLICABLE");
  if (applicable.length === 0) return "NOT_APPLICABLE";
  if (applicable.includes("FAIL")) return "FAIL";
  if (applicable.includes("UNKNOWN")) return "UNKNOWN";
  return "PASS";
}

/**
 * Status, user-facing label and portal note for one scheme under what-if inputs.
 * Pure: the base profile is not mutated and the result contains no timestamps or personal data.
 */
export function whatIfStatus(scheme: Scheme, input: WhatIfInput, base: Profile = {}): SchemeStatusResult {
  const profile = applyWhatIf(base, profileFromWhatIfInput(input));
  const status = schemeStatus(scheme, profile, input.household);
  const needs_portal_check =
    !scheme.rule_verified || !scheme.benefit.amount_verified || !scheme.deadline.verified;
  return {
    scheme_id: scheme.id,
    status,
    label: SCHEME_STATUS_LABEL[status],
    needs_portal_check,
    portal_note: needs_portal_check ? CHECK_PORTAL_NOTE : null,
  };
}
