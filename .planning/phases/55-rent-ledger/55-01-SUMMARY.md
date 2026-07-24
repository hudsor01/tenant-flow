---
phase: 55-rent-ledger
plan: 01
subsystem: database
tags: [postgres, rls, pg_cron, migrations, money-boundary, append-only, supabase]

# Dependency graph
requires:
  - phase: 54-esign-storage-metering
    provides: append-only owner-scoped table + service_role-only RPC pattern (esign_metering.sql)
provides:
  - rent_charges + rent_receipts owner-scoped append-only tables (SELECT+INSERT only)
  - rent_ledger_append_only() before-update-or-delete guard trigger on both tables
  - leases.ledger_start_date nullable track-since column
  - generate_rent_charges() service_role-only idempotent monthly charge generator
  - generate-rent-charges pg_cron job at 05:00 UTC
  - the single integer->numeric(10,2) money boundary (leases.rent_amount::numeric(10,2))
affects: [55-02 read RPCs, 55-03 RLS/money tests, 55-04 apply+db:types blocking gate, 55-05 hooks, 55-06 UI, 55-07 revenue relabel, 55-08 collection-rate KPI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Append-only ledger: SELECT+INSERT RLS + belt-and-suspenders BEFORE UPDATE OR DELETE guard trigger (blocks service_role too)"
    - "Single-point money conversion: integer dollars -> numeric(10,2) exactly once at charge generation, no cents math anywhere"
    - "Partial-unique-index + ON CONFLICT DO NOTHING idempotency with matching WHERE predicate arbiter"

key-files:
  created:
    - supabase/migrations/20260724140000_rent_ledger_schema.sql
    - supabase/migrations/20260724140100_rent_charges_generation_cron.sql
  modified: []

key-decisions:
  - "Two separate migrations (schema, then cron) so the cron's ON CONFLICT arbiter reads the partial index defined in the schema file"
  - "Guard trigger raises errcode 0A000 (feature_not_supported) for every writer incl. service_role — RLS alone does not stop service_role mutation"
  - "end_date IS NULL branch kept in the coverage predicate per RESEARCH even though leases.end_date is NOT NULL in prod (harmless, matches locked pattern)"

patterns-established:
  - "rent ledger tables are append-only at the DB layer (RLS + trigger); corrections are reversal inserts via reverses_id, never edits"
  - "generate_rent_charges() is the sole integer->numeric money boundary for the whole ledger subsystem"

requirements-completed: [LEDGER-01, LEDGER-02, LEDGER-04, LEDGER-05, LEDGER-06]

# Metrics
duration: 15min
completed: 2026-07-24
---

# Phase 55 Plan 01: Rent Ledger Schema + Charge Generation Cron Summary

**Append-only rent_charges/rent_receipts tables (owner-scoped RLS + immutability guard trigger) plus a service_role-only idempotent pg_cron generator that converts the integer leases.rent_amount to numeric(10,2) dollars exactly once.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-24T19:03:00Z
- **Completed:** 2026-07-24T19:17:25Z
- **Tasks:** 2
- **Files modified:** 2 (both new migrations)

## Accomplishments
- Created `rent_charges` and `rent_receipts` as owner-scoped, append-only tables (`numeric(10,2)` dollars, `text`+CHECK type/method columns, no PG enum) with SELECT+INSERT-only RLS and a `BEFORE UPDATE OR DELETE` guard trigger that raises `0A000` for every writer including service_role.
- Added the partial unique index `uq_rent_charges_lease_period_rent (lease_id, period_start) where type = 'rent'` and `leases.ledger_start_date` (nullable track-since column, D-04).
- Created `generate_rent_charges()` — SECURITY DEFINER, service_role-only, idempotent (`on conflict ... where type = 'rent' do nothing`), converting `rent_amount::numeric(10,2)` as the single money boundary — and scheduled it at `0 5 * * *` (`generate-rent-charges`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Rent-ledger schema migration (tables + RLS + append-only trigger + ledger_start_date)** - `65bdcaa6d` (feat)
2. **Task 2: Charge-generation cron migration (generate_rent_charges + schedule)** - `00ad5d0d4` (feat)

## Files Created/Modified
- `supabase/migrations/20260724140000_rent_ledger_schema.sql` - rent_charges + rent_receipts append-only tables, owner-scoped SELECT+INSERT RLS, sign-discipline CHECK, partial unique index, guard trigger, leases.ledger_start_date.
- `supabase/migrations/20260724140100_rent_charges_generation_cron.sql` - generate_rent_charges() service_role-only idempotent generator (single integer->numeric conversion) + cron.schedule at 05:00 UTC.

## Decisions Made
- Split into two migrations so the cron's `ON CONFLICT (lease_id, period_start) WHERE type = 'rent'` arbiter has the matching partial unique index from the schema file (RESEARCH Pitfall 2).
- Immutability enforced by BOTH RLS (no UPDATE/DELETE policy) and a guard trigger, because RLS does not constrain service_role or the table owner (RESEARCH Pitfall 3).
- Kept the `end_date IS NULL` branch of the coverage predicate per the locked RESEARCH pattern even though `leases.end_date` is NOT NULL in prod — harmless (the branch never fires) and avoids diverging from the reviewed SQL.

## Deviations from Plan

None - plan executed exactly as written. (One cosmetic adjustment: reworded a schema header comment so it no longer names the legacy `grace_period_days`/`late_fee_days`/`late_fee_amount` columns in prose, satisfying the acceptance criterion's "no reference to" grep gate. No SQL behavior change.)

## Issues Encountered
- First Task 2 commit was rejected by the commit-msg hook (`body-max-line-length` >100 chars). Reworded the commit body to fit 100 columns and re-committed successfully — no `--no-verify` used.

## Verification
- Both plan `<verify>` automated gates pass: `SCHEMA_OK` and `CRON_OK`.
- Money guard clean: no `* 100`/`*100`, `/ 100`/`/100`, or `formatCents(` in either file; the only conversion is `rent_amount::numeric(10,2)`.
- Schema: exactly 2 `for select` + 2 `for insert` policies, zero `for update`/`for delete`/`for all`; guard triggers `before update or delete` on both tables; `ledger_start_date` column added; no PG enum; no reference to `rent_due`, `get_current_owner_user_id`, `grace_period_days`, `late_fee_days`, or `late_fee_amount`.
- Cron: coverage predicate `lease_status in ('active','ended','expired','terminated')`, floored at `ledger_start_date`, idempotent ON CONFLICT matching the Task-1 index, revoked from public/anon/authenticated + granted to service_role, scheduled `0 5 * * *`.
- Migrations are NOT applied here — application + `db:types` + live behavior verification happen in Plan 55-04 (the blocking gate). This plan produces the files only.

## User Setup Required
None - no external service configuration required. Migration application is handled in Plan 55-04.

## Next Phase Readiness
- The locked DB contract (`rent_charges`, `rent_receipts`, `generate_rent_charges()`, `leases.ledger_start_date`) is in place for Plan 55-02 (read RPCs) and Plan 55-03 (RLS/money integration tests) to build against.
- Blocker for downstream live behavior: Plan 55-04 must apply both migrations via MCP `apply_migration`, reconcile filenames to prod timestamps, and run `bun run db:types`.

## Self-Check: PASSED
- FOUND: supabase/migrations/20260724140000_rent_ledger_schema.sql
- FOUND: supabase/migrations/20260724140100_rent_charges_generation_cron.sql
- FOUND commit: 65bdcaa6d
- FOUND commit: 00ad5d0d4

---
*Phase: 55-rent-ledger*
*Completed: 2026-07-24*
