# 29-01 Summary — BILL-06 (expenses.amount money-convention) + DATA-02 predicate

**Requirement:** BILL-06 — `expenses.amount` was `integer` (rounded cents), read inconsistently as cents/dollars. Fix the DB layer.

**Migrations (2, applied to prod, verified):**
- `20260708131702_bill06_expenses_amount_to_numeric` — `ALTER expenses.amount → numeric(10,2)`. Prod `expenses` empty (0 rows) → lossless. Verified: a 150.50 insert round-trips as 150.50 (rolled back).
- `20260708131721_bill06_data02_property_performance_analytics_numeric_and_status` — **DROP+CREATE** (return-type change bigint→numeric cannot use CREATE OR REPLACE): `SUM(e.amount)::bigint → ::numeric` (3 cast sites) + RETURNS TABLE `total_revenue`/`total_expenses`/`net_income` bigint→numeric, **and** DATA-02's `p.status <> 'inactive'` predicate on both property-scan CTEs (so Phase 30 doesn't re-recreate this fn). Verified live: 0 `bigint`, 2 status filters, all-numeric return signature, SECURITY DEFINER + search_path + auth.uid() guard preserved, grants re-issued (authenticated + service_role).

**db:types:** no regen needed — both `integer` and `numeric` (and `bigint`) map to TS `number` in the generated types (verified `expenses.amount: number` + `get_property_performance_analytics` Returns already `number`). typecheck 0.

**Coordination:** DATA-02's `get_property_performance_analytics` portion is satisfied here; Phase 30 still owns `get_property_performance_with_trends` (+ `_trends`) — must NOT re-recreate `_analytics`.

**Frontend readers:** the cents/dollars display fixes are 29-06 (separate plan).
