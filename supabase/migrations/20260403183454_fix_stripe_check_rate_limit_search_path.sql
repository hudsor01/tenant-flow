-- Fix: stripe.check_rate_limit had mutable search_path.
-- Pin to stripe, public to prevent search_path hijacking.
-- Note: extension-managed function — may be overwritten on extension update.
-- applied directly via Supabase dashboard 2026-04-03 18:34 UTC; this file
-- captures the production state for migration-history parity.
ALTER FUNCTION stripe.check_rate_limit(text, integer, integer) SET search_path = stripe, public;
