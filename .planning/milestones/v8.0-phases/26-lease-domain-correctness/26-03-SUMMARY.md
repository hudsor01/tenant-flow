---
phase: 26-lease-domain-correctness
plan: 03
subsystem: ui
tags: [leases, lease-form, status-select, pending_signature, expired, tanstack-form]

# Dependency graph
requires:
  - phase: 26-lease-domain-correctness
    provides: "plan 26-06 server term-lock + plan 26-07 UI edit-gate keep a pending_signature lease out of the term-editing path; this plan makes its Status still render correctly when edited"
provides:
  - "edit-form STATUS_OPTIONS now offers every real, non-sentinel lease_status: draft, pending_signature, active, expired, ended, terminated"
  - "a pending_signature lease no longer renders a blank Status trigger and is no longer silently dropped from that state on save"
affects: [lease edit form, LEASE-04 UI gate (26-07)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "STATUS_OPTIONS kept a strict subset of the live leases_lease_status_check allowed set, excluding the inactive soft-delete sentinel"

key-files:
  created: []
  modified:
    - src/components/leases/lease-form-financial-fields.tsx
    - src/components/leases/__tests__/lease-form.test.tsx

key-decisions:
  - "Added BOTH pending_signature (Pending) and expired (Expired) — not just pending_signature — because a lease genuinely reaches expired via the active expire-leases pg_cron job (verified live: job active, sets active→expired past end_date)"
  - "Did NOT add inactive (soft-delete sentinel, written only by the delete mutation) even though the DB CHECK now allows it"
  - "Placed pending_signature between draft and active, and expired between active and ended, matching lifecycle order"

requirements-completed: [LEASE-05]

# Metrics
duration: ~15min
completed: 2026-07-04
---

# Phase 26 Plan 03: LEASE-05 Complete Lease Status Select

**Editing a lease in pending_signature (or expired) now renders a populated Status trigger instead of a blank one, and a no-op save preserves the status instead of silently knocking the lease out of it.**

## Accomplishments

- Widened `STATUS_OPTIONS` in `lease-form-financial-fields.tsx` from `draft/active/ended/terminated` to `draft/pending_signature/active/expired/ended/terminated`.
- Extended `lease-form.test.tsx`: a `pending_signature` lease renders a non-blank "Pending" Status trigger, and a no-op Save Changes submits `lease_status: "pending_signature"` (mutation payload asserted).

## Task Commits

1. **Task 1: Add pending_signature (and expired) to the lease status select options** — `eb02e07fd` (fix)

## Live DB verification (per plan)

`pg_get_constraintdef` on `leases_lease_status_check` allows:
`draft, pending_signature, active, ended, terminated, expired, inactive`.

- Added values (`pending_signature`, `expired`) are a strict subset of that set. ✔
- `inactive` intentionally excluded (soft-delete sentinel). ✔
- The `expire-leases` pg_cron job (`cron.job`, active, `0 23 * * *`, `select public.expire_leases()`) sets `active` leases past `end_date` to `lease_status = 'expired'` — so a lease genuinely reaches `expired` and must be editable from it.

## Deviation from plan text (intentional, per task directive)

The 26-03 plan's `<interfaces>` note claimed "There is NO 'expired' lease_status value … 'expired' appears only as an aggregation OUTPUT key". That is **stale**: the live constraint permits `expired` AND the active `expire_leases()` cron writes it to rows. The task directive explicitly said to add `expired` "if a lease can be in it" — it can — so both `pending_signature` and `expired` were added. `inactive`/aggregation-only keys were still excluded exactly as the plan intended.

## Quality gates

- `bun run test:unit -- src/components/leases/__tests__/lease-form.test.tsx` — 21/21 pass (2 new).
- Full pre-commit gate (lint + typecheck + unit + coverage) ran on the commit and passed.

## Files

- `src/components/leases/lease-form-financial-fields.tsx` — `STATUS_OPTIONS` widened to the six real, non-sentinel statuses.
- `src/components/leases/__tests__/lease-form.test.tsx` — added a correct mock of `#hooks/api/use-lease-mutations` (the module the form actually imports; the file's existing `#hooks/api/use-lease` mock is stale/dead) plus two Edit-Mode tests (non-blank Pending render + no-op-save status preservation).

## Self-Check: PASSED
- `STATUS_OPTIONS` contains `pending_signature` and `expired`; contains no `inactive`.
- Added values confirmed present in the live `leases_lease_status_check`.
- `lease-form.test.tsx` passes (21/21).

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-04*
