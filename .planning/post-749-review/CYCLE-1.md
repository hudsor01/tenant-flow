---
phase: post-749-cleanup
reviewed: 2026-05-28T22:30:00Z
depth: deep
files_reviewed: 12
files_reviewed_list:
  - supabase/migrations/20260528202741_drop_dead_stripe_schema.sql
  - supabase/migrations/20260528204818_drop_dead_rent_payment_functions.sql
  - supabase/migrations/20260528223546_install_stripe_wrapper.sql
  - supabase/migrations/20260528231201_repair_analytics_rpcs.sql
  - src/hooks/api/query-keys/billing-keys.ts
  - src/hooks/api/use-owner-dashboard-financial.ts
  - src/hooks/api/use-analytics.ts
  - src/hooks/api/query-keys/financial-keys.ts
  - src/hooks/api/query-keys/property-stats-keys.ts
  - src/hooks/api/query-keys/property-keys.ts
  - src/hooks/api/query-keys/analytics-keys.ts
  - src/hooks/api/query-keys/lease-keys.ts
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Post-#749 Cleanup Cycle-1 Review

**Scope:** PRs #751, #752, #753, #754 merged 2026-05-28.

**Verdict:** NEEDS-FIXES — 2 P0 BLOCKERs surfaced. One is a live UI crash that the PR #752 "audit" missed; the other is a 12-day-old shape-mismatch crash sitting in the financial dashboard chart that the cleanup PRs deliberately exercise (active rent-amount math now actually runs end-to-end, exposing the consumer bug). PR #754's 8-RPC rewrite itself is functionally correct against prod schema, but it shipped without sweeping the consumer surface for shape drift.

---

## P0 BLOCKERS

### BL-1: `billing-keys.ts` queries dropped `rent_payments` table — live UI crash on `/settings`

**File:** `src/hooks/api/query-keys/billing-keys.ts:74,99,140,175,213` (5 distinct `.from("rent_payments")` calls in 5 query factories)

**Issue:** PR #752's drop-dead-functions audit explicitly claimed "zero callers across `src/`" for the rent-payments path, but it only audited *function* references. The `billing-keys.ts` factory issues **direct PostgREST `.from("rent_payments")` queries** in 5 places. The `rent_payments` table was dropped in `20260418140000_demolish_rent_and_tenant_portal` weeks ago. `billingQueries.history()` is consumed by `useBillingHistory()` → `<BillingHistorySection>` → `<BillingSettings>` at `/settings`. PostgREST will return `404 relation "rent_payments" does not exist`, which `handlePostgrestError(error, "rent_payments")` re-throws → React Query surfaces it → the billing settings panel breaks.

`billingQueries.invoices()` and `billingQueries.failed()` have an unused-export halo around the same bug (no live consumer, but still ship the dropped-table SQL).

Typecheck doesn't catch this because `src/lib/supabase/client.ts:4` calls `createBrowserClient(...)` **without the generated `Database` generic**, so `.from("rent_payments")` resolves to `any` and compiles fine. That's why CI passed.

**Fix:** Delete the `.from("rent_payments")` fallback bodies. For `history()`, either (a) drop the hook entirely and remove `<BillingHistorySection>` (the product is landlord-only — no rent collection happens), or (b) route through `get_user_invoices` RPC against `public.stripe_webhook_events` / Stripe Wrapper. For `invoices()` / `failed()` — both unused — delete them. Then parameterize `createBrowserClient<Database>(...)` so this class of drift is caught at typecheck.

```typescript
// src/lib/supabase/client.ts
import type { Database } from "#types/supabase";
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
```

---

### BL-2: `useFinancialChartData` reads `period`/`expenses`/`netIncome` from `get_revenue_trends_optimized` — keys don't exist; `.sort()` throws TypeError

**File:** `src/hooks/api/use-owner-dashboard-financial.ts:60-68`

**Issue:** PR #754 preserves the RPC's return shape `[{ month, revenue, collections, outstanding }]` (verified line-for-line against `20251225130000_optimize_rpc_functions.sql`). The consumer asserts `data as FinancialMetrics[]` and immediately calls:

```typescript
const trimmed = (data as FinancialMetrics[])
  .sort((a, b) => a.period.localeCompare(b.period))  // a.period is undefined
  .slice(-months);
```

At runtime `a.period === undefined` because the RPC never emitted that key. `undefined.localeCompare(undefined)` throws `TypeError: Cannot read properties of undefined`. The `.map()` that follows reads `item.period`, `item.expenses`, `item.netIncome` — none of which exist either (chart's "Expenses" line silently goes flat at 0 even if the consumer survived sort).

The bug pre-exists PR #754 (introduced by Phase 4 PR #748 yesterday), but the cleanup cycle is the right moment to fix it because (a) `<ChartAreaInteractive>` mounts on `/properties/units` and `/analytics/overview` — both reachable from main dashboard nav, (b) PR #754 explicitly preserved the RPC shape to avoid breaking 13 callers, but this caller was already broken on shape.

**Fix:** Either rewrite the consumer to the actual RPC shape or add the missing fields to the RPC. The honest fix is to mirror the actual shape because the RPC is the canonical contract and 13 callers depend on it:

```typescript
interface RevenueTrendRow {
  month: string;        // 'YYYY-MM'
  revenue: number;
  collections: number;
  outstanding: number;
}
// ...
const trimmed = (data as RevenueTrendRow[])
  .sort((a, b) => a.month.localeCompare(b.month))
  .slice(-months);

return trimmed.map((item) => ({
  date: item.month,
  revenue: item.revenue ?? 0,
  // Expenses come from a different RPC. Either fetch them in parallel via
  // get_financial_overview / get_dashboard_data_v2 and merge, or set to 0.
  expenses: 0,
  profit: item.revenue ?? 0,
}));
```

If the chart genuinely needs per-month expenses, fold the `calculate_monthly_metrics` data in alongside (it already returns `{ month, revenue:0, expenses, net_income, cash_flow }` — note the `month` key matches).

---

## P1 WARNINGS

### WR-1: CLAUDE.md still claims "There is no `stripe.*` schema" — directly contradicts PR #753

**File:** `CLAUDE.md:206`

**Issue:** PR #751 updated CLAUDE.md to delete stale `stripe.subscriptions` / `stripe.invoices` claims and added the line "There is no `stripe.*` schema — the Stripe Sync direction was abandoned with the rent-payment pivot." Two hours later PR #753 installed the canonical Stripe FDW into `stripe.*` schema with 24 foreign tables. The line is now false. Per the user's MEMORY.md feedback `feedback_perfect_pr_gate.md`, documentation drift introduced inside the same merge train is a P1.

**Fix:** Replace the line with the new state:

```markdown
- Billing storage: `public.users` carries the denormalized billing fields (...). Subscription status reads from `users.subscription_status` directly. Webhooks land in `public.stripe_webhook_events` (90d retention, then archived). `stripe.*` is a **foreign-data-wrapper schema** (24 read-only foreign tables proxying the Stripe API via the `wrappers` extension — see `20260528223546_install_stripe_wrapper.sql`); for billing display, prefer the RPCs (`get_subscription_status`) over direct foreign-table reads to keep API-call volume bounded.
```

---

### WR-2: PR #752 audit claim "zero callers across `src/`" is materially false

**File:** `supabase/migrations/20260528204818_drop_dead_rent_payment_functions.sql:6-8`

**Issue:** The migration header asserts "These 4 functions ... were unambiguously dead: zero callers across src/, tests/, supabase/functions/. The only references in the frontend were the auto-generated entries in src/types/supabase.ts." That sentence is about the four *functions*, but the broader audit conclusion implied the `rent_payments` table itself had zero live consumers. It doesn't (see BL-1). The audit grep was too narrow. Trust in future "zero callers" claims is now degraded — flag for future reviewers that an audit narrative is not a substitute for a `grep -rn 'rent_payments\|upsert_rent_payment\|process_payment_intent_failed\|notify_n8n_payment_reminder\|notify_n8n_rent_payment'` sweep across the whole tree, plus a manual check of dynamically-typed Supabase calls.

**Fix:** Sequence the BL-1 fix in the same PR cycle as cleaning up this migration's misleading comment, or add a follow-up commit note. Update the historical migration comment if shipped before BL-1 lands.

---

### WR-3: `get_financial_overview` and `get_billing_insights` ignore soft-deleted properties

**File:** `supabase/migrations/20260528231201_repair_analytics_rpcs.sql:57-60,69-74,190-193`

**Issue:** CLAUDE.md mandates `filter .neq('status', 'inactive')` for soft-deleted properties. The dashboard RPC `get_dashboard_data_v2` honors this. The four lease-driven aggregations in this PR (lines 57-60 MRR, 65-69 active/expired counts, 71-74 tenant count, 190-193 total_revenue) join `leases` directly without going through `properties`, so they cannot filter on `properties.status`. A property that's soft-deleted may still have an `active` lease (the demolish flow doesn't cascade lease status), so MRR / total revenue / tenant counts include zombie leases.

Same issue in `get_revenue_trends_optimized` (lines 277-282).

This pre-exists PR #754 (the original RPCs had the same gap), but #754 was the rewrite opportunity and didn't take it.

**Fix:** Add a property-join + status filter in each lease scan:

```sql
SELECT coalesce(sum(l.rent_amount), 0) INTO v_mrr
FROM leases l
JOIN public.units u ON u.id = l.unit_id
JOIN public.properties p ON p.id = u.property_id
WHERE l.owner_user_id = owner_id_param
  AND l.lease_status = 'active'
  AND p.status <> 'inactive';
```

---

### WR-4: `get_revenue_trends_optimized` casts `numeric(10,2)` rent_amount → `bigint`, truncating cents

**File:** `supabase/migrations/20260528231201_repair_analytics_rpcs.sql:275`

**Issue:** `coalesce(sum(l.rent_amount), 0)::bigint AS expected_revenue` — `leases.rent_amount` is `numeric(10,2)` (dollars). Casting an aggregate sum to bigint truncates the fractional part. For a 12-property portfolio at $1,500.50 each, the monthly bucket reports $18,006 instead of $18,006.00 (8 cents lost). Over a full year and many leases this accumulates. The original RPC had the same bug; #754 preserved it. CLAUDE.md "All `amount` columns store **dollars** as `numeric(10,2)`" implies the truncation is wrong.

**Fix:** Drop the `::bigint` cast; return `numeric`. Also fix the TS RPC return type (`expected_revenue: number` in the `Returns: Json` blob — no schema change to `supabase.ts` needed).

```sql
coalesce(sum(l.rent_amount), 0) AS expected_revenue
-- (drop ::bigint, drop ::bigint everywhere in monthly_expected CTE)
```

Same `::bigint` truncation present in `get_property_performance_analytics:376` (`SUM(e.amount)::bigint`) and the RETURNS TABLE signatures for both `_analytics` and `_with_trends` (`total_revenue bigint` / `previous_revenue bigint`). That's a return-type change — escalate or scope explicitly.

---

### WR-5: Stripe FDW migration would fail on fresh-DB chain replay

**File:** `supabase/migrations/20260528223546_install_stripe_wrapper.sql:48-57`

**Issue:** The migration hard-codes `api_key_id '0d1551ab-1294-4e9d-9315-d4e2ebc25228'` — a Vault UUID that only exists in the prod project. The `if not exists` guard checks `pg_foreign_server`, not the Vault entry. On a fresh project (CI staging, dev branch DB, future replication target), `create server stripe_server ... options (api_key_id '...')` will fail with "vault secret not found". The header even acknowledges "This migration was applied via Supabase MCP `apply_migration` ahead of this commit" — i.e. prod-only.

Same fragility: `extensions.stripe_fdw_handler` / `stripe_fdw_validator` depend on `extensions.wrappers >= 0.6.1` being preinstalled. No `create extension if not exists wrappers` guard at the top.

**Fix:** Either (a) guard the whole DO blocks behind `if exists (select 1 from vault.secrets where id = '0d1551ab-...')` so non-prod replays no-op cleanly, or (b) document at the top of the migration "PROD-ONLY — chain replay on fresh DBs is non-functional and intentional; this is registered in `schema_migrations` so replay skips re-applying." Option (a) is the canonical pattern; (b) is current behavior.

---

### WR-6: `report-data.ts` `safeFetch` rationale comment is now stale

**File:** `src/lib/reports/report-data.ts:80-87`

**Issue:** The `safeFetch` wrapper exists specifically to catch `relation "rent_payments" does not exist` and return a fallback. PR #754 just repaired all 8 RPCs that produced that error. The comment is stale and the fallback path is dead code (no RPC in prod will hit `isMissingRelationError(err) === true` anymore). Risk: future engineers see the wrapper and assume the underlying issue is unresolved, or extend the wrapper to mask new bugs.

**Fix:** Either delete `safeFetch` and inline `queryClient.fetchQuery(options)` at the 5-ish callsites, or leave the wrapper but rewrite the comment to "Defensive fallback retained while we monitor for residual rent_payments references in long-tail RPCs." Strongly prefer deletion.

---

## INFO / Style

### IN-1: SQL function-length cap is exceeded (3 functions > 50 lines)

`get_billing_insights` 63 lines, `get_financial_overview` 65, `get_revenue_trends_optimized` 58, `get_property_performance_analytics` 95, `get_property_performance_with_trends` 60. CLAUDE.md's 50-line cap reads as a TS/React rule under "Architecture Rules", not SQL plpgsql, but worth a sanity-check that we accept this. No action recommended.

### IN-2: `as unknown as` violations remain in `use-analytics.ts:60,139`

Pre-existing Phase 4 leftovers (`(data ?? {}) as unknown as LeaseAnalyticsPageData`). Out of scope for #754 but visible while reviewing. Add to a "drift sweep" backlog. Best fix is a typed `mapLeaseAnalyticsPageData(raw: Record<string, unknown>): LeaseAnalyticsPageData` boundary mapper.

### IN-3: `analytics-keys.ts:38` returns `as Record<string, unknown>` for a jsonb-array RPC

`fetchRevenueTrends` types `data` as `Record<string, unknown>` but the RPC returns a jsonb array. Pre-existing. Downstream consumers (`use-analytics.ts:60`) get type pollution as a result. Fix as part of the same type-cleanup pass as BL-2.

### IN-4: `subscription-keys.ts:70,100` comment "Query stripe.subscriptions" is misleading

The actual RPC `get_subscription_status` reads `public.users.subscription_*` columns; the `stripe.subscriptions` reference in the comment dates from the abandoned Stripe Sync direction. Pre-existing. Update once when convenient.

---

## Verification notes (what I checked against prod)

- `supabase.ts` no longer lists `upsert_rent_payment`, `process_payment_intent_failed`, `notify_n8n_payment_reminder`, `notify_n8n_rent_payment`. ✓
- `supabase.ts` no longer has a `rent_payments` Tables entry. ✓
- All 8 analytics RPC signatures in the migration match the generated TS Args / Returns shapes:
  - `get_billing_insights(owner_id_param: uuid, start_date_param?, end_date_param?) → jsonb` ✓
  - `get_invoice_statistics(p_user_id: uuid) → jsonb` ✓
  - `calculate_monthly_metrics(p_user_id: uuid) → jsonb` ✓
  - `get_financial_overview(p_user_id: uuid) → jsonb` ✓
  - `get_revenue_trends_optimized(p_user_id: uuid, p_months?: int) → jsonb` ✓
  - `get_property_performance_analytics(p_user_id, p_property_id?, p_timeframe?, p_limit?) → TABLE(7 cols)` ✓
  - `get_property_performance_trends(p_user_id) → jsonb` ✓
  - `get_property_performance_with_trends(p_user_id, p_timeframe?, p_limit?) → TABLE(7 cols)` ✓
- `public.leases` schema verified: `rent_amount numeric(10,2)`, `lease_status` text with CHECK `(draft, pending_signature, active, ended, terminated, expired)`, `owner_user_id`, `primary_tenant_id`, `start_date`, `end_date` all present ✓
- `public.expenses` has `amount`, `status`, `expense_date`, `maintenance_request_id` ✓
- `public.maintenance_requests` has `owner_user_id` and `unit_id` ✓
- All 8 functions enforce `IF p_user_id != (SELECT auth.uid()) THEN RAISE EXCEPTION 'Access denied: cannot request data for another user'` — matches canonical pattern from `20260524012602` ✓
- All 8 set `SET search_path TO 'public'` ✓
- `extensions.stripe_fdw_handler` / `stripe_fdw_validator` exist per `wrappers >= 0.6.1` — verified in `20260528223546` header ✓
- `STRIPE_API_VERSION = '2026-03-25.dahlia'` in `supabase/functions/_shared/stripe-client.ts:8` matches FDW `api_version` ✓
- `bun run typecheck` exits 0 — but as noted in BL-1, that's because the Supabase client isn't `Database`-parameterized
- Chain replay order: `20260528202741` (drop stripe.*) → `20260528204818` (drop dead funcs) → `20260528223546` (install FDW) → `20260528231201` (repair RPCs). Drop-then-create on `stripe.*` schema is correct sequencing ✓

---

## Top 3 most impactful

1. **BL-1** — Settings billing-history panel will crash for every authenticated user. Fix `billing-keys.ts:74,99,140,175,213` and parameterize `createBrowserClient<Database>` to prevent recurrence.
2. **BL-2** — Dashboard chart at `/properties/units` and `/analytics/overview` throws `TypeError: undefined.localeCompare` on first render. Fix `use-owner-dashboard-financial.ts:60-68` to use the actual RPC shape.
3. **WR-1** — CLAUDE.md line 206 says "There is no `stripe.*` schema" two hours after PR #753 created it. One-line edit.

---

_Reviewed: 2026-05-28T22:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
