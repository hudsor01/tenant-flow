# Phase 64: Autopay - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Tenants can enable recurring monthly rent payments using a saved payment method, eliminating the need to manually pay each month. Uses the same destination charge fee split pattern as Phase 59's manual checkout. No new payment methods; this automates the existing rent payment flow.

</domain>

<decisions>
## Implementation Decisions

### Enrollment & payment method setup
- First payment saves card automatically via Stripe Checkout with `setup_future_usage: 'off_session'` — no separate card entry flow
- Dedicated "Payment Settings" section in tenant portal with autopay on/off toggle + saved payment method display
- Tenant can disable autopay at any time from Payment Settings
- Integrate with Stripe where possible if UX is better (user's explicit preference)

### Charge timing & execution
- Autopay charge fires ON the rent due date — simple, predictable
- Claude decides the trigger mechanism: evaluate pg_cron + Edge Function vs Stripe Subscriptions vs hybrid approach, and choose what provides the BEST UX for a property management use case
- Must reuse the same destination charge pattern (platform fee split to owner's Express account)
- Duplicate payment prevention: same partial unique index from Phase 59 prevents double-charging

### Failure handling & retries
- Use Stripe's built-in retry logic for failed charges — battle-tested dunning (up to 4 attempts over ~7 days)
- Failed payment notification via Resend email — reuses Phase 60 email infrastructure
- Email includes link to tenant portal for manual payment
- Payment status in rent_payments reflects failure state

### Claude's Discretion
- Trigger mechanism choice (pg_cron vs Stripe Subscriptions vs hybrid) — evaluate and pick best UX
- Payment Settings section layout and toggle design
- How saved payment method is displayed (card brand, last 4, expiry)
- Whether autopay enrollment needs confirmation step or is instant
- Owner visibility into which tenants have autopay enabled
- Autopay notification email template design (pre-charge notification if applicable)
- Edge case: what happens if rent amount changes mid-cycle (lease amendment)

</decisions>

<specifics>
## Specific Ideas

- User explicitly said: "integrate with stripe where possible if ux is better" — lean on Stripe's native capabilities rather than building custom scheduling when Stripe handles it well
- Stripe's built-in retry/dunning logic preferred over custom retry — don't reinvent what Stripe already does well
- `setup_future_usage: 'off_session'` on first Checkout session saves card for future off-session charges

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 64-autopay*
*Context gathered: 2026-02-27*
