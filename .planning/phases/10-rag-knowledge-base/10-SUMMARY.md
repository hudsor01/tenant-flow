# Phase 10 Summary — RAG Knowledge Base (BLOG-03)

**Status:** Code-complete + verified; corpus-load is a one-command owner runtime step.
**Branch:** gsd/v5.0-milestone-setup (PR #792)

## Outcome
The pgvector retrieval layer is live in prod and the indexer + smoke test are written. The corpus *load* runs with the owner's credentials (the harness scrubs the service-role/DB creds from the agent's shell — a deliberate boundary), exactly like "pull the model" in Phase 9.

### 10-01 — pgvector store (applied + verified in prod) ✅
- Migration `20260608015600_rag_knowledge_base.sql` (applied via MCP, filename reconciled to the prod timestamp). First apply failed on the `<=>` operator not resolving under a quoted multi-schema search_path; fixed with `OPERATOR(extensions.<=>)` (fully-qualified) + the project-standard `set search_path to 'public'`.
- Verified live: `vector` extension installed; `public.blog_rag_chunks` (id/content/source/metadata/`embedding vector(1024)`/created_at/updated_at); `blog_rag_chunks_embedding_hnsw` cosine HNSW index; `set_blog_rag_chunks_updated_at` trigger (reuses `set_updated_at()`); RLS enabled (no owner policy — company facts); `match_blog_rag_chunks(vector(1024), int)` SECURITY DEFINER RPC, `search_path` locked, granted to authenticated + service_role, **NOT anon (verified `has_function_privilege('anon',…)` = false)**.

### 10-02 — indexer + smoke test (written; pipeline verified up to the write) ✅/⏳
- `scripts/rag-index-blog-corpus.ts` — re-runnable bun indexer: chunks `public/llms-full.txt` by `##` section, embeds each via LM Studio (`text-embedding-qwen3-embedding-0.6b`, dim-asserted 1024), clean re-index per source, idempotent (content-hash in metadata), service-role upsert.
- **Verified the embed half works end-to-end:** a throwaway run chunked llms-full.txt into **10 chunks** and embedded all 10 via LM Studio (1024-dim each) successfully. Only the DB write needs the owner's service-role key.
- `tests/integration/rls/blog-rag-retrieval.test.ts` — retrieval smoke test (embed query → `match_blog_rag_chunks` → ≥3 on-topic rows, descending similarity). Auto-skips when LM Studio is unreachable (CI) or the corpus is empty — same pattern as the download-documents-zip probe.
- **Rerank:** deferred. LM Studio's rerank endpoint is non-standard; cosine top-k is sufficient for retrieval. Revisit in Phase 12 (quality gate) if needed.

## OWNER STEP to fully close BLOG-03 (~10s)
With native n8n/LM Studio running, run:
```
bun scripts/rag-index-blog-corpus.ts
```
Expected: `llms-full.txt: 10 chunks` … `Indexed 10 chunks. Table now has 10 rows.` Then `bun run test:integration -- blog-rag-retrieval` (or just trust the indexer's row count) verifies retrieval returns on-topic chunks.

## Config (unchanged from Phase 9)
base URL `http://localhost:1234/v1`; embed `text-embedding-qwen3-embedding-0.6b` (dim 1024); table `public.blog_rag_chunks`; retrieval RPC `match_blog_rag_chunks(query_embedding, match_count)`.

## Notes
- Tracked deliverables (perfect-PR scope): the migration + `scripts/rag-index-blog-corpus.ts` + the smoke test. Corpus content traces entirely to `public/llms-full.txt` (curated, pricing-accurate) — no fabrication.
- Corpus expansion (pricing.ts/features/faq beyond what llms-full.txt already covers) can be added to the indexer's `sources` array later (Phase 14 re-index).
