-- Migration: 20260219100002_create_email_suppressions.sql
--
-- Purpose: Track email addresses that have bounced or complained.
-- Used by the Resend webhook handler to suppress future sends and avoid
-- deliverability issues from repeatedly emailing invalid addresses.

create table public.email_suppressions (
  email          text primary key,
  reason         text not null,
  suppressed_at  timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint email_suppressions_reason_check
    check (reason in ('bounced', 'complained'))
);

comment on table public.email_suppressions is
  'Email addresses suppressed from future sends due to hard bounces or spam complaints.
   Written by the Resend webhook handler; read by email sending services before dispatching.';

comment on constraint email_suppressions_reason_check on public.email_suppressions is
  'Valid values: bounced (hard bounce), complained (spam complaint)';

-- Only the service role (backend) reads/writes this table.
-- Authenticated users and anon have no access.
alter table public.email_suppressions enable row level security;

-- Service role policy: full access for backend operations
create policy "Service role can manage email suppressions"
on public.email_suppressions
for select
to service_role
using (true);

create policy "Service role can insert email suppressions"
on public.email_suppressions
for insert
to service_role
with check (true);

create policy "Service role can update email suppressions"
on public.email_suppressions
for update
to service_role
using (true)
with check (true);
