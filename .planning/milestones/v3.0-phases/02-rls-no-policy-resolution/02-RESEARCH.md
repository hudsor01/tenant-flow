# Phase 2: RLS-No-Policy Resolution - Research

**Researched:** 2026-06-02
**Domain:** Supabase/PostgreSQL Row Level Security, `pg_policy`/`relacl` grant model, `pg_graphql` schema exposure, prod-migration via MCP
**Confidence:** HIGH (repo + skill + advisor-research grounded) / **one MEDIUM gap: live prod state of the 10 tables must be re-introspected at plan/execute time — MCP tools are not available to this researcher agent**

## Summary

This phase makes the already-fail-closed lockdown **explicit and documented** on all 10 `rls_enabled_no_policy` tables, and revokes the 5 vestigial `authenticated` table-grants that leak schema through `pg_graphql` `/graphql/v1` introspection (lint 0027). RLS is ON with 0 policies on all 10 → `authenticated`/`anon` are already default-deny; nothing is currently exploitable. The work is positive-policy + grant-revoke + tests, with **zero RLS regressions** as the bar.

**The central question — why was the `app_config` `service_role_only` policy DROPPED in `20260504164842`? — is RESOLVED.** It was dropped because `tests/integration/rls/for-all-audit.test.ts` (which gates `rls-security` CI) treated ANY non-allowlisted `service_role FOR ALL` policy as a defect, and the migration author chose to delete the policy rather than allowlist it. **That blocker no longer exists.** During Phase 1, `for-all-audit.test.ts` was rewritten (see migration `20260602202339`, TIGHTEN-03) to pin an `is_admin()` *gate* on `audit_for_all_policies` instead of asserting "zero FOR ALL policies" — and its header comment now *explicitly anticipates Phase 2 adding `service_role_only` FOR ALL policies* and states a blanket "zero FOR ALL service_role policies" assertion "would be wrong going forward anyway." Additionally, the `verify-security-posture.md` QUERY 9 / `for-all-audit` drift check only counts `FOR ALL` policies scoped `TO authenticated` (not `TO service_role`). **Therefore the canonical `service_role_only FOR ALL TO service_role USING(true) WITH CHECK(true)` policy from the `rls-policies` skill is safe to add to all 10 tables and will NOT re-trip the audit that caused the original drop.** The only reason it was redundant in `20260504164842` (service_role has BYPASSRLS, so the policy enforces nothing) remains true — but redundant-for-enforcement is exactly the point: the policy exists to *clear lint 0008 and document intent*, not to enforce access. Reconciliation complete.

**Primary recommendation:** One atomic prod migration that (a) adds `CREATE POLICY "service_role_only" ON <t> FOR ALL TO service_role USING(true) WITH CHECK(true)` to all 10 tables, and (b) `REVOKE ALL ON <t> FROM authenticated` (+ defensive `FROM anon`, `FROM PUBLIC`) on the 5 Tier-A tables. No RESTRICTIVE/deny-all anywhere. Plus `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` pinning the authenticated/anon deny side per table; the service_role allow side is verified out-of-band (advisor lint 0008 → 0 + local/MCP introspection), because the CI `rls-security` harness does not carry a service-role key.

<user_constraints>
## User Constraints

> No `CONTEXT.md` exists for this phase (`/gsd:discuss-phase` not run). Constraints below are extracted from `ROADMAP.md` § "Cross-Cutting Constraints", `REQUIREMENTS.md`, and the milestone research docs — treat them as locked.

### Locked Decisions (from ROADMAP Cross-Cutting Constraints + REQUIREMENTS Out of Scope)
- Every grant/policy change is a **PROD migration via Supabase MCP `apply_migration`**; reconcile the repo filename with the prod-assigned timestamp via `mcp__supabase__list_migrations` after each apply (per `migration-mcp-prod-drift` memory).
- **Never re-introduce the deny-all / RESTRICTIVE rule** removed in `20260527151342` (rejected per `AUDIT-2026-05-29`). Resolution uses **positive `service_role_only` FOR ALL policies only**.
- The resolution policy shape is the canonical `service_role_only` from the `rls-policies` skill: `FOR ALL TO service_role USING (true) WITH CHECK (true)`, named `service_role_only` — **except** any table found to have a genuine `authenticated` read path, which instead gets the *correct scoped* policy.
- The integration suite is **PostgREST-only and (in CI) carries NO service-role key** — pin grant/deny state via `.from()` reachability probes + the advisor, not by reading `pg_proc.proacl`/`pg_policy` from the test.
- Each phase ships as **ONE atomic PR** through the perfect-PR gate (two consecutive zero-finding deep review cycles). Branch protection on `main` requires `checks` + `e2e-smoke` + `rls-security`.
- **No PostgreSQL ENUMs** (CLAUDE.md). N/A to this phase (no new columns), but note `security_events` was created with two ENUM types — do not touch them here.

### Claude's Discretion
- Migration file naming/description (must follow `sql-migration-rules`: `YYYYMMDDHHmmss_<desc>.sql`, lowercase SQL, header comment, per-step comments).
- Whether the 10 policies + 5 revokes ship in one migration file or two (recommendation: ONE, atomic).
- Test file name + structure (recommendation: new `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts`).
- Whether to also append a durable note to `.planning/anon-exec-audit/` lineage (recommendation: yes — continue the CYCLE-2 format with a short Phase-2 addendum; Phase 3 will consolidate).

### Deferred Ideas (OUT OF SCOPE)
- Periodic advisor drift check in CI (advisor not run in CI today) — deferred to a later milestone.
- `search_path` hardening sweep on the broader function set — separate concern.
- `auth_leaked_password_protection` (paid HaveIBeenPwned feature) — explicitly excluded.
- Dropping orphaned functions / any function tightening — that was Phase 1; Phase 2 touches tables only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **RLSNP-01** | Confirm intent for the 4 ambiguous Tier-A tables (`app_config`, `email_suppressions`, `security_events`, `stripe_webhook_events`) — verify no expected `authenticated` read path before lockdown; add a scoped policy instead if a real read path exists. | § Intent Confirmation (RLSNP-01) below — all 4 verified service-role-only via repo grep + reader-function tracing. Live confirmation step specified. |
| **RLSNP-02** | All 10 tables get an explicit policy clearing lint 0008 + documenting intent in-migration (canonical `service_role_only` FOR ALL; scoped policy where authenticated access is needed). | § The Migration (RLSNP-02 + RLSNP-03) + § Architecture Patterns. None of the 10 needs authenticated access → all get `service_role_only`. |
| **RLSNP-03** | Revoke the vestigial `authenticated` table-grant on the 5 Tier-A tables so schema is no longer exposed via `pg_graphql` introspection (lint 0027), without re-adding the `20260527151342` deny-all. | § The Migration — `REVOKE ALL ON <t> FROM authenticated` + defensive `anon`/`PUBLIC`. Tier-B already has no authenticated grant. |
| **SECTEST-02** | `tests/integration/rls/` pins all 10 tables denying `authenticated`/`anon` and allowing `service_role`, per confirmed intent. | § Validation Architecture — deny side testable in CI; allow side out-of-band (advisor + local/MCP), because CI harness has no service-role key. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| RLS policy enforcement (deny `authenticated`/`anon`) | Database (RLS) | — | RLS protects rows; already fail-closed on all 10. |
| Schema-visibility lockdown (`pg_graphql` introspection) | Database (table GRANT / `relacl`) | — | `pg_graphql` exposes objects the `authenticated` role can SELECT regardless of RLS. The fix is `REVOKE`, not policy. Lint 0027. |
| Service-role data access (writers: triggers, edge fns, cron) | Database (BYPASSRLS) | API/Edge | service_role + SECURITY DEFINER function owners bypass RLS; the new policy does not affect them. |
| Lint-clearing / intent documentation | Database (explicit policy + `COMMENT ON`) | — | Lint 0008 wants an explicit policy OR documented deliberate lockdown. The `service_role_only` policy + table comment satisfies both. |
| Regression pinning | Integration test (PostgREST) + Advisor (out-of-band) | — | Deny side via authenticated/anon `.from()` probes; allow side via advisor lint 0008 → 0 (CI harness has no service-role key). |

## Intent Confirmation (RLSNP-01) — the 4 ambiguous Tier-A tables

For each table: searched `src/` + `supabase/functions/` for `.from('<t>')` / `.rpc` AND traced reader/writer functions in `supabase/migrations/`. Result: **all 4 are genuinely service-role-only — no `authenticated` read path. Lockdown is SAFE for all 4.** Each `[VERIFIED: codebase grep]` finding below was confirmed by `grep -rn` over `src/` + `supabase/functions/` (excluding the generated `src/types/supabase.ts`).

| Table | Direct client/edge access? | Reader/writer path | Verdict |
|-------|---------------------------|--------------------|---------|
| `app_config` | **None** `[VERIFIED: codebase grep]` — only `src/types/supabase.ts` (generated). | Read by SECURITY DEFINER trigger functions `notify_n8n_*` / `notify_critical_error` (`SELECT value FROM public.app_config WHERE key=...`, `20260504162221`), which run as owner with BYPASSRLS. `20260504164842`'s own comment confirms "No callers need a policy." | **service_role-only. Safe.** |
| `email_suppressions` | **None** `[VERIFIED: codebase grep]` — no `.from('email_suppressions')` in `src/` or `supabase/functions/`; only `src/types/supabase.ts`. (The `_shared/resend.ts` hit was the word "suppress" in code, not a table read.) | Created `20260219100002` with comment "Only the service role (backend) reads/writes this table. Authenticated users and anon have no access." Written by the Resend webhook handler (service_role), read by email-send services before dispatch (service_role). | **service_role-only. Safe.** |
| `security_events` | **None** `[VERIFIED: codebase grep]` — no `.from('security_events')` / `securityEvents` / `security-events` in `src/` or `supabase/functions/`. | Created `20251219033837` **with two `authenticated` SELECT policies** (admin via `auth.jwt()->'app_metadata'->>'user_type' = 'ADMIN'`, and self-view via `user_id = auth.uid()`). The admin policy is **dead**: the `user_type → is_admin` migration removed `user_type`, so no row/JWT ever matches `'ADMIN'`. Live advisor reports **0 policies** on this table (the policies were dropped in prod). No frontend admin-log viewer exists. Writes are service_role; cleanup is a SECURITY DEFINER cron fn. | **service_role-only by current design. Safe.** **Flag:** historically had an authenticated read intent (admin log viewer) — see Open Question 1. The original intent is defunct (dead JWT check + no UI), so locking down matches current reality, but confirm with the user that there is no near-term plan to ship an admin security-log viewer. |
| `stripe_webhook_events` | **Edge function only** `[VERIFIED: codebase grep]` — `supabase/functions/stripe-webhooks/index.ts` is the sole `.from("stripe_webhook_events")` caller (idempotency PK check + insert/update). | That edge function creates its client with `SUPABASE_SERVICE_ROLE_KEY` `[VERIFIED: codebase grep — index.ts:38,51]` → **service_role, bypasses RLS**. The `subscription-keys.ts` hit is a comment, not a read. | **service_role-only. Safe.** |

`processed_internal_events` (the 5th Tier-A table) is non-ambiguous: it's in the `rls-policies` skill's documented service-role list, created `20251201020714` with "Enable RLS (no policies needed - admin client only)", and accessed only via the `acquire_internal_event_lock` SECURITY DEFINER RPC + cron cleanup. **service_role-only. Safe.** `[VERIFIED: codebase grep — zero `.from()` hits]`.

**Net RLSNP-01 outcome: all 5 Tier-A tables are confirmed service-role-only. Zero need a scoped authenticated policy. Every one of the 10 gets `service_role_only`.**

## Standard Stack

No new packages. This is pure PostgreSQL DDL applied via the Supabase MCP. The "stack" is the existing toolchain:

| Tool | Purpose | Why Standard |
|------|---------|--------------|
| `mcp__supabase__apply_migration` | Apply the prod migration | Project-standard; prod is the source of truth (no local DB reset for these prod-only tables). |
| `mcp__supabase__list_migrations` | Reconcile repo filename ↔ prod-assigned timestamp | Mandatory per `migration-mcp-prod-drift` memory. |
| `mcp__supabase__execute_sql` | Live introspection (grants/policies) before + after | Verify the MEDIUM-confidence gap (current live state) and the post-apply allow side. |
| `mcp__supabase__get_advisors(security)` | Verification oracle: lint 0008 10 → 0, lint 0027 cleared | The only way to prove the allow/exposure side in CI-less fashion. |
| Vitest 4 + `@supabase/supabase-js` (publishable key + ownerA/ownerB JWTs) | `tests/integration/rls/` deny-side regression pins | Existing harness; runs in `rls-security` CI. |

**No installs.** Skip the Package Legitimacy Audit (no external packages).

## The Migration (RLSNP-02 + RLSNP-03)

### Per-table DDL — the canonical shape

```sql
-- For all 10 tables: explicit positive lockdown policy (clears lint 0008, documents intent).
-- service_role has BYPASSRLS so this enforces nothing — it exists to make the
-- deliberate lockdown explicit and to satisfy the advisor. NOT a RESTRICTIVE/deny-all.
create policy "service_role_only"
  on public.<table>
  for all
  to service_role
  using (true)
  with check (true);
```
Source: `.claude/skills/rls-policies/SKILL.md` lines 81-86 (`CREATE POLICY "service_role_only" ON webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);`). `[CITED: .claude/skills/rls-policies/SKILL.md]`

Apply to **all 10**: `app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`, `security_audit_log`, `user_access_log`, `webhook_attempts`, `webhook_events`, `webhook_metrics`.

```sql
-- Tier-A only (5 tables): revoke the vestigial authenticated grant that leaks
-- schema via pg_graphql /graphql/v1 introspection (lint 0027). RLS already denies
-- the ROWS; this denies SCHEMA VISIBILITY. Defensive anon + PUBLIC revokes too.
revoke all on public.<tierA_table> from authenticated;
revoke all on public.<tierA_table> from anon;
revoke all on public.<tierA_table> from public;
```
Apply the REVOKE to the **5 Tier-A** tables: `app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`.

```sql
-- Document intent so a future reader (and lint 0008) sees deliberate lockdown.
comment on table public.<table> is
  'Service-role-only <purpose>. RLS enabled; the only policy is service_role_only
   (FOR ALL TO service_role). authenticated/anon have no grant and no policy →
   zero rows + no /graphql/v1 schema exposure. Writes happen via service_role
   (edge functions / SECURITY DEFINER triggers / cron), all BYPASSRLS.';
```

### Idempotency + ordering
- Guard every `create policy` with `drop policy if exists "service_role_only" on public.<t>;` first (re-runnable; some tables may already carry a stale-named policy — confirm via live introspection, see MEDIUM gap).
- `revoke` is naturally idempotent.
- One atomic migration file. Lowercase SQL, header comment block (purpose, affected tables, the `20260504164842` reconciliation note, the "NOT a deny-all" note), per-step comments — per `sql-migration-rules`.

### Why this does NOT break service-role writers
service_role (edge functions like `stripe-webhooks`) and SECURITY DEFINER function owners (`notify_n8n_*`, `acquire_internal_event_lock`, cron cleanup fns) **bypass RLS entirely** (`BYPASSRLS`), so adding a `service_role_only` policy is inert for them — it only makes the existing posture explicit. The `REVOKE ... FROM authenticated` does not touch service_role's grant. `[VERIFIED: codebase grep + 20260504164842 migration comment]`.

### What must NOT appear in the migration
- ❌ No `RESTRICTIVE` policies. (`rls-policies`: "Always `PERMISSIVE`".)
- ❌ No `deny_all_*` / `USING (false)` policies — that's the `20260527151342`-removed rule.
- ❌ No `FOR ALL TO authenticated` policy (would trip `for-all-audit` QUERY 9 + CLAUDE.md zero-tolerance).
- ❌ No changes to the two `security_events` ENUM types (no ENUM work in this phase).

## Architecture Patterns

### Flow: how a request reaches (or is denied) one of these tables

```
                         ┌─────────────────────────────────────────────┐
  authenticated user ──▶ │ PostgREST /rest/v1/<table>                   │
  (ownerA JWT)           │   1. table GRANT check (relacl)              │
                         │      Tier-A post-revoke: NO grant → 42501    │──▶ permission error
                         │      Tier-B: NO grant → 42501                │
                         │   (pre-revoke Tier-A: grant exists →)        │
                         │   2. RLS policy eval: only service_role_only │──▶ 0 rows (empty [])
                         └─────────────────────────────────────────────┘
                         ┌─────────────────────────────────────────────┐
  anon (publishable) ──▶ │ same path → no grant / no anon policy        │──▶ 42501 or empty
                         └─────────────────────────────────────────────┘
                         ┌─────────────────────────────────────────────┐
  service_role / ──────▶ │ BYPASSRLS — skips policy eval entirely        │──▶ full access (writers)
  SECDEF fn owner /      │ service_role_only policy is inert here        │
  postgres (SQL editor)  └─────────────────────────────────────────────┘
                         ┌─────────────────────────────────────────────┐
  pg_graphql /graphql/v1 │ introspection lists objects the role can     │
  (signed-in user)  ───▶ │ SELECT. Tier-A grant → schema LEAKS (0027).  │──▶ REVOKE closes this
                         │ Post-revoke: object not discoverable.        │
                         └─────────────────────────────────────────────┘
```

**Key insight:** RLS (rows) and GRANT (schema visibility) are **orthogonal**. Lint 0008 is about the policy; lint 0027 is about the grant. This phase touches both, and they require different DDL (`CREATE POLICY` vs `REVOKE`). `[CITED: supabase.com/docs/.../0027_pg_graphql_authenticated_table_exposed]`

### Pattern: positive lockdown policy, not deny-all
**What:** A `FOR ALL TO service_role USING(true) WITH CHECK(true)` policy is a *positive grant-policy* for the only role that should touch the table. It clears lint 0008 because the table now has ≥1 policy.
**When to use:** Audit/infra/webhook tables with no authenticated access.
**Why not deny-all:** A `USING(false)` policy adds nothing (RLS-enabled-no-applicable-policy already denies) AND was explicitly rejected (`20260527151342` / `AUDIT-2026-05-29`).

### Anti-Patterns to Avoid
- **Re-adding the `app_config` policy that was dropped in `20260504164842` without understanding the reason** → resolved above; safe now because `for-all-audit.test.ts` was rewritten in Phase 1 and only flags `TO authenticated` FOR ALL.
- **Revoking grants but forgetting the policy** (clears 0027, not 0008) or **adding the policy but forgetting the revoke** (clears 0008, not 0027). Both lints must close. Tier-A needs both; Tier-B needs only the policy (already no authenticated grant).
- **Testing the service_role allow side in the CI harness** — it has no service-role key; the test would silently skip (false green). Verify allow side out-of-band.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this table actually denied to authenticated?" | A bespoke `pg_policy`/`relacl` reader in the test | Advisor lint 0008/0027 + `.from()` reachability probe | The PostgREST harness can't read catalogs; the advisor already computes exactly this. |
| Verifying service_role still works | A service-role client in the CI test | Advisor (lint 0008 → 0) + local/MCP `execute_sql` | CI harness has no service-role key (confirmed: `rls-security-tests.yml` passes only publishable + owner creds). |
| Documenting deliberate lockdown | A separate doc nobody reads | `COMMENT ON TABLE` in the migration + the `service_role_only` policy itself | Lint 0008 accepts an explicit policy as the documentation. |

**Key insight:** The Supabase Security Advisor *is* the verification engine for this domain — both findings (0008, 0027) are advisor lints, so the advisor is the authoritative before/after oracle.

## Runtime State Inventory

> This is a policy/grant change on prod-only infra tables — no rename, no stored-string migration. Each category checked explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — no row data is renamed/migrated; policies/grants are metadata, not row content. `security_events`/`webhook_*`/`app_config` rows are untouched. | None. |
| Live service config | **None affecting these tables** — `app_config` *stores* n8n webhook URLs/secrets as rows, but those rows are not modified; only the table's policy/grant changes. Reads via `notify_n8n_*` (BYPASSRLS) are unaffected. | None. |
| OS-registered state | **None** — no Task Scheduler / cron registration changes. The existing pg_cron cleanup jobs (`cleanup_old_security_events`, `cleanup_old_internal_events`) run as SECURITY DEFINER and bypass RLS — unaffected by the new policy. | None — verified the cleanup fns are SECURITY DEFINER (`20251219033837`, `20251201020714`). |
| Secrets/env vars | **None changed.** `SUPABASE_SERVICE_ROLE_KEY` (used by `stripe-webhooks`) is unchanged; it bypasses RLS. No env var references a policy/grant by name. | None. |
| Build artifacts | **`src/types/supabase.ts`** is generated from the schema. Adding policies/revoking grants **may change the generated GraphQL/PostgREST type surface** for these tables (a revoked authenticated grant can drop a table from the authenticated-role type view). | After migration, run `bun run db:types` and commit any diff. Verify the diff is limited to these 10 tables and does not break `typecheck`. **Include this as a task.** |

**Canonical question — "after every file is updated, what runtime systems still have the old string cached?":** N/A (no string rename). The only regenerated artifact is `supabase.ts` (build-artifact row above).

## Common Pitfalls

### Pitfall 1: Re-adding a policy that was deliberately dropped
**What goes wrong:** Blindly re-adding `app_config`'s `service_role_only` FOR ALL policy re-trips the audit that caused its `20260504164842` drop.
**Why it happens:** The drop migration's comment ("service_role has BYPASSRLS, the policy never enforced anything") reads like a blanket "don't add this policy" rule.
**How to avoid:** Read `for-all-audit.test.ts` *as it exists today* (post-Phase-1). It now pins an `is_admin()` gate and only flags `FOR ALL TO authenticated`. `service_role_only` (TO service_role) is explicitly anticipated by its header comment. Confirmed safe.
**Warning signs:** `rls-security` CI failing on `for-all-audit.test.ts` after the migration → means the test wasn't actually rewritten as expected; re-read it before shipping.

### Pitfall 2: Clearing one lint but not the other
**What goes wrong:** Policy added (0008 clears) but the authenticated grant left in place (0027 stays), or vice versa.
**Why it happens:** RLS and GRANT feel like the same thing; they're not.
**How to avoid:** Tier-A = policy + revoke (both lints). Tier-B = policy only (no authenticated grant exists). Re-run `get_advisors(security)` and confirm **both** 0008=0 and the 5 Tier-A tables drop off 0027.

### Pitfall 3: False-green service_role test in CI
**What goes wrong:** A test that uses a service-role client to assert "service_role can read" silently skips in CI (`describe.skipIf(skipReason)` when `SUPABASE_SERVICE_ROLE_KEY` absent), reporting green without running.
**Why it happens:** `rls-security-tests.yml` does NOT pass the service-role key (confirmed: only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + owner creds). `rls-non-empty-smoke.test.ts` already demonstrates this skip behavior.
**How to avoid:** Do NOT put the allow-side assertion in the CI-gated deny test. Verify allow side via advisor + local/MCP introspection (out-of-band), and document it in the audit doc. If a service-role allow assertion is desired in code, gate it with `describe.skipIf` and treat it as local-only.

### Pitfall 4: Repo↔prod migration drift hides true current state
**What goes wrong:** The repo migrations are *contradictory* about these tables: `email_suppressions` was created with 3 service_role policies (`20260219100002`) that no repo migration drops, yet the live advisor reports it as `rls_enabled_no_policy` (0 policies). `security_events` was created with 2 authenticated SELECT policies that no repo migration fully drops, yet the advisor reports 0 policies. **Prod is the source of truth, and it diverges from repo migration history.**
**Why it happens:** Migrations applied via MCP get prod-assigned timestamps; ad-hoc prod fixes and superseding migrations leave the repo an incomplete record (per `migration-mcp-prod-drift` + the "stale public.sql dump" memory).
**How to avoid:** **Before writing the migration, run live introspection** (the MEDIUM gap below) to get the ACTUAL current policy names + grants per table. Use `drop policy if exists` for whatever name is actually present. Do not assume the repo migrations describe prod.

## Code Examples

### The integration test deny-side probe (per table)
```typescript
// Source: pattern from tests/integration/rls/blogs-status-workflow.rls.test.ts:360-361
//         + tests/integration/rls/anon-rpc-grants.rls.test.ts (REVOKED_CODES set)
// A service-role-only table denies authenticated/anon two ways depending on grant:
//   - NO table grant (Tier-B, and Tier-A AFTER revoke) → PostgREST 42501 (permission denied)
//   - grant present but RLS denies all rows → error null + data []  (pre-revoke shape)
// Accept BOTH so the test pins "authenticated cannot read this table", not a specific mechanism.
const DENIED_CODES = ["42501", "PGRST301", "PGRST302", "PGRST116"];

for (const table of LOCKED_TABLES) {
  it(`${table}: authenticated cannot read rows`, async () => {
    const { data, error } = await authnClient.from(table).select("*").limit(1);
    if (error) {
      expect(DENIED_CODES).toContain(error.code); // no grant → permission denied
    } else {
      expect(data ?? []).toHaveLength(0);          // grant + RLS deny → empty
    }
  });

  it(`${table}: anon cannot read rows`, async () => {
    const { data, error } = await anonClient.from(table).select("*").limit(1);
    if (error) {
      expect(DENIED_CODES).toContain(error.code);
    } else {
      expect(data ?? []).toHaveLength(0);
    }
  });
}
```
> **Post-revoke expectation (Tier-A):** after `REVOKE ALL ... FROM authenticated`, the authenticated probe should hit the **error branch** (42501), proving the grant is gone (the 0027 fix). Asserting "error OR empty" keeps the test robust to PostgREST version differences, but the audit doc should note the *expected* branch per table so a future regression (grant silently re-added → switches to empty-array branch) is caught by the advisor 0027 re-flag.

### Live introspection to run BEFORE writing the migration (fills the MEDIUM gap)
```sql
-- Run via mcp__supabase__execute_sql against bshjmbshupiibfiewpxb.
with tbls(t) as (values
  ('app_config'),('email_suppressions'),('processed_internal_events'),
  ('security_events'),('stripe_webhook_events'),('security_audit_log'),
  ('user_access_log'),('webhook_attempts'),('webhook_events'),('webhook_metrics'))
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count,
  (select array_agg(p.polname) from pg_policy p where p.polrelid = c.oid) as policy_names,
  has_table_privilege('authenticated','public.'||c.relname,'SELECT') as authn_select,
  has_table_privilege('anon','public.'||c.relname,'SELECT') as anon_select,
  has_table_privilege('service_role','public.'||c.relname,'SELECT') as svc_select,
  c.relacl::text as relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
join tbls on tbls.t=c.relname
where n.nspname='public' order by c.relname;
```
Expected (per research) BEFORE migration: `policy_count=0` for all 10; `authn_select=true` for the 5 Tier-A; `authn_select=false` for the 5 Tier-B. **Confirm this; if any Tier-B shows an authenticated grant, or any table already has a policy, adjust the migration accordingly.**

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `deny_all_*` PERMISSIVE `USING(false)` policies on infra tables | RLS-enabled-no-applicable-policy default deny + explicit positive `service_role_only` policy | `20260527151342` removed deny-all; this phase adds the positive policy | The positive policy is the *only* sanctioned way to make lockdown explicit. |
| Authenticated grant left on infra tables (RLS "protects" them) | `REVOKE` authenticated grant — RLS protects rows, not schema | Supabase lint 0027 (pg_graphql exposure) made this explicit | Closes the GraphQL introspection schema leak. |
| `auth.jwt()->'app_metadata'->>'user_type' = 'ADMIN'` admin checks | `is_admin()` helper (`users.is_admin boolean`) | `user_type → is_admin` migration | The old `security_events` admin SELECT policy is dead — never matches. Reinforces that `security_events` has no live authenticated read path. |

**Deprecated/outdated:**
- The `20260504164842` rationale ("never add a service_role FOR ALL policy") is **superseded** by the Phase-1 rewrite of `for-all-audit.test.ts`. The drop was correct *at the time* (the test then flagged all FOR ALL); it is not a standing prohibition.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Live prod state of the 10 tables matches research expectation (all `policy_count=0`; Tier-A has authenticated grant, Tier-B does not). Could not verify directly — **MCP tools unavailable to this researcher agent**. | The Migration / Live introspection | If a table already has a differently-named policy or unexpected grant, the `drop policy if exists` name / revoke set is wrong. **Mitigation: the planner MUST run the introspection SQL above before writing the migration. This is the single MEDIUM-confidence item.** |
| A2 | The CI `rls-security` harness has no service-role key, so the allow-side cannot be CI-tested. | Validation Architecture | If a service-role secret were added to CI later, an in-CI allow test would become possible. Low risk; verified against current `rls-security-tests.yml`. |
| A3 | `security_events` has no near-term plan for an authenticated admin-log viewer (its original authenticated read intent is defunct). | Intent Confirmation (RLSNP-01) | If the user plans to ship an admin security-log UI soon, locking down now means a follow-up to add a scoped `is_admin()` SELECT policy. Surfaced as Open Question 1. |

## Open Questions (RESOLVED)

1. **`security_events` authenticated read intent — confirm defunct.** RESOLVED → lock down. The live advisor reports 0 policies, the only historical authenticated policy gated on the removed `user_type='ADMIN'` check (dead post-`is_admin` migration), and no frontend reads it. No admin-security-log-viewer is on the v3.0 roadmap (REQUIREMENTS.md scopes v3.0 to advisor remediation only). Plan 02-01 Task 3 records this verdict in CYCLE-3.md; if a future milestone needs an admin viewer it adds a scoped `is_admin()` SELECT policy then — out of v3.0 scope.
   - Evidence: created with admin + self-view authenticated SELECT policies; the admin check is dead; advisor 0 policies; no frontend read.

2. **Exact live policy names per table (drift).** RESOLVED at execute-time by the A1 hard gate (Plan 02-01 Task 1). Repo migrations disagree with the advisor about which policies exist on `email_suppressions` / `security_events`; the migration is authored against the LIVE introspection result, and `drop policy if exists "service_role_only"` is collision-safe regardless. Any other stale live policies are recorded + handled per the live result in Task 1.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP (`apply_migration`, `execute_sql`, `get_advisors`, `list_migrations`) | Applying the prod migration + verification | ✓ (in the orchestrator/main session; **NOT in this researcher agent — tools stripped**) | prod `bshjmbshupiibfiewpxb` | None — MCP is mandatory for prod migration. |
| `bun` + Vitest + `@supabase/supabase-js` | Integration tests | ✓ | bun 1.3.x / Vitest 4 | None. |
| `bun run db:types` | Regenerate `supabase.ts` post-migration | ✓ | — | None. |
| CI service-role key (`SUPABASE_SERVICE_ROLE_KEY`) | Service-role allow-side CI test | ✗ (not in `rls-security-tests.yml`) | — | Out-of-band advisor + local introspection (this is the documented approach, not a regression). |

**Missing dependencies with no fallback:** None blocking. The service-role-in-CI absence is by design — the allow side is verified out-of-band.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom; `@supabase/supabase-js` (publishable key + ownerA/ownerB JWTs) |
| Config file | `tests/integration/` (run via `bun run test:integration`); CI: `.github/workflows/rls-security-tests.yml` |
| Quick run command | `bun run test:integration -- --run tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` (local; needs `.env.local`) |
| Full suite command | `bun run test:integration` |

### Phase Requirements → Validation Signal Map
| Req ID | Behavior | Validation Type | Signal / Command | Where |
|--------|----------|-----------------|------------------|-------|
| RLSNP-01 | 4 ambiguous tables confirmed service-role-only | Static + advisor | repo grep (done in this doc) + post-migration advisor 0008=0 | Audit doc + `get_advisors` |
| RLSNP-02 | all 10 tables have an explicit policy → lint 0008 = 0 | **Advisor oracle (out-of-band)** | `get_advisors(security)` → `rls_enabled_no_policy` **10 → 0** | MCP, Phase-3 gate |
| RLSNP-03 | 5 Tier-A authenticated grants revoked → lint 0027 cleared | **Advisor oracle (out-of-band)** + deny probe | `get_advisors(security)` 0027 drops the 5 tables; authenticated `.from()` → 42501 | MCP + CI test |
| SECTEST-02 (deny) | authenticated + anon denied on all 10 | **CI integration test** | per-table `.from().select()` → 42501 OR empty `[]` (DENIED_CODES) | `rls-no-policy-lockdown.rls.test.ts` in `rls-security` CI |
| SECTEST-02 (allow) | service_role still reads/writes all 10 | **Out-of-band** (CI has no service-role key) | local/MCP `execute_sql` as service_role returns rows; lint 0008=0 proves a policy exists; service_role writers (stripe-webhooks, notify_n8n) keep functioning | MCP introspection + advisor |

### Sampling Rate (Nyquist)
- **Per task commit:** `bun run validate:quick` (types + lint + unit) — catches `supabase.ts` regen type breaks.
- **Per migration apply:** `get_advisors(security)` snapshot (0008 count, 0027 list) before vs after.
- **Phase gate (Phase 3):** `get_advisors(security)` → `rls_enabled_no_policy = 0`; full `bun run test:integration` (`rls-security`) green against prod; `for-all-audit.rls.test.ts` still green (the policies don't re-trip it).

### Wave 0 Gaps
- [ ] `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` — new file, covers SECTEST-02 deny side for all 10 tables (authenticated + anon). Uses existing `createTestClient` / `getTestCredentials` + an anon client from the publishable key (pattern: `anon-rpc-grants.rls.test.ts`).
- [ ] No new fixtures or framework install needed — existing `tests/integration/setup/supabase-client.ts` covers it.
- [ ] Live introspection SQL (A1) is a **plan-time prerequisite**, not a test file.

*(The allow side has no CI test by design — documented out-of-band verification, not a gap.)*

## Security Domain

> `security_enforcement` not explicitly set in config → enabled. This phase IS a security change.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Defense-in-depth: RLS (rows) + GRANT revoke (schema) + explicit policy (intent) — three orthogonal layers documented. |
| V4 Access Control | **yes (core)** | Least privilege — `authenticated`/`anon` get zero access to infra/audit tables; only `service_role` (BYPASSRLS) + SECURITY DEFINER owners reach them. |
| V5 Input Validation | no | No user input path on these tables. |
| V6 Cryptography | no | N/A. |
| V7 Error Handling / Logging | indirect | `security_events` / `security_audit_log` / `user_access_log` are the logging substrate being locked down; lockdown does not impair service-role writes. |
| V14 Configuration | yes | `app_config` stores n8n webhook secrets as rows; locking the table's authenticated grant reduces secret-exposure surface (rows already RLS-denied; this closes schema discovery). |

### Known Threat Patterns for Supabase + pg_graphql
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Schema discovery of audit/infra tables via `/graphql/v1` introspection by any signed-in user (lint 0027) | Information Disclosure | `REVOKE ALL ... FROM authenticated` on the 5 Tier-A tables. |
| Ambiguous "RLS on, 0 policies" mistaken for "no protection" (lint 0008) | (Auditability / Repudiation) | Explicit `service_role_only` policy + `COMMENT ON TABLE` documenting deliberate lockdown. |
| Re-introducing a deny-all that masks a real future policy / trips CI | Tampering (process) | Positive `service_role_only` policy only; never RESTRICTIVE. |
| Policy/grant change silently breaking a service-role writer (e.g. stripe-webhooks idempotency) | Denial of Service | service_role + SECDEF owners BYPASSRLS — verified inert; post-apply advisor + `test:integration` confirm no regression. |

## Sources

### Primary (HIGH confidence)
- `.claude/skills/rls-policies/SKILL.md` (lines 81-113) — canonical `service_role_only` pattern + documented service-role-only table list. `[CITED]`
- `.claude/skills/sql-migration-rules/SKILL.md` — migration naming + RLS-on-every-table conventions. `[CITED]`
- `tests/integration/rls/for-all-audit.test.ts` (post-Phase-1) — proves the `service_role_only` FOR ALL policy will NOT re-trip the audit; explicitly anticipates Phase 2. `[VERIFIED: file read]`
- `supabase/migrations/20260504164842_drop_app_config_for_all_service_role_policy.sql` — the drop + its reason (for-all-audit defect). `[VERIFIED: file read]`
- `supabase/migrations/20260527151342_phase4_drop_redundant_deny_all_authenticated_policies.sql` — the removed deny-all rule. `[VERIFIED: file read]`
- `supabase/migrations/20251219033837_create_security_events.sql`, `20260219100002_create_email_suppressions.sql`, `20251201020714_create_processed_internal_events.sql` — original table intents. `[VERIFIED: file read]`
- `supabase/functions/stripe-webhooks/index.ts` — sole `stripe_webhook_events` caller, uses service-role key. `[VERIFIED: codebase grep]`
- `.github/workflows/rls-security-tests.yml` — CI harness env (no service-role key). `[VERIFIED: file read]`
- `tests/integration/rls/{anon-rpc-grants,rls-non-empty-smoke,blogs-status-workflow}.rls.test.ts` — harness patterns (REVOKED_CODES, service-role skipIf, empty-array deny shape). `[VERIFIED: file read]`
- `.planning/research/{CLASSIFICATION,ADVISOR-STATE,SUMMARY}.md` + `.planning/REQUIREMENTS.md` + `.planning/ROADMAP.md` + `.planning/anon-exec-audit/CYCLE-2.md` — milestone synthesis + Phase-1 lineage. `[VERIFIED: file read]`

### Secondary (MEDIUM confidence)
- Supabase docs lint 0008 (`rls_enabled_no_policy`) + lint 0027 (`pg_graphql_authenticated_table_exposed`) — remediation rationale, per `ADVISOR-STATE.md` links (RLS protects rows not schema visibility). `[CITED: supabase.com/docs/guides/database/database-advisors]`

### Tertiary (LOW confidence)
- **Live prod state of the 10 tables (current policy names + grants).** Could NOT be queried — MCP tools are not exposed to this researcher agent (documented upstream `tools:`-frontmatter bug). The planner/executor MUST run the introspection SQL (§ Code Examples) against `bshjmbshupiibfiewpxb` before writing the migration. This is the single item to verify.

## Metadata

**Confidence breakdown:**
- Intent confirmation (RLSNP-01): **HIGH** — repo grep is exhaustive; all 5 Tier-A tables traced to service-role-only readers/writers.
- `20260504164842` reconciliation (the central question): **HIGH** — `for-all-audit.test.ts` read directly; it no longer flags `TO service_role` FOR ALL and explicitly anticipates this phase.
- Migration DDL shape: **HIGH** — canonical from the `rls-policies` skill; constraints from ROADMAP.
- Test strategy (SECTEST-02): **HIGH** — CI harness env + existing skipIf/deny patterns verified; allow-side out-of-band confirmed.
- Live prod table state (policy names/grants): **MEDIUM** — must be introspected at plan time (MCP unavailable here).

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stable domain; the one volatile input is live prod state, which the planner re-verifies at execute time anyway).
