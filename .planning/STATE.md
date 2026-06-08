---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: AI Blog Content Engine
status: executing
last_updated: "2026-06-08T01:15:00.000Z"
last_activity: 2026-06-07
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v5.0):** A local-LLM (LM Studio on the M5) + RAG n8n pipeline that drafts brand-positive, fact-grounded, E-E-A-T-credible blog posts into `n8n-blog-ingest` as `in-review` drafts for human approval — and uses it to execute the SEO-01 reclaim. Quality bar: genuinely helpful landlord content featuring TenantFlow naturally, never penalized AI spam.
**Current focus:** Phase 10 CODE-COMPLETE — pgvector store live in prod + indexer/smoke-test written. One owner step (run the indexer) fully closes BLOG-03, then Phase 11.

## Current Position

Phase: 10 of 14 CODE-COMPLETE (corpus-load = owner step) → next is Phase 11 (Generation Pipeline) — v5.0
Plan: 09 done; 10-01 (pgvector store) applied+verified in prod, 10-02 (indexer+smoke test) written (see 10-SUMMARY.md)
Status: store live; corpus-load pending owner run of the indexer; then Phase 11
Last activity: 2026-06-08

**Runtime fact:** n8n runs NATIVELY (node@22, `bash n8n/start-native.sh`, reuses n8n/data) — NOT Docker. colima's network blocks container→host, so Docker/colima were abandoned + stopped. LLM base URL `http://localhost:1234/v1`, model `mistral-small-3.2-24b-instruct-2506-mlx`.

## Roadmap Summary (v5.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 9. LLM Wiring & Model Selection | n8n→LM Studio reachable; general-instruct model + embeddings/reranker smoke-tested | BLOG-01, BLOG-02 |
| 10. RAG Knowledge Base | TenantFlow fact corpus → embeddings → pgvector retrieval | BLOG-03 |
| 11. Generation Pipeline | topic→retrieve→draft→validate→HMAC→ingest→in-review | BLOG-04, BLOG-05 |
| 12. Quality & Brand Guardrails | brand voice, E-E-A-T, self-critique/reranker gate, human approval | BLOG-06, BLOG-07 |
| 13. SEO-01 Reclaim Integration | ghost-slug queue, generate-at-slug, auto-drop redirect on publish | BLOG-08 |
| 14. Cadence, Dedupe & Monitoring | schedule, dedupe, observability + alerts | BLOG-09 |

## Blockers

- **BLOG-03 corpus-load (owner step):** the agent's shell has prod DB/service-role creds scrubbed (deliberate boundary), so the corpus load runs with the owner's creds: `bun scripts/rag-index-blog-corpus.ts` (native n8n/LM Studio up) → loads 10 chunks. Phase 11 retrieval depends on this. The embed half is already verified (10 chunks embedded via LM Studio); only the DB write needs the owner.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, PRs #783-791, 20/21 requirements; perfect-PR gated). SEO-01 content-reclaim was content-dependent (needs the blog pipeline) and is carried into v5.0 as BLOG-08.
- 2026-06-07: v5.0 "AI Blog Content Engine" roadmap created (6 phases 9-14, 9 requirements BLOG-01..09). Built on the new laptop n8n bridge (Docker/colima on the M5 + `tenantflow-n8n` Cloudflare tunnel) created the same day. Local LLM via LM Studio; RAG via pgvector + qwen3 embeddings/reranker; human-approval gate via the existing `in-review` status.

## Next Action

**Phase 10 code-complete.** Owner step to fully close BLOG-03 (~10s):

```
bun scripts/rag-index-blog-corpus.ts      # loads 10 corpus chunks into pgvector
```

Then plan Phase 11 (Generation Pipeline, BLOG-04/05) — `/gsd-plan-phase 11`. Phase 11's n8n workflow retrieves from `match_blog_rag_chunks`, so it needs the corpus loaded first.

## Overrides

(none active)

---
*Last updated: 2026-06-07 — v4.0 archived, v5.0 AI Blog Content Engine roadmap created. Integer phase numbers continue across milestones (9-14). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
