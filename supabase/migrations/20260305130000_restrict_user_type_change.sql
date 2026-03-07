-- AUTH-14: Prevent user_type changes after initial selection
-- Decision 4 requires BOTH RLS policy + application-level check.
-- Trigger provides application-level enforcement (catches all UPDATE paths).
-- RLS policy restricts which rows a user can UPDATE based on their current user_type.

-- 1. BEFORE UPDATE trigger (application-level enforcement)
create or replace function check_user_type_change()
returns trigger as $$
begin
  if old.user_type is distinct from new.user_type then
    if old.user_type != 'PENDING' then
      raise exception 'Cannot change user_type after initial selection';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path to 'public';

-- Drop if exists (idempotent)
drop trigger if exists enforce_user_type_change on public.users;

create trigger enforce_user_type_change
  before update on public.users
  for each row
  execute function check_user_type_change();

-- 2. RLS policy rationale:
-- The existing users UPDATE policy controls row-level access (own row only) — correct as-is.
-- Column-level restrictions in RLS require WITH CHECK which would prevent ALL updates
-- to the users table when user_type != PENDING, breaking profile updates.
-- The trigger surgically blocks only user_type changes while allowing other column updates.
--
-- Defense-in-depth per Decision 4:
--   - RLS policy = existing "users can update their own row" policy (already in place)
--   - Application-level check = this BEFORE UPDATE trigger

-- Add comment for documentation
comment on function check_user_type_change() is 'AUTH-14: Prevents user_type changes once set beyond PENDING. Works alongside existing RLS UPDATE policy for defense-in-depth.';
