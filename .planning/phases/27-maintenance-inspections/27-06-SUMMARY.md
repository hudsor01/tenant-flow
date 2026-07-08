---
phase: 27-maintenance-inspections
plan: 06
subsystem: ui
tags: [inspections, photos, upload, storage, per-file-status, retry, idempotency]

# Dependency graph
requires: []
provides:
  - "inspection photo upload tracks per-file status by a stable id, surfaces error+retry on failure, and skips re-uploading succeeded files"
affects: [INSP-02, inspection room card, Plan 27-07 behavioral verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-file upload state keyed by a stable crypto.randomUUID() id; status writes match on id, never on a filtered-array index"
    - "Single-file uploadOne() with its own try/catch that returns a success boolean and sets its own status — the caller tallies the batch from the returned booleans"

key-files:
  created: []
  modified:
    - src/components/inspections/inspection-photo-upload.tsx

key-decisions:
  - "Added a stable id to FileUploadState and used it as the React key and the status-update match key, fixing the wrong-tile write (idx was the pending-subset index but applied to the full files array)"
  - "Extracted uploadOne(fileState) so each file owns its try/catch; a failure sets status 'error' + message on the correct tile instead of leaving a stuck spinner"
  - "handleUpload targets pending + error files and Promise.all's uploadOne; succeeded files are excluded from targets AND guarded inside uploadOne (defense in depth) so a re-click cannot duplicate a storage object or recordPhoto row"
  - "Error tiles get a retry (RotateCw) and remove (X) control; retry re-runs uploadOne for just that file and can transition it to success"
  - "removeFile now targets by stable id (revoking that file's objectUrl), not the array index"
  - "Did NOT touch the shared use-supabase-upload hook (reserved for Phase 32)"

requirements-completed: [INSP-02]

# Metrics
duration: ~12min
completed: 2026-07-06
---

# Phase 27 Plan 06: Inspection photo upload — correct per-tile status, retry, no duplicates (INSP-02)

**Photo upload now tracks each file by a stable id, so success/error land on the right tile; failed uploads show an error state with a retry control instead of a stuck spinner; and re-clicking upload skips already-succeeded files so no duplicate storage object or DB row is created.**

## Accomplishments

- `inspection-photo-upload.tsx`: added a stable `id: crypto.randomUUID()` to `FileUploadState` (set in `onDrop`), used as the React `key` and as the match key for every status write. Replaced the `pendingFiles.map((_, idx) => setFiles(prev => prev.map((f, i) => i === idx ? ...)))` wrong-index pattern with a `uploadOne(fileState)` helper that keys updates by `f.id === id`.
- `uploadOne` wraps each file's storage upload + `recordPhoto.mutateAsync` in its own try/catch: on failure it sets `status: "error"` + the error message on that file's tile and resolves `false`; on success it sets `status: "success"` and resolves `true`. It early-returns for files already in `success` (skip-succeeded guard).
- `handleUpload` filters to pending + error files, `Promise.all`s `uploadOne`, and tallies success/error from the returned booleans for the existing success / "N failed" toasts.
- Error tiles render an `AlertCircle` overlay with a retry (`RotateCw` → re-invokes `uploadOne` for just that file) and a remove (`X`) control. `removeFile(id)` now removes by stable id and revokes that file's objectUrl. The upload button gates on an `uploadableCount` (pending + error) so failed files can be retried from the batch button too.

## Task Commits

1. **Task 1: Stable-id status, error+retry, skip-succeeded** — `c289c1c7a` (fix)

## Verification

- `bun run typecheck` — clean.
- `grep -c 'status: "error"'` — 1; `grep -c 'randomUUID\|\.id ==='` — 6.
- `bun run lint` — exit 0 (biome auto-formatted the file; only a biome schema-version info note remains).
- Commit passed the full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit+coverage, commitlint).

## Deviations

- None. The shared `use-supabase-upload` hook was intentionally left untouched (Phase 32 scope).

## Self-Check: PASSED
- Status keyed by stable id, not the filtered-array index — the wrong-tile write is gone.
- Per-file try/catch sets `status: "error"` + message on the correct tile; retry can move it to success; remove targets the correct file.
- Succeeded files are skipped on re-upload (excluded from `handleUpload` targets and guarded inside `uploadOne`) — no duplicate storage object or recordPhoto row.

---
*Phase: 27-maintenance-inspections*
*Completed: 2026-07-06*
