"""Shared pytest fixtures for the EntitleIQ backend tests."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models import StudentProfile


@pytest.fixture
def client() -> TestClient:
    """Return a test client bound to a freshly built application.

    Returns:
        A ``TestClient`` wrapping ``create_app()``.
    """
    return TestClient(create_app())


@pytest.fixture
def sample_profile() -> StudentProfile:
    """Return a fully populated, valid student profile.

    Returns:
        A ``StudentProfile`` for a Maharashtra class 12 student.
    """
    return StudentProfile(
        state="maharashtra",
        education_level="class_12",
        academic_percentage=72.0,
        gender="female",
        institution_type="government",
        officially_certified_category="general",
    )
