# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- v1.0 **Production Hardening** -- Phases 1-10 (shipped 2026-03-07) | [archive](milestones/v1.0-ROADMAP.md)
- v1.1 **Blog Redesign & CI** -- Phases 11-15 (shipped 2026-03-08) | [archive](milestones/v1.1-ROADMAP.md)
- v1.2 **Production Polish & Code Consolidation** -- Phases 16-20 (shipped 2026-03-11) | [archive](milestones/v1.2-ROADMAP.md)
- v1.3 **Stub Elimination** -- Phases 21-25 (shipped 2026-03-18) | [archive](milestones/v1.3-ROADMAP.md)
- 🚧 **v1.4 Tenant Invitation Flow Redesign** -- Phases 26-28 (in progress)

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

<details>
<summary>v1.3 Stub Elimination (Phases 21-25) -- SHIPPED 2026-03-18</summary>

- [x] Phase 21: Email Invitations (2/2 plans) -- completed 2026-03-11
- [x] Phase 22: GDPR Data Rights (2/2 plans) -- completed 2026-03-11
- [x] Phase 23: Document Templates (2/2 plans) -- completed 2026-03-11
- [x] Phase 23.1: UI/UX Polish (2/2 plans) -- completed 2026-03-18
- [x] Phase 24: Bulk Property Import (2/2 plans) -- completed 2026-03-18
- [x] Phase 25: Maintenance Photos & Stripe Dashboard (2/2 plans) -- completed 2026-03-18

</details>


### v1.4 Tenant Invitation Flow Redesign (In Progress)

**Milestone Goal:** Replace 4 duplicated tenant invitation code paths with one unified flow that works everywhere -- onboarding, dashboard, and lease wizard.

- [x] **Phase 26: Database Stabilization** (1/2 plans) - Fix production bugs and add missing constraints on tenant_invitations table (completed 2026-03-30)
- [x] **Phase 27: Unified Mutation Hook** - Build single useCreateInvitation() hook as sole invitation entry point (completed 2026-03-30)
- [ ] **Phase 28: Consumer Migration & Dead Code Removal** - Migrate all UI consumers to shared hook, surface pending invitations, delete redundant code

## Phase Details

### Phase 26: Database Stabilization
**Goal**: The tenant_invitations table is correct, safe, and self-managing -- no bad data can enter, no duplicate active invitations can exist, and expiry is handled server-side
**Depends on**: Nothing (first phase of v1.4)
**Requirements**: DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. Owner can create a tenant invitation from the dashboard without hitting a CHECK constraint error
  2. Owner's PostgREST insert into tenant_invitations succeeds with RLS policies referencing the correct owner_user_id column
  3. Attempting to create a second active invitation for the same email and owner is rejected by the database
  4. A newly inserted invitation row has expires_at automatically set to 7 days from now without any client-side date calculation
**Plans:** 2/2 plans complete
Plans:
- [x] 26-01-PLAN.md -- Write atomic migration file (backfill, RLS, unique index, expiry default)
- [x] 26-02-PLAN.md -- Fix portal_access typo and remove client-side expires_at from code

### Phase 27: Unified Mutation Hook
**Goal**: One hook handles all invitation creation logic -- type derivation, duplicate detection, DB insert, email send, and cache invalidation -- so no UI component needs to implement any of this inline
**Depends on**: Phase 26
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05
**Success Criteria** (what must be TRUE):
  1. Calling useCreateInvitation() with a lease_id produces a 'lease_signing' invitation; without lease_id produces 'platform_access' -- without any user-facing type selector
  2. Attempting to invite an email that already has a pending/sent invitation surfaces the duplicate and offers resend instead of creating a second row
  3. After a successful invitation, the tenant list, invitation list, and dashboard queries all reflect the new invitation without manual page refresh
  4. The invitation accept URL in the sent email matches the actual Next.js route (single INVITATION_ACCEPT_PATH constant used everywhere)
**Plans**: TBD

### Phase 28: Consumer Migration & Dead Code Removal
**Goal**: Every invitation creation path in the app uses the unified hook, the legacy modal and its supporting code are deleted, and pending invitations are visible and actionable on the tenant list
**Depends on**: Phase 27
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. Owner can invite a tenant from the dashboard form, onboarding wizard, and lease wizard -- all three paths produce identical invitation records in the database
  2. Owner can see pending invitations on the tenant list page with working resend and cancel actions
  3. Owner can copy an invitation link to clipboard from any pending invitation row
  4. An existing registered user who clicks an invitation accept link is routed to login instead of seeing a signup form that errors
  5. No references to InviteTenantModal, isInviteModalOpen, or InviteTenantData exist anywhere in the codebase
**Plans:** 3 plans
**UI hint**: yes
Plans:
- [ ] 28-01-PLAN.md -- Migrate 3 consumers to useCreateInvitation() and delete legacy modal dead code
- [ ] 28-02-PLAN.md -- Surface pending invitations on tenant list with dropdown actions
- [ ] 28-03-PLAN.md -- Add session-aware accept flow for existing users

## Progress

**Execution Order:**
Phases execute in numeric order: 26 -> 27 -> 28

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 26. Database Stabilization | v1.4 | 2/2 | Complete    | 2026-03-30 |
| 27. Unified Mutation Hook | v1.4 | 0/TBD | Complete    | 2026-03-30 |
| 28. Consumer Migration & Dead Code Removal | v1.4 | 0/3 | Not started | - |
