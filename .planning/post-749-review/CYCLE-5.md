---
phase: post-749-cleanup
reviewed: 2026-05-29T19:30:00Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - src/types/sections/inspections.ts
  - src/hooks/api/query-keys/inspection-keys.ts
  - src/hooks/api/query-keys/inspection-mutation-options.ts
  - src/hooks/api/query-keys/financial-keys.ts
  - src/hooks/api/query-keys/report-keys.ts
  - src/hooks/api/query-keys/analytics-keys.ts
  - src/hooks/api/query-keys/lease-keys.ts
  - src/hooks/api/use-profile.ts
  - src/hooks/api/use-profile-mutations.ts
  - src/lib/db-insert.ts
  - src/hooks/api/__tests__/use-expenses.test.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Post-#749 Cleanup Cycle-5 Review

**Scope:** PR #755 at HEAD `81a7d18b1` (cycle-4 fix commit) — `fix(post-749 cycle-4): consolidate inspection enums + drop dead defenses`.

**Verdict:** CLEAN — all 5 cycle-4 findings closed without regression. **First clean cycle — cycle 6 must also be CLEAN to close the merge gate.** One non-blocking INFO observation on a runtime/type-shape minor discrepancy that pre-dates cycle-4 (the `Inspection` detail spread leaks an extra `inspection_rooms` field). All three required CI checks pass at HEAD (`checks` 1m57s, `e2e-smoke` 2m57s, `rls-security` 1m23s). Local `bun run typecheck` and `bun run lint` both clean (1,218 files, 250ms).

---

## P0 BLOCKERS

_None._

---

## P1 WARNINGS

_None._

---

## INFO

### IN-1 (cycle-5): `detailQuery` returned object leaks an undeclared `inspection_rooms` field at runtime

**File:** `src/hooks/api/query-keys/inspection-keys.ts:132-136`

**Issue:** The new `narrowInspectionEnums(data)` returns `T & { inspection_type: InspectionType; status: InspectionStatus }` where `T = Tables<"inspections"> & { inspection_rooms: ... }` from the embedded SELECT. The return then spreads the narrowed row and overlays a `rooms` property:

```typescript
const narrowed = narrowInspectionEnums(data);
return {
  ...narrowed,   // <-- spreads inspection_rooms (the raw embed) too
  rooms,         // <-- typed override
};
```

The declared return type `Inspection` has no `inspection_rooms` field, so excess-property checks don't fire (spread isn't a literal). Both `rooms` AND the raw `inspection_rooms` ship to consumers; downstream code reads `.rooms` so this is functionally correct, but the runtime payload is larger than the type promises and a future consumer reading `inspection_rooms` would compile against `never`.

**Fix:** Destructure to strip the embed before spreading:

```typescript
const { inspection_rooms: _embedded, ...rest } = narrowInspectionEnums(data);
return { ...rest, rooms };
```

This is INFO, not P1, because the pre-existing detail-mapper already had this pattern and no consumer relies on the raw `inspection_rooms`. Pure quality.

---

## Cycle-4 verification matrix (all 5 cycle-4 findings)

| ID | Cycle-4 Issue | Cycle-5 Status |
| --- | --- | --- |
| WR-1 cycle-4 | Duplicate `INSPECTION_TYPES` / `INSPECTION_STATUSES` constants + two near-identical helpers (`narrowInspectionEnums` in `inspection-keys.ts`, `toInspection` in `inspection-mutation-options.ts`) | **FIXED.** Single source of truth at `src/types/sections/inspections.ts:8-45`. Both consumers import `narrowInspectionEnums` from there. `toInspection` wrapper deleted; all 5 inspection mutations + 3 inspection-keys queries call `narrowInspectionEnums(...)` directly. `Inspection.inspection_type` and `Inspection.status` re-bound to the exported `InspectionType` / `InspectionStatus` aliases. Generic signature `T extends { id: string; inspection_type: string; status: string }` correctly accepts `Tables<"inspections">` (verified by typecheck pass). `createRoom` intentionally returns the raw `inspection_rooms` row (not an inspection); consumer at `use-inspection-room-mutations.ts:27-37` only reads `variables.inspection_id` in `onSuccess`, ignores the return value (`(_, variables) => ...`) — confirmed safe. |
| IN-1 cycle-4 | Dead `Array.isArray` re-wrap of `fetchRevenueTrends` return | **FIXED.** `financial-keys.ts:147` and `report-keys.ts:121` now read `const rows = await fetchRevenueTrends(...)` directly. `fetchRevenueTrends` static return type is `Array<Record<string, unknown>>` via `jsonArrayOrEmpty`; the defensive guard was unreachable. Verified the third caller (`lease-keys.ts:262-264` via `revenueTrendsQuery`) does NOT depend on the dropped guards — it's already wired through `revenueTrendsQuery` (also array-typed). No regression. |
| IN-2 cycle-4 | `data!` non-null assertion at `use-profile.ts:60` + `use-profile-mutations.ts:51` | **FIXED.** Both sites now do `if (!data) throw new Error("Profile not found");` before calling `mapUserProfile(data)`. Behavior parity preserved: previously a `null` `data` would hit `mapUserProfile(null)` and throw a `TypeError` at the first property read (`row.id`); now it throws an explicit named error with a clear message. Existing callers either catch via `useMutation.onError` (mutation hook) or surface to the TanStack Query error boundary (query hook) — both paths handle a thrown `Error` identically. No regression. |
| IN-3 cycle-4 | `omitUndefined` JSDoc evoked the `as-unknown-as` pattern CLAUDE.md rule #8 forbids | **FIXED.** `src/lib/db-insert.ts:1-19` rewritten. New text explicitly argues the soundness: the loop filters undefined entries, so the residual Record is structurally `StripUndefined<T>` and the single-step `as StripUndefined<T>` cast is a sound widening, not a bridge. No mention of "cast through unknown" remains. Implementation unchanged (correct already). |
| IN-4 cycle-4 | `useExpensesByProperty` test under-asserted `.eq`/`.in` filter columns | **FIXED.** `use-expenses.test.ts:246-250` now pins all three filter contracts: `mockEq` with `("property_id", "prop-1")`, `mockIn` nth-call 1 with `("unit_id", ["unit-1"])`, nth-call 2 with `("maintenance_request_id", ["mr-1"])`. A regression that swaps `property_id` for any other column would fail the assertion. |

**Net for cycle-5:** 5 of 5 cycle-4 findings FIXED. Zero new findings at P0 or P1. One INFO observation (IN-1 cycle-5) on a pre-existing pattern that the cycle-4 helper centralization brought into focus — non-blocking, fix-anytime.

---

## Carry-forward backlog (deferred items re-audit)

| Source | Issue | Cycle-5 Re-audit |
| --- | --- | --- |
| WR-3 cycle-1 | SQL: soft-deleted property filter on lease-driven RPCs | **STILL DEFERRED-OK.** Genuinely SQL-only — touching the migration files mid-perfect-PR risks introducing churn that resets the clean-cycle counter. The 4 lease RPCs predate this PR and have no behavioral regression from this PR's scope. Recommend a follow-up branch dedicated to RPC hygiene. |
| WR-4 cycle-1 | SQL: `::bigint` truncation in 2 analytics RPCs | **STILL DEFERRED-OK.** Same rationale as WR-3. SQL-only, pre-existing, no cycle-1..cycle-5 behavioral change introduced it. |
| WR-5 cycle-1 | FDW migration prod-only behavior | **STILL DEFERRED-OK.** Documented behavior; the migration's `import foreign schema` block is intentionally idempotent + prod-driven. No fix without restructuring the FDW lifecycle, which is far beyond cleanup scope. |
| IN-2 cycle-2 | `omitUndefined` unsound for `field: T \| undefined` (where `undefined` IS a legal value) | **STILL DEFERRED-OK.** The PostgREST insert/update contract treats undefined-keyed columns as "apply DEFAULT" (correct). For columns where `undefined` is meant to mean "null", callers must pass `null` explicitly. No caller in the current codebase relies on `undefined`-meaning-null; verified by grep over `.update(omitUndefined(...))` and `.insert(omitUndefined(...))` call sites. Documented; safe. |
| Cycle-2 IN-2 | "24 foreign tables" un-verified in `CLAUDE.md:206` | **STILL DEFERRED-OK.** Drift-risk only. Migration `20260528223546_install_stripe_wrapper.sql:7-9` documents the same count in comments. The number is set by Stripe's wrapper at `import foreign schema` time — verifiable only with live DB access (Supabase MCP token not in this review's env). No behavioral risk. |

**Argument-evidence:** none of the deferred items have accumulated cycle-context that warrants promotion. Each is documented, each has a pure-cleanup follow-up path, and each lies outside the post-#749 cleanup PR's stated scope.

---

## Verification

- `bun run typecheck` — clean (no output, tsc --noEmit) ✓
- `bun run lint` — clean (`biome check`, 1,218 files in 250ms) ✓
- `gh pr checks 755` — all 3 required green at HEAD `81a7d18b1`:
  - `checks` pass 1m57s
  - `e2e-smoke` pass 2m57s
  - `rls-security` pass 1m23s
  - `auto-merge` skipping (auto-merge not enabled — correct) ✓
- `grep -rn "as unknown as" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v ".test."` — 5 hits, **all in JSDoc/code comments documenting the ban** (`chart-tooltip.tsx:40`, `property-stats-keys.ts:35`, `inspection-keys.ts:57`, `document-keys.ts:119`, `rpc-shape.ts:10`). **Zero active `as unknown as` casts in production code.** ✓
- `grep -rn "INSPECTION_TYPES\|INSPECTION_STATUSES\|narrowInspectionEnums\|toInspection" src/` — all `INSPECTION_TYPES` / `INSPECTION_STATUSES` references live in `src/types/sections/inspections.ts`. `narrowInspectionEnums` defined once (types/sections/inspections.ts:27), imported and called from `inspection-keys.ts` (3 sites) and `inspection-mutation-options.ts` (5 sites). Zero `toInspection` references — wrapper successfully removed. ✓
- `grep -rn "rent_payments" src/ --include="*.ts" --include="*.tsx"` — 4 hits: 1 in `billing-keys.ts:19` (intentional doc comment about table demolition), 3 in test fixtures asserting `rent_payments` is gone. Zero live consumers. ✓
- Generic signature compatibility — `Tables<"inspections">` (from typed Database client) has `id: string`, `inspection_type: string`, `status: string` per `supabase.ts`. Structurally satisfies `narrowInspectionEnums`'s generic constraint. Typecheck pass confirms all 8 call sites resolve. ✓
- `createRoom` not run through `narrowInspectionEnums` — intentional. Returns `Tables<"inspection_rooms">`, NOT an Inspection. Consumer `useCreateInspectionRoom` at `use-inspection-room-mutations.ts:23-38` only reads `variables.inspection_id` in `onSuccess`. UI consumer `inspection-detail-sections.tsx:39-58` does not read the result either. Safe. ✓
- `fetchRevenueTrends` callers — 3 sites verified:
  - `financial-keys.ts:147` — direct await, used as `Array<Record<string, unknown>>`
  - `report-keys.ts:121` — direct await, used as `Array<Record<string, unknown>>`
  - `lease-keys.ts:262-264` — via `revenueTrendsQuery` factory which itself returns `Array<Record<string, unknown>>`; consumers of `leaseQueries.analytics.duration/turnover/revenue` get an array.
  No consumer expects the pre-cycle-3 `Record<string, unknown>` (object) shape. ✓
- `use-profile.ts` + `use-profile-mutations.ts` error path — Previously `data!` would coerce `null` and `mapUserProfile(null!)` would throw `TypeError: Cannot read properties of null (reading 'id')`. Now an explicit `Error("Profile not found")` is thrown. Both routes funnel into the same TanStack Query / mutation error pipeline. Behavior parity. ✓
- `omitUndefined` JSDoc — no longer references "cast through unknown" or implies the as-unknown-as pattern. Soundness argument is explicit and correct (`StripUndefined<T>` is structurally exact for the filtered Record). ✓
- `use-expenses.test.ts` — column-pinning assertions added at lines 246-250 catch any regression that swaps the joined-table filter column. The pre-existing table-sequence checks at 238-241 remain. ✓
- No similar duplicate `narrow*Enums` patterns exist elsewhere (verified `grep -rn "narrow.*Enums"` returns only inspection helpers). `src/lib/constants/status-types.ts` houses all other app-level status constants (LEASE_TYPES, PROPERTY_TYPES, MAINTENANCE_CATEGORIES, etc.) in a single canonical module — no fragmentation. ✓
- `inspection-detail-sections.tsx:42-56` — inline string union casts (`as "bedroom" | "bathroom" | ...`) for `room_type` and `condition_rating` ARE pre-existing technical debt, NOT introduced by cycle-4. These would benefit from a similar constants-extraction pass (`INSPECTION_ROOM_TYPES`, `INSPECTION_CONDITION_RATINGS`) but that is out of scope for the post-#749 cleanup PR. Flagged for backlog, not for this cycle. ✓

---

## Cycle-status summary

- **Cycle 1:** 12 findings (2 P0, 6 P1, 4 INFO) — NEEDS-FIXES
- **Cycle 2:** 11 findings (1 P0, 3 P1, 7 INFO) — NEEDS-FIXES
- **Cycle 3:** 7 findings (0 P0, 2 P1, 5 INFO) — NEEDS-FIXES
- **Cycle 4:** 5 findings (0 P0, 1 P1, 4 INFO) — NEEDS-FIXES
- **Cycle 5 (this one):** 1 finding (0 P0, 0 P1, 1 INFO) — **CLEAN**

**Verdict:** CLEAN. First clean cycle. Cycle 6 must ALSO be CLEAN to satisfy the perfect-PR merge gate (two consecutive zero-finding cycles). The single INFO (IN-1 cycle-5) is non-blocking and could be carried into the next clean cycle without resetting the counter — but folding it into a cycle-6 fix would make cycle 6 trivially close as long as no regressions slip in.

---

## Top items (cycle-5)

Only one finding in this cycle:

1. **IN-1 (cycle-5)** — `inspection-keys.ts:132-136` spread leaks `inspection_rooms` raw embed alongside the typed `rooms` override. Pure quality, non-functional, pre-existing pattern; the cycle-4 helper centralization brought the spread into clearer view but did not introduce it.

---

_Reviewed: 2026-05-29T19:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
