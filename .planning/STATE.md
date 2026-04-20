---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Landlord-First Positioning
status: active
stopped_at: v2.2 scoped 2026-04-20 — 3 phases (dashboard copy rename, public-site value-prop reframe, dashboard UX polish). v2.1 Production Integrity shipped 2026-04-19/20. v2.0 Phase 46 (premium reports gate) still paused.
last_updated: "2026-04-20T00:00:00.000Z"
last_activity: 2026-04-20
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State: TenantFlow

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** A landlord can add a property, record tenants and leases, track maintenance, and run financial reports — without touching a spreadsheet or calling anyone.
**Product scope:** Landlord-only SaaS. No rent payment facilitation (removed 2026-04-18, PR #596). No tenant portal or tenant auth accounts. Tenants are records, not users.
**Current focus:** v2.2 Landlord-First Positioning — rewrite dashboard copy (Phase 52), reframe public-site value prop (Phase 53), polish dashboard UX (Phase 54). Copy debt is blocking marketing: UI still says "invite tenant" for what are now landlord-managed records.

## Current Position

Phase: 52 (pending — dashboard copy + component rename)
Plan: -- (phase not yet started)
Milestone: v2.2 Landlord-First Positioning — active. See `milestones/v2.2-ROADMAP.md` for scope.
Status: v2.1 shipped 2026-04-19/20 (prod integrity restored, trial model live). Next: rename invite-tenant-* → add-tenant-*, empty-state rewrites, trial banner component.
Last activity: 2026-04-20

## Shipped Milestones

| Version | Name | Phases | Plans | Shipped |
|---------|------|--------|-------|---------|
| v1.0 | Production Hardening | 10 | 60 | 2026-03-07 |
| v1.1 | Blog Redesign & CI | 5 | 8 | 2026-03-08 |
| v1.2 | Production Polish & Code Consolidation | 5 | 18 | 2026-03-11 |
| v1.3 | Stub Elimination | 6 | 12 | 2026-03-18 |
| v1.5 | Code Quality & Deduplication | 3 | 7 | 2026-04-08 |
| v1.6 | SEO & Google Indexing Optimization | 9 | 21 | 2026-04-13 |
| v1.7 | Launch Readiness | 4 | 9 | 2026-04-15 |

**Active (not yet shipped):**

| Version | Name | Phases | Plans | Status |
|---------|------|--------|-------|--------|
| v2.0 | Revenue Gates | 2 | 0 | Phase 45 shipped, Phase 46 PAUSED pending v2.2 |
| v2.1 | Production Integrity Hardening | 4 | 0 | All 4 phases shipped 2026-04-19/20 (PRs #605, #606, #607) |
| v2.2 | Landlord-First Positioning | 3 | 0 | Phase 52 pending |

## Accumulated Context

### Decisions

- Phase 27-02: Discriminated union result type for useCreateInvitation (created/duplicate) lets callers decide UI response
- Phase 27-02: expires_at included in insert payload despite plan note about DB DEFAULT (generated types require it)
- Phase 27-02: Non-null assertions after length > 0 guard for noUncheckedIndexedAccess compliance
- [Phase 29]: Stripe API version 2026-02-25.clover locked in shared factory
- [Phase 29]: ctaBlock kept local per template; wrapEmailLayout shared with options pattern
- [Phase 29]: detach-payment-method retains createClient import for user-scoped client with custom headers
- [Phase 29]: stripe-autopay-charge SupabaseClient type alias updated to reference createAdminClient
- [Phase 29]: Sub-pattern B anon-key clients simplified by removing unnecessary global headers option
- [Phase 29]: SupabaseClient type import replaces ReturnType<typeof createClient> when createClient fully removed
- [Phase 41]: Phase 41-01: rent_payments schema has paid_date (not paid_at) and no stripe_charge_id column — plan's interfaces block was stale, assertions adapted to real schema
- [Phase 41]: Phase 41-01: DB notifications row is the deterministic proof of autopay exhaustion — tests assert DB row, not Resend HTTP interception
- [Phase 41]: Phase 41-01: Tests skip cleanly (not fail) on missing env vars — integration tests are never silent false-positives
- [Phase 41-payment-correctness-split-rent-tests]: Used createClient() direct instantiation for tests (matches 41-01 autopay-fixtures pattern; plan's createAdminClient helper does not exist in _shared/)
- [Phase 41-payment-correctness-split-rent-tests]: Tests skip cleanly on missing env vars via requireEnv() + SKIP: log — integration tests never become silent false-positives
- [Phase 41-payment-correctness-split-rent-tests]: Deterministic 36-hour span for duration_hours (first_charge_at=2026-04-10T00Z, paid_at=2026-04-11T12Z) — exact assertion, no tolerance window
- [Phase 41-payment-correctness-split-rent-tests]: Admin RPC test signs in as E2E_ADMIN to get real admin JWT (is_admin() check needs auth.uid(), not service_role)
- [Phase 41-payment-correctness-split-rent-tests]: Reframed TEST-08 from plan spec: rent_due has no tenant_id column (shared-lease rows are correctly shared at lease level). Isolation asserted at rent_payments.tenant_id, lease_tenants.tenant_id, and tenants.user_id RLS surfaces instead.
- [Phase 41-payment-correctness-split-rent-tests]: Split-rent fixture uses two-step shared-lease resolution (tenantA finds candidate lease via RLS-filtered inner join; tenantB confirms own presence on same lease). Works around RLS without needing service-role key.
- [Phase 42-01]: `get_subscription_status` is a SECURITY DEFINER RPC — stripe schema not exposed via PostgREST, so this bridges `stripe.subscriptions` → frontend with IDOR guard (`p_customer_id` must match caller's own `users.stripe_customer_id`)
- [Phase 42-01]: Edge Function `stripe-cancel-subscription` rejects any body-supplied `subscription_id` — resolves server-side from `users.stripe_customer_id` via `stripe.subscriptions.list({ customer, status: 'all', limit: 1 })` (T-42-01 IDOR mitigation)
- [Phase 42-01]: Cancel/reactivate mutations call `queryClient.setQueryData(['billing', 'subscription-status'], mapped)` BEFORE `invalidateQueries` — writes Stripe's authoritative response to cache so UI flips instantly regardless of FDW sync lag (T-42-06 mitigation)
- [Phase 42-01]: RPC-mapping test moved to own file `use-subscription-status.test.ts` — Vitest hoists `vi.mock()` per-file, so plan's in-file `vi.doMock` + dynamic import didn't bind
- [Phase 42-01]: Inlined `onSuccess` (not spread with `createMutationCallbacks`) — local factory REPLACES onSuccess; spread would overwrite the T-42-06 `setQueryData` call
- [Phase 42-02]: `GdprDataActions` extracted with two variants — `standalone` (full Danger Zone framing, BlurFade wrappers) for `account-danger-section.tsx`; `inline` (no card, no eyebrow, `space-y-4` rhythm) for `subscription-cancel-section.tsx` State 3. Dedupes ~200 lines of mutation/query code
- [Phase 42-02]: `SubscriptionCancelSection` is a 3-state machine gated on `(subscriptionStatus, cancelAtPeriodEnd)` — State 1 Active, State 2 Cancel-scheduled (grace window), State 3 Canceled (terminal). Returns `null` for `past_due`/`unpaid` (delegates to `SubscriptionStatusBanner`)
- [Phase 42-02]: AlertDialog confirm uses `event.preventDefault()` + manual `setDialogOpen(false)` only on success — prevents dialog close during pending mutation (would lose the `Canceling...` spinner)
- [Phase 42-02]: Playwright spec uses `test.skip(condition, reason)` — if seeded owner has no Stripe test-mode subscription, the spec skips with a clear reason rather than silently passing
- [Phase 44-02]: Signup-cohort semantics (D2) — `get_funnel_stats` cohort = owners whose signup falls in [p_from, p_to]; downstream steps counted at ANY time (not windowed). `cohort_label` key in jsonb return lets UI header display "owners who signed up between X and Y" (Pitfall 5 mitigation)
- [Phase 44-02]: D8 backfill union — `backfill_funnel_events()` Step 3 unions `tenant_invitations` (modern flow) with `tenants → lease_tenants → leases.owner_user_id` (legacy direct-tenant flow pre-v1.3). `public.tenants` has NO direct `owner_user_id` — join walks via lease_tenants.
- [Phase 44-02]: Trigger-deadlock avoidance (Pitfall 3) — `fn_record_first_rent_funnel_event` reads ONLY `NEW.*` + ONE SELECT against `leases`, never against `rent_payments` itself. ON CONFLICT DO NOTHING on composite UNIQUE (owner_user_id, step_name) releases without waiting on concurrent writers.
- [Phase 44-02]: Exception-swallowing pattern — every trigger function wraps INSERT in `BEGIN / EXCEPTION WHEN others THEN RAISE WARNING / END` so funnel-insert failure NEVER fails source writes. Accepted residual risk T-44-02-06 (silent drift via RAISE WARNING visible in Supabase logs + Sentry).
- [Phase 44-02]: Migration timestamp ordering — Plan 2's 20260415193247/48/49 strictly greater than Plan 1's 193245/46. Internal order schema+triggers < rpc < backfill ensures triggers exist before backfill runs (backfill uses same ON CONFLICT target).
- [Phase 44-02]: Task 7 (pnpm db:types) deferred to Wave 0 operator action — same TLS cert gate hit by Plan 44-01 (sandbox cannot reach api.supabase.com). Operator must run `supabase login` + `pnpm db:types` + commit as `chore(phase-44): regenerate supabase types for funnel events + RPC`.
- [Phase 44-03]: RPC field names differ from plan doc: step names are signup/first_property/first_tenant/first_rent (not first_tenant_invited/first_rent_collected); RPC shape uses 'from'/'to' keys (not cohort_from/cohort_to); column names are sent_count/delivered_count/etc (not sent/delivered). Mappers adjusted to match actual SQL.
- [Phase 44-03]: Bounce/complaint rates from get_deliverability_stats are in percentage points (0..100), not fractions — the SQL multiplies by 100. DeliverabilityStats uses bouncePercent/complaintPercent naming.
- [Phase 44-03]: src/lib/supabase/server.ts exports createClient() not createServerClient() — plan code snippet was inaccurate; layout + page use the correct import.
- [Phase 44-03]: getAdminTestCredentials() already existed from Plan 1 Task 4 — no duplicate added in Task 8.
- [Phase 44-03]: funnel-renderer.tsx (recharts-only code-split module) created but was missing from plan's files_modified frontmatter.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260330-rp5 | Fix non-4px-grid spacing in tenant table and badge | 2026-03-31 | 827e9c204 | [260330-rp5-fix-non-4px-grid-spacing-in-tenant-table](./quick/260330-rp5-fix-non-4px-grid-spacing-in-tenant-table/) |

## Session Continuity

Last session: 2026-04-16T00:00:00.000Z
Stopped at: v1.7 Launch Readiness milestone ARCHIVED + ALL Wave 0 actions COMPLETE 2026-04-16. v1.7 fully production-live. Wave 0 commits: 0a013bb71 (drift backfill), 7da87331d (types regen), 7b50460e1 (status #1+#2), 8d7653a2f (status #3 partial + #4). Final state: 5 Phase 44 migrations live; resend-webhook Edge Function deployed + Resend webhook registered + RESEND_WEBHOOK_SECRET synced to Resend's whsec_…fGm68 signing secret; admin user e2e-admin@tenantflow.app (id e4364d5c-b6d6-43eb-bc95-9ecc899aa52f) with user_type=ADMIN, credentials in E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD GH repo secrets. No active milestone.
Resume file: .planning/ROADMAP.md (collapsed v1.7) — start next milestone with `/gsd:new-milestone vX.Y <name>`
