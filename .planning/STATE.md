# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-15)

**Core value:** Stabilize the foundation before shipping features — fix security vulnerabilities, consolidate migrations, increase test coverage
**Current focus:** v2.0 Stripe Integration Excellence — Full-stack Stripe perfection

## Current Position

Phase: 16 of 17 (Stripe Backend Test Coverage) - COMPLETE
Plan: 3 of 3 in current phase - COMPLETE
Status: Human verification checkpoint
Last activity: 2026-01-17 — Completed 16-03-PLAN.md (Connect Setup & Facade Tests)

Progress: █████████░ 94% (v2.0 - Phase 16 complete, Phase 17 remaining)

## Performance Metrics

**Velocity:**
- Total plans completed: 31 (17 v1.0 + 4 v1.1 + 10 v2.0)
- Average duration: ~5 min
- Total execution time: ~2.8 hours

**By Phase (v1.0 + v1.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Critical Security | 2/2 | 10 min | 5 min |
| 2. Database Stability | 2/2 | 4 min | 2 min |
| 3. Test Coverage | 3/3 | 37 min | 12 min |
| 4. Code Quality | 6/6 | ~15 min | ~2.5 min |
| 5. DevOps | 4/4 | ~15 min | ~4 min |
| 6. Stripe Controller Split | 1/1 | ~5 min | ~5 min |
| 7. Reports Controller Split | 1/1 | ~5 min | ~5 min |
| 8. Service Decomposition | 1/1 | ~5 min | ~5 min |
| 9. Connect Payouts | 1/1 | ~3 min | ~3 min |
| 10. Final Polish | 1/1 | ~3 min | ~3 min |
| 11. Stripe Backend Hardening | 4/4 | ~20 min | ~5 min |
| 12. Webhook Security & Reliability | 3/3 | ~15 min | ~5 min |
| 13. Frontend Checkout & Subscriptions | 3/3 | 33 min | ~11 min |
| 14. Stripe Connect & Payouts UI | 2/2 | ~25 min | ~12 min |
| 15. Stripe Documentation Alignment | 1/1 | ~10 min | ~10 min |
| 16. Stripe Backend Test Coverage | 3/3 | ~33 min | ~11 min |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 06-01 | Split stripe.controller by operation type | Clear separation of concerns (charges, checkout, invoices) |
| 07-01 | Split reports.controller by function | Export, generation, analytics are distinct operations |
| 08-01 | PDF service acceptable as-is | Already cohesive with 8 supporting services |
| 08-01 | Extract search + password from utility | Clear single responsibilities |
| 09-01 | Extract payouts from connect | Financial operations vs account management |
| 12-01 | SECURITY DEFINER with explicit search_path for RPCs | Standard security practice for RPC functions |
| 12-01 | Implicit transaction wrapping via plpgsql | No explicit BEGIN/COMMIT needed in PostgreSQL functions |
| 12-02 | Use RPC for all multi-step handler operations | Ensures atomicity without explicit transaction management |
| 12-02 | Audit logging instead of runtime RLS for webhooks | Handlers use admin client; logging provides observability |
| 12-03 | Use Sentry + structured logs for DLQ alerts | Dual alerting: Sentry for tracking, structured logs for aggregators |
| 13-01 | Static plan definitions for pricing page | Backend can be integrated later if dynamic pricing needed |
| 13-01 | Customer Portal for tier changes | Leverage Stripe's built-in proration and confirmation UX |
| 13-02 | Keep Stripe Connect for rent payments | Correct architecture for tenant→owner; handles payouts, 1099s, liability |
| 13-02 | ACH-first payment method ordering | 0.8% capped $5 vs 2.9%+$0.30 saves $39+ per rent payment |
| 13-03 | ExpressCheckoutElement for wallet prominence | One-click Apple Pay/Google Pay above traditional form |
| 14-01 | Reuse ConnectOnboardingDialog from tenant settings | Avoid duplication; same component works for owners |
| 14-02 | Generic CSV export utility | Reusable across all export needs, not just payouts |
| 15-01 | 429 for rate limits | Proper HTTP status enables client backoff strategies |
| 15-01 | Webhook deduplication already implemented | Existing RPC-based locking exceeds requirements |

### v2.0 Issues to Address

From Stripe investigation (2026-01-16):

| ID | Issue | Severity | Location |
|----|-------|----------|----------|
| ~~TEST-002~~ | ~~Payment services lack unit tests~~ | ~~HIGH~~ | ~~RESOLVED in 16-01: 89 new tests~~ |
| ~~PAGINATION~~ | ~~Hard limit 1,000 items~~ | ~~HIGH~~ | ~~RESOLVED in 11-02~~ |
| ~~WEBHOOK-RACE~~ | ~~Race condition in processing~~ | ~~MEDIUM~~ | ~~RESOLVED in 12-01/12-02: Atomic RPCs~~ |
| ~~WEBHOOK-RLS~~ | ~~RLS bypass without verification~~ | ~~MEDIUM~~ | ~~RESOLVED in 12-02: Audit logging~~ |
| SYNC-MONITOR | No Sync Engine monitoring | MEDIUM | stripe-sync.service.ts |
| ~~IDEMPOTENCY~~ | ~~Untested idempotency keys~~ | ~~LOW~~ | ~~RESOLVED in 16-01: 20 tests~~ |
| DEBUG-LOGS | Console.log in scripts | LOW | backfill-stripe-customers.ts |

### Deferred Issues

Testing improvements deferred from v1.1:
- TEST-001: Review 51 skipped E2E tests
- TEST-003: Add PDF generator unit tests

See `.planning/TECH_DEBT.md` for full list.

### Blockers/Concerns

None.

### Roadmap Evolution

- v1.0 Health Remediation: 5 phases, 17 plans, shipped 2026-01-15
- v1.1 Tech Debt Resolution: 5 phases (6-10), 4 plans, shipped 2026-01-15
- v2.0 Stripe Integration Excellence: 7 phases (11-17), created 2026-01-16

## Session Continuity

Last session: 2026-01-17
Stopped at: Completed Phase 16 - Human verification checkpoint
Resume file: None
