"""Core Pydantic v2 data models for EntitleIQ.

These models describe the student profile, scholarship schemes, eligibility
rules, and the match results returned by the rule engine.

Privacy note: the platform must never ask for Aadhaar numbers, passwords,
OTPs, or bank details. None of the models below contain such fields.
"""

from datetime import date
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class IndianState(str, Enum):
    """All 28 States and 8 Union Territories of India."""

    # States
    ANDHRA_PRADESH = "andhra_pradesh"
    ARUNACHAL_PRADESH = "arunachal_pradesh"
    ASSAM = "assam"
    BIHAR = "bihar"
    CHHATTISGARH = "chhattisgarh"
    GOA = "goa"
    GUJARAT = "gujarat"
    HARYANA = "haryana"
    HIMACHAL_PRADESH = "himachal_pradesh"
    JHARKHAND = "jharkhand"
    KARNATAKA = "karnataka"
    KERALA = "kerala"
    MADHYA_PRADESH = "madhya_pradesh"
    MAHARASHTRA = "maharashtra"
    MANIPUR = "manipur"
    MEGHALAYA = "meghalaya"
    MIZORAM = "mizoram"
    NAGALAND = "nagaland"
    ODISHA = "odisha"
    PUNJAB = "punjab"
    RAJASTHAN = "rajasthan"
    SIKKIM = "sikkim"
    TAMIL_NADU = "tamil_nadu"
    TELANGANA = "telangana"
    TRIPURA = "tripura"
    UTTAR_PRADESH = "uttar_pradesh"
    UTTARAKHAND = "uttarakhand"
    WEST_BENGAL = "west_bengal"

    # Union Territories
    ANDAMAN_AND_NICOBAR_ISLANDS = "andaman_and_nicobar_islands"
    CHANDIGARH = "chandigarh"
    DADRA_NAGAR_HAVELI_AND_DAMAN_DIU = "dadra_nagar_haveli_and_daman_diu"
    DELHI = "delhi"
    JAMMU_AND_KASHMIR = "jammu_and_kashmir"
    LADAKH = "ladakh"
    LAKSHADWEEP = "lakshadweep"
    PUDUCHERRY = "puducherry"


class EducationLevel(str, Enum):
    """Current or most recently completed level of education."""

    CLASS_10 = "class_10"
    CLASS_12 = "class_12"
    UNDERGRADUATE = "undergraduate"
    POSTGRADUATE = "postgraduate"
    PHD = "phd"


class InstitutionType(str, Enum):
    """Type of institution the student attends or has applied to."""

    GOVERNMENT = "government"
    GOVERNMENT_AIDED = "government_aided"
    PRIVATE = "private"
    DEEMED = "deemed"
    OTHER = "other"


class IncomeRange(str, Enum):
    """Annual family income bracket (INR)."""

    BELOW_2_5_LAKH = "below_2_5_lakh"
    TWO_5_TO_5_LAKH = "2_5_to_5_lakh"
    FIVE_TO_8_LAKH = "5_to_8_lakh"
    ABOVE_8_LAKH = "above_8_lakh"


class CertifiedCategory(str, Enum):
    """Social category as shown on an official certificate."""

    GENERAL = "general"
    OBC = "obc"
    SC = "sc"
    ST = "st"
    EWS = "ews"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class Gender(str, Enum):
    """Gender identity as self-reported by the student."""

    FEMALE = "female"
    MALE = "male"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class RuleOutcome(str, Enum):
    """Result of evaluating a single eligibility rule."""

    PASS = "PASS"
    FAIL = "FAIL"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class MatchStatus(str, Enum):
    """Overall eligibility verdict for a scheme."""

    LIKELY_ELIGIBLE = "likely_eligible"
    POTENTIAL_MATCH = "potential_match"
    NOT_MATCHED = "not_matched"


class VerificationStatus(str, Enum):
    """How far a scheme's data has been verified against official sources."""

    DEMONSTRATION = "demonstration"
    VERIFIED = "verified"
    PARTIAL = "partial"
    UNVERIFIED = "unverified"
    EXPIRED = "expired"


class FieldVerificationState(str, Enum):
    """Verification state of one field (amount, deadline, eligibility, documents)."""

    VERIFIED = "verified"
    PARTIAL = "partial"
    UNVERIFIED = "unverified"
    EXPIRED = "expired"


class ProvenanceStatus(str, Enum):
    """Where a catalogue value came from and whether it has been checked.

    * ``VERIFIED``: taken from an official source and checked by the team.
    * ``DEMO``: invented placeholder data for demonstration only.
    * ``CHECK_OFFICIAL_PORTAL``: not verified; the user must check the official portal.
    """

    VERIFIED = "verified"
    DEMO = "demo"
    CHECK_OFFICIAL_PORTAL = "check_official_portal"


class RuleOperator(str, Enum):
    """Comparison operator used by an eligibility rule."""

    EQUALS = "equals"
    IN = "in"
    GTE = "gte"
    LTE = "lte"
    BOOLEAN_TRUE = "boolean_true"


class StudentProfile(BaseModel):
    """Structured profile of a student used for eligibility matching.

    Every field is optional so that partial profiles can be evaluated; missing
    fields yield UNKNOWN outcomes rather than errors.

    The platform must never ask for Aadhaar numbers, passwords, OTPs, or bank
    details. Only the fields declared here are accepted (extra fields are
    rejected).
    """

    model_config = ConfigDict(extra="forbid")

    state: IndianState | None = None
    education_level: EducationLevel | None = None
    course: str | None = Field(default=None, max_length=100)
    institution_type: InstitutionType | None = None
    academic_percentage: float | None = Field(default=None, ge=0, le=100)
    family_income_range: IncomeRange | None = None
    officially_certified_category: CertifiedCategory | None = None
    gender: Gender | None = None
    disability_status: bool | None = None

    @field_validator("course", mode="before")
    @classmethod
    def _strip_course(cls, value: Any) -> Any:
        """Strip leading and trailing whitespace from the course name."""
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
        return value


class CitizenProfile(StudentProfile):
    """Citizen profile: the StudentProfile fields plus optional demographic fields.

    Inherits every StudentProfile field (including ``state``, ``education_level``
    and ``disability_status``). All added fields are optional and skippable.
    No Aadhaar, OTP, bank, or password fields are declared here.
    """

    district: str | None = None
    rural_urban: str | None = None
    household_size: int | None = Field(default=None, ge=1)
    age_range: str | None = None
    income_band: str | None = None
    employment_status: str | None = None
    social_category: str | None = None
    benefit_interests: list[str] = Field(default_factory=list)



class EligibilityRule(BaseModel):
    """A single machine-checkable condition attached to a scheme.

    ``field`` must name one of the ``StudentProfile`` fields so the rule engine
    can look up the student's value.
    """

    id: str
    description: str
    field: str
    operator: RuleOperator
    value: Any = None
    mandatory: bool = True
    applies_when: dict[str, Any] | None = None
    reason_pass: str
    reason_fail: str
    reason_unknown: str

    @field_validator("field")
    @classmethod
    def _validate_field(cls, value: str) -> str:
        """Ensure ``field`` refers to an existing StudentProfile field."""
        valid_fields = set(StudentProfile.model_fields.keys())
        if value not in valid_fields:
            raise ValueError(
                f"'{value}' is not a StudentProfile field; "
                f"expected one of: {sorted(valid_fields)}"
            )
        return value


class DocumentItem(BaseModel):
    """One document on a scheme's checklist, with its provenance.

    ``verification`` defaults to DEMO so that unverified entries are never
    presented as official.
    """

    name: str
    status: Literal["required", "optional"] = "required"
    verification: ProvenanceStatus = ProvenanceStatus.DEMO
    source_note: str | None = None


class ClauseHighlight(BaseModel):
    """A clause of a scheme linked to an eligibility rule.

    ``excerpt`` must stay None unless it was copied from a verified official
    source. Do not invent or paraphrase clause text here.
    """

    rule_id: str
    label: str
    excerpt: str | None = None
    status: ProvenanceStatus = ProvenanceStatus.DEMO


class FieldVerification(BaseModel):
    """Verification state and check date for a single scheme field."""

    status: FieldVerificationState = FieldVerificationState.UNVERIFIED
    last_verified_at: str | None = None


class FieldVerificationSet(BaseModel):
    """Per-field verification status for a scheme. All fields default to unverified."""

    amount: FieldVerification = Field(default_factory=FieldVerification)
    deadline: FieldVerification = Field(default_factory=FieldVerification)
    eligibility: FieldVerification = Field(default_factory=FieldVerification)
    documents: FieldVerification = Field(default_factory=FieldVerification)


class SchemeSource(BaseModel):
    """Where a scheme's data was taken from."""

    publisher: str
    url: str | None = None
    retrieved_at: str | None = None


class Scheme(BaseModel):
    """A scholarship scheme with its eligibility rules and application details.

    Provenance fields are optional so that existing records still validate.
    A ``guideline_pdf_url`` is only allowed for verified schemes that have a
    ``source_checked_on`` date. Demo schemes must be marked as demonstration
    and carry the ``[DEMO]`` name prefix.
    """

    id: str
    name: str
    provider: str
    jurisdiction: str
    academic_year: str
    eligibility_rules: list[EligibilityRule]
    required_documents: list[str]
    application_steps: list[str]
    application_url: str | None = None
    guideline_url: str | None = None
    deadline: date | None = None
    record_version: int = 2
    scheme_type: str | None = None
    category: str | None = None
    geography: str | None = None
    legacy_verification_status: str | None = None
    verification_status: FieldVerificationSet = Field(default_factory=FieldVerificationSet)
    last_verified_at: str | None = None
    source: SchemeSource | None = None
    last_verified_date: date | None = None
    is_demonstration: bool
    official_url: str | None = None
    guideline_pdf_url: str | None = None
    provenance: ProvenanceStatus = ProvenanceStatus.DEMO
    documents_checklist: list[DocumentItem] = Field(default_factory=list)
    clause_highlights: list[ClauseHighlight] = Field(default_factory=list)
    source_checked_on: date | None = None
    amount_status: ProvenanceStatus = ProvenanceStatus.CHECK_OFFICIAL_PORTAL
    deadline_status: ProvenanceStatus = ProvenanceStatus.CHECK_OFFICIAL_PORTAL
    track: Literal["public_institutional", "private_csr"] | None = None

    @model_validator(mode="after")
    def _check_provenance(self) -> "Scheme":
        """Enforce the demo and guideline-PDF provenance rules.

        Raises:
            ValueError: If a demo scheme is not marked as demonstration or lacks
                the ``[DEMO]`` name prefix, or if ``guideline_pdf_url`` is set
                without verified provenance and a ``source_checked_on`` date.

        Returns:
            The validated scheme.
        """
        if self.provenance == ProvenanceStatus.DEMO:
            if not self.is_demonstration:
                raise ValueError("demo provenance requires is_demonstration to be True")
            if not self.name.startswith("[DEMO]"):
                raise ValueError("demo provenance requires a name starting with [DEMO]")
        if self.guideline_pdf_url is not None:
            if self.provenance != ProvenanceStatus.VERIFIED:
                raise ValueError("guideline_pdf_url requires verified provenance")
            if self.source_checked_on is None:
                raise ValueError("guideline_pdf_url requires source_checked_on")
        return self


class RuleResult(BaseModel):
    """Outcome of evaluating one EligibilityRule against a student profile."""

    rule_id: str
    description: str
    outcome: RuleOutcome
    mandatory: bool
    reason: str


class SchemeMatch(BaseModel):
    """Eligibility assessment of one scheme for one student."""

    scheme_id: str
    scheme_name: str
    is_demonstration: bool
    status: MatchStatus
    explanation: str
    rule_results: list[RuleResult]
    track: str = "UNKNOWN"


class MatchResponse(BaseModel):
    """Grouped match results returned to the client, with a mandatory disclaimer."""

    disclaimer: str
    likely_eligible: list[SchemeMatch]
    potential_match: list[SchemeMatch]
    not_matched: list[SchemeMatch]


class ExtractRequest(BaseModel):
    """Free-text input from which a StudentProfile should be extracted."""

    text: str = Field(min_length=1, max_length=2000)


class ExtractResponse(BaseModel):
    """Result of profile extraction from free text."""

    provider: str
    is_mock: bool
    profile: StudentProfile
    notes: list[str]
