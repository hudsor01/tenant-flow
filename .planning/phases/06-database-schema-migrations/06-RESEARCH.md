# Phase 6: Database Schema & Migrations - Research

**Researched:** 2026-03-05
**Domain:** PostgreSQL schema hardening, pg_cron, GDPR anonymization, RLS policies
**Confidence:** HIGH

## Summary

Phase 6 is purely database-side work: 12 requirements (DB-01 through DB-12) plus DOC-01 (CLAUDE.md update). No new features -- strictly constraint fixes, column cleanup, cron job hardening, and operational maintenance scheduling. All changes are SQL migrations applied via Supabase CLI.

The work divides into four natural groups: (1) schema constraint fixes (activity NOT NULL, documents owner_user_id, leases dual-column cleanup, inspection_photos updated_at, blogs author, trigger consolidation), (2) cron job hardening (expire-leases rewrite, cleanup scheduling, Sentry monitoring), (3) data retention (stripe_webhook_events cleanup, security_events/errors scheduling), and (4) GDPR cascade (tenant/owner account deletion with anonymization).

**Primary recommendation:** Order migrations carefully -- trigger function consolidation first (DB-12), then constraint fixes (DB-01, DB-10, DB-11), then documents + leases schema changes (DB-02, DB-03) which require RLS policy rewrites, then cron jobs (DB-05 through DB-09), and finally GDPR (DB-04) which is the most complex and cross-cutting.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Cleanup cron timing: off-peak 3-4 AM UTC
- Cleanup mode: archive-then-delete (move to `*_archive` tables first, delete archives after extended period)
- GDPR: tenant deletion anonymizes payment history (replace PII with '[deleted tenant]') but keeps amounts, dates, lease references intact for owner's financial records
- Leases: drop redundant column -- `owner_user_id` is canonical (all RLS policies and RPCs already use it)
- Keep `property_owners` table -- stores Stripe Connect data
- Leases column drop: single migration, verify all leases have owner_user_id populated, drop legacy column + FK + index in one step
- Documents: add direct `owner_user_id` column (not derived via JOIN), backfill from parent entity (lease) during migration
- Cron: add expiry notification to owner when lease expires
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | `activity.user_id` NOT NULL + FK constraint | Schema findings: currently nullable with ON DELETE SET NULL, need to change to ON DELETE CASCADE or restrict + add NOT NULL |
| DB-02 | `documents` gets `owner_user_id` + authenticated RLS policies | Schema findings: documents table has entity_type/entity_id polymorphic pattern, existing RLS uses get_current_property_owner_id() which is slow |
| DB-03 | `leases` dual-column cleanup -- single owner column | Schema findings: property_owner_id referenced in 10+ RPCs in migrations, all need CREATE OR REPLACE to use owner_user_id |
| DB-04 | GDPR soft-delete cascade on users | GDPR patterns: anonymize PII in related tables, use DB function for atomicity |
| DB-05 | `expire-leases` rewrite as named function with FOR UPDATE SKIP LOCKED | Cron findings: currently inline SQL in cron.schedule, needs function wrapper like calculate_late_fees pattern |
| DB-06 | `cleanup_old_security_events` cron scheduled | Functions exist from Phase 1 (SEC-10), just need cron.schedule() call |
| DB-07 | `cleanup_old_errors` cron scheduled | Functions exist from Phase 1 (SEC-10), just need cron.schedule() call |
| DB-08 | Cron job Sentry monitoring for all cron jobs | Research: pg_cron can't use SDK; use pg_cron job_run_details table + monitoring function approach |
| DB-09 | `stripe_webhook_events.data` retention policy | Schema findings: table has id, event_type, processed_at, livemode, data (jsonb), status, error_message |
| DB-10 | `inspection_photos` gets `updated_at` + trigger | Schema findings: table has created_at but no updated_at, use consolidated trigger function |
| DB-11 | `blogs` gets author/user_id for audit trail | Schema findings: blogs table has no user/author column, needs FK to users |
| DB-12 | Consolidate duplicate trigger functions | Two functions: `set_updated_at()` (base schema, has search_path) and `update_updated_at_column()` (blogs/optimization, no search_path) |
| DOC-01 | CLAUDE.md update after phase | Recurring requirement -- update database section with new schema details |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15+ (Supabase) | Database engine | Project standard |
| pg_cron | 1.6+ | Scheduled job execution | Already enabled and used for 4 existing jobs |
| Supabase CLI | latest | Migration management | Project standard for `supabase/migrations/` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sentry | @sentry/nextjs (existing) | Error monitoring | Cron job failure detection (DB-08) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron monitoring via SQL | Sentry Cron Monitors HTTP API | pg_cron runs inside Postgres -- can't call Sentry HTTP. SQL-based monitoring via cron.job_run_details is simpler and requires no external calls |
| DB function for GDPR | Edge Function | DB function is atomic (single transaction), Edge Function allows async notification but adds network hop. DB function recommended for data integrity |

## Architecture Patterns

### Migration File Structure
```
supabase/migrations/
├── 20260305140000_consolidate_trigger_functions.sql      # DB-12 first (dependency)
├── 20260305150000_schema_constraints.sql                 # DB-01, DB-10, DB-11
├── 20260305160000_documents_owner_column.sql             # DB-02
├── 20260305170000_leases_drop_property_owner_id.sql      # DB-03
├── 20260305180000_expire_leases_function.sql             # DB-05
├── 20260305190000_cleanup_cron_scheduling.sql            # DB-06, DB-07, DB-09
├── 20260305200000_cron_monitoring.sql                    # DB-08
└── 20260305210000_gdpr_anonymize_cascade.sql             # DB-04
```

### Pattern 1: Named Cron Function (established pattern)
**What:** All pg_cron jobs use named SECURITY DEFINER functions, not inline SQL.
**When to use:** Every scheduled job (DB-05, DB-06, DB-07, DB-09).
**Example:**
```sql
-- Source: existing calculate_late_fees() pattern in 20260222120000_phase56_pg_cron_jobs.sql
create or replace function public.expire_leases()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease record;
  v_expired_count integer := 0;
begin
  for v_lease in
    select id, owner_user_id
    from public.leases
    where lease_status = 'active'
      and end_date < current_date
    for update skip locked
  loop
    update public.leases
    set lease_status = 'expired', updated_at = now()
    where id = v_lease.id;

    -- insert notification for owner (per CONTEXT.md decision)
    insert into public.notifications (user_id, notification_type, entity_type, entity_id, title, message)
    values (v_lease.owner_user_id, 'lease_expired', 'lease', v_lease.id,
            'Lease Expired', 'A lease has expired and needs attention.');

    v_expired_count := v_expired_count + 1;
  end loop;

  -- log result for monitoring
  raise notice 'expire_leases: expired % leases', v_expired_count;
end;
$$;

select cron.schedule(
  'expire-leases',
  '0 23 * * *',
  $$select public.expire_leases()$$
);
```

### Pattern 2: Archive-Then-Delete Cleanup
**What:** Create archive table, move old rows, then delete from source.
**When to use:** Cleanup jobs per CONTEXT.md locked decision (DB-06, DB-07, DB-09).
**Example:**
```sql
-- Create archive table mirroring source structure
create table if not exists public.stripe_webhook_events_archive (
  like public.stripe_webhook_events including all
);

create or replace function public.cleanup_old_webhook_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived integer;
begin
  -- Archive events older than retention period
  with archived as (
    insert into public.stripe_webhook_events_archive
    select * from public.stripe_webhook_events
    where processed_at < now() - interval '90 days'
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_archived from archived;

  -- Delete only successfully archived rows
  delete from public.stripe_webhook_events
  where processed_at < now() - interval '90 days'
    and id in (select id from public.stripe_webhook_events_archive);

  return v_archived;
end;
$$;
```

### Pattern 3: GDPR Anonymization Function
**What:** Replace PII with placeholder values while preserving financial records.
**When to use:** DB-04 tenant/owner account deletion.
**Example:**
```sql
create or replace function public.anonymize_deleted_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify caller owns this account
  if p_user_id != (select auth.uid()) then
    raise exception 'unauthorized';
  end if;

  -- Anonymize tenant records
  update public.tenants
  set first_name = '[deleted]', last_name = '[deleted]',
      email = '[deleted]', phone = null
  where user_id = p_user_id;

  -- Anonymize activity
  update public.activity
  set description = '[deleted user activity]'
  where user_id = p_user_id;

  -- Soft-delete properties (owner deletion)
  update public.properties
  set status = 'inactive'
  where owner_user_id = p_user_id;

  -- The actual auth.users deletion is handled by Supabase Auth
end;
$$;
```

### Pattern 4: Column Drop with RPC Fixup
**What:** Drop a column only after all functions referencing it are rewritten.
**When to use:** DB-03 leases.property_owner_id removal.
**Critical sequence:**
1. Verify all leases have owner_user_id populated (data check)
2. Rewrite all RPCs that reference leases.property_owner_id to use owner_user_id
3. Rewrite all RLS policies referencing property_owner_id
4. Drop FK constraint, index, and column in one step
5. Drop `get_current_property_owner_id()` function if no longer needed

### Anti-Patterns to Avoid
- **Inline SQL in cron.schedule:** Always wrap in a named function for error handling and monitoring
- **Hard delete without archive:** CONTEXT.md mandates archive-then-delete for all cleanup jobs
- **NOT NULL without data check:** Always verify no NULL values exist before adding NOT NULL constraint
- **Dropping column before fixing references:** Must rewrite all RPCs and policies BEFORE dropping property_owner_id

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom timer | pg_cron (already enabled) | Production-grade, idempotent schedule management |
| Data anonymization | Per-table manual SQL | Single SECURITY DEFINER function | Atomicity -- all-or-nothing in one transaction |
| Updated_at triggers | Per-table trigger functions | Single consolidated trigger function | DB-12 requirement -- avoid duplication |
| Archive tables | Custom ETL | `INSERT ... SELECT` with `ON CONFLICT DO NOTHING` | Simple, transactional, no external tooling |

## Common Pitfalls

### Pitfall 1: Adding NOT NULL to column with existing NULLs
**What goes wrong:** Migration fails with `ERROR: column "user_id" of relation "activity" contains null values`
**Why it happens:** Existing rows have NULL user_id values
**How to avoid:** First DELETE or UPDATE rows with NULL user_id, then add NOT NULL constraint. Check with `SELECT count(*) FROM activity WHERE user_id IS NULL`.
**Warning signs:** Migration error on deployment

### Pitfall 2: Dropping column referenced by RLS policies
**What goes wrong:** RLS policies break, table becomes inaccessible
**Why it happens:** RLS policies are checked on every query. If a column in a policy is dropped, all queries fail.
**How to avoid:** Drop or replace ALL policies referencing the column BEFORE dropping the column
**Warning signs:** `ERROR: column "property_owner_id" does not exist` on any query to that table

### Pitfall 3: property_owner_id referenced in many RPCs
**What goes wrong:** Dropping the column breaks functions that still reference it
**Why it happens:** At least 10+ RPC functions reference `leases.property_owner_id` across migrations
**How to avoid:** Use `CREATE OR REPLACE FUNCTION` to rewrite every RPC that uses `l.property_owner_id` to use `l.owner_user_id` BEFORE dropping the column. Key functions found:
- `get_owner_accessible_lease_tenant_ids()` (base schema)
- `get_dashboard_data_v2()` (various rewrites)
- `get_billing_insights()` (financial analytics)
- `get_maintenance_analytics()` (maintenance RPCs)
- Multiple analytics RPCs in `20251225140000` and `20260304120000`
**Warning signs:** Function calls return errors after migration

### Pitfall 4: documents RLS policies use get_current_property_owner_id()
**What goes wrong:** Existing document RLS policies use the old `get_current_property_owner_id()` helper which does a DB lookup through stripe_connected_accounts
**Why it happens:** Documents table was created before the owner_user_id pattern was established
**How to avoid:** When adding owner_user_id to documents, rewrite ALL RLS policies to use `(select auth.uid()) = owner_user_id` instead of the old JOIN-based checks. This is both simpler and faster.
**Warning signs:** Slow document queries, RLS check doing unnecessary JOINs

### Pitfall 5: Trigger function consolidation breaks existing triggers
**What goes wrong:** Dropping `update_updated_at_column()` breaks triggers that reference it
**Why it happens:** Some triggers reference `update_updated_at_column()`, others reference `set_updated_at()`
**How to avoid:** First reassign all triggers to use `set_updated_at()`, then drop the duplicate function
**Warning signs:** `ERROR: function update_updated_at_column() does not exist`

### Pitfall 6: ON DELETE SET NULL vs ON DELETE CASCADE for activity.user_id
**What goes wrong:** Adding NOT NULL + changing FK behavior could orphan or delete activity records
**Why it happens:** Current FK is `ON DELETE SET NULL` -- if we change to NOT NULL, user deletion would need CASCADE or RESTRICT
**How to avoid:** Change FK to `ON DELETE CASCADE` (activity records are per-user, meaningless without user context) or use the GDPR anonymize function to handle user deletion
**Warning signs:** User deletion fails with FK violation

### Pitfall 7: pg_cron monitoring -- can't call HTTP from inside Postgres
**What goes wrong:** Attempting to use Sentry HTTP check-in API from pg_cron functions
**Why it happens:** pg_cron runs inside Postgres, which cannot make HTTP requests natively
**How to avoid:** Use `cron.job_run_details` table to monitor job outcomes. Create a monitoring function that queries this table and uses `pg_notify` to alert on failures. An external listener (Edge Function or n8n webhook) can then forward to Sentry.
**Warning signs:** Trying to use `http_post()` or similar extensions not available in Supabase

## Code Examples

### Consolidate Trigger Functions (DB-12)
```sql
-- Step 1: Ensure set_updated_at() is the canonical function (already exists in base schema)
-- It has search_path set, which update_updated_at_column() lacks

-- Step 2: Reassign all triggers using update_updated_at_column
do $$
declare
  v_trigger record;
begin
  for v_trigger in
    select tg.tgname, cl.relname as table_name
    from pg_trigger tg
    join pg_class cl on cl.oid = tg.tgrelid
    join pg_proc p on p.oid = tg.tgfoid
    where p.proname = 'update_updated_at_column'
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      v_trigger.tgname, v_trigger.table_name
    );
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      v_trigger.table_name
    );
  end loop;
end;
$$;

-- Step 3: Drop the duplicate function
drop function if exists public.update_updated_at_column();
```

### Add owner_user_id to documents with backfill (DB-02)
```sql
-- Add column
alter table public.documents
  add column if not exists owner_user_id uuid references public.users(id);

-- Backfill from leases (entity_type = 'lease')
update public.documents d
set owner_user_id = l.owner_user_id
from public.leases l
where d.entity_type = 'lease' and d.entity_id = l.id
  and d.owner_user_id is null;

-- Backfill from properties (entity_type = 'property')
update public.documents d
set owner_user_id = p.owner_user_id
from public.properties p
where d.entity_type = 'property' and d.entity_id = p.id
  and d.owner_user_id is null;

-- Backfill from maintenance_requests
update public.documents d
set owner_user_id = mr.owner_user_id
from public.maintenance_requests mr
where d.entity_type = 'maintenance_request' and d.entity_id = mr.id
  and d.owner_user_id is null;

-- Index for RLS
create index if not exists idx_documents_owner_user_id
  on public.documents(owner_user_id);

-- Replace RLS policies to use direct owner_user_id check
drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert_owner" on public.documents;
drop policy if exists "documents_delete_owner" on public.documents;

create policy "documents_select" on public.documents
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or entity_id in (
      select lt.lease_id from lease_tenants lt
      join tenants t on t.id = lt.tenant_id
      where t.user_id = (select auth.uid())
    )
  );

create policy "documents_insert_owner" on public.documents
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "documents_delete_owner" on public.documents
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));
```

### Cleanup Cron Scheduling Pattern (DB-06, DB-07, DB-09)
```sql
-- Archive tables
create table if not exists public.security_events_archive (
  like public.security_events including all
);
create table if not exists public.user_errors_archive (
  like public.user_errors including all
);
create table if not exists public.stripe_webhook_events_archive (
  like public.stripe_webhook_events including all
);

-- Schedule at 3 AM UTC (locked decision)
select cron.schedule(
  'cleanup-security-events',
  '0 3 * * *',
  $$select public.cleanup_old_security_events()$$
);

select cron.schedule(
  'cleanup-errors',
  '15 3 * * *',
  $$select public.cleanup_old_errors()$$
);

select cron.schedule(
  'cleanup-webhook-events',
  '30 3 * * *',
  $$select public.cleanup_old_webhook_events()$$
);
```

### Cron Monitoring via job_run_details (DB-08)
```sql
-- pg_cron stores run results in cron.job_run_details
-- Create a monitoring function that checks for failures
create or replace function public.check_cron_health()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failed record;
begin
  -- Check for failed jobs in the last 25 hours (catches daily jobs)
  for v_failed in
    select j.jobname, d.status, d.return_message, d.start_time
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where d.start_time > now() - interval '25 hours'
      and d.status = 'failed'
    order by d.start_time desc
  loop
    -- Insert error into user_errors for Sentry pickup
    insert into public.user_errors (
      error_type, error_code, error_message, context
    ) values (
      'application',
      'CRON_FAILURE',
      format('Cron job "%s" failed: %s', v_failed.jobname, v_failed.return_message),
      jsonb_build_object('job', v_failed.jobname, 'start_time', v_failed.start_time)
    );

    -- Also fire pg_notify for immediate alerting
    perform pg_notify('cron_failure', json_build_object(
      'job', v_failed.jobname,
      'error', v_failed.return_message,
      'time', v_failed.start_time
    )::text);
  end loop;
end;
$$;

-- Run monitoring check hourly
select cron.schedule(
  'check-cron-health',
  '0 * * * *',
  $$select public.check_cron_health()$$
);
```

## Discretion Recommendations

### Stripe Webhook Event Retention
**Recommendation:** 90 days for succeeded events, 180 days for failed events (longer for debugging), archive after retention period.
**Rationale:** Stripe retries events for up to 72 hours, plus 30-day dispute window, plus safety margin. Failed events need longer retention for forensic analysis.

### Cleanup Batch Sizes
**Recommendation:** Use batch DELETE with LIMIT 10000 per execution to avoid long-running transactions and table bloat.
**Rationale:** Large DELETE operations hold locks and generate WAL. Batched deletes are gentler on the DB.
```sql
-- Batch pattern inside cleanup function
with to_archive as (
  select id from public.stripe_webhook_events
  where processed_at < now() - interval '90 days'
    and status = 'succeeded'
  limit 10000
  for update skip locked
)
...
```

### GDPR Implementation Method
**Recommendation:** DB function (SECURITY DEFINER) for data anonymization, not Edge Function.
**Rationale:** Atomicity is critical -- all tables must be anonymized in one transaction or none. A DB function ensures this. The Edge Function would need multiple RPC calls with potential partial failure.

### GDPR Grace Period
**Recommendation:** 30-day grace period with soft-delete flag on users table.
**Rationale:** GDPR Article 17(1) allows "without undue delay" but a 30-day recovery window prevents accidental permanent deletion. Add `deletion_requested_at` column to users, with a cron job that runs anonymization after 30 days.

### Owner Account Deletion
**Recommendation:** Block immediate deletion if owner has active leases or pending payments. Require owner to end all leases first, then process deletion with property soft-delete and data anonymization.
**Rationale:** Active leases involve tenant obligations -- can't anonymize mid-lease. Financial records must be preserved per tenant's rights.

### Cron Monitoring Approach
**Recommendation:** Use `cron.job_run_details` table monitoring + `pg_notify` + error table insertion (see code example above). This avoids HTTP calls from inside Postgres and leverages existing infrastructure (user_errors table, pg_notify channel, Sentry error pickup).
**Rationale:** pg_cron cannot make HTTP calls to Sentry. The `cron.job_run_details` table is built-in and tracks all job execution results. A monitoring cron job checks for failures and routes them through existing channels.

### expire-leases Lock Strategy
**Recommendation:** `FOR UPDATE SKIP LOCKED` (matching calculate_late_fees pattern).
**Rationale:** Consistent with existing cron functions. Advisory locks are unnecessary for row-level operations -- SKIP LOCKED handles concurrent runs cleanly.

### Migration Ordering
**Recommendation:**
1. DB-12 (trigger consolidation) -- dependency for DB-10
2. DB-01, DB-10, DB-11 (simple constraint additions)
3. DB-02 (documents owner_user_id + RLS rewrite)
4. DB-03 (leases column drop -- most impactful, needs RPC rewrites)
5. DB-05 (expire-leases function rewrite)
6. DB-06, DB-07, DB-09 (cleanup cron scheduling)
7. DB-08 (cron monitoring)
8. DB-04 (GDPR -- most complex, depends on understanding final schema)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `property_owner_id` via property_owners table | `owner_user_id` direct FK to users | Migration 20251215010000 | All new code uses owner_user_id; old column is vestigial |
| Inline SQL in cron.schedule | Named SECURITY DEFINER functions | Phase 56 (20260222120000) | Better error handling, monitoring, maintainability |
| `update_updated_at_column()` no search_path | `set_updated_at()` with search_path | Base schema vs optimization migration | Security fix: search_path prevents injection |
| ON DELETE SET NULL for activity | ON DELETE CASCADE (proposed) | This phase | Activity records follow user lifecycle |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (integration project) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:rls` |
| Full suite command | `pnpm test:rls && pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | activity.user_id NOT NULL | integration | `pnpm test:rls -- --run tests/integration/rls/activity.rls.test.ts` | No - Wave 0 |
| DB-02 | documents owner_user_id + RLS | integration | `pnpm test:rls -- --run tests/integration/rls/documents.rls.test.ts` | No - Wave 0 (TEST-08 covers this) |
| DB-03 | leases single owner column | integration | `pnpm test:rls -- --run tests/integration/rls/leases.rls.test.ts` | Yes |
| DB-04 | GDPR anonymization | integration | `pnpm test:rls -- --run tests/integration/rls/gdpr-anonymize.test.ts` | No - Wave 0 |
| DB-05 | expire-leases function | unit/manual | Manual: run `select public.expire_leases()` against test DB | Manual-only (pg_cron function) |
| DB-06 | security events cleanup scheduled | manual | Verify via `select * from cron.job where jobname = 'cleanup-security-events'` | Manual-only (cron scheduling) |
| DB-07 | errors cleanup scheduled | manual | Verify via `select * from cron.job where jobname = 'cleanup-errors'` | Manual-only (cron scheduling) |
| DB-08 | cron monitoring | manual | Verify via `select * from cron.job where jobname = 'check-cron-health'` | Manual-only |
| DB-09 | webhook events retention | manual | Verify via `select * from cron.job where jobname = 'cleanup-webhook-events'` | Manual-only |
| DB-10 | inspection_photos updated_at | integration | Existing inspections tests + manual column check | Partial (inspections.rls.test.ts exists) |
| DB-11 | blogs author column | manual | Verify column exists via schema query | Manual-only |
| DB-12 | trigger function consolidated | manual | Verify `update_updated_at_column` does not exist: `select proname from pg_proc where proname = 'update_updated_at_column'` | Manual-only |

### Sampling Rate
- **Per task commit:** `pnpm test:rls` (existing RLS tests must still pass)
- **Per wave merge:** `pnpm test:rls && pnpm test:unit && pnpm typecheck`
- **Phase gate:** Full suite green + manual cron job verification + `pnpm db:types` regeneration

### Wave 0 Gaps
- [ ] `tests/integration/rls/documents.rls.test.ts` -- covers DB-02 (owner_user_id RLS)
- [ ] `tests/integration/rls/gdpr-anonymize.test.ts` -- covers DB-04 (anonymization correctness)
- [ ] Type regeneration: `pnpm db:types` after all schema migrations applied

## Open Questions

1. **RPCs still using leases.property_owner_id**
   - What we know: At least 10+ functions in migrations reference `l.property_owner_id` or `leases.property_owner_id`
   - What's unclear: Whether all of these have been superseded by later `CREATE OR REPLACE` migrations. The base schema and early migrations show the old references, but later migrations may have already fixed them.
   - Recommendation: Before writing the migration, query the live DB for functions containing `property_owner_id`: `SELECT proname, prosrc FROM pg_proc WHERE prosrc LIKE '%property_owner_id%'`

2. **get_current_property_owner_id() usage after cleanup**
   - What we know: This function does a DB lookup through stripe_connected_accounts. It is still referenced in supabase.ts types.
   - What's unclear: Whether any remaining RLS policies or code depend on it after the documents rewrite
   - Recommendation: After DB-02 and DB-03, check if it can be dropped entirely. If still needed for stripe_connected_accounts context, keep but document its limited scope.

3. **activity table NULL user_id rows**
   - What we know: ON DELETE SET NULL means deleted users created NULL user_id rows
   - What's unclear: How many NULL rows exist in production
   - Recommendation: Migration should first handle NULLs (delete orphaned activity rows), then add NOT NULL

## Sources

### Primary (HIGH confidence)
- Existing migrations in `supabase/migrations/` -- examined 20+ migration files for schema state
- `20260222120000_phase56_pg_cron_jobs.sql` -- established cron function pattern
- `20251101000000_base_schema.sql` -- activity, documents, leases, notifications table definitions
- `20260304120000_rpc_auth_guards.sql` -- cleanup functions with search_path fixes
- `20251215010000_add_owner_user_id_columns.sql` -- owner_user_id migration history

### Secondary (MEDIUM confidence)
- [Sentry Cron Monitoring docs](https://docs.sentry.io/product/crons/) -- HTTP/CLI check-in methods
- [Sentry CLI Crons](https://docs.sentry.io/cli/crons/) -- CLI wrapper approach

### Tertiary (LOW confidence)
- [PostgreSQL GDPR Compliance Guide](https://www.getgalaxy.io/learn/glossary/how-to-ensure-gdpr-compliance-in-postgresql) -- general GDPR patterns for PostgreSQL
- [PostgreSQL Anonymizer](https://www.postgresql.org/about/news/postgresql-anonymizer-10-privacy-by-design-for-postgres-2452/) -- extension-based approach (not using, but informed patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already in use in project
- Architecture: HIGH -- patterns established by existing cron jobs and migrations
- Pitfalls: HIGH -- identified from actual code review of existing migrations and RPCs
- GDPR: MEDIUM -- general best practices applied to specific schema, needs validation against actual production data

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable -- database patterns don't change rapidly)
