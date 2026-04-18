-- Drop dead tenant-rent-subscription columns from leases
alter table public.leases
  drop column if exists stripe_subscription_id,
  drop column if exists stripe_subscription_status,
  drop column if exists subscription_failure_reason,
  drop column if exists subscription_retry_count,
  drop column if exists subscription_last_attempt_at;
