-- Migration: Add RLS Policies for Backend-Only Tables
-- Created: 2025-12-30 29:00:00 UTC
-- Purpose: Add service_role-only policies to tables that have RLS enabled but no policies
-- Security Impact: MEDIUM - Ensures backend tables are only accessible via service_role
--
-- These tables are internal/backend-only and should never be accessed by frontend clients

-- ============================================================================
-- PART 1: PUBLIC SCHEMA BACKEND TABLES
-- ============================================================================

-- processed_internal_events - tracks processed webhook events for idempotency
create policy "service_role_only" on public.processed_internal_events
for all to service_role using (true) with check (true);

-- security_audit_log - security event logging
create policy "service_role_only" on public.security_audit_log
for all to service_role using (true) with check (true);

-- user_access_log - user access tracking
create policy "service_role_only" on public.user_access_log
for all to service_role using (true) with check (true);

-- webhook_attempts - webhook delivery attempts
create policy "service_role_only" on public.webhook_attempts
for all to service_role using (true) with check (true);

-- webhook_events - webhook event storage
create policy "service_role_only" on public.webhook_events
for all to service_role using (true) with check (true);

-- webhook_metrics - webhook performance metrics
create policy "service_role_only" on public.webhook_metrics
for all to service_role using (true) with check (true);

-- ============================================================================
-- PART 2: STRIPE SCHEMA BACKEND TABLES
-- ============================================================================
-- These are managed by the Stripe Supabase integration and should only be
-- accessed by service_role (the sync engine) or via specific user-facing policies

-- checkout_session_line_items
create policy "service_role_only" on stripe.checkout_session_line_items
for all to service_role using (true) with check (true);

-- checkout_sessions
create policy "service_role_only" on stripe.checkout_sessions
for all to service_role using (true) with check (true);

-- coupons
create policy "service_role_only" on stripe.coupons
for all to service_role using (true) with check (true);

-- credit_notes
create policy "service_role_only" on stripe.credit_notes
for all to service_role using (true) with check (true);

-- disputes
create policy "service_role_only" on stripe.disputes
for all to service_role using (true) with check (true);

-- early_fraud_warnings
create policy "service_role_only" on stripe.early_fraud_warnings
for all to service_role using (true) with check (true);

-- events (stripe webhook events)
create policy "service_role_only" on stripe.events
for all to service_role using (true) with check (true);

-- features (product features)
create policy "service_role_only" on stripe.features
for all to service_role using (true) with check (true);

-- migrations (stripe sync migrations)
create policy "service_role_only" on stripe.migrations
for all to service_role using (true) with check (true);

-- payouts
create policy "service_role_only" on stripe.payouts
for all to service_role using (true) with check (true);

-- plans
create policy "service_role_only" on stripe.plans
for all to service_role using (true) with check (true);

-- reviews
create policy "service_role_only" on stripe.reviews
for all to service_role using (true) with check (true);

-- subscription_schedules
create policy "service_role_only" on stripe.subscription_schedules
for all to service_role using (true) with check (true);

-- tax_ids
create policy "service_role_only" on stripe.tax_ids
for all to service_role using (true) with check (true);

-- webhook_events (stripe webhook events)
create policy "service_role_only" on stripe.webhook_events
for all to service_role using (true) with check (true);

-- webhook_failures
create policy "service_role_only" on stripe.webhook_failures
for all to service_role using (true) with check (true);
