---
phase: 02-typed-rpc-boundaries
plan: 02
subsystem: data-layer
tags: [type-safety, zod, postgrest-boundary, tenants]
requires: []
provides:
  - "mapTenantBaseRow validated flat-row mapper for tenant create/update returns"
  - "mapTenantRow upgraded to Zod-validate id + status before its plain as TenantWithLeaseInfo"
affects:
  - src/hooks/api/query-keys/tenant-mutation-options.ts
  - src/hooks/api/use-tenant-mutations.ts
tech-stack:
  added: []
  patterns:
    - "Field-level Zod safeParse at the PostgREST write boundary (mirrors mapDocumentRow)"
    - "Persisted-status union = tenantStatusSchema.options TENANT_ACTIVE_STATUSES (accepts moved_out)"
key-files:
  created:
    - src/hooks/api/query-keys/tenant-mappers.test.ts
  modified:
    - src/hooks/api/query-keys/tenant-mappers.ts
    - src/hooks/api/query-keys/tenant-mutation-options.ts
    - src/hooks/api/__tests__/use-tenant.test.tsx
decisions:
  - "Imported Tenant from #types/core (= Tables<\"tenants\">), not the Zod-inferred Tenant in #lib/validation/tenants — the plan/CONTEXT pin the generated DB row type"
  - "Validated id/status inline in mapTenantRow (typed TenantPostgrestRow) rather than casting to Record to avoid introducing any as-cast the TYPE-03 drift guard scans for"
  - "Tenant.status is typed plain `string` in the generated types, so no exactOptionalPropertyTypes/Zod-widening fight — no normalizer needed (02-01's normalizer precedent did not apply here)"
metrics:
  duration: ~12m
  completed: 2026-06-05
  tasks: 2
  files: 4
  commits: 1
---

# Phase 2 Plan 02: Typed Tenant RPC Boundary (TYPE-02 tenant half) Summary

Tenant create/update PostgREST returns now route through a Zod-field-validated `mapTenantBaseRow()` instead of `created as Tenant` / `updated as Tenant` blind casts, and the existing `mapTenantRow` field-validates `id` + `status` before its (CONTEXT-permitted plain) `as TenantWithLeaseInfo`.

## What Was Built

- **`mapTenantBaseRow(raw: unknown): Tenant`** — new exported mapper for the flat `.select().single()` insert/update return. `requireString` throws on a missing/non-string NOT-NULL `id`; `status` is validated via `tenantPersistedStatusSchema.safeParse` (throws a descriptive boundary error on drift). All nullable-in-DB columns (`owner_user_id`, `email`, `name`, `phone`, `identity_verified`, etc.) pass through as value-or-null — not over-validated.
- **`tenantPersistedStatusSchema`** — module-local `z.enum` over the de-duped union of `tenantStatusSchema.options` (`active`/`inactive`/`pending`/`SUSPENDED`/`DELETED`) and `TENANT_ACTIVE_STATUSES` (adds `moved_out`). REUSES both exports from `#lib/validation/tenants`; no redefined status enum. The union is required because `markMovedOut` persists `status: "moved_out"`, which is in `TENANT_ACTIVE_STATUSES` but absent from `tenantStatusSchema`.
- **`mapTenantRow` upgrade** — re-checks `row.id` (throws if non-string) and validates a non-null `status` against the same union (keeps the historical `?? "active"` null-default) BEFORE the join-flattening logic. The final plain `as TenantWithLeaseInfo` over the conditional-spread object survives (acceptable per CONTEXT — only `as unknown as` is forbidden; `grep -c "as unknown as"` returns 0) and now covers a validated `id`/`status`.
- **`tenant-mutation-options.ts` wiring** — `create()` and `update()` mutationFns return `mapTenantBaseRow(created)` / `mapTenantBaseRow(updated)`. `markMovedOut` is unchanged and feeds the now-validated `mapTenantRow`. The `Tenant` type import is retained (still used by the `Promise<Tenant>` return annotations).
- **`tenant-mappers.test.ts`** — 9 cases: valid flat row maps + nullable fields stay null; missing `id` throws; bogus `status` rejected; `moved_out`/`SUSPENDED`/`DELETED` accepted; nested `mapTenantRow` maps + null-status defaults to `active` + missing-id throws + bad-status throws.

## How It Works

Both mappers mirror `mapDocumentRow` in `document-keys.ts` (CLAUDE.md's cited boundary-validation reference): throw early on a dropped NOT-NULL column so the boundary surfaces RPC/`.select()` drift loudly instead of leaking `"undefined"` (broken React keys, detail-page lookups) or a silently-accepted bad enum downstream. `Tenant.status` being a plain `string` in the generated types meant no `exactOptionalPropertyTypes` widening conflict, so 02-01's normalizer pattern was unnecessary here — the validated string assigns directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale `mockTenant` fixture in use-tenant.test.tsx**
- **Found during:** Task 2 (lefthook pre-commit unit-tests gate caught 2 failures in `use-tenant.test.tsx`)
- **Issue:** The `mockTenant` fixture (consumed by the create/update mutation mocks' `.single()` returns) was missing the NOT-NULL `status` field (and `owner_user_id`/`first_name`/`last_name`/`name`/`email`/`phone`), and carried a stale `stripe_customer_id` that is not a real `tenants` column. With the new boundary validation, `mapTenantBaseRow` correctly threw `invalid 'status' value 'undefined'` for `useCreateTenantMutation` + `useUpdateTenantMutation`.
- **Fix:** Updated the fixture to a realistic `tenants` row with `status: "active"` plus the contact columns; dropped the non-column `stripe_customer_id`. This is directly caused by the current task's change (the validation is the point) and in scope.
- **Files modified:** src/hooks/api/__tests__/use-tenant.test.tsx
- **Commit:** 81d740d23

### Test-command note
The plan's per-file command `bun run test:unit -- --run <file>` double-passes `--run` (the `test:unit` script already includes `--run --project unit`) and errors with "Expected a single value for option --run". Ran via `bun run test:unit -- <file>` (and `bunx vitest --run --project unit <file>`) instead — same project, same result. No code impact.

## Verification

- `bun run typecheck` — clean (`tsc --noEmit`)
- `bun run lint` — clean on all four modified files (Biome)
- `bun run test:unit -- src/hooks/api/query-keys/tenant-mappers.test.ts` — 9/9 pass
- `bun run test:unit -- src/hooks/api/__tests__/use-tenant.test.tsx` — 16/16 pass
- Full lefthook pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, all 106,374 unit tests, commitlint) passed on commit `81d740d23` — committed without `--no-verify`
- `grep -c "created as Tenant"` / `grep -cE "updated as Tenant\b"` in tenant-mutation-options.ts → 0
- `grep -c "as unknown as"` in tenant-mappers.ts → 0

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. This tightens an existing write boundary with field validation.

## Self-Check: PASSED

- All 5 files verified present on disk (4 source + SUMMARY.md)
- Commit `81d740d23` verified in git history
