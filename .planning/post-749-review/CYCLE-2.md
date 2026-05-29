---
phase: post-749-cleanup
reviewed: 2026-05-29T12:15:00Z
depth: deep
files_reviewed: 30
files_reviewed_list:
  - src/lib/supabase/client.ts
  - src/lib/db-insert.ts
  - src/lib/rpc-shape.ts
  - src/types/supabase.ts
  - src/hooks/api/query-keys/billing-keys.ts
  - src/hooks/api/use-billing.ts
  - src/hooks/api/use-owner-dashboard-financial.ts
  - src/hooks/api/use-owner-dashboard.ts
  - src/hooks/api/use-analytics.ts
  - src/hooks/api/use-profile.ts
  - src/hooks/api/use-inspection-room-mutations.ts
  - src/hooks/api/query-keys/property-keys.ts
  - src/hooks/api/query-keys/unit-keys.ts
  - src/hooks/api/query-keys/tenant-mutation-options.ts
  - src/hooks/api/query-keys/lease-mutation-options.ts
  - src/hooks/api/query-keys/maintenance-keys.ts
  - src/hooks/api/query-keys/expense-keys.ts
  - src/hooks/api/query-keys/inspection-mutation-options.ts
  - src/hooks/api/query-keys/inspection-keys.ts
  - src/hooks/api/query-keys/lease-keys.ts
  - src/hooks/api/query-keys/tenant-keys.ts
  - src/hooks/api/query-keys/document-search-keys.ts
  - src/hooks/api/query-keys/report-analytics-keys.ts
  - src/hooks/api/__tests__/use-expenses.test.ts
  - src/components/leases/wizard/lease-creation-wizard.tsx
  - src/components/maintenance/detail/add-expense-dialog.tsx
  - src/components/maintenance/kanban/maintenance-kanban.client.tsx
  - src/components/properties/bulk-import-config.ts
  - src/components/tenants/bulk-import-config.ts
  - src/components/units/bulk-import-config.ts
findings:
  critical: 1
  warning: 3
  info: 7
  total: 11
status: issues_found
---

# Post-#749 Cleanup Cycle-2 Review

**Scope:** PR #755 at HEAD `dba4d8dea`, fixing 12 findings from cycle-1.

**Verdict:** NEEDS-FIXES — one P0 surfaces a real display bug that the BL-1 fix activates (the rewritten billing-history RPC delivers dollars, but `<BillingHistorySection>` divides by 100 expecting cents — net effect $100 invoice displays as $1.00). Three P1 warnings cover real cycle-1 misses the PR description claimed to fix but didn't (CLAUDE.md WR-1 line unchanged; WR-6 stale `safeFetch` comment; the typed-Database fix only covers the browser client, leaving 5 createServerClient call sites and ~17 .from()/.rpc() consumers without the drift safety net). All cycle-1 P0 BLOCKERs are correctly fixed at the line cited; both new helpers (`omitUndefined`, `jsonObject`) are type-sound under `exactOptionalPropertyTypes`.

---

## P0 BLOCKERS

### BL-1: `<BillingHistorySection>` displays $100 invoice as $1.00 — BL-1-from-cycle-1 fix activates a latent currency-units bug in the consumer

**File:** `src/components/settings/sections/billing-history-section.tsx:46`
**Trigger:** `src/hooks/api/query-keys/billing-keys.ts:32-37` (the new mapper this PR introduced)

**Issue:** The PR rewrites `billingQueries.history()` to call `get_user_invoices` instead of the dropped `rent_payments` table. The RPC at `supabase/migrations/20260305120000_get_user_invoices_rpc.sql:34-35` explicitly converts cents → dollars at the RPC boundary:

```sql
(i.amount_due  / 100.0)::numeric AS amount_due,
(i.amount_paid / 100.0)::numeric AS amount_paid,
```

The new mapper stores those dollars directly into `BillingHistoryItem.amount`:

```typescript
const amount = Number(row.amount_paid ?? row.amount_due ?? 0);  // dollars
return {
  // ...
  amount,                                  // dollars
  formattedAmount: `$${amount.toFixed(2)}`,
  // ...
};
```

But `<BillingHistorySection>` line 46 was written for the original Stripe-cents convention and divides again:

```tsx
<span className="text-sm font-medium">
  ${(invoice.amount / 100).toFixed(2)}
</span>
```

Net result: a $100.00 invoice from Stripe → 10000 cents in `stripe.invoices.amount_paid` → 100.00 from RPC → 100.00 in `invoice.amount` → `(100.00 / 100).toFixed(2)` = **$1.00 displayed**.

This was latent before the PR (the old `from("rent_payments")` path always crashed before reaching the component), so it appears in production for the first time as the PR ships. CLAUDE.md mandates "All `amount` columns store **dollars** as `numeric(10,2)`. Convert to cents only at the Stripe API boundary." — by that convention the RPC return is correct, and the consumer's `/100` is the bug.

**Fix:** Pick one direction and apply consistently. Cleanest is to keep the mapper in dollars (it already is — matches CLAUDE.md) and remove the `/100` in the component. Three callsites — line 46 displays the amount, the only place it's read:

```tsx
// src/components/settings/sections/billing-history-section.tsx:46
- ${(invoice.amount / 100).toFixed(2)}
+ ${invoice.amount.toFixed(2)}
```

Or use the pre-formatted string the mapper already produces:

```tsx
- ${(invoice.amount / 100).toFixed(2)}
+ {invoice.formattedAmount}
```

The mapper field is already in the `BillingHistoryItem` shape (line 43 of billing-keys.ts) — switching to `formattedAmount` removes the cents/dollars ambiguity entirely.

---

## P1 WARNINGS

### WR-1: CLAUDE.md line 206 STILL claims "There is no `stripe.*` schema" — PR description claims to fix WR-1, file is unchanged

**File:** `CLAUDE.md:206`

**Issue:** PR description says: "CLAUDE.md — WR-1 fix: updated billing-storage paragraph to reflect Stripe FDW reality". The git diff for the PR shows zero changes to CLAUDE.md:

```
$ git diff 0a7bce8a1..HEAD -- CLAUDE.md
(empty)
```

The line still reads:

> "There is no `stripe.*` schema — the Stripe Sync direction was abandoned with the rent-payment pivot."

This directly contradicts the merged PR #753 which installed a 24-table `stripe.*` foreign-data-wrapper schema. Cycle-1 WR-1 flagged this exact contradiction. The PR description lists it as fixed; the artifact is not. Documentation drift on the merge train, per `feedback_perfect_pr_gate.md`.

**Fix:** Apply the WR-1 patch from cycle-1 (cycle-1.md:117). Verify with `git diff main..HEAD -- CLAUDE.md` showing the new paragraph.

---

### WR-2: Typed-Database fix only covers the browser client — `createServerClient` remains untyped at 4 call sites with ~17 active `.from()` / `.rpc()` consumers

**Files:**
- `src/lib/supabase/server.ts:13` (untyped — primary SSR surface)
- `src/lib/supabase/middleware.ts:28` (untyped)
- `src/app/actions/auth.ts:24` (untyped)
- `src/proxy.ts:120` (untyped)
- `src/app/auth/callback/route.ts:48` (✓ typed — the only one)

**Downstream consumers of the untyped `server.ts`** that issue `.from()` / `.rpc()` calls (drift risk preserved):
- `src/app/sitemap.ts:163` — `.from("blogs")`
- `src/app/feed.xml/route.ts:68` — `.from("blogs")`
- `src/app/blog/page.tsx:61,97,102,104` — `.from("blogs")`, `.rpc("get_blog_categories")`
- `src/app/blog/category/[category]/page.tsx:44,88` — `.rpc("get_blog_categories")`, `.from("blogs")`
- `src/app/(admin)/layout.tsx:27` — `.from("users")`
- `src/app/(admin)/admin/analytics/page.tsx:35,38,42` — three RPCs
- `src/components/blog/related-articles.tsx:32` — `.from("blogs")`
- `src/proxy.ts:132` — `.from("users")` with explicit `maybeSingle<UserGateRow>()` workaround

**Issue:** Cycle-1 BL-1 root-cause was: `createBrowserClient` was un-parameterized, so `.from("rent_payments")` against a dropped table resolved to `any` and compiled. The PR fixes the browser client. But the SSR side has the same class of drift risk and is untouched. If `users.is_admin` gets dropped or `blogs.published_at` gets renamed, all of the call sites above silently keep compiling. This is BL-1 in a different file.

**Fix:** Apply the same `<Database>` parameterization to all five `createServerClient` sites and the in-band `subClient` in `proxy.ts`. Same pattern as the browser fix:

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import type { Database } from "#types/supabase";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(/* ... */);
}
```

Repeat in `middleware.ts`, `proxy.ts`, `actions/auth.ts`. Drop the explicit `maybeSingle<UserGateRow>()` cast in `proxy.ts:136` once the generic provides the row type natively.

---

### WR-3: WR-6 from cycle-1 NOT fixed — `safeFetch` wrapper still has stale rent_payments comment in `report-data.ts`

**File:** `src/lib/reports/report-data.ts:80-87`

**Issue:** Cycle-1 WR-6 flagged: the `safeFetch` wrapper exists specifically to catch `relation "rent_payments" does not exist` and return a fallback. PR #754 repaired all 8 RPCs that produced that error. Comment is stale; fallback path is now dead code.

PR description does not list WR-6 as in scope, so this is a knowing carry-forward rather than a regression. But cycle-1 explicitly recommended either deleting the wrapper or rewriting the comment. Neither happened. Future engineers will see the wrapper and either (a) believe the underlying issue is unresolved, or (b) extend the wrapper to mask new bugs (the canonical "broken windows" risk).

**Fix:** Delete `safeFetch` and inline `queryClient.fetchQuery(options)` at the 5 callsites (`report-data.ts:367,372,377,382,499,597,602`). Or, if the wrapper is retained for defense-in-depth, rewrite the comment to "Defensive fallback retained while we monitor for residual rent_payments references in long-tail RPCs." Prefer deletion — the only fallback path was for a specific 12-day-old bug that's now resolved end-to-end.

---

## INFO / Style

### IN-1: `omitUndefined` JSDoc comment is internally inconsistent (says "cast through `unknown`", code doesn't)

**File:** `src/lib/db-insert.ts:14`

The comment on line 14 says: "The cast through `unknown` is required because a structural transformation that conditionally drops keys can't be expressed in TS's value-space".

But the actual code on line 29 is a single-step assertion: `return result as StripUndefined<T>` — NOT `as unknown as StripUndefined<T>`. The single cast works because the intermediate `result: Record<string, unknown>` is already structurally compatible with the target (via the homomorphic mapped type). Fix the comment to describe what the code actually does.

### IN-2: `omitUndefined` is type-unsound for `field: T | undefined` (non-optional slot, undefined-valued)

**File:** `src/lib/db-insert.ts:20-22`

`StripUndefined<{ baz: string | undefined }>` evaluates to `{ baz: string }` — required slot, no `undefined`. But at runtime, if `baz === undefined`, the resulting object has no `baz` key. If a caller passes the result somewhere that reads `result.baz`, TS says `string`, runtime says `undefined`.

For optional slots (`bar?: number`), homomorphic mapping preserves the `?` marker, so the type is sound. The unsoundness is only for `field: T | undefined` (required slot with explicit undefined). All current callers pipe straight into `.insert()` / `.update()` / `.rpc()`, where the runtime missing-key is benign. INFO only — flag for future readers.

**Fix (optional):** Constrain the input or the output. Cheapest is to document the contract: "Output type may overstate which keys are present at runtime when the input had `key: T | undefined`. Pass the result only to PostgREST or other shape-tolerant consumers."

### IN-3: `useExpensesByProperty` test asserts only that `from("units")` was called — doesn't validate `eq("property_id", "prop-1")` or `in("unit_id", ["unit-1"])`

**File:** `src/hooks/api/__tests__/use-expenses.test.ts:238-241`

The new test mocks the 3-step `units → maintenance_requests → expenses` chain correctly, but the assertions are:

```typescript
expect(mockFrom).toHaveBeenCalledWith("units");
expect(mockFrom).toHaveBeenCalledWith("maintenance_requests");
expect(mockFrom).toHaveBeenCalledWith("expenses");
expect(mockLimit).toHaveBeenCalledWith(1000);
```

A regression where the code calls `units.eq("owner_user_id", ...)` instead of `eq("property_id", ...)` would still pass. Add:

```typescript
expect(mockEq).toHaveBeenCalledWith("property_id", "prop-1");
expect(mockIn).toHaveBeenCalledWith("unit_id", ["unit-1"]);
expect(mockIn).toHaveBeenCalledWith("maintenance_request_id", ["mr-1"]);
```

### IN-4: Inspection list mapper silently coerces unexpected `inspection_type` to `"move_in"`

**File:** `src/hooks/api/query-keys/inspection-keys.ts:62-63`

```typescript
const inspectionType: "move_in" | "move_out" =
    row.inspection_type === "move_out" ? "move_out" : "move_in";
```

Today, the CHECK constraint enforces `(move_in, move_out)` so any value reaches this code is one of those two. But if the schema is widened (e.g., `move_in` / `move_out` / `renewal`), the new value silently displays as "move_in". The comment ("Fall back to "move_in" for any unexpected value rather than throwing") acknowledges this is intentional — but the trade-off is data corruption in display vs. a thrown row. Either narrow more aggressively (throw on unknown) or surface explicitly as a third literal `"unknown"`.

### IN-5: `mapUserProfile` fabricates `updated_at` instead of preserving null

**File:** `src/hooks/api/use-profile.ts:42-43`

`UserProfile.updated_at` is `string | null` (nullable). But the mapper does:

```typescript
updated_at: row.updated_at ?? new Date().toISOString(),
```

If the row genuinely has `updated_at === null`, the mapper fabricates "now" — making it look like the row was just touched. Since UserProfile already allows null, just pass through:

```typescript
updated_at: row.updated_at,
```

`created_at` is similar but the type is `created_at: string` (non-null) on UserProfile, so the fallback there is justified.

### IN-6: `inspection-keys.ts` `created_at ?? new Date().toISOString()` fallback is dead code

**File:** `src/hooks/api/query-keys/inspection-keys.ts:74`

`inspections.created_at` is `string` (non-null per `src/types/supabase.ts`). The `?? new Date().toISOString()` never fires. Remove it.

### IN-7: PR description mentions `src/hooks/api/use-profile-mutations.ts` was changed; git diff shows no changes

**File:** `src/hooks/api/use-profile-mutations.ts` (no change in this PR)

The PR description bullet "use-profile-mutations.ts — same mapper alignment" is inaccurate — the file was not touched. There's also a pre-existing `data as { phone: string | null }` cast on line 71 that — now that the Database generic is applied to the browser client — should be unnecessary. Worth a follow-up sweep.

### IN-8: Cycle-1 IN-2/IN-3/IN-4 not addressed — `as unknown as` still in `inspection-mutation-options.ts`, `lease-mutation-options.ts`, `tenant-mutation-options.ts`, `maintenance-keys.ts`, `inspection-keys.ts`

`grep -rn "as unknown as" src/` returns 18 active hits (excluding tests, comments, and `rpc-shape.ts`'s self-referential explanation). The PR introduced `jsonObject` and `omitUndefined` specifically to replace this banned pattern, but only swept `use-analytics.ts:60,139`. The mutation files still have:

- `src/hooks/api/query-keys/inspection-mutation-options.ts:41,57,91,107,129`
- `src/hooks/api/query-keys/lease-mutation-options.ts:77,106,158,182`
- `src/hooks/api/query-keys/tenant-mutation-options.ts:138`
- `src/hooks/api/query-keys/maintenance-keys.ts:86`
- `src/hooks/api/query-keys/inspection-keys.ts:53,57,98,158`

Each is a `created/updated as unknown as <DomainType>` after a PostgREST insert/update. With the Database generic now on the browser client, `data` from `.insert().select().single()` returns the row type directly — the cast is unnecessary and the type is already inferred correctly. Replace with a typed mapper function per CLAUDE.md Rule #8.

Out of scope for this PR per its scoping note, but the violation count is now visible and tractable — a one-day sweep would close it.

---

## Verification (cross-references against prod)

- `bun run typecheck` — exits 0 (clean)
- `bun run lint` — exits 0 (Biome clean, 1218 files)
- `bun run test:unit -- --run src/hooks/api/__tests__/use-expenses.test.ts` — 9/9 passing
- `src/types/supabase.ts` `document_template_definitions` entry matches `supabase/migrations/20260311200000_document_template_definitions.sql` (6 columns + unique constraint + 4 RLS policies + index) — schema regenerated cleanly
- `get_user_invoices` RPC body in `supabase/migrations/20260305120000_get_user_invoices_rpc.sql` confirms amounts are returned in DOLLARS after `/100.0` cast — corroborates BL-1 (cycle-2)
- `get_revenue_trends_optimized` RPC body in `supabase/migrations/20260528231201_repair_analytics_rpcs.sql:284-297` confirms return shape `{month, revenue, collections, outstanding}` — matches the new `RevenueTrendRow` interface
- `search_documents` RPC body in `supabase/migrations/20260426043911_v25_phase_63_search_documents_filter_extension.sql` has all 7 params defaulted to `null` — omitUndefined drops keys cleanly, RPC fills with defaults
- `maintenance_requests` Row in `supabase/types.ts` has `unit_id` but no `property_id` — the rewrite of `expenseQueries.byProperty()` to walk `units → maintenance_requests → expenses` is structurally correct
- `inspections.created_at` typed as `string` (non-null) — IN-6 confirmed dead-fallback
- `public.users.full_name` typed as `string`, `status` as `string`, `created_at`/`updated_at` as `string | null` — mapUserProfile signature is now aligned (was inverted before)
- `users.is_admin boolean` referenced in `proxy.ts:134` is real — `maybeSingle<UserGateRow>` would catch column rename if `<Database>` were applied (WR-2 fix would catch this for free)

---

## Cycle-1 verification matrix (all 12 findings)

| ID  | Cycle-1 Issue                                                              | Status   |
| --- | -------------------------------------------------------------------------- | -------- |
| BL-1 | `billing-keys.ts` queries dropped rent_payments — UI crash on /settings    | **FIXED** (but introduces cycle-2 BL-1 display bug — see above) |
| BL-2 | `useFinancialChartData` reads non-existent fields; `.sort()` throws       | **FIXED** (RPC shape now matches via `RevenueTrendRow`)         |
| WR-1 | CLAUDE.md still claims "no stripe.* schema"                                | **MISSED** (PR description claims fixed; git diff is empty)     |
| WR-2 | PR #752 migration comment "zero callers" is misleading                    | **MISSED** (migration comment unchanged — historical record)    |
| WR-3 | Lease-driven RPCs ignore soft-deleted properties                          | **DEFERRED** (SQL out of scope for this PR)                     |
| WR-4 | `::bigint` truncation in `get_revenue_trends_optimized`                   | **DEFERRED** (SQL out of scope for this PR)                     |
| WR-5 | FDW migration fragility on fresh-DB chain replay                          | **DEFERRED** (SQL out of scope for this PR)                     |
| WR-6 | `safeFetch` rationale comment is stale                                    | **MISSED** (PR description omits; flagged earlier — wrapper still in place with stale comment) |
| IN-1 | SQL function-length cap exceeded (5 functions)                            | **DEFERRED** (style; CLAUDE.md ambiguous on plpgsql)            |
| IN-2 | `as unknown as` in `use-analytics.ts:60,139`                              | **FIXED** (replaced with `jsonObjectOrEmpty` / `jsonObject`)    |
| IN-3 | `analytics-keys.ts:38` returns `as Record<string, unknown>`               | **MISSED** (still present at line 38)                           |
| IN-4 | `subscription-keys.ts:70,100` comment "Query stripe.subscriptions"        | **MISSED** (still present; comment still wrong about RPC source) |

**Net:** 3 FIXED, 4 MISSED (despite some being scoped), 5 DEFERRED.

---

## Top 3 most impactful (cycle-2)

1. **BL-1 (cycle-2)** — `<BillingHistorySection>` displays $100 as $1.00 in production once the BL-1 fix lands. One-line component fix or use `formattedAmount`. `billing-history-section.tsx:46`.
2. **WR-2** — Typed-Database fix only covers the browser client; 4 SSR createServerClient call sites and ~17 active consumers remain untyped. The same class of drift (BL-1's root cause) is still possible against `blogs`, `users`, and any RPC reachable from SSR. Apply `<Database>` to `src/lib/supabase/server.ts:13`, `middleware.ts:28`, `actions/auth.ts:24`, `proxy.ts:120`.
3. **WR-1** — CLAUDE.md is still factually wrong about stripe.* schema. PR description claims fixed; not fixed. One-line edit.

---

_Reviewed: 2026-05-29T12:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
