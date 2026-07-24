---
phase: 54-e-sign-storage-metering
plan: 07
subsystem: ui
tags: [storage, quota, metering, supabase-storage, tanstack-query, sonner, upload, upgrade-cta]

# Dependency graph
requires:
  - phase: 54-04
    provides: enforce_storage_quota() BEFORE INSERT trigger on storage.objects — RAISE message begins with the literal `plan_limit_exceeded:` prefix (the only client-parseable quota signal; StorageApiError strips hint/detail)
  - phase: 54-05
    provides: usageQueries.storage() queryOptions factory returning { usedBytes, limitGb, unlimited } — reused for the pre-check AND the post-upload invalidation
provides:
  - src/lib/storage-plan-limit.ts — isStoragePlanLimitError message-prefix detector + wouldExceedStorageQuota pure non-destructive pre-check helper
  - handleMutationError extended to fire the Plan-limit Upgrade toast on a StorageApiError whose message begins with `plan_limit_exceeded:` (default source storage_quota_gate)
  - STORAGE_QUOTA_TOAST_ID + showStorageQuotaUpgradeToast — shared, deduped proactive Upgrade prompt reused by all three upload sites
  - all three real upload sites wired (documents, property/inspection images, avatar) — proactive pre-check + reactive detector + usageQueries.storage() invalidation on success
affects: [54-06 storage go-flip — this CTA path must ship before enforcement goes live]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Storage-error detection by MESSAGE PREFIX (`plan_limit_exceeded:`) because StorageApiError carries only {name,message,status,statusCode} — no hint/detail; distinguished from the PostgREST plan-limit path (same prefix + hint) by ABSENCE of the hint"
    - "Non-destructive proactive pre-check: ensureQueryData(usageQueries.storage()) + wouldExceedStorageQuota compared BEFORE .upload(); shows the Upgrade prompt but NEVER aborts (DB trigger is authoritative; grandfathered/Max/flag-off owners must still upload)"
    - "Shared sonner toast id (STORAGE_QUOTA_TOAST_ID) so the proactive pre-check and the per-file reactive detector dedupe to a single 'Plan limit reached' toast across a batch"

key-files:
  created:
    - src/lib/storage-plan-limit.ts
    - src/lib/__tests__/storage-plan-limit.test.ts
  modified:
    - src/lib/mutation-error-handler.ts
    - src/lib/__tests__/mutation-error-handler.test.ts
    - src/hooks/api/query-keys/document-keys.ts
    - src/components/documents/documents-section.tsx
    - src/hooks/use-supabase-upload.ts
    - src/hooks/__tests__/use-supabase-upload.test.ts
    - src/hooks/api/use-profile-avatar-mutations.ts
    - src/hooks/api/__tests__/use-profile-avatar-mutations.test.tsx

key-decisions:
  - "The PostgREST plan-limit error ALSO begins with `plan_limit_exceeded:`, so a genuine STORAGE rejection is disambiguated as 'message prefix matches AND no `hint === plan_limit_exceeded`'. This keeps the storage-only dedupe id + storage_quota_gate default source from bleeding onto the existing property/unit hint path (regression-locked in the handler test)."
  - "The proactive pre-check does NOT route through handleMutationError (which would emit a Sentry event for a non-error UX gate). A dedicated showStorageQuotaUpgradeToast() renders friendly copy under the shared dedupe id with no Sentry noise; the reactive per-file path still uses handleMutationError (raw trigger message) and dedupes against it via the id."
  - "The document-vault caught-storage-plan-limit does NOT push to failures[] — it routes to the Upgrade toast INSTEAD, so reportUploadSummary shows no confusing 'skipped' line for a quota block (the CTA is the message)."
  - "Pre-check reads are wrapped in try/catch so a usage-read failure can NEVER block an upload (non-authoritative UX nicety)."

patterns-established:
  - "Pattern: client-side storage-quota UX — proactive pre-check (primary) + reactive message-prefix detector (backstop) + post-upload usage invalidation, all deduped under one toast id, at every real upload call site"

requirements-completed: [METER-04]

# Metrics
duration: 16min
completed: 2026-07-24
---

# Phase 54 Plan 07: Storage Upload Upgrade-CTA Client Wiring (METER-04) Summary

**The client half of D-03 for STORAGE uploads: a `plan_limit_exceeded:`-message-prefix detector + a non-destructive `usageQueries.storage()` pre-check that surface the shared 'Plan limit reached / Upgrade' toast (source=storage_quota_gate) — reactively and proactively — across all three real upload sites (documents, property/inspection images, avatar), each invalidating the Settings storage bar on success.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-07-24T04:38:44Z
- **Completed:** 2026-07-24T04:54:04Z
- **Tasks:** 3 of 3
- **Files modified:** 10 (2 created, 8 modified)

## Accomplishments
- `src/lib/storage-plan-limit.ts`: `isStoragePlanLimitError(unknown)` (type-guarded message-prefix predicate, no unsafe assertions) + `wouldExceedStorageQuota(StorageUsage, incomingBytes)` (pure; unlimited/-1 → false, `>=` boundary, negative-incoming clamp) + `STORAGE_PLAN_LIMIT_PREFIX`.
- `handleMutationError` now fires the existing plan-limit Upgrade toast for a `StorageApiError` whose message begins with `plan_limit_exceeded:` (defaults `upgrade_source` to `storage_quota_gate`); the PostgREST `hint` path is unchanged and regression-locked.
- All THREE real upload sites wired with proactive pre-check + reactive detector + `usageQueries.storage()` invalidation on success: `documentMutations.upload()` re-throws the original storage error (no longer swallows it) and `documents-section.tsx` routes it to the CTA; `use-supabase-upload.ts` (property-image + inspection-photo dropzones); `use-profile-avatar-mutations.ts` (pre-check in `onMutate`, invalidation in `onSuccess`, reactive CTA via the already-present `onError`).
- Shared `STORAGE_QUOTA_TOAST_ID = "storage-quota-upgrade"` dedupes the proactive prompt and the per-file reactive toast so a batch upload shows a single 'Plan limit reached' toast, not one per file.
- 38 unit/hook tests green (storage-plan-limit, mutation-error-handler, use-supabase-upload, use-profile-avatar-mutations); consumer suites (property-image-dropzone, property-form) still pass (47); `bun run typecheck` + `bun run lint` exit 0.

## Task Commits

Each task was committed atomically (test + implementation together, since lefthook pre-commit enforces typecheck + passing unit tests + 80% coverage — a RED-only commit would fail the hook):

1. **Task 1: storage plan-limit detector + pre-check helper + extend handleMutationError** - `b9d969b1f` (feat)
2. **Task 2: wire the document-vault upload path (detector re-throw + proactive pre-check + usage invalidation)** - `53aced559` (feat)
3. **Task 3: wire the image + avatar upload paths (CTA + pre-check + usage invalidation) + hook/mutation tests** - `340b05860` (feat)

**Plan metadata:** committed separately (docs: this SUMMARY)

## Files Created/Modified
- `src/lib/storage-plan-limit.ts` - message-prefix detector + non-destructive pre-check helper + prefix constant
- `src/lib/__tests__/storage-plan-limit.test.ts` - both helpers' behaviors (prefix guard, unlimited/-1, `>=` boundary, negative clamp)
- `src/lib/mutation-error-handler.ts` - storage-prefix arm on the plan-limit branch + shared STORAGE_QUOTA_TOAST_ID + showStorageQuotaUpgradeToast helper; storage vs PostgREST disambiguation
- `src/lib/__tests__/mutation-error-handler.test.ts` - storage StorageApiError → Upgrade toast (source=storage_quota_gate, shared id) + PostgREST hint regression (no id)
- `src/hooks/api/query-keys/document-keys.ts` - documentMutations.upload re-throws the original storage error on a plan-limit
- `src/components/documents/documents-section.tsx` - proactive pre-check, reactive catch routing, post-upload usageQueries.storage() invalidation
- `src/hooks/use-supabase-upload.ts` - useQueryClient + pre-check, reactive CTA (keeps inline errors[]), post-upload invalidation
- `src/hooks/__tests__/use-supabase-upload.test.ts` - QueryClientProvider wrapper + reactive CTA / no-false-positive / invalidation tests
- `src/hooks/api/use-profile-avatar-mutations.ts` - pre-check in onMutate + usageQueries.storage() invalidation in onSuccess
- `src/hooks/api/__tests__/use-profile-avatar-mutations.test.tsx` - reactive storage plan-limit CTA via onError

## Decisions Made
- **Storage-vs-PostgREST disambiguation:** the PostgREST plan-limit error message ALSO begins with `plan_limit_exceeded:`, so a genuine storage rejection is `isStoragePlanLimitError(error) && !hasPlanLimitHint`. Only that path gets the storage dedupe id + `storage_quota_gate` default; the hint path keeps its identity-less toast + DETAIL-parsed source (regression test asserts `opts.id` undefined + `property_limit_gate`).
- **Proactive prompt avoids Sentry noise:** the pre-check uses `showStorageQuotaUpgradeToast()` (friendly copy, no Sentry) rather than a synthetic error through `handleMutationError`; both render under the shared id so the reactive path dedupes against it.
- **Quota block ≠ failure line:** caught storage plan-limits in the document vault route to the CTA INSTEAD of `failures[]`, so `reportUploadSummary` shows no misleading "skipped" summary for a quota block.

## Deviations from Plan

None functionally — plan executed as written. Two mechanical adaptations worth recording:

1. **[Rule 1 - Bug in the plan's detection design] Storage-vs-PostgREST prefix collision.** The plan's Task 1 framing implied `isStoragePlanLimitError` alone distinguishes storage from the PostgREST plan-limit path, but the PostgREST error message ALSO begins with `plan_limit_exceeded:`. Fixed by gating the storage-specific behavior on `&& !hasPlanLimitHint` so the existing property/unit hint path keeps its exact prior toast (no id, DETAIL-parsed source). Regression-locked in `mutation-error-handler.test.ts`. Committed in `53aced559`.
2. **[Rule 3 - Blocking] Test harness for the new `useQueryClient` dependency.** `use-supabase-upload.ts` now calls `useQueryClient()`, so its existing test (previously wrapper-less) needed a `QueryClientProvider` wrapper + `getCachedUser`/`handleMutationError` mocks; the pre-check's usage read is swallowed there (getCachedUser → null) so it stays inert for the reactive/invalidation assertions. Committed in `340b05860`.

---

**Total deviations:** 0 scope changes; 2 mechanical adaptations folded into their task commits.
**Impact on plan:** none — the disambiguation is load-bearing for no-regression on the existing plan-limit toast; the harness change is test-only.

## Issues Encountered
- The `bun run test:unit -- --run <file>` form in the plan's verify commands double-injects `--run` (the script already injects it) and crashes with a CAC duplicate-flag error; used `bun run test:unit -- <file>` instead (per project memory).
- Initial RED run for the mutation-error handler failed only the storage assertion (module + handler not yet extended) while the existing hint-path test passed — confirming the change was additive.

## User Setup Required
None - no external service configuration required. This plan is pure frontend; the Plan 04 trigger + column are already live and Plan 06 owns the enforcement flag flip.

## Next Phase Readiness
- The client CTA path is complete and shipped, satisfying Plan 06's `depends_on 54-07` gate: enforcement (`storage_enforcement_enabled`) can now be flipped to `'true'` without leaving over-quota owners at a dead-end raw error.
- Boundary honored: `src/types/supabase.ts`, `.planning/STATE.md`, `.planning/ROADMAP.md` untouched by all three commits; no migration/MCP/deploy performed.
- Note on current (flag-OFF) behavior: until Plan 06 flips the flag, the DB never rejects, so the REACTIVE detector cannot fire; the PROACTIVE pre-check can still surface the prompt to an at/over-quota owner (non-destructive — their upload still succeeds). This is the intended pre-go-flip sequencing.

## Known Stubs
None. Both helpers are real (tested) logic; all three sites are wired to the live `usageQueries.storage()` factory and the real Plan 04 message contract.

## Self-Check: PASSED
- FOUND: src/lib/storage-plan-limit.ts
- FOUND: src/lib/__tests__/storage-plan-limit.test.ts
- FOUND: commits b9d969b1f, 53aced559, 340b05860
- CONFIRMED: 38 unit/hook tests green; typecheck 0; lint 0
- CONFIRMED (boundary): src/types/supabase.ts, STATE.md, ROADMAP.md NOT modified by any task commit

---
*Phase: 54-e-sign-storage-metering*
*Completed: 2026-07-24*
