---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Production Hardening
status: completed
stopped_at: Completed 03-03-PLAN.md
last_updated: "2026-03-05T04:41:01.062Z"
last_activity: 2026-03-04 — Hardened auth callback (x-forwarded-host, OTP validation) and login redirect
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 23
  completed_plans: 11
  percent: 22
---

# Project State: TenantFlow

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** A landlord can add a property, invite a tenant, collect rent, and see their financials — without touching a spreadsheet or calling anyone.
**Current focus:** v1.0 Production Hardening — Phase 2 execution in progress

## Current Position

Phase: 3 of 9 (Auth & Middleware)
Plan: 6 of 6 in current phase
Status: Completed 03-06 (Auth email templates via Resend)
Last activity: 2026-03-04 — Created branded auth email templates and auth-email-send Edge Function

Progress: [##░░░░░░░░] 22%

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
| Phase 03 P06 | 8min | 2 tasks | 2 files |

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

### Pending Todos

None.

### Blockers/Concerns

- ~~12+ SECURITY DEFINER RPCs are exploitable NOW in production~~ RESOLVED: Phase 01 complete
- Middleware may not be executing at all (registration issue)
- Vitest 4.x + chai 6.x `.rejects.toThrow('string')` bug — use `.rejects.toMatchObject()` workaround
- Lease RPC tests skip when no test leases exist (owners have 0 leases in test DB)

## Session Continuity

Last session: 2026-03-05T04:41:54Z
Stopped at: Completed 03-06-PLAN.md
Resume file: None
