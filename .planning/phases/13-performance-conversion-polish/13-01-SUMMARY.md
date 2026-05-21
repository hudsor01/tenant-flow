---
phase: 13-performance-conversion-polish
plan: 01
status: complete
completed: 2026-05-21
requirements_addressed: [PERF-01, PERF-02, PERF-03, PERF-04]
key-files:
  created:
    - src/app/__tests__/performance-policy.test.ts
  modified:
    - src/app/about/page.tsx
key-decisions:
  - "PERF-01/03/04 already shipped (Phase 6 server-rendered /blog; StickyConversionCta mounted on conversion-critical pages; LeadCaptureModal gated by NEXT_PUBLIC_LEAD_CAPTURE_MODAL env flag) — verify-and-pin only."
  - "PERF-02 had one gap: /about/page.tsx lacked explicit cache config. Adding `export const revalidate = 3600` matches all sibling marketing pages and closes the requirement."
  - "Feature flag mechanism is the existing NEXT_PUBLIC_LEAD_CAPTURE_MODAL env var (default off, operators flip on via Vercel env config). No separate flag system added — this is the canonical v1.0 approach."
  - "Phase 13 executed inline rather than via the full discuss/plan/check pipeline given the tiny scope (1 production line + 1 test file, ~115 insertions)."
patterns-established:
  - "Performance policy pin: a single test file with source-text scans (readFileSync) across all marketing pages asserting their cache-config exports — analog to Phase 12's drift-guards."
---

# Plan 13-01 — Performance & Conversion Polish — COMPLETE

## What shipped

| Requirement | Status | Evidence |
|---|---|---|
| PERF-01 | shipped (Phase 6) — pinned | `/blog/page.tsx` is a server component, no `'use client'`, no `force-dynamic` |
| PERF-02 | one gap closed, all pinned | `/about/page.tsx` now exports `revalidate = 3600`; all 5 ROADMAP-named pages export static-gen or ISR |
| PERF-03 | shipped — pinned | `<StickyConversionCta />` mounted on `/pricing`, `/faq`, `/features` |
| PERF-04 | shipped — pinned | `<LeadCaptureModal />` gated by `NEXT_PUBLIC_LEAD_CAPTURE_MODAL === "on"` (default off); mounted on `/pricing`, `/compare/[competitor]` |

## Files

- **Modified:** `src/app/about/page.tsx` — added `export const revalidate = 3600` (closes the only PERF-02 gap)
- **Created:** `src/app/__tests__/performance-policy.test.ts` — 12-test consolidated PERF-01..04 regression pin

## Verification

- `bunx vitest --run --project unit src/app/__tests__/performance-policy.test.ts` → **12/12 pass**
- Full pre-commit gate (`gitleaks`, `lockfile-verify`, `lint` Biome, `typecheck`, `unit-tests` w/ coverage) passed
- Manual: confirmed every cache-config export by reading source

## Commits

- `2ede899ba`: feat(13): close PERF-02 gap + pin all 4 PERF requirements

## Notes

- This is the smallest v1.0 phase by net production change (1 line of code + a test file).
- Lighthouse TTI baseline measurement is documented as deferred (not in CI test scope; manual).
- A/B testing infrastructure for lead-capture variants is documented as deferred to v2.0+.

## Self-Check: PASSED

- `src/app/about/page.tsx` carries `export const revalidate = 3600`
- All 5 ROADMAP-named marketing pages declare static gen or ISR
- `src/app/__tests__/performance-policy.test.ts` exists with 12 passing tests
- Commit `2ede899ba` present on `gsd/phase-13-performance-polish`
