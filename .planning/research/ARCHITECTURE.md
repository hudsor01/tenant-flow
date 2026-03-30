# Architecture: Tenant Invitation Flow Consolidation

**Domain:** Invitation creation path unification in property management SaaS
**Researched:** 2026-03-30
**Confidence:** HIGH (all evidence from codebase analysis, no external dependencies)

## Current State: 4 Invitation Paths

Four separate code paths create `tenant_invitations` records. Each duplicates the same core logic: generate UUID code, build URL, compute 7-day expiry, insert row, call `send-tenant-invitation` Edge Function.

### Path 1: InviteTenantForm (standalone page/modal)
- **Files:** `src/components/tenants/invite-tenant-form.tsx` (228 lines)
- **Surface:** `/tenants/new` page and `@modal/(.)tenants/new` intercepting route
- **Fields:** email, first_name, last_name, phone, property_id (optional), unit_id (optional)
- **Type set:** `'portal_access'` (hardcoded)
- **Mutation:** inline `useMutation` in component -- NOT using `tenantInviteMutations.invite()`
- **Post-success:** navigates to `/tenants`, invalidates `tenantQueries.all()`
- **Sub-components:** `InviteTenantInfoFields`, `InviteTenantPropertyFields` (TanStack Form)

### Path 2: InviteTenantModal (custom modal, tenants list page)
- **File:** `src/components/tenants/invite-tenant-modal.tsx` (224 lines)
- **Surface:** opened from Tenants page via Zustand `isInviteModalOpen` state
- **Fields:** email, firstName, lastName, type dropdown (user-facing!)
- **Type set:** user picks `'platform_access'` or `'lease_signing'` from dropdown
- **Mutation:** NONE -- delegates to parent via `onSubmit: (data: InviteTenantData) => void` callback
- **Problem:** uses raw HTML inputs (no shadcn), no validation, camelCase field names mismatch
- **Problem:** exposes `type` dropdown to user -- meaningless UX choice

### Path 3: OnboardingStepTenant (onboarding wizard)
- **File:** `src/components/onboarding/onboarding-step-tenant.tsx` (189 lines)
- **Surface:** step 4 of onboarding wizard dialog
- **Fields:** email, first_name, last_name (all required)
- **Type set:** `'platform_access'` (hardcoded)
- **Mutation:** inline `useMutation` in component -- duplicates insert logic
- **Post-success:** calls `onNext()` to advance wizard, invalidates `tenantQueries.lists()`
- **Constraints:** no property/unit fields (property may not exist yet), skip button required

### Path 4: InlineTenantInvite (lease wizard)
- **File:** `src/components/leases/wizard/selection-step-filters.tsx` (203 lines)
- **Surface:** inline form in lease creation wizard's selection step
- **Fields:** first_name, last_name, email, phone
- **Type set:** `'lease_signing'` (hardcoded)
- **Mutation:** inline `useMutation` in component -- duplicates insert logic
- **Post-success:** resets form, calls `onToggleMode()` to switch back to tenant picker
- **Context:** receives `propertyId` as prop, no unit_id or lease_id

### Existing Centralized Mutation (unused by 3 of 4 paths)
- **File:** `src/hooks/api/query-keys/tenant-invite-mutation-options.ts`
- **Hook:** `src/hooks/api/use-tenant-invite-mutations.ts` -> `useInviteTenantMutation()`
- **Problem:** requires `lease_id` as mandatory field, making it unusable for platform_access invitations
- **Problem:** returns `TenantWithExtras` shape (not an invitation) -- leaks abstraction

## Recommended Architecture

### Principle: Shared Hook, Context-Driven Fields

Use a **single mutation hook** consumed by **context-aware UI wrappers**. The hook handles all DB insert + email logic. Each consumer passes context that determines which fields are required, which are pre-filled, and what `type` value is auto-set.

This is "shared hook, not shared component" because the UI requirements differ substantially:
- Onboarding needs a compact card with skip button inside a dialog
- Dashboard page/modal needs full form with optional property pickers
- Lease wizard needs an inline bordered box embedded in a larger form

Forcing a single component to handle all three layouts would create a worse abstraction than three thin wrappers over one shared hook.

### Component Boundaries

```
                     useCreateInvitation()
                    (single mutation hook)
                            |
          +-----------------+------------------+
          |                 |                  |
  InviteTenantForm   OnboardingInvite   LeaseWizardInvite
  (page + modal)     (wizard step)      (inline in step 1)
```

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `useCreateInvitation` | DB insert, URL generation, email send, cache invalidation | Supabase client, send-tenant-invitation Edge Function |
| `InviteTenantForm` | Full invite form (email, name, phone, property/unit pickers) | `useCreateInvitation`, property/unit queries |
| `OnboardingInviteStep` | Minimal invite form (email, name only), skip/next controls | `useCreateInvitation`, onboarding wizard state |
| `LeaseWizardInvite` | Inline invite form within lease creation, auto-sets property context | `useCreateInvitation`, lease wizard state |
| `InviteTenantModal` | **DELETE** -- replaced by route-based modal using `InviteTenantForm` | n/a |

### Data Flow

```
Consumer provides:
  { email, first_name, last_name, phone?, property_id?, unit_id?, lease_id? }
                          |
                          v
      useCreateInvitation hook derives:
        - type: lease_id present ? 'lease_signing' : 'platform_access'
        - invitation_code: crypto.randomUUID()
        - invitation_url: ${APP_URL}/auth/accept-invitation?code=${code}
        - expires_at: now + 7 days
        - owner_user_id: from getCachedUser()
        - status: 'sent'
                          |
                          v
      PostgREST insert into tenant_invitations
                          |
                          v
      fetch send-tenant-invitation Edge Function (non-fatal)
                          |
                          v
      Invalidate query caches:
        - tenantQueries.lists()
        - tenantInvitationQueries.invitations()
        - ownerDashboardKeys.all (if exists)
                          |
                          v
      Return { invitation_id, status } to consumer
                          |
                          v
      Consumer handles post-success:
        - InviteTenantForm: toast + navigate to /tenants
        - OnboardingInviteStep: toast + onNext()
        - LeaseWizardInvite: toast + toggle back to picker + reset form
```

## New and Modified Files

### New Files

| File | Purpose | Lines (est) |
|------|---------|-------------|
| `src/hooks/api/use-create-invitation.ts` | Single mutation hook. Replaces all 4 inline mutations. | ~80 |

### Modified Files

| File | Change | Why |
|------|--------|-----|
| `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` | Rewrite `invite()` factory: make `lease_id` optional, accept flat `CreateInvitationInput` instead of requiring lease lookup | Mutation factory currently forces lease_id, making it unusable for platform_access invites |
| `src/components/tenants/invite-tenant-form.tsx` | Remove inline `useMutation`, import `useCreateInvitation()` instead | Deduplicate mutation logic |
| `src/components/onboarding/onboarding-step-tenant.tsx` | Remove inline `useMutation`, import `useCreateInvitation()` instead | Deduplicate mutation logic |
| `src/components/leases/wizard/selection-step-filters.tsx` | Remove inline `useMutation` from `InlineTenantInvite`, import `useCreateInvitation()` | Deduplicate mutation logic |
| `src/components/tenants/invite-tenant-modal.tsx` | **DELETE entirely** | Replaced by route-based modal (`@modal/(.)tenants/new`) which already uses `InviteTenantForm` |
| `src/components/tenants/tenants.tsx` | Remove `InviteTenantModal` import/usage, remove `isInviteModalOpen`/`openInviteModal`/`closeInviteModal` from Zustand store usage, wire "Invite Tenant" button to `router.push('/tenants/new')` instead | The route-based modal already exists and works; the custom modal is redundant |
| `src/stores/tenants-store.ts` | Remove `isInviteModalOpen`, `openInviteModal`, `closeInviteModal` state | Dead state after modal removal |
| `src/types/sections/tenants.ts` | Remove `InviteTenantData` interface, remove `onInviteTenant` from `TenantsProps` | Dead type after modal removal |
| `src/app/(owner)/tenants/page.tsx` | Remove `handleInviteTenant` callback, remove `onInviteTenant` prop | Dead callback after modal removal |
| `src/lib/validation/tenants.ts` | Keep `inviteTenantSchema` as-is (already correct), but add `createInvitationSchema` for the hook's input shape | Type safety for the new hook |

### Files NOT Modified

| File | Why Left Alone |
|------|---------------|
| `send-tenant-invitation/index.ts` (Edge Function) | Already correct -- reads invitation by ID, sends email. No changes needed. |
| `tenant-invitation-accept/index.ts` (Edge Function) | Already correct -- accepts by code, creates tenant record, links lease. No changes needed. |
| `tenant-invitation-validate/index.ts` (Edge Function) | Already correct -- validates code for accept page. No changes needed. |
| `src/hooks/api/query-keys/tenant-invitation-keys.ts` | Query factories are fine. No changes needed. |
| `src/hooks/api/use-tenant-invite-mutations.ts` | Resend/cancel mutations stay as-is. `useInviteTenantMutation` becomes a thin wrapper over the new hook or is replaced by it. |

## Patterns to Follow

### Pattern 1: Context-Derived Type (never user-facing)

The `type` column (`platform_access` | `lease_signing`) is internal metadata. The user never picks it. The hook derives it from context.

**Rule:** If `lease_id` is provided, type = `'lease_signing'`. Otherwise, type = `'platform_access'`.

```typescript
// Inside useCreateInvitation hook
const type: InvitationType = input.lease_id ? 'lease_signing' : 'platform_access'
```

This eliminates the dropdown in `InviteTenantModal` and the `'portal_access'` typo bug (the CHECK constraint only allows `platform_access` and `lease_signing` -- `portal_access` would fail at DB level).

### Pattern 2: Flat Input Shape

The current `inviteTenantRequestSchema` uses nested `tenantData` / `leaseData` objects -- a leftover from the old NestJS DTO pattern. The new hook uses a flat shape matching what the DB actually needs.

```typescript
interface CreateInvitationInput {
  email: string
  first_name: string
  last_name: string
  phone?: string
  property_id?: string
  unit_id?: string
  lease_id?: string
}
```

Each consumer populates only the fields it has. The hook fills in the rest (owner_user_id, invitation_code, etc).

### Pattern 3: Non-Fatal Email Send

All 4 current paths already treat the Edge Function email call as non-fatal (`.catch()`). The consolidated hook preserves this: if the DB insert succeeds but the email fails, the invitation record exists and can be resent later.

```typescript
// In useCreateInvitation mutationFn
const { data: invitation, error } = await supabase
  .from('tenant_invitations')
  .insert({ ... })
  .select('id')
  .single()

if (error) throw error

// Non-fatal email send
await sendInvitationEmail(invitation.id).catch(err => {
  console.error('[create-invitation] Email send failed:', err)
})

return { invitation_id: invitation.id }
```

### Pattern 4: Consumer Handles Post-Success UX

The hook does NOT navigate, close modals, or advance wizards. It only:
1. Inserts the record
2. Sends the email (non-fatal)
3. Invalidates caches
4. Returns the result

Each consumer's `onSuccess` callback handles its own UX:

```typescript
// InviteTenantForm
const mutation = useCreateInvitation()
// In onSubmit:
await mutation.mutateAsync(input)
toast.success('Invitation sent', { ... })
router.push('/tenants')

// OnboardingInviteStep
const mutation = useCreateInvitation()
// In onSubmit:
await mutation.mutateAsync(input)
toast.success('Invitation sent', { ... })
onNext() // advance wizard

// LeaseWizardInvite
const mutation = useCreateInvitation()
// In onSubmit:
await mutation.mutateAsync(input)
toast.success('Invitation sent', { ... })
onToggleMode() // switch back to tenant picker
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Single Mega-Component
**What:** One `<UnifiedInviteForm>` component with `mode` prop controlling layout/fields.
**Why bad:** The three contexts have fundamentally different layouts (full page card vs wizard dialog step vs inline bordered box in a larger form). A single component would need extensive conditional rendering, making it harder to maintain than three simple wrappers.
**Instead:** Shared hook, separate thin UI wrappers per context.

### Anti-Pattern 2: User-Facing Type Selector
**What:** Dropdown letting user pick `platform_access` vs `lease_signing`.
**Why bad:** Users do not understand or care about this distinction. The system knows: if you are in the lease wizard, it is a lease signing invitation. If you are on the tenants page, it is platform access.
**Instead:** Derive type from context automatically.

### Anti-Pattern 3: Inline Mutation Logic
**What:** Each component defining its own `useMutation({ mutationFn: async () => { ... } })` with duplicated insert logic.
**Why bad:** The current bug exists because `invite-tenant-form.tsx` hardcodes `type: 'portal_access'` (a typo -- the CHECK constraint only allows `platform_access`). If the mutation lived in one place, this bug would not exist in 4 places.
**Instead:** Single `useCreateInvitation` hook.

### Anti-Pattern 4: Requiring lease_id for All Invitations
**What:** The existing `tenantInviteMutations.invite()` in `tenant-invite-mutation-options.ts` requires `lease_id` as a mandatory field and does a lease lookup to get property_id.
**Why bad:** Platform access invitations (from tenants page, onboarding) do not have a lease. This forced 3 of 4 paths to bypass the centralized mutation entirely.
**Instead:** Make `lease_id` optional. If provided, derive property_id/unit_id from it. If not, use whatever property_id/unit_id the caller passes directly.

## Integration Points

### Database
- **Table:** `tenant_invitations` -- no schema changes needed
- **CHECK constraint:** `type IN ('platform_access', 'lease_signing')` -- already correct
- **RLS:** existing policies cover owner insert/select -- no changes needed
- **Edge Functions:** `send-tenant-invitation`, `tenant-invitation-validate`, `tenant-invitation-accept` -- no changes needed

### Query Cache
The new hook invalidates these keys on success:
- `tenantQueries.lists()` -- tenant list may show pending invitations
- `tenantInvitationQueries.invitations()` -- invitation list table
- `ownerDashboardKeys.all` -- dashboard stats may show invitation counts

### Zustand Store
Remove invitation modal state from `tenants-store.ts`:
- `isInviteModalOpen` (boolean)
- `openInviteModal` (action)
- `closeInviteModal` (action)

The route-based modal (`@modal/(.)tenants/new`) replaces the Zustand-driven modal entirely.

### Existing Tests
- **Unit tests:** `invite-tenant-form.property.test.tsx`, `invite-tenant-form-success.property.test.tsx` will need updates to mock `useCreateInvitation` instead of inline mutation
- **RLS tests:** `tenant-invitations.rls.test.ts` -- no changes (tests DB policies, not frontend)
- **Edge Function tests:** `send-tenant-invitation-test.ts` -- no changes
- **Modal test:** `@modal/(.)tenants/new/page.test.tsx` -- no changes (tests the route modal, which already uses `InviteTenantForm`)

## Suggested Build Order

Build order follows dependency chain: shared hook first, then consumers, then cleanup.

### Phase 1: Create shared hook (no breaking changes)
1. Create `src/hooks/api/use-create-invitation.ts` with the unified mutation
2. Add `createInvitationSchema` to `src/lib/validation/tenants.ts`
3. Update `tenant-invite-mutation-options.ts`: rewrite `invite()` to accept optional `lease_id`
4. Write unit tests for the new hook

**Why first:** Everything else depends on this. Creating it alongside existing code means nothing breaks.

### Phase 2: Migrate consumers to shared hook
5. Update `invite-tenant-form.tsx`: replace inline mutation with `useCreateInvitation()`, fix `'portal_access'` typo
6. Update `onboarding-step-tenant.tsx`: replace inline mutation with `useCreateInvitation()`
7. Update `selection-step-filters.tsx` (`InlineTenantInvite`): replace inline mutation with `useCreateInvitation()`
8. Update existing unit tests to mock `useCreateInvitation` instead of inline Supabase calls

**Why second:** After Phase 1, consumers can adopt incrementally without coordination.

### Phase 3: Delete redundant code
9. Delete `invite-tenant-modal.tsx` (the custom Zustand-driven modal)
10. Update `tenants.tsx`: remove `InviteTenantModal` usage, wire buttons to `router.push('/tenants/new')`
11. Remove modal state from `tenants-store.ts`
12. Remove `InviteTenantData` and `onInviteTenant` from `src/types/sections/tenants.ts`
13. Clean up dead imports in `tenants/page.tsx`

**Why last:** Deletion is safest after consumers are already migrated. If anything was missed, the old code still exists during Phase 2.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| 4 paths identified correctly | HIGH | Grep for `tenant_invitations` insert and `send-tenant-invitation` fetch confirms exactly 4 independent mutations |
| `portal_access` typo bug | HIGH | `invite-tenant-form.tsx:79` sets `type: 'portal_access'`, but CHECK constraint only allows `platform_access` and `lease_signing` |
| Route modal already works | HIGH | `@modal/(.)tenants/new/page.tsx` exists, imports `InviteTenantForm`, renders in `RouteModal` |
| Custom modal is redundant | HIGH | `InviteTenantModal` in `tenants.tsx` and the route modal in `@modal/(.)tenants/new` serve the same purpose |
| Edge Functions need no changes | HIGH | They operate on invitation records by ID -- how those records are created is irrelevant to them |
| Shared hook approach | HIGH | Standard TanStack Query pattern, matches existing codebase conventions (see `use-tenant-invite-mutations.ts` for resend/cancel) |

## Sources

All findings derived from codebase analysis:
- `src/components/tenants/invite-tenant-form.tsx` -- Path 1
- `src/components/tenants/invite-tenant-modal.tsx` -- Path 2
- `src/components/onboarding/onboarding-step-tenant.tsx` -- Path 3
- `src/components/leases/wizard/selection-step-filters.tsx` -- Path 4
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` -- existing centralized mutation
- `src/hooks/api/use-tenant-invite-mutations.ts` -- existing hook wrappers
- `src/lib/validation/tenants.ts` -- validation schemas and type definitions
- `supabase/migrations/20251101000000_base_schema.sql:1730` -- CHECK constraint definition
- `supabase/functions/send-tenant-invitation/index.ts` -- Edge Function (unchanged)
- `supabase/functions/tenant-invitation-accept/index.ts` -- Edge Function (unchanged)
