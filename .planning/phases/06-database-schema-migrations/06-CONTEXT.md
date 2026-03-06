# Phase 6: Database Schema & Migrations - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix constraints, RLS gaps, cron jobs, and schema inconsistencies across 12 requirements (DB-01 through DB-12). All tables get correct constraints, FK relationships, and operational maintenance jobs. No new features — purely hardening existing schema.

</domain>

<decisions>
## Implementation Decisions

### Data retention
- Cleanup cron timing: off-peak 3-4 AM UTC
- Cleanup mode: archive-then-delete (move to `*_archive` tables first, delete archives after extended period)
- Webhook event retention period, error retention tiers, and batch strategy: Claude's discretion based on Stripe best practices and table sizes

### GDPR soft-delete cascade
- When tenant deletes account: anonymize payment history (replace PII with '[deleted tenant]') but keep amounts, dates, lease references intact for owner's financial records
- Owner account deletion approach, implementation method (DB function vs Edge Function), and grace period: Claude's discretion based on GDPR requirements and existing patterns

### Leases dual-column cleanup
- Drop the redundant column — `owner_user_id` is canonical (all RLS policies and RPCs already use it)
- Keep `property_owners` table — it stores Stripe Connect data (stripe_account_id, charges_enabled, onboarding_completed_at) needed for payment routing
- Single migration: verify all leases have owner_user_id populated, drop legacy column + FK + index in one step
- Domain model confirmed: property owner is always on every lease for their property. Tenants are the variable party — each tenant gets their own lease or shares one, but the owner side is fixed for the life of that lease

### Documents ownership
- Add direct `owner_user_id` column on documents table (not derived via JOIN)
- Owner owns the lease, lease has documents — store owner directly for fast RLS checks
- Backfill from parent entity (lease) during migration

### Cron monitoring
- Add expiry notification to owner when lease expires (insert notification row so owner sees 'Lease expired' in dashboard)
- Detection approach and lock strategy for expire-leases: Claude's discretion based on Sentry capabilities and existing patterns

### Other schema fixes (clear from requirements)
- DB-01: `activity.user_id` gets NOT NULL constraint (currently nullable via ON DELETE SET NULL)
- DB-10: `inspection_photos` gets `updated_at` column + trigger
- DB-11: `blogs` gets author/user_id column for audit trail
- DB-12: Consolidate `update_updated_at_column()` and `set_updated_at()` into single function

### Claude's Discretion
- Stripe webhook event retention periods and tiering
- Cleanup batch sizes vs single DELETE per table
- GDPR cascade implementation method (DB function vs Edge Function)
- GDPR grace period (30-day recovery window vs immediate)
- Owner account deletion cascade specifics
- Cron monitoring approach (Sentry Cron Monitors vs pg_notify)
- expire-leases lock strategy (FOR UPDATE SKIP LOCKED vs advisory lock)
- Migration ordering and grouping of the 12 DB requirements

</decisions>

<specifics>
## Specific Ideas

- "Property owner will always be on the lease because it's their property — tenants are who come and go" — confirmed domain model for lease ownership
- Archive-then-delete preferred over hard delete for cleanup jobs — safety net for forensics
- Tenant payment anonymization preserves owner's financial reporting capability after tenant account deletion

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cleanup_old_security_events()` and `cleanup_old_errors()` — already written with search_path fixes (Phase 1), just need scheduling
- `set_updated_at()` — base schema trigger function, reusable for inspection_photos and any new updated_at triggers
- `calculate_late_fees()` and `queue_lease_reminders()` — existing named cron functions showing the pattern to follow for expire-leases rewrite
- Existing notification insert pattern in codebase for dashboard notifications

### Established Patterns
- pg_cron jobs use `cron.schedule()` with named jobs (idempotent replacement)
- Cron functions are SECURITY DEFINER with `SET search_path TO 'public'`
- `owner_user_id` is the canonical owner column across properties, leases, maintenance_requests
- RLS policies use `(select auth.uid())` subselect pattern for performance

### Integration Points
- `expire-leases` cron currently inline SQL in `20260222120000_phase56_pg_cron_jobs.sql` — needs replacement
- `property_owner_id` FK on leases references `property_owners.id` — dropping requires checking all RLS policies and RPCs that might still reference it
- `documents` table RLS policies need creation after adding `owner_user_id`
- Two duplicate functions: `set_updated_at()` (base schema) and `update_updated_at_column()` (blogs/optimization migrations) — triggers on various tables reference one or the other

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-database-schema-migrations*
*Context gathered: 2026-03-05*
