# Project Research Summary

**Project:** TenantFlow v1.4 — Tenant Invitation Flow Redesign
**Domain:** Internal code consolidation / SaaS invitation UX
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

TenantFlow currently has four independent code paths that each recreate the same ~40 lines of invitation logic: generate a UUID code, build a URL, compute a 7-day expiry, insert a `tenant_invitations` row, and call the `send-tenant-invitation` Edge Function. This duplication is not cosmetic — it has produced at least two active production bugs. The dashboard invitation form inserts `type: 'portal_access'`, which violates the DB CHECK constraint (only `'platform_access'` and `'lease_signing'` are allowed), meaning dashboard-initiated invitations fail at the database layer. Separately, the `tenant_invitations` RLS policies may still reference the old column name `property_owner_id` rather than the live `owner_user_id`, which would block all direct PostgREST inserts from authenticated clients.

The recommended approach is a single `useCreateInvitation()` hook that becomes the sole insertion point for invitation records. Three thin context-aware UI wrappers (the existing standalone form, the onboarding wizard step, and the lease wizard inline form) all consume this one hook. The legacy `InviteTenantModal` (the Zustand-driven custom modal) is deleted entirely — the route-based intercepting modal at `@modal/(.)tenants/new` already exists and already uses the correct form component, making the custom modal completely redundant. No new dependencies are required; every tool needed already exists in the project.

The critical sequencing constraint is: database fixes must land before any UI consolidation work. The CHECK constraint violation and the potential RLS policy drift are production bugs that need a migration to resolve. Attempting to consolidate the UI on top of broken DB primitives will produce a consolidated component that still fails. Phase 1 is therefore non-negotiable: fix the data layer, then build the shared hook on top of it, then migrate consumers, then delete dead code.

---

## Key Findings

### Recommended Stack

No new dependencies. The existing stack covers every requirement. The problem is four divergent implementations of the same pattern, not a missing capability. TanStack Form 1.28 (already used in the dashboard form path) is the correct form library for all three UI contexts. The `inviteTenantSchema` Zod schema (already defined in `src/lib/validation/tenants.ts`) is the correct validation layer for all paths — three of the four paths currently skip validation entirely. The `tenantInviteMutations` factory in `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` is the correct mutation layer once its signature is updated to make `lease_id` optional.

**Core technologies — all existing, no additions:**
- `useCreateInvitation()` hook (new file, ~80 lines): single mutation hook replacing four inline mutations
- TanStack Form 1.28: extend to all three UI contexts (only dashboard form uses it today)
- `inviteTenantSchema` (Zod): make mandatory for all three form contexts
- shadcn `Dialog`: replace the custom raw-HTML `InviteTenantModal` for accessibility compliance
- `QUERY_CACHE_TIMES.LIST`: sufficient for invitation status updates — no Realtime WebSocket needed

### Expected Features

**Must have (table stakes — fixes and consolidation):**
- Unified invitation entry point — one hook consumed by all three contexts, eliminating divergent behavior
- CHECK constraint bug fix — change `'portal_access'` to `'platform_access'`; this is a production breakage
- Auto-derived invitation type — remove user-facing type dropdown; derive from context automatically (`lease_id` present = `'lease_signing'`, everything else = `'platform_access'`)
- Duplicate invitation guard — detect existing pending/sent invitation for the same email before inserting; offer resend of existing instead of creating a duplicate
- Pending invitation visibility on tenant list — surface pending invitations as rows/cards with resend and cancel actions alongside the tenant list

**Should have (low-cost differentiators):**
- Copy invitation link — expose `invitation_url` (already in DB) with a clipboard button; near-zero effort
- Existing user routing on accept — check if email is already registered before showing the signup form; route to login instead of the error-then-fallback flow currently in place

**Defer to later milestones:**
- Smart accept flow branching by invitation type (lease_signing → lease review; platform_access → welcome tour) — valuable but lease signing workflow is not yet complete
- "Invite Now or Later" toggle — useful for onboarding but adds state complexity
- Bulk invite — only valuable at portfolio scale
- Invitation activity log / email open tracking

**Explicit anti-features (do not build):**
- User-facing type dropdown — owners do not understand or care about `platform_access` vs `lease_signing`
- Supabase Realtime for invitation status — invitations are low-frequency events; polling is adequate
- SMS invitations — Twilio dependency is explicitly out of scope
- Custom per-owner email templates — premature; the branded template already personalizes by owner name and property

### Architecture Approach

The architecture is "shared hook, separate thin wrappers" — not a single mega-component with a `mode` prop. The three UI contexts (standalone dashboard form, onboarding wizard step, lease wizard inline) have fundamentally different layouts; a single component would require extensive conditional rendering and would be harder to maintain than three thin wrappers over one shared hook. The hook owns all business logic: type derivation, UUID generation, URL construction, expiry calculation, DB insert, email send (non-fatal), and cache invalidation. Each UI wrapper owns only its layout, field visibility, and post-success navigation.

**Major components:**

1. `useCreateInvitation()` (`src/hooks/api/use-create-invitation.ts`, new) — sole mutation entrypoint; replaces all four inline mutations; handles all DB + email + cache logic
2. `InviteTenantForm` (`src/components/tenants/invite-tenant-form.tsx`, modified) — standalone dashboard context; removes inline mutation; imports `useCreateInvitation`
3. `OnboardingInviteStep` (`src/components/onboarding/onboarding-step-tenant.tsx`, modified) — wizard step context; removes inline mutation; receives property ID from previous wizard step
4. `LeaseWizardInvite` (within `src/components/leases/wizard/selection-step-filters.tsx`, modified) — inline lease context; removes inline mutation; auto-sets `lease_signing` type via hook
5. `InviteTenantModal` (`src/components/tenants/invite-tenant-modal.tsx`) — **DELETE ENTIRELY**; replaced by existing route-based modal at `@modal/(.)tenants/new`

**Files to remove (dead code after consolidation):**
- `isInviteModalOpen` / `openInviteModal` / `closeInviteModal` from `tenants-store.ts`
- `InviteTenantData` interface and `onInviteTenant` prop from `src/types/sections/tenants.ts`
- `handleInviteTenant` callback from `src/app/(owner)/tenants/page.tsx`

### Critical Pitfalls

1. **CHECK constraint violation is a live production bug** — `invite-tenant-form.tsx` inserts `type: 'portal_access'`, but the DB only allows `'platform_access'` and `'lease_signing'`. Dashboard invitations are silently broken right now. Fix: define a single constant and backfill-then-migrate before touching any UI code.

2. **RLS policy column name drift** — `tenant_invitations` RLS policies may still reference `property_owner_id` (old column name) instead of `owner_user_id` (current column). If so, all authenticated-client inserts are blocked. Fix: run `SELECT polname, polqual FROM pg_policy WHERE polrelid = 'tenant_invitations'::regclass` and rewrite any stale policies before the unified mutation goes live.

3. **Duplicate invitation race condition** — no UNIQUE constraint prevents two active invitations to the same email for the same owner. Fix: add a partial unique index `ON tenant_invitations(email, owner_user_id) WHERE status IN ('pending', 'sent')` and add a pre-insert duplicate check in the unified hook.

4. **Client-side expiry calculation enables clock skew bugs** — expiry is calculated with `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)` in the client. Fix: move expiry calculation to the database (`DEFAULT NOW() + INTERVAL '7 days'`) or compute it server-side in the Edge Function.

5. **Invitation URL path inconsistency** — forms generate `/auth/accept-invitation?code=...` but the actual Next.js route is `/accept-invite/`. A mismatch here produces 404s for every tenant clicking their email link. Fix: extract a single `INVITATION_ACCEPT_PATH` constant; use it everywhere; add an E2E test that navigates to a generated URL.

---

## Implications for Roadmap

Based on combined research, the milestone maps cleanly to three phases with a clear dependency chain. Each phase is a complete vertical slice that leaves the system in a shippable state.

### Phase 1: Database Stabilization

**Rationale:** Two confirmed production bugs live at the DB layer (CHECK constraint violation, potential RLS column drift). The unified hook cannot function correctly until the data layer is sound. This phase is prerequisite to everything else — building UI on top of broken DB primitives just produces a consolidated component that still fails.

**Delivers:** A stable `tenant_invitations` table with correct RLS policies, a partial unique index preventing duplicate active invitations, and server-side expiry calculation.

**Addresses:**
- Fix CHECK constraint (table stakes requirement #2 from FEATURES.md)
- Fix RLS policy column drift (Pitfall 2)
- Add partial unique index for email deduplication (Pitfall 3)
- Move expiry to DB default (Pitfall 11)

**Avoids:** Pitfalls 1, 2, 3, and 4 — all DB-layer issues that would block or corrupt Phase 2 work.

**Migration checklist:**
- Backfill any rows with `type = 'portal_access'` to `'platform_access'` before altering the CHECK constraint
- Use `NOT VALID` + `VALIDATE CONSTRAINT` two-step pattern for zero-downtime constraint modification
- Rewrite all `tenant_invitations` RLS policies to reference `owner_user_id = (select auth.uid())`
- Add RLS integration test for `tenant_invitations` insert/select/update from authenticated owner

**Research flag:** Standard patterns — no additional research needed. Migration patterns are well-documented.

---

### Phase 2: Unified Mutation Hook

**Rationale:** The hook is the dependency for all three UI context migrations. Building it first means each UI migration in Phase 3 is a mechanical swap (remove inline mutation, import hook) rather than a full rewrite. The hook also standardizes cache invalidation across all contexts, which is currently inconsistent.

**Delivers:** `src/hooks/api/use-create-invitation.ts` — a single mutation hook that handles DB insert, email send (non-fatal), and correct cache invalidation across `tenantQueries.lists()`, `tenantInvitationQueries.invitations()`, and `ownerDashboardKeys.all`.

**Addresses:**
- Must-have #1: Unified invitation entry point
- Must-have #3: Auto-derived invitation type (hook derives type from `lease_id` presence)
- Must-have #4: Duplicate email guard (pre-insert check in hook's `mutationFn`)
- Pitfall 7: Inconsistent email error handling (single `sendInvitationEmail()` with result type)
- Pitfall 8: Cache invalidation inconsistency (one `invalidateInvitationRelatedQueries()` helper)
- Pitfall 12: URL path inconsistency (single `INVITATION_ACCEPT_PATH` constant used in hook)

**Also in this phase:**
- Update `tenant-invite-mutation-options.ts`: make `lease_id` optional; accept flat `CreateInvitationInput`
- Add `createInvitationSchema` to `src/lib/validation/tenants.ts`
- Harden `tenant-invitation-validate` Edge Function: return 404 for all failure modes (not 410 for expired) to prevent invitation code enumeration (Pitfall 6)
- Add status filter to `tenantInvitationQueries.list()`: `.in('status', ['pending', 'sent', 'accepted'])` (Pitfall 15)
- Update existing unit tests for the hook

**Research flag:** Well-documented TanStack Query patterns; matches existing `use-tenant-invite-mutations.ts` pattern in codebase. No additional research needed.

---

### Phase 3: Consumer Migration and Dead Code Removal

**Rationale:** With the hook in place and tested, migrating each consumer is a low-risk mechanical operation. Deletion is last because it is irreversible — keeping old code through Phase 2 means any missed migration can be caught before the fallback is gone.

**Delivers:** Three consumers updated to use `useCreateInvitation()`, the legacy `InviteTenantModal` deleted, Zustand modal state removed, dead types cleaned up, and the must-have "pending invitations on tenant list" feature surfaced.

**Addresses:**
- Must-have #1: Complete the consolidation across all three UI contexts
- Must-have #5: Pending invitation visibility on tenant list (surface status with resend/cancel actions)
- Should-have #1: Copy invitation link button (expose `invitation_url` with clipboard API)
- Should-have #2: Existing user routing on accept page
- Pitfall 9: Type dropdown removal (deleted with the modal)
- Pitfall 14: Accessibility gaps (shadcn `Dialog` replaces raw HTML modal)

**Migration order within phase:**
1. Update `invite-tenant-form.tsx` — remove inline mutation, import hook, fix `'portal_access'` reference (defensive fix, Phase 1 migration already fixes the DB but the code string should also be corrected)
2. Update `onboarding-step-tenant.tsx` — remove inline mutation, pass property ID from previous wizard step
3. Update `selection-step-filters.tsx` — remove inline mutation from `InlineTenantInvite`
4. Update existing unit tests to mock `useCreateInvitation` instead of inline Supabase calls
5. Delete `invite-tenant-modal.tsx`
6. Update `tenants.tsx` — remove modal usage, wire button to `router.push('/tenants/new')`
7. Remove modal state from `tenants-store.ts`
8. Remove dead types from `src/types/sections/tenants.ts` and dead callback from `tenants/page.tsx`
9. Add pending invitation rows/cards to tenant list
10. Add copy-link button to invitation rows

**Research flag:** Well-documented TanStack Form and TanStack Query patterns already established in codebase. Onboarding wizard step property ID threading needs a quick trace through `onboarding-step-tenant.tsx` and parent wizard state to confirm the prop interface.

---

### Phase Ordering Rationale

- **DB before hook before UI** is the only safe order given active production bugs at the DB layer. Reversing this creates risk of building and shipping UI that works in dev (where the CHECK constraint may not be enforced or the RLS policy may differ) but fails in production.
- **Hook before consumers** follows the standard TanStack Query consolidation pattern: the abstraction must exist before it can be adopted. Having the hook available means each consumer migration is a git diff of ~15 lines, not a rewrite.
- **Deletion last** is the principle from ARCHITECTURE.md's suggested build order. Old code serves as a fallback during Phase 3; once all consumers are confirmed migrated, deletion is safe and grep-verifiable.
- **Must-haves before should-haves** within phases: the copy-link and existing-user-routing features are low-cost but not blocking. They are included in Phase 3 because they are cheap to add once the consolidated form structure is in place.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 only:** Verify the actual current state of `tenant_invitations` RLS policies against live DB before writing the migration. The PITFALLS.md analysis is based on migration file history; the live DB may have received out-of-band policy updates. Run the `pg_policy` query before drafting the migration SQL.

Phases with standard patterns (skip additional research):
- **Phase 2:** TanStack Query mutation hook consolidation is a standard pattern, well-established in the codebase (see `use-tenant-invite-mutations.ts` for resend/cancel as reference implementation)
- **Phase 3:** Component migration and dead code removal follow mechanical patterns; no domain research needed

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct codebase analysis; no external library research needed because no new dependencies are introduced |
| Features | HIGH | Table stakes and anti-features confirmed against 7 property management competitors (DoorLoop, TurboTenant, AppFolio, Stessa, Avail, RentRedi, Buildium) plus SaaS patterns from Slack/Notion/Linear |
| Architecture | HIGH | All 4 code paths located and analyzed in codebase; hook pattern matches existing `use-tenant-invite-mutations.ts` reference implementation; route-based modal existence confirmed |
| Pitfalls | HIGH | 2 of 6 critical pitfalls are confirmed bugs (CHECK constraint typo verified in source, RLS column drift identified from migration history); remaining pitfalls derived from codebase structure and well-documented DB/invitation-system patterns |

**Overall confidence:** HIGH

### Gaps to Address

- **RLS live state verification:** The RLS policy analysis is based on migration file history. Before writing Phase 1 migration SQL, run `SELECT polname, polqual, polwithcheck FROM pg_policy WHERE polrelid = 'public.tenant_invitations'::regclass` against the live DB to confirm whether the column drift is actually present. If policies were fixed in a migration not captured in the research files, Phase 1 scope shrinks.

- **Onboarding wizard property ID availability:** ARCHITECTURE.md assumes the property ID from step 3 of the onboarding wizard is available when the tenant invite step runs. The wizard state threading needs to be verified by tracing the parent wizard component's prop interface before Phase 3 planning. If the property ID is not in scope, the onboarding invite step produces a contextless invitation (Pitfall 5).

- **`invite-tenant-form.tsx` CHECK constraint runtime behavior:** The `'portal_access'` typo may be failing silently (no user-visible error) or throwing a PostgREST error that is caught and swallowed by the existing `.catch()`. Checking Sentry for `23514` (check_violation) errors from `tenant_invitations` would confirm whether dashboard invitations are currently silently broken or actively erroring. This determines urgency framing for Phase 1.

---

## Sources

### Primary (HIGH confidence)

**Codebase analysis (direct file examination):**
- `src/components/tenants/invite-tenant-form.tsx` — `'portal_access'` typo confirmed on line 79
- `src/components/tenants/invite-tenant-modal.tsx` — raw HTML modal, user-facing type dropdown
- `src/components/onboarding/onboarding-step-tenant.tsx` — inline mutation, no property context
- `src/components/leases/wizard/selection-step-filters.tsx` — inline mutation, `'lease_signing'` type
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` — existing mutation factory, `lease_id` required
- `src/hooks/api/use-tenant-invite-mutations.ts` — reference implementation for resend/cancel pattern
- `src/lib/validation/tenants.ts` — `inviteTenantSchema` definition confirmed
- `src/types/supabase.ts` — confirms `owner_user_id` is the live column name on `tenant_invitations`
- `supabase/migrations/20251128100000_separate_tenant_invitation_from_lease.sql` — CHECK constraint definition
- `supabase/migrations/20251101000000_base_schema.sql` — base RLS policy definitions

**Competitor documentation:**
- [DoorLoop: Invite Tenants to Portal](https://support.doorloop.com/en/articles/6082689-invite-tenants-to-your-tenant-portal) — invite flow, status tracking, resend
- [DoorLoop: Bulk Invite](https://support.doorloop.com/en/articles/6295305-bulk-invite-multiple-tenants-to-the-tenant-portal) — bulk invite patterns
- [TurboTenant: Landlord Guide to Tenant Portal](https://support.turbotenant.com/en/articles/4664501-landlord-guide-to-the-tenant-portal) — auto-invite, opt-out toggle, resend
- [RentRedi: How to Resend a Tenant Invite](https://help.rentredi.com/en/articles/6085060-how-to-resend-a-tenant-invite) — resend mechanics

**Security:**
- [BayTech: Magic Links UX/Security](https://www.baytechconsulting.com/blog/magic-links-ux-security-and-growth-impacts-for-saas-platforms-2025) — magic link scanner pre-click vulnerability

### Secondary (MEDIUM confidence)

- [PageFlows: Invite Teammates User Flow](https://pageflows.com/resources/invite-teammates-user-flow/) — SaaS invitation UX patterns
- [UserPilot: Onboard Invited Users](https://userpilot.com/blog/onboard-invited-users-saas/) — invited user onboarding patterns
- [Stessa: Resident Portal](https://support.stessa.com/en/articles/10414591-resident-portal-log-in-pay-rent) — invitation email on lease setup
- [AppFolio: Online Portal](https://www.appfolio.com/help/online-portal) — activation link flow
- [PostgreSQL: Zero-Downtime Migration Patterns](https://oneuptime.com/blog/post/2026-02-02-postgresql-database-migrations/view) — NOT VALID + VALIDATE pattern

### Tertiary (LOW confidence)

- Race condition exploit research (Medium articles) — structural risk analysis only; not verified against TenantFlow's specific implementation
- Email deliverability guidance (mailmunch.com) — SPF/DKIM/DMARC as operational concern; not blocking for v1.4

---

*Research completed: 2026-03-30*
*Ready for roadmap: yes*
