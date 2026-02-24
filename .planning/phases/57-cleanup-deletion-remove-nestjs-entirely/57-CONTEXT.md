# Phase 57: Cleanup & Deletion — Remove NestJS Entirely - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Permanently delete the `apps/backend/` NestJS codebase, remove all integration glue (frontend adapter code, CI/CD stages, monorepo config), and offboard Railway services. This is a one-way door — executed only after all prior phases are verified working in production. No new capabilities, no replacement services beyond what is already in place.

</domain>

<decisions>
## Implementation Decisions

### Deletion Sequencing
- Claude decides the safest sequence (user deferred to Claude's discretion)
- Monorepo config cleanup (`pnpm-workspace.yaml`, `turbo.json`) must happen BEFORE deleting `apps/backend/` — avoids build tool errors
- CI/CD GitHub Actions cleanup must happen BEFORE the backend directory is deleted — prevents CI failures on the deletion PR itself
- Railway subscription canceled AFTER merge and production verified (5-minute wait after deployment looks healthy, then cancel)
- Recommended sequence: (1) CI/CD cleanup, (2) config cleanup, (3) frontend remnants cleanup, (4) delete `apps/backend/`, (5) deploy + verify, (6) cancel Railway project/services

### Frontend Remnants
- All `apiRequest`/`apiRequestFormData`/`apiRequestRaw`/`API_BASE_URL` calls are confirmed fully migrated to direct Supabase calls
- Planner MUST run a grep audit for remaining backend references before proceeding with deletion
- If unexpected references are found during audit: auto-migrate them inline, then continue — do not halt
- All backend-specific env vars (`RAILWAY_*`, `API_BASE_URL`, `BACKEND_URL`, etc.) are deleted completely — no historical preservation, no comments
- `apps/frontend/src/lib/api-client.ts` is deleted entirely

### Risk & Verification
- Full CI suite (frontend unit tests + E2E + typecheck + lint) must pass before merging the deletion PR
- After deployment, check Sentry for new errors — no backend-related errors should appear
- Railway cancel window: 5 minutes after deployment + Sentry check confirms clean

### Redis & Background Jobs (CRITICAL BLOCKER)
- Redis is running on Railway as a BullMQ queue backend for the NestJS service
- Queue audit REQUIRED before Railway teardown — planner must read NestJS queue files to inventory all queues/jobs
- If jobs have no replacement: migrate to the most performant solution (Claude's discretion — likely n8n for event-driven, pg_cron for scheduled, or drop if obsolete)
- Railway Redis service must NOT be canceled until queue migration is confirmed complete
- This audit/migration must be scoped as a prerequisite step within the phase plan

### Railway Offboarding
- Delete Railway project and services only — keep the Railway account (do not delete the account)
- Planner should audit `.github/workflows/` to identify which GitHub Actions secrets (e.g. `RAILWAY_TOKEN`) exist and document them for manual removal from GitHub repo settings
- Railway env vars / configs: Claude decides whether to export before deletion (lean toward quick export of env var names as audit trail in the phase summary doc)

### Claude's Discretion
- Optimal deletion sequencing order within the constraints above
- Whether to use one PR or staged PRs
- Where to migrate BullMQ queues (n8n, pg_cron, or drop — choose most performant after audit)
- Whether to export Railway env var names before teardown

</decisions>

<specifics>
## Specific Ideas

- Railway cancel window is intentionally short: 5 minutes post-deploy + Sentry green = cancel immediately
- Queue migration destination: Claude should analyze the queues found and place them where they'll perform best — n8n for complex workflows, pg_cron for simple scheduled tasks, drop if unused

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 57-cleanup-deletion-remove-nestjs-entirely*
*Context gathered: 2026-02-22*
