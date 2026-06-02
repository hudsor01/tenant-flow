---
phase: 2
phase_name: Data Layer & RPC
milestone: v2.0
slug: data-layer-rpc
status: locked
discussed: 2026-05-23
depends_on: [1]
requirements: [POLISH-10, POLISH-11]
---

# Phase 2 — Data Layer & RPC: CONTEXT

## Goal
Make the dashboard's data inputs honest: surface real per-property `open_maintenance` counts through an additive migration to `get_dashboard_data_v2`, and resolve the long-standing `collection_rate` placeholder per the v1.0 honesty principle. RLS-tested end-to-end.

## Domain
Backend RPC surface that feeds the owner dashboard. NOT a UI phase. NOT a refactor of the data layer. Strictly:
- Additive Postgres migration (no destructive drops)
- One RPC function rewrite (`get_dashboard_data_v2`) to add `open_maintenance` per property
- Schema type cleanup on the frontend (`DashboardMetrics`, `PropertyPerformanceItem`)
- Integration test against prod confirming RLS owner-isolation

OUT OF SCOPE:
- KPI tile rendering (→ Phase 3)
- DataTable column wiring (→ Phase 5)
- Any UI change (Phase 2 ships invisible-to-user changes; the dashboard renders identically after merge but with a real `open_maintenance` value behind the prop and a deleted `collectionRate` field).

## Locked Decisions

### D-01: Drop `collection_rate` entirely (product decision)
The TenantFlow product does NOT facilitate rent payments — no payment events, no rent ledger, no collection data exists in the schema. The current `collectionRate: 0` hardcoded value violates the v1.0 honesty principle ("never fabricate"). Resolution: **drop the field**.

Concrete actions in Phase 2:
- Remove `collectionRate: number` from `DashboardMetrics` interface (`src/types/sections/dashboard.ts:39`)
- Remove the two hardcoded `collectionRate: 0` lines in `src/app/(owner)/dashboard/page.tsx:65,82`
- Any downstream consumer reading `metrics.collectionRate` (verify via grep before deletion)

NOT computing a synthetic substitute (e.g., active-leases/total-units). The KPI label was "collection rate" — that's payments data — and computing it from leases would ship a metric whose name no longer matches its definition.

### D-02: Additive `open_maintenance` field in existing RPC (technical decision)
Rather than spinning a new RPC or shipping the column ship-hidden, extend `get_dashboard_data_v2` to compute `open_maintenance` per property within the existing `property_perf` aggregate CTE. The existing RPC already scans `maintenance_requests` once via the `all_maintenance` CTE. Joining it to `owner_properties` adds one more aggregate, not a second table scan.

**Migration approach:**
- Single additive migration file: `supabase/migrations/{TIMESTAMP}_phase2_open_maintenance_per_property.sql`
- `CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(...)` — the function is `SECURITY DEFINER` and the only call site, so `REPLACE` is safe.
- New CTE: `perf_open_maintenance` aggregates `count(*) FILTER (WHERE status IN ('open', 'in_progress')) AS open_maintenance` per property_id, joining `all_maintenance` to a units→properties mapping
- New JSON key `'open_maintenance', coalesce(pom.open_maintenance, 0)` in `property_perf.jsonb_build_object(...)`
- Frontend type addition: `PropertyPerformance.open_maintenance: number` in `src/types/core.ts` (verify before editing)
- Fetcher boundary mapper update at `src/hooks/api/use-owner-dashboard.ts:232-265` — read the new `open_maintenance` field
- `transformDashboardData` reads `prop.open_maintenance` for `PortfolioRow.maintenanceOpen` instead of the current hardcoded `0`

**Why additive vs new RPC:** the existing v2 RPC scans tables once via shared CTEs. A separate RPC would re-scan `maintenance_requests`. Keep the shared-scan invariant.

### D-03: Reconcile MCP-applied timestamp drift on the migration
Per `migration-mcp-prod-drift.md` memory: applying via `mcp__supabase__apply_migration` produces a prod-side timestamp that may not match the repo filename. After applying, run `mcp__supabase__list_migrations` and rename the repo file to the prod timestamp. Plan task explicitly does the rename + commit.

### D-04: RLS integration test scope
Dual-client ownerA/ownerB pattern matching existing RLS tests in `tests/integration/rls/`. Two assertions:
1. ownerA querying `get_dashboard_data_v2(<ownerA.id>)` returns only ownerA's properties with their actual `open_maintenance` counts
2. ownerA querying `get_dashboard_data_v2(<ownerB.id>)` either returns zero rows OR errors with permission denial (whichever the RPC's SECURITY DEFINER definition enforces — likely "empty result because no rows match the owner filter")

Use synthetic test owners `e2e-owner-a@tenantflow.app` + `e2e-owner-b@tenantflow.app` per the existing pattern. Test file: `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts`.

### D-05: Test must pass against prod, not local
Per CLAUDE.md: integration tests hit prod. Run `bun run test:integration` against prod after MCP applies the migration. Local Supabase is NOT a substitute (RLS behavior can differ subtly).

### D-06: No commit of generated `src/types/supabase.ts` until migration lands
The `bun run db:types` regen is atomic but it pulls from prod schema. Sequence:
1. Apply migration via MCP
2. Reconcile filename per D-03
3. `bun run db:types` to regen types
4. Update frontend code that consumes `PropertyPerformance.open_maintenance`
5. Update RLS test
6. Single PR

## Canonical Refs (MANDATORY)
- `.planning/PROJECT.md` — milestone vision, value statement
- `.planning/REQUIREMENTS.md` — POLISH-10 + POLISH-11 spec
- `.planning/ROADMAP.md` § Phase 2 — success criteria
- `.planning/phases/01-foundation-dedup/01-CONTEXT.md` § deferred — explicit hand-off of Phase 2 carries
- `.planning/phases/01-foundation-dedup/01-UI-SPEC.md` — design contract (Phase 2 doesn't add UI but inherits the contract for any incidental touches)
- `supabase/migrations/20260301070000_unified_dashboard_rpc.sql` — current RPC; the file Phase 2 modifies (via additive migration, not in-place edit)
- `src/hooks/api/use-owner-dashboard.ts:232-265` — fetcher boundary mapper (the only frontend file that reads RPC field names)
- `src/types/sections/dashboard.ts:38-57` — `DashboardMetrics.collectionRate` + `PropertyPerformanceItem.openMaintenance`
- `src/app/(owner)/dashboard/page.tsx:60-110` — current hardcoded-0 sites
- `tests/integration/rls/bulk-import-create-lease.test.ts` — reference RLS test pattern (dual-client ownerA/ownerB)
- `.claude/projects/-Users-richard-Developer-tenant-flow/memory/migration-mcp-prod-drift.md` — MUST follow the prod-timestamp reconcile protocol
- `.claude/projects/-Users-richard-Developer-tenant-flow/memory/feedback_user_directive_is_the_directive.md` — user-directive precedence rule (applies to gray-area resolution)
- `CLAUDE.md` § Database, § Security, § Testing — RLS conventions, integration-test rules, `bun run db:types` atomicity

## Code Context

### Reusable Assets
- **`get_dashboard_data_v2` shared-CTE pattern** — `all_maintenance`, `owner_properties`, `all_units` are already declared CTEs in the RPC. Phase 2 reuses them via a new join, not new scans.
- **`fetchOwnerDashboardData` mapper** (`src/hooks/api/use-owner-dashboard.ts:218-266`) — the single seam translating RPC snake_case → camelCase + applying `?? []` fallbacks. New field gets one line.
- **`mapDocumentRow`-style boundary mapper pattern** — the project's idiom for typed RPC outputs; new `PropertyPerformance.open_maintenance` integrates into the existing mapper without `as unknown as`.
- **`tests/integration/rls/` infrastructure** — dual-client ownerA/ownerB authenticated session helpers exist; new test extends the existing pattern.

### Established Patterns
- **Migrations folder convention:** `supabase/migrations/YYYYMMDDHHmmss_description.sql` — Phase 2 migration follows this format. After MCP apply, prod timestamp may overwrite the repo filename (per `migration-mcp-prod-drift.md`).
- **`CREATE OR REPLACE FUNCTION`** for `get_dashboard_data_v2` — the canonical pattern for updating an existing SECURITY DEFINER function without breaking callers.
- **`SET search_path = public`** required on every SECURITY DEFINER function — already present in current RPC, preserve.
- **Integer cast on `count(*)` aggregates** — current RPC casts `::int`; preserve to keep frontend type assumptions intact.
- **Synthetic test owners only** — never personal credentials, never local Supabase substitution for RLS tests (per CLAUDE.md).

### Integration Points
- **`PropertyPerformance` type** at `src/types/core.ts` — Phase 2 adds `open_maintenance: number` (verify field doesn't already exist). The mapper at `use-owner-dashboard.ts:232-249` reads it.
- **`transformDashboardData`** at `src/components/dashboard/dashboard-data.ts:46-66` — the `portfolioRows` mapping currently emits `maintenanceOpen: 0` (hardcoded). After Phase 2 it reads `prop.open_maintenance`. **This is the visible-to-frontend change** that breaks the "Phase 2 ships no UI change" claim slightly — the maintenance column in the Portfolio table will start showing real numbers instead of 0/empty. Acceptable per success criterion #1.
- **`page.tsx` intermediate re-mapper** at `src/app/(owner)/dashboard/page.tsx:97-110` — currently re-maps `prop.openMaintenance` from raw to section-typed. Phase 2 wires this end-to-end (the parent section type `PropertyPerformanceItem.openMaintenance: number` is already defined; only the value source changes from hardcoded 0 to real RPC value).
- **`useDashboardStore` filters** — `statusFilter` doesn't touch maintenance; safe.

## Visible Changes At Merge
1. Portfolio table "Maintenance" column starts rendering real per-property open-maintenance counts instead of 0/empty.
2. `collectionRate` removed from `DashboardMetrics`; no UI surfaced this field, so dashboard layout is unchanged.
3. Per-property `open_maintenance` count exposed in `get_dashboard_data_v2` JSONB response.

The dashboard does NOT add new UI surfaces; Phase 3 owns KPI bento, Phase 4 owns charts, Phase 5 owns DataTable.

## Deferred (for future phases)
- **Maintenance trend per property** — Phase 2 ships only the open count, not historical trends. Trend lines on the maintenance column would be Phase 3 (sparkline) or Phase 4 (chart) territory.
- **Filter Portfolio table by maintenance status** — Phase 5 DataTable migration introduces faceted filters; "has open maintenance" filter is a Phase 5 candidate.
- **Per-tenant maintenance counts** — not in this milestone's scope at all.
- **`get_dashboard_data_v2` versioning to `_v3`** — not needed for Phase 2 (additive, backwards-compatible).
