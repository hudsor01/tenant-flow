# Requirements: TenantFlow v1.4 — Tenant Invitation Flow Redesign

**Milestone:** v1.4
**Created:** 2026-03-30
**Status:** Active

## v1.4 Requirements

### Database Stabilization
- [ ] **DB-01**: Fix CHECK constraint violation — change `'portal_access'` to `'platform_access'` in code and backfill any bad rows
- [ ] **DB-02**: Audit and fix RLS policies on `tenant_invitations` to reference `owner_user_id` (not stale `property_owner_id`)
- [ ] **DB-03**: Add partial unique index on `(email, owner_user_id) WHERE status IN ('pending', 'sent')` to prevent duplicate active invitations
- [ ] **DB-04**: Move invitation expiry calculation to DB default (`NOW() + INTERVAL '7 days'`) instead of client-side

### Invitation Consolidation
- [ ] **INV-01**: Create unified `useCreateInvitation()` hook as the sole mutation entrypoint for all invitation creation
- [ ] **INV-02**: Auto-derive invitation type from context (`lease_id` present = `'lease_signing'`, otherwise `'platform_access'`) — never user-facing
- [ ] **INV-03**: Standardize cache invalidation across all invitation paths (tenant queries, invitation queries, dashboard keys)
- [ ] **INV-04**: User can detect duplicate pending invitation for same email and resend existing instead of creating new
- [ ] **INV-05**: Extract single `INVITATION_ACCEPT_PATH` constant — verify path matches actual Next.js route

### UI Migration & Cleanup
- [ ] **UI-01**: Migrate `invite-tenant-form.tsx` to use `useCreateInvitation()` hook
- [ ] **UI-02**: Migrate `onboarding-step-tenant.tsx` to use `useCreateInvitation()` hook
- [ ] **UI-03**: Migrate lease wizard `selection-step-filters.tsx` to use `useCreateInvitation()` hook
- [ ] **UI-04**: Delete `InviteTenantModal` and associated Zustand store state and dead types
- [ ] **UI-05**: User can see pending invitations on tenant list page with resend and cancel actions
- [ ] **UI-06**: User can copy invitation link to clipboard from invitation row
- [ ] **UI-07**: Existing user visiting accept page is routed to login instead of seeing signup form that errors

## Future Requirements

- Smart accept flow branching by invitation type (lease_signing → lease review page) — depends on lease signing workflow completeness
- "Invite Now or Later" toggle for onboarding wizard
- Bulk invite (CSV upload of tenant emails)
- Invitation activity log / email open tracking

## Out of Scope

- User-facing type dropdown — owners do not understand or care about `platform_access` vs `lease_signing`
- Supabase Realtime for invitation status — invitations are low-frequency events; polling is adequate
- SMS invitations — Twilio dependency is explicitly out of scope
- Custom per-owner email templates — premature; the branded template already personalizes by owner name and property
- Mobile app — web-first approach

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| DB-01 | Phase 26 | — | pending |
| DB-02 | Phase 26 | — | pending |
| DB-03 | Phase 26 | — | pending |
| DB-04 | Phase 26 | — | pending |
| INV-01 | Phase 27 | — | pending |
| INV-02 | Phase 27 | — | pending |
| INV-03 | Phase 27 | — | pending |
| INV-04 | Phase 27 | — | pending |
| INV-05 | Phase 27 | — | pending |
| UI-01 | Phase 28 | — | pending |
| UI-02 | Phase 28 | — | pending |
| UI-03 | Phase 28 | — | pending |
| UI-04 | Phase 28 | — | pending |
| UI-05 | Phase 28 | — | pending |
| UI-06 | Phase 28 | — | pending |
| UI-07 | Phase 28 | — | pending |

---
*Created: 2026-03-30*
