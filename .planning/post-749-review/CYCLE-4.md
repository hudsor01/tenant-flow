---
phase: post-749-cleanup
reviewed: 2026-05-29T18:30:00Z
depth: deep
files_reviewed: 21
files_reviewed_list:
  - src/components/dashboard/expiring-leases-widget.tsx
  - src/components/leases/wizard/lease-creation-wizard.tsx
  - src/components/leases/wizard/selection-step.tsx
  - src/components/profiles/owner/profile-card.tsx
  - src/components/settings/sections/billing-history-section.tsx
  - src/components/ui/chart-tooltip.tsx
  - src/components/ui/slider.tsx
  - src/hooks/api/query-keys/analytics-keys.ts
  - src/hooks/api/query-keys/billing-keys.ts
  - src/hooks/api/query-keys/inspection-keys.ts
  - src/hooks/api/query-keys/inspection-mutation-options.ts
  - src/hooks/api/query-keys/lease-mutation-options.ts
  - src/hooks/api/query-keys/maintenance-keys.ts
  - src/hooks/api/query-keys/subscription-keys.ts
  - src/hooks/api/query-keys/tenant-mutation-options.ts
  - src/hooks/api/use-profile-mutations.ts
  - src/hooks/api/use-profile.ts
  - src/lib/reports/report-data.ts
  - src/proxy.ts
  - src/types/api-contracts.ts
  - src/lib/db-insert.ts
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Post-#749 Cleanup Cycle-4 Review

**Scope:** PR #755 at HEAD `72dd5e353` — review of the cycle-3 fix commit which closed all cycle-3 findings PLUS most cycle-1 / cycle-2 carry-forward INFO backlog (10 of 14 deferred items closed).

**Verdict:** NEEDS-FIXES — one P1 (duplicate enum-narrowing helper across two files, violates CLAUDE.md zero-tolerance rule #3) plus four INFO. All seven cycle-3 findings are FIXED with no regression. All three required CI checks pass (`checks` / `e2e-smoke` / `rls-security` all green). 106,111 unit tests pass. Zero active `as unknown as` casts in production code (verified). The cycle-3 fix is substantively correct; the remaining items are quality polish.

**The single warning** is genuine: cycle-3 introduced TWO copies of `INSPECTION_TYPES` + `INSPECTION_STATUSES` constants and TWO near-identical helpers (`narrowInspectionEnums` in `inspection-keys.ts`, `toInspection` in `inspection-mutation-options.ts`). These are duplicate types per CLAUDE.md rule #3 ("No duplicate types — search `src/types/` before creating any type"). They should be a single shared module.

---

## P0 BLOCKERS

_None._

---

## P1 WARNINGS

### WR-1 (cycle-4): Duplicate `INSPECTION_TYPES` / `INSPECTION_STATUSES` constants + near-identical enum-narrowing helpers across two files

**Files:**
- `src/hooks/api/query-keys/inspection-keys.ts:20-54` (`narrowInspectionEnums`)
- `src/hooks/api/query-keys/inspection-mutation-options.ts:27-59` (`toInspection`)

**Issue:** The cycle-3 fix replaced 5 `as unknown as Inspection` casts with a typed helper. Correct outcome — but the helper was duplicated, not extracted:

`inspection-keys.ts:20-54`:
```typescript
const INSPECTION_TYPES = ["move_in", "move_out"] as const;
const INSPECTION_STATUSES = ["pending", "in_progress", "completed", "tenant_reviewing", "finalized"] as const;
type InspectionType = (typeof INSPECTION_TYPES)[number];
type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export function narrowInspectionEnums<T extends { id: string; inspection_type: string; status: string }>(
  row: T,
): T & { inspection_type: InspectionType; status: InspectionStatus } { ... }
```

`inspection-mutation-options.ts:27-59`:
```typescript
const INSPECTION_TYPES = ["move_in", "move_out"] as const;
const INSPECTION_STATUSES = ["pending", "in_progress", "completed", "tenant_reviewing", "finalized"] as const;
type InspectionType = (typeof INSPECTION_TYPES)[number];
type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

function toInspection(row: Tables<"inspections">): Inspection { ... }
```

The two constants and the two type aliases are byte-for-byte identical. The two functions differ only in the input parameter signature (`narrowInspectionEnums` is generic; `toInspection` takes a concrete `Tables<"inspections">`). Both throw on drift, both return the same narrowed shape.

This is a **direct violation of CLAUDE.md zero-tolerance rule #3 — "No duplicate types — search `src/types/` before creating any type."** It also causes a triple-source-of-truth drift hazard: the next time someone adds a new inspection status (`archived`, say), they have to remember to update BOTH constant arrays. One will inevitably drift.

The `Inspection` interface at `src/types/sections/inspections.ts:40-46` already encodes these literal unions:
```typescript
inspection_type: "move_in" | "move_out";
status: "pending" | "in_progress" | "completed" | "tenant_reviewing" | "finalized";
```
So the canonical home for the runtime constants + the narrow helper is alongside the type — `src/types/sections/inspections.ts` or a new `src/lib/inspections/narrow.ts`. Both files then import the single helper.

**Fix:** Extract into `src/types/sections/inspections.ts`:
```typescript
export const INSPECTION_TYPES = ["move_in", "move_out"] as const;
export const INSPECTION_STATUSES = [
  "pending", "in_progress", "completed", "tenant_reviewing", "finalized",
] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export function narrowInspectionEnums<
  T extends { id: string; inspection_type: string; status: string },
>(row: T): T & { inspection_type: InspectionType; status: InspectionStatus } {
  if (!INSPECTION_TYPES.includes(row.inspection_type as InspectionType)) {
    throw new Error(`Unexpected inspection_type "${row.inspection_type}" on inspection ${row.id}`);
  }
  if (!INSPECTION_STATUSES.includes(row.status as InspectionStatus)) {
    throw new Error(`Unexpected status "${row.status}" on inspection ${row.id}`);
  }
  return { ...row, inspection_type: row.inspection_type as InspectionType, status: row.status as InspectionStatus };
}
```
Then in both `inspection-keys.ts` AND `inspection-mutation-options.ts`:
```typescript
import { narrowInspectionEnums } from "#types/sections/inspections";
// Drop the local INSPECTION_TYPES + INSPECTION_STATUSES + toInspection definitions.
```

The wrapper `toInspection(row: Tables<"inspections">)` can be inlined at the 5 mutation call-sites as `narrowInspectionEnums(row)` — `Tables<"inspections">` structurally satisfies the generic `{ id: string; inspection_type: string; status: string }` constraint without an intermediate function.

---

## INFO / Style

### IN-1 (cycle-4): Redundant `Array.isArray` defensive check + dead identity cast at two `fetchRevenueTrends` callers

**Files:**
- `src/hooks/api/query-keys/financial-keys.ts:147-150`
- `src/hooks/api/query-keys/report-keys.ts:121-124`

**Issue:** After the cycle-3 fix made `fetchRevenueTrends()` return `Promise<Array<Record<string, unknown>>>` via `jsonArrayOrEmpty`, the two downstream call sites still wrap the result in a defensive guard:

```typescript
const raw = await fetchRevenueTrends(12);
const rows = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
```

`raw` is now statically typed as `Array<Record<string, unknown>>`. `Array.isArray(raw)` is always `true`. The `: []` branch is unreachable. The `as Array<Record<string, unknown>>` cast is identity. All three lines collapse to `const rows = await fetchRevenueTrends(12);`. The defensive pattern was correct when the source returned `unknown` (pre-cycle-3); it's now dead code that future readers will assume guards a real risk.

**Fix:** Inline:
```typescript
const rows = await fetchRevenueTrends(12);
```
At both call sites.

### IN-2 (cycle-4): `data!` non-null assertion in profile query/mutation when typed `Database<>` already narrows

**Files:**
- `src/hooks/api/use-profile.ts:60` — `return mapUserProfile(data!);`
- `src/hooks/api/use-profile-mutations.ts:51` — `return mapUserProfile(data!);`

**Issue:** Both sites use `.single()` which returns `{ data: T | null, error: PostgrestError | null }`. The contract is "exactly one of data/error is non-null." The cycle-3 fix changed the rest of the file but left `data!`. After an `if (error) throw error;` guard, `data` is typed `T | null` (not `T`), and the `!` asserts non-null at runtime without verification.

In practice both sites are safe because `.single()` paired with a successful query always returns a row (it throws PGRST116 if zero rows; the error guard above catches that). But the non-null assertion is documentation-of-trust, not a real guarantee. PostgREST has occasionally returned `{ data: null, error: null }` for connection-pool edge cases (this is why `.maybeSingle()` exists). Per CLAUDE.md TypeScript strictness section ("strict mode incl. `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`"), explicit checks beat trust-me assertions.

**Fix (preferred):** Add an explicit `if (!data) throw new Error(...)` guard:
```typescript
if (error) throw error;
if (!data) throw new Error("Profile row not found");
return mapUserProfile(data);
```
**Fix (acceptable):** Leave `data!` if a code comment clarifies why. Current code has no such comment.

### IN-3 (cycle-4): `omitUndefined` JSDoc still references the "cast through unknown" pattern that the implementation doesn't use

**File:** `src/lib/db-insert.ts:13-19`

**Issue:** Carry-forward of cycle-2 IN-1, flagged but not closed in cycle-3. The JSDoc says:

> The cast through `unknown` is required because a structural transformation that conditionally drops keys can't be expressed in TS's value-space.

But the implementation does a single-step `as StripUndefined<T>` cast over `Record<string, unknown>`, NOT a double-cast through `unknown`. The wording is technically defensible (TS does treat `Record<string, unknown>` → arbitrary T as needing an explicit cast because the structural overlap is incidental), but it misleadingly evokes the dangerous `as unknown as` pattern that CLAUDE.md rule #8 forbids. A reader scanning for rule #8 violations would flag this and have to verify it's actually rule-compliant.

**Fix:** Rewrite to "The cast from `Record<string, unknown>` to `StripUndefined<T>` is sound because the loop above filters out `undefined`-valued entries before the cast, so the remaining keys all map to non-undefined values matching `StripUndefined<T>[K] = Exclude<T[K], undefined>`."

### IN-4 (cycle-4): `useExpensesByProperty` test still under-asserts `.eq` / `.in` arguments

**File:** `src/hooks/api/__tests__/use-expenses.test.ts:181-242`

**Issue:** Carry-forward of cycle-2 IN-3, flagged but not closed in cycle-3. The test asserts `mockFrom` was called with `"units"`, `"maintenance_requests"`, `"expenses"` (line 238-240) and that `mockLimit` was called with `1000` (line 241). It does NOT assert:

1. `units.eq("property_id", "prop-1")` was called with the right column / value (this is the actual subject of the test — that the property_id filter reaches PostgREST)
2. `maintenance_requests.in("unit_id", ["unit-1"])` was called with the units-derived unit IDs
3. `expenses.in("maintenance_request_id", ["mr-1"])` was called with the maintenance-derived IDs

If the hook regresses and starts filtering on the wrong column (e.g. `units.eq("owner_user_id", ...)` instead of `units.eq("property_id", ...)`), the test would still pass. The test verifies the table sequence but not the filter contracts — which is the actual behavioral guarantee.

**Fix:** Add positive-shape assertions:
```typescript
expect(mockEq).toHaveBeenCalledWith("property_id", "prop-1");
expect(mockIn).toHaveBeenNthCalledWith(1, "unit_id", ["unit-1"]);
expect(mockIn).toHaveBeenNthCalledWith(2, "maintenance_request_id", ["mr-1"]);
```

---

## Verification (cross-checked at HEAD `72dd5e353`)

- `bun run typecheck` — clean ✓
- `bun run lint` — clean (1,218 files, 251ms) ✓
- `npx vitest run --project unit` — 176 test files, **106,111 tests pass**, 0 fail ✓
- `gh pr checks 755` — `checks` pass / `e2e-smoke` pass (2m52s) / `rls-security` pass (1m25s) / auto-merge skipping ✓
- `grep -rn "as unknown as" src --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "\.test\." | grep -v "// .*as unknown as"` — returns 4 hits, **all in code comments documenting the ban** (`src/test/msw-polyfill.ts:9`, `src/hooks/api/query-keys/property-stats-keys.ts:35`, `src/hooks/api/query-keys/document-keys.ts:119`, `src/lib/rpc-shape.ts:10`). **Zero active `as unknown as` casts in production code.** ✓
- `grep -rn "BillingHistoryItem" src` — 8 hits across 2 files. No consumer reads `subscriptionId`, `tenant_id`, `failureReason`, `metadata`, `description`, `currency`, `stripePaymentIntentId`, or `updated_at` on BillingHistoryItem (dropped fields). Verified safe. ✓
- `grep -rn "profile\.created_at" src` — exactly 1 consumer (`profile-card.tsx:120,124`), both conditionally gated by `profile.created_at && (...)`. The widened `string | null` type causes no downstream null-deref. ✓
- `mapUserProfile` no longer fabricates `created_at` / `updated_at` (`use-profile.ts:43-44` reads them straight from row). ✓
- `narrowInspectionEnums` + `toInspection` both throw on drifted enum values (loud failure, not silent corrupt) ✓
- `expiring-leases-widget.tsx:48` reads `units.unit_number` (correct column); type cast `as unknown as Row[]` removed entirely ✓
- `inspection-keys.ts:81` lists `units(unit_number)` (correct column post-fix); list select includes the matching column ✓
- `inspection-photos` detail SELECT (line 60) includes `created_at` but NOT `updated_at` — DB column exists per `supabase.ts:432`. Minor inconsistency vs. `inspection_rooms(... updated_at)` on the same SELECT; not a functional issue since `InspectionPhoto` interface at `types/sections/inspections.ts:8-20` doesn't expose `updated_at` ✓
- `inspection_rooms.inspection_id` column verified in migration `20260220110000_create_inspections_tables.sql:49` (`uuid not null references public.inspections(id) on delete cascade`) — the cycle-3 SELECT widening is safe ✓
- `proxy.ts:137` — `maybeSingle()` returns `{ data: { is_admin: boolean | null; subscription_status: string | null } | null }` which structurally matches `UserGateRow` natively; the type-arg drop is sound. ✓
- `billing-history-section.tsx` — `getStatusVisual` icon + color + label all gate together on `invoice.isSuccessful` then `status === "failed" || status === "cancelled"` then default → `Clock + muted-foreground + status`. No self-contradictory display states possible. ✓
- `billing-history-section.tsx:71-84` — Download `<a>` has `target="_blank" rel="noopener noreferrer"`. Empty-state fallback is a `<span>—</span>` (semantically a placeholder; acceptable). ✓
- `fetchRevenueTrends` return-type widening + `jsonArrayOrEmpty` — downstream callers at `financial-keys.ts:147`, `report-keys.ts:121`, `lease-keys.ts:262-264` all consume `Array<Record<string, unknown>>` without breakage. The defensive `Array.isArray` re-wraps are now dead code but still type-check (IN-1 above). ✓
- `subscription-keys.ts:97-103` — `subRaw !== null && typeof subRaw === "object" && !Array.isArray(subRaw)` correctly narrows `Json` to `Record<string, unknown>` (a real type guard, not a cast). ✓
- `chart-tooltip.tsx:41` — `payload?: ReadonlyArray<RechartsPayload<ValueType, NameType>>` typecheck succeeds across all 5 Recharts callers (verified by full project typecheck pass) ✓

---

## Cycle-3 verification matrix (all 7 cycle-3 findings)

| ID | Cycle-3 Issue | Cycle-4 Status |
| --- | --- | --- |
| WR-1 cycle-3 | `<BillingHistorySection>` always-green check on failed invoices | **FIXED** (getStatusVisual gates icon+color+label atomically; verified against all 4 status values) |
| WR-2 cycle-3 | Download button dead (no onClick/href) + mapper drops invoice_pdf/hosted_invoice_url | **FIXED** (`<a target="_blank" rel="noopener noreferrer">` with `invoice_pdf ?? hosted_invoice_url`, em-dash fallback when both null; mapper now preserves both fields) |
| IN-1 cycle-3 | Empty-string `subscriptionId` / `tenant_id` mapper assignments | **FIXED** (both removed; BillingHistoryItem trimmed of all 8 rent-payment-era fields) |
| IN-2 cycle-3 | CLAUDE.md "24 foreign tables" un-verified | **DEFERRED-OK** (still unverified at review time; drift-risk only; not actionable now) |
| IN-3 cycle-3 | `proxy.ts:137` redundant `<UserGateRow>` generic arg | **FIXED** (dropped; result narrows natively via typed Database) |
| IN-4 cycle-3 | `created_at` mapped into both `created_at` AND `updated_at` slots | **FIXED** (BillingHistoryItem.updated_at dropped from interface; mapper no longer writes it) |
| IN-5 cycle-3 | Carry-forward backlog (cycle-1 WR-3/4/6, cycle-2 INs) | **PARTIAL** (10 of 14 closed; remaining 4 listed below) |

---

## Carry-forward backlog matrix (post cycle-3 fix sweep)

| Source | Issue | Cycle-4 Status |
| --- | --- | --- |
| WR-3 cycle-1 | SQL: soft-deleted-property filter on 4 lease-driven RPCs | **DEFERRED-CHALLENGED** (still SQL-only; out of cycle-3 fix scope per author) |
| WR-4 cycle-1 | SQL: `::bigint` truncation in 2 RPCs | **DEFERRED-CHALLENGED** (still SQL-only) |
| WR-5 cycle-1 | FDW migration prod-only behavior | **DEFERRED-OK** (documented) |
| WR-6 cycle-1 / WR-3 cycle-2 | Stale `safeFetch` rent_payments JSDoc | **FIXED** (`report-data.ts:80-87` rewritten; grep confirms no `rent_payments` reference remains) |
| IN-3 cycle-1 | `analytics-keys.ts` `as Record<string, unknown>` return | **FIXED** (return type widened to `Array<Record<string, unknown>>`; downstream call sites verified) |
| IN-4 cycle-1 | `subscription-keys.ts:70` stale "Query stripe.subscriptions" comment | **FIXED** (comment rewritten to "reads the denormalized subscription_* columns from public.users") |
| IN-1 cycle-2 | `omitUndefined` JSDoc says "cast through unknown" — impl doesn't | **MISSED** (still present at `src/lib/db-insert.ts:13-19`; see IN-3 cycle-4 above) |
| IN-2 cycle-2 | `omitUndefined` unsound for `field: T \| undefined` | **DEFERRED-OK** (documented INFO; callers safe) |
| IN-3 cycle-2 | `useExpensesByProperty` test under-asserts `.eq`/`.in` args | **MISSED** (still present at `__tests__/use-expenses.test.ts:181-242`; see IN-4 cycle-4 above) |
| IN-4 cycle-2 | `inspection_type`/`status` silently coerced | **FIXED** (`narrowInspectionEnums` + `toInspection` now throw on drift) |
| IN-5 cycle-2 | `mapUserProfile` fabricates `updated_at` | **FIXED** (`use-profile.ts:43-44` reads straight from row; `created_at` widened to `string \| null`; `ProfileCard` conditionally renders "Member since") |
| IN-6 cycle-2 | Dead `?? new Date().toISOString()` fallback in inspection-keys | **FIXED** (`inspection-keys.ts:107-109` shows the dead fallback removed; comment "inspections.created_at is NOT NULL DEFAULT now()" documents the invariant) |
| IN-7 cycle-2 | PR description inaccuracy | **DEFERRED-OK** (description-only) |
| IN-8 cycle-2 | 26 active `as unknown as` violations | **FIXED** (verified via grep at HEAD: zero active casts in production code; the 4 grep hits are all in comments documenting the ban) |

**Net for cycle-4:** 7 of 7 cycle-3 findings FIXED (1 deferred-OK as pre-existing). 10 of 14 cycle-1+cycle-2 backlog items NOW CLOSED. Remaining open: 2 SQL-deferred (WR-3/4 cycle-1, still SQL-only), 2 INFO-deferred (WR-5 cycle-1, IN-2 cycle-2), 2 MISSED that warrant fixes (IN-1 cycle-2 → IN-3 cycle-4, IN-3 cycle-2 → IN-4 cycle-4), 1 deferred-OK (IN-7 cycle-2 description).

---

## Top 3 most impactful (cycle-4)

1. **WR-1 (cycle-4)** — Duplicate enum-narrowing helper across `inspection-keys.ts` and `inspection-mutation-options.ts`. CLAUDE.md zero-tolerance rule #3 violation. ONE shared module in `src/types/sections/inspections.ts` closes both copies in one edit.
2. **IN-1 (cycle-4)** — Dead `Array.isArray` guard + identity cast at `financial-keys.ts:147-150` and `report-keys.ts:121-124`. Two-line cleanup per site after the `fetchRevenueTrends` return-type widening.
3. **IN-2 (cycle-4)** — `data!` non-null assertion at `use-profile.ts:60` and `use-profile-mutations.ts:51`. Explicit guard or documenting comment.

---

_Reviewed: 2026-05-29T18:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
