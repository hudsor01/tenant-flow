---
phase: 54-e-sign-storage-metering
plan: 03
subsystem: database
tags: [postgres, supabase, storage, rls, security-definer, metering, quota]

# Dependency graph
requires:
  - phase: 54-01
    provides: sequencing only — Plan 01's [BLOCKING] apply must land before this plan's apply so the shared src/types/supabase.ts regen is not raced (no artifact consumption)
provides:
  - get_owner_storage_limit_gb(uuid) — net-new per-tier storage quota in GB (Trial 1 / Starter 10 / Growth 50 / Max -1), values locked to src/config/pricing.ts
  - storage_object_owner(text,text) — path-based per-bucket owner attribution resolver for storage.objects (5 owner-attributable buckets, system buckets excluded)
  - get_owner_storage_usage(uuid) — SUM((metadata->>'size')::bigint) over the attributable buckets, service_role-only
  - get_storage_usage_summary() — param-less authenticated read RPC returning {used_bytes, limit_gb}
  - storage-metering.rls.test.ts — METER-03 SUM/exclusion/isolation/privilege coverage (extended by Plan 04)
affects: [54-04 storage upload enforcement trigger, 54-05 Settings usage widget, 54-06 grandfather snapshot]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Path-based per-bucket owner resolver (SECURITY DEFINER, fully-qualified storage.foldername) shared by usage SUM, enforcement trigger, and grandfather snapshot"
    - "Net-new quota function mirroring pricing.ts VALUES (Max = -1 unlimited) with single uuid signature — no text overload (PGRST203 avoidance)"
    - "Raw usage/limit functions service_role-only; single param-less owner-guarded read RPC (wraps auth.uid()) as the only authenticated surface"

key-files:
  created:
    - supabase/migrations/20260723130000_storage_quota_functions.sql
    - tests/integration/rls/storage-metering.rls.test.ts
  modified: []

key-decisions:
  - "Quota is net-new (D-00a): no phantom 100 GB edited — get_owner_storage_limit_gb is additive with values locked to pricing.ts"
  - "storage_object_owner tenant-documents branch implements ALL FIVE live entity types (property/lease/tenant/maintenance_request/inspection) resolving owner by path[2]; tenant resolves via public.tenants.owner_user_id (tenants HAS its own owner column), not a lease join"
  - "System-bucket exclusion is enforced by the get_owner_storage_usage bucket allowlist (blog-covers/bulk-imports/lease-documents never summed), not by write-permission"
  - "Finite-limit branches (Trial/Starter/Growth) are asserted in Plan 04's enforcement matrix with a dedicated limited-plan owner — the dual-client synthetic owners are pinned max and `update on public.users` is revoked from authenticated, so plan cannot be flipped from this suite"

patterns-established:
  - "Pattern: path-based storage.objects owner attribution resolver (per-bucket CASE, nullif(...)::uuid segment casts, fully-qualified storage.foldername + search_path=public)"
  - "Pattern: pricing-locked per-tier quota function accepting both tier slugs and raw Stripe price ids via lower()"

requirements-completed: [METER-03]

# Metrics
duration: 20min
completed: 2026-07-24
---

# Phase 54 Plan 03: Storage Quota + Usage Data Layer (METER-03) Summary

**Net-new storage quota + usage SQL layer: a pricing-locked per-tier `get_owner_storage_limit_gb` (Max = -1), a path-based `storage_object_owner` resolver across 5 owner-attributable buckets, a `(metadata->>'size')::bigint` SUM, and a param-less `get_storage_usage_summary()` read RPC — with a dual-client METER-03 RLS test.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-24T03:13:00Z
- **Completed:** 2026-07-24T03:33:07Z
- **Tasks:** 1 of 2 (authoring); Task 2 apply DEFERRED to orchestrator
- **Files modified:** 2 created

## Accomplishments
- Authored `20260723130000_storage_quota_functions.sql` with all four functions per plan: `get_owner_storage_limit_gb(uuid)` (net-new, Trial 1 / Starter 10 / Growth 50 / Max -1, both slugs + lowercased price ids, single uuid signature — no text overload), `storage_object_owner(text,text)` (5-bucket resolver; tenant-documents branches property/lease/tenant/maintenance_request/inspection by path[2]; blog-covers/bulk-imports/lease-documents return null), `get_owner_storage_usage(uuid)` (SUM over the bucket allowlist filtered by the resolver), and `get_storage_usage_summary()` (param-less, wraps `(select auth.uid())`, granted to authenticated).
- Grant discipline mirrors 20260505213825 + 20260722005310: raw usage/limit/resolver functions are SECURITY DEFINER + `set search_path = public` + service_role-only; only the owner-guarded summary is authenticated-callable (T-54-09 mitigation).
- Authored `storage-metering.rls.test.ts` (dual-client, sequential, hits prod): SUM correctness across avatars + tenant-documents, system-bucket exclusion (bulk-imports delta must be 0), cross-owner attribution isolation, service_role-only privilege boundary probe (REVOKED_CODES), and param-less summary returning max owner limit -1.
- Plan grep `<automated>` verify passes (all required tokens present; no `(text)` overload).

## Task Commits

1. **Task 1: author migration + METER-03 RLS test** - `e8659a96a` (feat)

**Plan metadata:** committed separately (docs: this SUMMARY)

## Files Created/Modified
- `supabase/migrations/20260723130000_storage_quota_functions.sql` - The 4 storage quota/usage/resolver/summary functions
- `tests/integration/rls/storage-metering.rls.test.ts` - METER-03 SUM/exclusion/isolation/privilege RLS cases (extended by Plan 04)

## Pre-flight Findings (recorded per plan)
- **properties owner column = canonical `owner_user_id`** — confirmed against source: `enforce_plan_limits` (`NEW.owner_user_id`), CLAUDE.md schema conventions, and the `documents-cross-entity.rls.test.ts` fixtures (every entity inserted with `owner_user_id`). The legacy `property_owner_id` (Pitfall 5) is NOT used by the resolver.
- **tenant-documents live first-segments = exactly `property`, `lease`, `tenant`, `maintenance_request`, `inspection`** — confirmed against `documents-cross-entity.rls.test.ts:320-329` (the parameterized branch matrix) and the vault migrations referenced by the plan. Two live facts honored: string is `maintenance_request` (not `maintenance`); `tenant` resolves via `public.tenants.owner_user_id` (tenants HAS its own owner column, used directly in the live tenant-documents RLS `20260424140000`), not null and not a lease join. All FIVE branches implemented (not gated on a live object currently existing per segment — attribution must be correct for future uploads).
- **The live-DB MCP cross-check** (`list_tables` for the owner column + `select distinct (storage.foldername(name))[1] from storage.objects where bucket_id='tenant-documents'`) could NOT be run in this authoring pass (no Supabase MCP available to this agent). It is folded into the orchestrator's apply step. The source-level verification above is authoritative and matches the known truth table.

## Decisions Made
- Included both tier slugs AND lowercased Stripe price ids in the limit CASE (belt-and-braces: the webhook historically wrote raw price ids to `subscription_plan`), matched case-insensitively via `lower()`.
- `get_storage_usage_summary()` raises on null `auth.uid()` (errcode 28000) and, being SECURITY DEFINER, legitimately calls the service_role-only raw functions (the definer owns them).

## Deviations from Plan
None - authoring executed exactly as written. The plan's finite-limit override in the RLS test was intentionally NOT implemented as a subscription_plan mutation: `20260507190024_lock_privileged_user_columns_and_p0_security` REVOKES `update on public.users` from authenticated and adds a `guard_user_self_update()` trigger, so the dual-client suite cannot flip the synthetic owner's plan. Per 54-RESEARCH §Environment Availability, the finite-limit + enforcement assertions belong to Plan 04's matrix (which extends this file) using a dedicated limited-plan owner. This suite asserts the max branch (-1) deterministically. Documented, not a scope change.

## Issues Encountered
None. The null-size-row skip (in-flight uploads) is a SQL property of `coalesce(sum((metadata->>'size')::bigint),0)` and cannot be deterministically seeded via the authenticated Storage API (Storage finalizes metadata before `.upload()` resolves); the byte-exact usage-delta assertions implicitly prove no phantom/null inflation. Noted inline in the test.

## Deferred to Orchestrator (Task 2 — [BLOCKING], requires Supabase MCP + prod)
The orchestrator must, after Plan 01's apply:
1. Apply `supabase/migrations/20260723130000_storage_quota_functions.sql` via MCP `apply_migration` (name `storage_quota_functions`).
2. Reconcile the repo filename to the prod-assigned version via `list_migrations` (migration-mcp-prod-drift).
3. Regenerate `src/types/supabase.ts` (`bun run db:types`; on CLI 401 fall back to MCP `generate_typescript_types`) — confirm all four functions appear.
4. `bun run typecheck` exits 0.
5. `bun run test:integration -- storage-metering.rls.test.ts` green.
6. MCP post-verify: `has_function_privilege('authenticated','public.get_owner_storage_usage(uuid)','execute')` = false and `has_function_privilege('authenticated','public.get_storage_usage_summary()','execute')` = true.

This agent did NOT apply the migration, did NOT run db:types / typecheck / test:integration / db push, and did NOT modify src/types/supabase.ts, STATE.md, or ROADMAP.md.

## Next Phase Readiness
- Resolver + limit function ready for Plan 04 (storage upload enforcement trigger) and Plan 06 (grandfather snapshot).
- `get_storage_usage_summary()` ready for Plan 05 (Settings usage widget) once applied + typed.
- Blocker: the four functions are not live until the orchestrator runs Task 2.

## Self-Check: PASSED
- FOUND: supabase/migrations/20260723130000_storage_quota_functions.sql
- FOUND: tests/integration/rls/storage-metering.rls.test.ts
- FOUND: .planning/phases/54-e-sign-storage-metering/54-03-SUMMARY.md
- FOUND: commit e8659a96a

---
*Phase: 54-e-sign-storage-metering*
*Completed: 2026-07-24*
