-- Three foreign keys had no covering index. Postgres does not create one for
-- you on the referencing side, so each of these constraints forced a sequential
-- scan of the child table every time a parent row was deleted or updated.
--
-- All three sit on a DELETE path, which is what makes this worth a migration
-- rather than filing it as advisor noise:
--
--   esign_events.lease_id -> leases            ON DELETE CASCADE
--     Deleting a lease must find and remove its esign_events. Without an index
--     that is a full scan of esign_events per lease deletion.
--
--   rental_application_links.created_by -> users   ON DELETE NO ACTION
--     Deleting a user must prove no link still references them. NO ACTION still
--     requires the lookup -- it just raises instead of cascading. This runs
--     inside the GDPR deletion path (process_account_deletions ->
--     anonymize_deleted_user), where a scan per user is the worst place for one.
--
--   rental_applications.converted_tenant_id -> tenants   ON DELETE SET NULL
--     Deleting a tenant must locate referencing applications and null the
--     column, so the scan is followed by an update.
--
-- These are insurance, not query tuning. Measured at migration time the child
-- tables hold 0, 2 and 1 rows, so a sequential scan is currently free and the
-- indexes will show up in the advisor's "unused index" list immediately -- an
-- unused index on a near-empty table is the correct state for a constraint
-- index that exists to stay cheap as the table grows. The cost is three ~16 kB
-- btrees; the alternative is discovering the scans later, in a cascade, on an
-- instance whose IO budget we have just spent a day characterising.
--
-- Naming follows the prevailing idx_<table>_<column> convention. Plain CREATE
-- INDEX rather than CONCURRENTLY: these tables are effectively empty, the lock
-- is held for microseconds, and CONCURRENTLY cannot run inside the transaction
-- that wraps a migration.
create index if not exists idx_esign_events_lease_id
  on public.esign_events (lease_id);

create index if not exists idx_rental_application_links_created_by
  on public.rental_application_links (created_by);

create index if not exists idx_rental_applications_converted_tenant_id
  on public.rental_applications (converted_tenant_id);
