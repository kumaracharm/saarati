# EntitleIQ — PRD (ACE Builders Hackathon 2026 · PS5: Claim What's Yours)

## Product Summary
EntitleIQ helps low-income students and their households in Karnataka discover Central and Karnataka public benefits (scholarships, hostel/maintenance stipends, fee reimbursement, health cover) using plain-language/voice intake, deterministic eligibility matching, bilingual (EN/KN) clause explanations, document checklists, deadline tracking, and printable summary sheets.

## Core Guardrails
- Deterministic matching (`PASS`, `FAIL`, `UNKNOWN`, `NOT_APPLICABLE` -> `likely_eligible`, `potential_match`, `not_matched`). Missing data is `UNKNOWN`, never `FAIL`.
- Always show `"Likely Eligible"` (never `"Guaranteed"`).
- Never collect Aadhaar numbers, OTPs, passwords, or bank account numbers.
- Never invent unverified amounts, dates, or PDFs; mark unverified fields as `"Check official portal"`.
- Keep existing working modules intact; avoid unnecessary rewrites or extra agents.

## Current State
- Backend (FastAPI + pytest): 36 tests passing; leave `backend/` untouched unless explicitly requested.
- Frontend (Next.js App Router + TypeScript + Tailwind): `npm run build` passing (`0` errors). Includes `fallbackSchemes.ts`, `localMatcher.ts`, `ProfileForm.tsx`, `SchemeInspector.tsx`, `/profile`, `/results`, `/schemes`, `/schemes/[id]`, and `/tracker`.
- Remaining focus: browser verification, polish of remaining EN/KN labels, and demo readiness.