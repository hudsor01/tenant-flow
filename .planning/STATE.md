# Project State: TenantFlow

## Current Position

Phase: 52-operations-crud-migration-maintenance-vendors-inspections
Plan: 02 (complete) — inspection hooks PostgREST migration complete
Status: In progress — 52-01 complete (maintenance/vendor hooks), 52-02 complete (inspection hooks), 52-03 pending
Last activity: 2026-02-21 — Phase 52-02 complete: inspection-keys.ts and use-inspections.ts migrated to PostgREST + Storage

Progress: ▓▓▓▓░░░░░░ ~25% (Phase 51 complete, Phase 52 next)

## Active Milestone

**v7.0 Backend Elimination: NestJS → Supabase Direct — IN PROGRESS**

Eliminate NestJS/Railway entirely. Migrate all frontend API calls to Supabase PostgREST direct. Move Stripe webhooks, PDF, DocuSeal to Edge Functions. Add pg_cron for scheduled jobs. Wire n8n via DB Webhooks. Delete apps/backend/.

### Completed This Milestone

- Phase 51-01: handlePostgrestError utility + Properties domain migrated to PostgREST (property-keys.ts, use-properties.ts)
- Phase 51-02: Units domain migrated to PostgREST (unit-keys.ts, use-unit.ts) + NestJS properties/units modules deleted
- Phase 51-03: Tenants domain verified migrated to PostgREST (tenant-keys.ts, use-tenant.ts) + test suite fixed
- Phase 51-04: Leases domain migrated to PostgREST (lease-keys.ts, use-lease.ts) + NestJS tenants/leases modules deleted (~26k lines removed)
- Phase 51-05: apps/integration-tests/ bootstrapped (Jest + @supabase/supabase-js) + 4 RLS cross-tenant isolation test suites (properties, units, tenants, leases)

### Pending This Milestone

- Phase 50: Infrastructure & Auth Foundation + User/Profile CRUD (CRUD-05)
- Phase 52: Operations CRUD Migration — Maintenance, Vendors, Inspections (CRUD-03, CRUD-04)
- Phase 53: Analytics, Reports & Tenant Portal — RPCs + pg_graphql (REPT-01, REPT-02, REPT-03, GRAPH-01, GRAPH-02)
- Phase 54: Payments & Billing — PostgREST + Stripe Edge Functions (PAY-01, PAY-02, PAY-03, PAY-04)
- Phase 55: External Services Edge Functions — StirlingPDF & DocuSeal (EXT-01, EXT-02)
- Phase 56: Scheduled Jobs & DB Webhooks — pg_cron + n8n (SCHED-01, SCHED-02, SCHED-03, WF-01, WF-02)
- Phase 57: Cleanup & Deletion — Remove NestJS Entirely (CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05)

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

Last session: 2026-02-21
Completed: Phase 52-01 — DB migration for new maintenance statuses + maintenance-keys.ts + use-maintenance.ts + use-vendor.ts all migrated to PostgREST. All must-haves verified (zero apiRequest calls, typecheck passes).
Resume file: None
