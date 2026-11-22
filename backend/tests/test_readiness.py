"""Tests for the document and clause readiness summary in ``app.rules``."""

from app.models import (
    ClauseHighlight,
    DocumentItem,
    EligibilityRule,
    ProvenanceStatus,
    RuleOperator,
    Scheme,
    StudentProfile,
    VerificationStatus,
)
from app.rules import readiness_summary


def _rule(rule_id: str, field: str, operator: RuleOperator, value: object) -> EligibilityRule:
    """Build an ``EligibilityRule`` with standard reason texts.

    Args:
        rule_id: Identifier of the rule.
        field: StudentProfile field the rule checks.
        operator: Comparison operator.
        value: Expected value for the operator.

    Returns:
        A new ``EligibilityRule``.
    """
    return EligibilityRule(
        id=rule_id,
        description=f"Test rule {rule_id}",
        field=field,
        operator=operator,
        value=value,
        mandatory=True,
        reason_pass="Condition met.",
        reason_fail="Condition not met.",
        reason_unknown="Information missing.",
    )


def _demo_scheme() -> Scheme:
    """Build a demo scheme with PASS, FAIL and UNKNOWN rules and one checklist item.

    Returns:
        A demo ``Scheme`` with one clause highlight tied to the PASS rule.
    """
    return Scheme(
        id="readiness-demo",
        name="[DEMO] Readiness Test Scheme",
        provider="Test Provider",
        jurisdiction="Test",
        academic_year="2025-26",
        eligibility_rules=[
            _rule("pass-pct", "academic_percentage", RuleOperator.GTE, 60),
            _rule("fail-gender", "gender", RuleOperator.EQUALS, "female"),
            _rule("unknown-level", "education_level", RuleOperator.IN, ["class_12"]),
        ],
        required_documents=["Marksheet"],
        application_steps=["Apply online"],
        legacy_verification_status=VerificationStatus.DEMONSTRATION,
        is_demonstration=True,
        provenance=ProvenanceStatus.DEMO,
        documents_checklist=[DocumentItem(name="Marksheet")],
        clause_highlights=[
            ClauseHighlight(rule_id="pass-pct", label="Merit threshold"),
        ],
    )


def test_readiness_lists_checklist_documents() -> None:
    """Each documents_checklist item appears in the summary with its status."""
    summary = readiness_summary(_demo_scheme(), StudentProfile(academic_percentage=75))
    assert summary["documents"] == [
        {"name": "Marksheet", "status": "required", "verification": "demo"}
    ]


def test_readiness_includes_clause_whose_rule_passed() -> None:
    """A clause highlight whose rule is PASS appears in matched_clauses."""
    summary = readiness_summary(_demo_scheme(), StudentProfile(academic_percentage=75))
    assert summary["matched_clauses"] == [
        {"rule_id": "pass-pct", "label": "Merit threshold", "excerpt": None, "status": "demo"}
    ]


def test_readiness_reports_unknown_and_failed_rules() -> None:
    """UNKNOWN rules go to unknown_criteria and FAIL rules to failed_criteria."""
    summary = readiness_summary(_demo_scheme(), StudentProfile(academic_percentage=75))
    assert summary["unknown_criteria"] == ["fail-gender", "unknown-level"]
    assert summary["failed_criteria"] == []


def test_readiness_reports_failed_rule_when_gender_differs() -> None:
    """A known contradicting value puts the rule in failed_criteria."""
    profile = StudentProfile(academic_percentage=75, gender="male")
    summary = readiness_summary(_demo_scheme(), profile)
    assert summary["failed_criteria"] == ["fail-gender"]
