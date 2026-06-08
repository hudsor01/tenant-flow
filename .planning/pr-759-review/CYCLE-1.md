# PR #759 — Perfect-PR Review CYCLE-1

**PR:** #759 `chore(db): finish rent-payment / tenant-portal demolition`
**Branch:** `fix/finish-rent-payment-demolition` → `main`
**Reviewed:** 2026-05-29
**Reviewer:** Claude (adversarial code review)
**Scope:** 7 files, +200 / -4118

---

## Verdict: CLEAN

First clean cycle — cycle 2 closes the gate.

| Severity | Count |
|----------|-------|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| INFO | 3 |

No blocking or quality findings. All CI checks green. Both highest-stakes items
(for-all-audit test pass + supabase.ts pure-deletion regen) verified affirmatively.

---

## Methodology note — live-prod query limitation

The `mcp__supabase__execute_sql` tool was **not exposed** in this session (tool set
was Read/Write/Bash only; `supabase` CLI present but `SUPABASE_ACCESS_TOKEN`
returned `Unauthorized`; no `psql`). I could not run the ad-hoc prod `SELECT`s the
review brief listed.

**Compensating evidence — every prod claim was verified by a stronger or equivalent
independent source:**
- The `for-all-audit` test's prod assertion was verified **empirically** — the
  `rls-security` CI job (which runs `bun run test:integration` → executes
  `tests/integration/rls/for-all-audit.test.ts` against **prod**) is **green** on
  this PR. That is a live-prod execution of the exact invariant, stronger than a
  one-off SELECT.
- The migration's "0 dependents" safety claims were verified by a **full
  append-only migration-history trace** (every CREATE/DROP of the three objects and
  every public/storage `FOR ALL service_role` policy across all migrations).
- The `supabase.ts` regen integrity was verified by **`git diff` + `tsc --noEmit`**
  (clean) + grep counts.

---

## Highest-Stakes Item (a): Does `for-all-audit` PASS in CI against current prod?

**YES — proven both empirically and statically.**

**Empirical:** `gh pr checks 759` → `rls-security  pass  51s`. The
`rls-security-tests.yml` workflow runs `bun run test:integration` (line 112), and
`vitest.config.ts:140` globs `tests/integration/**/*.test.ts` — which includes
`for-all-audit.test.ts`. The test ran against prod and the `length === 0`
assertions for both `service_role` and `authenticated` passed.

**Static confirmation (why it passes):** the edited test now asserts
`policies.length === 0` with no exception filter. I traced every
`CREATE POLICY ... FOR ALL` on a `public`/`storage` table to its grave:

| Policy | Created | Killed by |
|--------|---------|-----------|
| `webhook_events` / `webhook_failures` service_role FOR ALL | 20251226054128 | `20260304130000` SEC-06 sweep loop (drops all public/storage service_role FOR ALL) |
| 6 backend-table service_role FOR ALL | 20251230290000 | `20260304130000` SEC-06 sweep loop |
| `properties` service_role FOR ALL (×2) | 20260103120000 | `20260304130000` SEC-06 sweep loop |
| `rent_payments_service_role` FOR ALL | 20260304140000 | table `DROP`ped `20260418140000` |
| `app_config` "Service role only" FOR ALL | 20260504162155 | explicit `DROP POLICY` `20260504164842` (~2h later, cites this very test) |

All remaining `FOR ALL TO service_role` policies live on the **`stripe.*`** schema
(`20251230290000`), which the `audit_for_all_policies` RPC excludes via
`schemaname IN ('public','storage')` (`20260304130000:489-491`,
re-`OR REPLACE`d `20260527150424`). The `authenticated` branch: zero authenticated
FOR ALL policies have ever survived (the `20260304130000` guard EXCEPTIONs if any
exist, and migration applied clean). The test edit is correct and durable.

---

## Highest-Stakes Item (b): Is `supabase.ts` regen a clean pure-deletion diff?

**YES — pure deletion, no smuggled drift.**

`git diff origin/main...HEAD -- src/types/supabase.ts` removes exactly and only:
- the `payment_transactions` table block (Row/Insert/Update/Relationships)
- `get_owner_lease_tenant_ids: { Args: never; Returns: string[] }`
- `user_is_tenant: { Args: never; Returns: boolean }`

No table/function reorders, no field changes, no additions. `-47` lines, all
contiguous deletions. Cross-checks:
- `grep payment_transactions|user_is_tenant|get_owner_lease_tenant_ids` in the new
  file → **0** hits.
- `rent_payments` → **0** hits (already gone pre-PR, confirmed not reintroduced).
- `document_template_definitions` → **present** (`:172`).
- `bun run typecheck` (`tsc --noEmit`) → **clean, zero errors** — proving no
  consumer referenced the dropped types and the regen matches prod schema exactly.
- `grep` of `src/` for the three dropped identifiers → **0** hits (no dead
  application caller orphaned by the regen).

---

## Other verification results

**1. Drops happened + safe.** Migration `DROP TABLE ... CASCADE` /
`DROP FUNCTION` are all `IF EXISTS` (idempotent, replay-safe). CASCADE on
`payment_transactions` only sheds the table's own indexes — confirmed no FK
*inbound* to it survives (its outbound FKs to `rent_payments`/`payment_methods`
were already cascade-gone in the April demolition), no view, no policy, no function
body references either dropped function in any post-pivot migration (last touch was
`20260303140000`, before the demolition). Timestamp `20260530015823` has no
collision in `supabase/migrations/`.

**2. `for-all-audit.test.ts` correctness.** Exception filter fully removed; both
branches assert `length === 0` directly with descriptive throw-on-failure. Matches
the audit's INFO recommendation (`AUDIT-2026-05-29.md:121`). rls-security CI green.

**3. Dev-script SQL edits valid.** `get_critical_policies.sql` and
`verify_rls_performance.sql` IN-list trims leave the **last surviving element with
no trailing comma** in every edited list (`'documents_delete_owner'`, `'leases'`).
No dangling comma, no broken `IN ()`. Syntactically valid.

**4. Deferred-items framing is HONEST.** Grepped `.github/workflows/`,
`lefthook.yml`, `package.json`: the seed scripts (`db:seed:smoke|dev|perf`) and the
pgTAP `supabase/tests/database/*.test.sql` are invoked by **zero** CI jobs and
**zero** pre-commit/pre-push hooks. They run only via manual `psql`/`pg_prove`.
Deferring them is correct. (They do reference dropped objects — see INFO-01 — but
that breakage predates this PR and never enters a CI path.)

**5. `public.sql` deletion safe.** No CI job, script, `supabase db diff`, or
tooling reads `supabase/schemas/public.sql`. Project memory already flags it as
"NEVER trust." Clean removal.

**6. CLAUDE.md compliance.** No new PostgreSQL ENUM, no `any`, no barrel file, no
emoji in code (the pre-existing `RAISE NOTICE` emoji in the dev SQL scripts are
untouched console decoration, out of scope). Migration follows the
prod-applied-then-reconciled convention with the documented timestamp.

**7. CI status.** `checks` pass, `e2e-smoke` pass, `rls-security` pass,
`Aikido Security` pass. PR `MERGEABLE`. No pending/failed gate.

---

## INFO (non-blocking, not in this PR's scope)

### INFO-01: Deferred dev seed/pgTAP files reference demolished objects
**Files:** `supabase/seeds/seed-development.sql:416,439,473`,
`supabase/seeds/seed-performance.sql:338,373,400`,
`supabase/tests/database/01-rls-enabled.test.sql`,
`supabase/tests/database/02-service-role-grants.test.sql:64-81`
**Note:** These reference `rent_payments` (+ `property_owners`/`property_owner_id`,
already renamed). They are **broken against current prod**, but the breakage was
introduced by the April demolition (`20260418140000`), not this PR, and they are
**not CI-wired** — they only fail on a manual `bun run db:seed:dev` / local
`pg_prove`. Correctly out of this PR's scope. A future "dev tooling resurrection"
PR should rewrite or `git rm` them. No action required for this gate.

### INFO-02: PR does not fix the P1 billing-history crash
**Note:** The companion audit (`AUDIT-2026-05-29.md:18,34`) flags
`billing-keys.ts:99` `billingQueries.history()` querying demolished `rent_payments`
→ runtime 42P01 in `<BillingHistorySection>`. PR #759 is scoped to the *demolition
cleanup* (drops + repo hygiene), explicitly **not** the billing fix (audit §6 keeps
the billing rewrite in the same recommended PR but it is absent here). Not a defect
*in* this PR — flagging so the gate-keeper knows the highest-value live issue
remains open in a follow-up. Scope decision, not a finding against the diff.

### INFO-03: Live-prod ad-hoc SELECTs not run (tooling gap, fully compensated)
**Note:** See "Methodology note" above. The `mcp__supabase__execute_sql` path was
unavailable this session; every prod claim was instead verified via green prod-CI
execution, full migration-history trace, `git diff`, and `tsc`. If a reviewer wants
belt-and-suspenders, re-run the brief's 5 SELECTs once MCP is restored — but the CI
green + static trace already establish the invariants the SELECTs would check.

---

## Cycle-2 watch-list

Nothing substantive. Cycle 2 should re-confirm:
- CI still green at re-review (no flake, no prod drift between cycles).
- No new commits smuggled scope into the branch.
- The pure-deletion property of the `supabase.ts` diff still holds.

[hudsor01]
