---
phase: 02-typed-rpc-boundaries
plan: 03
subsystem: data-layer
tags: [type-safety, zod, postgrest-boundary, maintenance]
requires: []
provides:
  - "mapMaintenanceRow validated boundary mapper for maintenance_requests read/write returns"
  - "module-local maintenancePersistedStatusSchema (full 7-value DB CHECK set)"
affects:
  - src/hooks/api/query-keys/maintenance-keys.ts
tech-stack:
  added: []
  patterns:
    - "Field-level Zod safeParse at the PostgREST read+write boundary (mirrors mapDocumentRow)"
    - "Persisted-status schema = full 7-value DB CHECK set, distinct from the 5-value create/update INPUT enum"
key-files:
  created:
    - src/hooks/api/query-keys/maintenance-mappers.ts
    - src/hooks/api/query-keys/maintenance-mappers.test.ts
  modified:
    - src/hooks/api/query-keys/maintenance-keys.ts
decisions:
  - "Persisted status validated against a module-local 7-value maintenancePersistedStatusSchema (open/assigned/in_progress/needs_reassignment/completed/cancelled/on_hold), NOT the stale 5-value maintenanceStatusSchema input enum — validating the input enum would throw on assigned/needs_reassignment rows written by vendorMutations and break the maintenance surfaces"
  - "Imported MaintenanceRequest from #types/core (= Tables<\"maintenance_requests\">) — no duplicate type; priority reuses maintenancePrioritySchema (5 values = DB CHECK)"
  - "MaintenanceRequest.status/priority are typed plain `string` in the generated types, so no exactOptionalPropertyTypes/Zod-widening fight — 02-01's normalizer precedent did not apply"
  - "status safeParse runs UNCONDITIONALLY (no `!= null` short-circuit) so a dropped NOT-NULL status column throws at the boundary instead of leaking undefined"
metrics:
  duration: ~10m
  completed: 2026-06-05
  tasks: 2
  files: 3
  commits: 2
---

# Phase 2 Plan 03: Typed Maintenance RPC Boundary (TYPE-02 maintenance half) Summary

Maintenance `maintenance_requests` PostgREST read+write returns now route through a Zod-field-validated `mapMaintenanceRow()` instead of `data as MaintenanceRequest[]` / `as MaintenanceRequest` blind casts at list (both branches), detail, urgent, overdue, create, and update — with persisted `status` validated against the FULL live 7-value DB CHECK set so vendor-workflow rows (`assigned` / `needs_reassignment`) map cleanly instead of throwing.

## What Was Built

- **`mapMaintenanceRow(raw: unknown): MaintenanceRequest`** — new exported mapper in `maintenance-mappers.ts`. `requireString` throws on a missing/non-string NOT-NULL column (`id`, `owner_user_id`, `unit_id`, `tenant_id`, `title`, `description`); `status` and `priority` are validated via `safeParse` (throw a descriptive `mapMaintenanceRow: invalid status/priority '<v>'` boundary error on drift). All nullable-in-DB columns (`actual_cost`, `estimated_cost`, `assigned_to`, `requested_by`, `inspector_id`, `inspection_date`, `inspection_findings`, `scheduled_date`, `completed_at`, `vendor_id`, `created_at`, `updated_at`) pass through as value-or-null — not over-validated. Accepts (and ignores) an extra `units` (list property_id join) or `vendors` (detail join) embed key — only maintenance_requests columns are read, so the embeds never appear on output.
- **`maintenancePersistedStatusSchema`** — module-local `z.enum(["open","assigned","in_progress","needs_reassignment","completed","cancelled","on_hold"])`, the FULL live DB CHECK set from migration `20260221120000_add_maintenance_status_vendor_statuses.sql` (cited in a code comment). Deliberately NOT the shared `maintenanceStatusSchema` (the stale 5-value INPUT enum that gates the create/update form and omits `assigned`/`needs_reassignment`). `vendorMutations.assign`/`unassign` actively PERSIST those two statuses, which then flow back through `list`/`detail`/`urgent`/`overdue` — validating a persisted status against the 5-value input enum would throw on every assigned/reassignment row and break the maintenance list/detail/urgent/kanban surfaces in prod. The shared input enum is left untouched (it validates a different boundary). Mirrors plan 02-02's tenant `moved_out` persisted-status union precedent.
- **`maintenance-keys.ts` wiring** — six boundaries rewired:
  - `list()` property_id branch: `(result.data ?? []).map(mapMaintenanceRow)` (drops the manual `{ units: _units, ...row }` destructure-strip — the mapper ignores the `units!inner(property_id)` embed).
  - `list()` else branch: `((result.data ?? []) as Record<string, unknown>[]).map(mapMaintenanceRow)`.
  - `detail()`: `mapMaintenanceRow(data as Record<string, unknown>)` (the `vendors(...)` embed is ignored by the mapper).
  - `urgent()` / `overdue()`: `((data ?? []) as Record<string, unknown>[]).map(mapMaintenanceRow)`.
  - `maintenanceMutations.create()` / `update()`: `mapMaintenanceRow(created/updated as Record<string, unknown>)`.
- **`maintenance-mappers.test.ts`** — 14 cases: valid row maps + nullable fields stay null; missing `id` throws; missing `title` throws; bogus `status` rejected; bogus `priority` rejected; `assigned` accepted; `needs_reassignment` accepted; the other four DB-CHECK statuses (`in_progress`/`completed`/`cancelled`/`on_hold`) accepted; absent `status` throws and null `status` throws (proves the unconditional safeParse); `units` embed ignored; `vendors` embed ignored; populated nullable fields pass through; descriptive boundary error message asserted.

## How It Works

The mapper mirrors `mapDocumentRow` in `document-keys.ts` (CLAUDE.md's cited boundary-validation reference): throw early on a dropped NOT-NULL column so the boundary surfaces RPC/`.select()` drift loudly instead of leaking `"undefined"` (broken React keys, kanban grouping, detail-page lookups) or a silently-accepted bad enum downstream. The persisted-vs-input status distinction is the load-bearing decision: the live DB CHECK constraint permits 7 values, the create/update form schema permits 5, and the read path must validate against the DB's 7 — otherwise the validation meant to protect the surfaces would itself break them on every vendor-assigned row. `MaintenanceRequest.status`/`priority` being plain `string` in the generated types meant no `exactOptionalPropertyTypes` widening conflict, so 02-01's normalizer pattern was unnecessary — the validated string assigns directly.

## Deviations from Plan

None — plan executed exactly as written. (Plan 02-03 had already been revised pre-execution to specify the 7-value persisted schema; this execution implemented that specification verbatim. Biome reformatted two `expect(...).toThrow(...)` line-wraps in the test file during the lint gate — a formatting-only change, no logic difference.)

## Scope Boundaries Honored

- `stats()` (`get_maintenance_stats` RPC → `as Record<string, number>`), `photos()` (`as PhotoRow[]`), and `vendorMutations` (`create`/`update` → `as Vendor`; `assign`/`unassign` write the persisted statuses the mapper accepts) are all out of TYPE-02 scope and left untouched.
- The shared `maintenanceStatusSchema` in `#lib/validation/maintenance` was NOT widened — it still gates create/update INPUT with the 5-value set.
- No out-of-scope file touched (analytics/tenant/expiring-leases/property/lease/etc.).

## Verification

- `bun run typecheck` — clean.
- `bun run lint` (biome) — clean on all 3 modified files.
- `bunx vitest --run --project unit src/hooks/api/query-keys/maintenance-mappers.test.ts` — 14/14 pass (incl. the `assigned` + `needs_reassignment` acceptance cases and the absent/null-status throw cases).
- `grep -E "as MaintenanceRequest(\[\])?[;,) ]" src/hooks/api/query-keys/maintenance-keys.ts` — no cast expressions remain at the read/write boundaries (only `MaintenanceRequest`/`MaintenanceRequest[]` type annotations + the `let data` declaration remain).
- `grep -c "as unknown as" src/hooks/api/query-keys/maintenance-mappers.ts` — 0.
- Both commits passed the full lefthook pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, full unit suite) + commitlint — neither used `--no-verify`.

## Commits

- `2219f2a20` feat(02-03): add validated mapMaintenanceRow boundary mapper
- `4439223a3` refactor(02-03): route maintenance-keys boundaries through mapMaintenanceRow

## Self-Check: PASSED

- FOUND: src/hooks/api/query-keys/maintenance-mappers.ts
- FOUND: src/hooks/api/query-keys/maintenance-mappers.test.ts
- FOUND: src/hooks/api/query-keys/maintenance-keys.ts (modified)
- FOUND: .planning/phases/02-typed-rpc-boundaries/02-03-SUMMARY.md
- FOUND commit: 2219f2a20
- FOUND commit: 4439223a3
