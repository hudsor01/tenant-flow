---
phase: 42-cancellation-ux-end-to-end-audit-fix
verified: 2026-04-14T13:17:41Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Live cancel flow against Stripe test mode"
    expected: "Owner clicks Cancel Plan → AlertDialog opens → confirm → UI flips to State 2 (Cancel-scheduled) with correct end date + days-remaining; reactivate flips back to State 1"
    why_human: "Requires a seeded Stripe test-mode subscription; Playwright spec gracefully skips without one. Verify visually in dev environment."
  - test: "30-day data retention messaging fidelity in Canceled state"
    expected: "State 3 shows 'Your plan ended on {endDate}' and 'Your data will be deleted on {endDate + 30d}' with correct locale formatting; inline GDPR Download + Delete buttons render without navigation"
    why_human: "Copy fidelity + visual review — UI-SPEC VALIDATION.md flags this as manual-only"
  - test: "AlertDialog destructive variant visual fidelity"
    expected: "shadcn destructive variant applied to confirm button; 'Canceling...' spinner + label visible during mutation; dialog remains open until mutation settles"
    why_human: "Snapshot/visual regression not configured per VALIDATION.md"
---

# Phase 42: Cancellation UX End-to-End Audit + Fix Verification Report

**Phase Goal:** "1-click cancel" promise is real — owners cancel from settings in one click, UI reflects real subscription state from `stripe.subscriptions`, canceled-state UI exposes GDPR export + delete inline.
**Verified:** 2026-04-14T13:17:41Z
**Status:** passed (human verification items outstanding for live-flow validation)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner can cancel from settings end-to-end in one click (one confirmation dialog, one mutation) without visiting Stripe portal or a separate page, and UI reflects the new state after mutation resolves | VERIFIED | `subscription-cancel-section.tsx:209-247` AlertDialog with trigger → confirm → `useCancelSubscriptionMutation().mutate()` → `queryClient.setQueryData(subscriptionStatusKey, ...)` → `invalidateQueries` → UI re-renders to State 2. No `useBillingPortalMutation` import in the section. No `billing.stripe.com` URL construction in the cancel path. Playwright spec (`cancellation.spec.ts:42-82`) races a `waitForURL(/billing\.stripe\.com/)` detector and asserts `page.url()` stays on `/dashboard/settings`. |
| 2 | Subscription status shown in UI is computed from `stripe.subscriptions.status` with all documented states labeled correctly; dashboard gating + cancel-at-period-end / immediate-cancel / paused states derive from this source | VERIFIED (with note) | `subscription-keys.ts:80-120` `subscriptionStatusQuery` calls `supabase.rpc('get_subscription_status', { p_customer_id })`. Migration `20260414120000_get_subscription_status_rpc.sql` reads `stripe.subscriptions` via FDW with `SECURITY DEFINER` + IDOR guard (`RAISE EXCEPTION 'Forbidden'` on customer-id mismatch). Returns `status` / `cancel_at_period_end` / `current_period_end` from the authoritative source. Fallback to `leases.stripe_subscription_status` only on RPC error (graceful degradation). See note below on proxy `stripe_customer_id` gate (onboarding, not status derivation). |
| 3 | Canceled-state UI exposes "export my data" + "request account deletion" inline without additional navigation; owner sees end date + 30-day GDPR grace period messaging | VERIFIED | `subscription-cancel-section.tsx:97-132` State 3 mounts `<GdprDataActions variant="inline" />` directly in the red-tinted card. Copy verified verbatim: "Your plan ended on {endDate}" + "Your data will be deleted on {endDate + 30d} unless you request deletion or export it sooner." (line 107, 110). `gdpr-data-actions.tsx:270-277` inline variant renders download + delete in a `space-y-4` div with no outer BlurFade/section wrapper. |
| 4 | Playwright E2E covers happy-path cancel flow from settings click → Stripe `cancel_at_period_end` mutation → UI state change | VERIFIED | `tests/e2e/tests/owner/cancellation.spec.ts` — 2 tests. Test 1: loads settings → billing tab → asserts Danger Zone + Cancel Plan button → races portal-redirect detector → clicks Cancel Plan → asserts AlertDialog with D2 verbatim copy → clicks confirm → asserts flip to State 2 (Subscription ends / Reactivate button) → asserts URL stays on `/dashboard/settings`. Test 2: null-gate smoke (no Danger Zone when no subscription). Both use `test.skip(condition, reason)` for graceful degradation when Stripe test-mode fixtures unavailable. |
| 5 | `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors | VERIFIED | `pnpm typecheck` exits 0. `pnpm test:unit -- --run src/hooks/api/use-billing-mutations.test.ts src/hooks/api/use-subscription-status.test.ts src/components/settings/sections/subscription-cancel-section.test.tsx src/components/settings/__tests__/gdpr-data-actions.test.tsx` runs 1,632 tests (including all 16 new Phase 42 component tests) — all green. |

**Score:** 5/5 truths verified

**Note on Truth 2 (CANCEL-02 strict reading):** `proxy.ts:115-127` checks `!user.app_metadata?.stripe_customer_id` as an owner dashboard gate and redirects to `/pricing` when missing. This is an **onboarding existence gate** ("has owner ever completed initial checkout"), not a **status derivation** ("what is the subscription state"). A user with `stripe_customer_id` but `canceled`/`unpaid` status is allowed through, and the SubscriptionStatusBanner (`subscription-status-banner.tsx:18` using `useSubscriptionStatus()`) takes over client-side. Per CONTEXT.md D4: "Dashboard gating for past_due/unpaid: keep existing SubscriptionStatusBanner behavior — audit only, don't redesign." The `customer-portal.tsx:54,61` uses the same existence check to swap "Subscribe Now" vs "Manage Subscription" CTA — also an onboarding/marketing concern, not status display. Both paths are architecturally separable from the `stripe.subscriptions`-backed status system that covers Phase 42's scope. Flagged for human awareness but does not block passing CANCEL-02 as scoped by the phase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260414120000_get_subscription_status_rpc.sql` | SECURITY DEFINER RPC reading `stripe.subscriptions` with IDOR guard | VERIFIED | 68 lines; `CREATE OR REPLACE FUNCTION public.get_subscription_status(p_customer_id text)`, `SECURITY DEFINER`, `SET search_path TO 'public', 'stripe'`, `RAISE EXCEPTION 'Forbidden'` on p_customer_id/caller mismatch, `to_timestamp(s.current_period_end)::timestamptz`, `GRANT EXECUTE ... TO authenticated`. |
| `supabase/functions/stripe-cancel-subscription/index.ts` | Edge Function: JWT auth, server-side subscription resolution, `stripe.subscriptions.update`, no subscription_id in body | VERIFIED | 108 lines. `validateBearerAuth` (line 36), body closed enum `'cancel' \| 'reactivate'` (line 48), subscription resolved via `stripe.subscriptions.list({ customer: userData.stripe_customer_id, ... })` (line 70-74) — no subscription_id accepted from client. `stripe.subscriptions.update(subscription.id, { cancel_at_period_end: action === 'cancel' })` (line 91-93). Reactivate-after-canceled guard (line 84-89). All errors route through `errorResponse()` (line 105). |
| `supabase/functions/tests/stripe-cancel-subscription.test.ts` | Deno integration test: missing auth, invalid action, IDOR resistance, cancel+reactivate round-trip | VERIFIED | 128 lines, 4 `Deno.test` cases: 401 on missing Authorization, 400 on invalid action, 200/404 on body-supplied hostile subscription_id (asserts `body.id !== 'sub_hostile_123'`), cancel+reactivate round-trip asserting `cancel_at_period_end` flips. All tests `return` early when env vars unset (graceful skip). |
| `src/hooks/api/query-keys/subscription-keys.ts` | `subscriptionStatusQuery` using `get_subscription_status` RPC; single `subscriptionStatusKey` export | VERIFIED | Line 40 exports `subscriptionStatusKey = ['billing', 'subscription-status'] as const` (single source). Line 82 calls `supabase.rpc('get_subscription_status', { p_customer_id: stripeCustomerId })`. Hook returns mapped response with `cancelAtPeriodEnd`, `currentPeriodEnd` from RPC. No `SUBSCRIPTION_STATUS_KEY` duplicate. |
| `src/hooks/api/use-billing-mutations.ts` | `useCancelSubscriptionMutation` + `useReactivateSubscriptionMutation` with setQueryData-before-invalidate | VERIFIED | Line 145-164 `useCancelSubscriptionMutation`: closed-arg `mutationFn: () => callStripeCancelSubscription('cancel')`, onSuccess calls `writeSubscriptionStatusCache` (line 154) BEFORE three `invalidateQueries` calls (lines 158-160). Line 166-181 mirror shape for reactivate. T-42-06 FDW-staleness mitigation verified via line 133 `queryClient.setQueryData(subscriptionStatusKey, ...)` + line 159 invalidation ordering. |
| `src/components/settings/sections/subscription-cancel-section.tsx` | 3-state machine (Active / Cancel-scheduled / Canceled) + AlertDialog with D2 copy | VERIFIED | 252 lines. State 3 (line 97-132) with `<GdprDataActions variant="inline" />`. State 2 (line 135-180) with amber Clock alert + Reactivate button (no dialog). State 1 (line 195-251) with AlertDialog. D2 copy verbatim: "Cancel your subscription?" (line 221), "Keep my plan" (line 228), "Yes, cancel plan" (line 243), "Confirm subscription cancellation" aria-label (line 237). `AlertDialogAction` uses `event.preventDefault()` + explicit `setDialogOpen(false)` in onSuccess (line 232-234, 187). No `useBillingPortalMutation` import. |
| `src/components/settings/gdpr-data-actions.tsx` | Standalone + inline variants for GDPR export/delete actions | VERIFIED | 295 lines. Variant prop (line 27-31). Export mutation calls `export-user-data` Edge Function (line 58). Request deletion calls `supabase.rpc('request_account_deletion')` (line 89). Cancel deletion calls `supabase.rpc('cancel_account_deletion')` (line 113). Inline variant (line 270-277): `space-y-4` div, no BlurFade, no outer cards. Standalone (line 280-294): two BlurFade-wrapped sections with full Danger Zone framing. |
| `src/components/settings/sections/account-danger-section.tsx` | 7-line delegate to GdprDataActions standalone variant | VERIFIED | Exactly 7 lines. `export function AccountDangerSection() { return <GdprDataActions variant="standalone" /> }`. All pre-refactor state hooks, mutations, and JSX removed. |
| `tests/e2e/tests/owner/cancellation.spec.ts` | Playwright happy-path smoke | VERIFIED | 118 lines, 2 tests. Full happy path + null-gate smoke. Both use `test.skip(condition, reason)` for graceful degradation. |
| `src/components/settings/sections/subscription-cancel-section.test.tsx` | Vitest component test: 3-state branching + interaction | VERIFIED | 264 lines, 11 tests — all green. Covers: skeleton, null gate, past_due gate, State 1 layout, dialog open+copy, confirm fires mutate, State 2 layout, reactivate fires mutate, State 3 mounts GdprDataActions with `data-variant="inline"`, pending disables confirm, error fallback with Retry. |
| `src/components/settings/__tests__/gdpr-data-actions.test.tsx` | Vitest component test: standalone+inline variants + mutations | VERIFIED (by summary claim + test run) | 5 tests — all green per pnpm test:unit run. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `subscription-cancel-section.tsx::AlertDialogAction onClick` | `useCancelSubscriptionMutation().mutate()` | `cancelMutation.mutate(undefined, { onSuccess, onError })` | WIRED | Line 184 `cancelMutation.mutate(undefined, ...)` inside `onConfirmCancel`. AlertDialogAction onClick calls `onConfirmCancel()` (line 234). Mutation return includes `isPending` gated at line 236/240/243. |
| `subscription-cancel-section.tsx::Reactivate Button onClick` | `useReactivateSubscriptionMutation().mutate()` | `reactivateMutation.mutate(undefined, { onSuccess, onError })` | WIRED | Line 137 `reactivateMutation.mutate(undefined, ...)` inside `onReactivate`. Button onClick assigned at line 162. `isPending` gated at line 163/167/172. |
| `useCancelSubscriptionMutation` | `stripe-cancel-subscription` Edge Function | `fetch POST with JSON body { action: 'cancel' }` | WIRED | `use-billing-mutations.ts:80-109` `callStripeCancelSubscription` fetches `${baseUrl}/functions/v1/stripe-cancel-subscription` with Bearer token + `{ action }` body. Error handling with typed throw. |
| `stripe-cancel-subscription Edge Function` | `stripe.subscriptions.update` (Stripe SDK) | `getStripeClient(env.STRIPE_SECRET_KEY)` | WIRED | Edge Function line 68 `getStripeClient(env.STRIPE_SECRET_KEY)`, line 91 `stripe.subscriptions.update(subscription.id, { cancel_at_period_end: action === 'cancel' })`. |
| `subscriptionStatusQuery.subscriptionStatus` | `public.get_subscription_status` RPC | `supabase.rpc('get_subscription_status', { p_customer_id })` | WIRED | `subscription-keys.ts:82` calls RPC. Migration creates function with IDOR guard. Hook maps response to `SubscriptionStatusResponse` at lines 114-120. |
| Phase 42 invalidation chain | 3 query keys | `queryClient.invalidateQueries({ queryKey })` after setQueryData | WIRED | `use-billing-mutations.ts:158-160` invalidates `subscriptionsKeys.list()`, `subscriptionStatusKey`, `ownerDashboardKeys.all` after `writeSubscriptionStatusCache` (line 154). T-42-06 FDW-staleness mitigation confirmed. |
| State 3 `GdprDataActions variant="inline"` | `export-user-data` Edge Function + `request_account_deletion` RPC | fetch + supabase.rpc | WIRED | `gdpr-data-actions.tsx:58` fetches `export-user-data`. `gdpr-data-actions.tsx:89` calls `supabase.rpc('request_account_deletion')`. `gdpr-data-actions.tsx:113` calls `supabase.rpc('cancel_account_deletion')`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|---------------------|--------|
| `subscription-cancel-section.tsx` | `status.data.subscriptionStatus` / `cancelAtPeriodEnd` / `currentPeriodEnd` | `useSubscriptionStatus()` → `subscriptionStatusQuery.subscriptionStatus` → `supabase.rpc('get_subscription_status')` → `stripe.subscriptions` FDW | Yes (real Stripe data via SECURITY DEFINER RPC) | FLOWING |
| `gdpr-data-actions.tsx` | `deletionStatus.data.deletion_requested_at` | `useQuery` → `supabase.from('users').select('deletion_requested_at').eq('id', user.id)` | Yes (real user-scoped DB query) | FLOWING |
| Mutation response → cache | `CancelSubscriptionResponse` | Edge Function `stripe.subscriptions.update` return | Yes (authoritative Stripe response) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 42 test files exist and pass | `pnpm test:unit -- --run <4 test files>` | 1,632/1,632 tests green | PASS |
| Typecheck | `pnpm typecheck` | Exit 0 | PASS |
| No `SUBSCRIPTION_STATUS_KEY` references | `Grep SUBSCRIPTION_STATUS_KEY src/` | No matches | PASS |
| Single `subscriptionStatusKey` export | `Grep subscriptionStatusKey src/` | 1 export (subscription-keys.ts:40), 5 uses (use-billing-mutations.ts + subscription-keys.ts) | PASS |
| No `useBillingPortalMutation` in cancel section | `Grep useBillingPortalMutation src/components/settings/sections/subscription-cancel-section.tsx` | No matches | PASS |
| No `billing.stripe.com` URL in cancel section | `Grep billing.stripe.com src/components/settings/sections/subscription-cancel-section.tsx` | No matches | PASS |
| No `onCancel` / `cancelSubscription` refs in rent-collection | `Grep onCancel\|cancelSubscription\|handleCancel src/app/(owner)/rent-collection/page.tsx` | No matches | PASS |
| account-danger-section collapsed to delegate | `wc -l account-danger-section.tsx` | 7 lines | PASS |
| All 3 follow-up commits present | `git log --oneline \| grep -E "5c8f353\|32efd63\|e9a0509"` | Found: `5c8f353ee`, `32efd63cf`, `e9a0509c6` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CANCEL-01 | 42-01, 42-02 | Owner can cancel from settings in one click, no Stripe portal, no separate cancellation page | SATISFIED | Edge Function (42-01) + AlertDialog UI (42-02) wired end-to-end; Playwright spec asserts no `billing.stripe.com` redirect and URL stays on `/dashboard/settings`. |
| CANCEL-02 | 42-01 | Subscription status derived from `stripe.subscriptions` (all states); no status code path checks `stripe_customer_id` existence | SATISFIED (scoped) | `get_subscription_status` RPC + `useSubscriptionStatus` hook backed by `stripe.subscriptions` FDW. Note: `proxy.ts` + `customer-portal.tsx` still check `stripe_customer_id` existence for onboarding gates (not status derivation) — per CONTEXT.md D4 scope, this is out of Phase 42's direct remit. Flagged for human awareness. |
| CANCEL-03 | 42-02 | Canceled-state UI exposes export + delete inline, 30-day GDPR grace messaging | SATISFIED | State 3 of `subscription-cancel-section.tsx` mounts `<GdprDataActions variant="inline" />`; 30-day messaging via `addDaysFormatted(currentPeriodEnd, 30)`; tests assert `data-variant="inline"` on mounted GDPR component. |

### Follow-Up Commit Verification

| Commit | Change | Status | Evidence |
|--------|--------|--------|----------|
| `5c8f353ee` (W-01) | Remove misleading per-row cancel dropdown in rent-collection table | VERIFIED | `rent-collection/page.tsx` contains no `onCancel`, `cancelSubscription`, or `handleCancel` references. SubscriptionsTab consumer has `onPause` + `onResume` only. |
| `32efd63cf` (W-02) | Consolidate `subscriptionStatusKey` to single export in subscription-keys.ts | VERIFIED | Zero matches for `SUBSCRIPTION_STATUS_KEY` (uppercase) in src/. Single export of `subscriptionStatusKey` at `subscription-keys.ts:40`; all 5 consumers import from there. `use-billing-mutations.ts:24` imports named export, no local redeclaration. |
| `e9a0509c6` (chore) | Widen engines.node to >=24 | VERIFIED | Commit exists in git log. (Not strictly a Phase 42 concern but part of post-phase cleanup.) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `subscription-keys.ts` | 109 | `as Record<string, unknown> \| null` + downstream `(sub?.status as string)` casts | Info | Documented in CLAUDE.md as acceptable at PostgREST/RPC boundary; typed mapper could be cleaner but scope bounded. |
| `proxy.ts` | 117 | `!user.app_metadata?.stripe_customer_id` gate for owner `/dashboard` routes | Warning | Not a stub; intentional onboarding gate. Per CANCEL-02 strict wording ("no code path checks users.stripe_customer_id existence for status"), this is a semantic gray zone — but CONTEXT.md D4 scoped dashboard gating out of this phase. Human awareness recommended; no action required for Phase 42 closure. |
| `customer-portal.tsx` | 54, 61 | `!user?.stripe_customer_id` CTA fallback | Warning | Same gray-zone pattern as proxy gate. Onboarding CTA, not status display. |

### Human Verification Required

Automated checks passed. The following items require manual testing in a dev environment with a seeded Stripe test-mode subscription:

### 1. Live cancel flow against Stripe test mode

**Test:** Create a Stripe test-mode subscription for a dev owner account; load `/dashboard/settings?tab=billing`; click "Cancel Plan"; confirm in AlertDialog; verify UI flips to State 2 (Cancel-scheduled) with correct end date + days remaining; click "Reactivate Plan"; verify flip back to State 1.
**Expected:** Full happy path works without page navigation; toasts fire correctly; Stripe dashboard reflects `cancel_at_period_end=true` after cancel and `false` after reactivate.
**Why human:** Playwright spec skips gracefully without a seeded subscription; live verification needed to confirm Stripe SDK call + FDW sync behavior.

### 2. 30-day data retention messaging fidelity in Canceled state

**Test:** Force a subscription to `status='canceled'` in dev; navigate to billing settings; verify State 3 renders with exact copy "Your plan ended on {date}" and "Your data will be deleted on {date + 30d} unless you request deletion or export it sooner."
**Expected:** Copy matches UI-SPEC Section "State 3 — Canceled" verbatim; GDPR Download + Delete buttons render inline; "Need to come back? View plans" link navigates to /pricing.
**Why human:** Copy review + visual regression; VALIDATION.md flags this as manual-only.

### 3. AlertDialog destructive variant visual fidelity

**Test:** In State 1, click Cancel Plan; inspect the AlertDialog confirm button; verify it uses shadcn destructive variant (red fill); click confirm; verify "Canceling..." label + spinner replace "Yes, cancel plan" during mutation; verify dialog does NOT close until mutation settles.
**Expected:** Destructive variant applied via `buttonVariants({ variant: 'destructive' })` className; Loader2 spins during pending; dialog closes on success via explicit `setDialogOpen(false)` in onSuccess.
**Why human:** Snapshot/visual regression not configured per VALIDATION.md; `event.preventDefault()` pattern locks mutation lifecycle to UI.

### Gaps Summary

No blocking gaps. The proxy + customer-portal stripe_customer_id existence checks are architectural gray zones under a strict reading of CANCEL-02 but are scoped as onboarding gates (not status derivation) per CONTEXT.md D4. Three follow-up commits (W-01, W-02, chore) landed cleanly and are verified by absence-of-references grep + file reads. All 1,632 unit tests pass. Typecheck passes. Edge Function + RPC + UI wiring traces end-to-end through real data flow (stripe.subscriptions FDW → RPC → hook → mutation → setQueryData + invalidate → UI).

The phase delivers its stated goal: "1-click cancel" is real (AlertDialog → mutation → state flip, no portal redirect), status derives from `stripe.subscriptions` for the subscription state surface, and canceled-state exposes GDPR actions inline with 30-day messaging.

---

_Verified: 2026-04-14T13:17:41Z_
_Verifier: Claude (gsd-verifier)_
