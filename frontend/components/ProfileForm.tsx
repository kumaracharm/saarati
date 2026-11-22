"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { extractProfile, matchProfile } from "../lib/api";
import { containsSensitive, parseSituation } from "../lib/intake";
import {
  CATEGORY_LABELS,
  EDUCATION_LABELS,
  GENDER_LABELS,
  INCOME_LABELS,
  INSTITUTION_LABELS,
  STATE_OPTIONS,
} from "../lib/labels";
import { FALLBACK_NOTE } from "../lib/fallbackSchemes";
import { matchLocally } from "../lib/localMatcher";
import { getMeta, getProfile, saveProfile } from "../lib/offline/store";
import { MATCHES_KEY, PROFILE_KEY, SAVED_KEY, readJson, writeJson } from "../lib/storage";
import type {
  CertifiedCategory,
  CitizenProfile,
  EducationLevel,
  Gender,
  IncomeRange,
  IndianState,
  InstitutionType,
  MatchResponse,
} from "../lib/types";
import { useLanguage } from "./LanguageProvider";
import { MatchCard } from "./MatchCard";

// Form state holds raw strings so inputs stay controlled while the user types.
interface FormState {
  state: string;
  education_level: string;
  course: string;
  institution_type: string;
  academic_percentage: string;
  family_income_range: string;
  officially_certified_category: string;
  gender: string;
  disability_status: boolean;
  district: string;
  rural_urban: string;
  household_size: string;
  age_range: string;
  income_band: string;
  employment_status: string;
  social_category: string;
  benefit_interests: string;
}

const EMPTY_FORM: FormState = {
  state: "",
  education_level: "",
  course: "",
  institution_type: "",
  academic_percentage: "",
  family_income_range: "",
  officially_certified_category: "",
  gender: "",
  disability_status: false,
  district: "",
  rural_urban: "",
  household_size: "",
  age_range: "",
  income_band: "",
  employment_status: "",
  social_category: "",
  benefit_interests: "",
};

// Translation keys for the visible step labels (see lib/i18n.ts).
const STEPS = ["profile.step1", "profile.step2", "profile.step3"];

// Longest the form waits for the backend before matching on the device.
// The backend /api/match takes about 2.1 s, so the cutoff must exceed that for the server result to be used.
const MATCH_TIMEOUT_MS = 3000;

// Session flag telling the results page whether the matches came from the API or the local rules.
const MATCH_SOURCE_KEY = "entitleiq.matchSource";

// Result sections shown on Step 3, with the same labels and empty messages as the /results page.
const RESULT_SECTIONS: {
  key: "likely_eligible" | "potential_match" | "not_matched";
  label: string;
  empty: string;
}[] = [
  { key: "likely_eligible", label: "status.likelyEligible", empty: "results.emptyLikely" },
  { key: "potential_match", label: "status.needsInfo", empty: "results.emptyNeeds" },
  { key: "not_matched", label: "status.notMatched", empty: "results.emptyNot" },
];

// Sample descriptions the user can tap. Kannada text: review by a Kannada speaker before release.
const SAMPLE_SITUATIONS: { en: string; kn: string }[] = [
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

const CONTROL_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const PRIMARY_BUTTON =
  "min-h-11 rounded-xl bg-[#7f1d1d] px-5 py-2 font-medium text-white hover:bg-[#881337] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60:bg-indigo-400";

const SECONDARY_BUTTON =
  "min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2 font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60:bg-slate-800";

const SAMPLE_BUTTON =
  "min-h-11 rounded-full border border-indigo-300 bg-rose-50 px-4 py-2 text-left text-sm text-[#7f1d1d] hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60:bg-indigo-900";

// Convert a backend profile into form strings, keeping only the filled fields.
function toForm(profile: CitizenProfile): Partial<FormState> {
  const out: Partial<FormState> = {};
  if (profile.state) out.state = profile.state;
  if (profile.education_level) out.education_level = profile.education_level;
  if (profile.course) out.course = profile.course.slice(0, 100);
  if (profile.institution_type) out.institution_type = profile.institution_type;
  if (profile.academic_percentage != null) {
    out.academic_percentage = String(profile.academic_percentage);
  }
  if (profile.family_income_range) {
    out.family_income_range = profile.family_income_range;
  }
  if (profile.officially_certified_category) {
    out.officially_certified_category = profile.officially_certified_category;
  }
  if (profile.gender) out.gender = profile.gender;
  if (typeof profile.disability_status === "boolean") {
    out.disability_status = profile.disability_status;
  }
  if (profile.district) out.district = profile.district;
  if (profile.rural_urban) out.rural_urban = profile.rural_urban;
  if (profile.household_size != null) {
    out.household_size = String(profile.household_size);
  }
  if (profile.age_range) out.age_range = profile.age_range;
  if (profile.income_band) out.income_band = profile.income_band;
  if (profile.employment_status) out.employment_status = profile.employment_status;
  if (profile.social_category) out.social_category = profile.social_category;
  if (profile.benefit_interests?.length) {
    out.benefit_interests = profile.benefit_interests.join(", ");
  }
  return out;
}

// Optional text: blank or whitespace-only becomes undefined so the key is omitted on save.
function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// Optional whole number of at least 1: blank or invalid becomes undefined.
function householdSizeValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
}

// Comma-separated list to a trimmed, non-empty array; nothing entered becomes undefined.
function benefitInterestsValue(value: string): string[] | undefined {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  return items.length > 0 ? items : undefined;
}

// Build the request body: blanks become null, and the disability flag is only sent when ticked.
// Optional geography/demographic fields are undefined (omitted) when left blank.
function buildProfile(form: FormState): CitizenProfile {
  const course = form.course.trim();
  const percentage = form.academic_percentage.trim();
  return {
    state: form.state ? (form.state as IndianState) : null,
    education_level: form.education_level
      ? (form.education_level as EducationLevel)
      : null,
    course: course === "" ? null : course,
    institution_type: form.institution_type
      ? (form.institution_type as InstitutionType)
      : null,
    academic_percentage: percentage === "" ? null : Number(percentage),
    family_income_range: form.family_income_range
      ? (form.family_income_range as IncomeRange)
      : null,
    officially_certified_category: form.officially_certified_category
      ? (form.officially_certified_category as CertifiedCategory)
      : null,
    gender: form.gender ? (form.gender as Gender) : null,
    disability_status: form.disability_status ? true : null,
    district: optionalText(form.district),
    rural_urban: optionalText(form.rural_urban),
    household_size: householdSizeValue(form.household_size),
    age_range: optionalText(form.age_range),
    income_band: optionalText(form.income_band),
    employment_status: optionalText(form.employment_status),
    social_category: optionalText(form.social_category),
    benefit_interests: benefitInterestsValue(form.benefit_interests),
  };
}

function percentageError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return "Enter a number from 0 to 100, or leave this blank.";
  }
  return null;
}

// Rejects if the promise has not settled within ms. The timer is always cleared once the race ends.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Matching timed out.")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

// Mirrors the profile to IndexedDB. saveProfile writes and queues the sync edit in one transaction.
async function persistProfile(profile: CitizenProfile): Promise<void> {
  const catalogueVersion = (await getMeta("catalogueVersion")) ?? "";
  await saveProfile({ ...profile }, catalogueVersion);
}

export default function ProfileForm() {
  const { lang, t } = useLanguage();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // Set when "See my matches" finishes; while set, the Step 3 inputs are replaced by the results.
  const [matchResults, setMatchResults] = useState<MatchResponse | null>(null);
  const [usedLocal, setUsedLocal] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractInfo, setExtractInfo] = useState<{
    isMock: boolean;
    notes: string[];
  } | null>(null);
  const [situationNote, setSituationNote] = useState<string | null>(null);
  // False until any IndexedDB hydration has finished, so the empty form never overwrites a stored profile.
  const idbReady = useRef(false);

  // Restore any saved answers after mount (localStorage is unavailable on the server).
  useEffect(() => {
    let cancelled = false;
    const saved = readJson<CitizenProfile>(PROFILE_KEY, {});
    // Apply the restore in a microtask so no state is set synchronously inside the effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      setForm({ ...EMPTY_FORM, ...toForm(saved) });
      setLoaded(true);
    });
    if (Object.keys(saved).length === 0) {
      // localStorage is empty: hydrate from IndexedDB. Failures keep the empty form.
      getProfile()
        .then((record) => {
          if (!cancelled && record?.attributes) {
            setForm((current) => ({
              ...current,
              ...toForm(record.attributes as CitizenProfile),
            }));
          }
        })
        .catch((err) => console.warn("[offline] could not load profile", err))
        .finally(() => {
          idbReady.current = true;
        });
    } else {
      idbReady.current = true;
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the saved profile in step with the form once it has been restored.
  useEffect(() => {
    if (!loaded) return;
    const profile = buildProfile(form);
    writeJson(PROFILE_KEY, profile);
    if (!idbReady.current) return;
    persistProfile(profile).catch((err) =>
      console.warn("[offline] profile not saved to IndexedDB", err),
    );
  }, [form, loaded]);

  const pctError = percentageError(form.academic_percentage);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    if (step === 1 && pctError) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  // From the result view, Back returns to the Step 3 inputs.
  function goBack() {
    if (matchResults !== null) {
      setMatchResults(null);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  // Same behaviour as the /results page: toggles a scheme in the saved list.
  function toggleSave(schemeId: string) {
    const next = savedIds.includes(schemeId)
      ? savedIds.filter((id) => id !== schemeId)
      : [...savedIds, schemeId];
    setSavedIds(next);
    writeJson(SAVED_KEY, next);
  }

  // Merge only the fields found in the description; the user can edit every field afterwards.
  function applyDescription(text: string) {
    const parsed = parseSituation(text);
    const found = Object.keys(parsed).length;
    setForm((current) => ({ ...current, ...toForm(parsed) }));
    setSituationNote(
      found === 0
        ? // Kannada text: review by a Kannada speaker before release.
          lang === "kn"
          ? "ಈ ಪಠ್ಯದಲ್ಲಿ ಯಾವುದೇ ವಿವರ ಸಿಗಲಿಲ್ಲ. ನಿಮ್ಮ ರಾಜ್ಯ, ಕೋರ್ಸ್ ಮಟ್ಟ ಅಥವಾ ಶೇಕಡಾವಾರನ್ನು ಸೇರಿಸಿ."
          : "We could not find any details in that text. Try adding your state, course level or percentage."
        : // Kannada text: review by a Kannada speaker before release.
          lang === "kn"
          ? `ನಿಮ್ಮ ವಿವರಣೆಯಿಂದ ${found} ಕ್ಷೇತ್ರ${found === 1 ? "" : "ಗಳನ್ನು"} ಭರ್ತಿ ಮಾಡಲಾಗಿದೆ. ಪ್ರತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.`
          : `We filled ${found} field${found === 1 ? "" : "s"} from your description. Check each one.`,
    );
  }

  // Fills the fields from the description and keeps the user on Step 1 to review them.
  function handleUseDescription() {
    applyDescription(description);
    setMatchResults(null);
    setStep(0);
  }

  // Tapping a sample fills the description box and merges the fields it contains.
  function handleSample(text: string) {
    setDescription(text);
    applyDescription(text);
  }

  async function handleExtract() {
    setExtractError(null);
    setExtracting(true);
    try {
      const result = await extractProfile(description);
      setForm((current) => ({ ...current, ...toForm(result.profile) }));
      setExtractInfo({ isMock: result.is_mock, notes: result.notes });
    } catch (err) {
      setExtractInfo(null);
      setExtractError(
        err instanceof Error ? err.message : "Something unexpected went wrong. Please try again.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter key on an earlier step should move forward, not submit early.
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    if (percentageError(form.academic_percentage)) {
      setStep(1);
      return;
    }

    setSubmitting(true);
    const profile = buildProfile(form);
    let response: MatchResponse;
    let source: "api" | "local";
    try {
      response = await withTimeout(matchProfile(profile), MATCH_TIMEOUT_MS);
      source = "api";
    } catch {
      // Server error, timeout or network failure: match on the device so the user is never stuck.
      response = matchLocally(profile);
      source = "local";
    }
    writeJson(MATCHES_KEY, response, "session");
    writeJson(MATCH_SOURCE_KEY, source, "session");
    writeJson(PROFILE_KEY, profile);
    // Show the matches on this screen instead of navigating to /results.
    setSavedIds(readJson<string[]>(SAVED_KEY, []));
    setUsedLocal(source === "local");
    setMatchResults(response);
    setSubmitting(false);
  }

  const busy = submitting || extracting;
  const sensitive = containsSensitive(description);

  return (
    <div className="space-y-6">
      {/* Step transition and processing animations. Scoped here because globals.css is owned elsewhere. */}
      <style>{`
        @keyframes pf-step-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes pf-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pf-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .pf-step-enter { animation: pf-step-in 240ms ease-out both; }
        .pf-bob { animation: pf-bob 1.6s ease-in-out infinite; }
        .pf-dot { animation: pf-dot 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pf-step-enter, .pf-bob, .pf-dot { animation: none; }
        }
      `}</style>
      <section
        aria-labelledby="intake-heading"
        className="space-y-4 rounded-xl border border-indigo-200 bg-white p-4"
      >
        {/* Kannada text: review by a Kannada speaker before release. */}
        <h2
          id="intake-heading"
          className="text-xl font-semibold text-slate-900"
        >
          {lang === "kn" ? "ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿಯನ್ನು ವಿವರಿಸಿ" : "Describe your situation"}
        </h2>
        <p className="text-sm text-slate-700">
          {/* Kannada text: review by a Kannada speaker before release. */}
          {lang === "kn"
            ? "ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ, ಇಲ್ಲವೇ ಮಾದರಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಇದು ಕೆಳಗಿನ ಕ್ಷೇತ್ರಗಳನ್ನು ಭರ್ತಿ ಮಾಡುತ್ತದೆ, ಪ್ರತಿ ಉತ್ತರವನ್ನೂ ನೀವು ತಿದ್ದಬಹುದು."
            : "Type a short description, or tap a sample. It fills the fields below, and you can edit every answer."}
        </p>
        <p className="text-sm font-medium text-slate-800">
          {/* Kannada text: review by a Kannada speaker before release. */}
          {lang === "kn"
            ? "ಆಧಾರ್ ಸಂಖ್ಯೆ, OTP, ಪಾಸ್‌ವರ್ಡ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ವಿವರಗಳನ್ನು ಟೈಪ್ ಮಾಡಬೇಡಿ."
            : "Do not type Aadhaar numbers, OTPs, passwords or bank details."}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {SAMPLE_SITUATIONS.map((sample) => {
            const text = lang === "kn" ? sample.kn : sample.en;
            return (
              <button
                key={sample.en}
                type="button"
                onClick={() => handleSample(text)}
                disabled={busy}
                className={SAMPLE_BUTTON}
              >
                {text}
              </button>
            );
          })}
        </div>

        <label
          htmlFor="pf-description"
          className="block text-sm font-medium text-slate-800"
        >
          Your description
        </label>
        <textarea
          id="pf-description"
          rows={5}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={CONTROL_CLASS}
        />
        <p className="text-xs text-slate-500">
          {description.length}/2000 characters
        </p>
        {sensitive && (
          <p role="alert" className="text-sm font-medium text-red-700">
            Do not type Aadhaar numbers, OTPs, passwords or bank details. Remove them.
          </p>
        )}
        <button
          type="button"
          onClick={handleUseDescription}
          disabled={busy || sensitive || description.trim() === ""}
          className={SECONDARY_BUTTON}
        >
          Use this description
        </button>
        {situationNote && (
          <p role="status" className="text-sm text-slate-700">
            {situationNote}
          </p>
        )}
      </section>

      <details
        open={descriptionOpen}
        onToggle={(e) => setDescriptionOpen(e.currentTarget.open)}
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <summary className="cursor-pointer min-h-11 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          Fill from a description (optional)
        </summary>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            The reader suggests answers from the description above. Every
            suggestion is shown for review, and you can change any of them.
          </p>
          <button
            type="button"
            onClick={handleExtract}
            disabled={busy || description.trim() === ""}
            className={SECONDARY_BUTTON}
          >
            {extracting ? "Reading description…" : "Read description"}
          </button>

          <div aria-live="polite">
            {extractError && (
              <p className="text-sm text-red-700">
                {extractError}
              </p>
            )}
            {extractInfo && (
              <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-slate-800">
                {extractInfo.isMock && (
                  <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                    Demonstration extraction — review every field
                  </span>
                )}
                {extractInfo.notes.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5">
                    {extractInfo.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </details>

      <nav aria-label="Form steps">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((label, index) => {
            const current = index === step;
            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className={`rounded-lg border px-2 py-2 text-center text-xs sm:text-sm ${
                  current
                    ? "border-[#7f1d1d] bg-rose-50 font-semibold text-[#7f1d1d]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {t(label)}
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="text-sm font-medium text-slate-700">
        Step {step + 1} of {STEPS.length}
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5"
      >
        <img
          src="/illustrations/hero-bg.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-0 h-full w-full object-contain object-center opacity-20"
        />
        <div className="relative space-y-6">
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            Every field is optional. A blank answer shows as &quot;needs more
            information&quot; in your results, not as a failure.
          </p>
          <p className="mt-2 font-medium">
            Please do not enter Aadhaar numbers, passwords, OTPs or bank
            account details.
          </p>
        </div>

        {step === 0 && (
          <fieldset className="pf-step-enter space-y-5">
            <legend className="text-lg font-semibold text-slate-900">
              {t(STEPS[0])}
            </legend>
            {/* Decorative illustration; empty alt keeps it out of the accessible name. */}
            <img
              src="/illustrations/woman-writing.svg"
              alt=""
              aria-hidden="true"
              width={120}
              height={100}
              className="mx-auto h-24 w-auto pf-bob"
            />

            <div>
              <label
                htmlFor="pf-state"
                className="block text-sm font-medium text-slate-800"
              >
                State
              </label>
              <select
                id="pf-state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Select your state</option>
                {STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pf-district"
                className="block text-sm font-medium text-slate-800"
              >
                District (optional)
              </label>
              <input
                id="pf-district"
                type="text"
                maxLength={100}
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="pf-education"
                className="block text-sm font-medium text-slate-800"
              >
                Education level
              </label>
              <select
                id="pf-education"
                value={form.education_level}
                onChange={(e) => update("education_level", e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Select a level</option>
                {(Object.keys(EDUCATION_LABELS) as EducationLevel[]).map((key) => (
                  <option key={key} value={key}>
                    {EDUCATION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pf-course"
                className="block text-sm font-medium text-slate-800"
              >
                Course (optional)
              </label>
              <input
                id="pf-course"
                type="text"
                maxLength={100}
                value={form.course}
                onChange={(e) => update("course", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="pf-institution"
                className="block text-sm font-medium text-slate-800"
              >
                Institution type
              </label>
              <select
                id="pf-institution"
                value={form.institution_type}
                onChange={(e) => update("institution_type", e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Select an institution type</option>
                {(Object.keys(INSTITUTION_LABELS) as InstitutionType[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {INSTITUTION_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="pf-step-enter space-y-5">
            <legend className="text-lg font-semibold text-slate-900">
              {t(STEPS[1])}
            </legend>

            <div>
              <label
                htmlFor="pf-percentage"
                className="block text-sm font-medium text-slate-800"
              >
                Overall percentage or CGPA as a percentage (optional)
              </label>
              <input
                id="pf-percentage"
                type="number"
                min={0}
                max={100}
                step={0.01}
                inputMode="decimal"
                value={form.academic_percentage}
                onChange={(e) => update("academic_percentage", e.target.value)}
                aria-invalid={pctError ? true : undefined}
                aria-describedby={pctError ? "pf-percentage-error" : undefined}
                className={CONTROL_CLASS}
              />
              {pctError && (
                <p
                  id="pf-percentage-error"
                  className="mt-1 text-sm text-red-700"
                >
                  {pctError}
                </p>
              )}
            </div>
          </fieldset>
        )}

        {step === 2 && matchResults === null && (
          <fieldset className="pf-step-enter space-y-5">
            <legend className="text-lg font-semibold text-slate-900">
              {t(STEPS[2])}
            </legend>

            <div>
              <label
                htmlFor="pf-income"
                className="block text-sm font-medium text-slate-800"
              >
                Family income
              </label>
              <select
                id="pf-income"
                value={form.family_income_range}
                onChange={(e) => update("family_income_range", e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Select a range</option>
                {(Object.keys(INCOME_LABELS) as IncomeRange[]).map((key) => (
                  <option key={key} value={key}>
                    {INCOME_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pf-category"
                className="block text-sm font-medium text-slate-800"
              >
                Category (officially certified)
              </label>
              <p
                id="pf-category-help"
                className="mt-1 text-sm text-slate-600"
              >
                Choose a category only if you hold an official certificate. We
                never infer your category from your name or community.
              </p>
              <select
                id="pf-category"
                aria-describedby="pf-category-help"
                value={form.officially_certified_category}
                onChange={(e) =>
                  update("officially_certified_category", e.target.value)
                }
                className={CONTROL_CLASS}
              >
                <option value="">Select a category</option>
                {(Object.keys(CATEGORY_LABELS) as CertifiedCategory[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="pf-gender"
                className="block text-sm font-medium text-slate-800"
              >
                Gender
              </label>
              <select
                id="pf-gender"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Select an option</option>
                {(Object.keys(GENDER_LABELS) as Gender[]).map((key) => (
                  <option key={key} value={key}>
                    {GENDER_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-h-11 items-center gap-3">
              <input
                id="pf-disability"
                type="checkbox"
                checked={form.disability_status}
                onChange={(e) => update("disability_status", e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-[#7f1d1d] focus:ring-indigo-500"
              />
              <label
                htmlFor="pf-disability"
                className="text-sm font-medium text-slate-800"
              >
                I have a disability certificate
              </label>
            </div>

            <div>
              <label
                htmlFor="pf-rural-urban"
                className="block text-sm font-medium text-slate-800"
              >
                Rural or urban (optional)
              </label>
              <select
                id="pf-rural-urban"
                value={form.rural_urban}
                onChange={(e) => update("rural_urban", e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Select an option</option>
                <option value="rural">Rural</option>
                <option value="urban">Urban</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="pf-household-size"
                className="block text-sm font-medium text-slate-800"
              >
                Household size (optional)
              </label>
              <input
                id="pf-household-size"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.household_size}
                onChange={(e) => update("household_size", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="pf-age-range"
                className="block text-sm font-medium text-slate-800"
              >
                Age range (optional)
              </label>
              <input
                id="pf-age-range"
                type="text"
                maxLength={50}
                value={form.age_range}
                onChange={(e) => update("age_range", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="pf-income-band"
                className="block text-sm font-medium text-slate-800"
              >
                Income band (optional)
              </label>
              <input
                id="pf-income-band"
                type="text"
                maxLength={100}
                value={form.income_band}
                onChange={(e) => update("income_band", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="pf-employment-status"
                className="block text-sm font-medium text-slate-800"
              >
                Employment status (optional)
              </label>
              <input
                id="pf-employment-status"
                type="text"
                maxLength={100}
                value={form.employment_status}
                onChange={(e) => update("employment_status", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="pf-social-category"
                className="block text-sm font-medium text-slate-800"
              >
                Social category (optional)
              </label>
              <input
                id="pf-social-category"
                type="text"
                maxLength={100}
                value={form.social_category}
                onChange={(e) => update("social_category", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="pf-benefit-interests"
                className="block text-sm font-medium text-slate-800"
              >
                Benefits you are interested in (optional, separate with commas)
              </label>
              <input
                id="pf-benefit-interests"
                type="text"
                maxLength={300}
                value={form.benefit_interests}
                onChange={(e) => update("benefit_interests", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>
          </fieldset>
        )}

        {step === 2 && matchResults !== null && (
          <section aria-labelledby="pf-results-heading" className="pf-step-enter space-y-5">
            <h2
              id="pf-results-heading"
              className="text-lg font-semibold text-slate-900"
            >
              {t(STEPS[2])}
            </h2>
            <p className="text-sm text-slate-700">{t("disclaimer")}</p>
            {usedLocal && (
              <p
                role="note"
                className="rounded-lg bg-amber-50 p-3 text-sm text-slate-800"
              >
                {FALLBACK_NOTE}
              </p>
            )}
            {RESULT_SECTIONS.map((section) => {
              const items = matchResults[section.key];
              return (
                <div key={section.key} className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    {t(section.label)} ({items.length})
                  </h3>
                  {items.length === 0 ? (
                    <p className="text-sm text-slate-700">
                      {t(section.empty)}
                    </p>
                  ) : (
                    items.map((match) => (
                      <MatchCard
                        key={match.scheme_id}
                        match={match}
                        saved={savedIds.includes(match.scheme_id)}
                        onToggleSave={toggleSave}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </section>
        )}

        {submitting && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 pt-2"
          >
            <img
              src="/illustrations/man-writing.svg"
              alt=""
              aria-hidden="true"
              width={140}
              height={117}
              className="h-28 w-auto pf-bob"
            />
            <div aria-hidden="true" className="flex gap-1.5">
              <span className="pf-dot h-2 w-2 rounded-full bg-[#B87333]" />
              <span className="pf-dot h-2 w-2 rounded-full bg-[#B87333] [animation-delay:150ms]" />
              <span className="pf-dot h-2 w-2 rounded-full bg-[#B87333] [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={busy || step === 0}
            className={SECONDARY_BUTTON}
          >
            Back
          </button>

          {matchResults !== null ? null : step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={busy || (step === 1 && pctError !== null)}
              className={PRIMARY_BUTTON}
            >
              Next
            </button>
          ) : (
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {submitting ? "Finding matches…" : "See my matches"}
            </button>
          )}
        </div>
        </div>
      </form>
    </div>
  );
}
