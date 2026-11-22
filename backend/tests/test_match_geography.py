"""HTTP-level tests for /api/match geography filtering and track labelling."""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api import routes
from app.catalogue import SchemeRepository
from app.main import create_app
from app.models import Scheme

_MIN_PERCENTAGE_RULE: dict[str, Any] = {
    "id": "min_percentage",
    "description": "Minimum academic percentage",
    "field": "academic_percentage",
    "operator": "gte",
    "value": 60,
    "mandatory": True,
    "reason_pass": "Meets the minimum percentage.",
    "reason_fail": "Below the minimum percentage.",
    "reason_unknown": "Academic percentage not provided.",
}


def _scheme_json(scheme_id: str, geography: str, **extra: Any) -> dict[str, Any]:
    return {
        "id": scheme_id,
        "name": f"[DEMO] {scheme_id}",
        "provider": "Test provider",
        "jurisdiction": "Test",
        "academic_year": "2025-26",
        "eligibility_rules": [_MIN_PERCENTAGE_RULE],
        "required_documents": [],
        "application_steps": ["Apply"],
        "is_demonstration": True,
        "geography": geography,
        **extra,
    }


@pytest.fixture
def catalogue_client(tmp_path: Path):
    """Build a client whose scheme catalogue is a temporary JSON file.

    Returns:
        A factory that takes a list of scheme dicts and returns a TestClient.
    """

    def build(schemes: list[dict[str, Any]]) -> TestClient:
        path = tmp_path / "schemes.json"
        path.write_text(json.dumps(schemes), encoding="utf-8")
        app = create_app()
        repo = SchemeRepository(path)
        app.dependency_overrides[routes.get_repository] = lambda: repo
        return TestClient(app)

    return build


def _ids(body: dict[str, Any], group: str) -> list[str]:
    return [item["scheme_id"] for item in body[group]]


def _all_ids(body: dict[str, Any]) -> list[str]:
    return _ids(body, "likely_eligible") + _ids(body, "potential_match") + _ids(
        body, "not_matched"
    )


def test_state_only_scheme_is_excluded_for_other_state(catalogue_client) -> None:
    """A Karnataka-only scheme is not returned for a Maharashtra citizen."""
    client = catalogue_client([_scheme_json("ka-only", "karnataka")])
    response = client.post(
        "/api/match",
        json={"state": "maharashtra", "academic_percentage": 72},
    )
    assert response.status_code == 200
    assert "ka-only" not in _all_ids(response.json())


def test_state_only_scheme_is_returned_for_same_state(catalogue_client) -> None:
    """A Karnataka-only scheme is returned for a Karnataka citizen when rules pass."""
    client = catalogue_client([_scheme_json("ka-only", "karnataka")])
    response = client.post(
        "/api/match",
        json={"state": "karnataka", "academic_percentage": 72},
    )
    body = response.json()
    assert response.status_code == 200
    assert "ka-only" in _ids(body, "likely_eligible")


def test_central_scheme_still_appears_for_any_state(catalogue_client) -> None:
    """A central scheme is returned for a Maharashtra citizen."""
    client = catalogue_client([_scheme_json("central-one", "central")])
    response = client.post(
        "/api/match",
        json={"state": "maharashtra", "academic_percentage": 72},
    )
    body = response.json()
    assert "central-one" in _ids(body, "likely_eligible")


def test_missing_state_is_not_reported_as_likely_eligible(catalogue_client) -> None:
    """A state scheme with no profile state is needs-info, not likely eligible."""
    client = catalogue_client([_scheme_json("ka-only", "karnataka")])
    response = client.post("/api/match", json={"academic_percentage": 72})
    body = response.json()
    assert "ka-only" not in _ids(body, "likely_eligible")
    assert "ka-only" in _ids(body, "potential_match")


def test_track_is_exposed_per_result_and_unknown_when_absent(
    catalogue_client,
) -> None:
    """Each result carries its scheme's track; absent tracks show UNKNOWN."""
    client = catalogue_client(
        [
            _scheme_json("csr-one", "central", track="private_csr"),
            _scheme_json("public-one", "central", track="public_institutional"),
            _scheme_json("no-track", "central"),
        ]
    )
    response = client.post(
        "/api/match", json={"state": "maharashtra", "academic_percentage": 72}
    )
    tracks = {
        item["scheme_id"]: item["track"]
        for item in response.json()["likely_eligible"]
    }
    assert tracks == {
        "csr-one": "private_csr",
        "public-one": "public_institutional",
        "no-track": "UNKNOWN",
    }


def test_no_guaranteed_wording_in_match_response(catalogue_client) -> None:
    """The match response never contains the word Guaranteed."""
    client = catalogue_client(
        [
            _scheme_json("central-one", "central"),
            _scheme_json("ka-only", "karnataka"),
        ]
    )
    response = client.post(
        "/api/match", json={"state": "karnataka", "academic_percentage": 72}
    )
    assert response.status_code == 200
    assert "Guaranteed" not in response.text


def test_unverified_eligibility_shows_check_portal_text(catalogue_client) -> None:
    """A likely result with unverified eligibility points to the official portal."""
    client = catalogue_client([_scheme_json("central-one", "central")])
    response = client.post(
        "/api/match", json={"state": "maharashtra", "academic_percentage": 72}
    )
    explanation = response.json()["likely_eligible"][0]["explanation"]
    assert "Check official portal" in explanation


def test_scheme_track_rejects_unknown_values() -> None:
    """Scheme.track accepts only the two known tracks or None."""
    with pytest.raises(ValidationError):
        Scheme.model_validate(_scheme_json("bad", "central", track="other"))
    assert Scheme.model_validate(_scheme_json("ok", "central")).track is None
