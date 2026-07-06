---
phase: 26-lease-domain-correctness
plan: 08
subsystem: ui
tags: [leases, pagination, postgrest-count, client-search, stat-cards]

# Dependency graph
requires:
  - phase: 26-lease-domain-correctness
    provides: "plan 26-01 expanded the list embed so client-side tenant/property name search reads real names; this plan loads the full set so that search works across all leases"
provides:
  - "leases list fetches up to a documented 1000-row cap in one page, making leases 51+ reachable via the existing client pagination"
  - "Total Leases stat reads the true PostgREST count (leasesResponse.total), not the current-page length"
affects: [leases list page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Load-all-then-client-search/sort/paginate with a documented fetch cap, total sourced from count: 'exact'"

key-files:
  created: []
  modified:
    - src/app/(owner)/leases/page.tsx

key-decisions:
  - "Raised the fetch bound to LEASES_FETCH_CAP=1000 (.range(0, 999)) instead of limit:50 — kept client-side search/sort/pagination rather than moving to per-page server fetch (which would break name search for multi-page owners, LEASE-01)"
  - "Total Leases now reads leasesResponse.total (PostgREST count), accurate even when the window is capped"
  - ">1000-lease case documented as a known limit requiring a future server-side search RPC — NO get_lease_stats migration, NO pendingLeases stat; Pending stays client-derived"

requirements-completed: [LEASE-06]

# Metrics
duration: ~15min
completed: 2026-07-05
---

# Phase 26 Plan 08: LEASE-06 Leases List Reachability + True Total

**All realistic leases are now reachable via the existing page control (the fetch loads up to 1000 rows in one page instead of only 50), and the "Total Leases" stat equals the true PostgREST count of non-inactive leases instead of the current 50-row page length — while client-side name search, sort, pagination, and the active->expiring recategorization are unchanged.**

## Accomplishments

- Added module-level `const LEASES_FETCH_CAP = 1000;` with a comment documenting the >1000-lease scalability limit (future server-side search RPC).
- `useLeaseList({ limit: 50, offset: 0 })` → `useLeaseList({ limit: LEASES_FETCH_CAP, offset: 0 })`, so `leaseQueries.list` issues `.range(0, 999)` and loads the full realistic set.
- `const totalLeases = leases.length` → `const totalLeases = leasesResponse?.total ?? leases.length` (PostgREST `count: "exact"`).

## Task Commits

1. **Task 1: Raise the fetch bound and source Total from the PostgREST count** — `f8dd6fa14` (fix)

## Reachability proof (mechanism)

- `leaseQueries.list` selects with `{ count: "exact" }` and `.range(offset, offset + limit - 1)`; `total` is the full matching-row count regardless of the window, so `leasesResponse.total` is correct even at the cap.
- Client pipeline unchanged: `transformLease` map (retains the active→expiring recategorization that keeps Active/Expiring mutually exclusive) → `filteredLeases` (tenant/property name search) → `sortedLeases` → `totalPages = ceil(sortedLeases.length / itemsPerPage)` → `paginatedLeases = slice(...)`. With the full set loaded, `paginatedLeases` for page ≥ 2 now returns leases beyond the first 50 (lease 51 reachable), whereas before only 50 rows existed to page over.
- Phase-25 soft-delete filter `.neq("lease_status", "inactive")` in the list query is untouched.

## What was intentionally NOT changed

- No switch to per-page server fetch; search/sort stay client-side (LEASE-01 name search not regressed).
- No `get_lease_stats` migration, no `pendingLeases` DB stat, no `lease-keys.ts` / `core.ts` change. Active/Expiring/Pending stay client-derived over the loaded set; only the Total card's data source changed.

## Quality gates

- `bun run typecheck` — clean.
- `bun run lint` (biome) — clean.
- grep confirms `LEASES_FETCH_CAP` + `leasesResponse?.total` present; no `totalLeases = leases.length`.
- No `LeasesPage` component test exists to update (the `totalLeases` matches in other test files are unrelated stats/hook tests).

## Documented limit

Owners with more than 1000 leases would have rows beyond the cap unreachable and would need a future dedicated search RPC (server-side search + pagination). Called out via the `LEASES_FETCH_CAP` comment; realistic owner lease volumes are far below 1000.

## Self-Check: PASSED
- Fetch cap raised to 1000; Total reads `leasesResponse.total`; no `leases.length` total.
- Client search/sort/pagination + active→expiring recategorization retained; soft-delete filter untouched.

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-05*
