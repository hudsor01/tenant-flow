# Supabase Permissions Remediation Plan

**Date**: 2025-12-31
**Status**: Ready for Implementation
**Priority**: Critical (Production Impact)

## Executive Summary

Production 503 errors on analytics endpoints are caused by missing PostgreSQL function EXECUTE permissions for the `service_role` role. The backend uses the Supabase secret key (`SB_SECRET_KEY`), which authenticates as `service_role`. A recent security migration restricted function access but failed to include `service_role` in the grants.

## Root Cause Analysis

### The Error Chain

```
User Request → Backend API → SubscriptionGuard → rpcWithRetries('check_user_feature_access')
                                                           ↓
                                                 Uses adminClient (service_role)
                                                           ↓
                                                 PostgreSQL: "permission denied"
                                                           ↓
                                                 503 Service Unavailable
```

### Technical Details

1. **Migration `20251230240000_fix_function_security.sql`**:
   - Correctly revoked PUBLIC access to sensitive functions
   - Only granted EXECUTE to `authenticated` role
   - **Missing**: Grant to `service_role`

2. **Supabase Key Architecture** (per official docs):
   | Key Type | PostgreSQL Role | RLS Behavior |
   |----------|-----------------|--------------|
   | `sb_publishable_...` / `anon` | `anon` | Subject to RLS |
   | `sb_secret_...` / `service_role` | `service_role` | Bypasses RLS (has `bypassrls`) |

3. **Key Insight**: `bypassrls` only bypasses Row Level Security policies. **Function EXECUTE permissions are separate** and must be explicitly granted.

## Affected Endpoints

| Endpoint | Error | Root Cause |
|----------|-------|------------|
| `/api/v1/owner/analytics/dashboard` | 503 | `check_user_feature_access` permission denied |
| `/api/v1/financial/analytics/*` | 503 | `check_user_feature_access` permission denied |
| Any guarded endpoint | 503 | SubscriptionGuard fails |

## Solution

### Immediate Fix (Migration)

Created: `supabase/migrations/20251231063902_fix_service_role_function_permissions.sql`

This migration:
1. Grants EXECUTE on `check_user_feature_access` to `service_role`
2. Grants EXECUTE on all analytics functions to `service_role`
3. Ensures backend can call all required RPCs

### Deployment Steps

```bash
# 1. Push migration to production
pnpm db:push

# 2. Verify the fix
psql $DATABASE_URL -c "SELECT has_function_privilege('service_role', 'public.check_user_feature_access(text, text)', 'EXECUTE');"
# Expected: t (true)

# 3. Restart Railway deployment (optional, for clean state)
railway redeploy

# 4. Test endpoints
curl -H "Authorization: Bearer $TOKEN" https://api.tenantflow.app/api/v1/owner/analytics/dashboard
```

## Long-Term Prevention Strategy

### 1. Migration Review Checklist

Add to PR review process for any migration that modifies function permissions:

- [ ] If revoking PUBLIC, did you grant to `service_role` for backend functions?
- [ ] If revoking PUBLIC, did you grant to `authenticated` for user-facing functions?
- [ ] Are there any RPC calls in the backend that use `adminClient`?
- [ ] Run verification query after migration (see below)

### 2. Permission Verification Query

Add this to CI/CD or post-migration checks:

```sql
-- Verify all backend RPC functions have service_role access
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as args,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_ok,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_ok
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'check_user_feature_access',
    'get_dashboard_stats',
    'get_financial_overview',
    'get_revenue_trends_optimized'
    -- Add other critical functions
  )
ORDER BY p.proname;
```

### 3. Documentation Update

Update `supabase/SCHEMA.md` to include:

```markdown
## Function Permission Guidelines

When creating SECURITY DEFINER functions:

1. **Backend-only functions** (called via adminClient):
   - Grant to: `service_role`
   - Example: `cleanup_old_errors`, `acquire_webhook_event_lock_with_id`

2. **User-facing functions** (called with user's JWT):
   - Grant to: `authenticated`
   - Example: `get_dashboard_stats`, `get_user_profile`

3. **Hybrid functions** (called by both):
   - Grant to: `authenticated, service_role`
   - Example: `check_user_feature_access`, `get_stripe_customer_by_user_id`

4. **Public functions** (unauthenticated access):
   - Grant to: `anon, authenticated`
   - Example: `health_check`
```

### 4. Environment Variable Naming (Already Aligned)

The codebase already uses Supabase's recommended naming:

| Env Variable | Purpose | Status |
|--------------|---------|--------|
| `SUPABASE_URL` | Project API URL | ✅ Correct |
| `SB_SECRET_KEY` | Backend/admin key | ✅ Correct |
| `SUPABASE_PUBLISHABLE_KEY` | Frontend/public key | ✅ Correct |

### 5. Future Migration Template

```sql
-- Template for function security migrations
-- ============================================

-- 1. Create function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.my_function(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  ...
END;
$$;

-- 2. Revoke default PUBLIC access
REVOKE ALL ON FUNCTION public.my_function(...) FROM PUBLIC, anon;

-- 3. Grant based on who calls it:
-- For backend (adminClient) functions:
GRANT EXECUTE ON FUNCTION public.my_function(...) TO service_role;

-- For frontend (authenticated user) functions:
GRANT EXECUTE ON FUNCTION public.my_function(...) TO authenticated;

-- For both:
GRANT EXECUTE ON FUNCTION public.my_function(...) TO authenticated, service_role;
```

## Verification Checklist

After deploying the fix:

- [ ] No 503 errors in Railway logs
- [ ] Dashboard loads successfully
- [ ] Financials page loads successfully
- [ ] SubscriptionGuard passes for authenticated users
- [ ] Verification query shows all functions have correct permissions

## Related Files

- `supabase/migrations/20251230240000_fix_function_security.sql` - Original (incomplete) security migration
- `supabase/migrations/20251231063902_fix_service_role_function_permissions.sql` - Fix migration
- `apps/backend/src/shared/guards/subscription.guard.ts` - SubscriptionGuard that calls check_user_feature_access
- `apps/backend/src/database/supabase.service.ts` - rpcWithRetries uses adminClient

## Timeline

| Phase | Action | Status |
|-------|--------|--------|
| Analysis | Root cause identification | ✅ Complete |
| Documentation | Fetch Supabase docs, verify approach | ✅ Complete |
| Fix 1 | Create service_role permission migration | ✅ Complete |
| Fix 2 | Create search_path fix migration | ✅ Complete |
| Fix 3 | Create remaining functions search_path migration | ✅ Complete |
| Deploy | Push all migrations to production | ✅ Complete |
| Verify | Test endpoints, check logs - all 200 OK | ✅ Complete |
| Prevention | Update review checklist, docs | ⏳ Pending |

## Migrations Applied

1. `20251231063902_fix_service_role_function_permissions.sql` - Grants EXECUTE to service_role
2. `20251231065044_fix_function_search_paths.sql` - Fixes 5 functions with lease_tenants references
3. `20251231073922_fix_all_function_search_paths.sql` - Fixes 20+ remaining functions with search_path = 'public'
