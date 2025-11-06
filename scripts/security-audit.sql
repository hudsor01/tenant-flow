-- TenantFlow Security Audit Script
-- Phase 7.2: Security Audit
-- Run this script to verify all security policies are correctly configured

-- ============================================================================
-- 1. ROW LEVEL SECURITY (RLS) POLICY VERIFICATION
-- ============================================================================

-- Check that RLS is enabled on all critical tables
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'User', 'Property', 'Unit', 'Tenant', 'Lease',
    'ConnectedAccount', 'TenantPaymentMethod', 'RentPayment',
    'RentSubscription', 'StripeWebhookEvent'
)
ORDER BY tablename;

-- Expected: ALL tables should have rowsecurity = true

-- ============================================================================
-- 2. RLS POLICIES DETAILED CHECK
-- ============================================================================

-- List all RLS policies with their definitions
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. CONNECTED ACCOUNT SECURITY
-- ============================================================================

-- Verify owners can only access their own Connected Accounts
-- Policy: "owners can only access own Connected Accounts"
SELECT policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'ConnectedAccount'
AND policyname LIKE '%owner%';

-- Expected: Should have policy checking auth.uid() = userId

-- ============================================================================
-- 4. PAYMENT METHOD SECURITY
-- ============================================================================

-- Verify tenants can only access their own payment methods
-- Policy: "Tenants can view own payment methods"
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'TenantPaymentMethod'
AND cmd = 'SELECT';

-- Expected: Should restrict to auth.uid()::uuid IN (SELECT "userId" FROM "Tenant"...)

-- Check INSERT/UPDATE/DELETE policies for payment methods
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'TenantPaymentMethod'
AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
ORDER BY cmd;

-- ============================================================================
-- 5. RENT PAYMENT SECURITY
-- ============================================================================

-- Verify tenants can only view their own payments
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'RentPayment'
AND cmd = 'SELECT';

-- Verify owners can view payments for their properties
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'RentPayment'
AND policyname LIKE '%owner%';

-- ============================================================================
-- 6. SUBSCRIPTION SECURITY
-- ============================================================================

-- Check subscription RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'RentSubscription'
ORDER BY cmd, policyname;

-- Expected policies:
-- - Tenants can view own subscriptions
-- - Tenants can create own subscriptions
-- - Tenants can update own subscriptions
-- - owners can view property subscriptions

-- ============================================================================
-- 7. WEBHOOK EVENT SECURITY
-- ============================================================================

-- Verify webhook events table has appropriate access controls
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'StripeWebhookEvent';

-- Should only be accessible by service role for idempotency checks

-- ============================================================================
-- 8. SENSITIVE DATA ENCRYPTION CHECK
-- ============================================================================

-- Verify no plain text sensitive data in database
-- Check for unencrypted credit card numbers (should not exist - Stripe handles this)
SELECT
    tablename,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name ILIKE '%card%'
    OR column_name ILIKE '%ssn%'
    OR column_name ILIKE '%account%number%'
)
AND table_name IN (
    'TenantPaymentMethod', 'RentPayment', 'ConnectedAccount'
);

-- Expected: Should only see Stripe token IDs, never actual card numbers

-- ============================================================================
-- 9. USER AUTHENTICATION SECURITY
-- ============================================================================

-- Check auth.users table exists and is properly configured
SELECT
    COUNT(*) as user_count,
    COUNT(DISTINCT email) as unique_emails,
    COUNT(*) - COUNT(DISTINCT email) as duplicate_emails
FROM auth.users;

-- Expected: duplicate_emails should be 0

-- Verify email confirmation is required
SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
    COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed_users
FROM auth.users;

-- ============================================================================
-- 10. FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Verify all foreign key relationships are properly constrained
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'Property', 'Unit', 'Tenant', 'Lease',
    'ConnectedAccount', 'TenantPaymentMethod', 'RentPayment', 'RentSubscription'
)
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 11. INDEX PERFORMANCE CHECK
-- ============================================================================

-- Verify critical indexes exist for RLS policy performance
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'Property', 'Unit', 'Lease', 'RentPayment', 'TenantPaymentMethod'
)
AND (
    indexdef ILIKE '%userId%'
    OR indexdef ILIKE '%tenantId%'
    OR indexdef ILIKE '%leaseId%'
    OR indexdef ILIKE '%status%'
)
ORDER BY tablename, indexname;

-- ============================================================================
-- 12. STRIPE WEBHOOK SIGNATURE VALIDATION
-- ============================================================================

-- This check must be done in application code
-- Verify in apps/backend/src/stripe-webhook/stripe-webhook.service.ts
--
-- Required checks:
-- 1. webhook.constructEvent() is used with stripe-signature header
-- 2. STRIPE_WEBHOOK_SECRET environment variable is set
-- 3. Invalid signatures are rejected with 401
-- 4. Replay attacks are prevented via timestamp validation

-- Check webhook events have proper metadata
SELECT
    COUNT(*) as total_events,
    COUNT(DISTINCT type) as unique_event_types,
    COUNT(*) FILTER (WHERE processed = true) as processed_count,
    COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days') as recent_events
FROM "StripeWebhookEvent";

-- ============================================================================
-- 13. DATA RETENTION AND CLEANUP
-- ============================================================================

-- Check for old webhook events (should be cleaned up periodically)
SELECT
    DATE_TRUNC('month', "createdAt") as month,
    COUNT(*) as event_count
FROM "StripeWebhookEvent"
WHERE "createdAt" < NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('month', "createdAt")
ORDER BY month DESC;

-- ============================================================================
-- 14. PAYMENT DATA INTEGRITY
-- ============================================================================

-- Verify all payments have associated leases and tenants
SELECT
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE "leaseId" IS NULL) as missing_lease,
    COUNT(*) FILTER (WHERE "stripePaymentIntentId" IS NULL) as missing_stripe_id,
    COUNT(*) FILTER (WHERE amount <= 0) as invalid_amount
FROM "RentPayment";

-- Expected: missing_lease = 0, missing_stripe_id = 0, invalid_amount = 0

-- Verify subscription integrity
SELECT
    COUNT(*) as total_subscriptions,
    COUNT(*) FILTER (WHERE "tenantId" IS NULL) as missing_tenant,
    COUNT(*) FILTER (WHERE "leaseId" IS NULL) as missing_lease,
    COUNT(*) FILTER (WHERE "stripeSubscriptionId" IS NULL) as missing_stripe_id,
    COUNT(*) FILTER (WHERE status NOT IN ('active', 'paused', 'canceled')) as invalid_status
FROM "RentSubscription";

-- ============================================================================
-- 15. SECURITY SUMMARY REPORT
-- ============================================================================

-- Generate comprehensive security status
SELECT
    'RLS Enabled Tables' as check_name,
    COUNT(*) FILTER (WHERE rowsecurity = true)::text || ' / ' || COUNT(*)::text as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('User', 'Property', 'Lease', 'RentPayment', 'TenantPaymentMethod')

UNION ALL

SELECT
    'Active RLS Policies',
    COUNT(DISTINCT policyname)::text
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Foreign Key Constraints',
    COUNT(DISTINCT constraint_name)::text
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public'

UNION ALL

SELECT
    'Performance Indexes',
    COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%idx%'

UNION ALL

SELECT
    'Webhook Events (Last 30 days)',
    COUNT(*)::text
FROM "StripeWebhookEvent"
WHERE "createdAt" > NOW() - INTERVAL '30 days';

-- ============================================================================
-- SECURITY AUDIT COMPLETION
-- ============================================================================
--
-- After running this script, verify:
-- ✅ All tables have RLS enabled
-- ✅ All RLS policies are correctly scoped to user context
-- ✅ No sensitive data is stored unencrypted
-- ✅ Foreign key constraints prevent orphaned records
-- ✅ Indexes support performant RLS policy checks
-- ✅ Webhook signature validation is enabled in code
-- ✅ No data integrity issues (orphaned payments, invalid amounts)
--
-- ============================================================================
