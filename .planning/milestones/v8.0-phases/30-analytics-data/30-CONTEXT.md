# Phase 30: Analytics & Data-Layer Correctness - Context

**Gathered:** 2026-07-08 (exhaustive live-DB research; every RPC shape + constraint verified against prod `bshjmbshupiibfiewpxb`).
**Status:** Ready for planning
**Source:** 2026-07-02 bug hunt (DATA-01..03, PROP-01..03). Prod `leases` currently all `draft` (some tiles read 0 today) — the logic defects are real regardless.

<domain>
## Phase Boundary
Restore analytics + data-layer correctness: occupancy analytics parsing (DATA-01), soft-delete exclusion in the remaining per-property RPCs (DATA-02), the lease "Expired" stat (DATA-03), and three property/unit data-flow bugs (PROP-01 invalidation, PROP-02 dashboard key, PROP-03 virtualizer). Builds on Phases 25-29. **Migrations:** DATA-02 (`_with_trends` + `_trends` recreate) and DATA-03 (`get_lease_stats`). Everything else is frontend. **Out of scope:** PROP-04/05 (Phase 32); the deeper lease-analytics mis-wire (see DATA-01 note — capture, don't fix here beyond occupancy).
</domain>

<decisions>
## Implementation Decisions (verified live)

### DATA-01 — occupancy analytics render empty (FRONTEND, no migration)
`get_occupancy_trends_optimized(p_owner_id, p_months=12)` RETURNS a **jsonb ARRAY** (COALESCE(jsonb_agg(...), '[]')), elements `{month:"YYYY-MM", occupancy_rate:0-100, total_units:int, occupied_units:int}`, ordered `month_date DESC`. It has NO `by_property`/`metrics`/`trends`/top-level `total_units`. The consumers treat it as an OBJECT → every field undefined → empty:
- `analytics-keys.ts:52-62` `fetchOccupancyTrends` returns `data ?? {}` (wrong fallback + type `unknown`).
- `use-analytics.ts:89-112` `occupancyPageData` reads `raw.metrics/raw.trends/...` off the array → all undefined.
- `report-analytics-keys.ts:106-139` `occupancyMetrics` reads `result?.total_units/occupied_units/occupancy_rate` off the array → zeros.
- `use-analytics.ts` `leasePageData`/`overviewPageData` → `mapLeaseAnalytics` does `leaseAnalyticsRawSchema.safeParse(raw)` (a `z.object`) on an array → fails → `emptyLeaseAnalytics()`.
**LOCKED:** (a) `fetchOccupancyTrends` returns the ARRAY via the existing `jsonArrayOrEmpty<Record<string,unknown>>(data)` helper (`src/lib/rpc-shape.ts:54`), typed `Array<Record<string,unknown>>`. (b) Add an array-aware occupancy mapper (mirror `mapLeaseAnalytics`) mapping each row → `OccupancyAnalyticsPageData.trends` (`src/types/analytics-page-data.ts:108-113`) and DERIVING `metrics` (currentOccupancy/totalUnits/occupiedUnits) from element [0] (latest, since DESC). (c) `occupancyMetrics` derives totals from element [0]; `byProperty` stays `[]` (this RPC has no per-property breakdown — genuinely absent). (d) `occupancyPageData` uses the new mapper.
**DATA-01 SCOPE NOTE (locked):** `leasePageData`/`overviewPageData` are MIS-WIRED — they call `mapLeaseAnalytics` on the OCCUPANCY RPC, which never emits lease-financial fields (profitability/lifecycle/statusBreakdown). DATA-01's literal scope is "occupancy analytics render real data." So: make these two derive OCCUPANCY data from the array (trends + occupancy metrics) — the data the RPC actually provides — and leave the lease-financial sub-shapes empty. Do NOT invent a lease-analytics RPC here. CAPTURE the lease/overview-analytics-fed-occupancy-RPC mis-wire as a follow-up (new requirement, e.g. DATA-04 or a MISC item) — it needs a real lease-analytics data source that doesn't exist. Flag it in the summary; don't over-build.
**Verify:** the occupancy analytics page renders the monthly trend series + current-occupancy metrics from real data (not zeros).

### DATA-02 — soft-deleted properties leak into `_with_trends`/`_trends` (MIGRATION)
`get_property_performance_analytics` is ALREADY fixed (Phase 29 — has the predicate + numeric) — **DO NOT TOUCH IT.** The other two still lack `p.status <> 'inactive'`:
- `get_property_performance_with_trends(p_user_id, p_timeframe, p_limit)` — `owner_properties` CTE `WHERE p.owner_user_id = p_user_id` (no status filter). Consumed live by `property-stats-keys.ts:170` (real UI impact). Revenue cols are hardcoded `0::bigint`; it does NOT sum expenses → NO `::bigint` expense-truncation to fix, only the predicate.
- `get_property_performance_trends(p_user_id)` (jsonb) — same missing predicate; hardcodes revenue 0; no expense sum; NO live `.rpc()` consumer (dead-but-defined) but the requirement lists it — recreate for consistency + to close the latent leak.
**LOCKED:** one migration `CREATE OR REPLACE`ing BOTH functions, adding `AND p.status <> 'inactive'` to each `owner_properties` CTE WHERE. Preserve SECURITY DEFINER + `search_path=public` + the `auth.uid()` guard + the return signatures (no type change → CREATE OR REPLACE is fine, no DROP needed). Re-issue grants only if the recreate drops them (CREATE OR REPLACE keeps them). Reconcile the prod-assigned filename via `list_migrations`.
**Verify:** live — both functions carry the predicate; a soft-deleted (`status='inactive'`) property emits no row.

### DATA-03 — `get_lease_stats` "Expired" counts the wrong status (MIGRATION + frontend union)
Live `get_lease_stats` (from `20260306190000`) computes `'expiredLeases', count(*) filter (where lease_status = 'ended')` — but the `expire-leases` cron (`20260222120000`) sets naturally-lapsed leases to `lease_status = 'expired'` (NOT 'ended'). `leases_lease_status_check` allows `draft,pending_signature,active,ended,terminated,expired,inactive`. And `src/types/core.ts:13` `LeaseStatus` union is missing `'expired'`.
**LOCKED:** (a) migration `CREATE OR REPLACE get_lease_stats` changing the expiredLeases filter `'ended'` → `'expired'` (everything else unchanged; preserve SECURITY DEFINER/search_path/auth guard). (b) frontend: add `| "expired"` to the `LeaseStatus` union in `core.ts:13`. (c) RIPPLE (like MAINT-06): widening `LeaseStatus` touches every exhaustive consumer — lease/tenant status badge + label maps, any `switch(status)`/`Record<LeaseStatus,...>` (e.g. `TenantLeaseStatusBadge` in tenant-table-helpers, `LeaseStatusBreakdown` in analytics.ts). Add `'expired'` handling to ALL lockstep sites so typecheck stays green + no unhandled/missing-badge case. Grep every `LeaseStatus` consumer.
**Verify:** live — get_lease_stats counts `lease_status='expired'`; typecheck green after the union widening (all lockstep sites cover 'expired').

### PROP-01 — property-detail units table stale after unit mutations (FRONTEND)
`property-units-table.tsx:59` reads `unitQueries.byProperty(propertyId)` = `["units","by-property",id]`, keyed off `unitQueries.all()` = `["units"]`, NOT `unitQueries.lists()` = `["units","list"]` (sibling branches). The 3 mutations in `use-unit.ts` (create :74-89, update :94-114, delete :119-137) invalidate `unitQueries.lists()` — which does NOT prefix-match `by-property`.
**LOCKED:** add `unitQueries.byProperty(property_id)` to create/update invalidation (they carry `property_id`); for delete (receives only the id, no property_id) invalidate the broad `unitQueries.all()` prefix `["units"]` (covers list + by-property + listByProperty). Simplest consistent option: invalidate `unitQueries.all()` in all three.
**Verify:** creating/editing/deleting a unit refreshes the property-detail units table.

### PROP-02 — property rename doesn't refresh the dashboard (FRONTEND)
`use-property-mutations.ts:112` `useUpdatePropertyMutation` invalidates `ownerDashboardKeys.analytics.stats()` = `["owner-dashboard","analytics","stats"]` — a key NOTHING queries (only ever an invalidation target). The dashboard reads `ownerDashboardKeys.analytics.pageData()` = `["owner-dashboard","analytics","page-data"]`. The sibling create/delete property mutations correctly use `ownerDashboardKeys.all`.
**LOCKED:** replace `ownerDashboardKeys.analytics.stats()` with `ownerDashboardKeys.all` (prefix-matches page-data), matching create/delete.
**Verify:** renaming a property refreshes the dashboard.

### PROP-03 — virtualizer rows not positioned (FRONTEND, 2 tables + 2 row components)
`property-table.tsx:192-213` + `tenant-table.tsx:190-211`: the `<tbody>` has `height:totalSize; position:relative` (correct spacer), but rows use only `virtualRow.index` — `.start`/`.size` are never passed down, and `property-table-row.tsx`/`tenant-table-row.tsx` `<tr>`s have no positioning. So scrolled rows stack at the top of the tbody (offset/blank).
**LOCKED:** pass the `virtualRow` to each row and absolutely position it against the relative tbody: `position:absolute; top:0; left:0; width:100%; height:virtualRow.size; transform:translateY(virtualRow.start)` + `data-index`. **CAVEAT (locked approach):** `position:absolute` on a `<tr>` inside a real `<table>` is browser-unreliable — use the robust TanStack table-virtualization pattern: make the `<tr>` (and its `<td>`s) `display:flex` alongside the absolute+translateY so column widths still align with the `<thead>` (shared flex-basis/width per column). Both tables + both row components move together (identical structure). Keep the existing column widths aligned between thead and the flex rows.
**Verify:** scrolling the property + tenant tables shows the correct rows at the right positions (no offset/blank); columns stay aligned with the header.

### Claude's Discretion
- DATA-01 occupancy mapper location (new fn in `analytics-mappers.ts`).
- PROP-01 broad (`unitQueries.all()`) vs targeted invalidation — prefer the broad prefix for all 3 (simplest + correct).
- PROP-03 exact flex layout (grid-template vs flex-basis per column) — whichever keeps thead/row alignment; optionally factor a shared virtualized-row helper (both must move together).
- DATA-03 the set of LeaseStatus lockstep sites (grep-driven).
</decisions>

<canonical_refs>
## Canonical References + live facts
- DATA-01: `src/hooks/api/query-keys/analytics-keys.ts` (fetchOccupancyTrends), `use-analytics.ts` (occupancyPageData/leasePageData/overviewPageData), `query-keys/analytics-mappers.ts` (mapLeaseAnalytics + new occupancy mapper), `report-analytics-keys.ts:106` (occupancyMetrics), `src/types/analytics-page-data.ts`, `src/lib/rpc-shape.ts:54` (jsonArrayOrEmpty). RPC returns jsonb ARRAY `{month,occupancy_rate,total_units,occupied_units}` DESC.
- DATA-02: `get_property_performance_with_trends` (consumed by property-stats-keys.ts:170) + `get_property_performance_trends` (no consumer) — add `p.status <> 'inactive'`. NOT `_analytics` (Phase-29 done).
- DATA-03: `get_lease_stats` (from `20260306190000`, filter 'ended'→'expired'); `src/types/core.ts:13` LeaseStatus union (+'expired'); cron `20260222120000` sets 'expired'; consumer `lease-keys.ts`.
- PROP-01: `src/hooks/api/use-unit.ts` (3 mutations), `unit-keys.ts` (byProperty vs lists), `property-units-table.tsx:59`.
- PROP-02: `src/hooks/api/use-property-mutations.ts:112`, `use-owner-dashboard.ts:175` (reads pageData), `owner-dashboard-keys.ts`.
- PROP-03: `property-table.tsx` + `property-table-row.tsx` + `tenant-table.tsx` + `tenant-table-row.tsx`; `@tanstack/react-virtual` useVirtualizer.
- CLAUDE.md: migrations via MCP + reconcile filename; CREATE OR REPLACE keeps grants (no return-type change on DATA-02/03); `text`+CHECK statuses; mutations invalidate related keys + ownerDashboardKeys.all; virtualizer for table lists.
</canonical_refs>

<specifics>
## Interactions
- DATA-03 union widening ripples to all LeaseStatus lockstep sites (badges/labels/switches) — same discipline as MAINT-06; grep + cover 'expired' everywhere.
- DATA-01 ↔ lease/overview analytics mis-wire: fix occupancy parsing; capture the lease-analytics-fed-occupancy-RPC mis-wire as a follow-up (no lease-analytics data source exists) — don't over-build.
- PROP-02: swapping to ownerDashboardKeys.all closes a double gap (neither .all nor pageData was invalidated before).
- DATA-02: CREATE OR REPLACE (no return-type change) → keeps grants, no DROP. Reconcile prod timestamp.
- PROP-03: both tables share the identical broken structure + correct tbody spacer — one flex-row pattern, both move together.
</specifics>

<deferred>
## Deferred (tracked elsewhere)
- The lease/overview-analytics mis-wire (fed the occupancy RPC; needs a real lease-analytics source) — capture as a follow-up requirement; DATA-01 scopes to occupancy.
- PROP-04/05 → Phase 32. Anything not in DATA-01..03 / PROP-01..03.
</deferred>

---
*Phase: 30-analytics-data*
