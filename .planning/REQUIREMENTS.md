# Requirements: TenantFlow — v5.0 AI Blog Content Engine

**Defined:** 2026-06-07
**Core Value:** A local-LLM (LM Studio on the M5) + RAG n8n pipeline that drafts brand-positive, factually-grounded, E-E-A-T-credible blog posts into the existing `n8n-blog-ingest` Edge Function as `status='in-review'` drafts for human approval — and uses that engine to execute the SEO-01 reclaim (republish the deleted high-impression slugs, then drop them from `blog-redirects.ts`). The bar is content that genuinely helps landlords and features TenantFlow naturally — never generic AI listicles (which Google's helpful-content system penalizes and which would worsen the rankings being reclaimed).

**Source of truth:** `.planning/v5.0-AI-BLOG-ENGINE-SCOPE.md` + live-verified facts (2026-06-07): LM Studio at `localhost:1234` serving `qwen3-coder-30b-a3b-instruct` + `qwen3-embedding-0.6b` + `qwen3-reranker-0.6b` (no general chat model yet); n8n in Docker/colima on the M5 behind the `tenantflow-n8n` Cloudflare tunnel, container cannot reach the Mac host yet; `n8n-blog-ingest` EF = HMAC `x-n8n-signature` + 9 gates + `validate_blog_post` trigger; drafts land `status='in-review'`.

## v1 Requirements

### BLOG — local-LLM blog content engine

- [x] **BLOG-01**: n8n reaches LM Studio's OpenAI-compatible API — `/v1/chat/completions` + `/v1/embeddings` return 200. (Resolved by running n8n NATIVELY on the Mac via node@22 + `n8n/start-native.sh`, base URL `http://localhost:1234/v1`; colima's container→host network block made the Dockerized path unworkable.)
- [x] **BLOG-02**: General-instruct model installed + smoke-tested — `mistral-small-3.2-24b-instruct-2506-mlx` (LM Studio MLX 8-bit, Apache 2.0) produces coherent on-brand TenantFlow prose; embeddings (`qwen3-embedding`, dim 1024) + reranker reachable for Phase 10.
- [x] **BLOG-03**: A curated TenantFlow fact corpus (from `llms-full.txt` — positioning, capabilities, pricing, comparisons) is embedded via `qwen3-embedding` (dim 1024) into pgvector (`blog_rag_chunks`, RLS-on, reads via `match_blog_rag_chunks`); 10 chunks loaded + verified. Cosine retrieval RPC live.
- [x] **BLOG-04**: `scripts/generate-blog-draft.ts` emits structured output (json_schema) passing all 9 ingest gates + the `validate_blog_post` trigger, via a deterministic validate/repair loop (+ banlist sanitizer). Verified: a real 1,410-word, 8-H2, banlist-clean draft generated end-to-end.
- [x] **BLOG-05**: The generator HMAC-signs (`x-n8n-signature`) + POSTs to `n8n-blog-ingest` → real draft landed with `status='in-review'` (HTTP 201, MCP-verified); no deploy fires on a draft. (EF migrated off the dead legacy service-role key to `INGEST_DB_KEY`; required `N8N_WEBHOOK_SECRET` EF secret.)
- [ ] **BLOG-06**: Quality + brand guardrails — brand-voice system prompt, E-E-A-T conventions (Organization author "TenantFlow Team"), RAG-grounded facts only (no hallucinated specifics), and a self-critique/reranker pass that rejects thin or off-brand drafts before in-review.
- [ ] **BLOG-07**: A human approve/reject workflow (leveraging `in-review` status; dashboard or n8n surface) — nothing publishes without the owner.
- [ ] **BLOG-08**: SEO-01 reclaim — a topic queue seeded from the deleted high-impression ghost slugs (top-10 first) generates posts at the exact original slugs; on publish, the entry is removed from `src/lib/seo/blog-redirects.ts` and the collision-guard test stays green. (Closes the carried-over v4.0 SEO-01 item.)
- [ ] **BLOG-09**: Cadence + observability — a sustainable schedule with slug dedupe, execution monitoring, and failure alerts (reuse the critical-error notify path); runaway/cost guards documented.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-publish without human review | The `in-review` gate is intentional — quality/brand safety. Owner approves every post. |
| Cloud LLM APIs (OpenAI/Anthropic) for generation | Milestone intent is the LOCAL model on the M5. Cloud is a possible later fallback, not this scope. |
| Rebuilding the homelab n8n | Separate; this milestone targets the laptop bridge. The pipeline is portable back to the homelab later. |
| New blog UI/templates | Reuse the existing blog rendering + `n8n-blog-ingest` contract. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BLOG-01 | Phase 9 — LLM Wiring & Model Selection | Pending |
| BLOG-02 | Phase 9 — LLM Wiring & Model Selection | Pending |
| BLOG-03 | Phase 10 — RAG Knowledge Base | Done |
| BLOG-04 | Phase 11 — Generation Pipeline | Done |
| BLOG-05 | Phase 11 — Generation Pipeline | Done |
| BLOG-06 | Phase 12 — Quality & Brand Guardrails | Pending |
| BLOG-07 | Phase 12 — Quality & Brand Guardrails | Pending |
| BLOG-08 | Phase 13 — SEO-01 Reclaim Integration | Pending |
| BLOG-09 | Phase 14 — Cadence, Dedupe & Monitoring | Pending |

**Coverage:** 9 requirements mapped to 6 phases (9-14), no orphans.

---
*Requirements defined: 2026-06-07. Supersedes v4.0 (archived to milestones/v4.0-REQUIREMENTS.md, 20/21 shipped; SEO-01 content-reclaim carried here as BLOG-08).*
