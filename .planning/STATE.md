---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Launch Readiness
status: complete
stopped_at: Phase 42 verified (CANCEL-01/02/03 all PASS) + 3 follow-ups landed (W-01 dropdown removal, W-02 key consolidation, engines widen) — ready for next phase
last_updated: "2026-04-14T08:15:00.000Z"
last_activity: 2026-04-14
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 100
---

# Project State: TenantFlow

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.
**Current focus:** Phase 42 — Cancellation UX End-to-End Audit + Fix

## Current Position

Phase: 42
Plan: 42-01 + 42-02 executed + 3 follow-ups landed
Milestone: v1.7 Launch Readiness
Status: Phase complete — verifier PASS-WITH-FOLLOWUPS (3 live-Stripe smoke items for human verification)
Last activity: 2026-04-14

## Shipped Milestones

| Version | Name | Phases | Plans | Shipped |
|---------|------|--------|-------|---------|
| v1.0 | Production Hardening | 10 | 60 | 2026-03-07 |
| v1.1 | Blog Redesign & CI | 5 | 8 | 2026-03-08 |
| v1.2 | Production Polish & Code Consolidation | 5 | 18 | 2026-03-11 |
| v1.3 | Stub Elimination | 6 | 12 | 2026-03-18 |
| v1.5 | Code Quality & Deduplication | 3 | 7 | 2026-04-08 |
| v1.6 | SEO & Google Indexing Optimization | 9 | 21 | 2026-04-13 |

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260330-rp5 | Fix non-4px-grid spacing in tenant table and badge | 2026-03-31 | 827e9c204 | [260330-rp5-fix-non-4px-grid-spacing-in-tenant-table](./quick/260330-rp5-fix-non-4px-grid-spacing-in-tenant-table/) |

## Session Continuity

Last session: 2026-04-14T02:07:30.000Z
Stopped at: Phase 42 executed — CANCEL-01 (1-click cancel without portal), CANCEL-02 (stripe.subscriptions as status source), CANCEL-03 (inline GDPR actions in canceled state) all closed. Gates green: typecheck, lint, 21 settings tests, Playwright --list shows 2 tests.
Resume file: .planning/phases/42-cancellation-ux-end-to-end-audit-fix/42-02-SUMMARY.md
