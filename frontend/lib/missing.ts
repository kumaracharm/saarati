import type { MatchResponse, Scheme } from "./types";

export interface MissingFieldHint {
  field: string;
  schemeNames: string[];
}

// Lists the profile fields that block potential matches: mandatory rules whose outcome is UNKNOWN.
// The field name comes from the scheme's own rule definition, not from RuleResult.
export function missingFieldsForPotential(
  matches: MatchResponse | null,
  schemes: Scheme[],
): MissingFieldHint[] {
  if (matches === null) {
    return [];
  }

  const schemeNamesByField = new Map<string, Set<string>>();

  for (const match of matches.potential_match) {
    const scheme = schemes.find((candidate) => candidate.id === match.scheme_id);
    if (scheme === undefined) {
      continue;
    }
    for (const result of match.rule_results) {
      if (result.outcome !== "UNKNOWN" || !result.mandatory) {
        continue;
      }
      const rule = scheme.eligibility_rules.find((candidate) => candidate.id === result.rule_id);
      if (rule === undefined) {
        continue;
      }
      const names = schemeNamesByField.get(rule.field) ?? new Set<string>();
      names.add(match.scheme_name);
      schemeNamesByField.set(rule.field, names);
    }
  }

  return Array.from(schemeNamesByField, ([field, names]) => ({
    field,
    schemeNames: Array.from(names),
  })).sort(
    (a, b) =>
      b.schemeNames.length - a.schemeNames.length || a.field.localeCompare(b.field),
  );
}
