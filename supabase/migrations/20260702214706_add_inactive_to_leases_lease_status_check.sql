-- CRIT-04: restore lease soft-delete.
--
-- leaseMutations.delete + deleteOptimistic (src/hooks/api/query-keys/
-- lease-mutation-options.ts) already write .update({ lease_status: 'inactive' })
-- (comment: "financial record retention"), but the live leases_lease_status_check
-- only allowed draft | pending_signature | active | ended | terminated | expired,
-- so every lease delete raised a 23514 CHECK violation. The design already treats
-- 'inactive' as the soft-delete sentinel (get_lease_stats and leaseQueries.list
-- both exclude it). Add 'inactive' to the CHECK so the soft-delete write is valid.
--
-- Idempotent (DROP ... IF EXISTS then ADD). Preserves the existing six values
-- verbatim and appends 'inactive'.
alter table public.leases drop constraint if exists leases_lease_status_check;

alter table public.leases
  add constraint leases_lease_status_check
  check (lease_status = any (array['draft'::text, 'pending_signature'::text, 'active'::text, 'ended'::text, 'terminated'::text, 'expired'::text, 'inactive'::text]));
