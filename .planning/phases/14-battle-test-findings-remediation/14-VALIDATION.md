---
phase: 14-battle-test-findings-remediation
phase_number: 14
generated: 2026-05-22  # backfilled during Phase 15 milestone audit round-2 polish
nyquist_validation: true
nyquist_compliant: true
wave_0_complete: true
backfill_note: "Phase 14 was finding-driven (D-01..D-04 + 6 battle-test followup PRs), not REQ-driven. The original execution shipped per-D regression tests but never authored a VALIDATION.md; this doc captures the validation strategy retroactively."
source: derived from `14-CONTEXT.md` + `14-VERIFICATION.md` (status: passed, retroactive)
shipped_pr: 705
shipped_followup_prs: [708, 718, 719, 720, 722, 724]
requirements: []  # finding-driven, no REQ-IDs
---

# Phase 14 Validation Strategy (retroactive)

Validation contract for the 4 D-findings (D-01..D-04) shipped by Phase 14 + the 6 battle-test followups that closed additional browser-agent observations.

## Test Framework Inventory

| Layer | Framework | Quick command |
|-------|-----------|---------------|
| Unit | Vitest 4.x + jsdom | `bunx vitest --run --project unit -- not-found-page blog/loading blog/page` |
| Type | TypeScript strict | `bunx tsc --noEmit` |

## Phase Findings → Test Map

### D-01: Public 404 wraps marketing layout

| Test | Type | Asserts |
|------|------|---------|
| `src/components/shared/not-found-page.test.tsx` | Vitest render | 6-case label-resolution coverage; `<NotFoundPage>` infers button label from href (`/` → "Back to Home", `/dashboard` → "Back to Dashboard", anything else → "Go back"); `dashboardLabel` prop override |
| `src/app/not-found.tsx` | source-scan | wraps `<NotFoundPage>` in `<PageLayout>` so signed-out visitors see marketing nav/footer |

### D-02: Drop client-side Stripe.js from /pricing (extended by Plan 15-03)

| Test | Type | Asserts |
|------|------|---------|
| `src/lib/__tests__/no-stripe-js-deps.test.ts` (Plan 15-03 drift guard) | Vitest source-scan | Neither `@stripe/stripe-js` nor `@stripe/react-stripe-js` appears in `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies` |
| `grep -rn "@stripe/(react-)?stripe-js" src/ supabase/functions/` | shell | returns zero matches |

### D-03: `/blog` Supabase fetch handles errors gracefully

| Test | Type | Asserts |
|------|------|---------|
| `src/app/blog/__tests__/page.test.tsx` | Vitest | `Promise.all` wrapped in try/catch; failure routes through `Sentry.captureException` with `tags: { surface: 'blog-index' }`; renders empty-state UI instead of 5xx |

### D-04: Route-scoped `/blog/loading.tsx` for streaming mutual exclusion

| Test | Type | Asserts |
|------|------|---------|
| `src/app/blog/loading.test.tsx` | Vitest source-scan + render | `src/app/blog/loading.tsx` exists; wraps PageLayout + breadcrumb structure matching `page.tsx`; streaming-boundary mutual exclusion is a Next.js framework guarantee verified via manual smoke (per Plan 14-04 design decision: framework guarantees aren't faked into unit tests) |

### Battle-test followups (PRs #708, #718, #719, #720, #722, #724)

| PR | Finding | Regression coverage |
|----|---------|---------------------|
| #708 | gitignore `BATTLE-TEST-BROWSER-AGENT.txt` | `.gitignore` entry |
| #718 | Browser-agent Session 4 P0/P2/P3 | Per-finding spec tests in `tests/e2e/tests/public/` |
| #719 | Battle-test Session 5 P3 followups (navbar/billing/sitemap) | Per-finding spec tests |
| #720 | Session 6 P1+P2+P3 + investigation | navbar cold-start hang regression spec |
| #722 | Session 8 four findings (proxy gates + a11y + chart) | per-finding regression tests |
| #724 | Sessions 10/11 42-finding consolidated sweep | per-finding regression tests in the appropriate sub-suite |

## Nyquist coverage

All 4 D-findings shipped a regression-pin test (unit + source-scan). The 6 battle-test followup PRs each shipped per-finding regression coverage. No D-finding ships without a runtime guard.
