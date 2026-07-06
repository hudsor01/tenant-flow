# 25-03 SUMMARY — CRIT-03: Restore unit delete (soft-delete via `inactive`)

**Status:** COMPLETE (all verifications pass; prod left exactly as found)
**Requirement:** CRIT-03

## What was done

`unitMutations.delete` already wrote `.update({ status: "inactive" })`, but the live
`units_status_check` rejected `'inactive'` (23514) so every unit delete failed 100% of the
time. Added `'inactive'` to the CHECK (soft-delete, preserves cascade-linked lease financials),
then corrected every occupancy DENOMINATOR that counted all units so a soft-deleted unit no
longer inflates Total Units / deflates Occupancy Rate.

## Migrations (prod-reconciled filenames)

| File | Prod version | Purpose |
|------|--------------|---------|
| `supabase/migrations/20260702214657_add_inactive_to_units_status_check.sql` | 20260702214657 | `units_status_check` += `'inactive'` (idempotent DROP IF EXISTS + ADD) |
| `supabase/migrations/20260702215602_exclude_inactive_from_occupancy_stats.sql` | 20260702215602 | Corrective RPC redefinition — all 4 functions in ONE migration |

The corrective migration **owns `get_dashboard_data_v2`** (the main `/dashboard` RPC) for BOTH
CRIT-03 and CRIT-04, so plan 25-04 does not re-touch it.

## Exact predicate added to each RPC (nothing else changed)

- **`get_dashboard_data_v2`** — `all_units` CTE: `+ and u.status <> 'inactive'`; `all_leases`
  CTE: `+ and l.lease_status <> 'inactive'`. (Units are counted with no LEFT JOIN → no NULL
  rows → plain `<>` is a clean no-op on clean data.)
- **`get_property_performance_analytics`** — occupancy DENOMINATOR only:
  `NULLIF(COUNT(*)::numeric,0)` → `NULLIF(COUNT(*) FILTER (WHERE pu.unit_status IS DISTINCT FROM 'inactive')::numeric,0)`. Numerator `= 'occupied'` untouched.
- **`get_property_performance_with_trends`** — occupancy DENOMINATOR only:
  `NULLIF(COUNT(*)::numeric,0)` → `NULLIF(COUNT(*) FILTER (WHERE u.status IS DISTINCT FROM 'inactive')::numeric,0)`.
- **`get_dashboard_stats`** — `total_units` count only:
  `COUNT(*)::int AS total_units` → `COUNT(*) FILTER (WHERE u.status <> 'inactive')::int AS total_units`.

**Why `IS DISTINCT FROM` for the two perf RPCs:** their denominator is over `properties LEFT JOIN
units`, so a unit-less property yields a phantom NULL-status row. Plain `<> 'inactive'` drops that
NULL row (denominator 1→0) which flips a zero-unit property's `occupancy_rate` from `0.00` to `0`
(numerically identical but not byte-identical). `IS DISTINCT FROM 'inactive'` keeps the NULL row
counted exactly as the original `COUNT(*)` did — a **true byte-identical no-op on clean data** —
while still excluding real soft-deleted units. This is the project's established IS-DISTINCT-FROM
guard pattern. (First applied with `<>`, verified the only delta was `0.00`→`0` on zero-unit
properties, then switched to `IS DISTINCT FROM` and re-verified byte-identity.)

## Source filter audit — NO edits required

`grep -rn 'from("units")' src/` → every list-style unit read already excludes inactive or scopes
to a specific status:
- `unit-keys.ts` `list` (`.neq("status","inactive")` default / `.eq(status)`), `listByProperty`
  (:116), `byProperty` (:164) — all filter. `detail(id)` (:138) single-row, intentionally unfiltered.
- `get_unit_stats` (migration 20260606041458) already filters `status != 'inactive'` for `total`
  and `total_potential_rent`; other tiles count by specific status.
- `lease-creation-wizard.tsx:106` dropdown → `.eq("status","available")` (inactive impossible).
- `selection-step.tsx:110` → `.eq("id",…).single()` single-row.
- `property-stats-keys.ts:126` → `.eq("status","occupied")` count (inactive impossible).
- `expense-keys.ts:202` → units→maintenance→expenses financial JOIN; **intentionally unfiltered**
  so a soft-deleted unit's historical expenses are still retained (matches financial-retention intent).
- `bulk-import-config.ts:131` → INSERT (write).

## Verification (live prod, exact numbers)

### 1. Constraint now includes `'inactive'`
`CHECK ((status = ANY (ARRAY['available'::text,'occupied'::text,'maintenance'::text,'reserved'::text,'inactive'::text])))`

### 2. Redefinition-correctness (outputs IDENTICAL on clean data, zero inactive)
Full-output `md5` fingerprints, OLD fn vs NEW fn, on owner e2e-owner-a, both (a) pure real data and
(b) a rich test shape (property with 1 occupied + 1 available unit + 1 active lease → 50% occupancy):

| RPC | rich-shape md5 (old==new) | pure-real md5 (restored==original) |
|-----|--------------------------|-------------------------------------|
| get_dashboard_data_v2 | `1f68c05c…` ✅ | `01f20f4c…` ✅ |
| get_dashboard_stats | `a1f3fa6c…` ✅ | `5a5d9453…` ✅ |
| get_property_performance_analytics | `a8cd8055…` ✅ | `33737388…` ✅ |
| get_property_performance_with_trends | `6029e86d…` ✅ | `05f8fc65…` ✅ |
| get_unit_stats | `e2600770…` ✅ | `1827a9de…` ✅ |
| get_lease_stats | `727825a3…` ✅ | `6c90fbf4…` ✅ |

Strict source-fidelity gate: applied `pg_get_functiondef` md5 == machine-derived (`replace()` of the
live original + ONLY the predicate) for all four → confirms **only the predicate was added, every
other byte preserved**.

### 3. Behavior proof — soft-delete a disposable test unit (AVL-1, vacant, on a 2-unit test property)
UPDATE `status='inactive'` **succeeded (no 23514)**. Occupancy adjusts as if the unit were removed:

| Metric | Before | After |
|--------|--------|-------|
| test-property occupancy — ddv2 / ppa / ppwt | 50.00 | **100.00** |
| test-property total_units — ddv2 | 2 | **1** |
| owner-wide units total — ddv2 | 3 | **2** |
| owner-wide units occupancyRate — ddv2 | 33.33 | **50.00** |
| owner-wide units total — get_dashboard_stats | 3 | **2** |
| owner-wide units occupancyRate — get_dashboard_stats | 33.33 | **50.00** |
| unit visible in list read (`.neq status inactive`) | yes | **no** |

All disposable test data (property, 2 units, tenant, active lease, `security_events` audit row)
was deleted afterward; prod-wide `units WHERE status='inactive'` = **0**, and all six RPCs
returned to their exact original real-data fingerprints (table above, column 3).

### 4. Automated
`bun run typecheck` → pass · `bun run lint` → exit 0 · `bun run test:unit` → **101918 passed (229 files)**
No change to `src/types/supabase.ts` (CHECK/RPC-only; no `db:types` regen needed).

## Restore info (if ever needed)
Revert = remove the documented predicate from each function. Original-definition md5 fingerprints:
ddv2 `7fb1fab3…`, ppa `5c82d166…`, ppwt `d0dfcbcc…`, ds `db63619d…`. Constraint revert: DROP + ADD
without `'inactive'`.

## Notes for later phases
Phase 30 (DATA-02) re-touches the two performance RPCs to restore the property-status
`p.status <> 'inactive'` predicate — it **MUST preserve** the unit-status `IS DISTINCT FROM 'inactive'`
denominator exclusion added here.
