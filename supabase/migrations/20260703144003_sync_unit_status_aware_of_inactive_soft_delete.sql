-- Phase 25 write-side coherence (review cycle 5). CRIT-03/04 introduced the
-- 'inactive' soft-delete sentinel for units + leases, but sync_unit_status_from_lease
-- predated it and was unaware:
--   FINDING 1 (resurrection, MEDIUM): the ended/terminated -> 'available' update
--     (and the ->'occupied' update) had no `status <> 'inactive'` guard, so
--     terminating a lease on a soft-deleted unit resurrected it to 'available'.
--   FINDING 2 (orphaned occupied unit, LOW): soft-deleting an ACTIVE lease sets
--     lease_status='inactive', which matched neither branch, leaving the unit
--     stuck 'occupied' with no active lease.
-- Fix: (a) guard both unit-status writes with `status <> 'inactive'` (never
-- resurrect a soft-deleted unit); (b) add 'inactive' to the free-the-unit branch
-- so soft-deleting an active lease frees its unit (when no other active lease holds it).
-- Verified via rolled-back proofs: terminate on soft-deleted unit -> stays 'inactive';
-- soft-delete active lease -> unit 'occupied' -> 'available'.
CREATE OR REPLACE FUNCTION public.sync_unit_status_from_lease()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- When a lease becomes active, mark unit as occupied.
  -- Never resurrect a soft-deleted (inactive) unit.
  if new.lease_status = 'active' and (old is null or old.lease_status != 'active') then
    update public.units set status = 'occupied'
      where id = new.unit_id and status <> 'inactive';
  end if;

  -- When a lease leaves active (ended / terminated / soft-deleted 'inactive'),
  -- free the unit if no other active lease holds it. Never resurrect a
  -- soft-deleted (inactive) unit.
  if old.lease_status = 'active' and new.lease_status in ('ended', 'terminated', 'inactive') then
    if not exists (
      select 1 from public.leases
      where unit_id = new.unit_id
      and id != new.id
      and lease_status = 'active'
    ) then
      update public.units set status = 'available'
        where id = new.unit_id and status <> 'inactive';
    end if;
  end if;

  return new;
end;
$function$;
