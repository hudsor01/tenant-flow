---
phase: 13-frontend-checkout-subscriptions
plan: 02
subsystem: ui
tags: [stripe, react, payment-methods, ach, tenant]

# Dependency graph
requires:
  - phase: 13-frontend-checkout-subscriptions
    plan: 01
    provides: Pricing page pattern and billing component conventions
provides:
  - Payment methods list component at /components/billing/payment-methods-list.tsx
  - Payment methods hooks at /hooks/api/use-payment-methods.ts
  - ACH-first payment method ordering for cost optimization
affects: [14-stripe-connect-payouts-ui, 15-rent-payment-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ACH-first payment method ordering (us_bank_account before card)
    - Cost savings messaging for payment method selection
    - Payment method sorting (bank accounts first, default first within type)

key-files:
  created:
    - apps/frontend/src/hooks/api/use-payment-methods.ts
    - apps/frontend/src/components/billing/payment-methods-list.tsx
  modified:
    - apps/frontend/src/app/(tenant)/tenant/settings/payment-methods/payment-methods-content.client.tsx
    - apps/frontend/src/app/(tenant)/tenant/payments/methods/payment-method-setup-form.tsx

key-decisions:
  - "Keep Stripe Connect for rent payments - correct architecture for tenant→owner payments"
  - "Prioritize ACH over cards in UI - 0.8% capped at $5 vs 2.9% + $0.30 saves $39+ per rent payment"
  - "Add cost savings messaging to educate tenants on ACH benefits"
  - "Sort payment methods with bank accounts first for visual emphasis"

patterns-established:
  - "ACH-first ordering pattern: paymentMethodOrder: ['us_bank_account', 'card']"
  - "Cost savings banner pattern for payment method selection"
  - "Lower fees badge pattern for bank account entries"

issues-created: []

# Metrics
duration: 15min
completed: 2026-01-17
---

# Phase 13 Plan 02: Payment Method Management UI Summary

**Payment method management for tenants with ACH prioritization for cost optimization**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-17
- **Completed:** 2026-01-17
- **Tasks:** 2 planned + 1 enhancement (ACH prioritization)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Created payment methods hooks with TanStack Query v5 patterns
- Built reusable PaymentMethodsList component with card/bank display
- Integrated with existing PaymentMethodSetupForm using Radix Collapsible
- **Added ACH-first ordering** for cost optimization ($39+ savings per rent payment)
- Added cost savings banner and "Lower fees" badge for bank accounts
- Implemented sorting to always show bank accounts before cards

## Task Commits

Each task was committed atomically:

1. **Task 1: Create payment methods list component and hooks** - `1e76e3c3b` (feat)
2. **Task 2: Update payment methods page with improved UX** - `a12b142b6` (feat)
3. **Enhancement: Prioritize ACH with cost savings messaging** - `372d1b987` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

**Created:**
- `apps/frontend/src/hooks/api/use-payment-methods.ts` - TanStack Query hooks for payment methods CRUD
- `apps/frontend/src/components/billing/payment-methods-list.tsx` - Reusable list with actions dropdown

**Modified:**
- `apps/frontend/src/app/(tenant)/tenant/settings/payment-methods/payment-methods-content.client.tsx` - Integrated PaymentMethodsList with Collapsible add form
- `apps/frontend/src/app/(tenant)/tenant/payments/methods/payment-method-setup-form.tsx` - ACH-first ordering and cost savings banner

## Decisions Made

- **Keep Stripe Connect**: After analyzing Stripe pricing, confirmed Connect is correct for TenantFlow's tenant→owner payment model. The +0.25% fee is worth it for automated payouts, 1099 handling, and reduced liability.
- **ACH prioritization**: Changed `paymentMethodOrder` from `['card', 'us_bank_account']` to `['us_bank_account', 'card']` to surface the lower-cost option first.
- **Cost savings messaging**: Added prominent banner showing "$39+ savings per payment" to educate tenants on ACH benefits.
- **Visual hierarchy**: Green success color for bank icons and "Lower fees" badge to reinforce the recommendation.

## Stripe Pricing Context

Analysis done during execution:
- **Card payments**: 2.9% + $0.30 = $44.25 on $1,500 rent
- **ACH payments**: 0.8% capped at $5 = $5.00 on $1,500 rent
- **Savings**: $39.25 per rent payment

This informed the decision to strongly promote ACH to tenants.

## Deviations from Plan

- **Added ACH prioritization**: User requested alignment with "real money-making SaaS" best practices after Stripe pricing analysis. Added cost savings messaging and reordering.

## Issues Encountered

- **Empty supabase.ts**: Pre-commit hook failed due to empty types file (Doppler/network issue). Restored from git and commit succeeded.

## Next Phase Readiness

- Plan 13-02 complete, ready for 13-03-PLAN.md (Checkout flow integration)
- Payment methods management fully functional
- ACH optimization will reduce payment processing costs significantly

---
*Phase: 13-frontend-checkout-subscriptions*
*Completed: 2026-01-17*
