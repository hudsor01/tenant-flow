---
phase: 42-cancellation-ux-end-to-end-audit-fix
requirements: CANCEL-01, CANCEL-02, CANCEL-03
status: captured
created: 2026-04-13
---

# Phase 42 Context: Cancellation UX End-to-End Audit + Fix

## Phase Goal (from ROADMAP.md)
"1-click cancel" promise is real: owners cancel from settings in one click, UI reflects real subscription state from `stripe.subscriptions`, canceled-state UI exposes GDPR export + delete inline.

## Audit Finding (Primary Gap)
`src/components/settings/sections/subscription-cancel-section.tsx:27` calls `useBillingPortalMutation()` which redirects to the Stripe Billing Portal. This **directly violates CANCEL-01** ("without visiting Stripe customer portal"). The mutation itself is wrong — not just the UX.

## Prior Decisions (Already Locked — No Re-Ask)
- **Status source**: `stripe.subscriptions` table (FDW-cached), NOT `users.stripe_customer_id` existence. (CLAUDE.md "Common Gotchas")
- **GDPR actions placement**: inline on canceled-state UI, no additional navigation. (CANCEL-03 success criterion)
- **Existing `SubscriptionStatusBanner`**: keep visual system for `past_due`/`unpaid`/`canceled`/null — already renders the right shapes.

## Locked Decisions (from discuss-phase 2026-04-13)

### D1 — Cancel timing: period-end default
Clicking "Cancel Plan" → `stripe.subscriptions.update(id, { cancel_at_period_end: true })`.
- Owner keeps service until paid period ends, then Stripe fires `customer.subscription.deleted`.
- Matches Stripe industry convention; preserves paid service.
- Rationale: safest default, "one click" preserved, no immediate value destruction.

### D2 — Confirmation dialog: simple shadcn AlertDialog
- Title: "Cancel your subscription?"
- Body: states the end date (from `current_period_end`) + "Your data stays for 30 days after your period ends per our privacy policy."
- Two buttons: `Cancel` (dismiss) / `Yes, cancel plan` (destructive variant, fires mutation).
- No reason collection, no type-to-confirm. "One confirmation dialog, one mutation" — matches success criterion #1.

### D3 — Un-cancel (reactivation): inline reverse toggle
- After canceling-at-period-end, the same settings section renders a "Reactivate plan" button.
- Same mutation endpoint, flips `cancel_at_period_end: false`.
- Zero friction to stay — reduces churn from buyer's remorse.
- Only works during the grace window (before `customer.subscription.deleted` fires); after true cancel, user must go back through `/pricing`.

### D4 — Canceled-state UI: transform settings section inline
- The `SubscriptionCancelSection` component has 3 states:
  1. **Active** (current): "Cancel Plan" button + "data retained 30 days" hint.
  2. **Cancel-scheduled** (`cancel_at_period_end=true`, status still `active`): end date + days-remaining + "Reactivate plan" button.
  3. **Canceled** (status `canceled` after period end): end date + "Your data will be deleted on {end + 30d}" + inline "Export my data" + "Request account deletion" buttons.
- Dashboard still accessible until period end.
- No new routes, no modals, no full-screen lock.

## Claude's Discretion (planner/executor decides)
- Cancel mutation transport: Edge Function (required — needs Stripe SDK) at `supabase/functions/stripe-cancel-subscription/index.ts` or extend existing `stripe-billing-portal` folder. Planner picks the cleanest shape.
- Which subscription query the settings section uses — either existing `useSubscriptionStatus` or a new sibling hook that pulls richer fields (`cancel_at_period_end`, `current_period_end`).
- GDPR "Export my data" + "Request account deletion" wiring: reuse existing `export-user-data` Edge Function and `request_account_deletion()` RPC (documented in CLAUDE.md) — just expose them inline.
- Dashboard gating for `past_due`/`unpaid`: keep existing `SubscriptionStatusBanner` behavior — audit only, don't redesign.
- Playwright E2E (success criterion #4): approach is planner's call — Stripe test-mode subscription create-then-cancel in setup is the obvious shape, but use Stripe test clock if the team's Playwright infra already supports it.

## Files Likely Touched
- `src/components/settings/sections/subscription-cancel-section.tsx` — state machine rewrite, AlertDialog integration, Button (shadcn) replacing raw `<button>`
- `src/hooks/api/use-billing-mutations.ts` — new `useCancelSubscriptionMutation` + `useReactivateSubscriptionMutation`
- `src/hooks/api/use-billing.ts` — extend `useSubscriptionStatus` or add hook returning `cancel_at_period_end` + `current_period_end`
- `supabase/functions/stripe-cancel-subscription/index.ts` (new) — auth check, Stripe SDK update, invalidate relevant cache
- `tests/e2e/tests/cancellation.spec.ts` (new) — Playwright happy-path spec

## Deferred / Out of Scope
- Churn reason collection → could become separate analytics phase
- Downgrade flow (cancel → switch to cheaper plan) → out of scope per goal wording
- Immediate-cancel variant with prorated refund → deferred; period-end is the default and only option for now

## Downstream Handoff Notes
- **Researcher**: investigate `stripe.subscriptions` schema (FDW vs synced table — check Supabase docs), existing `stripe-billing-portal` Edge Function structure as a template for the new cancel function, and Playwright Stripe test clock integration patterns.
- **Planner**: likely 2 plans — (a) mutation + hooks + status query wiring; (b) UI state machine + AlertDialog + GDPR inline actions + E2E spec. Both plans are sequential within phase (UI depends on mutation). No wave parallelism unless the mutation and E2E are split off separately.
