-- CRIT-03: restore unit soft-delete.
--
-- unitMutations.delete (src/hooks/api/query-keys/unit-keys.ts) already writes
-- .update({ status: 'inactive' }), but the live units_status_check only allowed
-- available | occupied | maintenance | reserved, so every unit delete raised a
-- 23514 CHECK violation. Hard delete is unsafe: leases.unit_id is ON DELETE
-- CASCADE and would destroy financial records. Add 'inactive' to the CHECK so the
-- existing .neq('status','inactive') read filters become live soft-delete filters.
--
-- Idempotent (DROP ... IF EXISTS then ADD). Preserves the existing four values
-- verbatim and appends 'inactive'.
alter table public.units drop constraint if exists units_status_check;

alter table public.units
  add constraint units_status_check
  check (status = any (array['available'::text, 'occupied'::text, 'maintenance'::text, 'reserved'::text, 'inactive'::text]));
