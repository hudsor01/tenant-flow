# Phase 27: Unified Mutation Hook - Research

**Researched:** 2026-03-30
**Domain:** TanStack Query mutation hooks, Supabase PostgREST mutations, invitation flow consolidation
**Confidence:** HIGH

## Summary

Phase 27 creates a single `useCreateInvitation()` hook that centralizes all invitation creation logic currently duplicated across 4 code paths (3 inline `useMutation` blocks + 1 mutation-options factory). The research confirms that all existing code paths follow identical patterns (generate UUID, build URL, insert row, send email) with inconsistencies in the accept URL path (`/auth/accept-invitation` vs `/accept-invite`) and cache invalidation (some paths skip dashboard key invalidation, one skips invitation list invalidation).

The codebase has well-established mutation hook patterns in `src/hooks/api/` that use `mutationOptions()` factories separated from hook files. The new hook will follow this existing pattern while adding duplicate detection (pre-check query) and a discriminated return type. No new libraries are needed. All tools already exist in the codebase.

**Primary recommendation:** Create a new `use-create-invitation.ts` hook file in `src/hooks/api/` that wraps a new `createInvitation` mutation-options factory, adds pre-check duplicate detection via a Supabase query before insert, and returns a discriminated result union. Extract `INVITATION_ACCEPT_PATH` to `src/lib/constants/routes.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pre-check before insert. Query for existing pending/sent invitation for the same email + owner before attempting insert. If found, surface the existing invitation to the caller with an option to resend instead of creating a new row.
- **D-02:** The hook returns a discriminated result: `{ status: 'created', invitation }` or `{ status: 'duplicate', existing }`. Callers use this to show appropriate UI (success toast vs "already invited, resend?" prompt).
- **D-03:** Minimal caller params: `{ email, lease_id?, property_id?, unit_id? }`. Hook derives `type` automatically (`lease_id` present = `'lease_signing'`, otherwise `'platform_access'`).
- **D-04:** Hook generates `invitation_code` (crypto.randomUUID()) and `invitation_url` internally. Callers never construct these.
- **D-05:** Hook handles DB insert, email send, and cache invalidation. Returns TanStack Query mutation result.
- **D-06:** `resend()` and `cancel()` remain in `tenant-invite-mutation-options.ts` -- only invitation creation is unified. The existing mutation-options `invite()` function is replaced/removed.
- **D-07:** Canonical accept path is `/accept-invite` (matches the actual Next.js route at `src/app/(auth)/accept-invite/page.tsx`). Extract as `INVITATION_ACCEPT_PATH` constant.
- **D-08:** URL construction: `${NEXT_PUBLIC_APP_URL}${INVITATION_ACCEPT_PATH}?code=${invitationCode}`. No nuqs needed -- accept page reads `searchParams` server-side (one-time read, not URL state management).
- **D-09:** Fix all existing code that uses `/auth/accept-invitation` to use the constant instead.
- **D-10:** Hook always sends email after successful insert. No optional `sendEmail` param. Every invitation = email sent.
- **D-11:** `sendInvitationEmail()` helper already exists in `tenant-invite-mutation-options.ts` -- reuse it in the hook.
- **D-12:** After successful create or resend, invalidate: tenant queries, invitation queries, and `ownerDashboardKeys.all`. This standardizes what's currently inconsistent across the 3 paths.

### Claude's Discretion
- Hook file location (new file in `src/hooks/api/` or alongside mutation-options)
- Whether to export the hook from a new file or extend existing `use-tenant-invitations.ts`
- Error handling patterns (toast in hook vs return error to caller)
- INVITATION_ACCEPT_PATH constant location (lib/constants or co-located)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | Create unified `useCreateInvitation()` hook as the sole mutation entrypoint for all invitation creation | Existing `tenantInviteMutations.invite()` factory provides base pattern; 3 inline mutation blocks show the duplication to eliminate |
| INV-02 | Auto-derive invitation type from context (`lease_id` present = `'lease_signing'`, otherwise `'platform_access'`) | All 4 paths already do this manually; type derivation is a simple ternary |
| INV-03 | Standardize cache invalidation across all invitation paths (tenant queries, invitation queries, dashboard keys) | Research identifies 3 different invalidation patterns currently in use; standardized set documented below |
| INV-04 | User can detect duplicate pending invitation for same email and resend existing instead of creating new | Phase 26 added partial unique index `(email, owner_user_id) WHERE status IN ('pending', 'sent')`; pre-check query pattern documented |
| INV-05 | Extract single `INVITATION_ACCEPT_PATH` constant -- verify path matches actual Next.js route | 4 files use wrong path `/auth/accept-invitation`; 1 test file; actual route is `/accept-invite` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- No `any` types -- use `unknown` with type guards
- No barrel files / re-exports
- No duplicate types -- search `src/types/` before creating any type
- No `as unknown as` type assertions -- use typed mapper functions
- No string literal query keys -- always use `queryOptions()` factories
- No module-level Supabase client -- create `createClient()` inside each mutation/query function
- Max 300 lines per hook file
- Max 50 lines per function
- Mutations must invalidate related query keys including `ownerDashboardKeys.all`
- Use `vi.hoisted()` for mock variables referenced inside `vi.mock()` factory functions
- Vitest 4.x + chai 6.x bug: use `.rejects.toMatchObject()` not `.rejects.toThrow('string')`
- Auth: use `getSession()` only for reading access_token string; use `getUser()` for security decisions
- Constants use `UPPER_SNAKE_CASE`; files use `kebab-case`
- Imports use `#` prefix path aliases

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.90 | Mutation hooks, cache invalidation, query options | Already in use; all mutations use this |
| @supabase/supabase-js | 2.97 | PostgREST insert/select for tenant_invitations | Already in use; all data access through Supabase |
| @supabase/ssr | 0.8 | Client creation with cookie-based auth | Already in use; `createClient()` pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | (existing) | Toast notifications for success/error | Used in all mutation hooks for user feedback |
| zod | (existing) | Validation schemas for invitation types | Existing schemas in `src/lib/validation/tenants.ts` |

No new libraries needed. Everything required is already in the project.

## Architecture Patterns

### Recommended File Structure
```
src/
  hooks/api/
    use-create-invitation.ts        # NEW: useCreateInvitation() hook
    use-tenant-invite-mutations.ts   # MODIFIED: remove useInviteTenantMutation, keep resend/cancel
    query-keys/
      tenant-invite-mutation-options.ts  # MODIFIED: remove invite(), keep resend/cancel/sendInvitationEmail
      tenant-invitation-keys.ts          # UNCHANGED
  lib/
    constants/
      routes.ts                      # NEW: INVITATION_ACCEPT_PATH constant
```

### Pattern 1: Discriminated Return Union for Mutation Result

**What:** The mutation function returns a discriminated union that tells callers whether a new invitation was created or a duplicate was found.

**When to use:** When a mutation has two valid outcomes that require different UI responses.

**Example:**
```typescript
// Types (define in the hook file, not in src/types/ -- these are hook-internal)
type CreateInvitationResult =
  | { status: 'created'; invitation: InvitationRecord }
  | { status: 'duplicate'; existing: InvitationRecord }

// In mutationFn:
async function createInvitation(params: CreateInvitationParams): Promise<CreateInvitationResult> {
  const supabase = createClient()

  // 1. Pre-check for duplicate
  const { data: existing } = await supabase
    .from('tenant_invitations')
    .select('id, email, status, created_at, expires_at')
    .eq('email', params.email)
    .eq('owner_user_id', ownerUserId)
    .in('status', ['pending', 'sent'])
    .limit(1)

  if (existing && existing.length > 0) {
    return { status: 'duplicate', existing: existing[0] }
  }

  // 2. Derive type
  const type = params.lease_id ? 'lease_signing' : 'platform_access'

  // 3. Insert + email + return created
  // ...
  return { status: 'created', invitation }
}
```

### Pattern 2: Mutation Hook with Internal Cache Invalidation

**What:** The hook wraps `useMutation` and handles all cache invalidation in `onSuccess`, following the established codebase pattern.

**When to use:** All mutation hooks in this codebase follow this pattern.

**Example:**
```typescript
export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.tenants.invite,
    mutationFn: createInvitation,
    onSuccess: (result) => {
      // Standardized invalidation for ALL invitation paths
      queryClient.invalidateQueries({ queryKey: tenantQueries.all() })
      queryClient.invalidateQueries({ queryKey: tenantInvitationQueries.invitations() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })

      if (result.status === 'created') {
        // Caller handles toast
      }
      // Duplicate case: caller handles "resend?" prompt
    },
    onError: (error) => handleMutationError(error, 'Create invitation')
  })
}
```

### Pattern 3: Constant Extraction for Route Paths

**What:** Extract hardcoded route strings into named constants so all consumers reference a single source of truth.

**When to use:** When multiple files reference the same route path and drift has already occurred.

**Example:**
```typescript
// src/lib/constants/routes.ts
/** Canonical accept-invite page path. Must match src/app/(auth)/accept-invite/page.tsx */
export const INVITATION_ACCEPT_PATH = '/accept-invite' as const

// Usage in hook:
import { INVITATION_ACCEPT_PATH } from '#lib/constants/routes'

const invitationUrl = `${appBaseUrl}${INVITATION_ACCEPT_PATH}?code=${invitationCode}`
```

### Anti-Patterns to Avoid

- **Inline mutation logic in components:** All 3 component files currently define `useMutation` inline with duplicated insert/email logic. This is exactly what Phase 27 eliminates.
- **Hardcoded route strings:** 4 files use `/auth/accept-invitation` which does not match the actual route `/accept-invite`. Never hardcode route strings that are used in multiple places.
- **Inconsistent cache invalidation:** Some paths invalidate `tenantQueries.all()`, others only `tenantQueries.lists()`, and some skip `ownerDashboardKeys.all`. Standardize to the broadest set.
- **Toast in mutationFn:** Toast notifications belong in `onSuccess`/`onError` callbacks in the hook, not inside the mutation function itself. Keep mutationFn pure (data only).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Browser native, already used in all 4 paths |
| Email sending | Direct Resend API call | `sendInvitationEmail()` from mutation-options | Already handles auth token, Edge Function URL, error catching |
| Cache invalidation logic | Custom invalidation per component | TanStack Query `invalidateQueries()` in hook | Consistent, covers all key hierarchies |
| Error handling | Custom try/catch in each component | `handleMutationError()` + `handlePostgrestError()` | Existing centralized handlers with logging and user-friendly toasts |
| Owner ID resolution | Inline auth.getUser() + manual checks | `getCachedUser()` + direct `user.id` | Cached, consistent, avoids redundant auth calls |

**Key insight:** The existing codebase already has all the building blocks. This phase is about composition and consolidation, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Duplicate Detection Race Condition
**What goes wrong:** Two browser tabs submit the same email simultaneously. The pre-check passes in both, and both attempt insert. The DB unique index (added in Phase 26) catches one with a constraint violation error.
**Why it happens:** Pre-check and insert are not atomic.
**How to avoid:** Handle the unique constraint violation error (PostgreSQL error code `23505`) as a graceful fallback to the duplicate path. The pre-check is a UX optimization (avoids the error in 99% of cases), not the sole protection.
**Warning signs:** Uncaught PostgREST error with `code: '23505'` or message containing `duplicate key value violates unique constraint`.

### Pitfall 2: Wrong Accept URL in invitation_url Column
**What goes wrong:** The `invitation_url` column in the database stores the wrong path. The Edge Function `send-tenant-invitation` has a fallback that uses the stored `invitation_url` if present, but falls back to the correct path `/accept-invite` if not.
**Why it happens:** All 4 current code paths write `/auth/accept-invitation` into the DB column. The Edge Function fallback masks this bug for emails, but the stored URL is still wrong if anyone copies it directly from the DB.
**How to avoid:** Use `INVITATION_ACCEPT_PATH` constant for URL construction. Fix all existing paths in this phase.
**Warning signs:** `invitation_url` values in the database containing `/auth/accept-invitation`.

### Pitfall 3: Forgetting Dashboard Key Invalidation
**What goes wrong:** After creating an invitation, the dashboard still shows stale tenant/invitation counts until the user navigates away and back.
**Why it happens:** Only 1 of the 4 current paths invalidates `ownerDashboardKeys.all`. The other 3 only invalidate domain-specific keys.
**How to avoid:** The unified hook MUST invalidate all three: `tenantQueries.all()`, `tenantInvitationQueries.invitations()`, and `ownerDashboardKeys.all`.
**Warning signs:** Dashboard numbers not updating after invitation actions.

### Pitfall 4: sendInvitationEmail Using getSession() Incorrectly
**What goes wrong:** The existing `sendInvitationEmail()` helper uses `getSession()` to get the access token. Per project rules, `getSession()` is acceptable only for reading the access_token string (which is what this does), not for security decisions.
**Why it happens:** This is actually correct usage -- but worth flagging because it looks suspicious when reading the code.
**How to avoid:** Keep `getSession()` for token retrieval. The Edge Function itself validates the user with `getUser()`.
**Warning signs:** None -- this is currently correct.

### Pitfall 5: Type Collision with Existing TenantInvitation
**What goes wrong:** Creating a new type `CreateInvitationResult` that conflicts with the existing `TenantInvitation` type in `src/types/api-contracts.ts` or `src/lib/validation/tenants.ts`.
**Why it happens:** Two different `TenantInvitation` types already exist (one in api-contracts, one from zod schema). The hook needs its own result type but must not duplicate or shadow these.
**How to avoid:** Name the hook's internal types distinctly: `CreateInvitationParams` for input, `CreateInvitationResult` for output. The `invitation` field in the result should use the Supabase-generated `Row` type from `tenant_invitations`, not the app-level `TenantInvitation`.
**Warning signs:** TypeScript errors about conflicting type definitions.

## Code Examples

### Complete Hook Implementation Pattern

```typescript
// src/hooks/api/use-create-invitation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { INVITATION_ACCEPT_PATH } from '#lib/constants/routes'
import { tenantQueries } from './query-keys/tenant-keys'
import { tenantInvitationQueries } from './query-keys/tenant-invitation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'
import { mutationKeys } from './mutation-keys'
// Import sendInvitationEmail from mutation-options (reuse, don't duplicate)
```

### Duplicate Pre-check Query

```typescript
// Pre-check: does this email already have an active invitation from this owner?
const { data: existingInvitations } = await supabase
  .from('tenant_invitations')
  .select('id, email, status, created_at, expires_at, invitation_url')
  .eq('email', params.email)
  .eq('owner_user_id', ownerUserId)
  .in('status', ['pending', 'sent'])
  .limit(1)

if (existingInvitations && existingInvitations.length > 0) {
  return { status: 'duplicate' as const, existing: existingInvitations[0] }
}
```

### Type Derivation

```typescript
// Auto-derive type -- no user-facing selector needed
const invitationType = params.lease_id ? 'lease_signing' : 'platform_access'
```

### URL Construction with Constant

```typescript
// src/lib/constants/routes.ts
/** Canonical accept-invite page path. Must match src/app/(auth)/accept-invite/page.tsx */
export const INVITATION_ACCEPT_PATH = '/accept-invite' as const

// In mutation:
const invitationCode = crypto.randomUUID()
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
const invitationUrl = `${appBaseUrl}${INVITATION_ACCEPT_PATH}?code=${invitationCode}`
```

### Insert with Constraint Violation Fallback

```typescript
const { data: invitation, error: insertError } = await supabase
  .from('tenant_invitations')
  .insert({
    email: params.email,
    owner_user_id: ownerUserId,
    property_id: params.property_id ?? null,
    unit_id: params.unit_id ?? null,
    lease_id: params.lease_id ?? null,
    invitation_code: invitationCode,
    invitation_url: invitationUrl,
    status: 'sent',
    type: invitationType
    // expires_at: omit -- DB DEFAULT handles this (Phase 26)
  })
  .select()
  .single()

// Handle unique constraint violation (race condition fallback)
if (insertError?.code === '23505') {
  // Another request created the invitation between pre-check and insert
  const { data: raceExisting } = await supabase
    .from('tenant_invitations')
    .select('id, email, status, created_at, expires_at, invitation_url')
    .eq('email', params.email)
    .eq('owner_user_id', ownerUserId)
    .in('status', ['pending', 'sent'])
    .limit(1)
    .single()

  if (raceExisting) {
    return { status: 'duplicate' as const, existing: raceExisting }
  }
}

if (insertError) handlePostgrestError(insertError, 'tenant_invitations')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4 inline `useMutation` blocks | Centralized `useCreateInvitation()` hook | Phase 27 (now) | Single source of truth for invitation creation |
| Hardcoded `/auth/accept-invitation` | `INVITATION_ACCEPT_PATH` constant | Phase 27 (now) | Correct URL, single definition |
| Client-generated `expires_at` | DB DEFAULT `NOW() + INTERVAL '7 days'` | Phase 26 (done) | Omit `expires_at` from INSERT |
| Inconsistent cache invalidation per path | Standardized 3-key invalidation set | Phase 27 (now) | Dashboard always reflects current state |

**Deprecated/outdated:**
- `tenantInviteMutations.invite()` factory in `tenant-invite-mutation-options.ts`: will be replaced by the new hook's internal mutation function. Remove after Phase 28 migration completes (or in this phase if D-06 says to).
- `useInviteTenantMutation()` in `use-tenant-invite-mutations.ts`: replaced by `useCreateInvitation()`. Remove in this phase per D-06.

## Existing Code Audit

### Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/api/use-create-invitation.ts` | New unified hook |
| `src/lib/constants/routes.ts` | `INVITATION_ACCEPT_PATH` constant |
| `src/hooks/api/__tests__/use-create-invitation.test.ts` | Unit tests for new hook |

### Files to Modify
| File | Change | Why |
|------|--------|-----|
| `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` | Remove `invite()` factory; export `sendInvitationEmail` for reuse | D-06: invite factory replaced by hook |
| `src/hooks/api/use-tenant-invite-mutations.ts` | Remove `useInviteTenantMutation()` export; keep resend/cancel/notification | D-06: old hook replaced |
| `src/hooks/api/__tests__/use-tenant.test.tsx` | Update invite mutation tests to use new hook; fix URL in test mock | Tests reference old hook and wrong URL |

### Files with Wrong Accept URL (D-09)
| File | Line | Current Value | Action |
|------|------|---------------|--------|
| `src/components/tenants/invite-tenant-form.tsx` | 62 | `/auth/accept-invitation` | Replace with `INVITATION_ACCEPT_PATH` import (Phase 28 replaces entire mutation inline) |
| `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` | 85 | `/auth/accept-invitation` | Remove with invite() factory |
| `src/components/onboarding/onboarding-step-tenant.tsx` | 44 | `/auth/accept-invitation` | Phase 28 replaces inline mutation; but fix now for correctness |
| `src/components/leases/wizard/selection-step-filters.tsx` | 45 | `/auth/accept-invitation` | Phase 28 replaces inline mutation; but fix now for correctness |
| `src/hooks/api/__tests__/use-tenant.test.tsx` | 414 | `/auth/accept-invitation` | Fix test mock URL |

### Cache Invalidation Audit
| Path | Currently Invalidates | Missing |
|------|----------------------|---------|
| `invite-tenant-form.tsx` (inline) | `tenantQueries.all()` | `tenantInvitationQueries.invitations()`, `ownerDashboardKeys.all` |
| `onboarding-step-tenant.tsx` (inline) | `tenantQueries.lists()` | `tenantInvitationQueries.invitations()`, `ownerDashboardKeys.all` |
| `selection-step-filters.tsx` (inline) | `tenantQueries.lists()`, `tenantInvitationQueries.invitations()` | `ownerDashboardKeys.all` |
| `use-tenant-invite-mutations.ts` (hook) | `tenantQueries.lists()`, `tenantInvitationQueries.invitations()`, `leaseQueries.lists()` | `ownerDashboardKeys.all` |

**Standardized set (D-12):** `tenantQueries.all()`, `tenantInvitationQueries.invitations()`, `ownerDashboardKeys.all`

## Discretion Recommendations

Based on codebase patterns and project conventions:

### Hook File Location
**Recommendation:** New file `src/hooks/api/use-create-invitation.ts`. Rationale:
- No existing `use-tenant-invitations.ts` file exists (only `use-tenant-invite-mutations.ts`)
- The existing `use-tenant-invite-mutations.ts` file contains resend/cancel/notification hooks -- adding creation would exceed 300 lines
- A dedicated file makes the "sole entrypoint" nature explicit
- Naming follows kebab-case convention

### Error Handling Pattern
**Recommendation:** Return error to caller via TanStack Query's standard `error` / `isError` state. Add `onError` callback in hook for `handleMutationError()` (toast + logging). Do NOT toast for the `duplicate` result -- that is a valid successful outcome, not an error. The caller (Phase 28) decides how to present duplicates.

### INVITATION_ACCEPT_PATH Location
**Recommendation:** `src/lib/constants/routes.ts`. Rationale:
- `src/lib/constants/` already has `billing.ts`, `error-messages.ts`, `query-config.ts`, `status-types.ts`
- Routes are a natural constant category
- The file can grow as more route constants are needed
- Import: `import { INVITATION_ACCEPT_PATH } from '#lib/constants/routes'`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` (project: unit) |
| Quick run command | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INV-01 | `useCreateInvitation()` inserts into tenant_invitations and calls Edge Function | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` | Wave 0 |
| INV-02 | Hook derives `lease_signing` when `lease_id` present, `platform_access` otherwise | unit | Same file, specific test case | Wave 0 |
| INV-03 | After success, invalidates tenant, invitation, and dashboard query keys | unit | Same file, cache invalidation test | Wave 0 |
| INV-04 | Pre-check finds duplicate and returns `{ status: 'duplicate', existing }` | unit | Same file, duplicate detection test | Wave 0 |
| INV-05 | `INVITATION_ACCEPT_PATH` constant equals `/accept-invite` and is used in URL construction | unit | Same file + constant import test | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/api/__tests__/use-create-invitation.test.ts` -- covers INV-01 through INV-05
- [ ] Update existing `src/hooks/api/__tests__/use-tenant.test.tsx` -- fix wrong URL in test mock (line 414), remove tests for deleted `useInviteTenantMutation` or redirect them

## Open Questions

1. **`sendInvitationEmail` export visibility**
   - What we know: Currently a module-private function in `tenant-invite-mutation-options.ts`. The new hook needs to call it.
   - What's unclear: Whether to export it from its current file or move it to a shared utility.
   - Recommendation: Export it from `tenant-invite-mutation-options.ts` with the `export` keyword. It is already co-located with resend/cancel which also use it. Moving it would be premature -- if Phase 28 changes the email pattern, it can be moved then.

2. **Should the 3 inline mutations in components be fixed now or in Phase 28?**
   - What we know: D-09 says fix all wrong URLs. D-06 says the old `invite()` factory is removed. But the 3 components still have inline mutations that Phase 28 will migrate.
   - What's unclear: Whether to fix the URL in the inline mutations now (they'll be deleted in Phase 28 anyway).
   - Recommendation: Fix the URLs now for correctness (any invitation created between Phase 27 and Phase 28 would have the wrong URL otherwise). The fix is a string replacement -- minimal effort, zero risk.

## Sources

### Primary (HIGH confidence)
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` -- Existing mutation factories, `sendInvitationEmail()` helper
- `src/hooks/api/use-tenant-invite-mutations.ts` -- Existing hook pattern (spread factory + callbacks)
- `src/hooks/api/use-tenant-mutations.ts` -- Established mutation hook pattern with cache invalidation
- `src/hooks/api/query-keys/tenant-invitation-keys.ts` -- Invitation query keys for invalidation
- `src/hooks/api/use-owner-dashboard.ts` -- Dashboard keys for invalidation
- `src/types/supabase.ts` (lines 1792-1876) -- Generated `tenant_invitations` table schema
- `src/types/api-contracts.ts` (lines 332-344) -- Existing `TenantInvitation` interface
- `src/lib/validation/tenants.ts` (lines 183-262) -- Zod schemas for invitation types/statuses
- `src/app/(auth)/accept-invite/page.tsx` -- Canonical accept route (confirms `/accept-invite` is correct)
- `proxy.ts` (line 24) -- Confirms `/accept-invite` is in public routes list
- `supabase/functions/send-tenant-invitation/index.ts` -- Edge Function already uses correct fallback path
- `.planning/phases/26-database-stabilization/26-CONTEXT.md` -- D-05: `expires_at` has DB DEFAULT, D-06: client-side removed

### Secondary (MEDIUM confidence)
- `src/hooks/api/mutation-keys.ts` -- Mutation key structure (`mutationKeys.tenants.invite`)
- `src/lib/constants/*.ts` -- Convention for constant file naming and structure
- `vitest.config.ts` -- Test project configuration (unit tests in jsdom)
- `src/hooks/api/__tests__/use-tenant.test.tsx` -- Existing test patterns for tenant mutations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing patterns
- Architecture: HIGH -- well-established mutation hook pattern in codebase; direct code inspection
- Pitfalls: HIGH -- all pitfalls identified from actual code inspection (wrong URLs, inconsistent invalidation, race conditions)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- no external dependencies changing)
