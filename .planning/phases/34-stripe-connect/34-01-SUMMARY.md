---
phase: 34-stripe-connect
plan: 01
subsystem: payments
provides: stripe-connect-onboarding-verified
affects: [36-tenant-onboarding, 37-financial-wiring]
key-files:
  - apps/frontend/src/hooks/api/use-stripe-connect.ts
  - apps/frontend/src/components/connect/connect-account-status.tsx
  - apps/frontend/src/components/settings/billing-settings.tsx
  - apps/frontend/src/app/(tenant)/tenant/settings/stripe-connect-onboarding.tsx
  - apps/backend/src/modules/billing/webhooks/handlers/connect-webhook.handler.ts
key-decisions:
  - ConnectOnboardingDialog lives at (tenant)/tenant/settings/ but is used by owner BillingSettings — path quirk via path alias, not a bug
  - Single webhook endpoint handles both platform and Connect events (same STRIPE_WEBHOOK_SECRET)
  - useConnectedAccount() now returns null on 404 instead of throwing — enables "no account" UI state
---

# Phase 34 Plan 01 Summary: Stripe Connect E2E Verification

**Fixed: useConnectedAccount() was showing error state instead of "no account" state when owner has no Connect account.**

## Accomplishments

- Audited full Connect flow: ConnectAccountStatus → BillingSettings → ConnectOnboardingDialog → backend
- Found bug: `useConnectedAccount()` propagated 404 NotFoundException as an error, causing error state to render instead of the empty/setup state
- Fixed: added 404 catch in `useConnectedAccount()` query function — returns `null` on 404
- Verified: `ConnectAccountStatus` already has correct "no account" branch with "Get Started" CTA
- Verified: `account.updated` webhook routing exists (webhook-processor.service.ts:77)
- Verified: No separate STRIPE_CONNECT_WEBHOOK_SECRET needed (single endpoint)

## Files Modified

- `apps/frontend/src/hooks/api/use-stripe-connect.ts` — added 404 → null handling in useConnectedAccount queryFn

## Key Findings

| Component | Status | Notes |
|-----------|--------|-------|
| ConnectAccountStatus no-account state | ✅ Correct | Had "Get Started" CTA all along |
| useConnectedAccount 404 handling | ❌ Bug → Fixed | Was propagating as error, now returns null |
| BillingSettings onSetupClick wiring | ✅ Correct | `setShowOnboarding(true)` correctly wired |
| ConnectOnboardingDialog form | ✅ Correct | Calls POST /onboard, opens onboarding URL |
| account.updated webhook routing | ✅ Correct | Routes to ConnectWebhookHandler |
| Separate STRIPE_CONNECT_WEBHOOK_SECRET | N/A | Not needed — single endpoint |

## Next Step

Phase 34 complete. Ready for Phase 35: Subscription Enforcement.
