# Phase 17: Hooks Consolidation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deduplicate and modernize 85 hook files for TanStack Query v5 patterns. Expand useSuspenseQuery to all components inside Suspense boundaries. Split all oversized hook files under the 300-line limit. Preserve ownerDashboardKeys cross-domain invalidation graph (8 files, 22 call sites) intact and correct.

</domain>

<decisions>
## Implementation Decisions

### Splitting oversized files
- 7 files currently exceed 300 lines: report-keys.ts (503), property-keys.ts (450), tenant-keys.ts (400), financial-keys.ts (389), use-data-table.ts (316), lease-keys.ts (316), use-tenant-mutations.ts (312)
- Claude decides the split strategy per file based on logical groupings within each file
- Files barely over 300 lines may be brought under via minor refactoring rather than splitting
- No strict enforcement threshold -- Claude evaluates each file independently

### useSuspenseQuery expansion
- All components currently inside Suspense boundaries must be converted from useQuery to useSuspenseQuery
- Currently only use-dashboard-hooks.ts uses useSuspenseQuery; 20+ Suspense boundaries exist across pages
- Also add Suspense boundaries where obviously beneficial (e.g., detail pages without them) -- not limited to existing boundaries
- After conversion, data types become non-optional (never undefined), simplifying consuming components

### Hook overlap handling
- Claude decides per case whether overlapping hooks should be merged or kept separate
- Shared query logic should be extracted into query-keys factories where it makes deduplication cleaner
- Owner vs tenant domain separation is generally intentional -- don't blindly merge across domains
- Confirmed dead hooks (zero imports in src/ and tests/) should be deleted entirely

### Claude's Discretion
- Exact split points for each oversized file
- Which Suspense boundaries to add (beyond existing ones)
- How to restructure overlapping hooks (merge, extract shared logic, or keep separate)
- Whether to consolidate small related hook files that could logically be one file
- Query key factory internal organization

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/api/query-keys/` -- 13 query key factory files using queryOptions() pattern
- `use-dashboard-hooks.ts` -- existing useSuspenseQuery pattern to follow as reference
- `use-tenant-portal-keys.ts` -- shared resolveTenantId() pattern for tenant hooks
- `src/components/deferred-section.tsx` -- DeferredSection component wraps Suspense + Activity API

### Established Patterns
- Query keys use `queryOptions()` factories (never string literal arrays)
- Mutations use `useMutation` + `useQueryClient` with domain key invalidation
- All mutations invalidate `ownerDashboardKeys.all` in addition to their own domain keys
- No module-level Supabase client -- `createClient()` inside each function
- Flat domain naming: `use-tenant-payments.ts` (not `use-tenant-portal-payments.ts`)

### Integration Points
- ownerDashboardKeys referenced in 13 files (8 hooks + 5 components) -- high-risk during restructuring
- tenantPortalKeys referenced in 6 files with circular dep prevention
- 20+ pages use `<Suspense>` boundaries -- all are conversion targets for useSuspenseQuery
- Test files (blog-keys.test.ts 451 lines, auth-keys.test.ts) may need updates after hook changes

</code_context>

<specifics>
## Specific Ideas

- User trusts Claude's judgment on all technical decisions for this phase
- TanStack Form is the standard, not react-hook-form (noted from prior session -- migration is future work, not this phase)
- "Knip is not reliable enough to put any amount of blind trust into" -- verify dead hooks via grep before deleting

</specifics>

<deferred>
## Deferred Ideas

- react-hook-form to TanStack Form migration (17 files) -- future milestone
- mutationOptions() factories -- explicitly Out of Scope for v1.2

</deferred>

---

*Phase: 17-hooks-consolidation*
*Context gathered: 2026-03-08*
