# Phase 4: Cron Stagger & Index Cleanup - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** Live-DB-grounded (Supabase MCP) + canonical Postgres index-drop analysis. User directive: "research canonically and comprehensively then you make the determination." This CONTEXT IS that determination.

<domain>
## Phase Boundary
Pure DB-ops migration: (PERF-01) stagger the 4 pg_cron jobs colliding at `0 3 * * *`; (PERF-04) drop ONLY provably-dead indexes, keeping every FK/PK/unique index and every structurally-valid index.
</domain>

<decisions>
## Implementation Decisions (LOCKED — canonical determination)

### PERF-01 — Cron stagger (verified live)
Exactly 4 jobs fire at `0 3 * * *`: `cleanup-cron-history`, `cleanup-pg-net-responses`, `cleanup-security-events`, `expire-trials`. The 3 AM window already has `:15` (cleanup-errors), `:30` (cleanup-webhook-events), `:45` (process-account-deletions) taken. Reschedule the 4 to distinct FREE minutes:
- `cleanup-cron-history` → `0 3 * * *` (unchanged, :00)
- `cleanup-pg-net-responses` → `5 3 * * *` (:05)
- `cleanup-security-events` → `10 3 * * *` (:10)
- `expire-trials` → `20 3 * * *` (:20)

Reschedule via the canonical pg_cron API, NOT a direct `UPDATE cron.job`: for each, `select cron.alter_job(job_id := (select jobid from cron.job where jobname = '<name>'), schedule := '<new>');`. This changes only the schedule, preserving each job's existing command (which calls a named SECURITY DEFINER function per the project's cron convention — do NOT inline SQL). Verify post-migration via `cron.job` schedule rows.

### PERF-04 — Index cleanup (canonical determination: drop ONE provably-dead index; DEFER the rest)
**Canonical analysis (why idx_scan=0 is NOT trustworthy here):**
- `pg_stat_database.stats_reset = never` (stats span the whole DB lifetime) — but the DB is pre-launch low-traffic (8 users, ~1 property, near-empty business tables; ~42 req/hr). On small/low-row tables Postgres prefers seq scans, so `idx_scan=0` is GUARANTEED for essential indexes until tables grow — the textbook "idx_scan=0 is meaningless on small tables / without a representative workload window" case. The phase's own criterion #2 says "idx_scan=0 over a REPRESENTATIVE window"; no representative window exists.
- Of ~73 idx_scan=0 indexes: ~36 back FK columns (KEEP — FK-check/locking, criterion #3), and ~37 are non-FK but are valid feature indexes unused only for lack of volume — including `idx_documents_search_vector` (the document-vault GIN full-text-search index). Dropping these would be actively harmful (recreated-later + seq scans at scale).
- Exact-duplicate indexes: NONE (verified — no redundant-index category to drop).

**The ONLY unconditionally-safe drop (dead regardless of traffic):**
- **`idx_properties_property_owner_id`** — a btree on `properties.stripe_connected_account_id` (misnamed; Stripe-Connect residue from demolished rent-facilitation). Verified: `stripe_connected_account_id` appears in code ONLY as a SELECT projection column (`property-keys.ts:28`) + a test fixture — NEVER in any WHERE/JOIN/ORDER BY. A btree index is never used by a column that only appears in a projection, so this index can NEVER be used by any query at any traffic level. Drop it. (The COLUMN stays — it's still selected; only the dead index goes.)

**DEFER (do NOT drop this phase):** all other idx_scan=0 indexes. They're either FK-backing (keep permanently) or structurally-valid feature indexes whose idx_scan=0 reflects pre-launch traffic, not uselessness. Re-evaluate PERF-04's broader sweep AFTER representative production traffic accumulates (a post-launch `pg_stat_user_indexes` review) — the audit's own "re-check after a representative window first" caveat.

### Migration
One migration `supabase/migrations/YYYYMMDDHHmmss_cron_stagger_index_cleanup.sql`: the 3 `cron.alter_job` reschedules + `DROP INDEX IF EXISTS public.idx_properties_property_owner_id;`. Apply via Supabase MCP `apply_migration`; reconcile the repo filename vs the prod-assigned timestamp via `list_migrations` (migration-mcp-prod-drift). The migration body must document the idx_scan + projection-only evidence for the one dropped index, and a comment enumerating that all FK/valid indexes are deliberately KEPT (criterion #3) with the deferral rationale.

### Claude's Discretion
- Exact comment wording. Whether to also `comment on` the kept-index rationale inline vs a leading block (leading block is fine).
</decisions>

<canonical_refs>
## Canonical References
- The project's pg_cron convention (CLAUDE.md "Cron Jobs"): named SECURITY DEFINER functions, `SET search_path=public`, never inline SQL in `cron.schedule()`. The reschedule must NOT change the command, only the schedule → `cron.alter_job(jobid, schedule)`.
- migration-mcp-prod-drift memory: reconcile repo filename ↔ prod-assigned timestamp after MCP apply.
- Phase-3 migration (`20260606041458_stats_consolidation_rpcs.sql`) as the recent migration-style precedent.
- Verified live facts (this CONTEXT): the 4 colliding jobs + free slots; idx def of `idx_properties_property_owner_id`; zero duplicate indexes; `stats_reset=never`; `stripe_connected_account_id` projection-only usage.
</canonical_refs>

<specifics>
## Specific Ideas
- This is a no-frontend, no-type-regen phase (no RPC signatures change, so `bun run db:types` is NOT needed — `DROP INDEX` + cron reschedule don't alter the generated TS types). Confirm: no `supabase.ts` change expected.
- Verification: post-apply, query `cron.job` (4 distinct schedules) + `pg_class`/`pg_stat_user_indexes` (the dead index is gone; spot-check a few FK indexes still exist).
</specifics>

<deferred>
## Deferred Ideas
- The broader idx_scan=0 index sweep (~37 non-FK valid indexes) — defer to a post-launch representative-traffic review. NOT a regression or gap; a canonical-correctness deferral.
- `cron.job_run_details` 34MB bloat VACUUM (flagged during the billing-banner diagnosis) — could fold here as a one-time maintenance, but VACUUM FULL takes a lock and isn't a migration concern; leave out of this phase unless trivially safe.
</deferred>

---
*Phase: 04-cron-stagger-index-cleanup*
*Context gathered: 2026-06-06 — canonical determination: cron stagger (4 jobs) + drop 1 provably-dead index; defer the idx_scan=0-but-valid sweep to a representative-traffic window.*
