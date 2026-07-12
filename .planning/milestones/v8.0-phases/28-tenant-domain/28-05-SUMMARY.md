---
phase: 28-tenant-domain
plan: 05
subsystem: ui
tags: [tenants, navigation, lease-status, a11y, badge]

# Dependency graph
requires: [28-01]
provides:
  - "TenantLeaseStatusBadge — shared read-only lease-status chip (label + status-* class map) in tenant-table-helpers.tsx, consumed by both the table row and the grid card"
  - "tenant table-row View button navigates to /leases/{leaseId} via a narrowed local const (never tenant.id)"
  - "read-only lease-status badge replaces the log-only StatusSelectCell (row) and StatusDropdown (grid)"
affects: [TEN-02, TEN-03, tenant table row, tenant grid card, tenant-grid a11y test]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TS does NOT narrow a property access (tenant.leaseId) into a nested arrow closure — extract `const leaseId = tenant.leaseId` first, guard on the local, pass the local into onClick to avoid TS2345"
    - "One shared chip component (TenantLeaseStatusBadge) for both views so table + grid status rendering can never drift; fallback '—' span carries the aria-label so the accessible name survives"

key-files:
  created: []
  modified:
    - src/components/tenants/tenant-table-row.tsx
    - src/components/tenants/tenant-table-helpers.tsx
    - src/components/tenants/tenant-grid.tsx
    - src/components/tenants/__tests__/tenant-grid.a11y.test.tsx

key-decisions:
  - "Placed the read-only badge as a single exported TenantLeaseStatusBadge in tenant-table-helpers.tsx and imported it into both row and grid (the plan's 'SAME read-only badge') rather than duplicating a span in each file"
  - "Badge param typed `status: LeaseStatus | undefined`; STATUS_LABELS/STATUS_CHIP keep the LeaseStatus import legitimately used in helpers. In the row and grid the LeaseStatus import became unused and was removed (strict noUnusedLocals)"
  - "Chip classes mirror LeaseStatusBadge: active -> status-active, draft/pending_signature -> status-pending, ended/terminated -> status-inactive; undefined -> neutral '—'"
  - "Grid a11y test asserts the badge accessible name via getByLabelText (stub tenant has no leaseStatus, so it renders the '—' fallback which still carries aria-label) — getByText('Active') would not apply to the stub"

patterns-established:
  - "Clearable/optional property used in a closure: bind to a local const first so control-flow narrowing reaches the closure"

requirements-completed: [TEN-02, TEN-03]

# Metrics
duration: ~20min
completed: 2026-07-07
---

# Phase 28 Plan 05: Correct lease navigation + read-only tenant status badge

**Clicking View on an active-lease tenant now navigates to that tenant's lease detail (`/leases/{leaseId}`) instead of `/leases/{tenantId}` (404), and per-tenant lease status is a read-only badge in both the table and grid views — the log-only control that snapped back on refetch is gone.**

## Accomplishments

### Task 1 — View-lease navigation + read-only status badge in the table row (TEN-02, TEN-03)
- `tenant-table-helpers.tsx`: deleted the dead `StatusSelectCell` and its shadcn `Select` imports; added the shared `TenantLeaseStatusBadge` (STATUS_LABELS + STATUS_CHIP maps, `cn` from `#lib/utils`, `—` fallback for undefined status). Kept `SortableHeader` + the `Sort*` types + the Chevron icons.
- `tenant-table-row.tsx` (TEN-02): extracted `const leaseId = tenant.leaseId` before the return so TypeScript narrows it into the `onClick` closure, guarded the View button on `tenant.leaseStatus === "active" && leaseId`, and passed the local `leaseId` to `onViewLease(leaseId)` (never `tenant.id`). Kept the `—` fallback for the non-active / no-lease case.
- `tenant-table-row.tsx` (TEN-03): replaced the `StatusSelectCell` cell with `<TenantLeaseStatusBadge status={tenant.leaseStatus} />`; removed the now-unused `createLogger`/`logger` and `LeaseStatus` imports.

### Task 2 — Read-only status badge in the grid card + a11y test (TEN-03)
- `tenant-grid.tsx`: deleted the local `StatusDropdown` component and its `StatusDropdownProps` interface; replaced the dropdown block with `<TenantLeaseStatusBadge status={tenant.leaseStatus} ariaLabel={`Lease status for ${tenant.fullName}`} />` so the accessible name survives. Removed the now-unused `ChevronDown`, `createLogger`/`logger`, and `LeaseStatus`; kept the existing decorative green "Active" pill.
- `tenant-grid.a11y.test.tsx`: renamed the status test to "exposes an accessible name on the read-only status badge" and changed the assertion from `getByRole("combobox", …)` to `getByLabelText(/lease status for jane doe/i)` (the badge's aria-label, carried through the `—` fallback). The checkbox a11y test is unchanged.

## Task Commits

1. **Task 1: tenant view-lease via leaseId + read-only status badge (TEN-02, TEN-03)** — `ea14a4ea1` (fix)
2. **Task 2: read-only status badge in tenant grid card (TEN-03)** — `3bd5bf11a` (fix)

## Verification

- `bun run typecheck` — exit 0.
- `bun run lint` — exit 0 (only the pre-existing biome 2.4.15 vs 2.4.16 schema-migration info notice, unrelated).
- `bun run test:unit -- src/components/tenants/__tests__/tenant-grid.a11y.test.tsx` — exit 0, 2/2 tests pass (checkbox + read-only badge).
- Full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, ~102k unit tests) passed on both commits.

## Deviations from Plan

- The plan's illustrative `${tenant.name}` for the grid aria-label was written against the actual `TenantItem` field `fullName` (there is no `name`); this matches the a11y test's stub (`fullName: "Jane Doe"`).
- The shared badge kept the `LeaseStatus` import in `tenant-table-helpers.tsx` (used by its label/chip maps) — legitimately used, so no unused-symbol violation. `LeaseStatus` was removed from the row and grid where it became unused, exactly as the plan intended.

## Issues Encountered

- Commitlint rejected the first Task-1 subject at 102 chars (>100). Shortened the subject; content unchanged.

## Next Phase Readiness

- View navigates by `leaseId` (resolves to the active lease via 28-01's TEN-04 transform) and status is read-only in both views. Manual click-through verification is Plan 06.

---
*Phase: 28-tenant-domain*
*Completed: 2026-07-07*
