"use client";

import { useState } from "react";
import { useLanguage } from "../../components/LanguageProvider";
import ProfileForm from "../../components/ProfileForm";
import { PROFILE_KEY, writeJson } from "../../lib/storage";
import type { CitizenProfile } from "../../lib/types";


// Illustrative situations only. Profiles use the CitizenProfile field names that ProfileForm's toForm reads,
// so the restore after remount fills the form on Step 1. Fields with no matching CitizenProfile field
// (hostel residence, BPL ration card, student status) are omitted rather than invented.
const SAMPLE_SITUATIONS: { label: string; profile: CitizenProfile }[] = [
  {
    label:
      "Education — SC, hostel resident, income 2.5 lakh / ಶಿಕ್ಷಣ — ಎಸ್ಸಿ, ಹಾಸ್ಟೆಲ್ ನಿವಾಸಿ, ಆದಾಯ 2.5 ಲಕ್ಷ",
    profile: {
      officially_certified_category: "sc",
      family_income_range: "2_5_to_5_lakh",
    },
  },
  {
    label:
      "Education — OBC, day scholar, marks 60%, income 1.2 lakh / ಶಿಕ್ಷಣ — ಒಬಿಸಿ, ಹಾಸ್ಟೆಲ್ ಇಲ್ಲ, ಅಂಕ 60%, ಆದಾಯ 1.2 ಲಕ್ಷ",
    profile: {
      officially_certified_category: "obc",
      academic_percentage: 60,
      family_income_range: "below_2_5_lakh",
    },
  },
  {
    label:
      "Household — 5 members, BPL ration card, income 1.8 lakh / ಕುಟುಂಬ — 5 ಸದಸ್ಯರು, BPL ಪಡಿತರ ಚೀಟಿ, ಆದಾಯ 1.8 ಲಕ್ಷ",
    profile: {
      household_size: 5,
      family_income_range: "below_2_5_lakh",
    },
  },
];

export default function ProfilePage() {
  const { lang } = useLanguage();
  const [sampleIndex, setSampleIndex] = useState<number | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Clicking a sample fills the stored profile and remounts the form so it reloads those values.
  function handleSample(index: number) {
    setSampleIndex(index);
    try {
      writeJson<CitizenProfile>(PROFILE_KEY, SAMPLE_SITUATIONS[index].profile);
    } catch {
      // Storage unavailable: the sample is still shown as selected.
    }
    setFormVersion((version) => version + 1);
    setSaveState("idle");
  }

  // Save always finishes: the loading flag is reset in finally, and a 4s fallback clears a stuck save.
  function handleSave() {
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      setSaveState((current) => (current === "saving" ? "error" : current));
    }, 4000);
    try {
      const profile = sampleIndex === null ? {} : SAMPLE_SITUATIONS[sampleIndex].profile;
      writeJson<CitizenProfile>(PROFILE_KEY, profile, "local");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      window.clearTimeout(timer);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        Tell us about your situation
      </h1>
      <p className="mt-2 text-slate-600">
        Answer what you can. You can skip anything and come back later.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Fields you leave blank show as &apos;needs more information&apos;, not as a failure.
      </p>
      {/* Kannada text: review by a Kannada speaker before release. */}
      <h2 className="mt-6 text-xl font-semibold text-slate-900">
        {lang === "kn" ? "ಯಾವ ವಿವರಗಳು ಮುಖ್ಯ?" : "What details matter?"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {lang === "kn"
          ? "ನೀವು ಆಸಕ್ತಿ ಹೊಂದಿರುವ ಯೋಜನೆಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುವ ವಿವರಗಳಿಗೆ ಉತ್ತರಿಸಿ."
          : "Answer the details that affect the schemes you care about."}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {SAMPLE_SITUATIONS.map((sample, index) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => handleSample(index)}
            aria-pressed={sampleIndex === index}
            className="pill-chip min-h-11 px-4 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#2f7bf5] focus:ring-offset-2"
          >
            {sample.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Sample situations are illustrative; check official portal / ಮಾದರಿ ಸನ್ನಿವೇಶಗಳು ಉದಾಹರಣೆಗಾಗಿ ಮಾತ್ರ; ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ
      </p>
      <div className="mt-6">
        <ProfileForm key={formVersion} />
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="pill-primary inline-flex min-h-11 items-center justify-center px-5 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState === "saving" ? "Saving… / ಉಳಿಸಲಾಗುತ್ತಿದೆ…" : "Save / ಉಳಿಸಿ"}
        </button>
        {saveState === "saved" ? (
          <p role="status" className="text-sm font-medium text-[#7f1d1d]">
            Saved / ಉಳಿಸಲಾಗಿದೆ
          </p>
        ) : null}
        {saveState === "error" ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            Could not save. Try again / ಉಳಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ
          </p>
        ) : null}
      </div>
    </main>
  );
}
