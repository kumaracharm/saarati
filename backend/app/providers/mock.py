"""Deterministic regex-based mock extraction provider.

This is a DEMONSTRATION MOCK, not AI. It uses fixed regular expressions to
spot states, percentages and education levels in text. It never guesses:
fields that are not clearly present are omitted from the result.
"""

import re

from app.models import IndianState
from app.providers.base import AIProvider

_PERCENT_RE = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*%")

# Ordered from highest to lowest; the highest level found in the text wins.
_EDUCATION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("phd", re.compile(r"\bph\.?d\b", re.IGNORECASE)),
    (
        "postgraduate",
        re.compile(
            r"postgraduate|\bM\.?\s?Tech\b|\bM\.?A\b|\bM\.?Sc\b|\bMBA\b",
            re.IGNORECASE,
        ),
    ),
    (
        "undergraduate",
        re.compile(
            r"undergraduate|\bB\.?\s?Tech\b|\bB\.?A\b|\bB\.?Sc\b|\bbachelor\b",
            re.IGNORECASE,
        ),
    ),
    ("class_12", re.compile(r"\bclass\s*12\b|\b12th\b|\+2\b", re.IGNORECASE)),
    ("class_10", re.compile(r"\bclass\s*10\b|\b10th\b", re.IGNORECASE)),
]


def _find_state(text: str) -> str | None:
    """Return the value of the earliest-mentioned IndianState in ``text``."""
    best_pos: int | None = None
    best_value: str | None = None
    for state in IndianState:
        display = state.value.replace("_", " ")
        match = re.search(rf"\b{re.escape(display)}\b", text, re.IGNORECASE)
        if match and (best_pos is None or match.start() < best_pos):
            best_pos = match.start()
            best_value = state.value
    return best_value


def _find_percentage(text: str) -> float | None:
    """Return the first percentage in 0-100 found in ``text``, if any."""
    for match in _PERCENT_RE.finditer(text):
        value = float(match.group(1))
        if 0 <= value <= 100:
            return value
    return None


def _find_education(text: str) -> str | None:
    """Return the highest education level mentioned in ``text``, if any."""
    for level, pattern in _EDUCATION_PATTERNS:
        if pattern.search(text):
            return level
    return None


class MockAIProvider(AIProvider):
    """Demonstration provider that extracts fields with fixed regex rules."""

    name = "mock"

    def extract_profile(self, text: str) -> dict:
        """Extract state, academic percentage and education level from text.

        Args:
            text: Free-form description written by the student.

        Returns:
            A dict containing only the fields that were found. Keys may include
            ``state``, ``academic_percentage`` and ``education_level``.
        """
        result: dict = {}

        state = _find_state(text)
        if state is not None:
            result["state"] = state

        percentage = _find_percentage(text)
        if percentage is not None:
            result["academic_percentage"] = percentage

        education = _find_education(text)
        if education is not None:
            result["education_level"] = education

        return result
