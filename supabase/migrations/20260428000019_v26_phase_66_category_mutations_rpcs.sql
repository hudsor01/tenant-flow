-- v2.6 Phase 66: Custom Categories — Admin UI + Write Path
--
-- Adds two SECURITY DEFINER RPCs:
--   1. reassign_document_category(p_from_id uuid, p_to_id uuid)
--      Atomically rewrites every documents.document_type owned by the
--      caller from the source slug to the target slug, then deletes
--      the source document_categories row. Single transaction so a
--      half-applied state is impossible.
--   2. reorder_document_categories(p_orders jsonb)
--      Bulk-updates sort_order for every category in p_orders. Caller
--      must own every category referenced. Persisted order flows
--      through to the vault filter Select.
--
-- Both RPCs gate on auth.uid() and re-derive ownership from the caller's
-- JWT — never trust client-supplied owner_user_id. is_default categories
-- can be reordered freely (the seven defaults are the user's "starter
-- set" and ordering is per-owner) but cannot be deleted (UI surfaces a
-- tooltip; the RPC adds a server-side guard for defense-in-depth).

create or replace function public.reassign_document_category(
    p_from_id uuid,
    p_to_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner_id uuid := auth.uid();
    v_from_slug text;
    v_to_slug text;
    v_is_default boolean;
begin
    if v_owner_id is null then
        raise exception 'Not authenticated' using errcode = '42501';
    end if;
    if p_from_id is null or p_to_id is null then
        raise exception 'p_from_id and p_to_id are required' using errcode = '22023';
    end if;
    if p_from_id = p_to_id then
        raise exception 'Cannot reassign a category to itself' using errcode = '22023';
    end if;

    -- Resolve both rows under the caller's ownership. Locks the source
    -- row so concurrent reassignments serialize cleanly.
    select slug, is_default into v_from_slug, v_is_default
    from public.document_categories
    where id = p_from_id and owner_user_id = v_owner_id
    for update;
    if v_from_slug is null then
        raise exception 'Source category not found or not owned by caller' using errcode = '42501';
    end if;
    if v_is_default then
        raise exception 'Default categories cannot be deleted' using errcode = '42501';
    end if;

    select slug into v_to_slug
    from public.document_categories
    where id = p_to_id and owner_user_id = v_owner_id;
    if v_to_slug is null then
        raise exception 'Target category not found or not owned by caller' using errcode = '42501';
    end if;

    -- Mass-rewrite every document's document_type. The validate_document_category
    -- trigger fires per row but stays satisfied because v_to_slug exists in the
    -- caller's taxonomy.
    update public.documents
    set document_type = v_to_slug
    where owner_user_id = v_owner_id
      and document_type = v_from_slug;

    -- Now safe to delete the source row.
    delete from public.document_categories
    where id = p_from_id and owner_user_id = v_owner_id;
end;
$$;

revoke all on function public.reassign_document_category(uuid, uuid) from public, anon;
grant execute on function public.reassign_document_category(uuid, uuid) to authenticated;


create or replace function public.reorder_document_categories(
    p_orders jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner_id uuid := auth.uid();
    v_count int;
begin
    if v_owner_id is null then
        raise exception 'Not authenticated' using errcode = '42501';
    end if;
    if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
        raise exception 'p_orders must be a JSON array of {id, sort_order}' using errcode = '22023';
    end if;

    -- Verify every referenced category is owned by the caller. Single
    -- aggregate query → fail-closed if even one row is foreign.
    select count(*) into v_count
    from jsonb_array_elements(p_orders) e
    join public.document_categories c
      on c.id = (e->>'id')::uuid
     and c.owner_user_id = v_owner_id;
    if v_count <> jsonb_array_length(p_orders) then
        raise exception 'One or more categories not found or not owned by caller' using errcode = '42501';
    end if;

    -- Atomic bulk-update via a single UPDATE ... FROM jsonb_to_recordset.
    update public.document_categories c
    set sort_order = e.sort_order::int
    from jsonb_to_recordset(p_orders) as e(id uuid, sort_order int)
    where c.id = e.id and c.owner_user_id = v_owner_id;
end;
$$;

revoke all on function public.reorder_document_categories(jsonb) from public, anon;
grant execute on function public.reorder_document_categories(jsonb) to authenticated;
