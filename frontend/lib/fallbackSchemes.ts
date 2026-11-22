// Offline catalogue of six Karnataka + Central public benefit schemes for student households.
// Amounts, income thresholds, deadlines, document lists and guideline PDFs are NOT verified here.
// Every unverified value is null or "Check official portal". Check the official portal before applying.

import type { EligibilityRule, Scheme } from "./types";

export const FALLBACK_NOTE =
  "Offline catalogue. Amounts, deadlines and guideline PDFs are not verified: check the official portal.";

const CHECK_PORTAL = "Check official portal";

// One neutral line per scheme. Scheme has no description field, so these are kept alongside the catalogue.
export const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  "nsp-central-sector-scholarship":
    "Central government scholarship for students in recognised institutions; check details on the official portal.",
  "karnataka-ssp-post-matric":
    "State post-matric scholarship for Karnataka students; check details on the official portal.",
  "karnataka-vidyasiri-maintenance":
    "Karnataka maintenance stipend for food and accommodation; check details on the official portal.",
  "karnataka-fee-reimbursement":
    "Karnataka fee reimbursement or concession for eligible students; check details on the official portal.",
  "ayushman-bharat-pmjay":
    "Central health insurance cover for eligible households; check details on the official portal.",
  "aicte-pragati":
    "AICTE support for technical education students; check details on the official portal.",
};

// Kannada one-liners, kept parallel to FALLBACK_DESCRIPTIONS. Review by a Kannada speaker before release.
export const FALLBACK_DESCRIPTIONS_KN: Record<string, string> = {
  "nsp-central-sector-scholarship":
    "ಕೇಂದ್ರ ಸರ್ಕಾರದ ವಿದ್ಯಾರ್ಥಿವೇತನ; ವಿವರಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
  "karnataka-ssp-post-matric":
    "ಕರ್ನಾಟಕ ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ ರಾಜ್ಯ ಪೋಸ್ಟ್-ಮೆಟ್ರಿಕ್ ವಿದ್ಯಾರ್ಥಿವೇತನ; ವಿವರಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
  "karnataka-vidyasiri-maintenance":
    "ಆಹಾರ ಮತ್ತು ವಸತಿಗಾಗಿ ಕರ್ನಾಟಕದ ನಿರ್ವಹಣಾ ಭತ್ಯೆ; ವಿವರಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
  "karnataka-fee-reimbursement":
    "ಅರ್ಹ ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ ಕರ್ನಾಟಕದ ಶುಲ್ಕ ಮರುಪಾವತಿ ಅಥವಾ ರಿಯಾಯಿತಿ; ವಿವರಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
  "ayushman-bharat-pmjay":
    "ಅರ್ಹ ಕುಟುಂಬಗಳಿಗಾಗಿ ಕೇಂದ್ರದ ಆರೋಗ್ಯ ವಿಮಾ ರಕ್ಷಣೆ; ವಿವರಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
  "aicte-pragati":
    "ತಾಂತ್ರಿಕ ಶಿಕ್ಷಣ ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ AICTE ಬೆಂಬಲ; ವಿವರಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
};

export type SchemeScope = "individual" | "household";

// Scheme (types.ts) has no scope field. It is added here as optional so types.ts stays untouched.
export type FallbackScheme = Scheme & { scope?: SchemeScope };

interface SchemeInput {
  id: string;
  name: string;
  provider: string;
  jurisdiction: string;
  benefit_type: string;
  scope: SchemeScope;
  official_url: string;
  eligibility_rules: EligibilityRule[];
}

function makeScheme(input: SchemeInput): FallbackScheme {
  return {
    id: input.id,
    name: input.name,
    provider: input.provider,
    jurisdiction: input.jurisdiction,
    benefit_type: input.benefit_type,
    scope: input.scope,
    academic_year: CHECK_PORTAL,
    eligibility_rules: input.eligibility_rules,
    required_documents: ["Check official portal for the document list"],
    application_steps: [
      "Open the official portal",
      "Read the official notice for this benefit before applying",
    ],
    application_url: input.official_url,
    guideline_url: null,
    deadline: null,
    verification_status: "unverified",
    field_verification: {
      eligibility: "unverified",
      amount: "unverified",
      deadline: "unverified",
      documents: "unverified",
    },
    last_verified_date: null,
    is_demonstration: false,
    official_url: input.official_url,
    guideline_pdf_url: null,
    provenance: "check_official_portal",
    documents_checklist: [],
    clause_highlights: [],
    source_checked_on: null,
    amount_status: "check_official_portal",
    deadline_status: "check_official_portal",
  };
}

function karnatakaStateRule(schemeId: string): EligibilityRule {
  return {
    id: `${schemeId}-state`,
    description: "Karnataka resident (confirm on the official portal)",
    field: "state",
    operator: "equals",
    value: "karnataka",
    mandatory: true,
    applies_when: null,
    reason_pass: "Your state is Karnataka, as this scheme requires.",
    reason_fail: "This scheme is for Karnataka residents, and your state is different.",
    reason_unknown: "Add your state to check this condition.",
    // Kannada text: review by a Kannada speaker before release.
    description_kn: "ಕರ್ನಾಟಕದ ನಿವಾಸಿ (ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ)",
    // Kannada text: review by a Kannada speaker before release.
    reason_kn: "ನಿಮ್ಮ ರಾಜ್ಯ ಕರ್ನಾಟಕ.",
  };
}

const PORTAL_KARNATAKA = "https://ssp.postmatric.karnataka.gov.in/";

export const FALLBACK_SCHEMES: FallbackScheme[] = [
  makeScheme({
    id: "nsp-central-sector-scholarship",
    scope: "individual",
    name: "NSP Central Sector Scholarship",
    provider: "Government of India (National Scholarship Portal)",
    jurisdiction: "Central",
    benefit_type: "scholarship",
    official_url: "https://scholarships.gov.in/",
    eligibility_rules: [],
  }),
  makeScheme({
    id: "karnataka-ssp-post-matric",
    scope: "individual",
    name: "Karnataka SSP Post-Matric Scholarship",
    provider: "Government of Karnataka (SSP)",
    jurisdiction: "Karnataka",
    benefit_type: "scholarship",
    official_url: PORTAL_KARNATAKA,
    eligibility_rules: [karnatakaStateRule("karnataka-ssp-post-matric")],
  }),
  makeScheme({
    id: "karnataka-vidyasiri-maintenance",
    scope: "individual",
    name: "Karnataka Vidyasiri food and accommodation maintenance stipend",
    provider: "Government of Karnataka",
    jurisdiction: "Karnataka",
    benefit_type: "hostel_stipend",
    official_url: PORTAL_KARNATAKA,
    eligibility_rules: [karnatakaStateRule("karnataka-vidyasiri-maintenance")],
  }),
  makeScheme({
    id: "karnataka-fee-reimbursement",
    scope: "individual",
    name: "Karnataka fee reimbursement / concession scheme",
    provider: "Government of Karnataka",
    jurisdiction: "Karnataka",
    benefit_type: "fee_reimbursement",
    official_url: PORTAL_KARNATAKA,
    eligibility_rules: [karnatakaStateRule("karnataka-fee-reimbursement")],
  }),
  makeScheme({
    id: "ayushman-bharat-pmjay",
    scope: "household",
    name: "Ayushman Bharat PM-JAY household health cover",
    provider: "Government of India (National Health Authority)",
    jurisdiction: "Central",
    benefit_type: "health_cover",
    official_url: "https://beneficiary.nha.gov.in/",
    eligibility_rules: [],
  }),
  makeScheme({
    id: "aicte-pragati",
    scope: "individual",
    name: "AICTE Pragati technical student support",
    provider: "All India Council for Technical Education",
    jurisdiction: "Central",
    benefit_type: "scholarship",
    official_url: "https://scholarships.gov.in/",
    eligibility_rules: [],
  }),
];
