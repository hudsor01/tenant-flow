---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Production Hardening
status: completed
stopped_at: Completed 07-03-PLAN.md
last_updated: "2026-03-06T16:35:00.000Z"
last_activity: 2026-03-06 — Aria-labels on icon buttons, shadcn Switch toggles, responsive kanban scroll-snap
progress:
  total_phases: 12
  completed_phases: 7
  total_plans: 50
  completed_plans: 42
  percent: 84
---

# Project State: TenantFlow

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** A landlord can add a property, invite a tenant, collect rent, and see their financials — without touching a spreadsheet or calling anyone.
**Current focus:** v1.0 Production Hardening — Phase 7 execution in progress

## Current Position

Phase: 7 of 9 (UX & Accessibility)
Plan: 5 of 6 in current phase (07-05 complete)
Status: Completed 07-05 (UX polish: tenant delete guard, EmptyState, login fallback, skeleton)
Last activity: 2026-03-06 — Active-lease guard on tenant delete, shared EmptyState, branded login fallback, property skeleton

Progress: [████████░░] 78%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~12 min
- Total execution time: ~0.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-rpc-database-security | 2/2 | ~32 min | ~16 min |
| 02-financial-fixes | 1/6 | ~4 min | ~4 min |
| Phase 02 P01 | 4min | 2 tasks | 2 files |
| Phase 02 P02 | 5min | 2 tasks | 3 files |
| Phase 02 P03 | 5min | 2 tasks | 3 files |
| Phase 02 P04 | 9min | 4 tasks | 9 files |
| Phase 02 P05 | 3min | 2 tasks | 2 files |
| Phase 03 P03 | 6min | 2 tasks | 3 files |
| Phase 03 P04 | 13min | 2 tasks | 6 files |
| Phase 03 P06 | 8min | 2 tasks | 2 files |
| Phase 03 P02 | 18min | 2 tasks | 7 files |
| Phase 03 P01 | 22min | 2 tasks | 4 files |
| Phase 02 P07 | 2min | 3 tasks | 4 files |
| Phase 04 P01 | 4min | 2 tasks | 11 files |
| Phase 04 P02 | 3min | 2 tasks | 6 files |
| Phase 04 P03 | 5min | 2 tasks | 1 files |
| Phase 05 P03 | 15min | 2 tasks | 20 files |
| Phase 05 P01 | 6min | 3 tasks | 14 files |
| Phase 05 P02 | 18min | 2 tasks | 6 files |
| Phase 05 P05 | 8min | 2 tasks | 15 files |
| Phase 05 P06 | 18min | 2 tasks | 95 files |
| Phase 05 P07 | 9min | 2 tasks | 19 files |
| Phase 05 P08 | 14min | 2 tasks | 26 files |
| Phase 05 P09 | 11min | 2 tasks | 16 files |
| Phase 05 P10 | 7min | 2 tasks | 22 files |
| Phase 06 P00 | 4min | 1 tasks | 3 files |
| Phase 06 P01 | 6min | 2 tasks | 3 files |
| Phase 06 P02 | 8min | 2 tasks | 3 files |
| Phase 06 P05 | 3min | 2 tasks | 2 files |
| Phase 06 P06 | 4min | 2 tasks | 2 files |
| Phase 05 P04 | 2min | 2 tasks | 0 files |
| Phase 07 P01 | 2min | 2 tasks | 0 files |
| Phase 07 P05 | 14min | 2 tasks | 6 files |
| Phase 07 P02 | 14min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

- v1.0: Based on comprehensive 8-agent review finding 131 issues (22 P0, 35 P1, 46 P2, 28 P3)
- v1.0: Security-first phase ordering — RPC auth (Phase 1), financials (Phase 2), then remaining
- v1.0: DOC-01 (CLAUDE.md rewrite) is recurring in every phase, not a standalone phase
- v1.0: Clean slate — all prior milestone artifacts removed, fresh numbering from Phase 01
- 01-01: Combined TDD RED+GREEN into single commit (pre-commit hook blocks intentionally-failing tests)
- 01-01: 26 RAISE EXCEPTION guards (25 user-ID RPCs + 1 session ownership in revoke_user_session)
- 01-01: SEC-05 sweep DO block ensures future SECURITY DEFINER functions without search_path get auto-fixed
- 01-02: Used is_admin() JWT check for admin gates (faster than DB lookup, equally secure)
- 01-02: Error RPCs changed from LANGUAGE sql to plpgsql for admin guard support
- 01-02: Rate limit: 10 errors/min/user on log_user_error to prevent alert flooding
- 02-06: Stripe sync uses Supabase Stripe Sync Engine (external service), not FDW or cron
- 02-06: Fix requires Supabase Dashboard re-enablement, not SQL migration
- 02-06: Created check_stripe_sync_status() monitoring RPC for ongoing health checks
- [Phase 02]: rent_payments has FORCE RLS — re-created dropped service_role policy for webhook writes
- [Phase 02]: record_rent_payment RPC skips auth.uid() (called by service_role from webhook handler)
- [Phase 02]: Sentry with console.error fallback when SENTRY_DSN not set — structured JSON logging as bridge
- [Phase 02]: invoice.payment_failed skips subscription_status update — stripe.subscriptions is source of truth
- [Phase 02]: Autopay idempotency key: rent_due_id + tenant_id scoped per-tenant for shared leases
- [Phase 02]: Edge Function independently verifies tenant portion as safety net against pg_cron bugs
- [Phase 02]: Autopay retry: day 1 initial, day 3 retry 1, day 7 retry 2 — Edge Function computes next_retry_at
- [Phase 02]: Subscription status falls back to leases.stripe_subscription_status if RPC unavailable
- [Phase 02]: formatCents consolidation deferred (96 occurrences in 27 files) -- not a bug, just convenience wrapper
- [Phase 02]: Plan limit checks fail-open on frontend (RLS is real enforcement)
- [Phase 02]: Used property_owners.charges_enabled directly instead of stripe.accounts lookup for onboarding backfill
- [Phase 03]: AUTH-08: OAuth provider (Google) trusted for email verification — no extra email_confirmed_at check
- [Phase 03]: AUTH-13: x-forwarded-host ignored in buildRedirectUrl, uses NEXT_PUBLIC_APP_URL or origin
- [Phase 03]: AUTH-15: OTP type validated against 5-type allowlist before calling Supabase verifyOtp
- [Phase 03]: AUTH-12: Login redirect uses URL constructor hostname check instead of startsWith
- [Phase 03]: AUTH-18: Inline CSS only for auth email templates (email client compatibility)
- [Phase 03]: AUTH-18: Hook secret verification optional (graceful degradation when not set)
- [Phase 03]: AUTH-18: Callback URL uses NEXT_PUBLIC_APP_URL + /auth/callback?token_hash&type
- [Phase 03]: AUTH-14: BEFORE UPDATE trigger for user_type restriction (not RLS WITH CHECK which would block profile updates)
- [Phase 03]: AUTH-05: Checkout session stays unauthenticated but returns minimal data (customer_email only)
- [Phase 03]: AUTH-10: Post-checkout requires explicit Resend button click for magic link (no auto-send)
- [Phase 03]: AUTH-01: Root middleware.ts with updateSession pattern, cookie-preserving redirects
- [Phase 03]: AUTH-02: ADMIN treated as OWNER for routing (dashboard access, blocked from /tenant)
- [Phase 03]: AUTH-03: AuthProvider uses getUser() for server-validated session init (not getSession())
- [Phase 03]: AUTH-06: Module-level Supabase client removed; per-mutation client creation pattern
- [Phase 03]: AUTH-16: Single authKeys factory in use-auth.ts; authQueryKeys removed from auth-provider.tsx
- [Phase 02]: get_user_invoices uses SECURITY DEFINER with stripe.customers join for user scoping, rent_payments fallback
- [Phase 04]: CORS fail-closed: console.error + empty headers when FRONTEND_URL unset (browser blocks by default)
- [Phase 04]: CSP enforced mode (not report-only) with self + inline scripts/styles + Supabase/Sentry/Stripe connect-src
- [Phase 04]: Vary header on /properties confirmed correct (Authorization + Cookie for CDN differentiation)
- [Phase 04]: Supabase SDK 2.97.0 aligns deno.json with Next.js package.json version
- [Phase 04]: Rate limiter fails open on Upstash errors (availability over strict enforcement)
- [Phase 04]: Sentry tunnel uses in-memory Map in proxy.ts (persistent process, no Redis needed)
- [Phase 04]: stripe-connect limit capped at 100 for payouts and transfers actions
- [Phase 04]: Unknown action error sanitized (no longer echoes user input)
- [Phase 04]: Task 1 (6 Stripe functions) already completed by Plan 04-02 -- no duplicate work needed
- [Phase 05]: select pattern on parent query eliminates queryClient closure (no eslint-disable needed)
- [Phase 05]: analytics-keys.ts shared factory for get_revenue_trends_optimized (dedup across 4 call sites)
- [Phase 05]: tour.tsx eslint-disable suppressions are legitimate upstream Dice UI patterns
- [Phase 05]: report-keys.ts uses parallel Promise.all for multi-RPC queries (dashboard_stats + expense_summary)
- [Phase 05]: Expense CRUD hooks kept inline in use-financials.ts (from() queries, not rpc())
- [Phase 05]: @radix-ui/react-icons fully removed, lucide-react is sole icon library
- [Phase 05]: 24 structurally required as unknown as assertions kept (PostgREST string vs domain union literals)
- [Phase 05]: isSuccessfulPaymentStatus simplified to exact match status === 'succeeded' per DB schema
- [Phase 05]: tour.tsx (1,732 lines) verified as vendored Dice UI upstream copy — kept as-is, exempt from 300-line rule
- [Phase 05]: 91 presentational components had 'use client' removed — no hooks, event handlers, or browser APIs required
- [Phase 05]: CLAUDE.md updated with 3 new Zero Tolerance rules, query key factories, mapper patterns, hook conventions
- [Phase 05]: Webhook handler files named by Stripe event type for discoverability (payment-intent-succeeded.ts)
- [Phase 05]: captureError kept local to payment-intent-succeeded handler (avoids cross-handler Sentry coupling)
- [Phase 05]: fetchRevenueTrends as standalone function (not queryOptions spread) to avoid TanStack Query generic type conflicts
- [Phase 05]: general-settings.tsx uses useProfile() hook instead of inline user-profile query with different cache key
- [Phase 05]: blogKeys factory inline in use-blogs.ts (simple public queries, no cross-domain sharing needed)
- [Phase 05]: Expense queries co-located with expense mutations in use-expense-mutations.ts (domain cohesion over strict query/mutation separation)
- [Phase 05]: No re-exports from trimmed hook files -- all consumers updated to import directly from defining file
- [Phase 05]: authKeys stays in use-auth.ts per CLAUDE.md rule (single auth query key factory)
- [Phase 05]: billingKeys/billingQueries extracted to query-keys/billing-keys.ts following established convention
- [Phase 05]: payment keys/queries extracted to query-keys/payment-keys.ts for consistency
- [Phase 05]: PROFILE_SELECT and mapUserProfile exported from use-profile.ts for reuse by mutations file
- [Phase 05]: use-billing.ts re-exports billingKeys and billingQueries for backward-compatible import paths
- [Phase 05]: callDocuSealEdgeFunction moved to use-lease-mutations.ts (only used by mutations)
- [Phase 05]: callBillingEdgeFunction duplicated in use-billing-mutations.ts (mutations need it, not queries)
- [Phase 06]: Followed established test pattern from leases.rls.test.ts for Wave 0 stubs
- [Phase 06]: DB-12: Dynamic DO block for trigger reassignment (query pg_trigger/pg_proc, avoid hardcoded tables)
- [Phase 06]: DB-01: ON DELETE CASCADE for activity.user_id (activity meaningless without user, GDPR handles cleanup)
- [Phase 06]: DB-11: ON DELETE SET NULL for blogs.author_user_id (blog content survives author deletion)
- [Phase 06]: Moved rls-tests from pre-commit to pre-push (Supabase auth rate limiting prevention)
- [Phase 06]: documents.owner_user_id ON DELETE SET NULL (GDPR handles cleanup)
- [Phase 06]: Tenant document access limited to lease-type documents only
- [Phase 06]: get_current_property_owner_id() dropped (no remaining references)
- [Phase 06]: 3 RPCs use p_user_id directly (no property_owners table lookup)
- [Phase 06]: DB-01/DB-02: RLS test stubs replaced with 7 real DB assertions + 1 conditional skip for tenant access
- [Phase 06]: DB-04: Active-lease block test gracefully skips when ownerA has no active leases (cannot safely test without destroying test account)
- [Phase 06]: Fixed migration 20260306170000: DROP FUNCTION before return type change (void->integer requires drop first in PostgreSQL)
- [Phase 05]: No code changes required for Plan 04 -- all 9 hook file splits completed by Plans 05-08/09/10
- [Phase 07]: 07-01: All text-muted/bg-white/raw color fixes already resolved by prior phases -- plan verified as complete, zero code changes needed
- [Phase 07]: Tenant delete checks lease_tenants joined with leases for active status before soft-delete
- [Phase 07]: EmptyState uses shadcn Empty compound with variant=icon for icon presentation
- [Phase 07]: Property detail skeleton in page.tsx where loading state lives, not client component
- [Phase 07]: Non-null assertions for breadcrumbs array indexing inside length guards (safe pattern)
- [Phase 07]: Sidebar role conditionally set to dialog when open (preserves native aside semantics when closed)

### Pending Todos

None.

### Blockers/Concerns

- ~~12+ SECURITY DEFINER RPCs are exploitable NOW in production~~ RESOLVED: Phase 01 complete
- Middleware may not be executing at all (registration issue)
- Vitest 4.x + chai 6.x `.rejects.toThrow('string')` bug — use `.rejects.toMatchObject()` workaround
- Lease RPC tests skip when no test leases exist (owners have 0 leases in test DB)

## Session Continuity

Last session: 2026-03-06T16:32:09.067Z
Stopped at: Completed 07-02-PLAN.md
Resume file: None
