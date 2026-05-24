---
phase: 02-data-layer-rpc
plan: 01
subsystem: data-layer
tags: [schema-migration, rpc, mcp-applied, additive, polish-10-schema-half]
requirements-completed:
  - POLISH-10 (schema half — frontend wiring is plan 02-02, RLS test is plan 02-03)
completed: 2026-05-23
executor: inline (orchestrator — MCP tooling required orchestrator context)

key-files:
  created:
    - supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql
  modified:
    - src/types/supabase.ts (regenerated via mcp__supabase__generate_typescript_types)

decisions:
  - "D-02 implemented: additive `CREATE OR REPLACE FUNCTION get_dashboard_data_v2` extends `property_perf` with `'open_maintenance'` key via new `perf_open_maintenance` CTE"
  - "D-03 implemented: MCP `apply_migration` returned `{\"success\":true}`; `list_migrations` reported prod version `20260523223626` (local pre-rename was `20260523172457`); repo filename renamed via `mv` to match prod"
  - "D-06 sequence honored: (1) write file, (2) MCP apply, (3) reconcile filename, (4) regen types — in that order"
  - "Shared-CTE invariant preserved: `perf_open_maintenance` reuses `all_maintenance` (already owner-filtered) + joins to `maintenance_requests` via primary key to recover `unit_id` + joins to `all_units` (already filtered to `owner_properties`) — no second table scan added"
  - "`bun run db:types` script failed locally with `Unauthorized` (CLI not logged in); fell through to `mcp__supabase__generate_typescript_types` per the script's own error-message fallback hint — produced a clean autogen file"

metrics:
  duration: ~10 min (inline orchestrator execution including MCP auth flow)
  commits: pending — Wave 1 batched into one commit
  blocking_gates_cleared: 3 (T2 MCP apply, T3 filename reconcile, T4 types regen)

prod_state:
  rpc_function: public.get_dashboard_data_v2(p_user_id uuid) returns jsonb
  signature_unchanged: true
  smoke_test:
    query: "select jsonb_path_query_array(get_dashboard_data_v2('218000e4-3ae0-4c49-9591-a330fb32d246'::uuid), '$.property_performance[*].open_maintenance')"
    result: "[[0, 0, 0, 0, 0]]"
    interpretation: "5 property rows for synthetic owner e2e-owner-a@tenantflow.app, each emitting the new open_maintenance key. Values are 0 because the test data set has no open maintenance requests, but the KEY IS PRESENT for every row — proves the additive CTE + property_perf wiring works end-to-end."
---

# Phase 02 Plan 01: Additive RPC Migration — Execution Summary

## Outcome

POLISH-10 schema half closed. The `get_dashboard_data_v2` RPC now emits a per-property `open_maintenance` count inside the `property_performance` JSONB array. Frontend consumers (plan 02-02) wired this end-to-end to retire the hardcoded `0`s in `dashboard-data.ts`, `dashboard.tsx`, and `page.tsx` (current line numbers in final-state-post-cycles: `dashboard-data.ts:77`, `dashboard.tsx:101`, `page.tsx:106`).

## Tasks

| Task | Status | Evidence |
|------|--------|----------|
| T1 — Write migration file | DONE | `supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql` (552 lines). All 10 acceptance criteria PASS: 3 `perf_open_maintenance` mentions, 1 jsonb_key match, 3 `security definer`/`search_path` matches, 4 trend CTEs, 0 destructive DDL, signature unchanged. |
| T2 — `[BLOCKING]` MCP apply_migration | DONE | `mcp__supabase__apply_migration({"name":"phase2_open_maintenance_per_property", "query":...})` returned `{"success":true}`. Post-apply smoke via `mcp__supabase__execute_sql`: `get_dashboard_data_v2('218000e4...')` returns property_performance rows with `open_maintenance` keys. |
| T3 — `[BLOCKING]` Filename reconcile | DONE | `mcp__supabase__list_migrations` reported `version: "20260523223626"`. Local file `20260523172457_*.sql` renamed via `mv` to `20260523223626_*.sql`. Single file matches glob `*phase2_open_maintenance_per_property.sql`. |
| T4 — `[BLOCKING]` Regen `src/types/supabase.ts` | DONE | `bun run db:types` failed with `Unauthorized` (CLI not logged in). Fell through to `mcp__supabase__generate_typescript_types` per the script's documented fallback. 2896-line autogen file written. `bunx tsc --noEmit` exits 0. |

## D-02 Implementation Detail (Additive CTE)

The new `perf_open_maintenance` CTE was placed immediately after `perf_potential_revenues` and before `property_perf`:

```sql
perf_open_maintenance as (
  select
    u.property_id,
    count(*) filter (where am.status in ('open', 'in_progress'))::int as open_maintenance
  from all_maintenance am
  join maintenance_requests mr on mr.id = am.id
  join all_units u on u.id = mr.unit_id
  group by u.property_id
)
```

The PK join on `maintenance_requests` is required because the existing `all_maintenance` CTE projects only `(id, status, priority, created_at, completed_at)` — `unit_id` is dropped. Adding `unit_id` to `all_maintenance` would risk regression for the 9 other downstream consumers; the PK join is the minimum-additive way to reach the column without altering the existing CTE projection.

`property_perf` was extended with one new key in the `jsonb_build_object`:

```sql
'open_maintenance', coalesce(pom.open_maintenance, 0)
```

…plus a corresponding `left join perf_open_maintenance pom on pom.property_id = op.id`.

## D-03 Filename Reconcile

| Stage | Filename |
|-------|----------|
| Pre-apply (local) | `supabase/migrations/20260523172457_phase2_open_maintenance_per_property.sql` |
| Prod-assigned (from `list_migrations`) | `version: 20260523223626` |
| Post-rename (final) | `supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql` |

Drift: 5h11m forward (local was 17:24:57 UTC, prod recorded 22:36:26 UTC — consistent with the prod server's clock and the time required for the user to complete the MCP OAuth flow). Per `migration-mcp-prod-drift.md` memory, drift is expected after every MCP apply — reconcile is mandatory.

## D-06 Sequence Verification

Each step blocked the next; no step could execute against stale state:

1. Wrote local file with placeholder timestamp `20260523172457`.
2. `apply_migration` MCP call → prod accepts function REPLACE.
3. `list_migrations` → prod-assigned version surfaced.
4. `mv` → repo file aligned with prod.
5. `bun run db:types` → CLI fails → `mcp__supabase__generate_typescript_types` succeeds → `src/types/supabase.ts` reflects current prod schema.

If step 2 had failed, step 3-5 would not run. If step 3 had shown drift but reconcile was skipped, future `supabase db push` would attempt to re-apply the local file. If step 5 had run before step 2, the regen would have captured the OLD schema.

## Threat Model Verification

| Threat | Disposition | Evidence |
|--------|-------------|----------|
| T-02-01 EOP via `p_user_id` | mitigated | `owner_properties` still filters `where owner_user_id = p_user_id`; new CTE joins to `all_units` which transitively inherits that filter. The new CTE adds no escape hatch. |
| T-02-02 Info disclosure via new CTE | mitigated | The CTE joins `all_maintenance` (already `where owner_user_id = p_user_id`) → `maintenance_requests` (PK lookup, no `WHERE` widening) → `all_units` (already filtered to `owner_properties`). Plan 02-03's RLS test will pin this. |
| T-02-03 SQL injection | mitigated | `set search_path to 'public'` preserved (line 21 of file). No dynamic SQL, no `EXECUTE`, no string-concat in function body. |
| T-02-04 DoS (aggregate cost) | accepted | The PK join hits the `maintenance_requests` primary index, sub-millisecond. The new aggregate adds ~1 `count(*) filter(...) group by property_id` per RPC call. Sub-millisecond at expected scale (<1000 properties per owner). |
| T-02-05 Audit trail | accepted | Supabase MCP records `apply_migration` in `supabase_migrations.schema_migrations`. The `list_migrations` output (above) is the audit receipt. |

## Verification Against ROADMAP § Phase 2 Success Criteria

| SC | Status at end of Plan 02-01 | Final Phase-2 status |
|----|------------------------------|----------------------|
| #1 Real per-property `open_maintenance` in RPC | DONE (schema half) — smoke test confirmed all 5 ownerA rows | DONE end-to-end after plan 02-02 wired the frontend pipeline + cycle-2 migration `20260523234221` also emitted address/property_type/derived status to align with the type contract |
| #2 No hardcoded `0` for `collectionRate` | NOT YET (Plan 02-02 scope) | DONE in 02-02 |
| #3 Dual-client RLS test in `tests/integration/rls/` | NOT YET (Plan 02-03 scope) | DONE in 02-03; cycle-4 P0 fix retargeted Test 2 from `toEqual([])` to expect `error.message === "Unauthorized"` after migration `20260524001408` added the `auth.uid() = p_user_id` guard |
| #4 `bun run test:integration` passes | NOT YET (Plan 02-03 scope; CI on PR push) | DONE in CI via the `rls-security` workflow |

## Post-Plan Phase-2 follow-on migrations

The original Plan 02-01 migration `20260523223626` shipped the additive `perf_open_maintenance` CTE + `open_maintenance` key. Cycle reviews surfaced two further migrations that became part of Phase 2:

- **`20260523234221_phase2_property_perf_address_status_type.sql`** (cycle-2 P0 fix): the pre-existing `PropertyPerformanceRpcResponse` type declared `status`, `address`, `property_type` as required, but the RPC had NEVER emitted them. The cycle-1 typed `mapPropertyPerformanceStatus` upgrade turned that silent type-lie into a runtime throw. Cycle-2 fix: extend the RPC to actually emit those three fields (address from `properties.address_line1`, property_type from `properties.property_type`, status derived server-side using the same `NO_UNITS/vacant/FULL/PARTIAL` rules as `property-stats-keys.ts:47-56`).

- **`20260524001408_phase2_dashboard_rpc_auth_guard.sql`** (cycle-4 P0 security fix): the RPC was SECURITY DEFINER but had no `auth.uid() = p_user_id` guard, so any authenticated user could pass another owner's UUID and receive their full dashboard payload. Cycle-4 fix: add the explicit guard matching the established pattern from `20260306190000_consolidate_stats_rpcs.sql`. Cross-owner calls now raise `Unauthorized`.

All three Phase 2 migrations are `CREATE OR REPLACE FUNCTION` (idempotent), SECURITY DEFINER + `search_path = public` preserved, GRANTs preserved. Migration #3 is the canonical end-state.

## Issues / Deviations

1. **`bun run db:types` failed with `Unauthorized`** — local Supabase CLI not logged in. Resolution: used the script's documented fallback (`mcp__supabase__generate_typescript_types`) and wrote the result to `src/types/supabase.ts` via a small python helper that unwrapped the `{"types": "..."}` JSON envelope. The autogen file is otherwise identical in shape to a CLI-driven regen.

2. **No deviation from D-01..D-06 lock.** Migration body is the locked design; reconcile + regen sequence is the locked order.

## Carry-forward to Plan 02-02

- `src/types/supabase.ts` is regenerated and committed (this plan's work).
- The new RPC return now includes `'open_maintenance'` in each `property_performance` row. Plan 02-02 wires this through:
  - `src/types/database-rpc.ts` (or `src/types/core.ts`) — add `open_maintenance: number` to the row type
  - `src/hooks/api/use-owner-dashboard.ts:~232-278` (planning-time range; final mapper landed at `:277`) — mapper reads `row.open_maintenance ?? 0`
  - `src/app/(owner)/dashboard/page.tsx:~95-108` — intermediate re-mapper carries field forward via `?? 0` at `:106`
  - `src/components/dashboard/dashboard-data.ts:77` — `transformDashboardData` reads `prop.open_maintenance ?? 0`
  - `src/components/dashboard/dashboard.tsx:101` — inline transform reads `prop.openMaintenance` (no fallback — section-typed PropertyPerformanceItem.openMaintenance is required)
- Plan 02-02 also closes POLISH-11 (drop `collectionRate` from `DashboardMetrics`).
