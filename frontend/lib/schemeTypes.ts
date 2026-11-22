// Shared types for the EntitleIQ scheme catalogue and deterministic matcher.
// PRIVACY: Profile must never contain Aadhaar numbers, OTPs, passwords or bank account numbers.
// Government, private/CSR and aided-institutional schemes are kept distinct via provider_type.

export type Lang = "en" | "kn";

export type Bilingual = { en: string; kn: string };

/** Internal provider values, kept for compatibility. */
export type ProviderType = "government" | "private_csr" | "aided_institutional";

/** Display track names used in UI filters: Government | Private/CSR | Aided/Institutional. */
export type ProviderTrack = "Government" | "Private/CSR" | "Aided/Institutional";

export type SchemeDomain =
  | "scholarship"
  | "hostel_stipend"
  | "fee_reimbursement"
  | "health_cover"
  | "insurance_protection"
  | "fellowship_skill"
  | "social_security_pension"
  | "housing_support"
  | "farmer_livelihood";

/** Thematic facet that groups one or more domains. */
export type SchemeCategory =
  | "scholarships"
  | "hostel_housing"
  | "health_cover"
  | "social_security"
  | "farmer_livelihood_skill";

export type SchemeScope = "individual" | "household";

/** Clause outcome. Missing profile data is always UNKNOWN, never FAIL. */
export type Verdict = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";
export type ClauseOutcome = Verdict;

/** Scheme-level verdict produced by the matcher. */
export type SchemeVerdict = "Likely eligible" | "Needs more information" | "Not matched";

/**
 * Legacy status labels kept so existing imports and UI comparisons keep working.
 * Derived from SchemeVerdict: Likely eligible -> Likely Eligible,
 * Needs more information -> Potential Match, Not matched -> Not Matched.
 */
export type MatchStatus = "Likely Eligible" | "Potential Match" | "Not Matched";

/** Legacy alias. */
export type Domain = SchemeDomain;
/** Legacy alias. */
export type Scope = SchemeScope;

/** Jurisdiction facet. "Other" covers private/CSR and aided-institution schemes. */
export type Jurisdiction = "Central" | "Karnataka" | "Other";

/** Maps each domain to its thematic category facet. */
export const DOMAIN_CATEGORY: Record<SchemeDomain, SchemeCategory> = {
  scholarship: "scholarships",
  fee_reimbursement: "scholarships",
  hostel_stipend: "hostel_housing",
  housing_support: "hostel_housing",
  health_cover: "health_cover",
  insurance_protection: "social_security",
  social_security_pension: "social_security",
  farmer_livelihood: "farmer_livelihood_skill",
  fellowship_skill: "farmer_livelihood_skill",
};

export type Profile = {
  annual_family_income_inr?: number;
  /** Category code: "SC" | "ST" | "OBC" | "MINORITY" | "GM" */
  category?: string;
  marks_percent?: number;
  is_hostel_resident?: boolean;
  household_member_count?: number;
  has_bpl_or_ration_card?: boolean;
  is_student?: boolean;
  /** Class/standard as text, e.g. "5" or "11" */
  student_class?: string;
  /** Education level: "school" | "ug" | "pg" | "diploma" */
  education_level?: string;
  age_years?: number;
  /** Yes/no only. Never store an account number. */
  has_bank_account?: boolean;
  /** Yes/no only. */
  is_farmer?: boolean;
  district?: string;
};

export type Clause = {
  id: string;
  /** Short label, English and Kannada. */
  text: Bilingual;
  /** Plain explanation of the rule, English and Kannada. A null threshold means "not published in this build". */
  description?: Bilingual;
  field: keyof Profile;
  op: "gte" | "lte" | "eq" | "in" | "bool";
  value: unknown;
  /** Optional gate: when the gate is present and fails, the clause is NOT_APPLICABLE. */
  applies_when?: { field: keyof Profile; op: "eq" | "in"; value: unknown };
};

export type SchemeBenefit = {
  text: Bilingual;
  amount: null | { value: number; currency: "INR" };
  amount_verified: boolean;
};

export type SchemeDeadline = {
  text: Bilingual;
  date: string | null;
  verified: boolean;
};

export type Scheme = {
  id: string;
  name: Bilingual;
  domain: SchemeDomain;
  scope: SchemeScope;
  provider_type: ProviderType;
  /** Visible tag, e.g. GOVERNMENT / PRIVATE / CSR / AIDED INSTITUTION. */
  provider_label: Bilingual;
  issuer: Bilingual;
  ministry: Bilingual;
  summary: Bilingual;
  eligibility: Clause[];
  documents: Bilingual[];
  benefit: SchemeBenefit;
  deadline: SchemeDeadline;
  /** null when no official URL is confirmed; UI shows "Check official portal". */
  official_url: string | null;
  /** Legacy mirror of official_url; "Check official portal" when null. */
  official_portal_url: string;
  last_verified_date: string | null;
  rule_verified: boolean;
  /** 0-100, ratio of verified fields to total checked fields. */
  verification_score: number;
  /** Step-by-step application guidance, English and Kannada. */
  guidance?: Bilingual[];
  /** Official URLs confirmed for this scheme; empty when none are listed. */
  official_urls?: string[];
  /** Display track, e.g. "Government" | "Private/CSR" | "Aided/Institutional". Additive. */
  provider_track?: ProviderTrack;
  /** Thematic category facet, derived from domain when absent. */
  category?: SchemeCategory;
  /** Jurisdiction facet. */
  jurisdiction?: Jurisdiction;
  /** Versioned record schema. Optional so existing Scheme literals still compile. */
  record_version?: number;
  /** Scheme type facet. */
  scheme_type?: SchemeType;
  /** Geography label, e.g. "India", "Karnataka" or "Not specified". */
  geography?: string;
  /** Field-level verification for the key fields. */
  verification_status?: Record<SchemeVerificationFields, FieldVerification>;
  /** ISO 8601 timestamp of the last scheme-level verification, or null. */
  last_verified_at?: string | null;
  /** Source metadata for the scheme's published information. */
  source?: SchemeSource;
};

/** Scheme type facet for the versioned data model. */
export type SchemeType = "central" | "state" | "ut" | "local" | "public_institutional" | "private_csr";

/** Verification status for a single field or record. */
export type VerificationStatus = "verified" | "partial" | "unverified" | "expired";

/** Verification state of one field. last_verified_at is ISO 8601 or null. */
export type FieldVerification = { status: VerificationStatus; last_verified_at: string | null };

/** Where a scheme's information was published and when it was retrieved. */
export type SchemeSource = { publisher: string; url: string | null; retrieved_at: string | null };

/** Current version of the scheme record schema. */
export const SCHEME_RECORD_VERSION = 2;

/** Key fields that carry field-level verification. */
export type SchemeVerificationFields = "amount" | "deadline" | "eligibility" | "documents";

/**
 * Bilingual UI labels for verification status. Unverified, partial and expired values
 * must never be presented as verified.
 */
export const VERIFICATION_LABEL: Record<VerificationStatus, Bilingual> = {
  unverified: {
    en: "Check official portal",
    kn: "ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ",
  },
  partial: {
    en: "Partly checked. Check official portal",
    kn: "ಭಾಗಶಃ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ",
  },
  expired: {
    en: "Out of date. Check official portal",
    kn: "ಅವಧಿ ಮೀರಿದೆ. ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ",
  },
  verified: {
    en: "Listed on official portal",
    kn: "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
  },
};
