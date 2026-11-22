"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DeadlineCountdown } from "../../../components/DeadlineCountdown";
import { SaveButton } from "../../../components/SaveButton";
import { LanguageFallbackNote } from "../../../components/LanguageToggle";
import { useLanguage } from "../../../components/LanguageProvider";
import SchemeInspector from "../../../components/SchemeInspector";
import WhatIfPanel from "@/components/WhatIfPanel";
import { ApiError, getScheme } from "../../../lib/api";
import { SCHEME_CATALOGUE } from "../../../lib/schemeCatalogue";
import { PROFILE_KEY } from "../../../lib/storage";
import { readinessFor } from "../../../lib/readiness";
import { overlapNotes } from "../../../lib/schemeGroups";
import { fieldFlag, safeOfficialLinks, reportOutdatedPayload } from "../../../lib/verification";
import type { Scheme } from "../../../lib/types";
import type { Profile, Scheme as CatalogueScheme } from "../../../lib/schemeTypes";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: ApiError | null }
  | { status: "fallback"; scheme: CatalogueScheme }
  | { status: "ready"; scheme: Scheme };

const SCHEME_LOAD_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Scheme request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const SECTION_HEADING = "text-xl font-bold text-[#111827]";
const BODY_TEXT = "text-[#111827]";
const MUTED_TEXT = "text-gray-600";
const LINK_TEXT = "font-medium text-[#7f1d1d] underline hover:text-[#881337]";

function isHttpsUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://");
}

function PrintSheet({ scheme }: { scheme: CatalogueScheme }) {
  return (
    <section id="print-sheet" className="hidden print:block p-8 bg-white text-gray-900 max-w-3xl mx-auto font-sans">
      <div className="border-b-2 border-[#7f1d1d] pb-4 mb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-[#7f1d1d]">
          Official Scheme Summary &amp; Verification Action Sheet
        </span>
        <h1 className="mt-2 text-2xl font-black text-gray-900">
          {scheme.name.en}
        </h1>
        <p className="text-base text-gray-700">{scheme.name.kn}</p>
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-xs border border-stone-200 p-4 rounded mb-6">
        <dt className="font-bold text-gray-800">Issuer / ವಿತರಕರು:</dt>
        <dd>{scheme.issuer.en} / {scheme.issuer.kn}</dd>
        <dt className="font-bold text-gray-800">Category / ವರ್ಗ:</dt>
        <dd>{scheme.domain} ({scheme.jurisdiction})</dd>
        <dt className="font-bold text-gray-800">Official Portal:</dt>
        <dd className="font-semibold text-[#7f1d1d] break-all">{scheme.official_portal_url}</dd>
        <dt className="font-bold text-gray-800">Benefit Overview:</dt>
        <dd>{scheme.benefit.text.en}</dd>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#7f1d1d] border-b border-stone-200 pb-1 mb-2">
          Eligibility Clauses / ಅರ್ಹತಾ ನಿಯಮಗಳು
        </h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-800">
          {scheme.eligibility.map((clause) => (
            <li key={clause.id}>
              <p className="font-medium text-gray-900">{clause.text.en}</p>
              <p className="text-gray-600">{clause.text.kn}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#7f1d1d] border-b border-stone-200 pb-1 mb-2">
          Required Document Checklist / ದಾಖಲೆ ಪಟ್ಟಿ
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-800">
          {scheme.documents.map((doc, idx) => (
            <li key={idx}>
              <span className="font-medium text-gray-900">{doc.en}</span> — <span>{doc.kn}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-stone-300 pt-4 text-[10px] text-gray-500">
        <p className="font-bold text-gray-700">Notice &amp; Privacy Guarantee:</p>
        <p>This sheet never requests, collects or stores Aadhaar numbers, OTPs, PINs, or bank account credentials. Verify exact amounts and deadlines on the official government portal before applying.</p>
      </div>
    </section>
  );
}

function PrintSheetButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-md border border-[#7f1d1d] bg-white px-4 py-2 text-sm font-semibold text-[#7f1d1d] hover:bg-stone-50"
    >
      Print action sheet / ಮುದ್ರಣ ಪತ್ರ
    </button>
  );
}

function SchemeDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const { t, lang } = useLanguage();
  const [profile, setProfile] = useState<Profile>({});
  const [reported, setReported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(PROFILE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setProfile(parsed as Profile);
          }
        }
      } catch {
        // Storage unavailable
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    withTimeout(getScheme(id), SCHEME_LOAD_TIMEOUT_MS)
      .then((scheme) => {
        if (!cancelled) {
          setState({ status: "ready", scheme });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const offline = SCHEME_CATALOGUE.find((item) => item.id === id);
        if (offline) {
          setState({ status: "fallback", scheme: offline });
          return;
        }
        setState({
          status: "error",
          error: err instanceof ApiError ? err : null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  const catalogueEntry = SCHEME_CATALOGUE.find((s) => s.id === id);

  const readiness = catalogueEntry ? readinessFor(catalogueEntry, new Set()) : null;
  const missingCount = readiness ? readiness.total - readiness.checked : 0;
  const relevantOverlaps = catalogueEntry
    ? overlapNotes(SCHEME_CATALOGUE).filter(
        (o) =>
          o.category.toLowerCase().includes(catalogueEntry.domain.toLowerCase()) ||
          catalogueEntry.name.en.toLowerCase().includes(o.category.toLowerCase()),
      )
    : [];

  const verifiedLinks = catalogueEntry ? safeOfficialLinks(catalogueEntry) : [];
  const benefitFlagStatus = catalogueEntry ? fieldFlag(catalogueEntry, "benefit") : "needs_portal_check";
  const deadlineFlagStatus = catalogueEntry ? fieldFlag(catalogueEntry, "deadline") : "needs_portal_check";

  function handleReportOutdated(field: string) {
    const payload = reportOutdatedPayload(id, field, "Reported via scheme detail view");
    console.info("Outdated detail report payload:", payload);
    setReported(true);
  }

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="status" className={BODY_TEXT}>
          Loading scheme…
        </p>
      </main>
    );
  }

  if (state.status === "fallback") {
    const offline = state.scheme;
    return (
      <>
        <main className="print:hidden mx-auto flex max-w-4xl flex-col gap-6 p-6">
          <p
            role="note"
            className="rounded-xl border border-[#881337] bg-rose-50/50 p-4 font-medium text-[#111827] backdrop-blur-md"
          >
            The live record could not be loaded in time, so an offline catalogue copy is shown. /
            ಲೈವ್ ದಾಖಲೆ ಸಮಯಕ್ಕೆ ಲೋಡ್ ಆಗಲಿಲ್ಲ; ಆಫ್‌ಲೈನ್ ಕ್ಯಾಟಲಾಗ್ ಪ್ರತಿಯನ್ನು ತೋರಿಸಲಾಗಿದೆ.
          </p>
          <header className="flex flex-col gap-3">
            <h1 className="text-3xl font-extrabold text-[#111827]">
              {offline.name.en}
            </h1>
            <p className="text-lg text-gray-800">{offline.name.kn}</p>
          </header>

          <WhatIfPanel scheme={offline} profile={profile} />

          {relevantOverlaps.length > 0 && (
            <div className="rounded-xl border border-stone-200 border-l-4 border-l-[#881337] bg-white/85 p-4 text-xs text-gray-900 shadow-sm">
              <h3 className="font-bold text-[#881337] uppercase tracking-wider mb-1">
                State vs. Central Overlap Notice
              </h3>
              <p>{lang === "kn" ? relevantOverlaps[0].note.kn : relevantOverlaps[0].note.en}</p>
            </div>
          )}

          <div>
            <PrintSheetButton />
          </div>
        </main>
        <PrintSheet scheme={offline} />
      </>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="alert" className="text-[#881337] font-semibold">
          Could not load scheme details.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-md bg-[#7f1d1d] px-4 py-2 font-medium text-white hover:bg-[#881337]"
        >
          Retry
        </button>
      </main>
    );
  }

  const scheme = state.scheme;

  return (
    <>
      <main className="print:hidden mx-auto flex max-w-4xl flex-col gap-8 p-6 text-gray-900">
        <header className="flex flex-col gap-3 border-b border-stone-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-extrabold text-[#111827]">{scheme.name}</h1>
            <SaveButton schemeId={scheme.id} />
          </div>
          <p className="text-base text-gray-800 leading-relaxed">{scheme.provider}</p>
          <LanguageFallbackNote />
        </header>

        {catalogueEntry ? (
          <>
            <WhatIfPanel scheme={catalogueEntry} profile={profile} />
            <div className="flex flex-wrap items-center gap-3">
              <PrintSheetButton />
              <button
                type="button"
                onClick={() => handleReportOutdated("scheme_details")}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-stone-50"
              >
                {reported ? "✓ Outdated detail reported" : "Report outdated detail"}
              </button>
            </div>
          </>
        ) : null}

        {relevantOverlaps.length > 0 && (
          <section className="rounded-xl border border-stone-200 border-l-4 border-l-[#881337] bg-white/85 p-4 text-xs text-gray-900 shadow-sm backdrop-blur-md">
            <h3 className="font-bold uppercase tracking-wider text-[#881337] mb-1">
              State vs. Central Overlap Reminder
            </h3>
            <p className="leading-relaxed">
              {lang === "kn" ? relevantOverlaps[0].note.kn : relevantOverlaps[0].note.en}
            </p>
          </section>
        )}

        {readiness && (
          <section className="rounded-xl border border-stone-200 bg-white/85 p-5 shadow-sm backdrop-blur-md">
            <h2 className={SECTION_HEADING}>Document Readiness</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-md border border-[#7f1d1d] bg-white px-3 py-1 text-xs font-bold text-[#7f1d1d]">
                {readiness.state === "ready"
                  ? "Ready now (All docs in hand)"
                  : missingCount > 0
                  ? `Missing ${missingCount} document${missingCount === 1 ? "" : "s"}`
                  : "Documents require check"}
              </span>
              <span className="text-xs text-gray-600">
                {readiness.checked} of {readiness.total} required documents matched.
              </span>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-stone-200 bg-white/85 p-5 shadow-sm backdrop-blur-md flex flex-col gap-4">
          <h2 className={SECTION_HEADING}>Official Verification &amp; Portal Check</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded border border-stone-200 bg-stone-50 p-3">
              <span className="font-bold text-gray-800">Benefit Amount Verification:</span>
              <p className="mt-1">
                {benefitFlagStatus === "verified" ? (
                  <span className="font-semibold text-gray-900">Verified official record</span>
                ) : (
                  <span className="font-semibold text-[#881337]">needs portal check</span>
                )}
              </p>
            </div>
            <div className="rounded border border-stone-200 bg-stone-50 p-3">
              <span className="font-bold text-gray-800">Deadline Verification:</span>
              <p className="mt-1">
                {deadlineFlagStatus === "verified" ? (
                  <span className="font-semibold text-gray-900">Verified date</span>
                ) : (
                  <span className="font-semibold text-[#881337]">Check official portal</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Verified https:// Official Links
            </h3>
            {verifiedLinks.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {verifiedLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK_TEXT}
                    >
                      {link.label}: {link.url} &rarr;
                    </a>
                  </li>
                ))}
              </ul>
            ) : isHttpsUrl(scheme.official_url) ? (
              <a
                href={scheme.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_TEXT}
              >
                {t("links.portal")} &rarr;
              </a>
            ) : (
              <p className="text-xs text-gray-600">Check official portal for live URL.</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={SECTION_HEADING}>Eligibility Rules</h2>
          {scheme.eligibility_rules.length === 0 ? (
            <p className={MUTED_TEXT}>Not listed yet.</p>
          ) : (
            <ol className={`list-decimal space-y-2 pl-6 ${BODY_TEXT}`}>
              {scheme.eligibility_rules.map((rule) => (
                <li key={rule.id}>
                  {rule.description}{" "}
                  <span className={MUTED_TEXT}>
                    ({rule.mandatory ? "Mandatory" : "Optional"})
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={SECTION_HEADING}>Required Documents</h2>
          {scheme.required_documents.length === 0 ? (
            <p className={MUTED_TEXT}>Not listed yet.</p>
          ) : (
            <ul className={`list-disc space-y-1 pl-6 ${BODY_TEXT}`}>
              {scheme.required_documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={SECTION_HEADING}>How to Apply (No sensitive ID/OTP required)</h2>
          {scheme.application_steps.length === 0 ? (
            <p className={MUTED_TEXT}>Not listed yet.</p>
          ) : (
            <ol className={`list-decimal space-y-2 pl-6 ${BODY_TEXT}`}>
              {scheme.application_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={SECTION_HEADING}>{t("deadline.heading")} &amp; Reminders</h2>
          <DeadlineCountdown
            schemeId={scheme.id}
            schemeName={scheme.name}
            deadline={scheme.deadline}
            deadlineStatus={scheme.deadline_status}
          />
        </section>

        <SchemeInspector scheme={scheme} />

        <div>
          <Link href="/schemes" className={LINK_TEXT}>
            &larr; Back to schemes
          </Link>
        </div>
      </main>
      {catalogueEntry ? <PrintSheet scheme={catalogueEntry} /> : null}
    </>
  );
}

export default function SchemeDetailPage() {
  return (
    <Suspense fallback={<p role="status">Loading scheme…</p>}>
      <SchemeDetailContent />
    </Suspense>
  );
}
