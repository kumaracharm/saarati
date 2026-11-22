"use client";

import { useEffect, useRef, useState } from "react";

/** Tweens an integer percentage from its previous value to `value` (ease-out, requestAnimationFrame). */
export function AnimatedPercent({ value, durationMs = 700 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || durationMs <= 0 || from === value) {
      shownRef.current = value;
      setShown(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (value - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span>{shown}%</span>;
}

/** Circular score indicator: an SVG progress ring with the animated percentage in the centre. */
export function ScoreRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const filled = (circumference * clamped) / 100;

  return (
    <div className="relative inline-flex h-12 w-12 items-center justify-center">
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={4} />
        <circle
          className="score-ring score-ring-progress"
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          style={{
            strokeDasharray: `${filled} ${circumference}`,
            transition: "stroke-dasharray 700ms ease-out",
          }}
        />
      </svg>
      <div className="relative text-xs font-semibold">
        <AnimatedPercent value={clamped} />
      </div>
    </div>
  );
}
