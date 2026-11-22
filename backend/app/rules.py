"""Deterministic rule engine for EntitleIQ.

This module evaluates a ``StudentProfile`` against scholarship schemes using
only explicit, machine-checkable rules. There is no AI or probabilistic logic
here: the same inputs always produce the same outputs.

Core principles:

* Missing data never causes a FAIL. A rule whose profile field is empty yields
  UNKNOWN, and the scheme is reported as a potential match instead.
* Optional rules are reported for transparency but never change the overall
  scheme status.
* Results are phrased as observations about the information the student
  entered, never as a promise of eligibility or approval.
"""

from enum import Enum
from typing import Any

from app.models import (
    EligibilityRule,
    MatchResponse,
    MatchStatus,
    RuleOperator,
    RuleOutcome,
    RuleResult,
    Scheme,
    SchemeMatch,
    StudentProfile,
)

DISCLAIMER = (
    "This is not an official eligibility decision. "
    "Check the official notice before applying."
)

PROFILE_FIELDS: set[str] = set(StudentProfile.model_fields)

_NOT_APPLICABLE_REASON = (
    "This condition does not apply to the information you entered."
)
_NO_MANDATORY_REASON = "No mandatory conditions could be checked."

_STATUS_EXPLANATIONS: dict[MatchStatus, str] = {
    MatchStatus.LIKELY_ELIGIBLE: (
        "Based on the information you entered, this scheme appears to match. "
        "This is not a guarantee of approval."
    ),
    MatchStatus.POTENTIAL_MATCH: (
        "This scheme may match, but some required information is missing. "
        "Add the missing details to check."
    ),
    MatchStatus.NOT_MATCHED: (
        "Based on the information you entered, one or more required "
        "conditions are not met."
    ),
}


def _profile_value(profile: StudentProfile, field: str) -> Any:
    """Return the value of a profile field in a form suitable for comparison.

    Enum members are converted to their ``.value`` string so they can be
    compared directly with the plain values stored on rules.

    Args:
        profile: The student profile to read from.
        field: Name of a ``StudentProfile`` field.

    Returns:
        The field value, with enum members replaced by their string value.
        ``None`` when the student has not provided the field.
    """
    value = getattr(profile, field)
    if isinstance(value, Enum):
        return value.value
    return value


def _result(rule: EligibilityRule, outcome: RuleOutcome, reason: str) -> RuleResult:
    """Build a ``RuleResult`` for ``rule`` with the given outcome and reason.

    Args:
        rule: The rule that was evaluated.
        outcome: The outcome of the evaluation.
        reason: Human-readable explanation for the outcome.

    Returns:
        A ``RuleResult`` carrying the rule's id, description and mandatory flag.
    """
    return RuleResult(
        rule_id=rule.id,
        description=rule.description,
        outcome=outcome,
        mandatory=rule.mandatory,
        reason=reason,
    )


def _applies(rule: EligibilityRule, profile: StudentProfile) -> bool:
    """Decide whether a rule's ``applies_when`` preconditions hold.

    Each ``(key, expected)`` pair is checked against the profile. If the
    student's value is known and differs from ``expected``, the rule does not
    apply. If the student's value is unknown, the rule still applies: the
    engine does not guess.

    Args:
        rule: The rule whose ``applies_when`` conditions are checked.
        profile: The student profile to check against.

    Returns:
        ``False`` if a known profile value contradicts a precondition,
        otherwise ``True``.
    """
    if rule.applies_when is None:
        return True
    for key, expected in rule.applies_when.items():
        actual = _profile_value(profile, key) if key in PROFILE_FIELDS else None
        if actual is not None and actual != expected:
            return False
    return True


def _check_operator(rule: EligibilityRule, value: Any) -> bool:
    """Apply the rule's operator to a known profile value.

    Comparisons between incomparable types (for example ``int`` and ``None``)
    are treated as a failed condition rather than raising an exception.

    Args:
        rule: The rule supplying the operator and the expected value.
        value: The student's known (non-None) value for ``rule.field``.

    Returns:
        ``True`` if the condition holds, otherwise ``False``.
    """
    operator = rule.operator
    try:
        if operator == RuleOperator.EQUALS:
            return bool(value == rule.value)
        if operator == RuleOperator.IN:
            return bool(value in rule.value)
        if operator == RuleOperator.GTE:
            return bool(value >= rule.value)
        if operator == RuleOperator.LTE:
            return bool(value <= rule.value)
        if operator == RuleOperator.BOOLEAN_TRUE:
            return value is True
    except TypeError:
        return False
    return False


def evaluate_rule(rule: EligibilityRule, profile: StudentProfile) -> RuleResult:
    """Evaluate a single eligibility rule against a student profile.

    Evaluation proceeds in four steps:

    1. If ``rule.applies_when`` is set and a known profile value contradicts
       it, the result is NOT_APPLICABLE.
    2. If the profile value for ``rule.field`` is missing, the result is
       UNKNOWN, using ``rule.reason_unknown``. Missing data never produces FAIL.
    3. The rule's operator (equals, in, gte, lte, boolean_true) is applied.
       Incomparable types count as a failed condition.
    4. The result is PASS (``rule.reason_pass``) or FAIL (``rule.reason_fail``).

    Safeguard: ``officially_certified_category`` is only ever read from its own
    profile field. It is never derived from any other field, a name, or a
    community. A student's self-described community, surname, or similar
    information must not be used to infer a certified category.

    Args:
        rule: The eligibility rule to evaluate.
        profile: The student profile to evaluate against.

    Returns:
        A ``RuleResult`` describing the outcome and its reason.
    """
    if not _applies(rule, profile):
        return _result(rule, RuleOutcome.NOT_APPLICABLE, _NOT_APPLICABLE_REASON)

    value = _profile_value(profile, rule.field)
    if value is None:
        return _result(rule, RuleOutcome.UNKNOWN, rule.reason_unknown)

    if _check_operator(rule, value):
        return _result(rule, RuleOutcome.PASS, rule.reason_pass)
    return _result(rule, RuleOutcome.FAIL, rule.reason_fail)


def evaluate_scheme(scheme: Scheme, profile: StudentProfile) -> SchemeMatch:
    """Evaluate every rule of a scheme and derive its overall match status.

    Status is determined only by mandatory rules that were actually checked
    (outcome is not NOT_APPLICABLE):

    * Any mandatory FAIL gives ``NOT_MATCHED``.
    * Otherwise, if there are no checked mandatory rules, the status is
      ``POTENTIAL_MATCH``. A scheme with nothing to check is never reported
      as likely eligible.
    * Otherwise, any mandatory UNKNOWN gives ``POTENTIAL_MATCH``.
    * Otherwise the status is ``LIKELY_ELIGIBLE``.

    Optional rules are evaluated and reported but never change the status.

    Args:
        scheme: The scheme whose rules are evaluated.
        profile: The student profile to evaluate against.

    Returns:
        A ``SchemeMatch`` with the status, explanation and per-rule results.
    """
    rule_results = [evaluate_rule(rule, profile) for rule in scheme.eligibility_rules]
    checked_mandatory = [
        result
        for result in rule_results
        if result.mandatory and result.outcome != RuleOutcome.NOT_APPLICABLE
    ]

    if any(result.outcome == RuleOutcome.FAIL for result in checked_mandatory):
        status = MatchStatus.NOT_MATCHED
        explanation = _STATUS_EXPLANATIONS[status]
    elif not checked_mandatory:
        status = MatchStatus.POTENTIAL_MATCH
        explanation = _NO_MANDATORY_REASON
    elif any(result.outcome == RuleOutcome.UNKNOWN for result in checked_mandatory):
        status = MatchStatus.POTENTIAL_MATCH
        explanation = _STATUS_EXPLANATIONS[status]
    else:
        status = MatchStatus.LIKELY_ELIGIBLE
        explanation = _STATUS_EXPLANATIONS[status]

    return SchemeMatch(
        scheme_id=scheme.id,
        scheme_name=scheme.name,
        is_demonstration=scheme.is_demonstration,
        status=status,
        explanation=explanation,
        rule_results=rule_results,
        track=scheme.track or "UNKNOWN",
    )


def match_profile(profile: StudentProfile, schemes: list[Scheme]) -> MatchResponse:
    """Evaluate a profile against many schemes and group the results by status.

    Args:
        profile: The student profile to evaluate.
        schemes: Schemes to evaluate. Input order is preserved within each group.

    Returns:
        A ``MatchResponse`` containing the disclaimer and the matches grouped
        into ``likely_eligible``, ``potential_match`` and ``not_matched``.
    """
    likely_eligible: list[SchemeMatch] = []
    potential_match: list[SchemeMatch] = []
    not_matched: list[SchemeMatch] = []

    for scheme in schemes:
        match = evaluate_scheme(scheme, profile)
        if match.status == MatchStatus.LIKELY_ELIGIBLE:
            likely_eligible.append(match)
        elif match.status == MatchStatus.POTENTIAL_MATCH:
            potential_match.append(match)
        else:
            not_matched.append(match)

    return MatchResponse(
        disclaimer=DISCLAIMER,
        likely_eligible=likely_eligible,
        potential_match=potential_match,
        not_matched=not_matched,
    )



def readiness_summary(scheme: Scheme, profile: StudentProfile) -> dict[str, Any]:
    """Summarise document readiness and rule outcomes for one scheme.

    Rule outcomes come from ``evaluate_rule``; this function does not change
    how any rule is evaluated. Clause highlights are reported only when their
    rule passed for this profile.

    Args:
        scheme: The scheme to summarise.
        profile: The student profile to evaluate against.

    Returns:
        A dict with keys ``documents`` (name, status and verification of each
        checklist item), ``unknown_criteria`` (rule ids with outcome UNKNOWN),
        ``failed_criteria`` (rule ids with outcome FAIL) and
        ``matched_clauses`` (rule_id, label, excerpt and status of each clause
        highlight whose rule has outcome PASS).
    """
    results = {
        rule.id: evaluate_rule(rule, profile) for rule in scheme.eligibility_rules
    }
    documents = [
        {
            "name": item.name,
            "status": item.status,
            "verification": item.verification.value,
        }
        for item in scheme.documents_checklist
    ]
    unknown_criteria = [
        rule_id
        for rule_id, result in results.items()
        if result.outcome == RuleOutcome.UNKNOWN
    ]
    failed_criteria = [
        rule_id
        for rule_id, result in results.items()
        if result.outcome == RuleOutcome.FAIL
    ]
    matched_clauses = [
        {
            "rule_id": clause.rule_id,
            "label": clause.label,
            "excerpt": clause.excerpt,
            "status": clause.status.value,
        }
        for clause in scheme.clause_highlights
        if clause.rule_id in results
        and results[clause.rule_id].outcome == RuleOutcome.PASS
    ]
    return {
        "documents": documents,
        "unknown_criteria": unknown_criteria,
        "failed_criteria": failed_criteria,
        "matched_clauses": matched_clauses,
    }

