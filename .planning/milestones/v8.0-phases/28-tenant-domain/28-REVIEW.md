# Phase 28 — Perfect-PR Review Log

**Gate:** two consecutive zero-finding review cycles. **Result: MET** (cycles 3 + 4).
**Method:** a Workflow fanned out 5 requirement dimensions (mapper/TEN-04, delete/TEN-01, viewstatus/TEN-02+03, validator/TEN-05, optimistic/TEN-06), each *reviewed* then independently *adversarially verified* against the source. Reviewed 2026-07-08. 4 cycles total.

## Why this phase was near-clean (1 review finding)
The plan-check caught two real issues BEFORE execution (a TS closure-narrowing error and a broken a11y test from removing the status dropdown), so execution shipped mostly correct. Review cycle 1 was fully clean, but cycle 2's independent adversarial sweep caught one LOW that cycle 1 missed — validating the two-*consecutive*-cycle discipline.

## Review finding (cycle 2, fixed)
- **LOW** — `handleBulkDelete` called `clearSelection()` synchronously when *opening* the confirm dialog, so selecting rows → Delete Selected → **Cancel** wiped the selection with nothing deleted. Fixed: `clearSelection` is threaded as an `onConfirmed` callback (stored in a `bulkClearRef`), invoked only in `confirmBulkDelete` after the deletes fire; the cancel path nulls the ref. Cycles 3 + 4 then verified clean.

## Plan-check findings (fixed pre-execution)
- **BLOCKER** — removing the status `<select>` (TEN-03) would break `tenant-grid.a11y.test.tsx`'s combobox assertion, and the test file wasn't in 28-05's scope → the 28-06 gate couldn't pass. Fixed: added the test to scope + updated it to assert the read-only badge's accessible name (badge given an `aria-label`).
- **WARNING** — 28-05's plan text claimed `tenant.leaseId` would narrow into the `onClick` closure (TS does not) → extract `const leaseId` first.

## Requirements delivered (all verified clean)
- **TEN-04** — `mapTenantRow` selects the current lease via `pickCurrentLeaseTenant` (active > is_primary > latest start_date, null-lease-filtered, NaN-safe tie-break). Also fixed a latent bug the old `find(is_primary) ?? [0]` had (a null-lease first row could hide a real active lease). currentLease/leaseStatus/unit/property all derive from the one chosen lease.
- **TEN-01** — delete wired to the existing `useDeleteTenantMutation` from row/grid/bulk behind destructive confirm dialogs; the Phase-26 active-lease guard surfaces via toast, not swallowed.
- **TEN-02** — View button passes `tenant.leaseId` (never `tenant.id`), via an extracted local so TS narrows it; routes to the ACTIVE lease.
- **TEN-03** — log-only status dropdowns removed → shared read-only badge with a preserved accessible name; dead `StatusSelectCell`/`StatusDropdown` deleted, no dangling imports.
- **TEN-05** — emergency-contact validator empty-safe (`z.union([z.literal(''), phoneSchema])`) so cleared/name-only edits submit while a malformed non-empty phone still fails; persists empty per nullable columns.
- **TEN-06** — dropped the wrong-key/wrong-shape moved-out list optimistic; kept the correct detail/withLease optimism; relies on the (prefix-matching) invalidate. Regression test seeds the real `['tenants','list',{}]` key and asserts it stays a `PaginatedResponse`.

## Final state
- **0 migrations** (frontend + mapper only). typecheck 0, lint 0, full unit suite green (new regression + validator + a11y tests added).
- No Phase-25/26/27 regressions (dollars model, soft-delete filters, `lease_tenants` reads all intact — independently swept).
