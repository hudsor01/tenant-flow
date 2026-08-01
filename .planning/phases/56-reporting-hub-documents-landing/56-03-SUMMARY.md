---
phase: 56
plan: 03
subsystem: reporting-hub
tags: [reports, hub-index, rsc, deletion, d-29, d-33, d-34, d-36, d-42, rpthub-01]
requires:
  - REPORTS_HUB_ENTRIES
  - REPORTS_HUB_GROUPS
  - ReportHubTile
  - ReportsSummaryStrip
  - hasGrowthBadge
provides:
  - "chart-free /reports Server Component hub index"
  - "reports-hub composition pins"
  - "reports-hub zero-charts purity guard"
affects:
  - "src/app/(owner)/reports/**"
  - "src/components/reports/sections/**"
  - "src/components/maintenance/maintenance-view.client.tsx"
tech-stack:
  added: []
  patterns:
    - "RSC shell with exactly one client island, composed over a route-colocated typed directory"
    - "recursive node:fs source-scan guard with comment-stripping and __tests__ skipping (rent-ledger-money analog)"
    - "offender arrays asserted toEqual([]) so a failure prints the violating paths"
key-files:
  created:
    - src/app/(owner)/reports/__tests__/reports-hub.test.tsx
    - src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts
  modified:
    - src/app/(owner)/reports/page.tsx
    - src/app/(owner)/reports/layout.tsx
    - src/components/maintenance/maintenance-view.client.tsx
  deleted:
    - src/app/(owner)/reports/analytics/page.tsx
    - src/app/(owner)/reports/analytics/analytics-stats-row.tsx
    - src/app/(owner)/reports/analytics/analytics-payment-methods-chart.tsx
    - src/app/(owner)/reports/analytics/analytics-revenue-chart.tsx
    - src/app/(owner)/reports/analytics/analytics-occupancy-chart.tsx
    - src/app/(owner)/reports/analytics/analytics-property-table.tsx
    - src/components/reports/sections/financial-report-section.tsx
    - src/components/reports/sections/property-report-section.tsx
    - src/components/reports/sections/tenant-report-section.tsx
    - src/components/reports/sections/maintenance-report-section.tsx
decisions:
  - "The two sections are rendered by mapping REPORTS_HUB_GROUPS rather than as two literal <section> blocks, per 56-01's explicit composition note; this makes the aria-labelledby grep read 1 while the DOM carries 2"
  - "Doc comments in page.tsx and maintenance-view.client.tsx were reworded to stop naming the banned tokens and the deleted route, because a file that documents a grep-checkable ban by containing the banned token defeats the grep"
  - "The purity guard's chart matcher is four patterns, not one, so an offender message names which construct fired"
  - "REQUIREMENTS.md deliberately untouched: RPTHUB-01 is not delivered until the statement routes exist (56-05) and the legacy tree is gone (56-07)"
metrics:
  duration: ~30 min
  completed: 2026-07-31
---

# Phase 56 Plan 03: Chart-Free Reports Hub Summary

The `/reports` index is now a hook-free Server Component rendering a summary strip over 7 tiles in 2
labelled sections, the entire `/reports/analytics` route and the four orphaned recharts sections are
deleted, the last in-app navigation to the deleted route points at `/analytics/overview`, and the
D-34 zero-charts invariant is enforced by a subtree scan that was proven to fail against a planted
`recharts` import.

## What Was Built

| Task | Artifact | Commit |
|------|----------|--------|
| 1 | `src/app/(owner)/reports/page.tsx` (rewritten), `layout.tsx` | `438b8fe2f` |
| 2 | 10 files deleted; `maintenance-view.client.tsx` repointed | `5fec73539` |
| 3 | `__tests__/reports-hub.test.tsx`, `__tests__/reports-hub-purity.test.ts` | `6d9a42f1f` |

### Task 1 — the RSC hub shell

The 260-line client index is gone. The replacement is 58 lines: a `p-6 lg:p-8 bg-background
min-h-full space-y-8` canvas holding a header block (`<h1 className="typography-h1">Reports</h1>`
plus the `text-sm text-muted-foreground` subtitle *Every financial statement and export in one
place.*), `<ReportsSummaryStrip />` directly beneath it as the page's primary visual anchor, then
`REPORTS_HUB_GROUPS.map(...)` producing two `<section aria-labelledby={group.headingId}>` elements,
each with a `font-semibold text-foreground` `<h2>` carrying that `id`, the group one-liner, and a
`grid gap-4 sm:grid-cols-2 xl:grid-cols-3` of `<ReportHubTile>`. Grid classes are identical across
both groups.

Removed and not replaced: the four `dynamic()` recharts sections, the `DateRangeSelector`, the
`Empty` compound, the PDF-export handler and its HTML builder, all four `use-reports` hooks, the
three header CTA buttons, and the `<Link href>` to the deleted analytics route. Nothing wraps the
tile grid in a skeleton, spinner or error boundary — the strip degrades in place, and an outer
boundary would let a strip failure remove the directory, which is the page's fallback purpose.

`layout.tsx` keeps `ownerPageMetadata` and the title `Reports`; only the description changed, from a
sentence promising tenant and maintenance reports to the hub's actual contents.

### Task 2 — the deletions

Ten files, in one commit with the repoint, confirmed by
`git diff --diff-filter=D --name-only 5fec73539~1 5fec73539`:

| Deleted | Why (D-36) |
|---|---|
| `reports/analytics/page.tsx` | route removal (D-29) |
| `analytics-stats-row.tsx` | cards 1/2/4 read the broken `paymentAnalytics` mapper (D-33); Occupancy Rate already ships at `analytics/overview/analytics-stat-cards.tsx:48` (**verified this session** — see below) |
| `analytics-payment-methods-chart.tsx` | broken source, and card-vs-ACH is a claim a product that facilitates no rent payments cannot make |
| `analytics-property-table.tsx` | provably dead — mapper hard-codes `byProperty: []` |
| `analytics-occupancy-chart.tsx` | same always-empty guard |
| `analytics-revenue-chart.tsx` | triplicated by live `/analytics` charts |
| the 4 `*-report-section.tsx` chart sections | orphaned by the index rewrite; each was imported only by the old `reports/page.tsx` |

**D-39 verified, not assumed.** `src/app/(owner)/analytics/overview/analytics-stat-cards.tsx:48`
renders `<StatLabel>Occupancy Rate</StatLabel>` over a `NumberTicker` on `occupancyRate`. The one
real-data card inside the deleted stats row already ships elsewhere, so nothing is silently dropped.

**Kept, as mandated:** `year-end-report-section.tsx` (grep-confirmed chart-free),
`year-end-report-section-utils.ts`, `date-range-selector.tsx`, and
`sections/__tests__/year-end-report-section-utils.test.ts`. No deleted section had a colocated test
— the `__tests__` directory contained only the year-end utils test.

**D-42 repoint:** `maintenance-view.client.tsx:119` now reads
`router.push("/analytics/overview")`, not a hop through the future 308.

**No orphan cleanup was needed.** `bun run typecheck` passed immediately after the deletions with no
`noUnusedLocals` / `noUnusedParameters` error — the deleted sections were leaf modules and the index
was rewritten wholesale in task 1 rather than edited.

### Task 3 — the two guards

`reports-hub.test.tsx` — **11 passing** assertions against `REPORTS_HUB_ENTRIES` /
`REPORTS_HUB_GROUPS` rather than a render, because the page is an RSC with a client island. Pins:
7 entries; 2 groups ordered `statements` then `exports`; 5 and 2 members; every `href` under
`/reports/`; no `href` equal to `/reports`, equal to the deleted analytics route, or starting with
`/analytics`; no group named/ided analytics; non-empty titles and descriptions; unique ids; and
`hasGrowthBadge` true for exactly `["tax-documents", "year-end"]`. Two extra cases pin that heading
ids are present and unique and that every entry belongs to a declared group.

`reports-hub-purity.test.ts` — **27 passing** cases. A `node:fs` recursive walk of
`src/app/(owner)/reports` that strips comments before matching and skips `__tests__`, both carried
over from `rent-ledger-money.test.ts` because both are load-bearing here. Assertions: **D-34** no
chart import or chart primitive anywhere in the subtree; **D-30** `page.tsx` has no `"use client"`,
`useQuery`, `useState`, `createClient` or supabase import; **D-33** the two deleted card files and
the `analytics/` directory do not exist and no scanned file reads `total_payments`,
`successful_payments`, `payments_by_method` or `payments_by_status`; **D-18** no user-facing
`Revenue` label (whole word inside a string literal or JSX text run — deliberately not a bare
`/Revenue/`, which would flag the legitimate `totalRevenue` RPC field).

Two anti-vacuity cases guard the guard: the scan must find files and must contain `page.tsx`, and it
must exclude every `__tests__` path. Twelve detector cases prove each matcher fires on a violation
and stays quiet on comments, camelCase identifiers and permitted vocabulary.

## Verification Results

Every value below is quoted from command output run this session.

| Check | Result |
|-------|--------|
| `bun run typecheck` | exit 0 (silent) |
| `bun run lint` | exit 0 — "Checked 1340 files in 158ms. No fixes applied." |
| `bun run test:unit` (full suite, post-deletion) | exit 0 — **307 files, 107304 tests passed** |
| `bun run test:unit -- ".../reports-hub.test.tsx"` | exit 0 — **11 passed (11)** |
| `bun run test:unit -- ".../reports-hub-purity.test.ts"` | exit 0 — **27 passed (27)** |
| `test ! -d 'src/app/(owner)/reports/analytics'` | PASS — directory absent |
| `git status --porcelain 'src/app/(owner)/analytics/'` | empty — peer section untouched |
| `git status --porcelain 'src/components/ledger/'` | empty |
| `git diff --name-only HEAD -- .planning/REQUIREMENTS.md` | empty |

### The injected-probe proof (D-34)

`src/app/(owner)/reports/zz-probe-delete-me.tsx` was created containing
`import { ResponsiveContainer } from "recharts"`. The purity suite went to **1 failed | 26 passed
(27)**, and the failing case printed the offender by path and by construct:

```
× imports no charting library or chart primitive anywhere in the subtree
AssertionError: expected [ Array(1) ] to deeply equal []
+   "src/app/(owner)/reports/zz-probe-delete-me.tsx: recharts import,
     recharts require/dynamic import, ResponsiveContainer identifier",
```

The probe was removed, the file is confirmed absent, `git status` never showed it, and the suite is
back to **27 passed (27)**.

### Task-level greps

| Criterion | Result |
|---|---|
| `head -1 page.tsx` | `/**` — not `"use client";` ✅ |
| forbidden-token count in `page.tsx` (`useState`/`useQuery`/`dynamic(`/chart primitives/`createClient`/`DateRangeSelector`) | **0** ✅ |
| `grep -c 'REPORTS_HUB_ENTRIES\|REPORTS_HUB_GROUPS\|ReportHubTile\|ReportsSummaryStrip'` (≥4) | **8** ✅ |
| subtitle in `page.tsx` / `layout.tsx` | **1 / 1** ✅ |
| `grep -c 'Reports & Analytics' page.tsx` | **0** ✅ |
| `export const metadata` in `page.tsx` | **0** ✅ |
| `grep -c 'router.push("/analytics/overview")' maintenance-view.client.tsx` | **1** ✅ |
| purity test contains `recharts` / `ChartContainer` / `ResponsiveContainer` / `analytics-stats-row` / `payments_by_method` / `stripComments` | 6 / 4 / 5 / 2 / 3 / 3 ✅ |

## Acceptance Criteria NOT Met As Literally Written

Three greps do not return their stated numbers. **None was reworded to pass**; each is reported with
the evidence and the underlying truth so a verifier can judge it directly. Two are proxy artifacts
of the same class 56-01 and 56-02 reported; the third is a genuine internal conflict in the plan.

### 1. Task 1: `grep -c 'aria-labelledby' page.tsx` returns **1**, not 2

The page renders the two sections by mapping `REPORTS_HUB_GROUPS`, so the attribute is written once
in source and emitted twice in the DOM. This is the composition the plan's own action text specifies
("Two `<section>` elements, **one per entry in `REPORTS_HUB_GROUPS`**") and the one 56-01's SUMMARY
explicitly hands over ("Compose with `REPORTS_HUB_GROUPS.map(...)` over
`REPORTS_HUB_ENTRIES.filter(...)`"). The criterion counts source occurrences.

The underlying truth is pinned by test, not by inspection: `reports-hub.test.tsx` asserts
`REPORTS_HUB_GROUPS.map(g => g.id)` equals exactly `["statements", "exports"]` and that every group
has a unique non-empty `headingId`, so the map produces exactly two labelled sections. Duplicating
the section body to satisfy a grep would have shipped worse code and created a second place for the
group list to drift.

### 2. Task 2: `grep -rn '/reports/analytics' src` returns **10**, not 0

All 10 are in `src/lib/seo/reporting-redirects.ts` (4) and its test (6) — plan 56-02's redirect map,
where `/reports/analytics` is **redirect source entry 7**, the one entry in the phase pointing away
from the hub. That file must name the deleted route permanently; that is its entire job. The
criterion is unsatisfiable while the map exists, in any task order.

This is the same hazard STATE.md already flags for 56-08's `/financials` sweep, which carries a
deliberate `grep -v 'reporting-redirects'` exclusion for exactly this reason. Applying the same
exclusion here: **0 matches**.

The substantive invariant — no source file *navigates to* the deleted route — was verified directly
and holds across `src` **and** `tests`:

```
grep -rnE '(href=["'\'']/reports/analytics|router\.push\(["'\'']/reports/analytics|redirect\(["'\'']/reports/analytics)' src tests
  → zero matches
```

### 3. Verification block: `grep -rl 'recharts' 'src/app/(owner)/reports'` returns the purity test

At the end of task 2 this returned nothing, as required. Task 3 then adds
`__tests__/reports-hub-purity.test.ts`, which **must** contain the literal `recharts` — Task 3's own
acceptance criterion demands it ("The purity test contains `recharts`, `ChartContainer`,
`ResponsiveContainer`..."). The two criteria cannot both hold.

The guard is built for exactly this: it skips `__tests__`, so it does not scan itself.
`grep -rl 'recharts' 'src/app/(owner)/reports' | grep -v '__tests__'` returns **nothing** — no
production file under the hub references a chart library, which is what D-34 actually asserts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] My own doc comments broke two grep-checkable invariants**

- **Found during:** Task 2 acceptance-criteria run
- **Issue:** The header comment I wrote on `page.tsx` spelled out `recharts`, `ChartContainer` and
  `ResponsiveContainer` while documenting the ban, so `grep -rl 'recharts' 'src/app/(owner)/reports'`
  returned `page.tsx`. Separately, the repoint comment I added to `maintenance-view.client.tsx`
  named `/reports/analytics`, so that file still matched the route sweep. Both were false positives
  in checks whose value is that they are cheap to run and trustworthy.
- **Fix:** reworded both. `page.tsx` now names the invariant ("no charting library or chart
  primitive") and points at the purity test for the exact identifiers, with an explicit note that
  they are omitted so a repo-wide grep returns only real violations.
  `maintenance-view.client.tsx` now says "the legacy hub analytics route was deleted and now 308s
  here" without spelling the path. Neither comment lost information.
- **Files modified:** `src/app/(owner)/reports/page.tsx`,
  `src/components/maintenance/maintenance-view.client.tsx`
- **Commit:** `5fec73539`

**2. [Rule 3 - Blocking] biome formatting on both new test files**

- **Found during:** Task 3
- **Issue:** `bun run lint` exit 1 — four hand-wrapped object literals and template arguments biome
  wanted broken differently, plus two single-quoted strings.
- **Fix:** `bunx biome check --write` on the two files, then re-verified lint, typecheck and both
  suites before staging (lefthook lints the staged index, so the re-add order matters).
- **Files modified:** both new test files
- **Commit:** `6d9a42f1f`

### Additions Not Specified

**Two anti-vacuity cases on the purity scan.** `expect(reportsFiles.length).toBeGreaterThan(0)` plus
`expect(relPaths).toContain(HUB_INDEX)`, and a case asserting no `__tests__` path survives the
filter. A recursive scan that silently resolves to zero files makes every `toEqual([])` below it
pass for the wrong reason — the exact failure mode this phase exists to eliminate. The
`rent-ledger-money.test.ts` analog carries the same idea in its "scans the ledger-math module that
already exists" case.

**Four chart patterns instead of one.** The plan asked for "no import from `recharts`, nor the
identifiers `ChartContainer` or `ResponsiveContainer`". Splitting the recharts check into a
`from "recharts"` form and a bare-specifier form catches `await import("recharts")` and
`dynamic(() => import("recharts"))`, which the old index used and which a `from`-anchored pattern
would miss. Offender messages name which construct fired.

**Two extra composition pins** (`headingId` present and unique; every entry belongs to a declared
group). Both are one line and both protect the map in `page.tsx` from a data-module edit.

### Deliberately NOT Done

**`requirements.mark-complete RPTHUB-01` was not run**, per the execution directive and consistent
with 56-01 and 56-02. This plan makes the hub chart-free, but RPTHUB-01 also requires the
`/financials` surfaces absorbed — the five statement routes do not exist yet (56-05) and the legacy
tree is untouched (56-07). `.planning/REQUIREMENTS.md` is unmodified.

**The `use-reports` hooks, `DateRangeSelector` and the `reports-utils` formatters were not deleted.**
They are now unimported but are outside this plan's enumerated file list, and `date-range-selector.tsx`
is explicitly protected by the plan. Logged to `deferred-items.md` rather than swept, because
deleting the `use-reports` hooks would also delete a large live test file — a decision, not a
cleanup.

## Deferred Issues

Logged to `.planning/phases/56-reporting-hub-documents-landing/deferred-items.md`:

1. `tests/e2e/tests/constants/routes.ts:70` still declares `REPORTS_ANALYTICS: "/reports/analytics"`.
   It has **zero consumers**, is outside `src/`, and belongs to 56-06 (E2E) or 56-08 (the sweep).
2. Modules orphaned by the index rewrite but not in this plan's delete list — the four `use-reports`
   hooks, `DateRangeSelector`, and five `reports-utils` formatters. Unused *exports* are not
   `noUnusedLocals` errors, so the build and the full suite are green.

## Known Stubs

None. `page.tsx` renders real markup from a fully-populated directory with no hardcoded empty
collection, no placeholder copy and no unwired component.

**Not a stub, by design:** five of the seven tile `href`s (`/reports/income-statement`,
`/reports/cash-flow`, `/reports/balance-sheet`, `/reports/expenses`, `/reports/tax-documents`) do
not resolve yet — those routes arrive when `/financials` is absorbed in a later wave. D-11 forbids
deleting the legacy routes before the hub is E2E-proven, so the tiles necessarily lead the routes.
`/reports/generate` and `/reports/year-end` are live today. This is the plan's stated sequencing,
not an unfinished surface.

## Threat Model Disposition

| Threat | Disposition | Evidence |
|---|---|---|
| T-56-08 info disclosure — tile grid leaking tier | mitigated | `page.tsx` has no `useQuery`, `createClient` or supabase import; pinned by purity assertion 2 which fails on any of the five. The `Growth` badge derives from the static `PREMIUM_REPORT_SLUGS` via `hasGrowthBadge`, never from the viewer. |
| T-56-09 repudiation — permanently-zero billing cards | mitigated | Both files deleted; absence pinned by `it.each` over `DELETED_D33_FILES` plus a directory-absence case, and the four broken snake_case keys are forbidden across the whole subtree. |
| T-56-10 tampering — route deletion cascade | mitigated | `maintenance-view.client.tsx:119` repointed in the same commit as the deletion; the navigation-targets grep over `src` **and** `tests` returns zero. |
| T-56-11 DoS — summary-strip failure | mitigated | The strip is a sibling of the tile grid with no shared boundary, and no error boundary was added around the grid. Verified by reading the shipped strip: its error branch returns markup rather than throwing. |
| T-56-SC tampering — package installs | n/a | Zero package-manager commands. `bun.lock` untouched; `lockfile-verify` passed on all three commits. |

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change was introduced — this
plan is a rewrite plus deletions. The net change to security surface is **negative**: one route and
its five data-fetching children were removed, and the index went from four authenticated RPC reads
to zero.

## Self-Check: PASSED

Created files exist on disk:

- `src/app/(owner)/reports/__tests__/reports-hub.test.tsx` — FOUND
- `src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts` — FOUND

Deleted paths confirmed absent: `src/app/(owner)/reports/analytics/` (directory) and the four
`src/components/reports/sections/*-report-section.tsx` chart sections.

All three commit hashes resolve in `git log`:

- `438b8fe2f` feat(56-03): rewrite reports index as chart-free RSC hub shell
- `5fec73539` feat(56-03): delete the hub analytics route and four chart sections
- `6d9a42f1f` test(56-03): pin hub composition and the zero-charts purity guard

## Notes for the rest of Phase 56

- **The purity guard is live from now on.** Any plan adding a file under `src/app/(owner)/reports/`
  inherits it: no chart library, no `useQuery`/`useState`/`createClient`/supabase import in
  `page.tsx`, no bare `Revenue` label anywhere, no broken billing keys. It scans the whole subtree,
  so the five statement routes 56-05 creates are covered automatically.
- **56-05 must not reintroduce a "Revenue" label** on the statement routes. The D-18 matcher catches
  quoted labels and JSX text, including `"Total Revenue"`.
- **56-06's E2E** should assert the hub renders 7 tiles under 2 headings; the unit pins cover the
  data, not the DOM, and the page is an RSC so only E2E proves it renders.
- **56-07 wiring:** entry 7 of the redirect map now points at a route that genuinely no longer
  exists, so the 308 becomes load-bearing the moment it ships. Until then `/reports/analytics` is a
  404 — acceptable, because the only in-app caller was repointed here.
