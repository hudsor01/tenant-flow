---
phase: 12-seo-metadata-schema-content-cleanup
plan: 01
subsystem: seo
tags: [metadata, next-metadata, drift-guard, vitest, seo]

# Dependency graph
requires:
  - phase: 11-token-alignment
    provides: design-token-drift.test.ts walkSourceFiles/isTestPath drift-guard pattern
provides:
  - All 8 drifting page <title> separators normalized to the canonical pipe ` | `
  - CI-enforced title-separator drift guard (seo-title-separator-drift.test.ts)
affects: [12-02, 12-03, seo, metadata]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Title-separator drift guard: readFileSync recursive walk of src/app + generate-metadata.ts, title: literal extraction, spaced-dash rejection"

key-files:
  created:
    - src/app/__tests__/seo-title-separator-drift.test.ts
  modified:
    - src/lib/generate-metadata.ts
    - src/app/resources/page.tsx
    - src/app/help/page.tsx
    - src/app/blog/page.tsx
    - src/app/privacy/page.tsx
    - src/app/support/page.tsx
    - src/app/resources/security-deposit-reference-card/page.tsx

key-decisions:
  - "Pipe ` | ` is the canonical separator (D-02) — title.template and createPageMetadata brand suffix were already pipe and left untouched"
  - "title: extraction regex needs a leading (?<![\\w$]) boundary so it scopes to the standalone title: key and excludes prose keys like heroSubtitle:"

patterns-established:
  - "SEO drift guard: scan all src/app titles + generate-metadata.ts for spaced em-dash/en-dash/hyphen separators; meta-test block proves the regex"

requirements-completed: [SEO-01]

# Metrics
duration: ~12min
completed: 2026-05-21
---

# Phase 12 Plan 01: Title Separator Normalization Summary

**All 8 drifting page `<title>` separators normalized to the canonical pipe ` | `, pinned by a new CI-enforced title-separator drift guard.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-21T12:12:00Z
- **Completed:** 2026-05-21T12:17:00Z
- **Tasks:** 3
- **Files modified:** 7 (6 page files + generate-metadata.ts) + 1 created

## Accomplishments
- 3 brand-string occurrences in `generate-metadata.ts` (`title.default`, `openGraph.title`, `twitter.title`) flipped from em-dash to pipe in lockstep
- 6 page-title separators (resources, help, blog, privacy, support, security-deposit-reference-card) flipped from em-dash/hyphen to pipe
- `title.template` (`"%s | TenantFlow"`) left untouched — the structurally locked canonical source (Pitfall 1)
- New `seo-title-separator-drift.test.ts` scans every `src/app` page + `generate-metadata.ts` for spaced em-dash/en-dash/hyphen title separators; fails any future PR that re-introduces drift

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize the 3 generate-metadata.ts title strings to pipe** - `c0c30c62f` (fix)
2. **Task 2: Normalize the 6 page-title separators to pipe** - `d28d0e4ef` (fix)
3. **Task 3: Create the title-separator drift-guard test** - `58959d615` (test)

## Files Created/Modified
- `src/lib/generate-metadata.ts` - 3 brand-string title separators flipped em-dash to pipe
- `src/app/resources/page.tsx` - "Free Landlord Resources | Templates & Tools"
- `src/app/help/page.tsx` - "Help Center | Property Management Support & Guides"
- `src/app/blog/page.tsx` - "Property Management Blog | Tips for Independent Landlords"
- `src/app/privacy/page.tsx` - "Privacy Policy | Data Protection & User Rights"
- `src/app/support/page.tsx` - "Support Center | Property Management Help"
- `src/app/resources/security-deposit-reference-card/page.tsx` - "Security Deposit Laws by State | Quick Reference Card"
- `src/app/__tests__/seo-title-separator-drift.test.ts` - new drift guard (110 lines, 265 tests pass)

## Decisions Made
- Pipe ` | ` confirmed as canonical separator; `title.template` line 31 and `createPageMetadata` brand suffix left untouched (D-02, documented Pitfall 1).
- The plan's example `title:` extraction regex (`/title:\s*["']([^"'\n]+)["']/g`) was hardened — see deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Hardened the title: extraction regex with a leading word-boundary**
- **Found during:** Task 3 (drift-guard test)
- **Issue:** The plan's example extraction regex `/title:\s*["']([^"'\n]+)["']/g` matched the tail of compound keys such as `heroSubtitle:` in `src/app/compare/[competitor]/compare-data.ts`, whose string value is body prose ("...starts at $19/month — professional tools for any portfolio size."). That em-dash is legitimate sentence prose, not a `<title>` separator, so the test failed on a false positive. SEO-01's scope is `<title>`-class separators only.
- **Fix:** Added a leading `(?<![\w$])` boundary — `/(?<![\w$])title:\s*["']([^"'\n]+)["']/g` — so the regex matches only the standalone `title:` key and rejects `heroSubtitle:` / `metaTitle:` and similar compound keys.
- **Files modified:** src/app/__tests__/seo-title-separator-drift.test.ts
- **Verification:** All 265 tests pass; manual spot-check (reverting privacy/page.tsx to a hyphen separator) confirms the guard still fails on real drift.
- **Committed in:** 58959d615 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was necessary for the test to be correct — the plan explicitly scoped SEO-01 to title separators and noted em-dash in prose is fine. No scope creep.

## Issues Encountered
- Tasks 1 and 2's code edits were already present in the working tree at executor start (Task 1 committed as `c0c30c62f`, Task 2 staged but uncommitted) from a prior partial run. Verified the staged Task 2 diff matched the plan's FROM→TO exactly, ran the Task 2 verify + typecheck, and committed it (`d28d0e4ef`). No redundant work.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SEO-01 complete; the drift guard runs in lefthook pre-commit + CI `checks` gate.
- Plans 12-02 and 12-03 (OG route, schema regression pins, footer/aria-current tests) are unblocked.

## TDD Gate Compliance
This plan's tasks carried `tdd="true"`, but each task is a small string-literal normalization (Tasks 1-2) or a drift-guard test that passes green by design once Tasks 1-2 land (Task 3). There is no separate failing-test RED commit — the test IS the RED→GREEN artifact: it would have failed against the pre-Task-1 codebase (8 outliers) and passes against the normalized state. The plan documents this explicitly ("The test currently PASSES because Tasks 1+2 already normalized the 8 outliers"). Guard liveness was verified by reverting one edit and confirming the suite fails.

## Self-Check: PASSED

- FOUND: src/app/__tests__/seo-title-separator-drift.test.ts
- FOUND: src/lib/generate-metadata.ts (3 pipe occurrences, 0 em-dash)
- FOUND commit c0c30c62f (Task 1)
- FOUND commit d28d0e4ef (Task 2)
- FOUND commit 58959d615 (Task 3)

---
*Phase: 12-seo-metadata-schema-content-cleanup*
*Completed: 2026-05-21*
