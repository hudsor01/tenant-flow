# Project State: TenantFlow

## Current Position

Phase: 47 of 49 (Component Refactoring complete — 3 phases remain)
Status: v6.0 In Progress
Last activity: 2026-02-20 — Phases 38-43, 45, 47 complete; phases 44, 46, 48, 49 pending

Progress: ████████░░ 80% (8 of 12 v6.0 phases done, counting 33-37 as shipped)

## Active Milestone

**v6.0 Production Grade Completion**

Phases 38-49. Focus: complete every remaining gap so TenantFlow is genuinely production-grade and ready to monetize.

### Completed This Milestone

- **Phase 38** — Code Quality: replaced all `select('*')` with explicit columns, compression middleware, tenants.controller route ordering
- **Phase 39** — GDPR/CCPA: `DELETE /users/me` (deleteAccount cascade), `GET /users/me/export`, account-data-section UI in settings
- **Phase 40** — Security: per-endpoint rate limiting on auth routes, MIME validation hardening
- **Phase 41** — Test Coverage (Financial/Billing): financial.service, billing.service, rent-payments.service unit tests
- **Phase 42** — Test Coverage (Infrastructure): report, dashboard, lease, maintenance, tenant, user service tests (2229 backend tests total)
- **Phase 43** — CI/CD: Sentry backend source maps on deploy, RLS integration test suite
- **Phase 45** — Vendor Management: vendors table + RLS, CRUD API (VendorsModule), maintenance request assignment, vendor list UI
- **Phase 47** — Component Refactoring: 32 components >300 lines split into 161 focused sub-components across all domains

### Pending This Milestone

- **Phase 44** — DocuSeal E-Signature Integration
- **Phase 46** — Financial Reporting — Year-End + Tax Documents
- **Phase 48** — Move-In/Move-Out Inspection — Database-Backed Implementation
- **Phase 49** — Landlord Onboarding Wizard

## Accumulated Context

### Key Decisions (carried from v5.0)

- Auth: Supabase session cookie → `Authorization: Bearer` header to NestJS (ADR-0004)
- Per-request Supabase user client via `accessToken` callback (ADR-0004)
- RLS: `owner_user_id = (SELECT auth.uid())` with index on `owner_user_id` (ADR-0005)
- Soft-delete: properties set to `status: 'inactive'`, filter with `.neq('status', 'inactive')`
- Stripe: Platform billing via Stripe Subscriptions; rent collection via Stripe Connect Express
- Property images: direct Supabase Storage upload from frontend, `property_images` table tracks metadata
- E2E auth: `storageState` injects cookies — do NOT call `loginAsOwner()` in tests using the chromium project

### Known Gaps (from v6.0 audit)

1. **DocuSeal** — PDF_GENERATION_DOCUSEAL_INTEGRATION.md doc exists; implementation not started
2. **Financial year-end reports** — tax-documents page is placeholder; no 1099 or annual summary generation
3. **Move-in/move-out inspection** — stub only; no real form, photo upload, or PDF report
4. **Landlord onboarding wizard** — no wizard exists; new owners are dropped into blank dashboard

### Dropped Phases (intentional)

- ~~Phase 46: In-App Messaging~~ — removed; not required for monetization
- ~~Phase 48: SMS Notifications (Twilio)~~ — removed; `sms.service.ts` deleted; email covers this

## Roadmap Evolution

- Milestone v3.0 created: Backend Architecture Excellence, 8 phases (18-25)
- Milestone v4.0 created: Production-Parity Testing & Observability, 7 phases (26-32)
- Milestone v5.0 created: Production Hardening & Revenue Completion, 5 phases (33-37)
- Milestone v6.0 created: Production Grade Completion, 12 phases (38-49, skipping none)

## Session Continuity

Last session: 2026-02-20
Completed: Phase 47 (component refactoring committed — 161 files)
Resume file: None
