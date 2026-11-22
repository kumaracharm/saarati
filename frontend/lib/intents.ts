// Keyword intent/topic parsing (English + Kannada) and short bilingual answers. Pure functions.
import type { Bilingual, Scheme } from "./schemeTypes";
import { categoryOf } from "./matcher";
import { VERIFY_REMINDER } from "./schemeGroups";

export type Intent = "find_scheme" | "documents_needed" | "profile_hint" | "portal_check";
export type Topic = "farmer" | "health" | "housing" | "education" | "skill_loan";

export const KEYWORDS: { intent?: Intent; topic?: Topic; terms: string[] }[] = [
  { intent: "find_scheme", terms: ["find", "scheme", "yojane", "ಯೋಜನೆ", "ಹುಡುಕು"] },
  { intent: "documents_needed", terms: ["document", "papers", "ದಾಖಲೆ", "ದಾಖಲೆಗಳು"] },
  { intent: "profile_hint", terms: ["profile", "ಪ್ರೊಫೈಲ್"] },
  { intent: "portal_check", terms: ["portal", "website", "ಪೋರ್ಟಲ್", "ವೆಬ್‌ಸೈಟ್"] },
  { topic: "farmer", terms: ["farmer", "farm", "ರೈತ", "ಕೃಷಿ"] },
  { topic: "health", terms: ["health", "hospital", "ಆರೋಗ್ಯ", "ಚಿಕಿತ್ಸೆ"] },
  { topic: "housing", terms: ["house", "housing", "ಮನೆ", "ವಸತಿ"] },
  { topic: "education", terms: ["scholarship", "education", "student", "ವಿದ್ಯಾರ್ಥಿ", "ಸ್ಕಾಲರ್‌ಶಿಪ್", "ಶಿಕ್ಷಣ"] },
  { topic: "skill_loan", terms: ["skill", "loan", "ಕೌಶಲ್ಯ", "ಸಾಲ"] },
];

/** Finds intents and topics in the query. Results are unique, in order of first appearance. */
export function parseQuery(text: string): { intents: Intent[]; topics: Topic[] } {
  const q = text.toLowerCase();
  const hits: { at: number; intent?: Intent; topic?: Topic }[] = [];
  for (const entry of KEYWORDS) {
    for (const term of entry.terms) {
      const at = q.indexOf(term.toLowerCase());
      if (at >= 0) hits.push({ at, intent: entry.intent, topic: entry.topic });
    }
  }
  hits.sort((a, b) => a.at - b.at);
  const intents: Intent[] = [];
  const topics: Topic[] = [];
  for (const h of hits) {
    if (h.intent && !intents.includes(h.intent)) intents.push(h.intent);
    if (h.topic && !topics.includes(h.topic)) topics.push(h.topic);
  }
  return { intents, topics };
}

/** Extra English words that count as a match for a topic, checked against scheme text. */
const TOPIC_ALIASES: Record<Topic, string[]> = {
  farmer: ["farmer", "farm", "agri"],
  health: ["health"],
  housing: ["housing", "hostel", "house"],
  education: ["education", "scholar", "student", "fee"],
  skill_loan: ["skill", "fellowship", "loan"],
};

function matchesTopic(scheme: Scheme, topic: Topic): boolean {
  const haystack = `${scheme.domain} ${categoryOf(scheme)} ${scheme.name.en}`.toLowerCase();
  return [topic, ...TOPIC_ALIASES[topic]].some((word) => haystack.includes(word));
}

/** Short answer for a query: matching schemes, optional hints, official https links, and the reminder. */
export function answerFor(
  query: string,
  schemes: Scheme[],
): {
  intents: Intent[];
  topics: Topic[];
  matches: Scheme[];
  lines: { en: string; kn: string }[];
  links: { label: string; url: string }[];
} {
  const { intents, topics } = parseQuery(query);
  const matches = topics.length
    ? schemes.filter((s) => topics.some((t) => matchesTopic(s, t)))
    : schemes.slice(0, 5);

  const lines: Bilingual[] = [];
  if (matches.length === 0) {
    lines.push({
      en: "No scheme in the current catalogue matches this topic.",
      kn: "ಪ್ರಸ್ತುತ ಪಟ್ಟಿಯಲ್ಲಿ ಈ ವಿಷಯಕ್ಕೆ ಯಾವುದೇ ಯೋಜನೆ ಇಲ್ಲ.",
    });
  } else {
    for (const s of matches) lines.push({ en: s.name.en, kn: s.name.kn });
  }

  if (intents.includes("documents_needed")) {
    for (const s of matches.slice(0, 3)) {
      lines.push({
        en: `Documents for ${s.name.en}: ${s.documents.map((d) => d.en).join(", ")}`,
        kn: `${s.name.kn} ದಾಖಲೆಗಳು: ${s.documents.map((d) => d.kn).join(", ")}`,
      });
    }
  }
  if (intents.includes("profile_hint")) {
    lines.push({
      en: "Complete your profile to see which schemes match you.",
      kn: "ನೀವು ಯಾವ ಯೋಜನೆಗಳಿಗೆ ಅರ್ಹರು ಎಂದು ನೋಡಲು ಪ್ರೊಫೈಲ್ ಭರ್ತಿ ಮಾಡಿ.",
    });
  }
  if (intents.includes("portal_check")) {
    lines.push({
      en: "Open the official portal link for each scheme.",
      kn: "ಪ್ರತಿ ಯೋಜನೆಗೂ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಲಿಂಕ್ ತೆರೆಯಿರಿ.",
    });
  }
  lines.push(VERIFY_REMINDER);

  const seen = new Set<string>();
  const links: { label: string; url: string }[] = [];
  for (const s of matches) {
    for (const url of [s.official_url, s.official_portal_url]) {
      if (url && url.startsWith("https://") && !seen.has(url)) {
        seen.add(url);
        links.push({ label: s.name.en, url });
      }
    }
  }

  return { intents, topics, matches, lines, links };
}

/** Maps the UI language to a BCP-47 tag for SpeechRecognition / SpeechSynthesis. */
export function speechLang(lang: "en" | "kn"): string {
  return lang === "kn" ? "kn-IN" : "en-IN";
}
