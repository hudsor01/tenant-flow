# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones
- 🚧 **v1.0 Production Hardening** - Phases 1-9 (in progress)

### v1.0 Production Hardening (Phases 1-9)

**Milestone Goal:** Fix all 131 findings from the comprehensive 8-agent review (22 P0, 35 P1, 46 P2, 28 P3). Phases ordered by exploitability and harm: RPC data exfiltration first, financial bugs second, remaining security third, then code quality, database, UX, performance, and testing. DOC-01 (CLAUDE.md rewrite) is a recurring task executed at the end of every phase.

- [x] **Phase 1: RPC & Database Security** - Close 12+ SECURITY DEFINER data exfiltration vectors and fix database-level auth
- [ ] **Phase 2: Financial Fixes** - Fix cents/dollars bugs, rent_due status, autopay RLS, and all payment processing issues
- [ ] **Phase 3: Auth & Middleware** - Register middleware, enforce role-based routing, fix session validation and auth flows
- [ ] **Phase 4: Edge Function Hardening** - Add env validation, rate limiting, input escaping, CSP, and version alignment
- [ ] **Phase 5: Code Quality & Type Safety** - Remove type assertions, fix query keys, consolidate duplicates, split oversized files
- [ ] **Phase 6: Database Schema & Migrations** - Fix constraints, RLS gaps, cron jobs, and schema inconsistencies
- [ ] **Phase 7: UX & Accessibility** - Fix text-muted visibility, add aria-labels, error boundaries, and responsive fixes
- [ ] **Phase 8: Performance Optimization** - Parallelize waterfalls, code-split charts, consolidate redundant queries
- [ ] **Phase 9: Testing & CI Pipeline** - Add next build to CI, coverage enforcement, Edge Function tests, RLS test gaps

## Phase Details

### Phase 1: RPC & Database Security
**Goal**: No RPC function can be called to access another user's data
**Depends on**: Nothing (first phase — actively exploitable in production)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, SEC-12, DOC-01
**Success Criteria** (what must be TRUE):
  1. Calling any SECURITY DEFINER RPC with a `p_user_id` different from the caller's `auth.uid()` returns an error or empty result
  2. Error monitoring RPCs return only the calling user's error data, not all users
  3. `activate_lease_with_pending_subscription` and `sign_lease_and_check_activation` reject callers who are not the lease owner or valid signer
  4. All SECURITY DEFINER functions have `SET search_path TO 'public'` and no dynamic SQL injection vectors
  5. `FOR ALL` policies on authenticated tables are replaced with per-operation policies
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Add auth.uid() guards to all 25 SECURITY DEFINER RPCs + search_path fixes + health_check INVOKER
- [x] 01-02-PLAN.md — Lease RPC auth, error monitoring restrictions, FOR ALL cleanup, trigger fixes, CLAUDE.md update

### Phase 2: Financial Fixes
**Goal**: All payment flows charge correct amounts, update correct statuses, and handle edge cases safely
**Depends on**: Phase 1
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, PAY-09, PAY-10, PAY-11, PAY-12, PAY-13, PAY-14, PAY-15, PAY-16, PAY-17, PAY-18, PAY-19, PAY-20, PAY-21, PAY-22, DOC-01
**Success Criteria** (what must be TRUE):
  1. A tenant paying rent is charged the exact dollar amount shown on screen — no 100x overcharge or double-division
  2. After successful payment, `rent_due.status` is `paid` and `rent_payments` record has correct `amount` in consistent units
  3. A tenant can toggle autopay on/off from their portal, and autopay charges exactly one payment per `rent_due` regardless of shared lease
  4. Stripe webhook processing is idempotent — replayed webhooks do not create duplicate payments or corrupt state
  5. Platform subscription failures are tracked and surfaced to the owner
**Plans**: 6 plans

Plans:
- [ ] 02-01-PLAN.md — Database schema changes (numeric amounts, retry columns, constraints) and atomic RPCs (record_rent_payment, set_default_payment_method, toggle_autopay)
- [ ] 02-02-PLAN.md — Stripe SDK upgrade to v20 + webhook handler fixes (idempotency, metadata validation, onboarding preservation, fee receipts, invoice.payment_failed)
- [ ] 02-03-PLAN.md — Rent checkout and autopay Edge Functions (per-tenant portions, idempotency keys, redirect URLs, pg_cron retry logic, autopay failure notifications)
- [ ] 02-04-PLAN.md — Frontend payment hooks (atomic default swap, Stripe detach Edge Function, billing hooks, subscription status + banner, currency formatting, plan limits, tenant portal per-tenant display)
- [ ] 02-05-PLAN.md — Onboarding backfill migration and CLAUDE.md update with Phase 2 conventions
- [ ] 02-06-PLAN.md — Diagnose and fix stale Stripe sync engine (down since 2025-12-11), backfill missing data

### Phase 3: Auth & Middleware
**Goal**: Every route is protected by role-appropriate access control with server-validated sessions
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12, AUTH-13, AUTH-14, AUTH-15, AUTH-16, AUTH-17, DOC-01
**Success Criteria** (what must be TRUE):
  1. Middleware executes on every request — tenant users accessing `/owner/*` routes are redirected to tenant portal, and vice versa
  2. Session validation uses `getUser()` (server-verified) throughout — no `getSession()` for auth decisions
  3. Tenant invitation acceptance requires a valid JWT — unauthenticated callers cannot accept invitations
  4. OAuth callback verifies email ownership before auto-accepting invitations
  5. Login redirect parameter, signout method, and OTP type are all validated against injection and CSRF
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Edge Function Hardening
**Goal**: All Edge Functions fail-fast on missing config, reject abuse, and never leak internal errors
**Depends on**: Phase 2, Phase 3
**Requirements**: EDGE-01, EDGE-02, EDGE-03, EDGE-04, EDGE-05, EDGE-06, EDGE-07, EDGE-08, EDGE-09, EDGE-10, EDGE-11, EDGE-12, EDGE-13, EDGE-14, DOC-01
**Success Criteria** (what must be TRUE):
  1. Every Edge Function validates required env vars on startup — missing vars cause immediate failure with clear error, not silent empty-string behavior
  2. Unauthenticated Edge Functions (`tenant-invitation-accept`, `tenant-invitation-validate`, `stripe-checkout-session`) enforce rate limits
  3. All user-provided values interpolated into HTML (DocuSeal, PDF) are escaped — no XSS in generated documents
  4. `Content-Security-Policy` header is served on all pages via `vercel.json`
  5. Error responses return generic messages — no `dbError.message` or stack traces exposed to clients
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Code Quality & Type Safety
**Goal**: Codebase has zero type escape hatches, consistent query cache behavior, and all files under size limits
**Depends on**: Phase 2
**Requirements**: CODE-01, CODE-02, CODE-03, CODE-04, CODE-05, CODE-06, CODE-07, CODE-08, CODE-09, CODE-10, CODE-11, CODE-12, CODE-13, CODE-14, CODE-15, CODE-16, CODE-17, CODE-18, CODE-19, CODE-20, CODE-21, CODE-22, DOC-01
**Success Criteria** (what must be TRUE):
  1. Zero `as unknown as` type assertions remain in API hooks — all Supabase queries use proper Database types
  2. All mutation `onSuccess` handlers use canonical query key factories and invalidate dashboard keys on entity changes
  3. No hook file exceeds 300 lines — oversized files (`use-tenant-portal.ts` 1351, `use-reports.ts` 923, etc.) split into focused modules
  4. Stub hooks either return real data or their UI routes show "coming soon" instead of fake zeros
  5. `pnpm typecheck && pnpm lint` passes with zero `eslint-disable @tanstack/query/exhaustive-deps` suppressions
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Database Schema & Migrations
**Goal**: All tables have correct constraints, FK relationships, and operational maintenance jobs
**Depends on**: Phase 1
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11, DB-12, DOC-01
**Success Criteria** (what must be TRUE):
  1. `activity.user_id` is NOT NULL with FK constraint — `documents` table has `owner_user_id` column with authenticated RLS policies
  2. `leases` table has a single owner column (not dual `property_owner_id` + `owner_user_id`)
  3. `expire-leases` cron uses a named function with `FOR UPDATE SKIP LOCKED` and error handling
  4. Cleanup cron jobs are scheduled for `security_events`, `errors`, and `stripe_webhook_events`
  5. All cron jobs have Sentry monitoring for failure detection
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: UX & Accessibility
**Goal**: All text is readable, all interactive elements are accessible, and error states are handled gracefully
**Depends on**: Phase 5
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10, UX-11, UX-12, UX-13, UX-14, UX-15, UX-16, UX-17, UX-18, UX-19, UX-20, UX-21, UX-22, UX-23, UX-24, UX-25, UX-26, DOC-01
**Success Criteria** (what must be TRUE):
  1. All muted text is visible — zero instances of `text-muted` (replaced with `text-muted-foreground`) and no invalid Tailwind classes
  2. Screen reader users can navigate via skip-to-content link, aria-labels on all icon buttons, and labeled breadcrumb nav
  3. Navigating to a nonexistent lease/tenant/maintenance/inspection/unit ID shows a styled 404 page, not an unhandled error
  4. Tenant delete actually removes the tenant (with confirmation dialog), not a console.log stub
  5. Mobile users can use kanban boards, see breadcrumbs, and dismiss sidebar overlay with keyboard
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD

### Phase 8: Performance Optimization
**Goal**: Page loads are fast with no unnecessary waterfalls, oversized bundles, or redundant queries
**Depends on**: Phase 5
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06, PERF-07, PERF-08, PERF-09, PERF-10, PERF-11, PERF-12, PERF-13, PERF-14, PERF-15, PERF-16, PERF-17, PERF-18, PERF-19, PERF-20, PERF-21, PERF-22, PERF-23, PERF-24, DOC-01
**Success Criteria** (what must be TRUE):
  1. Tenant portal loads amount due in a single parallel fetch — no 5-step waterfall, no 8x redundant tenant ID resolution
  2. Recharts and react-markdown are dynamically imported — initial JS bundle does not include chart libraries on non-chart pages
  3. Maintenance stats (7 queries) and lease stats (6 queries) each consolidate to a single RPC call
  4. All list queries have `.limit()` or pagination — no unbounded `select('*')` on growing tables
  5. Edge Functions parallelize independent DB queries — no sequential lookups where `Promise.all()` applies
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Testing & CI Pipeline
**Goal**: CI catches build failures, coverage regressions, and security issues before merge
**Depends on**: Phase 5, Phase 6
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, TEST-10, TEST-11, TEST-12, TEST-13, TEST-14, TEST-15, TEST-16, TEST-17, TEST-18, TEST-19, TEST-20, TEST-21, DOC-01
**Success Criteria** (what must be TRUE):
  1. CI pipeline runs `next build` and fails the PR if build errors exist
  2. Coverage threshold (80%) is enforced — PRs that drop coverage below threshold are blocked
  3. Critical Edge Functions (stripe-webhooks, stripe-rent-checkout, stripe-autopay-charge, tenant-invitation-accept) have unit tests
  4. RLS integration tests cover `rent_payments`, `payment_methods`, `documents`, `notifications` and run on every PR (not just weekly)
  5. Security scanning (gitleaks, trivy) runs in CI and blocks PRs with detected secrets or critical vulnerabilities
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. RPC & Database Security | v1.0 | 2/2 | Complete | 2026-03-04 |
| 2. Financial Fixes | v1.0 | 0/6 | Not started | - |
| 3. Auth & Middleware | v1.0 | 0/2 | Not started | - |
| 4. Edge Function Hardening | v1.0 | 0/2 | Not started | - |
| 5. Code Quality & Type Safety | v1.0 | 0/3 | Not started | - |
| 6. Database Schema & Migrations | v1.0 | 0/2 | Not started | - |
| 7. UX & Accessibility | v1.0 | 0/3 | Not started | - |
| 8. Performance Optimization | v1.0 | 0/3 | Not started | - |
| 9. Testing & CI Pipeline | v1.0 | 0/3 | Not started | - |
