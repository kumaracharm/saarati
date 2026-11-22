// Pure scoring engine. No React, no I/O, no network.
// Missing profile data (UNKNOWN) is never counted as passed.

import type { Profile, Scheme, Clause, Verdict } from "./schemeTypes";
import { evaluateClause, applyWhatIf } from "./matcher";

export const LIKELY_MATCH_THRESHOLD = 70;

export type RuleStatus = "matched" | "missing_info" | "not_met" | "not_applicable";

const RULE_STATUS: Record<Verdict, RuleStatus> = {
  PASS: "matched",
  UNKNOWN: "missing_info",
  FAIL: "not_met",
  NOT_APPLICABLE: "not_applicable",
};

export interface RuleResult {
  clauseId: string;
  status: RuleStatus;
  verdict: Verdict;
  field: string;
}

export interface ScoreResult {
  schemeId: string;
  percent: number;
  matched: number;
  missing: number;
  notMet: number;
  applicable: number;
  ruleResults: RuleResult[];
  likelyMatch: boolean;
}

/**
 * Builds a score from clauses and their verdicts. Pure.
 * percent = matched / applicable, where applicable excludes NOT_APPLICABLE and matched counts PASS only.
 * schemeId is empty here; scoreScheme sets it.
 */
export function rulesFromVerdicts(clauses: Clause[], verdicts: Verdict[]): ScoreResult {
  const ruleResults: RuleResult[] = clauses.map((clause, i) => {
    const verdict = verdicts[i];
    return {
      clauseId: clause.id,
      status: RULE_STATUS[verdict],
      verdict,
      field: String(clause.field),
    };
  });

  let matched = 0;
  let missing = 0;
  let notMet = 0;
  let applicable = 0;
  for (const rule of ruleResults) {
    if (rule.verdict === "NOT_APPLICABLE") continue;
    applicable += 1;
    if (rule.verdict === "PASS") matched += 1;
    else if (rule.verdict === "UNKNOWN") missing += 1;
    else if (rule.verdict === "FAIL") notMet += 1;
  }

  const percent = applicable === 0 ? 0 : Math.round((100 * matched) / applicable);
  const likelyMatch = percent >= LIKELY_MATCH_THRESHOLD && notMet === 0;

  return {
    schemeId: "",
    percent,
    matched,
    missing,
    notMet,
    applicable,
    ruleResults,
    likelyMatch,
  };
}

/** Scores one scheme against a profile. */
export function scoreScheme(scheme: Scheme, profile: Profile): ScoreResult {
  const verdicts = scheme.eligibility.map((c) => evaluateClause(c, profile));
  return { ...rulesFromVerdicts(scheme.eligibility, verdicts), schemeId: scheme.id };
}

export interface WhatIfMove {
  schemeId: string;
  before: ScoreResult;
  after: ScoreResult;
  movedIntoLikelyMatch: boolean;
}

/**
 * Targeted in-memory what-if re-run. Baseline verdicts come from the profile; after-verdicts
 * re-evaluate only clauses that read an overridden field (directly or via applies_when).
 * Returns one entry per scheme, in input order. The inputs are not mutated.
 */
export function whatIfDelta(
  schemes: Scheme[],
  profile: Profile,
  overrides: Partial<Profile>,
): WhatIfMove[] {
  const next = applyWhatIf(profile, overrides);
  const changedKeys = new Set<string>(Object.keys(overrides));

  return schemes.map((scheme) => {
    const baseVerdicts = scheme.eligibility.map((c) => evaluateClause(c, profile));
    const afterVerdicts = scheme.eligibility.map((c, i) => {
      const touched =
        changedKeys.has(String(c.field)) ||
        (c.applies_when !== undefined && changedKeys.has(String(c.applies_when.field)));
      return touched ? evaluateClause(c, next) : baseVerdicts[i];
    });

    const before: ScoreResult = { ...rulesFromVerdicts(scheme.eligibility, baseVerdicts), schemeId: scheme.id };
    const after: ScoreResult = { ...rulesFromVerdicts(scheme.eligibility, afterVerdicts), schemeId: scheme.id };

    return {
      schemeId: scheme.id,
      before,
      after,
      movedIntoLikelyMatch: !before.likelyMatch && after.likelyMatch,
    };
  });
}
