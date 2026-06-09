-- Phase 10 (v5.0 AI Blog Content Engine): RAG knowledge base (BLOG-03).
--
-- pgvector store for grounding blog generation in real TenantFlow facts.
-- Embedding dim = 1024 (qwen3-embedding-0.6b via LM Studio, confirmed Phase 9).
-- COMPANY KNOWLEDGE, not per-owner data: no owner-scoped policy; reads go ONLY
-- through the match_blog_rag_chunks SECURITY DEFINER RPC; writes are service-role
-- (the indexer, which bypasses RLS). The RPC is granted to authenticated +
-- service_role, NEVER anon (avoids free embedding-compute / scraping abuse).

create extension if not exists vector with schema extensions;

create table if not exists public.blog_rag_chunks (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  source     text,
  metadata   jsonb not null default '{}'::jsonb,
  embedding  extensions.vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cosine ANN index (matches the RPC's <=> cosine ordering).
create index if not exists blog_rag_chunks_embedding_hnsw
  on public.blog_rag_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Canonical updated_at trigger (reuse the single shared function).
drop trigger if exists set_blog_rag_chunks_updated_at on public.blog_rag_chunks;
create trigger set_blog_rag_chunks_updated_at
  before update on public.blog_rag_chunks
  for each row execute function public.set_updated_at();

-- RLS on; no owner policy (company facts). Service-role writes bypass RLS;
-- reads are exclusively via the SECURITY DEFINER RPC below.
alter table public.blog_rag_chunks enable row level security;

-- Retrieval RPC: cosine similarity (higher = better), top-k.
create or replace function public.match_blog_rag_chunks(
  query_embedding extensions.vector(1024),
  match_count int default 6
)
returns table (id uuid, content text, source text, metadata jsonb, similarity float)
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- OPERATOR(extensions.<=>) fully-qualifies the pgvector cosine-distance
  -- operator so it resolves with the locked single-schema search_path.
  select c.id,
         c.content,
         c.source,
         c.metadata,
         1 - (c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.blog_rag_chunks c
  where c.embedding is not null
  order by c.embedding OPERATOR(extensions.<=>) query_embedding
  -- clamp the count: floor 1, ceiling 50 (prevents pulling the whole corpus
  -- through the SECURITY DEFINER read — scrape/free-embedding-scan guard).
  limit least(greatest(match_count, 1), 50);
$function$;

revoke all on function public.match_blog_rag_chunks(extensions.vector, int) from public;
grant execute on function public.match_blog_rag_chunks(extensions.vector, int) to authenticated, service_role;
