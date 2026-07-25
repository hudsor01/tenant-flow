-- =============================================================================
-- Cover the reverses_id foreign keys on both ledger tables
-- =============================================================================
-- Supabase performance advisor:
--
--   [INFO] unindexed_foreign_keys
--   Table `public.rent_charges`  has FK `rent_charges_reverses_id_fkey`  without a covering index
--   Table `public.rent_receipts` has FK `rent_receipts_reverses_id_fkey` without a covering index
--
-- This is not merely an FK-hygiene nit here: `reverses_id` is the column the
-- double-reversal guards look up on, and those guards run on EVERY reversal.
--
--   reverse_charge():   if exists (select 1 from rent_charges  where reverses_id = p_charge_id)
--   reverse_receipt():  if exists (select 1 from rent_receipts where reverses_id = p_receipt_id)
--   reverse_charge() also filters receipts with
--                       not exists (select 1 from rent_receipts x where x.reverses_id = rr.id)
--
-- Without a covering index each of those degrades to a sequential scan over the
-- whole ledger table, so the cost grows with ledger history - on the exact path
-- an owner hits when correcting an entry. Partial indexes (reversals are the
-- minority of rows; reverses_id is NULL for ordinary entries) keep them small.
--
-- Both ledger tables are empty in prod today, so this is a no-op to build and
-- there is no lock concern.
-- =============================================================================

create index if not exists idx_rent_charges_reverses
  on public.rent_charges (reverses_id)
  where reverses_id is not null;

create index if not exists idx_rent_receipts_reverses
  on public.rent_receipts (reverses_id)
  where reverses_id is not null;

comment on index public.idx_rent_charges_reverses is
  'Covers rent_charges_reverses_id_fkey and the reverse_charge() double-reversal guard (LEDGER-06). Partial - only reversal rows carry reverses_id.';

comment on index public.idx_rent_receipts_reverses is
  'Covers rent_receipts_reverses_id_fkey, the reverse_receipt() double-reversal guard, and reverse_charge()''s already-reversed receipt filter (LEDGER-06). Partial - only reversal rows carry reverses_id.';
