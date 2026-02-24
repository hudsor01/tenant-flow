# Phase 54: Payments & Billing — PostgREST + Stripe Edge Functions - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate `use-payments.ts` and `use-payment-methods.ts` to PostgREST for payment record queries. Move Stripe Connect onboarding, Stripe subscription management, and Stripe webhook processing from NestJS to Supabase Edge Functions. This phase eliminates the NestJS Stripe module entirely.

New Edge Functions in scope:
- `supabase/functions/stripe-webhooks` — processes all inbound Stripe webhook events
- `supabase/functions/stripe-connect` — generates Connect onboarding URLs, returns account status
- `supabase/functions/stripe-checkout` — creates Stripe Checkout Sessions for new subscriptions
- `supabase/functions/stripe-billing-portal` — creates Customer Portal Sessions for existing subscribers

</domain>

<decisions>
## Implementation Decisions

### Webhook failure handling
- On processing failure (e.g., DB write fails): return **500** so Stripe retries (Stripe retries up to 72 hours)
- **Idempotency**: create a new `stripe_webhook_events` table — columns: `id` (Stripe event ID, PK), `processed_at`, `event_type`; skip processing if event ID already exists
- **Unhandled event types**: return 200 + capture in Sentry (Claude's discretion — acknowledge silently but surface for visibility)
- **Events to handle in this phase**: full set — `customer.subscription.*`, `account.updated`, `payment_intent.*`, `checkout.session.completed`
- **Alerting on failure**: Stripe dashboard (built-in retry tracking) + Sentry error capture + email notification for `payment_intent` failures
- **`payment_intent.succeeded`**: Claude decides — upsert on `payment_intent_id` (update status if record exists, create if not)
- **`customer.subscription.updated`**: update `subscriptions` table (status, plan, current_period_start, current_period_end)
- **`account.updated`**: update `stripe_connect_accounts` table
- **Owner notification trigger**: only when `charges_enabled` flips to `true` (account fully verified + can receive payments)

### Stripe Connect onboarding UX
- **Navigation on "Connect Stripe" click**: Claude decides — full-page redirect to Stripe onboarding URL (standard approach, no popup blockers)
- **Return from onboarding**: redirect to main dashboard with toast: "Stripe account connected — verification pending"
- **Outstanding requirements state**: both — (1) dismissible warning banner on main dashboard with "Complete verification" CTA + (2) always-visible status in Settings > Payouts
- **Edge Function failure**: Claude decides — toast error with retry CTA ("Unable to connect to Stripe — try again")

### Billing portal / subscription management
- **Architecture**: two separate Edge Functions — `stripe-checkout` for new subscriptions + `stripe-billing-portal` for management (separate = independent deployment, failure isolation, easier maintenance)
- **New subscriptions**: `stripe-checkout` creates a Stripe **Checkout Session** (hosted checkout → Radar gets full front-end signal); returns URL; frontend redirects
- **Existing subscribers**: `stripe-billing-portal` creates a Stripe **Customer Portal Session**; returns URL; frontend redirects
- **Plan selection UI**: Claude decides — in-app plan picker showing options, then redirect to Stripe Checkout pre-populated with selected `price_id`
- **Proration**: Claude decides — use Stripe Customer Portal's default proration behavior (no custom logic)
- **Return from portal**: redirect to main dashboard with toast "Subscription updated"
- **Scope**: both creation AND management (replacing full NestJS Stripe module)

### Payment method display
- **Tenant payment method**: store card metadata (brand, last4, expiry, fingerprint) in DB after SetupIntent confirmation via React Stripe.js Elements; display from DB — no Stripe API call on page load
- **Owner subscription payment**: managed entirely in Stripe Customer Portal — not shown in-app
- **Empty state**: "Add payment method" button + Stripe Elements card input form opens inline
- **Multiple cards per tenant**: Claude decides — single active card per tenant for this phase (simpler; adding multi-card is a future phase)
- **Payment history row columns**: date, amount, status, property name, card used (last4)

### Claude's Discretion
- Unhandled webhook event type response (200 + Sentry recommended above)
- Full-page redirect vs new tab for Connect onboarding (full-page redirect recommended above)
- Edge Function failure error pattern for Connect (toast + retry CTA recommended above)
- In-app plan picker approach for checkout
- Proration behavior in Customer Portal
- Whether to upsert or update-only for `payment_intent.succeeded` (upsert recommended above)
- Single vs multiple payment methods per tenant (single recommended above)

</decisions>

<specifics>
## Specific Ideas

- Stripe Radar: use React Stripe.js Elements for all card input (SetupIntent, Checkout) — this is what activates full Radar fraud detection signal on front-end interactions
- Separate Edge Functions (`stripe-checkout` / `stripe-billing-portal`) preferred over a single combined `billing` function for long-term maintenance
- Card display format: "Visa •••• 4242, exp 12/26" (brand + masked number + expiry)
- The `stripe_webhook_events` idempotency table prevents duplicate processing on Stripe retries

</specifics>

<deferred>
## Deferred Ideas

- Multiple payment methods per tenant (select which card to charge for rent) — future phase
- Embedded Stripe Pricing Table on upgrade page (using Stripe's `<stripe-pricing-table>` element) — could replace plan picker in a later UX polish phase
- Automated payout schedule management for Connect accounts — separate phase

</deferred>

---

*Phase: 54-payments-billing-postgrest-stripe-edge-functions*
*Context gathered: 2026-02-21*
