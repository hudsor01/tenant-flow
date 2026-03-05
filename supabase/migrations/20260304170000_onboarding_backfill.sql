-- Backfill onboarding_completed_at for owners who completed Stripe onboarding
-- but the timestamp was lost due to the account.updated overwrite bug (fixed in 02-02).
--
-- property_owners already has charges_enabled as a direct column,
-- so we don't need to query stripe.accounts.

-- Step 1: Backfill property_owners where charges_enabled = true but onboarding_completed_at is null
update public.property_owners
set onboarding_completed_at = now(),
    onboarding_status = 'completed'
where onboarding_completed_at is null
  and charges_enabled = true;

-- Step 2: Backfill users.onboarding_completed_at for any owner whose
-- property_owners record is now marked completed but users row is still null
update public.users u
set onboarding_completed_at = po.onboarding_completed_at,
    onboarding_status = 'completed'
from public.property_owners po
where po.user_id = u.id
  and u.onboarding_completed_at is null
  and po.onboarding_completed_at is not null;
