# Phase 56 — deferred items

Out-of-scope discoveries surfaced during execution. Logged, not fixed: each one
falls outside the enumerated file list of the plan that found it.

## From 56-03 (hub rewrite + legacy deletion)

### 1. `tests/e2e/tests/constants/routes.ts:70` names the deleted route

```ts
REPORTS_ANALYTICS: "/reports/analytics",
```

The constant has **zero consumers** (`grep -rn REPORTS_ANALYTICS tests src` returns
only the declaration), so nothing breaks today. It is outside `src/`, and E2E is
56-06's surface and the `/financials` sweep is 56-08's. Whichever of those two
touches this file should delete the constant, or repoint it if a redirect spec
wants it as a source fixture.

**Owner:** 56-06 or 56-08.

### 2. Modules orphaned by the index rewrite, but not in 56-03's delete list

The old `/reports` index was the sole consumer of several exports. Deleting it
left them unimported. `noUnusedLocals` covers unused *locals*, not unused
*exports*, so none of these is a build error and the suite is green — but they
are now dead weight.

| Module | Orphaned export(s) | Note |
|---|---|---|
| `src/hooks/api/use-reports.ts` | `useFinancialReport`, `usePropertyReport`, `useTenantReport`, `useMaintenanceReport` | Still covered by a large live test file (`__tests__/use-reports.test.tsx`), so deleting them means deleting real test coverage too. Deliberate decision required, not a sweep. |
| `src/components/reports/sections/date-range-selector.tsx` | `DateRangeSelector` | 56-03 was explicitly forbidden from deleting this. CONTEXT "Claude's Discretion" says `/reports/generate` is its natural home if anything still wants it. |
| `src/components/reports/reports-utils.ts` | `getDefaultDateRange`, `formatMoney`, `formatPercent`, `safeFormatMoney`, `safeFormatPercent` | `startOfMonthsBack` is still exercised by `__tests__/reports-utils.test.ts`. The other five lost their consumers with the four deleted chart sections. (`year-end-report-section.tsx` declares its **own** local `formatMoney` — it does not import this one.) |

**Owner:** a later Phase 56 plan or a follow-up cleanup. Do not sweep blindly —
item 1 of the table trades dead code against real test coverage.

## From 56-05 (statement route copy)

### 3. Two colocated tests execute twice until 56-07 lands

`expenses-csv.test.ts` and `income-statement-date-range.test.ts` now exist under
both `/financials` and `/reports`. This is threat **T-56-20**, dispositioned
**accept** by the plan: both are fast pure-function tests, and the suite went
from 308 to 310 files with no measurable runtime change (27.3s vs 28.1s across
two runs — inside normal variance). It resolves itself when 56-07 deletes the
legacy tree. No action needed; recorded so a reviewer seeing a duplicate test
name knows it is intentional and time-boxed.

### 4. `next build` cannot complete in this working copy

`SKIP_ENV_VALIDATION=true bun run build` compiles successfully and finishes
TypeScript, then dies in `Collecting page data for /blog/[slug]`. That route's
`generateStaticParams` opens an anon-key Supabase client at build time, and the
local `.env.local` is missing the app vars (the same gap that makes `bun run dev`
fail env validation — a known, documented condition; never edit `.env.local`).
Unrelated to this plan: no blog file appears in its diff. CI supplies the vars,
so this does not affect the pipeline. Recorded because it blocks any local
build-based verification for the rest of the phase.

**Owner:** nobody — environment condition, not a code defect.
