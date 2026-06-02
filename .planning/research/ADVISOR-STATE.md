# Research: Live Supabase Security Advisor State (v3.0 Security Hardening)

**Captured:** 2026-06-02 via `mcp__supabase__get_advisors(security)` against prod project `bshjmbshupiibfiewpxb`.
**Method:** Supabase MCP server (`get_advisors`, `execute_sql`, `search_docs`) + canonical skills (`rls-policies`, `sql-migration-rules`) + repo `.rpc()` grep.

## Exact finding set (security advisor)

| Lint | Level | Count | In scope? |
|------|-------|-------|-----------|
| `authenticated_security_definer_function_executable` | WARN | 46 | ✅ classify + tighten |
| `rls_enabled_no_policy` | INFO | 10 | ✅ resolve |
| `auth_leaked_password_protection` | WARN | 1 | ❌ OUT (paid HaveIBeenPwned feature, intentionally disabled) |

The prior 3-pass anon lockdown (PRs #758/#771) already drove `anon_security_definer_function_executable` → **0**; every one of the 46 functions has `anon EXECUTE = false` (verified). What remains is the **authenticated** side.

## Canonical remediation references (Supabase docs)

- **Lint 0008 `rls_enabled_no_policy`** — https://supabase.com/docs/guides/database/database-advisors?lint=0008_rls_enabled_no_policy
  RLS-on + zero-policies = fail-closed (default deny). The lint flags ambiguity, not a vulnerability. Resolve by adding an explicit policy (even a `service_role_only` FOR ALL) OR documenting deliberate lockdown.
- **Lint 0027 `pg_graphql_authenticated_table_exposed`** (ADJACENT, highly relevant) — https://supabase.com/docs/guides/database/database-advisors?lint=0027_pg_graphql_authenticated_table_exposed
  > "If `authenticated` can SELECT any column on a table … `pg_graphql` exposes that object's name, columns, relationships, and generated mutations through `/graphql/v1` introspection to signed-in users. **RLS does not change that because it protects rows, not schema visibility.** … revoke SELECT from `authenticated` for objects that every account holder should not discover."
  → Directly justifies revoking the **vestigial `authenticated` table-grants** found on 5 of the 10 RLS-no-policy tables (RLS denies the rows, but the grant still leaks schema via GraphQL introspection).
- **Revoke function execution** — https://supabase.com/docs/guides/troubleshooting/how-can-i-revoke-execution-of-a-postgresql-function-2GYb0A
- **Database Functions** — https://supabase.com/docs/guides/database/functions
- **Row Level Security** — https://supabase.com/docs/guides/database/postgres/row-level-security

## Canonical project skills (authoritative for TenantFlow)

- `.claude/skills/rls-policies/SKILL.md` — names the documented **service-role-only** tables and the `service_role_only` FOR ALL policy pattern (lines 81-113).
- `.claude/skills/sql-migration-rules/SKILL.md` — migration naming + "enable RLS on every new table; granular one-policy-per-operation-per-role" conventions.

## Why the 46 authenticated WARNs persist by design (for most)

`authenticated_security_definer_function_executable` fires for **any** SECURITY DEFINER function in `public` that the `authenticated` role can `EXECUTE` via `/rest/v1/rpc/*`. For a frontend RPC that gates internally on `auth.uid()`/`is_admin()`, this is the intended, correct configuration — the lint is expected and cannot be cleared without breaking the feature. The milestone's job is to **classify** each function so every remaining WARN is provably intentional + test-pinned, and to **tighten** the few that don't need authenticated EXECUTE at all.

See `CLASSIFICATION.md` for the function-by-function verdicts and `SUMMARY.md` for the synthesis the roadmapper consumes.
