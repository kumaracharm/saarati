import { STATE_OPTIONS } from "./labels";
import type {
  EducationLevel,
  Gender,
  IncomeRange,
  InstitutionType,
  StudentProfile,
} from "./types";

// Terms that must never be typed into the intake box. Used by components to show a warning.
export const SENSITIVE_PATTERN = /aadhaar|aadhar|otp|password|bank account|account number/i;

export function containsSensitive(text: string): boolean {
  return SENSITIVE_PATTERN.test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EDUCATION_RULES: { level: EducationLevel; pattern: RegExp }[] = [
  { level: "phd", pattern: /\bph\.?\s?d\b/i },
  {
    level: "postgraduate",
    pattern: /\bpost[\s-]?graduate\b|\bm\.?\s?tech\b|\bm\.?\s?sc\b|\bmasters?\b/i,
  },
  {
    level: "undergraduate",
    pattern: /\bunder[\s-]?graduate\b|\bb\.?\s?tech\b|\bb\.?\s?sc\b|\bdegree\b/i,
  },
  { level: "class_12", pattern: /\bclass\s*12(th)?\b|\b12th\b|\+2\b|\bpuc\b/i },
  { level: "class_10", pattern: /\bclass\s*10(th)?\b|\b10th\b/i },
];

const INCOME_RULES: { range: IncomeRange; pattern: RegExp }[] = [
  {
    range: "below_2_5_lakh",
    pattern: /\b(?:below|under|less than)\s*(?:rs\.?\s*|₹\s*)?2\.5\s*lakhs?\b/i,
  },
  { range: "2_5_to_5_lakh", pattern: /\b2\.5\s*(?:to|-|–)\s*5\s*lakhs?\b/i },
  { range: "5_to_8_lakh", pattern: /\b5\s*(?:to|-|–)\s*8\s*lakhs?\b/i },
  {
    range: "above_8_lakh",
    pattern: /\b(?:above|over|more than)\s*(?:rs\.?\s*|₹\s*)?8\s*lakhs?\b/i,
  },
];

function findPercentage(text: string): number | undefined {
  const pattern = /(\d{1,3}(?:\.\d+)?)\s*%/g;
  for (let m = pattern.exec(text); m !== null; m = pattern.exec(text)) {
    const value = Number(m[1]);
    if (value >= 0 && value <= 100) {
      return value;
    }
  }
  return undefined;
}

function findState(text: string): StudentProfile["state"] {
  // Kannada text: review by a Kannada speaker before release.
  if (text.includes("ಕರ್ನಾಟಕ")) {
    return "karnataka";
  }
  for (const option of STATE_OPTIONS) {
    const pattern = new RegExp(`\\b${escapeRegExp(option.label)}\\b`, "i");
    if (pattern.test(text)) {
      return option.value;
    }
  }
  return undefined;
}

function findEducation(text: string): EducationLevel | undefined {
  for (const rule of EDUCATION_RULES) {
    if (rule.pattern.test(text)) {
      return rule.level;
    }
  }
  return undefined;
}

function findInstitution(text: string): InstitutionType | undefined {
  if (/\bgovernment[\s-]+aided\b|\bgovt\.?[\s-]+aided\b/i.test(text)) {
    return "government_aided";
  }
  if (/\bgovernment\b|\bgovt\b/i.test(text)) {
    return "government";
  }
  if (/\bprivate\b/i.test(text)) {
    return "private";
  }
  return undefined;
}

function findGender(text: string): Gender | undefined {
  const female = /\b(girls?|females?|wom[ae]n|daughters?)\b/i.test(text);
  const male = /\b(boys?|males?|sons?)\b/i.test(text);
  // If both kinds of terms appear (e.g. "my son and daughter"), the gender is ambiguous: skip it.
  if (female && !male) {
    return "female";
  }
  if (male && !female) {
    return "male";
  }
  return undefined;
}

function findIncome(text: string): IncomeRange | undefined {
  for (const rule of INCOME_RULES) {
    if (rule.pattern.test(text)) {
      return rule.range;
    }
  }
  return undefined;
}

// Deterministic, offline extraction of profile fields from a plain-language description.
// Returns only the fields it can find. It never infers officially_certified_category.
export function parseSituation(text: string): Partial<StudentProfile> {
  const result: Partial<StudentProfile> = {};

  const percentage = findPercentage(text);
  if (percentage !== undefined) {
    result.academic_percentage = percentage;
  }

  const state = findState(text);
  if (state !== undefined) {
    result.state = state;
  }

  const education = findEducation(text);
  if (education !== undefined) {
    result.education_level = education;
  }

  const institution = findInstitution(text);
  if (institution !== undefined) {
    result.institution_type = institution;
  }

  const gender = findGender(text);
  if (gender !== undefined) {
    result.gender = gender;
  }

  const income = findIncome(text);
  if (income !== undefined) {
    result.family_income_range = income;
  }

  return result;
}
