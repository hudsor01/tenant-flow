---
phase: 30-analytics-data
plan: 02
subsystem: types
tags: [lease-status, exhaustive-union, get_lease_stats, expired-tile, lockstep]

# Dependency graph
requires:
  - phase: 30-analytics-data
    provides: get_lease_stats RPC + core LeaseStatus union
provides:
  - core LeaseStatus union includes 'expired'
  - every exhaustive Record<LeaseStatus> + display map renders 'expired' as "Expired"
  - get_lease_stats counts the Expired tile from lease_status = 'expired'
affects: [tenants, leases, analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Widen a DB-backed string-literal union in one place (core.ts) then satisfy every exhaustive Record<LeaseStatus> lockstep site so typecheck proves exhaustiveness (same discipline as MAINT-06)"
    - "Read-only display statuses (cron-set 'expired') widen the DISPLAY union only; the write path stays narrowed to the Zod mutation-input union (LeaseCreate['lease_status'])"

key-files:
  created: []
  modified:
    - src/types/core.ts
    - src/components/tenants/tenant-table-helpers.tsx
    - src/app/(owner)/tenants/components/tenant-transforms.ts
    - src/components/leases/table/lease-utils.ts
    - src/components/leases/detail/lease-detail-utils.ts
    - src/components/leases/lease-form.tsx

key-decisions:
  - "DATA-03: 'expired' added to the DISPLAY LeaseStatus union only; it is NOT added to the lease write/validation schema (lease_statusSchema) because 'expired' is a cron-set, read-only state, never a form-selectable workflow status"
  - "'expired' reuses the muted/inactive treatment (status-inactive chip; stone label class) consistent with 'ended' — semantically the 'lease is finished' family; 'terminated' stays red"
  - "lease-form casts to LeaseCreate['lease_status'] (narrow write union) instead of the widened display LeaseStatus, so the widening does not leak 'expired' into create/update payloads"

patterns-established:
  - "Grep-driven lockstep verification: after widening a union, `grep -rn 'Record<LeaseStatus' src` + a full typecheck catches every exhaustive consumer; the badge in dashboard/components/lease-status-badge.tsx is a shadowed PortfolioRow-based union (active/expiring/vacant) and is intentionally untouched"

requirements-completed: [DATA-03]

# Metrics
duration: ~15min
completed: 2026-07-08
---

# Phase 30 Plan 02: LeaseStatus 'expired' Union Widening + Expired Tile Fix Summary

**The `get_lease_stats` Expired tile now counts `lease_status = 'expired'` (the value the expire-leases cron writes), and the core `LeaseStatus` union is widened with `'expired'` so every exhaustive Record + display map renders an "Expired" badge instead of a Draft/raw fallback — with the write path kept narrowed so 'expired' can never be set via the lease form.**

## Performance

- **Duration:** ~15 min (frontend task; migration completed earlier)
- **Completed:** 2026-07-08
- **Tasks:** 3 (Tasks 1-2 migration completed + applied earlier; Task 3 frontend completed here)
- **Files modified:** 6 (frontend)

## Scope Note

Tasks 1 & 2 (author + apply the `CREATE OR REPLACE get_lease_stats` migration, prod-timestamp reconcile, rolled-back live proof) were completed and applied to prod **before** this execution as `supabase/migrations/20260709000406_data03_lease_stats_expired_counts_expired_status.sql` (committed in `1167419d3`). This execution completed **Task 3 only** — the frontend union widening + lockstep coverage. No migration file was created, applied, or touched here.

## Accomplishments

- **DATA-03 (RPC, pre-applied):** `get_lease_stats` `expiredLeases` filter changed from `lease_status = 'ended'` to `lease_status = 'expired'` — the Expired tile now counts cron-lapsed leases. Migration byte-identical to the live body otherwise (grants / SECURITY DEFINER / `search_path` / `auth.uid()` guard preserved via `CREATE OR REPLACE`, no DROP).
- **DATA-03 (union):** `LeaseStatus` in `core.ts` widened with `'expired'` (now: draft, pending_signature, active, ended, terminated, expired). `'inactive'` remains the soft-delete sentinel outside this display union, as scoped.
- **DATA-03 (lockstep):** every exhaustive `Record<LeaseStatus>` and every display map now renders `'expired'` as **"Expired"**.

## Task Commits

Each task was committed atomically:

1. **Tasks 1-2: get_lease_stats migration (author + apply + proof)** - migration `20260709000406_data03_lease_stats_expired_counts_expired_status.sql` (committed earlier in `1167419d3`)
2. **Task 3: widen LeaseStatus union + cover lockstep display sites** - `da6571bb5` (fix)

## Files Created/Modified

- `src/types/core.ts` - `LeaseStatus` union widened with `| "expired"`.
- `src/components/tenants/tenant-table-helpers.tsx` - `STATUS_LABELS` gains `expired: "Expired"`; `STATUS_CHIP` gains `expired: "status-inactive"`. These are exhaustive `Record<LeaseStatus>` — the keys are required for typecheck.
- `src/app/(owner)/tenants/components/tenant-transforms.ts` - lease_status mapping split: `'expired' -> 'expired'`, `'ended' -> 'ended'` (previously both folded into `'ended'`).
- `src/components/leases/table/lease-utils.ts` - `getStatusConfig` gains an `expired` entry (label "Expired", muted stone class) so an expired lease no longer hits the "Draft" fallback.
- `src/components/leases/detail/lease-detail-utils.ts` - `getStatusConfig` gains an `expired` entry (label "Expired", muted stone class) so an expired lease no longer renders the raw `expired` string via fallback.
- `src/components/leases/lease-form.tsx` - status cast narrowed from the display `LeaseStatus` to `LeaseCreate['lease_status']` (the Zod write union), and the now-unused `LeaseStatus` import dropped.

## Decisions Made

- **'expired' is display-only.** It was NOT added to `lease_statusSchema` (`src/lib/validation/leases.ts`). The lease form only offers the writable workflow statuses (draft → pending_signature → active → ended/terminated); `'expired'` is set exclusively by the `expire-leases` cron. Widening the write schema would have (incorrectly) let a user set a lease to expired via the form.
- **Chip/label treatment:** `'expired'` reuses the muted/inactive treatment consistent with `'ended'` (status-inactive chip; stone label class) — both are the "lease is finished" family. `'terminated'` stays red (punitive/early). This matches the plan's interface guidance and the task directive to reuse an existing muted treatment where the design doesn't warrant distinction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widening broke lease-form.tsx typecheck**
- **Found during:** Task 3 (post-edit typecheck)
- **Issue:** `lease-form.tsx:76` cast `value.lease_status as LeaseStatus`, then fed it to `createLeaseMutation`/`updateLeaseMutation`, whose inputs (`LeaseCreate`/`LeaseUpdate`, from the Zod `lease_statusSchema`) expect the narrow pre-widening union. Adding `'expired'` to the display union made the cast too wide → TS2322 at lines 80 and 97.
- **Fix:** Cast to `LeaseCreate['lease_status']` (the narrow write union, an existing exported type — no duplicate type introduced) and dropped the now-unused `LeaseStatus` import. This keeps `'expired'` out of the write path by design.
- **Files modified:** `src/components/leases/lease-form.tsx`
- **Commit:** `da6571bb5`

This was a grep-driven lockstep site the plan did not explicitly enumerate (it lists the exhaustive Records + display maps); the full typecheck caught it. `src/components/dashboard/components/lease-status-badge.tsx` was verified as a shadowed local `PortfolioRow["leaseStatus"]` union (active/expiring/vacant) and left untouched per plan.

## Issues Encountered

None blocking. `bun run typecheck` green; `bun run lint` clean on touched files. Initial commit attempt was rejected by commitlint `body-max-line-length` (100 chars) — body was rewrapped and re-committed successfully.

## Self-Check: PASSED

- `da6571bb5` present in git log.
- Migration `20260709000406_data03_lease_stats_expired_counts_expired_status.sql` present on disk.
- All 6 modified files present; typecheck green (all exhaustive `Record<LeaseStatus>` sites cover `expired`).

## Next Phase Readiness

- Expired tile counts cron-lapsed leases; every lease-status display surface renders "Expired". No blockers.

---
*Phase: 30-analytics-data*
*Completed: 2026-07-08*
