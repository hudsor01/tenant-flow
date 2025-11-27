-- Migration: Fix service_role GRANT permissions for property_owners
-- Issue: service_role only had SELECT, needs full CRUD for webhook processing
--
-- Background: Stripe webhook handler (WebhookProcessor) needs to UPDATE property_owners
-- when account.updated events come in (onboarding status, charges/payouts enabled, etc.)

-- Grant full CRUD permissions to service_role on property_owners
-- This matches the pattern used for all other core tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_owners TO service_role;

-- Also ensure rent_payments has proper grants (webhooks may update payment status)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_payments TO service_role;

-- Ensure users table has proper grants for service_role operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
