# Phase 42: Cancellation UX End-to-End Audit + Fix - Research

**Researched:** 2026-04-13
**Domain:** Stripe Subscription Lifecycle (cancel-at-period-end) + Supabase Edge Function + React client-state machine
**Confidence:** HIGH (all primary paths verified in codebase; Stripe SDK behavior verified via docs.stripe.com)

## Summary

Phase 42 replaces a broken portal-redirect cancel flow with an in-app flow calling `stripe.subscriptions.update(id, { cancel_at_period_end: true })`. Every piece of infrastructure this phase needs already exists: the shadcn `AlertDialog` primitive, a well-established Edge Function pattern (auth + env + CORS + errors), the `stripe.subscriptions` table with RLS filtered by customer id, the TanStack mutation factory pattern, shared GDPR components (`AccountDataSection`, `request_account_deletion` RPC, `export-user-data` Edge Function), and Playwright auth setup with Supabase. **No net-new infrastructure required** — this is a wire-up phase.

The `useSubscriptionStatus` hook already returns `cancelAtPeriodEnd` and `currentPeriodEnd`. The `stripe.subscriptions` table schema is known and RLS-filtered on `customer = private.get_my_stripe_customer_id()`. The `get_subscription_status` RPC referenced in the existing hook does **not** exist in migrations (the hook silently falls back to reading `leases.stripe_subscription_status`) — this is a **gap to fix during Phase 42**.

**Primary recommendation:** Create a new Edge Function `stripe-cancel-subscription` (mirrors `stripe-billing-portal` structure exactly, swaps portal-session call for `subscriptions.update`). Replace the raw `<button>` + `useBillingPortalMutation()` call at `subscription-cancel-section.tsx:27` with a 3-state machine that renders (1) Active + AlertDialog trigger, (2) Cancel-scheduled + Reactivate button, (3) Canceled + inline GDPR actions. Create or fix `public.get_subscription_status(customer_id)` RPC so the frontend has a typed read path. Add one Playwright spec using the existing owner auth fixture.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D1 — Cancel timing: period-end default.** `stripe.subscriptions.update(id, { cancel_at_period_end: true })`. Preserves paid service until `customer.subscription.deleted` fires at period end.
- **D2 — Confirmation dialog: simple shadcn `AlertDialog`.** Title "Cancel your subscription?" + body with end date + two buttons (Cancel / Yes, cancel plan destructive).
- **D3 — Un-cancel: inline reverse toggle.** Same mutation endpoint with `cancel_at_period_end: false`. Works only during the scheduled-cancel grace window.
- **D4 — Canceled-state UI: transform settings section inline (3-state machine).** (1) Active, (2) Cancel-scheduled, (3) Canceled + inline GDPR export + delete. No new routes, no modals, no full-screen lock.
- **Status source:** `stripe.subscriptions` table, NOT `users.stripe_customer_id` existence.
- **Existing `SubscriptionStatusBanner`:** KEEP. Visual system for `past_due`/`unpaid`/`canceled`/null already correct.

### Claude's Discretion

- Cancel mutation transport: new Edge Function `supabase/functions/stripe-cancel-subscription/index.ts` vs. extending `stripe-billing-portal`. **Recommend new folder** — the portal function's body structure will differ entirely.
- Which query feeds the settings section — extend `useSubscriptionStatus` or add a sibling hook. **Recommend extending `useSubscriptionStatus`** — the `SubscriptionStatusResponse` type already has `cancelAtPeriodEnd: boolean` and `currentPeriodEnd: string | null`; the hook just needs a working RPC.
- GDPR wiring: reuse `export-user-data` Edge Function and `request_account_deletion()` RPC. Extract from existing `AccountDangerSection`/`AccountDataSection` into a shared subcomponent, or copy inline. **Recommend extracting a `<GdprDataActions />` subcomponent** — same pattern used in two places already (`settings/account-data-section.tsx` + `profiles/tenant/account-data-section.tsx` are near-identical copies; a third inline copy in subscription-cancel-section would be the third violation).
- Playwright approach: Stripe test clock vs. manual checkout + cancel. **Recommend NO test clock** for Phase 42 — `cancel_at_period_end: true` + reactivation are both testable without advancing time. The UI flip happens instantly; only the final `customer.subscription.deleted` event needs a time advance (out of scope per success criterion #4).

### Deferred Ideas (OUT OF SCOPE)

- Churn reason collection — separate analytics phase.
- Downgrade flow (cancel → cheaper plan) — out of scope per goal wording.
- Immediate-cancel variant with prorated refund — period-end is the only option for now.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CANCEL-01** | Owner on active paid sub cancels from settings in one click (one AlertDialog, one mutation) — no Stripe portal, no separate page | `AlertDialog` primitive exists at `src/components/ui/alert-dialog.tsx`. `stripe.subscriptions.update({ cancel_at_period_end: true })` verified via docs.stripe.com. New Edge Function mirrors existing `stripe-billing-portal/index.ts` structure exactly. |
| **CANCEL-02** | Subscription status from `stripe.subscriptions` (6 states: active/past_due/canceled/unpaid/paused/trialing), NOT `users.stripe_customer_id` existence | `stripe.subscriptions` schema verified (see Section 1). RLS filters `customer = private.get_my_stripe_customer_id()`. `useSubscriptionStatus` hook already shaped to return all 6 states — but relies on non-existent `get_subscription_status` RPC; must create it. |
| **CANCEL-03** | Canceled-state UI exposes inline "export my data" + "request account deletion" + 30-day GDPR grace messaging without navigation | Both primitives exist: `export-user-data` Edge Function (downloads JSON) + `request_account_deletion()` RPC (sets `deletion_requested_at`, 30-day grace). Existing components `AccountDangerSection` + `AccountDataSection` show the canonical wiring pattern. |

## Standard Stack

### Core (all present in codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (npm) | `npm:stripe@20` (pinned in `supabase/functions/deno.json`) | Edge Function `stripe.subscriptions.update()` call | Locked API version `2026-02-25.clover` in `_shared/stripe-client.ts`. [VERIFIED: codebase] |
| @supabase/supabase-js | 2.97 | Service-role client in Edge Function + PostgREST client in browser | Admin client pattern in `_shared/supabase-client.ts`. [VERIFIED: codebase] |
| @tanstack/react-query | 5.90 | `useMutation` + `mutationOptions` + `queryOptions` factories | Existing `billingMutations` factory in `query-keys/subscription-keys.ts`. [VERIFIED: codebase] |
| @radix-ui/react-alert-dialog | Vendored via shadcn | Confirmation dialog primitive | Already installed at `src/components/ui/alert-dialog.tsx` with `AlertDialogAction`/`AlertDialogCancel` + `buttonVariants({ variant: 'outline' })`. [VERIFIED: codebase] |
| lucide-react | latest | Icons (AlertTriangle, Loader2, Trash2, Download, Undo2, Clock) | Per CLAUDE.md Zero Tolerance rule #10: sole icon library. [VERIFIED: CLAUDE.md] |
| sonner | latest | Success/error toasts | Used by `AccountDataSection` for GDPR actions. [VERIFIED: codebase] |
| @playwright/test | 1.58 | E2E spec | Existing owner auth setup at `tests/e2e/tests/auth-api.setup.ts`. [VERIFIED: codebase] |

### Supporting (already present)

| Library | Purpose | Notes |
|---------|---------|-------|
| `_shared/auth.ts::validateBearerAuth()` | JWT token extraction + `supabase.auth.getUser(token)` validation | Used by all 18 other Edge Functions |
| `_shared/cors.ts::{handleCorsOptions,getCorsHeaders,getJsonHeaders}` | Fail-closed origin-locked CORS | `FRONTEND_URL` env required — fails closed if missing |
| `_shared/env.ts::validateEnv()` | Required + optional env checks | Must be called INSIDE `Deno.serve`, not at module level |
| `_shared/errors.ts::errorResponse()` | Generic error response + Sentry capture | Never exposes `err.message` to client |
| `_shared/stripe-client.ts::getStripeClient(key)` | Stripe client with locked API version `2026-02-25.clover` | Do NOT instantiate Stripe directly |
| `_shared/supabase-client.ts::createAdminClient()` | Service role client | Bypasses RLS for server-side customer lookup |

### Alternatives Considered

| Instead of | Could Use | Rejection Reason |
|------------|-----------|------------------|
| New `stripe-cancel-subscription` Edge Function | Extend `stripe-billing-portal` | Rejected — the portal function creates a Billing Portal session (wrong for our purpose); mixing cancel/portal-create logic in one function violates separation per CLAUDE.md Edge Function convention |
| Typed PostgREST query against `stripe.subscriptions` | Keep RPC-only read path | `stripe` schema not exposed via PostgREST (per migration `20260304161000_stripe_sync_diagnosis.sql`). Existing `get_user_invoices` RPC is the documented pattern (PAY-20 gap closure). Must use RPC. |
| Stripe test clock in Playwright | Manual subscription create + immediate cancel | `cancel_at_period_end: true` does NOT require time advancement to observe the UI flip; test clocks only needed to verify eventual `customer.subscription.deleted`. Out of scope per success criterion #4. |
| New shared `<GdprDataActions />` component | Inline GDPR wiring in subscription-cancel-section | Existing `AccountDangerSection` + `AccountDataSection` are near-duplicates already; a third inline copy = violation of CLAUDE.md "no duplicate types" spirit (applies to components too, per "Max 300 lines per component") |

**Version verification:** `stripe@20` is pinned in `supabase/functions/deno.json:5`. API version `2026-02-25.clover` is locked in `_shared/stripe-client.ts:8`. `supabase-js@2.97.0` is pinned at `deno.json:3`. No version upgrades needed for Phase 42. [VERIFIED: codebase]

## Architecture Patterns

### Recommended Project Structure (no new top-level folders)

```
supabase/
├── functions/
│   ├── stripe-cancel-subscription/       # NEW
│   │   └── index.ts                       # ~60 LOC — mirrors stripe-billing-portal
│   ├── stripe-billing-portal/             # KEEP (used by "Upgrade Plan" button in BillingSettings)
│   └── _shared/                           # UNCHANGED (reuse all utilities)
│
├── migrations/
│   └── 20260414NNNNNN_get_subscription_status_rpc.sql   # NEW — create the RPC the hook already expects
│
src/
├── components/settings/sections/
│   └── subscription-cancel-section.tsx    # REWRITE (3-state machine)
├── components/settings/
│   └── gdpr-data-actions.tsx              # NEW — extracted subcomponent reused across 3 call sites
├── hooks/api/
│   ├── use-billing-mutations.ts           # MODIFY (add useCancelSubscription + useReactivateSubscription)
│   └── query-keys/subscription-keys.ts    # MODIFY (replace portal-redirect cancelSubscription factory with real Edge Function call; add reactivateSubscription factory)
│
tests/e2e/tests/
└── owner/cancellation.spec.ts             # NEW — Playwright E2E spec
```

### Pattern 1: Edge Function auth-then-act

Every authenticated Edge Function follows this exact shape:

```typescript
// Source: supabase/functions/stripe-billing-portal/index.ts [VERIFIED]
Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  let env: Record<string, string>
  try {
    env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'],
      optional: ['FRONTEND_URL'],
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'env_validation' })
  }

  const supabase = createAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const auth = await validateBearerAuth(req, supabase)
  if ('error' in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: getJsonHeaders(req),
    })
  }
  const { user } = auth

  try {
    // <--- business logic here --->
    return new Response(JSON.stringify(result), { status: 200, headers: getJsonHeaders(req) })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'context_tag' })
  }
})
```

### Pattern 2: TanStack mutation with invalidation (Tier 1)

```typescript
// Source: src/hooks/api/use-billing-mutations.ts:57 [VERIFIED]
export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...billingMutations.cancelSubscription(),        // mutationKey + mutationFn
    ...createMutationCallbacks(queryClient, {
      invalidate: [subscriptionsKeys.list(), SUBSCRIPTION_STATUS_KEY],
      errorContext: 'Cancel subscription',
    }),
  })
}
```

### Pattern 3: Query factory with queryOptions() (NEVER string literals)

```typescript
// Source: src/hooks/api/query-keys/subscription-keys.ts [VERIFIED]
export const subscriptionStatusQuery = {
  subscriptionStatus: (options?: { enabled?: boolean }) =>
    queryOptions({
      queryKey: subscriptionStatusKey,
      queryFn: async (): Promise<SubscriptionStatusResponse> => { /* ... */ },
      staleTime: 5 * 60 * 1000,
    }),
}
```

### Pattern 4: Typed mapper at RPC boundary (no `as unknown as`)

```typescript
// Source: CLAUDE.md "RPC Return Typing" [VERIFIED]
function mapSubscriptionStatus(raw: Record<string, unknown>): SubscriptionStatusResponse {
  return {
    subscriptionStatus: raw.status as SubscriptionStatusResponse['subscriptionStatus'],
    stripeCustomerId: (raw.customer as string) ?? null,
    stripePriceId: (raw.price_id as string) ?? null,
    currentPeriodEnd: (raw.current_period_end as string) ?? null,
    cancelAtPeriodEnd: (raw.cancel_at_period_end as boolean) ?? false,
  }
}
```

### Anti-Patterns to Avoid

- **DON'T** call `stripe.subscriptions.cancel()` (immediate hard-cancel) — violates D1 period-end default.
- **DON'T** create a new query key factory — use existing `subscriptionStatusKey = ['billing', 'subscription-status']` at `query-keys/subscription-keys.ts:39`.
- **DON'T** instantiate `new Stripe(key, ...)` directly — use `getStripeClient(key)` from `_shared/stripe-client.ts` so the locked API version applies.
- **DON'T** call `stripe.customers.retrieve()` + read `subscription_id` — customer objects have `subscriptions` as a list, not a single id. The user's subscription must be resolved via `stripe.subscriptions.list({ customer: id, status: 'all' })` or by querying `stripe.subscriptions` table directly from the service-role client.
- **DON'T** expose the Stripe secret key to the browser — all `stripe.*` calls run server-side in the Edge Function.
- **DON'T** use `getSession()` for auth decisions in the Edge Function — always `getUser(token)` per CLAUDE.md Common Gotchas.
- **DON'T** divide by 100 in cancel mutation — no currency math happens in cancel; `current_period_end` is a Unix timestamp integer, not a dollar amount.
- **DON'T** create a barrel file `src/components/settings/index.ts` for the new `gdpr-data-actions.tsx` — per CLAUDE.md Zero Tolerance rule #2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation modal | Custom `<div>` overlay + focus trap | `AlertDialog` from `src/components/ui/alert-dialog.tsx` | Radix primitive already handles focus trap, Escape key, overlay click-to-dismiss, ARIA roles |
| GDPR export UI | Re-implement JSON blob download | Copy the `useMutation` body from `account-data-section.tsx:47-80` (or extract to shared component) | Already solves `Content-Disposition` filename parsing + Blob → anchor click + URL.revokeObjectURL cleanup |
| Account deletion confirmation | Custom type-to-confirm | The existing pattern in `account-data-section.tsx:222-258` (type "DELETE") | Proven pattern; adjust messaging to canceled-state context |
| Stripe subscription polling | `setInterval` fetch loop after mutation | `queryClient.invalidateQueries({ queryKey: subscriptionStatusKey })` in the mutation's `onSuccess` | Stripe sync engine handles webhook → table update; invalidation re-queries on next render |
| Playwright auth setup | Build new login flow | Existing `tests/e2e/tests/auth-api.setup.ts` — API-based Supabase auth producing `owner.json` storage state | 10× faster than UI login; chunk cookies handled; already runs as `setup-owner` project |
| End-date formatting | Manual Date math | Reuse `formatDeletionDate()` + `daysRemaining()` helpers from `account-danger-section.tsx:11-25` — or write equivalent for `current_period_end` | Conversion from Stripe Unix epoch integer to display string is a 3-liner; not worth a helper library |
| Error boundary UI | Custom 500 page | Existing `ErrorPage` from `#components/shared/error-page` | Per CLAUDE.md Component Conventions |

**Key insight:** Every subsystem this phase needs is already built and battle-tested. The phase is 90% wiring + 10% one new migration (RPC) + one new Edge Function + one component rewrite. The risk vector is *incorrect wiring of existing pieces*, not novel design.

## Runtime State Inventory

This is a feature-delivery phase with a minor data-read correction (missing RPC), not a rename/refactor. The `## Runtime State Inventory` section does not apply — no existing stored data or registered services carry "the old string" that needs rewriting.

**Verified explicitly:**

- **Stored data:** None — Phase 42 writes no new DB columns and renames nothing. Existing `stripe.subscriptions.cancel_at_period_end` is populated by the Stripe sync engine from live Stripe data, not from our code.
- **Live service config:** None — no services rename, no webhook endpoints change. `customer.subscription.updated` webhook will fire on our cancel mutation; existing `stripe-webhooks` handler already routes it (verified pattern in `stripe-webhooks/index.ts`).
- **OS-registered state:** None — no cron jobs, no task scheduler entries, no process managers.
- **Secrets/env vars:** `STRIPE_SECRET_KEY` already present in Edge Function secrets (used by 8+ existing functions). No new secrets.
- **Build artifacts:** None — no package renames, no egg-info directories, no Docker image tags.

## Common Pitfalls

### Pitfall 1: `get_subscription_status` RPC doesn't exist

**What goes wrong:** `useSubscriptionStatus` hook (at `query-keys/subscription-keys.ts:81`) calls `.rpc('get_subscription_status', { p_customer_id })` which silently 404s via PostgREST error and falls back to reading `leases.stripe_subscription_status`. The fallback returns `currentPeriodEnd: null` and `cancelAtPeriodEnd: false` — so the 3-state machine can never detect the "Cancel-scheduled" state.

**Why it happens:** Searched `supabase/migrations/` — no file creates `public.get_subscription_status`. The hook was written with the RPC as an API-contract assumption that was never implemented. [VERIFIED: `grep -r "get_subscription_status" supabase/migrations/` returns zero matches]

**How to avoid:** Create the RPC in Phase 42. Signature:
```sql
CREATE OR REPLACE FUNCTION public.get_subscription_status(p_customer_id text)
RETURNS TABLE (
  status stripe.subscription_status,
  customer text,
  price_id text,
  current_period_end timestamptz,    -- converted from integer
  cancel_at_period_end boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'stripe'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- Validate the caller owns this customer_id
  IF p_customer_id != (SELECT stripe_customer_id FROM public.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT s.status, s.customer,
    (s.items->0->'price'->>'id')::text AS price_id,
    to_timestamp(s.current_period_end)::timestamptz AS current_period_end,
    s.cancel_at_period_end
  FROM stripe.subscriptions s
  WHERE s.customer = p_customer_id
  ORDER BY s.created DESC
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_subscription_status(text) TO authenticated;
```

**Warning signs:** If canceling works but the UI doesn't flip to "Cancel-scheduled" state, the RPC is missing or returning null for `cancel_at_period_end`.

### Pitfall 2: Resolving the subscription ID server-side

**What goes wrong:** The cancel Edge Function receives an authenticated request but has no subscription ID. Naive fix: accept `subscription_id` from the request body — **but that lets a caller cancel any subscription**.

**How to avoid:** Resolve the subscription ID server-side from the authenticated user:

```typescript
// (a) get the user's stripe_customer_id from public.users
const { data: userData } = await supabase.from('users')
  .select('stripe_customer_id').eq('id', user.id).single()
if (!userData?.stripe_customer_id) return 404 'No subscription'

// (b) find the active subscription for this customer
// Option A: query stripe.subscriptions table (already RLS-filtered; but service role bypasses RLS so this is fine)
const { data: subs } = await supabase
  .schema('stripe' as 'public')       // schema NOT exposed via PostgREST — must use .rpc or raw SQL
  ... // this won't work through supabase-js — use the Stripe SDK instead

// Option B (recommended): use Stripe SDK since we're already server-side
const subList = await stripe.subscriptions.list({
  customer: userData.stripe_customer_id,
  status: 'all', limit: 1
})
const subscription = subList.data[0]
if (!subscription) return 404 'No subscription'
```

**Warning signs:** If the Edge Function accepts a `subscription_id` parameter from the body, it's a cross-tenant IDOR vulnerability. The correct pattern is zero-body — all identity derived from JWT.

### Pitfall 3: Stripe Sync Engine staleness

**What goes wrong:** Per migration `20260304161000_stripe_sync_diagnosis.sql`, `stripe.*` tables were last synced 2025-12-11 — ~4 months stale at time of research. After the Edge Function calls `stripe.subscriptions.update()`, Stripe fires `customer.subscription.updated` webhook → Sync Engine writes updated row → query reflects the change. **If the Sync Engine is disconnected, the query never updates.**

**Why it happens:** The Supabase Stripe Sync Engine has no self-recovery. Either the integration was disabled, the API key was rotated, or the webhook was removed from Stripe Dashboard.

**How to avoid:**
1. Before Phase 42 execution, planner should verify sync freshness via `SELECT * FROM public.check_stripe_sync_status();` — all rows should show `staleness_hours < 24`.
2. If stale: Supabase Dashboard → Integrations → Stripe → re-enable. NOT fixable via SQL.
3. Alternative read path as fallback: call `stripe.subscriptions.retrieve(id)` inside the Edge Function's response → return the fresh subscription to the client → `queryClient.setQueryData()` on success. This bypasses sync lag entirely for the immediate post-cancel UI flip.

**Warning signs:** After cancel mutation, `useSubscriptionStatus` still returns `cancelAtPeriodEnd: false` after 5+ seconds. Check `check_stripe_sync_status()` first before debugging the mutation.

**Recommended mitigation in the plan:** Edge Function returns the updated Stripe subscription object directly, frontend uses it to `setQueryData` the subscription-status cache → no dependence on sync engine for immediate UI flip. The sync engine catches up for later renders.

### Pitfall 4: Reactivation after `canceled` status

**What goes wrong:** After `customer.subscription.deleted` has fired (true `canceled` state), calling `subscriptions.update(id, { cancel_at_period_end: false })` returns a 400 error: "You cannot update a canceled subscription."

**How to avoid:** In the Reactivate handler, verify subscription `status === 'active'` AND `cancel_at_period_end === true` before calling the mutation. The 3-state machine enforces this at the UI level: Reactivate button only renders in state 2 ("Cancel-scheduled"), not state 3 ("Canceled").

**Warning signs:** Reactivate button visible when `status === 'canceled'` — UI gating bug.

### Pitfall 5: Playwright test flake on Stripe test-mode subscription seed

**What goes wrong:** Test creates a subscription via `stripe.subscriptions.create()`, then queries `useSubscriptionStatus` → returns null because the Sync Engine hasn't written the row yet (multi-second delay).

**How to avoid:** In the Playwright test fixture, insert the test subscription **directly into `stripe.subscriptions`** via service-role client (bypass the sync engine entirely for test seeding). The test asserts the UI flow, not the sync engine.

Alternative — simpler: pre-seed the test owner with a stable test-mode subscription once, and don't recreate per test run. Cancel + reactivate is idempotent (cancel-at-period-end can be toggled indefinitely before period ends).

## Code Examples

Verified patterns from the TenantFlow codebase.

### Example 1: Edge Function skeleton for `stripe-cancel-subscription/index.ts`

```typescript
// Source pattern: supabase/functions/stripe-billing-portal/index.ts [VERIFIED]
import { handleCorsOptions, getJsonHeaders } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getStripeClient } from '../_shared/stripe-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

interface CancelRequest {
  action: 'cancel' | 'reactivate'
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  let env: Record<string, string>
  try {
    env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'],
      optional: ['FRONTEND_URL'],
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'env_validation' })
  }

  const supabase = createAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const auth = await validateBearerAuth(req, supabase)
  if ('error' in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: getJsonHeaders(req),
    })
  }
  const { user } = auth

  try {
    const body = await req.json() as CancelRequest
    const action = body.action
    if (action !== 'cancel' && action !== 'reactivate') {
      return new Response(JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: getJsonHeaders(req) })
    }

    const { data: userData } = await supabase
      .from('users').select('stripe_customer_id').eq('id', user.id).single()
    if (!userData?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No subscription to modify' }),
        { status: 404, headers: getJsonHeaders(req) })
    }

    const stripe = getStripeClient(env.STRIPE_SECRET_KEY)
    const subList = await stripe.subscriptions.list({
      customer: userData.stripe_customer_id, status: 'all', limit: 1
    })
    const subscription = subList.data[0]
    if (!subscription) {
      return new Response(JSON.stringify({ error: 'No subscription found' }),
        { status: 404, headers: getJsonHeaders(req) })
    }

    // Guard: can't reactivate a fully canceled subscription
    if (action === 'reactivate' && subscription.status === 'canceled') {
      return new Response(JSON.stringify({ error: 'Subscription has ended. Please subscribe again from /pricing.' }),
        { status: 400, headers: getJsonHeaders(req) })
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: action === 'cancel',
    })

    return new Response(JSON.stringify({
      id: updated.id,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end,
      current_period_end: updated.current_period_end,   // Unix timestamp integer
    }), { status: 200, headers: getJsonHeaders(req) })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'cancel_subscription' })
  }
})
```

### Example 2: Mutation hooks

```typescript
// Target file: src/hooks/api/use-billing-mutations.ts [MODIFY]
export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: mutationKeys.subscriptions.cancel,
    mutationFn: async () => {
      const user = await getCachedUser()
      if (!user) throw new Error('Not authenticated')
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No session token')

      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${baseUrl}/functions/v1/stripe-cancel-subscription`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error((err as { error?: string }).error ?? 'Cancel failed')
      }
      return response.json() as Promise<{
        id: string; status: string; cancel_at_period_end: boolean; current_period_end: number
      }>
    },
    ...createMutationCallbacks(queryClient, {
      invalidate: [
        subscriptionsKeys.list(),
        ['billing', 'subscription-status'] as const,
        ownerDashboardKeys.all,
      ],
      successMessage: 'Your subscription will cancel at the end of the billing period.',
      errorContext: 'Cancel subscription',
    }),
  })
}

export function useReactivateSubscriptionMutation() {
  // Same shape, body = { action: 'reactivate' }
  // successMessage: 'Your subscription is active again.'
}
```

### Example 3: 3-state machine for `SubscriptionCancelSection`

```tsx
// Target file: src/components/settings/sections/subscription-cancel-section.tsx [REWRITE]
'use client'

import { AlertTriangle, Loader2, Clock, Undo2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '#components/ui/alert-dialog'
import { GdprDataActions } from '#components/settings/gdpr-data-actions'
import { useSubscriptionStatus } from '#hooks/api/use-billing'
import {
  useCancelSubscriptionMutation, useReactivateSubscriptionMutation,
} from '#hooks/api/use-billing-mutations'

type CancelState =
  | { kind: 'active' }
  | { kind: 'cancel_scheduled'; endDate: Date; daysRemaining: number }
  | { kind: 'canceled'; endDate: Date; deletionDate: Date }

function deriveState(status: SubscriptionStatusResponse | undefined): CancelState | null {
  if (!status || status.subscriptionStatus === null) return null  // No sub → hide section
  const endDate = status.currentPeriodEnd ? new Date(status.currentPeriodEnd) : null
  if (status.subscriptionStatus === 'canceled') {
    if (!endDate) return null
    const deletionDate = new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    return { kind: 'canceled', endDate, deletionDate }
  }
  if (status.cancelAtPeriodEnd && endDate) {
    const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return { kind: 'cancel_scheduled', endDate, daysRemaining }
  }
  return { kind: 'active' }
}

export function SubscriptionCancelSection() {
  const { data: status } = useSubscriptionStatus()
  const cancel = useCancelSubscriptionMutation()
  const reactivate = useReactivateSubscriptionMutation()
  const state = deriveState(status)
  if (!state) return null

  return (
    <BlurFade delay={0.55} inView>
      <section className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        {state.kind === 'active' && (/* AlertDialog with "Cancel Plan" button */)}
        {state.kind === 'cancel_scheduled' && (/* end date + Reactivate button */)}
        {state.kind === 'canceled' && (/* end date + deletion date + <GdprDataActions /> */)}
      </section>
    </BlurFade>
  )
}
```

### Example 4: AlertDialog wiring (from Radix shadcn pattern, verified against local `alert-dialog.tsx`)

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline" className="text-destructive">Cancel Plan</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
      <AlertDialogDescription>
        Your subscription will end on <strong>{endDateFormatted}</strong>.
        Your data stays for 30 days after your period ends per our privacy policy.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => cancel.mutate()}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Yes, cancel plan
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redirect to Stripe Customer Portal for cancel | Native in-app cancel via `subscriptions.update` | Phase 42 | CANCEL-01 compliance; one-click UX; no external page visits |
| Stub `cancelSubscription` factory that redirects to portal | Real Edge Function call with cancel/reactivate body | Phase 42 | Fixes the 5 dead-code mutation factories (cancel/update/pause/resume/portal-redirect all pointed at portal) |
| Read `leases.stripe_subscription_status` as fallback | `public.get_subscription_status()` RPC on `stripe.subscriptions` | Phase 42 | Single source of truth for status; supports all 6 states + `cancel_at_period_end` + `current_period_end` |
| Inline GDPR wiring duplicated across 2 components | Shared `<GdprDataActions />` subcomponent | Phase 42 | Third call site (canceled-state UI) forces deduplication |

**Deprecated/outdated:**

- `useBillingPortalMutation()` for cancellation — STILL VALID for "Update Card" + "Upgrade Plan" in `billing-settings.tsx:147,204,227` (those paths legitimately need the full portal). Do NOT remove this mutation; only remove its `mutate()` call from `subscription-cancel-section.tsx:27`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None | — | All claims in this research verified via codebase grep or docs.stripe.com WebFetch |

All factual claims cite the source file or external URL. No `[ASSUMED]` tags — nothing in this research relies on training-data knowledge that wasn't verified against the live codebase or Stripe's current docs.

## Open Questions (RESOLVED)

1. **Should the Edge Function return the updated Stripe subscription object, or just `{ success: true }`?**
   **RESOLVED:** Edge Function returns the full updated Stripe subscription object. Plan 42-01 Task 2 codifies this in the Edge Function's 200 response shape (`{ id, status, cancel_at_period_end, current_period_end }`) — this gives us the freshest state for `setQueryData` so the UI flips regardless of sync-engine lag.
   - What we know: Returning the object allows `setQueryData` optimistic UI update that bypasses sync engine lag (Pitfall 3).
   - What's unclear: Whether the planner wants to couple the hook to the Stripe object shape, or keep it decoupled and rely on `invalidateQueries` + sync engine.
   - Recommendation: **Return the full object**. The UX risk of "user clicks cancel, UI doesn't flip for 5+ seconds" is real given sync-engine staleness history. Typed mapper can normalize at the hook boundary.

2. **Is the Stripe Sync Engine currently connected?**
   **RESOLVED:** Treat sync engine status as unknown. Mitigated by writing the Edge Function response into the subscription-status cache via `queryClient.setQueryData(subscriptionKeys.status(), mappedResponse)` BEFORE `invalidateQueries` — this guarantees the UI flips using Stripe's authoritative response with no dependency on FDW sync. Plan 42-01 Task 3 now includes this setQueryData pattern in both `useCancelSubscriptionMutation` and `useReactivateSubscriptionMutation` onSuccess handlers; Plan 42-01 threat T-42-06 captures sync staleness as a mitigated risk.
   - What we know: As of migration `20260304161000_stripe_sync_diagnosis.sql` (2026-03-04), sync was disconnected since 2025-12-11.
   - What's unclear: Whether it was reconnected in the 40 days since. No migration confirms reconnection.
   - Recommendation: **Planner should run `SELECT * FROM public.check_stripe_sync_status();` as the first verification step** of the phase. If stale, the phase is blocked until sync is reconnected via Supabase Dashboard (manual step). Alternative fallback pattern (Example 1 returns fresh Stripe data) partially mitigates.

3. **Is there an existing test owner with a test-mode Stripe subscription?**
   **RESOLVED:** E2E uses graceful skip when no test-mode subscription is present. Plan 42-02 Task 3 (now Task 4 after the Task 1 split) uses `test.skip(\!hasSubscriptionToCancel, ...)` keyed off the visibility of the Cancel Plan button — the spec runs end-to-end when the seeded owner has a test-mode subscription and skips with a clear reason otherwise. No inline subscription seeding (out of scope per CONTEXT.md).
   - What we know: `E2E_OWNER_EMAIL` + `E2E_OWNER_PASSWORD` exist per `auth-api.setup.ts`. Playwright fixtures cookie-chunk and store as `owner.json`.
   - What's unclear: Whether that test owner has a `stripe_customer_id` with an active subscription in Stripe test mode.
   - Recommendation: **Planner should add a setup step to Phase 42** — seed a Stripe test-mode subscription for the owner fixture if one doesn't exist, either via a one-off script or via the existing `setup-owner` project. The cancel test depends on pre-existing subscription state.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server + Playwright | YES | v25.9.0 (CLAUDE.md requires 24.x) | — |
| Deno | Edge Function local testing | Requires `supabase functions serve` | (project-managed) | Deploy directly and test against deployed function |
| Supabase CLI | Local Supabase + Edge Function serve | (assumed, used by existing tests) | — | — |
| Stripe test-mode API key | Edge Function integration test | Must be in Supabase Edge Function secrets as `STRIPE_SECRET_KEY` | — | — |
| Supabase Stripe Sync Engine | Live `stripe.subscriptions` updates after cancel | UNKNOWN (last known disconnected) | — | Return Stripe response directly from Edge Function + `setQueryData` |
| Playwright | E2E test runner | YES | 1.58 (CLAUDE.md) | — |
| `E2E_OWNER_EMAIL` + `E2E_OWNER_PASSWORD` | Playwright auth fixture | YES (existing) | — | — |
| Test owner with active subscription | Playwright cancellation spec | UNKNOWN | — | Seed via setup script |

**Missing dependencies with no fallback:** None identified as blocking, but sync engine status requires verification.

**Missing dependencies with fallback:** Stripe Sync Engine — fallback is to return the fresh Stripe object from the Edge Function and use `setQueryData` to bypass cache invalidation → sync-engine-read path.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit tests | Vitest 4.0 with jsdom — `src/**/*.test.ts` — 80% coverage threshold |
| Component tests | Vitest component project — `pnpm test:component` |
| Integration (RLS) | Vitest integration project — `tests/integration/rls/` — manual only (not in CI) |
| Edge Function tests | Deno — `cd supabase/functions && deno test --allow-all --no-check tests/` — requires `supabase functions serve` |
| E2E tests | Playwright 1.58 — `tests/e2e/tests/` — 2 specs currently |
| Quick run command | `pnpm validate:quick` (typecheck + lint + unit tests) |
| Full suite command | `pnpm test:unit && pnpm test:component && pnpm test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CANCEL-01 | One-click cancel from settings (AlertDialog → mutation → UI flip) | E2E (Playwright) | `pnpm test:e2e -- tests/owner/cancellation.spec.ts` | ❌ Wave 0 |
| CANCEL-01 | Cancel mutation hook calls correct Edge Function endpoint | Unit (Vitest, jsdom, mocked fetch) | `pnpm test:unit src/hooks/api/use-billing-mutations.test.ts` | ❌ Wave 0 |
| CANCEL-01 | Edge Function calls `stripe.subscriptions.update({ cancel_at_period_end: true })` | Integration (Deno) | `cd supabase/functions && deno test tests/stripe-cancel-subscription-test.ts` | ❌ Wave 0 |
| CANCEL-02 | `useSubscriptionStatus` returns correct shape from `stripe.subscriptions` via RPC | Unit (Vitest, mocked supabase client) | `pnpm test:unit src/hooks/api/query-keys/subscription-keys.test.ts` | ❌ Wave 0 |
| CANCEL-02 | RPC `get_subscription_status` enforces `auth.uid()` + customer ownership | Integration (pgTAP or Vitest RLS) | `pnpm test:integration tests/integration/rls/subscription-status.test.ts` | ❌ Wave 0 (optional) |
| CANCEL-02 | 3-state machine `deriveState()` maps every stripe status correctly | Unit (Vitest, pure function) | `pnpm test:unit src/components/settings/sections/subscription-cancel-section.test.tsx` | ❌ Wave 0 |
| CANCEL-03 | Canceled-state UI renders export button + delete button + grace messaging | Component (Vitest + RTL) | `pnpm test:component src/components/settings/gdpr-data-actions.test.tsx` | ❌ Wave 0 |
| CANCEL-03 | GDPR delete call triggers `request_account_deletion()` RPC | Component (mock supabase.rpc) | same file as above | ❌ Wave 0 |
| All | typecheck + lint | Static | `pnpm typecheck && pnpm lint` | ✅ existing |

### Sampling Rate

- **Per task commit:** `pnpm validate:quick`
- **Per wave merge:** `pnpm test:unit && pnpm test:component && pnpm test:e2e` + `deno test` for Edge Function
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/tests/owner/cancellation.spec.ts` — covers CANCEL-01 (full flow)
- [ ] `src/hooks/api/use-billing-mutations.test.ts` — covers CANCEL-01 mutation wiring
- [ ] `src/hooks/api/query-keys/subscription-keys.test.ts` — covers CANCEL-02 (`useSubscriptionStatus` maps RPC response)
- [ ] `supabase/functions/tests/stripe-cancel-subscription-test.ts` — covers CANCEL-01 Edge Function contract
- [ ] `src/components/settings/sections/subscription-cancel-section.test.tsx` — covers 3-state machine `deriveState()`
- [ ] `src/components/settings/gdpr-data-actions.test.tsx` — covers CANCEL-03 GDPR wiring

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `validateBearerAuth()` — JWT `getUser(token)` verification, never `getSession()` |
| V3 Session Management | yes | `@supabase/ssr` 0.8 `getAll`/`setAll` pattern (CLAUDE.md Zero Tolerance) |
| V4 Access Control | yes | (a) Edge Function derives user id from JWT only, never request body; (b) `get_subscription_status` RPC validates `p_customer_id == caller's customer_id`; (c) RLS on `stripe.subscriptions` filters to caller's customer id |
| V5 Input Validation | yes | Zod schemas in `src/lib/validation/` (none needed — request body is closed enum `{ action: 'cancel' \| 'reactivate' }`) |
| V6 Cryptography | no | Stripe SDK handles all crypto; never hand-roll signatures |
| V7 Error Handling | yes | `errorResponse()` never leaks `err.message` to client; Sentry captures full context |
| V8 Data Protection | yes | Stripe secret key in Supabase Edge Function secrets only, never in code or `NEXT_PUBLIC_*` |
| V10 Business Logic | yes | Idempotent: cancel-at-period-end can be toggled multiple times safely. Reactivate-after-canceled blocked server-side (Pitfall 4). |
| V13 API | yes | CORS fail-closed via `getCorsHeaders()` with `FRONTEND_URL` origin lock |
| V14 Configuration | yes | `validateEnv()` fails fast on missing `STRIPE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant subscription cancel via IDOR | Tampering | Subscription ID resolved server-side from JWT-derived `stripe_customer_id` — never from request body |
| Unauthenticated cancel request | Spoofing | `validateBearerAuth()` returns 401 before any Stripe call |
| Stripe secret key exfiltration | Information Disclosure | Secret only in Edge Function env (Supabase Dashboard), never shipped to browser |
| Replay attack (reactivate a canceled sub) | Elevation of Privilege | Server-side check `subscription.status !== 'canceled'` before calling `stripe.subscriptions.update` |
| DoS via cancel/reactivate loop | Denial of Service | Stripe API has rate limits; additionally Phase 42 can add Upstash rate-limiter (`_shared/rate-limit.ts`) if needed — not required for v1.7 since mutation requires auth |
| PII leak in error response | Information Disclosure | `errorResponse()` returns generic `{ error: 'An error occurred' }`; full context only to Sentry |
| CSRF via cross-origin cancel | Tampering | CORS origin-locked to `FRONTEND_URL`; Edge Functions require JWT Bearer (not cookie) |

### Security Checklist for This Phase

- [ ] New Edge Function `stripe-cancel-subscription` uses `validateBearerAuth()` — NOT `getSession()`.
- [ ] Request body contains ONLY `{ action: 'cancel' \| 'reactivate' }` — NO `subscription_id`.
- [ ] Subscription ID resolved server-side from `users.stripe_customer_id` → `stripe.subscriptions.list({ customer })`.
- [ ] New RPC `get_subscription_status(p_customer_id)` validates `p_customer_id == (SELECT stripe_customer_id FROM public.users WHERE id = auth.uid())`.
- [ ] RPC has `SECURITY DEFINER` + `SET search_path = 'public', 'stripe'`.
- [ ] Reactivate guard: if `subscription.status === 'canceled'`, return 400 (not 500).
- [ ] All errors routed through `errorResponse()` — no `err.message` in response body.
- [ ] `CORS` configured via `getCorsHeaders(req)` + `handleCorsOptions(req)`.
- [ ] `FRONTEND_URL` env verified present (fail-closed otherwise).

## Sources

### Primary (HIGH confidence)

- `supabase/functions/stripe-billing-portal/index.ts` — canonical Edge Function structure template
- `supabase/functions/_shared/{auth,cors,env,errors,stripe-client,supabase-client}.ts` — required utilities
- `src/components/settings/sections/subscription-cancel-section.tsx` — the component to rewrite (broken state at line 27)
- `src/components/billing/subscription-status-banner.tsx` — KEEP-AS-IS reference for status visual system
- `src/hooks/api/use-billing.ts` — `useSubscriptionStatus` entry point
- `src/hooks/api/query-keys/subscription-keys.ts` — factories to modify (lines 39, 275-283)
- `src/hooks/api/use-billing-mutations.ts` — mutation hooks to modify
- `src/hooks/api/mutation-keys.ts:174-180` — `mutationKeys.subscriptions.{cancel, resume}` already exist
- `src/hooks/api/create-mutation-callbacks.ts` — invalidation + error handling pattern
- `src/hooks/api/use-owner-dashboard.ts:19-63` — `ownerDashboardKeys.all` for cross-cache invalidation
- `src/components/settings/account-data-section.tsx` + `src/components/settings/sections/account-danger-section.tsx` — GDPR wiring templates
- `src/types/api-contracts.ts:467-473` — `SubscriptionStatusResponse` type (already correct shape)
- `src/components/ui/{alert-dialog,button}.tsx` — shadcn primitives
- `supabase/schemas/stripe.sql:828-866` — `stripe.subscriptions` table schema
- `supabase/migrations/20260304161000_stripe_sync_diagnosis.sql` — sync engine staleness context + `check_stripe_sync_status()` diagnostic
- `supabase/migrations/20260305120000_get_user_invoices_rpc.sql` — RPC template for `stripe.*` access pattern
- `supabase/migrations/20251220060000_secure_stripe_schema_rls.sql` — RLS policy baseline
- `supabase/migrations/20251230191000_simplify_rls_policies.sql:19-31` — `private.get_my_stripe_customer_id()` helper
- `supabase/functions/export-user-data/index.ts` — GDPR export Edge Function
- `tests/e2e/playwright.config.ts` — projects, auth fixtures, web server config
- `tests/e2e/tests/auth-api.setup.ts` — owner auth setup (API-based, 10× faster than UI login)
- `.planning/REQUIREMENTS.md` (CANCEL-01 through CANCEL-03)
- `.planning/phases/42-cancellation-ux-end-to-end-audit-fix/42-CONTEXT.md` (D1-D4 locked decisions)
- `CLAUDE.md` (Zero Tolerance rules, Edge Function conventions, type lookup order)
- [docs.stripe.com/api/subscriptions/update](https://docs.stripe.com/api/subscriptions/update) — `cancel_at_period_end` boolean parameter semantics
- [docs.stripe.com/billing/subscriptions/cancel](https://docs.stripe.com/billing/subscriptions/cancel) — cancel vs. reactivate lifecycle; `customer.subscription.updated` and `customer.subscription.deleted` events

### Secondary (MEDIUM confidence)

- [docs.stripe.com/billing/testing/test-clocks](https://docs.stripe.com/billing/testing/test-clocks) — test clock mechanics (sufficient for this phase's "skip test clocks" decision)

### Tertiary (LOW confidence)

- None — every claim in this research document traces to either a file in this repo or an official Stripe doc page.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries present in codebase, all version-pinned.
- Architecture: HIGH — pattern templates exist for every new artifact (Edge Function, hook, mutation factory, RPC, component).
- Pitfalls: HIGH — sync engine issue, missing RPC, and subscription-id IDOR all verified via codebase grep. Reactivate-after-canceled verified via Stripe docs.
- Security: HIGH — all ASVS categories mapped to existing project patterns.
- E2E test strategy: MEDIUM — dependent on Q3 (test owner has subscription?). Recommend planner adds setup-step.
- Sync engine status: LOW — last known disconnected; requires manual verification before phase execution.

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days; stable libraries, stable Stripe API version pin).

## RESEARCH COMPLETE
