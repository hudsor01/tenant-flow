# Phase 28: Consumer Migration & Dead Code Removal - Research

**Researched:** 2026-03-30
**Domain:** React hook migration, dead code removal, tenant list UI, accept-invite flow
**Confidence:** HIGH

## Summary

Phase 28 is a consumer-side migration and cleanup phase. The unified `useCreateInvitation()` hook already exists from Phase 27. This phase does three things: (1) swap inline `useMutation` calls in three consumer files to use the hook, (2) delete the legacy `InviteTenantModal` and all its supporting dead code, and (3) add pending invitation visibility on the tenant list page with resend, cancel, and copy-link actions.

The codebase is well-positioned for this work. All three consumer files (`invite-tenant-form.tsx`, `onboarding-step-tenant.tsx`, `selection-step-filters.tsx`) follow the same pattern -- an inline `useMutation` that duplicates ~30 lines of invitation insert logic. Replacing each with `useCreateInvitation()` is a mechanical swap of approximately 15 lines changed per file. The dead code to remove is cleanly scoped: one component file, three Zustand state properties, one type interface, and scattered import references across four additional files.

The pending invitations display (UI-05) requires a new query for pending/sent invitations, client-side merging with tenant data, and new invitation-specific table rows with dropdown actions. The accept-invite session check (UI-07) requires reading the Supabase session on the accept-invite page and conditionally rendering either a one-click accept button (logged in) or the signup form with a login link (not logged in).

**Primary recommendation:** Execute in dependency order: consumer migrations first (unblock dead code removal), dead code deletion second (clean compile), tenant list pending invitations third (new feature), accept-invite flow last (independent feature).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Inline rows in the same table as active tenants, with status badges (amber for Pending, blue for Sent). No separate section or tabs.
- **D-02:** Status badge only for visual differentiation -- no muted rows, no border accents. Same row styling as active tenants.
- **D-03:** Row shows email in the Name column (they haven't registered yet), dash in Property column, status badge, and "Sent X ago" relative timestamp.
- **D-04:** Separate query for pending invitations via `tenantInvitationQueries`, merged client-side with tenant data. No DB changes needed.
- **D-05:** Dropdown menu (three-dot MoreHorizontal icon) with Resend, Copy Link, and Cancel. Cancel separated with divider as destructive action.
- **D-06:** Cancel requires a confirmation dialog ("Cancel invitation to jane@email.co?"). No undo toast pattern.
- **D-07:** Info toast with resend action button via sonner. Shows "jane@email.co already has a pending invitation (sent X ago)" with a Resend button in the toast. Same behavior across all 3 consumers (dashboard form, onboarding, lease wizard). Resend button calls `resend()` from `tenant-invite-mutation-options.ts`.
- **D-08:** On page load, check if user has an active session. If logged in, skip the signup form entirely and show an "Accept Invitation" button for one-click accept. If not logged in, show the signup form as today.
- **D-09:** Add "Already have an account? Log in to accept" link below the signup form. Links to `/login` with a redirect param back to `/accept-invite?code=XXX`.
- **D-10:** Claude checks the login page for existing redirect support and implements it if needed.

### Claude's Discretion
- Migration ordering across the 3 consumers (which file first)
- Whether to extract a shared `handleDuplicateResult()` utility for the toast pattern or inline it per consumer
- Login page redirect implementation details
- Test update strategy for mocking `useCreateInvitation` vs inline mutations

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Migrate `invite-tenant-form.tsx` to use `useCreateInvitation()` hook | Consumer #1 analysis (lines 54-115 inline mutation to be replaced); hook API shape confirmed via `use-create-invitation.ts` |
| UI-02 | Migrate `onboarding-step-tenant.tsx` to use `useCreateInvitation()` hook | Consumer #2 analysis (lines 34-99 inline mutation to be replaced); no `first_name`/`last_name` in hook params but those are form-only fields, not required by hook |
| UI-03 | Migrate lease wizard `selection-step-filters.tsx` to use `useCreateInvitation()` hook | Consumer #3 analysis (lines 38-97 inline mutation to be replaced); `propertyId` prop maps to `property_id` in hook params |
| UI-04 | Delete `InviteTenantModal` and associated Zustand store state and dead types | Dead code inventory complete: 1 file to delete, 4 files to clean, 10 references across codebase |
| UI-05 | User can see pending invitations on tenant list page with resend and cancel actions | `tenantInvitationQueries.list()` exists; `TenantSectionInvitation` type exists; `resend()`/`cancel()` mutation factories exist |
| UI-06 | User can copy invitation link to clipboard from invitation row | `invitation_url` column available in DB query; clipboard pattern established in `two-factor-setup-dialog.tsx` |
| UI-07 | Existing user visiting accept page is routed to login instead of seeing signup form that errors | Login page already supports `?redirect` param (line 93-101 of login/page.tsx with `isValidRedirect` guard); accept-invite page needs session check |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives that directly affect this phase's implementation:

- **No `any` types** -- all new code must use `unknown` with type guards
- **No barrel files / re-exports** -- import directly from defining files
- **No duplicate types** -- check `src/types/` before creating anything new
- **No commented-out code** -- delete dead code, do not comment it out
- **No string literal query keys** -- use `queryOptions()` factories from `src/hooks/api/query-keys/`
- **No `as unknown as` type assertions** -- use typed mapper functions at RPC/PostgREST boundaries
- **No module-level Supabase client** -- create `createClient()` inside each mutation/query function
- **Max 300 lines per component, 50 lines per function**
- **Mutations must invalidate related query keys** including `ownerDashboardKeys.all`
- **`getAll`/`setAll` cookie methods only** for Supabase auth
- **`getUser()` for security decisions, `getSession()` only for reading access_token** to pass as Bearer header
- **All icon buttons must have `aria-label`** (not just `title`)
- **Vitest 4.x + chai 6.x bug**: `.rejects.toThrow('string')` crashes -- use `.rejects.toMatchObject({ message: expect.stringContaining('...') })` instead
- **`vi.hoisted()` for mock variables** referenced inside `vi.mock()` factory functions
- **Test coverage threshold**: 80% lines/functions/branches/statements

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | 5.90 | Mutation hooks, cache invalidation | Already used for `useCreateInvitation()`, `useResendInvitationMutation()`, `useCancelInvitationMutation()` |
| `sonner` | (installed) | Toast notifications for duplicate detection, success/error feedback | Already used project-wide; D-07 requires toast with action button |
| `date-fns` | ^4.1.0 | `formatDistanceToNow` for "Sent X ago" timestamps | Already installed; D-03 requires relative time display |
| `lucide-react` | (installed) | `MoreHorizontal`, `RefreshCw`, `Link`, `XCircle` icons | Sole icon library per CLAUDE.md |

### Supporting (already installed, no additions)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand` | 5 | Remove dead modal state from `tenants-store.ts` | UI-04 cleanup |
| `@tanstack/react-form` | 1.28 | Form in `invite-tenant-form.tsx` (unchanged) | Consumer #1 retains its form |
| `next/navigation` | 16.1 | `useRouter`, `useSearchParams` for redirect support | UI-07 login redirect |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Migration Order

```
Wave 1: Consumer Migrations (UI-01, UI-02, UI-03) -- independent, parallelizable
  invite-tenant-form.tsx       -- most complex (TanStack Form + property fields)
  onboarding-step-tenant.tsx   -- simplest (3 fields, useState)
  selection-step-filters.tsx   -- medium (inline form, propertyId prop)

Wave 2: Dead Code Removal (UI-04)
  invite-tenant-modal.tsx      -- DELETE file
  tenants.tsx                  -- remove InviteTenantModal import/usage
  tenants-store.ts             -- remove modal state
  sections/tenants.ts          -- remove InviteTenantData, onInviteTenant
  tenants/page.tsx             -- remove dead callback/props

Wave 3: Pending Invitations (UI-05, UI-06)
  tenants.tsx                  -- add invitation query, merge data, render rows
  (new row variant)            -- invitation-specific table rows with dropdown

Wave 4: Accept Flow (UI-07)
  accept-invite/page.tsx       -- session check, conditional rendering
  invite-signup-form.tsx       -- login link with redirect
```

### Pattern 1: Consumer Migration (Hook Swap)

**What:** Replace inline `useMutation` with `useCreateInvitation()` and handle the discriminated result.

**When to use:** All three consumer migrations (UI-01, UI-02, UI-03).

**Before (each consumer, ~40 lines of duplicated logic):**
```typescript
const inviteMutation = useMutation({
  mutationFn: async (data) => {
    const supabase = createClient()
    const user = await getCachedUser()
    // ... UUID generation, URL construction, expiry calc, insert, email send
  },
  onSuccess: () => { /* cache invalidation */ },
  onError: (error) => { /* error handling */ }
})
```

**After (~10 lines):**
```typescript
import { useCreateInvitation } from '#hooks/api/use-create-invitation'
import { useResendInvitationMutation } from '#hooks/api/use-tenant-invite-mutations'

const createInvitation = useCreateInvitation()
const resendInvitation = useResendInvitationMutation()

// In submit handler:
const result = await createInvitation.mutateAsync({
  email: value.email,
  property_id: value.property_id || undefined,
  // lease_id omitted = platform_access type auto-derived
})

if (result.status === 'duplicate') {
  // D-07: Info toast with resend action
  handleDuplicateInvitation(result.existing, resendInvitation.mutate)
} else {
  toast.success('Invitation Sent', {
    description: `${firstName} ${lastName} will receive an email...`
  })
  // Consumer-specific post-success: navigate, onNext(), onToggleMode()
}
```

### Pattern 2: Duplicate Detection Toast (D-07)

**What:** When `useCreateInvitation()` returns `{ status: 'duplicate', existing }`, show an info toast with a resend action button.

**Recommendation:** Extract a shared utility function. The three consumers need identical behavior, and inlining produces 10+ lines of duplication in each. The function is stateless (no hooks) so it can be a plain helper.

```typescript
// src/lib/invitation-utils.ts (or inline -- Claude's discretion)
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { CreateInvitationResult } from '#hooks/api/use-create-invitation'

export function handleDuplicateInvitation(
  existing: Extract<CreateInvitationResult, { status: 'duplicate' }>['existing'],
  onResend: (invitationId: string) => void
): void {
  const sentAgo = formatDistanceToNow(new Date(existing.created_at), { addSuffix: true })
  toast.info(
    `${existing.email} already has a pending invitation (sent ${sentAgo})`,
    {
      action: {
        label: 'Resend',
        onClick: () => onResend(existing.id)
      }
    }
  )
}
```

### Pattern 3: Pending Invitation Rows (D-01 through D-06)

**What:** Query pending invitations, merge with tenant data client-side, render as table rows with dropdown actions.

**Data flow:**
```
tenants.tsx
  |
  +-- useQuery(tenantQueries.list())           -> tenant[]
  +-- useQuery(tenantInvitationQueries.list())  -> invitation[]
  |
  +-- merge into unified row data
  |     - tenants: existing TenantItem rows
  |     - invitations: invitation-specific rows with email in Name column
  |
  +-- render in TenantTable or directly
        - Active tenants: existing TenantTableRow
        - Invitations: InvitationTableRow (email, dashes, badge, dropdown)
```

**Invitation row shape (mapped from query result):**
```typescript
// Pseudo-type for merged display -- NOT a new type, just the render shape
{
  type: 'invitation'
  id: string              // invitation ID
  email: string           // shown in Name column
  status: 'pending' | 'sent'
  sentAt: string          // for "Sent X ago"
  invitationUrl: string   // for copy-link
}
```

**Dropdown actions per D-05:**
- Resend: calls `useResendInvitationMutation().mutate(invitationId)` -- already exists
- Copy Link: `navigator.clipboard.writeText(invitationUrl)` then `toast.success(...)` -- pattern from `two-factor-setup-dialog.tsx`
- Cancel (destructive, with separator): opens `ConfirmDialog` per D-06, on confirm calls `useCancelInvitationMutation().mutate(invitationId)` -- already exists

### Pattern 4: Accept-Invite Session Check (D-08, D-09)

**What:** On the accept-invite page, detect if user has an active session and branch UI accordingly.

**Implementation approach:**
```typescript
// In AcceptInviteContent component
const supabase = createClient()
const [session, setSession] = useState<Session | null>(null)
const [checkingSession, setCheckingSession] = useState(true)

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    // Use getUser() not getSession() per CLAUDE.md for security decisions
    if (data.user) {
      // Need session for Bearer token in acceptInvitation()
      supabase.auth.getSession().then(({ data: sessionData }) => {
        setSession(sessionData.session)
      })
    }
    setCheckingSession(false)
  })
}, [supabase])
```

**Branching:**
- If logged in: show "Accept Invitation" button, skip signup form entirely (D-08)
- If not logged in: show existing signup form + login link below (D-09)

**Login redirect already works:** The login page reads `searchParams.get('redirect')` on line 93, validates with `isValidRedirect()`, and redirects post-login. The accept-invite link format `/login?redirect=/accept-invite?code=XXX` will work because:
1. `/accept-invite` starts with `/` (passes first check)
2. Does not start with `//` (passes second check)
3. URL constructor with `window.location.origin` base will parse correctly
4. Hostname matches (passes third check)

**Potential issue:** The redirect URL `/accept-invite?code=XXX` contains a `?` which means `searchParams.get('redirect')` in the login page will only capture `/accept-invite` without the `code` parameter. The `code` parameter will be absorbed into the login page's own search params. Fix: URL-encode the redirect value.

```typescript
// In invite-signup-form.tsx
const redirectUrl = encodeURIComponent(`/accept-invite?code=${code}`)
// Link: /login?redirect=%2Faccept-invite%3Fcode%3DXXX
```

The login page's `isValidRedirect()` then needs to handle the decoded URL, which it already does via `new URL(redirect, window.location.origin)`.

### Anti-Patterns to Avoid

- **Do NOT create new types for invitation rows.** Use `TenantSectionInvitation` from `src/types/sections/tenants.ts` which already exists with the right shape. The `tenantInvitationQueries.list()` query maps to `TenantInvitation` from `api-contracts.ts` -- bridge to `TenantSectionInvitation` via a mapper function.
- **Do NOT modify the `useCreateInvitation()` hook.** It was built in Phase 27 and its API shape is locked. Consumers adapt to it, not the other way around.
- **Do NOT add `first_name`/`last_name` params to `useCreateInvitation()`.** The hook only needs `email` for DB insert. Names are form-level display concerns handled by each consumer's toast message.
- **Do NOT use `as unknown as` to cast invitation query results.** The existing `tenantInvitationQueries.list()` already has a typed mapper function (lines 71-86 of `tenant-invitation-keys.ts`). Follow the same pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time display | Custom date math | `formatDistanceToNow` from `date-fns` | Already installed (^4.1.0), handles edge cases (locale, rounding) |
| Clipboard copy | Custom clipboard wrapper | `navigator.clipboard.writeText()` | Established pattern in `two-factor-setup-dialog.tsx`, browser API is sufficient |
| Confirmation dialog | Custom modal | `ConfirmDialog` from `#components/ui/confirm-dialog` | Already exists with `title`, `description`, `confirmVariant`, `loading` props |
| Dropdown menu | Custom popup | `DropdownMenu` from `#components/ui/dropdown-menu` | Radix-based, accessible, already used in 5 files |
| Toast with action button | Custom notification | `sonner`'s `toast.info()` with `action: { label, onClick }` | sonner supports action buttons natively |
| Open redirect prevention | Custom URL validator | `isValidRedirect()` in login page (line 28) | Already exists and handles protocol-relative URLs |

**Key insight:** Every UI primitive needed for this phase already exists in the project. The only new logic is the data merging in `tenants.tsx` and the session check in the accept-invite page.

## Common Pitfalls

### Pitfall 1: Consumer Tests Still Mock Inline Supabase Calls
**What goes wrong:** Existing tests in `__tests__/invite-tenant-form.property.test.tsx` and `invite-tenant-form-success.property.test.tsx` mock `useMutation` directly with inline mutation functions. After migration, these tests will fail because the component no longer has an inline `useMutation`.
**Why it happens:** Tests were written against the implementation detail (inline mutation) rather than the behavior (invitation is created).
**How to avoid:** Update tests to mock `useCreateInvitation` from `#hooks/api/use-create-invitation` using `vi.mock()` with `vi.hoisted()`. The existing test structure (property-based tests with fast-check) can be preserved -- only the mock target changes.
**Warning signs:** Tests pass individually but fail in the full suite due to incorrect mock scoping.

### Pitfall 2: `TenantInvitation` Type Missing Fields for Display
**What goes wrong:** `TenantInvitation` in `api-contracts.ts` has `status: 'sent' | 'accepted' | 'expired'` but the tenant list needs `'pending'` and `'cancelled'` statuses. The `invitation_url` field is not in the type.
**Why it happens:** The type was defined before the pending invitations feature was scoped.
**How to avoid:** The `tenantInvitationQueries.list()` query already selects `invitation_url` from the DB but the mapper function on line 71 of `tenant-invitation-keys.ts` does NOT include it in the mapped output. The query and mapper need to be updated to include `invitation_url` and the `TenantInvitation` type needs `pending` and `cancelled` added to the status union. Alternatively, use `TenantSectionInvitation` from `sections/tenants.ts` which already has the right status union but lacks `invitation_url`.
**Warning signs:** Clipboard copy action has undefined URL; status badge renders wrong for pending invitations.

### Pitfall 3: URL Encoding in Login Redirect
**What goes wrong:** The link `/login?redirect=/accept-invite?code=XXX` causes the login page's `searchParams.get('redirect')` to return only `/accept-invite` because `?code=XXX` becomes part of the login page's own query parameters.
**Why it happens:** Unencoded `?` in a URL parameter value is interpreted as the start of a new parameter.
**How to avoid:** Use `encodeURIComponent()` when constructing the redirect URL: `/login?redirect=${encodeURIComponent('/accept-invite?code=' + code)}`.
**Warning signs:** After login, user lands on `/accept-invite` without the `code` parameter, seeing "No invitation code provided" error.

### Pitfall 4: Tenants.tsx Props Interface Drift
**What goes wrong:** `TenantsProps` in `sections/tenants.ts` already has `invitations: TenantSectionInvitation[]`, `onResendInvitation`, and `onCancelInvitation` callbacks defined. But the current `Tenants` component destructures `onInviteTenant` without `invitations`, `onResendInvitation`, or `onCancelInvitation`. The page passes `invitations={[]}`.
**Why it happens:** The type was updated (likely during Phase 27 or the UI-SPEC session) but the component was not.
**How to avoid:** When wiring up pending invitations, use the existing prop types. The `tenants/page.tsx` already passes `invitations={[]}`, `onResendInvitation={handleResendInvitation}`, and `onCancelInvitation={handleCancelInvitation}`. The `Tenants` component just needs to destructure and use them. However, the invitation query should move INTO `tenants.tsx` (or be passed from page.tsx) per D-04.
**Warning signs:** TypeScript errors about missing props on `Tenants` component.

### Pitfall 5: Dead Code in Dashboard Files
**What goes wrong:** Dashboard files (`dashboard.tsx`, `owner-dashboard.tsx`, `dashboard/page.tsx`) reference `onInviteTenant` as a prop/callback. Removing it from `TenantsProps` might make someone think it should be removed from dashboard too, but dashboard's `onInviteTenant` is a separate prop that does `router.push('/tenants/new')` -- this is correct behavior and should NOT be deleted.
**Why it happens:** Same prop name (`onInviteTenant`) used in two different component trees for different purposes.
**How to avoid:** Only remove `onInviteTenant` from `TenantsProps` in `sections/tenants.ts`. Leave `Dashboard`'s `onInviteTenant` prop untouched. Verify with grep after cleanup: `onInviteTenant` should still appear in dashboard files but NOT in tenant files.
**Warning signs:** Dashboard "Invite Tenant" quick action stops working after cleanup.

### Pitfall 6: Hook Returns Generic Toast in onSuccess
**What goes wrong:** `useCreateInvitation()` already fires `toast.success('Invitation sent')` in its `onSuccess` handler for the `created` status. If consumers also fire their own success toast, the user sees duplicate toasts.
**Why it happens:** The hook's `onSuccess` (line 136-140 of `use-create-invitation.ts`) fires a generic success toast. Consumers want a personalized toast with the tenant's name.
**How to avoid:** Either (a) remove the generic toast from the hook and let consumers handle it, or (b) keep the hook's toast and have consumers skip their own. Option (a) is cleaner -- the hook should handle cache invalidation and logging, consumers handle user-facing UX. However, modifying the hook is risky (Phase 27 output). Option (b) -- skip consumer toast for `created` status -- is the safer path. Consumers only need to handle the `duplicate` case with the info toast per D-07.
**Warning signs:** Two success toasts appear when sending an invitation.

### Pitfall 7: Invitation Query Missing Status Filter
**What goes wrong:** `tenantInvitationQueries.list()` currently fetches ALL invitations (no status filter). The tenant list only needs pending/sent ones. Fetching accepted/expired/cancelled clutters the display.
**Why it happens:** The list query was built for a general invitation management view, not the filtered tenant list display.
**How to avoid:** Either add a status-filtered variant to `tenantInvitationQueries` (e.g., `.pending()`) or filter client-side after fetching. Client-side filter is simpler and avoids query key proliferation -- the list is small (tens of invitations at most per owner).
**Warning signs:** Expired and accepted invitations appear as rows in the tenant table.

## Code Examples

### Example 1: Consumer Migration (invite-tenant-form.tsx)
```typescript
// Before: inline useMutation (lines 54-115)
const inviteTenantMutation = useMutation({
  mutationFn: async (payload: InviteTenantRequest) => {
    // 60 lines of duplicated insert logic
  },
  onSuccess: async () => { /* invalidation */ },
  onError: (error) => { /* handling */ }
})

// After: hook consumption
import { useCreateInvitation } from '#hooks/api/use-create-invitation'
import { useResendInvitationMutation } from '#hooks/api/use-tenant-invite-mutations'

const createInvitation = useCreateInvitation()
const resendInvitation = useResendInvitationMutation()

// In onSubmit handler:
const result = await createInvitation.mutateAsync({
  email: value.email,
  property_id: value.property_id || undefined,
  unit_id: value.unit_id || undefined,
})

if (result.status === 'duplicate') {
  handleDuplicateInvitation(result.existing, resendInvitation.mutate)
  return
}
// Hook already fires generic toast; consumer handles navigation
onSuccess?.()
router.push('/tenants')
router.refresh()
```

### Example 2: Invitation Dropdown Actions
```typescript
// Source: established pattern from property-units-table-row.tsx
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { MoreHorizontal, RefreshCw, Link, XCircle } from 'lucide-react'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="size-8">
      <MoreHorizontal className="size-4" />
      <span className="sr-only">Actions for invitation to {email}</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleResend(id)}>
      <RefreshCw className="size-4 mr-2" />
      Resend Invitation
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleCopyLink(invitationUrl)}>
      <Link className="size-4 mr-2" />
      Copy Invitation Link
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => setCancelTarget(id)}
    >
      <XCircle className="size-4 mr-2" />
      Cancel Invitation
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Example 3: Clipboard Copy Pattern
```typescript
// Source: established pattern from two-factor-setup-dialog.tsx (line 71)
async function handleCopyLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url)
  toast.success('Invitation link copied to clipboard')
}
```

### Example 4: Sonner Toast with Action Button (D-07)
```typescript
// Source: sonner docs -- toast with action button
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

const sentAgo = formatDistanceToNow(new Date(existing.created_at), { addSuffix: true })
toast.info(
  `${existing.email} already has a pending invitation (sent ${sentAgo})`,
  {
    action: {
      label: 'Resend',
      onClick: () => resendMutation.mutate(existing.id)
    }
  }
)
```

### Example 5: Accept-Invite Login Link with Encoded Redirect (D-09)
```typescript
// Correct: encode the full redirect path
const code = searchParams.get('code')
const redirectUrl = encodeURIComponent(`/accept-invite?code=${code}`)

<Link
  href={`/login?redirect=${redirectUrl}`}
  className="text-primary hover:underline font-medium"
>
  Log in to accept
</Link>
```

## Dead Code Inventory

This phase includes dead code removal (UI-04). Complete inventory of references to delete:

| File | What to Remove | Type |
|------|---------------|------|
| `src/components/tenants/invite-tenant-modal.tsx` | **Entire file** (224 lines) | File delete |
| `src/components/tenants/tenants.tsx` | `InviteTenantModal` import (line 11), two `<InviteTenantModal>` renders (lines 128-133, 240-244), `isInviteModalOpen`/`openInviteModal`/`closeInviteModal` destructured from store (lines 43-45), `openInviteModal` calls (lines 119, 149, 165) | Import + JSX + state usage |
| `src/stores/tenants-store.ts` | `isInviteModalOpen` from state interface (line 37), `openInviteModal`/`closeInviteModal` from actions interface (lines 56-57), initial state (line 71), implementations (lines 102-104), selector `useTenantsModals` entries for modal (lines 145-149) | State + actions |
| `src/types/sections/tenants.ts` | `InviteTenantData` interface (lines 101-109), `onInviteTenant` from `TenantsProps` (line 16) | Type definition |
| `src/app/(owner)/tenants/page.tsx` | `handleInviteTenant` callback (line 95-97) is already `router.push('/tenants/new')` -- but the `onInviteTenant={handleInviteTenant}` prop on `<Tenants>` (line 167) references the dead prop from `TenantsProps` | Prop + callback |

**References that should NOT be removed:**
| File | What to Keep | Why |
|------|-------------|-----|
| `src/components/dashboard/dashboard.tsx` | `onInviteTenant` prop | Different component tree; navigates to `/tenants/new` |
| `src/components/dashboard/owner-dashboard.tsx` | `onInviteTenant` callback | Dashboard quick action, independent of tenant page modal |
| `src/app/(owner)/dashboard/page.tsx` | `onInviteTenant` callback | Dashboard-level navigation |

### Tenants.tsx "Invite Tenant" Buttons After Dead Code Removal

After removing the modal, the "Invite Tenant" buttons in `tenants.tsx` (line 119 in empty state, line 149 in header, line 165 in quick actions) currently call `openInviteModal`. These should be changed to `router.push('/tenants/new')` which triggers the route-based intercepting modal at `@modal/(.)tenants/new/page.tsx` (confirmed to exist and work).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand-driven custom modal for invitation | Route-based intercepting modal (`@modal/(.)tenants/new`) | Already implemented | Tenants page no longer needs modal state; Zustand entries are dead |
| 4 inline mutation paths | Single `useCreateInvitation()` hook | Phase 27 | All consumers migrate to one hook |
| `type: 'portal_access'` hardcoded in form | Type auto-derived from `lease_id` presence | Phase 27 hook | CHECK constraint violation eliminated |
| No duplicate detection | Pre-check + 23505 fallback in hook | Phase 27 hook | Duplicate invitations prevented with resend option |

## Open Questions

1. **Double toast on created status**
   - What we know: The `useCreateInvitation()` hook fires `toast.success('Invitation sent')` in its `onSuccess` for created status (line 137-140). Consumers also want to fire success toasts.
   - What's unclear: Whether the hook's generic toast should be removed to let consumers fire their own, or consumers should skip their toast and rely on the hook's.
   - Recommendation: Keep the hook's toast. It provides consistent feedback without consumer cooperation. Consumers only need to handle the `duplicate` case per D-07. If the user sees the hook's generic toast alongside consumer-specific navigation, that is acceptable. Do NOT add a second success toast in consumers.

2. **`invitation_url` availability in list query**
   - What we know: The `tenantInvitationQueries.list()` query does NOT select `invitation_url` from the DB (the `.select()` on line 39-41 of `tenant-invitation-keys.ts` omits it).
   - What's unclear: Whether to modify the existing list query to include `invitation_url` or add a separate query variant.
   - Recommendation: Modify the existing `.select()` in `tenantInvitationQueries.list()` to include `invitation_url`. Update the `InvitationRow` type alias and the mapper function accordingly. This is a low-risk change -- adding a column to the select does not break existing consumers.

3. **Invitation row integration with TenantTable vs Tenants**
   - What we know: `TenantTable` receives `tenants: TenantItem[]` and renders `TenantTableRow` for each. Invitations are a different data shape.
   - What's unclear: Whether invitation rows should be injected into `TenantTable` via a discriminated union or rendered separately in `Tenants` above/below the table.
   - Recommendation: Merge at the `Tenants` component level. Create a discriminated union type `type TenantListRow = { type: 'tenant'; data: TenantItem } | { type: 'invitation'; data: TenantSectionInvitation }`. Render invitation rows in the same `<tbody>` but with an invitation-specific row component. This keeps `TenantTable` unchanged and follows D-01 (same table, inline rows).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit -- --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | invite-tenant-form uses useCreateInvitation | unit | `pnpm test:unit -- --run src/components/tenants/__tests__/invite-tenant-form.property.test.tsx` | Yes (needs update) |
| UI-02 | onboarding-step-tenant uses useCreateInvitation | unit | `pnpm test:unit -- --run src/components/onboarding/__tests__/onboarding-step-tenant.test.ts` | No (Wave 0) |
| UI-03 | lease wizard uses useCreateInvitation | unit | `pnpm test:unit -- --run src/components/leases/wizard/__tests__/selection-step-filters.test.ts` | No (Wave 0) |
| UI-04 | no references to InviteTenantModal, isInviteModalOpen, InviteTenantData | unit (grep verification) | `pnpm test:unit -- --run` (typecheck catches dead imports) | N/A (compile-time) |
| UI-05 | pending invitations visible on tenant list | unit | `pnpm test:unit -- --run src/components/tenants/__tests__/tenants-invitation-rows.test.tsx` | No (Wave 0) |
| UI-06 | copy invitation link to clipboard | unit | `pnpm test:unit -- --run src/components/tenants/__tests__/tenants-invitation-rows.test.tsx` | No (Wave 0) |
| UI-07 | existing user on accept page sees accept button not signup | unit | `pnpm test:unit -- --run src/app/(auth)/accept-invite/__tests__/accept-invite-session.test.tsx` | No (Wave 0) |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run`
- **Per wave merge:** `pnpm test:unit -- --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Update `src/components/tenants/__tests__/invite-tenant-form.property.test.tsx` -- mock `useCreateInvitation` instead of inline `useMutation`
- [ ] Update `src/components/tenants/__tests__/invite-tenant-form-success.property.test.tsx` -- same mock update
- [ ] `src/components/tenants/__tests__/tenants-invitation-rows.test.tsx` -- covers UI-05, UI-06 (invitation row rendering, dropdown actions, clipboard copy)
- [ ] `src/app/(auth)/accept-invite/__tests__/accept-invite-session.test.tsx` -- covers UI-07 (session check branching)
- [ ] Verify `pnpm typecheck` passes after dead code removal (compile-time validation for UI-04)

## Sources

### Primary (HIGH confidence)
- Codebase analysis -- all consumer files (`invite-tenant-form.tsx`, `onboarding-step-tenant.tsx`, `selection-step-filters.tsx`) read and analyzed line by line
- Phase 27 output -- `use-create-invitation.ts` hook API shape confirmed
- `tenant-invite-mutation-options.ts` -- `resend()`, `cancel()`, `sendInvitationEmail()` factories confirmed
- `tenant-invitation-keys.ts` -- `tenantInvitationQueries.list()` query structure confirmed
- `tenants-store.ts` -- dead state properties identified (lines 37, 56-57, 71, 102-104)
- `sections/tenants.ts` -- `InviteTenantData` and `TenantSectionInvitation` types confirmed
- `login/page.tsx` -- `isValidRedirect()` and redirect support confirmed (lines 28-33, 93-101)
- `accept-invite/page.tsx` -- current session handling and `acceptInvitation()` function analyzed
- `invite-signup-form.tsx` -- existing "Already have an account? Sign in" link confirmed (line 229)
- `confirm-dialog.tsx` -- `ConfirmDialog` component API confirmed
- `two-factor-setup-dialog.tsx` -- clipboard copy pattern confirmed
- `28-UI-SPEC.md` -- visual contract for badges, dropdown, confirmation dialog
- `28-CONTEXT.md` -- all 10 locked decisions and discretion areas

### Secondary (MEDIUM confidence)
- `api-contracts.ts` -- `TenantInvitation` type needs status union expansion (currently missing `pending`, `cancelled`)
- `date-fns` package availability confirmed from `package.json` (^4.1.0)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all tools already in project
- Architecture: HIGH -- all code paths read, hook API confirmed, dead code enumerated
- Pitfalls: HIGH -- 7 pitfalls identified from codebase analysis with specific file/line references
- Test strategy: HIGH -- existing test files identified, mock update path clear

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- no external dependency changes expected)
