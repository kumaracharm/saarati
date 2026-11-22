"use client";

import { LANGUAGES, REVIEWED, type Lang } from "../lib/i18n";
import { useLanguage } from "./LanguageProvider";

const OPTIONS: { value: Lang; label: string }[] = LANGUAGES.map((option) => ({
  value: option.code,
  label: option.nativeName,
}));

// Visible on pages in a language whose translation is not yet reviewed; the text beneath it is English.
export function LanguageFallbackNote() {
  const { lang } = useLanguage();
  if (REVIEWED[lang]) {
    return null;
  }
  return (
    <p role="note" className="rounded-md border border-amber-400 bg-amber-500/15 p-2 text-sm font-medium text-amber-900">
      English fallback — translation pending review
    </p>
  );
}

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div role="group" aria-label={t("toggle.label")} className="glass-surface flex items-center gap-1 rounded-full p-0.5">
      {OPTIONS.map((option) => {
        const selected = option.value === lang;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-pressed={selected}
            onClick={() => setLang(option.value)}
            className={`border px-2 py-0.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              selected ? "pill-selected" : "pill-segment"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
