-- v2.4 Phase 59 — extend tenant-documents storage RLS to lease/tenant/maintenance.
--
-- v2.3 shipped the vault for property-scoped uploads only (single `or`
-- clause matching `storage.foldername(name)[1] = 'property'`). This
-- migration adds three more clauses for `lease`, `tenant`, and
-- `maintenance_request` — each joins through its parent table to
-- `owner_user_id = (select auth.uid())`, matching the existing property
-- pattern. Inspection branch defers to v2.5.
--
-- Preserves the array_length = 2 + UUID-format guards from
-- migration 20260421120000 so off-convention paths can't pass RLS.

begin;

drop policy if exists "Owners upload tenant documents" on storage.objects;
create policy "Owners upload tenant documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'lease'
        and (storage.foldername(name))[2] in (
          select id::text from public.leases
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'tenant'
        and (storage.foldername(name))[2] in (
          select id::text from public.tenants
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'maintenance_request'
        and (storage.foldername(name))[2] in (
          select id::text from public.maintenance_requests
          where owner_user_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Owners view tenant documents" on storage.objects;
create policy "Owners view tenant documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'lease'
        and (storage.foldername(name))[2] in (
          select id::text from public.leases
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'tenant'
        and (storage.foldername(name))[2] in (
          select id::text from public.tenants
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'maintenance_request'
        and (storage.foldername(name))[2] in (
          select id::text from public.maintenance_requests
          where owner_user_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Owners delete tenant documents" on storage.objects;
create policy "Owners delete tenant documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'lease'
        and (storage.foldername(name))[2] in (
          select id::text from public.leases
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'tenant'
        and (storage.foldername(name))[2] in (
          select id::text from public.tenants
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'maintenance_request'
        and (storage.foldername(name))[2] in (
          select id::text from public.maintenance_requests
          where owner_user_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Owners update tenant documents" on storage.objects;
create policy "Owners update tenant documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'lease'
        and (storage.foldername(name))[2] in (
          select id::text from public.leases
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'tenant'
        and (storage.foldername(name))[2] in (
          select id::text from public.tenants
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'maintenance_request'
        and (storage.foldername(name))[2] in (
          select id::text from public.maintenance_requests
          where owner_user_id = (select auth.uid())
        )
      )
    )
  )
  with check (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'lease'
        and (storage.foldername(name))[2] in (
          select id::text from public.leases
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'tenant'
        and (storage.foldername(name))[2] in (
          select id::text from public.tenants
          where owner_user_id = (select auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'maintenance_request'
        and (storage.foldername(name))[2] in (
          select id::text from public.maintenance_requests
          where owner_user_id = (select auth.uid())
        )
      )
    )
  );

commit;
