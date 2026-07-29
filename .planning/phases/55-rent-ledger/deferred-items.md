# Phase 55 — Deferred Items

Out-of-scope discoveries logged during execution. Not fixed in the plan that
found them (per the executor scope boundary).

---

## D1 — The append-only guard trigger also blocks `ON DELETE CASCADE` — ✅ RESOLVED

**Status:** RESOLVED in 55-04 by `supabase/migrations/20260725131659_rent_ledger_cascade_delete_guard.sql`
(applied to prod, prod version `20260725131659`).

**Confirmed live before fixing:** inserting one charge against a real lease and then
deleting that lease failed with `sqlstate=0A000`
("rent ledger is append-only ... (row ...)") — exactly as predicted below.

**Fix shipped:** `rent_ledger_append_only()` now discriminates by `pg_trigger_depth()`.
UPDATE is still refused for every writer; a *direct* DELETE is still refused; a DELETE
arriving from a parent FK cascade (`pg_trigger_depth() > 1`) is permitted. This preserves
LEDGER-06 (corrections are reversal inserts, never edits or quiet removals) while letting
whole-entity deletion work as the FKs declare — ledger rows cannot outlive their parent
anyway, since the FK forbids orphans.

**Verified live after fixing:** `update = blocked 0A000 | direct delete = blocked 0A000 |
cascade delete = allowed`. Both the before and after probes ran inside deliberately-aborted
transactions, so prod data was never mutated.

**Found during:** 55-03 Task 3 (authoring the RLS integration scaffolds)
**Owning artifact:** `supabase/migrations/20260725020925_rent_ledger_schema.sql` (55-01)
**Resolved in:** 55-04 (the apply + live-behavior gate)

<details>
<summary>Original report (kept for context)</summary>

`rent_ledger_append_only()` is a `BEFORE UPDATE OR DELETE ... FOR EACH ROW`
trigger that raises `0A000` unconditionally, for every writer. Both ledger
tables reference their parents with `ON DELETE CASCADE`:

- `rent_charges.lease_id  -> leases(id)  on delete cascade`
- `rent_charges.owner_user_id -> users(id) on delete cascade`
- `rent_receipts.charge_id / lease_id / owner_user_id` — same

A cascade issues a real `DELETE` against the referencing table, which fires the
row trigger. So once a lease has ledger rows, **deleting that lease (or its
unit / property / owner) raises and aborts** rather than cascading.

Consequences to confirm against prod in 55-04:

1. Lease deletion from the app fails for any lease with ledger history.
2. Account-deletion / GDPR paths that remove `public.users` rows (rather than
   anonymizing in place) would abort. TenantFlow anonymizes rather than deletes
   (`anonymize_deleted_user`), so this may be moot — verify.
3. RLS integration teardown cannot sweep ledger rows or their fixture leases.
   The 55-03 suites already account for this: every assertion is scoped to the
   ids the run created, and teardown is best-effort.

Not fixed here: 55-03 is a TypeScript + tests plan (no database changes), and
relaxing the guard is a schema decision (e.g. allow DELETE when the parent row
is itself being deleted, or drop the cascade in favour of a restrict + explicit
archival). Surface to the user in 55-04 before changing the immutability
guarantee — it is the load-bearing LEDGER-06 control.

---

## D2 — Concurrent edits to `tests/**`, `package.json`, `biome.json` — ✅ RESOLVED (correctly attributed)

**Found during:** 55-05 (both tasks)
**Owning artifact:** Phase 55 hygiene sweep — the orchestrator, not a separate workstream
**Status:** RESOLVED. These edits were made deliberately by the orchestrator in parallel with
55-05, under an explicit "fix everything no matter severity" directive, and are committed
separately from the 55-05 plan commits.

55-05's executor was right to leave them unstaged (they are outside its plan scope) and right
to record them. The only correction to the note below is attribution: this is Phase 55 work,
not an unrelated workstream. Rationale for each change:

- **`tests/integration/tsconfig.json`** was dead — it declared `moduleResolution: "node"`
  (node10), which hard-errors on this TypeScript version, and declared no `types`. So the RLS
  suites were **never type-checked at all**; that is the true source of the recurring
  "Cannot find name 'expect'/'describe'/'process'" diagnostics. It now extends the root config.
- **`package.json` `typecheck`** was widened because both `tests/integration` and `tests/e2e`
  had their own tsconfigs that nothing ever ran. Wiring them in is exactly what stops this
  rotting again — and the executor's observation that `tests/**` errors now block commits is
  the intended effect, not a side effect.
- Enabling those two projects surfaced **43 previously-invisible type errors** (13 integration,
  30 e2e), all fixed — including a genuine bug: a Playwright smoke test passed
  `{ timeout: 120_000 }` as `TestDetails`, where Playwright silently ignores it, so a test
  documented as needing 120s was still running on the default 30s budget.
- **`biome.json`** — `linter.rules.recommended: false` is deprecated in Biome 2.5 and printed a
  DEPRECATED warning on every lint and every commit; migrated to `preset: "none"` via the
  official `biome migrate`.

Original note follows.

While 55-05 was executing, the working tree acquired unstaged modifications that
this plan did not make and did not commit:

- `package.json` — `typecheck` widened from `tsc --noEmit` to also run
  `tests/integration/tsconfig.json` and `tests/e2e/tsconfig.json`
- `biome.json` — `linter.rules.recommended: false` replaced with `preset: "none"`
- `tests/integration/tsconfig.json` — now extends the root tsconfig
- ~15 files under `tests/integration/` and `tests/e2e/` — `noUnusedLocals` and
  `exactOptionalPropertyTypes` fixes, including
  `tests/integration/rls/rent-ledger-append-only.test.ts` (a 55-03 artifact)

None of these are 55-05's scope, so per the executor scope boundary they were
left unstaged and uncommitted; every 55-05 commit staged its files individually.
One consequence worth recording: the widened `typecheck` script is what the
lefthook pre-commit gate now runs, so `tests/**` type errors from that
workstream will block unrelated commits. A first attempt at the Task 2 commit
did fail its `lint` step mid-edit of `biome.json` and succeeded on retry once
that file settled — a race, not a defect in the committed code.

---

## D3 — The dashboard KPI bento still labels its lease-derived tile "Revenue"

**Found during:** 55-08 Task 2 (Scheduled vs Collected relabel)
**Owning artifact:** `src/components/dashboard/components/kpi-bento-row.tsx` (`buildKpiTileConfigs`, the `revenue` tile)
**Status:** DEFERRED — deliberately NOT changed in 55-08

55-UI-SPEC § Surface Layouts 6 names "dashboard revenue figures" alongside the
financial overview as D-07 relabel sites. 55-08 relabeled the financial-overview
card ("Total Revenue" -> "Scheduled" + a sibling "Collected") but left the
dashboard bento's `Revenue / This month` tile alone. Two reasons, in order:

1. **Different scheduled basis.** The bento tile renders
   `stats.revenue.monthly` from `get_dashboard_stats` (active-lease MRR,
   point-in-time). The collection-rate KPI mounted beside it derives its
   `scheduled` from `rent_charges` rows for the current month. Those two numbers
   legitimately differ for any owner who has not started tracking every lease.
   Printing the word "Scheduled" on both would assert an equivalence that does
   not hold, which is a worse honesty failure than the generic label.
2. **Blast radius outside the plan.** The label is asserted in
   `src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx` and in
   `tests/e2e/tests/owner/dashboard-smoke.e2e.spec.ts`
   (`readKpiTileNumber(page, "Revenue")`), the latter feeding the required
   `e2e-smoke` CI gate. 55-08's plan scopes Task 2 to
   `financial-overview-stats.tsx`.

No double-count exists today: nothing on the dashboard sums the bento tile with
any ledger figure, and the collection-rate KPI is a ratio, so D-07's hard rule
holds. The remaining work is a labeling nicety that should be done together with
either (a) re-basing the bento revenue tile on ledger `scheduled`, or (b)
adding an explicit period/basis sublabel to both tiles — plus the two test
updates. Worth a follow-up plan, not an in-flight deviation.

---

## D4 — Every app form with a form-level `onBlur` schema can swallow its own submit click

**Found during:** 55-06 Task 1 (record-receipt dialog)
**Owning artifact:** `src/components/leases/lease-form-options.ts` and any other form
using `validators: { onBlur: schema, onSubmit: schema }` with a `canSubmit`-disabled
submit button
**Status:** ✅ RESOLVED — swept codebase-wide by the orchestrator after 55-06.

The mechanism was verified directly against the installed `@tanstack/form-core`
(`FormApi.js`) rather than taken on report — `handleSubmit` really does contain

```js
if (!this.state.canSubmit && !this._devtoolsSubmissionOverride) {
  this.options.onSubmitInvalid?.({ ... });
  return;                                 // early return on a STALE flag
}
...
await this.validateAllFields("submit");   // revalidation only happens after
```

so a stale `canSubmit` short-circuits submission before anything revalidates.

**Swept:** every form-level `onBlur` validator in `src/` is gone (grep now returns 0):

- `src/components/leases/lease-form-options.ts` — `{onBlur, onSubmit}` → `{onChange}`
- `src/components/properties/property-form-options.ts` — same
- the four `documents/templates/components/*-template.client.tsx` — `onBlur` → `onChange`

The two form-options files were the ones that actually bit: both pair the schema with
Select/date fields whose values are set programmatically (no blur fires), and
`lease-form.tsx` gates its button on `isSubmitting`, so the click reached
`handleSubmit` and was silently swallowed — "the button does nothing". The four
template clients were not reachable today (no `canSubmit` gating, no programmatic
setters, all plain text inputs) but were converted anyway so that adding a Select
later cannot silently re-arm the bug.

**Deliberately NOT changed:** `src/lib/forms/form-components/submit-button.tsx` still
gates on `canSubmit`. It is correct on its own — the deadlock needs a form-level
`onBlur` partner, and none remain — and its contract is covered by a passing test
("disables the submit button while the form cannot submit"). Changing it would break a
documented, tested behaviour for no gain, so the interaction is documented in its
docblock instead.

Verified: lease + property suites 349 tests / 32 files green.

<details>
<summary>Original report (kept for context)</summary>

**Status when found:** DEFERRED — fixed inside the three 55-06 dialogs only

Two TanStack Form behaviours combine into a silent dead button, both reproduced and
fixed locally in 55-06 (see the SUMMARY deviations):

1. A FORM-level `onBlur` validator validates the WHOLE form on every blur, so
   `canSubmit` goes false while the user is still filling fields. A submit button
   gated on `!canSubmit` therefore disables itself on the very blur that the submit
   click causes, and the click never lands.
2. `FormApi._handleSubmit` early-returns on a stale `canSubmit` BEFORE it revalidates.
   So any value set programmatically (a chip, a calendar popover, a Select) leaves the
   flag stale and the form refuses to submit even though it is now valid.

Registering the same schema under both `onBlur`/`onChange` AND `onSubmit` also writes
the same message under two `errorMap` keys, and `FieldError` renders a `<ul>` with the
identical message twice.

55-06 fixed all three inside its own dialogs (single `onChange` validator; submit gated
only on `isSubmitting`). The same shapes exist elsewhere — `lease-form-options.ts` uses
`onBlur` + `onSubmit` with the same schema, and several forms gate the submit button on
`canSubmit`. Out of scope for a dialogs plan; worth a focused sweep since the symptom is
"the button does nothing" rather than a visible error.

</details>
