"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { parseIncomeInput } from "../lib/matcher";
import { SCHEME_DISCLAIMER } from "../lib/schemeCatalogue";
import { AnimatedPercent } from "./AnimatedPercent";
import { scoreScheme, whatIfDelta } from "../lib/scoreEngine";
import type { RuleStatus, ScoreResult } from "../lib/scoreEngine";
import type { MatchStatus, Profile, Scheme } from "../lib/schemeTypes";

const STATUS_TEXT: Record<MatchStatus, { en: string; kn: string; badge: string }> = {
  "Likely Eligible": {
    en: "Likely eligible",
    kn: "ಹೆಚ್ಚಾಗಿ ಅರ್ಹ",
    badge: "border-[#7f1d1d] bg-white text-[#7f1d1d]",
  },
  "Potential Match": {
    en: "Needs more information",
    kn: "ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಬೇಕು",
    badge: "border-[#881337] bg-rose-50 text-[#881337]",
  },
  "Not Matched": {
    en: "Not matched",
    kn: "ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ",
    badge: "border-stone-400 bg-stone-100 text-gray-900",
  },
};

const RULE_STATUS_LABEL: Record<RuleStatus, { en: string; kn: string; tone: string }> = {
  matched: { en: "Matched", kn: "ಪೂರೈಸಿದೆ", tone: "text-gray-900 font-semibold" },
  missing_info: { en: "Missing info", kn: "ತಿಳಿದಿಲ್ಲ", tone: "text-[#881337] font-semibold" },
  not_met: { en: "Not met", kn: "ವಿಫಲ", tone: "text-gray-600 font-medium" },
  not_applicable: { en: "Not applicable", kn: "ಅನ್ವಯಿಸುವುದಿಲ್ಲ", tone: "text-gray-500" },
};

// Fixability categorization: user-changeable fields (documents, hostel residence, missing profile answers)
// vs structural attributes (gender, caste category, domicile state, fixed birth/age criteria).
const USER_CHANGEABLE_FIELDS = new Set([
  "annual_family_income_inr",
  "marks_percent",
  "is_hostel_resident",
  "has_disability_certificate",
  "disability_percent",
  "income",
  "marks",
]);

function getFixability(field: string, status: RuleStatus): "user_changeable" | "structural" {
  if (status === "missing_info") return "user_changeable";
  const normalized = field.toLowerCase().trim();
  return USER_CHANGEABLE_FIELDS.has(normalized) ? "user_changeable" : "structural";
}

const CATEGORY_OPTIONS: { code: string; label: string }[] = [
  { code: "", label: "Not set / ನಿಗದಿಯಿಲ್ಲ" },
  { code: "GM", label: "General / ಸಾಮಾನ್ಯ" },
  { code: "SC", label: "SC / ಎಸ್ಸಿ" },
  { code: "ST", label: "ST / ಎಸ್ಟಿ" },
  { code: "OBC", label: "OBC / ಒಬಿಸಿ" },
  { code: "MINORITY", label: "Minority / ಅಲ್ಪಸಂಖ್ಯಾತ" },
];

const CATEGORY_TOKENS: { code: string; pattern: RegExp }[] = [
  { code: "SC", pattern: /\bsc\b|ಎಸ್ಸಿ/i },
  { code: "ST", pattern: /\bst\b|ಎಸ್ಟಿ/i },
  { code: "OBC", pattern: /\bobc\b|ಒಬಿಸಿ/i },
  { code: "MINORITY", pattern: /\bminority\b|ಅಲ್ಪಸಂಖ್ಯಾತ/i },
  { code: "GM", pattern: /\bgeneral\b|\bgm\b|ಸಾಮಾನ್ಯ/i },
];

const FIELD_LABEL: Partial<Record<keyof Profile, { en: string; kn: string }>> = {
  annual_family_income_inr: { en: "income", kn: "ಆದಾಯ" },
  marks_percent: { en: "marks", kn: "ಅಂಕ" },
  is_hostel_resident: { en: "hostel", kn: "ಹಾಸ್ಟೆಲ್" },
  category: { en: "category", kn: "ವರ್ಗ" },
};

function parseQuestion(text: string): Partial<Profile> | null {
  const q = text.trim();
  if (q === "") return null;

  const out: Partial<Profile> = {};

  const marks = q.match(/(?:marks|ಅಂಕ(?:ಗಳು)?)\D*(\d+(?:\.\d+)?)/i);
  if (marks) {
    const value = Number(marks[1]);
    if (value >= 0 && value <= 100) out.marks_percent = value;
  }

  if (/\bhostel\b|ಹಾಸ್ಟೆಲ್/i.test(q)) {
    out.is_hostel_resident = !/\b(no|not)\b|ಇಲ್ಲ/i.test(q);
  }

  const category = CATEGORY_TOKENS.find((token) => token.pattern.test(q));
  if (category) out.category = category.code;

  if (out.marks_percent === undefined && /income|ಆದಾಯ|lakh|lac|crore|ಲಕ್ಷ|ಕೋಟಿ/i.test(q)) {
    const amount = q.match(/\d[\d,]*(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|ಲಕ್ಷ|ಕೋಟಿ)?/i);
    const income = amount ? parseIncomeInput(amount[0]) : null;
    if (income !== null) out.annual_family_income_inr = income;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function displayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "yes / ಹೌದು" : "no / ಇಲ್ಲ";
  return String(value);
}

const INPUT_CLASS =
  "print:hidden mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-gray-900 placeholder-stone-400 focus:border-[#7f1d1d] focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]";

export default function WhatIfPanel({ scheme, profile }: { scheme: Scheme; profile: Profile }) {
  const { lang } = useLanguage();
  const [overrides, setOverrides] = useState<Partial<Profile>>({});
  const [question, setQuestion] = useState("");

  // Use scoreEngine to compute baseline and what-if delta live in memory
  const baselineScore: ScoreResult = scoreScheme(scheme, profile);
  const deltas = whatIfDelta([scheme], profile, overrides);
  const deltaMove = deltas[0];
  const afterScore: ScoreResult = deltaMove ? deltaMove.after : baselineScore;
  const movedThreshold = deltaMove?.movedIntoLikelyMatch ?? false;

  const currentStatus: MatchStatus = afterScore.likelyMatch
    ? "Likely Eligible"
    : afterScore.notMet > 0
    ? "Not Matched"
    : "Potential Match";

  const parsed = parseQuestion(question);
  const statusInfo = STATUS_TEXT[currentStatus];

  function current<K extends keyof Profile>(key: K): Profile[K] {
    return key in overrides ? overrides[key] : profile[key];
  }

  function changeField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setOverrides((prev) => ({ ...prev, [key]: value }) as Partial<Profile>);
  }

  function applyQuestion() {
    if (!parsed) return;
    setOverrides((prev) => ({ ...prev, ...parsed }));
  }

  function applyIncomeExample() {
    setQuestion("income 2.5 lakh");
    changeField("annual_family_income_inr", parseIncomeInput("2.5 lakh") ?? 250000);
  }

  const parsedEntries = parsed ? Object.entries(parsed) : [];

  return (
    <section
      className={`space-y-4 rounded-xl border border-stone-200 bg-white/85 p-5 text-gray-900 shadow-sm backdrop-blur-md ${
        movedThreshold ? "score-moved" : ""
      }`}
      data-lang={lang}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            <span lang="en">Live Rule Breakdown &amp; &ldquo;What-If&rdquo; Simulator</span>
          </h3>
          <p className="text-xs text-gray-600">
            Flip any profile field below to live-test eligibility and rule outcomes in memory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-black text-[#7f1d1d]">
              <AnimatedPercent value={afterScore.percent} />
            </span>
            <span className="block text-[10px] uppercase font-bold text-gray-500">Likely Match Score</span>
          </div>
          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${statusInfo.badge}`}>
            {lang === "kn" ? statusInfo.kn : statusInfo.en}
          </span>
        </div>
      </div>

      {movedThreshold && (
        <div className="rounded-lg border border-[#7f1d1d] bg-rose-50/80 p-3 text-sm text-[#7f1d1d] font-semibold">
          🎉 This change pushed this scheme across the 70% threshold into Likely Match!
        </div>
      )}

      {/* Q&A quick helper */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
        <p className="font-semibold text-gray-900">
          <span lang="en">Quick query example: &ldquo;income 2.5 lakh&rdquo;</span>
        </p>
        <p className="text-xs text-gray-700">
          <span lang="en">2.5 lakh parses to ₹2,50,000 annual family income.</span>{" "}
          <span lang="kn">ಆದಾಯ 2.5 ಲಕ್ಷ = ₹2,50,000 ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ.</span>
        </p>
        <button
          type="button"
          onClick={applyIncomeExample}
          className="print:hidden mt-2 rounded bg-[#7f1d1d] px-3 py-1 text-xs font-semibold text-white hover:bg-[#881337]"
        >
          <span lang="en">Try 2.5 Lakh</span> / <span lang="kn">ಪ್ರಯತ್ನಿಸಿ</span>
        </button>
      </div>

      {/* Ask box */}
      <form
        className="space-y-2 print:hidden"
        onSubmit={(e) => {
          e.preventDefault();
          applyQuestion();
        }}
      >
        <label className="block text-xs font-semibold text-gray-800">
          <span lang="en">Type a condition (e.g. &ldquo;income 2.5 lakh&rdquo;, &ldquo;marks 65&rdquo;, &ldquo;hostel yes&rdquo;)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. marks 75, hostel yes"
            className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-stone-400 focus:border-[#7f1d1d] focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]"
          />
          <button
            type="submit"
            disabled={!parsed}
            className="rounded-md bg-[#7f1d1d] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#881337] disabled:opacity-50"
          >
            <span lang="en">Apply</span>
          </button>
        </div>
        {parsed ? (
          <p className="text-xs text-gray-700">
            <span className="font-semibold">Parsed: </span>
            {parsedEntries.map(([key, value], i) => (
              <span key={key}>
                {i > 0 ? ", " : ""}
                {FIELD_LABEL[key as keyof Profile]?.en ?? key} = {displayValue(value)}
              </span>
            ))}
          </p>
        ) : null}
      </form>

      {/* What-If input controls */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-800">
          <span>Annual family income (INR / ರೂ.)</span>
          <input
            type="number"
            min={0}
            value={current("annual_family_income_inr") ?? ""}
            onChange={(e) =>
              changeField("annual_family_income_inr", e.target.value === "" ? undefined : Number(e.target.value))
            }
            className={INPUT_CLASS}
          />
        </label>

        <label className="block text-xs font-medium text-gray-800">
          <span>Marks (%) / ಅಂಕ (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={current("marks_percent") ?? ""}
            onChange={(e) =>
              changeField("marks_percent", e.target.value === "" ? undefined : Number(e.target.value))
            }
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-gray-800 pt-2">
          <input
            type="checkbox"
            checked={current("is_hostel_resident") === true}
            onChange={(e) => changeField("is_hostel_resident", e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 accent-[#7f1d1d]"
          />
          <span>Hostel resident / ಹಾಸ್ಟೆಲ್ ನಿವಾಸಿ</span>
        </label>

        <label className="block text-xs font-medium text-gray-800">
          <span>Category / ವರ್ಗ</span>
          <select
            value={current("category") ?? ""}
            onChange={(e) => changeField("category", e.target.value || undefined)}
            className={INPUT_CLASS}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Live Rule-by-rule Breakdown with Fixability Tagger */}
      <div className="pt-2 border-t border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Rule Breakdown &amp; Fixability
          </h4>
          <span className="text-[10px] text-gray-500">
            Fixable near-misses shown first
          </span>
        </div>
        <ul className="space-y-1.5 text-xs">
          {afterScore.ruleResults
            .filter((r) => r.status !== "not_applicable")
            .sort((a, b) => {
              const aFix = getFixability(a.field, a.status);
              const bFix = getFixability(b.field, b.status);
              if (aFix === "user_changeable" && bFix !== "user_changeable") return -1;
              if (aFix !== "user_changeable" && bFix === "user_changeable") return 1;
              return 0;
            })
            .map((rule) => {
              const info = RULE_STATUS_LABEL[rule.status];
              const fixability = getFixability(rule.field, rule.status);
              return (
                <li
                  key={rule.clauseId}
                  className="flex items-center justify-between rounded border border-stone-100 bg-stone-50 px-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">Field: {rule.field}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        fixability === "user_changeable"
                          ? "border border-[#7f1d1d] bg-white text-[#7f1d1d]"
                          : "border border-stone-300 bg-stone-200/80 text-gray-700"
                      }`}
                    >
                      {fixability === "user_changeable" ? "Fixable action" : "Structural"}
                    </span>
                  </div>
                  <span className={info.tone}>
                    {lang === "kn" ? info.kn : info.en} ({rule.status})
                  </span>
                </li>
              );
            })}
        </ul>
      </div>

      <p className="text-[11px] text-gray-500 border-t border-stone-100 pt-2">
        {lang === "kn" ? SCHEME_DISCLAIMER.kn : SCHEME_DISCLAIMER.en}
      </p>
    </section>
  );
}
