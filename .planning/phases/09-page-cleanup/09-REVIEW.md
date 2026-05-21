---
phase: 09-page-cleanup
reviewed: 2026-05-20T00:00:00Z
depth: deep
files_reviewed: 3
files_reviewed_list:
  - tests/e2e/tests/smoke/critical-paths.smoke.spec.ts
  - src/components/sections/__tests__/logo-cloud.test.tsx
  - src/app/__tests__/marketing-home.test.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-20T00:00:00Z
**Depth:** deep
**Files Reviewed:** 3
**Status:** clean

## Summary

Second consecutive perfect-PR review cycle for PR #737 (Phase 9, page-cleanup).
All three files in the PR diff are test code — no production source changes. Each
file was independently re-verified at deep depth with fresh eyes, tracing every
assertion to its source target rather than trusting the prior cycle's verdict.
Cross-file analysis covered the test-to-source contracts (`logo-cloud.tsx`,
`marketing-home.tsx`, `features-client.tsx`, `blur-fade.tsx`, `page.tsx`) and the
jsdom test-setup polyfills (`src/test/unit-setup.ts`).

All reviewed files meet quality standards. No issues found.

### Verification notes

**`logo-cloud.test.tsx` (CONS-13 regression pin)** — The `.h-8.opacity-90` compound
selector uniquely matches the five logo wrappers at `logo-cloud.tsx:73`, where
`cn()` merges `h-8` and `opacity-90` onto a single element. `BlurFade` contributes
only `opacity-0`/`opacity-100` to its own wrapper (`blur-fade.tsx` presets), never
`opacity-90`/`opacity-80`, so the count of 5 and the `opacity-80` count of 0 are
both robust. The `grayscale` `not.toMatch` against `container.innerHTML` is correct
— no `grayscale` token exists anywhere in the component source. `IntersectionObserver`
and `matchMedia` are polyfilled in `src/test/unit-setup.ts`, so `BlurFade` renders
cleanly under jsdom. Direct import (not barrel), `@vitest-environment jsdom`
declared, no `any` / `as unknown as`.

**`marketing-home.test.tsx` (CONS-14 regression pin)** — `readFileSync` source-text
scan with correct relative path resolution (`__tests__/..` -> `marketing-home.tsx`;
`__tests__/../features` -> `features-client.tsx`; both confirmed to exist). The `\b`
word boundaries correctly exclude the unrelated `PricingComparisonTable`. The
whole-file scans on lines 43/49 cover JSX usage and the alias re-add vector; the
line-anchored import-scan regex (`/^import .+ from .+$/gm`) would not catch a
multi-line `import { ... } from` statement, but the whole-file usage/alias scans
backstop that case, so the regression pin holds with no false-confidence gap. The
`/features` canonical instance is confirmed (`features-client.tsx:14` import +
`:70` `<ComparisonTable />`), and the CONS-14 removal-marker comment exists at
`marketing-home.tsx:119`.

**`critical-paths.smoke.spec.ts` (Playwright e2e smoke)** — The diff corrects the
`/` route label from `Dashboard` to `Homepage` (accurate: `src/app/page.tsx` ->
`MarketingHomePage` renders the marketing homepage; the dashboard is exercised
separately by the `Dashboard loads for owner` test at line 145). It raises per-page
`waitFor` from 5s to 20s to match the sibling single-page tests, and adds an
explicit `{ timeout: 120_000 }` budget via the valid 3-arg `test(title, options,
body)` overload. The budget math holds: 4 pages x 20s per-page race = 80s worst
case, comfortably inside 120s. All four loop routes exist (`/`, plus `/properties`,
`/tenants`, `/leases` under `src/app/(owner)/`). `Promise.race` + `.catch(() =>
false)` + the explicit `if (!pageLoaded)` throw leaves no false-confidence path.
The shared-`page` `test.describe.serial` + `beforeAll`/`afterAll` pattern is intact
and consistent with the Supabase Auth rate-limit rationale in the file header.
Typed `Page` import from `@playwright/test`, no `any`.

Convention compliance across all three files: no `any`, no `as unknown as`, no
barrel imports, no emojis in code logic, no commented-out code. Unit tests use
Vitest 4 + jsdom; the e2e file uses Playwright.

---

_Reviewed: 2026-05-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
