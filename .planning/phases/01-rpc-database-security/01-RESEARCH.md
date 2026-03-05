# Phase 1: RPC & Database Security - Research

**Researched:** 2026-03-04
**Domain:** PostgreSQL SECURITY DEFINER functions, RLS policies, Supabase auth
**Confidence:** HIGH

## Summary

Phase 1 addresses the most critical security vulnerabilities in TenantFlow: 12+ SECURITY DEFINER RPC functions that accept a `p_user_id` parameter without verifying it matches `auth.uid()`, meaning any authenticated user can call these RPCs with another user's ID and exfiltrate their data. Additionally, error monitoring RPCs expose ALL user data with no filtering, lease activation/signing RPCs have no caller authorization, and several `FOR ALL` RLS policies on authenticated tables grant overly broad access.

The codebase has 131+ migration files with many `CREATE OR REPLACE FUNCTION` calls layered on top of each other. The latest state of each function must be determined by reading migrations in timestamp order. The `get_current_owner_user_id()` function has been fixed (now returns `auth.uid()` directly), and `security_events` ENUMs have already been migrated to text + CHECK constraints. The main work is adding `auth.uid()` validation guards to all SECURITY DEFINER RPCs, restricting error monitoring RPCs to own-user data, adding authorization checks to lease RPCs, splitting remaining `FOR ALL` policies, and adding `SET search_path` to cleanup functions.

**Primary recommendation:** Add an `IF p_user_id != (select auth.uid()) THEN RAISE EXCEPTION` guard as the first line of every SECURITY DEFINER RPC that accepts a user ID parameter. This is a single SQL migration file per batch of functions.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | All 12+ SECURITY DEFINER RPCs validate `p_user_id = auth.uid()` | Functions identified below with exact signatures. Single migration with `auth.uid()` guard at top of each function. |
| SEC-02 | Error monitoring RPCs restricted to own-user data | `get_error_summary`, `get_common_errors`, `get_error_prone_users` need WHERE user_id filter or admin-only access |
| SEC-03 | `activate_lease_with_pending_subscription` verifies caller is lease owner | Function takes only `p_lease_id` -- need to join leases to verify `owner_user_id = auth.uid()` |
| SEC-04 | `sign_lease_and_check_activation` verifies caller identity matches signer_type | Function takes `p_signer_type` -- owner must match lease owner, tenant must match lease tenant |
| SEC-05 | All SECURITY DEFINER functions have `SET search_path TO 'public'` | `cleanup_old_security_events` and `cleanup_old_errors` confirmed missing it |
| SEC-06 | `FOR ALL` policies replaced with per-operation policies | `storage.objects` lease-documents bucket, plus any remaining service_role `FOR ALL` on public tables |
| SEC-07 | `security_events` ENUMs replaced with text + CHECK constraints | ALREADY DONE in migration 20251231081143 -- verify only |
| SEC-08 | `get_current_owner_user_id()` rewritten with static SQL | ALREADY DONE in migration 20260224191923 -- now `select auth.uid()`. Verify only. |
| SEC-09 | `health_check()` changed from SECURITY DEFINER to SECURITY INVOKER | Currently SECURITY DEFINER in base schema. Simple ALTER. |
| SEC-10 | `cleanup_old_security_events` and `cleanup_old_errors` add `SET search_path` | Both missing search_path. Simple ALTER. |
| SEC-11 | `notify_critical_error` trigger detects system-wide spikes | Currently checks `WHERE error_message = NEW.error_message AND user_id = NEW.user_id` -- should check ALL users for same error_message |
| SEC-12 | `log_user_error` rate-limited to prevent fake alert flooding | Need to add a rate check (e.g., count recent errors from same user_id) before inserting |
| DOC-01 | CLAUDE.md updated after phase completes | Update any changed function names or patterns |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15 (Supabase) | Database + RPC functions | Supabase managed PostgreSQL |
| Supabase CLI | latest | Migration management | `supabase migration new`, `supabase db push` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.x | Integration testing (RLS tests) | Verify RPC authorization after changes |
| @supabase/supabase-js | 2.97.0 | Test client for RLS integration tests | Testing RPC calls with different user contexts |

**No new dependencies needed.** This phase is entirely SQL migrations and RLS integration tests.

## Architecture Patterns

### Migration File Structure
```
supabase/migrations/
  YYYYMMDDHHMMSS_description.sql   # Timestamp-ordered migrations
```

All changes MUST be in new migration files. Never edit existing migrations.

### Pattern 1: auth.uid() Guard in SECURITY DEFINER RPC
**What:** Every SECURITY DEFINER function that accepts a `p_user_id` parameter must validate it matches the caller's JWT.
**When to use:** All 12+ dashboard/analytics RPCs.
**Example:**
```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  -- ... existing function body unchanged ...
END;
$$;
```

### Pattern 2: Lease Owner Verification
**What:** Functions that operate on leases must verify the caller is authorized (owner or assigned tenant).
**When to use:** `activate_lease_with_pending_subscription`, `sign_lease_and_check_activation`.
**Example:**
```sql
-- Inside activate_lease_with_pending_subscription, after locking the lease:
IF v_lease.owner_user_id != (SELECT auth.uid()) THEN
  RETURN QUERY SELECT FALSE, 'Access denied: not the lease owner'::TEXT;
  RETURN;
END IF;
```

### Pattern 3: Lease Signer Verification
**What:** `sign_lease_and_check_activation` must verify signer_type matches caller identity.
**Example:**
```sql
-- After fetching the lease, verify signer identity:
IF p_signer_type = 'owner' AND v_lease.owner_user_id != (SELECT auth.uid()) THEN
  RETURN QUERY SELECT FALSE, FALSE, 'Access denied: not the lease owner'::TEXT;
  RETURN;
ELSIF p_signer_type = 'tenant' THEN
  -- Verify caller is a tenant on this lease
  IF NOT EXISTS (
    SELECT 1 FROM lease_tenants lt
    JOIN tenants t ON t.id = lt.tenant_id
    WHERE lt.lease_id = p_lease_id AND t.user_id = (SELECT auth.uid())
  ) THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Access denied: not a tenant on this lease'::TEXT;
    RETURN;
  END IF;
END IF;
```

### Pattern 4: Per-Operation RLS Policies (replace FOR ALL)
**What:** Split `FOR ALL` into separate `FOR SELECT`, `FOR INSERT`, `FOR UPDATE`, `FOR DELETE`.
**When to use:** Any policy that currently uses `FOR ALL` on authenticated tables.
**Example:**
```sql
-- Drop the FOR ALL policy
DROP POLICY IF EXISTS "Service can manage lease documents" ON storage.objects;

-- Replace with per-operation policies
CREATE POLICY "Users can upload lease documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lease-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own lease documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lease-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'lease-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own lease documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lease-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Anti-Patterns to Avoid
- **Trusting `p_user_id` from the caller:** SECURITY DEFINER runs as the function owner (postgres), bypassing RLS. The `p_user_id` parameter comes from the client and is trivially forgeable.
- **Using `FOR ALL` on authenticated tables:** Grants SELECT, INSERT, UPDATE, and DELETE in a single policy, making it impossible to restrict individual operations.
- **SECURITY DEFINER without `SET search_path`:** Allows search_path manipulation attacks where malicious schemas shadow standard functions.
- **Dynamic SQL in SECURITY DEFINER functions:** The original `get_current_owner_user_id()` used `EXECUTE format()` which prevented query plan caching and introduced SQL injection surface.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth verification in RPC | Custom token parsing | `(SELECT auth.uid())` | Supabase provides auth.uid() in the request context; wrapping in subselect optimizes plan caching |
| Rate limiting in PL/pgSQL | Complex token bucket | Simple count-based check | `SELECT count(*) FROM user_errors WHERE user_id = auth.uid() AND created_at > now() - interval '1 minute'` is sufficient for SEC-12 |
| Migration ordering | Manual file naming | `supabase migration new name` | Generates correct timestamp prefix |

## Common Pitfalls

### Pitfall 1: Forgetting to add owner_user_id to SELECT in lease functions
**What goes wrong:** `activate_lease_with_pending_subscription` currently selects `id, lease_status, owner_signed_at, tenant_signed_at` but NOT `owner_user_id`. Adding an auth check requires selecting it.
**How to avoid:** Always include the authorization columns in the initial SELECT ... INTO query.

### Pitfall 2: sign_lease needs to resolve tenant user_id via join
**What goes wrong:** The `sign_lease_and_check_activation` function knows the lease but needs to verify the caller is a tenant ON that lease. The tenants table has `user_id` (auth user) but `lease_tenants` links by `tenant_id` (tenants.id).
**How to avoid:** Join `lease_tenants -> tenants` to compare `tenants.user_id` against `auth.uid()`.

### Pitfall 3: Error monitoring RPCs have no p_user_id parameter
**What goes wrong:** `get_error_summary`, `get_common_errors`, and `get_error_prone_users` take `hours_back` and `limit_count` parameters only. They return data for ALL users. Adding a user filter changes their behavior.
**How to avoid:** Decision needed: either (a) restrict to caller's own data by adding `WHERE user_id = auth.uid()`, or (b) restrict to admin-only via JWT app_metadata check. Recommendation: admin-only check since these are admin monitoring functions.

### Pitfall 4: notify_critical_error currently checks user-specific spike
**What goes wrong:** The trigger checks `WHERE error_message = NEW.error_message` but the review says it should detect "system-wide spikes (not per-user only)". Looking at the actual code, it does NOT filter by user_id -- it checks ALL matching error_messages. The review finding may be about the `pg_notify` payload including `NEW.user_id` which could be misleading, but the spike detection IS system-wide already.
**How to avoid:** Re-read the actual trigger code carefully. The current code checks system-wide (no user_id filter). SEC-11 may need clarification -- verify the actual behavior vs the review claim.

### Pitfall 5: service_role policies -- BYPASSRLS makes them redundant
**What goes wrong:** The `service_role` in Supabase has BYPASSRLS privilege, meaning it ignores ALL RLS policies. `FOR ALL TO service_role` policies are technically redundant and only add planner overhead.
**How to avoid:** Simply DROP the `FOR ALL service_role` policies rather than splitting them. Migration 20260225140000 already dropped per-operation service_role policies but explicitly skipped `FOR ALL` ones (line 26: `AND NOT (p.polcmd = '*')`). The remaining `FOR ALL` service_role policies should be dropped entirely.

### Pitfall 6: Existing search_path fixes may be partial
**What goes wrong:** Multiple migrations (20251230240000, 20251230250000, 20251231073922) have attempted to fix search_path on SECURITY DEFINER functions. Some use `search_path = ''` (empty), others use `search_path = 'public'`. Both work but inconsistently. Also, `CREATE OR REPLACE` in later migrations may reset search_path.
**How to avoid:** When rewriting functions for auth guards, always include `SET search_path TO 'public'` in the function definition. Don't rely on previous ALTER statements.

## Code Examples

### Full list of SECURITY DEFINER RPCs requiring auth.uid() guard (SEC-01)

These functions accept a user ID parameter and filter data by it, but never verify the parameter matches the caller:

1. `get_dashboard_stats(p_user_id uuid)` -- latest in 20260225130000
2. `get_dashboard_data_v2(p_user_id uuid)` -- latest in 20260301070000
3. `get_billing_insights(owner_id_param uuid, ...)` -- latest in 20260224193000
4. `get_maintenance_analytics(user_id uuid)` -- latest in 20260224193000
5. `get_occupancy_trends_optimized(p_user_id uuid, ...)` -- latest in 20251225130000
6. `get_revenue_trends_optimized(p_user_id uuid, ...)` -- latest in 20251225130000
7. `get_property_performance_cached(p_user_id uuid)` -- latest in 20251225130000
8. `get_property_performance_trends(p_user_id uuid)` -- latest in 20251225130000
9. `get_property_performance_with_trends(p_user_id uuid, ...)` -- latest in 20251225130000
10. `get_user_profile(p_user_id uuid)` -- latest in 20251226163520
11. `get_user_dashboard_activities(p_user_type text, ...)` -- needs audit (may use auth.uid() internally)
12. `get_dashboard_time_series(...)` -- mentioned in roadmap but may not exist yet (see note in 20260224191923)
13. `get_metric_trend(...)` -- mentioned in roadmap but may not exist yet

**Note:** `get_user_dashboard_activities` and `get_metric_trend`/`get_dashboard_time_series` need verification of current existence and signatures. The 20260224191923 migration notes they "do not exist in this database" and may have been created in 20260224192500 or 20260301070000.

### Error monitoring RPCs requiring restriction (SEC-02)

1. `get_error_summary(hours_back integer)` -- returns ALL users' errors grouped by type
2. `get_common_errors(hours_back integer, limit_count integer)` -- returns ALL users' common errors
3. `get_error_prone_users(hours_back integer, min_errors integer)` -- returns user_ids and error counts for ALL users

**Recommendation:** Add admin-only guard:
```sql
IF NOT EXISTS (
  SELECT 1 FROM public.users
  WHERE id = (SELECT auth.uid())
  AND user_type = 'ADMIN'
) THEN
  RAISE EXCEPTION 'Access denied: admin only';
END IF;
```

Or alternatively, restrict to own-user data by adding `AND user_id = (SELECT auth.uid())` to each WHERE clause, making them useless for admin monitoring but safe.

### Already-fixed items (verify only)

- **SEC-07:** `security_events` enums migrated to text + CHECK in migration 20251231081143. The types `security_event_type` and `security_event_severity` were dropped. Columns now use text with CHECK constraints.
- **SEC-08:** `get_current_owner_user_id()` fixed in migration 20260224191923. Now returns `(SELECT auth.uid())` directly. No dynamic SQL.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `EXECUTE format()` in `get_current_owner_user_id` | Direct `SELECT auth.uid()` | Migration 20260224191923 | Removes SQL injection vector, enables plan caching |
| PostgreSQL ENUMs for security_events | Text + CHECK constraints | Migration 20251231081143 | Easier to maintain, no ALTER TYPE needed |
| service_role policies on all tables | Drop redundant (BYPASSRLS handles it) | Migration 20260225140000 (partial) | Fewer policies = faster planner |

## Open Questions

1. **Do `get_metric_trend` and `get_dashboard_time_series` exist as standalone functions?**
   - What we know: Migration 20260224191923 says "they do not exist." Migration 20260301070000 created `get_dashboard_data_v2` which consolidates them.
   - What's unclear: Were standalone versions created in 20260224192500?
   - Recommendation: Check migration 20260224192500. If they exist, add auth guards. If not, only `get_dashboard_data_v2` needs the guard.

2. **Should error monitoring RPCs be admin-only or own-user-only?**
   - What we know: They currently return ALL user data with no filter.
   - What's unclear: Whether an admin dashboard actually calls these, or if they're unused.
   - Recommendation: Make them admin-only (JWT `user_type = 'ADMIN'` check). If no admin role exists in practice, restrict to own-user data as fallback.

3. **What `FOR ALL` policies remain in production?**
   - What we know: Migration 20260225140000 explicitly skipped `FOR ALL` policies in its dynamic drop loop. The `storage.objects` "Service can manage lease documents" `FOR ALL` from 20251110160000 likely still exists.
   - Recommendation: Run `SELECT polname, relname FROM pg_policy ... WHERE polcmd = '*'` against production to get the definitive list. For planning purposes, address: `storage.objects` lease-documents, and any surviving `users`/`tenants` service_role `FOR ALL` policies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (integration project) |
| Config file | `vitest.config.ts` (integration project section) |
| Quick run command | `pnpm test:integration -- --run tests/integration/rls/` |
| Full suite command | `pnpm test:rls` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | RPC rejects wrong p_user_id | integration | `pnpm test:integration -- --run tests/integration/rls/rpc-auth.test.ts` | Wave 0 |
| SEC-02 | Error RPCs restricted | integration | `pnpm test:integration -- --run tests/integration/rls/error-monitoring.test.ts` | Wave 0 |
| SEC-03 | activate_lease rejects non-owner | integration | `pnpm test:integration -- --run tests/integration/rls/lease-rpcs.test.ts` | Wave 0 |
| SEC-04 | sign_lease verifies signer identity | integration | `pnpm test:integration -- --run tests/integration/rls/lease-rpcs.test.ts` | Wave 0 |
| SEC-05 | All SECURITY DEFINER have search_path | unit (SQL parse) | Manual verification via migration review | manual-only |
| SEC-06 | No FOR ALL on authenticated tables | integration | `pnpm test:integration -- --run tests/integration/rls/for-all-audit.test.ts` | Wave 0 |
| SEC-07 | security_events uses text not ENUM | unit | Manual verification (already done) | manual-only |
| SEC-08 | get_current_owner_user_id is static SQL | unit | Manual verification (already done) | manual-only |
| SEC-09 | health_check is SECURITY INVOKER | unit | Manual verification via migration | manual-only |
| SEC-10 | Cleanup functions have search_path | unit | Manual verification via migration | manual-only |
| SEC-11 | notify_critical_error detects system-wide spikes | integration | `pnpm test:integration -- --run tests/integration/rls/error-monitoring.test.ts` | Wave 0 |
| SEC-12 | log_user_error is rate-limited | integration | `pnpm test:integration -- --run tests/integration/rls/error-monitoring.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:integration -- --run tests/integration/rls/` (all RLS tests)
- **Per wave merge:** `pnpm test:rls && pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/integration/rls/rpc-auth.test.ts` -- test that calling dashboard RPCs with wrong user ID raises error (covers SEC-01)
- [ ] `tests/integration/rls/lease-rpcs.test.ts` -- test lease activation/signing authorization (covers SEC-03, SEC-04)
- [ ] `tests/integration/rls/error-monitoring.test.ts` -- test error RPC access control (covers SEC-02, SEC-11, SEC-12)
- [ ] Test infrastructure: need two test users (owner A, owner B) already available in `getTestCredentials()`

## Sources

### Primary (HIGH confidence)
- Migration file analysis: All 131+ migration files in `supabase/migrations/` read and cross-referenced
- `20251225130000_optimize_rpc_functions.sql` -- 5 SECURITY DEFINER RPCs with no auth.uid() check
- `20251220050000_add_error_monitoring.sql` -- error monitoring RPCs with no user filtering
- `20251128130001_activate_lease_with_pending_subscription.sql` -- no auth check on lease activation
- `20251128120001_update_sign_lease_rpc_with_method.sql` -- no signer identity verification
- `20260301070000_unified_dashboard_rpc.sql` -- `get_dashboard_data_v2` also vulnerable
- `20260225130000_hotfix_dashboard_stats_column_names.sql` -- `get_dashboard_stats` also vulnerable
- `20251219033837_create_security_events.sql` -- original ENUM creation (now migrated)
- `20251231081143_migrate_enums_to_text_constraints.sql` -- confirmed ENUM migration complete
- `20260224191923_fix_harden_rls_regression.sql` -- confirmed `get_current_owner_user_id()` fixed

### Secondary (MEDIUM confidence)
- Review findings in `.planning/REVIEW-2026-03-04.md` -- 8-agent review identified the vulnerabilities

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- pure SQL migrations, no new libraries
- Architecture: HIGH -- patterns well-established in existing codebase
- Pitfalls: HIGH -- directly verified against actual migration files
- Open questions: MEDIUM -- `FOR ALL` policy inventory needs live DB query

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain -- PostgreSQL security patterns don't change)
