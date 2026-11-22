import type {
  CertifiedCategory,
  EducationLevel,
  Gender,
  IncomeRange,
  IndianState,
  InstitutionType,
  MatchStatus,
  RuleOutcome,
  VerificationStatus,
} from "./types";

export const STATE_LABELS: Record<IndianState, string> = {
  andhra_pradesh: "Andhra Pradesh",
  arunachal_pradesh: "Arunachal Pradesh",
  assam: "Assam",
  bihar: "Bihar",
  chhattisgarh: "Chhattisgarh",
  goa: "Goa",
  gujarat: "Gujarat",
  haryana: "Haryana",
  himachal_pradesh: "Himachal Pradesh",
  jharkhand: "Jharkhand",
  karnataka: "Karnataka",
  kerala: "Kerala",
  madhya_pradesh: "Madhya Pradesh",
  maharashtra: "Maharashtra",
  manipur: "Manipur",
  meghalaya: "Meghalaya",
  mizoram: "Mizoram",
  nagaland: "Nagaland",
  odisha: "Odisha",
  punjab: "Punjab",
  rajasthan: "Rajasthan",
  sikkim: "Sikkim",
  tamil_nadu: "Tamil Nadu",
  telangana: "Telangana",
  tripura: "Tripura",
  uttar_pradesh: "Uttar Pradesh",
  uttarakhand: "Uttarakhand",
  west_bengal: "West Bengal",
  andaman_and_nicobar_islands: "Andaman and Nicobar Islands",
  chandigarh: "Chandigarh",
  dadra_nagar_haveli_and_daman_diu: "Dadra and Nagar Haveli and Daman and Diu",
  delhi: "Delhi",
  jammu_and_kashmir: "Jammu and Kashmir",
  ladakh: "Ladakh",
  lakshadweep: "Lakshadweep",
  puducherry: "Puducherry",
};

export const STATE_OPTIONS: { value: IndianState; label: string }[] = (
  Object.keys(STATE_LABELS) as IndianState[]
)
  .map((value) => ({ value, label: STATE_LABELS[value] }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  class_10: "Class 10",
  class_12: "Class 12",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
  phd: "PhD",
};

export const INSTITUTION_LABELS: Record<InstitutionType, string> = {
  government: "Government",
  government_aided: "Government-aided",
  private: "Private",
  deemed: "Deemed university",
  other: "Other",
};

export const INCOME_LABELS: Record<IncomeRange, string> = {
  below_2_5_lakh: "Below ₹2.5 lakh a year",
  "2_5_to_5_lakh": "₹2.5–5 lakh a year",
  "5_to_8_lakh": "₹5–8 lakh a year",
  above_8_lakh: "Above ₹8 lakh a year",
};

export const CATEGORY_LABELS: Record<CertifiedCategory, string> = {
  general: "General",
  obc: "OBC",
  sc: "SC",
  st: "ST",
  ews: "EWS",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export const OUTCOME_LABELS: Record<RuleOutcome, string> = {
  PASS: "Met",
  FAIL: "Not met",
  UNKNOWN: "Needs more information",
  NOT_APPLICABLE: "Does not apply to you",
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  likely_eligible: "Likely match",
  potential_match: "Needs more information",
  not_matched: "Not matched",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  demonstration: "Demonstration data — not verified",
  verified: "Verified",
  unverified: "Not yet verified",
};
