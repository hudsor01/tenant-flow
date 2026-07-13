# Phase 25 — Perfect-PR Review Log

**Gate:** two consecutive zero-finding review cycles. **Result: MET** (cycles 8 + 9).
**Reviewed:** 2026-07-02 → 2026-07-04. Every finding verified against the live Supabase DB; every fix proven with rolled-back before/after checks + repo↔prod byte-parity.

## Why the review was large
CRIT-03/04 introduced `'inactive'` as a valid `units.status` / `leases.lease_status` (soft-delete). Before this phase that value was impossible, so every place that counted units/leases in a denominator/total/quota — and the write-side status-sync trigger — was silently "correct by impossibility." Enabling soft-delete gave it a wide blast radius. The initial corrective migration (215602) was under-scoped ("total_units only"), which seeded the follow-on findings. Each review cycle's lens caught a different subset.

## Findings by cycle (all fixed + verified)
| Cycle | Lens | Finding | Fix |
|-------|------|---------|-----|
| 1 (money) | wizard + lease-template | CLEAN | — |
| 1 (migration) | occupancy denominators | `get_dashboard_data_v2` missing from the audit (main dashboard occupancy) | folded into 215602 (25-03) |
| 2 | exhaustive sweep | `get_occupancy_trends_optimized` (5th occupancy RPC), `enforce_unit_plan_limit` (quota counts deleted units), 3 dead-but-callable RPCs | 222955 |
| 2 | completeness | `get_user_profile` (units/properties_count), `get_lead_paint_compliance_report` | 224429, 224917 |
| 3 | per-aggregate | `get_dashboard_stats` unit side: `avg_rent`/`total_potential_rent`/`property_unit_counts.tot` (215602 fixed only `total_units`) | 225850 |
| 4 | exhaustive re-sweep | CLEAN | — |
| 5 (holistic) | write-side | `sync_unit_status_from_lease` resurrects a soft-deleted unit on lease terminate; soft-deleting an active lease orphans its unit `occupied`; `units/page.tsx` missing occupied-delete guard | 20260703144003 + units/page.tsx |
| 6 | comprehensive | CLEAN | — |
| 7 | lease side | `get_dashboard_stats` lease side: `total_leases` + `tenant_agg` EXISTS (tenants.total is consumed) | 20260703225238 |
| 8 (SQL raw-scan) | comprehensive | CLEAN | — |
| 9 (frontend/RLS/cache) | comprehensive | CLEAN | — |

## Final state
- **9 migrations** (up from the 5 plans' 3): 214657, 214706, 215602, 222955, 224429, 224917, 225850, 20260703144003, 20260703225238. All applied to prod, repo↔prod byte-parity, grants/search_path/SECURITY DEFINER preserved on every redefinition.
- Definitive completeness proof: `get_dashboard_data_v2` = pre-filtered-CTE pattern (2 guarded raw scans); `get_dashboard_stats` = per-aggregate guards (all present); all other unit/lease functions verified clean. Every unit/lease denominator/total/quota excludes `'inactive'`.
- Write-side: trigger never resurrects a soft-deleted unit + frees the unit on active→inactive; RLS lets an owner soft-delete their own row (not cross-owner); cache invalidation drops soft-deleted rows from lists + dashboard.
- Gates: typecheck 0, lint 0, 101,918 unit tests green. Prod: 0 inactive units, 0 inactive leases.

## Out of scope (tracked elsewhere, non-gating)
- `unitQueries.byProperty` invalidation gap (property-detail units table) — pre-existing, already tracked as **PROP-01 (Phase 30)**.
- The `p.status <> 'inactive'` PROPERTY soft-delete filter in the performance/trend RPCs — deferred to **DATA-02 (Phase 30)** by 215602's own header.
