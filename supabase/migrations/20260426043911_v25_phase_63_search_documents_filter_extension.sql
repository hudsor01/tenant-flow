-- v2.5 Phase 63 — extend search_documents RPC with date-range +
-- multi-category filtering.
--
-- Phase 60 shipped the RPC with single-value p_category and no date
-- predicate. Phase 63 swaps p_category for p_categories text[] (so
-- owners can filter "leases AND insurance" in one query) and adds
-- p_from / p_to timestamptz bounds for date-range filtering.
--
-- The signature change requires DROP + CREATE — `documentSearchQueries.list`
-- in src/hooks/api/query-keys/document-search-keys.ts is the sole caller
-- and is updated in the same PR to send the array form.

begin;

drop function if exists public.search_documents(text, text, text, int, int);

create or replace function public.search_documents(
  p_query text default null,
  p_entity_type text default null,
  p_categories text[] default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  entity_type text,
  entity_id uuid,
  document_type text,
  mime_type text,
  file_path text,
  storage_url text,
  file_size int,
  title text,
  tags text[],
  description text,
  owner_user_id uuid,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_owner_id uuid := auth.uid();
  v_ts_query tsquery;
  v_has_query boolean;
  v_total bigint;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'Limit must be between 1 and 200';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'Offset must be >= 0';
  end if;

  -- Date bounds sanity check — caller-supplied from > to is meaningless;
  -- raise rather than silently returning zero rows so the UI surfaces it.
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'p_from must be <= p_to';
  end if;

  v_has_query := p_query is not null and length(trim(p_query)) > 0;
  if v_has_query then
    v_ts_query := plainto_tsquery('english', p_query);
  end if;

  -- Count the full matching set before applying limit/offset.
  -- Empty p_categories array is treated as "no category filter" (same
  -- semantics as null) so the UI can pass [] without surprises.
  select count(*) into v_total
  from public.documents d
  where d.owner_user_id = v_owner_id
    and (p_entity_type is null or d.entity_type = p_entity_type)
    and (
      p_categories is null
      or array_length(p_categories, 1) is null
      or d.document_type = any(p_categories)
    )
    and (p_from is null or d.created_at >= p_from)
    and (p_to is null or d.created_at <= p_to)
    and (not v_has_query or d.search_vector @@ v_ts_query);

  return query
  select
    d.id, d.entity_type, d.entity_id, d.document_type, d.mime_type,
    d.file_path, d.storage_url, d.file_size, d.title, d.tags,
    d.description, d.owner_user_id, d.created_at, v_total as total_count
  from public.documents d
  where d.owner_user_id = v_owner_id
    and (p_entity_type is null or d.entity_type = p_entity_type)
    and (
      p_categories is null
      or array_length(p_categories, 1) is null
      or d.document_type = any(p_categories)
    )
    and (p_from is null or d.created_at >= p_from)
    and (p_to is null or d.created_at <= p_to)
    and (not v_has_query or d.search_vector @@ v_ts_query)
  order by
    case when v_has_query then ts_rank(d.search_vector, v_ts_query) else 0 end desc,
    d.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all on function public.search_documents(text, text, text[], timestamptz, timestamptz, int, int) from public;
grant execute on function public.search_documents(text, text, text[], timestamptz, timestamptz, int, int) to authenticated;

comment on function public.search_documents is
  'Owner-scoped document search. Phase 60 shipped query/entity/category/limit/offset; Phase 63 added p_categories text[] (replacing scalar p_category) and p_from/p_to timestamptz date bounds. SECURITY DEFINER, search_path locked to public.';

commit;
