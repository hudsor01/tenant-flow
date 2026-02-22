---
phase: 54-payments-billing-postgrest-stripe-edge-functions
plan: "02"
status: complete
completed: 2026-02-21
---

# Phase 54-02 Summary: Stripe Connect Edge Function + Frontend Wiring

## What Was Done

### Task 1: stripe-connect Edge Function (pre-existing, verified complete)

`supabase/functions/stripe-connect/index.ts` (286 lines) was already in place and fully implements all 6 actions:

- `account` — retrieves live Stripe account status; degrades gracefully to DB row if Stripe is unreachable
- `onboard` — creates Stripe Express account (or reuses existing) + returns AccountLink onboarding URL
- `refresh-link` — refreshes expired onboarding link
- `balance` — fetches connected account balance via `stripe.balance.retrieve`
- `payouts` — lists payouts via `stripe.payouts.list` with pagination
- `transfers` — lists transfers via `stripe.transfers.list` with pagination

Uses `npm:stripe@14` (Deno-compatible), authenticates via JWT Bearer token, reads/writes `stripe_connected_accounts` table.

### Task 2: use-stripe-connect.ts migration (pre-existing, verified complete)

`apps/frontend/src/hooks/api/use-stripe-connect.ts` was already fully migrated to call the Edge Function via `callStripeConnectFunction()`. Zero `apiRequest` imports remain. All hooks use `POST /functions/v1/stripe-connect` with appropriate `action` payloads.

Full-page redirect (`window.location.href`) used for `useCreateConnectedAccountMutation` and `useRefreshOnboardingMutation` per user decision (avoids popup blockers).

### Task 3: Dashboard banner + return-journey toast + Settings Payouts status

**Dashboard (`apps/frontend/src/app/(owner)/dashboard/page.tsx`):**
- Return-journey toast: `useSearchParams` detects `?stripe_connect=success` on mount, fires `toast.success('Stripe account connected — verification pending')`, then cleans the URL param via `window.history.replaceState`
- Dismissible warning banner: when `connectedAccount.charges_enabled === false`, renders an `Alert` with "Complete verification" CTA button + dismiss (X) button. Banner disappears for the session via `useState`. Only shows when an account exists but is unverified.

**Settings Payouts (`apps/frontend/src/app/(owner)/settings/payouts/page.tsx`):**
- Created new page at `/settings/payouts`
- Always-visible Stripe account status section (not dismissible)
- Three states: Not connected (Badge "Not connected" + "Connect Stripe" button), Verification pending (Badge "Verification pending" + "Complete verification" button), Verified (Badge "Verified", no action needed)
- Links to `/financials/payouts` for payout history (full history UI already exists there)

## Key Decisions

- **Alert without `variant="warning"`**: The Alert component only has `default` and `destructive` variants. Used `className="border-warning/20 bg-warning/10"` directly on the Alert — consistent with patterns elsewhere in the codebase (stripe-connect-status.tsx, tenant-portal-page.tsx).
- **Banner placement**: Added banner inside `DashboardContent` (not in `DashboardPage`) since it needs the `useConnectedAccount` hook and `useState`. Wrapped existing Dashboard component in a `div` to inject the banner above it.
- **useSearchParams in Suspense**: `DashboardContent` is already inside a `Suspense` boundary in `DashboardPage`, so `useSearchParams()` works correctly without an additional Suspense wrapper.
- **Settings Payouts page**: Links to `/financials/payouts` for the actual payout history table (already built in Phase 53). The Settings > Payouts page focuses on account status and verification only.
- **Skeleton for loading**: Used `skeleton-text` CSS utility class (composite animation utility from UI standards) for the loading state in the payouts page.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/stripe-connect/index.ts` | Verified complete (pre-existing) |
| `apps/frontend/src/hooks/api/use-stripe-connect.ts` | Verified complete (pre-existing) |
| `apps/frontend/src/app/(owner)/dashboard/page.tsx` | Added return-journey toast + dismissible warning banner |
| `apps/frontend/src/app/(owner)/settings/payouts/page.tsx` | Created: always-visible Stripe account status section |

## Verification

```
supabase/functions/stripe-connect/index.ts — exists, 286 lines, all 6 Stripe actions
use-stripe-connect.ts — 0 apiRequest imports, callStripeConnectFunction + /functions/v1/stripe-connect present
dashboard/page.tsx — stripe_connect=success detected, useConnectedAccount + charges_enabled present
settings/payouts/page.tsx — useConnectedAccount + charges_enabled present
TypeCheck — passes (pnpm --filter @repo/frontend typecheck exits 0)
```
