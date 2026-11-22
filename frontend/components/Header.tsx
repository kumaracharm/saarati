"use client";

import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

import { OfflineStatus } from "./OfflineStatus";
import { REVIEWED } from "../lib/i18n";

const NAV_LINKS = [
  { href: "/profile", labelKey: "nav.check" },
  { href: "/schemes", labelKey: "nav.schemes" },
  { href: "/tracker", labelKey: "nav.saved" },
];

export default function Header() {
  const { t, lang } = useLanguage();
  return (
    <header className="glass-nav glass-surface border-b border-[var(--border)] shadow-[0_1px_12px_rgba(20,34,53,0.06)]">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="#142235"
            strokeWidth="1.5"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
            <circle cx="12" cy="12" r="2.5" stroke="#B96C50" strokeWidth="2" />
          </svg>
          SAARTHI
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1 text-sm text-[var(--muted)] hover:bg-white/60 hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <OfflineStatus />
          <LanguageToggle />
          {REVIEWED[lang] ? null : (
            <span className="text-xs text-[var(--muted)]">{t("translation.pending")}</span>
          )}
        </nav>
      </div>
    </header>
  );
}
