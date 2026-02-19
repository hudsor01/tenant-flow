# TenantFlow Issues — Phase 33 Smoke Test

Generated: 2026-02-18
Source: Phase 33-01 automated E2E + 33-02 code inspection

---

## P0 — Critical (Blocking Revenue)

*None found after seed fix — critical path (login, dashboard, properties, navigation) all pass.*

---

## P1 — Major

### [ISSUE-001] Backend health check fails at cold start
- **Pages affected**: GET /health
- **Symptom**: Returns `status: "unhealthy"` for ~2s after process starts
- **Cause**: Supabase admin client `table_ping` to public.users fails immediately on startup
- **Impact**: CI smoke test would flag false positive on every cold start
- **Fix**: Add retry with backoff in `supabase-health.service.ts`
- **Phase**: 33 (quick fix)

### [ISSUE-002] Tenant invitation E2E flow broken (13 tests)
- **Tests**: `tests/tenant-invitation/tenant-invitation-flow.e2e.spec.ts`
- **Symptom**: All 13 invitation flow tests fail
- **Cause**: JWT session refresh after tenant activation doesn't occur before portal redirect
- **Phase**: 36 (tenant onboarding)

### [ISSUE-003] Tenant management E2E tests failing (18 tests)
- **Tests**: `tests/tenant-management/*.e2e.spec.ts`
- **Symptom**: Create/edit tenant modal interactions fail (18 tests across 3 files)
- **Possible cause**: Modal/dialog selectors changed; will re-verify after Phase 33 fixes
- **Phase**: 33 (investigate)

### [ISSUE-004] TanStack Query advanced tests don't match implementation (27 tests)
- **Tests**: `tests/tanstack-query/infinite-scrolling.spec.ts` (17), `optimistic-updates.spec.ts` (10)
- **Symptom**: Tests expect infinite scroll and optimistic updates that aren't implemented
- **Fix**: Delete these test files — they test aspirational/unbuilt features
- **Phase**: 33 (cleanup)

### [ISSUE-005] Billing plans page uses hardcoded mock data
- **Page**: `/billing/plans`
- **Symptom**: `PLANS` array hardcoded; `CURRENT_PLAN_ID` hardcoded to `null`
- **Impact**: Plan cards show but upgrade/downgrade flows can't work; no real subscription state
- **Fix**: Wire to real Stripe subscription API; fetch current plan from backend
- **Phase**: 35 (subscription enforcement)

### [ISSUE-006] Tax documents page shows hardcoded sample data
- **Page**: `/financials/tax-documents`
- **Symptom**: `sampleDocuments` array (lines 36-93) contains hardcoded 1099-MISC, Schedule E, etc.
- **Impact**: Users see fake documents that can't be downloaded
- **Fix**: Remove mock data; wire to real document API or show proper empty state
- **Phase**: 37 (financial wiring)

---

## P2 — Minor

### [ISSUE-007] Minimal smoke test networkidle timeout
- **Test**: `tests/smoke/minimal.smoke.spec.ts` (chromium project)
- **Symptom**: `waitForLoadState('networkidle')` times out on dashboard
- **Cause**: Dashboard makes background polling requests (TanStack Query refetch intervals)
- **Fix**: Change to `waitForLoadState('domcontentloaded')`
- **Phase**: 33

### [ISSUE-008] Tenant lease page shows placeholder text
- **Page**: `/tenant/lease`
- **Symptom**: Line 191 shows "Signed on loading..." — incomplete conditional text
- **Impact**: Cosmetic — tenant sees confusing text while data loads
- **Fix**: Replace with proper loading skeleton or conditional rendering
- **Phase**: 37

### [ISSUE-009] Settings billing tab: Stripe Connect needs end-to-end verification
- **Page**: `/settings?tab=billing`
- **Symptom**: `ConnectAccountStatus` component exists and backend endpoint is live,
  but full redirect flow (Connect → Stripe → return) hasn't been E2E tested
- **Impact**: Owners can't onboard to receive rent payments
- **Fix**: Phase 34 will verify and fix the complete Connect onboarding flow
- **Phase**: 34 (Stripe Connect)

### [ISSUE-010] Financials/payouts: no empty state for missing Connect account
- **Page**: `/financials/payouts`
- **Symptom**: If owner hasn't connected Stripe, payouts page may show blank/error
- **Fix**: Add empty state prompting Connect onboarding
- **Phase**: 34 or 37

---

## Pre-Assessment Status for Upcoming Phases

### Phase 34 — Stripe Connect

From code inspection:
- Connect onboarding CTA exists at `/settings?tab=billing` via `ConnectAccountStatus`
- Backend endpoint `POST /api/v1/stripe/connect/onboard` exists
- Webhook `account.updated` routing exists in `connect-webhook.handler.ts`
- **Gap**: Full redirect flow not E2E tested; `STRIPE_CONNECT_WEBHOOK_SECRET` needs verification

### Phase 35 — Subscription Enforcement

From code inspection:
- `SubscriptionGuard` globally registered but only checks `check_user_feature_access('basic_properties')`
- `get_user_plan_limits` returns hardcoded 100 properties/1000 units for all users
- No count enforcement on property or tenant creation
- Billing plans page is entirely hardcoded (ISSUE-005 above)

### Phase 36 — Tenant Onboarding

From code inspection:
- Full invitation → accept → activate flow exists in code
- **Gap**: JWT session refresh after activation may not happen before portal redirect
- `user_type` in JWT won't reflect TENANT until next token refresh (ISSUE-002 above)

### Phase 37 — Financial Wiring

| Page | Status | Notes |
|------|--------|-------|
| `/financials` | PASS | Uses real hooks with `?? 0` fallbacks |
| `/financials/expenses` | PASS | Expense tracking with real API |
| `/financials/payouts` | PARTIAL | No empty state for missing Connect account |
| `/financials/tax-documents` | FAIL | Hardcoded mock `sampleDocuments` array |
| `/reports` | PASS | Report generation and export |
| `/analytics` | PASS | Multiple sub-routes, all exist |

---

## Completed Issues

- [x] **[ISSUE-001] Owner redirected to /tenant after login** — FIXED in Phase 33-01
  - Root cause: `ensure_public_user_for_auth` trigger defaulted user_type to TENANT
  - Fix: Seed explicitly UPDATE public.users.user_type='OWNER' after auth.users INSERT
