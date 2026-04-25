-- v2.4 Phase 60 — global /documents vault: full-text search + search RPC.
--
-- Adds a `search_vector tsvector` column on `public.documents` backed by
-- a BEFORE INSERT/UPDATE trigger (NOT a generated column — `to_tsvector`
-- with a named text-search config is STABLE, not IMMUTABLE, so Postgres
-- rejects it in a GENERATED ... AS expression).
--
-- Exposes a `search_documents` RPC that the global vault page uses:
--   - Filters by owner via `documents.owner_user_id = auth.uid()`.
--   - Optional free-text via `search_vector @@ plainto_tsquery(...)`.
--   - Optional entity_type + category (document_type) filters.
--   - Pagination via LIMIT/OFFSET; returns `total_count` per row so the
--     UI can render "showing X of N" without a separate count query.
--
-- Phase 61 will add the categorical taxonomy + CHECK constraint on
-- `document_type`. Until then `p_category` matches the current
-- freetext value (default 'other').

begin;

-- ============================================================================
-- 1. search_vector column + trigger + GIN index
-- ============================================================================
alter table public.documents
  add column if not exists search_vector tsvector;

create or replace function public.documents_refresh_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector := to_tsvector(
    'english',
    coalesce(new.title, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists documents_search_vector_trigger on public.documents;
create trigger documents_search_vector_trigger
  before insert or update of title, description, tags
  on public.documents
  for each row execute function public.documents_refresh_search_vector();

-- Backfill — forces the trigger to fire on every existing row.
update public.documents set search_vector = null where search_vector is null;

create index if not exists idx_documents_search_vector
  on public.documents using gin (search_vector);

comment on column public.documents.search_vector is
  'tsvector of title + description + tags, maintained by documents_search_vector_trigger. Indexed via GIN for search_documents RPC.';

-- ============================================================================
-- 2. search_documents RPC
-- ============================================================================
create or replace function public.search_documents(
  p_query text default null,
  p_entity_type text default null,
  p_category text default null,
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

  v_has_query := p_query is not null and length(trim(p_query)) > 0;
  if v_has_query then
    v_ts_query := plainto_tsquery('english', p_query);
  end if;

  -- Count the full matching set before applying limit/offset.
  select count(*) into v_total
  from public.documents d
  where d.owner_user_id = v_owner_id
    and (p_entity_type is null or d.entity_type = p_entity_type)
    and (p_category is null or d.document_type = p_category)
    and (not v_has_query or d.search_vector @@ v_ts_query);

  return query
  select
    d.id, d.entity_type, d.entity_id, d.document_type, d.mime_type,
    d.file_path, d.storage_url, d.file_size, d.title, d.tags,
    d.description, d.owner_user_id, d.created_at, v_total as total_count
  from public.documents d
  where d.owner_user_id = v_owner_id
    and (p_entity_type is null or d.entity_type = p_entity_type)
    and (p_category is null or d.document_type = p_category)
    and (not v_has_query or d.search_vector @@ v_ts_query)
  order by
    case when v_has_query then ts_rank(d.search_vector, v_ts_query) else 0 end desc,
    d.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all on function public.search_documents(text, text, text, int, int) from public;
grant execute on function public.search_documents(text, text, text, int, int) to authenticated;

comment on function public.search_documents is
  'Global document vault search for the current owner. Filters by entity_type + category + free-text. Returns rows with total_count for pagination.';

commit;
