-- Migration: Create stripe_webhook_events idempotency table
-- Purpose: Prevents duplicate processing of Stripe webhook events on retries.
-- Stripe retries failed webhooks for up to 72 hours. The event ID (Stripe's unique
-- event identifier) is used as the primary key — insert fails silently if duplicate.
--
-- Affected tables: stripe_webhook_events (new)
-- Accessed by: stripe-webhooks Edge Function (service role only)

-- Create the idempotency tracking table
create table if not exists public.stripe_webhook_events (
  -- Stripe event ID is the primary key — guarantees one-time processing
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  -- Store minimal metadata for debugging
  livemode boolean default false,
  data jsonb
);

comment on table public.stripe_webhook_events is
  'Idempotency log for Stripe webhook events. Prevents duplicate processing on Stripe retries.';
comment on column public.stripe_webhook_events.id is
  'Stripe event ID (e.g. evt_xxx). Primary key ensures each event processed at most once.';
comment on column public.stripe_webhook_events.processed_at is
  'Timestamp when this event was successfully processed.';

-- Enable RLS (required by project convention)
alter table public.stripe_webhook_events enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated users.
-- This table is ONLY accessed by the service role key inside Edge Functions.
-- Authenticated users have no reason to read or write webhook event logs.

-- Service role bypasses RLS by design — no policy needed for Edge Function access.

-- Create index for recent event lookups (debugging/monitoring)
create index if not exists stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at desc);

create index if not exists stripe_webhook_events_event_type_idx
  on public.stripe_webhook_events (event_type);
