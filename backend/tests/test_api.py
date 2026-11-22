"""HTTP-level tests for the EntitleIQ API routes."""

from fastapi.testclient import TestClient

from app.models import StudentProfile


def test_health_reports_ok(client: TestClient) -> None:
    """GET /health returns 200 with status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_schemes_returns_five_items_with_demo_flag_on_demo_provenance(
    client: TestClient,
) -> None:
    """GET /api/schemes returns five schemes; demo-provenance items are demonstration."""
    response = client.get("/api/schemes")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 5
    demo_items = [item for item in items if item["provenance"] == "demo"]
    assert len(demo_items) == 3
    assert all(item["is_demonstration"] is True for item in demo_items)


def test_unknown_scheme_returns_404_not_found(client: TestClient) -> None:
    """GET /api/schemes/nope returns 404 with error not_found."""
    response = client.get("/api/schemes/nope")
    assert response.status_code == 404
    assert response.json()["error"] == "not_found"


def test_match_with_valid_profile_returns_disclaimer(
    client: TestClient, sample_profile: StudentProfile
) -> None:
    """POST /api/match with a valid profile returns 200 and a disclaimer."""
    response = client.post(
        "/api/match", json=sample_profile.model_dump(mode="json")
    )
    assert response.status_code == 200
    assert "disclaimer" in response.json()


def test_match_with_invalid_percentage_returns_422(client: TestClient) -> None:
    """POST /api/match with academic_percentage 150 returns 422."""
    response = client.post("/api/match", json={"academic_percentage": 150})
    assert response.status_code == 422


def test_extract_returns_mock_profile_fields(client: TestClient) -> None:
    """POST /api/extract with the mock provider extracts state, percentage and level."""
    response = client.post(
        "/api/extract",
        json={"text": "I am from Maharashtra with 82.5% in class 12"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["is_mock"] is True
    profile = body["profile"]
    assert profile["academic_percentage"] == 82.5
    assert profile["state"] == "maharashtra"
    assert profile["education_level"] == "class_12"
    other_fields = {
        key: value
        for key, value in profile.items()
        if key not in {"academic_percentage", "state", "education_level"}
    }
    assert all(value is None for value in other_fields.values())


def test_extract_with_empty_text_returns_422(client: TestClient) -> None:
    """POST /api/extract with empty text returns 422."""
    response = client.post("/api/extract", json={"text": ""})
    assert response.status_code == 422


def test_cors_allows_localhost_origin(client: TestClient) -> None:
    """GET /health with an Origin header gets a matching CORS allow-origin."""
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
