import {
  DOMAIN_CATEGORY,
  SCHEME_RECORD_VERSION,
  type Bilingual,
  type Clause,
  type FieldVerification,
  type Jurisdiction,
  type ProviderTrack,
  type ProviderType,
  type Scheme,
  type SchemeDomain,
  type SchemeScope,
  type SchemeType,
} from "./schemeTypes";

// Indicative demo catalogue. No amounts, deadlines or income ceilings are stated.
// Every item is unverified in this build: amount and deadline read "Check official portal",
// and each item is labelled "Demonstration — unverified". Eligibility clauses describe rules
// as understood; confirm on the official portal before applying.

const CHECK_PORTAL: Bilingual = {
  en: "Check official portal",
  kn: "ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ",
};

const DEMO_LABEL: Bilingual = {
  en: "Demonstration — unverified.",
  kn: "ಪ್ರದರ್ಶನ — ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ.",
};

const PORTAL_SCHOLARSHIPS = "https://scholarships.gov.in";
const PORTAL_MYSCHEME = "https://www.myscheme.gov.in";
const PORTAL_PMJAY = "https://pmjay.gov.in";
const PORTAL_INDIA = "https://www.india.gov.in";

const DOC_CASTE: Bilingual = { en: "Caste certificate", kn: "ಜಾತಿ ಪ್ರಮಾಣಪತ್ರ" };
const DOC_INCOME: Bilingual = { en: "Income certificate", kn: "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ" };
const DOC_MARKS: Bilingual = { en: "Previous year marks card", kn: "ಹಿಂದಿನ ವರ್ಷದ ಅಂಕಪಟ್ಟಿ" };
const DOC_BONAFIDE: Bilingual = { en: "College bonafide certificate", kn: "ಕಾಲೇಜಿನ ಬೋನಫೈಡ್ ಪ್ರಮಾಣಪತ್ರ" };
const DOC_RATION: Bilingual = { en: "Ration card", kn: "ಪಡಿತರ ಚೀಟಿ" };
const DOC_HOSTEL: Bilingual = { en: "Hostel admission letter", kn: "ವಸತಿ ನಿಲಯ ಪ್ರವೇಶ ಪತ್ರ" };
const DOC_EDUCATION: Bilingual = { en: "Latest education certificate", kn: "ಇತ್ತೀಚಿನ ಶೈಕ್ಷಣಿಕ ಪ್ರಮಾಣಪತ್ರ" };
const DOC_ENROLMENT: Bilingual = { en: "Course enrolment proof", kn: "ಕೋರ್ಸ್ ದಾಖಲಾತಿ ಪುರಾವೆ" };
const DOC_SAVINGS: Bilingual = {
  en: "Savings bank account (details not collected here)",
  kn: "ಉಳಿತಾಯ ಬ್ಯಾಂಕ್ ಖಾತೆ (ವಿವರಗಳನ್ನು ಇಲ್ಲಿ ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ)",
};

const STUDENT_CLAUSE: Bilingual = {
  en: "Currently enrolled as a student",
  kn: "ಪ್ರಸ್ತುತ ವಿದ್ಯಾರ್ಥಿಯಾಗಿ ದಾಖಲಾಗಿರುವವರು",
};

const CAT_SC: Bilingual = { en: "Belongs to Scheduled Caste (SC)", kn: "ಪರಿಶಿಷ್ಟ ಜಾತಿ (SC) ಗೆ ಸೇರಿದವರು" };
const CAT_SC_OR_ST: Bilingual = {
  en: "Belongs to Scheduled Caste (SC) or Scheduled Tribe (ST)",
  kn: "ಪರಿಶಿಷ್ಟ ಜಾತಿ (SC) ಅಥವಾ ಪರಿಶಿಷ್ಟ ಪಂಗಡ (ST) ಗೆ ಸೇರಿದವರು",
};
const CAT_OBC: Bilingual = { en: "Belongs to Other Backward Class (OBC)", kn: "ಹಿಂದುಳಿದ ವರ್ಗ (OBC) ಗೆ ಸೇರಿದವರು" };
const CAT_MINORITY: Bilingual = {
  en: "Belongs to a notified minority community",
  kn: "ಅಧಿಸೂಚಿತ ಅಲ್ಪಸಂಖ್ಯಾತ ಸಮುದಾಯಕ್ಕೆ ಸೇರಿದವರು",
};
const BPL_CLAUSE: Bilingual = {
  en: "Household holds a BPL or ration card",
  kn: "ಕುಟುಂಬವು ಬಿಪಿಎಲ್ ಅಥವಾ ಪಡಿತರ ಚೀಟಿ ಹೊಂದಿದೆ",
};
const FARMER_CLAUSE: Bilingual = { en: "Is a farmer (yes/no only)", kn: "ರೈತರು (ಹೌದು/ಇಲ್ಲ ಮಾತ್ರ)" };
const BANK_CLAUSE: Bilingual = {
  en: "Holds a savings bank account (yes/no only)",
  kn: "ಉಳಿತಾಯ ಬ್ಯಾಂಕ್ ಖಾತೆ ಹೊಂದಿರುವವರು (ಹೌದು/ಇಲ್ಲ ಮಾತ್ರ)",
};
const INCOME_LIMIT_CLAUSE: Bilingual = {
  en: "Annual family income within the scheme limit (limit not published in this build)",
  kn: "ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ ಯೋಜನೆಯ ಮಿತಿಯೊಳಗೆ (ಮಿತಿಯನ್ನು ಈ ಆವೃತ್ತಿಯಲ್ಲಿ ಪ್ರಕಟಿಸಿಲ್ಲ)",
};
const MARKS_MIN_CLAUSE: Bilingual = {
  en: "Marks percentage meets the scheme minimum (minimum not published in this build)",
  kn: "ಅಂಕ ಶೇಕಡಾವಾರು ಯೋಜನೆಯ ಕನಿಷ್ಠ ಮಿತಿಗೆ ಸಮ (ಕನಿಷ್ಠ ಮಿತಿಯನ್ನು ಈ ಆವೃತ್ತಿಯಲ್ಲಿ ಪ್ರಕಟಿಸಿಲ್ಲ)",
};
const DOC_LAND: Bilingual = { en: "Land ownership record (RTC / pahani)", kn: "ಭೂ ಮಾಲೀಕತ್ವ ದಾಖಲೆ (RTC / ಪಹಣಿ)" };
const DOC_AGE: Bilingual = { en: "Age proof document", kn: "ವಯಸ್ಸಿನ ಪುರಾವೆ ದಾಖಲೆ" };

/** Step-by-step guidance shared by every scheme in this build. */
const GENERIC_GUIDANCE: Bilingual[] = [
  {
    en: "Step 1: Open the official portal and confirm the current rules.",
    kn: "ಹಂತ 1: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ತೆರೆದು ಪ್ರಸ್ತುತ ನಿಯಮಗಳನ್ನು ಖಚಿತಪಡಿಸಿ.",
  },
  {
    en: "Step 2: Compare the eligibility checklist with your own details.",
    kn: "ಹಂತ 2: ಅರ್ಹತಾ ಪಟ್ಟಿಯನ್ನು ನಿಮ್ಮ ಸ್ವಂತ ವಿವರಗಳೊಂದಿಗೆ ಹೋಲಿಸಿ.",
  },
  {
    en: "Step 3: Keep the documents listed for this scheme ready.",
    kn: "ಹಂತ 3: ಈ ಯೋಜನೆಗೆ ಪಟ್ಟಿ ಮಾಡಲಾದ ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ.",
  },
  {
    en: "Step 4: Apply only on the official portal or at the listed office, and check the deadline there.",
    kn: "ಹಂತ 4: ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅಥವಾ ಪಟ್ಟಿ ಮಾಡಲಾದ ಕಚೇರಿಯಲ್ಲಿ ಮಾತ್ರ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ; ಗಡುವನ್ನು ಅಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.",
  },
];

/** Adds a bilingual explanation to a clause that has none. Exact published limits are never invented. */
function withClauseDescription(clause: Clause): Clause {
  if (clause.description) return clause;
  return {
    ...clause,
    description: {
      en: `Checked against your profile: ${clause.text.en}. Confirm the exact rule on the official portal.`,
      kn: `ನಿಮ್ಮ ಪ್ರೊಫೈಲ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ: ${clause.text.kn}. ನಿಖರ ನಿಯಮವನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಖಚಿತಪಡಿಸಿ.`,
    },
  };
}

/** Jurisdiction from the issuer text: Karnataka issuers, other government issuers are Central. */
function jurisdictionOf(provider: ProviderType, issuerEn: string): Jurisdiction {
  if (provider !== "government") return "Other";
  return /Karnataka/.test(issuerEn) ? "Karnataka" : "Central";
}

const PROVIDER_TRACKS: Record<ProviderType, ProviderTrack> = {
  government: "Government",
  private_csr: "Private/CSR",
  aided_institutional: "Aided/Institutional",
};

const PROVIDER_LABELS: Record<ProviderType, Bilingual> = {
  government: { en: "GOVERNMENT", kn: "ಸರ್ಕಾರಿ" },
  private_csr: { en: "PRIVATE / CSR", kn: "ಖಾಸಗಿ / CSR" },
  aided_institutional: { en: "AIDED INSTITUTION", kn: "ಅನುದಾನಿತ ಸಂಸ್ಥೆ" },
};

/** Extra demo-only fields kept local so the exported Scheme type stays unchanged. */
type CatalogueScheme = Scheme & {
  verified: boolean;
  verification_formula: string;
};

interface Spec {
  id: string;
  name: Bilingual;
  domain: SchemeDomain;
  scope: SchemeScope;
  issuer: Bilingual;
  summary: Bilingual;
  eligibility: Scheme["eligibility"];
  documents: Bilingual[];
  /** Official portal root, or null when no official URL is confirmed for this scheme. */
  url: string | null;
}

// Key fields: amount, deadline, eligibility rules, documents. None are verified in this build.
const KEY_FIELD_CHECKS = {
  amount: false,
  deadline: false,
  eligibility: false,
  documents: false,
} as const;

function verificationFor(checks: boolean[]): { score: number; formula: string } {
  const verified = checks.filter(Boolean).length;
  const total = checks.length;
  const score = Math.round((100 * verified) / total);
  return { score, formula: `${verified} of ${total} key fields verified = ${score}` };
}

/** Scheme type facet derived from provider and jurisdiction. */
function schemeTypeOf(provider: ProviderType, jurisdiction: Jurisdiction): SchemeType {
  if (provider === "private_csr") return "private_csr";
  if (provider === "aided_institutional") return "public_institutional";
  return jurisdiction === "Karnataka" ? "state" : "central";
}

/** Geography label derived from provider and jurisdiction. */
function geographyOf(provider: ProviderType, jurisdiction: Jurisdiction): string {
  if (provider === "aided_institutional") return "Not specified";
  if (provider === "private_csr") return "India";
  return jurisdiction === "Karnataka" ? "Karnataka" : "India";
}

/** Field-level verification state derived from a KEY_FIELD_CHECKS entry. */
function fieldVerificationOf(checked: boolean): FieldVerification {
  return { status: checked ? "verified" : "unverified", last_verified_at: null };
}

function build(provider: ProviderType, s: Spec): CatalogueScheme {
  const v = verificationFor([
    KEY_FIELD_CHECKS.amount,
    KEY_FIELD_CHECKS.deadline,
    KEY_FIELD_CHECKS.eligibility,
    KEY_FIELD_CHECKS.documents,
  ]);
  const jurisdiction = jurisdictionOf(provider, s.issuer.en);
  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    scope: s.scope,
    provider_type: provider,
    provider_label: PROVIDER_LABELS[provider],
    issuer: s.issuer,
    ministry: s.issuer,
    summary: {
      en: `${DEMO_LABEL.en} ${s.summary.en}`,
      kn: `${DEMO_LABEL.kn} ${s.summary.kn}`,
    },
    eligibility: s.eligibility.map(withClauseDescription),
    documents: s.documents,
    benefit: { text: CHECK_PORTAL, amount: null, amount_verified: false },
    deadline: { text: CHECK_PORTAL, date: null, verified: false },
    official_url: s.url,
    official_urls: s.url ? [s.url] : [],
    official_portal_url: s.url ?? CHECK_PORTAL.en,
    last_verified_date: null,
    rule_verified: false,
    verification_score: v.score,
    verified: false,
    verification_formula: v.formula,
    guidance: GENERIC_GUIDANCE,
    provider_track: PROVIDER_TRACKS[provider],
    category: DOMAIN_CATEGORY[s.domain],
    jurisdiction,
    record_version: SCHEME_RECORD_VERSION,
    scheme_type: schemeTypeOf(provider, jurisdiction),
    geography: geographyOf(provider, jurisdiction),
    verification_status: {
      amount: fieldVerificationOf(KEY_FIELD_CHECKS.amount),
      deadline: fieldVerificationOf(KEY_FIELD_CHECKS.deadline),
      eligibility: fieldVerificationOf(KEY_FIELD_CHECKS.eligibility),
      documents: fieldVerificationOf(KEY_FIELD_CHECKS.documents),
    },
    last_verified_at: null,
    source: { publisher: s.issuer.en, url: s.url, retrieved_at: null },
  };
}

const DEMO_SCHEMES: CatalogueScheme[] = [
  // Government
  build("government", {
    id: "nsp-sc-post-matric-central",
    name: {
      en: "Post-Matric Scholarship for SC Students (Central)",
      kn: "ಪರಿಶಿಷ್ಟ ಜಾತಿ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪೋಸ್ಟ್-ಮೆಟ್ರಿಕ್ ಶಿಷ್ಯವೇತನ (ಕೇಂದ್ರ)",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: {
      en: "Ministry of Social Justice & Empowerment, Government of India",
      kn: "ಸಾಮಾಜಿಕ ನ್ಯಾಯ ಮತ್ತು ಸಬಲೀಕರಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Central post-matric scholarship for SC students, applied for through the national scholarship portal.",
      kn: "ರಾಷ್ಟ್ರೀಯ ಶಿಷ್ಯವೇತನ ಪೋರ್ಟಲ್ ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಪರಿಶಿಷ್ಟ ಜಾತಿ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಕೇಂದ್ರ ಶಿಷ್ಯವೇತನ.",
    },
    eligibility: [
      { id: "nsp-sc-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      { id: "nsp-sc-category", text: CAT_SC, field: "category", op: "in", value: ["SC"] },
    ],
    documents: [DOC_CASTE, DOC_INCOME, DOC_BONAFIDE, DOC_MARKS],
    url: PORTAL_SCHOLARSHIPS,
  }),
  build("government", {
    id: "ssp-obc-post-matric-karnataka",
    name: {
      en: "Post-Matric Scholarship for OBC Students (Karnataka)",
      kn: "ಹಿಂದುಳಿದ ವರ್ಗ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪೋಸ್ಟ್-ಮೆಟ್ರಿಕ್ ಶಿಷ್ಯವೇತನ (ಕರ್ನಾಟಕ)",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: {
      en: "Department of Social Welfare, Government of Karnataka",
      kn: "ಸಮಾಜ ಕಲ್ಯಾಣ ಇಲಾಖೆ, ಕರ್ನಾಟಕ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Post-matriculation scholarship for OBC students. Income rules: check official portal.",
      kn: "ಹಿಂದುಳಿದ ವರ್ಗ ವಿದ್ಯಾರ್ಥಿಗಳ ಪೋಸ್ಟ್-ಮೆಟ್ರಿಕ್ ಶಿಷ್ಯವೇತನ. ಆದಾಯ ನಿಯಮಗಳು: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      { id: "ssp-obc-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      { id: "ssp-obc-category", text: CAT_OBC, field: "category", op: "in", value: ["OBC"] },
    ],
    documents: [DOC_CASTE, DOC_INCOME, DOC_MARKS, DOC_BONAFIDE],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "pre-matric-sc-st",
    name: {
      en: "Pre-Matric Scholarship for SC/ST Students (Classes 1–10)",
      kn: "ಪರಿಶಿಷ್ಟ ಜಾತಿ/ಪಂಗಡ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪ್ರಿ-ಮೆಟ್ರಿಕ್ ಶಿಷ್ಯವೇತನ (1–10ನೇ ತರಗತಿ)",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: {
      en: "Department of Social Welfare, Government of Karnataka",
      kn: "ಸಮಾಜ ಕಲ್ಯಾಣ ಇಲಾಖೆ, ಕರ್ನಾಟಕ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Pre-matriculation scholarship for SC and ST students in Classes 1 to 10.",
      kn: "1 ರಿಂದ 10ನೇ ತರಗತಿಯವರೆಗಿನ ಪರಿಶಿಷ್ಟ ಜಾತಿ ಮತ್ತು ಪಂಗಡ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪ್ರಿ-ಮೆಟ್ರಿಕ್ ಶಿಷ್ಯವೇತನ.",
    },
    eligibility: [
      { id: "pre-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      {
        id: "pre-class",
        text: { en: "Studying in Class 1 to 10", kn: "1 ರಿಂದ 10ನೇ ತರಗತಿಯಲ್ಲಿ ಓದುತ್ತಿರುವವರು" },
        field: "student_class",
        op: "in",
        value: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      },
      { id: "pre-category", text: CAT_SC_OR_ST, field: "category", op: "in", value: ["SC", "ST"] },
    ],
    documents: [DOC_CASTE, DOC_INCOME, DOC_BONAFIDE],
    url: PORTAL_SCHOLARSHIPS,
  }),
  build("government", {
    id: "vidyasiri-hostel",
    name: {
      en: "Vidyasiri – Hostel Accommodation & Food (Government-Aided Hostels)",
      kn: "ವಿದ್ಯಾಸಿರಿ – ಸರ್ಕಾರಿ ಅನುದಾನಿತ ವಸತಿ ನಿಲಯಗಳಲ್ಲಿ ವಸತಿ ಮತ್ತು ಊಟ",
    },
    domain: "hostel_stipend",
    scope: "individual",
    issuer: { en: "Government of Karnataka", kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರ" },
    summary: {
      en: "Support for students living in government-aided hostels for food and accommodation.",
      kn: "ಸರ್ಕಾರಿ ಅನುದಾನಿತ ವಸತಿ ನಿಲಯಗಳಲ್ಲಿ ವಾಸಿಸುವ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಊಟ ಮತ್ತು ವಸತಿ ಬೆಂಬಲ.",
    },
    eligibility: [
      { id: "vid-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      {
        id: "vid-hostel",
        text: {
          en: "Lives in a government-aided hostel",
          kn: "ಸರ್ಕಾರಿ ಅನುದಾನಿತ ವಸತಿ ನಿಲಯದಲ್ಲಿ ವಾಸಿಸುತ್ತಿರುವವರು",
        },
        field: "is_hostel_resident",
        op: "bool",
        value: true,
      },
    ],
    documents: [DOC_HOSTEL, DOC_BONAFIDE, DOC_CASTE],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "fee-reimbursement-govt-institutions",
    name: {
      en: "Fee Reimbursement for SC/ST Students in Government Institutions",
      kn: "ಸರ್ಕಾರಿ ಸಂಸ್ಥೆಗಳ ಪರಿಶಿಷ್ಟ ಜಾತಿ/ಪಂಗಡ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಶುಲ್ಕ ಮರುಪಾವತಿ",
    },
    domain: "fee_reimbursement",
    scope: "individual",
    issuer: {
      en: "Department of Social Welfare, Government of Karnataka",
      kn: "ಸಮಾಜ ಕಲ್ಯಾಣ ಇಲಾಖೆ, ಕರ್ನಾಟಕ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Reimbursement of tuition fees for eligible SC and ST students in government institutions.",
      kn: "ಅರ್ಹ ಪರಿಶಿಷ್ಟ ಜಾತಿ/ಪಂಗಡ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಸರ್ಕಾರಿ ಸಂಸ್ಥೆಗಳಲ್ಲಿ ಬೋಧನಾ ಶುಲ್ಕದ ಮರುಪಾವತಿ.",
    },
    eligibility: [
      { id: "fee-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      { id: "fee-category", text: CAT_SC_OR_ST, field: "category", op: "in", value: ["SC", "ST"] },
    ],
    documents: [DOC_CASTE, DOC_INCOME, DOC_BONAFIDE, DOC_MARKS],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "pmjay-household-health",
    name: {
      en: "Ayushman Bharat PM-JAY – Household Health Cover",
      kn: "ಆಯುಷ್ಮಾನ್ ಭಾರತ್ PM-JAY – ಕುಟುಂಬ ಆರೋಗ್ಯ ವಿಮೆ",
    },
    domain: "health_cover",
    scope: "household",
    issuer: {
      en: "National Health Authority, Government of India",
      kn: "ರಾಷ್ಟ್ರೀಯ ಆರೋಗ್ಯ ಪ್ರಾಧಿಕಾರ, ಭಾರತ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Cashless hospital cover for eligible families. Household eligibility is checked by the scheme.",
      kn: "ಅರ್ಹ ಕುಟುಂಬಗಳಿಗೆ ನಗದುರಹಿತ ಆಸ್ಪತ್ರೆ ವಿಮಾ ರಕ್ಷಣೆ. ಕುಟುಂಬದ ಅರ್ಹತೆಯನ್ನು ಯೋಜನೆಯೇ ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    },
    eligibility: [
      {
        id: "pmjay-ration",
        text: {
          en: "Household holds a BPL or ration card (eligibility list to be confirmed)",
          kn: "ಕುಟುಂಬವು ಬಿಪಿಎಲ್ ಅಥವಾ ಪಡಿತರ ಚೀಟಿ ಹೊಂದಿದೆ (ಅರ್ಹತಾ ಪಟ್ಟಿಯನ್ನು ದೃಢಪಡಿಸಬೇಕು)",
        },
        field: "has_bpl_or_ration_card",
        op: "bool",
        value: true,
      },
    ],
    documents: [DOC_RATION, DOC_INCOME],
    url: PORTAL_PMJAY,
  }),
  build("government", {
    id: "pmsby-individual",
    name: {
      en: "Pradhan Mantri Suraksha Bima Yojana – Accident Cover",
      kn: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಸುರಕ್ಷಾ ಬಿಮಾ ಯೋಜನೆ – ಅಪಘಾತ ರಕ್ಷಣೆ",
    },
    domain: "insurance_protection",
    scope: "individual",
    issuer: {
      en: "Ministry of Finance, Government of India",
      kn: "ಹಣಕಾಸು ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Accident insurance scheme. Premium and cover amounts: check official portal.",
      kn: "ಅಪಘಾತ ವಿಮಾ ಯೋಜನೆ. ಪ್ರೀಮಿಯಂ ಮತ್ತು ರಕ್ಷಣಾ ಮೊತ್ತ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      {
        id: "pmsby-account",
        text: { en: "Holds a savings bank account (yes/no only)", kn: "ಉಳಿತಾಯ ಬ್ಯಾಂಕ್ ಖಾತೆ ಹೊಂದಿರುವವರು (ಹೌದು/ಇಲ್ಲ ಮಾತ್ರ)" },
        field: "has_bank_account",
        op: "bool",
        value: true,
      },
    ],
    documents: [DOC_SAVINGS],
    url: PORTAL_INDIA,
  }),
  build("government", {
    id: "govt-skill-development-fellowship",
    name: {
      en: "Government Skill Development Fellowship",
      kn: "ಸರ್ಕಾರಿ ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ ಫೆಲೋಶಿಪ್",
    },
    domain: "fellowship_skill",
    scope: "individual",
    issuer: {
      en: "Ministry of Skill Development & Entrepreneurship, Government of India",
      kn: "ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ ಮತ್ತು ಉದ್ಯಮಶೀಲತಾ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Skill training fellowship for students in diploma and undergraduate courses.",
      kn: "ಡಿಪ್ಲೊಮಾ ಮತ್ತು ಪದವಿ ಕೋರ್ಸ್‌ಗಳ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಕೌಶಲ್ಯ ತರಬೇತಿ ಫೆಲೋಶಿಪ್.",
    },
    eligibility: [
      {
        id: "skill-level",
        text: { en: "Enrolled in a diploma or undergraduate course", kn: "ಡಿಪ್ಲೊಮಾ ಅಥವಾ ಪದವಿ ಕೋರ್ಸ್‌ಗೆ ದಾಖಲಾದವರು" },
        field: "education_level",
        op: "in",
        value: ["diploma", "ug"],
      },
    ],
    documents: [DOC_EDUCATION, DOC_ENROLMENT],
    url: PORTAL_MYSCHEME,
  }),

  // Private / CSR (demonstration listings; not confirmed with the sponsor)
  build("private_csr", {
    id: "csr-azim-premji-secondary",
    name: {
      en: "Azim Premji Foundation Scholarship – Secondary Students",
      kn: "ಅಜೀಂ ಪ್ರೇಮ್‌ಜಿ ಫೌಂಡೇಶನ್ ಶಿಷ್ಯವೇತನ – ಮಾಧ್ಯಮಿಕ ವಿದ್ಯಾರ್ಥಿಗಳು",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: { en: "Azim Premji Foundation", kn: "ಅಜೀಂ ಪ್ರೇಮ್‌ಜಿ ಫೌಂಡೇಶನ್" },
    summary: {
      en: "Private CSR scholarship track for Class 9 to 12 students.",
      kn: "9 ರಿಂದ 12ನೇ ತರಗತಿಯ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಖಾಸಗಿ CSR ಶಿಷ್ಯವೇತನ ಟ್ರ್ಯಾಕ್.",
    },
    eligibility: [
      { id: "azim-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      {
        id: "azim-class",
        text: { en: "Studying in Class 9 to 12", kn: "9 ರಿಂದ 12ನೇ ತರಗತಿಯಲ್ಲಿ ಓದುತ್ತಿರುವವರು" },
        field: "student_class",
        op: "in",
        value: ["9", "10", "11", "12"],
      },
    ],
    documents: [DOC_INCOME, DOC_MARKS, DOC_BONAFIDE],
    url: null,
  }),
  build("private_csr", {
    id: "csr-tata-capital-pankh-ug",
    name: {
      en: "Tata Capital Pankh – Undergraduate Track",
      kn: "ಟಾಟಾ ಕ್ಯಾಪಿಟಲ್ ಪಂಖ್ – ಪದವಿ ಟ್ರ್ಯಾಕ್",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: { en: "Tata Capital", kn: "ಟಾಟಾ ಕ್ಯಾಪಿಟಲ್" },
    summary: {
      en: "Private CSR scholarship track for undergraduate and diploma students.",
      kn: "ಪದವಿ ಮತ್ತು ಡಿಪ್ಲೊಮಾ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಖಾಸಗಿ CSR ಶಿಷ್ಯವೇತನ ಟ್ರ್ಯಾಕ್.",
    },
    eligibility: [
      { id: "tata-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      {
        id: "tata-level",
        text: { en: "Enrolled in undergraduate or diploma study", kn: "ಪದವಿ ಅಥವಾ ಡಿಪ್ಲೊಮಾ ಅಧ್ಯಯನದಲ್ಲಿ ದಾಖಲಾದವರು" },
        field: "education_level",
        op: "in",
        value: ["ug", "diploma"],
      },
    ],
    documents: [DOC_BONAFIDE, DOC_MARKS, DOC_INCOME],
    url: null,
  }),
  build("private_csr", {
    id: "csr-hdfc-parivartan-skill",
    name: {
      en: "HDFC Parivartan – Skill Training Fellowship",
      kn: "ಎಚ್‌ಡಿಎಫ್‌ಸಿ ಪರಿವರ್ತನ್ – ಕೌಶಲ್ಯ ತರಬೇತಿ ಫೆಲೋಶಿಪ್",
    },
    domain: "fellowship_skill",
    scope: "individual",
    issuer: { en: "HDFC Bank Parivartan", kn: "ಎಚ್‌ಡಿಎಫ್‌ಸಿ ಬ್ಯಾಂಕ್ ಪರಿವರ್ತನ್" },
    summary: {
      en: "Skill training fellowship funded through corporate social responsibility programmes.",
      kn: "ಕಾರ್ಪೊರೇಟ್ ಸಾಮಾಜಿಕ ಜವಾಬ್ದಾರಿ ಕಾರ್ಯಕ್ರಮಗಳ ಮೂಲಕ ಧನಸಹಾಯ ಪಡೆಯುವ ಕೌಶಲ್ಯ ತರಬೇತಿ ಫೆಲೋಶಿಪ್.",
    },
    eligibility: [
      {
        id: "hdfc-level",
        text: { en: "Enrolled in a diploma or undergraduate course", kn: "ಡಿಪ್ಲೊಮಾ ಅಥವಾ ಪದವಿ ಕೋರ್ಸ್‌ಗೆ ದಾಖಲಾದವರು" },
        field: "education_level",
        op: "in",
        value: ["diploma", "ug"],
      },
    ],
    documents: [DOC_BONAFIDE, DOC_EDUCATION],
    url: null,
  }),
  build("private_csr", {
    id: "csr-reliance-community-health",
    name: {
      en: "Reliance Foundation – Community Health Support",
      kn: "ರಿಲಯನ್ಸ್ ಫೌಂಡೇಶನ್ – ಸಮುದಾಯ ಆರೋಗ್ಯ ಬೆಂಬಲ",
    },
    domain: "health_cover",
    scope: "household",
    issuer: { en: "Reliance Foundation", kn: "ರಿಲಯನ್ಸ್ ಫೌಂಡೇಶನ್" },
    summary: {
      en: "Private CSR health support for low-income households.",
      kn: "ಕಡಿಮೆ ಆದಾಯದ ಕುಟುಂಬಗಳಿಗೆ ಖಾಸಗಿ CSR ಆರೋಗ್ಯ ಬೆಂಬಲ.",
    },
    eligibility: [
      {
        id: "reliance-ration",
        text: { en: "Household holds a BPL or ration card", kn: "ಕುಟುಂಬವು ಬಿಪಿಎಲ್ ಅಥವಾ ಪಡಿತರ ಚೀಟಿ ಹೊಂದಿದೆ" },
        field: "has_bpl_or_ration_card",
        op: "bool",
        value: true,
      },
    ],
    documents: [DOC_RATION, DOC_INCOME],
    url: null,
  }),

  // Aided institutional (institution-level schemes; per-college rules apply)
  build("aided_institutional", {
    id: "aided-college-fee-concession",
    name: {
      en: "Aided College Fee Concession – Household Income Review",
      kn: "ಅನುದಾನಿತ ಕಾಲೇಜು ಶುಲ್ಕ ರಿಯಾಯಿತಿ – ಕುಟುಂಬ ಆದಾಯ ಪರಿಶೀಲನೆ",
    },
    domain: "fee_reimbursement",
    scope: "household",
    issuer: {
      en: "Aided institution (rules set per college)",
      kn: "ಅನುದಾನಿತ ಸಂಸ್ಥೆ (ನಿಯಮಗಳು ಪ್ರತಿ ಕಾಲೇಜಿಗೆ ನಿಗದಿ)",
    },
    summary: {
      en: "Fee concession offered by aided colleges after household income review. Fee schedule: check official portal.",
      kn: "ಕುಟುಂಬ ಆದಾಯ ಪರಿಶೀಲನೆಯ ನಂತರ ಅನುದಾನಿತ ಕಾಲೇಜುಗಳು ನೀಡುವ ಶುಲ್ಕ ರಿಯಾಯಿತಿ. ಶುಲ್ಕ ಪಟ್ಟಿ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      { id: "aided-fee-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
    ],
    documents: [DOC_BONAFIDE, DOC_INCOME],
    url: null,
  }),
  build("aided_institutional", {
    id: "aided-institutional-hostel-grant",
    name: {
      en: "Institutional Hostel Grant (Aided)",
      kn: "ಸಂಸ್ಥೆಯ ವಸತಿ ನಿಲಯ ಅನುದಾನ (ಅನುದಾನಿತ)",
    },
    domain: "hostel_stipend",
    scope: "individual",
    issuer: {
      en: "Aided institution (rules set per college)",
      kn: "ಅನುದಾನಿತ ಸಂಸ್ಥೆ (ನಿಯಮಗಳು ಪ್ರತಿ ಕಾಲೇಜಿಗೆ ನಿಗದಿ)",
    },
    summary: {
      en: "Hostel grant administered by aided institutions for resident students.",
      kn: "ವಸತಿ ನಿಲಯದಲ್ಲಿ ವಾಸಿಸುವ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಅನುದಾನಿತ ಸಂಸ್ಥೆಗಳು ನಿರ್ವಹಿಸುವ ವಸತಿ ನಿಲಯ ಅನುದಾನ.",
    },
    eligibility: [
      {
        id: "aided-hostel-resident",
        text: { en: "Lives in an institutional hostel", kn: "ಸಂಸ್ಥೆಯ ವಸತಿ ನಿಲಯದಲ್ಲಿ ವಾಸಿಸುವವರು" },
        field: "is_hostel_resident",
        op: "bool",
        value: true,
      },
    ],
    documents: [DOC_HOSTEL, DOC_BONAFIDE],
    url: null,
  }),
  build("aided_institutional", {
    id: "aided-institutional-lab-grant",
    name: {
      en: "Institutional Laboratory Grant (Aided)",
      kn: "ಸಂಸ್ಥೆಯ ಪ್ರಯೋಗಾಲಯ ಅನುದಾನ (ಅನುದಾನಿತ)",
    },
    domain: "fellowship_skill",
    scope: "individual",
    issuer: {
      en: "Aided institution (rules set per college)",
      kn: "ಅನುದಾನಿತ ಸಂಸ್ಥೆ (ನಿಯಮಗಳು ಪ್ರತಿ ಕಾಲೇಜಿಗೆ ನಿಗದಿ)",
    },
    summary: {
      en: "Laboratory access grant for enrolled students in aided institutions.",
      kn: "ಅನುದಾನಿತ ಸಂಸ್ಥೆಗಳ ದಾಖಲಾದ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪ್ರಯೋಗಾಲಯ ಬಳಕೆ ಅನುದಾನ.",
    },
    eligibility: [
      { id: "aided-lab-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
    ],
    documents: [DOC_BONAFIDE, DOC_ENROLMENT],
    url: null,
  }),

  // Central (India) government schemes: scholarships, housing, insurance and pension, farmer and skill support
  build("government", {
    id: "central-pm-yasasvi-obc",
    name: {
      en: "PM YASASVI – Scholarship for OBC Students (Central)",
      kn: "PM YASASVI – ಹಿಂದುಳಿದ ವರ್ಗ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಶಿಷ್ಯವೇತನ (ಕೇಂದ್ರ)",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: {
      en: "Ministry of Social Justice & Empowerment, Government of India",
      kn: "ಸಾಮಾಜಿಕ ನ್ಯಾಯ ಮತ್ತು ಸಬಲೀಕರಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Central scholarship track for OBC students, applied for through the national scholarship portal.",
      kn: "ರಾಷ್ಟ್ರೀಯ ಶಿಷ್ಯವೇತನ ಪೋರ್ಟಲ್ ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಹಿಂದುಳಿದ ವರ್ಗ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಕೇಂದ್ರ ಶಿಷ್ಯವೇತನ.",
    },
    eligibility: [
      { id: "pmyas-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      { id: "pmyas-category", text: CAT_OBC, field: "category", op: "in", value: ["OBC"] },
    ],
    documents: [DOC_CASTE, DOC_INCOME, DOC_MARKS, DOC_BONAFIDE],
    url: PORTAL_SCHOLARSHIPS,
  }),
  build("government", {
    id: "central-csss-college-university",
    name: {
      en: "Central Sector Scholarship for College and University Students",
      kn: "ಕಾಲೇಜು ಮತ್ತು ವಿಶ್ವವಿದ್ಯಾಲಯ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಕೇಂದ್ರ ವಲಯ ಶಿಷ್ಯವೇತನ",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: { en: "Ministry of Education, Government of India", kn: "ಶಿಕ್ಷಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ" },
    summary: {
      en: "Central scholarship for students in college or university, based on marks and course enrolment.",
      kn: "ಅಂಕಗಳು ಮತ್ತು ಕೋರ್ಸ್ ದಾಖಲಾತಿಯ ಆಧಾರದ ಮೇಲೆ ಕಾಲೇಜು ಅಥವಾ ವಿಶ್ವವಿದ್ಯಾಲಯ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಕೇಂದ್ರ ಶಿಷ್ಯವೇತನ.",
    },
    eligibility: [
      { id: "csss-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      { id: "csss-marks", text: MARKS_MIN_CLAUSE, field: "marks_percent", op: "gte", value: null },
    ],
    documents: [DOC_MARKS, DOC_BONAFIDE, DOC_INCOME],
    url: PORTAL_SCHOLARSHIPS,
  }),
  build("government", {
    id: "central-pmay-gramin-housing",
    name: {
      en: "Pradhan Mantri Awas Yojana – Gramin (Rural Housing, Central)",
      kn: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಆವಾಸ್ ಯೋಜನೆ – ಗ್ರಾಮೀಣ (ಕೇಂದ್ರ)",
    },
    domain: "housing_support",
    scope: "household",
    issuer: { en: "Ministry of Rural Development, Government of India", kn: "ಗ್ರಾಮೀಣಾಭಿವೃದ್ಧಿ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ" },
    summary: {
      en: "Central housing support for eligible rural households. Household eligibility is checked by the scheme.",
      kn: "ಅರ್ಹ ಗ್ರಾಮೀಣ ಕುಟುಂಬಗಳಿಗೆ ಕೇಂದ್ರ ವಸತಿ ಬೆಂಬಲ. ಕುಟುಂಬದ ಅರ್ಹತೆಯನ್ನು ಯೋಜನೆಯೇ ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    },
    eligibility: [
      { id: "pmayg-ration", text: BPL_CLAUSE, field: "has_bpl_or_ration_card", op: "bool", value: true },
      { id: "pmayg-income", text: INCOME_LIMIT_CLAUSE, field: "annual_family_income_inr", op: "lte", value: null },
    ],
    documents: [DOC_RATION, DOC_INCOME],
    url: PORTAL_INDIA,
  }),
  build("government", {
    id: "central-pmjjby-life-cover",
    name: {
      en: "Pradhan Mantri Jeevan Jyoti Bima Yojana – Life Cover (Central)",
      kn: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಜೀವನ ಜ್ಯೋತಿ ಬಿಮಾ ಯೋಜನೆ – ಜೀವ ರಕ್ಷಣೆ (ಕೇಂದ್ರ)",
    },
    domain: "insurance_protection",
    scope: "individual",
    issuer: { en: "Ministry of Finance, Government of India", kn: "ಹಣಕಾಸು ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ" },
    summary: {
      en: "Life insurance scheme linked to a savings bank account. Premium and cover amounts: check official portal.",
      kn: "ಉಳಿತಾಯ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಸಂಯೋಜಿತ ಜೀವ ವಿಮಾ ಯೋಜನೆ. ಪ್ರೀಮಿಯಂ ಮತ್ತು ರಕ್ಷಣಾ ಮೊತ್ತ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      { id: "pmjjby-account", text: BANK_CLAUSE, field: "has_bank_account", op: "bool", value: true },
      {
        id: "pmjjby-age",
        text: { en: "Aged 18 to 50 years", kn: "18 ರಿಂದ 50 ವರ್ಷ ವಯಸ್ಸಿನವರು" },
        field: "age_years",
        op: "gte",
        value: 18,
      },
    ],
    documents: [DOC_SAVINGS, DOC_AGE],
    url: PORTAL_INDIA,
  }),
  build("government", {
    id: "central-atal-pension-yojana",
    name: {
      en: "Atal Pension Yojana (Central)",
      kn: "ಅಟಲ್ ಪಿಂಚಣಿ ಯೋಜನೆ (ಕೇಂದ್ರ)",
    },
    domain: "social_security_pension",
    scope: "individual",
    issuer: { en: "Ministry of Finance, Government of India", kn: "ಹಣಕಾಸು ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ" },
    summary: {
      en: "Pension scheme for workers in the unorganised sector. Pension amounts: check official portal.",
      kn: "ಅಸಂಘಟಿತ ವಲಯದ ಕಾರ್ಮಿಕರಿಗೆ ಪಿಂಚಣಿ ಯೋಜನೆ. ಪಿಂಚಣಿ ಮೊತ್ತ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      { id: "apy-account", text: BANK_CLAUSE, field: "has_bank_account", op: "bool", value: true },
      {
        id: "apy-age",
        text: { en: "Aged 18 to 40 years", kn: "18 ರಿಂದ 40 ವರ್ಷ ವಯಸ್ಸಿನವರು" },
        field: "age_years",
        op: "gte",
        value: 18,
      },
      {
        id: "apy-age-max",
        text: { en: "Aged 40 years or below", kn: "40 ವರ್ಷ ಅಥವಾ ಕೆಳಗಿನ ವಯಸ್ಸಿನವರು" },
        field: "age_years",
        op: "lte",
        value: 40,
      },
    ],
    documents: [DOC_SAVINGS, DOC_AGE],
    url: PORTAL_INDIA,
  }),
  build("government", {
    id: "central-pm-kisan",
    name: {
      en: "PM-KISAN – Income Support for Farmer Families (Central)",
      kn: "PM-KISAN – ರೈತ ಕುಟುಂಬಗಳಿಗೆ ಆದಾಯ ಬೆಂಬಲ (ಕೇಂದ್ರ)",
    },
    domain: "farmer_livelihood",
    scope: "household",
    issuer: { en: "Ministry of Agriculture & Farmers Welfare, Government of India", kn: "ಕೃಷಿ ಮತ್ತು ರೈತ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ" },
    summary: {
      en: "Income support for farmer families. Instalment amounts and dates: check official portal.",
      kn: "ರೈತ ಕುಟುಂಬಗಳಿಗೆ ಆದಾಯ ಬೆಂಬಲ. ಕಂತಿನ ಮೊತ್ತ ಮತ್ತು ದಿನಾಂಕಗಳು: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [{ id: "pmkisan-farmer", text: FARMER_CLAUSE, field: "is_farmer", op: "bool", value: true }],
    documents: [DOC_LAND, DOC_SAVINGS],
    url: PORTAL_INDIA,
  }),
  build("government", {
    id: "central-pmkvy-skill-training",
    name: {
      en: "Pradhan Mantri Kaushal Vikas Yojana – Skill Training (Central)",
      kn: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕೌಶಲ್ಯ ವಿಕಾಸ ಯೋಜನೆ – ಕೌಶಲ್ಯ ತರಬೇತಿ (ಕೇಂದ್ರ)",
    },
    domain: "fellowship_skill",
    scope: "individual",
    issuer: {
      en: "Ministry of Skill Development & Entrepreneurship, Government of India",
      kn: "ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ ಮತ್ತು ಉದ್ಯಮಶೀಲತಾ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    },
    summary: {
      en: "Short skill training courses with certification. Course fees and stipends: check official portal.",
      kn: "ಪ್ರಮಾಣಪತ್ರದೊಂದಿಗೆ ಅಲ್ಪಾವಧಿ ಕೌಶಲ್ಯ ತರಬೇತಿ ಕೋರ್ಸ್‌ಗಳು. ಕೋರ್ಸ್ ಶುಲ್ಕ ಮತ್ತು ಭತ್ಯೆಗಳು: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      {
        id: "pmkvy-level",
        text: { en: "Studying or trained at school, diploma or undergraduate level", kn: "ಶಾಲೆ, ಡಿಪ್ಲೊಮಾ ಅಥವಾ ಪದವಿ ಮಟ್ಟದಲ್ಲಿ ಓದುತ್ತಿರುವವರು" },
        field: "education_level",
        op: "in",
        value: ["school", "diploma", "ug"],
      },
    ],
    documents: [DOC_EDUCATION, DOC_AGE],
    url: PORTAL_MYSCHEME,
  }),

  // Karnataka state government schemes (rules to be confirmed on the portal)
  build("government", {
    id: "ka-minority-post-matric-scholarship",
    name: {
      en: "Minority Students Post-Matric Scholarship (Karnataka)",
      kn: "ಅಲ್ಪಸಂಖ್ಯಾತ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪೋಸ್ಟ್-ಮೆಟ್ರಿಕ್ ಶಿಷ್ಯವೇತನ (ಕರ್ನಾಟಕ)",
    },
    domain: "scholarship",
    scope: "individual",
    issuer: { en: "Government of Karnataka", kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರ" },
    summary: {
      en: "Post-matriculation scholarship for minority community students in Karnataka. Amounts: check official portal.",
      kn: "ಕರ್ನಾಟಕದ ಅಲ್ಪಸಂಖ್ಯಾತ ಸಮುದಾಯ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪೋಸ್ಟ್-ಮೆಟ್ರಿಕ್ ಶಿಷ್ಯವೇತನ. ಮೊತ್ತ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      { id: "kamin-student", text: STUDENT_CLAUSE, field: "is_student", op: "bool", value: true },
      { id: "kamin-category", text: CAT_MINORITY, field: "category", op: "in", value: ["MINORITY"] },
    ],
    documents: [DOC_MARKS, DOC_BONAFIDE, DOC_INCOME],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "ka-basava-vasathi-housing",
    name: {
      en: "Basava Vasathi Yojane – Rural Housing (Karnataka)",
      kn: "ಬಸವ ವಸತಿ ಯೋಜನೆ – ಗ್ರಾಮೀಣ ವಸತಿ (ಕರ್ನಾಟಕ)",
    },
    domain: "housing_support",
    scope: "household",
    issuer: { en: "Government of Karnataka", kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರ" },
    summary: {
      en: "Housing support for eligible rural households in Karnataka. Unit amounts: check official portal.",
      kn: "ಕರ್ನಾಟಕದ ಅರ್ಹ ಗ್ರಾಮೀಣ ಕುಟುಂಬಗಳಿಗೆ ವಸತಿ ಬೆಂಬಲ. ಘಟಕ ಮೊತ್ತ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      { id: "kabv-ration", text: BPL_CLAUSE, field: "has_bpl_or_ration_card", op: "bool", value: true },
      { id: "kabv-income", text: INCOME_LIMIT_CLAUSE, field: "annual_family_income_inr", op: "lte", value: null },
    ],
    documents: [DOC_RATION, DOC_INCOME, DOC_LAND],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "ka-vajpayee-arogya-shri",
    name: {
      en: "Vajpayee Arogya Shri – Household Health Cover (Karnataka)",
      kn: "ವಾಜಪೇಯಿ ಆರೋಗ್ಯ ಶ್ರೀ – ಕುಟುಂಬ ಆರೋಗ್ಯ ವಿಮೆ (ಕರ್ನಾಟಕ)",
    },
    domain: "health_cover",
    scope: "household",
    issuer: { en: "Government of Karnataka", kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರ" },
    summary: {
      en: "Hospital treatment cover for eligible households in Karnataka. Cover limits: check official portal.",
      kn: "ಕರ್ನಾಟಕದ ಅರ್ಹ ಕುಟುಂಬಗಳಿಗೆ ಆಸ್ಪತ್ರೆ ಚಿಕಿತ್ಸಾ ರಕ್ಷಣೆ. ರಕ್ಷಣಾ ಮಿತಿ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [{ id: "kaaroga-ration", text: BPL_CLAUSE, field: "has_bpl_or_ration_card", op: "bool", value: true }],
    documents: [DOC_RATION, DOC_INCOME],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "ka-sandhya-suraksha-pension",
    name: {
      en: "Sandhya Suraksha – Old Age Pension (Karnataka)",
      kn: "ಸಂಧ್ಯಾ ಸುರಕ್ಷಾ – ವೃದ್ಧಾಪ್ಯ ಪಿಂಚಣಿ (ಕರ್ನಾಟಕ)",
    },
    domain: "social_security_pension",
    scope: "individual",
    issuer: { en: "Government of Karnataka", kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರ" },
    summary: {
      en: "Monthly pension for eligible senior citizens in Karnataka. Pension amount and age limit: check official portal.",
      kn: "ಕರ್ನಾಟಕದ ಅರ್ಹ ಹಿರಿಯ ನಾಗರಿಕರಿಗೆ ಮಾಸಿಕ ಪಿಂಚಣಿ. ಪಿಂಚಣಿ ಮೊತ್ತ ಮತ್ತು ವಯೋಮಿತಿ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      {
        id: "sandhya-age",
        text: { en: "Meets the scheme age limit (limit not published in this build)", kn: "ಯೋಜನೆಯ ವಯೋಮಿತಿಯನ್ನು ಪೂರೈಸುವವರು (ಮಿತಿಯನ್ನು ಈ ಆವೃತ್ತಿಯಲ್ಲಿ ಪ್ರಕಟಿಸಿಲ್ಲ)" },
        field: "age_years",
        op: "gte",
        value: null,
      },
    ],
    documents: [DOC_AGE, DOC_INCOME, DOC_RATION],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "ka-krishi-bhagya-farm-water",
    name: {
      en: "Krishi Bhagya – Farm Water Storage Support (Karnataka)",
      kn: "ಕೃಷಿ ಭಾಗ್ಯ – ಹೊಲ ನೀರು ಸಂಗ್ರಹ ಬೆಂಬಲ (ಕರ್ನಾಟಕ)",
    },
    domain: "farmer_livelihood",
    scope: "household",
    issuer: { en: "Government of Karnataka", kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರ" },
    summary: {
      en: "Support for farm water storage and livelihood for farmer households in Karnataka. Subsidy amounts: check official portal.",
      kn: "ಕರ್ನಾಟಕದ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ಹೊಲ ನೀರು ಸಂಗ್ರಹ ಮತ್ತು ಜೀವನೋಪಾಯ ಬೆಂಬಲ. ಸಹಾಯಧನ ಮೊತ್ತ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [{ id: "kkb-farmer", text: FARMER_CLAUSE, field: "is_farmer", op: "bool", value: true }],
    documents: [DOC_LAND, DOC_RATION],
    url: PORTAL_MYSCHEME,
  }),
  build("government", {
    id: "ka-skill-training-programmes",
    name: {
      en: "Karnataka Skill Development Training Programmes",
      kn: "ಕರ್ನಾಟಕ ಕೌಶಲ್ಯಾಭಿವೃದ್ಧಿ ತರಬೇತಿ ಕಾರ್ಯಕ್ರಮಗಳು",
    },
    domain: "fellowship_skill",
    scope: "individual",
    issuer: { en: "Government of Karnataka", kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರ" },
    summary: {
      en: "State skill training programmes for school leavers, diploma and undergraduate students. Stipends: check official portal.",
      kn: "ಶಾಲೆ ಬಿಟ್ಟವರು, ಡಿಪ್ಲೊಮಾ ಮತ್ತು ಪದವಿ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ರಾಜ್ಯ ಕೌಶಲ್ಯ ತರಬೇತಿ. ಭತ್ಯೆ: ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
    },
    eligibility: [
      {
        id: "kaskill-level",
        text: { en: "Studying or trained at school, diploma or undergraduate level", kn: "ಶಾಲೆ, ಡಿಪ್ಲೊಮಾ ಅಥವಾ ಪದವಿ ಮಟ್ಟದಲ್ಲಿ ಓದುತ್ತಿರುವವರು" },
        field: "education_level",
        op: "in",
        value: ["school", "diploma", "ug"],
      },
    ],
    documents: [DOC_EDUCATION, DOC_AGE],
    url: PORTAL_MYSCHEME,
  }),
];

interface Seed140Entry {
  index: number;
  name: string;
  domain: SchemeDomain;
  scope: SchemeScope;
  provider: ProviderType;
  issuerEn: string;
  url: string | null;
  isAggregator?: boolean;
}

const SAARTHI_140_SEEDS: Seed140Entry[] = [
  // A. Education and scholarships (1–30)
  { index: 1, name: "PM-USP Central Sector Scheme of Scholarship for College and University Students (CSSS)", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Education, Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 2, name: "PM-USP Special Scholarship Scheme for Jammu & Kashmir and Ladakh", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "AICTE / Ministry of Education, Government of India", url: "https://www.aicte-india.org/" },
  { index: 3, name: "National Means-cum-Merit Scholarship (NMMS)", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Education, Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 4, name: "PM YASASVI Top Class School Education for OBC, EBC and DNT Students", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Social Justice & Empowerment, Government of India", url: "https://socialjustice.gov.in/" },
  { index: 5, name: "PM YASASVI Top Class College Education for OBC, EBC and DNT Students", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Social Justice & Empowerment, Government of India", url: "https://socialjustice.gov.in/" },
  { index: 6, name: "Top Class Education Scheme for SC Students", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Social Justice & Empowerment, Government of India", url: "https://socialjustice.gov.in/" },
  { index: 7, name: "National Fellowship and Scholarship for Higher Education of ST Students", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Tribal Affairs, Government of India", url: "https://tribal.nic.in/" },
  { index: 8, name: "Pre-Matric Scholarship for Students with Disabilities", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Department of Empowerment of Persons with Disabilities", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 9, name: "Post-Matric Scholarship for Students with Disabilities", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Department of Empowerment of Persons with Disabilities", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 10, name: "Top Class Education Scholarship for Students with Disabilities", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Department of Empowerment of Persons with Disabilities", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 11, name: "AICTE Pragati Scholarship — Technical Degree", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "AICTE, Government of India", url: "https://www.aicte-india.org/" },
  { index: 12, name: "AICTE Pragati Scholarship — Technical Diploma", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "AICTE, Government of India", url: "https://www.aicte-india.org/" },
  { index: 13, name: "AICTE Saksham Scholarship — Technical Degree", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "AICTE, Government of India", url: "https://www.aicte-india.org/" },
  { index: 14, name: "AICTE Saksham Scholarship — Technical Diploma", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "AICTE, Government of India", url: "https://www.aicte-india.org/" },
  { index: 15, name: "AICTE Swanath Scholarship — Technical Degree", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "AICTE, Government of India", url: "https://www.aicte-india.org/" },
  { index: 16, name: "AICTE Swanath Scholarship — Technical Diploma", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "AICTE, Government of India", url: "https://www.aicte-india.org/" },
  { index: 17, name: "Ishan Uday Special Scholarship Scheme", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "University Grants Commission (UGC), Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 18, name: "National Scholarship for Post Graduate Studies", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "University Grants Commission (UGC), Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 19, name: "Prime Minister's Scholarship Scheme for CAPF and Assam Rifles wards", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Home Affairs, Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 20, name: "Prime Minister's Scholarship Scheme for wards of police personnel martyred in terror/Naxal attacks", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Home Affairs, Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 21, name: "Prime Minister's Scholarship Scheme for Ministry of Railways", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Railways, Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 22, name: "Financial Assistance for Education to Wards of Beedi/Cine/IOMC/LSDM Workers — Pre-Matric", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Labour & Employment, Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 23, name: "Financial Assistance for Education to Wards of Beedi/Cine/IOMC/LSDM Workers — Post-Matric", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Ministry of Labour & Employment, Government of India", url: "https://scholarships.gov.in/All-Scholarships" },
  { index: 24, name: "NEC Merit Scholarship", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "North Eastern Council, Government of India", url: "https://necouncil.gov.in/" },
  { index: 25, name: "ICAR National Talent Scholarship — Undergraduate", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Indian Council of Agricultural Research (ICAR)", url: "https://icar.org.in/" },
  { index: 26, name: "ICAR Post Graduate Scholarship", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Indian Council of Agricultural Research (ICAR)", url: "https://icar.org.in/" },
  { index: 27, name: "ICAR National Talent Scholarship — Postgraduate", domain: "scholarship", scope: "individual", provider: "government", issuerEn: "Indian Council of Agricultural Research (ICAR)", url: "https://icar.org.in/" },
  { index: 28, name: "ICAR Junior Research Fellowship / Senior Research Fellowship", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Indian Council of Agricultural Research (ICAR)", url: "https://icar.org.in/" },
  { index: 29, name: "Indian Statistical Institute Stipend Scheme", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Indian Statistical Institute", url: "https://www.isical.ac.in/" },
  { index: 30, name: "Free Coaching Scheme for SCs, OBCs and specified beneficiaries", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Social Justice & Empowerment, Government of India", url: "https://socialjustice.gov.in/" },

  // B. Healthcare and medical assistance (31–51)
  { index: 31, name: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)", domain: "health_cover", scope: "household", provider: "government", issuerEn: "National Health Authority, Government of India", url: "https://pmjay.gov.in/" },
  { index: 32, name: "Ayushman Vay Vandana Card", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "National Health Authority, Government of India", url: "https://beneficiary.nha.gov.in/" },
  { index: 33, name: "Ayushman Arogya Mandir", domain: "health_cover", scope: "household", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://aam.mohfw.gov.in/" },
  { index: 34, name: "Pradhan Mantri Ayushman Bharat Health Infrastructure Mission (PM-ABHIM)", domain: "health_cover", scope: "household", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://pmabhim.mohfw.gov.in/" },
  { index: 35, name: "National Health Mission (NHM)", domain: "health_cover", scope: "household", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://nhm.gov.in/" },
  { index: 36, name: "Janani Suraksha Yojana (JSY)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "National Health Mission, Government of India", url: "https://nhm.gov.in/index1.php?lang=1&level=3&lid=309&sublinkid=841" },
  { index: 37, name: "Janani Shishu Suraksha Karyakram (JSSK)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "National Health Mission, Government of India", url: "https://www.nhm.gov.in/index4.php?lang=1&level=0&lid=171&linkid=150" },
  { index: 38, name: "Pradhan Mantri Matru Vandana Yojana (PMMVY)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Ministry of Women & Child Development, Government of India", url: "https://pmmvy.wcd.gov.in/" },
  { index: 39, name: "Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://pmsma.mohfw.gov.in/" },
  { index: 40, name: "Surakshit Matritva Aashwasan (SUMAN)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "National Health Mission, Government of India", url: "https://nhm.gov.in/" },
  { index: 41, name: "Nikshay Poshan Yojana", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://nikshay.in/" },
  { index: 42, name: "National TB Elimination Programme", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Central TB Division, Ministry of Health & Family Welfare", url: "https://tbcindia.mohfw.gov.in/" },
  { index: 43, name: "Rashtriya Arogya Nidhi", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://mohfw.gov.in/" },
  { index: 44, name: "Health Minister's Discretionary Grant", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://mohfw.gov.in/" },
  { index: 45, name: "National Dialysis Programme", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "National Health Mission, Government of India", url: "https://nhm.gov.in/" },
  { index: 46, name: "Rashtriya Bal Swasthya Karyakram (RBSK)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "National Health Mission, Government of India", url: "https://nhm.gov.in/" },
  { index: 47, name: "Rashtriya Kishor Swasthya Karyakram (RKSK)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "National Health Mission, Government of India", url: "https://nhm.gov.in/" },
  { index: 48, name: "National Sickle Cell Anaemia Elimination Mission", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Ministry of Tribal Affairs, Government of India", url: "https://tribal.nic.in/" },
  { index: 49, name: "Employees' State Insurance Corporation (ESIC) medical benefits", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "ESIC, Ministry of Labour & Employment", url: "https://www.esic.gov.in/" },
  { index: 50, name: "Central Government Health Scheme (CGHS)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Ministry of Health & Family Welfare, Government of India", url: "https://cghs.mohfw.gov.in/" },
  { index: 51, name: "Ex-Servicemen Contributory Health Scheme (ECHS)", domain: "health_cover", scope: "individual", provider: "government", issuerEn: "Department of Ex-Servicemen Welfare, Ministry of Defence", url: "https://echs.gov.in/" },

  // C. Agriculture, farmers, livestock and fisheries (52–70)
  { index: 52, name: "PM-KISAN", domain: "farmer_livelihood", scope: "household", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://pmkisan.gov.in/" },
  { index: 53, name: "Kisan Credit Card (KCC)", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Department of Financial Services / Agriculture, Government of India", url: "https://www.myscheme.gov.in/" },
  { index: 54, name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://pmfby.gov.in/" },
  { index: 55, name: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)", domain: "farmer_livelihood", scope: "household", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://pmksy.gov.in/" },
  { index: 56, name: "Soil Health Card Scheme", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Department of Agriculture & Farmers Welfare, Government of India", url: "https://soilhealth.dac.gov.in/" },
  { index: 57, name: "PM-KUSUM", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of New and Renewable Energy, Government of India", url: "https://pmkusum.mnre.gov.in/" },
  { index: 58, name: "National Food Security Mission (NFSM)", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://nfsm.gov.in/" },
  { index: 59, name: "Rashtriya Krishi Vikas Yojana (RKVY)", domain: "farmer_livelihood", scope: "household", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://rkvy.nic.in/" },
  { index: 60, name: "Paramparagat Krishi Vikas Yojana (PKVY)", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://pgsindia-ncof.gov.in/" },
  { index: 61, name: "Mission Organic Value Chain Development for North Eastern Region (MOVCDNER)", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://agriwelfare.gov.in/" },
  { index: 62, name: "Agriculture Infrastructure Fund", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Department of Agriculture & Farmers Welfare, Government of India", url: "https://agriinfra.dac.gov.in/" },
  { index: 63, name: "Pradhan Mantri Matsya Sampada Yojana", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Department of Fisheries, Government of India", url: "https://pmmsy.dof.gov.in/" },
  { index: 64, name: "PM Kisan Maandhan Yojana", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://maandhan.in/" },
  { index: 65, name: "National Livestock Mission", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Department of Animal Husbandry & Dairying, Government of India", url: "https://dahd.gov.in/" },
  { index: 66, name: "Rashtriya Gokul Mission", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Department of Animal Husbandry & Dairying, Government of India", url: "https://dahd.gov.in/" },
  { index: 67, name: "National Beekeeping and Honey Mission", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://agriwelfare.gov.in/" },
  { index: 68, name: "Sub-Mission on Agricultural Mechanization", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Department of Agriculture & Farmers Welfare, Government of India", url: "https://agrimachinery.nic.in/" },
  { index: 69, name: "National Mission on Edible Oils — Oil Palm", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://agriwelfare.gov.in/" },
  { index: 70, name: "National Mission on Natural Farming", domain: "farmer_livelihood", scope: "individual", provider: "government", issuerEn: "Ministry of Agriculture & Farmers Welfare, Government of India", url: "https://agriwelfare.gov.in/" },

  // D. Pensions and social security (71–85)
  { index: 71, name: "Indira Gandhi National Old Age Pension Scheme (IGNOAPS)", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "NSAP, Ministry of Rural Development, Government of India", url: "https://nsap.nic.in/" },
  { index: 72, name: "Indira Gandhi National Widow Pension Scheme (IGNWPS)", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "NSAP, Ministry of Rural Development, Government of India", url: "https://nsap.nic.in/" },
  { index: 73, name: "Indira Gandhi National Disability Pension Scheme (IGNDPS)", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "NSAP, Ministry of Rural Development, Government of India", url: "https://nsap.nic.in/" },
  { index: 74, name: "National Family Benefit Scheme", domain: "social_security_pension", scope: "household", provider: "government", issuerEn: "NSAP, Ministry of Rural Development, Government of India", url: "https://nsap.nic.in/" },
  { index: 75, name: "Annapurna Scheme", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "NSAP, Ministry of Rural Development, Government of India", url: "https://nsap.nic.in/" },
  { index: 76, name: "Pradhan Mantri Shram Yogi Maandhan", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "Ministry of Labour & Employment, Government of India", url: "https://maandhan.in/" },
  { index: 77, name: "National Pension Scheme for Traders and Self-Employed Persons", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "Ministry of Labour & Employment, Government of India", url: "https://maandhan.in/" },
  { index: 78, name: "Atal Pension Yojana", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "PFRDA / Ministry of Finance, Government of India", url: "https://www.npscra.nsdl.co.in/" },
  { index: 79, name: "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)", domain: "insurance_protection", scope: "individual", provider: "government", issuerEn: "Ministry of Finance, Government of India", url: "https://jansuraksha.gov.in/" },
  { index: 80, name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)", domain: "insurance_protection", scope: "individual", provider: "government", issuerEn: "Ministry of Finance, Government of India", url: "https://jansuraksha.gov.in/" },
  { index: 81, name: "e-Shram", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "Ministry of Labour & Employment, Government of India", url: "https://eshram.gov.in/" },
  { index: 82, name: "Building and Other Construction Workers (BOCW) Welfare Board benefits", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "Ministry of Labour & Employment / State BOCW Boards", url: "https://labour.gov.in/" },
  { index: 83, name: "Employees' Provident Fund (EPF) services", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "EPFO, Ministry of Labour & Employment", url: "https://www.epfindia.gov.in/" },
  { index: 84, name: "Employees' Pension Scheme (EPS)", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "EPFO, Ministry of Labour & Employment", url: "https://www.epfindia.gov.in/" },
  { index: 85, name: "Atal Beemit Vyakti Kalyan Yojana", domain: "social_security_pension", scope: "individual", provider: "government", issuerEn: "ESIC, Ministry of Labour & Employment", url: "https://www.esic.gov.in/" },

  // E. Housing, utilities and food security (86–95)
  { index: 86, name: "Pradhan Mantri Awaas Yojana — Gramin (PMAY-G)", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Ministry of Rural Development, Government of India", url: "https://pmayg.nic.in/" },
  { index: 87, name: "Pradhan Mantri Awas Yojana — Urban 2.0 (PMAY-U 2.0)", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Ministry of Housing and Urban Affairs, Government of India", url: "https://pmay-urban.gov.in/" },
  { index: 88, name: "Affordable Rental Housing Complexes (ARHC)", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Ministry of Housing and Urban Affairs, Government of India", url: "https://pmay-urban.gov.in/" },
  { index: 89, name: "Swachh Bharat Mission — Gramin", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Department of Drinking Water and Sanitation, Government of India", url: "https://swachhbharatmission.ddws.gov.in/" },
  { index: 90, name: "Swachh Bharat Mission — Urban", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Ministry of Housing and Urban Affairs, Government of India", url: "https://sbmurban.org/" },
  { index: 91, name: "Jal Jeevan Mission", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Department of Drinking Water and Sanitation, Government of India", url: "https://jaljeevanmission.gov.in/" },
  { index: 92, name: "Pradhan Mantri Ujjwala Yojana", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Ministry of Petroleum and Natural Gas, Government of India", url: "https://www.pmuy.gov.in/" },
  { index: 93, name: "Saubhagya Scheme", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Ministry of Power, Government of India", url: "https://powermin.gov.in/" },
  { index: 94, name: "National Food Security Act / Public Distribution System", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Department of Food and Public Distribution, Government of India", url: "https://nfsa.gov.in/" },
  { index: 95, name: "One Nation One Ration Card", domain: "housing_support", scope: "household", provider: "government", issuerEn: "Department of Food and Public Distribution, Government of India", url: "https://nfsa.gov.in/" },

  // F. Employment, MSME and entrepreneurship (96–115)
  { index: 96, name: "Prime Minister's Employment Generation Programme (PMEGP)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of MSME, Government of India", url: "https://www.msme.gov.in/" },
  { index: 97, name: "Pradhan Mantri MUDRA Yojana", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Department of Financial Services, Government of India", url: "https://www.mudra.org.in/" },
  { index: 98, name: "Stand-Up India", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Department of Financial Services, Government of India", url: "https://www.standupmitra.in/" },
  { index: 99, name: "Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of MSME / SIDBI, Government of India", url: "https://www.cgtmse.in/" },
  { index: 100, name: "PM Vishwakarma", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of MSME, Government of India", url: "https://pmvishwakarma.gov.in/" },
  { index: 101, name: "PM Formalisation of Micro Food Processing Enterprises (PMFME)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Food Processing Industries, Government of India", url: "https://pmfme.mofpi.gov.in/pmfme/index.html" },
  { index: 102, name: "Scheme of Fund for Regeneration of Traditional Industries (SFURTI)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of MSME, Government of India", url: "https://sfurti.msme.gov.in/" },
  { index: 103, name: "National SC-ST Hub", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of MSME, Government of India", url: "https://scsthub.in/" },
  { index: 104, name: "PM-DAKSH", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Social Justice & Empowerment, Government of India", url: "https://pmdaksh.dosje.gov.in/" },
  { index: 105, name: "Deendayal Antyodaya Yojana — National Rural Livelihoods Mission", domain: "fellowship_skill", scope: "household", provider: "government", issuerEn: "Ministry of Rural Development, Government of India", url: "https://aajeevika.gov.in/" },
  { index: 106, name: "Deendayal Antyodaya Yojana — National Urban Livelihoods Mission", domain: "fellowship_skill", scope: "household", provider: "government", issuerEn: "Ministry of Housing and Urban Affairs, Government of India", url: "https://mohua.gov.in/" },
  { index: 107, name: "Deen Dayal Upadhyaya Grameen Kaushalya Yojana (DDU-GKY)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Rural Development, Government of India", url: "https://ddugky.gov.in/" },
  { index: 108, name: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Skill Development & Entrepreneurship, Government of India", url: "https://www.pmkvyofficial.org/" },
  { index: 109, name: "National Apprenticeship Promotion Scheme (NAPS)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Skill Development & Entrepreneurship, Government of India", url: "https://www.apprenticeshipindia.gov.in/" },
  { index: 110, name: "National Apprenticeship Training Scheme (NATS)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Education, Government of India", url: "https://nats.education.gov.in/" },
  { index: 111, name: "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Housing and Urban Affairs, Government of India", url: "https://pmsvanidhi.mohua.gov.in/" },
  { index: 112, name: "PM Viksit Bharat Rozgar Yojana", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Labour & Employment / EPFO, Government of India", url: "https://www.epfindia.gov.in/" },
  { index: 113, name: "Interest Subvention Scheme for Education Loans (ISEC)", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of Education / MSME (verify current circular)", url: "https://www.education.gov.in/" },
  { index: 114, name: "Performance and Credit Rating Scheme", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of MSME, Government of India", url: "https://my.msme.gov.in/mymsme/Scheme.aspx" },
  { index: 115, name: "Market Promotion and Development Assistance", domain: "fellowship_skill", scope: "individual", provider: "government", issuerEn: "Ministry of MSME, Government of India", url: "https://my.msme.gov.in/mymsme/Scheme.aspx" },

  // G. Private and CSR scholarships (116–140)
  { index: 116, name: "Reliance Foundation Undergraduate Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Reliance Foundation", url: "https://scholarships.reliancefoundation.org/" },
  { index: 117, name: "Reliance Foundation Postgraduate Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Reliance Foundation", url: "https://scholarships.reliancefoundation.org/" },
  { index: 118, name: "HDFC Bank Parivartan's Educational Crisis Scholarship Support (ECSS)", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "HDFC Bank", url: "https://www.hdfcbank.com/" },
  { index: 119, name: "SBI Asha Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "SBI Foundation", url: "https://www.sbiashascholarship.co.in/" },
  { index: 120, name: "Kotak Kanya Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Kotak Education Foundation", url: "https://www.kotakeducation.org/" },
  { index: 121, name: "Tata Capital Pankh Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Tata Capital", url: "https://www.tatacapital.com/" },
  { index: 122, name: "Aditya Birla Capital Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Aditya Birla Capital", url: "https://www.adityabirlacapital.com/" },
  { index: 123, name: "ONGC Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "ONGC", url: "https://ongcscholar.org/" },
  { index: 124, name: "IndianOil Academic Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "IndianOil", url: "https://iocl.com/" },
  { index: 125, name: "LIC Golden Jubilee Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "LIC of India", url: "https://licindia.in/" },
  { index: 126, name: "Sitaram Jindal Foundation Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Sitaram Jindal Foundation", url: "https://www.sitaramjindalfoundation.org/" },
  { index: 127, name: "Foundation for Excellence Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Foundation for Excellence", url: "https://ffe.org/" },
  { index: 128, name: "Santoor Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Santoor / Wipro Consumer Care", url: "https://www.santoorscholarship.com/" },
  { index: 129, name: "FAEA Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Foundation for Academic Excellence and Access", url: "https://www.faeaindia.org/" },
  { index: 130, name: "Vidyadhan Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Sarojini Damodaran Foundation", url: "https://www.vidyadhan.org/" },
  { index: 131, name: "Colgate Keep India Smiling Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Colgate-Palmolive (India)", url: "https://www.colgate.com/en-in/" },
  { index: 132, name: "Legrand Empowering Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Legrand India", url: "https://www.legrandscholarship.co.in/" },
  { index: 133, name: "Rolls-Royce Wings4Her Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Rolls-Royce", url: "https://www.rolls-royce.com/" },
  { index: 134, name: "Amazon Future Engineer Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Amazon Future Engineer", url: "https://www.amazonfutureengineer.com/" },
  { index: 135, name: "Siemens Scholarship Program", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Siemens India", url: "https://www.siemens.co.in/" },
  { index: 136, name: "Schaeffler India Hope Engineering Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Schaeffler India", url: "https://www.schaeffler.co.in/" },
  { index: 137, name: "Adobe India Women-in-Technology Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Adobe India", url: "https://www.adobe.com/" },
  { index: 138, name: "Google Generation Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Google", url: "https://buildyourfuture.withgoogle.com/scholarships" },
  { index: 139, name: "HDFC Badhte Kadam Scholarship", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "HDFC Bank", url: "https://www.hdfcbank.com/" },
  { index: 140, name: "Buddy4Study partner scholarships", domain: "scholarship", scope: "individual", provider: "private_csr", issuerEn: "Buddy4Study (Aggregator / Platform — verify sponsor)", url: "https://www.buddy4study.com/", isAggregator: true },
];

function normalizeSchemeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEED_140_ITEMS: CatalogueScheme[] = SAARTHI_140_SEEDS.map((entry) => {
  const padded = String(entry.index).padStart(3, "0");
  const aggNoteEn = entry.isAggregator
    ? " Aggregator platform listing; verify actual sponsor and current cycle on official portal."
    : "";
  const aggNoteKn = entry.isAggregator
    ? " ಅಗ್ರಿಗೇಟರ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಪಟ್ಟಿ; ಪ್ರಾಯೋಜಕರು ಮತ್ತು ಪ್ರಸ್ತುತ ಅವಧಿಯನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ."
    : "";

  return build(entry.provider, {
    id: `saarthi-140-${padded}`,
    name: {
      en: entry.name,
      kn: `${entry.name} (${CHECK_PORTAL.kn})`,
    },
    domain: entry.domain,
    scope: entry.scope,
    issuer: {
      en: entry.issuerEn,
      kn: entry.issuerEn,
    },
    summary: {
      en: `Catalogue entry #${entry.index} — details unverified in this build.${aggNoteEn} ${CHECK_PORTAL.en}.`,
      kn: `ಕ್ಯಾಟಲಾಗ್ #${entry.index} — ವಿವರಗಳನ್ನು ಈ ಆವೃತ್ತಿಯಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ.${aggNoteKn} ${CHECK_PORTAL.kn}.`,
    },
    eligibility: [],
    documents: [],
    url: entry.url,
  });
});

function buildMergedCatalogue(): CatalogueScheme[] {
  const merged: CatalogueScheme[] = [...DEMO_SCHEMES];
  const seen = new Set<string>(DEMO_SCHEMES.map((s) => normalizeSchemeKey(s.name.en)));

  for (const item of SEED_140_ITEMS) {
    const key = normalizeSchemeKey(item.name.en);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

const FULL_DEDUPED_CATALOGUE: CatalogueScheme[] = buildMergedCatalogue();

export const SCHEME_DISCLAIMER: Bilingual = {
  en: "Schemes shown are indicative only and based on the information you entered. Check official portal before applying.",
  kn: "ತೋರಿಸಲಾದ ಯೋಜನೆಗಳು ಸೂಚನಾತ್ಮಕ ಮಾತ್ರ ಮತ್ತು ನೀವು ನಮೂದಿಸಿದ ಮಾಹಿತಿಯನ್ನು ಆಧರಿಸಿವೆ. ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.",
};

export const SCHEME_CATALOGUE: Scheme[] = FULL_DEDUPED_CATALOGUE;

// Demonstration schemes across Central and Karnataka government tracks, plus private/CSR and aided tracks.
// Kept in separate provider tracks; use filterByProviderType() in matcher.ts to filter.
export function generateFullCatalogue(): Scheme[] {
  return FULL_DEDUPED_CATALOGUE;
}