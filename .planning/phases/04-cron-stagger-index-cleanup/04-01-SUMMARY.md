# Plan 04-01 Summary — Cron Stagger & Index Cleanup (PERF-01, PERF-04)

**Status:** Complete
**Branch:** gsd/phase-4-cron-stagger-index-cleanup
**Commit:** `f95424c19`

## What shipped
`supabase/migrations/20260606205922_cron_stagger_index_cleanup.sql` — applied to prod via Supabase MCP `apply_migration` (prod version `20260606205922`; repo filename reconciled, was authored `...205858`, 24s drift).

- **PERF-01 (cron stagger):** the 4 jobs that all fired at `0 3 * * *` are now at 4 distinct minutes via schedule-only `cron.alter_job` (each job's command preserved — never re-specified/inlined):
  - `cleanup-cron-history` → `0 3 * * *` (unchanged)
  - `cleanup-pg-net-responses` → `5 3 * * *`
  - `cleanup-security-events` → `10 3 * * *`
  - `expire-trials` → `20 3 * * *`
  (:15/:30/:45 remain held by cleanup-errors / cleanup-webhook-events / process-account-deletions — no collision.)
- **PERF-04 (index cleanup):** dropped EXACTLY ONE index — `idx_properties_property_owner_id` (btree on `properties.stripe_connected_account_id`, Stripe-Connect residue from demolished rent-facilitation). Verified dead: that column appears in code only as a SELECT projection (`property-keys.ts:28`), never in WHERE/JOIN/ORDER BY — a btree index is unusable by a projection-only column at any traffic level.

## Verification (prod introspection — this is a DB-ops phase; the proof is prod state, not a unit test)
MCP `execute_sql` post-apply confirmed:
- The 4 jobs at `0/5/10/20 3 * * *` (distinct). ✓
- `to_regclass('public.idx_properties_property_owner_id')` IS NULL (gone). ✓
- Surgical-drop proof — `idx_units_owner_user_id`, `idx_leases_owner_user_id`, `tenants_owner_user_id_idx`, AND `idx_documents_search_vector` (the vault GIN full-text index) all still present. ✓

## Canonical determination (why the broader index sweep was DEFERRED, not executed)
The roadmap's PERF-04 success criterion #2 says "idx_scan=0 over a REPRESENTATIVE window." There is none: the DB is pre-launch low-traffic (8 users, ~1 property, near-empty business tables, ~42 req/hr). On small/low-row tables Postgres prefers seq scans, so `idx_scan=0` is GUARANTEED for essential indexes until tables grow — canonically meaningless here despite `stats_reset=never`. Of ~73 idx_scan=0 indexes, ~36 back FK columns (keep permanently) and ~37 are valid feature indexes (incl. the documents GIN search index) unused only for lack of volume. Zero exact-duplicate indexes exist. So the only unconditionally-safe drop was the one projection-only dead index. The broader sweep is deferred to a post-launch `pg_stat_user_indexes` review against representative traffic — the audit's own "re-check after a representative window first" caveat. This was the user's explicit ask ("research canonically and comprehensively then you make the determination").

## Notes
- No `supabase.ts` change (DROP INDEX + cron reschedule don't alter generated TS types) — no `db:types` run needed.
- Applied via MCP because the env `SUPABASE_ACCESS_TOKEN` (CLI path) is expired.
