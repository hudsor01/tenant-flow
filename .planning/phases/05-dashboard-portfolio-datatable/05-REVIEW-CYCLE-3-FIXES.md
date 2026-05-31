# Phase 5 — Perfect-PR Review Cycle 3 Fixes

Branch: `gsd/phase-5-dashboard-portfolio-datatable`. These are the cycle-3
confirmed findings. Each fix is its own atomic commit; the full pre-commit gate
(gitleaks, lockfile, lint, typecheck, unit) ran on every commit. Final state:
`bun run typecheck` + `bun run lint` clean, full unit suite **106,164 tests
passing (183 files)** — up from 106,155 (182 files) at cycle start (+1 file:
the new `deriveColumnFilters` helper test; +9 tests net).

| # | Finding | Fix | Commit |
|---|---------|-----|--------|
| FIX 1 (P1) | Sticky header does not stick — the virtualized table rendered through the ui `<Table>` primitive, which wraps the `<table>` in `<div className="relative w-full overflow-x-auto">`. Per CSS Overflow Module 3, `overflow-x:auto` computes `overflow-y:auto`, so that wrapper becomes a scroll container that captures the sticky `<thead>`'s containing block; the header sticks to the (non-scrolling) wrapper and scrolls out of view (confirmed via live browser repro). | Dropped the ui `<Table>` wrapper for this virtualized table only. Render a plain `<table className="w-full caption-bottom text-sm" style={{ display: "grid" }} role="table">` DIRECTLY inside the `scrollRef` `<div>` (which already has `overflow-auto` + `max-h`), making `scrollRef` the SOLE scroll container so the sticky `<thead>` sticks to it. Kept `<TableHeader>/<TableBody>/<TableRow>/<TableHead>/<TableCell>` (they render thead/tbody/tr/th/td and add NO container). The shared `ui/table.tsx` is UNTOUCHED (other tables rely on its `overflow-x-auto`). All styles/roles/aria-sort/`getSize` widths/virtualization/`measureElement`/mobile-forced-grid/empty-states/default-sort preserved. | `5a33bfa63` |
| FIX 2 (P2) | Virtualization drops `aria-rowcount` / `aria-rowindex` — the table is DOM-virtualized with explicit `role=table/row`, so a screen reader sees only the rendered window and loses the true row total and position. | Added the standard virtualized-grid ARIA: `aria-rowcount={pageRows.length + 1}` on the `<table>` (counts ALL rows incl. the header), `aria-rowindex={1}` on the header `<TableRow>`, and `aria-rowindex={virtualRow.index + 2}` on each virtualized body `<TableRow>` (1-based: header is 1, first body row is 2). Added a test asserting `aria-rowcount` on the table and `aria-rowindex` on the header + rendered body rows. | `fb2dc36b5` |
| FIX 3 (P2) | D-10 inline portfolio transform (`dashboard.tsx:102-117`, `PropertyPerformance` → `PortfolioRow`: `leaseStatus` from `occupancyRate` boundaries, `tenant` from occupancy) was untested. | Added grid-mode render assertions to `dashboard-portfolio-swap.test.tsx` (grid exposes the full derived row). A property at `occupancyRate 85` with partial occupancy (5 of 6) asserts its `leaseStatus` chip renders **"Expiring"** — pinning the `>=80 && <100` boundary — and its tenant cell renders **"5 tenants"**. A zero-occupancy property asserts the **"Vacant"** chip and the **"--"** no-tenant placeholder (tenant `null`). Pins the actual boundary logic in `dashboard.tsx`. | `c2335a93f` |
| FIX 4 (P3) | Empty-string URL filter persists — an empty-string search (`?property=`) yielded a persistent mirror filter that TanStack auto-removes from its own state, so the mirror falsely read as an active filter. | In `deriveColumnFilters` (`use-client-data-table.helpers.ts`), skip keys whose value is `null`, an empty string, or an empty array, so an empty search is treated as no-filter. Added a `deriveColumnFilters` unit test covering empty-string, empty-array, null, faceted-scalar/array, and mixed empty/non-empty cases. | `ac1dbcce4` |

## Source files changed
- `src/components/dashboard/components/portfolio-data-table.tsx` — FIX 1 (plain `<table>` directly inside `scrollRef`, dropped `Table` import) + FIX 2 (`aria-rowcount`/`aria-rowindex`).
- `src/hooks/use-client-data-table.helpers.ts` — FIX 4 (`deriveColumnFilters` skips empty values).

## Test files changed
- `src/components/dashboard/components/__tests__/portfolio-data-table.test.tsx` — FIX 2 ARIA test (19 tests total).
- `src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx` — FIX 3 D-10 transform test (8 tests total).
- `src/hooks/__tests__/use-client-data-table.helpers.test.ts` — NEW: 7 `deriveColumnFilters` tests including the empty-value cases.

## Deferred — ACCEPTED, no change

**P3 header-dropdown keyboard** (Enter/Space sorts; the header menu opens via
ArrowDown, and column-hide is reachable via the toolbar `DataTableViewOptions`):
**ACCEPTED**. No capability is lost — success criterion 1 (keyboard sort via
Enter/Space on the focused header trigger) is met, and column-hide is fully
keyboard-reachable through the toolbar's `DataTableViewOptions`
(`role="combobox"`, "Toggle columns"). The dropdown *Hide* is a redundant
secondary affordance, not the only path. No fix applied.

**P3 two-synchronous-different-column-writes**: **ACCEPTED as latent/unreachable**.
The two writes originate from separate user events / renders (distinct keystrokes
or filter interactions), never within a single synchronous tick, so the race is
not reachable through the UI. No fix applied.

## Notes
- The virtualized-table dynamic inline styles (`display: grid`/`flex`,
  `width: getSize()`, `translateY`, `getTotalSize()` height, sticky `top`) are
  the sanctioned react-virtual set and remain in place.
- `subject-case` commitlint rule forced lowercase commit subjects, so the
  finding identifiers appear as a trailing `(fix-N)` tag rather than an
  uppercase `CR-FIX-N` prefix.
