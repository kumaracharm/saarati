"""Tests for the scheme catalogue repository and its matching helper."""

from pathlib import Path

import pytest
from pydantic import ValidationError

from app.catalogue import SchemeRepository
from app.models import (
    FieldVerificationState,
    ProvenanceStatus,
    Scheme,
    StudentProfile,
    VerificationStatus,
)
from app.rules import match_profile


def test_default_catalogue_loads_five_schemes() -> None:
    """The bundled catalogue contains three demo schemes and two portal entries."""
    repo = SchemeRepository()
    assert len(repo.list_schemes()) == 5


def test_every_demo_scheme_is_marked_demonstration() -> None:
    """Schemes with demo provenance carry is_demonstration set to True."""
    for scheme in SchemeRepository().list_schemes():
        if scheme.provenance == ProvenanceStatus.DEMO:
            assert scheme.is_demonstration is True


def test_every_demo_scheme_name_is_prefixed_demo() -> None:
    """Schemes with demo provenance have names starting with the [DEMO] marker."""
    for scheme in SchemeRepository().list_schemes():
        if scheme.provenance == ProvenanceStatus.DEMO:
            assert scheme.name.startswith("[DEMO]")


def test_get_scheme_returns_none_for_unknown_id() -> None:
    """Looking up a non-existent scheme id returns None."""
    assert SchemeRepository().get_scheme("missing") is None


def test_portal_schemes_are_present_with_official_url() -> None:
    """NSP and Karnataka SSP entries exist, with official_url set and no PDF."""
    repo = SchemeRepository()
    for scheme_id in ("nsp-portal", "karnataka-ssp-portal"):
        scheme = repo.get_scheme(scheme_id)
        assert scheme is not None
        assert scheme.official_url
        assert scheme.guideline_pdf_url is None
        assert scheme.is_demonstration is False
        assert scheme.verification_status.amount.status == FieldVerificationState.UNVERIFIED


def test_no_loaded_scheme_has_guideline_pdf() -> None:
    """No bundled scheme has a guideline PDF URL, since none is verified yet."""
    for scheme in SchemeRepository().list_schemes():
        assert scheme.guideline_pdf_url is None


def test_demo_scheme_with_guideline_pdf_is_rejected() -> None:
    """A demo-provenance scheme cannot carry a guideline PDF URL."""
    with pytest.raises(ValidationError):
        Scheme(
            id="bad-demo",
            name="[DEMO] Bad Scheme",
            provider="Test Provider",
            jurisdiction="Test",
            academic_year="2025-26",
            eligibility_rules=[],
            required_documents=[],
            application_steps=[],
            legacy_verification_status=VerificationStatus.DEMONSTRATION,
            is_demonstration=True,
            provenance="demo",
            guideline_pdf_url="https://example.org/guideline.pdf",
            source_checked_on="2025-01-01",
        )


def test_empty_catalogue_lists_no_schemes(tmp_path: Path) -> None:
    """A catalogue file containing an empty JSON array yields no schemes."""
    path = tmp_path / "empty.json"
    path.write_text("[]", encoding="utf-8")
    assert SchemeRepository(path).list_schemes() == []


def test_match_against_empty_catalogue_has_empty_groups() -> None:
    """Matching a profile against no schemes gives empty result groups."""
    response = match_profile(StudentProfile(), [])
    assert response.likely_eligible == []
    assert response.potential_match == []
    assert response.not_matched == []
