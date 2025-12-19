-- Migration: Create security_events table for audit logging
-- Purpose: Track security-related events, user activity, and system logs
-- Tables: security_events
-- Affected: Admin panel log viewing and user activity tracking

-- Create enum for event types
create type security_event_type as enum (
  'auth.login',
  'auth.logout',
  'auth.failed_login',
  'auth.password_change',
  'auth.password_reset',
  'user.created',
  'user.updated',
  'user.deleted',
  'property.created',
  'property.updated',
  'property.deleted',
  'lease.created',
  'lease.updated',
  'lease.deleted',
  'lease.signed',
  'payment.created',
  'payment.failed',
  'subscription.created',
  'subscription.canceled',
  'admin.action',
  'system.error',
  'system.warning'
);

-- Create enum for severity levels
create type security_event_severity as enum (
  'debug',
  'info',
  'warning',
  'error',
  'critical'
);

-- Create security_events table
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Event classification
  event_type security_event_type not null,
  severity security_event_severity not null default 'info',

  -- User context
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_type text,

  -- Request context
  ip_address inet,
  user_agent text,
  request_id text,

  -- Event details
  message text not null,
  metadata jsonb default '{}'::jsonb,

  -- Resource affected (if applicable)
  resource_type text,
  resource_id uuid,

  -- Search and filtering
  tags text[] default array[]::text[]
);

-- Add indexes for common queries
create index idx_security_events_created_at on public.security_events (created_at desc);
create index idx_security_events_user_id on public.security_events (user_id) where user_id is not null;
create index idx_security_events_event_type on public.security_events (event_type);
create index idx_security_events_severity on public.security_events (severity);
create index idx_security_events_resource on public.security_events (resource_type, resource_id) where resource_type is not null;

-- GIN index for metadata JSONB queries
create index idx_security_events_metadata on public.security_events using gin (metadata);

-- GIN index for tags array queries
create index idx_security_events_tags on public.security_events using gin (tags);

-- Add comment for documentation
comment on table public.security_events is 'Audit log for security events, user activity, and system logs';
comment on column public.security_events.event_type is 'Type of security event (auth, user, property, lease, payment, subscription, admin, system)';
comment on column public.security_events.severity is 'Severity level for filtering (debug, info, warning, error, critical)';
comment on column public.security_events.metadata is 'Additional event data as JSON (flexible schema for different event types)';
comment on column public.security_events.tags is 'Array of tags for flexible categorization and filtering';

-- Enable row level security
alter table public.security_events enable row level security;

-- RLS Policy: Admin users can read all security events
create policy "Admins can view all security events"
  on public.security_events
  for select
  to authenticated
  using (
    (select (auth.jwt()->'app_metadata'->>'user_type')) = 'ADMIN'
  );

-- RLS Policy: Users can view their own security events
create policy "Users can view their own security events"
  on public.security_events
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
  );

-- RLS Policy: System can insert security events (service role)
create policy "Service role can insert security events"
  on public.security_events
  for insert
  to service_role
  with check (true);

-- Create function to automatically clean up old security events (retention policy)
create or replace function cleanup_old_security_events()
returns void
language plpgsql
security definer
as $$
begin
  -- Delete debug and info events older than 30 days
  delete from public.security_events
  where created_at < now() - interval '30 days'
    and severity in ('debug', 'info');

  -- Delete warning events older than 90 days
  delete from public.security_events
  where created_at < now() - interval '90 days'
    and severity = 'warning';

  -- Delete error and critical events older than 1 year
  delete from public.security_events
  where created_at < now() - interval '1 year'
    and severity in ('error', 'critical');
end;
$$;

-- Add comment to cleanup function
comment on function cleanup_old_security_events() is 'Cleanup old security events based on retention policy (30 days for debug/info, 90 days for warning, 1 year for error/critical)';

-- Note: Schedule this function to run periodically using pg_cron or external scheduler
-- Example cron schedule (if pg_cron is available):
-- select cron.schedule('cleanup-security-events', '0 2 * * *', 'select cleanup_old_security_events()');
