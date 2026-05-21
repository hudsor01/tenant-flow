---
phase: 11-token-alignment
plan: 01
subsystem: ui
tags: [design-tokens, css-variables, tailwind, loading-skeletons, vitest]

# Dependency graph
requires:
  - phase: pre-existing
    provides: "globals.css numeric --duration-* scale (lines 249-258)"
provides:
  - "5 decorative loading components fully tokenized to var(--duration-*) — zero non-zero inline-ms literals remain"
  - "src/app/resources/page.test.tsx — 7-test regression pin for the already-shipped /resources token state (TOKEN-01 + TOKEN-02 /resources half)"
affects: [11-02-design-token-drift-guard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline-ms tokenization: snap decorative stagger ms to the nearest numeric --duration-N token (no new tokens added to globals.css)"
    - "readFileSync raw-source regression pin: assert token state on a page without rendering it (mirrors sitemap.test.ts)"

key-files:
  created:
    - src/app/resources/page.test.tsx
  modified:
    - src/components/ui/grid-pattern.tsx
    - src/components/ui/loading-spinner.tsx
    - src/components/shared/chart-loading-skeleton.tsx
    - src/components/shared/blog-loading-skeleton.tsx
    - src/components/shared/blog-empty-state.tsx

key-decisions:
  - "Snapped non-token stagger values (400/450/600/750/800/900ms) to the nearest numeric --duration-N per CONTEXT D-04 — exact decorative ms is not load-bearing; no new tokens added to globals.css"
  - "0ms zero-cases (5 occurrences) left untouched — legitimate no-delay, no --duration-0 token exists"
  - "Computed template-literal staggers (${expr}ms in grid-pattern.tsx) left untouched — not static drift, do not match the drift-guard regex"

patterns-established:
  - "var(--duration-N) consumption in two equivalent forms: Tailwind arbitrary-value [animation-delay:var(--duration-200)] and style-object animationDelay: 'var(--duration-200)' — match the surrounding file's existing style"
  - "Source-text regression pin: readFileSync the page, regex-assert token state, no React render"

requirements-completed: [TOKEN-01, TOKEN-02]

# Metrics
duration: ~5min
completed: 2026-05-21
---

# Phase 11 Plan 01: Design-Token Alignment & Resources Page Summary

**Tokenized ~19 inline `[NNN]ms` durations across 5 decorative loading components to the canonical numeric `--duration-*` scale, and pinned the already-shipped `/resources` token state with a 7-test source-text regression guard.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-21T09:59:42-05:00
- **Completed:** 2026-05-21T10:02:42-05:00
- **Tasks:** 3
- **Files modified:** 6 (5 component files + 1 new test)

## Accomplishments
- All 5 decorative loading components (`grid-pattern`, `loading-spinner`, `chart-loading-skeleton`, `blog-loading-skeleton`, `blog-empty-state`) contain zero non-zero inline-ms literals — every duration resolves through a `var(--duration-*)` token
- `0ms` zero-cases (5 occurrences) and computed `${expr}ms` template-literal staggers left untouched per the documented exemption policy
- New `src/app/resources/page.test.tsx` pins the already-tokenized `/resources` page state (Badge `variant="secondary"`, `bg-card` surface token, no hex/rgb/`bg-white`/inline-ms, `color-mix` gradient form) — 7 passing tests
- No new tokens added to `globals.css`; `resources/page.tsx` unedited

## Task Commits

Each task was committed atomically:

1. **Task 1: Tokenize inline-ms durations in grid-pattern.tsx + loading-spinner.tsx** - `db3a10cb1` (feat)
2. **Task 2: Tokenize inline-ms staggers in the 3 shared loading/empty-state skeletons** - `7dad63ad5` (feat)
3. **Task 3: Author the /resources token regression-pin test** - `e7b4c67de` (test)

## Files Created/Modified
- `src/components/ui/grid-pattern.tsx` - SVG grid `animationDuration` (`500ms`→`var(--duration-500)`, `200ms`→`var(--duration-200)`); computed per-square stagger left untouched
- `src/components/ui/loading-spinner.tsx` - Dot `[animation-delay:200ms]`→`var(--duration-200)`, `[400ms]`→`var(--duration-300)` (snap); `0ms` zero-case kept
- `src/components/shared/chart-loading-skeleton.tsx` - 4 stagger `animationDelay` values tokenized (200/400/600/800ms → 200/300/500/700 tokens)
- `src/components/shared/blog-loading-skeleton.tsx` - 6 stagger `animationDelay` values tokenized (150/300/450/600/750/900ms → 150/300/500/500/700/1000 tokens)
- `src/components/shared/blog-empty-state.tsx` - 3 stagger `animationDelay` values tokenized (300/600/900ms → 300/500/1000 tokens)
- `src/app/resources/page.test.tsx` - New: 7-test source-text regression pin for TOKEN-01/TOKEN-02 `/resources` token state

## Decisions Made
- Snapped non-token stagger values to the nearest numeric `--duration-N` (per plan snap map + CONTEXT D-04) — decorative ms is not load-bearing, and adding `--duration-400` etc. is explicitly forbidden
- Used the numeric `--duration-N` scale (globals.css:249-258), NOT the bare `var(--duration-fast/normal/slow)` names — those do not exist in globals.css (the real names are `--transition-duration-*`)
- `resources/page.test.tsx` co-located in the page directory so it lands in the `unit` Vitest project (CI-gated + pre-commit)

## Deviations from Plan

None - plan executed exactly as written. All three tasks landed verbatim per the per-file:line snap mappings in the PLAN; the snap map and zero-case/computed-stagger exemptions were applied as specified.

## Issues Encountered
None. All verification passed on the first run: typecheck clean, Biome lint clean (1186 files), overall drift grep returns nothing, `resources/page.test.tsx` 7/7 passing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 11-02's `design-token-drift.test.ts` drift-guard can now go green for the `inlineMs` pattern across `src/components/**` — the last inline-ms drift cluster is eliminated
- `/resources` token state is now regression-pinned against future drift

## Self-Check: PASSED

All claimed files verified to exist; all three task commits verified present in git history.

- FOUND: src/app/resources/page.test.tsx
- FOUND: src/components/ui/grid-pattern.tsx (modified)
- FOUND: src/components/ui/loading-spinner.tsx (modified)
- FOUND: src/components/shared/chart-loading-skeleton.tsx (modified)
- FOUND: src/components/shared/blog-loading-skeleton.tsx (modified)
- FOUND: src/components/shared/blog-empty-state.tsx (modified)
- FOUND: commit db3a10cb1 (Task 1)
- FOUND: commit 7dad63ad5 (Task 2)
- FOUND: commit e7b4c67de (Task 3)

---
*Phase: 11-token-alignment*
*Completed: 2026-05-21*
