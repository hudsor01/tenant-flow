---
phase: 26-lease-domain-correctness
plan: 07
subsystem: ui
tags: [leases, lease-header, edit-gate, route-gate, rent-increase-notice, term-lock, property-address]

# Dependency graph
requires:
  - phase: 26-lease-domain-correctness
    provides: "plan 26-06 server BEFORE UPDATE trigger is the enforcing lock; plan 26-01 fuller detail embed exposes units->properties address; plan 26-02 introduced the shared isLeaseTermsLocked helper reused here"
provides:
  - "lease-header Edit affordance disabled (aria-label) on signed/pending leases; draft/unsigned keep the edit link"
  - "edit route (/leases/[id]/edit) redirects to the detail when terms are locked, so a typed/bookmarked URL cannot render the term form"
  - "rent-increase notice receives the property street address (units->properties embed) instead of the unit number"
affects: [lease edit flow, rent-increase notice output]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defense-in-depth UI + route gate mirroring the 26-06 server term-lock via the shared isLeaseTermsLocked helper (single source of truth across header, edit route, and renew dialog)"
    - "Typed narrow (Lease & optional-embed interface) to read the nested units->properties address without any / as unknown as"

key-files:
  created: []
  modified:
    - src/components/leases/detail/lease-header.tsx
    - src/components/leases/detail/lease-details.client.tsx
    - src/app/(owner)/leases/[id]/edit/page.tsx
    - src/components/leases/__tests__/lease-details.test.tsx

key-decisions:
  - "Reused the shared isLeaseTermsLocked helper (from 26-02) in both the header gate and the route gate — one condition, zero drift; each call site carries a doc comment naming the exact lease_status/tenant_signed_at condition"
  - "Route gate uses useRouter().replace('/leases/{id}') in a useEffect + renders the skeleton while the redirect settles, so the term form never flashes for a locked lease"
  - "Property address derived from the detail lease's units->properties embed via a typed narrow; kept the unitName prop on LeaseHeader (now unconsumed there) for future unit-number display, per plan"

requirements-completed: [LEASE-04, LEASE-08]

# Metrics
duration: ~40min
completed: 2026-07-05
---

# Phase 26 Plan 07: LEASE-04 UI/route Edit-lock + LEASE-08 Notice Address

**On a signed / pending_signature lease the "Edit Lease" affordance is disabled AND the edit route bounces to the read-only detail, so terms locked server-side (26-06) can't be edited via the button or a typed URL; and the rent-increase notice now prints the property street address instead of the unit number.**

## Accomplishments

- **LEASE-04 UI gate (Task 1):** `lease-header.tsx` computes `termsLocked = isLeaseTermsLocked(lease)`; when locked the Edit control is a disabled `<Button>` with an accessible `aria-label` (+ title) explaining the lock; draft/unsigned leases keep the `<Link href="/leases/{id}/edit">`.
- **LEASE-04 route gate (Task 2):** `src/app/(owner)/leases/[id]/edit/page.tsx` computes the same `termsLocked`; a `useEffect` calls `router.replace('/leases/{id}')` when locked, and the locked branch renders the skeleton so the editable term form never renders/flashes. Loading / error / not-found branches unchanged.
- **LEASE-08 (Task 3):** `RentIncreaseNoticeDialog` now receives `propertyAddress` (street address) instead of `unitName`. New optional `propertyAddress?: string | null` prop on `LeaseHeaderProps`; `lease-details.client.tsx` derives the address from the detail lease's `units->properties` embed via `getPropertyAddress()` (typed narrow, no `any` / `as unknown as`). `unitName` prop retained on the interface + still passed by the caller.

## Task Commits

1. **Task 1 + Task 3 (header + detail):** `5113d986a` (feat) — edit-gate + property address + lease-details test update. The two requirements share `lease-header.tsx`; a single file cannot be split across commits without interactive hunk staging (blocked in this environment), so both are in one commit tagged `(LEASE-04, LEASE-08)`.
2. **Task 2 (route gate):** `ae4eeec51` (feat, LEASE-04) — the separable edit-page redirect.

## Verification

- Task 1 grep `tenant_signed_at` in `lease-header.tsx` → present (doc comment naming the exact condition alongside the `isLeaseTermsLocked` call). ✔
- Task 2 grep `tenant_signed_at | pending_signature | replace(\`/leases` in the edit page → all present. ✔
- Task 3 grep `propertyAddress` in `lease-header.tsx` + `lease-details.client.tsx` → present (prop declared, consumed, and passed from the detail-derived address). ✔
- `bun run typecheck` — clean.
- `bun run lint` (biome) — clean on all four files.
- `bun run test:unit -- …/lease-details.test.tsx` — 25/25 pass. Two pre-existing "Edit Button" tests asserted the old always-a-link behavior against the (signed) mock lease; updated to assert the disabled locked affordance for the signed lease and the working edit link for an unsigned lease (mutating only `tenant_signed_at` so the test stays on the already-covered active render path — flipping to `draft` would have rendered the unmocked `LeaseSignatureStatus` sidebar hook).

## Reconciliation

- **Shared helper:** `isLeaseTermsLocked` (created in 26-02) is the single term-lock predicate used by the renew dialog (26-02), the header Edit gate, and the edit route — mirrors the 26-06 server condition exactly.
- **26-01 embed:** the property address is read from the fuller `units->properties` detail embed (id, name, address_line1, city, state, postal_code) that 26-01 already provides.

## Deviations

- `lease-details.test.tsx` was updated (not listed in the plan's `files_modified`) because the pre-existing Edit-Button tests encoded the old ungated behavior — required by the perfect-PR "fix pre-existing failures on the branch" discipline.
- Header changes for LEASE-04 + LEASE-08 landed in one commit (shared file; no non-interactive hunk split available).

## Self-Check: PASSED
- Edit affordance gated in header AND edit route blocks the form (redirect + skeleton) when locked.
- Rent-increase notice receives the property street address, not the unit number; no `any` / `as unknown as`.
- typecheck + lint clean; lease-details tests 25/25.

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-05*
