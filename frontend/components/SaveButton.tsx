"use client";

import { useEffect, useState } from "react";
import { SAVED_KEY, readJson, writeJson } from "../lib/storage";

interface SaveButtonProps {
  schemeId: string;
}

export function SaveButton({ schemeId }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ids = readJson<string[]>(SAVED_KEY, []);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saved state lives in localStorage, which can only be read after mount (SSR/hydration match).
    setSaved(ids.includes(schemeId));
  }, [schemeId]);

  function toggle() {
    const ids = readJson<string[]>(SAVED_KEY, []);
    const next = ids.includes(schemeId)
      ? ids.filter((id) => id !== schemeId)
      : [...ids, schemeId];
    writeJson(SAVED_KEY, next);
    setSaved(next.includes(schemeId));
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={toggle}
      className="rounded-md border border-slate-500 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100:bg-slate-800"
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
