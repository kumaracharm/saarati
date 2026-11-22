"use client";

import { useEffect, useRef, useState } from "react";
import { clearDeviceData } from "@/lib/offline/store";
import { getSyncState, startSyncLifecycle, type SyncState } from "@/lib/offline/sync";

const PORTAL_NOTE = "Scheme deadlines and eligibility may change — Check official portal.";
const CONFLICT_NOTE = "Resolve conflicts before relying on these values — Check official portal.";
const CLEAR_CONFIRM = "This removes saved schemes, profile, checklist and tracker data stored on this device. Continue?";
const CLEARED_MESSAGE = "This device's saved data has been cleared.";
const CLEAR_FAILED_MESSAGE = "Could not clear this device's data. Please try again.";

export function OfflineStatus() {
  const [state, setState] = useState<SyncState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const cleanup = startSyncLifecycle((next) => {
      if (active) setState(next);
    });
    getSyncState()
      .then((next) => {
        if (active) setState(next);
      })
      .catch((err) => console.warn("[offline] could not read sync state", err));
    return () => {
      active = false;
      cleanup();
    };
  }, []);

  // Close the popover on Escape (returning focus to the pill) and on any pointer down outside it.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  async function handleConfirmClear() {
    setBusy(true);
    try {
      await clearDeviceData();
    } catch (err) {
      console.warn("[offline] clear failed", err);
      setMessage(CLEAR_FAILED_MESSAGE);
      setBusy(false);
      setConfirming(false);
      return;
    }
    setMessage(CLEARED_MESSAGE);
    try {
      setState(await getSyncState());
    } catch (err) {
      console.warn("[offline] could not refresh sync state", err);
    }
    setBusy(false);
    setConfirming(false);
  }

  const pillLabel = state === null ? "Checking…" : state.online ? "Online" : "Offline";
  const dotClass =
    state === null
      ? "bg-[var(--muted)] opacity-60"
      : state.online
        ? "bg-[var(--emerald)]"
        : "bg-[var(--warning)]";

  const lastSyncLabel =
    state !== null && state.lastSyncAt !== null
      ? `Last sync: ${new Date(state.lastSyncAt).toLocaleString()}`
      : "Never synced";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="offline-status-panel"
        onClick={() => setOpen((value) => !value)}
        className="pill-chip inline-flex items-center gap-2 px-3 py-1 text-xs font-medium"
      >
        <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
        <span>{pillLabel}</span>
      </button>

      {open && (
        <section
          id="offline-status-panel"
          aria-label="Offline status"
          className="solid-surface absolute right-0 top-full z-50 mt-2 w-72 max-w-[90vw] space-y-2 p-3 text-sm"
        >
          {state === null ? (
            <p className="opacity-70">Checking offline status…</p>
          ) : (
            <>
              <p className="font-medium">{state.online ? "Online" : "Offline"}</p>
              <p>{lastSyncLabel}</p>
              <p>Catalogue version: {state.catalogueVersion ?? "not downloaded"}</p>
              <p>Pending changes: {state.pendingCount}</p>
              <p>Conflicts: {state.conflictCount}</p>
              {state.conflictCount > 0 && <p role="alert">{CONFLICT_NOTE}</p>}

              {state.staleReasons.length > 0 && (
                <div>
                  <p className="font-medium">Stale data warnings</p>
                  <ul className="list-disc pl-5">
                    {state.staleReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-2 opacity-80">{PORTAL_NOTE}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!confirming && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setConfirming(true);
                    }}
                    disabled={busy}
                    className="rounded-md border border-[var(--accent)] px-3 py-1 text-[var(--accent)] disabled:opacity-50"
                  >
                    Clear this device&apos;s data
                  </button>
                )}
                {confirming && (
                  <div className="flex flex-col gap-2">
                    <p>{CLEAR_CONFIRM}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmClear}
                        disabled={busy}
                        className="rounded-md bg-[var(--accent)] px-3 py-1 text-white disabled:opacity-50"
                      >
                        Yes, clear data
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={busy}
                        className="rounded-md border border-[var(--accent)] px-3 py-1 text-[var(--accent)] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {message !== null && (
            <p role="status" className="mt-2">
              {message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
