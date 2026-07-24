---
phase: 54-e-sign-storage-metering
plan: 04
subsystem: database
tags: [postgres, supabase, storage, trigger, rls, security-definer, metering, quota, enforcement]

# Dependency graph
requires:
  - phase: 54-03
    provides: get_owner_storage_usage(uuid) (pre-existing SUM) + get_owner_storage_limit_gb(uuid) (-1 = Max) — the two live functions the enforcement trigger consumes
provides:
  - enforce_storage_quota() trigger fn + trg_enforce_storage_quota BEFORE INSERT on storage.objects — the real client-direct upload guard (created flag-OFF)
  - users.storage_grandfathered_at (nullable timestamptz) — Plan 06 grandfather snapshot target
  - app_config storage_enforcement_enabled='false' — kill-flag seeded OFF (Plan 06 flips it)
  - storage-metering.rls.test.ts extended with the METER-04 enforce/grandfather/max/service_role/system-bucket/flag-off + reads-unaffected matrix
affects: [54-06 grandfather snapshot + go-flip, 54-07 client-side upload pre-check + storage-error detector]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BEFORE INSERT trigger on storage.objects (proven-live pattern) raising the plan_limit_exceeded structured exception; the message PREFIX is the only client signal that survives StorageApiError (hint/detail stripped)"
    - "Owner identification via coalesce(NEW.owner, auth.uid()) — native uploader column primary (path-parsing attributed only 1/877 prod objects); system-bucket exemption via a bucket_id allowlist, not the path resolver"
    - "New privileged column protected by OMISSION from the live fail-closed guard_user_self_update() allowlist — no trigger change, P0 fix left intact"
    - "Over-quota integration seed via fabricated storage.objects row (service_role .schema('storage') insert with large metadata.size) — avoids uploading gigabytes"

key-files:
  created:
    - supabase/migrations/20260724041621_storage_enforcement_guard.sql
  modified:
    - tests/integration/rls/storage-metering.rls.test.ts

key-decisions:
  - "Applied the orchestrator's Wave-2 prod attribution correction: the trigger identifies the owner via coalesce(NEW.owner, auth.uid()) and exempts system buckets via a bucket_id allowlist, NOT via storage_object_owner(bucket,name) as the RESEARCH/PLAN DDL drafted (path-parsing alone caught only 1/877 real objects). get_owner_storage_usage (already coalesce(owner,path)) is still the SUM source — attribution is NOT re-derived in the trigger."
  - "guard_user_self_update() is NOT recreated. The live 20260507194555 fail-closed allowlist rejects any column absent from allowed_cols on a PostgREST self-update; storage_grandfathered_at is protected by omission. A non-mutating SQL comment records this (WARNING 5 / T-54-15 discharged without a trigger change)."
  - "RAISE message begins with the literal 'plan_limit_exceeded:' prefix (client contract for Plan 07); errcode P0001 + hint plan_limit_exceeded + DETAIL JSON upgrade_source=storage_quota_gate kept for a hypothetical future PostgREST path (Storage strips them)."
  - "Enforce on the owner's PRE-EXISTING SUM only — never NEW's size (NULL at BEFORE INSERT). Max (-1) via < 0, grandfather via storage_grandfathered_at IS NOT NULL, both short-circuit before the SUM."

patterns-established:
  - "Pattern: storage upload quota trigger — ordered exemption ladder (null-uid → flag → system bucket → Max → grandfather → SUM-vs-quota) so prod (flag OFF) is a 2-read no-op"
  - "Pattern: fabricated over-quota RLS seed — service_role direct storage-schema insert with an oversize metadata.size, cleaned up by object id, to exercise finite-limit enforcement without gigabyte uploads"

requirements-completed: [METER-04]

# Metrics
duration: 30min
completed: 2026-07-23
---

# Phase 54 Plan 04: Storage Upload-Enforcement Guard (METER-04) Summary

**A BEFORE INSERT trigger on `storage.objects` (`enforce_storage_quota`) that blocks a non-grandfathered owner's upload once their pre-existing storage SUM is at/over the plan quota — raising the `plan_limit_exceeded:` upgrade exception — created flag-OFF behind `app_config.storage_enforcement_enabled='false'`, plus the `users.storage_grandfathered_at` column and the METER-04 RLS enforcement matrix.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-23T22:45:00Z
- **Completed:** 2026-07-23T23:15:00Z
- **Tasks:** 1 of 2 (authoring); Task 2 (apply + regen + RLS run + MCP verify) DEFERRED to orchestrator
- **Files modified:** 1 created, 1 modified

## Accomplishments
- Authored `20260724041621_storage_enforcement_guard.sql`: (1) `users.storage_grandfathered_at` (nullable timestamptz) + `comment on column` + a non-mutating allowlist-protection note; (2) `app_config` seed `storage_enforcement_enabled='false'` with `on conflict (key) do nothing`; (3) `enforce_storage_quota()` SECURITY DEFINER / `search_path=public` with the full ordered exemption ladder; (4) `drop trigger if exists` + `create trigger trg_enforce_storage_quota before insert on storage.objects`.
- Applied the orchestrator's prod attribution correction: owner = `coalesce(new.owner, (select auth.uid()))`; system-bucket exemption via a `bucket_id not in (five owner-attributable buckets)` allowlist. Consumes the LIVE `get_owner_storage_usage` / `get_owner_storage_limit_gb`; attribution is NOT re-derived in the trigger.
- Left the live P0 `guard_user_self_update()` fail-closed allowlist untouched (no `create or replace` in the executable SQL); the new column is protected by omission from `allowed_cols`, documented in a full-line SQL comment.
- Extended `tests/integration/rls/storage-metering.rls.test.ts` with a service-role-driven METER-04 `describe.skipIf` block covering all seven behaviors (enforce / grandfather / max / service_role / system-bucket / flag-OFF + reads-and-deletes unaffected), restoring the owner's real plan + clearing the grandfather stamp + leaving the prod flag `'false'` in teardown.
- Plan `<automated>` grep verify passes for BOTH files; biome check clean; the mandatory lefthook pre-commit (gitleaks, lockfile, biome lint, `tsc --noEmit`, unit tests + 80% coverage) passed on commit — confirming the extended test typechecks even before `src/types/supabase.ts` regen (the RLS clients are the untyped `SupabaseClient`, so the new column / `.schema('storage')` are `any`-typed, exactly like the existing `stripe` and esign-metering suites).

## Task Commits

1. **Task 1: author migration + extend METER-04 RLS matrix** - `fcc82e76e` (feat)

**Plan metadata:** committed separately (docs: this SUMMARY)

## Files Created/Modified
- `supabase/migrations/20260724041621_storage_enforcement_guard.sql` - storage_grandfathered_at column + app_config kill-flag seed (OFF) + enforce_storage_quota() trigger fn + trg_enforce_storage_quota BEFORE INSERT on storage.objects
- `tests/integration/rls/storage-metering.rls.test.ts` - appended the service-role-driven METER-04 enforcement matrix (fabricated over-quota seed; message-prefix assertion; reads/deletes-unaffected case)

## Decisions Made
- **Owner identification correction (directed):** used `coalesce(new.owner, auth.uid())` + a `bucket_id` allowlist for the system-bucket exemption, overriding the RESEARCH/PLAN §Pattern-4 DDL that used `storage_object_owner(bucket,name)` for both. Rationale (from the orchestrator's Wave-2 prod correction): the live path convention is `<uuid>/file.jpg`, so the path resolver attributed only 1/877 real objects; the native `storage.objects.owner` column is populated on every client upload and equals `owner_user_id` in this landlord-only app. `get_owner_storage_usage` (already `coalesce(owner, path)`) remains the SUM source.
- **Max check via `< 0`** (not `= -1`) — matches the live `enforce_property_plan_limit` idiom; functionally identical (-1 is the only negative), more defensive.
- **Fabricated over-quota seed** rather than real byte uploads — the smallest quota is 1 GB (trial), infeasible to reach with real uploads in CI, so a single `storage.objects` row with an 11 GB `metadata.size` (Starter = 10 GB) is inserted via the service-role `.schema('storage')` client and torn down by object id.

## Deviations from Plan

**1. [Directed correction — not an auto-fix] Trigger owner identification + system-bucket exemption**
- **Directed by:** the orchestrator's `<critical_boundary_and_correction>` (Wave-2 prod attribution correction).
- **Change:** trigger uses `v_owner := coalesce(new.owner, (select auth.uid()))` and exempts system/unattributable buckets via `new.bucket_id not in (avatars, property-images, inspection-photos, maintenance-photos, tenant-documents)`, instead of the RESEARCH/PLAN §Pattern-4 `v_owner := storage_object_owner(new.bucket_id, new.name); if v_owner is null then return new`.
- **Why:** path-parsing alone attributed 1/877 real objects; the native uploader column is the correct primary attribution. This does NOT re-implement attribution (that lives in the already-applied `get_owner_storage_usage`), it only fixes how the trigger names the uploading owner and how it detects system buckets.
- **Files:** `supabase/migrations/20260724041621_storage_enforcement_guard.sql`
- **Committed in:** `fcc82e76e`

---

**Total deviations:** 1 directed correction (0 auto-fixed under Rules 1-3).
**Impact on plan:** The correction is load-bearing for real enforcement (the resolver-based owner id would have made the trigger a near-total no-op even flag-ON). No scope creep; the exemption semantics and client contract are unchanged.

## Issues Encountered
None during authoring. One risk surfaced and is delegated to Task 2 (below): the METER-04 over-quota seed relies on the service_role PostgREST client reaching the `storage` schema (`.schema('storage').from('objects')`). The seed helper asserts `expect(error).toBeNull()`, so if prod does not expose `storage` it fails LOUDLY rather than passing silently — a clear signal for the orchestrator.

## Deferred to Orchestrator (Task 2 — [BLOCKING], requires Supabase MCP + prod)
This agent did NOT apply the migration, did NOT run `bun run db:types` / `typecheck` / `test:integration` / `supabase db push`, and did NOT modify `src/types/supabase.ts`, `STATE.md`, or `ROADMAP.md`. The orchestrator must:
1. **Apply** `supabase/migrations/20260724041621_storage_enforcement_guard.sql` via MCP `apply_migration` (name `storage_enforcement_guard`). **A4 check:** confirm the BEFORE INSERT trigger creates on hosted Supabase (precedent `handle_property_image_upload` says yes); if role perms reject it, apply the `AS RESTRICTIVE` INSERT-policy fallback and record in the SUMMARY that the upgrade payload is lost.
2. **Reconcile** the repo filename to the prod-assigned version via `list_migrations` (migration-mcp-prod-drift).
3. **Regenerate** `src/types/supabase.ts` (`bun run db:types`; MCP `generate_typescript_types` fallback) → confirm `storage_grandfathered_at` on the users row type. Then `bun run typecheck` exits 0.
4. **Run** `bun run test:integration -- storage-metering.rls.test.ts` (the extended METER-04 matrix). **Prerequisite:** confirm prod PostgREST exposes the `storage` schema to `service_role` (the seed uses `.schema('storage').from('objects')`); if not, add `storage` to the project's exposed schemas OR pre-seed the oversize rows via MCP `execute_sql` before running.
5. **MCP post-verify (`execute_sql`):**
   - `select tgname from pg_trigger where tgrelid='storage.objects'::regclass and tgname='trg_enforce_storage_quota';` → returns the trigger.
   - `select value from public.app_config where key='storage_enforcement_enabled';` → `'false'` (enforcement still OFF — Plan 06 owns the flip).
   - `select pg_get_functiondef('public.guard_user_self_update()'::regprocedure) not ilike '%storage_grandfathered_at%';` → `true` (the live P0 fail-closed allowlist was NOT reverted; column protected by omission — WARNING 5 discharged).

## Next Phase Readiness
- The guard is authored flag-OFF with the full exemption ladder; once Task 2 applies it, the trigger is live but dormant. **Plan 06** runs the grandfather snapshot (stamps `storage_grandfathered_at` for currently-over-quota owners) and flips `storage_enforcement_enabled='true'` as its last statement, behind the METER-04 checkpoint.
- **Plan 07** delivers the client half of D-03: a Storage-error detector that parses the `plan_limit_exceeded:` message prefix + a proactive upload pre-check. The RLS substring assertion here proves the DB block only, not the product UX.
- **Blocker:** the trigger + column are not live until the orchestrator runs Task 2.

## Known Stubs
None. The `.schema('storage')` over-quota seed is a real (fabricated-size) row, not a stub; the grandfather column is wired into the trigger and the Plan 06 snapshot target.

## Self-Check: PASSED
- FOUND: supabase/migrations/20260724041621_storage_enforcement_guard.sql
- FOUND: tests/integration/rls/storage-metering.rls.test.ts (METER-04 block appended)
- FOUND: commit fcc82e76e
- CONFIRMED: plan `<automated>` grep verify passes for both files
- CONFIRMED (boundary): src/types/supabase.ts, STATE.md, ROADMAP.md NOT modified; migration NOT applied

---
*Phase: 54-e-sign-storage-metering*
*Completed: 2026-07-23*
