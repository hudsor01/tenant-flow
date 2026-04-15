# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

<details>
<summary>v1.0 Production Hardening -- Phases 1-10 (shipped 2026-03-07)</summary>

- [x] Phase 1: RPC & Database Security (2/2 plans) -- completed 2026-03-04
- [x] Phase 2: Financial Fixes (7/7 plans) -- completed 2026-03-05
- [x] Phase 3: Auth & Middleware (6/6 plans) -- completed 2026-03-05
- [x] Phase 4: Edge Function Hardening (4/4 plans) -- completed 2026-03-05
- [x] Phase 5: Code Quality & Type Safety (10/10 plans) -- completed 2026-03-06
- [x] Phase 6: Database Schema & Migrations (7/7 plans) -- completed 2026-03-06
- [x] Phase 7: UX & Accessibility (6/6 plans) -- completed 2026-03-06
- [x] Phase 8: Performance Optimization (7/7 plans) -- completed 2026-03-06
- [x] Phase 9: Testing & CI Pipeline (9/9 plans) -- completed 2026-03-06
- [x] Phase 10: Audit Cleanup (2/2 plans) -- completed 2026-03-07

[archive](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>v1.1 Blog Redesign & CI -- Phases 11-15 (shipped 2026-03-08)</summary>

- [x] Phase 11: Blog Data Layer (2/2 plans) -- completed 2026-03-07
- [x] Phase 12: Blog Components & CSS (2/2 plans) -- completed 2026-03-07
- [x] Phase 13: Newsletter Backend (1/1 plans) -- completed 2026-03-07
- [x] Phase 14: Blog Pages (2/2 plans) -- completed 2026-03-08
- [x] Phase 15: CI Optimization (1/1 plans) -- completed 2026-03-08

[archive](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>v1.2 Production Polish & Code Consolidation -- Phases 16-20 (shipped 2026-03-11)</summary>

- [x] Phase 16: Shared Cleanup & Dead Code (3/3 plans) -- completed 2026-03-08
- [x] Phase 17: Hooks Consolidation (6/6 plans) -- completed 2026-03-08
- [x] Phase 18: Components Consolidation (6/6 plans) -- completed 2026-03-09
- [x] Phase 19: UI Polish (3/3 plans) -- completed 2026-03-09
- [x] Phase 20: Browser Audit (6/6 plans) -- completed 2026-03-09

[archive](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>v1.3 Stub Elimination -- Phases 21-25 (shipped 2026-03-18)</summary>

- [x] Phase 21: Email Invitations (2/2 plans) -- completed 2026-03-11
- [x] Phase 22: GDPR Data Rights (2/2 plans) -- completed 2026-03-11
- [x] Phase 23: Document Templates (2/2 plans) -- completed 2026-03-11
- [x] Phase 23.1: UI/UX Polish (2/2 plans) -- completed 2026-03-18
- [x] Phase 24: Bulk Property Import (2/2 plans) -- completed 2026-03-18
- [x] Phase 25: Maintenance Photos & Stripe Dashboard (2/2 plans) -- completed 2026-03-18

[archive](milestones/v1.3-ROADMAP.md)

</details>

<details>
<summary>v1.5 Code Quality & Deduplication -- Phases 29-31 (shipped 2026-04-08)</summary>

- [x] Phase 29: Edge Function Shared Utilities (3/3 plans) -- completed 2026-04-03
- [x] Phase 30: Frontend Import & Validation Cleanup (2/2 plans) -- completed 2026-04-03
- [x] Phase 31: Frontend Hook Factories (2/2 plans) -- completed 2026-04-08

</details>

<details>
<summary>v1.6 SEO & Google Indexing Optimization -- Phases 32-40 (shipped 2026-04-13)</summary>

- [x] Phase 32: Crawlability & Critical Fixes (1/1 plans) -- completed 2026-04-08
- [x] Phase 33: SEO Utilities Foundation (2/2 plans) -- completed 2026-04-08
- [x] Phase 34: Per-Page Metadata (2/2 plans) -- completed 2026-04-08
- [x] Phase 35: Structured Data Enrichment (3/3 plans) -- completed 2026-04-09
- [x] Phase 36: Pricing Page Polish (4/4 plans) -- completed 2026-04-10
- [x] Phase 37: Content SEO & Internal Linking (2/2 plans) -- completed 2026-04-10
- [x] Phase 38: Validation & Verification (2/2 plans) -- completed 2026-04-10
- [x] Phase 39: Structured Data Gap Closure (2/2 plans) -- completed 2026-04-13
- [x] Phase 40: Metadata & Verification Completeness (3/3 plans) -- completed 2026-04-13

[archive](milestones/v1.6-ROADMAP.md)

</details>

## Phases

### v1.7 Launch Readiness (Phases 41-44)

- [x] **Phase 41: Payment Correctness & Split-Rent Tests** - Deno integration tests for autopay charge path and payout lifecycle, plus Vitest RLS tests for split-rent allocation (completed 2026-04-13)
- [x] **Phase 42: Cancellation UX End-to-End Audit + Fix** - One-click cancel from settings, real subscription state from `stripe.subscriptions`, inline GDPR export/delete actions (completed 2026-04-14)
- [x] **Phase 43: Post-Deploy Sentry Regression Gate** - GitHub Actions workflow that queries Sentry against the deployed release and fails the deploy on regressions above threshold (completed 2026-04-14)
- [ ] **Phase 44: Deliverability + Funnel Analytics** - Resend webhook ingestion into `email_deliverability`, onboarding funnel event tracking, admin analytics view

## Phase Details

### Phase 41: Payment Correctness & Split-Rent Tests
**Goal**: Autopay charge path, payout lifecycle webhook, and split-rent RLS all have proof-by-test that they do what Stage 1 instrumented and what the marketing promises will claim
**Depends on**: Nothing (first phase of v1.7; builds on Stage 1 code shipped in PR 589, but planning is independent)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09
**Success Criteria** (what must be TRUE):
  1. `supabase/functions/tests/` contains a Deno integration test that charges a due `rent_due` row via `stripe-autopay-charge`, writes a `rent_payments` row with `status = 'succeeded'`, marks `rent_due.status = 'paid'`, and records Stripe payment intent / charge IDs using Stripe test mode (no mocked Stripe client)
  2. A Deno integration test proves a card-decline `payment_intent.payment_failed` response increments `rent_due.autopay_attempts`, sets `rent_due.autopay_last_attempt_at`, schedules `rent_due.autopay_next_retry_at` per the documented 3-attempts-over-7-days schedule, and leaves `rent_due.status` unchanged
  3. A Deno integration test proves the third (final) failed autopay attempt sends the "autopay final attempt failed" notification via the Resend path and does NOT schedule a fourth retry
  4. A Deno integration test proves replaying a Stripe `payment_intent.succeeded` webhook event with the same `event.id` leaves DB state idempotent: no duplicate `rent_payments` rows, `stripe_webhook_events.status` stays `succeeded`, no double-decrement of retry counters
  5. A Deno integration test proves `handlePayoutLifecycle` writes a `payouts` row with correct state on `payout.paid` events (connected account id, amount, arrival date, status `paid`) and that duplicate delivery is idempotent via `stripe_webhook_events`; `duration_hours` is computed from arrival_date - created_at and surfaced to the owner dashboard health RPC
  6. `tests/integration/rls/` contains Vitest RLS tests proving: each tenant on a shared lease sees only their own portion of `rent_due` computed from `lease_tenants.responsibility_percentage`; tenant A cannot read tenant B's `rent_due` / `rent_payments` rows (returns zero rows, not an error); the owner sees the full aggregated view across all tenants on the shared lease
  7. `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors, and all new Deno and Vitest tests are runnable locally and green
**Plans:** 3/3 plans complete
Plans:
- [x] 41-01-PLAN.md -- Autopay correctness Deno tests (TEST-01..TEST-04): success, decline+retry schedule, final-attempt exhaustion, webhook idempotency
- [x] 41-02-PLAN.md -- Payout lifecycle Deno tests (TEST-05, TEST-06): payout.paid end-to-end via signed webhook, idempotent duplicate delivery, duration_hours generated column + get_payout_timing_stats RPC
- [x] 41-03-PLAN.md -- Split-rent Vitest RLS tests (TEST-07, TEST-08, TEST-09): tenant portion via responsibility_percentage, cross-tenant isolation, owner aggregate view

### Phase 42: Cancellation UX End-to-End Audit + Fix
**Goal**: The "1-click cancel" promise is real -- owners can cancel from settings in one click, the UI reflects real subscription state from `stripe.subscriptions`, and the canceled-state UI exposes GDPR export + delete actions inline
**Depends on**: Nothing in this milestone (can execute in parallel with Phase 41)
**Requirements**: CANCEL-01, CANCEL-02, CANCEL-03
**Success Criteria** (what must be TRUE):
  1. An owner on an active paid subscription can cancel from the settings page end-to-end in one click (one confirmation dialog, one mutation) without visiting Stripe customer portal or a separate cancellation page, and the UI reflects the new state after the mutation resolves
  2. Subscription status shown in the UI is computed from `stripe.subscriptions.status` with all documented states (`active`, `past_due`, `canceled`, `unpaid`, `paused`, `trialing`) correctly labelled; dashboard gating and cancel-at-period-end / immediate-cancel / paused states all derive from this source -- no code path checks `users.stripe_customer_id` existence for status
  3. Canceled-state UI exposes "export my data" and "request account deletion" actions inline without additional navigation, and the owner sees the end date + 30-day GDPR deletion grace period messaging
  4. Playwright E2E test covers the happy-path cancel flow from settings click through Stripe `cancel_at_period_end` mutation to UI state change
  5. `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** TBD (likely 2 plans: subscription status wiring + cancel mutation; canceled-state UI + E2E coverage)
**UI hint**: yes

### Phase 43: Post-Deploy Sentry Regression Gate
**Goal**: Production deploys are automatically checked for regressions against a Sentry baseline, and the gate fails the deploy on regressions above configurable thresholds
**Depends on**: Nothing in this milestone (can execute in parallel with Phases 41, 42)
**Requirements**: DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. A GitHub Actions workflow runs after each production deploy (triggered by `deployment_status` event or scheduled post-deploy), queries the Sentry API for the newly-deployed release tag, and captures a baseline snapshot (error count, p95 transactions, new unresolved issue count) persisted to a known artifact location
  2. The workflow fails (and optionally triggers a Vercel rollback or alert) when the release introduces a regression above configured thresholds -- new unresolved issue with > N events, or error rate increase > X% -- within the post-deploy observation window
  3. Regression thresholds (event count, error-rate delta, observation window) are configurable via workflow env vars / repo variables, not hardcoded
  4. Workflow is documented with required secrets (`SENTRY_AUTH_TOKEN`, org/project slugs) and runs green against a known-good release as a smoke test
**Plans:** 1/1 plans complete
Plans:
- [x] 43-01-PLAN.md -- Post-deploy Sentry regression gate workflow (DEPLOY-01, DEPLOY-02): triggers, Sentry API queries, baseline artifact, threshold gate, GitHub issue on regression

### Phase 44: Deliverability + Funnel Analytics
**Goal**: Resend webhook events land in a deliverability table and the onboarding funnel is tracked end-to-end with an admin-only analytics view, so the team sees email and activation problems before marketing copy claims a certain conversion rate
**Depends on**: Nothing in this milestone (can execute in parallel with Phases 41-43)
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05
**Success Criteria** (what must be TRUE):
  1. An Edge Function with Resend signature verification ingests `email.delivered`, `email.bounced`, `email.opened`, `email.complained`, and `email.delivery_delayed` events and writes them to an `email_deliverability` table keyed by Resend message id, with event timestamp, event type, recipient email, and originating template tag
  2. A SECURITY DEFINER RPC with `is_admin()` guard returns per-template deliverability stats (sent / delivered / bounced / complained rate) over a rolling window for admin dashboard consumption
  3. Onboarding funnel steps are recorded server-side on the events that complete them: signup (users row created), first property added, first tenant invited, first rent collected (`rent_payments.status = 'succeeded'`); stored with owner user id, step name, and timestamp; retroactive one-time backfill runs over existing users
  4. A SECURITY DEFINER RPC with `is_admin()` guard returns funnel aggregate stats (count at each step, conversion rate between steps, median time between steps) scoped to a date range
  5. Admin analytics view renders the funnel RPC output as a stepped visualization with conversion percentages and drop-off highlighting
  6. All new RPCs have RLS tests in `tests/integration/rls/` proving non-admin users are rejected and admin users get correct aggregated data
  7. `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** 3 plans (2 complete):
- [x] 44-01-PLAN.md -- Deliverability ingestion (ANALYTICS-01, ANALYTICS-02): email_deliverability table + archive + cleanup cron + resend-webhook Edge Function + get_deliverability_stats RPC + getAdminTestCredentials helper + RLS test (completed 2026-04-15, 6 commits; Task 7 db:types deferred to Wave 0)
- [x] 44-02-PLAN.md -- Funnel event tracking + backfill + funnel RPC (ANALYTICS-03, ANALYTICS-04): onboarding_funnel_events table + 4 trigger fns + 5 triggers + get_funnel_stats RPC + idempotent backfill_funnel_events (D8 union) + RLS test (completed 2026-04-15, 6 commits; Task 7 db:types deferred to Wave 0)
- [ ] 44-03-PLAN.md -- Admin UI wiring (ANALYTICS-05)
**UI hint**: yes

## Progress

**Execution Order:**
v1.7 phases (41-44) can execute in any order -- they are independent and share no code paths. Phase 41 (payment tests) builds on Stage 1 instrumentation already shipped in PR 589; Phase 42 (cancellation UX) touches frontend + subscription read path; Phase 43 (Sentry gate) is CI-only; Phase 44 (analytics) adds new tables, Edge Function, and admin view. All four can run in parallel.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 41. Payment Correctness & Split-Rent Tests | v1.7 | 3/3 | Complete    | 2026-04-13 |
| 42. Cancellation UX End-to-End Audit + Fix | v1.7 | 2/2 | Complete    | 2026-04-14 |
| 43. Post-Deploy Sentry Regression Gate | v1.7 | 1/1 | Complete    | 2026-04-14 |
| 44. Deliverability + Funnel Analytics | v1.7 | 2/3 | In Progress | - |
