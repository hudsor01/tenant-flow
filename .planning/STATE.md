---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: AI Blog Content Engine
status: planning
last_updated: "2026-06-07T22:10:00.000Z"
last_activity: 2026-06-07
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v5.0):** A local-LLM (LM Studio on the M5) + RAG n8n pipeline that drafts brand-positive, fact-grounded, E-E-A-T-credible blog posts into `n8n-blog-ingest` as `in-review` drafts for human approval — and uses it to execute the SEO-01 reclaim. Quality bar: genuinely helpful landlord content featuring TenantFlow naturally, never penalized AI spam.
**Current focus:** Plan Phase 9 (LLM Wiring & Model Selection) — `/gsd-plan-phase 9`.

## Current Position

Phase: 9 of 14 (LLM Wiring & Model Selection) — v5.0 (first v5.0 phase; numbering continues from v4.0)
Plan: not yet planned
Status: Ready to plan
Last activity: 2026-06-07

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

- **BLOG-02 (owner action):** pull a general-instruct model into LM Studio (recommend `Qwen3-30B-A3B` general-instruct) — only the coder-instruct is installed.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, PRs #783-791, 20/21 requirements; perfect-PR gated). SEO-01 content-reclaim was content-dependent (needs the blog pipeline) and is carried into v5.0 as BLOG-08.
- 2026-06-07: v5.0 "AI Blog Content Engine" roadmap created (6 phases 9-14, 9 requirements BLOG-01..09). Built on the new laptop n8n bridge (Docker/colima on the M5 + `tenantflow-n8n` Cloudflare tunnel) created the same day. Local LLM via LM Studio; RAG via pgvector + qwen3 embeddings/reranker; human-approval gate via the existing `in-review` status.

## Next Action

**v4.0 archived; v5.0 roadmap live.** Plan the first phase:

```
/gsd-plan-phase 9
```

In parallel (owner): pull `Qwen3-30B-A3B` general-instruct into LM Studio (BLOG-02).

## Overrides

(none active)

---
*Last updated: 2026-06-07 — v4.0 archived, v5.0 AI Blog Content Engine roadmap created. Integer phase numbers continue across milestones (9-14). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
