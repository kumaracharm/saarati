// Verification flags, official links and outdated-detail reporting. Pure functions, no network calls.
// PRIVACY: never ask for ID numbers, bank details, OTPs or PINs. Report payloads must not carry personal identifiers.
import type { Scheme } from "./schemeTypes";

export type FieldFlag = "verified" | "needs_portal_check";

/**
 * Conservative per-field flag. "verified" only when the underlying condition clearly holds:
 * - rules: rule_verified === true
 * - benefit: benefit.amount_verified === true or amount status "verified"
 * - deadline: deadline.verified === true or deadline status "verified"
 * Anything else (including missing data) needs a check on the official portal.
 */
export function fieldFlag(
  scheme: Partial<Pick<Scheme, "last_verified_date" | "rule_verified" | "verification_score" | "deadline" | "benefit" | "verification_status">>,
  field: "benefit" | "deadline" | "rules",
): FieldFlag {
  if (field === "rules") {
    return scheme.rule_verified === true ? "verified" : "needs_portal_check";
  }
  if (field === "benefit") {
    const marked = scheme.benefit?.amount_verified === true || scheme.verification_status?.amount?.status === "verified";
    return marked ? "verified" : "needs_portal_check";
  }
  const marked = scheme.deadline?.verified === true || scheme.verification_status?.deadline?.status === "verified";
  return marked ? "verified" : "needs_portal_check";
}

export const PORTAL_NOTE = {
  en: "Benefit and deadline details must be confirmed on the official portal.",
  kn: "ಫಲಾನುಭವ ಮತ್ತು ಗಡುವಿನ ವಿವರಗಳನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಬೇಕು.",
};

/**
 * Official links for a scheme. Only https URLs that parse with new URL() are returned.
 * Never invents a URL: every link comes from a field already on the scheme record.
 */
export function safeOfficialLinks(scheme: Scheme): { label: string; url: string }[] {
  const candidates: string[] = [];
  if (scheme.official_url) candidates.push(scheme.official_url);
  if (scheme.official_portal_url) candidates.push(scheme.official_portal_url);
  if (Array.isArray(scheme.official_urls)) candidates.push(...scheme.official_urls);

  const seen = new Set<string>();
  const links: { label: string; url: string }[] = [];
  for (const raw of candidates) {
    if (typeof raw !== "string" || !raw.startsWith("https://") || seen.has(raw)) continue;
    try {
      new URL(raw);
    } catch {
      continue;
    }
    seen.add(raw);
    links.push({ label: scheme.name.en, url: raw });
  }
  return links;
}

export const REPORT_OUTDATED_MAILTO_OR_FORM: string | null = null;

const MAX_NOTE_LENGTH = 500;

/** Removes likely personal identifiers (emails, phone-like and long digit runs) from a free-text note. */
function scrubNote(note: string): string {
  return note
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[removed]")
    .replace(/\d[\d\s-]{5,}\d/g, "[removed]")
    .trim()
    .slice(0, MAX_NOTE_LENGTH);
}

/** Builds a pure payload for an "outdated detail" report. No personal identifiers are included. */
export function reportOutdatedPayload(
  schemeId: string,
  fieldName: string,
  note: string,
): { schemeId: string; fieldName: string; note: string; reportedAt: string } {
  return {
    schemeId,
    fieldName,
    note: scrubNote(note),
    reportedAt: new Date().toISOString(),
  };
}
