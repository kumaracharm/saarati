// Types mirroring the EntitleIQ backend contract (backend/app/models.py).

export type IndianState =
  | "andhra_pradesh"
  | "arunachal_pradesh"
  | "assam"
  | "bihar"
  | "chhattisgarh"
  | "goa"
  | "gujarat"
  | "haryana"
  | "himachal_pradesh"
  | "jharkhand"
  | "karnataka"
  | "kerala"
  | "madhya_pradesh"
  | "maharashtra"
  | "manipur"
  | "meghalaya"
  | "mizoram"
  | "nagaland"
  | "odisha"
  | "punjab"
  | "rajasthan"
  | "sikkim"
  | "tamil_nadu"
  | "telangana"
  | "tripura"
  | "uttar_pradesh"
  | "uttarakhand"
  | "west_bengal"
  | "andaman_and_nicobar_islands"
  | "chandigarh"
  | "dadra_nagar_haveli_and_daman_diu"
  | "delhi"
  | "jammu_and_kashmir"
  | "ladakh"
  | "lakshadweep"
  | "puducherry";

export type EducationLevel =
  | "class_10"
  | "class_12"
  | "undergraduate"
  | "postgraduate"
  | "phd";

export type InstitutionType =
  | "government"
  | "government_aided"
  | "private"
  | "deemed"
  | "other";

export type IncomeRange =
  | "below_2_5_lakh"
  | "2_5_to_5_lakh"
  | "5_to_8_lakh"
  | "above_8_lakh";

export type CertifiedCategory =
  | "general"
  | "obc"
  | "sc"
  | "st"
  | "ews"
  | "other"
  | "prefer_not_to_say";

export type Gender = "female" | "male" | "other" | "prefer_not_to_say";

export type RuleOutcome = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";

export type MatchStatus = "likely_eligible" | "potential_match" | "not_matched";

export type VerificationStatus = "demonstration" | "verified" | "unverified";

// Per-field verification. Only "verified" may be shown as verified; "unverified" and "unknown" show "Check official portal".
export type FieldVerificationStatus = "verified" | "unverified" | "unknown";

// Provenance of a single catalogue value. "verified" is only used when checked against an official notice.
export type ProvenanceStatus = "verified" | "demo" | "unverified" | "check_official_portal";

// Provenance of a whole scheme record.
export type SchemeProvenance = "verified" | "demo" | "check_official_portal";

export type RuleOperator = "equals" | "in" | "gte" | "lte" | "boolean_true";

export interface StudentProfile {
  state?: IndianState | null;
  education_level?: EducationLevel | null;
  course?: string | null;
  institution_type?: InstitutionType | null;
  academic_percentage?: number | null;
  family_income_range?: IncomeRange | null;
  officially_certified_category?: CertifiedCategory | null;
  gender?: Gender | null;
  disability_status?: boolean | null;
}

// Superset of StudentProfile with optional, skippable geography/demographic fields.
// state, education_level and disability_status are inherited from StudentProfile.
export interface CitizenProfile extends StudentProfile {
  district?: string;
  rural_urban?: string;
  household_size?: number;
  age_range?: string;
  income_band?: string;
  employment_status?: string;
  social_category?: string;
  benefit_interests?: string[];
}


export interface EligibilityRule {
  id: string;
  description: string;
  field: string;
  operator: RuleOperator;
  value: unknown;
  mandatory: boolean;
  applies_when: Record<string, unknown> | null;
  reason_pass: string;
  reason_fail: string;
  reason_unknown: string;
  // Optional Kannada text for offline/local catalogue rules.
  description_kn?: string;
  reason_kn?: string;
}

export interface DocumentItem {
  name: string;
  status: "required" | "optional";
  verification: ProvenanceStatus;
  source_note: string | null;
}

export interface ClauseHighlight {
  rule_id: string;
  label: string;
  excerpt: string | null;
  status: ProvenanceStatus;
}

export interface Scheme {
  id: string;
  name: string;
  provider: string;
  jurisdiction: string;
  // Optional benefit category, e.g. "scholarship", "hostel_stipend", "fee_reimbursement", "health_cover".
  benefit_type?: string;
  academic_year: string;
  eligibility_rules: EligibilityRule[];
  required_documents: string[];
  application_steps: string[];
  application_url: string | null;
  guideline_url: string | null;
  deadline: string | null;
  // Legacy single-value field, kept optional for compatibility. Prefer field_verification.
  verification_status?: VerificationStatus;
  // Per-field verification keyed by field name (e.g. "eligibility", "amount", "deadline", "documents").
  field_verification?: Record<string, FieldVerificationStatus>;
  last_verified_date: string | null;
  is_demonstration: boolean;
  // Optional provenance fields: older records may omit them.
  official_url?: string | null;
  guideline_pdf_url?: string | null;
  provenance?: SchemeProvenance;
  documents_checklist?: DocumentItem[];
  clause_highlights?: ClauseHighlight[];
  source_checked_on?: string | null;
  amount_status?: ProvenanceStatus;
  deadline_status?: ProvenanceStatus;
}

export interface RuleResult {
  rule_id: string;
  description: string;
  outcome: RuleOutcome;
  mandatory: boolean;
  reason: string;
}

export interface SchemeMatch {
  scheme_id: string;
  scheme_name: string;
  is_demonstration: boolean;
  status: MatchStatus;
  explanation: string;
  rule_results: RuleResult[];
}

export interface MatchResponse {
  disclaimer: string;
  likely_eligible: SchemeMatch[];
  potential_match: SchemeMatch[];
  not_matched: SchemeMatch[];
}

export interface ExtractResponse {
  provider: string;
  is_mock: boolean;
  profile: StudentProfile;
  notes: string[];
}

export interface ApiErrorBody {
  error: string;
  detail: unknown;
}
