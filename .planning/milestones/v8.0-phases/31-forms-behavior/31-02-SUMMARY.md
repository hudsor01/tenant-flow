---
phase: 31-forms-behavior
plan: 02
subsystem: properties, leases
tags: [forms, tanstack-form, unsaved-changes, toast]
requires: []
provides:
  - Reactive unsaved-changes guard on the property form
  - single success/error toast on property + lease create/update
affects:
  - src/components/properties/property-form.client.tsx
  - src/components/leases/lease-form.tsx
tech-stack:
  patterns:
    - "useStore(form.store, s => s.isDirty) for reactive dirty reads"
    - "createMutationCallbacks is the single toast source of truth"
key-files:
  created: []
  modified:
    - src/components/properties/property-form.client.tsx
    - src/components/leases/lease-form.tsx
    - src/components/properties/__tests__/property-form.test.tsx
    - src/components/leases/__tests__/lease-form.test.tsx
decisions:
  - "Both FORMFIX-01 and FORMFIX-08 touch property-form.client.tsx, so they live in one plan to avoid same-wave file overlap with plan 01."
metrics:
  tasks: 2
  commits: 2
  files: 4
  completed: 2026-07-09
---

# Phase 31 Plan 02: Property + Lease Form Toast/Guard Summary

Property form's unsaved-changes guard now arms reactively via `useStore`, and the form-level duplicate success toasts on property create/update and lease create/update are removed — the mutation `createMutationCallbacks` is the single toast source.

## Tasks

| Task | Requirement | Commit | What |
|------|-------------|--------|------|
| 1 | FORMFIX-01, FORMFIX-08 | `47a103866` | Property form: reactive `useStore` dirty read for the guard; remove `toast.success("Property created successfully")` (no-images branch) and `toast.success("Property updated successfully")`. Auth/missing-id guard toasts untouched. |
| 2 | FORMFIX-08 | `3b2e6e865` | Lease form: remove `toast.success("Lease created successfully")` and `toast.success("Lease updated successfully")`; invalidations, `/leases` redirect, and the Lease-ID guard toast preserved. |

## Key Decisions

- **Single source of truth:** the create/update mutations already emit success toasts through `createMutationCallbacks` (`successMessage`). Removing the form-level `toast.success` calls leaves exactly one. `handleMutationError` in the form catch is retained (the callback error path does not double for these mutations).
- **`toast` import kept** in both files — property form still uses `toast.error` for the auth/missing-id guards; lease form still uses `toast.error("Lease ID is missing")`.
- **Image branch unaffected** — `uploadPropertyImages` runs on the image path and owns its own toasts; the removed form-level toast only fired in the no-images branch.

## Deviations from Plan

None — plan executed as written.

## Tests

- `property-form.test.tsx` (now 23 tests): reactive guard arms on a dirty field; create + update submits fire no form-level `toast.success` (mutation module mocked via `importOriginal` to preserve image hooks).
- `lease-form.test.tsx` (now 22 tests): saving a lease fires no form-level `toast.success`. A full create-submit assertion was intentionally not added — driving property→unit→tenant→date→rent through Radix comboboxes is flaky; the update-path regression plus the shared `createMutationCallbacks` single-source pattern (covered by `create-mutation-callbacks.test`) establish the create path removal.

`bun run test:unit` on both files green. Each task passed the full pre-commit suite.

## Self-Check: PASSED
- Files exist: property-form.client.tsx, lease-form.tsx, property-form.test.tsx, lease-form.test.tsx — all present.
- Commits exist: 47a103866, 3b2e6e865 — both in `git log`.
