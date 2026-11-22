"""Focused tests for app.engine_v2. Pure functions, no network."""

import pytest

from app.engine_v2 import (
    CATEGORIES,
    CHECK_OFFICIAL_PORTAL,
    LABEL_LIKELY,
    LABEL_NEEDS_INFO,
    LABEL_NOT_APPLICABLE,
    LABEL_NOT_MATCHED,
    SCHEMA_VERSION,
    TRACKS,
    GEO_CENTRAL,
    GEO_LOCAL,
    GEO_STATE,
    GEO_UNKNOWN,
    InvalidTrackerTransition,
    TrackerState,
    advance_tracker,
    application_guidance,
    check_catalogue_version,
    document_checklist,
    field_verification,
    geography_outcome,
    outcome_label,
    scheme_label,
    scheme_scope,
    what_if,
)
from app.models import (
    EligibilityRule,
    FieldVerification,
    FieldVerificationSet,
    FieldVerificationState,
    IndianState,
    RuleOperator,
    RuleOutcome,
    RuleResult,
    Scheme,
    StudentProfile,
)


def _gte_rule(rule_id: str = "min_percentage", value: float = 60) -> EligibilityRule:
    return EligibilityRule(
        id=rule_id,
        description="Minimum academic percentage",
        field="academic_percentage",
        operator=RuleOperator.GTE,
        value=value,
        reason_pass="Meets the minimum percentage.",
        reason_fail="Below the minimum percentage.",
        reason_unknown="Academic percentage not provided.",
    )


def _scheme(
    rules: list[EligibilityRule] | None = None,
    geography: str | None = None,
    jurisdiction: str = "India",
    required_documents: list[str] | None = None,
    **extra,
) -> Scheme:
    return Scheme(
        id="test-scheme",
        name="[DEMO] Test scheme",
        provider="Test provider",
        jurisdiction=jurisdiction,
        academic_year="2025-26",
        eligibility_rules=rules or [],
        required_documents=required_documents or [],
        application_steps=["Apply"],
        is_demonstration=True,
        geography=geography,
        **extra,
    )


def _result(outcome: RuleOutcome, mandatory: bool = True) -> RuleResult:
    return RuleResult(
        rule_id="r",
        description="rule",
        outcome=outcome,
        mandatory=mandatory,
        reason="reason",
    )


def test_category_and_track_constants():
    assert len(CATEGORIES) == 12
    assert "education" in CATEGORIES
    assert "financial_inclusion" in CATEGORIES
    assert TRACKS == ("public_institutional", "private_csr")


def test_central_scheme_applies_everywhere():
    scheme = _scheme(geography="central")
    assert scheme_scope(scheme)[0] == GEO_CENTRAL
    assert geography_outcome(scheme, StudentProfile(state=IndianState.KARNATAKA)) == (
        RuleOutcome.PASS
    )
    assert geography_outcome(scheme, StudentProfile()) == RuleOutcome.PASS


def test_state_only_scheme_is_not_applicable_to_other_state():
    scheme = _scheme(geography="maharashtra")
    assert scheme_scope(scheme) == (GEO_STATE, "maharashtra")
    other = StudentProfile(state=IndianState.KARNATAKA)
    assert geography_outcome(scheme, other) == RuleOutcome.NOT_APPLICABLE
    same = StudentProfile(state=IndianState.MAHARASHTRA)
    assert geography_outcome(scheme, same) == RuleOutcome.PASS


def test_missing_profile_state_is_unknown_not_fail():
    scheme = _scheme(geography="maharashtra")
    assert geography_outcome(scheme, StudentProfile()) == RuleOutcome.UNKNOWN


def test_local_scheme_needs_matching_state_and_district():
    scheme = _scheme(geography="local_maharashtra")
    assert scheme_scope(scheme)[0] == GEO_LOCAL
    no_district = StudentProfile(state=IndianState.MAHARASHTRA)
    assert geography_outcome(scheme, no_district) == RuleOutcome.UNKNOWN
    other_state = StudentProfile(state=IndianState.GOA)
    assert geography_outcome(scheme, other_state) == RuleOutcome.NOT_APPLICABLE


def test_unreadable_scope_is_unknown():
    scheme = _scheme(geography=None, jurisdiction="Some unrecognised body")
    assert scheme_scope(scheme) == (GEO_UNKNOWN, None)
    profile = StudentProfile(state=IndianState.GOA)
    assert geography_outcome(scheme, profile) == RuleOutcome.UNKNOWN


def test_jurisdiction_used_when_geography_missing():
    scheme = _scheme(geography=None, jurisdiction="karnataka")
    assert scheme_scope(scheme) == (GEO_STATE, "karnataka")


def test_outcome_label_mapping():
    assert outcome_label([_result(RuleOutcome.PASS)]) == LABEL_LIKELY
    assert outcome_label([_result(RuleOutcome.UNKNOWN)]) == LABEL_NEEDS_INFO
    assert outcome_label([_result(RuleOutcome.FAIL)]) == LABEL_NOT_MATCHED
    assert (
        outcome_label([_result(RuleOutcome.PASS), _result(RuleOutcome.FAIL)])
        == LABEL_NOT_MATCHED
    )
    # Optional rules never change the label.
    assert (
        outcome_label([_result(RuleOutcome.PASS), _result(RuleOutcome.FAIL, False)])
        == LABEL_LIKELY
    )
    # Nothing checked is not "likely eligible".
    assert outcome_label([_result(RuleOutcome.NOT_APPLICABLE)]) == LABEL_NEEDS_INFO


def test_missing_attributes_never_produce_not_matched():
    scheme = _scheme(rules=[_gte_rule()])
    assert scheme_label(scheme, StudentProfile()).startswith(LABEL_NEEDS_INFO)


def test_scheme_label_geography_not_applicable():
    scheme = _scheme(rules=[_gte_rule()], geography="maharashtra")
    profile = StudentProfile(state=IndianState.GOA, academic_percentage=90)
    assert scheme_label(scheme, profile) == LABEL_NOT_APPLICABLE


def test_scheme_label_adds_portal_hint_when_eligibility_unverified():
    scheme = _scheme(rules=[_gte_rule()], geography="central")
    profile = StudentProfile(academic_percentage=75)
    label = scheme_label(scheme, profile)
    assert label.startswith(LABEL_LIKELY)
    assert CHECK_OFFICIAL_PORTAL in label


def test_what_if_reports_rule_delta():
    scheme = _scheme(rules=[_gte_rule()])
    profile = StudentProfile(academic_percentage=70)
    outcome = what_if(scheme, profile, {"academic_percentage": 40})
    assert outcome["changed_fields"] == ["academic_percentage"]
    assert outcome["status_before"] == "likely_eligible"
    assert outcome["status_after"] == "not_matched"
    assert outcome["rule_deltas"] == [
        {"rule_id": "min_percentage", "before": "PASS", "after": "FAIL"}
    ]
    # The original profile is not modified.
    assert profile.academic_percentage == 70


def test_what_if_no_change_has_no_deltas():
    scheme = _scheme(rules=[_gte_rule()])
    profile = StudentProfile(academic_percentage=70)
    outcome = what_if(scheme, profile, {"academic_percentage": 80})
    assert outcome["rule_deltas"] == []


def test_what_if_rejects_unknown_or_sensitive_fields():
    scheme = _scheme(rules=[_gte_rule()])
    with pytest.raises(ValueError):
        what_if(scheme, StudentProfile(), {"aadhaar_number": "123412341234"})


def test_what_if_rejects_non_dict_changes():
    scheme = _scheme(rules=[_gte_rule()])
    with pytest.raises(TypeError):
        what_if(scheme, StudentProfile(), ["academic_percentage"])  # type: ignore[arg-type]


def test_document_checklist_dedupes_and_excludes_sensitive_items():
    first = _scheme(required_documents=["Marksheet", "Income certificate"])
    second = _scheme(
        required_documents=[
            "marksheet",
            "Aadhaar number",
            "Bank account number",
            "OTP",
            "Password",
            "  Caste certificate  ",
        ]
    )
    assert document_checklist([first, second]) == [
        "Marksheet",
        "Income certificate",
        "Caste certificate",
    ]


def test_document_checklist_empty_when_no_documents():
    assert document_checklist([_scheme()]) == []


def test_application_guidance_uses_portal_wording_when_unverified():
    scheme = _scheme(application_url="https://example.gov.in/apply")
    steps = application_guidance(scheme)
    assert len(steps) == 5
    assert any(CHECK_OFFICIAL_PORTAL in step for step in steps)
    joined = " ".join(steps).lower()
    for banned in ("guaranteed", "confirmed", "verified"):
        assert banned not in joined


def test_application_guidance_without_portal_url_uses_check_wording():
    steps = application_guidance(_scheme())
    assert CHECK_OFFICIAL_PORTAL + " for the application link." in steps[2]


def test_field_verification_defaults_to_unverified():
    assert field_verification(_scheme(), "eligibility") == "unverified"


def test_field_verification_uses_own_field_only():
    vset = FieldVerificationSet(
        deadline=FieldVerification(status=FieldVerificationState.VERIFIED)
    )
    scheme = _scheme(verification_status=vset)
    assert field_verification(scheme, "deadline") == "verified"
    assert field_verification(scheme, "eligibility") == "unverified"


def test_field_verification_on_plain_dict_record():
    record = {"verification_status": {"eligibility": {"status": "verified"}}}
    assert field_verification(record, "eligibility") == "verified"
    assert field_verification(record, "amount") == "unverified"


def test_field_verification_rejects_unknown_field_names():
    assert field_verification(_scheme(), "__class__") == "unverified"


def test_tracker_forward_transitions():
    state = TrackerState(scheme_id="s1")
    assert state.status == "not_started"
    state = advance_tracker(state, "in_progress")
    state = advance_tracker(state, "applied", reminder_date="2025-01-31")
    assert state.status == "applied"
    assert state.reminder_date == "2025-01-31"
    # A later update without a date keeps the existing reminder.
    state = advance_tracker(state, "applied")
    assert state.reminder_date == "2025-01-31"


def test_tracker_rejects_backwards_and_invalid_values():
    state = TrackerState(scheme_id="s1", status="in_progress")
    with pytest.raises(InvalidTrackerTransition):
        advance_tracker(state, "not_started")
    with pytest.raises(ValueError):
        advance_tracker(state, "submitted")
    with pytest.raises(ValueError):
        TrackerState(scheme_id="s1", status="bogus")
    with pytest.raises(ValueError):
        TrackerState(scheme_id="s1", reminder_date="2025-13-01")
    with pytest.raises(ValueError):
        TrackerState(scheme_id="")


def test_check_catalogue_version_ok_and_resync():
    same = check_catalogue_version(3, 3)
    assert same["compatible"] is True
    assert same["action"] == "ok"
    assert same["schema_version"] == SCHEMA_VERSION

    stale = check_catalogue_version(2, 3)
    assert stale["compatible"] is False
    assert stale["action"] == "resync"
    assert stale["server_version"] == 3


def test_check_catalogue_version_rejects_non_int():
    with pytest.raises(TypeError):
        check_catalogue_version("3", 3)  # type: ignore[arg-type]
