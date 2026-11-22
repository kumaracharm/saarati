"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";
import VoiceInput from "../components/VoiceInput";
import { containsSensitive, parseSituation } from "../lib/intake";
import {
  MATCHES_KEY,
  PROFILE_KEY,
  SAVED_KEY,
  TRACKER_KEY,
  readJson,
  writeJson,
} from "../lib/storage";
import type { StudentProfile } from "../lib/types";

// name and line hold i18n keys; they are looked up with t() at render time.
const CATEGORIES: { name: string; line: string }[] = [
  { name: "category.education", line: "category.educationLine" },
  { name: "category.agriculture", line: "category.agricultureLine" },
  { name: "category.health", line: "category.healthLine" },
  { name: "category.housing", line: "category.housingLine" },
  { name: "category.women", line: "category.womenLine" },
  { name: "category.social", line: "category.socialLine" },
  { name: "category.employment", line: "category.employmentLine" },
  { name: "category.business", line: "category.businessLine" },
];

// Sample descriptions shared with the profile form. Kannada text: review by a Kannada speaker before release.
const QUICK_SAMPLES: { en: string; kn: string }[] = [
  {
    en: "I am a girl in class 12 from Karnataka with 78% marks",
    kn: "ನಾನು ಕರ್ನಾಟಕದ 12ನೇ ತರಗತಿಯ ವಿದ್ಯಾರ್ಥಿನಿ, 78% ಅಂಕ",
  },
  {
    en: "I study undergraduate in a government college in Karnataka, family income below 2.5 lakh",
    kn: "ನಾನು ಕರ್ನಾಟಕದ ಸರ್ಕಾರಿ ಕಾಲೇಜಿನಲ್ಲಿ ಪದವಿ ಓದುತ್ತಿದ್ದೇನೆ, ಕುಟುಂಬದ ಆದಾಯ 2.5 ಲಕ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ",
  },
  {
    en: "I am a boy studying postgraduate in a private university in Maharashtra, 65% marks",
    kn: "ನಾನು ಮಹಾರಾಷ್ಟ್ರದ ಖಾಸಗಿ ವಿಶ್ವವಿದ್ಯಾಲಯದಲ್ಲಿ ಸ್ನಾತಕೋತ್ತರ ಓದುತ್ತಿದ್ದೇನೆ, 65% ಅಂಕ",
  },
];

// Illustrative situations. The en text fills the intake box; the label shows both languages.
const SAMPLE_SITUATIONS: { label: string; en: string }[] = [
  {
    label:
      "Student — SC, hostel resident, income 2.5 lakh / ವಿದ್ಯಾರ್ಥಿ — ಎಸ್ಸಿ, ಹಾಸ್ಟೆಲ್ ನಿವಾಸಿ, ಆದಾಯ 2.5 ಲಕ್ಷ",
    en: "Student — SC, hostel resident, income 2.5 lakh",
  },
  {
    label:
      "Student — OBC, day scholar, marks 60%, income 1.2 lakh / ವಿದ್ಯಾರ್ಥಿ — ಒಬಿಸಿ, ಹಾಸ್ಟೆಲ್ ಇಲ್ಲ, ಅಂಕ 60%, ಆದಾಯ 1.2 ಲಕ್ಷ",
    en: "Student — OBC, day scholar, marks 60%, income 1.2 lakh",
  },
  {
    label:
      "Household — 5 members, BPL ration card, income 1.8 lakh / ಕುಟುಂಬ — 5 ಸದಸ್ಯರು, BPL ಪಡಿತರ ಚೀಟಿ, ಆದಾಯ 1.8 ಲಕ್ಷ",
    en: "Household — 5 members, BPL ration card, income 1.8 lakh",
  },
];

interface MatchCounts {
  likely: number;
  needsInfo: number;
  notMatched: number;
}

interface HomeState {
  loaded: boolean;
  hasProfile: boolean;
  matchCounts: MatchCounts | null;
  savedCount: number;
  inProgressCount: number;
}

const EMPTY_STATE: HomeState = {
  loaded: false,
  hasProfile: false,
  matchCounts: null,
  savedCount: 0,
  inProgressCount: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A profile counts as saved only when it is an object with at least one non-null value.
function hasSavedProfile(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const record = value;
  return Object.keys(record).some(
    (key) => record[key] !== null && record[key] !== undefined,
  );
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

// Returns null when no match results have been stored in this session.
function readMatchCounts(): MatchCounts | null {
  const raw = readJson<unknown>(MATCHES_KEY, null, "session");
  if (!isRecord(raw)) {
    return null;
  }
  const hasAnyList =
    Array.isArray(raw.likely_eligible) ||
    Array.isArray(raw.potential_match) ||
    Array.isArray(raw.not_matched);
  if (!hasAnyList) {
    return null;
  }
  return {
    likely: countArray(raw.likely_eligible),
    needsInfo: countArray(raw.potential_match),
    notMatched: countArray(raw.not_matched),
  };
}

function readSavedIds(): string[] {
  const raw = readJson<unknown>(SAVED_KEY, []);
  if (!Array.isArray(raw)) {
    return [];
  }
  const ids = raw.filter((id): id is string => typeof id === "string");
  return Array.from(new Set(ids));
}

function readTrackerStatuses(): Record<string, string> {
  const raw = readJson<unknown>(TRACKER_KEY, {});
  if (!isRecord(raw)) {
    return {};
  }
  const statuses: Record<string, string> = {};
  for (const [id, status] of Object.entries(raw)) {
    if (typeof status === "string") {
      statuses[id] = status;
    }
  }
  return statuses;
}

function readHomeState(): HomeState {
  const profileRaw = readJson<unknown>(PROFILE_KEY, null);
  const savedIds = readSavedIds();
  const statuses = readTrackerStatuses();
  const inProgressCount = savedIds.filter((id) => {
    const status: string | undefined = statuses[id];
    return status !== undefined && status !== "" && status !== "Not started";
  }).length;
  return {
    loaded: true,
    hasProfile: hasSavedProfile(profileRaw),
    matchCounts: readMatchCounts(),
    savedCount: savedIds.length,
    inProgressCount,
  };
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card p-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

interface ResumeLinkProps {
  href: string;
  title: string;
  description: string;
  note: string | null;
}

function ResumeLink({ href, title, description, note }: ResumeLinkProps) {
  return (
    <Link
      href={href}
      className="glass-card flex min-h-11 flex-col p-4"
    >
      <span className="font-semibold text-slate-900">
        {title}
      </span>
      <span className="mt-1 text-sm text-slate-600">
        {description}
      </span>
      {note !== null ? (
        <span className="mt-2 text-xs text-amber-800">
          {note}
        </span>
      ) : null}
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [state, setState] = useState<HomeState>(EMPTY_STATE);
  const [situation, setSituation] = useState("");
  const sensitive = containsSensitive(situation);

  useEffect(() => {
    // Hydration-safe load: readHomeState touches localStorage, so it must run after mount, not during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readHomeState());
  }, []);

  // Merge only the fields found in the text into the saved profile.
  function mergeSituation(text: string) {
    const parsed = parseSituation(text);
    const existing = readJson<StudentProfile>(PROFILE_KEY, {});
    writeJson<StudentProfile>(PROFILE_KEY, { ...existing, ...parsed });
  }

  // Merge the parsed fields into the saved profile, then open the editable profile form.
  function handleQuickStart() {
    mergeSituation(situation);
    router.push("/profile");
  }

  // Tapping a sample fills the text box and merges the fields it contains.
  function handleSample(text: string) {
    setSituation(text);
    mergeSituation(text);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 text-[#142235] sm:py-16">
      <section aria-labelledby="hero-heading" className="px-2 py-12 sm:px-6 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#B96C50]">
          SAARTHI
        </p>
        <h1
          id="hero-heading"
          className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-[#142235] sm:text-5xl"
        >
          {t("home.heroHeading")}
        </h1>
        <div className="mt-8 max-w-2xl space-y-4">
          <label
            htmlFor="hero-situation"
            className="block text-sm font-medium text-[#142235]"
          >
            {t("home.describeLabel")}
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="hero-situation"
              rows={3}
              maxLength={500}
              placeholder="e.g. I am a farmer in need of crop loan help"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="w-full rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-base text-[#142235] shadow-[inset_0_1px_2px_rgba(20,34,53,0.05)] placeholder:text-[#142235]/50 focus:outline-none focus:ring-2 focus:ring-[#2f7bf5]"
            />
            <VoiceInput
              onTranscript={(text: string) => setSituation(text)}
              disabled={false}
            />
          </div>
          <Link
            href="/schemes"
            className="pill-primary inline-flex min-h-11 items-center justify-center px-6 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#2f7bf5] focus:ring-offset-2"
          >
            {t("home.explore")}
          </Link>
        </div>
      </section>

      <section aria-labelledby="categories-heading" className="px-2 pb-8 sm:px-6">
        <h2
          id="categories-heading"
          className="text-xl font-semibold text-[#142235]"
        >
          {t("home.browseCategory")}
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category.name}
              href="/schemes"
              className="glass-card flex flex-col p-5 focus:outline-none focus:ring-2 focus:ring-[#2f7bf5]"
            >
              <h3 className="font-semibold text-[#142235]">{t(category.name)}</h3>
              <p className="mt-2 text-sm text-[#142235]/70">{t(category.line)}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4 text-sm text-slate-800 backdrop-blur-md">
        <p className="font-semibold">
          Results are not a guarantee of approval. Always check the official
          notice.
        </p>
        <p className="mt-2">
          The scheme catalogue currently holds demonstration data only. Do not
          treat any scheme shown here as a real, open opportunity.
        </p>
      </div>

      <section
        aria-labelledby="quick-start-heading"
        className="mt-8 glass-card p-4"
      >
        <h2
          id="quick-start-heading"
          className="text-xl font-semibold text-slate-900"
        >
          {t("home.quickStart")}
        </h2>
        <div className="mt-3 space-y-3">
          <label
            htmlFor="quick-start-situation"
            className="block text-sm font-medium text-slate-800"
          >
            {t("home.quickLabel")}
          </label>
          <textarea
            id="quick-start-situation"
            rows={3}
            maxLength={500}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-base text-slate-900 shadow-[inset_0_1px_2px_rgba(20,34,53,0.05)] focus:outline-none focus:ring-2 focus:ring-[#2f7bf5]"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {QUICK_SAMPLES.map((sample) => {
              const text = lang === "kn" ? sample.kn : sample.en;
              return (
                <button
                  key={sample.en}
                  type="button"
                  onClick={() => handleSample(text)}
                  className="pill-chip min-h-11 px-4 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#2f7bf5] focus:ring-offset-2"
                >
                  {text}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {SAMPLE_SITUATIONS.map((sample) => (
              <button
                key={sample.en}
                type="button"
                onClick={() => setSituation(sample.en)}
                className="pill-chip min-h-11 px-4 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#2f7bf5] focus:ring-offset-2"
              >
                {sample.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Sample situations are illustrative; check official portal / ಮಾದರಿ ಸನ್ನಿವೇಶಗಳು ಉದಾಹರಣೆಗಾಗಿ ಮಾತ್ರ; ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ
          </p>
          {sensitive && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {t("home.sensitive")}
            </p>
          )}
          <button
            type="button"
            onClick={handleQuickStart}
            disabled={sensitive || situation.trim() === ""}
            className="pill-primary inline-flex min-h-11 items-center justify-center px-5 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("home.startFromSituation")}
          </button>
        </div>
      </section>

      {!state.loaded ? (
        <div
          aria-hidden="true"
          className="mt-8 h-40 animate-pulse rounded-2xl bg-white/50"
        />
      ) : state.hasProfile ? (
        <>
          <section aria-labelledby="overview-heading" className="mt-8">
            <h2
              id="overview-heading"
              className="text-xl font-semibold text-slate-900"
            >
              {t("home.overview")}
            </h2>
            {state.matchCounts === null ? (
              <p className="mt-3 text-sm text-slate-600">
                Run a match from your profile to see counts.
              </p>
            ) : (
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label={t("likely_eligible")} value={state.matchCounts.likely} />
                <StatCard
                  label={t("potential_match")}
                  value={state.matchCounts.needsInfo}
                />
                <StatCard label={t("not_matched")} value={state.matchCounts.notMatched} />
              </dl>
            )}
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard label={t("stat.saved")} value={state.savedCount} />
              <StatCard
                label={t("stat.inProgress")}
                value={state.inProgressCount}
              />
            </dl>
          </section>

          <section aria-labelledby="resume-heading" className="mt-8">
            <h2
              id="resume-heading"
              className="text-xl font-semibold text-slate-900"
            >
              {t("home.resume")}
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ResumeLink
                href="/profile"
                title="Profile"
                description="Update your details"
                note={null}
              />
              <ResumeLink
                href="/results"
                title="Results"
                description="See your matches"
                note={state.matchCounts === null ? "Run a match first" : null}
              />
              <ResumeLink
                href="/schemes"
                title="Discovery"
                description="Browse and filter schemes"
                note={null}
              />
              <ResumeLink
                href="/tracker"
                title="Tracker"
                description="Track applications and documents"
                note={null}
              />
            </div>
          </section>
        </>
      ) : (
        <div className="mt-8 glass-card p-4">
          <p className="text-slate-700">
            Tell us a little about your studies to start seeing your options.
          </p>
          <Link
            href="/profile"
            className="pill-primary mt-4 inline-flex min-h-11 items-center justify-center px-5 py-2 font-medium"
          >
            Start your profile
          </Link>
        </div>
      )}

      <div className="mt-8 glass-card p-4 text-sm text-slate-700">
        <p>
          Official portals: scholarships.gov.in (National Scholarship Portal) and
          ssp.karnataka.gov.in (Karnataka State Scholarship Portal). Amounts,
          deadlines and guideline PDFs show as &apos;Check official portal&apos;
          unless verified.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/profile"
          className="pill-primary inline-flex min-h-11 items-center justify-center px-5 py-2 font-medium"
        >
          {t("home.checkOptions")}
        </Link>
        <Link
          href="/schemes"
          className="pill-chip inline-flex min-h-11 items-center justify-center px-5 py-2 font-medium"
        >
          Browse schemes
        </Link>
      </div>
    </main>
  );
}
