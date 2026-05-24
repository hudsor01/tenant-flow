---
phase: 02-data-layer-rpc
plan: 02
subsystem: data-layer-frontend
tags: [type-wiring, collection-rate-drop, polish-10-frontend, polish-11]
requirements-completed:
  - POLISH-10 (frontend half — schema half was plan 02-01; RLS test is plan 02-03)
  - POLISH-11 (fully — collection_rate dropped from DashboardMetrics + page.tsx)
completed: 2026-05-23
executor: inline (orchestrator)

key-files:
  modified:
    - src/types/database-rpc.ts (added `open_maintenance: number` to `PropertyPerformanceRpcResponse`)
    - src/types/core.ts (added `open_maintenance` to `PropertyPerformance` — REQUIRED in this plan; subsequently widened to OPTIONAL in cycle-1 fix to close CR-01 fabrication leak)
    - src/types/sections/dashboard.ts (removed `collectionRate: number` from `DashboardMetrics`)
    - src/hooks/api/use-owner-dashboard.ts (mapper emits `open_maintenance: row.open_maintenance ?? 0`)
    - src/app/(owner)/dashboard/page.tsx (dropped 2 hardcoded `collectionRate: 0` sites; re-mapper reads `prop.open_maintenance` — `?? 0` fallback added in cycle-1 fix when type became optional)
    - src/components/dashboard/dashboard-data.ts (`transformDashboardData` reads `prop.open_maintenance` — `?? 0` fallback added in cycle-1 fix)
    - src/components/dashboard/dashboard.tsx (inline transform reads `prop.openMaintenance`)
    - src/hooks/api/query-keys/property-stats-keys.ts (this plan added `open_maintenance: 0` typecheck closeout; cycle-1 fix REMOVED that line entirely once the field became optional — no fabrication remains)

decisions:
  - "D-01 implemented end-to-end: `collectionRate` field removed from DashboardMetrics interface; both fabricated `collectionRate: 0` sites in page.tsx deleted (initial empty-state + real-data IIFE). Repo-wide grep returns zero hits on collectionRate."
  - "D-02 frontend wiring (post-cycle-1 final state): `open_maintenance: number` on PropertyPerformanceRpcResponse (required — the RPC always emits it after migration 20260523223626); `open_maintenance?: number` on PropertyPerformance (optional — other producers like property-stats-keys.ts.mapPerformanceRow legitimately omit it because their source RPC doesn't carry maintenance counts); `openMaintenance: number` on PropertyPerformanceItem (required — was already declared at sections/dashboard.ts:56, only the value source changed). The optional widening on PropertyPerformance was the cycle-1 fix to avoid replicating the same fabrication pattern D-01 just removed for collectionRate."
  - "Defensive coalesce at TWO seams (post-cycle-1 final state): the RPC mapper boundary (`row.open_maintenance ?? 0` at use-owner-dashboard.ts:277 — defense-in-depth for frontend-DB-deploy ordering) AND the optional-field read seams (`prop.open_maintenance ?? 0` at page.tsx:106 and dashboard-data.ts:77). Both are correct: the mapper fallback survives an out-of-order deploy where the migration isn't applied yet; the read-seam fallbacks handle the optional-field shape on PropertyPerformance."
  - "Asymmetric naming: `PropertyPerformance.open_maintenance` (snake_case, matches `property_id` precedent on the same interface) but `PropertyPerformanceItem.openMaintenance` (camelCase, was already declared at sections/dashboard.ts:56 — only the value source changed). `dashboard-data.ts` reads snake_case (consumes raw PropertyPerformance); `dashboard.tsx` reads camelCase (consumes section-typed PropertyPerformanceItem via page.tsx re-map)."
  - "Plan scope expanded by 1 file beyond `files_modified` frontmatter: `src/hooks/api/query-keys/property-stats-keys.ts:85` was a transitive `PropertyPerformance` constructor that didn't appear in the plan's listed consumers but triggered TS2741 after Task 1. This plan added `open_maintenance: 0`; cycle-1 review caught that as the same fabrication anti-pattern as collectionRate. Cycle-1 fix REMOVED the line entirely and widened PropertyPerformance.open_maintenance to optional so the consumer can legitimately omit the field. `get_property_performance_with_trends` does not carry maintenance counts; omitting the field is the honest contract."

metrics:
  duration: ~5 min
  files_changed: 8 (7 from plan + 1 transitive closeout)
  insertions: 7
  deletions: 6
  typecheck: clean
  lint: clean

verification:
  grep_collectionRate_src: 0  # confirmed via `git ls-files 'src/**' | xargs grep -nE collectionRate` → empty
  grep_maintenanceOpen_zero_dashboard: 0  # confirmed via dashboard + page.tsx scope
  grep_stale_comments: 0  # "Not in current API response" / "Not available in current API" both deleted
  grep_any_introduced: 0
  grep_as_unknown_as: 0
  typecheck_exit: 0
  biome_check_exit: 0

prod_state:
  rpc_function: public.get_dashboard_data_v2(p_user_id uuid) returns jsonb
  field_emitted: open_maintenance per property row
  frontend_consumed: end-to-end (mapper -> re-mapper -> transform -> PortfolioRow)
  visible_change: portfolio table Maintenance column now renders real per-property open-maintenance counts (was hardcoded 0 across 4 sites)
---

# Phase 02 Plan 02: Frontend Wiring — Execution Summary

## Outcome

POLISH-10 frontend half + POLISH-11 fully closed. The dashboard pipeline reads real per-property `open_maintenance` counts from the RPC and no longer fabricates `collectionRate`.

## Tasks

| Task | Status | Evidence |
|------|--------|----------|
| T1 — Add `open_maintenance` to RPC + domain types; remove `collectionRate` from DashboardMetrics | DONE | 3 files modified: `database-rpc.ts`, `core.ts`, `sections/dashboard.ts`. Single-field additions/removal. `grep -c open_maintenance` returns 1 in each new-field file; `grep -c collectionRate` returns 0 in sections/dashboard.ts. |
| T2 — Wire fetcher mapper + page.tsx | DONE | Mapper at `use-owner-dashboard.ts:277` (final-state line) now emits `open_maintenance: row.open_maintenance ?? 0`. `page.tsx` lost both `collectionRate: 0` constructor sites + the re-mapper now reads `openMaintenance: prop.open_maintenance ?? 0` at `:106` (post-cycle-1 ?? 0 added when type widened to optional). |
| T3 — Wire both portfolio-row transforms | DONE | `dashboard-data.ts:77` reads `prop.open_maintenance ?? 0`; `dashboard.tsx:101` reads `prop.openMaintenance` (no fallback — required on PropertyPerformanceItem). Repo-wide grep for `maintenanceOpen: 0` in dashboard subtree returns 0. |

## D-01 (drop collection_rate) — verified

```
$ git ls-files 'src/**' | xargs grep -nE 'collectionRate' 2>/dev/null
(empty)
```

Field removed from `DashboardMetrics` interface (was line 39); two fabricated `collectionRate: 0` constructor sites in `page.tsx` (line 65 in the empty-state branch + line 82 in the real-data branch) deleted. No replacement metric synthesized — TenantFlow does not facilitate rent payments, so `0` was a fabricated reading (v1.0 honesty principle).

## D-02 (open_maintenance end-to-end) — verified

Four hardcoded-zero sites in the original codebase:
1. `dashboard-data.ts:77` (final-state line) `maintenanceOpen: 0` → `maintenanceOpen: prop.open_maintenance ?? 0` (the `?? 0` was added in cycle-1 fix when PropertyPerformance.open_maintenance widened to optional).
2. `dashboard.tsx:101` `maintenanceOpen: 0, // Not in current API response` → `maintenanceOpen: prop.openMaintenance` (no fallback — section-typed PropertyPerformanceItem.openMaintenance is required).
3. `page.tsx:106` (final-state line) `openMaintenance: 0, // Not in current API response` → `openMaintenance: prop.open_maintenance ?? 0`.
4. `use-owner-dashboard.ts:277` (final-state line) did not previously emit the field — now emits `open_maintenance: row.open_maintenance ?? 0`.

Type seams (3 interfaces touched, post-cycle-1 final state):
- `PropertyPerformanceRpcResponse.open_maintenance: number` (required — the RPC always emits it after migration `20260523223626`)
- `PropertyPerformance.open_maintenance?: number` (optional — cycle-1 widening; other producers like `mapPerformanceRow` legitimately omit the field)
- `PropertyPerformanceItem.openMaintenance: number` (required — was already declared at `sections/dashboard.ts:56`, only the value source changed)

## Transitive Closeout (out of plan scope)

`src/hooks/api/query-keys/property-stats-keys.ts:85` constructs a `PropertyPerformance` from a different RPC (`get_property_performance_with_trends`) and was not listed in the plan's `files_modified` array. After Task 1 made `open_maintenance` REQUIRED on `PropertyPerformance`, this site failed TS2741.

Initial resolution (this plan): added `open_maintenance: 0` to the returned object as a placeholder.

**Cycle-1 follow-up (commit `7f64c1946`):** the cycle-1 deep review flagged that fabrication as the SAME v1.0 honesty violation D-01 just removed for `collectionRate`. Real fix: widen `PropertyPerformance.open_maintenance` to OPTIONAL, omit the field entirely from the `mapPerformanceRow` return object, and apply `?? 0` at the consumer read seams (`page.tsx`, `dashboard-data.ts`) to keep downstream type assumptions safe. This is the canonical end-state captured in the frontmatter `decisions` block.

The post-cycle-1 contract: only producers with genuine maintenance-count data set the field; consumers that need a number apply `?? 0`. Zero fabrication.

## Threat Model Verification

| Threat | Disposition | Evidence |
|--------|-------------|----------|
| T-02-06 Untyped RPC field reads | mitigated | Three type seams updated; mapper boundary has `?? 0`. No `as unknown as` introduced (verified via diff scan). |
| T-02-07 Fabricated collectionRate shipped to client | mitigated | Field removed from type AND both constructor sites. No surface ever rendered it (verified at planning time). |
| T-02-08 RPC fields missing at runtime | mitigated | Wave 1 (plan 02-01) deployed the schema change BEFORE this plan runs; mapper has `?? 0` fallback for defense-in-depth. Plan 02-03 RLS test will pin the runtime contract. |
| T-02-09 Payload size growth | accepted | +1 integer per property row × <1000 rows = negligible. |
| T-02-SC Supply chain | accepted | No packages installed. |

## Verification Against ROADMAP § Phase 2 Success Criteria

| SC | Status | Notes |
|----|--------|-------|
| #1 Real per-property `open_maintenance` in RPC | DONE end-to-end | Schema (02-01) + frontend wiring (this plan). Runtime visual proof comes in plan 02-03's manual checkpoint. |
| #2 No hardcoded `0` for `collectionRate` | DONE | Field removed from `DashboardMetrics`; both `page.tsx` sites deleted. Repo-wide grep clean. |
| #3 Dual-client RLS test | PENDING (plan 02-03) | |
| #4 `bun run test:integration` passes | PENDING (plan 02-03) | |

## Issues / Deviations

1. **One transitive consumer outside `files_modified`** — `property-stats-keys.ts:85` required a closeout. Documented above; not a planning miss against the locked decisions (the plan's locked sites are all closed); just a typecheck-completeness consequence of making `open_maintenance` non-optional. Acceptable per CLAUDE.md's "no `any`" rule (the alternative was widening the field to optional, which would loosen the contract for the locked dashboard pipeline).

2. **No other deviations.** Plan tasks executed verbatim against the locked acceptance criteria.

## Carry-forward to Plan 02-03

- All four hardcoded-zero sites in the dashboard pipeline are now sourced from real RPC values.
- Plan 02-03 writes the RLS integration test that pins the contract (ownerA sees own counts, ownerA querying ownerB's id returns empty).
- Manual visual checkpoint at the end of 02-03: load `/dashboard` as synthetic ownerA, confirm portfolio table Maintenance column shows actual numbers.
