-- =============================================================================
-- migration: add fee breakdown columns to rent_payments
-- purpose: enable itemized fee tracking for destination charge rent payments
--   - gross_amount: total amount before fees (tenant pays this)
--   - platform_fee_amount: tenantflow platform application fee
--   - stripe_fee_amount: stripe processing fee (populated by webhook)
--   - net_amount: amount received by owner (gross - platform - stripe)
--   - rent_due_id: links payment to the specific rent_due period
--   - checkout_session_id: stripe checkout session id for traceability
-- affected tables: rent_payments
-- =============================================================================

-- add fee breakdown columns
alter table rent_payments
  add column if not exists gross_amount numeric(10,2) null,
  add column if not exists platform_fee_amount numeric(10,2) null default 0,
  add column if not exists stripe_fee_amount numeric(10,2) null default 0,
  add column if not exists net_amount numeric(10,2) null;

-- add rent_due_id to link payment to the specific rent period
-- references the rent_due table for period tracking
alter table rent_payments
  add column if not exists rent_due_id uuid null references rent_due(id);

-- add checkout_session_id for stripe checkout session traceability
alter table rent_payments
  add column if not exists checkout_session_id text null;

-- index on rent_due_id for the duplicate payment check query
-- used by the stripe-rent-checkout edge function to verify no duplicate succeeded payments
create index if not exists idx_rent_payments_rent_due_id
  on rent_payments(rent_due_id);

-- unique partial index: prevent duplicate successful payments for the same rent_due period
-- only applies when rent_due_id is not null (legacy payments without rent_due_id are unaffected)
-- only applies when status is 'succeeded' (failed/pending payments can coexist)
create unique index if not exists idx_rent_payments_rent_due_unique_succeeded
  on rent_payments(rent_due_id)
  where status = 'succeeded' and rent_due_id is not null;
