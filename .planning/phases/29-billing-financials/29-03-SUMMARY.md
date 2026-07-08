# 29-03 Summary — BILL-01 (Stripe current_period_end read location)

**Requirement:** BILL-01 — the pinned `stripe@20` basil API (`2026-03-25.dahlia`) moved `current_period_end` OFF the top-level `Subscription` onto `subscription.items.data[].current_period_end`. Every top-level `sub.current_period_end` read returned `undefined`, so `users.subscription_current_period_end` was written `null` and cancel/reactivate returned an undefined period end (and the client crashed with a `RangeError` from `new Date(undefined * 1000)`).

## What changed

**Task 1 — 4 edge reads corrected (commit `dd3e32ddb`):**
- `supabase/functions/stripe-webhooks/handlers/customer-subscription-updated.ts` — payload now reads `const currentPeriodEnd = sub.items.data[0]?.current_period_end` and keeps the existing `? new Date(x * 1000).toISOString() : null` ternary (an absent item still maps to `null`, never `NaN`).
- `supabase/functions/stripe-webhooks/handlers/checkout-session-completed.ts` — identical change to its `subscription_current_period_end` line.
- `supabase/functions/stripe-cancel-subscription/index.ts` — BOTH returned `current_period_end` values now read from the item: the idempotent already-canceled branch (`subscription.items.data[0]?.current_period_end`) and the post-`subscriptions.update` branch (`updated.items.data[0]?.current_period_end`).
- Accessor mirrors the in-file `sub.items.data[0]?.price.id` pattern that already relied on the item shape. No other field, the `trial_ends_at` logic, or the response shape was touched. `subscription-keys.ts` untouched (it reads the denormalized column correctly — fixing these handlers populates it).

**Task 2 — client NaN/absent guard (commit `84d33c6e4`):**
- `src/hooks/api/use-billing-mutations.ts` `mapCancelResponseToStatus` — replaced the unconditional `new Date(response.current_period_end * 1000).toISOString()` with `Number.isFinite(response.current_period_end) ? ...toISOString() : null`. Used `Number.isFinite` (NOT a truthy check) deliberately: `0` is falsy but a valid epoch is huge, so a truthy check would wrongly reject `0`; non-finite (undefined / NaN) maps to `null` instead of throwing a `RangeError`. Defends the UI even against an edge fn not yet redeployed.
- Added a regression test in `use-billing-mutations.test.ts` asserting a response with an absent `current_period_end` yields `currentPeriodEnd: null` and does not throw.

## Verification
- `grep` for top-level `sub./subscription./updated.current_period_end` in the two edge dirs: **zero** remaining.
- `grep` confirms the four `items.data[0]?.current_period_end` accessors are present.
- `Number.isFinite` guard present in `mapCancelResponseToStatus`.
- `bun run test:unit -- src/hooks/api/use-billing-mutations.test.ts`: 6 passed (5 original + 1 new).
- Full pre-commit suite (lint + typecheck + unit) green on both commits.

## Residuals (OWNER-RUN)
- **Edge redeploy required (CLI-401 pattern):** the code fix ships but the corrected behavior only takes effect after the owner redeploys `stripe-webhooks` and `stripe-cancel-subscription`. Not attempted here (CLI 401s under this session's PAT).

## Note
- Edge-function TypeScript is Deno; whether it is covered by the root tsconfig is uncertain. The `sub.items.data[0]?.current_period_end` accessor mirrors the pre-existing `sub.items.data[0]?.price.id` read, so the item shape is already relied upon in these files. Correctness verified by careful review + the grep gates above.
