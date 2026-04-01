# Technology Stack

**Project:** TenantFlow v1.4 - Tenant Invitation Flow Redesign
**Researched:** 2026-03-30
**Overall confidence:** HIGH

## Verdict: No New Dependencies

This milestone requires **zero** new libraries. The existing stack already provides every capability needed for the unified invitation flow. The problem is not missing tools -- it is duplicated implementations of the same logic across four separate code paths.

### Why This Matters for Roadmap

Adding libraries adds bundle size, maintenance burden, and learning curve. The four invitation paths already use a mix of patterns (TanStack Form in one, raw useState in three; Zod validation in one, none in three). The fix is consolidation onto the best existing pattern, not introducing new abstractions.

## Current Stack (Unchanged)

### Core Framework -- No Changes Needed

| Technology | Current Version | Purpose | Status |
|------------|----------------|---------|--------|
| Next.js | 16.1.7 | App framework | Keep |
| React | 19.2.4 | UI library | Keep |
| TailwindCSS | 4.2 | Styling | Keep |
| TypeScript | 5.9.x (strict) | Type safety | Keep |

### Form & Validation -- Already Sufficient

| Technology | Current Version | Purpose | Status |
|------------|----------------|---------|--------|
| @tanstack/react-form | ^1.28.3 | Form state management | Keep -- use for ALL invitation forms (currently only 1 of 4 paths uses it) |
| zod | ^4.3.6 | Schema validation | Keep -- use `inviteTenantSchema` everywhere (currently only 1 of 4 paths validates) |

### Data Layer -- Already Sufficient

| Technology | Current Version | Purpose | Status |
|------------|----------------|---------|--------|
| @tanstack/react-query | ^5.90.21 | Server state + cache | Keep -- `tenantInviteMutations` factories already exist but 3 of 4 paths ignore them |
| @supabase/supabase-js | ^2.98.0 | DB + Auth | Keep |
| @supabase/ssr | ^0.9.0 | Cookie-based auth | Keep |

### UI Components -- Already Sufficient

| Technology | Current Version | Purpose | Status |
|------------|----------------|---------|--------|
| shadcn/ui (Radix primitives) | Various | Dialog, Select, Input, etc. | Keep |
| Stepper (Dice UI vendored) | In-repo | Multi-step wizard | Keep -- available but NOT needed (see Anti-Additions below) |
| lucide-react | ^0.576.0 | Icons | Keep |
| sonner | ^2.0.7 | Toast notifications | Keep |

### Email -- Already Sufficient

| Technology | Current Version | Purpose | Status |
|------------|----------------|---------|--------|
| Resend (via Edge Function) | N/A (server-side) | Email delivery | Keep |
| auth-email-templates.ts | In-repo | HTML email templates | Keep -- `tenantInvitationEmail()` already branded and context-aware |

## The Actual Problem: Duplication Map

Four paths implement the same invitation logic independently:

| Path | File | Form Library | Validation | Mutation Pattern | Query Invalidation |
|------|------|-------------|------------|-----------------|-------------------|
| 1. Tenants page | `invite-tenant-form.tsx` | TanStack Form | Zod (inviteTenantSchema) | Inline useMutation | `tenantQueries.all()` |
| 2. Legacy modal | `invite-tenant-modal.tsx` | Raw useState | None | Props callback (onSubmit) | Caller's responsibility |
| 3. Onboarding wizard | `onboarding-step-tenant.tsx` | Raw useState | None (manual check) | Inline useMutation | `tenantQueries.lists()` |
| 4. Lease wizard | `selection-step-filters.tsx` | Raw useState | None (manual check) | Inline useMutation | `tenantQueries.lists()` + `tenantInvitationQueries.invitations()` |

### What Each Path Duplicates

Every path independently:
1. Generates `crypto.randomUUID()` invitation code
2. Constructs invitation URL with `NEXT_PUBLIC_APP_URL`
3. Calculates 7-day expiry
4. Inserts into `tenant_invitations` via PostgREST
5. Calls `send-tenant-invitation` Edge Function via fetch
6. Handles success/error toasts

This is ~40 lines of identical business logic copy-pasted four times, with slight variations that introduce bugs (Path 2 uses `'portal_access'` type by default while path 4 uses `'lease_signing'`; path 1 invalidates `.all()` while paths 3-4 invalidate `.lists()`).

## What the Unified Flow Should Use (Existing Stack)

### 1. Single Mutation Factory: `tenantInviteMutations.invite()`

Already exists in `src/hooks/api/query-keys/tenant-invite-mutation-options.ts`. Currently only used by `useInviteTenantMutation()` hook. The unified flow should route ALL invitation submissions through this single mutation.

**Current gap:** The existing `invite()` factory requires `lease_id` (it fetches lease to get property/unit). The unified flow needs it to accept optional `property_id` and `unit_id` directly, with `lease_id` optional.

### 2. TanStack Form for All Form Instances

The `invite-tenant-form.tsx` already demonstrates the correct pattern: `useForm()` with `inviteTenantSchema` field validators via `form.Field`. The three other paths use raw `useState` with manual validation -- these should be replaced with the same TanStack Form pattern.

**No new form library needed.** TanStack Form 1.28 supports:
- Field-level Zod validators (already used in path 1)
- `form.Subscribe` for derived state (already used in path 1)
- `useUnsavedChangesWarning(form.state.isDirty)` (already used in path 1)

### 3. Zod Schema: `inviteTenantSchema`

Already defined in `src/lib/validation/tenants.ts`. Already validates email, first_name, last_name, optional phone/property_id/unit_id. Paths 2, 3, and 4 skip validation entirely -- the unified form uses this schema for all instances.

### 4. Context-Aware Props (Not a Library)

The unified component receives context via props:

```typescript
interface UnifiedInviteProps {
  // Context determines which fields show/hide
  context: 'standalone' | 'onboarding' | 'lease-wizard'
  // Pre-filled values from parent context
  propertyId?: string
  unitId?: string
  leaseId?: string
  // Callback for embedded contexts
  onSuccess?: () => void
  onCancel?: () => void
}
```

This is a prop interface, not a library. The `InvitationType` (`'platform_access' | 'lease_signing'`) is derived from context automatically -- never shown to the user.

### 5. shadcn Dialog for Modal Contexts

`invite-tenant-modal.tsx` currently implements a custom modal with raw DOM (backdrop div, z-index management, custom close button). Replace with shadcn `Dialog` component already in the project. This gives accessibility (focus trap, Escape key, aria attributes) for free.

### 6. Invitation Status: Polling via TanStack Query

For status visibility (pending/sent/accepted/expired), the existing `tenantInvitationQueries.list()` with `QUERY_CACHE_TIMES.LIST` (10-minute staleTime) is sufficient. Invitations are not time-critical enough to warrant Supabase Realtime WebSocket subscriptions (see Anti-Additions below).

If tighter updates are wanted for the invitation list specifically, use the existing `QUERY_CACHE_TIMES.REALTIME` config (30-second polling) -- no new library needed.

## Anti-Additions: What NOT to Add

### Do NOT Add: Supabase Realtime Subscriptions

**Why it seems tempting:** Real-time status updates when a tenant accepts an invitation.

**Why not:**
- Invitation acceptance is a rare event (once per tenant, ever). Polling at 30s or even 10m is more than adequate.
- Supabase Realtime adds WebSocket connection management, cleanup on unmount, reconnection handling, and multiplexing complexity.
- The project has zero Realtime channel usage today. Introducing it for a low-frequency event is over-engineering.
- The existing `refetchOnWindowFocus: true` default already updates stale data when the owner returns to the tab.

**What to do instead:** Use `QUERY_CACHE_TIMES.LIST` for the invitations query. When the owner sends an invitation, `queryClient.invalidateQueries()` already forces an immediate refresh. The owner sees the status change instantly for their own actions; background acceptance by a tenant will be visible within 10 minutes or on next focus.

### Do NOT Add: React Email / @react-email/components

**Why it seems tempting:** JSX-based email templates instead of HTML string concatenation.

**Why not:**
- The existing `auth-email-templates.ts` pattern works. It uses `wrapInLayout()` + `ctaBlock()` helper functions with inline CSS -- the standard for email compatibility.
- There are only 6 email templates total. The overhead of adding a React rendering pipeline for emails (which requires a build step or server-side rendering of React to HTML) is not justified.
- The existing `tenantInvitationEmail()` function already handles context-aware content (property name, unit number, owner name).
- React Email would require adding `@react-email/components` (the component library) plus a render step. The project's Edge Functions run Deno -- React Email's render function adds complexity.

**What to do instead:** Enhance the existing `tenantInvitationEmail()` template function if needed (add lease context line, adjust copy). Same pattern, no new dependency.

### Do NOT Add: Multi-Step Form Library (react-hook-form-wizard, etc.)

**Why it seems tempting:** The onboarding wizard and lease wizard embed invitation forms as steps.

**Why not:**
- These are not multi-step invitation forms. The invitation is a single form that happens to be embedded in a step of a larger wizard.
- The existing Stepper component (Dice UI) handles the parent wizard navigation. The invitation form is just content inside one step.
- TanStack Form already handles the form state. The step transition is the parent's concern.

### Do NOT Add: State Machine Library (XState, etc.)

**Why it seems tempting:** Invitation state transitions (draft -> sent -> accepted/expired/cancelled).

**Why not:**
- These transitions happen in the database. The `status` column has a CHECK constraint. The frontend only reads and displays status -- it does not drive transitions.
- The mutation factory (`tenantInviteMutations.invite/resend/cancel`) already handles each action. Adding a client-side state machine that mirrors DB state is redundant complexity.

### Do NOT Add: Optimistic Updates Library

**Why it seems tempting:** Show the invitation as "sent" immediately before the API responds.

**Why not:**
- TanStack Query's built-in `onMutate` for optimistic updates is already available (no extra library).
- However, even this is unnecessary for invitations. The mutation takes <1 second. A loading spinner ("Sending...") is the right UX -- the user expects a brief wait when sending an email.
- Optimistic updates add rollback complexity for a non-instant operation that includes an email send.

## Integration Points (Existing, Not New)

### Mutation Flow (Single Path)

```
Unified Form Component
  -> useInviteTenantMutation() hook (existing)
    -> tenantInviteMutations.invite() factory (existing, needs signature update)
      -> PostgREST insert to tenant_invitations (existing)
      -> sendInvitationEmail() helper -> send-tenant-invitation Edge Function (existing)
        -> tenantInvitationEmail() template (existing)
        -> Resend API (existing)
```

### Query Invalidation (Standardize)

All invitation mutations should invalidate the same set of keys:
- `tenantQueries.lists()` -- tenant list may show invitation status
- `tenantInvitationQueries.invitations()` -- invitation list
- `leaseQueries.lists()` -- if invitation was lease-linked

This is already done correctly in `useInviteTenantMutation()`. The three inline mutations do it inconsistently.

### Validation (Single Schema)

```
inviteTenantSchema (existing in src/lib/validation/tenants.ts)
  -> email: z.email()
  -> first_name: z.string().trim().min(1).max(100)
  -> last_name: z.string().trim().min(1).max(100)
  -> phone: phoneSchema.optional()
  -> property_id: uuidSchema.optional()
  -> unit_id: uuidSchema.optional()
```

May need to add `lease_id: uuidSchema.optional()` for lease wizard context.

## Bug Fix: CHECK Constraint Mismatch

PROJECT.md mentions a `'portal_access'` typo bug in `invite-tenant-form.tsx`. The DB CHECK constraint on `tenant_invitations.type` allows `'platform_access' | 'lease_signing'`. The code in `invite-tenant-form.tsx` line 79 currently uses `type: 'portal_access'` which may fail silently or be accepted without the CHECK.

**Fix:** The unified flow derives type from context:
- `context === 'lease-wizard'` -> `type: 'lease_signing'`
- All other contexts -> `type: 'platform_access'`

This is a code change, not a stack change.

## Summary

| Category | Decision | Rationale |
|----------|----------|-----------|
| Form library | Keep TanStack Form 1.28 | Already used in 1 of 4 paths; extend to all 4 |
| Validation | Keep Zod 4.3 + inviteTenantSchema | Already defined; 3 paths skip it -- make mandatory |
| Mutation layer | Keep tenantInviteMutations factory | Already exists; update signature to accept optional property_id/unit_id |
| Modal component | Use existing shadcn Dialog | Replace custom modal div with accessible Dialog |
| Email templates | Keep auth-email-templates.ts | Already branded and context-aware |
| Real-time updates | Use existing polling (QUERY_CACHE_TIMES) | Invitations are low-frequency events |
| New dependencies | None | Zero packages to add |

## Sources

- Codebase analysis: 4 invitation code paths identified and compared (HIGH confidence)
- `package.json` dependency versions verified against installed packages (HIGH confidence)
- `src/lib/validation/tenants.ts` schema definitions confirmed (HIGH confidence)
- `supabase/functions/send-tenant-invitation/index.ts` Edge Function reviewed (HIGH confidence)
- `supabase/functions/_shared/auth-email-templates.ts` template pattern reviewed (HIGH confidence)
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` mutation factory reviewed (HIGH confidence)
- `src/components/ui/stepper*.ts` stepper component availability confirmed (HIGH confidence)
- `src/lib/constants/query-config.ts` cache strategy reviewed (HIGH confidence)
