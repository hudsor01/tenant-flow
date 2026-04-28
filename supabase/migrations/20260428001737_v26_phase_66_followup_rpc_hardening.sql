-- v2.6 Phase 66 Followup (cycle-1 review I-3 + I-4)
--
-- I-3: reassign_document_category previously selected the target row
--      without FOR UPDATE. A concurrent transaction could delete the
--      target between the lookup and the mass-rewrite UPDATE, causing
--      the validate_document_category trigger to fail per-row with
--      23514 against a now-missing slug. Lock both source AND target
--      so the operation is genuinely serializable.
-- I-4: reorder_document_categories previously only validated owner-
--      ship via aggregate count — malformed elements (missing id,
--      missing/non-numeric sort_order) leaked through to the inner
--      UPDATE and surfaced as generic 500s. Add explicit per-element
--      shape validation up-front.

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

    -- Lock the source row.
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

    -- Lock the target too — without this lock a concurrent reassign
    -- could delete the target between this read and the mass-rewrite
    -- below, leaving the per-row validate_document_category trigger
    -- to reject every UPDATE with 23514 against a now-missing slug.
    select slug into v_to_slug
    from public.document_categories
    where id = p_to_id and owner_user_id = v_owner_id
    for update;
    if v_to_slug is null then
        raise exception 'Target category not found or not owned by caller' using errcode = '42501';
    end if;

    update public.documents
    set document_type = v_to_slug
    where owner_user_id = v_owner_id
      and document_type = v_from_slug;

    delete from public.document_categories
    where id = p_from_id and owner_user_id = v_owner_id;
end;
$$;

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

    -- Per-element shape validation. Each entry must carry a non-null
    -- string id (UUID format enforced by the JSONB cast inside the
    -- ownership join below) AND a numeric sort_order. Catching this
    -- here surfaces a clear 22023 to callers instead of a generic
    -- cast/null-violation 500 leaking out of the UPDATE.
    if exists (
        select 1
        from jsonb_array_elements(p_orders) e
        where (e->>'id') is null
           or (e->>'sort_order') is null
           or jsonb_typeof(e->'sort_order') <> 'number'
    ) then
        raise exception 'Each entry must have id (uuid) and sort_order (number)' using errcode = '22023';
    end if;

    select count(*) into v_count
    from jsonb_array_elements(p_orders) e
    join public.document_categories c
      on c.id = (e->>'id')::uuid
     and c.owner_user_id = v_owner_id;
    if v_count <> jsonb_array_length(p_orders) then
        raise exception 'One or more categories not found or not owned by caller' using errcode = '42501';
    end if;

    update public.document_categories c
    set sort_order = e.sort_order::int
    from jsonb_to_recordset(p_orders) as e(id uuid, sort_order int)
    where c.id = e.id and c.owner_user_id = v_owner_id;
end;
$$;
