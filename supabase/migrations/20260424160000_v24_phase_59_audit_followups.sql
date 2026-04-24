-- v2.4 Phase 59 post-merge audit follow-up.
--
-- cycle-3 audit caught a P1: cleanup_orphan_documents was written in
-- v2.3 (migration 20260422120000) to cover the four entity_types that
-- existed THEN — property, lease, maintenance_request, inspection. It
-- did NOT include `tenant` because tenants couldn't have documents
-- attached at the time.
--
-- Phase 59 shipped tenant-scoped document uploads this morning
-- (migration 20260424140000). A hard-deleted tenant now leaves orphan
-- `documents` rows forever unless the cron cleanup covers the branch.
-- Tenants are soft-deleted in normal flow, but:
--   - GDPR anonymization (`anonymize_deleted_user`) can null owner_user_id
--     and eventually hard-delete after the grace period.
--   - Admin intervention can hard-delete.
-- This migration extends the cron function to cover the tenant branch.

begin;

create or replace function public.cleanup_orphan_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.documents d
  where (
    d.entity_type = 'property'
    and not exists (select 1 from public.properties p where p.id = d.entity_id)
  )
  or (
    d.entity_type = 'lease'
    and not exists (select 1 from public.leases l where l.id = d.entity_id)
  )
  or (
    d.entity_type = 'tenant'
    and not exists (select 1 from public.tenants t where t.id = d.entity_id)
  )
  or (
    d.entity_type = 'maintenance_request'
    and not exists (select 1 from public.maintenance_requests m where m.id = d.entity_id)
  )
  or (
    d.entity_type = 'inspection'
    and not exists (select 1 from public.inspections i where i.id = d.entity_id)
  );
end;
$$;

comment on function public.cleanup_orphan_documents is
  'Removes document rows whose parent entity has been hard-deleted. Covers all five entity_types the documents table supports: property + lease + tenant + maintenance_request + inspection. Runs nightly via pg_cron.';

commit;
