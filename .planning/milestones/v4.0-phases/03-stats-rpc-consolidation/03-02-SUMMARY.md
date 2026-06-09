---
phase: 03-stats-rpc-consolidation
plan: 02
subsystem: stats-rpc-frontend
tags: [perf, rpc-consolidation, boundary-mapper, zod, tanstack-query]
requires:
  - "get_unit_stats(p_user_id) RPC live in prod (03-01)"
  - "get_tenant_stats(p_user_id) RPC live in prod (03-01)"
  - "UnitStats / TenantStats types in src/types/stats.ts"
provides:
  - "mapUnitStats validated boundary mapper"
  - "mapTenantStats validated boundary mapper"
  - "unitQueries.stats() served by a single get_unit_stats RPC"
  - "tenantQueries.stats() served by a single get_tenant_stats RPC"
affects:
  - "useUnitStats() / useTenantStats() consumers (dashboard + list KPI cards)"
tech-stack:
  added: []
  patterns:
    - "Zod safeParse boundary mapper mirroring mapMaintenanceRow (CLAUDE.md RPC return typing)"
    - "getCachedUser -> supabase.rpc -> handlePostgrestError -> typed mapper stats hook body"
key-files:
  created:
    - src/hooks/api/query-keys/unit-mappers.ts
    - src/hooks/api/query-keys/unit-mappers.test.ts
    - src/hooks/api/query-keys/tenant-stats-mapper.ts
    - src/hooks/api/query-keys/tenant-stats-mapper.test.ts
  modified:
    - src/hooks/api/query-keys/unit-keys.ts
    - src/hooks/api/query-keys/tenant-keys.ts
    - src/test/mocks/msw/handlers/rpc.ts
    - src/hooks/api/__tests__/use-tenant.test.tsx
decisions:
  - "Derive vacant/occupancyRate/averageRent/occupancyChange/totalPotentialRent in the typed mapper (not SQL) — keeps the RPCs lean per 03-CONTEXT Claude's-discretion clause"
  - "averageRent divides by total (== old rentAmounts.length == non-inactive row count) — value identical, pinned in no-regression test"
metrics:
  duration: ~12m
  completed: 2026-06-06
  tasks: 2
  files: 8
---

# Phase 3 Plan 02: Stats Mappers + Hook Rewire Summary

Added Zod-validated `mapUnitStats` / `mapTenantStats` boundary mappers and rewired `unitQueries.stats()` + `tenantQueries.stats()` to resolve each via a single owner-scoped RPC (`get_unit_stats` / `get_tenant_stats`) through those mappers — deleting the 4 HEAD counts + unbounded `rent_amount` fetch (PERF-02) and the 3 HEAD counts + broken `users.status` filter (PERF-03).

## What Changed

### Task 1 — Boundary mappers (commit `21c6a46`)
- `unit-mappers.ts` exports `mapUnitStats(raw: unknown): UnitStats`. Module-local `z.object` validates the five RPC numeric keys (`total, occupied, available, maintenance, totalActualRent`) via `safeParse`; throws a descriptive `mapUnitStats:` error on drift. Derives `vacant = available`, `occupancyRate = total>0 ? round(occupied/total*100) : 0`, `averageRent = total>0 ? totalActualRent/total : 0`, `occupancyChange = 0` (stub), `totalPotentialRent = totalActualRent` (alias).
- `tenant-stats-mapper.ts` exports `mapTenantStats(raw: unknown): TenantStats`. Module-local `z.object` validates `total, active, inactive`; throws on drift. Derives `totalTenants = total`, `activeTenants = active`, `newThisMonth = 0` (stub).
- Both reuse the existing `UnitStats` / `TenantStats` types from `#types/stats` — no duplicate type declarations. No `as unknown as`, no `: any`.
- Co-located tests (14 cases) including the no-regression value pin: for `{total:10, occupied:6, available:3, maintenance:1, totalActualRent:12000}` → `occupancyRate=60`, `averageRent=1200`, `vacant=3`, `occupancyChange=0`, `totalPotentialRent=12000` — identical to the old multi-query path. Plus zero-guard (total=0 → rate=0, avg=0) and drift-throws.

### Task 2 — Hook rewire + MSW handlers (commit `61a872485`)
- `unit-keys.ts` `stats()` queryFn replaced with `getCachedUser` guard → `supabase.rpc("get_unit_stats", { p_user_id: user.id })` → `handlePostgrestError(error, "units")` → `mapUnitStats(data)`. The `Promise.all([...])`, all five HEAD/fetch results, the manual `rentAmounts` reduce, and the inline derivation are deleted.
- `tenant-keys.ts` `stats()` queryFn replaced the same way with `get_tenant_stats` → `mapTenantStats(data)`. The `Promise.all([...])` and both broken `.eq("users.status", ...)` filters are deleted entirely. Added the `getCachedUser` import.
- `src/test/mocks/msw/handlers/rpc.ts` gains `get_unit_stats` and `get_tenant_stats` `http.post` handlers returning realistic raw-aggregate jsonb.
- `use-tenant.test.tsx` `useTenantStats` test rewired: added `rpc` to the mocked `createClient`, a default `get_tenant_stats` rpc mock in `beforeEach`, and the test now asserts `rpc("get_tenant_stats", { p_user_id })` was called and the mapped output matches (`totalTenants/activeTenants/newThisMonth` derived).

## No-Regression / Correctness Notes

- **UnitStats values pinned identical.** The mapper's `averageRent` divides `totalActualRent` by `total`; the old code divided by `rentAmounts.length`, which equals the non-inactive row count == `total`, so the value is the same. Pinned in `unit-mappers.test.ts`.
- **Tenant active/inactive counts may now DIFFER — intended correctness fix, NOT a regression.** The old path counted active/inactive via `.eq("users.status", ...)` on a non-inner-joined `users` embed (a broken filter — the audit's flagged bug). The RPC now counts by `tenants.status` server-side, producing correct counts. `total` is unaffected (it had no filter). Per 03-CONTEXT, changed active/inactive counts are the deliberate PERF-03 correction.

## Deviations from Plan

None — plan executed exactly as written. The only adjustment was a commit-message body line-length reflow (commitlint `body-max-line-length` 100) and a Biome import-ordering fix in `tenant-keys.ts` (`mapTenantStats` sorted after the `tenant-mappers` imports) — both mechanical gate-satisfying tweaks, not behavioral deviations.

## Out of Scope (noted, not fixed)

- `biome.json` `$schema` version (2.4.15) lags the installed Biome CLI (2.4.16) — an informational lint note, pre-existing and unrelated to this plan's changes.

## Verification

- `bun run typecheck` — clean (`tsc --noEmit` exit 0).
- `bun run lint` — clean (Biome: 0 errors; only the pre-existing schema-version info note).
- Mapper tests: `unit-mappers.test.ts` + `tenant-stats-mapper.test.ts` — 14/14 pass (incl. no-regression value pin).
- Hook test: `use-tenant.test.tsx` — 16/16 pass against the new rpc mock.
- Full unit suite ran green inside both lefthook pre-commit gates (no repo-wide regressions).
- grep confirms: `count: "exact", head: true` GONE from both stats blocks; `.eq("users.status", ...)` filter GONE from tenant-keys (only the explanatory comment references it); `select("rent_amount")` unbounded fetch GONE from unit-keys; MSW handlers present for both RPCs; no `as unknown as` / `: any` in either mapper.

## Threat Flags

None — no new security surface. The RPC identity guard (`auth.uid()` check) lives server-side in the 03-01 functions; the hooks pass the authenticated user's own id. The mapper Zod safeParse mitigates T-03-04 (malformed/drifted jsonb fails loudly). No package installs (T-03-SC N/A).

## Self-Check: PASSED

- All 5 created/summary files exist on disk.
- Both task commits (`21c6a46`, `61a872485`) present in git history.
