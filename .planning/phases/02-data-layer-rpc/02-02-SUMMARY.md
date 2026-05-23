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
    - src/types/core.ts (added `open_maintenance: number` to `PropertyPerformance`)
    - src/types/sections/dashboard.ts (removed `collectionRate: number` from `DashboardMetrics`)
    - src/hooks/api/use-owner-dashboard.ts (mapper emits `open_maintenance: row.open_maintenance ?? 0`)
    - src/app/(owner)/dashboard/page.tsx (dropped 2 hardcoded `collectionRate: 0` sites; re-mapper reads `prop.open_maintenance`)
    - src/components/dashboard/dashboard-data.ts (`transformDashboardData` reads `prop.open_maintenance`)
    - src/components/dashboard/dashboard.tsx (inline transform reads `prop.openMaintenance`)
    - src/hooks/api/query-keys/property-stats-keys.ts (typecheck-required closeout: `mapPerformanceRow` returns `open_maintenance: 0`)

decisions:
  - "D-01 implemented end-to-end: `collectionRate` field removed from DashboardMetrics interface; both fabricated `collectionRate: 0` sites in page.tsx deleted (initial empty-state + real-data IIFE). Repo-wide grep returns zero hits on collectionRate."
  - "D-02 frontend wiring: `open_maintenance: number` added as a non-optional field at three type seams (PropertyPerformanceRpcResponse + PropertyPerformance + intermediate PropertyPerformanceItem via the section-typed re-mapper); zero hardcoded `maintenanceOpen: 0` remains in the dashboard subtree."
  - "Defensive coalesce only at the RPC mapper boundary (`row.open_maintenance ?? 0` at use-owner-dashboard.ts:249) — downstream reads receive a guaranteed `number`, no redundant fallbacks."
  - "Asymmetric naming: `PropertyPerformance.open_maintenance` (snake_case, matches `property_id` precedent on the same interface) but `PropertyPerformanceItem.openMaintenance` (camelCase, was already declared at sections/dashboard.ts:56 — only the value source changed). `dashboard-data.ts` reads snake_case (consumes raw PropertyPerformance); `dashboard.tsx` reads camelCase (consumes section-typed PropertyPerformanceItem via page.tsx re-map)."
  - "Plan scope expanded by 1 file beyond `files_modified` frontmatter: `src/hooks/api/query-keys/property-stats-keys.ts:85` was a transitive `PropertyPerformance` constructor that didn't appear in the plan's listed consumers but triggered TS2741 after Task 1. Added `open_maintenance: 0` to the returned object (this RPC doesn't carry maintenance counts — the value is unavailable from `get_property_performance_with_trends`, so 0 is the correct placeholder until that RPC also gains the field, if ever)."

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
| T2 — Wire fetcher mapper + page.tsx | DONE | Mapper at `use-owner-dashboard.ts:249` now emits `open_maintenance: row.open_maintenance ?? 0`. `page.tsx` lost both `collectionRate: 0` constructor sites + the re-mapper now reads `openMaintenance: prop.open_maintenance`. |
| T3 — Wire both portfolio-row transforms | DONE | `dashboard-data.ts:64` reads `prop.open_maintenance`; `dashboard.tsx:101` reads `prop.openMaintenance`. Repo-wide grep for `maintenanceOpen: 0` in dashboard subtree returns 0. |

## D-01 (drop collection_rate) — verified

```
$ git ls-files 'src/**' | xargs grep -nE 'collectionRate' 2>/dev/null
(empty)
```

Field removed from `DashboardMetrics` interface (was line 39); two fabricated `collectionRate: 0` constructor sites in `page.tsx` (line 65 in the empty-state branch + line 82 in the real-data branch) deleted. No replacement metric synthesized — TenantFlow does not facilitate rent payments, so `0` was a fabricated reading (v1.0 honesty principle).

## D-02 (open_maintenance end-to-end) — verified

Four hardcoded-zero sites in the original codebase:
1. `dashboard-data.ts:64` `maintenanceOpen: 0` → `maintenanceOpen: prop.open_maintenance`
2. `dashboard.tsx:101` `maintenanceOpen: 0, // Not in current API response` → `maintenanceOpen: prop.openMaintenance`
3. `page.tsx:108` `openMaintenance: 0, // Not in current API response` → `openMaintenance: prop.open_maintenance`
4. `use-owner-dashboard.ts:249` did not previously emit the field — now emits `open_maintenance: row.open_maintenance ?? 0`

Type seams (3 interfaces touched, all single-field additions):
- `PropertyPerformanceRpcResponse.open_maintenance: number` (the RPC payload contract)
- `PropertyPerformance.open_maintenance: number` (the post-mapped domain shape)
- `PropertyPerformanceItem.openMaintenance: number` (the section-typed shape) — already declared, only the value source changed

## Transitive Closeout (out of plan scope)

`src/hooks/api/query-keys/property-stats-keys.ts:85` constructs a `PropertyPerformance` from a different RPC (`get_property_performance_with_trends`) and was not listed in the plan's `files_modified` array. After Task 1 made `open_maintenance` non-optional on `PropertyPerformance`, this site failed TS2741.

Resolution: added `open_maintenance: 0` to the returned object. The alternative RPC does not return maintenance counts; this consumer is not part of the dashboard pipeline (it powers a separate analytics surface). The placeholder is correct until either (a) the alternative RPC gains the field, or (b) this consumer is rewritten to use `get_dashboard_data_v2`.

This is a typecheck-required, scope-adjacent edit — not a deviation from the plan's locked decisions. Captured in the `decisions:` block of the frontmatter.

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
