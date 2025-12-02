-- Add stripe_subscription_status tracking for database-first lease activation
-- Enables atomic lease activation with deferred subscription creation and retry capability
--
-- Problem: If Stripe subscription creation fails after updating signature timestamps,
-- the lease is left in an inconsistent state (signed but not active).
--
-- Solution: Activate lease FIRST with 'pending' subscription status, then create
-- Stripe subscription. Background job retries failed subscriptions.

BEGIN;

-- Create enum for subscription provisioning status
CREATE TYPE public.stripe_subscription_status AS ENUM (
  'none',       -- No subscription needed or not yet started
  'pending',    -- Lease activated, subscription creation in progress
  'active',     -- Subscription created successfully
  'failed'      -- Subscription creation failed, needs retry
);

-- Add subscription status column to leases table
ALTER TABLE public.leases
ADD COLUMN stripe_subscription_status public.stripe_subscription_status
  DEFAULT 'none' NOT NULL;

-- Add failure tracking columns for retry mechanism
ALTER TABLE public.leases
ADD COLUMN subscription_failure_reason TEXT,
ADD COLUMN subscription_retry_count INTEGER DEFAULT 0,
ADD COLUMN subscription_last_attempt_at TIMESTAMPTZ;

-- Index for background job queries (find pending/failed subscriptions efficiently)
CREATE INDEX idx_leases_subscription_pending
  ON public.leases(stripe_subscription_status)
  WHERE stripe_subscription_status IN ('pending', 'failed');

-- Migrate existing active leases with subscriptions to 'active' status
UPDATE public.leases
SET stripe_subscription_status = 'active'
WHERE lease_status = 'active' AND stripe_subscription_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.leases.stripe_subscription_status IS
  'Tracks Stripe subscription provisioning state: none -> pending -> active/failed. Enables database-first activation with deferred billing.';

COMMENT ON COLUMN public.leases.subscription_failure_reason IS
  'Error message from last failed subscription creation attempt. Null on success.';

COMMENT ON COLUMN public.leases.subscription_retry_count IS
  'Number of times subscription creation has been attempted. Used for exponential backoff.';

COMMENT ON COLUMN public.leases.subscription_last_attempt_at IS
  'Timestamp of last subscription creation attempt. Used for retry backoff calculation.';

COMMIT;
