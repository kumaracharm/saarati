"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "../../components/LanguageProvider";
import { LanguageFallbackNote } from "../../components/LanguageToggle";
import { generateFullCatalogue } from "../../lib/schemeCatalogue";
import type {
  ProviderType,
  Scheme as SchemeRecord,
  SchemeDomain,
  SchemeScope,
} from "../../lib/schemeTypes";

// Badge-only fields from lib/schemeTypes.ts.
type BadgeFields = Pick<SchemeRecord, "provider_type" | "scope" | "verification_score">;

// The full catalogue is generated locally, so it is rendered synchronously (no API call).
const CATALOGUE: SchemeRecord[] = generateFullCatalogue();

type VerificationFilter = "all" | "verified" | "demonstration";
type VerificationStatus = "verified" | "unverified";

const ALL_TAB = "all";

// A scheme is verified only when its rule, benefit amount and deadline are all verified.
function verificationOf(scheme: SchemeRecord): VerificationStatus {
  return scheme.rule_verified &&
    scheme.benefit.amount_verified === true &&
    scheme.deadline.verified === true
    ? "verified"
    : "unverified";
}

type TabOption = { value: string; label: string; count: number };

// Badge per verification status derived by verificationOf().
const VERIFICATION_BADGE: Record<
  VerificationStatus,
  { label: string; className: string }
> = {
  verified: {
    label: "verification.verified",
    className: "border-[#7f1d1d] bg-rose-50 text-[#7f1d1d]",
  },
  unverified: {
    label: "verification.unverified",
    className: "border-amber-700 bg-amber-50 text-amber-900",
  },
};

// Label values are i18n keys, looked up with t() at render time.
const DOMAIN_LABEL: Record<SchemeDomain, string> = {
  scholarship: "domain.scholarship",
  hostel_stipend: "domain.hostel_stipend",
  fee_reimbursement: "domain.fee_reimbursement",
  health_cover: "domain.health_cover",
  insurance_protection: "domain.insurance_protection",
  fellowship_skill: "domain.fellowship_skill",
  social_security_pension: "domain.social_security_pension",
  housing_support: "domain.housing_support",
  farmer_livelihood: "domain.farmer_livelihood",
};


// Same badge palette as the results page.
const PROVIDER_BADGE: Record<ProviderType, { label: string; className: string }> = {
  government: {
    label: "GOVERNMENT",
    className: "border-[#7f1d1d] bg-white text-[#7f1d1d]",
  },
  private_csr: {
    label: "PRIVATE / CSR",
    className: "border-[#881337] bg-rose-50 text-[#881337]",
  },
  aided_institutional: {
    label: "AIDED / INSTITUTIONAL",
    className: "border-stone-500 bg-stone-100 text-gray-900",
  },
};

const SCOPE_LABEL: Record<SchemeScope, string> = {
  individual: "INDIVIDUAL",
  household: "HOUSEHOLD",
};


type GroupKey = "domain" | "provider" | "scope";
const GROUP_KEYS: GroupKey[] = ["domain", "provider", "scope"];

// True when the scheme matches one group's selected value ("all" matches everything).
function matchesGroup(scheme: SchemeRecord, key: GroupKey, value: string): boolean {
  if (value === ALL_TAB) {
    return true;
  }
  switch (key) {
    case "domain":
      return scheme.domain === value;
    case "provider":
      return scheme.provider_type === value;
    case "scope":
      return scheme.scope === value;
  }
}

// Shared card and control styling, matching the results page.
const PANEL = "rounded-xl border border-stone-200 bg-white/85 shadow-sm backdrop-blur-md";
const LINK =
  "font-medium text-[#7f1d1d] underline underline-offset-4 hover:text-[#881337] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337]";
const CONTROL =
  "min-h-11 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] disabled:cursor-not-allowed disabled:opacity-50";

function SchemeBadges({ fields }: { fields: Partial<BadgeFields> }) {
  const provider = fields.provider_type
    ? PROVIDER_BADGE[fields.provider_type]
    : undefined;
  const scopeLabel = fields.scope ? SCOPE_LABEL[fields.scope] : undefined;
  const score = fields.verification_score;
  const hasScore = typeof score === "number" && Number.isFinite(score);
  if (!provider && !scopeLabel && !hasScore) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {provider ? (
        <span
          className={`w-fit rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide ${provider.className}`}
        >
          {provider.label}
        </span>
      ) : null}
      {scopeLabel ? (
        <span className="w-fit rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-semibold tracking-wide text-gray-900">
          {scopeLabel}
        </span>
      ) : null}
      {hasScore ? (
        <span className="w-fit rounded-full border border-[#7f1d1d] bg-rose-50 px-2 py-0.5 text-xs font-semibold text-[#7f1d1d]">
          Verification score: {score}
        </span>
      ) : null}
    </div>
  );
}

function FilterTabs({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: TabOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(option.value)}
            className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] ${
              active
                ? "border-[#881337] bg-[#881337] text-white"
                : "border-stone-300 bg-white text-gray-900 hover:bg-stone-100"
            }`}
          >
            {option.label} ({option.count})
          </button>
        );
      })}
    </div>
  );
}

export default function SchemesPage() {
  const { t } = useLanguage();
  const schemes = CATALOGUE;
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState<VerificationFilter>("all");
  const [domain, setDomain] = useState(ALL_TAB);
  const [provider, setProvider] = useState(ALL_TAB);
  const [scope, setScope] = useState(ALL_TAB);

  // Stage 1: free-text search and verification status. Every count and the list start from here.
  const searchedSchemes = useMemo<SchemeRecord[]>(() => {
    const needle = query.trim().toLowerCase();
    return schemes.filter((scheme) => {
      if (needle !== "") {
        const haystack = [
          scheme.name.en,
          scheme.provider_label.en,
          scheme.issuer.en,
          scheme.summary.en,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      if (verification === "verified" && verificationOf(scheme) !== "verified") {
        return false;
      }
      if (verification === "demonstration" && verificationOf(scheme) !== "unverified") {
        return false;
      }
      return true;
    });
  }, [schemes, query, verification]);

  const selections: Record<GroupKey, string> = { domain, provider, scope };

  // Applies every group selection except `skip` (used for faceted counts).
  function applyGroups(items: SchemeRecord[], skip?: GroupKey): SchemeRecord[] {
    return items.filter((scheme) =>
      GROUP_KEYS.every((key) => key === skip || matchesGroup(scheme, key, selections[key])),
    );
  }

  // The list actually rendered. Its length equals the count shown on the selected domain option.
  const filteredSchemes = applyGroups(searchedSchemes);

  // Each option's count uses the same predicates as the list, with the other groups applied.
  function optionsFor(key: GroupKey, labels: Record<string, string>, allLabel: string): TabOption[] {
    const pool = applyGroups(searchedSchemes, key);
    return [
      { value: ALL_TAB, label: allLabel, count: pool.length },
      ...Object.keys(labels).map((value) => ({
        value,
        label: t(labels[value] ?? value),
        count: pool.filter((s) => matchesGroup(s, key, value)).length,
      })),
    ];
  }

  const domainOptions = optionsFor("domain", DOMAIN_LABEL, "filter.allDomains");

  const hasActiveFilters =
    query.trim() !== "" ||
    verification !== "all" ||
    domain !== ALL_TAB ||
    provider !== ALL_TAB ||
    scope !== ALL_TAB;

  function clearFilters() {
    setQuery("");
    setVerification("all");
    setDomain(ALL_TAB);
    setProvider(ALL_TAB);
    setScope(ALL_TAB);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 text-gray-900">
      <header className={`${PANEL} flex flex-col gap-3 p-5`}>
        <h1 className="text-2xl font-semibold text-gray-900">{t("catalogue.heading")}</h1>
        <p className="text-sm font-medium text-[#7f1d1d]">
          Never enter Aadhaar numbers, OTPs, passwords or bank account numbers in this app.
        </p>
        <LanguageFallbackNote />
      </header>

      {schemes.length === 0 ? (
        <p className="text-gray-900">No schemes are in the catalogue yet.</p>
      ) : (
        <>
          <section
            aria-label="Search and filter schemes"
            className={`${PANEL} flex flex-col gap-4 p-4`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="scheme-search"
                type="search"
                aria-label="Search schemes"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search schemes"
                className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2 text-gray-900 placeholder:text-stone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] sm:flex-1"
              />
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className={CONTROL}
              >
                Clear filters
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-900">{t("filter.domain")}</span>
              <FilterTabs
                label="Filter by domain"
                options={domainOptions}
                selected={domain}
                onSelect={setDomain}
              />
            </div>
          </section>

          <p role="status" aria-live="polite" className="text-sm text-gray-900">
            {`Showing ${filteredSchemes.length} of ${schemes.length} ${
              schemes.length === 1 ? "scheme" : "schemes"
            }`}
          </p>

          {filteredSchemes.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-gray-900">No schemes match these filters.</p>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className={CONTROL}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {filteredSchemes.map((scheme) => {
                const status = verificationOf(scheme);
                return (
                  <li key={scheme.id} className={`${PANEL} flex flex-col gap-2 p-4`}>
                    <h2 className="text-lg font-semibold text-gray-900">{scheme.name.en}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className="w-fit rounded-full border border-stone-400 bg-stone-100 px-2 py-0.5 text-sm font-medium text-gray-900">
                        {t("provenance.demo")}
                      </span>
                      <span
                        className={`w-fit rounded-full border px-2 py-0.5 text-sm font-medium ${VERIFICATION_BADGE[status].className}`}
                      >
                        {t("filter.verification")}: {t(VERIFICATION_BADGE[status].label)}
                      </span>
                    </div>
                    <SchemeBadges fields={scheme} />
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-gray-800">
                      <dt className="font-medium text-gray-900">Provider</dt>
                      <dd>{scheme.provider_label.en}</dd>
                      <dt className="font-medium text-gray-900">Issuer</dt>
                      <dd>{scheme.issuer.en}</dd>
                      <dt className="font-medium text-gray-900">Domain</dt>
                      <dd>{t(DOMAIN_LABEL[scheme.domain])}</dd>
                      <dt className="font-medium text-gray-900">Benefit</dt>
                      <dd>
                        {scheme.benefit.amount
                          ? `₹${scheme.benefit.amount.value.toLocaleString("en-IN")} — `
                          : ""}
                        {scheme.benefit.text.en}
                        {scheme.benefit.amount_verified !== true ? (
                          <span className="ml-2 text-amber-800">{t("portal.check")}</span>
                        ) : null}
                      </dd>
                      <dt className="font-medium text-gray-900">Deadline</dt>
                      <dd>
                        {scheme.deadline.text.en}
                        {scheme.deadline.date ? ` (${scheme.deadline.date})` : ""}
                      </dd>
                    </dl>
                    <div>
                      <Link href={`/schemes/${scheme.id}`} className={`${LINK} text-sm`}>
                        View details
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
