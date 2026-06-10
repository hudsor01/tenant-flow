---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: AI Blog Content Engine
status: "v5.0 COMPLETE — all 6 phases (9-14) built. Phases 9-13 MERGED (PR #792, #796, #797 → main); Phase 14 built on gsd/phase-14-cadence-dedupe-monitoring, ready for PR."
last_updated: "2026-06-10T03:30:00.000Z"
last_activity: 2026-06-10 -- Phase 14 executed (slug dedup + BLOG-GEN-FAIL + EVERGREEN_TOPICS + n8n docs)
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v5.0):** A local-LLM (LM Studio on the M5) + RAG n8n pipeline that drafts brand-positive, fact-grounded, E-E-A-T-credible blog posts into `n8n-blog-ingest` as `in-review` drafts for human approval — and uses it to execute the SEO-01 reclaim. Quality bar: genuinely helpful landlord content featuring TenantFlow naturally, never penalized AI spam.
**Current focus:** v5.0 COMPLETE — all 6 phases (9-14) built. Phases 9-13 merged (#792, #796, #797). Phase 14 on gsd/phase-14-cadence-dedupe-monitoring, ready for PR. Next: merge Phase 14 → `/gsd-complete-milestone v5.0`.

## Current Position

Phase: 14 of 14 COMPLETE — v5.0 (100%, all BLOG-01..09 done)
Plan: 09-14 complete. Phase 14 (branch gsd/phase-14-cadence-dedupe-monitoring): 14-01 = pre-POST `blogSlugExists` dedup (existing slug → clean skip exit 0, no 409 waste; probe-closure decoupled from the deep SupabaseClient type) + greppable `BLOG-GEN-FAIL: <reason>` output via exported `formatGenFailure`. 14-02 = `EVERGREEN_TOPICS` secondary topic source (drift-guarded) + n8n/README.md refined cadence (few/week, reclaim-then-evergreen) + Error-Trigger notify wiring (`app_config` key `n8n.webhook.blog_factory_alert_url`) + runaway/cost guards.
Status: Phases 9-13 MERGED → main. Phase 14 built on its branch, ready for PR + review. The full engine: local-LLM RAG → judge-gated draft → in-review → /admin/blog approve → published → SEO reclaim → self-scheduled with dedup + alerts.
Last activity: 2026-06-10 -- Phase 14 executed (slug dedup + BLOG-GEN-FAIL + EVERGREEN_TOPICS + n8n docs)

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

None. (BLOG-03 corpus loaded: 10 chunks, all dim-1024, verified. The indexer uses `SUPABASE_SECRET_KEY` — the new Supabase API key model; the legacy `SUPABASE_SERVICE_ROLE_KEY` is empty in .env.local. Owner runs the indexer since the agent's shell scrubs admin creds.)

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, PRs #783-791, 20/21 requirements; perfect-PR gated). SEO-01 content-reclaim was content-dependent (needs the blog pipeline) and is carried into v5.0 as BLOG-08.
- 2026-06-07: v5.0 "AI Blog Content Engine" roadmap created (6 phases 9-14, 9 requirements BLOG-01..09). Built on the new laptop n8n bridge created the same day. Local LLM via LM Studio; RAG via pgvector + qwen3 embeddings/reranker; human-approval gate via the existing `in-review` status.
- 2026-06-09: Phase 11 complete — first real draft generated e2e. Ingest debugging surfaced 4 stacked issues: the EF's auto-injected legacy `SUPABASE_SERVICE_ROLE_KEY` was dead (new-API-key migration) → migrated EF to `INGEST_DB_KEY`; `N8N_WEBHOOK_SECRET` was never set as an EF secret (only `N8N_WEBHOOK_URL` existed); local router DNS died (→1.1.1.1); `safe-chain` shim intermittently breaks bun's network (use `~/.bun/bin/bun`). Generation needed a banlist sanitizer (model slips "paid rent" in screening content) + higher word target. Supabase project is Free-tier past grace — watch quota.

## Next Action

**Phase 11 complete — engine + ingest proven end-to-end (real in-review draft).** Plan the next phase:

```
/gsd-plan-phase 12
```

Phase 12 = Quality & Brand Guardrails (BLOG-06/07): brand-voice/E-E-A-T enforcement + a self-critique/reranker gate + a human approve/reject surface (nothing publishes without the owner). In parallel (owner): review the first draft (`/blog` admin or the `blogs` table) — if good, publish; if not, note what to tune.

## Overrides

(none active)

---
*Last updated: 2026-06-07 — v4.0 archived, v5.0 AI Blog Content Engine roadmap created. Integer phase numbers continue across milestones (9-14). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
