---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Production Hardening
status: completed
stopped_at: Phase 5 context gathered
last_updated: "2026-03-05T17:03:07.077Z"
last_activity: 2026-03-05 — Env validation + error sanitization for 7 Edge Functions (export-report new, 6 Stripe already done)
progress:
  total_phases: 9
  completed_phases: 4
  total_plans: 19
  completed_plans: 19
  percent: 95
---

# Project State: TenantFlow

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** A landlord can add a property, invite a tenant, collect rent, and see their financials — without touching a spreadsheet or calling anyone.
**Current focus:** v1.0 Production Hardening — Phase 4 execution in progress

## Current Position

Phase: 4 of 9 (Edge Function Hardening)
Plan: 3 of 4 in current phase (04-03 complete)
Status: Completed 04-03 (Stripe/payment/report Edge Function hardening)
Last activity: 2026-03-05 — Env validation + error sanitization for 7 Edge Functions (export-report new, 6 Stripe already done)

Progress: [██████████] 95%

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

### Pending Todos

None.

### Blockers/Concerns

- ~~12+ SECURITY DEFINER RPCs are exploitable NOW in production~~ RESOLVED: Phase 01 complete
- Middleware may not be executing at all (registration issue)
- Vitest 4.x + chai 6.x `.rejects.toThrow('string')` bug — use `.rejects.toMatchObject()` workaround
- Lease RPC tests skip when no test leases exist (owners have 0 leases in test DB)

## Session Continuity

Last session: 2026-03-05T17:03:07.075Z
Stopped at: Phase 5 context gathered
Resume file: .planning/phases/05-code-quality-type-safety/05-CONTEXT.md
