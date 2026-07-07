---
phase: 27-maintenance-inspections
plan: 05
subsystem: ui
tags: [inspections, photos, storage, signed-urls, private-bucket, display-correctness]

# Dependency graph
requires: []
provides:
  - "inspection room photos resolve to short-lived signed URLs from the private inspection-photos bucket and render via <img>"
affects: [INSP-01, INSP-02, inspection detail page, Plan 27-07 behavioral verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batched createSignedUrls(paths, 3600) across all rooms of an inspection in one round-trip, resolved via a Map<storage_path, signedUrl> (mirrors maintenanceQueries.photos)"

key-files:
  created: []
  modified:
    - src/hooks/api/query-keys/inspection-keys.ts
    - src/components/inspections/inspection-room-card.tsx

key-decisions:
  - "Signed all photo paths for the whole inspection in ONE createSignedUrls call (flatMap over rooms) rather than per-room or per-photo, minimizing round-trips"
  - "Skip the sign call entirely when the inspection has zero photos (matches maintenance-keys)"
  - "Conditionally include publicUrl (spread only when a signed URL exists) to satisfy exactOptionalPropertyTypes — publicUrl?: string cannot be assigned undefined"
  - "Rendered via plain <img> (not next/image) because the signed storage URL is cross-origin + short-lived; missing URL falls back to a muted camera placeholder rather than a broken image"

requirements-completed: [INSP-01]

# Metrics
duration: ~10min
completed: 2026-07-06
---

# Phase 27 Plan 05: Inspection photos display via signed URLs (INSP-01)

**Inspection room photos now resolve to 1h signed URLs from the private inspection-photos bucket and render through a plain `<img>`, replacing the 403-yielding `getPublicUrl()` resolution and the nonexistent `/api/v1/inspections/photos/{id}/url` route.**

## Accomplishments

- `inspection-keys.ts` (`detailQuery`): replaced the synchronous per-photo `getPublicUrl()` call with a single batched `supabase.storage.from("inspection-photos").createSignedUrls(paths, 3600)` over every photo path across all rooms, resolved through a `Map<storage_path, signedUrl>`. Zero-photo inspections skip the sign call. Each photo's `publicUrl` is set only when a signed URL is returned (conditional spread, exactOptionalPropertyTypes-safe).
- `inspection-room-card.tsx`: dropped the dead `/api/v1/inspections/photos/{id}/url` route and now renders `photo.publicUrl` via `<img>` (preserving `alt`, `loading="lazy"`, object-cover, and the caption overlay). A missing `publicUrl` renders a muted `<Camera>` placeholder tile instead of a broken image.

## Task Commits

1. **Task 1: Resolve inspection photos via signed URLs** — `4828623ca` (fix)
2. **Task 2: Render the resolved signed URL** — `f66324e8b` (fix)

## Verification

- `bun run typecheck` — clean.
- `grep getPublicUrl src/hooks/api/query-keys/inspection-keys.ts` — none (removed, including the comment token).
- `grep -c createSignedUrls` — 1; `grep -rn '/api/v1/inspections' src/` — none; `grep -c photo.publicUrl` (room card) — 2.
- `bun run lint` — exit 0 (only a biome schema-version info note).
- Both commits passed the full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit+coverage, commitlint).

## Deviations

- None.

## Self-Check: PASSED
- Photos resolved via batched `createSignedUrls` on the private bucket; `getPublicUrl` fully removed.
- Zero-photo inspections do not call the sign endpoint.
- Dead `/api/v1/inspections/photos/...` route removed; render uses `<img src={photo.publicUrl}>` with a missing-URL placeholder guard.
- `InspectionPhoto` type unchanged (`publicUrl?: string` already optional).

---
*Phase: 27-maintenance-inspections*
*Completed: 2026-07-06*
