# Phase 13 Research: Frontend Checkout & Subscriptions

**Phase Goal:** Implement proper checkout UI, subscription management, payment method handling

**Research Date:** 2026-01-17

---

## Research Topics

1. Stripe.js initialization
2. Elements styling
3. Checkout Sessions vs embedded checkout
4. Customer Portal integration
5. Payment Element and SCA/3D Secure

---

## Current State Analysis

### Existing Frontend Stripe Code

**Files already implemented:**

| File | Purpose | Status |
|------|---------|--------|
| `lib/stripe/stripe-client.ts` | Stripe.js loader, checkout session creation, Customer Portal | ✅ Complete |
| `types/stripe.ts` | Basic subscription types | Minimal |
| `tenant/payments/methods/payment-method-setup-form.tsx` | Full Payment Element with Elements provider | ✅ Complete |
| `components/payments/rent-collection/subscriptions-tab.tsx` | Subscription listing with pause/resume/cancel | ✅ Complete |
| `hooks/api/use-stripe-connect.ts` | Connect account hooks | Exists |

**Backend Controllers (Already Split):**

- `checkout.controller.ts` - Checkout session creation
- `subscription.controller.ts` - Subscription management
- `payment-methods.controller.ts` - Payment method CRUD
- `stripe-tenant.controller.ts` - Tenant-specific Stripe operations
- `invoices.controller.ts` - Invoice operations
- `connect/connect.controller.ts` - Connect account management
- `connect/payouts.controller.ts` - Payout operations

### Key Findings

1. **Payment Method Setup Form Already Exists** - Full implementation with:
   - `PaymentElement` with accordion layout
   - `LinkAuthenticationElement` for email/Link
   - `AddressElement` for billing address
   - Custom theme matching design system variables
   - Proper error handling and loading states

2. **Checkout Session Creation Exists** - `createCheckoutSession()` in stripe-client.ts

3. **Customer Portal Exists** - `createCustomerPortalSession()` implemented

---

## Standard Stack for Phase 13

### Required Packages (Already Installed)

```json
{
  "@stripe/stripe-js": "installed",
  "@stripe/react-stripe-js": "installed"
}
```

### Key React Components from @stripe/react-stripe-js

| Component | Purpose | Already Used? |
|-----------|---------|---------------|
| `Elements` | Provider wrapping Stripe-powered components | ✅ Yes |
| `PaymentElement` | Unified payment collection UI | ✅ Yes |
| `LinkAuthenticationElement` | Email + Link authentication | ✅ Yes |
| `AddressElement` | Billing/shipping address collection | ✅ Yes |
| `ExpressCheckoutElement` | Apple Pay, Google Pay, Link | ❌ Not yet |

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useStripe()` | Access Stripe.js instance for confirmPayment, etc. |
| `useElements()` | Access Elements instance for submit, etc. |

---

## Architecture Patterns

### Pattern 1: Deferred Intent (Recommended for Subscriptions)

The current implementation uses this pattern correctly:

```tsx
// 1. Initialize Elements with mode: 'setup' or mode: 'payment'
const options: StripeElementsOptions = {
  mode: 'setup', // or 'payment' with amount/currency
  appearance: { theme: 'stripe', ... }
}

// 2. Collect payment details with PaymentElement
<Elements stripe={stripePromise} options={options}>
  <PaymentElement />
</Elements>

// 3. On submit, call elements.submit() to validate
const { error: submitError } = await elements.submit()

// 4. Create payment method (for setup) or confirm payment
const { paymentMethod } = await stripe.createPaymentMethod({ elements })
```

### Pattern 2: Client Secret Flow (Checkout Sessions)

For one-time payments or when backend creates intent first:

```tsx
// 1. Backend creates PaymentIntent/SetupIntent, returns client_secret
const { clientSecret } = await fetch('/api/create-payment-intent').then(r => r.json())

// 2. Initialize Elements with clientSecret
<Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
  <PaymentElement />
</Elements>

// 3. Confirm payment directly
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  clientSecret,
  confirmParams: { return_url: 'https://...' },
  redirect: 'if_required'
})
```

### Pattern 3: Embedded Checkout (Stripe-Hosted UI in iframe)

For fully Stripe-branded checkout without custom UI:

```tsx
// Backend creates embedded checkout session
const { clientSecret } = await fetch('/api/create-checkout-session', {
  body: JSON.stringify({ ui_mode: 'embedded', ... })
}).then(r => r.json())

// Frontend uses EmbeddedCheckout component
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'

<EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
  <EmbeddedCheckout />
</EmbeddedCheckoutProvider>
```

### Pattern 4: Customer Portal (No Custom UI Needed)

Redirect to Stripe-hosted portal for subscription management:

```ts
// Already implemented in stripe-client.ts
const { url } = await createCustomerPortalSession(returnUrl)
window.location.href = url
```

---

## 3D Secure / SCA Handling

The `confirmPayment` and `confirmSetup` methods automatically handle 3D Secure:

1. If 3DS required, Stripe shows authentication modal
2. `redirect: 'if_required'` handles inline vs redirect flows
3. After authentication, promise resolves with result

```tsx
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  clientSecret,
  confirmParams: { return_url: window.location.origin + '/payment/complete' },
  redirect: 'if_required' // Handles 3DS inline when possible
})

if (error) {
  // Payment failed or authentication failed
} else if (paymentIntent.status === 'succeeded') {
  // Payment complete
} else if (paymentIntent.status === 'requires_action') {
  // Rare: additional action needed
}
```

---

## Common Pitfalls & Best Practices

### 1. Load Stripe Outside Component

```tsx
// ✅ CORRECT - Outside component
const stripePromise = loadStripe('pk_...')

function Component() {
  return <Elements stripe={stripePromise}>...</Elements>
}

// ❌ WRONG - Inside component (recreates on every render)
function Component() {
  const stripe = loadStripe('pk_...')
  return <Elements stripe={stripe}>...</Elements>
}
```

### 2. Handle Form Validation Before Server Call

```tsx
// ✅ CORRECT - Submit elements first
const { error: submitError } = await elements.submit()
if (submitError) return // Don't call server

const { clientSecret } = await fetch('/api/create-intent')

// ❌ WRONG - Server call before validation
const { clientSecret } = await fetch('/api/create-intent')
const { error } = await stripe.confirmPayment({ elements, clientSecret })
```

### 3. Use Appearance API for Theming

The current implementation correctly uses CSS variables:

```tsx
appearance: {
  variables: {
    colorPrimary: 'var(--color-primary)',
    colorBackground: 'var(--color-background)',
    // ...
  }
}
```

### 4. Always Provide Return URL

Required for redirect-based payment methods (iDEAL, Bancontact, etc.):

```tsx
confirmParams: {
  return_url: window.location.origin + '/payment/complete'
}
```

### 5. Handle Loading States Properly

```tsx
const stripe = useStripe()
const elements = useElements()

// Both are null until loaded
if (!stripe || !elements) {
  return <Loading />
}
```

---

## Gap Analysis: What's Missing for Phase 13

### Must Have (Based on Roadmap Key Tasks)

| Task | Current Status | Work Needed |
|------|----------------|-------------|
| Stripe Elements for card collection | ✅ Implemented | None |
| Subscription selection/upgrade/downgrade UI | ⚠️ Partial | Need pricing page, plan selection |
| Payment method management (add/remove/default) | ⚠️ Partial | List view exists, need full CRUD UI |
| Customer Portal integration | ✅ Implemented | None |
| SCA/3D Secure handling | ✅ Automatic | None |

### Nice to Have

| Feature | Current Status | Priority |
|---------|----------------|----------|
| ExpressCheckoutElement (Apple/Google Pay) | Not implemented | Medium |
| Embedded Checkout option | Not implemented | Low |
| Payment retry UI for failed subscriptions | Not implemented | Medium |

---

## Recommended Implementation Approach

### Plan 1: Subscription Plan Selection UI
- Create pricing page with plan cards
- Add upgrade/downgrade confirmation dialogs
- Wire to existing subscription endpoints

### Plan 2: Payment Method Management UI
- Create payment methods list page
- Add "Add Payment Method" flow (already exists as form)
- Add "Set Default" and "Remove" actions
- Connect to `payment-methods.controller.ts` endpoints

### Plan 3: Checkout Flow Polish
- Add Express Checkout Element for Apple/Google Pay
- Improve loading/error states
- Add success/failure result pages

---

## References

- [React Stripe.js Reference](https://stripe.com/docs/stripe-js/react)
- [Payment Element](https://stripe.com/docs/payments/payment-element)
- [Customer Portal](https://stripe.com/docs/customer-management/portal-overview)
- [Deferred Intent Pattern](https://stripe.com/docs/payments/accept-a-payment-deferred)
- [3D Secure Authentication](https://stripe.com/docs/payments/3d-secure)

---

## Decision Summary

1. **Use existing PaymentMethodSetupForm** - Already production-ready with proper patterns
2. **Keep Customer Portal for subscription management** - No need to rebuild Stripe UI
3. **Add subscription selection UI** - New work needed
4. **Add payment method list UI** - New work needed
5. **Consider ExpressCheckoutElement** - For better mobile UX

---

*Research completed: 2026-01-17*
*Ready for planning phase*
