-- =============================================================================
-- File every e-signed lease in the document vault
-- =============================================================================
-- finalizeSignedLease (supabase/functions/_shared/lease-signing.ts) renders the
-- executed PDF, uploads it to tenant-documents/lease/<lease id>/signed-lease.pdf
-- and writes leases.signed_document_path exactly once. Until now nothing else
-- recorded it: the vault, vault search and the ZIP download read only
-- public.documents, so the signed lease was reachable only from the lease
-- page's download button.
--
-- 1. private.file_signed_lease_document(lease id) inserts the documents row for
--    a lease's signed PDF: entity lease/<id>, the same storage path, the owner's
--    'lease' category (falling back to 'other', then to their first category),
--    a title naming the property, unit and tenant, and the object's size. It
--    files only a lease both parties signed whose pointer is the canonical
--    lease/<id>/signed-lease.pdf (authenticated holds a column grant on
--    signed_document_path, so the pointer alone is not proof of signing). It is
--    idempotent (one row per path) and skips an owner with no categories. The
--    row is dated to the signing, and the activity row the documents insert
--    logs is retitled "Signed lease filed" and dated the same, so the vault, its
--    date filter and the dashboard do not report an old signed lease as added
--    today, or as an upload the owner never made.
--    It lives in `private` so PostgREST does not expose it.
--
-- 2. AFTER UPDATE OF signed_document_path on leases, when the pointer goes from
--    NULL to a path, calls (1) in the same transaction as the pointer write.
--    The pointer is written once (`.is('signed_document_path', null)`), so the
--    trigger fires once per lease. Any error is downgraded to a WARNING: filing
--    the vault copy must never undo the pointer write.
--
-- 3. The vault row and the lease share one storage object, so deleting the row
--    through the app (DB row first, then storage.remove) would also delete the
--    PDF behind leases.signed_document_path. A BEFORE DELETE / UPDATE trigger on
--    documents rejects deleting, or re-pointing, the signed copy of a lease that
--    still exists (the same canonical-path rule as (1) and the app's
--    isSignedLeaseDocument). service_role, postgres and supabase_admin bypass it, so
--    operators and integration-test cleanup can still remove rows. Once the
--    lease row is gone, the guard no longer applies (cleanup_orphan_documents).
--
-- 4. Backfill: file every lease that already has a signed PDF.

create or replace function private.file_signed_lease_document(p_lease_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_owner uuid;
    v_path text;
    v_signed_at timestamptz;
    v_property text;
    v_unit text;
    v_tenant text;
    v_category text;
    v_size integer;
    v_title text;
    v_document_id uuid;
begin
    select l.owner_user_id,
           l.signed_document_path,
           greatest(l.owner_signed_at, l.tenant_signed_at),
           nullif(btrim(p.name), ''),
           nullif(btrim(u.unit_number), ''),
           coalesce(
               nullif(btrim(t.name), ''),
               nullif(btrim(concat_ws(' ', t.first_name, t.last_name)), '')
           )
      into v_owner, v_path, v_signed_at, v_property, v_unit, v_tenant
      from public.leases l
      left join public.units u on u.id = l.unit_id
      left join public.properties p on p.id = u.property_id
      left join public.tenants t on t.id = l.primary_tenant_id
     where l.id = p_lease_id
       and l.owner_signed_at is not null
       and l.tenant_signed_at is not null
       and l.signed_document_path = 'lease/' || l.id::text || '/signed-lease.pdf';

    if v_path is null or v_owner is null then
        return;
    end if;

    if exists (select 1 from public.documents d where d.file_path = v_path) then
        return;
    end if;

    select c.slug
      into v_category
      from public.document_categories c
     where c.owner_user_id = v_owner
     order by (c.slug = 'lease') desc, (c.slug = 'other') desc, c.sort_order, c.slug
     limit 1;

    if v_category is null then
        raise warning 'signed lease % not filed: owner % has no document categories',
            p_lease_id, v_owner;
        return;
    end if;

    select (o.metadata ->> 'size')::integer
      into v_size
      from storage.objects o
     where o.bucket_id = 'tenant-documents'
       and o.name = v_path;

    v_title := 'Signed lease'
        || case
               when v_property is not null
                   then ': ' || v_property || coalesce(', ' || v_unit, '')
               when v_unit is not null
                   then ': ' || v_unit
               else ''
           end
        || coalesce(' (' || v_tenant || ')', '');

    insert into public.documents (
        entity_type, entity_id, document_type, file_path, storage_url,
        file_size, mime_type, title, description, owner_user_id, created_at
    ) values (
        'lease', p_lease_id, v_category, v_path, v_path,
        v_size, 'application/pdf', v_title,
        'Executed lease, e-signed by the owner and the tenant'
            || coalesce(' on ' || to_char(v_signed_at at time zone 'UTC', 'YYYY-MM-DD'), '')
            || '.',
        v_owner,
        coalesce(v_signed_at, now())
    )
    returning id into v_document_id;

    update public.activity a
       set title = 'Signed lease filed',
           created_at = coalesce(v_signed_at, a.created_at)
     where a.entity_type = 'document'
       and a.entity_id = v_document_id;
end;
$$;

revoke all on function private.file_signed_lease_document(uuid) from public, anon, authenticated;

create or replace function public.file_signed_lease_in_vault()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    begin
        perform private.file_signed_lease_document(NEW.id);
    exception when others then
        raise warning 'filing signed lease % in the vault failed: % (%)',
            NEW.id, sqlerrm, sqlstate;
    end;
    return null;
end;
$$;

revoke all on function public.file_signed_lease_in_vault() from public, anon, authenticated;

drop trigger if exists trg_file_signed_lease_in_vault on public.leases;
create trigger trg_file_signed_lease_in_vault
    after update of signed_document_path
    on public.leases
    for each row
    when (OLD.signed_document_path is null and NEW.signed_document_path is not null)
    execute function public.file_signed_lease_in_vault();

-- SECURITY INVOKER: current_user is the caller, so the role bypass works, and an
-- owner's lookup of their own lease passes the leases SELECT policy.
create or replace function public.protect_signed_lease_document()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if current_user in ('service_role', 'postgres', 'supabase_admin') then
        return case when TG_OP = 'DELETE' then OLD else NEW end;
    end if;

    -- An UPDATE that names these columns without changing them is harmless.
    if TG_OP = 'UPDATE'
       and (NEW.file_path, NEW.storage_url, NEW.entity_type, NEW.entity_id)
           is not distinct from (OLD.file_path, OLD.storage_url, OLD.entity_type, OLD.entity_id) then
        return NEW;
    end if;

    if OLD.entity_type = 'lease'
       and OLD.file_path = 'lease/' || OLD.entity_id::text || '/signed-lease.pdf'
       and exists (
        select 1
        from public.leases l
        where l.id = OLD.entity_id
          and l.signed_document_path = OLD.file_path
    ) then
        raise exception 'the signed copy of a lease cannot be removed or moved'
            using errcode = '42501';
    end if;

    return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

revoke all on function public.protect_signed_lease_document() from public, anon, authenticated;

drop trigger if exists trg_protect_signed_lease_document on public.documents;
create trigger trg_protect_signed_lease_document
    before delete or update of file_path, storage_url, entity_type, entity_id
    on public.documents
    for each row
    execute function public.protect_signed_lease_document();

-- Backfill leases that were signed before this migration.
do $$
declare
    r record;
begin
    for r in
        select l.id
        from public.leases l
        where l.signed_document_path is not null
          and not exists (
              select 1 from public.documents d where d.file_path = l.signed_document_path
          )
    loop
        perform private.file_signed_lease_document(r.id);
    end loop;
end;
$$;
