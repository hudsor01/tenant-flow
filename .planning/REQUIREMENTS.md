# Requirements: TenantFlow v1.7 — Launch Readiness

**Defined:** 2026-04-13
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.
**Milestone goal:** Prove the four product promises TenantFlow will put on its launch marketing pages -- **2-day payouts**, **honest autopay**, **1-click cancel**, **20-door focus** -- with tests, audits, and monitoring, so the messaging matches reality BEFORE it ships.

**Stage 1 prerequisite (shipped in PR 589, not a v1.7 requirement):** payout timing instrumentation, autopay success/decline notifications, and autopay health dashboard widget. Stage 1 produces the instrumented baseline that Stages 2-5 verify.

## v1.7 Requirements

### Autopay Correctness Tests (Stage 2 / Phase 41)

- [x] **TEST-01**: Deno integration test proves `stripe-autopay-charge` charges the default payment method on a due `rent_due` row, writes a `rent_payments` row with status `succeeded`, marks `rent_due.status = 'paid'`, and records Stripe payment intent / charge IDs -- using Stripe test mode (no mocked Stripe client).
- [x] **TEST-02**: Deno integration test proves a card-decline `payment_intent.payment_failed` response increments `rent_due.autopay_attempts`, sets `rent_due.autopay_last_attempt_at`, schedules `rent_due.autopay_next_retry_at` according to the documented retry schedule (3 attempts over 7 days), and leaves `rent_due.status` unchanged -- verifying retry scheduling matches what `process-autopay-charges` cron reads.
- [x] **TEST-03**: Deno integration test proves the third (final) failed autopay attempt sends the "autopay final attempt failed" notification via the Resend path and does NOT schedule a fourth retry (no `autopay_next_retry_at` write) -- verifies the autopay exhaustion UX promised by Stage 1 notifications.
- [x] **TEST-04**: Deno integration test proves replaying a Stripe `payment_intent.succeeded` webhook event with the same `event.id` leaves DB state idempotent: no duplicate `rent_payments` rows, `stripe_webhook_events.status` stays `succeeded`, no double-decrement of retry counters.

### Payout Lifecycle Tests (Stage 2 / Phase 41)

- [x] **TEST-05**: Deno integration test proves `handlePayoutLifecycle` writes a `payouts` row with correct state on `payout.paid` events (connected account id, amount, arrival date, status `paid`) and that duplicate delivery is idempotent via `stripe_webhook_events`.
- [x] **TEST-06**: Deno integration test proves `handlePayoutLifecycle` computes `duration_hours` (arrival_date - created_at) on `payout.paid`, records it to the payouts table, and surfaces it to the owner dashboard health RPC so the "2-day payouts" promise has a measurable signal.

### Split-Rent RLS Tests (Stage 2 / Phase 41)

- [ ] **TEST-07**: Vitest RLS integration test proves each tenant on a shared lease sees only their own portion of `rent_due` (computed from `lease_tenants.responsibility_percentage`), not the full lease amount, via the tenant portal query path.
- [ ] **TEST-08**: Vitest RLS integration test proves tenant A on a shared lease cannot read tenant B's `rent_due` / `rent_payments` rows -- cross-tenant reads return zero rows, not an authorization error.
- [ ] **TEST-09**: Vitest RLS integration test proves the owner of a shared-lease property sees the full aggregated rent_due / rent_payments across all tenants on that lease (owner aggregate view is unaffected by tenant-scoped RLS).

### Cancellation UX (Stage 3 / Phase 42)

- [ ] **CANCEL-01**: An owner on an active paid subscription can cancel from the settings page in one click (one confirmation dialog, one mutation) without contacting support, without logging into Stripe customer portal, and without visiting a separate cancellation page.
- [ ] **CANCEL-02**: Subscription status shown to the owner is derived from `stripe.subscriptions` (states `active`, `past_due`, `canceled`, `unpaid`, `paused`, `trialing`) -- NOT from `users.stripe_customer_id` existence. Cancel-at-period-end, immediate cancel, and paused states are all correctly labelled in the UI and reflected in dashboard gating.
- [ ] **CANCEL-03**: Cancellation triggers the documented data retention path: subscription ends at period end by default, owner is shown the end date, data is preserved until the GDPR 30-day deletion grace period expires, and the canceled-state UI exposes the "export my data" and "request account deletion" actions without additional navigation.

### Post-Deploy Sentry Regression Gate (Stage 4 / Phase 43)

- [ ] **DEPLOY-01**: A GitHub Action runs after each production deploy to Vercel, queries the Sentry API for a rolling window of error and performance metrics against the newly-deployed release tag, and persists a baseline snapshot (error count, slow transactions above p95 threshold, new issue count) to a known location for diff purposes.
- [ ] **DEPLOY-02**: The same action fails the deploy gate (marks the workflow as failed and optionally triggers a Vercel rollback or alert) when the new release introduces a regression above configured thresholds (new unresolved issue with > N events, or error rate increase > X%) within the post-deploy observation window.

### Deliverability Analytics (Stage 5 / Phase 44)

- [ ] **ANALYTICS-01**: Resend webhook events (`email.delivered`, `email.bounced`, `email.opened`, `email.complained`, `email.delivery_delayed`) are ingested via an Edge Function with signature verification and stored in an `email_deliverability` table keyed by Resend message id, with event timestamp, event type, recipient email, and originating template tag.
- [ ] **ANALYTICS-02**: Admin dashboard surfaces per-template deliverability stats (sent / delivered / bounced / complained rate) over a rolling window via a SECURITY DEFINER RPC with `is_admin()` guard, so the team can spot receipt / invitation / autopay-failure email problems before users do.

### Funnel Analytics (Stage 5 / Phase 44)

- [ ] **ANALYTICS-03**: Key onboarding funnel steps are tracked server-side on the events that actually complete them: signup (users row created), first property added, first tenant invited, first rent collected (first `rent_payments.status = 'succeeded'` for the owner). Events are stored with owner user id, step name, and timestamp; retroactive backfill runs once over existing users.
- [ ] **ANALYTICS-04**: A SECURITY DEFINER RPC returns aggregate funnel stats (count at each step, conversion rate between steps, median time between steps) scoped to a date range, with `is_admin()` guard.
- [ ] **ANALYTICS-05**: Admin analytics view renders the funnel RPC output as a stepped visualization with conversion percentages and drop-off highlighting, so the team can see where 20-door-focused owners stall before their first collected rent.

## Out of Scope (explicit)

- Marketing landing page copy, launch announcements, press / social content -- intentionally deferred until Stages 2-5 verify the promises being made.
- New product features not tied to the four promises (no new reports, no new maintenance workflows, no new tenant portal features).
- Tenant-side analytics -- v1.7 funnel tracking is owner onboarding only.
- SMS / Twilio deliverability -- email only.
- Third-party funnel analytics vendors (PostHog, Amplitude, Mixpanel) -- first-class Supabase tables only.
- Rewriting existing Stripe webhook handlers -- tests verify current behavior, they do not refactor it.

## Requirement Coverage Map (preview)

| REQ-ID range | Stage | Phase | Artifact type |
|--------------|-------|-------|---------------|
| TEST-01..04 | Stage 2 | Phase 41 | Deno integration tests (supabase/functions/tests/) |
| TEST-05..06 | Stage 2 | Phase 41 | Deno integration tests (supabase/functions/tests/) |
| TEST-07..09 | Stage 2 | Phase 41 | Vitest RLS integration tests (tests/integration/rls/) |
| CANCEL-01..03 | Stage 3 | Phase 42 | Frontend flow fix + Edge Function / PostgREST read path |
| DEPLOY-01..02 | Stage 4 | Phase 43 | GitHub Actions workflow + Sentry API integration |
| ANALYTICS-01..02 | Stage 5 | Phase 44 | Edge Function + DB table + admin RPC + admin UI |
| ANALYTICS-03..05 | Stage 5 | Phase 44 | Event tracking + DB table + RPC + admin UI |

Total: 9 TEST + 3 CANCEL + 2 DEPLOY + 5 ANALYTICS = **19 requirements** across 4 phases.
