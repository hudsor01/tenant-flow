---
phase: 55-rent-ledger
plan: 07
subsystem: ui
tags: [ledger-tab, shadcn-table, derived-state, append-only, money-boundary, landlord-only]

# Dependency graph
requires:
  - phase: 55-rent-ledger (plan 05)
    provides: useLedgerSummary / useLedgerEntries / useReverseEntryMutation + LedgerEntryRow / LedgerSummary
  - phase: 55-rent-ledger (plan 06)
    provides: RecordReceiptDialog / AddLineDialog / TrackSinceDialog controlled props contract
  - phase: 55-rent-ledger (plan 03)
    provides: computeRunningBalance / deriveChargeState / GRACE_PERIOD_DAYS + the static money guard
provides:
  - src/components/ledger/ledger-tab.tsx - the per-lease ledger surface (derivation + composition + reverse)
  - src/components/ledger/ledger-balance-strip.tsx - Balance / Charged / Received from the SQL summary
  - src/components/ledger/ledger-table.tsx - the chronological table plus loading / error / no-ledger states
  - src/components/ledger/ledger-table-row.tsx - one derived row with its state badge and reverse affordance
  - Ledger tab mounted on /leases/[id]
affects: [phase-55 verification, future reporting hub]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derive once in the container, render in the leaves: the tab computes running balance, charge state and voided-ness, and the row components never recompute"
    - "A generic `<T extends LedgerEntry>` on the derivation keeps the caller's richer row shape instead of forcing a type assertion at the call site"
    - "Reverse-only correction UI: absence of any edit/delete affordance is the structural half of append-only, the DB trigger is the backstop"

key-files:
  created:
    - src/components/ledger/ledger-tab.tsx
    - src/components/ledger/ledger-balance-strip.tsx
    - src/components/ledger/ledger-table.tsx
    - src/components/ledger/ledger-table-row.tsx
    - src/components/ledger/__tests__/ledger-tab.test.tsx
  modified:
    - src/lib/ledger/ledger-math.ts
    - src/components/leases/detail/lease-details.client.tsx
    - src/components/leases/__tests__/lease-details.test.tsx

key-decisions:
  - "computeRunningBalance became generic rather than the tab reaching for an assertion, so LedgerEntryRow keeps description/method through the derivation (the exact trap 55-05 flagged forward)."
  - "The tab was split into four files because a single one reached 465 lines against the 300-line component cap; the derivation, the ConfirmDialog wiring and the dialog mounting all stayed in ledger-tab.tsx so nothing moved outside the plan's verification greps."
  - "Opening and credit lines render their own chip instead of a paid/partial/unpaid/late state - an unpaid opening balance past its grace window would otherwise read Late, which is not a rent charge falling behind."
  - "A voided row (a reversal, or an entry that was reversed) offers no reverse button: reversing a reversal would append a third row that nets nothing and reads as a loop."
  - "The action row renders in both states with the buttons disabled when untracked, which satisfies the UI-SPEC's 'disabled until tracked' without hiding the affordance the empty state is teaching."

patterns-established:
  - "Ledger surface shape: summary strip fed by the server aggregate, action row, shadcn Table (not virtualized) of client-derived rows, Empty compound when the subsystem has not been onboarded"

requirements-completed: [LEDGER-02, LEDGER-03, LEDGER-04, LEDGER-05, LEDGER-06]

# Metrics
duration: 13min
completed: 2026-07-25
---

# Phase 55 Plan 07: Per-lease Ledger Tab Summary

**The owner-facing ledger: a server-derived balance strip, a chronological append-only table whose paid/partial/unpaid/late badges and running balance are derived client-side from the same 5-day-grace rules the SQL uses, and the four write actions - record receipt, add line, start tracking, reverse - mounted as a fourth tab on the lease detail page.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-07-25T14:11:06Z
- **Completed:** 2026-07-25T14:24:04Z
- **Tasks:** 2
- **Files created:** 5 · **modified:** 3

## Accomplishments

- **`ledger-tab.tsx` (259 lines).** The composition and derivation layer. `buildLedgerRows` walks the ordered stream once: it collects every `reverses_id` into a set so an original knows it was reversed, calls `computeRunningBalance` for the cumulative dollar balance, and calls `deriveChargeState` for real charges only. It filters the open charges the receipt picker may allocate against (`amount - receiptsSum` still positive, not voided), owns the `ConfirmDialog` reversal flow, and mounts the three 55-06 dialogs with the boolean each one expects.
- **`ledger-balance-strip.tsx` (97 lines).** Balance / Charged / Received in three `Card` metric tiles mirroring the sibling key-metric strip on the same page (`text-xl font-semibold tabular-nums`). Balance reads `text-destructive-text` when money is owed and `text-success-text` when it is settled or in credit, with a destructive `{n} late` chip beside it when the summary reports late charges. Every figure comes from `get_lease_ledger_summary` - nothing here re-derives an aggregate, so the strip cannot disagree with the server (T-55-12).
- **`ledger-table.tsx` (160 lines).** The shadcn `Table` (deliberately not virtualized - a single lease's ledger is bounded), plus the three states: five `Skeleton` rows while loading, "Couldn't load the ledger." with a `Retry` that refetches, and the `Empty` compound with the "Start tracking rent" CTA when the lease has no `ledger_start_date`. A tracked ledger with no rows yet gets an explanatory cell rather than bare headers.
- **`ledger-table-row.tsx` (179 lines).** Date · Description (with the receipt's method label underneath) · Type · Charge · Receipt · Balance · Status · reverse. Money cells are right-aligned `tabular-nums`. The badge palette is exactly the UI-SPEC's: Paid/success+CircleCheck, Partial/warning+CircleDashed, Unpaid/secondary+CircleDashed, Late/destructive+TriangleAlert, Credit/info+Undo2, Opening balance/outline+Flag, Reversed/outline+Undo2. A voided row dims to `text-muted-foreground opacity-60` and strikes through both amount cells. The reverse control is an icon-only ghost `Button` with `aria-label="Reverse entry"` at the 44px touch minimum.
- **The mount.** `lease-details.client.tsx` went `grid-cols-3` to `grid-cols-4` with the Ledger trigger between Details and Timeline, and a `TabsContent` passing `isTracked={lease.ledger_start_date != null}`. `LedgerTab` is imported directly from its defining file; the existing Details/Timeline/Terms tabs and the key-metric card strip are untouched.
- **17 new behaviour cases.** 15 on the tab itself plus 2 on the mount. They pin the untracked empty state and the disabled actions, the summary figures with an explicit `not.toContain("$92,500.00")` 100x assertion, each derived badge (a paid charge, a past-grace charge reading Late even though it was partly paid, a part-paid charge inside grace reading Partial, an untouched one reading Unpaid, and the opening/credit chips that must NOT borrow a charge state), the running balance moving 250 → 1,250 → 250 across a charge and its receipt, a reversed original that stays visible with no second reverse button, a reversal call carrying `{leaseId, entryKind, entryId}` and asserted to have no `amount` key, the loading and error states, and the absence of any Pay now / Autopay / Connect affordance.

## Task Commits

1. **Task 1: ledger tab, table, row, balance strip, generic derivation, tests** - `ad511de6d` (feat)
2. **Task 2: mount the Ledger tab on the lease detail page** - `b80a9e411` (feat)

## Files Created/Modified

- `src/components/ledger/ledger-tab.tsx` - derivation + composition + reverse confirmation + dialog wiring.
- `src/components/ledger/ledger-balance-strip.tsx` - the three server-fed metric tiles.
- `src/components/ledger/ledger-table.tsx` - table shell, skeleton, inline error, no-ledger Empty.
- `src/components/ledger/ledger-table-row.tsx` - one derived row and its badge/reverse affordance.
- `src/components/ledger/__tests__/ledger-tab.test.tsx` - 15 behaviour cases.
- `src/lib/ledger/ledger-math.ts` - `computeRunningBalance` and `LedgerEntryWithBalance` made generic (see deviation 1).
- `src/components/leases/detail/lease-details.client.tsx` - the four-tab mount.
- `src/components/leases/__tests__/lease-details.test.tsx` - tab-order fix + untracked-ledger case (see deviation 3).

## Decisions Made

- **Widen the derivation, do not assert at the call site.** 55-05 flagged that `computeRunningBalance(LedgerEntryRow[])` returns `LedgerEntryWithBalance[]`, silently narrowing `description` and `method` off the result. Making it `<T extends LedgerEntry>(readonly T[]) => LedgerEntryWithBalance<T>[]` (with the exported type now generic and defaulted) fixes it structurally: the table reads the display columns straight off the derived row, and no `as` appears anywhere. The mirrored-constant test (`GRACE_PERIOD_DAYS === 5`) and all 125 ledger unit cases still pass.
- **Four files, not one.** A single `ledger-tab.tsx` holding the strip, the table, the row states and the composition came to 465 lines against CLAUDE.md's 300-line component cap. The split follows the render boundary: the tab derives and composes, the strip renders server aggregates, the table renders the shell and states, the row renders one entry. `computeRunningBalance`, `deriveChargeState` and `ConfirmDialog` all stayed in `ledger-tab.tsx`, so the plan's verification greps still hit the file they were written for, and every new file sits under `src/components/ledger` where the 55-03 money guard already scans recursively.
- **Opening and credit lines are not charge states.** The opening balance is a real, payable charge, so `deriveChargeState` would happily call an unpaid one "Late" once its date passed the grace window. That is misleading: an opening balance is history the owner typed in, not a rent charge falling behind. Opening and credit rows therefore render their own chip, and the test asserts the opening row shows no "Late".
- **No reverse button on a voided row.** An entry that has been reversed, or that is itself a reversal, offers no reverse affordance. The server would accept it, but a reversal of a reversal appends a third row that nets nothing and makes the ledger read as a loop. The original stays fully visible either way (D-06).
- **The action row shows through the empty state, disabled.** The UI-SPEC asks for both buttons "disabled until the lease is being tracked" and for the full `Empty` compound when untracked. Rendering the row in both states with `disabled={!isTracked}` satisfies both: the owner sees what the ledger will let them do while the empty state teaches the one thing they must do first.
- **Balance-strip figures come only from the RPC.** The strip could have summed the entry stream, and would have matched most of the time. Reading the server aggregate instead means the client and the database can never quietly disagree about what a lease owes (T-55-12); the client derivation exists for per-row interactivity, not for totals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `computeRunningBalance` narrowed the display columns off every row**
- **Found during:** Task 1
- **Issue:** `computeRunningBalance` was typed `(LedgerEntry[]) => LedgerEntryWithBalance[]`. The table feeds it `LedgerEntryRow[]` and then needs `description` and `method` off the result, which the base return type does not carry - so the derived rows could not render the Description or Method cells without a type assertion, which CLAUDE.md forbids.
- **Fix:** Made the function generic (`<T extends LedgerEntry>(orderedEntries: readonly T[]): LedgerEntryWithBalance<T>[]`) and the exported result type generic with a `LedgerEntry` default, exactly as 55-05's handoff note prescribed. No behaviour change; no existing caller needed editing.
- **Files modified:** `src/lib/ledger/ledger-math.ts`
- **Verification:** `rent-ledger-balance.test.ts` (including the `GRACE_PERIOD_DAYS === 5` mirror) and `rent-ledger-keys.test.ts` both green; full typecheck clean across all three projects.
- **Committed in:** `ad511de6d`

**2. [Rule 3 - Blocking] The single-file tab breached the 300-line component cap**
- **Found during:** Task 1
- **Issue:** With the balance strip, the table, the row states, the derivation and the dialog wiring in one file, `ledger-tab.tsx` measured 465 lines against CLAUDE.md's "Max 300 lines per component".
- **Fix:** Split along the render boundary into `ledger-tab.tsx` (259), `ledger-table.tsx` (160), `ledger-table-row.tsx` (179) and `ledger-balance-strip.tsx` (97). No barrel file; each imports from the defining file. The derivation and the reversal wiring deliberately stayed in `ledger-tab.tsx` so the plan's `computeRunningBalance|deriveChargeState` and `ConfirmDialog` greps still verify the file they name.
- **Files modified:** the three new sibling components
- **Verification:** Task 1's automated gate emitted `LEDGER_TAB_OK`; the money guard already scans `src/components/ledger` recursively, so all four files are covered without editing its path list.
- **Committed in:** `ad511de6d`

**3. [Rule 1 - Bug] The existing keyboard-navigation test encoded the old tab order**
- **Found during:** Task 2
- **Issue:** `lease-details.test.tsx` asserted that ArrowRight from Details focuses Timeline. Inserting Ledger between them (the order this plan mandates) made that assertion fail - a real contract change the test correctly caught.
- **Fix:** Updated the case to walk Details → Ledger → Timeline, and added a second case clicking through to the Ledger tab to assert the untracked empty state renders there (the mock lease has `ledger_start_date: null`), which also proves the mount passes `isTracked` correctly end to end.
- **Files modified:** `src/components/leases/__tests__/lease-details.test.tsx`
- **Verification:** 26/26 pass in that file.
- **Committed in:** `b80a9e411`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 test-contract bug)
**Impact on plan:** No scope creep. Two files beyond the plan's one exist only to honour the project's own line cap; the generic widening was prescribed by the previous plan's handoff; the test update follows directly from the tab-order change the plan specifies.

## Issues Encountered

- **Two accessible-name collisions in the tests.** A row's accessible name is the concatenation of its cells, so `/^Duplicate fee/` never matched (the date leads), and both the opening and credit rows render their label twice - once in the Type cell, once in the status chip. Rather than loosen the assertions, the fixture descriptions were made distinct and the duplicate-label rows are asserted as "twice, and NOT wearing a charge state", which is the property that actually matters.
- **One pre-commit lint round-trip.** The first Task 1 commit was rejected by the lint hook over biome formatting in the new test file. Re-ran `biome check --write`, re-linted the whole repo clean, and re-committed. No `--no-verify` at any point.
- **Concurrent working-tree edits.** The orchestrator had unrelated modifications in the tree throughout (four document-template clients, two form-options files, a submit button, `deferred-items.md`). Both commits used a pathspec commit (`git commit -- <my paths>`) so nothing outside this plan was absorbed.

## Verification

- `bun run validate:quick` → **green: 303 files / 107,955 tests, typecheck clean (root + tests/integration + tests/e2e), biome clean (1341 files).**
- `bun run test:unit -- src/components/ledger/ src/hooks/api/__tests__/rent-ledger-*.test.ts src/hooks/api/query-keys/rent-ledger-keys.test.ts` → **125/125 pass** across the eight ledger suites.
- Task 1 gate: `LEDGER_TAB_OK` - file exists, contains `computeRunningBalance`/`deriveChargeState` and `ConfirmDialog`, no `* 100` / `/ 100` / `formatCents(`, no typecheck errors naming the file.
- Task 2 gate: `MOUNT_OK` - `value="ledger"` and `grid-cols-4` and `LedgerTab` present, no typecheck errors naming the file.
- Money boundary: the 55-03 static guard scans `src/components/ledger` recursively and now emits per-file assertions for all eight ledger components; every figure on this surface renders through `formatCurrency`.
- Both commits passed the full lefthook chain (gitleaks, lockfile-verify, lint, typecheck, unit tests) and commitlint. Neither commit deleted a tracked file.
- No `any`, no `as unknown as`, no inline styles, no emoji; every icon is lucide; muted text uses `text-muted-foreground`, surfaces use `bg-card`/`bg-background`; all four components are under the 300-line cap (259 / 179 / 160 / 97).

## Known Stubs

None. Every figure on this surface comes from a live production RPC through the 55-05 hooks, and all four actions call the real mutations. The empty state is the honest untracked state (D-04), not placeholder data.

## Threat Flags

None. This plan adds no network endpoint, auth path, file access pattern or schema change - it renders RPCs that shipped in 55-02 and went live in 55-04. The register's six dispositions are all satisfied:

- **T-55-12** (client/SQL drift): the strip renders the RPC's own totals; per-row derivation uses `ledger-math`, whose grace constant is unit-pinned to the SQL literal.
- **T-55-03** (edit/delete affordance on a booked amount): none exists; the test asserts no button matching /edit/i or /delete/i renders on any row.
- **T-55-08** (phantom credit from reversing a paid charge): charges route to `reverse_charge`, which posts the paired negations, and the confirm copy says so before the owner commits.
- **T-55-05** (cents math): `formatCurrency` only, enforced statically by the money guard and asserted against a 100x render in the suite.
- **T-55-20** (cross-owner ledger): data comes from the owner-guarded RPCs and the tab passes only the current lease id.
- **T-55-SC** (package installs): none; every primitive was already in `src/components/ui/`.

## User Setup Required

None.

## Next Phase Readiness

- Phase 55's build surface is complete: schema + cron (55-01), RPCs (55-02), derivation + guards (55-03), prod migration + types (55-04), data layer (55-05), dialogs (55-06), tab (55-07), KPI + revenue relabel (55-08).
- Remaining before ship: the phase-level human verification pass (badge states and empty-state honesty against a real tracked lease) and the perfect-PR merge gate.
- If a future plan adds a ledger source file outside `src/components/ledger` or `src/lib/ledger`, it must be added to `LEDGER_PATHS` in `rent-ledger-money.test.ts` - the guard scans those two directories recursively and everything else by explicit path.

## Self-Check: PASSED

- FOUND: src/components/ledger/ledger-tab.tsx
- FOUND: src/components/ledger/ledger-balance-strip.tsx
- FOUND: src/components/ledger/ledger-table.tsx
- FOUND: src/components/ledger/ledger-table-row.tsx
- FOUND: src/components/ledger/__tests__/ledger-tab.test.tsx
- FOUND: src/components/leases/detail/lease-details.client.tsx (modified, `value="ledger"` present)
- FOUND commit: ad511de6d
- FOUND commit: b80a9e411

---
*Phase: 55-rent-ledger*
*Completed: 2026-07-25*
