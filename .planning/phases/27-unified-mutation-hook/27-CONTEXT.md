# Phase 27: Unified Mutation Hook - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a single `useCreateInvitation()` hook that is the sole entrypoint for all invitation creation. It handles type derivation, duplicate detection, DB insert, email send, and cache invalidation. No UI migration in this phase -- that's Phase 28.

Requirements: INV-01, INV-02, INV-03, INV-04, INV-05

</domain>

<decisions>
## Implementation Decisions

### Duplicate Detection (INV-04)
- **D-01:** Pre-check before insert. Query for existing pending/sent invitation for the same email + owner before attempting insert. If found, surface the existing invitation to the caller with an option to resend instead of creating a new row.
- **D-02:** The hook returns a discriminated result: `{ status: 'created', invitation }` or `{ status: 'duplicate', existing }`. Callers use this to show appropriate UI (success toast vs "already invited, resend?" prompt).

### Hook API Shape (INV-01, INV-02)
- **D-03:** Minimal caller params: `{ email, lease_id?, property_id?, unit_id? }`. Hook derives `type` automatically (`lease_id` present = `'lease_signing'`, otherwise `'platform_access'`).
- **D-04:** Hook generates `invitation_code` (crypto.randomUUID()) and `invitation_url` internally. Callers never construct these.
- **D-05:** Hook handles DB insert, email send, and cache invalidation. Returns TanStack Query mutation result.
- **D-06:** `resend()` and `cancel()` remain in `tenant-invite-mutation-options.ts` -- only invitation creation is unified. The existing mutation-options `invite()` function is replaced/removed.

### Accept URL Constant (INV-05)
- **D-07:** Canonical accept path is `/accept-invite` (matches the actual Next.js route at `src/app/(auth)/accept-invite/page.tsx`). Extract as `INVITATION_ACCEPT_PATH` constant.
- **D-08:** URL construction: `${NEXT_PUBLIC_APP_URL}${INVITATION_ACCEPT_PATH}?code=${invitationCode}`. No nuqs needed -- accept page reads `searchParams` server-side (one-time read, not URL state management).
- **D-09:** Fix all existing code that uses `/auth/accept-invitation` to use the constant instead.

### Email Send Behavior
- **D-10:** Hook always sends email after successful insert. No optional `sendEmail` param. Every invitation = email sent.
- **D-11:** `sendInvitationEmail()` helper already exists in `tenant-invite-mutation-options.ts` -- reuse it in the hook.

### Cache Invalidation (INV-03)
- **D-12:** After successful create or resend, invalidate: tenant queries, invitation queries, and `ownerDashboardKeys.all`. This standardizes what's currently inconsistent across the 3 paths.

### Claude's Discretion
- Hook file location (new file in `src/hooks/api/` or alongside mutation-options)
- Whether to export the hook from a new file or extend existing `use-tenant-invitations.ts`
- Error handling patterns (toast in hook vs return error to caller)
- INVITATION_ACCEPT_PATH constant location (lib/constants or co-located)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- INV-01 through INV-05 requirement definitions
- `.planning/phases/26-database-stabilization/26-CONTEXT.md` -- Phase 26 decisions (D-05: client-generated code/URL, D-06: expires_at removed)

### Existing Code (to be modified/consumed)
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` -- Existing invite(), resend(), cancel() factories; sendInvitationEmail() helper
- `src/hooks/api/query-keys/tenant-invitation-keys.ts` -- Invitation query key factory
- `src/hooks/api/query-keys/tenant-keys.ts` -- Tenant query keys (for cache invalidation)

### Invitation Creation Paths (Phase 28 will migrate these, but Phase 27 needs to understand their patterns)
- `src/components/tenants/invite-tenant-form.tsx` -- Dashboard invitation form
- `src/components/onboarding/onboarding-step-tenant.tsx` -- Onboarding wizard invitation
- `src/components/leases/wizard/selection-step-filters.tsx` -- Lease wizard inline invitation

### Accept Flow
- `src/app/(auth)/accept-invite/page.tsx` -- Canonical accept route (the target of INVITATION_ACCEPT_PATH)
- `src/components/auth/accept-invite/invite-signup-form.tsx` -- Accept form component
- `proxy.ts` -- Route protection (accept-invite is public)

### Edge Functions
- `supabase/functions/send-tenant-invitation/index.ts` -- Email send function called by hook

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendInvitationEmail()` in `tenant-invite-mutation-options.ts` -- Already handles Edge Function call with auth token; reuse directly
- `tenantInvitationQueries` in `tenant-invitation-keys.ts` -- Query key factory for invitation list queries
- `tenantQueries` in `tenant-keys.ts` -- Tenant list query keys
- `handlePostgrestError()` from `#lib/postgrest-error-handler` -- Standard error handling

### Established Patterns
- Mutation options use `mutationOptions()` from TanStack Query with `mutationKey` + `mutationFn`
- Hooks create `createClient()` inside each mutation function (no module-level client)
- Cache invalidation in `onSuccess` callbacks using `queryClient.invalidateQueries()`
- `getCachedUser()` + `requireOwnerUserId()` for auth in mutations

### Integration Points
- All 3 INSERT paths currently generate `invitationCode` and `invitationUrl` inline -- hook centralizes this
- Some paths use `/auth/accept-invitation`, others `/accept-invite` -- constant fixes this
- Dashboard keys (`ownerDashboardKeys.all`) must be invalidated alongside domain-specific keys

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- standard hook patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 27-unified-mutation-hook*
*Context gathered: 2026-03-30*
