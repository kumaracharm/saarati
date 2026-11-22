// Category grouping and state/central overlap notes. Pure functions: no React, no network.
import type { Bilingual, Scheme } from "./schemeTypes";
import { categoryOf } from "./matcher";

export const VERIFY_REMINDER: Bilingual = {
  en: "Verify exact rules and amounts on the official portal before applying.",
  kn: "ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಸರಿಯಾದ ನಿಯಮಗಳು ಮತ್ತು ಮೊತ್ತಗಳನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.",
};

/** Groups schemes by thematic category (via categoryOf). Input order is preserved within each group. */
export function groupByCategory(schemes: Scheme[]): Map<string, Scheme[]> {
  const groups = new Map<string, Scheme[]>();
  for (const scheme of schemes) {
    const key = categoryOf(scheme);
    const list = groups.get(key);
    if (list) list.push(scheme);
    else groups.set(key, [scheme]);
  }
  return groups;
}

type Level = "state" | "central";

/** Jurisdiction takes precedence; scheme_type is the fallback. */
function levelOf(scheme: Scheme): Level | null {
  if (scheme.jurisdiction === "Central") return "central";
  if (scheme.jurisdiction === "Karnataka") return "state";
  if (scheme.scheme_type === "central") return "central";
  if (scheme.scheme_type === "state") return "state";
  return null;
}

const OVERLAP_NOTE: Bilingual = {
  en: "Both state and central schemes exist in this category — check whether you can benefit from both; rules may overlap.",
  kn: "ಈ ವರ್ಗದಲ್ಲಿ ರಾಜ್ಯ ಮತ್ತು ಕೇಂದ್ರ ಯೋಜನೆಗಳೆರಡೂ ಇವೆ — ಎರಡರಿಂದಲೂ ಪ್ರಯೋಜನ ಪಡೆಯಬಹುದೇ ಎಂದು ಪರಿಶೀಲಿಸಿ; ನಿಯಮಗಳು ಅತಿಕ್ರಮಿಸಬಹುದು.",
};

/**
 * For each category that contains both a state and a central scheme, returns a bilingual
 * overlap note with the verification reminder appended.
 */
export function overlapNotes(schemes: Scheme[]): { category: string; note: { en: string; kn: string } }[] {
  const notes: { category: string; note: { en: string; kn: string } }[] = [];
  for (const [category, group] of groupByCategory(schemes)) {
    const levels = new Set(group.map(levelOf));
    if (levels.has("state") && levels.has("central")) {
      notes.push({
        category,
        note: {
          en: `${OVERLAP_NOTE.en} ${VERIFY_REMINDER.en}`,
          kn: `${OVERLAP_NOTE.kn} ${VERIFY_REMINDER.kn}`,
        },
      });
    }
  }
  return notes;
}
