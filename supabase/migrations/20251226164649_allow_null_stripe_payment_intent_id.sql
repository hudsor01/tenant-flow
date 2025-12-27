-- ============================================================================
-- Migration: Allow NULL stripe_payment_intent_id for Manual Payments
-- Purpose: Support manual payments (cash, check, money order) that don't
--          go through Stripe by making stripe_payment_intent_id nullable
-- Affected Tables: rent_payments
-- ============================================================================

-- Allow NULL values for stripe_payment_intent_id to support manual payments
-- Manual payments are recorded for cash, checks, and money orders which
-- bypass Stripe entirely and don't have a payment intent ID
alter table rent_payments
alter column stripe_payment_intent_id drop not null;

-- Add a comment to document the nullable behavior
comment on column rent_payments.stripe_payment_intent_id is
'Stripe PaymentIntent ID. NULL for manual payments (cash, check, money order).';

-- Add notes column for manual payments to store additional information
-- such as check number, reference, or other notes
alter table rent_payments
add column if not exists notes text null;

comment on column rent_payments.notes is
'Optional notes for the payment (e.g., check number, receipt reference).';
