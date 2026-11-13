-- =============================================================================
-- Vendor assignment on maintenance requests
-- =============================================================================
-- maintenance_requests.vendor_id (FK vendors, ON DELETE SET NULL) had no writer
-- until the app's vendor picker. This trigger keeps the column honest however a
-- request is written:
--
--   1. A request's vendor must be one of the request owner's vendors. The
--      UPDATE and INSERT policies check owner_user_id (and the unit on insert),
--      and the foreign key accepts any vendor id, so without this an owner could
--      point a request at another owner's vendor. Raises 23514.
--
--   2. The vendor-workflow statuses follow the vendor when the same write does
--      not set the status itself (an INSERT, or an UPDATE whose status equals
--      the old one):
--        - a vendor set on an `open` request moves it to `assigned`;
--        - the vendor removed from an `assigned` request moves it to
--          `needs_reassignment`. That includes the foreign key's SET NULL when
--          the owner deletes the vendor: a referential action is an UPDATE of
--          vendor_id and fires this trigger.
--      A write that sets the status keeps the status it sets.
--
-- The AFTER triggers (notify_owner_maintenance, notify_n8n_maintenance) see the
-- status this sets, as they see any other status change.
--
-- SECURITY DEFINER so the vendor lookup reads vendors past their RLS and
-- compares owners itself; search_path is empty and every name is qualified.

create or replace function public.maintenance_request_vendor_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if NEW.vendor_id is not null and not exists (
        select 1
        from public.vendors v
        where v.id = NEW.vendor_id
          and v.owner_user_id = NEW.owner_user_id
    ) then
        raise exception 'vendor is not one of this owner''s vendors'
            using errcode = '23514';
    end if;

    if TG_OP = 'INSERT' then
        if NEW.vendor_id is not null and NEW.status = 'open' then
            NEW.status := 'assigned';
        end if;
    elsif NEW.vendor_id is distinct from OLD.vendor_id
          and NEW.status = OLD.status then
        if NEW.vendor_id is not null and NEW.status = 'open' then
            NEW.status := 'assigned';
        elsif NEW.vendor_id is null and NEW.status = 'assigned' then
            NEW.status := 'needs_reassignment';
        end if;
    end if;

    return NEW;
end;
$$;

revoke all on function public.maintenance_request_vendor_rules() from public, anon, authenticated;

drop trigger if exists trg_maintenance_request_vendor_rules on public.maintenance_requests;
create trigger trg_maintenance_request_vendor_rules
    before insert or update of vendor_id, status, owner_user_id
    on public.maintenance_requests
    for each row
    execute function public.maintenance_request_vendor_rules();
