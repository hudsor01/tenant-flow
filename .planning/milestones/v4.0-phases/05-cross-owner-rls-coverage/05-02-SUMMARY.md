---
phase: 05-cross-owner-rls-coverage
plan: 02
subsystem: testing
tags: [rls, postgrest, supabase, integration-tests, owner-isolation, security, join-policy]

# Dependency graph
requires:
  - phase: 03-stats-rpc-consolidation
    provides: "dual-client ownerA/ownerB harness template (stats-rpcs.rls.test.ts)"
  - phase: 05-cross-owner-rls-coverage
    plan: 01
    provides: "false-green-proof cross-owner denial assertion shape (reports.rls.test.ts)"
provides:
  - "Dual-client cross-owner RLS isolation tests for property_images (join via property_id -> properties.owner, S/I/U/D)"
  - "Dual-client cross-owner RLS isolation tests for inspection_rooms (join via inspection_id -> inspections.owner, S/I/U/D)"
  - "Dual-client cross-owner RLS isolation tests for inspection_photos (join via inspection_id + inspection_room_id, S/I/D only)"
  - "Dual-client cross-owner RLS isolation tests for maintenance_request_photos (join via maintenance_request_id -> maintenance_requests.owner, S/I/D only)"
  - "Regression proof in the rls-security CI gate that a future RLS refactor cannot leak join-policy child rows across owners"
affects: [05-03-sqlstate-helper-extract, rls-security-ci-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Join-policy child RLS test: build ownerA's full parent chain via the authenticated client, insert the child as ownerA, assert ownerB denied through the EXISTS-on-parent guard on every policy THAT EXISTS"
    - "Policy-set-honest testing: tables with no UPDATE policy (inspection_photos, maintenance_request_photos) are tested S/I/D only; an UPDATE assertion against a non-existent policy would be a false test and is deliberately omitted with an inline warning comment"

key-files:
  created:
    - tests/integration/rls/property-images.rls.test.ts
    - tests/integration/rls/inspection-rooms.rls.test.ts
    - tests/integration/rls/inspection-photos.rls.test.ts
    - tests/integration/rls/maintenance-request-photos.rls.test.ts
  modified: []

key-decisions:
  - "property_images + inspection_rooms have the full S/I/U/D policy set, so all four policies are tested; inspection_photos + maintenance_request_photos have S/I/D ONLY (no UPDATE policy by design, LOCKED in 05-CONTEXT.md TEST-02), so NO UPDATE assertion is written for them"
  - "inspection_photos child insert references BOTH inspection_id AND inspection_room_id (the FK chain inspection -> room -> photo is built fully under ownerA)"
  - "maintenance_request_photos selects a pre-existing ownerA maintenance_request (owners cannot INSERT maintenance_requests — the INSERT policy is tenant-scoped per migration 20260506013951/restore-landlord-only) and skips gracefully when none exist; afterAll deletes only the inserted photo, NEVER the pre-existing request"
  - "Authoritative integration run deferred to the rls-security CI gate: the local .env.local could not be loaded by vitest.config.ts's naive line-parser in this shell (a multi-line value at line 11 breaks the parser), so the synthetic-owner credentials never reached process.env locally; typecheck + lint validated the tests compile and conform"

patterns-established:
  - "Cross-owner denial assertion shape (join-policy children): SELECT -> data [] / id absent; INSERT hijack referencing ownerA's parent id -> error not null + data null; UPDATE/DELETE (only where the policy exists) -> error null + data [] + ownerA re-read shows the child row unchanged/surviving"
  - "Positive controls (ownerA self S/I/(U)/D on each existing policy) prove the policy rejects only the cross-owner mismatch, not every call — guarding against false-greens"
  - "FK-safe afterAll deletes children before parents and touches only fixtures the test created"

requirements-completed: [TEST-02]

# Metrics
duration: 22min
completed: 2026-06-06
---

# Phase 5 Plan 02: Cross-Owner RLS Coverage (TEST-02) Summary

**Four new dual-client RLS integration tests pin cross-owner isolation on the join-policy child tables whose isolation flows only through a parent chain: `property_images` (via `property_id`) and `inspection_rooms` (via `inspection_id`) get full S/I/U/D coverage, while `inspection_photos` (via `inspection_id` + `inspection_room_id`) and `maintenance_request_photos` (via `maintenance_request_id`) get S/I/D coverage only — because neither has an UPDATE policy, so an UPDATE assertion would be a false test. Every cross-owner case asserts the DENIAL side so a broken-isolation refactor fails the `rls-security` CI gate rather than silently passing.**

## Performance

- **Duration:** ~22 min
- **Tasks:** 2 of 2 completed
- **Files created:** 4
- **Files modified:** 0 (test-only plan; no schema/type/frontend changes)

## Accomplishments

### Task 1 — property_images + inspection_rooms (S/I/U/D via parent chain)

- `property-images.rls.test.ts`: beforeAll builds an ownerA property, inserts a `property_images` row (`image_url` + `property_id`). Asserts all four policies cross-owner:
  - SELECT: ownerB select of the image id returns `[]`.
  - INSERT: ownerB inserting referencing ownerA's `property_id` → `error` not null + `data` null (WITH CHECK EXISTS(property owned by caller) fails).
  - UPDATE: ownerB `.update().select()` → `data []`, then ownerA re-read confirms `display_order` unchanged.
  - DELETE: ownerB `.delete().select()` → `data []`, then ownerA re-read confirms the row survives.
  - ownerA positive controls on SELECT/INSERT/UPDATE/DELETE.
- `inspection-rooms.rls.test.ts`: beforeAll builds an ownerA inspection from an active lease+unit (graceful skip if none), inserts an `inspection_rooms` row. Same four-policy cross-owner denial via `inspection_id` → `inspections.owner`.

### Task 2 — inspection_photos + maintenance_request_photos (S/I/D ONLY — no UPDATE)

- `inspection-photos.rls.test.ts`: beforeAll builds the full chain inspection → room → photo under ownerA; the photo insert references BOTH `inspection_id` and `inspection_room_id`. Asserts S/I/D cross-owner denial only. An inline comment block in the DELETE section documents that S/I/D are the only policies and warns against adding a false UPDATE test. afterAll deletes photo → room → inspection (FK-safe).
- `maintenance-request-photos.rls.test.ts`: beforeAll SELECTS a pre-existing ownerA `maintenance_request` (owners cannot INSERT them) and skips gracefully if none; inserts a `maintenance_request_photos` row. Asserts S/I/D cross-owner denial only, same inline no-UPDATE warning. afterAll deletes only the inserted photo and NEVER the pre-existing request.

## Verification

- `bun run typecheck` — clean (`tsc --noEmit`, no errors) across both commits.
- `bun run lint` — clean (biome; the single `info` is a pre-existing biome-config version-migration notice, out of scope).
- Full lefthook gate ran on both commits (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) — NEVER `--no-verify`.
- No `.toThrow(`, no `any`, no barrel files in any of the four files. Confirmed via grep that neither photos file contains a `.update(` cross-owner assertion.
- **Local vs CI:** The single permitted structural local run could NOT execute — `vitest.config.ts`'s naive `.env.local` line-parser fails to load the synthetic-owner credentials in this shell (a multi-line value at line 11 breaks parsing; the file itself is also read-restricted in this sandbox), so `globalSetup` threw "E2E owner credentials missing." Authoritative verification is therefore the `rls-security` CI gate, which supplies `E2E_OWNER_*` as proper repo secrets and fails hard if missing. This matches the plan's stated fallback ("else rely on the rls-security CI gate") and the same limitation noted in the 05-01 sibling summary.

## Deviations from Plan

### Auto-fixed Issues

None affecting test logic. Two mechanical adjustments during commit:

1. **[Rule 3 - Blocking] Biome auto-format of long single-line `if` cleanup statements.** The initial Task 1 files had single-line `if (x) await ...delete()...` afterAll statements the formatter wanted wrapped; ran `biome check --write` to conform. No logic change.
2. **[Rule 3 - Blocking] Commitlint header length.** Task 2's first commit header was 102 chars (limit 100); shortened the header (kept the full body) and recommitted. No content change.

### Environment Limitation (not a code deviation)

- Local integration run blocked by the env-loader / read-restricted `.env.local` interaction (documented under Verification). Deferred to the `rls-security` CI gate per the plan's explicit fallback.

## Confirmation: Photos Tables Are S/I/D Only

Both `inspection_photos` and `maintenance_request_photos` tests assert SELECT / INSERT / DELETE isolation ONLY. Neither file contains any `.update(` cross-owner assertion (grep-verified). Each carries an inline comment in its DELETE section stating S/I/D-only / NO UPDATE policy exists, to stop a future reader from adding a false UPDATE test.

## Known Stubs

None. All four test files are fully wired against the live PostgREST/RLS surface via the shared dual-client harness.

## Threat Flags

None. No new security surface introduced (test-only; no schema/endpoint/type changes). The four files directly mitigate threat-register entries T-05-04 (Information Disclosure) and T-05-05 (Tampering) for the join-policy children and honor T-05-06 (false-policy accept) by omitting UPDATE on the two S/I/D tables.

## Commits

- `9a35e496c` — `test(05-02): cross-owner RLS isolation for property_images + inspection_rooms`
- `4d78a0577` — `test(05-02): cross-owner RLS for inspection_photos + maintenance_request_photos (S/I/D)`

## Self-Check: PASSED

All four test files and the SUMMARY exist on disk; both task commits (`9a35e496c`, `4d78a0577`) are reachable in the branch history.
