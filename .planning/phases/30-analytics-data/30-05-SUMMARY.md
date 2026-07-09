---
phase: 30-analytics-data
plan: 05
subsystem: ui
tags: [virtualization, tanstack-virtual, tables, flex-row, properties, tenants]

# Dependency graph
requires:
  - phase: 30-analytics-data
    provides: virtualized property + tenant tables (useVirtualizer already wired)
provides:
  - property + tenant virtualized rows are absolutely positioned via translateY(virtualRow.start)
  - a shared virtualized-row style helper (getVirtualRowStyle + VIRTUAL_ROW_CLASS)
  - per-column width maps keeping thead cells aligned with row cells
affects: [properties, tenants]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canonical TanStack table-virtualization: display:grid on table/thead/tbody + display:flex rows/cells with absolute translateY positioning (robust vs. absolute <tr> in default table layout)"
    - "One per-column width class map applied to BOTH the <thead> <th> and the row <td> so column boundaries stay in lockstep (border-box widths align regardless of inner padding)"

key-files:
  created:
    - src/components/shared/virtualized-table-row.ts
  modified:
    - src/components/properties/property-table-types.ts
    - src/components/properties/property-table.tsx
    - src/components/properties/property-table-row.tsx
    - src/components/tenants/tenant-table-helpers.tsx
    - src/components/tenants/tenant-table.tsx
    - src/components/tenants/tenant-table-row.tsx

key-decisions:
  - "PROP-03: used the canonical TanStack grid+flex pattern (display:grid on table/thead/tbody, display:flex rows/cells) rather than absolute <tr> in a default-layout table, which the plan flagged as browser-unreliable"
  - "Factored a shared getVirtualRowStyle + VIRTUAL_ROW_CLASS helper so both tables share one positioning source of truth and move together; column-width maps stay per-table (different column sets) but each is applied to both thead and rows"
  - "Column-width alignment is driven by border-box widths on th/td (Tailwind preflight); inner cell padding can differ without breaking column boundaries, so alignment holds even where content padding varies"

patterns-established:
  - "For a virtualized <table>, alignment between the sticky header and absolutely-positioned flex rows comes from applying the SAME per-column width class to both the <th> and the <td>; the header <tr> and every body <tr> are flex w-full so their columns resolve to identical widths"

requirements-completed: [PROP-03]

# Metrics
duration: ~25min
completed: 2026-07-08
---

# Phase 30 Plan 05: Flex-Row Virtualization for Property + Tenant Tables Summary

**Both the property and tenant virtualized tables now position their rows via the canonical TanStack flex-row pattern (grid table/thead/tbody + absolute `translateY(virtualRow.start)` flex rows), so scrolling shows the correct rows at the right positions with columns aligned to the sticky header — driven by a shared row-style helper and per-column width maps applied to both the header cells and the row cells.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-08
- **Tasks:** 2
- **Files created:** 1 (shared helper)
- **Files modified:** 6

## Accomplishments

- **PROP-03 (property table):** rows were never positioned (only `virtualRow.index` was used), so every scrolled row stacked at the top of the tbody. Now `virtualRow` is passed to `PropertyTableRow`, each `<tr>` is `position:absolute` with `transform:translateY(virtualRow.start)`, `height:virtualRow.size`, and `data-index`. The `<table>`/`<thead>`/`<tbody>` use `display:grid` and the rows/cells `display:flex` so absolute positioning is browser-reliable. A `PROPERTY_COLUMN_CLASS` map gives each column one width applied to both the `<th>` and the `<td>`; responsive columns keep `hidden md:flex` / `hidden lg:flex` and conditional columns keep `isColumnVisible` on both header and row.
- **PROP-03 (tenant table):** the identical fix mirrored onto the tenant table (same broken structure) with a `TENANT_COLUMN_CLASS` map for its fixed 7-column + actions set.

## Task Commits

Each task was committed atomically:

1. **Task 1: property table — flex-row virtualization (thead + row aligned)** - `ca2f3db42` (fix)
2. **Task 2: tenant table — same flex-row virtualization (thead + row aligned)** - `e39a34873` (fix)

## Files Created/Modified

- `src/components/shared/virtualized-table-row.ts` **(new)** - `VIRTUAL_ROW_CLASS` (static `absolute left-0 top-0 flex w-full items-center`) + `getVirtualRowStyle(virtualRow)` (dynamic `height` + `translateY`). Shared by both tables so their row virtualization stays in lockstep.
- `src/components/properties/property-table-types.ts` - added `PROPERTY_COLUMN_CLASS` (checkbox / property / address / units / occupancy / status / revenue / actions), the single source of column widths for both header and rows.
- `src/components/properties/property-table.tsx` - `<table className="grid w-full">`, `<thead className="grid ...">` with a `flex w-full` header `<tr>`, each `<th>` uses its `PROPERTY_COLUMN_CLASS`; `<tbody>` kept as the relative spacer (`relative grid`, height inline); passes `virtualRow` into `PropertyTableRow`.
- `src/components/properties/property-table-row.tsx` - `<tr>` positioned via `getVirtualRowStyle` + `VIRTUAL_ROW_CLASS` + `data-index`; each `<td>` uses its `PROPERTY_COLUMN_CLASS`; added `min-w-0` + `truncate` on content columns so flex cells don't blow out their width.
- `src/components/tenants/tenant-table-helpers.tsx` - added `TENANT_COLUMN_CLASS` (checkbox / name / email / phone / property / status / lease / actions).
- `src/components/tenants/tenant-table.tsx` - grid table/thead, `flex w-full` header `<tr>`, each `<th>` uses `TENANT_COLUMN_CLASS`, relative-grid `<tbody>` spacer, passes `virtualRow` into `TenantTableRow`.
- `src/components/tenants/tenant-table-row.tsx` - `<tr>` positioned via the shared helper + `data-index`; each `<td>` uses `TENANT_COLUMN_CLASS`; content columns `truncate`.

## How thead/row column alignment is kept (the crux)

- The header `<tr>` and every body `<tr>` are `display:flex; width:100%`, and both span the same table width (grid table with a single implicit column → thead and tbody are the full table width; the absolute body row's `width:100%` resolves against the relative tbody, which is also the full table width). So both rows are the same total width.
- Each column has exactly ONE width class (`PROPERTY_COLUMN_CLASS` / `TENANT_COLUMN_CLASS`) applied to BOTH its `<th>` and its `<td>`. Fixed columns use `w-*` (`shrink-0`); content columns use `flex-1 min-w-0`. Identical flex/width on header and row cells → identical resolved column widths → aligned boundaries.
- Widths are border-box (Tailwind preflight), so inner cell padding (`px-4`) can differ between an empty header cell and a content row cell without shifting the column boundary.
- Responsive parity: `address` (`hidden md:flex`) and `revenue` (`hidden lg:flex`) toggle identically on header and row; conditional columns are gated by the same `isColumnVisible` on both, so a hidden column drops from header and row together at every breakpoint.

## Shared helper

Yes — a shared `getVirtualRowStyle` + `VIRTUAL_ROW_CLASS` helper was factored (`src/components/shared/virtualized-table-row.ts`) and is imported by both `property-table-row.tsx` and `tenant-table-row.tsx`, so the row positioning stays in lockstep. Column widths remain per-table maps (the two tables have different column sets) but each map is the single source applied to both that table's header and rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - UX correctness] fixed column widths chosen to fit content (widths the old table auto-sized)**
- **Found during:** Tasks 1 & 2
- **Issue:** the old default-table-layout columns auto-sized to content, so the plan's descriptive widths (e.g. tenant checkbox `w-10`, actions `w-20`) no longer constrain anything. Under flex those exact widths would clip the checkbox (`w-10` − `px-4` = 8px for a 16px box) and the action buttons (2×32px + gap > `w-20`).
- **Fix:** picked fitting fixed widths — checkbox `w-12`, tenant actions `w-28`, property actions `w-36`, occupancy `w-44`, etc. — applied identically to header and rows so alignment is unaffected; added `min-w-0`/`truncate` on content columns.
- **Files modified:** `property-table-types.ts`, `tenant-table-helpers.tsx`, both row files.
- **Commits:** `ca2f3db42`, `e39a34873`

Not touched (per plan): `dashboard/components/lease-status-badge.tsx` and the lease-status badge itself (unchanged in the tenant row). No data-flow, sorting, selection, column-visibility, pagination, or action-button behavior changed — layout/positioning only.

## Issues Encountered

None blocking. Biome flagged import/JSX line-wrap formatting on the new files; auto-fixed via `biome check --write`. `bun run typecheck` green; `bun run lint` clean; `bun run test:unit` 102214/102214 passing (no unit tests reference these table components, so none needed updating). Manual scroll verification is covered by phase verification plan 30-06.

## Self-Check: PASSED

- `ca2f3db42` and `e39a34873` present in git log.
- `src/components/shared/virtualized-table-row.ts` present on disk; all 6 modified files present.
- `property-table-row.tsx` and `tenant-table-row.tsx` both contain `translateY` (via `getVirtualRowStyle`), `position: absolute` (via `VIRTUAL_ROW_CLASS`), height from `virtualRow.size`, and `data-index`; typecheck + lint green.

## Next Phase Readiness

- Both virtualized tables position rows correctly with header-aligned columns across visibility + responsive states. Ready for the 30-06 manual scroll verification. No blockers.

---
*Phase: 30-analytics-data*
*Completed: 2026-07-08*
