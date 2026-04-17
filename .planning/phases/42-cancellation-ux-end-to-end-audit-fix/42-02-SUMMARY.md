---
phase: 42-cancellation-ux-end-to-end-audit-fix
plan: 02
subsystem: settings / subscription lifecycle UI
tags: [cancellation, alert-dialog, gdpr, shadcn, playwright, state-machine]
requirements: [CANCEL-01, CANCEL-03]
provides:
  - GdprDataActions component (variant='standalone' | 'inline')
  - SubscriptionCancelSection 3-state machine (Active / Cancel-scheduled / Canceled)
  - AlertDialog-based one-click cancellation flow (replaces Stripe Portal redirect)
  - Playwright cancellation happy-path smoke
requires:
  - useCancelSubscriptionMutation (from Plan 42-01)
  - useReactivateSubscriptionMutation (from Plan 42-01)
  - useSubscriptionStatus (existing, now returns real Stripe data via Plan 42-01 RPC)
  - shadcn AlertDialog + Button + BlurFade primitives (vendored)
affects:
  - src/components/settings/billing-settings.tsx (no edits — mounts SubscriptionCancelSection; behavior now completely different under the hood)
  - src/components/settings/sections/account-danger-section.tsx (collapsed to a 7-line delegate)
tech-stack:
  added: []
  patterns:
    - "AlertDialog onClick uses event.preventDefault() + manual setDialogOpen(false) on success, so the pending 'Canceling...' spinner is not clipped by the dialog auto-close"
    - "3-state machine branches on (subscriptionStatus, cancelAtPeriodEnd) tuple with explicit null gates for past_due / unpaid / null (delegation to SubscriptionStatusBanner)"
    - "GdprDataActions variant prop deduplicates ~200 lines of mutation+state logic between settings/general (standalone) and settings/billing State 3 (inline)"
key-files:
  created:
    - src/components/settings/gdpr-data-actions.tsx
    - src/components/settings/__tests__/gdpr-data-actions.test.tsx
    - src/components/settings/sections/subscription-cancel-section.test.tsx
    - tests/e2e/tests/owner/cancellation.spec.ts
  modified:
    - src/components/settings/sections/subscription-cancel-section.tsx
    - src/components/settings/sections/account-danger-section.tsx
decisions:
  - "D4 honored by mounting <GdprDataActions variant='inline' /> inside State 3, NOT by inlining the export/delete UI manually. Keeps the Danger-Zone source of truth in one file."
  - "Reactivate flow is NOT gated by AlertDialog per D3 — a single click fires useReactivateSubscriptionMutation. Rationale: reactivation is a non-destructive reverse; confirmation would be friction."
  - "AlertDialogAction uses event.preventDefault() + explicit close on success. If we relied on the default auto-close, the pending 'Canceling...' label would vanish instantly and obscure mutation state from the user."
  - "E2E spec uses test.skip(condition, reason) rather than probing for test-clock fixtures. Creating a Stripe test-mode subscription inline is explicitly out of scope per CONTEXT.md."
metrics:
  tasks_completed: 4
  files_created: 4
  files_modified: 2
  commits: 4
  tests_added: 18
  completed_date: "2026-04-13"
---

# Phase 42 Plan 02: Cancellation UX 3-State Machine Summary

Replaced the broken `useBillingPortalMutation` redirect in `SubscriptionCancelSection` with a shadcn AlertDialog-driven 3-state machine (Active / Cancel-scheduled / Canceled) wired to the backend hooks that shipped in Plan 42-01. Extracted `GdprDataActions` into a reusable component with `standalone` and `inline` variants, collapsing `AccountDangerSection` to a 7-line delegate and letting State 3 of the cancel section mount the same Download + Request-Deletion UI inline (no navigation away from `/dashboard/settings`). Added 16 Vitest component tests (5 GdprDataActions + 11 SubscriptionCancelSection) and a 2-test Playwright happy-path spec.

## What Was Built

### Task 1a: `GdprDataActions` extraction

**File:** `src/components/settings/gdpr-data-actions.tsx` (NEW)

- Lifted 3 mutations verbatim from the old `AccountDangerSection`:
  - `exportData` → POSTs to the `export-user-data` Edge Function, downloads the returned Blob via anchor-click pattern
  - `requestDeletion` → calls `supabase.rpc('request_account_deletion')` with special-cased toast copy for `active leases` / `pending payments` error branches
  - `cancelDeletion` → calls `supabase.rpc('cancel_account_deletion')` to reverse a pending deletion during the 30-day grace window
- Lifted `deletionStatus` query (on `authKeys.deletionStatus()` → `['auth', 'deletion-status']`)
- Lifted helpers `formatDeletionDate()` and `daysRemaining()` as module-level functions
- New `variant` prop:
  - `variant='standalone'`: wraps two `<section>` cards in `BlurFade` with full Danger-Zone framing (`bg-destructive/5`, "Your Data" + "Danger Zone" eyebrows, full copy). Matches the pre-refactor visual identity exactly.
  - `variant='inline'`: emits a single `space-y-4` `<div>` with no BlurFade, no outer cards, no Danger Zone eyebrow — designed to nest inside the red-tinted State 3 card of `SubscriptionCancelSection`.
- Trigger button `aria-label` hardened to `Request permanent account deletion` to match the UI-SPEC copy contract.

**File:** `src/components/settings/sections/account-danger-section.tsx` (REWRITE — 7 lines total)

```tsx
'use client'

import { GdprDataActions } from '#components/settings/gdpr-data-actions'

export function AccountDangerSection() {
	return <GdprDataActions variant="standalone" />
}
```

Every helper, state hook, mutation, and JSX block from the pre-refactor 260-line file is gone. The Vitest suite on the new component locks the extraction behavior in place against future regressions.

### Task 1b: GdprDataActions component tests

**File:** `src/components/settings/__tests__/gdpr-data-actions.test.tsx` (NEW)

5 Vitest tests (all passing):

1. `standalone variant renders Download + Request Deletion with Danger Zone framing` — asserts both `aria-label`-matched buttons render and the "Danger Zone" eyebrow is visible.
2. `inline variant renders actions without Danger Zone framing or BlurFade` — asserts the same two buttons render but the eyebrow is absent, `.bg-destructive/5` is absent, and the root carries `.space-y-4`.
3. `Export button click invokes export-user-data Edge Function` — stubs `fetch`, clicks Download, asserts the first call URL contains `export-user-data`.
4. `Request Deletion fires request_account_deletion RPC after type-to-confirm` — opens type-to-confirm form, types `DELETE`, clicks confirm, asserts `supabase.rpc` called with `request_account_deletion` as first arg.
5. `pending deletion state renders Cancel Deletion button` — seeds `authKeys.deletionStatus()` with a 29-days-ago ISO timestamp, asserts the amber "Account scheduled for deletion" alert and Cancel Deletion button are visible.

Uses `vi.hoisted()` for all Supabase client + sonner mocks per CLAUDE.md. `setQueryData(authKeys.deletionStatus(), ...)` seeds the query so the component does not flicker through `isLoading`.

### Task 2: `SubscriptionCancelSection` 3-state machine

**File:** `src/components/settings/sections/subscription-cancel-section.tsx` (REWRITE — 252 lines)

Branches on `(subscriptionStatus, cancelAtPeriodEnd)`:

| State | Condition | UI |
|-------|-----------|----|
| 1. Active | `status='active' && !cancelAtPeriodEnd` | Destructive-tinted Danger Zone card with "Cancel Plan" AlertDialogTrigger. D2 dialog copy verbatim. |
| 2. Cancel-scheduled | `status='active' && cancelAtPeriodEnd` | Neutral card with amber Clock alert + outline "Reactivate Plan" button (no dialog gate per D3). |
| 3. Canceled | `status='canceled' \|\| 'cancelled'` | Red-tinted Lock card + `<GdprDataActions variant='inline' />` + subtle `/pricing` link. |
| Skeleton | `isLoading` | `.animate-pulse` `<div>` with `aria-label="Loading subscription status"`. |
| Error | `isError` or `!data` | Neutral card with `Subscription status unavailable. Retry` button. |
| Null (no sub) | `subscriptionStatus === null` | Returns `null`. `SubscriptionStatusBanner` handles messaging. |
| Past-due / unpaid | `'past_due' \|\| 'unpaid'` | Returns `null`. Billing banner handles messaging. |

**D2 copy contract (all verbatim in the file):**
- Title: `Cancel your subscription?`
- Dismiss button: `Keep my plan`
- Confirm button idle: `Yes, cancel plan`
- Confirm button pending: `Canceling...`
- Confirm aria-label: `Confirm subscription cancellation`

**D3 reactivate button:** `aria-label="Reactivate subscription"`, no AlertDialog gate.

**D4 inline GDPR:** `<GdprDataActions variant="inline" />` is mounted directly inside the State 3 card — no manual inlining of export/delete UI.

**Post-deviation details (locked):**
- `useBillingPortalMutation` import removed. Verified by `! rg -q "useBillingPortalMutation" src/components/settings/sections/subscription-cancel-section.tsx`.
- `billing.stripe.com` URL absent. Verified by `! rg -q "billing\\.stripe\\.com" ...`.
- `AlertDialogAction` uses `event.preventDefault()` + explicit `setDialogOpen(false)` in `onSuccess`, keeping the pending spinner visible until the mutation settles.

**File:** `src/components/settings/sections/subscription-cancel-section.test.tsx` (NEW)

11 Vitest tests (all passing): skeleton, null gate, past_due gate, State 1 layout, dialog-open copy, dialog-confirm fires `mutate`, State 2 layout, Reactivate fires `mutate` without dialog, State 3 mounts `GdprDataActions` with `data-variant="inline"`, pending disables confirm + shows `Canceling...`, error fallback renders Retry.

### Task 3: Playwright cancellation happy-path spec

**File:** `tests/e2e/tests/owner/cancellation.spec.ts` (NEW — 2 tests)

1. `owner can cancel subscription in one click without leaving the settings page` — full happy path. Opens `/dashboard/settings`, switches to billing tab, asserts Danger Zone visible, races a `billing.stripe.com` redirect detector (catches any regression to the old portal redirect), clicks Cancel Plan, asserts AlertDialog opens with D2 copy, clicks confirm, asserts UI flips to State 2 (Subscription ends … / Reactivate button visible), asserts URL stays on `/dashboard/settings`, best-effort reactivates for cleanup.
2. `cancel section is not rendered for owners without a subscription` — positive assertion of the null gate from UI-SPEC "Loading & error substates".

Both tests `test.skip(condition, reason)` gracefully when the seeded owner lacks a Stripe test-mode subscription (or has one and the negative test is not applicable). Uses storageState auth; no manual login code. Uses `ROUTES.DASHBOARD_SETTINGS` constant per test conventions.

## CANCEL Requirements Closed

**CANCEL-01** — Owner can cancel subscription in one click from `/dashboard/settings?tab=billing` with an AlertDialog confirmation, zero redirects to `billing.stripe.com`.
- Evidence: `subscription-cancel-section.tsx` mounts `AlertDialog` with D2 verbatim copy; `useCancelSubscriptionMutation` fires on confirm; no `useBillingPortalMutation` import remains; Playwright spec races a `waitForURL(/billing\.stripe\.com/)` detector that stays null through the full cancel flow.

**CANCEL-03** — In Canceled state, owner sees Download + Delete inline on the same settings page.
- Evidence: State 3 branch of `subscription-cancel-section.tsx` mounts `<GdprDataActions variant="inline" />` directly inside the red-tinted card; the mock in `subscription-cancel-section.test.tsx` asserts the mounted variant attribute is `"inline"`; the 30-day data-deletion copy is interpolated via `addDaysFormatted(currentPeriodEnd, 30)`.

## D1–D4 Decisions → Code Trace

| Decision | Where in code |
|----------|---------------|
| D1 — `cancel_at_period_end` timing | Backend Plan 42-01; UI trusts `cancelAtPeriodEnd` boolean from `useSubscriptionStatus()` for State 2 branching (`subscription-cancel-section.tsx:127`). |
| D2 — AlertDialog copy locked | `subscription-cancel-section.tsx:212-231` (Title / Description / Cancel / Action labels verbatim). |
| D3 — Reactivate button inline (no dialog gate) | `subscription-cancel-section.tsx:140-146` — `<Button>` directly fires `reactivateMutation.mutate()` on click, no `<AlertDialog>` wrapper. |
| D4 — State 3 mounts shared GdprDataActions | `subscription-cancel-section.tsx:117` — `<GdprDataActions variant="inline" />`. |

## Final Verification

| Gate | Result |
|------|--------|
| `pnpm typecheck` | Exit 0 |
| `pnpm lint` | Exit 0 |
| `pnpm test:unit -- --run src/components/settings` | 21 passed (5 gdpr-data-actions + 11 subscription-cancel-section + 5 pre-existing payment-option-card) |
| `pnpm exec playwright test tests/e2e/tests/owner/cancellation.spec.ts --list` | 2 tests listed |

## Deviations from Plan

None — plan executed exactly as written. All acceptance grep checks pass:

- `! rg -q "useBillingPortalMutation" subscription-cancel-section.tsx` → PASS
- `! rg -q "billing\\.stripe\\.com" subscription-cancel-section.tsx` → PASS
- `rg -q "useCancelSubscriptionMutation" subscription-cancel-section.tsx` → PASS
- `rg -q "Cancel your subscription?" subscription-cancel-section.tsx` → PASS
- `rg -q "Keep my plan" subscription-cancel-section.tsx` → PASS
- `rg -q "Yes, cancel plan" subscription-cancel-section.tsx` → PASS
- `rg -q 'GdprDataActions variant="inline"' subscription-cancel-section.tsx` → PASS
- `wc -l account-danger-section.tsx` → 7 (≤ 10 required)
- `rg -c "useMutation" account-danger-section.tsx` → 0
- `rg -c "useMutation" gdpr-data-actions.tsx` → 4 (≥ 3 required)

## Commits

| SHA | Message |
|-----|---------|
| `6d178d54f` | `refactor(42-02): extract GdprDataActions from account-danger-section` |
| `92f21f308` | `test(42-02): add GdprDataActions component tests` |
| `9d7a10e34` | `feat(42-02): rewrite SubscriptionCancelSection as 3-state machine` |
| `a62ab7f47` | `test(42-02): add Playwright cancellation happy-path spec` |

## Self-Check: PASSED

- Files exist on disk: `src/components/settings/gdpr-data-actions.tsx`, `src/components/settings/__tests__/gdpr-data-actions.test.tsx`, `src/components/settings/sections/subscription-cancel-section.tsx`, `src/components/settings/sections/subscription-cancel-section.test.tsx`, `src/components/settings/sections/account-danger-section.tsx`, `tests/e2e/tests/owner/cancellation.spec.ts` — all FOUND.
- Commits exist: `6d178d54f`, `92f21f308`, `9d7a10e34`, `a62ab7f47` — all FOUND in `git log`.
- Final 4 verification gates: all exit 0.
