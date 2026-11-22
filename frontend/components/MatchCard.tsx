"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { DeadlineCountdown } from "./DeadlineCountdown";
import type { MatchStatus, RuleOutcome, SchemeMatch } from "../lib/types";
import { fieldFlag } from "../lib/verification";
import { readinessFor } from "../lib/readiness";
import { SCHEME_CATALOGUE } from "../lib/schemeCatalogue";

const STATUS_STYLES: Record<MatchStatus, string> = {
  likely_eligible: "border-[#7f1d1d] bg-rose-50/50 text-[#7f1d1d]",
  potential_match: "border-[#881337] bg-rose-50 text-[#881337]",
  not_matched: "border-stone-400 bg-stone-100 text-gray-900",
};

const STATUS_LABEL_KEYS: Record<MatchStatus, string> = {
  likely_eligible: "status.likelyEligible",
  potential_match: "status.needsInfo",
  not_matched: "status.notMatched",
};

const OUTCOME_STYLES: Record<RuleOutcome, string> = {
  PASS: "font-semibold text-gray-900",
  FAIL: "font-semibold text-[#881337]",
  UNKNOWN: "font-semibold text-gray-800",
  NOT_APPLICABLE: "text-gray-600",
};

interface MatchCardProps {
  match: SchemeMatch;
  saved: boolean;
  onToggleSave: (schemeId: string) => void;
  checkedDocs?: Set<string>;
}

export function MatchCard({ match, saved, onToggleSave, checkedDocs }: MatchCardProps) {
  const { t } = useLanguage();
  const catalogueScheme = SCHEME_CATALOGUE.find((s) => s.id === match.scheme_id);

  // Document readiness
  const docsCheckedSet = checkedDocs ?? new Set();
  const readiness = catalogueScheme ? readinessFor(catalogueScheme, docsCheckedSet) : null;
  const missingCount = readiness ? readiness.total - readiness.checked : 0;

  // Verification checks
  const portalUrl = catalogueScheme?.official_portal_url || catalogueScheme?.official_url;
  const isPortalUrlValid = typeof portalUrl === "string" && portalUrl.startsWith("https://");

  const benefitFlag = catalogueScheme ? fieldFlag(catalogueScheme, "benefit") : "needs_portal_check";
  const deadlineFlag = catalogueScheme ? fieldFlag(catalogueScheme, "deadline") : "needs_portal_check";

  return (
    <article className="rounded-xl border border-stone-200 bg-white/85 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-bold text-gray-900">
            {match.scheme_name}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[match.status]}`}
            >
              {t(STATUS_LABEL_KEYS[match.status])}
            </span>
            {readiness && (
              <span
                className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                  readiness.state === "ready"
                    ? "border-[#7f1d1d] bg-white text-[#7f1d1d]"
                    : readiness.state === "almost"
                    ? "border-[#881337] bg-rose-50 text-[#881337]"
                    : "border-stone-300 bg-stone-100 text-gray-800"
                }`}
              >
                {readiness.state === "ready"
                  ? "Ready now"
                  : missingCount > 0
                  ? `Missing ${missingCount} doc${missingCount === 1 ? "" : "s"}`
                  : "Check documents"}
              </span>
            )}
            {match.is_demonstration ? (
              <span className="inline-block rounded-md border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                {t("badge.demo")}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          aria-pressed={saved}
          onClick={() => onToggleSave(match.scheme_id)}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337]"
        >
          {saved ? t("action.saved") : t("action.save")}
        </button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-800">{match.explanation}</p>

      {/* Verification indicators */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {benefitFlag === "needs_portal_check" && (
          <span className="rounded border border-stone-300 bg-stone-50 px-2 py-0.5 font-medium text-gray-700">
            Benefit: needs portal check
          </span>
        )}
        {deadlineFlag === "needs_portal_check" && (
          <span className="rounded border border-stone-300 bg-stone-50 px-2 py-0.5 font-medium text-gray-700">
            Deadline: Check official portal
          </span>
        )}
      </div>

      {/* Scheme Date Timer & Reminder Block */}
      <div className="mt-3">
        <DeadlineCountdown
          schemeId={match.scheme_id}
          schemeName={match.scheme_name}
          deadline={catalogueScheme?.deadline?.date ?? null}
          deadlineStatus={catalogueScheme?.deadline?.verified ? "verified" : "unverified"}
        />
      </div>

      {match.rule_results.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {match.rule_results.map((result) => (
            <li
              key={result.rule_id}
              className="rounded-lg border border-stone-200 bg-stone-50/50 p-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-semibold text-gray-900">{result.description}</span>
                <span className={OUTCOME_STYLES[result.outcome]}>
                  {t(result.outcome)}{" "}
                  {result.outcome === "PASS" || result.outcome === "FAIL"
                    ? `(${t(result.mandatory ? "required" : "optional")})`
                    : null}
                </span>
              </div>
              <p className="mt-1 text-gray-700">{result.reason}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
        <Link
          href={`/schemes/${match.scheme_id}`}
          className="text-sm font-semibold text-[#7f1d1d] underline hover:text-[#881337] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337]"
        >
          {t("action.viewDetails")}
        </Link>

        {isPortalUrlValid && (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-700 underline hover:text-[#7f1d1d]"
          >
            Official Portal &rarr;
          </a>
        )}
      </div>
    </article>
  );
}
