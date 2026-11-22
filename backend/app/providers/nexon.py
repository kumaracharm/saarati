"""Nexon AI provider for profile extraction.

The Nexon HTTP integration is not yet connected in this build. The provider
validates its configuration at construction time so that a misconfigured
deployment fails clearly rather than silently.
"""

from app.config import Settings
from app.providers.base import AIProvider


class AIProviderNotConfiguredError(Exception):
    """Raised when an AI provider is selected but its settings are missing."""


class NexonAIProvider(AIProvider):
    """AI provider backed by the Nexon service.

    Requires both ``NEXON_API_KEY`` and ``NEXON_BASE_URL`` to be set.
    """

    name: str = "nexon"

    def __init__(self, settings: Settings) -> None:
        """Validate the Nexon configuration held in ``settings``.

        Args:
            settings: Application settings containing the Nexon credentials.

        Raises:
            AIProviderNotConfiguredError: If the API key or base URL is empty.
        """
        if not settings.nexon_api_key or not settings.nexon_base_url:
            raise AIProviderNotConfiguredError(
                "Nexon AI is not configured. Set the NEXON_API_KEY and "
                "NEXON_BASE_URL environment variables."
            )
        self._api_key: str = settings.nexon_api_key
        self._base_url: str = settings.nexon_base_url

    def extract_profile(self, text: str) -> dict:
        """Extract student profile fields from free text via Nexon.

        Args:
            text: Free-form description written by the student.

        Returns:
            A dict of StudentProfile field names to extracted values.

        Raises:
            NotImplementedError: Always, until the Nexon HTTP integration is
                connected in this build.
        """
        raise NotImplementedError(
            "Nexon HTTP integration is not yet connected in this build"
        )
