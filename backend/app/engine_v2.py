"""Generalised, deterministic eligibility helpers (SAARTHI V2, Step 2).

This module is additive. It builds on the existing rule engine in ``app.rules``
and never changes how that engine evaluates a rule or a scheme.

Everything here is a pure function: no I/O, no network, no randomness.

Wording rules for user-facing strings:

* Never claim a guarantee or a confirmed outcome.
* Any field whose own verification status is not "verified" is shown as
  "Check official portal" and never produces a definitive eligibility claim.
* Missing profile data is UNKNOWN, never FAIL.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import date
from enum import Enum
from typing import Any

from app.models import (
    FieldVerificationSet,
    FieldVerificationState,
    IndianState,
    RuleOutcome,
    RuleResult,
    Scheme,
    StudentProfile,
)
from app.rules import evaluate_scheme

# ---------------------------------------------------------------------------
# Versioning
# ---------------------------------------------------------------------------

SCHEMA_VERSION: int = 2

# ---------------------------------------------------------------------------
# Benefit categories and tracks
# ---------------------------------------------------------------------------

CATEGORY_EDUCATION = "education"
CATEGORY_AGRICULTURE = "agriculture"
CATEGORY_HEALTH = "health"
CATEGORY_HOUSING = "housing"
CATEGORY_WOMEN_CHILDREN = "women_children"
CATEGORY_SOCIAL_SECURITY = "social_security"
CATEGORY_EMPLOYMENT = "employment"
CATEGORY_SMALL_BUSINESS = "small_business"
CATEGORY_RURAL_LIVELIHOOD = "rural_livelihood"
CATEGORY_DISABILITY_SUPPORT = "disability_support"
CATEGORY_INSURANCE = "insurance"
CATEGORY_FINANCIAL_INCLUSION = "financial_inclusion"

CATEGORIES: tuple[str, ...] = (
    CATEGORY_EDUCATION,
    CATEGORY_AGRICULTURE,
    CATEGORY_HEALTH,
    CATEGORY_HOUSING,
    CATEGORY_WOMEN_CHILDREN,
    CATEGORY_SOCIAL_SECURITY,
    CATEGORY_EMPLOYMENT,
    CATEGORY_SMALL_BUSINESS,
    CATEGORY_RURAL_LIVELIHOOD,
    CATEGORY_DISABILITY_SUPPORT,
    CATEGORY_INSURANCE,
    CATEGORY_FINANCIAL_INCLUSION,
)

TRACK_PUBLIC_INSTITUTIONAL = "public_institutional"
TRACK_PRIVATE_CSR = "private_csr"

TRACKS: tuple[str, ...] = (TRACK_PUBLIC_INSTITUTIONAL, TRACK_PRIVATE_CSR)

# ---------------------------------------------------------------------------
# Geography
# ---------------------------------------------------------------------------

GEO_CENTRAL = "central"
GEO_STATE = "state"
GEO_LOCAL = "local"
GEO_UNKNOWN = "unknown"

_CENTRAL_SCOPE_NAMES: frozenset[str] = frozenset(
    {"central", "national", "all_india", "india", "union", "central_government"}
)

# Longest first so that a longer state name is matched before any shorter one.
_STATE_VALUES: tuple[str, ...] = tuple(
    sorted((state.value for state in IndianState), key=len, reverse=True)
)

LABEL_LIKELY = "Likely eligible"
LABEL_NEEDS_INFO = "Needs more information"
LABEL_NOT_MATCHED = "Not matched"
LABEL_NOT_APPLICABLE = "Not applicable to your location"
CHECK_OFFICIAL_PORTAL = "Check official portal"

_VERIFIED_TEXT = "Checked against official source"


def _normalise_scope(raw: str) -> str:
    """Lower-case a geography string and join its words with underscores."""
    return re.sub(r"[\s\-]+", "_", raw.strip().lower())


def _state_in_text(text: str) -> str | None:
    """Return the IndianState value named in ``text`` as a whole word, if any."""
    padded = f"_{text}_"
    for value in _STATE_VALUES:
        if f"_{value}_" in padded:
            return value
    return None


def scheme_scope(scheme: Scheme) -> tuple[str, str | None]:
    """Classify where a scheme applies.

    The scope is read from ``scheme.geography``, falling back to
    ``scheme.jurisdiction`` when geography is not set.

    Args:
        scheme: The scheme to classify.

    Returns:
        A tuple ``(level, state_value)``. ``level`` is one of ``GEO_CENTRAL``
        (applies everywhere), ``GEO_STATE`` (a State or UT only), ``GEO_LOCAL``
        (a locality inside a State or UT) or ``GEO_UNKNOWN``. ``state_value`` is
        the IndianState value for state or local schemes, otherwise ``None``.
    """
    raw = scheme.geography or scheme.jurisdiction or ""
    text = _normalise_scope(raw)
    if not text:
        return GEO_UNKNOWN, None
    if text in _CENTRAL_SCOPE_NAMES:
        return GEO_CENTRAL, None
    state = _state_in_text(text)
    if "local" in text or "district" in text or "municipal" in text:
        return GEO_LOCAL, state
    if state is not None:
        return GEO_STATE, state
    return GEO_UNKNOWN, None


def _profile_state_value(profile: StudentProfile) -> str | None:
    """Return the profile's state as a plain string, or None if not given."""
    value = getattr(profile, "state", None)
    if isinstance(value, Enum):
        return value.value
    return value


def geography_outcome(scheme: Scheme, profile: StudentProfile) -> RuleOutcome:
    """Decide whether a scheme's geography applies to a profile.

    * Central schemes apply everywhere: PASS.
    * State, UT or local schemes apply only when the profile's state matches:
      a different state gives NOT_APPLICABLE.
    * A local scheme also needs a district; without one the result is UNKNOWN.
    * A missing profile state, or a scope that cannot be read, is UNKNOWN.
      It is never FAIL.

    Args:
        scheme: The scheme whose geography is checked.
        profile: The profile to check against.

    Returns:
        A ``RuleOutcome`` of PASS, NOT_APPLICABLE or UNKNOWN.
    """
    level, scheme_state = scheme_scope(scheme)
    if level == GEO_CENTRAL:
        return RuleOutcome.PASS
    if level == GEO_UNKNOWN or scheme_state is None:
        return RuleOutcome.UNKNOWN
    profile_state = _profile_state_value(profile)
    if profile_state is None:
        return RuleOutcome.UNKNOWN
    if profile_state != scheme_state:
        return RuleOutcome.NOT_APPLICABLE
    if level == GEO_LOCAL and not getattr(profile, "district", None):
        return RuleOutcome.UNKNOWN
    return RuleOutcome.PASS


# ---------------------------------------------------------------------------
# Field-level verification
# ---------------------------------------------------------------------------


def field_verification(scheme_or_record: Any, field_name: str) -> str:
    """Return the verification state of one field of a scheme or record.

    Only the field's own status counts. A scheme-wide or legacy status never
    upgrades a field to "verified".

    Args:
        scheme_or_record: A ``Scheme`` model or a plain dict with a
            ``verification_status`` mapping.
        field_name: One of the ``FieldVerificationSet`` fields (for example
            ``"eligibility"``, ``"amount"``, ``"deadline"``, ``"documents"``).

    Returns:
        ``"verified"`` only when the field's own status is verified, otherwise
        ``"unverified"``.
    """
    if field_name not in FieldVerificationSet.model_fields:
        return "unverified"

    status: Any = None
    if isinstance(scheme_or_record, Scheme):
        field_entry = getattr(scheme_or_record.verification_status, field_name, None)
        status = getattr(field_entry, "status", None)
    elif isinstance(scheme_or_record, dict):
        verification = scheme_or_record.get("verification_status")
        if isinstance(verification, dict):
            field_entry = verification.get(field_name)
            if isinstance(field_entry, dict):
                status = field_entry.get("status")

    if isinstance(status, Enum):
        status = status.value
    if status == FieldVerificationState.VERIFIED.value:
        return "verified"
    return "unverified"


def field_display(scheme: Scheme, field_name: str) -> str:
    """Return the user-facing display text for one field.

    Args:
        scheme: The scheme the field belongs to.
        field_name: The field to describe.

    Returns:
        ``"Checked against official source"`` when the field is verified,
        otherwise ``"Check official portal"``.
    """
    if field_verification(scheme, field_name) == "verified":
        return _VERIFIED_TEXT
    return CHECK_OFFICIAL_PORTAL


# ---------------------------------------------------------------------------
# Outcome to label
# ---------------------------------------------------------------------------


def outcome_label(results: list[RuleResult]) -> str:
    """Map rule results to a user-facing eligibility label.

    Only mandatory rules that were actually checked count:

    * Any mandatory FAIL gives "Not matched".
    * No checked mandatory rules, or any mandatory UNKNOWN, gives
      "Needs more information".
    * Otherwise, all mandatory rules passed and the label is "Likely eligible".

    Args:
        results: Rule results from ``evaluate_scheme``.

    Returns:
        One of ``LABEL_LIKELY``, ``LABEL_NEEDS_INFO`` or ``LABEL_NOT_MATCHED``.
    """
    checked = [
        result
        for result in results
        if result.mandatory and result.outcome != RuleOutcome.NOT_APPLICABLE
    ]
    if any(result.outcome == RuleOutcome.FAIL for result in checked):
        return LABEL_NOT_MATCHED
    if not checked or any(result.outcome == RuleOutcome.UNKNOWN for result in checked):
        return LABEL_NEEDS_INFO
    return LABEL_LIKELY


def scheme_label(scheme: Scheme, profile: StudentProfile) -> str:
    """Return the full user-facing label for one scheme and profile.

    Combines geography, the rule outcomes and the eligibility field's own
    verification state. A "Likely eligible" label is only shown in full when
    the eligibility field is verified; otherwise the portal hint is appended.

    Args:
        scheme: The scheme to label.
        profile: The profile to label against.

    Returns:
        A display label string.
    """
    geography = geography_outcome(scheme, profile)
    if geography == RuleOutcome.NOT_APPLICABLE:
        return LABEL_NOT_APPLICABLE

    match = evaluate_scheme(scheme, profile)
    label = outcome_label(match.rule_results)
    if geography == RuleOutcome.UNKNOWN and label == LABEL_LIKELY:
        label = LABEL_NEEDS_INFO
    if label == LABEL_LIKELY and field_verification(scheme, "eligibility") != "verified":
        label = f"{LABEL_LIKELY} - {CHECK_OFFICIAL_PORTAL}"
    return label


# ---------------------------------------------------------------------------
# What-If
# ---------------------------------------------------------------------------


def what_if(
    scheme: Scheme, profile: StudentProfile, changes: dict[str, Any]
) -> dict[str, Any]:
    """Evaluate a scheme before and after hypothetical profile changes.

    The changed profile is validated against the profile model, so unknown
    fields (including any sensitive identifiers) are rejected.

    Args:
        scheme: The scheme to evaluate.
        profile: The current profile.
        changes: Field names mapped to hypothetical new values.

    Returns:
        A dict with ``changed_fields``, ``status_before``/``status_after``,
        ``label_before``/``label_after`` and ``rule_deltas``: one entry
        (``rule_id``, ``before``, ``after``) for each rule whose outcome changed.

    Raises:
        TypeError: If ``changes`` is not a dict.
        ValueError: If a change is not a valid profile field or value.
    """
    if not isinstance(changes, dict):
        raise TypeError("changes must be a dict of profile field names to values")

    base = evaluate_scheme(scheme, profile)
    hypothetical = type(profile).model_validate({**profile.model_dump(), **changes})
    after = evaluate_scheme(scheme, hypothetical)

    before_outcomes = {result.rule_id: result.outcome for result in base.rule_results}
    rule_deltas = []
    for result in after.rule_results:
        before_outcome = before_outcomes.get(result.rule_id)
        if before_outcome != result.outcome:
            rule_deltas.append(
                {
                    "rule_id": result.rule_id,
                    "before": before_outcome.value if before_outcome else None,
                    "after": result.outcome.value,
                }
            )

    return {
        "changed_fields": sorted(changes),
        "status_before": base.status.value,
        "status_after": after.status.value,
        "label_before": scheme_label(scheme, profile),
        "label_after": scheme_label(scheme, hypothetical),
        "rule_deltas": rule_deltas,
    }


# ---------------------------------------------------------------------------
# Document checklist
# ---------------------------------------------------------------------------

# Items that would ask the citizen for a secret or an identifier. These are
# never shown as documents to collect.
_EXCLUDED_DOCUMENT_PATTERN = re.compile(
    r"aadhaar\s*(number|no\b|num\b)|\botp\b|password|bank\s+account|account\s+number",
    re.IGNORECASE,
)


def document_checklist(schemes: list[Scheme]) -> list[str]:
    """Build one deduplicated, ordered document checklist for matched schemes.

    Documents come from ``required_documents`` and, when present, an optional
    ``documents`` list attribute (read with ``getattr``, default ``[]``).
    Duplicates are removed case-insensitively, keeping first occurrence order.
    Items that ask for an Aadhaar number, OTP, bank account or password are
    dropped.

    Args:
        schemes: The matched schemes, in display order.

    Returns:
        The ordered checklist of document names.
    """
    seen: set[str] = set()
    checklist: list[str] = []
    for scheme in schemes:
        names = list(scheme.required_documents or []) + list(
            getattr(scheme, "documents", []) or []
        )
        for name in names:
            cleaned = " ".join(str(name).split())
            if not cleaned or _EXCLUDED_DOCUMENT_PATTERN.search(cleaned):
                continue
            key = cleaned.casefold()
            if key in seen:
                continue
            seen.add(key)
            checklist.append(cleaned)
    return checklist


# ---------------------------------------------------------------------------
# Application guidance
# ---------------------------------------------------------------------------


def application_guidance(scheme: Scheme) -> list[str]:
    """Return the ordered application steps for one scheme.

    Steps are generic: check eligibility, gather documents, visit the official
    portal, submit, and track. Any step covering an unverified field says
    "Check official portal" instead of stating a fact.

    Args:
        scheme: The scheme to guide the citizen through.

    Returns:
        An ordered list of step strings.
    """
    if field_verification(scheme, "eligibility") == "verified":
        eligibility_step = "Check eligibility using the details you entered."
    else:
        eligibility_step = (
            "Check eligibility using the details you entered. "
            "Check official portal for the current conditions."
        )

    if field_verification(scheme, "documents") == "verified":
        documents_step = "Gather the documents on the checklist."
    else:
        documents_step = (
            "Gather the documents on the checklist. "
            "Check official portal for the current document list."
        )

    portal = scheme.application_url or scheme.official_url
    if portal:
        portal_step = f"Visit the official portal: {portal}"
    else:
        portal_step = f"{CHECK_OFFICIAL_PORTAL} for the application link."

    return [
        eligibility_step,
        documents_step,
        portal_step,
        "Submit the application on the official portal.",
        "Track the application status on the official portal.",
    ]


# ---------------------------------------------------------------------------
# Tracker state
# ---------------------------------------------------------------------------

TRACKER_NOT_STARTED = "not_started"
TRACKER_IN_PROGRESS = "in_progress"
TRACKER_APPLIED = "applied"

# Forward order. A status may only stay the same or move to a later stage.
_TRACKER_ORDER: dict[str, int] = {
    TRACKER_NOT_STARTED: 0,
    TRACKER_IN_PROGRESS: 1,
    TRACKER_APPLIED: 2,
}


class InvalidTrackerTransition(ValueError):
    """Raised when a tracker status change is not allowed."""


def _validate_iso_date(value: str) -> None:
    """Raise ValueError unless ``value`` is a valid ISO date string (YYYY-MM-DD)."""
    date.fromisoformat(value)


@dataclass(frozen=True)
class TrackerState:
    """A citizen's progress on one scheme.

    Attributes:
        scheme_id: The scheme being tracked.
        status: One of ``not_started``, ``in_progress`` or ``applied``.
        reminder_date: Optional ISO date (YYYY-MM-DD) for a reminder.
    """

    scheme_id: str
    status: str = TRACKER_NOT_STARTED
    reminder_date: str | None = None

    def __post_init__(self) -> None:
        """Validate the scheme id, status and reminder date.

        Raises:
            ValueError: If the scheme id is empty, the status is unknown, or the
                reminder date is not a valid ISO date.
        """
        if not self.scheme_id:
            raise ValueError("scheme_id is required")
        if self.status not in _TRACKER_ORDER:
            raise ValueError(
                f"status must be one of: {sorted(_TRACKER_ORDER)}"
            )
        if self.reminder_date is not None:
            _validate_iso_date(self.reminder_date)


def advance_tracker(
    state: TrackerState, new_status: str, reminder_date: str | None = None
) -> TrackerState:
    """Move a tracker to a new status, or update its reminder.

    Status moves forward only: not_started -> in_progress -> applied. Staying on
    the same status is allowed, and only updates the reminder. A previous
    reminder is kept when ``reminder_date`` is None.

    Args:
        state: The current tracker state.
        new_status: The requested status.
        reminder_date: Optional new ISO reminder date.

    Returns:
        A new ``TrackerState``. The input is not modified.

    Raises:
        ValueError: If ``new_status`` or ``reminder_date`` is invalid.
        InvalidTrackerTransition: If the status would move backwards.
    """
    if new_status not in _TRACKER_ORDER:
        raise ValueError(f"status must be one of: {sorted(_TRACKER_ORDER)}")
    if _TRACKER_ORDER[new_status] < _TRACKER_ORDER[state.status]:
        raise InvalidTrackerTransition(
            f"cannot move from {state.status} to {new_status}"
        )
    return replace(
        state,
        status=new_status,
        reminder_date=reminder_date if reminder_date is not None else state.reminder_date,
    )


# ---------------------------------------------------------------------------
# Catalogue versioning
# ---------------------------------------------------------------------------


def check_catalogue_version(client_version: int, server_version: int) -> dict[str, Any]:
    """Compare a client's catalogue version with the server's.

    Args:
        client_version: The version the client holds.
        server_version: The version the server currently serves.

    Returns:
        A dict with ``compatible`` (bool), ``action`` (``"ok"`` when the versions
        match, otherwise ``"resync"``), both versions and ``schema_version``.

    Raises:
        TypeError: If either version is not an integer.
    """
    for name, value in (("client_version", client_version), ("server_version", server_version)):
        if not isinstance(value, int) or isinstance(value, bool):
            raise TypeError(f"{name} must be an int")
    compatible = client_version == server_version
    return {
        "compatible": compatible,
        "action": "ok" if compatible else "resync",
        "client_version": client_version,
        "server_version": server_version,
        "schema_version": SCHEMA_VERSION,
    }
