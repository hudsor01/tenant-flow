---
phase: 04-charts
plan: 01a
status: complete
completed: 2026-05-26
prod_migration_timestamp: "20260526203003"
---

# Plan 04-01a Summary — Database half (migration + MCP apply + types regen)

## What Shipped

5 tasks, all acceptance criteria met:

| Task | What it did | Verification |
|------|-------------|--------------|
| 1 | Add `Label` mock to `src/test/mocks/recharts.tsx` (Wave-0 prereq for Plan 04-03 donut tests) | KpiSparkline tests still pass (4/4); no `any` types; export grep matches once |
| 2 | Author `supabase/migrations/20260526203003_phase4_revenue_trend_6mo.sql` (577 lines, additive `CREATE OR REPLACE FUNCTION`) | 10/10 acceptance grep checks passed: auth guard preserved verbatim, search_path preserved, 5 existing CTEs preserved, new `month_series` + `ts_revenue_6mo` CTEs present, new `monthly_revenue_6mo` JSONB key + `cross join ts_revenue_6mo ts6` present, 0 destructive DDL, 2 grant execute statements |
| 3 | Apply migration to prod via `mcp__supabase__apply_migration` (name: `phase4_revenue_trend_6mo`) | `{"success":true}`; pg_proc shows function exists with `args: 'p_user_id uuid'`; smoke select returned `key_exists: true`, `array_length: 6`, sample `[{"month":"2025-12","value":0}...{"month":"2026-05","value":0}]` |
| 4 | Reconcile filename: `20260526200000_phase4_revenue_trend_6mo.sql` → `20260526203003_phase4_revenue_trend_6mo.sql` (prod-assigned) | `ls supabase/migrations/*phase4_revenue_trend_6mo.sql \| wc -l` returns 1 |
| 5 | Regenerate `src/types/supabase.ts` via MCP `generate_typescript_types` (fallback per `scripts/db-types.sh` since CLI was unauthorized) | 87,317 chars written; `git diff --stat` shows 5741 lines changed (2869 insertions, 2872 deletions); `bunx tsc --noEmit` exits 0 |

## MCP Apply Output

```json
{"success": true}
```

`mcp__supabase__list_migrations` entry:
```
{"version": "20260526203003", "name": "phase4_revenue_trend_6mo"}
```

## Smoke Test (Task 3 acceptance)

```sql
select jsonb_path_exists(
  get_dashboard_data_v2(<e2e-owner-a uuid>),
  '$.time_series.monthly_revenue_6mo'
) as key_exists,
jsonb_array_length(...) as array_length,
... as sample;
```

Result: `key_exists: true`, `array_length: 6`, sample:
```json
[
  {"month":"2025-12","value":0},
  {"month":"2026-01","value":0},
  {"month":"2026-02","value":0},
  {"month":"2026-03","value":0},
  {"month":"2026-04","value":0},
  {"month":"2026-05","value":0}
]
```

Owner A has no active leases on prod (zero values across all 6 months — honest empty state, NOT a fabrication). Shape conforms to `MonthlyRevenuePoint` contract: `{ month: 'YYYY-MM', value: <number> }`, sorted ascending by month_start. Last 6 calendar months ending at the current (partial) month per Open Question Q1 resolution.

## Files Changed (key-files.created/modified)

- `src/test/mocks/recharts.tsx` — extended with `Label` export (additive, 22 lines added)
- `supabase/migrations/20260526203003_phase4_revenue_trend_6mo.sql` — new (577 lines)
- `src/types/supabase.ts` — regenerated via MCP (5741 lines changed)

## Notes for Plan 04-01b

- The migration is applied to prod (verified via MCP smoke test). The boundary-mapper line `monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? []` will see real data.
- The new field's JSONB shape is `{ month: string; value: number }[]` (NOT `{ date, value }`). The 30d slice uses `date`; the 6mo slice uses `month`. Plan 04-01b's `MonthlyRevenuePoint` type must use `month`, not `date`.
- The `Label` mock is in place; Plan 04-03's donut tests can `import { Label } from "recharts"` without crashing at module resolution.
- `src/types/supabase.ts` is current. Plan 04-01b's type/boundary-mapper changes don't need another db:types run.

## Threat Model Outcomes

| Threat | Mitigated? | Evidence |
|--------|-----------|----------|
| T-04-01 cross-owner exfil | ✓ | Auth guard `if p_user_id != (select auth.uid()) then raise exception ...` preserved verbatim from cycle-10 (grep count: 1) |
| T-04-02 search_path attack | ✓ | `set search_path to 'public'` preserved on function declaration |
| T-04-03 migration replay | ✓ | Filename reconciled to prod timestamp `20260526203003`; exactly 1 file matches the pattern |
| T-04-04 shared-CTE leakage | ✓ | New `ts_revenue_6mo` CTE reads only from `all_leases` (already `where owner_user_id = p_user_id`); no new table scan |
| T-04-05 DoS via new aggregate | accept | 6 rows × ~1000 leases-per-owner = sub-millisecond at expected scale |
| T-04-SC supply chain | ✓ | Zero new packages installed; `git diff package.json bun.lock` returns nothing |

## Self-Check: PASSED
