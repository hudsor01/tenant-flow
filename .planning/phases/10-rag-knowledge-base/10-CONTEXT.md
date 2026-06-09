# Phase 10: RAG Knowledge Base - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning
**Source:** Live-DB probe (pgvector availability) + located the curated corpus sources.

<domain>
## Phase Boundary
Stand up the retrieval layer that grounds blog generation in real TenantFlow facts: a pgvector store in Supabase + an embed-and-index pipeline + a retrieval (+rerank) smoke test. No blog generation yet (Phase 11). Deliverable: a topic query returns relevant, accurate TenantFlow context chunks.
</domain>

<decisions>
## Implementation Decisions (LOCKED — grounded)

### Vector store (pgvector in Supabase)
- pgvector is **available but NOT installed** (`vector` in pg_available_extensions, 0 installed); pg_trgm 1.6 is installed. No existing RAG tables.
- Migration (`apply_migration` via MCP, then reconcile filename): `create extension if not exists vector with schema extensions;` + table `public.blog_rag_chunks` (`id uuid pk default gen_random_uuid()`, `content text not null`, `source text` (provenance e.g. 'llms-full.txt','pricing.ts'), `metadata jsonb default '{}'`, `embedding vector(1024)` — qwen3-embedding dim is **1024**, confirmed Phase 9, `created_at timestamptz default now()`, `updated_at`). Cosine index: `hnsw (embedding vector_cosine_ops)` (or ivfflat if hnsw unsupported on this PG). `set_updated_at` trigger per project convention.
- This is **company knowledge, not per-owner data** → enable RLS but no owner scoping; reads go through a SECURITY DEFINER RPC. Write is service-role (the indexer). Define RPC `match_blog_rag_chunks(query_embedding vector(1024), match_count int default 6)` returning id/content/source/metadata/similarity, ordered by `embedding <=> query_embedding` (cosine), SECURITY DEFINER + `set search_path` per project rules. (No `auth.uid()` owner gate — it's public company facts; but keep it authenticated/service-role-callable, not anon.)

### Corpus (real, accurate TenantFlow facts → E-E-A-T)
Primary curated source: **`public/llms-full.txt`** (75 lines — already a curated, pricing-accurate plain-text marketing surface from the SEO work; the best single fact source). Supplement with: `src/config/pricing.ts` (canonical tiers: Free / Starter / Growth / … up to $149 — extract programmatically, do NOT hand-copy prices), `src/components/landing/features-data.ts` + `src/components/sections/home-faq.tsx` (features + FAQ Q&A), `.planning/PROJECT.md` + `CLAUDE.md` positioning ("landlord-only; tenants are records not users; no tenant portal; no rent facilitation; document vault is the headline differentiator"). Chunk into coherent ~200-500 token passages with a `source` tag.

### Embed + index pipeline
- Native n8n reaches LM Studio at `http://localhost:1234/v1/embeddings` (model `text-embedding-qwen3-embedding-0.6b`, dim 1024) and Supabase via the JS client / REST (service-role).
- For the INITIAL corpus load, a repeatable indexer is cleaner than hand-built n8n nodes: prefer a small **committed script** (e.g. `scripts/rag-index-blog-corpus.ts`, run with bun) that reads the sources → chunks → embeds via LM Studio → upserts into `blog_rag_chunks` (idempotent: dedupe by content hash in `metadata`). An n8n re-index workflow can wrap it later. (Plan decides script vs n8n workflow; script is the recommendation for a deterministic, testable, re-runnable load.)

### Rerank (optional enhancement)
- `qwen3-reranker-0.6b` is loaded. LM Studio's rerank API support is uncertain (rerank isn't an OpenAI-standard endpoint) — the plan must VERIFY whether LM Studio exposes a usable rerank endpoint; if not, defer reranking to a later optimization (cosine top-k alone is sufficient for the Phase 10 smoke test). Don't block the phase on rerank.

### Verification (smoke test)
- After indexing: embed a sample topic ("tenant screening best practices") → `match_blog_rag_chunks` → returns ≥3 relevant chunks whose content is actually about screening/TenantFlow (eyeball relevance). Pin a small test that the RPC returns rows + the top result is on-topic.
</decisions>

<constraints>
- **TRACKED prod work** (perfect-PR applies): the migration (pgvector + table + RPC) and any committed indexer script. The corpus content is derived from existing repo/marketing facts — no fabrication (accuracy is the whole point of RAG here).
- Migration via Supabase MCP `apply_migration` + reconcile filename (migration-mcp-prod-drift). Embedding dim MUST be 1024 (qwen3-embedding) — a mismatch breaks the vector column.
- RLS on the table (project rule); reads via SECURITY DEFINER RPC with locked search_path. No anon access.
- Native n8n + LM Studio must be running for the embed step (localhost:1234). LLM config from Phase 9 (see 09-SUMMARY.md).
- All `amount`/price facts come from `pricing.ts` programmatically — never hand-typed (avoid drift; there's a pricing drift-guard test already).
</constraints>

<canonical_refs>
- 09-SUMMARY.md (LLM base URL + model ids + native runtime).
- `public/llms-full.txt`, `src/config/pricing.ts`, `src/components/landing/features-data.ts`, `src/components/sections/home-faq.tsx`, `.planning/PROJECT.md`.
- pgvector docs (hnsw/ivfflat cosine); a recent SECURITY DEFINER RPC migration (e.g. `20260606041458_stats_consolidation_rpcs.sql`) as the style precedent.
- mapper/RPC boundary conventions (CLAUDE.md) for the match RPC return typing if a TS hook reads it.
</canonical_refs>

<deferred>
- Reranking (if LM Studio lacks a usable rerank endpoint) → later optimization.
- The generation pipeline that CONSUMES retrieval → Phase 11.
- Auto-re-index cadence → Phase 14.
</deferred>

---
*Phase: 10-rag-knowledge-base — pgvector(1024) + blog_rag_chunks + match RPC; corpus from llms-full.txt + pricing.ts + features/faq + positioning; embed via LM Studio qwen3-embedding; retrieval smoke test.*
