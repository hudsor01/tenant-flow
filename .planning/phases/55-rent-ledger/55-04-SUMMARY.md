---
phase: 55-rent-ledger
plan: 04
wave: 2
status: complete
requirements: [LEDGER-01, LEDGER-04, LEDGER-06, LEDGER-07, LEDGER-08]
---

# Plan 55-04 Summary — [BLOCKING GATE] Apply ledger migrations to prod + regenerate types

## What was done

The four ledger migrations from 55-01/55-02 are live in production, repo filenames are
reconciled to their prod-assigned timestamps, and `src/types/supabase.ts` is regenerated
from the live database.

### Pre-flight (read-only)

Confirmed prod was a clean slate before touching anything — `rent_charges`, `rent_receipts`,
`leases.ledger_start_date`, and `generate_rent_charges` all absent (no partial prior apply).
Legacy `public.rent_due` confirmed already gone (demolition intact; nothing revived).

Confirmed the load-bearing money fact against live prod: `leases.rent_amount` is **integer**
(D-00 holds). 14 leases, rent 1000–2200 — integer dollars, not cents.

Captured a **before** baseline of `get_revenue_trends_optimized` for the owner with the most
leases, so the one in-place function replacement could be regression-checked:
`[{2026-07, revenue 0, collections 0, outstanding 0}, {2026-06, …}, {2026-05, …}]`.

Verified the replacement was signature-compatible: prod identity args `p_user_id uuid,
p_months integer` returning `jsonb` SECURITY DEFINER — identical to the migration, so
`CREATE OR REPLACE` preserved existing grants.

### ASCII normalization (added step, commit `4ad3a0948`)

`apply_migration` requires model-emitted SQL, which can silently corrupt non-ASCII source
(the edge-deploy-mcp-fidelity trap). The four migrations carried 44 em-dashes (U+2014) in
comments and in `comment on …` strings that persist into prod. All 44 were confined to
comments/string literals — zero in executable SQL — and were replaced with ASCII hyphens.
No new `--` sequences introduced; all four files verified 0 non-ASCII bytes.

### Apply + reconcile (commit `882186581`)

Applied in timestamp order via Supabase MCP `apply_migration` (never `supabase db push` —
the CLI 401s here). MCP assigned its own versions, so filenames were reconciled via `git mv`:

| Repo (before) | Prod version (after) | Migration |
|---|---|---|
| 20260724140000 | **20260725020925** | rent_ledger_schema |
| 20260724140100 | **20260725020952** | rent_charges_generation_cron |
| 20260724140200 | **20260725021100** | rent_ledger_rpcs |
| 20260724140300 | **20260725021124** | revenue_collected_integration |

### Types regenerated (commit `0cc86c0ae`)

`bun run db:types` could not run — the Supabase PAT is stale (`supabase projects list`
returns Unauthorized). The script failed **atomically** and left `src/types/supabase.ts`
untouched, as designed. Regenerated via the MCP `generate_typescript_types` tool, the
fallback named by `scripts/db-types.sh` itself.

The tool output was written to disk by the harness and copied programmatically — **not**
re-emitted through the model — so there is no transcription risk.

Diff against the previous file: **zero removals**, 163 added lines, all ledger types. One
real generator difference surfaced: MCP omits the `graphql_public` schema block the CLI
emits. Nothing in `src/` or `tests/` references it, but it was restored verbatim to keep
parity with canonical `db:types` output and avoid spurious churn on the next run.

## Live verification

| Check | Result |
|---|---|
| `list_migrations` shows all four applied | ✅ 4/4, reconciled to repo |
| Tables / ledger column | ✅ `rent_charges`, `rent_receipts`, `leases.ledger_start_date` |
| Functions | ✅ 7 (generator + 6 RPCs) |
| RLS enabled + policies | ✅ 2 tables RLS-enabled, 4 policies (SELECT+INSERT only, no UPDATE/DELETE) |
| Append-only triggers | ✅ 2 (`rent_charges_no_mutate`, `rent_receipts_no_mutate`) |
| Partial unique index | ✅ `uq_rent_charges_lease_period_rent` |
| Cron job | ✅ `generate-rent-charges` at `0 5 * * *` (clear of the 3 AM cleanup cluster and 06:00/06:30 reminders) |
| **Money boundary (deployed-body audit)** | ✅ `generate_rent_charges` contains the single `rent_amount::numeric(10,2)`; **zero** `*100` / `/100` / `formatCents` across all four deployed money functions |
| 5-day grace | ✅ `interval '5 days'` present in `get_lease_ledger_summary` |
| SECURITY DEFINER + search_path | ✅ all audited functions |
| **Revenue regression** | ✅ `get_revenue_trends_optimized` output **byte-identical** to the pre-change baseline (receipts empty ⇒ `collections` still 0) |
| Generator on real data | ✅ returns 0 twice (idempotent); 0 rows written; no lease onboarded yet |
| `validate:quick` | ✅ 295 files / 107,312 tests, typecheck + lint clean |

### The false-positive this gate caught

Regenerating types made `ledger_start_date` required on the `leases` Row type, breaking six
`Lease`-typed test fixtures. Without regeneration, `typecheck` and `next build` would have
passed against stale types — exactly the false-positive state the plan warned about. Fixed by
adding `ledger_start_date: null` to each fixture.

## Deferred — not proven here

**The live dollar-exact assertion (a real generated charge equals `rent_amount`) was not
executed.** Two independent reasons:

1. All 14 prod leases are `lease_status = 'draft'` and none are onboarded
   (`ledger_start_date` all NULL), so `generate_rent_charges()` correctly produces 0 rows —
   there is no eligible real lease to assert against, and mutating a real lease's status to
   manufacture one was rejected.
2. The RLS integration suites (`rent-ledger-isolation`, `-append-only`, `-generation`) — the
   purpose-built venue that creates its own test lease, generates, asserts dollar-exactness,
   and tears down — require `E2E_OWNER_EMAIL/PASSWORD` + `E2E_OWNER_B_*` and the Supabase app
   vars. Those are GitHub secrets not present locally (`.env.local` holds only
   `VERCEL_OIDC_TOKEN`, and that file is deliberately not modified).

**Resolution path:** `rls-security` is a required PR check and runs these suites in CI, where
the secrets exist. The money boundary is meanwhile defended by three independent layers that
did pass: the deployed-function-body audit above, the static money-guard unit test (55-03),
and the migration-file grep gates (55-01/55-02).

## Files changed

- `supabase/migrations/20260725020925_rent_ledger_schema.sql` (renamed + ASCII)
- `supabase/migrations/20260725020952_rent_charges_generation_cron.sql` (renamed + ASCII)
- `supabase/migrations/20260725021100_rent_ledger_rpcs.sql` (renamed + ASCII)
- `supabase/migrations/20260725021124_revenue_collected_integration.sql` (renamed + ASCII)
- `src/types/supabase.ts` (regenerated from live DB)
- `src/test/utils/test-data.ts`, `src/components/leases/__tests__/lease-details.test.tsx`,
  `lease-form.test.tsx`, `lease-action-buttons.test.tsx`,
  `src/components/leases/dialogs/__tests__/renew-lease-dialog.test.tsx`,
  `src/hooks/api/__tests__/use-lease.test.tsx` (fixture field)

## Commits

- `4ad3a0948` fix(55-04): normalize ledger migrations to pure ascii before mcp apply
- `882186581` chore(55-04): reconcile ledger migration filenames to prod timestamps
- `0cc86c0ae` feat(55-04): regenerate supabase types from live db with ledger schema

## Self-Check: PASSED

Migrations live and reconciled; types regenerated from the live DB (no false-positive state);
money boundary proven at the deployed-code level; revenue function provably unchanged.
The live dollar-exact end-to-end assertion is explicitly deferred to CI, documented above.
