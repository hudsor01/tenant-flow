---
phase: 56
plan: 01
subsystem: reporting-hub
tags: [reports, hub-index, tier-gate, ledger, d-30, d-31]
requires: []
provides:
  - PREMIUM_REPORT_SLUGS
  - REPORTS_HUB_ENTRIES
  - REPORTS_HUB_GROUPS
  - ReportsHubEntry
  - hasGrowthBadge
  - ReportHubTile
  - ReportsSummaryStrip
affects:
  - "src/app/(owner)/reports/**"
tech-stack:
  added: []
  patterns:
    - "route-colocated typed data module (report-types.ts analog), not a barrel file"
    - "badge derived from the gated report-type set, never a hardcoded boolean"
    - "single-payload metric strip reusing the shipped ledger-balance-strip shape"
key-files:
  created:
    - src/lib/reports/premium-report-slugs.ts
    - src/app/(owner)/reports/reports-hub-entries.ts
    - src/app/(owner)/reports/report-hub-tile.tsx
    - src/app/(owner)/reports/reports-summary-strip.tsx
    - src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx
  modified: []
decisions:
  - "Growth badge is derived via hasGrowthBadge(entry) from PREMIUM_REPORT_SLUGS rather than a literal flag, so a change to the edge functions' gated set cannot leave a stale false claim on a tile"
  - "MetricCard.valueClassName is typed `string | undefined` because exactOptionalPropertyTypes rejects passing undefined to an optional-only prop"
  - "The strip renders data-testid=\"reports-summary-strip\" on both the data and error containers so the pinned contract 'a strip failure still returns an element' is assertable"
  - "The TDD RED gate was executed and verified locally but could NOT be committed as a separate failing commit — lefthook pre-commit runs the full unit suite and --no-verify is a forbidden action in this project"
metrics:
  duration: ~22 min
  completed: 2026-07-31
---

# Phase 56 Plan 01: Reporting Hub Primitives Summary

Four composable modules plus one pinned unit test that let plan 56-03 rewrite the `/reports` index
as pure composition: a presentation-only mirror of the edge-function premium gate, the 7-entry
typed hub directory in 2 groups, the figure-free uniform tile, and the D-30 single-payload
Scheduled/Collected/Outstanding strip.

## What Was Built

| Task | Artifact | Commit |
|------|----------|--------|
| 1 | `src/lib/reports/premium-report-slugs.ts`, `src/app/(owner)/reports/reports-hub-entries.ts` | `e0ef0b0dc` |
| 2 | `src/app/(owner)/reports/report-hub-tile.tsx` | `77d193fd1` |
| 3 | `src/app/(owner)/reports/reports-summary-strip.tsx`, `src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx` | `22695ea96` |

### Task 1 — premium slug mirror + hub directory

`PREMIUM_REPORT_SLUGS` is a `ReadonlySet<string>` of the five gated report types. Its header comment
records that the two Deno sets are the enforcement point and this constant is presentation-only.

**Three-way set equality verified this session** by extracting the literals from all three files and
sorting them — all three yield exactly `"1099" "cash-flow" "financial" "income-statement"
"year-end"`. There is no drift for plan 56-04 to repair; 56-04 only has to pin it.

`reports-hub-entries.ts` declares `ReportsHubEntry`, `ReportsHubGroup`, `REPORTS_HUB_GROUPS`
(Statements then Exports) and `REPORTS_HUB_ENTRIES` (5 statements + 2 exports), transcribed from
56-UI-SPEC §"The 7 entries". Icon type is `LucideIcon`, not the weaker `ElementType` the
`financials-quick-links.tsx` analog uses. No Analytics group, no Analytics tile, no `/analytics/*`
href (D-31). No `value` or `trend` field (D-30).

`hasGrowthBadge(entry)` returns `entry.gatedReportType !== null && PREMIUM_REPORT_SLUGS.has(...)`.
Under the current data that badges exactly two entries — Tax Documents (`financial`) and Year-End
(`year-end`) — matching the UI-SPEC Tier Gate Contract table.

### Task 2 — the uniform hub tile

`ReportHubTile` is a Server-Component-safe presentational component (no `"use client"`, no hooks, no
data). All four mandated deltas from the `QuickLinkCard` analog were applied: the `value`/`trend`
props and their whole trailing block are gone (taking `TrendingUp`/`TrendingDown` and the raw
`text-emerald-600`/`text-red-600` palette classes with them), the medallion is `bg-muted` +
`text-foreground` with `aria-hidden`, and the title is `font-semibold`. `hover:border-primary/30` was
added to the `Link`. The top-right slot is a strict either/or: `Badge variant="outline"` with a
`Sparkles size-3` + `Growth` when gated, otherwise the hover `ArrowRight`. Never both.

### Task 3 — the D-30 summary strip

`ReportsSummaryStrip` is the plan's one `"use client"` island. It calls the existing
`useCollectionRate()` — **zero new query keys, zero new mappers, zero new RPC arguments** — and
derives Outstanding as `data.scheduled - data.collected` from that same object. Shape mirrors
`ledger-balance-strip.tsx` (`Card` + `CardContent p-4`, muted label row with a `h-4 w-4` icon,
`text-xl font-semibold tabular-nums` value) with `leading-snug` added explicitly because
`globals.css` defines `--text-xl` with no paired line-height token.

`src/components/ledger/ledger-balance-strip.tsx` was not touched — `git status --porcelain
'src/components/ledger/'` is empty.

## Verification Results

All commands run this session; output quoted, not paraphrased.

| Check | Result |
|-------|--------|
| `bun run typecheck` | exit 0 (silent) |
| `bun run lint` | exit 0 — "Checked 1346 files in 158ms. No fixes applied." |
| `bun run test:unit -- "src/app/(owner)/reports/__tests__/reports-summary-strip.test.tsx"` | exit 0 — **7 passed (7)** |
| `git status --porcelain 'src/components/ledger/'` | empty |
| recharts / `ChartContainer` / `ResponsiveContainer` in the 4 new source files | 0 in every file (D-34 holds) |
| `git diff --diff-filter=D` across the 3 commits | no deletions |

Task-level greps:

- `grep -c 'year-end\|1099\|financial\|income-statement\|cash-flow' src/lib/reports/premium-report-slugs.ts` → **5** (criterion: ≥5)
- analytics references in `reports-hub-entries.ts` → **0**
- `LucideIcon` → 2 occurrences, `ElementType` → **0**
- forbidden classes in `report-hub-tile.tsx` (`bg-primary/10`, `text-emerald-600`, `text-red-600`, `font-medium`) → **0**
- `value` / `trend` / `TrendingDown` in `report-hub-tile.tsx` → **0**; `"use client"` → **0**
- money-scaling / A/R grep in the strip (`accounts_receivable`, `formatCents`, `* 100`, `/ 100`) → **0**
- `queryOptions(` → 0 and `createClient(` → 0 in the strip

## Acceptance Criteria NOT Met As Literally Written

Two criteria are stated as greps whose literal output differs from the stated number. **Neither is a
code defect and neither criterion was reworded to pass** — both are reported here with the evidence
so a verifier can judge them directly.

**1. Task 1: `grep -v '^\s*//' 'reports-hub-entries.ts' | grep -c 'href:'` returns 8, not 7.**

The 8th match is line 34 — `href: string;`, the field declaration inside the `ReportsHubEntry`
interface itself. The grep was written as a proxy for "exactly 7 entries" and does not exclude the
type declaration. The underlying truth holds: `grep -c 'href: "'` (href bound to a string literal,
i.e. an actual entry) returns **exactly 7**, and the 7 hrefs are the 7 specified in 56-UI-SPEC.
Renaming the interface field to dodge the grep would have been the wrong fix — `href` is the correct
field name and `ReportHubTile` consumes it.

**2. Task 1: "Neither file contains ... a `supabase` import" — `premium-report-slugs.ts` matches
`supabase` 3 times.**

All three are documentation path references inside the mandated header comment
(`supabase/functions/export-report/index.ts`, `supabase/functions/generate-pdf/index.ts`,
`supabase/functions/__tests__/premium-report-gate.test.ts`) — the plan's own action text required
naming those files there. `grep -n '^import\|require(' src/lib/reports/premium-report-slugs.ts`
returns nothing: the file has **zero imports of any kind**. The criterion's substance (no supabase
client dependency) is satisfied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `exactOptionalPropertyTypes` rejected the strip's optional class prop**

- **Found during:** Task 3, after the test went green
- **Issue:** `bun run typecheck` failed with TS2375 on both conditional tiles — `MetricCard`'s
  `valueClassName?: string` cannot receive `undefined` under `exactOptionalPropertyTypes: true`, and
  the Collected/Outstanding tiles pass `undefined` for the neutral default case.
- **Fix:** typed the prop `valueClassName?: string | undefined` with a comment stating why. The
  `ledger-balance-strip.tsx` analog does not hit this because it always passes a definite string.
- **Files modified:** `src/app/(owner)/reports/reports-summary-strip.tsx`
- **Commit:** `22695ea96`

**2. [Rule 3 - Blocking] biome formatting on a wrapped description string**

- **Found during:** Task 1
- **Issue:** `bun run lint` failed — the Balance Sheet `description` was hand-wrapped onto a second
  line where biome wanted it inline.
- **Fix:** collapsed to one line.
- **Files modified:** `src/app/(owner)/reports/reports-hub-entries.ts`
- **Commit:** `e0ef0b0dc`

**3. [Rule 1 - Bug] Reverted a premature requirements completion in `.planning/REQUIREMENTS.md`**

- **Found during:** state updates
- **Issue:** The executor protocol says to run `requirements.mark-complete` on the plan's frontmatter
  `requirements: [RPTHUB-01, RPTHUB-03]`. Doing so flipped both to `[x]` and to `Complete` in the
  traceability table. **Both are false at this point in the phase.** RPTHUB-01 requires the hub to
  absorb `/financials/*` with zero charts — no hub index exists yet (56-03) and `/financials` is
  untouched (56-07). RPTHUB-03 requires the tier gate "verified intact after consolidation" — the
  drift guard is plan 56-04 and has not been written. This plan built primitives; it satisfied
  neither requirement.
- **Fix:** `git checkout -- .planning/REQUIREMENTS.md`. Both are back to `[ ]` / `Pending`. The last
  plan that actually delivers each requirement should mark it. A note recording this was added to
  `STATE.md` so the next executor does not re-mark them by reflex.
- **Files modified:** `.planning/REQUIREMENTS.md` (reverted to HEAD), `.planning/STATE.md` (note)
- **Commit:** the docs commit for this plan

**4. [Rule 3 - Blocking] Three `gsd-sdk state` handlers no-oped against this STATE.md**

- `state.record-metric` → `"Performance Metrics section not found in STATE.md"`
- `state.add-decision` → `"Decisions section not found in STATE.md"`
- `state.record-session` → `"No session fields found in STATE.md"`

This project's `STATE.md` does not carry those three sections, so the metric, the two decisions and
the session stamp were not written. They are recorded in this SUMMARY's frontmatter (`decisions`,
`metrics`) instead. `state.advance-plan` (plan 1 → 2), `state.update-progress` (28/35) and
`roadmap.update-plan-progress` (56: 1/8 In Progress) all applied successfully. `Status:` was
hand-corrected from the SDK's "Ready to execute" to "Wave 1 in progress", which is accurate.

### Additions Not Specified

**`data-testid="reports-summary-strip"` on both strip containers.** The plan's `<behavior>` block
requires pinning that `isError` "renders inline muted copy and still renders a container, never
throws". Asserting "still returns an element" needs a stable handle, and the error branch has no
label text to query by. The testid is on both the data and error containers so the assertion is
symmetric. This is the same idiom `collection-rate-kpi.tsx` uses
(`data-testid="collection-rate-kpi"` / `-loading`).

## TDD Gate Compliance

**WARNING: the RED gate commit is absent from git history. This is deliberate and is a hard
constraint conflict, not an oversight.**

The RED phase *was* executed:

1. `reports-summary-strip.test.tsx` was written and run **before** any implementation file existed.
2. It failed for the correct reason — vite import-analysis could not resolve
   `#app/(owner)/reports/reports-summary-strip`. Not a passing test, not an assertion failure: the
   module genuinely did not exist. No test passed unexpectedly.
3. The implementation was then written and the suite went from 0 tests to **7 passed (7)**.

It could not be committed as a separate `test(56-01): ...` commit because `lefthook.yml` runs
`CI=true bun run test:unit -- --coverage` (the **full** suite) on `pre-commit`. A commit containing
only the failing test would fail that hook, and bypassing it requires `--no-verify`, which this
project treats as a forbidden destructive action (global memory: "never bypass commit/push hooks by
any means, ever"). The alternative — staging only the test file while the implementation sat
unstaged on disk — would have passed the hook by accident while writing a structurally broken tree
into history. That is worse.

Consequence: git log shows a single `feat(56-01)` commit carrying both the test and the
implementation, rather than the `test(...)` → `feat(...)` pair. Sequence integrity is preserved in
the work, not in the commit graph.

## Known Stubs

None. No hardcoded empty collections, no placeholder copy, no unwired component. Every one of the 7
entries points at a route slug the phase's later plans create or already-live routes
(`/reports/generate`, `/reports/year-end` exist today; the five statement routes arrive with the
`/financials` move in a later wave — by design, since D-11 forbids deleting the legacy routes before
the hub is E2E-proven).

Per the plan's own objective, **nothing imports these modules from a route yet** — 56-03 composes
them. `report-hub-tile.tsx` imports `reports-hub-entries.ts`, and the test imports the strip; both
are within-plan links.

## Threat Flags

None. The plan's three registered threats are all discharged as planned:

- **T-56-01** (info disclosure): the strip reuses `useCollectionRate()` verbatim — no new query, no
  new RPC argument, no user-supplied filter. Owner resolution stays inside the existing factory.
- **T-56-02** (elevation of privilege): `PREMIUM_REPORT_SLUGS` drives only `hasGrowthBadge`, which
  feeds a `Badge`. Grep confirms no disabled state, no route guard and no early return reads it.
- **T-56-03 / T-56-SC** (tampering): zero package-manager installs. `bun.lock` untouched;
  `lockfile-verify` passed on all three commits.

No new network endpoint, auth path, file access pattern or schema change was introduced.

## Self-Check: PASSED

All 5 created files exist on disk. All 3 commit hashes resolve in `git log`:

- `e0ef0b0dc` feat(56-01): add hub entry directory and premium slug mirror
- `77d193fd1` feat(56-01): add uniform reports hub tile
- `22695ea96` feat(56-01): add D-30 reports summary strip with pinned contract

## Notes for 56-03

- Compose with `REPORTS_HUB_GROUPS.map(...)` over `REPORTS_HUB_ENTRIES.filter(e => e.group === g.id)`;
  the group descriptors already carry `headingId` for `<section aria-labelledby>`.
- The group heading needs `font-semibold` (the `report-card-grid.tsx` analog is `font-medium`), and
  the UI-SPEC pins the tile grid to `grid gap-4 sm:grid-cols-2 xl:grid-cols-3`.
- `/reports/page.tsx` must stay a Server Component; `ReportsSummaryStrip` is the only island.
- Do not wrap the page in an error boundary — the strip already degrades in place, and an outer
  boundary would let a strip failure remove the statement grid (a blocking defect per the UI-SPEC).
