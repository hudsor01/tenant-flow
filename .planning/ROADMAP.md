# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02, 12/12 requirements) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Hardening & Hygiene** — Phases 1-8 (shipped 2026-06-07, 20/21 requirements; SEO-01 content-reclaim carried to v5.0) — see [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)
- 📋 **v5.0 AI Blog Content Engine** — Phases 9-14 (planning, 9 requirements) — active

## Phases

### v5.0 AI Blog Content Engine (active)

- [x] **Phase 9: LLM Wiring & Model Selection** — DONE: native n8n (node@22) reaches LM Studio at localhost:1234 (colima container→host was a dead end → went native); Mistral-Small-3.2-24B brand-prose smoke-tested; embeddings/reranker reachable (BLOG-01, BLOG-02)
- [x] **Phase 10: RAG Knowledge Base** — DONE: pgvector `blog_rag_chunks` + `match_blog_rag_chunks` RPC live; 10 corpus chunks (llms-full.txt) embedded via qwen3-embedding (dim 1024) + verified (BLOG-03)
- [x] **Phase 11: Generation Pipeline** — DONE: generate-blog-draft.ts (topic→RAG→Mistral→validate/repair+banlist-sanitizer→HMAC→ingest) produced a real 1,410-word in-review draft (HTTP 201, MCP-verified). Fixed the ingest EF's dead legacy key (→INGEST_DB_KEY) + N8N_WEBHOOK_SECRET (BLOG-04, BLOG-05)
- [x] **Phase 12: Quality & Brand Guardrails** — DONE: Mistral LLM-as-judge self-critique gate (4-dim score, regenerate/fail-closed) + E-E-A-T prompt hardening + /admin/blog approve-reject surface (is_admin-walled, RLS, revalidate) + Organization byline regression-lock + E2E. 30 unit tests (BLOG-06, BLOG-07)
- [ ] **Phase 13: SEO-01 Reclaim Integration** — ghost-slug queue, generate-at-slug, auto-drop redirect on publish; closes SEO-01 (BLOG-08)
- [ ] **Phase 14: Cadence, Dedupe & Monitoring** — schedule, dedupe, observability + failure alerts (BLOG-09)

## Phase Details (v5.0 AI Blog Content Engine)

### Phase 9: LLM Wiring & Model Selection
**Goal**: n8n (Docker/colima on the M5) can call the local LM Studio OpenAI-compatible API (`/v1/chat/completions` + `/v1/embeddings`) and the chosen general-instruct generation model is installed and smoke-tested.
**Depends on**: Nothing (the n8n bridge + tunnel are already live)
**Requirements**: BLOG-01, BLOG-02
**Success Criteria**:
  1. From inside the `tenantflow-n8n` container, an HTTP call reaches LM Studio on the Mac host (host-gateway or LAN IP) and returns a completion + an embedding.
  2. A general-instruct model (recommend `Mistral-Small-3.2-24B-Instruct-2506` MLX-6bit — best for the JSON ingest contract; Gemma-3-27B prose runner-up, Qwen3-30B-A3B-2507 fast-draft alternate) is loaded in LM Studio and produces coherent marketing-grade prose on a test prompt; the model choice is documented.
  3. `qwen3-embedding-0.6b` + `qwen3-reranker-0.6b` are reachable for the RAG phase.
**Plans:** 2 plans
Plans:
- [ ] 09-01-PLAN.md — Wire tenantflow-n8n container to LM Studio on the Mac host (host-gateway + LAN-IP fallback); verify /v1/{models,chat,embeddings} from inside the container + an n8n test workflow; record base URL as config (BLOG-01)
- [ ] 09-02-PLAN.md — Pull + smoke-test a general-instruct generation model (marketing prose); confirm embedding + reranker reachable for Phase 10 RAG; document the model choice + fallback (BLOG-02)

### Phase 10: RAG Knowledge Base
**Goal**: A retrievable corpus of real TenantFlow facts so generated posts are accurate, distinctive, and E-E-A-T-credible.
**Depends on**: Phase 9
**Requirements**: BLOG-03
**Success Criteria**:
  1. A curated TenantFlow fact corpus (features, pricing from `pricing.ts`, positioning, landlord-domain expertise) is embedded via `qwen3-embedding` into pgvector (Supabase, RLS-scoped).
  2. A retrieval query for a sample topic returns relevant TenantFlow context (reranked), verified by a smoke test.
**Plans:** 2 plans
Plans:
- [ ] 10-01-PLAN.md — pgvector install + blog_rag_chunks(vector(1024)) table + cosine index + RLS + match_blog_rag_chunks SECURITY DEFINER RPC ([BLOCKING] MCP apply) (BLOG-03)
- [ ] 10-02-PLAN.md — re-runnable corpus indexer (llms-full.txt + pricing.ts + faq + positioning) → LM Studio embeddings → idempotent upsert; rerank verify-or-defer; retrieval smoke test (BLOG-03)

### Phase 11: Generation Pipeline
**Goal**: An n8n workflow that turns a topic into a contract-conforming draft landing in `n8n-blog-ingest` as `status='in-review'`.
**Depends on**: Phase 10
**Requirements**: BLOG-04, BLOG-05
**Success Criteria**:
  1. The LLM emits structured output (title/slug/excerpt/markdown-body/category/canonical_url) that passes all 9 ingest gates + the `validate_blog_post` trigger; a deterministic validate/repair step precedes send.
  2. The workflow HMAC-signs (`x-n8n-signature`) and POSTs to `n8n-blog-ingest`; a real draft appears with `status='in-review'`. Vercel deploy hook fires only on publish, not on draft.
**Plans:** 3 plans
Plans:
- [ ] 11-01-PLAN.md — n8n credentials + [BLOCKING] HMAC-secret alignment + native-runtime check; workflow skeleton (topic→embed→match_blog_rag_chunks→HMAC→POST ingest) proven by a known-good 201 (BLOG-05)
- [ ] 11-02-PLAN.md — Mistral generation prompt (landlord voice + 9 gates + RAG facts) + deterministic validate/repair Code node enforcing all 9 gates with bounded retry (BLOG-04)
- [ ] 11-03-PLAN.md — [BLOCKING] end-to-end real-topic run → in-review draft (MCP-verified, no deploy); export wf-blog-generate.json + README; tracked-code scope check (BLOG-04, BLOG-05)

### Phase 12: Quality & Brand Guardrails
**Goal**: Drafts are on-brand, factually grounded, and gated against thin/AI-spam content before reaching review.
**Depends on**: Phase 11
**Requirements**: BLOG-06, BLOG-07
**Success Criteria**:
  1. A brand-voice system prompt + E-E-A-T conventions (Organization author "TenantFlow Team") + RAG-grounded facts (no hallucinated specifics) are enforced.
  2. A self-critique / reranker pass rejects off-brand or thin drafts before in-review; a human approve/reject surface exists (nothing publishes without the owner).
**Plans:** 3 plans
Plans:
- [ ] 12-01-PLAN.md — Harden the generator's brand/E-E-A-T/RAG-grounding system prompt + add the Mistral LLM-as-judge self-critique gate (score+verdict, regenerate-bounded, fail-closed) between the 9 gates and the HMAC POST (BLOG-06, BLOG-07)
- [ ] 12-02-PLAN.md — Admin approve/reject surface at /admin/blog in the existing (admin) group: list in-review drafts + sanitized preview, Approve→published+revalidatePath / Reject→archived via blogs_update_admin RLS + TanStack mutations (BLOG-07)
- [ ] 12-03-PLAN.md — Regression-lock the Organization "TenantFlow Team" byline for null-author posts (visible + Article JSON-LD) + E2E for non-admin redirect + admin approve flow (BLOG-06, BLOG-07)

### Phase 13: SEO-01 Reclaim Integration
**Goal**: Use the engine to reclaim the deleted high-impression blog slugs, closing the open v4.0 SEO-01 item.
**Depends on**: Phase 12
**Requirements**: BLOG-08
**Success Criteria**:
  1. A topic queue is seeded from the deleted high-impression ghost slugs (top-10 first) in `src/lib/seo/blog-redirects.ts`; drafts generate at the exact original slug.
  2. On publish of a reclaimed slug, its entry is removed from `blog-redirects.ts` and the collision-guard test stays green.
**Plans:** 2 plans
Plans:
- [ ] 13-01-PLAN.md — generator `--slug <ghost-slug>` override (pins + re-gates the draft slug) + seeded top-10 RECLAIM_QUEUE const + its DELETED_BLOG_REDIRECTS drift-guard test (BLOG-08)
- [ ] 13-02-PLAN.md — `scripts/reclaim-finalize.ts <slug>` (remove redirect entry + add slug to LIVE_PUBLISHED_SLUGS) + idempotent/validated edit unit tests keeping the collision guard green (BLOG-08)

### Phase 14: Cadence, Dedupe & Monitoring
**Goal**: The engine runs on a sustainable schedule with dedupe and observability.
**Depends on**: Phase 13
**Requirements**: BLOG-09
**Success Criteria**:
  1. A schedule (e.g., a few posts/week) generates drafts without duplicating existing/published slugs.
  2. Execution monitoring + failure alerts are in place (reuse the critical-error notify path); runaway/cost guards documented.

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 9 — LLM Wiring & Model Selection | Complete | 2 plans (native n8n + Mistral verified) |
| 10 — RAG Knowledge Base | Complete | store live + 10 chunks loaded/verified |
| 11 — Generation Pipeline | Complete | real in-review draft produced e2e (201, MCP-verified); ingest EF fixed |
| 12 — Quality & Brand Guardrails | Complete | judge gate + /admin/blog approve-reject + byline lock + E2E; 30 unit tests |
| 13 — SEO-01 Reclaim Integration | Planned | 2 plans (--slug override + reclaim-queue; reclaim-finalize + guard) |
| 14 — Cadence, Dedupe & Monitoring | Not started | TBD |
