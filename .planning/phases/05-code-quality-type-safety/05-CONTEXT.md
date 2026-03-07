# Phase 5: Code Quality & Type Safety - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove type escape hatches (`as unknown as`, fake table casts), fix query keys, consolidate duplicate types, split oversized files, implement real report hooks, audit `'use client'` directives, and clean up dead code. Codebase should have zero stubs, zero type assertions, and consistent patterns throughout.

</domain>

<decisions>
## Implementation Decisions

### Stub hooks — zero tolerance
- All 8 stubs in `use-reports.ts` must be replaced with real implementations backed by real Postgres RPCs
- The `from('reports' as 'properties')` fake table cast must be eliminated — real queries against real tables/RPCs
- If RPCs don't exist yet, create them. If the data model needs adjustment, adjust it.
- Tests must mirror real production behavior, not stub returns
- This applies globally: if any other stub hooks are discovered during implementation, they get the same treatment

### File splitting — real rewrites with flat domain naming
- `tour.tsx` (1,732 lines): Verify against upstream Dice UI repository (branches from shadcn/ui). Ensure code matches official source. If updates needed, elevate code quality to align with official documentation.
- `use-tenant-portal.ts` (1,431 lines): Split into flat domain files — `use-tenant-payments.ts`, `use-tenant-maintenance.ts`, `use-tenant-lease.ts`, etc. No "portal" in filenames. Review real vs stub code first, rewrite to align with React/Next.js architecture best practices.
- `use-reports.ts` (923 lines): Full rewrite with real RPCs (see stubs decision above)
- `stripe-webhooks/index.ts` (809 lines): Split into handler modules by event type
- All other oversized hook files (use-tenant.ts 838, use-lease.ts 660, use-payments.ts 586, use-financials.ts 565, use-owner-dashboard.ts 562, use-billing.ts 546, use-inspections.ts 482): Analyze real vs stub code, split where domain boundaries exist
- Oversized page components (dashboard 373, properties 393, tenants 378, reports/generate 400): Refactor to extract subcomponents
- Naming convention: flat domain names (`use-tenant-payments.ts`), not prefixed (`use-tenant-portal-payments.ts`)

### Query key consolidation — align with TanStack Query v5 official guidance
- **Research required**: Deep investigation of TanStack Query v5 official documentation, best practices, and GitHub repo examples before making any changes
- Goal: align the entire codebase query key strategy with official TanStack guidance — not just "pick a pattern", but match exactly what the docs recommend
- Current state: 3 patterns coexist (dedicated factory files in `query-keys/`, inline factory objects, raw string literals) — consolidation approach determined by research findings
- All raw string literal query keys (`['blogs']`, `['blog', slug]`, `['auth']`) must be replaced regardless of pattern chosen
- Research should also cover other TanStack Query usage patterns (staleTime, gcTime, queryFn patterns, mutation patterns) to identify any other misalignment

### `'use client'` full audit — align with Next.js 16 official guidance
- **Research required**: Read and learn the updated Next.js 16 official documentation on `'use client'`, `'use server'`, Server Components, and all related directives/conventions
- Next.js 16 has updated how directives work — research the latest patterns before auditing
- Full audit of all 494 `'use client'` files (not just the 63 page files)
- Push directive down to leaf components where the framework guidance supports it
- Remove directive entirely from files that don't need it per Next.js 16 conventions
- Goal: explicitly align with how Next.js 16 guides successful projects

### Claude's Discretion
- Specific RPC function signatures for report data (determined during research/planning based on existing schema)
- Exact split boundaries within oversized files (based on domain analysis)
- Whether to consolidate query key factories into `query-keys/` folder or keep co-located (determined by TanStack research findings)
- Order of operations for the refactoring (dependencies between tasks)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/api/query-keys/` — 7 existing factory files (dashboard-graphql, inspection, lease, maintenance, property, tenant, unit) — pattern to extend
- `src/shared/types/` — canonical type definitions with TYPES.md lookup (must check before creating any new types)
- `src/shared/types/supabase.ts` — generated DB types (source of truth for table/column shapes)
- `supabase/functions/_shared/` — shared Edge Function utilities established in Phase 4

### Established Patterns
- TanStack Query for all server state — hooks in `src/hooks/api/`
- Zustand for UI state only
- TanStack Form for forms
- `handlePostgrestError` for error handling in queries/mutations
- `ownerDashboardKeys.all` must be invalidated when entity mutations succeed

### Integration Points
- Report pages (`src/app/(owner)/reports/`) consume `use-reports.ts` hooks — rewrite must maintain same public API or update consumers
- Tenant portal pages consume `use-tenant-portal.ts` — split files must update all import paths
- `stripe-webhooks/index.ts` split must maintain single `Deno.serve` entry point with handler routing

### Current Issues (from scout)
- 48 `as unknown as` casts across 15 files — mostly RPC return type mismatches
- 2 fake table casts in use-reports.ts (`reports` table doesn't exist)
- 10 eslint-disable exhaustive-deps suppressions (8 in use-owner-dashboard.ts, 2 in tour.tsx)
- Duplicate `GeneralSettings` component (shared + orphaned app-level copy)
- `@radix-ui/react-icons` package used for 1 icon (ArrowRightIcon in bento-grid.tsx)
- `SseProvider` placeholder in provider tree with TODO(phase-57)
- 9 `TODO(phase-57)` references to clean up
- 30+ local type definitions in hooks that may duplicate shared types

</code_context>

<specifics>
## Specific Ideas

- "This project should absolutely have 0 stub implementations of anything" — zero tolerance for fake data or placeholder hooks
- Tour component must be verified against upstream Dice UI / shadcn repository — not just split, but validated against source
- TanStack Query alignment must come from official v5 documentation research, not Claude's assumptions about patterns
- Next.js 16 directive audit must be informed by current official docs, not older patterns — the platform has changed recently
- "Clean and premium high code quality" — the bar is explicit alignment with official framework documentation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-code-quality-type-safety*
*Context gathered: 2026-03-05*
