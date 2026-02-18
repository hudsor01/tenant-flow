# Phase 17: Stripe E2E & Production Readiness

## Phase Goal

Achieve production-ready Stripe integration with comprehensive E2E tests, monitoring, and go-live verification.

## Research Findings

### Existing E2E Test Coverage (2 comprehensive test files)

1. **stripe-payment-flow.e2e.spec.ts** - Covers:
   - Payment method setup with Stripe Elements
   - Rent payment submission
   - Payment history display
   - Refund processing
   - Webhook handling
   - Error scenarios (declined cards, expired cards, insufficient funds)
   - Security (expired session, CSRF protection)

2. **owner-subscription.e2e.spec.ts** - Covers:
   - Pricing page display
   - Plan selection (Starter, Professional, Enterprise)
   - Stripe Hosted Checkout redirect
   - Success page handling
   - Subscription management in settings

### Missing E2E Coverage

1. **Connect Onboarding** - No tests for:
   - Express account creation flow
   - Onboarding link redirect
   - Account verification requirements
   - Onboarding completion handling

### Remaining Issues from STATE.md

| Issue | Severity | Status |
|-------|----------|--------|
| SYNC-MONITOR | MEDIUM | Basic `getHealthStatus()` exists, lacks comprehensive monitoring |
| DEBUG-LOGS | LOW | **RESOLVED** - backfill script uses NestJS Logger |

### Stripe Sync Engine Monitoring Assessment

Current implementation (`stripe-sync.service.ts`):
- ✅ `getHealthStatus()` - Basic health check (config validation, initialization state)
- ✅ Structured logging for backfill operations
- ✅ `onModuleDestroy()` - Connection pool cleanup
- ❌ No connection pool metrics (active connections, wait times)
- ❌ No webhook processing latency tracking
- ❌ No error rate metrics

**Recommendation**: Connection pool monitoring is internal to @supabase/stripe-sync-engine and not exposed via public API. Enhanced monitoring would require:
1. Wrapping webhook calls with timing
2. Adding Sentry performance tracing (already integrated)
3. Structured log aggregation via existing AppLogger

Given that Sentry is already integrated and AppLogger provides structured logging, additional monitoring infrastructure is **optional enhancement** rather than required.

## Plan Breakdown

### Plan 17-01: Connect Onboarding E2E Tests
- Create comprehensive E2E tests for Stripe Connect onboarding flow
- Test Express account creation, onboarding links, status updates
- Test dashboard login link generation
- Test payout dashboard display

### Plan 17-02: Production Readiness Verification
- Review and verify Stripe go-live checklist items
- Ensure API version is pinned
- Verify webhook endpoints are properly configured
- Update SYNC-MONITOR status in STATE.md
- Final documentation updates

## Success Criteria

- [ ] Connect onboarding E2E tests passing
- [ ] All Stripe-related E2E tests green
- [ ] SYNC-MONITOR issue documented/resolved
- [ ] STATE.md updated to Phase 17 complete
- [ ] ROADMAP.md updated to v2.0 complete
