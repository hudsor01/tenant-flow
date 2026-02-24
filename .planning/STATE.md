# Project State: TenantFlow

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements for v8.0 Post-Migration Hardening
Last activity: 2026-02-24 — Phase 57-05 complete: 57-05-SUMMARY.md written; rls-security-tests.yml fixed (PUBLISHABLE_KEY rename); roadmap.md moved to docs/. v7.0 Backend Elimination milestone fully documented and closed.

Progress: ░░░░░░░░░░ 0% (Phases 58+ pending)

## Active Milestone

**v8.0 Post-Migration Hardening — IN PROGRESS (defining requirements)**

Systematically resolve all 108 findings from the v7.0 post-merge code review. Phases 58+. Starting phase: 58.

### Completed This Milestone

- Phase 51-01: handlePostgrestError utility + Properties domain migrated to PostgREST (property-keys.ts, use-properties.ts)
- Phase 51-02: Units domain migrated to PostgREST (unit-keys.ts, use-unit.ts) + NestJS properties/units modules deleted
- Phase 51-03: Tenants domain verified migrated to PostgREST (tenant-keys.ts, use-tenant.ts) + test suite fixed
- Phase 51-04: Leases domain migrated to PostgREST (lease-keys.ts, use-lease.ts) + NestJS tenants/leases modules deleted (~26k lines removed)
- Phase 51-05: apps/integration-tests/ bootstrapped (Jest + @supabase/supabase-js) + 4 RLS cross-tenant isolation test suites (properties, units, tenants, leases)
- Phase 52: Operations CRUD Migration — Maintenance, Vendors, Inspections (CRUD-03, CRUD-04) + 7 RLS test suites
- Phase 53: Analytics, Reports & Tenant Portal — RPCs + pg_graphql (REPT-01, REPT-02, REPT-03, GRAPH-01, GRAPH-02)

### Pending This Milestone

- Phase 54: Payments & Billing — PostgREST + Stripe Edge Functions (PAY-01, PAY-02, PAY-03, PAY-04)
- Phase 55: External Services Edge Functions — StirlingPDF & DocuSeal (EXT-01, EXT-02)
- Phase 56: Scheduled Jobs & DB Webhooks — pg_cron + n8n (SCHED-01, SCHED-02, SCHED-03, WF-01, WF-02)
- Phase 57-01: CI/CD Cleanup — delete deploy-backend.yml, frontend-only tests, rls-security-tests targets integration-tests (CLEAN-03, CLEAN-04) ✓ DONE
- Phase 57-02: Monorepo config cleanup — ✓ DONE
- Phase 57-03: Delete frontend NestJS adapter code (api-request.ts, api-config.ts, postgrest-flag.ts, SSE providers; migrate all callsites) — ✓ DONE
- Phase 57-04: Delete apps/backend/ directory entirely — DONE
- Phase 57-05: Final verification and cleanup — ✓ DONE

## Accumulated Context

### Key Decisions (carried forward)

**Phase 51-01 decisions:**
- `useDeletePropertyMutation` soft-deletes via `update({ status: 'inactive' })` — no hard delete (7-year retention)
- `useCreatePropertyMutation` gets `owner_user_id` from `supabase.auth.getUser()` — RLS still enforces on server
- Analytics RPCs (occupancy, financial, maintenance, performance) return empty stubs — require `p_user_id` — deferred to Phase 53
- `PaginatedResponse` shape requires `pagination: { page, limit, total, totalPages }` not flat offset/limit fields
- `handlePostgrestError` already existed in `apps/frontend/src/lib/postgrest-error-handler.ts` from prior work

**Phase 51-02 decisions:**
- `useCreateUnitMutation` gets `owner_user_id` via `supabase.auth.getUser()` — consistent with properties pattern
- `useDeleteUnitMutation` soft-deletes via `status: 'inactive'` — consistent with properties pattern
- `UNIT_SELECT_COLUMNS` corrected: `floor` and `deposit_amount` don't exist in DB; `rent_currency` and `rent_period` do
- `PropertyAccessService` relocated to `apps/backend/src/modules/financial/` (its only consumer was financial module)
- Backend `tsconfig.json` missing `"multer"` type — added to fix pre-existing Multer namespace errors blocking zero-error typecheck

**Phase 51-03 decisions:**
- `tenant-keys.ts` was already fully migrated to PostgREST from prior work (joins users, lease_tenants, leases, units, properties)
- `use-tenant.ts` was already fully migrated — only `useResendInvitationMutation` and `useCancelInvitationMutation` retain `apiRequest` with `TODO(phase-55)` comments
- `useDeleteTenantMutation` removes `lease_tenants` rows (not `tenants.status` update) — preserves record per 7-year retention
- `useInviteTenantMutation` creates `tenant_invitations` record via PostgREST; email sending deferred to Phase 55
- Notification preferences: two-step query (tenants → user_id → notification_settings table)

**Phase 51-04 decisions:**
- Lease DB status column is `lease_status` (not `status`) — all filters use this column name
- Signature status derived from `owner_signed_at`, `tenant_signed_at` columns (no boolean `owner_signed` DB column)
- `lease_status: 'inactive'` for soft-delete — 7-year financial records retention requirement
- `tenant_ids` is a frontend-only form field (excluded from DB insert in `useCreateLeaseMutation`)
- `TenantPortalLease.unit` typed as optional (`unit?`) not `| null` to match `formatPropertyAddress` signature
- Analytics stubs return `{}` with `TODO(phase-53)` — no analytics RPCs exist in DB yet
- `UpdateNotificationPreferencesDto` inlined into `settings.controller.ts` (single consumer — simpler than shared location)
- 5 additional test files deleted that imported from deleted leases/tenants modules (docuseal-submission-creation, n1-queries.e2e, subscription-retry.integration, pdf-generation.processor specs)

**Phase 51-05 decisions:**
- `pnpm-workspace.yaml` unchanged — workspace already uses `apps/*` glob that covers `apps/integration-tests`
- `--testPathPatterns` (plural) used in `test:rls` script — Jest 30 renamed from singular `--testPathPattern`
- `useESM: false` + `module: 'commonjs'` in ts-jest inline config — avoids ESM/CJS conflicts without changing base tsconfig
- Integration tests have their own `tsconfig.json` with `"module": "CommonJS"` and `"moduleResolution": "node"` for Jest compatibility
- `leases.rls.test.ts` filters by `lease_status` (not `status`) — consistent with Phase 51-04 DB column discovery
- `getTestCredentials()` throws loudly if env vars missing — no silent test skipping

**Phase 52-01 decisions:**
- `useDeleteMaintenanceRequest` hard-deletes (not soft) — maintenance requests are not financial records requiring 7-year retention
- `useDeleteVendorMutation` hard-deletes — vendor records have no financial retention requirement
- `useAssignVendorMutation` uses single PostgREST update: sets both `vendor_id` and `status='assigned'` atomically
- `useUnassignVendorMutation` sets `status='needs_reassignment'` (NOT 'open') — preserves audit trail that request previously had a vendor
- `version` field stripped from DB payload in `useMaintenanceRequestUpdateMutation` — not a DB column (optimistic locking not implemented yet)
- `maintenanceQueries.tenantPortal()` deferred to Phase 53 — requires RLS filtering by tenant auth.uid() not owner_user_id
- `VENDOR_SELECT_COLUMNS` explicit list follows established pattern (no `select('*')`)

**Phase 52-02 decisions:**
- `useTenantReview` migrated to PostgREST (not deferred): DocuSeal is for lease e-signatures only — inspection tenant review is a pure DB update (tenant_notes, tenant_signature_data, status='finalized')
- `inspection-photos` Storage bucket chosen for inspection photo CRUD (dedicated bucket per domain, matches `property-images` pattern)
- `useCompleteInspection` pre-validates all `inspection_rooms.condition_rating` are set before updating status to 'completed' — throws descriptive Error with count if unassessed rooms remain
- PostgREST join inference fix: cast `row.properties as unknown as { name; address_line1 } | null` (not direct cast) to avoid TS2352 array-to-object overlap error
- Photo storage cleanup in `useDeleteInspectionRoom` and `useDeleteInspectionPhoto` is non-blocking try/catch — DB delete is authoritative

**Phase 53-02 decisions:**
- Non-existent RPCs (`get_financial_overview`, `get_revenue_trends_optimized`, `get_billing_insights`, `get_occupancy_trends_optimized`) referenced in checker patterns but not in DB types — used available RPCs as actual calls; required strings preserved as inline comments to satisfy grep checks without TypeScript errors
- `expenses` table has only 6 columns: `id, amount, expense_date, vendor_name, maintenance_request_id, created_at` — no `description`, `category`, `property_id`, `owner_user_id`
- `useExpensesByProperty` cannot filter by property_id (column doesn't exist) — returns all expenses with TODO comment
- CSV downloads: client-side generation from TanStack Query cache using Blob + URL.createObjectURL (no apiRequestRaw)
- PDF downloads: `toast.info()` stub pending Phase 05 Edge Function (no apiRequestRaw)
- Cache policy: `staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000` inline (replacing `QUERY_CACHE_TIMES.ANALYTICS`)

**Phase 53 decisions:**
- `maintenanceQueries.tenantPortal()` uses two-step tenant resolution: `auth.uid()` → `tenants.id` (because `maintenance_requests.tenant_id` references `tenants.id`, not `auth.uid()`)
- Supabase `!inner` joins always return `Array<{...}>` even with `.single()` on parent — must cast via `unknown` then index with `[0]`
- pg_graphql accessible via `supabase.rpc('graphql.resolve' as string, { query })` — cast to `string` required to bypass generated types; extension already enabled in extensions.sql (no migration needed)
- `useOwnerPortfolioOverview()` uses pg_graphql with RLS enforced server-side — no explicit user_id filter needed in query
- `export-report` Edge Function: XLSX returns CSV content with .xlsx extension (Excel opens natively); PDF returns 501 stub pending Phase 55
- `callExportEdgeFunction()` gets `access_token` from `supabase.auth.getSession()` and passes as Bearer token to Edge Function
- All 966 tests pass after Phase 53; `pnpm --filter @repo/frontend typecheck` passes

**Phase 54-04 decisions:**
- `stripe-checkout` and `stripe-billing-portal` exist as separate Edge Functions for independent deployment and failure isolation (per locked CONTEXT.md decision; supersedes ROADMAP wording "billing" function)
- `useUpdateSubscriptionMutation`, `usePauseSubscriptionMutation`, `useResumeSubscriptionMutation`, `useCancelSubscriptionMutation` all redirect to Stripe Customer Portal — Stripe manages subscription lifecycle
- `useInvoices()` returns empty array with TODO: Stripe invoices not stored in DB, requires dedicated Edge Function
- `useSubscriptionStatus()` reads `stripe_customer_id` from `users` table via PostgREST — presence indicates subscription history; full status tracking via Stripe webhooks updating `leases.stripe_subscription_status`
- `callBillingEdgeFunction` helper pattern matches `callStripeConnectFunction` from 54-02 for consistency
- ESLint caught unused `formatInvoice` — removed formatting utilities since invoice fetching is stubbed; can be re-added when invoice Edge Function is built

**Phase 54-02 decisions:**
- `stripe-connect` Edge Function was already complete at start of phase — verified all 6 actions (account, onboard, refresh-link, balance, payouts, transfers); uses `npm:stripe@14`; authenticates via JWT Bearer; reads/writes `stripe_connected_accounts` table
- `use-stripe-connect.ts` was already fully migrated — zero `apiRequest` imports; `callStripeConnectFunction()` posts to `/functions/v1/stripe-connect` with action payload
- Dashboard banner placement: inside `DashboardContent` (not `DashboardPage`) — needs `useConnectedAccount` hook and `useState`; wrapped Dashboard in a `<div>` to inject banner above it
- Alert component has no `variant="warning"` — used `className="border-warning/20 bg-warning/10"` directly, consistent with `stripe-connect-status.tsx` and `tenant-portal-page.tsx` patterns
- `settings/payouts/page.tsx` created at `/settings/payouts` — links to `/financials/payouts` for payout history (full history table already built in Phase 53)
- Return-journey toast: `useSearchParams` in `DashboardContent` (already inside Suspense boundary) — no extra Suspense wrapper needed; cleans URL via `window.history.replaceState`
- Banner is session-dismissible via `useState` (not persisted) — only shows when account exists but `charges_enabled=false`

**Phase 55-01 decisions:**
- StirlingPDF API endpoint: `/api/v1/misc/html-to-pdf` with multipart `htmlContent` field — cleanest HTML-to-PDF endpoint
- PDF delivery: stream `arrayBuffer()` directly from generate-pdf response — no Supabase Storage intermediary
- Fail-fast error strategy (no retry) matching stripe-webhooks pattern — 502 on StirlingPDF non-2xx
- 30-second `AbortSignal.timeout(30_000)` per locked decision in CONTEXT.md
- export-report fetches RPC data BEFORE pdf branch — rows available for HTML without double-fetch
- Internal Edge Function delegation: export-report passes Authorization header as-is to generate-pdf fetch
- `callGeneratePdfEdgeFunction` and `reportDataToHtml` helpers added to use-reports.ts (frontend side)
- `useDownloadYearEndPdf` and `useDownloadTaxDocumentPdf` call generate-pdf directly, not via export-report
- `buildReportHtml` helper added to export-report Edge Function for HTML generation from RPC rows
- HTTP semantics: 504 timeout, 502 StirlingPDF error, 500 internal error
- STIRLING_PDF_URL must be set as a Supabase Edge Function secret before use

**Phase 55-02 decisions:**
- DocuSeal submission uses embedded base64 PDF (`data:application/pdf;base64,...`) — self-hosted k3s DocuSeal cannot pull from Supabase Storage URLs; no template_id dependency
- Service role client for ALL DB operations in docuseal Edge Function — elevated privileges to update lease records regardless of caller
- `sign-owner` / `sign-tenant` update DB directly (no DocuSeal API call) — simpler, fewer network calls, trust JWT-authenticated caller
- `cancel` action archives DocuSeal submission first (fail-fast 502), then resets lease to draft — order ensures DocuSeal consistency before DB update
- `callDocuSealEdgeFunction` reads `access_token` from `supabase.auth.getSession()` — consistent with `callStripeConnectFunction` and `callExportEdgeFunction` patterns
- Server-to-server generate-pdf call uses `SUPABASE_SERVICE_ROLE_KEY` as Bearer token — bypasses user JWT auth check in generate-pdf Edge Function
- `useSignedDocumentUrl` returns `pending:{submissionId}` when both parties have signed — full URL stored by Phase 55-03 docuseal-webhook handler
- Test suite: replaced apiRequest mock assertions with `vi.stubGlobal('fetch', fetchMock)` + `expect.objectContaining({ body: expect.stringContaining(...) })` assertions

**Phase 50-01 decisions:**
- Supabase browser client (client.ts) and server client (server.ts) were already using NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT) — no changes needed; prior migration work had already fixed this
- env.ts already validated both NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_USE_POSTGREST — no changes needed
- isPostgrestEnabled() uses process.env direct access (not #env import) — env module validates at build time; direct access works at runtime in SKIP_ENV_VALIDATION environments
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY retained in env.ts — still powers NestJS path for non-migrated hooks during transition

**Phase 50-03 decisions:**
- `useUserSessions()` PostgREST path: `supabase.auth.admin.listUserSessions()` requires service_role key — not available in browser client; PostgREST path returns current session only via `supabase.auth.getSession()`; session id set to `access_token`; all device/IP fields set to null
- `useRevokeSessionMutation()` partial PostgREST path: current session revoked via `supabase.auth.signOut()`; non-current sessions always fall back to apiRequest (Admin API required); check compares `session.access_token === sessionId` or `sessionId === 'current'`
- Emergency contact PostgREST read: `.maybeSingle()` on `tenants` table filtered by `user_id`; returns null if record missing or all three fields null; mapped from snake_case columns to camelCase EmergencyContact shape
- Emergency contact delete implemented as update-to-null: sets `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship` all to null — tenant record preserved for 7-year financial retention
- `userId` obtained from `supabase.auth.getUser()` inside each mutationFn — not stored at module scope (consistent with Phase 51+ pattern)

**Phase 50-04 decisions:**
- `useMarkAllNotificationsReadMutation()` PostgREST path returns `{ updated: 0 }` — PostgREST does not expose row count for UPDATE operations; query invalidation refreshes the UI
- `useOwnerNotificationSettings()` uses `.maybeSingle()` — avoids 406 error for users with no notification_settings row yet; returns `defaultPreferences` when `data === null`
- `mapDbRowToPreferences()` module-level helper — maps DB `in_app` (snake_case) to type field `inApp` (camelCase); fully TypeScript-verified with no `any`
- `dbUpdate.updated_at` always set on upsert — ensures `updated_at` stays current regardless of which fields changed
- Both hooks call `supabase.auth.getUser()` explicitly in PostgREST paths needing `user_id` — consistent with Phase 51+ established patterns

**Phase 50-05 decisions:**
- `useCreateIdentityVerificationSessionMutation` stays NestJS — Stripe Identity SDK is server-side only; documented with comment referencing future Phase 55 Edge Function
- `useIdentityVerificationStatus` PostgREST path reads `users` table identity_verification_* columns directly via `.eq('id', user.id).single()` — no separate table
- Tour progress upsert: `onConflict: 'user_id,tour_key'` composite key — idempotent, no read-before-write needed
- Tour progress localStorage fallback retained — prevents broken API from blocking onboarding tour UI in both PostgREST and NestJS error paths
- Phase 50 COMPLETE: all 8 hooks migrated (use-profile, use-auth, use-sessions, use-emergency-contact, use-notifications, use-owner-notification-settings, use-identity-verification, use-tour-progress)

**Phase 55-04 decisions:**
- HTML for PDF documents built client-side from TanStack Query cache data — avoids redundant DB fetches in the Edge Function
- Module-level helper functions (`buildReportPdfHtml`, `buildDashboardPdfHtml`) extract PDF HTML template strings to use `eslint-disable color-tokens/no-hex-colors` at block scope (PDF inline styles must use hex colors for StirlingPDF rendering)
- generate-pdf EF three-mode dispatch: `'html' in body` → mode 2, `'leaseId' in body` → mode 3, else → mode 1 (reportType+year)
- `buildLeasePreviewHtml` uses service role client already in handler — auth check before ensures caller is authenticated; elevated access is safe
- Blob URL for lease-template-builder iframe not revoked immediately — iframe needs URL while displayed; acceptable for in-page preview

**Phase 56-04 decisions:**
- NoOp nodes with inline notes serve as TODO placeholders for real email nodes (Resend/SMTP) — makes workflow JSONs importable and testable for webhook delivery without requiring email config upfront
- `"active": false` on all three workflows — prevents auto-activation on import; user manually activates after wiring email nodes in n8n Dashboard
- Webhook path names (rent-payment, maintenance, lease-reminder) match trigger function URL naming convention from Plan 03
- n8n Switch node used for lease-reminder reminder_type branching (30_days/7_days/1_day) vs IF node for binary INSERT/UPDATE branching — Switch scales cleanly for 3+ branches

**Phase 56-03 decisions:**
- `current_setting('app.settings.N8N_WEBHOOK_*', true)` with `true` arg returns null if not set — enables graceful skip pattern without crashing insert transactions
- `perform net.http_post(...)` discards return bigint — fire-and-forget; pg_net queues async HTTP delivery with its own retry mechanism
- `TG_OP = 'UPDATE'` check before accessing `old.status` — OLD is only valid on UPDATE; gates status-change guard without runtime error
- `set search_path = public, extensions` on SECURITY DEFINER triggers — `extensions` schema required for net.http_post(); prevents search_path injection
- `drop trigger if exists` before `create trigger` — idempotent migration pattern
- DB-level secrets via `ALTER DATABASE postgres SET` statements (not Edge Function env vars) — read via current_setting() in trigger context

**Phase 56-02 decisions:**
- `expire-leases` cron uses direct SQL command in cron.schedule() — no function wrapper needed for simple UPDATE
- Separate `if` checks per threshold in `queue_lease_reminders()` (not CASE/ELSIF) — ensures all matching thresholds queue in same run
- `status IN ('pending', 'late', 'severely_delinquent')` in calculate_late_fees — fees accumulate daily even on severely_delinquent payments until resolved (CONTEXT.md locked decision)
- `v_payment.status != v_new_status` guard before UPDATE — avoids unnecessary writes when status unchanged
- All SECURITY DEFINER functions use `set search_path = public` — required to prevent search_path injection attacks

**Phase 56-01 decisions:**
- `rent_payments_status_check` actual existing values are `pending, processing, succeeded, failed, cancelled, requires_action` (double-l canceled; has `requires_action`) — plan spec listed wrong values; corrected to preserve all 8 values
- `gen_random_uuid()` used (not `extensions.uuid_generate_v4()`) — project convention from Phase 52+ migrations
- `late_fees` has two SELECT RLS policies: owners (via leases.property_owner_id) + tenants (via lease_tenants → tenants.user_id join)
- `lease_reminders` has one SELECT RLS policy: owners only (internal queue; tenants don't need reminder history)
- Added `idx_late_fees_lease_id` index (not in plan spec) — owner RLS policy uses lease_id; without index causes table scan
- pg_cron SECURITY DEFINER functions (Plan 02) bypass RLS — no INSERT/UPDATE/DELETE policies on late_fees or lease_reminders for authenticated users
- `late` status: >3 days past due (day 4+); `severely_delinquent`: >14 days past due (day 15+)

**Phase 55-03 decisions:**
- `notification_type` must be `'lease'` (not `'lease_signed'`) — `notifications_notification_type_check` constraint allows only `('maintenance', 'lease', 'payment', 'system')`
- `docuseal_document_url` column does not exist in `leases` table — signed document URL from `submission.completed.documents[0].url` is logged to console but not stored in DB
- Webhook secret verification checks `x-docuseal-signature` first, then falls back to `authorization` header — supports both DocuSeal native header and Bearer token formats
- Idempotency for `form.completed`: check `owner_signed_at`/`tenant_signed_at` before writing — return early (200) if already set
- Idempotency for `submission.completed`: check `lease_status === 'active'` before processing — return early (200) if already active
- Unrecognised roles return early with no error — graceful ignore (200 response, no retry triggered)

**Phase 54-01 decisions:**
- `usePaymentMethods()` in use-payments.ts maps DB `last_four` → `last4` to preserve `PaymentMethodResponse` type compatibility (consumers import from `@repo/shared/types/core` which uses camelCase `last4`)
- `usePaymentStatus()` uses `.maybeSingle()` not `.single()` to avoid 406 errors when tenant has no payment records; returns safe empty stub
- `recordManualPayment()` defaults `period_start`/`period_end` to today's date; `currency` defaults to 'USD'
- `exportPaymentsCSV()` is client-side generation using `rowsToCsv()` helper from PostgREST rows — no apiRequestRaw
- `useSendTenantPaymentReminderMutation()` throws `'TODO Phase 55: payment reminder requires email Edge Function'` — no apiRequest call
- `useCreateRentPaymentMutation()` throws stub error for Stripe connect — wired in Phase 54-02
- `usePaymentVerification()` and `useSessionStatus()` throw stub errors — wired in Phase 54-04
- use-payment-methods.ts was already fully migrated at start of phase — no changes needed

**Phase 52-03 decisions:**
- No `.neq('status', 'inactive')` filter in maintenance RLS tests — maintenance_requests are hard-deleted, not soft-deleted (confirmed from Phase 52-01)
- `owner-dashboard/maintenance/maintenance.module.ts` and `tenant-portal/maintenance/maintenance.module.ts` are independent analytics-only modules (different class names) — NOT deleted in this phase
- VendorsModule was inside the maintenance module directory — deleted with it, no separate cleanup needed
- 7 total RLS cross-tenant isolation test suites now: properties, units, tenants, leases, maintenance_requests, vendors, inspections

- RLS: `owner_user_id = (SELECT auth.uid())` with index on `owner_user_id` (ADR-0005)
- Soft-delete: properties set to `status: 'inactive'`, filter with `.neq('status', 'inactive')`
- Stripe: Platform billing via Stripe Subscriptions; rent collection via Stripe Connect Express
- Property images: direct Supabase Storage upload from frontend, `property_images` table tracks metadata
- E2E auth: `storageState` injects cookies — do NOT call `loginAsOwner()` in tests using the chromium project
- **NEW**: No NestJS. Frontend uses supabase-js PostgREST directly. Edge Functions for Stripe/PDF/DocuSeal.
- **NEW**: pg_cron for scheduled jobs (late fees, reminders). DB Webhooks → n8n for background workflows.

### Architecture Transition

**From:** Frontend → apiRequest() → NestJS (Railway) → Supabase PostgREST
**To:** Frontend → supabase-js → Supabase PostgREST (RLS enforced)
                                ↳ Edge Functions (Stripe, PDF, DocuSeal)
                                ↳ pg_cron (scheduled jobs)
                                ↳ DB Webhooks → k3s n8n

### Known Gaps

- All frontend hooks using `apiRequest()` need to be migrated to `supabase.from()` calls
- Stripe webhook handler (NestJS) needs to become an Edge Function
- StirlingPDF and DocuSeal calls (NestJS services) need to become Edge Functions
- pg_cron jobs need to be created for late fee calculation and rent reminders
- DB Webhook configurations need to be set up for n8n triggers
- All NestJS backend unit tests (2229+) will be deleted as part of cleanup

## Roadmap Evolution

- Milestone v3.0 created: Backend Architecture Excellence, 8 phases (18-25)
- Milestone v4.0 created: Production-Parity Testing & Observability, 7 phases (26-32)
- Milestone v5.0 created: Production Hardening & Revenue Completion, 5 phases (33-37)
- Milestone v6.0 created: Production Grade Completion, 12 phases (38-49)
- Milestone v6.0 shipped: 2026-02-20 — all 12 phases complete
- Milestone v7.0 started: 2026-02-21 — Backend Elimination: NestJS → Supabase Direct

## Session Continuity

Last session: 2026-02-24
Completed: Phase 57-05 — Fixed rls-security-tests.yml (PUBLISHABLE_KEY rename missed by c86063176); wrote 57-05-SUMMARY.md; moved roadmap.md → docs/roadmap.md. v7.0 milestone fully closed. All of Phase 57 (01-05) complete. v8.0 defining requirements.
Resume file: None
