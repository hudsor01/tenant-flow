---
phase: 44
phase_name: Deliverability + Funnel Analytics
decisions_version: 1.0
decided_by: claude + codebase verification
decided_at: 2026-04-15
---

# Phase 44 Decisions

Resolves the 8 gray-area decisions surfaced in `44-RESEARCH.md`. Planner should treat these as authoritative; deviations require a new decisions entry.

All 8 recommendations from the researcher were accepted as-is — each had a clear primary path with strong codebase precedent. Rationale captured below for each.

---

## D1. `email_deliverability` retention → 90 days, archive-then-delete

- **Decision:** 90-day retention with `email_deliverability_archive` sibling table. Cleanup cron at `0 4 * * *` (avoids the crowded 3 AM slot). Archive-then-delete pattern mirroring `security_events` / `user_errors` / succeeded `stripe_webhook_events`.
- **Rationale:** Matches the project's existing 90-day data-retention standard (CLAUDE.md Data Retention section). Deliverability data is primarily for near-term operational monitoring (bounce rate spikes, template-specific delivery issues). Anti-abuse domain-reputation analysis would want 180+ days, but that's a v1.8+ concern — revisit when the team actually builds the anti-abuse workflow.
- **Out of scope:** Longer retention for compliance. Deliverability events contain recipient emails but no sensitive content — standard 90 days is compliant.

## D2. `get_funnel_stats` cohort semantics → signup cohort

- **Decision:** "For owners who signed up in `[p_from, p_to]`, here's how their funnel progressed to present day." Cohort is anchored on the signup event; subsequent steps are tracked regardless of when they occurred.
- **Rationale:** Signup cohort answers the marketing question — "of the 100 owners who signed up in March, how many got to first rent collected?" Event-window cohort ("of all activation events in March") would conflate March signups with March first-rent events from owners who signed up earlier, which is not what the team needs to tune onboarding copy.
- **UI implication:** Admin page header reads "Cohort: owners who signed up between `<from>` and `<to>`". Prevents misinterpretation.

## D3. Rolling window default → 30 days, `p_days` param 1..365

- **Decision:** `get_deliverability_stats(p_days int default 30)` with `CHECK (p_days BETWEEN 1 AND 365)`. No UI picker for v1.
- **Rationale:** Matches `get_payout_timing_stats` (migrations `20260413120000_launch_readiness_instrumentation.sql:61-91`). 30 days is the operational-monitoring sweet spot — long enough to smooth weekly send patterns, short enough to reflect current infra health. Date picker can follow once admin behavior justifies it (v1.8 follow-up).
- **Out of scope:** URL-level date-range picker on `/admin/analytics`.

## D4. Resend event timestamp → top-level `created_at`, full raw in jsonb

- **Decision:** Store `event_at timestamptz` from `payload.created_at` (top-level). Also store entire `payload.data` in `raw_payload jsonb` so nested event-specific timestamps (`bounce.timestamp`, `click.timestamp`, etc.) remain queryable if needed later.
- **Rationale:** Top-level `created_at` is always present and documents when Resend observed the event. Nested timestamps are inconsistent across event types and sometimes missing. Storing the raw payload avoids future schema migrations if we need deeper fields.
- **Column comment:** `'Top-level Resend created_at; see raw_payload for event-specific timestamps'`.

## D5. Admin UI URL → `/admin/analytics` in `(admin)` route group

- **Decision:** New `src/app/(admin)/` route group. First page: `src/app/(admin)/admin/analytics/page.tsx` resolving to `/admin/analytics`. Route-group-level `layout.tsx` enforces `is_admin()` via server component; `proxy.ts` also enforces `/admin/*` admin-only redirect (belt + suspenders).
- **Rationale:** Clean separation between owner-dashboard (`/dashboard/*`) and platform-admin (`/admin/*`). Admin users still navigate to `/dashboard` for their owner-facing operations — these are distinct surfaces. Route group prevents URL from leaking the access level.
- **Out of scope:** Full admin dashboard nav rework. Phase 44 ships a single `/admin/analytics` page.

## D6. Admin RLS test credentials → `getAdminTestCredentials()` with `describe.skipIf`

- **Decision:** Add `getAdminTestCredentials()` helper in `tests/integration/setup/supabase-client.ts` that returns null if `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` env vars missing. RLS tests for the two new admin RPCs use `describe.skipIf(!adminCreds, 'Admin creds missing')` — same pattern as existing `getTenantTestCredentials()`.
- **Wave 0 requirement:** Operator provisions an admin test user in the test Supabase project and sets `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` in CI secrets (if/when these tests run in CI). Locally, the same env vars in `.env.test` unlock the tests.
- **Rationale:** Tests must never become silent false-positives — skipping on missing creds is the project's established pattern. Requiring an admin user in CI is heavier than owner/tenant provisioning but necessary to prove the `is_admin()` guard actually lets admins through.

## D7. Email tag priority → `category` first, fall back to `type`

- **Decision:** `get_deliverability_stats` extracts `template_tag` via: prefer tag with `name = 'category'`, fall back to `name = 'type'` if missing. Stored in an indexed generated column on `email_deliverability` for aggregation performance.
- **Rationale:** `category` is the higher-level classification (e.g., `'auth'` groups signup + recovery + magic_link). Admins care more about "is our auth email path broken?" than "is the signup-specific variant broken?" at the top-level dashboard. Per-type drill-down can come later. Falling back to `type` handles legacy sends that may not carry `category` yet.
- **Documented in RPC + column comments.**

## D8. `first_tenant_invited` backfill → union of `tenants` + `tenant_invitations`

- **Decision:** Backfill walks both `tenants` (direct creation, pre-v1.3 flow) and `tenant_invitations` (v1.3+ invitation flow). Each owner's `first_tenant_invited` event uses `MIN(created_at)` across the two sources, deduplicated by `owner_user_id`.
- **Rationale:** Funnel analytics is retrospective. A March 2025 owner who added a tenant via the old direct flow completed the intent of "first tenant" just as meaningfully as a modern owner using invitations. Excluding them would undercount activation.
- **Forward-going behavior:** Trigger fires only on `tenant_invitations` INSERT (modern flow is authoritative). Legacy direct-tenant inserts are already covered by backfill and expected to be rare going forward.
- **Idempotency:** Backfill uses `ON CONFLICT DO NOTHING` against a composite unique index `(owner_user_id, step_name)` so re-running the migration (or the backfill function) never double-inserts.

---

## Summary for Planner

Planner should produce THREE plan files per the ROADMAP preview:

1. **`44-01-PLAN.md` — Deliverability ingestion + table + admin RPC**
   - Migration 1: `email_deliverability` table + archive table + RLS policies + 90-day cleanup cron + `get_deliverability_stats` RPC
   - Edge Function: `resend-webhook` with Svix signature verification (template: `docuseal-webhook/index.ts:220-277`)
   - Wave 0: `RESEND_WEBHOOK_SECRET` in Supabase secrets, configure Resend webhook to point at the new function
   - RLS integration test proving non-admin rejection, admin gets stats
   - `stopped_at` verification: live webhook payload lands in table; admin RPC returns non-empty for a seeded admin

2. **`44-02-PLAN.md` — Funnel event tracking + backfill + funnel RPC**
   - Migration 2: `onboarding_funnel_events` table + indexes + 4 trigger functions + 5 triggers (signup, property, invitation, rent_payments INSERT + UPDATE)
   - Migration 3: `get_funnel_stats(p_from, p_to)` RPC with signup-cohort semantics + backfill function + one-time backfill call
   - Step-name CHECK constraint: `'signup'|'first_property'|'first_tenant'|'first_rent'` (no PostgreSQL ENUM per project rules)
   - RLS integration test proving non-admin rejection, admin gets aggregate data with correct conversion %
   - Pitfall 3 (rent_payments deadlock) mitigation: trigger uses `pg_try_advisory_xact_lock` or is written as AFTER UPDATE with minimal locking

3. **`44-03-PLAN.md` — Admin route group + UI + charts + E2E**
   - New `src/app/(admin)/` route group with `layout.tsx` admin gate
   - New page: `src/app/(admin)/admin/analytics/page.tsx` — funnel chart + deliverability table
   - Proxy middleware: add `/admin/*` protection (belt + suspenders with layout gate)
   - New hooks: `use-deliverability-stats.ts`, `use-funnel-stats.ts` in `src/hooks/api/` with query-key factories
   - Recharts `FunnelChart` for funnel visualization; table for per-template deliverability
   - Playwright E2E: admin loads page, sees data; non-admin redirected

**Wave 0 operator actions (recorded in Plan 1 SUMMARY.md, not in code):**
- Provision admin test user + set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env vars
- Set `RESEND_WEBHOOK_SECRET` in Supabase Edge Function secrets
- Configure Resend webhook endpoint in Resend dashboard
