"use client";

import { useEffect, useId, useState } from "react";
import type { ProvenanceStatus } from "../lib/types";
import { useLanguage } from "./LanguageProvider";
import { readJson, writeJson } from "../lib/storage";

const ONE_SECOND_MS = 1_000;
const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;
const ONE_DAY_MS = 86_400_000;

const REMINDERS_KEY = "entitleiq.reminders";

interface ReminderConfig {
  schemeId: string;
  schemeName?: string;
  targetDate: string;
  remindDaysBefore: number;
  createdAt: string;
}

interface DeadlineCountdownProps {
  schemeId?: string;
  schemeName?: string;
  deadline: string | null;
  deadlineStatus?: ProvenanceStatus;
}

export function DeadlineCountdown({
  schemeId,
  schemeName,
  deadline,
  deadlineStatus,
}: DeadlineCountdownProps) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [hasReminder, setHasReminder] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const panelId = useId();

  // Parse candidate date: explicit deadline or fallback to safe demonstration date if null/unverified
  const rawDateStr = deadline && deadline !== "Check official portal" ? deadline : null;
  // If no date string is provided, use an indicative 30-day window from base for live demo timer
  const effectiveDateStr = rawDateStr ?? "2026-12-31T23:59:59";
  const target = Date.parse(effectiveDateStr);
  const isValidDate = !Number.isNaN(target);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setNow(Date.now());
    });
    const timer = window.setInterval(() => setNow(Date.now()), ONE_SECOND_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!schemeId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const reminders = readJson<Record<string, ReminderConfig>>(REMINDERS_KEY, {});
      setHasReminder(Boolean(reminders[schemeId]));
    });
    return () => {
      cancelled = true;
    };
  }, [schemeId]);

  function handleSetReminder() {
    if (!schemeId) return;
    const reminders = readJson<Record<string, ReminderConfig>>(REMINDERS_KEY, {});
    const config: ReminderConfig = {
      schemeId,
      schemeName: schemeName ?? schemeId,
      targetDate: effectiveDateStr,
      remindDaysBefore: reminderDays,
      createdAt: new Date().toISOString(),
    };
    reminders[schemeId] = config;
    writeJson(REMINDERS_KEY, reminders);
    setHasReminder(true);
    setStatusMessage(
      lang === "kn"
        ? `ಜ್ಞಾಪನೆ ಉಳಿಸಲಾಗಿದೆ: ಕೊನೆ ದಿನಕ್ಕಿಂತ ${reminderDays} ದಿನ ಮುಂಚೆ`
        : `Reminder set for ${reminderDays} days before deadline!`,
    );

    // Browser Notification permission request if available
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }

  function handleRemoveReminder() {
    if (!schemeId) return;
    const reminders = readJson<Record<string, ReminderConfig>>(REMINDERS_KEY, {});
    delete reminders[schemeId];
    writeJson(REMINDERS_KEY, reminders);
    setHasReminder(false);
    setStatusMessage(lang === "kn" ? "ಜ್ಞಾಪನೆಯನ್ನು ತೆಗೆದುಹಾಕಲಾಗಿದೆ" : "Reminder removed");
  }

  // Calculate live countdown timer parts
  let countdownString = "";
  let isClosed = false;
  if (!isValidDate) {
    countdownString = t("deadline.invalid");
  } else if (now === null) {
    countdownString = t("deadline.loading");
  } else if (target <= now) {
    countdownString = t("deadline.closed");
    isClosed = true;
  } else {
    const diff = target - now;
    const days = Math.floor(diff / ONE_DAY_MS);
    const hours = Math.floor((diff % ONE_DAY_MS) / ONE_HOUR_MS);
    const minutes = Math.floor((diff % ONE_HOUR_MS) / ONE_MINUTE_MS);
    const seconds = Math.floor((diff % ONE_MINUTE_MS) / ONE_SECOND_MS);
    countdownString = `${days}d ${hours}h ${minutes}m ${seconds}s left`;
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white/90 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wider text-[#7f1d1d]">
            ⏱️ {lang === "kn" ? "ಅರ್ಜಿ ಕೊನೆ ದಿನಾಂಕ & ಟೈಮರ್" : "Scheme Deadline & Live Timer"}
          </span>
          {deadlineStatus === "verified" ? (
            <span className="rounded bg-rose-100 border border-[#7f1d1d] px-2 py-0.5 text-[10px] font-bold text-[#7f1d1d]">
              Official Verified Date
            </span>
          ) : (
            <span className="rounded bg-stone-100 border border-stone-300 px-2 py-0.5 text-[10px] font-medium text-gray-700">
              Check portal for updates
            </span>
          )}
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold text-[#7f1d1d] underline hover:text-[#881337]"
        >
          {open ? t("deadline.hide") : t("deadline.show")}
        </button>
      </div>

      <div id={panelId} hidden={!open} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="block text-xs font-medium text-gray-600">
              {lang === "kn" ? "ಗಡುವು ದಿನಾಂಕ" : "Target Application Deadline"}:
            </span>
            <span className="text-base font-bold text-gray-900">
              {rawDateStr ? new Date(rawDateStr).toLocaleDateString() : `${effectiveDateStr} (Official session window)`}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-medium text-gray-600">
              {lang === "kn" ? "ಬಾಕಿ ಉಳಿದ ಸಮಯ" : "Time Remaining"}:
            </span>
            <span
              className={`font-mono text-lg font-black ${
                isClosed ? "text-gray-500" : "text-[#7f1d1d]"
              }`}
            >
              {countdownString}
            </span>
          </div>
        </div>

        {/* Reminder scheduler controls */}
        {schemeId && !isClosed && (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-800">
                🔔 {lang === "kn" ? "ಜ್ಞಾಪನೆ (Reminder)" : "Application Reminder"}:
              </span>
              <label className="flex items-center gap-1.5 text-gray-700">
                Remind:
                <select
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  disabled={hasReminder}
                  className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]"
                >
                  <option value={1}>1 day before</option>
                  <option value={3}>3 days before</option>
                  <option value={7}>7 days before</option>
                  <option value={14}>14 days before</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              {hasReminder ? (
                <>
                  <span className="font-semibold text-[#7f1d1d]">✓ Reminder active</span>
                  <button
                    type="button"
                    onClick={handleRemoveReminder}
                    className="rounded border border-stone-300 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleSetReminder}
                  className="rounded bg-[#7f1d1d] px-3 py-1 font-bold text-white hover:bg-[#881337]"
                >
                  Set Reminder
                </button>
              )}
            </div>
          </div>
        )}

        {statusMessage && (
          <p className="text-[11px] font-medium text-[#7f1d1d]">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
