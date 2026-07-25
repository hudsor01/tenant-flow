---
phase: 55-rent-ledger
plan: 05
subsystem: frontend
tags: [query-keys, typed-mappers, mutations, money-boundary, zod, tanstack-query]

# Dependency graph
requires:
  - phase: 55-rent-ledger (plan 02)
    provides: get_lease_ledger_summary / get_lease_ledger / reverse_charge / reverse_receipt / start_lease_ledger RPCs
  - phase: 55-rent-ledger (plan 03)
    provides: ledger-math.ts (LedgerEntry contract, running balance, charge state) + the static money guard
  - phase: 55-rent-ledger (plan 04)
    provides: migrations live in prod + src/types/supabase.ts regenerated (ledger tables and RPCs are typed)
provides:
  - src/hooks/api/query-keys/rent-ledger-keys.ts - rentLedgerKeys / rentLedgerQueries + mapLedgerSummaryRow / mapLedgerEntryRow
  - src/hooks/api/query-keys/rent-ledger-mutation-options.ts - recordReceipt / addLine / startTracking / reverseEntry + zod input schemas + toSignedLineAmount
  - src/hooks/api/use-rent-ledger.ts - six hooks with the invalidation fanout
affects: [55-06 ledger dialogs, 55-07 ledger tab, 55-08 collection-rate KPI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Boundary mapper with an explicit NOT NULL marker: a `fallback: null` argument means the field is NOT NULL and throws when absent, instead of silently reading a dropped money column as 0"
    - "Reversal routed through a server RPC so the negation is computed from the stored row, never from a client-supplied amount"
    - "Read/write split of one query-key module (`-keys` + `-mutation-options`) with the static money guard extended in the same commit so the split cannot create a blind spot"

key-files:
  created:
    - src/hooks/api/query-keys/rent-ledger-keys.ts
    - src/hooks/api/query-keys/rent-ledger-mutation-options.ts
    - src/hooks/api/query-keys/rent-ledger-keys.test.ts
    - src/hooks/api/use-rent-ledger.ts
  modified:
    - src/hooks/api/mutation-keys.ts
    - src/hooks/api/__tests__/rent-ledger-money.test.ts
    - .planning/phases/55-rent-ledger/deferred-items.md

key-decisions:
  - "reverseEntry takes no client amount. The plan's draft interface carried `amount`, but reverse_charge / reverse_receipt negate the stored row server-side, so a client amount would be unused, forgeable, and an invitation to reintroduce a client-side negation."
  - "LedgerEntryRow EXTENDS ledger-math's LedgerEntry rather than redefining it, so the mapper output and the derivation module can never drift (CLAUDE.md no-duplicate-types)."
  - "Split into -keys (read) and -mutation-options (write) at 398 lines, and extended the 55-03 money guard's scanned paths in the same commit so the split did not move every ledger INSERT outside the guard."
  - "Receipt rows label their `type` from the entry kind ('receipt'). The RPC returns a null type for receipts because only charges have one, and ledger-math types `type` as a non-null discriminator."
  - "startTracking additionally invalidates leaseQueries.all(), because start_lease_ledger writes leases.ledger_start_date - the field the ledger tab reads to choose between the empty state and the ledger."

requirements-completed: [LEDGER-02, LEDGER-03, LEDGER-04, LEDGER-05, LEDGER-06]

# Metrics
duration: 35min
completed: 2026-07-25
---

# Phase 55 Plan 05: Ledger Data Layer Summary

**The single client contract for every ledger surface: queryOptions factories over the two read RPCs, typed dollar-safe boundary mappers, four zod-validated mutations whose reversal path is a server-side exact negation, and six hooks that fan invalidation out to the lease ledger plus the owner dashboard.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-25T13:00:00Z
- **Completed:** 2026-07-25T13:35:00Z
- **Tasks:** 2
- **Files created:** 4 · **modified:** 3

## Accomplishments

- **`rent-ledger-keys.ts` (199 lines).** `rentLedgerKeys` (`all` -> `forLease(leaseId)` -> `summary` / `entries`) and `rentLedgerQueries.summary` / `.entries` as `queryOptions()` factories over `get_lease_ledger_summary` and `get_lease_ledger`. No string-literal query keys anywhere. Both queries are `enabled`-gated on a real UUID so a bogus route param cannot fire an RPC that fails on UUID format, and both route errors through `handlePostgrestError`.
- **Typed mappers, dollars only.** `mapLedgerSummaryRow` and `mapLedgerEntryRow` coerce with `Number()` and nothing else. `toDollars(raw, field, fallback)` takes `fallback: null` to mark a NOT NULL field, so a dropped `amount` column throws instead of reading as $0; aggregates that SQL already coalesces default to 0. `jsonObject` / `jsonArray` from `#lib/rpc-shape` do the runtime object/array narrowing, so there is no `as unknown as` and no `any` at the boundary.
- **`rent-ledger-mutation-options.ts` (224 lines).** `recordReceipt` (insert into `rent_receipts` with per-charge allocation), `addLine` (insert into `rent_charges`, credit stored negative via `toSignedLineAmount` to match the `rent_charges_sign_check` constraint), `startTracking` (`start_lease_ledger` RPC), `reverseEntry` (`reverse_charge` for charges, `reverse_receipt` for receipts). Every input is zod-validated before any network call, with the phase UI-SPEC's user-facing copy as the messages, and `owner_user_id` comes from `getCachedUser()` + `requireOwnerUserId`, never from caller input.
- **`use-rent-ledger.ts` (103 lines).** `useLedgerSummary`, `useLedgerEntries`, `useRecordReceiptMutation`, `useAddLineMutation`, `useStartTrackingMutation`, `useReverseEntryMutation`. Each mutation's `invalidate` array contains `rentLedgerKeys.forLease(leaseId)` **and** `ownerDashboardKeys.all`; `startTracking` adds `leaseQueries.all()`. Append-only means no optimistic edit or rollback, and the single success toast comes from `createMutationCallbacks` so the 55-06 dialogs must not toast again.
- **30-case mapper/mutation suite.** Pins `"1500.00" -> 1500` (explicitly `not.toBe(150000)`), a credit's preserved negative sign, throws on missing `id` / `amount` / bad `kind`, the receipt `type` fallback, a round-trip into `computeRunningBalance`, the RPC argument names for all six RPC/insert paths, and both reversal routes.

## Task Commits

1. **Task 1: keys, mappers, mutation options, mapper test** - `4743793eb` (feat)
2. **Task 2: query + mutation hooks with invalidation fanout** - `32e7fcef7` (feat)

## Files Created/Modified

- `src/hooks/api/query-keys/rent-ledger-keys.ts` - read half: factories + `LedgerSummary` / `LedgerEntryRow` + the two mappers.
- `src/hooks/api/query-keys/rent-ledger-mutation-options.ts` - write half: zod schemas, input types, `toSignedLineAmount`, `rentLedgerMutations`.
- `src/hooks/api/query-keys/rent-ledger-keys.test.ts` - 30 cases across both modules.
- `src/hooks/api/use-rent-ledger.ts` - the six hooks.
- `src/hooks/api/mutation-keys.ts` - added the `rentLedger` block (see deviation 2).
- `src/hooks/api/__tests__/rent-ledger-money.test.ts` - added the mutation-options path to `LEDGER_PATHS` (see deviation 1).
- `.planning/phases/55-rent-ledger/deferred-items.md` - logged D2.

## Decisions Made

- **`reverseEntry` carries no client amount.** The plan's draft interface listed `amount: number` on the reversal input. `reverse_charge` / `reverse_receipt` read the target row and post `-amount` themselves (and `reverse_charge` also negates every receipt allocated to the charge), so a client amount would be dead input that a future refactor could mistake for the source of the negation. Dropping it makes the D-06 guarantee structural: the client cannot express a mismatched reversal.
- **Extend, do not redefine, `LedgerEntry`.** `LedgerEntryRow extends LedgerEntry` from `ledger-math.ts` and adds only `description` / `method` (the two display-only columns). The derivation module and the mapper therefore share one contract.
- **Split at the 300-line cap, and move the guard with it.** The single file reached 398 lines. Splitting into `-keys` / `-mutation-options` follows the in-repo `*-mutation-options.ts` precedent, but would have silently moved every ledger INSERT outside `rent-ledger-money.test.ts`'s scanned paths. The guard's `LEDGER_PATHS` was extended in the same commit; the suite now emits a per-file assertion for all four ledger sources.
- **Receipt `type` falls back to the entry kind.** `get_lease_ledger` emits `null::text as type` for receipts. `ledger-math`'s `LedgerEntry.type` is a non-null discriminator, so receipts map to `"receipt"` - which is also exactly what the table's Type column renders.
- **Amount ceiling as validation, not as scaling.** `numeric(10,2)` tops out at `99_999_999.99`; the zod schemas cap there so an oversized amount is rejected client-side (T-55-16) rather than surfacing as a raw Postgres `numeric field overflow`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Money guard would have lost coverage of every ledger write**
- **Found during:** Task 1
- **Issue:** The keys file reached 398 lines, over the plan's 300-line cap. The plan permits splitting a mutations file, but `rent-ledger-money.test.ts` (55-03) scans a hard-coded path list; a split would have moved all four INSERT/RPC write paths outside the guard with no failing test to signal it.
- **Fix:** Split into `rent-ledger-keys.ts` (199) + `rent-ledger-mutation-options.ts` (224) and added the new path to `LEDGER_PATHS` in the same commit, with a comment naming why. Verified the guard now emits a per-file assertion for the new file.
- **Files modified:** `src/hooks/api/__tests__/rent-ledger-money.test.ts`
- **Commit:** `4743793eb`

**2. [Rule 3 - Blocking/convention] `mutationKeys` had no ledger block**
- **Found during:** Task 1
- **Issue:** Every `mutationOptions()` in the repo sets a `mutationKey` from the central `mutationKeys` factory (documents 4/4, leases 13, expenses 3, document categories 5). There was no `rentLedger` branch to reference.
- **Fix:** Added the `rentLedger` block with the four ledger actions. Additive only; no existing key changed.
- **Files modified:** `src/hooks/api/mutation-keys.ts`
- **Commit:** `4743793eb`

**3. [Rule 1 - Bug] `startTracking` left the ledger tab showing its empty state**
- **Found during:** Task 2
- **Issue:** `start_lease_ledger` writes `leases.ledger_start_date` in addition to the opening-balance row. The plan's invalidation contract is ledger keys + `ownerDashboardKeys.all`, neither of which touches the lease cache, so after "Start tracking rent" the cached lease would still read `ledger_start_date: null` and the tab would keep rendering "No rent ledger yet" until the lease cache went stale on its own.
- **Fix:** Added `leaseQueries.all()` to that one mutation's invalidate array, with a comment naming the cause. The other three mutations keep the plan's exact two-key fanout.
- **Files modified:** `src/hooks/api/use-rent-ledger.ts`
- **Commit:** `32e7fcef7`

### Out-of-scope discovery (logged, NOT fixed)

A separate workstream modified `package.json` (`typecheck` widened to also run the two `tests/` tsconfigs), `biome.json` (`recommended: false` -> `preset: "none"`), `tests/integration/tsconfig.json`, and ~15 files under `tests/integration/` and `tests/e2e/` while this plan was running - including `tests/integration/rls/rent-ledger-append-only.test.ts`, a 55-03 artifact. None of it is 55-05's scope, so it was left unstaged and uncommitted; every commit here staged its files individually. Logged as **D2** in `deferred-items.md`.

## Issues Encountered

- **Test UUID fixtures were rejected by `z.uuid()`.** Zod 4's top-level `z.uuid()` enforces the RFC 9562 version/variant nibbles, so the conventional `00000000-...-0001` placeholders failed validation. Replaced the fixtures with real v4-shaped UUIDs. Not a production concern: every id in this subsystem comes from `gen_random_uuid()` (v4).
- **One transient pre-commit failure.** The first Task 2 commit attempt failed its `lint` step while the concurrent workstream was mid-edit on `biome.json`; it passed on retry with the same tree. A race, not a defect - and no `--no-verify` was used at any point.

## Verification

- `bun run test:unit -- src/hooks/api/query-keys/rent-ledger-keys.test.ts` -> **30/30 pass**.
- `bun run test:unit -- src/hooks/api/__tests__/rent-ledger-money.test.ts` -> **15/15 pass**, with per-file assertions now naming `ledger-math.ts`, `rent-ledger-keys.ts`, `rent-ledger-mutation-options.ts`, and `use-rent-ledger.ts`.
- **RED evidence (Task 1):** before either source module existed, the suite failed with `Failed to resolve import "./rent-ledger-keys"` - the test genuinely preceded the implementation.
- `bun run validate:quick` -> **green: 296 files / 107,345 tests, typecheck clean, biome clean (1325 files).**
- Money boundary: `grep -nE '\*\s*100|/\s*100|formatCents\(' ` across all three new source files -> clean (and enforced by the guard, not just by grep).
- No `as unknown as` and no `any` in any new file.
- Both commits passed the full lefthook chain (gitleaks, lockfile-verify, lint, typecheck, unit tests with coverage) and commitlint.

## Known Stubs

None. All four mutations write real rows through live prod RPCs/tables, both queries read live RPCs, and no placeholder or hardcoded value is returned. The `EMPTY_LEDGER_SUMMARY` zero object is the honest no-rows state (D-08), not a stub.

## Threat Flags

None. This plan adds no new network endpoint, auth path, file access pattern, or schema change - it binds to RPCs and tables that shipped in 55-01/55-02 and went live in 55-04. The threat register's four mitigations are all implemented: T-55-05 (mapper never scales; guard + unit assertions), T-55-15 (typed mappers, no `as unknown as`), T-55-16 (zod bounds every amount, date, and label before the write), T-55-17 (`owner_user_id` from `getCachedUser()`, with DB RLS `WITH CHECK` re-verifying).

## User Setup Required

None.

## Next Phase Readiness

- **55-06 (dialogs)** consumes `useRecordReceiptMutation` / `useAddLineMutation` / `useStartTrackingMutation` / `useReverseEntryMutation` and the exported `RecordReceiptInput` / `AddLineInput` / `StartTrackingInput` / `ReverseEntryInput` types plus `LEDGER_LINE_TYPES`. Dialogs must NOT fire their own success toast - `createMutationCallbacks` already does.
- **55-07 (tab)** consumes `useLedgerSummary` / `useLedgerEntries`. One note for that plan: `computeRunningBalance` is typed `(LedgerEntry[]) => LedgerEntryWithBalance[]`, so passing `LedgerEntryRow[]` narrows `description` / `method` out of the RESULT type. Either widen that function to a generic `<T extends LedgerEntry>` in 55-07 or zip the balances back by index - do not reach for a type assertion.
- **55-08 (KPI)** still needs its own `get_collection_rate` binding; this plan deliberately scoped to the per-lease surface, and `ownerDashboardKeys.financial` is already in every mutation's fanout via `ownerDashboardKeys.all`.

## Self-Check: PASSED

- FOUND: src/hooks/api/query-keys/rent-ledger-keys.ts
- FOUND: src/hooks/api/query-keys/rent-ledger-mutation-options.ts
- FOUND: src/hooks/api/query-keys/rent-ledger-keys.test.ts
- FOUND: src/hooks/api/use-rent-ledger.ts
- FOUND commit: 4743793eb
- FOUND commit: 32e7fcef7

---
*Phase: 55-rent-ledger*
*Completed: 2026-07-25*
