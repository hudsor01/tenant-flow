-- Add subscription_status field to users table
-- Aligns with Stripe best practices for subscription lifecycle management
--
-- Stripe subscription statuses:
-- - active: Subscription is active and paid
-- - trialing: User is in trial period (provisional access)
-- - past_due: Payment failed, retry in progress
-- - canceled: Subscription canceled by user
-- - incomplete: Initial payment failed
-- - incomplete_expired: Initial payment window expired
-- - unpaid: Payment failed after all retries
-- - paused: Subscription paused

-- Add subscription_status column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- Add index for fast payment gate queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status
ON users(subscription_status)
WHERE subscription_status IS NOT NULL;

-- Set existing paid users to 'active' status
UPDATE users
SET subscription_status = 'active'
WHERE "subscriptionTier" IS NOT NULL
  AND "stripeCustomerId" IS NOT NULL
  AND subscription_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.subscription_status IS 'Stripe subscription status: active, trialing, past_due, canceled, incomplete, unpaid, paused. Synced from customer.subscription.updated webhook.';
