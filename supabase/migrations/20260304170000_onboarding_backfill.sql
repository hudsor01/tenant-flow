-- Backfill onboarding_completed_at for owners who completed Stripe onboarding
-- but the timestamp was lost due to the account.updated overwrite bug (fixed in 02-02).
--
-- NOTE: property_owners table was renamed to stripe_connected_accounts.
-- stripe_connected_accounts has the same columns (charges_enabled, onboarding_completed_at, etc.)
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap UPDATEs in table-existence
-- guard. On chain replay the rename may not have fired (e.g. on a
-- partial / empty fresh DB without the property_owners base table), so
-- stripe_connected_accounts is absent and the UPDATE fails with 42P01.
-- On prod the table existed when this migration ran; the guard preserves
-- prod behavior and makes replay safe.

do $$
begin
  if to_regclass('public.stripe_connected_accounts') is not null then
    -- Step 1: Backfill stripe_connected_accounts where charges_enabled = true but onboarding_completed_at is null
    update public.stripe_connected_accounts
    set onboarding_completed_at = now(),
        onboarding_status = 'completed'
    where onboarding_completed_at is null
      and charges_enabled = true;

    -- Step 2: Backfill users.onboarding_completed_at for any owner whose
    -- stripe_connected_accounts record is now marked completed but users row is still null
    update public.users u
    set onboarding_completed_at = sca.onboarding_completed_at,
        onboarding_status = 'completed'
    from public.stripe_connected_accounts sca
    where sca.user_id = u.id
      and u.onboarding_completed_at is null
      and sca.onboarding_completed_at is not null;
  end if;
end $$;
