# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- v1.0 **Production Hardening** -- Phases 1-10 (shipped 2026-03-07) | [archive](milestones/v1.0-ROADMAP.md)
- v1.1 **Blog Redesign & CI** -- Phases 11-15 (shipped 2026-03-08) | [archive](milestones/v1.1-ROADMAP.md)
- v1.2 **Production Polish & Code Consolidation** -- Phases 16-20 (shipped 2026-03-11) | [archive](milestones/v1.2-ROADMAP.md)
- v1.3 **Stub Elimination** -- Phases 21-25 (in progress)

## Phases

<details>
<summary>v1.0 Production Hardening (Phases 1-10) -- SHIPPED 2026-03-07</summary>

- [x] Phase 1: RPC & Database Security (2/2 plans) -- completed 2026-03-04
- [x] Phase 2: Financial Fixes (7/7 plans) -- completed 2026-03-05
- [x] Phase 3: Auth & Middleware (6/6 plans) -- completed 2026-03-05
- [x] Phase 4: Edge Function Hardening (4/4 plans) -- completed 2026-03-05
- [x] Phase 5: Code Quality & Type Safety (10/10 plans) -- completed 2026-03-06
- [x] Phase 6: Database Schema & Migrations (7/7 plans) -- completed 2026-03-06
- [x] Phase 7: UX & Accessibility (6/6 plans) -- completed 2026-03-06
- [x] Phase 8: Performance Optimization (7/7 plans) -- completed 2026-03-06
- [x] Phase 9: Testing & CI Pipeline (9/9 plans) -- completed 2026-03-06
- [x] Phase 10: Audit Cleanup (2/2 plans) -- completed 2026-03-07

</details>

<details>
<summary>v1.1 Blog Redesign & CI (Phases 11-15) -- SHIPPED 2026-03-08</summary>

- [x] Phase 11: Blog Data Layer (2/2 plans) -- completed 2026-03-07
- [x] Phase 12: Blog Components & CSS (2/2 plans) -- completed 2026-03-07
- [x] Phase 13: Newsletter Backend (1/1 plans) -- completed 2026-03-07
- [x] Phase 14: Blog Pages (2/2 plans) -- completed 2026-03-08
- [x] Phase 15: CI Optimization (1/1 plans) -- completed 2026-03-08

</details>

<details>
<summary>v1.2 Production Polish & Code Consolidation (Phases 16-20) -- SHIPPED 2026-03-11</summary>

- [x] Phase 16: Shared Cleanup & Dead Code (3/3 plans) -- completed 2026-03-08
- [x] Phase 17: Hooks Consolidation (6/6 plans) -- completed 2026-03-08
- [x] Phase 18: Components Consolidation (6/6 plans) -- completed 2026-03-09
- [x] Phase 19: UI Polish (3/3 plans) -- completed 2026-03-09
- [x] Phase 20: Browser Audit (6/6 plans) -- completed 2026-03-09

</details>

### v1.3 Stub Elimination (In Progress)

- [x] **Phase 21: Email Invitations** - Tenant receives real invitation email with accept link when owner creates invitation (completed 2026-03-11)
- [x] **Phase 22: GDPR Data Rights** - Owners and tenants can export personal data and owners can self-service delete accounts (completed 2026-03-11)
- [ ] **Phase 23: Document Templates** - Owner can preview, export, and save lease template definitions via DocuSeal/StirlingPDF
- [ ] **Phase 24: Bulk Property Import** - Owner can import properties via CSV with validation and error reporting
- [ ] **Phase 25: Maintenance Photos & Stripe Dashboard** - Tenants can upload maintenance photos and owners can access Stripe Express Dashboard

## Phase Details

### Phase 21: Email Invitations
**Goal**: Tenants receive a real invitation email when an owner creates a tenant invitation, and that email routes them to onboarding
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: EMAIL-01, EMAIL-02
**Success Criteria** (what must be TRUE):
  1. When an owner creates a tenant invitation, the tenant receives an email at the invited address within seconds
  2. The invitation email contains an accept link that navigates the tenant to the onboarding/signup flow
  3. The accept link works correctly for both new users (creates account) and existing users (links to existing account)
**Plans:** 2/2 plans complete
Plans:
- [ ] 21-01-PLAN.md -- Edge Function + branded email template for sending tenant invitation emails via Resend
- [ ] 21-02-PLAN.md -- Wire all frontend invitation creation paths to call the send-tenant-invitation Edge Function

### Phase 22: GDPR Data Rights
**Goal**: Users can exercise their GDPR/CCPA data rights through self-service -- export their data as a downloadable file and delete their account with a grace period
**Depends on**: Phase 21
**Requirements**: GDPR-01, GDPR-02, GDPR-03
**Success Criteria** (what must be TRUE):
  1. Owner can trigger a data export from account settings and receive a downloadable file containing all their personal data (properties, leases, tenants, financials)
  2. Tenant can trigger a data export from their portal settings and receive a downloadable file containing all their personal data (lease info, payment history, maintenance requests)
  3. Owner can initiate account deletion from settings, which starts a 30-day grace period (no "contact support" workaround)
  4. Owner can cancel account deletion during the grace period and resume normal usage
**Plans:** 2/2 plans complete
Plans:
- [ ] 22-01-PLAN.md -- Role-aware export-user-data Edge Function (owner + tenant data queries, JSON download)
- [ ] 22-02-PLAN.md -- Wire data export + account deletion into owner settings and tenant profile UI

### Phase 23: Document Templates
**Goal**: Owners can preview lease templates as PDF, export/download them, and save custom template field configurations that persist across sessions
**Depends on**: Phase 22
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. Owner can click "Preview" on a lease template and see a PDF rendering of that template in the browser
  2. Owner can click "Export" or "Download" on a lease template and receive a PDF file downloaded to their device
  3. Owner can configure template fields (custom field definitions) and save them so they persist when returning later
**Plans**: TBD

### Phase 24: Bulk Property Import
**Goal**: Owners can import multiple properties at once by uploading a CSV file, with validation that catches errors before committing
**Depends on**: Phase 23
**Requirements**: PROP-01, PROP-02
**Success Criteria** (what must be TRUE):
  1. Owner can upload a CSV file containing multiple properties and have them all created as property records
  2. The system validates CSV data (required fields, format, duplicates) and shows a clear error report before committing any records
  3. Owner can fix validation errors and re-upload without partial/duplicate records being created
**Plans**: TBD

### Phase 25: Maintenance Photos & Stripe Dashboard
**Goal**: Tenants can attach photos to maintenance requests and owners can access their Stripe Express Dashboard directly from TenantFlow
**Depends on**: Phase 24
**Requirements**: MAINT-01, MAINT-02, STRIPE-01
**Success Criteria** (what must be TRUE):
  1. Tenant can upload one or more photos when submitting a new maintenance request
  2. Owner can view the uploaded photos when viewing a maintenance request detail page
  3. Owner can click a button on the Stripe Connect status page and be redirected to their Stripe Express Dashboard
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 21 -> 22 -> 23 -> 24 -> 25

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 21. Email Invitations | 2/2 | Complete    | 2026-03-11 |
| 22. GDPR Data Rights | 2/2 | Complete    | 2026-03-11 |
| 23. Document Templates | 0/TBD | Not started | - |
| 24. Bulk Property Import | 0/TBD | Not started | - |
| 25. Maintenance Photos & Stripe Dashboard | 0/TBD | Not started | - |
