---
phase: 26-lease-domain-correctness
plan: 02
subsystem: ui
tags: [leases, renew, rent-adjustment, term-lock, tanstack-query, mutation]

# Dependency graph
requires:
  - phase: 26-lease-domain-correctness
    provides: "plan 26-06 server BEFORE UPDATE trigger rejects rent changes on signed/pending leases — this plan's UI mirrors that lock so no rejected write is ever attempted"
provides:
  - "renew mutationFn accepts + persists an optional whole-dollar rent_amount (positive-finite guarded)"
  - "renew dialog sends the adjusted rent on unsigned leases, omits it when the toggle is off"
  - "shared isLeaseTermsLocked() helper (reused by 26-07) that disables rent adjustment on signed/pending leases while still allowing end_date extension"
affects: [LEASE-04 UI gate (26-07 reuses isLeaseTermsLocked), lease renew flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared term-lock predicate isLeaseTermsLocked(lease) mirroring the 26-06 server condition, imported by both the renew dialog (26-02) and the edit gate (26-07)"
    - "Conditional payload spread guarded on a positive-finite value so an absent/zero/NaN rent never clobbers stored rent"

key-files:
  created:
    - src/components/leases/lease-terms-lock.ts
    - src/components/leases/dialogs/__tests__/renew-lease-dialog.test.tsx
  modified:
    - src/hooks/api/query-keys/lease-mutation-options.ts
    - src/components/leases/dialogs/renew-lease-dialog.tsx
    - src/components/leases/dialogs/renew-lease-form-fields.tsx

key-decisions:
  - "rent_amount stays a whole-dollar integer end-to-end — no cents conversion (leases.rent_amount is an integer column)"
  - "termsLocked = lease_status === 'pending_signature' || tenant_signed_at != null, extracted to isLeaseTermsLocked() for reuse by 26-07"
  - "On a locked lease the RentAdjustment renders a disabled toggle (aria-label) + info note; showRentIncrease is forced false and rent_amount is never sent, but end_date extension still submits"

requirements-completed: [LEASE-03]

# Metrics
duration: ~30min
completed: 2026-07-05
---

# Phase 26 Plan 02: LEASE-03 Renew Rent Adjustment (with signed-lease lock)

**Renewing an unsigned lease with a rent adjustment now actually persists the new rent (whole dollars); renewing without it leaves rent untouched; and on a signed / pending_signature lease the rent-adjustment control is disabled so the owner is never led into a server-rejected rent change while extending end_date still succeeds.**

## Accomplishments

- `leaseMutations.renew` mutationFn: widened `data` to `{ end_date; rent_amount? }`; conditionally spreads `rent_amount` into the PostgREST update only when it is a positive, finite number (absent/zero/NaN never clobbers stored rent). `.eq("id", id).select().single()` + `handlePostgrestError` unchanged.
- New `src/components/leases/lease-terms-lock.ts` — `isLeaseTermsLocked(lease)` predicate mirroring the 26-06 server lock; **shared** with 26-07 (single source of truth per the reconciliation directive).
- `renew-lease-dialog.tsx`: computes `termsLocked` via the helper; `handleSubmit` only includes `rent_amount` when `showRentIncrease && !termsLocked`; passes `disabled={termsLocked}` (and forces `showRentIncrease` false) to `RentAdjustment`.
- `renew-lease-form-fields.tsx`: `RentAdjustment` gained a `disabled` prop rendering a disabled toggle (accessible `aria-label`) + an info note that rent is locked but end_date can still be extended. No inline styles.

## Task Commits

1. **Task 1: Accept and persist an optional rent_amount in the renew mutation** — `7c8a073cc` (feat)
2. **Task 2: Send adjusted rent from the dialog when unsigned; lock it on signed leases** — `49d40011d` (feat)

## Tests (new)

`src/components/leases/dialogs/__tests__/renew-lease-dialog.test.tsx` (3 pass):
1. unsigned + toggle-on + amount entered → mutation payload contains the entered whole-dollar `rent_amount` (3000).
2. unsigned + toggle-off → payload has `end_date`, no `rent_amount`.
3. signed (`tenant_signed_at` set) → the rent toggle is disabled (accessible name "rent is locked…"), no rent input rendered, and the renew payload has `end_date` only (no `rent_amount`).

No `any` / `as unknown as`; disabled control has an `aria-label`; chai6-safe assertions.

## Reconciliation with 26-06 / 26-07

- **26-06 (server):** rejects any rent change on a signed/pending lease. This plan guarantees the UI never sends one, so the only writes that reach the trigger for a signed lease are `end_date`-only renews (allowed). No contradiction.
- **26-07 (UI edit gate):** imports the same `isLeaseTermsLocked` helper — one condition, two call sites.

## Quality gates

- `bun run test:unit -- …/renew-lease-dialog.test.tsx` — 3/3 pass.
- Both commits passed the full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit+coverage, commitlint).

## Deviations

- Extended `renew-lease-form-fields.tsx` (add `disabled` prop) beyond the plan's `files_modified` list — required to disable the control without inline styles, which the plan's Task 2 read_first explicitly anticipated.
- Added the shared `lease-terms-lock.ts` helper (task directive: reconcile the `termsLocked` condition with 26-07 via a shared helper).
- Commit hygiene: `git commit -F -` with body lines wrapped ≤100 chars to satisfy `body-max-line-length`.

## Self-Check: PASSED
- renew mutationFn signature includes `rent_amount?: number`; update spreads it under a positive-finite guard.
- Dialog omits `rent_amount` on toggle-off and on signed leases; sends it on unsigned toggle-on.
- New test file exists and passes (3/3).

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-05*
