# Phase 13: Frontend Checkout & Subscriptions

## Goal

Implement proper checkout UI, subscription management, payment method handling

## Dependencies

- Phase 12: Webhook Security & Reliability (Complete)

## Research Topics (from ROADMAP.md)

- [x] Stripe.js initialization
- [x] Elements styling
- [x] Checkout Sessions vs embedded checkout
- [x] Customer Portal integration
- [x] Payment Element and SCA/3D Secure

## Key Tasks (from ROADMAP.md)

1. Implement Stripe Elements for card collection
2. Build subscription selection and upgrade/downgrade UI
3. Add payment method management (add/remove/default)
4. Integrate Stripe Customer Portal for self-service
5. Handle SCA/3D Secure authentication flows

## Current State Summary

**Already Implemented:**
- `PaymentMethodSetupForm` with full PaymentElement, LinkAuthenticationElement, AddressElement
- `createCheckoutSession()` and `createCustomerPortalSession()` in stripe-client.ts
- `SubscriptionsTab` for listing subscriptions with pause/resume/cancel
- Backend controllers: checkout, subscription, payment-methods, invoices

**Gaps to Fill:**
- Subscription plan selection UI (pricing page)
- Payment method list page with CRUD actions
- Express Checkout Element (Apple/Google Pay)
- Subscription upgrade/downgrade confirmation flows

## Recommended Plan Breakdown

| Plan | Focus | Complexity |
|------|-------|------------|
| 13-01 | Subscription Plan Selection UI | Medium |
| 13-02 | Payment Method Management UI | Medium |
| 13-03 | Checkout Flow Polish (Express Checkout, result pages) | Low |

## Files to Modify/Create

**New Components:**
- `apps/frontend/src/app/(owner)/billing/plans/page.tsx` - Plan selection page
- `apps/frontend/src/components/billing/plan-card.tsx` - Individual plan display
- `apps/frontend/src/components/billing/upgrade-dialog.tsx` - Upgrade confirmation
- `apps/frontend/src/app/(tenant)/tenant/settings/payment-methods/page.tsx` - PM list page

**Existing to Enhance:**
- `apps/frontend/src/app/(tenant)/tenant/payments/methods/payment-method-setup-form.tsx`

## Backend Endpoints (Already Exist)

- `POST /api/v1/stripe/create-checkout-session`
- `POST /api/v1/stripe/create-billing-portal`
- `GET /api/v1/stripe/subscriptions`
- `POST /api/v1/stripe/subscriptions/:id/pause`
- `POST /api/v1/stripe/subscriptions/:id/resume`
- `DELETE /api/v1/stripe/subscriptions/:id`
- `GET /api/v1/stripe/payment-methods`
- `POST /api/v1/stripe/attach-tenant-payment-method`
- `DELETE /api/v1/stripe/payment-methods/:id`

## Technical Decisions

1. **Use PaymentElement** (not CardElement) - Already implemented, supports all payment methods
2. **Keep Customer Portal** for complex subscription changes - No need to rebuild
3. **Add ExpressCheckoutElement** for mobile-first UX
4. **Use deferred intent pattern** for payment method setup

---

*Created: 2026-01-17*
*Status: Research complete, ready for planning*
