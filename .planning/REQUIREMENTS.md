# Requirements: TenantFlow v1.0 Production Hardening

**Defined:** 2026-03-04
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials — without touching a spreadsheet or calling anyone.
**Source:** Comprehensive 8-agent review — `.planning/REVIEW-2026-03-04.md`

## v1.0 Requirements

All 131 findings from the review, plus CLAUDE.md maintenance.

### Security — RPC & Database Auth

- [x] **SEC-01**: All 12+ SECURITY DEFINER RPC functions validate `p_user_id = auth.uid()` before executing (`get_dashboard_stats`, `get_dashboard_data_v2`, `get_billing_insights`, `get_maintenance_analytics`, `get_metric_trend`, `get_property_performance_cached`, `get_property_performance_trends`, `get_occupancy_trends_optimized`, `get_revenue_trends_optimized`, `get_dashboard_time_series`, `get_user_dashboard_activities`, `get_user_profile`)
- [x] **SEC-02**: Error monitoring RPCs (`get_error_summary`, `get_common_errors`, `get_error_prone_users`) restricted to own-user data only
- [x] **SEC-03**: `activate_lease_with_pending_subscription` verifies caller is lease owner via `auth.uid()`
- [x] **SEC-04**: `sign_lease_and_check_activation` verifies caller identity matches signer_type
- [x] **SEC-05**: All SECURITY DEFINER functions have `SET search_path TO 'public'`
- [x] **SEC-06**: `FOR ALL` policies on authenticated tables replaced with per-operation policies (`storage.objects`, `user_tour_progress`, `users`, `tenants` service_role)
- [x] **SEC-07**: `security_events` ENUMs replaced with text + CHECK constraints
- [x] **SEC-08**: `get_current_owner_user_id()` rewritten with static SQL (no dynamic `EXECUTE format()`)
- [x] **SEC-09**: `health_check()` changed from SECURITY DEFINER to SECURITY INVOKER
- [x] **SEC-10**: `cleanup_old_security_events` and `cleanup_old_errors` add `SET search_path`
- [x] **SEC-11**: `notify_critical_error` trigger fixed to detect system-wide spikes (not per-user only)
- [x] **SEC-12**: `log_user_error` rate-limited to prevent fake alert flooding via `pg_notify`

### Security — Auth & Middleware

- [x] **AUTH-01**: Middleware correctly registered (`middleware.ts` exporting `middleware`) and verified executing
- [x] **AUTH-02**: Role-based route enforcement — tenants redirected from owner routes, owners from tenant routes
- [x] **AUTH-03**: `AuthProvider` uses `getUser()` instead of `getSession()` for session initialization
- [x] **AUTH-04**: `tenant-invitation-accept` requires JWT — `authuser_id` derived from verified token
- [x] **AUTH-05**: `stripe-checkout-session` requires authentication or returns minimal data only
- [x] **AUTH-06**: Module-level Supabase client in `use-auth.ts` moved inside mutation functions
- [x] **AUTH-07**: `getCachedUser()` validates session server-side, not just local cache
- [x] **AUTH-08**: OAuth callback verifies `email_confirmed_at` before auto-accepting invitations
- [x] **AUTH-09**: `accept-invite` page sends Authorization header when calling edge function
- [x] **AUTH-10**: `post-checkout` page does not send magic link based on unauthenticated edge function response
- [x] **AUTH-11**: Signout requires POST (not triggerable via GET/img tag)
- [x] **AUTH-12**: Login `redirect` parameter validated via `new URL()` hostname check (not just startsWith)
- [x] **AUTH-13**: `x-forwarded-host` header sanitized or ignored in OAuth callback redirect URL construction
- [x] **AUTH-14**: `select-role` page UPDATE restricted to users with current `user_type = 'PENDING'` via RLS
- [x] **AUTH-15**: `verifyOtp` type parameter validated against known types before cast
- [x] **AUTH-16**: Dual auth query key systems (`authQueryKeys` vs `authKeys`) unified — `clearAuthData()` clears all namespaces
- [x] **AUTH-17**: `confirm-email` page uses `getUser()` instead of `getSession()` for email extraction

### Security — Edge Functions & Headers

- [x] **EDGE-01**: All 13 Edge Functions validate required env vars on startup (fail-fast, not empty string)
- [x] **EDGE-02**: Rate limiting on unauthenticated Edge Functions (`tenant-invitation-accept`, `tenant-invitation-validate`, `stripe-checkout-session`)
- [ ] **EDGE-03**: HTML-escape all interpolated values in DocuSeal and generate-pdf templates
- [x] **EDGE-04**: Content-Security-Policy header added to `vercel.json`
- [x] **EDGE-05**: Stripe SDK version aligned — single version across Edge Functions and Next.js
- [ ] **EDGE-06**: Edge Functions use user JWT client for reads where possible (not service_role everywhere)
- [x] **EDGE-07**: Error responses return generic messages, not `dbError.message` or `err.message`
- [x] **EDGE-08**: `stripe-connect` `limit` parameter capped to maximum (e.g., 100)
- [ ] **EDGE-09**: Invitation code moved from URL query parameter to fragment or exchange token
- [x] **EDGE-10**: CORS returns restrictive headers when `FRONTEND_URL` not set (fail-closed, not fail-open)
- [x] **EDGE-11**: Sentry tunnel `/monitoring` endpoint rate-limited
- [x] **EDGE-12**: Supabase SDK version aligned between Deno import map (2.49.4) and Next.js (2.97.0)
- [x] **EDGE-13**: Stripe API version updated from `2024-06-20` to current, tested
- [x] **EDGE-14**: `Vary: Authorization, Cookie` on public property pages reviewed for CDN safety

### Payments — Financial Fixes

- [x] **PAY-01**: Consistent cents/dollars convention documented and enforced — `rent_due.amount` semantics clarified, `* 100` verified
- [x] **PAY-02**: `rent_due.status` updated to `'paid'` in webhook after successful payment
- [x] **PAY-03**: Tenant can enable/disable autopay — RLS policy for tenant lease UPDATE on autopay columns
- [x] **PAY-04**: `stripe-checkout-status` Edge Function created or hooks corrected to use `stripe-checkout-session`
- [x] **PAY-05**: Payment display uses correct amount units — no double-division in `formatCents()`
- [x] **PAY-06**: `rent_payments.amount` column changed to `numeric(10,2)` to preserve cents
- [x] **PAY-07**: Payment method deletion calls `stripe.paymentMethods.detach()` before DB row deletion
- [x] **PAY-08**: Idempotency key on autopay `paymentIntents.create`
- [x] **PAY-09**: Platform subscription webhook handling (`invoice.payment_failed`, status tracking on `users` table)
- [x] **PAY-10**: Webhook `rent_payments` insert validates `tenant_id`/`lease_id` metadata (no empty string fallback)
- [x] **PAY-11**: `onboarding_completed_at` preserved when already set — not wiped on non-completed `account.updated`
- [x] **PAY-12**: Plan limit enforcement (`get_user_plan_limits`, `check_user_feature_access`) called from frontend before create operations
- [x] **PAY-13**: Autopay retry mechanism for failed charges (re-attempt on subsequent days, not just `due_date = current_date`)
- [x] **PAY-14**: Autopay handles shared leases correctly (one charge per rent_due, not per tenant)
- [x] **PAY-15**: Webhook failure does not delete idempotency record — partial processing handled safely
- [x] **PAY-16**: `setDefaultPaymentMethod` uses transaction (not clear-then-set race condition)
- [x] **PAY-17**: Stripe API version consistent between Edge Functions and Next.js API route
- [x] **PAY-18**: Owner payment receipt email includes fee breakdown (platform fee, Stripe fee, net amount)
- [x] **PAY-19**: `useSubscriptionStatus` checks actual subscription status, not just `stripe_customer_id` existence
- [x] **PAY-20**: Billing hooks (`useInvoices`, `useSubscriptionBillingHistory`, `useFailedPaymentAttempts`) implemented or UI disabled
- [x] **PAY-21**: Success/cancel redirect URLs include `rent_due_id` or `session_id` for verification
- [x] **PAY-22**: `rent_due` table verified to have service_role write policies (may have been dropped in migration simplification)

### Code Quality — Type Safety & Correctness

- [x] **CODE-01**: Fake table cast `from('reports' as 'properties')` removed
- [x] **CODE-02**: 50+ `as unknown as` type assertions replaced with proper Supabase Database types or mapper functions
- [x] **CODE-03**: All mutation `onSuccess` handlers use canonical query key factories (not string literals)
- [x] **CODE-04**: All property/tenant/lease delete mutations invalidate `ownerDashboardKeys.all`
- [x] **CODE-05**: Duplicate local types consolidated with `src/shared/types/` canonical types
- [x] **CODE-06**: Stub hooks (10+ in `use-reports.ts`, `use-financials.ts`) implemented or UI routes disabled
- [x] **CODE-07**: Duplicate `GeneralSettings` component deleted — single source of truth
- [x] **CODE-08**: `useLeaseList` select function is pure (no `queryClient.setQueryData` side effects)
- [x] **CODE-09**: `tenantPortalQueries.payments()` column references fixed (`amount_cents` -> `amount`, `paid_at` -> `paid_date`)
- [x] **CODE-10**: `isSuccessfulPaymentStatus` uses correct status values per DB schema (`pending | processing | succeeded | failed | canceled`)
- [x] **CODE-11**: Hook files split to stay under 300 lines (`use-tenant-portal.ts` 1351, `use-reports.ts` 923, `use-tenant.ts` 838, `use-lease.ts` 660, `use-financials.ts` 565, `use-payments.ts` 586, `use-owner-dashboard.ts` 562, `use-inspections.ts` 482, `use-billing.ts` 403)
- [x] **CODE-12**: `tour.tsx` (1732 lines) split into separate subcomponents
- [x] **CODE-13**: `stripe-webhooks/index.ts` (691 lines) split into handler modules
- [x] **CODE-14**: Page components exceeding 300 lines refactored (`dashboard/page.tsx` 373, `properties/page.tsx` 393, `tenants/page.tsx` 378, `reports/generate/page.tsx` 400)
- [x] **CODE-15**: 63 `'use client'` page files audited — push directive down to leaf components where possible
- [x] **CODE-16**: 8 `eslint-disable @tanstack/query/exhaustive-deps` suppressions resolved or rule configured globally
- [x] **CODE-17**: Duplicate `get_revenue_trends_optimized` RPC calls deduplicated (3 hooks calling same RPC -> shared query)
- [x] **CODE-18**: `owner_user_id` access in `use-tenant-portal.ts:365` uses proper `.select()` column (not double-cast)
- [x] **CODE-19**: `@radix-ui/react-icons` removed — project uses `lucide-react`
- [x] **CODE-20**: Dead `SseProvider` removed from provider tree
- [x] **CODE-21**: 25+ TODO comments referencing "phase-57" converted to tracked issues or removed
- [x] **CODE-22**: `console.log` for unhandled webhook event types replaced with structured logging or removed

### Database — Schema & Migrations

- [x] **DB-01**: `activity` table `user_id` gets NOT NULL + FK constraint
- [x] **DB-02**: `documents` table gets `owner_user_id` column + authenticated RLS policies
- [x] **DB-03**: `leases` table dual-column (`property_owner_id` + `owner_user_id`) cleaned up — single column
- [x] **DB-04**: GDPR soft-delete on `users` enforced on related tables (properties, leases, etc.)
- [x] **DB-05**: `expire-leases` cron rewritten as named function with `FOR UPDATE SKIP LOCKED` and error handling
- [x] **DB-06**: `cleanup_old_security_events` cron job scheduled
- [x] **DB-07**: `cleanup_old_errors` cron job scheduled
- [x] **DB-08**: Cron job Sentry monitoring added for `calculate_late_fees`, `queue_lease_reminders`, `expire-leases`
- [x] **DB-09**: `stripe_webhook_events.data` retention policy (cleanup old events)
- [x] **DB-10**: `inspection_photos` gets `updated_at` column + trigger for consistency
- [x] **DB-11**: `blogs` table gets author/user_id column for audit trail
- [x] **DB-12**: `update_updated_at_column` duplicate function consolidated with `set_updated_at`

### UX — Visibility & Accessibility

- [x] **UX-01**: `text-muted` replaced with `text-muted-foreground` across all 69 files (150 occurrences)
- [x] **UX-02**: `text-muted/600` invalid class fixed in `stripe-connect-status.tsx`
- [x] **UX-03**: Tenant delete functionality implemented (real mutation, not log-only handler)
- [x] **UX-04**: Confirmation dialog added for tenant deletion (matching property delete pattern)
- [x] **UX-05**: Skip-to-content link added to app shell and tenant shell
- [x] **UX-06**: `aria-label` on hamburger menu buttons (both shells)
- [x] **UX-07**: `aria-label` on notification bell link
- [x] **UX-08**: `aria-label` on reports scheduled list toggle button
- [x] **UX-09**: `aria-label` on dropzone remove-file button
- [x] **UX-10**: `aria-label` on tenant grid action buttons (replace `title` with `aria-label`)
- [x] **UX-11**: Breadcrumb `<nav>` gets `aria-label="Breadcrumb"`
- [x] **UX-12**: Hardcoded `bg-white` replaced with `bg-background` (preview-panel, QR code, slider, notification toggles)
- [x] **UX-13**: Custom toggle switches replaced with shadcn Switch component
- [x] **UX-14**: `not-found.tsx` added for dynamic routes (leases/[id], tenants/[id], maintenance/[id], inspections/[id], units/[id])
- [x] **UX-15**: `error.tsx` added for `(auth)`, `auth/`, `blog/`, `pricing/` route groups
- [x] **UX-16**: Page metadata/titles exported from all owner and tenant pages
- [x] **UX-17**: Unsaved form data protection (`beforeunload` on multi-step forms)
- [x] **UX-18**: Kanban board responsive columns (not fixed 300px/220px requiring 1500px+ viewport)
- [x] **UX-19**: Breadcrumbs visible on mobile (not `hidden sm:flex`)
- [x] **UX-20**: Mobile sidebar overlay keyboard-accessible (Escape key handler, focus management)
- [x] **UX-21**: `autoFocus` on primary form inputs (login email, property name, etc.)
- [x] **UX-22**: Login page Suspense fallback styled (not plain "Loading..." text)
- [x] **UX-23**: `pb-24` bottom padding on owner shell conditional to mobile only (not desktop)
- [x] **UX-24**: Consistent empty state component usage across all list pages
- [x] **UX-25**: Property detail loading state uses skeleton pattern (not plain text animate-pulse)
- [x] **UX-26**: Raw color classes in `property-details.client.tsx` replaced with semantic design tokens

### Performance — Data Fetching & Rendering

- [ ] **PERF-01**: Tenant portal `amountDue` 5-step waterfall parallelized
- [ ] **PERF-02**: Shared tenant ID resolution — single cached query reused across all 8 tenant portal hooks
- [ ] **PERF-03**: Recharts code-split via `next/dynamic` in all 17 statically-importing files
- [ ] **PERF-04**: `react-markdown` + rehype/remark dynamically imported on blog pages
- [ ] **PERF-05**: `refetchOnWindowFocus` default changed from `'always'` to `true`
- [ ] **PERF-06**: `@tanstack/react-virtual` used for property, tenant, lease, maintenance lists
- [ ] **PERF-07**: Maintenance stats consolidated from 7 HEAD queries to single grouped RPC
- [ ] **PERF-08**: Lease stats consolidated from 6 queries to single RPC
- [ ] **PERF-09**: `optimizePackageImports` added to `next.config.ts`
- [x] **PERF-10**: `stripe-webhooks` email rendering optimized (pre-built HTML or background queue)
- [x] **PERF-11**: `stripe-webhooks` sequential charge retrieval + late_fee query parallelized
- [x] **PERF-12**: `stripe-autopay-charge` 3 sequential DB lookups parallelized with `Promise.all()`
- [x] **PERF-13**: `stripe-rent-checkout` sequential DB queries parallelized where independent
- [ ] **PERF-14**: Blog queries add pagination and column filtering (not `select('*')` unbounded)
- [ ] **PERF-15**: Maintenance `urgent()` and `overdue()` queries add `.limit()`
- [ ] **PERF-16**: Tenant portal maintenance counts computed via DB (not fetch-all-then-count-in-JS)
- [ ] **PERF-17**: `select('*')` on join queries replaced with specific column selections
- [ ] **PERF-18**: Notifications query selects specific columns (not `select('*')`)
- [ ] **PERF-19**: Duplicate `get_occupancy_trends_optimized` calls deduplicated (dashboard + property analytics)
- [ ] **PERF-20**: Expiring leases query adds `.limit()`
- [ ] **PERF-21**: Raw `<img>` in file-upload-item replaced with `next/image`
- [ ] **PERF-22**: Stale CSS `@source` paths in `globals.css` removed
- [x] **PERF-23**: Edge Function `tenant-invitation-validate` response gets short cache headers
- [ ] **PERF-24**: `493 'use client'` files audited — remove directive from non-interactive leaf components

### Testing & CI Pipeline

- [ ] **TEST-01**: `next build` added as CI pipeline step
- [ ] **TEST-02**: `--coverage` flag added to CI — 80% threshold enforced
- [ ] **TEST-03**: E2E `playwright.config.ts` webServer path fixed (remove `apps/frontend`)
- [ ] **TEST-04**: Tests for critical Edge Functions (stripe-webhooks, stripe-rent-checkout, stripe-autopay-charge, tenant-invitation-accept)
- [ ] **TEST-05**: Tests for shared validation schemas (`src/shared/validation/` — payment-transactions, auth, leases minimum)
- [ ] **TEST-06**: Tests for shared utility functions (`src/shared/utils/` — billing, payment-dates, financial)
- [ ] **TEST-07**: RLS integration tests for `rent_payments`, `payment_methods`, `payment_transactions`
- [ ] **TEST-08**: RLS integration tests for `documents`, `notifications`, `notification_settings`, `subscriptions`, `tenant_invitations`
- [ ] **TEST-09**: Tenant-role RLS isolation tests (not just cross-owner)
- [ ] **TEST-10**: Security scanning (gitleaks, trivy) wired into CI
- [ ] **TEST-11**: RLS tests added to PR CI pipeline (not just weekly)
- [ ] **TEST-12**: E2E tests added to CI (at least on merge to main)
- [ ] **TEST-13**: Tests for Next.js API route (`attach-payment-method`)
- [ ] **TEST-14**: Tests for Supabase client utilities (`get-cached-user.ts`, `server.ts`)
- [ ] **TEST-15**: Skipped tests in `bulk-import-upload-step.test.tsx` resolved or tracked as issues
- [ ] **TEST-16**: `noUnusedLocals` and `noUnusedParameters` enabled in tsconfig
- [ ] **TEST-17**: `isolatedModules: true` set in tsconfig
- [ ] **TEST-18**: Lefthook pre-commit changed to not run RLS integration tests (move to pre-push)
- [ ] **TEST-19**: `checkJs: true` set in tsconfig for `.js`/`.cjs` files
- [ ] **TEST-20**: Stale monorepo references removed from `playwright.config.prod.ts`, E2E READMEs
- [ ] **TEST-21**: `.env.test` template created for E2E test configuration

### Documentation

- [x] **DOC-01**: CLAUDE.md rewritten to reflect current codebase state after each phase completes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first |
| GraphQL | PostgREST sufficient |
| MSW component test layer | Not blocking production — future milestone |
| Test data factories | Not blocking production — future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-05 | Phase 1 | Complete |
| SEC-06 | Phase 1 | Complete |
| SEC-07 | Phase 1 | Complete |
| SEC-08 | Phase 1 | Complete |
| SEC-09 | Phase 1 | Complete |
| SEC-10 | Phase 1 | Complete |
| SEC-11 | Phase 1 | Complete |
| SEC-12 | Phase 1 | Complete |
| PAY-01 | Phase 2 | Complete |
| PAY-02 | Phase 2 | Complete |
| PAY-03 | Phase 2 | Complete |
| PAY-04 | Phase 2 | Complete |
| PAY-05 | Phase 2 | Complete |
| PAY-06 | Phase 2 | Complete |
| PAY-07 | Phase 2 | Complete |
| PAY-08 | Phase 2 | Complete |
| PAY-09 | Phase 2 | Complete |
| PAY-10 | Phase 2 | Complete |
| PAY-11 | Phase 2 | Complete |
| PAY-12 | Phase 2 | Complete |
| PAY-13 | Phase 2 | Complete |
| PAY-14 | Phase 2 | Complete |
| PAY-15 | Phase 2 | Complete |
| PAY-16 | Phase 2 | Complete |
| PAY-17 | Phase 2 | Complete |
| PAY-18 | Phase 2 | Complete |
| PAY-19 | Phase 2 | Complete |
| PAY-20 | Phase 2 | Complete |
| PAY-21 | Phase 2 | Complete |
| PAY-22 | Phase 2 | Complete |
| AUTH-01 | Phase 3 | Complete |
| AUTH-02 | Phase 3 | Complete |
| AUTH-03 | Phase 3 | Complete |
| AUTH-04 | Phase 3 | Complete |
| AUTH-05 | Phase 3 | Complete |
| AUTH-06 | Phase 3 | Complete |
| AUTH-07 | Phase 3 | Complete |
| AUTH-08 | Phase 3 | Complete |
| AUTH-09 | Phase 3 | Complete |
| AUTH-10 | Phase 3 | Complete |
| AUTH-11 | Phase 3 | Complete |
| AUTH-12 | Phase 3 | Complete |
| AUTH-13 | Phase 3 | Complete |
| AUTH-14 | Phase 3 | Complete |
| AUTH-15 | Phase 3 | Complete |
| AUTH-16 | Phase 3 | Complete |
| AUTH-17 | Phase 3 | Complete |
| EDGE-01 | Phase 4 | Complete |
| EDGE-02 | Phase 4 | Complete |
| EDGE-03 | Phase 4 | Pending |
| EDGE-04 | Phase 4 | Complete |
| EDGE-05 | Phase 4 | Complete |
| EDGE-06 | Phase 4 | Pending |
| EDGE-07 | Phase 4 | Complete |
| EDGE-08 | Phase 4 | Complete |
| EDGE-09 | Phase 4 | Pending |
| EDGE-10 | Phase 4 | Complete |
| EDGE-11 | Phase 4 | Complete |
| EDGE-12 | Phase 4 | Complete |
| EDGE-13 | Phase 4 | Complete |
| EDGE-14 | Phase 4 | Complete |
| CODE-01 | Phase 5 | Complete |
| CODE-02 | Phase 5 | Complete |
| CODE-03 | Phase 5 | Complete |
| CODE-04 | Phase 5 | Complete |
| CODE-05 | Phase 5 | Complete |
| CODE-06 | Phase 5 | Complete |
| CODE-07 | Phase 5 | Complete |
| CODE-08 | Phase 5 | Complete |
| CODE-09 | Phase 5 | Complete |
| CODE-10 | Phase 5 | Complete |
| CODE-11 | Phase 5 | Complete |
| CODE-12 | Phase 5 | Complete |
| CODE-13 | Phase 5 | Complete |
| CODE-14 | Phase 5 | Complete |
| CODE-15 | Phase 5 | Complete |
| CODE-16 | Phase 5 | Complete |
| CODE-17 | Phase 5 | Complete |
| CODE-18 | Phase 5 | Complete |
| CODE-19 | Phase 5 | Complete |
| CODE-20 | Phase 5 | Complete |
| CODE-21 | Phase 5 | Complete |
| CODE-22 | Phase 5 | Complete |
| DB-01 | Phase 6 | Complete |
| DB-02 | Phase 6 | Complete |
| DB-03 | Phase 6 | Complete |
| DB-04 | Phase 6 | Complete |
| DB-05 | Phase 6 | Complete |
| DB-06 | Phase 6 | Complete |
| DB-07 | Phase 6 | Complete |
| DB-08 | Phase 6 | Complete |
| DB-09 | Phase 6 | Complete |
| DB-10 | Phase 6 | Complete |
| DB-11 | Phase 6 | Complete |
| DB-12 | Phase 6 | Complete |
| UX-01 | Phase 7 | Complete |
| UX-02 | Phase 7 | Complete |
| UX-03 | Phase 7 | Complete |
| UX-04 | Phase 7 | Complete |
| UX-05 | Phase 7 | Complete |
| UX-06 | Phase 7 | Complete |
| UX-07 | Phase 7 | Complete |
| UX-08 | Phase 7 | Complete |
| UX-09 | Phase 7 | Complete |
| UX-10 | Phase 7 | Complete |
| UX-11 | Phase 7 | Complete |
| UX-12 | Phase 7 | Complete |
| UX-13 | Phase 7 | Complete |
| UX-14 | Phase 7 | Complete |
| UX-15 | Phase 7 | Complete |
| UX-16 | Phase 7 | Complete |
| UX-17 | Phase 7 | Complete |
| UX-18 | Phase 7 | Complete |
| UX-19 | Phase 7 | Complete |
| UX-20 | Phase 7 | Complete |
| UX-21 | Phase 7 | Complete |
| UX-22 | Phase 7 | Complete |
| UX-23 | Phase 7 | Complete |
| UX-24 | Phase 7 | Complete |
| UX-25 | Phase 7 | Complete |
| UX-26 | Phase 7 | Complete |
| PERF-01 | Phase 8 | Pending |
| PERF-02 | Phase 8 | Pending |
| PERF-03 | Phase 8 | Pending |
| PERF-04 | Phase 8 | Pending |
| PERF-05 | Phase 8 | Pending |
| PERF-06 | Phase 8 | Pending |
| PERF-07 | Phase 8 | Pending |
| PERF-08 | Phase 8 | Pending |
| PERF-09 | Phase 8 | Pending |
| PERF-10 | Phase 8 | Complete |
| PERF-11 | Phase 8 | Complete |
| PERF-12 | Phase 8 | Complete |
| PERF-13 | Phase 8 | Complete |
| PERF-14 | Phase 8 | Pending |
| PERF-15 | Phase 8 | Pending |
| PERF-16 | Phase 8 | Pending |
| PERF-17 | Phase 8 | Pending |
| PERF-18 | Phase 8 | Pending |
| PERF-19 | Phase 8 | Pending |
| PERF-20 | Phase 8 | Pending |
| PERF-21 | Phase 8 | Pending |
| PERF-22 | Phase 8 | Pending |
| PERF-23 | Phase 8 | Complete |
| PERF-24 | Phase 8 | Pending |
| TEST-01 | Phase 9 | Pending |
| TEST-02 | Phase 9 | Pending |
| TEST-03 | Phase 9 | Pending |
| TEST-04 | Phase 9 | Pending |
| TEST-05 | Phase 9 | Pending |
| TEST-06 | Phase 9 | Pending |
| TEST-07 | Phase 9 | Pending |
| TEST-08 | Phase 9 | Pending |
| TEST-09 | Phase 9 | Pending |
| TEST-10 | Phase 9 | Pending |
| TEST-11 | Phase 9 | Pending |
| TEST-12 | Phase 9 | Pending |
| TEST-13 | Phase 9 | Pending |
| TEST-14 | Phase 9 | Pending |
| TEST-15 | Phase 9 | Pending |
| TEST-16 | Phase 9 | Pending |
| TEST-17 | Phase 9 | Pending |
| TEST-18 | Phase 9 | Pending |
| TEST-19 | Phase 9 | Pending |
| TEST-20 | Phase 9 | Pending |
| TEST-21 | Phase 9 | Pending |
| DOC-01 | All Phases | Complete |

**Coverage:**
- v1.0 requirements: 171 total (12 SEC + 17 AUTH + 14 EDGE + 22 PAY + 22 CODE + 12 DB + 26 UX + 24 PERF + 21 TEST + 1 DOC)
- Mapped to phases: 171
- Unmapped: 0

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 — traceability populated during roadmap creation*
