---
phase: 54-payments-billing-postgrest-stripe-edge-functions
plan: "04"
subsystem: payments
tags: [stripe, edge-functions, supabase, tanstack-query, billing, postgrest]

# Dependency graph
requires:
  - phase: 54-02
    provides: stripe-connect Edge Function pattern; use-stripe-connect.ts PostgREST migration pattern

provides:
  - stripe-checkout Edge Function: creates Stripe Checkout Session for new platform subscriptions, returns { url }
  - stripe-billing-portal Edge Function: creates Stripe Customer Portal Session for existing subscribers, returns { url }
  - use-billing.ts fully migrated: zero apiRequest calls; all reads via PostgREST; Stripe mutations via Edge Functions
  - useBillingPortalMutation: new hook redirecting to Customer Portal
  - Dashboard billing=updated return-journey toast

affects: [Phase 55 (billing portal tests), Phase 57 (NestJS cleanup), settings/billing page consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - callBillingEdgeFunction helper: typed helper fetching bearer-authed Edge Functions from frontend
    - Portal-redirect pattern: subscription management mutations redirect to Stripe Customer Portal instead of NestJS endpoints

key-files:
  created:
    - supabase/functions/stripe-checkout/index.ts
    - supabase/functions/stripe-billing-portal/index.ts
  modified:
    - apps/frontend/src/hooks/api/use-billing.ts
    - apps/frontend/src/app/(owner)/dashboard/page.tsx

key-decisions:
  - "stripe-checkout and stripe-billing-portal exist as separate Edge Functions for independent deployment and failure isolation (per locked CONTEXT.md decision)"
  - "useUpdateSubscriptionMutation, usePauseSubscriptionMutation, useResumeSubscriptionMutation, useCancelSubscriptionMutation all redirect to Customer Portal (Stripe manages subscription lifecycle)"
  - "useInvoices() returns empty array with TODO: Stripe invoices not stored in DB, requires dedicated Edge Function"
  - "useSubscriptionStatus() reads stripe_customer_id from users table via PostgREST — presence indicates subscription history; full status tracking via webhooks"
  - "useBillingHistory() reads from rent_payments via PostgREST (platform billing records)"

requirements-completed:
  - PAY-04

# Metrics
duration: 25min
completed: 2026-02-21
---

# Phase 54 Plan 04: Stripe Checkout and Billing Portal Edge Functions Summary

**Two Stripe Edge Functions (stripe-checkout + stripe-billing-portal) with use-billing.ts fully migrated from NestJS apiRequest to PostgREST + Edge Function calls, and dashboard billing return-journey toast wired**

## Performance

- **Duration:** 25 min
- **Started:** 2026-02-21T00:00:00Z
- **Completed:** 2026-02-21T00:25:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `stripe-checkout/index.ts`: creates Stripe Checkout Session with hosted checkout (Radar fraud detection enabled), get-or-create Stripe customer, returns `{ url }` for frontend redirect
- `stripe-billing-portal/index.ts`: creates Stripe Customer Portal Session, returns `{ url }` with return_url to `/dashboard?billing=updated`
- `use-billing.ts`: zero `apiRequest` or `getApiBaseUrl` calls; `useCreateSubscriptionMutation` calls stripe-checkout with `window.location.href` redirect; new `useBillingPortalMutation` calls stripe-billing-portal with redirect; subscription reads via PostgREST on leases/users tables
- Dashboard `page.tsx`: `?billing=updated` param detected on mount, shows `toast.success('Subscription updated')`, cleans URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Create stripe-checkout and stripe-billing-portal Edge Functions** - already committed prior to this session (verified correct content on disk)
2. **Task 2: Migrate use-billing.ts to Edge Functions + PostgREST + dashboard toast** - `0b52925` (feat)

## Files Created/Modified

- `supabase/functions/stripe-checkout/index.ts` - Stripe Checkout Session Edge Function; authenticates via JWT; get-or-create customer; `stripe.checkout.sessions.create`; returns `{ url }`
- `supabase/functions/stripe-billing-portal/index.ts` - Stripe Customer Portal Session Edge Function; authenticates via JWT; requires existing stripe_customer_id; `stripe.billingPortal.sessions.create`; returns `{ url }`
- `apps/frontend/src/hooks/api/use-billing.ts` - Fully migrated: `callBillingEdgeFunction` helper, `useSubscriptionStatus` via PostgREST, `useSubscriptions`/`useSubscription` via PostgREST on leases, `useCreateSubscriptionMutation` calls stripe-checkout, `useBillingPortalMutation` (new), portal-redirect pattern for update/pause/resume/cancel mutations
- `apps/frontend/src/app/(owner)/dashboard/page.tsx` - Added `useEffect` for `?billing=updated` param: shows success toast and cleans URL

## Decisions Made

- Subscription management mutations (update/pause/resume/cancel) redirect to Customer Portal instead of making direct API calls — Stripe manages the subscription lifecycle, no NestJS endpoint needed
- `useInvoices()` returns empty array with TODO comment — Stripe invoices are not stored in DB, requires a dedicated invoices Edge Function (deferred)
- `callBillingEdgeFunction` helper pattern matches `callStripeConnectFunction` from Phase 54-02 for consistency
- ESLint pre-commit hook caught unused `formatInvoice` function — removed all formatting utilities since invoice fetching is stubbed; can be re-added when invoice Edge Function is built

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused formatInvoice and related utilities**
- **Found during:** Task 2 (use-billing.ts migration)
- **Issue:** ESLint pre-commit hook rejected `formatInvoice` as defined-but-never-used (since invoices now return empty array). `StripeInvoice` type import also unused.
- **Fix:** Removed `formatCurrency`, `formatDate`, `formatStatus`, `formatInvoice` functions and `StripeInvoice` type import. These can be re-added when invoice Edge Function is implemented.
- **Files modified:** `apps/frontend/src/hooks/api/use-billing.ts`
- **Verification:** `pnpm --filter @repo/frontend typecheck` passes; lint passes in pre-commit
- **Committed in:** `0b52925` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — ESLint unused var)
**Impact on plan:** Necessary fix to pass pre-commit. Formatting utilities can be restored when invoice Edge Function is built. No scope creep.

## Issues Encountered

- Edge Functions (`stripe-checkout`, `stripe-billing-portal`) were already present on disk from prior commit — verified content matched plan spec exactly; committed as nothing_to_commit for Task 1.

## User Setup Required

**External services require manual configuration.** See [54-USER-SETUP.md](./54-USER-SETUP.md) if it exists, or refer to the plan frontmatter `user_setup` section:
- Set `STRIPE_SECRET_KEY` and `STRIPE_PRO_PRICE_ID` as Supabase Edge Function secrets
- Create Stripe Customer Portal configuration in Stripe Dashboard
- Set `FRONTEND_URL` Edge Function secret to production URL

## Next Phase Readiness

- Phase 54 Plan 04 complete: all billing hooks migrated to Edge Functions + PostgREST
- Ready for Phase 54 completion or next plan if one exists
- Stripe webhooks (updating `leases.stripe_subscription_status`) still needed to make subscription status accurate beyond stripe_customer_id presence check

---
*Phase: 54-payments-billing-postgrest-stripe-edge-functions*
*Completed: 2026-02-21*
