"""Factory that selects the configured AI provider."""

from app.config import Settings
from app.providers.base import AIProvider
from app.providers.mock import MockAIProvider
from app.providers.nexon import NexonAIProvider


def get_ai_provider(settings: Settings) -> AIProvider:
    """Return the AI provider selected by ``settings.ai_provider``.

    Args:
        settings: Application settings.

    Returns:
        A ``NexonAIProvider`` when ``ai_provider`` is ``"nexon"``
        (case-insensitive); otherwise a ``MockAIProvider``.
    """
    if settings.ai_provider.lower() == "nexon":
        return NexonAIProvider(settings)
    return MockAIProvider()
