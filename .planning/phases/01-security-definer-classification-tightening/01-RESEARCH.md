# Phase 1: SECURITY DEFINER Classification & Tightening - Research

**Researched:** 2026-06-02
**Domain:** Postgres SECURITY DEFINER EXECUTE-grant least-privilege + Supabase Security Advisor remediation + RLS integration-test pinning (TenantFlow prod `bshjmbshupiibfiewpxb`)
**Confidence:** HIGH (live repo + migration introspection; milestone classification already done and re-verified here against function sources)

## Summary

The milestone research already produced the function-by-function classification (44 KEEP / 2 TIGHTEN / 1 REVIEW in `CLASSIFICATION.md`). This phase research **confirms that classification against the actual SQL sources and resolves the three open execution risks** the planner needs nailed down before writing tasks:

1. **`assert_can_create_lease` is a single `(uuid, uuid)` signature — there is NO overload.** Both `20251219123000` (defines it, grants `authenticated`) and `20251231063902` (grants `service_role`) target the identical `(uuid, uuid)` signature. The "two signatures?" worry from the milestone summary is resolved: live introspection at execute-time will find exactly one. The only frontend reference is the generated `supabase.ts` type entry + a comment in `bulk-import-config.ts:125` — **no real `.rpc()` caller**. It is invoked internally by `bulk_import_create_lease` (itself SECURITY DEFINER owned by `postgres`, so it executes `assert_can_create_lease` with the owner's implicit EXECUTE, not the caller's grant). Therefore revoking `authenticated` EXECUTE is safe — the bulk-import invariant still holds. **One caveat the executor must re-verify live, not assume:** `bulk_import_create_lease`'s call at `20260422120000:136` is `assert_can_create_lease(p_primary_tenant_id, p_unit_id)` while the function parameters are `(p_unit_id, p_primary_tenant_id)` — a known positional swap that the bulk-import integration test pins. This swap is **out of scope to fix** here; it only matters that the existing `bulk-import-create-lease.test.ts` stays green after the revoke.

2. **The "live `prosrc` scan found no internal caller" discrepancy is explained**: a `prosrc` text scan of `assert_can_create_lease` itself finds no caller (correct — a function doesn't list its callers); the caller relationship lives in `bulk_import_create_lease`'s body. The execute-time introspection in this research's TIGHTEN-02 section searches `pg_proc.prosrc` of *all other* functions for the name, which surfaces `bulk_import_create_lease`.

3. **`audit_for_all_policies` (TIGHTEN-03): the test harness has no service-role client and no admin account.** `tests/integration/setup/supabase-client.ts` only exposes publishable-key + ownerA/ownerB JWTs; `getAdminTestCredentials()` returns `null` (no `E2E_ADMIN_*` provisioned). This decisively favors the **`is_admin()`-gate** resolution over tighten-to-service_role-and-migrate-the-test, because migrating `for-all-audit.test.ts` to a service-role/admin client would require provisioning a new CI secret + synthetic account — out of proportion for a diagnostic.

**Primary recommendation:** Ship ONE atomic migration that mirrors `20260602044104` exactly — `REVOKE EXECUTE … FROM PUBLIC` then re-`GRANT … TO service_role` for `get_lead_paint_compliance_report()` and `assert_can_create_lease(uuid, uuid)`; for `audit_for_all_policies(text)`, add an internal `is_admin()` gate (keep the `authenticated` grant). Spot-check the 7 analytics/admin KEEPs for an `is_admin()` body gate via live `pg_get_functiondef`. Extend `anon-rpc-grants.rls.test.ts` (tightened-from-authenticated set) and add a positive `is_admin`/`get_current_owner_user_id` reachability assertion. Write the durable classification doc to `.planning/anon-exec-audit/CYCLE-2.md`.

## User Constraints

> No `CONTEXT.md` exists for this phase yet (`/gsd:discuss-phase 1` has not run). The constraints below are the **Cross-Cutting Constraints from ROADMAP.md + STATE.md "Accumulated Context"**, which bind every v3.0 phase with the same authority as locked decisions. The planner MUST honor these verbatim.

### Locked Decisions (from ROADMAP Cross-Cutting Constraints)
- Every grant/policy change is a **PROD migration via Supabase MCP `apply_migration`** (NOT `supabase db push`); reconcile the repo filename with the prod-assigned timestamp per `migration-mcp-prod-drift` — run `mcp__supabase__list_migrations` after each apply.
- **`REVOKE FROM PUBLIC` is load-bearing.** A bare `REVOKE FROM authenticated` is a no-op while the PUBLIC grant stands. Each function tightening must `REVOKE EXECUTE … FROM PUBLIC` then re-`GRANT EXECUTE … TO service_role` (and `authenticated` only where still needed).
- **TIGHTEN revokes grants; it does NOT DROP functions** (lower risk, reversible).
- The integration suite is **PostgREST-only** — it cannot introspect `pg_proc.proacl`. Pin grant state via the advisor + `.rpc()` reachability probes (the `anon-rpc-grants` / `admin-rpc-grants` pattern), not by reading catalogs from the test.
- Each phase ships as **ONE atomic PR** through the perfect-PR gate (two consecutive zero-finding deep review cycles). Branch protection on `main` requires `checks` + `e2e-smoke` + `rls-security`.
- Never push directly to `main` — feature branch → push → `gh pr create`; user reviews/merges.
- `auth_leaked_password_protection` is OUT of scope.

### Claude's Discretion (resolved during execution)
- `audit_for_all_policies` resolution: `is_admin()` gate vs. tighten-to-service_role. **This research recommends the `is_admin()` gate** (see TIGHTEN-03) — but the planner may surface it as a one-line decision point if `/gsd:discuss-phase` runs first.
- Whether to add a brand-new `admin-rpc-grants`-style file vs. extending `anon-rpc-grants.rls.test.ts`. **Recommendation: extend the existing `anon-rpc-grants.rls.test.ts`** (it already pins authenticated-revoked functions and positive `is_admin` reachability; the three new functions fit its three existing `describe` blocks).

### Deferred Ideas (OUT OF SCOPE)
- Re-introducing any deny-all / RESTRICTIVE policy (rejected `AUDIT-2026-05-29`, migration `20260527151342`).
- `search_path = public → ''` hardening sweep (separate concern, `project_pending_followups_2026-05-29`).
- Periodic advisor drift-check in CI (later milestone).
- Fixing the `assert_can_create_lease` positional-arg swap in `bulk_import_create_lease` (latent, pinned by existing test, not a grant concern).
- Anon-side SECURITY DEFINER work (complete via PRs #758/#771).
- RLS-no-policy table resolution (Phase 2) and documented steady-state verification (Phase 3).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SDEF-01 | Classify all 46 authenticated SECURITY DEFINER fns KEEP/TIGHTEN/REVIEW with live evidence in a durable doc | `CLASSIFICATION.md` verdicts confirmed against sources; durable doc target = `.planning/anon-exec-audit/CYCLE-2.md` (see "Classification Doc Deliverable") |
| SDEF-02 | Each KEEP carries a one-line intentional-EXECUTE rationale | Rationale columns already drafted in `CLASSIFICATION.md`; doc structure specified below |
| SDEF-03 | 7 analytics/admin KEEP RPCs confirmed to gate on `is_admin()`; fix any missing gate (keep grant) | "Admin-Gate Spot-Check" section — exact `pg_get_functiondef` introspection + the 7 names |
| TIGHTEN-01 | `get_lead_paint_compliance_report` EXECUTE revoked from authenticated+PUBLIC; service_role kept | Zero-arg signature confirmed; no real caller; exact REVOKE/GRANT below |
| TIGHTEN-02 | `assert_can_create_lease` call-graph resolved, then revoked from authenticated+PUBLIC; bulk-import invariant intact | Single `(uuid,uuid)` signature confirmed; internal-caller introspection + bulk-import safety check specified |
| TIGHTEN-03 | `audit_for_all_policies` no longer leaks policy inventory to arbitrary signed-in accounts | Both options laid out; `is_admin()`-gate recommended (harness has no service-role/admin client) |
| SECTEST-01 | `tests/integration/rls/` pins tightened fns unreachable from authenticated + KEEP helpers reachable | Exact extension of `anon-rpc-grants.rls.test.ts` specified; `REVOKED_CODES` set; positive-reachability assertions |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| EXECUTE-grant revocation on 3 fns | Database (migration via MCP) | — | Grants live in `pg_proc.proacl`; only DDL changes them |
| `is_admin()` body gate on `audit_for_all_policies` | Database (CREATE OR REPLACE) | — | Authorization belongs in the SECURITY DEFINER body, not the client |
| Admin-gate spot-check of 7 analytics RPCs | Database (introspection, read-only) | — | Gate lives in function body; verify via `pg_get_functiondef` |
| Durable classification doc | Repo docs (`.planning/anon-exec-audit/`) | — | Audit trail, not runtime |
| Grant-state regression pinning | Integration test (PostgREST `.rpc()` probe) | Database (advisor) | Suite can't read `proacl`; reachability probe is the proxy |
| Bulk-import invariant safety | Integration test (`bulk-import-create-lease.test.ts`) | — | Confirms the internal `assert_can_create_lease` call still fires after revoke |

## Standard Stack

No new packages. This phase is SQL DDL (via Supabase MCP) + TypeScript integration tests in the existing Vitest harness.

### Core (already in repo — versions from package.json / live tooling)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase MCP `apply_migration` | live | Apply prod DDL + reconcile timestamps | The project's ONLY migration path to prod (`migration-mcp-prod-drift`) |
| Supabase MCP `execute_sql` | live | Live introspection (call graph, grants, function bodies) at execute-time | Read-only catalog queries against prod |
| Supabase MCP `get_advisors(security)` | live | Before/after advisor delta | The authoritative grant-state oracle (suite can't read `proacl`) |
| `@supabase/supabase-js` | (repo lock) | `.rpc()` reachability probes in integration tests | Existing `anon-rpc-grants` pattern |
| Vitest | 4.x | Integration test runner (`tests/integration/rls/`) | Existing `rls-security` CI job |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MCP `apply_migration` | `supabase db push` | REJECTED — project applies via MCP; push would desync repo↔prod timestamps |
| `is_admin()` body gate on `audit_for_all_policies` | Tighten to service_role + migrate test to service-role client | Requires a new CI secret + synthetic admin account; disproportionate for a diagnostic. See TIGHTEN-03. |
| Reading `pg_proc.proacl` from the test | `.rpc()` reachability probe | The PostgREST-only suite cannot read catalogs; the probe is the canonical proxy (Cross-Cutting Constraint) |

**Installation:** none.

## Package Legitimacy Audit

Not applicable — this phase installs **zero** external packages. All tooling (Supabase MCP, `@supabase/supabase-js`, Vitest) is already in the repo. No slopcheck/registry verification required.

## Migration Mechanics (the load-bearing prior art)

The canonical shape to mirror is `supabase/migrations/20260602044104_revoke_anon_security_definer_pass3.sql`:

```sql
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_lease_signature_activity() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_lease_signature_activity() TO service_role;
```

### Exact statements for this phase

**TIGHTEN-01 — `get_lead_paint_compliance_report` (zero-arg, confirmed `RETURNS TABLE(...)`):**
```sql
-- get_lead_paint_compliance_report(): no frontend .rpc caller (only generated
-- supabase.ts type entry). Not in any policy/trigger/cron. service_role already
-- granted in 20251231063902. Revoke PUBLIC (which authenticated inherits), keep
-- service_role.
REVOKE EXECUTE ON FUNCTION public.get_lead_paint_compliance_report() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_lead_paint_compliance_report() TO service_role;
```

**TIGHTEN-02 — `assert_can_create_lease` (single `(uuid, uuid)` signature, confirmed):**
```sql
-- assert_can_create_lease(uuid, uuid): single signature (defined 20251219123000,
-- service_role granted 20251231063902). No direct frontend .rpc caller — invoked
-- INTERNALLY by bulk_import_create_lease (SECURITY DEFINER owned by postgres, so it
-- executes with owner privilege, not the caller's grant). Revoking authenticated is
-- safe; the bulk-import invariant still fires. Re-verify the live call graph + single
-- signature BEFORE this revoke (see Pitfall 1).
REVOKE EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) TO service_role;
```

> Note: the argument list `(uuid, uuid)` is **mandatory** in the REVOKE/GRANT — Postgres requires the full signature for overload disambiguation even though there's only one here. Mirror the exact form used in `20251231063902:70` (`...assert_can_create_lease(uuid, uuid) to service_role;`).

**TIGHTEN-03 — `audit_for_all_policies(text)` (recommended: `is_admin()` gate, keep `authenticated`):**
```sql
-- audit_for_all_policies(text): only caller is for-all-audit.test.ts (authenticated).
-- Leaking the policy inventory to any signed-in account is a minor info-leak. Add an
-- internal is_admin() gate so a non-admin authenticated caller gets nothing useful;
-- KEEP the authenticated grant (the RPC door stays open, the body gates).
-- CREATE OR REPLACE preserves search_path='' + FQ catalog refs from 20260527150424.
CREATE OR REPLACE FUNCTION public.audit_for_all_policies(p_role text)
RETURNS TABLE(schemaname text, tablename text, policyname text, roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT pp.schemaname::text, pp.tablename::text, pp.policyname::text, pp.roles::text[]
  FROM pg_catalog.pg_policies pp
  WHERE public.is_admin()                       -- NEW gate
    AND pp.cmd = 'ALL'
    AND pp.schemaname IN ('public', 'storage')
    AND pp.roles::text[] @> ARRAY[p_role];
$function$;
GRANT EXECUTE ON FUNCTION public.audit_for_all_policies(text) TO authenticated;
```
> ⚠️ **Test impact of the gate:** `for-all-audit.test.ts` calls this as **ownerA (non-admin)**. With the `is_admin()` gate, a non-admin gets **zero rows** — which is exactly what the test already asserts (`expect(policies).toHaveLength(0)`). The test KEEPS PASSING by coincidence-of-intent: "no FOR ALL policies visible to me." If the planner wants the test to still meaningfully exercise the *enumeration*, that requires an admin client (which the harness lacks) — so the recommendation is to leave the test as-is and add a one-line comment noting the gate now also makes it admin-scoped. **The planner must call this out in the plan's verification step.**

### MCP apply + reconcile procedure (every grant change)
1. `mcp__supabase__apply_migration({ name, query })` with the DDL above.
2. `mcp__supabase__list_migrations` — capture the **prod-assigned timestamp**.
3. Rename/create the repo file `supabase/migrations/<prod_timestamp>_revoke_tighten_security_definer_phase1.sql` to match prod (per `migration-mcp-prod-drift`). The repo filename timestamp you author may NOT match what prod assigns — reconcile after apply, not before.
4. Single migration file recommended (atomic PR) containing all three function changes + a header comment block in the `20260602044104` documentary style.

## Architecture Patterns

### System Flow (grant tightening)

```
[author migration DDL] ──> mcp__supabase__apply_migration ──> PROD pg_proc.proacl mutated
        │                                                              │
        │                                                              ▼
        │                                              mcp__supabase__list_migrations
        │                                                   (capture prod timestamp)
        ▼                                                              │
[reconcile repo filename] <─────────────────────────────────────────┘
        │
        ▼
[extend anon-rpc-grants.rls.test.ts] ──> PostgREST .rpc() as authenticated ──> expect REVOKED_CODES
        │                              ──> PostgREST .rpc() is_admin/owner-helper ──> expect reachable
        ▼
[run bulk-import-create-lease.test.ts] ──> assert_can_create_lease invariant still fires (green)
        │
        ▼
[mcp get_advisors(security) delta] ──> WARN count 46 → 43 (3 tightened drop off)
```

### Pattern 1: REVOKE-FROM-PUBLIC-then-re-GRANT (load-bearing)
**What:** Postgres auto-grants EXECUTE to PUBLIC at function creation; `anon`/`authenticated` inherit it. Revoke PUBLIC first, then grant back only the roles that need it.
**When to use:** Every function tightening in this phase.
**Example:** see the three statements above. The shape is verbatim from `20260602044104`.

### Pattern 2: Internal-caller-via-owner-privilege (why revoking is safe)
**What:** A SECURITY DEFINER function owned by `postgres` calls another function with the OWNER's implicit EXECUTE, independent of the caller's grant. So `bulk_import_create_lease` keeps invoking `assert_can_create_lease` even after `authenticated` loses EXECUTE.
**Evidence:** `CYCLE-1.md:80` documents the same mechanism for `get_user_plan_limits` in the plan-limit trigger chain ("Owners always have implicit EXECUTE on their own objects regardless of GRANT").
**Caveat:** This holds only if `bulk_import_create_lease` is owned by `postgres` (or `assert_can_create_lease`'s owner). **Verify the owner at execute-time** (`pg_proc.proowner`) as part of the TIGHTEN-02 safety introspection.

### Anti-Patterns to Avoid
- **Bare `REVOKE FROM authenticated`** — no-op while PUBLIC stands. Always revoke PUBLIC.
- **Omitting the `(uuid, uuid)` arg list** on `assert_can_create_lease` — the REVOKE/GRANT will error or hit the wrong overload (there's one, but Postgres still demands the signature).
- **DROP-ing the functions** — explicitly out of scope; revoke grants only.
- **Reading `pg_proc.proacl` from the integration test** — the PostgREST-only suite cannot; use `.rpc()` reachability probes.
- **A RESTRICTIVE/deny-all anything** — rejected `AUDIT-2026-05-29`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirm grant state changed | A bespoke `proacl` reader in the test | `get_advisors(security)` delta + `.rpc()` reachability probe | Suite is PostgREST-only; advisor is the authoritative oracle |
| Resolve `assert_can_create_lease` call graph | Guess from migrations | `execute_sql` scan of `pg_proc.prosrc` for the name at execute-time | Migrations can lie about live state; introspect prod |
| Authorization on `audit_for_all_policies` | Client-side admin check | In-body `is_admin()` gate | Definer body is the only trustworthy gate; client checks are bypassable via direct `/rpc` |
| Migration timestamp | Trust the filename you author | `list_migrations` after apply, then reconcile | MCP assigns prod timestamps that drift from repo filenames |

**Key insight:** Every "did the grant actually change?" question in this domain is answered by the advisor + a reachability probe, never by introspecting catalogs from a client that can't see them.

## Detailed Execution Specs (the planner's task seeds)

### TIGHTEN-02 — `assert_can_create_lease` resolve-before-revoke (the riskiest item)

**Pre-revoke introspection (run live via `execute_sql`, capture into CYCLE-2.md):**

1. **Enumerate live signatures** (prove there's exactly one):
   ```sql
   SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args,
          pg_get_userbyid(p.proowner) AS owner, p.prosecdef
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'assert_can_create_lease';
   ```
   Expected: one row, `args = uuid, uuid`. If >1 row appears, STOP and re-scope — there's a real overload to handle.

2. **Find internal callers** (prove `bulk_import_create_lease` is the caller, and find any others):
   ```sql
   SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.prosrc ILIKE '%assert_can_create_lease%'
     AND p.proname <> 'assert_can_create_lease';
   ```
   Expected: at minimum `public.bulk_import_create_lease`. (The milestone's "no internal caller found" was a `prosrc` scan of the function *itself*, which by definition won't list callers — this query scans *other* functions' bodies.)

3. **Confirm caller owner** (prove the owner-privilege mechanism holds):
   ```sql
   SELECT pg_get_userbyid(proowner) FROM pg_proc p
   JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='bulk_import_create_lease';
   ```
   Expected: `postgres` (or the same owner as `assert_can_create_lease`). If a different non-superuser owner, re-check the internal-call privilege assumption.

4. **Confirm no frontend/edge `.rpc` caller** (already done in this research): only `src/types/supabase.ts` (generated) + `src/components/leases/bulk-import-config.ts:125` (comment). No real `.rpc('assert_can_create_lease', …)` call.

**Then revoke** (the SQL in Migration Mechanics).

**Post-revoke safety check (the invariant gate):**
- Run `tests/integration/rls/bulk-import-create-lease.test.ts` against prod. It MUST stay green — in particular the `inserts a valid lease end-to-end (regression: cycle-4 P0)` case (line 162) and the rejection cases (212/232/298) which all flow through `assert_can_create_lease`. Green here = the internal invariant still fires after the authenticated grant is gone.

### TIGHTEN-03 — `audit_for_all_policies` resolution options

| Option | Mechanic | Test impact | CI/secret cost | Recommendation |
|--------|----------|-------------|----------------|----------------|
| **A. `is_admin()` body gate (KEEP authenticated grant)** | `CREATE OR REPLACE` adding `WHERE public.is_admin() AND …` | `for-all-audit.test.ts` (ownerA, non-admin) now gets 0 rows — already what it asserts; keeps passing. Add a comment noting it's now admin-scoped. | None | ✅ **RECOMMENDED** — no new account/secret; minimal blast radius |
| B. Tighten to `service_role` (REVOKE authenticated) | `REVOKE … FROM PUBLIC; GRANT … TO service_role;` | Test must migrate to a service-role or admin client. **Harness has neither** (`supabase-client.ts` exposes only publishable + ownerA/B; `getAdminTestCredentials()` returns null). Requires provisioning `E2E_ADMIN_*` + a synthetic admin account + a CI secret. | New secret + synthetic admin account | ❌ disproportionate for a diagnostic |

**Why A is safe:** `audit_for_all_policies` is read-only against `pg_catalog.pg_policies`. Gating it on `is_admin()` removes the info-leak (a non-admin signed-in account can no longer enumerate the FOR ALL policy inventory) while preserving the function's existence and the existing test's green state. The function already uses `search_path = ''` + FQ catalog names; `public.is_admin()` must be FQ-referenced (it is, in the snippet above).

### SDEF-03 — Admin-gate spot-check of the 7 analytics/admin KEEPs

The 7 functions (from ROADMAP SC2 / SUMMARY pitfall 7):
`get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats`, `get_billing_insights`, `get_error_summary`, `get_error_prone_users`, `get_common_errors`.

**Introspection (read-only, per function):**
```sql
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname = '<fn_name>';
```
Inspect each `def`/`prosrc` for an `is_admin()` reference (or an equivalent `RAISE … unless is_admin()` guard).

**Decision rule:**
- Gate present → record in CYCLE-2.md as confirmed; keep the `authenticated` grant (KEEP-by-design).
- Gate **missing** → that's a **real finding**. Fix: `CREATE OR REPLACE` adding the `is_admin()` guard to the body (raise/return-empty for non-admin). **Keep the grant** — the door stays open, the body gates. This is the same pattern as TIGHTEN-03 option A.

> Note on `get_billing_insights`: its args (`owner_id_param uuid, …`) suggest it may gate on `auth.uid()`/owner-scope rather than `is_admin()`. The spot-check accepts EITHER an `is_admin()` gate OR an owner-scope (`auth.uid()`) gate as "gated"; only an ungated body that trusts a caller-supplied id is a finding. (Pre-existing `CYCLE-1.md` note: the GATES_INTERNALLY pattern uses `IF p_id != (select auth.uid()) THEN RAISE`.) Record which gate type each of the 7 uses.

### SECTEST-01 — extend `anon-rpc-grants.rls.test.ts`

The existing file has three `describe` blocks and a shared `REVOKED_CODES = ["42501", "42883", "PGRST202"]`. Extend in place:

1. **Tightened-from-authenticated set** — add a new `describe("authenticated cannot reach tightened SECURITY DEFINER functions")` iterating:
   ```ts
   const TIGHTENED_FROM_AUTHENTICATED = [
     { name: "get_lead_paint_compliance_report" },                       // zero-arg
     { name: "assert_can_create_lease", args: {
         p_unit_id: "00000000-0000-0000-0000-000000000000",
         p_primary_tenant_id: "00000000-0000-0000-0000-000000000000" } },
   ];
   // each: authnClient.rpc(...) → expect error, expect REVOKED_CODES.toContain(error.code)
   ```
   - `assert_can_create_lease` arg keys MUST match the live param names `p_unit_id` + `p_primary_tenant_id` (confirmed from `20251219123000:20-23`), or PostgREST returns PGRST202 for a different reason (arg-name mismatch) — still in the accept set, but use the real names for a clean assertion.
   - **Do NOT pin `audit_for_all_policies` as revoked-from-authenticated** under Option A — it KEEPS the `authenticated` grant. Instead (optional but recommended) add a positive assertion that a non-admin (`ownerA`) call returns `error === null` with `data` length 0 (the gate returns empty, not an error). This pins the info-leak closure.

2. **KEEP RLS-helper reachability (positive)** — extend the existing `is_admin()` positive block, and add `get_current_owner_user_id`:
   ```ts
   // is_admin already pinned (returns false for non-admin owner)
   it("get_current_owner_user_id remains reachable by authenticated", async () => {
     const { error } = await authnClient.rpc("get_current_owner_user_id");
     expect(error).toBeNull();           // reachable; returns the owner's uuid or null
   });
   ```
   This pins the SC5 contract ("KEEP RLS helpers remain reachable").

3. **Bulk-import invariant** — do NOT duplicate; the existing `bulk-import-create-lease.test.ts` is the invariant gate. Reference it in the plan's verification step (run the full `rls` suite).

**Harness facts the planner needs:**
- Clients: `anonClient` (publishable key, no auth) + `authnClient` (ownerA JWT via `createTestClient`). Dual-client ownerA/ownerB available via `getTestCredentials()`.
- No service-role client, no admin client (`getAdminTestCredentials()` → null). Tests are PostgREST-only.
- `REVOKED_CODES` is duplicated across 4 files (CYCLE-1 deferred follow-up INF-01) — do NOT block this phase on extracting it; if touching the file, a local const is fine.

### SDEF-01 / SDEF-02 — classification doc deliverable

**Location:** `.planning/anon-exec-audit/CYCLE-2.md` (continues the `CYCLE-1.md` lineage — same dir, next cycle number). This is the durable doc the requirements + ROADMAP SC1 demand.

**Must contain:**
- The 46-function table: each function → KEEP / TIGHTEN / REVIEW, with the live evidence columns (`frontend .rpc` hit count, `in_policy`, trigger/cron attachment, internal-caller). Source the 44 KEEP / 2 TIGHTEN / 1 REVIEW rows from `CLASSIFICATION.md` (already drafted) and the grep hit-counts therein.
- Every KEEP row's one-line intentional-EXECUTE rationale (SDEF-02).
- The 7-RPC admin-gate spot-check results (SDEF-03): per-function gate type (`is_admin()` / `auth.uid()` owner-scope / FIXED) + the `pg_get_functiondef` evidence.
- The TIGHTEN-02 introspection output (single-signature proof + internal-caller list + owner).
- The TIGHTEN-03 decision + rationale.
- The migration filename (post-reconcile prod timestamp) and the before/after advisor delta (46 → 43 authenticated WARNs; the 3 tightened drop off).
- A "Verification" table mirroring CYCLE-1's `anon | authn | service` grid for the 3 tightened functions (authn ✗ for the 2 revoked; `audit_for_all_policies` authn ✓ but body-gated).

## Common Pitfalls

### Pitfall 1: "Two overloads of `assert_can_create_lease`"
**What goes wrong:** The milestone summary flagged a possible second signature; revoking the wrong one (or both blindly) could break the internal caller.
**Why it happens:** `20251219123000` grants `authenticated`, `20251231063902` grants `service_role` — looks like two definitions, but both target the identical `(uuid, uuid)`.
**How to avoid:** Run the live signature-enumeration query (TIGHTEN-02 step 1). Confirmed in this research: **one signature**. Revoke that one.
**Warning sign:** >1 row from the `pg_proc` signature query → real overload, re-scope.

### Pitfall 2: Bare `REVOKE FROM authenticated` does nothing
**What goes wrong:** Advisor still flags the function; grant unchanged.
**Why:** PUBLIC grant stands; authenticated inherits it.
**How to avoid:** Always `REVOKE … FROM PUBLIC` then re-`GRANT … TO service_role`. Mirror `20260602044104`.
**Warning sign:** Post-apply advisor count unchanged for the tightened function.

### Pitfall 3: `audit_for_all_policies` gate silently breaks its test the other way
**What goes wrong:** If Option B (service_role) is chosen, `for-all-audit.test.ts` (ownerA) starts failing with a revoked code because the test calls it as authenticated.
**Why:** The test has no service-role/admin path.
**How to avoid:** Choose Option A (`is_admin()` gate, keep authenticated grant). The non-admin ownerA call returns 0 rows (not an error), which the test already asserts.
**Warning sign:** `for-all-audit.test.ts` red after the migration.

### Pitfall 4: Migration timestamp drift
**What goes wrong:** Repo filename timestamp ≠ prod-assigned timestamp → future `db push`/diff confusion.
**Why:** MCP `apply_migration` assigns prod timestamps.
**How to avoid:** `list_migrations` after apply; rename the repo file to the prod timestamp (`migration-mcp-prod-drift`).
**Warning sign:** `list_migrations` shows a timestamp not present as a repo filename.

### Pitfall 5: Over-revoking a real authenticated caller
**What goes wrong:** Revoking a function that the frontend actually calls → 42501 in prod for signed-in users.
**Why:** Trusting the classification without a fresh grep.
**How to avoid:** This research re-grepped `src/` + `supabase/functions/` for all 3 targets — none have a real `.rpc()` caller (only generated types + comments). Re-confirm at execute-time if the repo changed since 2026-06-02.
**Warning sign:** `grep -rn "<fn>" src/ supabase/functions/` returns anything other than `supabase.ts` (generated) or a comment.

## Code Examples

### Migration header style (mirror 20260602044104)
```sql
-- Phase 1 of v3.0 Security Hardening: tighten the 3 authenticated SECURITY DEFINER
-- functions with no legitimate authenticated caller.
--
--   * get_lead_paint_compliance_report(): no frontend .rpc; service_role already
--     granted. Revoke PUBLIC, keep service_role.
--   * assert_can_create_lease(uuid, uuid): single signature; invoked internally by
--     bulk_import_create_lease (owner-privilege), no direct authenticated caller.
--     Revoke PUBLIC, keep service_role. Bulk-import invariant verified post-apply.
--   * audit_for_all_policies(text): keep authenticated grant but add an is_admin()
--     body gate so the policy inventory isn't enumerable by arbitrary signed-in
--     accounts.
--
-- REVOKE FROM PUBLIC is load-bearing: authenticated inherits the PUBLIC grant, so a
-- bare REVOKE FROM authenticated is a no-op. Each block revokes PUBLIC then re-grants
-- the roles that legitimately need it.
```

### Reachability probe (extend anon-rpc-grants.rls.test.ts)
```ts
// Source: tests/integration/rls/anon-rpc-grants.rls.test.ts (existing pattern)
describe("authenticated cannot reach tightened SECURITY DEFINER functions", () => {
  for (const fn of TIGHTENED_FROM_AUTHENTICATED) {
    it(`${fn.name}: authenticated REVOKE'd`, async () => {
      const { error } = fn.args
        ? await authnClient.rpc(fn.name, fn.args)
        : await authnClient.rpc(fn.name);
      expect(error).not.toBeNull();
      expect(REVOKED_CODES).toContain(error?.code);
    });
  }
});
```

## Validation Architecture

> `workflow.nyquist_validation = true` and `security_enforcement` is ON (absent-from-config = enabled). This section maps every Phase-1 requirement to an observable validation signal so the Nyquist sampling strategy can be derived.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (integration project) |
| Config | `tests/integration/` + `tests/integration/tsconfig.json`; runs via `rls-security` CI job |
| Quick run | `bun run test:integration -- --run tests/integration/rls/anon-rpc-grants.rls.test.ts` |
| Full suite | `bun run test:integration` (hits prod; needs `.env.local` creds; ~45 sign-ins/min cap) |
| Advisor oracle | `mcp__supabase__get_advisors({ type: "security" })` — the grant-state source of truth |

### Phase Requirements → Validation Signal Map
| Req ID | Observable signal that proves it satisfied | Validation type | Command / probe | Exists? |
|--------|---------------------------------------------|-----------------|-----------------|---------|
| SDEF-01 | `.planning/anon-exec-audit/CYCLE-2.md` lists all 46 with KEEP/TIGHTEN/REVIEW + evidence | doc review | manual diff vs CLASSIFICATION.md | ❌ Wave 0 (new doc) |
| SDEF-02 | Every KEEP row has a one-line rationale | doc review | grep rationale column completeness | ❌ Wave 0 |
| SDEF-03 | 7 analytics RPCs each show `is_admin()` (or owner-scope) gate in `pg_get_functiondef`; any fix re-introspected | live introspection | `execute_sql` `pg_get_functiondef` per fn; record in CYCLE-2.md | ✅ MCP available |
| TIGHTEN-01 | `authnClient.rpc('get_lead_paint_compliance_report')` ∈ REVOKED_CODES; advisor WARN drops | integration + advisor delta | extended `anon-rpc-grants` test + `get_advisors` before/after | ❌ Wave 0 (test rows) |
| TIGHTEN-02 | Single-signature proof captured; `authnClient.rpc('assert_can_create_lease', …)` ∈ REVOKED_CODES; **`bulk-import-create-lease.test.ts` GREEN** | integration (revoke probe + invariant) | extended test + existing bulk-import suite | ⚠️ bulk-import test EXISTS; revoke-probe row is Wave 0 |
| TIGHTEN-03 | non-admin `audit_for_all_policies` returns 0 rows (no error); policy inventory not enumerable | integration | `for-all-audit.test.ts` stays green; optional positive 0-row assertion | ✅ test exists (semantics shift) |
| SECTEST-01 | Tightened set unreachable from authenticated AND `is_admin`/`get_current_owner_user_id` reachable, all pinned | integration | extended `anon-rpc-grants.rls.test.ts` | ❌ Wave 0 (new rows) |

### Sampling Rate
- **Per task commit:** the touched test file in `--run` mode (`anon-rpc-grants.rls.test.ts` or `bulk-import-create-lease.test.ts`).
- **Per wave merge / pre-PR:** full `bun run test:integration` against prod (zero RLS regressions is the bar) + `get_advisors(security)` delta showing 46 → 43 authenticated WARNs.
- **Phase gate:** `rls-security` CI green + advisor delta recorded in CYCLE-2.md.

### Wave 0 Gaps
- [ ] `.planning/anon-exec-audit/CYCLE-2.md` — the durable classification doc (SDEF-01/02/03 evidence + TIGHTEN decisions + advisor delta). New file.
- [ ] New `describe` block + `TIGHTENED_FROM_AUTHENTICATED` array in `anon-rpc-grants.rls.test.ts` — covers TIGHTEN-01/02 revoke probes + SECTEST-01.
- [ ] Positive `get_current_owner_user_id` reachability assertion (SECTEST-01 KEEP-helper contract).
- [ ] (Optional) positive 0-row assertion on `audit_for_all_policies` for a non-admin (TIGHTEN-03 leak-closure pin).
- No framework install needed; the integration harness + `rls-security` CI job already exist.

## Security Domain

> `security_enforcement` ON. This phase IS a security phase; the threat model is the deliverable.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control (this phase) |
|---------------|---------|-------------------------------|
| V1 Architecture | yes | Least-privilege EXECUTE grants; documented intentionality per function |
| V4 Access Control | **yes (core)** | Revoke EXECUTE from PUBLIC/authenticated on non-authenticated-facing fns; `is_admin()` body gate on the diagnostic; verified via `.rpc()` reachability + advisor |
| V5 Input Validation | partial | `assert_can_create_lease` already validates ownership in-body (unchanged); no new input surface |
| V7 Error Handling / Logging | partial | Revoked EXECUTE surfaces as 42501/42883/PGRST202 — no info leak beyond function existence (which the advisor already accepts) |
| V14 Configuration | yes | Grant config in `pg_proc.proacl` changed via prod migration; advisor pins steady state |

### Threat Model (the planner MUST encode these in each PLAN's `<threat_model>` block)

| Threat | STRIDE | Mitigation this phase enforces | Verification |
|--------|--------|-------------------------------|--------------|
| **Over-revoke** breaks a real authenticated caller (DoS for signed-in users) | Denial of Service | Re-grep `src/`+`supabase/functions/` confirms no real `.rpc()` caller for the 3 targets (done); execute-time re-confirm; bulk-import test green | `bulk-import-create-lease.test.ts` + full `rls` suite stay green |
| **Under-revoke** (bare REVOKE FROM authenticated) leaves attack surface | Information Disclosure | `REVOKE FROM PUBLIC` is mandatory; advisor re-flags any residual grant | `get_advisors` delta: the 3 drop off the authenticated WARN list |
| **Bulk-import invariant silently bypassed** after revoke | Tampering (business-rule bypass) | `assert_can_create_lease` invoked via owner-privilege by `bulk_import_create_lease`; owner verified live | `bulk-import-create-lease.test.ts` rejection + happy-path cases green |
| **Policy-inventory enumeration** by arbitrary signed-in account | Information Disclosure | `is_admin()` body gate on `audit_for_all_policies` | non-admin `.rpc` returns 0 rows |
| **Ungated analytics RPC** leaks cross-tenant aggregates to non-admins | Information Disclosure | Spot-check 7 analytics RPCs for `is_admin()`/owner gate; fix any missing (keep grant) | `pg_get_functiondef` introspection recorded in CYCLE-2.md |
| **KEEP RLS helper accidentally revoked** breaks owner isolation everywhere | Denial of Service / Elevation | `is_admin` + `get_current_owner_user_id` MUST remain authenticated-reachable | positive reachability assertions in `anon-rpc-grants.rls.test.ts` |
| **Migration timestamp drift** → future schema desync | (operational) | `list_migrations` reconcile after apply | repo filename == prod timestamp |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Revoke from `anon`/`authenticated` directly | Revoke `FROM PUBLIC` then re-grant needed roles | Established pass-1→pass-3 (`2026-05`/`2026-06`) | The only shape that actually changes the grant |
| Deny-all / RESTRICTIVE for lockdown | Positive `service_role_only` policies + grant revokes | `20260527151342` removal, `AUDIT-2026-05-29` | RESTRICTIVE is rejected; do not re-introduce |
| `supabase db push` | MCP `apply_migration` + `list_migrations` reconcile | project convention | Prod-assigned timestamps; reconcile required |

**Deprecated/outdated:**
- The `for-all-audit.test.ts` comment "no extra gate is needed" on `audit_for_all_policies` (`20260527150424:10-12`) is superseded by this phase's TIGHTEN-03 `is_admin()` gate.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `bulk_import_create_lease` is owned by `postgres` (so it executes `assert_can_create_lease` via owner-privilege independent of the authenticated grant) | TIGHTEN-02 / Pattern 2 | If owned by a non-superuser without EXECUTE, the revoke could break bulk import — **mitigated**: execute-time owner query (step 3) + bulk-import test gate catch this BEFORE merge |
| A2 | No new `.rpc()` caller for the 3 targets has landed since 2026-06-02 | Pitfall 5 | A new caller would 42501 in prod — mitigated by execute-time re-grep |
| A3 | The non-admin `for-all-audit.test.ts` assertion (`toHaveLength(0)`) coincides with the `is_admin()`-gated empty result | TIGHTEN-03 / Pitfall 3 | If prod actually has FOR ALL service_role policies visible to admins, only admin path differs; non-admin still 0 — low risk |
| A4 | The 7 analytics RPCs gate on `is_admin()` OR owner-scope (none fully ungated) | SDEF-03 | If one is ungated, it's a real finding the spot-check catches and fixes in-phase (grant kept) |

> All four assumptions are **caught by execute-time introspection or an existing test gate before the PR can merge** — none are silent. The classification verdicts themselves (44/2/1) are VERIFIED against the SQL sources in this research, not assumed.

## Open Questions

1. **Owner of `bulk_import_create_lease` / `assert_can_create_lease`**
   - What we know: `CYCLE-1.md:80` documents the analogous trigger chain functions as owned by `postgres`.
   - What's unclear: not re-verified live for these two specific functions in this research session (read from migration sources only).
   - Recommendation: the executor runs the TIGHTEN-02 step-3 owner query as the first introspection; if not `postgres`/superuser, escalate before revoking.

2. **Whether any of the 7 analytics RPCs is genuinely ungated**
   - What we know: `CYCLE-1.md` classifies the GATES_INTERNALLY set as `auth.uid()`-gated; the 3 admin aggregates as `is_admin()`-gated.
   - What's unclear: `get_error_summary`, `get_error_prone_users`, `get_common_errors` weren't body-inspected in this research.
   - Recommendation: the SDEF-03 spot-check resolves all 7 at execute-time; fix-and-keep-grant if any is bare.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP (`apply_migration`, `execute_sql`, `get_advisors`, `list_migrations`) | All TIGHTEN + SDEF-03 + advisor delta | ✓ | live | none needed |
| `bun` + Vitest integration harness | SECTEST-01, bulk-import safety check | ✓ | bun 1.3.x / Vitest 4 | none |
| `.env.local` integration creds (`E2E_OWNER_*`) | running `test:integration` locally | ✓ (CI has secrets) | — | CI `rls-security` job |
| Service-role / admin test client | (only if TIGHTEN-03 Option B chosen) | ✗ | — | **Option A avoids needing it** |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** service-role/admin test client is absent — the recommended TIGHTEN-03 Option A (is_admin gate, keep authenticated grant) sidesteps the need entirely.

## Sources

### Primary (HIGH confidence — live repo + migration sources, this session)
- `supabase/migrations/20251219123000_add_assert_can_create_lease_rpc.sql` — `assert_can_create_lease(p_unit_id uuid, p_primary_tenant_id uuid)` single signature, granted authenticated.
- `supabase/migrations/20251231063902_fix_service_role_function_permissions.sql:70,93` — `assert_can_create_lease(uuid,uuid)` + `get_lead_paint_compliance_report()` granted service_role.
- `supabase/migrations/20260422120000_v23_second_audit_cycle.sql:136` — `bulk_import_create_lease` internal call (positional swap noted).
- `supabase/migrations/20251220021302_add_lead_paint_disclosure_constraint.sql:254-274` — `get_lead_paint_compliance_report()` zero-arg definition.
- `supabase/migrations/20260527150424_phase4_audit_for_all_policies_canonical_grants.sql` — `audit_for_all_policies(text)` body + authenticated-only grant.
- `supabase/migrations/20260602044104_revoke_anon_security_definer_pass3.sql` — the canonical REVOKE-FROM-PUBLIC shape to mirror.
- `tests/integration/rls/anon-rpc-grants.rls.test.ts`, `admin-rpc-grants.rls.test.ts`, `for-all-audit.test.ts`, `bulk-import-create-lease.test.ts` — test patterns + harness facts.
- `tests/integration/setup/supabase-client.ts` — no service-role/admin client; ownerA/ownerB only.
- `src/` + `supabase/functions/` grep — no real `.rpc()` caller for the 3 targets (only generated `supabase.ts` + a comment).
- `.planning/anon-exec-audit/CYCLE-1.md` — owner-privilege mechanism, lineage, REVOKED_CODES rationale.

### Secondary (milestone research, already verified)
- `.planning/research/{SUMMARY,CLASSIFICATION,ADVISOR-STATE}.md` — the 44/2/1 classification + advisor finding set + Supabase doc links (lint 0008, 0027, function-revoke guide).
- `.claude/skills/rls-policies/SKILL.md`, `.claude/skills/sql-migration-rules/SKILL.md` — conventions.

### Tertiary
- None — no unverified web claims used.

## Metadata

**Confidence breakdown:**
- Classification (44/2/1): HIGH — re-verified against SQL sources + repo grep this session.
- Migration mechanics: HIGH — exact prior-art migration read; signatures confirmed.
- TIGHTEN-02 safety: HIGH on signature (one), MEDIUM-HIGH on owner-privilege (analogous CYCLE-1 evidence; live owner query pending at execute-time, gated by bulk-import test).
- TIGHTEN-03 recommendation: HIGH — harness verified to lack service-role/admin client.
- Test strategy: HIGH — extends an existing, passing pattern.

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stable domain; re-grep `src/`/`supabase/functions/` and re-run signature introspection if the repo changed)
