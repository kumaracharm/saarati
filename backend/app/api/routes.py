"""HTTP routes for the EntitleIQ API."""

from functools import lru_cache

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.catalogue import SchemeRepository
from app.config import Settings, get_settings
from app.engine_v2 import CHECK_OFFICIAL_PORTAL, field_verification, geography_outcome
from app.models import (
    CitizenProfile,
    ExtractRequest,
    ExtractResponse,
    MatchResponse,
    MatchStatus,
    RuleOutcome,
    Scheme,
    SchemeMatch,
    StudentProfile,
)
from app.providers.factory import get_ai_provider
from app.providers.nexon import AIProviderNotConfiguredError
from app.rules import match_profile

router = APIRouter()

MOCK_NOTE: str = "Mock extraction: demonstration only. Review every field before use."
AI_NOTE: str = "Extracted by an AI provider. Review every field before use."
GEOGRAPHY_PENDING_NOTE: str = (
    "Your state or district is needed to confirm this scheme applies to you."
)


@lru_cache(maxsize=1)
def get_repository() -> SchemeRepository:
    """Return the cached scheme catalogue repository.

    Returns:
        A ``SchemeRepository`` loaded once from the default catalogue file.
    """
    return SchemeRepository()



@router.get("/api/schemes", response_model=list[Scheme])
def list_schemes(repo: SchemeRepository = Depends(get_repository)) -> list[Scheme]:
    """List every scheme in the catalogue.

    Args:
        repo: The scheme repository dependency.

    Returns:
        All schemes in catalogue order.
    """
    return repo.list_schemes()


@router.get(
    "/api/schemes/{scheme_id}",
    response_model=Scheme,
    responses={404: {"description": "No scheme with that id"}},
)
def get_scheme(
    scheme_id: str, repo: SchemeRepository = Depends(get_repository)
) -> Scheme | JSONResponse:
    """Return one scheme by id.

    Args:
        scheme_id: The unique identifier of the scheme.
        repo: The scheme repository dependency.

    Returns:
        The matching ``Scheme``, or a 404 JSON error if none exists.
    """
    scheme = repo.get_scheme(scheme_id)
    if scheme is None:
        return JSONResponse(
            status_code=404,
            content={"error": "not_found", "detail": "No scheme with that id"},
        )
    return scheme


@router.post("/api/extract", response_model=ExtractResponse)
def extract_profile(
    body: ExtractRequest, settings: Settings = Depends(get_settings)
) -> ExtractResponse | JSONResponse:
    """Extract a student profile from free text using the AI provider.

    Args:
        body: The free-text input to extract from.
        settings: Application settings used to select the AI provider.

    Returns:
        An ``ExtractResponse`` with the validated profile, or a JSON error
        response when the provider is unavailable or its output is invalid.
    """
    try:
        provider = get_ai_provider(settings)
        raw = provider.extract_profile(body.text)
    except (AIProviderNotConfiguredError, NotImplementedError) as exc:
        return JSONResponse(
            status_code=503,
            content={"error": "ai_provider_unavailable", "detail": str(exc)},
        )

    try:
        profile = StudentProfile.model_validate(raw)
    except ValidationError:
        return JSONResponse(
            status_code=422,
            content={
                "error": "extraction_invalid",
                "detail": "Extracted values could not be validated",
            },
        )

    is_mock = provider.name == "mock"
    return ExtractResponse(
        provider=provider.name,
        is_mock=is_mock,
        profile=profile,
        notes=[MOCK_NOTE] if is_mock else [AI_NOTE],
    )


def _adjust_result(
    result: SchemeMatch, scheme: Scheme, geography: RuleOutcome
) -> SchemeMatch:
    """Apply geography uncertainty and unverified-field wording to one result.

    A likely match whose geography is UNKNOWN is downgraded to a potential
    match. Any non-"not matched" result whose eligibility field is not verified
    gets the "Check official portal" hint.

    Args:
        result: The result produced by ``match_profile``.
        scheme: The scheme the result belongs to.
        geography: The geography outcome for the citizen and scheme.

    Returns:
        A copy of ``result`` with the adjusted status and explanation.
    """
    status = result.status
    explanation = result.explanation
    if geography == RuleOutcome.UNKNOWN and status == MatchStatus.LIKELY_ELIGIBLE:
        status = MatchStatus.POTENTIAL_MATCH
        explanation = GEOGRAPHY_PENDING_NOTE
    if status != MatchStatus.NOT_MATCHED and field_verification(scheme, "eligibility") != "verified":
        explanation = f"{explanation} {CHECK_OFFICIAL_PORTAL} for the current conditions."
    return result.model_copy(update={"status": status, "explanation": explanation})


@router.post("/api/match", response_model=MatchResponse)
def match(
    profile: CitizenProfile, repo: SchemeRepository = Depends(get_repository)
) -> MatchResponse:
    """Evaluate a student profile against every scheme in the catalogue.

    Schemes whose geography does not apply to the citizen (for example a
    State-only scheme for a different State) are left out entirely. Results
    whose geography cannot be determined are never reported as likely eligible.

    Args:
        profile: The student profile to evaluate.
        repo: The scheme repository dependency.

    Returns:
        A ``MatchResponse`` grouping the schemes by match status.
    """
    schemes = repo.list_schemes()
    geography = {scheme.id: geography_outcome(scheme, profile) for scheme in schemes}
    applicable = [
        scheme for scheme in schemes if geography[scheme.id] != RuleOutcome.NOT_APPLICABLE
    ]
    by_id = {scheme.id: scheme for scheme in applicable}
    response = match_profile(profile, applicable)

    likely_eligible: list[SchemeMatch] = []
    potential_match: list[SchemeMatch] = []
    not_matched: list[SchemeMatch] = []
    for group in (response.likely_eligible, response.potential_match, response.not_matched):
        for result in group:
            adjusted = _adjust_result(
                result, by_id[result.scheme_id], geography[result.scheme_id]
            )
            if adjusted.status == MatchStatus.LIKELY_ELIGIBLE:
                likely_eligible.append(adjusted)
            elif adjusted.status == MatchStatus.POTENTIAL_MATCH:
                potential_match.append(adjusted)
            else:
                not_matched.append(adjusted)

    return MatchResponse(
        disclaimer=response.disclaimer,
        likely_eligible=likely_eligible,
        potential_match=potential_match,
        not_matched=not_matched,
    )
