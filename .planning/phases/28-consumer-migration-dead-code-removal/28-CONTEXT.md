# Phase 28: Consumer Migration & Dead Code Removal - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Every invitation creation path in the app uses the unified `useCreateInvitation()` hook, the legacy modal and its supporting code are deleted, and pending invitations are visible and actionable on the tenant list.

Requirements: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07

</domain>

<decisions>
## Implementation Decisions

### Pending Invitations Display (UI-05)
- **D-01:** Inline rows in the same table as active tenants, with status badges (amber for Pending, blue for Sent). No separate section or tabs.
- **D-02:** Status badge only for visual differentiation -- no muted rows, no border accents. Same row styling as active tenants.
- **D-03:** Row shows email in the Name column (they haven't registered yet), dash in Property column, status badge, and "Sent X ago" relative timestamp.
- **D-04:** Separate query for pending invitations via `tenantInvitationQueries`, merged client-side with tenant data. No DB changes needed.

### Invitation Row Actions (UI-05, UI-06)
- **D-05:** Dropdown menu (three-dot MoreHorizontal icon) with Resend, Copy Link, and Cancel. Cancel separated with divider as destructive action.
- **D-06:** Cancel requires a confirmation dialog ("Cancel invitation to jane@email.co?"). No undo toast pattern.

### Duplicate Handling UX (all consumers)
- **D-07:** Info toast with resend action button via sonner. Shows "jane@email.co already has a pending invitation (sent X ago)" with a Resend button in the toast. Same behavior across all 3 consumers (dashboard form, onboarding, lease wizard). Resend button calls `resend()` from `tenant-invite-mutation-options.ts`.

### Accept Flow for Existing Users (UI-07)
- **D-08:** On page load, check if user has an active session. If logged in, skip the signup form entirely and show an "Accept Invitation" button for one-click accept. If not logged in, show the signup form as today.
- **D-09:** Add "Already have an account? Log in to accept" link below the signup form. Links to `/login` with a redirect param back to `/accept-invite?code=XXX`.
- **D-10:** Claude checks the login page for existing redirect support and implements it if needed.

### Claude's Discretion
- Migration ordering across the 3 consumers (which file first)
- Whether to extract a shared `handleDuplicateResult()` utility for the toast pattern or inline it per consumer
- Login page redirect implementation details
- Test update strategy for mocking `useCreateInvitation` vs inline mutations

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Prior Context
- `.planning/REQUIREMENTS.md` -- UI-01 through UI-07 requirement definitions
- `.planning/phases/26-database-stabilization/26-CONTEXT.md` -- Phase 26 decisions (DB defaults, CHECK constraint fix)
- `.planning/phases/27-unified-mutation-hook/27-CONTEXT.md` -- Phase 27 decisions (hook API shape, duplicate detection, cache invalidation, INVITATION_ACCEPT_PATH)
- `.planning/research/ARCHITECTURE.md` -- 4 invitation paths, dead code identification, migration plan
- `.planning/research/SUMMARY.md` -- Research synthesis with migration approach

### The Unified Hook (Phase 27 output)
- `src/hooks/api/use-create-invitation.ts` -- `useCreateInvitation()` hook to consume; returns discriminated `{ status: 'created' }` or `{ status: 'duplicate', existing }`
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` -- `resend()` and `cancel()` mutation factories (kept from Phase 27)
- `src/hooks/api/query-keys/tenant-invitation-keys.ts` -- Query key factory for invitation list queries

### Consumer Files (to be migrated to useCreateInvitation)
- `src/components/tenants/invite-tenant-form.tsx` -- Consumer #1: dashboard invitation form (inline `useMutation` on line 54)
- `src/components/onboarding/onboarding-step-tenant.tsx` -- Consumer #2: onboarding wizard (inline `useMutation` on line 34)
- `src/components/leases/wizard/selection-step-filters.tsx` -- Consumer #3: lease wizard `InlineTenantInvite` (inline `useMutation` on line 38)

### Dead Code (to be deleted)
- `src/components/tenants/invite-tenant-modal.tsx` -- Legacy modal component (entire file)
- `src/components/tenants/tenants.tsx` -- Remove `InviteTenantModal` import/usage, `isInviteModalOpen` references
- `src/stores/tenants-store.ts` -- Remove `isInviteModalOpen`, `openInviteModal`, `closeInviteModal` state
- `src/types/sections/tenants.ts` -- Remove `InviteTenantData` interface, `onInviteTenant` from `TenantsProps`

### Tenant List (pending invitations surface)
- `src/components/tenants/tenants.tsx` -- Main tenant list component; add invitation query + merge + dropdown actions

### Accept Flow
- `src/app/(auth)/accept-invite/page.tsx` -- Accept page (add session check + login link)
- `src/components/auth/accept-invite/invite-signup-form.tsx` -- Signup form (add login link below)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useCreateInvitation()` in `use-create-invitation.ts` -- The unified hook built in Phase 27; all 3 consumers migrate to this
- `resend()` / `cancel()` in `tenant-invite-mutation-options.ts` -- Existing mutation factories for resend/cancel actions
- `tenantInvitationQueries` in `tenant-invitation-keys.ts` -- Query key factory for invitation list (used for pending invitations query)
- `DropdownMenu` in `src/components/ui/dropdown-menu.tsx` -- shadcn dropdown for invitation row actions
- `AlertDialog` in `src/components/ui/alert-dialog.tsx` -- shadcn confirm dialog for cancel action
- `Badge` in `src/components/ui/badge.tsx` -- shadcn badge for Pending/Sent status
- `toast` from `sonner` -- Already used throughout app for mutation feedback
- `handlePostgrestError()` from `#lib/postgrest-error-handler` -- Standard error handling

### Established Patterns
- Mutation hooks create `createClient()` inside each mutation function (no module-level client)
- Cache invalidation in `onSuccess` callbacks via `queryClient.invalidateQueries()`
- Destructive actions use `AlertDialog` for confirmation (e.g., tenant delete, property delete)
- Row actions use `DropdownMenu` with `MoreHorizontal` trigger icon
- Route-based modal at `@modal/(.)tenants/new` already exists and uses `InviteTenantForm`

### Integration Points
- `tenants.tsx` needs: invitation query added, rows merged with tenant data, dropdown actions wired
- 3 consumer files need: inline `useMutation` replaced with `useCreateInvitation()`, duplicate result handled via toast
- `accept-invite/page.tsx` needs: session check before rendering signup form, login link with redirect
- Tests in `__tests__/invite-tenant-form.property.test.tsx` and `invite-tenant-form-success.property.test.tsx` need mock updates

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- standard patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 28-consumer-migration-dead-code-removal*
*Context gathered: 2026-03-30*
