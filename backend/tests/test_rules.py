"""Unit tests for the deterministic rule engine in ``app.rules``."""

import pytest
from pydantic import ValidationError

from app.models import (
    EligibilityRule,
    MatchStatus,
    RuleOperator,
    RuleOutcome,
    Scheme,
    StudentProfile,
    VerificationStatus,
)
from app.rules import evaluate_rule, evaluate_scheme


def make_rule(
    rule_id: str = "rule",
    field: str = "academic_percentage",
    operator: RuleOperator = RuleOperator.GTE,
    value: object = 60,
    mandatory: bool = True,
    applies_when: dict | None = None,
) -> EligibilityRule:
    """Build an ``EligibilityRule`` with standard reason texts.

    Args:
        rule_id: Identifier of the rule.
        field: StudentProfile field the rule checks.
        operator: Comparison operator.
        value: Expected value for the operator.
        mandatory: Whether the rule is mandatory.
        applies_when: Optional preconditions for the rule.

    Returns:
        A new ``EligibilityRule``.
    """
    return EligibilityRule(
        id=rule_id,
        description=f"Test rule {rule_id}",
        field=field,
        operator=operator,
        value=value,
        mandatory=mandatory,
        applies_when=applies_when,
        reason_pass="Condition met.",
        reason_fail="Condition not met.",
        reason_unknown="Information missing.",
    )


def make_scheme(rules: list[EligibilityRule]) -> Scheme:
    """Build a demonstration ``Scheme`` holding the given rules.

    Args:
        rules: Eligibility rules attached to the scheme.

    Returns:
        A new ``Scheme`` with ``is_demonstration`` set to True.
    """
    return Scheme(
        id="test-scheme",
        name="[DEMO] Test Scheme",
        provider="Test Provider",
        jurisdiction="Test",
        academic_year="2025-26",
        eligibility_rules=rules,
        required_documents=["Marksheet"],
        application_steps=["Apply online"],
        legacy_verification_status=VerificationStatus.DEMONSTRATION,
        is_demonstration=True,
    )


def test_gte_rule_passes_when_value_meets_threshold(
    sample_profile: StudentProfile,
) -> None:
    """A GTE 60 rule passes for a 72 percent student."""
    result = evaluate_rule(make_rule(), sample_profile)
    assert result.outcome == RuleOutcome.PASS


def test_gte_rule_fails_when_value_below_threshold() -> None:
    """A GTE 60 rule fails for a 40 percent student."""
    profile = StudentProfile(academic_percentage=40)
    result = evaluate_rule(make_rule(), profile)
    assert result.outcome == RuleOutcome.FAIL


def test_missing_field_gives_unknown_not_fail() -> None:
    """A missing profile field yields an outcome that is never FAIL."""
    result = evaluate_rule(make_rule(), StudentProfile())
    assert result.outcome is not RuleOutcome.FAIL
    assert result.outcome == RuleOutcome.UNKNOWN


def test_applies_when_contradiction_gives_not_applicable() -> None:
    """A rule gated on gender=female is not applicable to a male student."""
    rule = make_rule(
        field="academic_percentage",
        applies_when={"gender": "female"},
    )
    profile = StudentProfile(gender="male", academic_percentage=40)
    result = evaluate_rule(rule, profile)
    assert result.outcome == RuleOutcome.NOT_APPLICABLE


def test_missing_info_is_unknown_at_scheme_level() -> None:
    """A mandatory rule with missing information makes the scheme UNKNOWN-driven."""
    scheme = make_scheme([make_rule()])
    match = evaluate_scheme(scheme, StudentProfile())
    assert match.rule_results[0].outcome == RuleOutcome.UNKNOWN
    assert match.status == MatchStatus.POTENTIAL_MATCH


def test_failing_optional_rule_does_not_change_status(
    sample_profile: StudentProfile,
) -> None:
    """An optional FAIL is reported but leaves a passing scheme likely eligible."""
    scheme = make_scheme(
        [
            make_rule("mandatory-pass", value=60),
            make_rule("optional-fail", value=95, mandatory=False),
        ]
    )
    match = evaluate_scheme(scheme, sample_profile)
    optional = next(r for r in match.rule_results if r.rule_id == "optional-fail")
    assert optional.outcome == RuleOutcome.FAIL
    assert match.status == MatchStatus.LIKELY_ELIGIBLE


def test_all_mandatory_pass_gives_likely_eligible(
    sample_profile: StudentProfile,
) -> None:
    """When every mandatory rule passes, the scheme is likely eligible."""
    scheme = make_scheme(
        [
            make_rule("a", field="academic_percentage", value=60),
            make_rule(
                "b",
                field="state",
                operator=RuleOperator.EQUALS,
                value="maharashtra",
            ),
        ]
    )
    match = evaluate_scheme(scheme, sample_profile)
    assert match.status == MatchStatus.LIKELY_ELIGIBLE


def test_mandatory_unknown_without_fail_gives_potential_match() -> None:
    """A mandatory UNKNOWN with no FAIL gives potential_match."""
    scheme = make_scheme(
        [
            make_rule("known-pass", field="academic_percentage", value=60),
            make_rule(
                "unknown",
                field="state",
                operator=RuleOperator.EQUALS,
                value="maharashtra",
            ),
        ]
    )
    profile = StudentProfile(academic_percentage=72)
    match = evaluate_scheme(scheme, profile)
    assert match.status == MatchStatus.POTENTIAL_MATCH


def test_mandatory_fail_with_unknown_gives_not_matched() -> None:
    """A mandatory FAIL dominates another mandatory UNKNOWN."""
    scheme = make_scheme(
        [
            make_rule("fail", field="academic_percentage", value=60),
            make_rule(
                "unknown",
                field="state",
                operator=RuleOperator.EQUALS,
                value="maharashtra",
            ),
        ]
    )
    profile = StudentProfile(academic_percentage=40)
    match = evaluate_scheme(scheme, profile)
    assert match.status == MatchStatus.NOT_MATCHED


def test_scheme_with_zero_mandatory_rules_gives_potential_match(
    sample_profile: StudentProfile,
) -> None:
    """A scheme with nothing mandatory to check is never likely eligible."""
    scheme = make_scheme([make_rule("optional", value=60, mandatory=False)])
    match = evaluate_scheme(scheme, sample_profile)
    assert match.status == MatchStatus.POTENTIAL_MATCH


def test_certified_category_is_never_inferred() -> None:
    """officially_certified_category is UNKNOWN when the student did not give it."""
    rule = make_rule(
        "category",
        field="officially_certified_category",
        operator=RuleOperator.EQUALS,
        value="general",
    )
    profile = StudentProfile(state="maharashtra", gender="female")
    result = evaluate_rule(rule, profile)
    assert result.outcome == RuleOutcome.UNKNOWN


def test_academic_percentage_above_100_is_rejected() -> None:
    """A percentage of 150 fails profile validation."""
    with pytest.raises(ValidationError):
        StudentProfile(academic_percentage=150)


def test_negative_academic_percentage_is_rejected() -> None:
    """A percentage of -1 fails profile validation."""
    with pytest.raises(ValidationError):
        StudentProfile(academic_percentage=-1)


def test_unknown_state_is_rejected() -> None:
    """A state that is not an Indian state or union territory is rejected."""
    with pytest.raises(ValidationError):
        StudentProfile(state="atlantis")


def test_extra_profile_field_is_rejected() -> None:
    """Fields outside the declared profile schema are rejected."""
    with pytest.raises(ValidationError):
        StudentProfile(aadhaar_number="123")  # type: ignore[call-arg]
