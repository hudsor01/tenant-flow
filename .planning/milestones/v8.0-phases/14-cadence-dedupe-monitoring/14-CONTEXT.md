# Phase 14: Cadence, Dedupe & Monitoring - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Source:** Grounded the n8n schedule design (already in n8n/README.md), the existing notify_critical_error/app_config infra, and the generator's (absent) dedup.

<domain>
## Phase Boundary
Make the (complete) engine run on a SUSTAINABLE cadence without producing duplicate slugs, with failure visibility + cost/runaway guards. The FINAL phase of v5.0 — it wraps the engine for unattended operation; it does not add new generation capability. The n8n Schedule Trigger + Error-workflow are owner n8n config (documented); the code parts are the dedup pre-check, a topic source, and structured failure output. No new model, no new content surface.
</domain>

<decisions>
## Implementation Decisions (LOCKED — grounded)

### BLOG-09a — dedupe (no duplicate slugs)
- The generator currently has NO slug dedup; only the ingest EF backstops with a 409 `slug_collision` (blogs.slug UNIQUE → 23505). A scheduled run would burn a full generation (minutes on the local 24B) then 409.
- Add a pre-POST existence check in `scripts/generate-blog-draft.ts`: after the draft + judge pass and BEFORE the HMAC POST, query `public.blogs` for `draft.slug` (any status — `draft|in-review|published|archived`) via the existing service client. If it exists, SKIP cleanly (log "slug already exists — skipping" + exit 0, NOT a failure) rather than POST→409. Works for both the reclaim path (`--slug` fixed slug) and evergreen topics (model-chosen slug). The 409 stays as the defense-in-depth backstop.

### BLOG-09b — monitoring + failure alerts (reuse the notify path)
- The notify infra already exists: `public.notify_critical_error()` + `notify_n8n_*` trigger functions read webhook URLs + the bearer secret from `public.app_config` and `net.http_post` to an n8n webhook → Resend email (migrations 20260504045301, 20260504162155, 20260504232614).
- The generator already exits non-zero + logs on failure (`fail()`), and the n8n workflow runs it via Execute Command, so a failed run already surfaces in n8n. Phase 14 adds: (1) structured, greppable failure output from the generator (a clear `BLOG-GEN-FAIL: <reason>` line + non-zero exit) so the cause is visible in n8n run logs; (2) DOCUMENT the n8n **Error Trigger** workflow that, on any failed blog-factory run, POSTs to the critical-error notify path (a new `app_config` key, e.g. `n8n.webhook.blog_factory_alert_url`, or the existing alert path) → Resend email. The webhook/secret wiring reuses the documented `app_config` pattern; no new secret in source.

### BLOG-09c — cadence + runaway/cost guards
- Cadence is owner n8n config: the `n8n/README.md` blog-factory design is a Schedule Trigger → generate → ingest → Vercel deploy hook. REFINE the documented cadence from "hourly" to a SUSTAINABLE "a few posts/week" (the human in-review gate + the local-LLM minutes-per-post make hourly wasteful). The schedule draws from a TOPIC SOURCE: the Phase-13 `RECLAIM_QUEUE` first (highest SEO value), then an evergreen topic list (a small committed const, e.g. `src/lib/seo/evergreen-topics.ts`, of {topic, category} landlord topics) — the dedup check (09a) ensures a slug isn't regenerated.
- Runaway/cost guards (code + docs): the generator produces ONE post per invocation (the schedule controls volume — no unbounded loop); the judge `MAX_CRITIQUE` + the 4-attempt gate loop already bound per-post LLM calls; the in-review status is the human backstop (nothing auto-publishes). DOCUMENT the guard rails in `n8n/README.md`: max posts/week, the per-post attempt bound, the in-review gate, and that the local LLM is free (the only cost is n8n run-time + the human review queue not flooding).

### Verification
- Dedup: with an existing slug, the generator SKIPS (exit 0, no POST, no 409) — unit-tested with a mocked blogs query (existing → skip; absent → proceed to POST path).
- The evergreen-topics const (if added) is well-formed (valid categories) — unit-tested.
- Monitoring + cadence + cost guards are documented in `n8n/README.md` (the n8n Schedule + Error-workflow are owner config, not CI-testable); the structured `BLOG-GEN-FAIL` output is unit-asserted.
</decisions>

<constraints>
- TRACKED code (the generator dedup + any evergreen const + tests) → perfect-PR + CI green (typecheck/lint/build/E2E/rls). No `any`, no `as unknown as`, kebab files, typed boundaries, chai-6-safe tests. The n8n schedule + error-workflow + app_config keys are OWNER config (the agent documents + provides the code hooks; the owner wires n8n + sets app_config via the dashboard — never the agent, creds scrubbed).
- The dedup must not WEAKEN correctness: a true collision still 409s at the EF (defense-in-depth); the pre-check is an optimization + clean-skip, not the sole guard.
- Never auto-publish (the in-review gate stays); the cadence produces in-review drafts only.
- No new secret in source — reuse the `app_config` key/value pattern for any new webhook URL.

<threat_model_seed>
- The dedup blobs query uses the service client (RLS-bypass) — read-only SELECT on slug; never widen to a write. No secret added.
- The failure-alert webhook URL lives in app_config (service-role-only), not source; the n8n error-workflow verifies the bearer secret (existing pattern).
- The cadence guard (one post/invocation + bounded attempts + in-review gate) prevents a runaway loop from flooding the queue or the LLM.
</threat_model_seed>
</constraints>

<canonical_refs>
- `scripts/generate-blog-draft.ts` (add the pre-POST dedup check; structured failure output) + its `.test.ts`.
- `src/lib/seo/reclaim-queue.ts` (Phase-13 topic source) + any new `evergreen-topics.ts`.
- `supabase/migrations/20260504045301_notify_critical_error_http_delivery.sql`, `20260504162155_app_config_table_for_n8n_webhooks.sql`, `20260504232614_*` (the notify_critical_error / notify_n8n_* + app_config infra to reuse).
- `n8n/README.md` (the blog-factory schedule design + the app_config webhook wiring — document the refined cadence + cost guards + error-workflow here).
- The v5-blog-engine-local-llm memory (runtime facts).
</canonical_refs>

<deferred>
- Building the actual n8n Schedule + Error-workflow nodes — owner config (documented).
- Generating the reclaim/evergreen posts on the schedule — owner content-work.
- Analytics on reclaimed-ranking recovery (GSC) — out of scope (a later measurement task).
</deferred>

---
*Phase: 14-cadence-dedupe-monitoring — the FINAL v5.0 phase. A pre-POST slug-dedup check in the generator (clean-skip, not 409-waste), structured failure output + a documented n8n Error-workflow reusing the notify_critical_error/app_config path, and a refined sustainable cadence (a few posts/week from the reclaim queue + evergreen topics) with documented runaway/cost guards. Closes BLOG-09 and completes v5.0.*
