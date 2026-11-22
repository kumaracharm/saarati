// Deterministic client-side matcher used when the backend is unavailable.
// Mirrors the backend rule semantics. It is a pure function: no storage access, no network.

import { FALLBACK_SCHEMES } from "./fallbackSchemes";
import type {
  EligibilityRule,
  MatchResponse,
  MatchStatus,
  RuleOutcome,
  RuleResult,
  Scheme,
  SchemeMatch,
  StudentProfile,
} from "./types";

export const DISCLAIMER_LOCAL =
  "This is not an official eligibility decision. Check the official notice before applying.";

const EXPLANATIONS: Record<MatchStatus, string> = {
  likely_eligible:
    "Based on the information you entered, this scheme appears to match. This is not a guarantee of approval.",
  potential_match:
    "This scheme may match, but some information is missing. Add the missing details to check.",
  not_matched: "Based on the information you entered, one or more required conditions are not met.",
};

const NO_MANDATORY_EXPLANATION =
  "No mandatory conditions could be checked. Check the official portal.";

const NOT_APPLICABLE_REASON = "This condition does not apply to your answers.";

type ProfileRecord = Record<string, unknown>;

function isNotApplicable(rule: EligibilityRule, profile: ProfileRecord): boolean {
  if (rule.applies_when === null) {
    return false;
  }
  for (const [key, expected] of Object.entries(rule.applies_when)) {
    const actual = profile[key];
    if (actual !== null && actual !== undefined && actual !== expected) {
      return true;
    }
  }
  return false;
}

function passes(rule: EligibilityRule, value: unknown): boolean {
  switch (rule.operator) {
    case "equals":
      return value === rule.value;
    case "in":
      return Array.isArray(rule.value) && rule.value.some((item: unknown) => item === value);
    case "gte":
      return typeof value === "number" && typeof rule.value === "number" && value >= rule.value;
    case "lte":
      return typeof value === "number" && typeof rule.value === "number" && value <= rule.value;
    case "boolean_true":
      return value === true;
    default:
      return false;
  }
}

function evaluateRule(
  rule: EligibilityRule,
  profile: ProfileRecord,
): { outcome: RuleOutcome; reason: string } {
  if (isNotApplicable(rule, profile)) {
    return { outcome: "NOT_APPLICABLE", reason: NOT_APPLICABLE_REASON };
  }
  const value = profile[rule.field];
  if (value === null || value === undefined) {
    return { outcome: "UNKNOWN", reason: rule.reason_unknown };
  }
  if (passes(rule, value)) {
    return { outcome: "PASS", reason: rule.reason_pass };
  }
  return { outcome: "FAIL", reason: rule.reason_fail };
}

function decideStatus(results: RuleResult[]): { status: MatchStatus; explanation: string } {
  // Optional rules and not-applicable rules never change the status.
  const checked = results.filter((r) => r.mandatory && r.outcome !== "NOT_APPLICABLE");
  if (checked.length === 0) {
    return { status: "potential_match", explanation: NO_MANDATORY_EXPLANATION };
  }
  if (checked.some((r) => r.outcome === "FAIL")) {
    return { status: "not_matched", explanation: EXPLANATIONS.not_matched };
  }
  if (checked.some((r) => r.outcome === "UNKNOWN")) {
    return { status: "potential_match", explanation: EXPLANATIONS.potential_match };
  }
  return { status: "likely_eligible", explanation: EXPLANATIONS.likely_eligible };
}

function matchScheme(scheme: Scheme, profile: ProfileRecord): SchemeMatch {
  const ruleResults: RuleResult[] = scheme.eligibility_rules.map((rule) => {
    const evaluated = evaluateRule(rule, profile);
    return {
      rule_id: rule.id,
      description: rule.description,
      outcome: evaluated.outcome,
      mandatory: rule.mandatory,
      reason: evaluated.reason,
    };
  });
  const decision = decideStatus(ruleResults);
  return {
    scheme_id: scheme.id,
    scheme_name: scheme.name,
    is_demonstration: scheme.is_demonstration,
    status: decision.status,
    explanation: decision.explanation,
    rule_results: ruleResults,
  };
}

export function matchLocally(
  profile: StudentProfile,
  schemes: Scheme[] = FALLBACK_SCHEMES,
): MatchResponse {
  const profileRecord: ProfileRecord = { ...profile };
  const matches = schemes.map((scheme) => matchScheme(scheme, profileRecord));
  return {
    disclaimer: DISCLAIMER_LOCAL,
    likely_eligible: matches.filter((m) => m.status === "likely_eligible"),
    potential_match: matches.filter((m) => m.status === "potential_match"),
    not_matched: matches.filter((m) => m.status === "not_matched"),
  };
}
