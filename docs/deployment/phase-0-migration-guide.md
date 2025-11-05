# Phase 0: Critical Security Migration Guide

## Overview

This guide covers the deployment of critical RLS policies for payment tables and the tenant onboarding bug fix.

**Priority:** P0 - SECURITY CRITICAL
**Estimated Time:** 30 minutes
**Downtime Required:** None (zero-downtime migration)
**Rollback Time:** <5 minutes if needed

## What's Changing

### Database Migrations

1. **`20250215120000_add_rent_payment_rls.sql`**
   - Adds RLS policies to `rent_payment` table
   - **Impact:** Financial data now properly isolated
   - **Risk:** Low (policies permissive, won't block existing workflows)

2. **`20250215120001_add_payment_method_rls.sql`**
   - Adds RLS policies to `tenant_payment_method` table
   - **Impact:** PCI compliance improvement
   - **Risk:** Low (tenant-scoped access already enforced by backend)

### Frontend Fix

3. **Tenant Onboarding Environment Variable**
   - File: `apps/frontend/src/app/(protected)/tenant/onboarding/page.tsx`
   - Change: `NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_API_BASE_URL`
   - **Impact:** Fixes tenant activation after email confirmation
   - **Risk:** None (fixes existing bug)

## Pre-Deployment Checklist

### 1. Verify Environment

```bash
# Check Doppler CLI is installed
doppler --version

# Check database connectivity
doppler run --command "psql \$DIRECT_URL -c 'SELECT version();'"

# Verify you're in correct project directory
pwd  # Should be /path/to/tenant-flow
```

### 2. Backup Database (Optional but Recommended)

```bash
# Create backup before migration (production only)
doppler run --config production -- pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### 3. Check for Orphaned Records

```bash
# Run data integrity check
doppler run -- psql $DIRECT_URL <<'SQL'
-- Check for payments with invalid tenant/landlord IDs
SELECT COUNT(*) as orphaned_payments
FROM rent_payment
WHERE tenantId NOT IN (SELECT id FROM users)
   OR landlordId NOT IN (SELECT id FROM users);

-- Check for payment methods with invalid tenant IDs
SELECT COUNT(*) as orphaned_payment_methods
FROM tenant_payment_method
WHERE tenantId NOT IN (SELECT id FROM users);
SQL
```

**Expected Output:** Both counts should be `0`

**If NOT zero:**
- Review orphaned records
- Decision: Delete (if test data) or fix (if production)
- See "Data Cleanup" section below

## Migration Steps

### Step 1: Apply Database Migrations (Staging)

```bash
# Switch to staging config
doppler setup --config staging

# Apply rent_payment RLS policies
doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120000_add_rent_payment_rls.sql

# Verify output shows: "rent_payment RLS policies successfully created and verified"

# Apply tenant_payment_method RLS policies
doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120001_add_payment_method_rls.sql

# Verify output shows: "tenant_payment_method RLS policies successfully created and verified"
```

**Expected Output:**
```
NOTICE:  rent_payment RLS policies successfully created and verified
DO

NOTICE:  tenant_payment_method RLS policies successfully created and verified
DO
```

### Step 2: Verify Policies in Staging

```bash
# Run RLS coverage verification
doppler run -- psql $DIRECT_URL -f scripts/verify-rls-coverage.sql
```

**Expected Output:**
```
NOTICE:  ✓ All tables with RLS have at least one policy
NOTICE:  Checking RLS status for critical tables...
NOTICE:    ✓ Table "rent_payment" has RLS enabled
NOTICE:    ✓ Table "tenant_payment_method" has RLS enabled
...
NOTICE:  RLS VERIFICATION COMPLETE
```

### Step 3: Update Supabase Types

```bash
# Generate new TypeScript types from updated schema
pnpm update-supabase-types
```

**Expected Output:**
```
Generated types from Supabase database
types written to packages/shared/src/types/supabase-generated.ts
```

### Step 4: Test in Staging

#### Test Tenant Access

```bash
# Create test tenant user (if needed)
# Use Supabase dashboard or curl to create invitation

# Test tenant login flow
# 1. Accept invitation email
# 2. Confirm email
# 3. Should redirect to /tenant/onboarding (tests env var fix)
# 4. Should activate successfully
# 5. Should redirect to /tenant dashboard
```

#### Test Payment Access

```bash
# As tenant: View own payments (should work)
curl -H "Authorization: Bearer $TENANT_JWT" \
  $STAGING_API_BASE_URL/api/v1/tenant-portal/my-payments

# As tenant: Try to view another tenant's payments (should fail/return empty)
curl -H "Authorization: Bearer $TENANT_JWT" \
  "$STAGING_API_BASE_URL/api/v1/rent-payments?tenantId=$OTHER_TENANT_ID"
```

#### Test Payment Method Access

```bash
# As tenant: View own payment methods (should work)
curl -H "Authorization: Bearer $TENANT_JWT" \
  $STAGING_API_BASE_URL/api/v1/payment-methods

# As landlord: Try to view tenant payment methods (should return empty)
curl -H "Authorization: Bearer $LANDLORD_JWT" \
  $STAGING_API_BASE_URL/api/v1/payment-methods
```

### Step 5: Deploy Frontend Fix (Staging)

```bash
# Push to staging branch (if separate staging environment)
git push staging main

# OR if using Vercel preview deployments
git push origin feature/phase-0-security-fixes

# Wait for Vercel deployment
# Test tenant onboarding flow
```

### Step 6: Production Deployment

**Timing:** Choose low-traffic window (e.g., 2 AM - 4 AM local time)

#### 6.1 Database Migrations (Production)

```bash
# Switch to production config
doppler setup --config production

# Apply migrations in sequence
doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120000_add_rent_payment_rls.sql
doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120001_add_payment_method_rls.sql

# Verify
doppler run -- psql $DIRECT_URL -f scripts/verify-rls-coverage.sql
```

#### 6.2 Update Types (Production)

```bash
# Regenerate types against production schema
pnpm update-supabase-types
```

#### 6.3 Deploy Backend (Production)

```bash
# Push to main branch (Railway auto-deploys)
git push origin main

# Monitor Railway deployment
# https://railway.app/project/{project-id}

# Wait for deployment to complete (~2-3 minutes)
```

#### 6.4 Deploy Frontend (Production)

```bash
# Frontend auto-deploys from main via Vercel
# Monitor deployment: https://vercel.com/{team}/tenant-flow

# Wait for deployment to complete (~1-2 minutes)
```

### Step 7: Post-Deployment Verification (Production)

#### 7.1 Health Checks

```bash
# Backend health
curl https://api.tenantflow.app/health

# Expected: {"status":"ok","timestamp":"..."}

# Frontend health
curl https://tenantflow.app

# Expected: 200 OK
```

#### 7.2 Functional Tests

```bash
# Test tenant activation flow
# 1. Create new tenant invitation
# 2. Accept email
# 3. Confirm account
# 4. Verify activation succeeds (env var fix)
# 5. Login to /tenant dashboard

# Test payment access isolation
# 1. Login as tenant
# 2. View /tenant/payments/history
# 3. Verify only own payments visible

# Test payment method management
# 1. Login as tenant
# 2. Go to /tenant/payments/methods
# 3. Add new payment method
# 4. Verify saved successfully
# 5. Verify other tenants cannot see it
```

#### 7.3 Monitoring

```bash
# Check Railway logs for errors
railway logs -p backend

# Check Vercel logs for errors
vercel logs tenantflow

# Monitor error rates in Sentry (if configured)
# https://sentry.io/organizations/{org}/issues/

# Check database query performance
doppler run -- psql $DATABASE_URL <<'SQL'
SELECT query, calls, mean_exec_time, stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%rent_payment%' OR query LIKE '%tenant_payment_method%'
ORDER BY mean_exec_time DESC
LIMIT 10;
SQL
```

## Rollback Plan

### If Issues Detected in Staging

```bash
# Simply drop the new policies and revert code
doppler run -- psql $DIRECT_URL <<'SQL'
-- Drop rent_payment policies
DROP POLICY IF EXISTS "rent_payment_owner_or_tenant_select" ON rent_payment;
DROP POLICY IF EXISTS "rent_payment_system_insert" ON rent_payment;
DROP POLICY IF EXISTS "rent_payment_system_update" ON rent_payment;
ALTER TABLE rent_payment DISABLE ROW LEVEL SECURITY;

-- Drop tenant_payment_method policies
DROP POLICY IF EXISTS "tenant_payment_method_owner_select" ON tenant_payment_method;
DROP POLICY IF EXISTS "tenant_payment_method_owner_insert" ON tenant_payment_method;
DROP POLICY IF EXISTS "tenant_payment_method_owner_update" ON tenant_payment_method;
DROP POLICY IF EXISTS "tenant_payment_method_owner_delete" ON tenant_payment_method;
ALTER TABLE tenant_payment_method DISABLE ROW LEVEL SECURITY;
SQL

# Revert frontend code
git revert HEAD
git push staging main
```

### If Issues Detected in Production

**CRITICAL: Only if payment flows completely broken**

```bash
# 1. Disable RLS temporarily (EMERGENCY ONLY)
doppler run --config production -- psql $DIRECT_URL <<'SQL'
ALTER TABLE rent_payment DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payment_method DISABLE ROW LEVEL SECURITY;
SQL

# 2. Monitor to confirm issue resolved

# 3. Investigate root cause offline

# 4. Re-enable RLS with fixes
# (Create corrective migration based on findings)
```

**Less Severe: If only specific queries affected**

```bash
# Drop problematic policy only
doppler run --config production -- psql $DIRECT_URL <<'SQL'
DROP POLICY "rent_payment_owner_or_tenant_select" ON rent_payment;
SQL

# Apply corrected version
# (Create new migration file with fix)
```

**Frontend Rollback:**

```bash
# Via Vercel dashboard
# 1. Go to https://vercel.com/{team}/tenant-flow
# 2. Click "Deployments"
# 3. Find previous deployment
# 4. Click "..." → "Promote to Production"

# OR via CLI
vercel rollback tenantflow
```

## Data Cleanup (If Needed)

If orphaned records found in pre-deployment check:

### Option 1: Delete Orphans (Test/Staging Only)

```bash
doppler run -- psql $DIRECT_URL <<'SQL'
-- Delete rent_payments with invalid references
DELETE FROM rent_payment
WHERE tenantId NOT IN (SELECT id FROM users)
   OR landlordId NOT IN (SELECT id FROM users);

-- Delete payment methods with invalid references
DELETE FROM tenant_payment_method
WHERE tenantId NOT IN (SELECT id FROM users);
SQL
```

### Option 2: Fix References (Production)

```bash
# Investigate orphaned records first
doppler run -- psql $DIRECT_URL <<'SQL'
-- Find orphaned payments
SELECT id, tenantId, landlordId, amount, createdAt
FROM rent_payment
WHERE tenantId NOT IN (SELECT id FROM users)
   OR landlordId NOT IN (SELECT id FROM users);
SQL

# Manually create missing users or reassign to correct users
# (Case-by-case basis, requires investigation)
```

## Validation Checklist

After deployment, verify:

- [ ] ✅ All migration scripts executed without errors
- [ ] ✅ RLS verification script passes
- [ ] ✅ Tenant activation flow works (onboarding page)
- [ ] ✅ Tenants can view their own payments
- [ ] ✅ Tenants CANNOT view other tenants' payments
- [ ] ✅ Landlords can view payments for their properties
- [ ] ✅ Tenants can manage their own payment methods
- [ ] ✅ Landlords CANNOT view tenant payment methods
- [ ] ✅ Stripe webhooks still process payments
- [ ] ✅ No spike in error rates
- [ ] ✅ No performance degradation
- [ ] ✅ Backend health check passes
- [ ] ✅ Frontend loads successfully

## Monitoring Post-Deployment

**First 24 Hours:**
- Monitor error rates every 2 hours
- Check payment processing success rates
- Verify tenant activation success rates
- Review database query performance

**First Week:**
- Daily error rate review
- Weekly performance baseline comparison
- User feedback monitoring

## Troubleshooting

### Issue: "rent_payment RLS policies successfully created" not shown

**Cause:** Migration script execution failed

**Fix:**
```bash
# Check for error messages in output
# Common causes:
# 1. Table doesn't exist
# 2. Policies already exist
# 3. Permission issues

# Manually verify RLS status
doppler run -- psql $DIRECT_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'rent_payment';"
```

### Issue: Payments not visible after migration

**Cause:** RLS blocking legitimate access

**Fix:**
```bash
# Test RLS policy directly
doppler run -- psql $DATABASE_URL <<'SQL'
-- Set JWT context
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "actual-auth-uid-here"}';

-- Test query
SELECT * FROM rent_payment;

-- Check what user.id this resolves to
SELECT id FROM users WHERE "supabaseId" = 'actual-auth-uid-here'::text;
SQL

# If returns 0 rows, verify identity mapping
```

### Issue: Tenant activation still fails

**Cause:** Environment variable not updated or deployment not complete

**Fix:**
```bash
# Check deployed code
curl https://tenantflow.app/_next/static/chunks/pages/tenant/onboarding.js | grep -o "NEXT_PUBLIC_API[^/]*"

# Should show: NEXT_PUBLIC_API_BASE_URL
# If shows: NEXT_PUBLIC_API_URL, deployment incomplete

# Force re-deploy
vercel --prod --force
```

## Success Criteria

Migration is successful when ALL of these are true:

1. ✅ All migration scripts complete without errors
2. ✅ RLS verification passes
3. ✅ Zero increase in error rates
4. ✅ Payment flows work end-to-end
5. ✅ Tenant isolation verified (cannot see other tenants' data)
6. ✅ Tenant activation works (env var fix)
7. ✅ No performance degradation (query times <100ms increase)

## Next Steps

After successful Phase 0 deployment:

1. Monitor for 48 hours
2. Proceed to Phase 1: Critical Fixes (Week 2)
   - Fix lease page hardcoded data
   - Audit Supabase RPC calls
   - Implement RLS policy tests
3. Schedule Phase 2: Feature Completion (Weeks 3-4)

## Support

**Issues during deployment:**
- Check Railway logs: `railway logs`
- Check Vercel logs: `vercel logs`
- Review migration output for error messages
- Contact: DevOps lead or CTO

**Post-deployment issues:**
- Monitor Sentry for exceptions
- Check database query logs
- Review user feedback
- Escalate if payment processing affected

---

**Document Version:** 1.0
**Last Updated:** 2025-02-15
**Next Review:** After Phase 0 completion
