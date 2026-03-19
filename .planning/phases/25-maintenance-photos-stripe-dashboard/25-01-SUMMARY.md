---
phase: 25-maintenance-photos-stripe-dashboard
plan: 01
subsystem: maintenance
tags: [photos, storage, upload, lightbox]
dependency_graph:
  requires: []
  provides: [maintenance_request_photos_table, photo_upload_flow, photo_display]
  affects: [tenant-maintenance-form, owner-maintenance-detail]
tech_stack:
  added: []
  patterns: [supabase-storage-upload, dialog-lightbox, staged-file-upload]
key_files:
  created:
    - supabase/migrations/20260318120000_maintenance_request_photos.sql
  modified:
    - src/types/supabase.ts
    - src/hooks/api/use-tenant-maintenance.ts
    - src/app/(tenant)/tenant/maintenance/new/page.tsx
    - src/hooks/api/query-keys/maintenance-keys.ts
    - src/components/maintenance/detail/photos-card.tsx
    - src/components/maintenance/detail/maintenance-details.client.tsx
decisions:
  - Staged file upload pattern (no auto-upload) for better UX control
  - Photo upload failures are non-blocking (request still created)
  - Public storage bucket for direct URL access to photos
  - Simple file input instead of Dropzone for lighter implementation
metrics:
  duration: 30m
  completed: 2026-03-18
---

# Phase 25 Plan 01: Maintenance Request Photos Summary

Maintenance photo upload for tenants and photo grid display for owners, eliminating the "Photo upload is not yet available" stub.

## One-liner

Tenant photo upload (max 5, 5MB each) to Supabase Storage with owner-side thumbnail grid and Dialog lightbox

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Database migration -- maintenance_request_photos table, RLS, storage bucket | fa1d384d7 | Done |
| 2 | Tenant photo upload in form + owner photo display in detail view | 4f9aad9e7 | Done |

## Implementation Details

### Task 1: Database Migration
- Created `maintenance_request_photos` table with text CHECK constraint on mime_type (no ENUMs)
- 3 RLS policies: owner_select, tenant_select, tenant_insert (one per operation per role)
- Storage bucket `maintenance-photos` (public) with authenticated upload/view policies
- Index on `maintenance_request_id` for efficient lookups
- Manually added type to `supabase.ts` (Supabase CLI token expired, `pnpm db:types` returned 403)

### Task 2: Photo Upload + Display
- **Tenant form**: Replaced Dropzone/useSupabaseUpload with simple file input and staged files in useState. Thumbnails shown with remove buttons. Files passed to mutation on submit.
- **Mutation**: After request creation, uploads each file to `maintenance-photos/{requestId}/{uuid}.ext`, inserts metadata row. Failures logged but non-blocking.
- **Photos query**: Added `maintenanceQueries.photos(requestId)` to maintenance-keys.ts factory.
- **Photos card**: Replaced stub with thumbnail grid (grid-cols-2 sm:grid-cols-3), Dialog lightbox on click, skeleton loading state, empty state with Camera icon.
- **Detail view**: Updated `maintenance-details.client.tsx` to pass `requestId` prop to PhotosCard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supabase CLI token expired**
- **Found during:** Task 1
- **Issue:** `pnpm db:types` returned 403 Forbidden, emptied supabase.ts
- **Fix:** Restored supabase.ts from git, manually added maintenance_request_photos type definition
- **Files modified:** src/types/supabase.ts

**2. [Rule 1 - Bug] exactOptionalPropertyTypes type error**
- **Found during:** Task 2
- **Issue:** `stagedFiles: condition ? files : undefined` not assignable with exactOptionalPropertyTypes
- **Fix:** Used spread pattern `...(files.length > 0 ? { stagedFiles } : {})` instead
- **Files modified:** src/app/(tenant)/tenant/maintenance/new/page.tsx

**3. [Rule 2 - Missing] PhotosCard prop not passed**
- **Found during:** Task 2
- **Issue:** PhotosCard now requires requestId prop but parent component was not updated
- **Fix:** Updated maintenance-details.client.tsx to pass `requestId={id}` to PhotosCard
- **Files modified:** src/components/maintenance/detail/maintenance-details.client.tsx

**4. [Rule 2 - Simplification] Replaced Dropzone with file input**
- **Found during:** Task 2
- **Issue:** Plan specified using Dropzone but the existing useSupabaseUpload hook auto-uploads to a fixed path, not suitable for staged-then-upload-after-creation flow
- **Fix:** Used simple file input with staged files in local state, matching the plan's intent of no auto-upload
- **Files modified:** src/app/(tenant)/tenant/maintenance/new/page.tsx

## Verification

- typecheck: PASSED
- lint: PASSED
- unit tests: PASSED (1453 tests, pre-existing settings-page failures unrelated)
