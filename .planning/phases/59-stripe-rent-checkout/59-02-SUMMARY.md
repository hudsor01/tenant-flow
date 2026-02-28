---
phase: 59-stripe-rent-checkout
plan: 02
subsystem: payments
tags: [stripe, checkout, frontend, tenant-portal, webhooks, fee-breakdown, tanstack-query]

# Dependency graph
requires:
  - phase: 59-stripe-rent-checkout
    plan: 01
    provides: stripe-rent-checkout Edge Function, rent_payments fee breakdown columns, API contract types
  - phase: 34-stripe-connect
    provides: stripe_connected_accounts table with charges_enabled field
provides:
  - Tenant portal "Pay with Stripe" checkout flow (payments/new page rewrite)
  - Checkout success/cancel URL param handling with toast notifications
  - charges_enabled guard on Pay Rent button (dashboard + payments page)
  - Webhook fee breakdown population (gross_amount, platform_fee_amount, stripe_fee_amount, net_amount)
  - rent_due_id and checkout_session_id linking in webhook handler
affects: [60-receipt-emails, 64-autopay]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stripe Checkout redirect flow: mutation calls Edge Function -> redirects to Stripe -> success/cancel URL params trigger toast + query invalidation"
    - "charges_enabled prop drilling: amountDue query -> tenant-portal-page -> tenant-portal component for conditional Pay/disabled rendering"
    - "balance_transaction fee retrieval in webhook: best-effort charge.balance_transaction expansion for Stripe processing fee calculation"

key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/api/use-tenant-portal.ts
    - apps/frontend/src/hooks/api/mutation-keys.ts
    - apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx
    - apps/frontend/src/app/(tenant)/tenant/tenant-portal-page.tsx
    - apps/frontend/src/components/tenant-portal/tenant-portal.tsx
    - supabase/functions/stripe-webhooks/index.ts
    - apps/frontend/src/app/(tenant)/tenant/__tests__/responsive-dashboard-layout.test.tsx
    - apps/frontend/src/app/(tenant)/tenant/__tests__/design-consistency.test.tsx
    - apps/frontend/src/app/(tenant)/tenant/__tests__/design-system-consistency.property.test.tsx

key-decisions:
  - "No pre-checkout confirmation dialog -- clicking Pay Rent goes directly to Edge Function -> Stripe redirect (per CONTEXT.md)"
  - "charges_enabled=false shows inline disabled message rather than hiding the Pay button entirely -- gives tenant actionable guidance"
  - "Webhook balance_transaction retrieval is best-effort -- fee defaults to 0 if retrieval fails, payment still records successfully"
  - "URL search params (checkout=success/cancelled) cleaned via window.history.replaceState to avoid re-triggering toast on refresh"

patterns-established:
  - "Checkout return URL handling: useSearchParams + useRef(toastShown) + replaceState pattern for one-time toast on redirect return"
  - "Query invalidation on checkout success: invalidate amountDue + payments queries to refresh paid state immediately"

requirements-completed: [PAY-01, PAY-02]

# Metrics
duration: 18min
completed: 2026-02-27
---

# Phase 59 Plan 02: Stripe Rent Checkout Frontend + Webhook Summary

**Tenant portal rewritten for Stripe Checkout redirect flow with charges_enabled guard, success/cancel toast handling, and webhook fee breakdown population**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-27T07:08:02Z
- **Completed:** 2026-02-27T07:26:25Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Rewrote payments/new page: removed old payment method selector, replaced with single "Pay with Stripe" button that calls Edge Function and redirects to Stripe Checkout
- Added charges_enabled guard on both tenant dashboard and payments page -- disabled state with explanatory message when owner hasn't completed Stripe onboarding
- Implemented checkout success/cancel URL param handling with green success toast, info cancel toast, and query invalidation
- Updated webhook payment_intent.succeeded handler to populate all fee breakdown columns (gross_amount, platform_fee_amount, stripe_fee_amount, net_amount) using balance_transaction expansion

## Task Commits

Each task was committed atomically:

1. **Task 1: Add checkout mutation and charges_enabled query** - `dd196d5f8` (feat) -- completed prior to this execution
2. **Task 2: Rewrite payments/new page and update dashboard for Stripe Checkout flow** - `46cac58bc` (feat)
3. **Task 3: Update webhook handler to populate fee breakdown columns** - `3ff570f57` (feat)

## Files Created/Modified
- `apps/frontend/src/hooks/api/use-tenant-portal.ts` - Added useRentCheckoutMutation, charges_enabled + rent_due_id to amountDue query
- `apps/frontend/src/hooks/api/mutation-keys.ts` - Added tenantPortal.payRent mutation key
- `apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx` - Rewritten: Stripe Checkout redirect flow, charges_enabled/already_paid/no_rent_due states
- `apps/frontend/src/app/(tenant)/tenant/tenant-portal-page.tsx` - Added checkout success/cancel toast handling, chargesEnabled prop pass-through
- `apps/frontend/src/components/tenant-portal/tenant-portal.tsx` - Added chargesEnabled prop and conditional Pay Now / disabled message rendering
- `supabase/functions/stripe-webhooks/index.ts` - payment_intent.succeeded handler populates fee breakdown columns via balance_transaction
- `apps/frontend/src/app/(tenant)/tenant/__tests__/responsive-dashboard-layout.test.tsx` - Updated mock for charges_enabled rendering
- `apps/frontend/src/app/(tenant)/tenant/__tests__/design-consistency.test.tsx` - Updated mocks for new imports
- `apps/frontend/src/app/(tenant)/tenant/__tests__/design-system-consistency.property.test.tsx` - Updated mocks for new imports

## Decisions Made
- No pre-checkout confirmation dialog -- per CONTEXT.md locked decision, clicking Pay goes straight to Stripe
- charges_enabled=false shows inline guidance ("Payment setup pending - contact your landlord") instead of hiding the button
- Webhook fee retrieval is best-effort via balance_transaction expansion -- non-fatal failure defaults fees to 0
- URL params cleaned via replaceState after toast to prevent re-triggering on page refresh

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed responsive-dashboard-layout test mock for charges_enabled**
- **Found during:** Task 2 (Frontend rewrite)
- **Issue:** Test mock returned `data: null` from useQuery for amountDue, so `chargesEnabled` resolved to `false`, causing the Pay Now `.dashboard-quick-action` link to not render (replaced by disabled message)
- **Fix:** Updated useQuery mock to return full amountDue data with `charges_enabled: true` so the quick action link renders for touch target testing
- **Files modified:** apps/frontend/src/app/(tenant)/tenant/__tests__/responsive-dashboard-layout.test.tsx
- **Verification:** All 4 responsive dashboard layout tests pass (was 2 failing)
- **Committed in:** 46cac58bc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary test mock fix caused by new chargesEnabled conditional rendering. No scope creep.

## Issues Encountered
None -- all three tasks executed cleanly.

## User Setup Required
None -- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET should already be set from prior phases.

## Next Phase Readiness
- Complete end-to-end rent payment flow is now wired: tenant clicks Pay -> Stripe Checkout -> webhook records payment with fee breakdown
- Phase 60 (receipt emails) can read fee breakdown columns from rent_payments without Stripe API calls
- Phase 64 (autopay) can build on the same amountDue query pattern and charges_enabled guard

---
*Phase: 59-stripe-rent-checkout*
*Plan: 02*
*Completed: 2026-02-27*

## Self-Check: PASSED
- All 9 created/modified files verified on disk
- All 3 task commits verified in git history
