"""Abstract base class for AI profile-extraction providers."""

from abc import ABC, abstractmethod


class AIProvider(ABC):
    """Interface every profile-extraction provider must implement.

    Subclasses set ``name`` to a short identifier and implement
    ``extract_profile``, which turns free text into a dict of StudentProfile
    fields. Only fields actually found in the text should be returned.
    """

    name: str

    @abstractmethod
    def extract_profile(self, text: str) -> dict:
        """Extract student profile fields from free text.

        Args:
            text: Free-form description written by the student.

        Returns:
            A dict whose keys are StudentProfile field names and whose values
            are plain strings or numbers. Fields not found must be omitted.
        """
        raise NotImplementedError
