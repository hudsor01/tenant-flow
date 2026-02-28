# Phase 59: Stripe Rent Checkout - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Tenants can pay rent through the platform via Stripe Checkout with destination charges. Funds route to the owner's Stripe Express account with a platform application fee. Creates rent_payments records on webhook confirmation. Receipt emails and autopay are separate phases (60, 64).

</domain>

<decisions>
## Implementation Decisions

### Checkout flow UX
- "Pay Rent" button appears in TWO locations: on the rent due card (tenant dashboard) and on a dedicated payments page
- No pre-checkout confirmation dialog — click "Pay Rent" and go straight to Stripe Checkout redirect
- After successful payment, redirect back to tenant portal dashboard with a green success toast: "Payment successful!"
- Rent due card shows current balance only — payment history lives on the payments page

### Fee structure
- Owner absorbs all fees (Stripe processing + platform fee) — tenant pays the exact rent amount
- Itemized fee breakdown on owner dashboard: gross amount, platform fee, Stripe fee, net received
- Owners expect platform costs as part of using the SaaS — this is standard for PM platforms (Buildium, Avail, TurboTenant)

### Payment-to-record mapping
- Webhook-only record creation — rent_payments record created ONLY after Stripe confirms payment_intent.succeeded via webhook
- No optimistic insert on checkout start — avoids orphaned "pending" records from abandoned sessions
- Full amount payments only — no partial rent payments allowed
- Comprehensive PaymentIntent metadata: tenant_id, lease_id, property_id, unit_id, rent_due_id, amount, period (month/year) — enables Phase 60 receipt emails to render without extra DB queries
- Store fee breakdown in rent_payments: gross_amount, platform_fee, stripe_fee, net_amount — owner dashboard reads from DB, not Stripe API

### Error & edge case handling
- Prevent duplicate payments — check if successful payment already exists for this rent_due period before allowing checkout; disable button: "Already paid for this period"
- Abandoned checkout = clean state — tenant returns to portal, rent due card unchanged, pay button still available; Stripe sessions expire automatically (24h)
- Holdover tenants (expired lease but still residing) — payment availability driven by rent_due records, NOT lease status; if there's an amount due, the pay button shows regardless of whether the lease is technically expired

### Claude's Discretion
- Platform application fee structure (percentage, flat, or combo) and rate
- Fee configurability (global fixed vs per-owner vs tier-based)
- charges_enabled=false UX (disabled button with message vs hidden button vs error on click)
- No-active-lease empty state design
- Stripe Checkout session configuration details (expiration, payment methods accepted)

</decisions>

<specifics>
## Specific Ideas

- Month-to-month holdover tenants are a real use case — the system should not block payment just because a lease record shows "expired"
- The fee breakdown on the owner dashboard should build trust through transparency — owners should see exactly where their money goes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 59-stripe-rent-checkout*
*Context gathered: 2026-02-26*
