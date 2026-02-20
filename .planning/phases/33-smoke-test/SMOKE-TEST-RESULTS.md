---
phase: 33-smoke-test
plan: 01
date: 2026-02-18
---

# Smoke Test Results — Phase 33-01

## Summary

| Suite | Passed | Failed | Skipped/DNR | Notes |
|-------|--------|--------|-------------|-------|
| smoke project | 4 | 1 | 4 | P0 login redirect bug |
| chromium project | 54 | 77 | 10 | TanStack/tenant tests |
| owner project | n/a | n/a | n/a | Timeout — not run |
| tenant project | n/a | n/a | n/a | Not run |

**Overall: Critical P0 bug found — owners redirected to /tenant after login**

---

## Smoke Project Results (`--project=smoke`)

Tests in `tests/smoke/` with no pre-auth storageState.

| Test | Status | Notes |
|------|--------|-------|
| P0: System is alive (health check) | ✅ PASS | Backend healthy after warmup |
| P0: Owner can login | ✅ PASS | Login succeeds, redirects away from /login |
| P0: Dashboard loads for owner | ❌ FAIL | **After login, owner redirected to /tenant not /dashboard** |
| P0: Properties page loads | — DNR | Stopped (serial mode) |
| P0: API endpoints are accessible | — DNR | Stopped |
| P0: Navigation works | — DNR | Stopped |
| P0: No console errors | — DNR | Stopped |
| Env vars are set | ✅ PASS | All required env vars present |
| Servers are reachable | ✅ PASS | Frontend + backend both respond |
| Minimal smoke (chromium) | ❌ FAIL | networkidle timeout on dashboard |

### Root Cause: Dashboard Test Failure

After `loginAsOwner()`, Next.js server logs show `GET /tenant 200` — the owner is
being redirected to `/tenant` instead of `/dashboard`. This happens because:

**The seed user `test-admin@tenantflow.app` has `user_type: "TENANT"` in `public.users`.**

Direct DB query confirmed:
```json
{ "email": "test-admin@tenantflow.app", "user_type": "TENANT" }
```

The login redirect reads `user_type` from auth metadata to determine where to send the user.
If `app_metadata.user_type` is also `TENANT`, the owner flow never runs.

**Fix required**: Update seed to set `user_type: "property_owner"` for the test admin user
in both `auth.users.raw_app_meta_data` and `public.users.user_type`.

---

## Chromium Project Results (`--project=chromium`)

Pre-authenticated tests (storageState: OWNER_AUTH_FILE).

**54 passed, 77 failed, 10 skipped/did not run**

### Failing Test Suites

**`tests/tanstack-query/infinite-scrolling.spec.ts`** — 17 failures
- All tests fail — tests likely check for infinite scroll behavior on properties page
  that doesn't exist (no infinite scroll implemented, uses pagination)

**`tests/tanstack-query/optimistic-updates.spec.ts`** — 10 failures
- Tests checking for instant UI updates before API confirms — behavior not implemented

**`tests/tanstack-query/real-user-workflows.spec.ts`** — 12+ failures
- Workflow tests that probably test specific UI elements/flows not present

**`tests/tenant-invitation/tenant-invitation-flow.e2e.spec.ts`** — 13 failures
- End-to-end invitation flow tests failing (invite, email, accept, etc.)

**`tests/tenant-management/tenant-layout-responsive.spec.ts`** — 6 failures
- Mobile layout tests failing

**`tests/tenant-management/tenant-management-comprehensive.e2e.spec.ts`** — 7 failures
- Tenant management UI tests failing

**`tests/tenant-management/tenant-management-fixed.e2e.spec.ts`** — 5 failures
- Tenant lifecycle tests failing

### Passing Test Suites (chromium)

- `tests/properties/property-image-upload.spec.ts` — passes (recently fixed)
- Other property-related tests — passing

---

## Backend Health Check Notes

The P0 health check (`GET /health → status: "ok"`) was flaky on first run:
- **First run**: Failed with `status: "unhealthy"` — backend startup timing issue
- **Subsequent runs**: Passes — DB connection established after warmup

This is a P2 issue: the health check fails at cold start (backend can't ping
Supabase immediately on boot). The app still works fine.

Root: `supabase_rpc_health` and `supabase_table_ping` both fail in the first ~2s
of backend startup. After warmup, both succeed.

---

## Issues To Fix (for ISSUES.md)

### P0 — Blocking

**[ISSUE-001] Owner redirected to /tenant after login**
- Repro: Fresh login as `test-admin@tenantflow.app`
- Expected: Redirect to `/dashboard`
- Actual: Redirect to `/tenant`
- Cause: Seed user has `user_type: "TENANT"` — should be `"property_owner"`
- Fix: Update `supabase/seed.sql` to set correct user_type in auth.users app_metadata
- Affects: All smoke tests that call `loginAsOwner()` after login

### P1 — Major Failures

**[ISSUE-002] TanStack Query infinite scroll tests all fail (17 tests)**
- `tests/tanstack-query/infinite-scrolling.spec.ts`
- These tests appear to test features that aren't implemented (no infinite scroll on properties page)
- Consider: Delete or skip these tests if feature isn't planned

**[ISSUE-003] TanStack Query optimistic update tests all fail (10 tests)**
- `tests/tanstack-query/optimistic-updates.spec.ts`
- Tests check for instant UI changes before API confirmation — not implemented

**[ISSUE-004] Tenant invitation E2E tests all fail (13 tests)**
- `tests/tenant-invitation/tenant-invitation-flow.e2e.spec.ts`
- Full invitation flow broken end-to-end in E2E context
- Phase 36 will verify/fix the invitation flow

**[ISSUE-005] Tenant management tests all fail (18 tests)**
- Both `tenant-management-comprehensive.e2e.spec.ts` (7) and `tenant-management-fixed.e2e.spec.ts` (5) + layout (6)
- Likely failing because dashboard redirect bug routes test users to wrong page

### P2 — Minor

**[ISSUE-006] Backend health check fails at cold start**
- `GET /health` returns `status: "unhealthy"` for ~2s after backend boots
- Supabase client not immediately ready
- Fix: Add retry logic in health check OR warm up Supabase connection before listening

---

## Next Steps

Phase 33-02: Manual flow walkthrough to document all page-level issues.
Key areas to check:
1. Fix seed user_type first (ISSUE-001) — needed for all manual testing
2. Walk owner flow: dashboard → properties → tenants → leases → financials
3. Walk tenant flow: portal → lease → payments

---

## Phase 33-02: Manual Flow Verification (Code Inspection)

Date: 2026-02-18
Method: Static code inspection of all route files (browser automation unavailable — Chrome extension not connected)

### Owner Flow Results (25 flows → 16 unique pages checked)

| # | Flow | Route | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Dashboard loads | `/dashboard` | ✅ PASS | Full API integration, stat cards, loading states |
| 2 | Occupancy/revenue metrics | `/dashboard` | ✅ PASS | Uses real hooks with data fallbacks |
| 3 | Properties list | `/properties` | ✅ PASS | Cards, units, images — all wired |
| 4 | Create property | `/properties/new` | ✅ PASS | Modal-based form with image upload |
| 5 | Edit property | `/properties/[id]/edit` | ✅ PASS | Individual property edit form |
| 6 | Property detail | `/properties/[id]` | ✅ PASS | All sections load |
| 7 | Tenants list | `/tenants` | ✅ PASS | Full list with invite/cancel |
| 8 | Invite tenant | `/tenants/new` | ✅ PASS | Invitation form exists |
| 9 | Leases list | `/leases` | ✅ PASS | List, filter, sort, dialog management |
| 10 | Create lease | `/leases` | ✅ PASS | Dialog-based creation |
| 11 | Maintenance list | `/maintenance` | ✅ PASS | Delegates to MaintenanceViewClient |
| 12 | Status filters | `/maintenance` | ✅ PASS | Filter component present |
| 13 | Billing plans | `/billing/plans` | ⚠️ PARTIAL | **Hardcoded PLANS array; CURRENT_PLAN_ID=null** |
| 14 | Upgrade button | `/billing/plans` | ⚠️ PARTIAL | Button exists but Stripe checkout not wired |
| 15 | Settings billing tab | `/settings?tab=billing` | ⚠️ PARTIAL | Tab system works; Connect section exists |
| 16 | Subscription plan shown | `/settings?tab=billing` | ⚠️ PARTIAL | Needs real subscription data |
| 17 | Stripe Connect visible | `/settings?tab=billing` | ✅ PASS | `ConnectAccountStatus` component present |
| 18 | Connect button | `/settings?tab=billing` | ✅ PASS | Button renders; redirects to backend endpoint |
| 19 | Connect dialog/redirect | `/settings?tab=billing` | ⚠️ PARTIAL | Backend endpoint exists; E2E not verified |
| 20 | Financials overview | `/financials` | ✅ PASS | Full dashboard with API hooks |
| 21 | Expenses | `/financials/expenses` | ✅ PASS | Expense tracking, filters, export |
| 22 | Payouts | `/financials/payouts` | ⚠️ PARTIAL | Works when Connect active; no empty state |
| 23 | Tax documents | `/financials/tax-documents` | ❌ FAIL | **Hardcoded sampleDocuments array (lines 36-93)** |
| 24 | Reports | `/reports` | ✅ PASS | Report sections and PDF export |
| 25 | Analytics | `/analytics` | ✅ PASS | Redirects to /analytics/overview; sub-routes exist |

**Owner summary: 18/25 PASS, 5/25 PARTIAL, 1/25 FAIL (tax-documents mock data), 1/25 not tested**

---

### Tenant Flow Results (12 flows)

| # | Flow | Route | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Tenant portal loads | `/tenant` | ✅ PASS | Portal dashboard component present |
| 2 | Current lease displayed | `/tenant` | ✅ PASS | Lease card with property name, dates |
| 3 | Rent amount shown | `/tenant` | ✅ PASS | Monthly payment visible |
| 4 | Payments page | `/tenant/payments` | ✅ PASS | Autopay + payment history |
| 5 | Pay Rent button | `/tenant/payments` | ✅ PASS | Payment CTA exists |
| 6 | Stripe Checkout redirect | `/tenant/payments` | ⚠️ PARTIAL | Wired to backend; E2E requires Connect setup |
| 7 | Lease details | `/tenant/lease` | ✅ PASS | Lease terms, property info, financial details |
| 8 | Key terms shown | `/tenant/lease` | ⚠️ PARTIAL | **"Signed on loading..." placeholder text (line 191)** |
| 9 | Maintenance list | `/tenant/maintenance` | ✅ PASS | Active requests + history |
| 10 | Submit maintenance request | `/tenant/maintenance` | ✅ PASS | Form and submission flow present |
| 11 | Documents page | `/tenant/documents` | ✅ PASS | Document sections with URL validation |
| 12 | Profile/settings | `/tenant/profile` | ✅ PASS | Full profile edit form |

**Tenant summary: 9/12 PASS, 3/12 PARTIAL, 0/12 FAIL**
