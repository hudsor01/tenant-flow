# 25-04 SUMMARY — CRIT-04: Restore lease delete (soft-delete via `inactive`)

**Status:** COMPLETE (all verifications pass; prod left exactly as found)
**Requirement:** CRIT-04

## What was done

`leaseMutations.delete` and `deleteOptimistic` already wrote
`.update({ lease_status: "inactive" })` (comment: "financial record retention"), but the live
`leases_lease_status_check` rejected `'inactive'` (23514) so every lease delete failed 100% of the
time. Added `'inactive'` to the CHECK — the design already treats it as the soft-delete sentinel
(`get_lease_stats` and `leaseQueries.list` both exclude it).

## Migration (prod-reconciled filename)

| File | Prod version | Purpose |
|------|--------------|---------|
| `supabase/migrations/20260702214706_add_inactive_to_leases_lease_status_check.sql` | 20260702214706 | `leases_lease_status_check` += `'inactive'` (idempotent DROP IF EXISTS + ADD) |

**`get_dashboard_data_v2` is NOT re-touched here.** Its `all_leases` CTE lease-status exclusion
(`+ and l.lease_status <> 'inactive'`) is handled by plan 25-03's single corrective redefinition
(`20260702215602_exclude_inactive_from_occupancy_stats.sql`), which owns that function so the two
plans never redefine it twice. Confirmed live.

## Corrective lease-aggregation audit — NO extra migration required

Re-verified live via `pg_get_functiondef` that every other lease aggregation already scopes to
specific statuses (never counts `'inactive'`):
- `get_lease_stats` — `totalLeases = count(*) FILTER (WHERE lease_status <> 'inactive')`; other tiles
  count by specific status.
- `get_dashboard_stats` — `active_leases` filters `lease_status = 'active'`; `expired_leases` filters
  `IN ('ended','terminated')`. (Its `total_leases` counts all owner leases, but `'inactive'` leases
  are soft-deleted rows that were never counted before this change existed — behavior preserved;
  see verification, byte-identical output on clean data.)
- `get_property_performance_analytics` — lease references filter specific statuses.
- `get_dashboard_data_v2` — `all_leases` now excludes `'inactive'` (via 25-03); `active_leases`
  filters `= 'active'`.

## Source filter audit — NO edits required

`grep -rn 'from("leases")' src/`:
- `lease-keys.ts` `list` (:73 `.neq("lease_status","inactive")` default / `.eq(status)`), `detail`
  (:104 single-row), `expiring` (:125 `.eq("lease_status","active")`), `signedDocument`/
  `signatureStatus` (single-row by id). All correct.
- `lease-mutation-options.ts` `delete` (:117) + `deleteOptimistic` (:132) — **unchanged**, already
  write `.update({ lease_status: "inactive" })` (now valid). No hard delete introduced.
- `expiring-leases-widget.tsx:36` → `.eq("lease_status","active")`.
- `lease-creation-wizard.tsx:185` → INSERT (write).

## Verification (live prod, exact numbers)

### 1. Constraint now includes `'inactive'`
`CHECK ((lease_status = ANY (ARRAY['draft'::text,'pending_signature'::text,'active'::text,'ended'::text,'terminated'::text,'expired'::text,'inactive'::text])))`

### 2. Behavior proof — soft-delete a disposable active test lease
UPDATE `lease_status='inactive'` **succeeded (no 23514)**:

| Metric | Before | After |
|--------|--------|-------|
| get_lease_stats totalLeases | 3 | **2** (−1) |
| get_lease_stats activeLeases | 1 | **0** |
| get_dashboard_data_v2 leases.total | 3 | **2** (−1) |
| get_dashboard_data_v2 leases.active | 1 | **0** |
| lease visible in list read (`.neq lease_status inactive`) | yes | **no** |
| occupied unit status (sync_unit_status trigger) | occupied | **occupied** (unchanged — trigger only fires on active↔ended/terminated) |

### 3. No-regression on lease stats (clean data)
`get_lease_stats` full-output md5 identical old-fn vs new (`727825a3…` rich shape; `6c90fbf4…`
restored real data). See 25-03 SUMMARY verification table.

### 4. Automated
`bun run typecheck` → pass · `bun run lint` → exit 0 · `bun run test:unit` → **101918 passed (229 files)**

## Cleanup
All disposable test rows (property, units, tenant, lease) + the one triggered `security_events`
audit row removed. Prod-wide `leases WHERE lease_status='inactive'` = **0**; owner e2e-owner-a's
real-data RPC fingerprints restored to their exact originals.

## Notes for later phases
Phase 26 (LEASE-01/LEASE-06) will re-touch `leaseQueries.list` — it **MUST keep** the
`.neq("lease_status","inactive")` default-branch filter intact.
