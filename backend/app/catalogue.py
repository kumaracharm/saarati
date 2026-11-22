"""Scheme catalogue access for EntitleIQ.

The catalogue is read from a JSON file for now. The ``SchemeRepository``
interface is kept small so that a SQLite-backed implementation can replace it
later without changing the callers in the API layer.
"""

import json
from pathlib import Path

from app.models import Scheme

DEFAULT_CATALOGUE_PATH: Path = (
    Path(__file__).resolve().parent.parent / "data" / "schemes.json"
)


class SchemeRepository:
    """Read-only access to the scheme catalogue.

    The JSON file is loaded and validated once, at construction. Every item must
    validate as a ``Scheme``; a malformed entry raises ``pydantic.ValidationError``
    so that bad data is caught at startup rather than at request time.
    """

    def __init__(self, path: Path | None = None) -> None:
        """Load and validate the catalogue.

        Args:
            path: Location of the JSON array of schemes. Defaults to
                ``backend/data/schemes.json``.

        Raises:
            pydantic.ValidationError: If any item does not match ``Scheme``.
            json.JSONDecodeError: If the file is not valid JSON.
            ValueError: If the top-level JSON value is not an array.
        """
        self._path: Path = path if path is not None else DEFAULT_CATALOGUE_PATH
        with self._path.open(encoding="utf-8") as handle:
            raw_items = json.load(handle)
        if not isinstance(raw_items, list):
            raise ValueError("Scheme catalogue must be a JSON array")
        self._schemes: list[Scheme] = [
            Scheme.model_validate(item) for item in raw_items
        ]
        self._by_id: dict[str, Scheme] = {scheme.id: scheme for scheme in self._schemes}

    def list_schemes(self) -> list[Scheme]:
        """Return all schemes in catalogue order.

        Returns:
            A new list containing every loaded ``Scheme``.
        """
        return list(self._schemes)

    def get_scheme(self, scheme_id: str) -> Scheme | None:
        """Return the scheme with the given id.

        Args:
            scheme_id: The unique identifier of the scheme.

        Returns:
            The matching ``Scheme``, or ``None`` if no scheme has that id.
        """
        return self._by_id.get(scheme_id)
