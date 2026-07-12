---
phase: 31-forms-behavior
plan: 01
subsystem: tenants
tags: [forms, tanstack-form, unsaved-changes, lease-wizard, toast]
requires: []
provides:
  - Reactive unsaved-changes guard on the add-tenant form
  - add-tenant property/unit carried into the lease-creation wizard (preselection)
  - single add-tenant success toast
affects:
  - src/components/tenants/add-tenant-form.tsx
  - src/app/(owner)/leases/new/page.tsx
  - src/components/leases/wizard/lease-creation-wizard.tsx
tech-stack:
  patterns:
    - "useStore(form.store, s => s.isDirty) for reactive dirty reads"
    - "URLSearchParams preselection carried across routes + useSearchParams seed under Suspense"
key-files:
  created: []
  modified:
    - src/components/tenants/add-tenant-form.tsx
    - src/app/(owner)/leases/new/page.tsx
    - src/components/leases/wizard/lease-creation-wizard.tsx
    - src/components/tenants/__tests__/add-tenant-form.property.test.tsx
decisions:
  - "No standalone tenant↔unit link exists (lease_tenants needs a lease_id; a lease needs start/end/rent the add-tenant form does not collect) — so the selection is carried into the lease wizard via preselection query params rather than silently dropped."
metrics:
  tasks: 3
  commits: 3
  files: 4
  completed: 2026-07-09
---

# Phase 31 Plan 01: Add-Tenant Form Behavior Summary

Reactive unsaved-changes guard on the add-tenant form, the previously-dropped property/unit selection now carried into the lease-creation wizard, and the duplicate success toast removed — all via `useStore` + preselection query params, no v7.0 typing refactor.

## Tasks

| Task | Requirement | Commit | What |
|------|-------------|--------|------|
| 1 | FORMFIX-01 | `686a0bca3` | Read dirty via `useStore(form.store, s => s.isDirty)` so the `beforeunload` guard arms as the user types (was a non-reactive `form.state.isDirty` snapshot). |
| 2 | FORMFIX-04 | `679ec8d35` | On submit, when a property is selected, carry the created tenant + property/unit to `/leases/new?tenant=&property=&unit=`; the wizard seeds its selection (Suspense-wrapped `useSearchParams`) + a toast prompts completing the lease. No property → keep the `/tenants` redirect. |
| 3 | FORMFIX-08 | `dc550f9e3` | Remove the form-level `toast.success("Tenant added")`; the create mutation's `createMutationCallbacks` is the single success toast. |

## Key Decisions

- **Association mechanism (FORMFIX-04):** confirmed from the code there is no standalone tenant↔unit link — `lease_tenants` requires a `lease_id`, and `leaseCreateSchema` requires start/end/rent the add-tenant form never collects. The honest fix per the locked fallback is preselection into the lease wizard (query params), not a fabricated association. Behavior-only; the wizard's `selectionData` is seeded from `?tenant/property/unit`. `useSearchParams` requires a Suspense boundary, added in `leases/new/page.tsx`.
- **Disarm semantics:** TanStack Form's field-level `isDirty` is sticky once a field changes (it is not recomputed from value equality), so the guard disarms on submit/navigation (effect cleanup on unmount) — not on revert-to-default. The regression test asserts the navigate-away (unmount) cleanup path accordingly.

## Deviations from Plan

None — plan executed as written. The Suspense boundary in `leases/new/page.tsx` is the mechanism the plan authorized for `useSearchParams` preselection (behavior-only, no typing refactor).

## Tests

Extended `src/components/tenants/__tests__/add-tenant-form.property.test.tsx` (now 7 tests, all green):
- Guard arms on a dirty change; removed on unmount (navigate-away).
- Selecting a property routes to `/leases/new` with `tenant`/`property`/`unit` params and never to `/tenants`.
- No property → `/tenants` redirect; the form fires no `toast.success("Tenant added")`.

`bun run test:unit -- src/components/tenants/__tests__/add-tenant-form.property.test.tsx` → 7 passed. Each task passed the full pre-commit suite (typecheck + lint + unit).

## Self-Check: PASSED
- Files exist: add-tenant-form.tsx, leases/new/page.tsx, lease-creation-wizard.tsx, add-tenant-form.property.test.tsx — all present.
- Commits exist: 686a0bca3, 679ec8d35, dc550f9e3 — all in `git log`.
