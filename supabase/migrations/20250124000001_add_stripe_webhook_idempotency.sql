-- Migration: Add Stripe webhook idempotency tracking
-- Prevents duplicate webhook processing per Stripe best practices 2025

create table if not exists public.stripe_processed_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique, -- Stripe event ID (e.g., evt_xxx)
  event_type text not null, -- Event type (e.g., checkout.session.completed)
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast lookups during webhook processing
create index if not exists idx_stripe_events_event_id on public.stripe_processed_events(event_id);
create index if not exists idx_stripe_events_type on public.stripe_processed_events(event_type);

-- RLS: Only backend service role can access (webhooks are server-side only)
alter table public.stripe_processed_events enable row level security;

-- No user policies - only service role access
comment on table public.stripe_processed_events is 'Tracks processed Stripe webhook events for idempotency. Service role access only.';
