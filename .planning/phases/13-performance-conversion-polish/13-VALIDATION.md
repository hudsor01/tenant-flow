---
phase: 13-performance-conversion-polish
phase_number: 13
generated: 2026-05-22  # backfilled during Phase 15 milestone audit round-2 polish
nyquist_validation: true
nyquist_compliant: true
wave_0_complete: true
backfill_note: "Original Phase 13 execution shipped inline (1 production line + 1 test file) without a VALIDATION.md. The 12-test performance-policy.test.ts regression pin is the runtime guard for all 4 PERF requirements; this doc captures it retroactively."
source: derived from `13-CONTEXT.md` + `13-VERIFICATION.md` (status: passed)
shipped_pr: 742
---

# Phase 13 Validation Strategy (retroactive)

Validation contract for PERF-01 / PERF-02 / PERF-03 / PERF-04. The phase shipped a consolidated regression-pin file plus a single 1-line production fix.

## Test Framework Inventory

| Layer | Framework | Quick command |
|-------|-----------|---------------|
| Unit | Vitest 4.x + jsdom | `bunx vitest --run --project unit src/app/__tests__/performance-policy.test.ts` |
| Type | TypeScript strict | `bunx tsc --noEmit` |

## Phase Requirements → Test Map

### PERF-01: `/blog` server-rendered (no client loading state)

| Test | Type | Asserts |
|------|------|---------|
| `performance-policy.test.ts` § PERF-01 | Vitest source-scan | `src/app/blog/page.tsx` has NO `'use client'` directive AND NO `dynamic = "force-dynamic"` |

### PERF-02: Marketing pages static / ISR

| Test | Type | Asserts |
|------|------|---------|
| `performance-policy.test.ts` § PERF-02 | Vitest source-scan | `/` declares `dynamic = "force-static"`; `/pricing`, `/features`, `/compare/[competitor]`, `/about` each declare `revalidate = 3600` (the original /about gap was closed via the 1-line fix this phase shipped) |

### PERF-03: Sticky/floating CTA on long pages

| Test | Type | Asserts |
|------|------|---------|
| `performance-policy.test.ts` § PERF-03 | Vitest source-scan | `<StickyConversionCta />` mounted on `/pricing`, `/faq`, `/features` |

### PERF-04: Exit-intent / scroll-depth lead-capture (feature-flag gated)

| Test | Type | Asserts |
|------|------|---------|
| `performance-policy.test.ts` § PERF-04 | Vitest source-scan | `<LeadCaptureModal />` early-returns when `NEXT_PUBLIC_LEAD_CAPTURE_MODAL !== "on"`; mounted on `/pricing` + `/compare/[competitor]` |

## Nyquist coverage

All 4 PERF requirements have a single consolidated regression-pin (12 tests in `performance-policy.test.ts`). Drift on any one criterion fails the suite. No runtime/visual verification required beyond the unit tests.
