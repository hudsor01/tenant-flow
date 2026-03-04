# Phase 62: Code Quality + Performance - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate accumulated code quality debt (duplicate hooks, error handling noise, dead stubs) and resolve performance bottlenecks (auth fan-out, N+1 queries, serial lookups, unbounded exports). No new features — this is internal cleanup and consolidation for production-grade reliability.

</domain>

<decisions>
## Implementation Decisions

### Error handling cleanup
- Single error wrapper pattern: ONE place handles all mutation error toasts — individual hooks never show toasts themselves
- This prevents double-toast by design (structural fix, not dedup hack)
- All 20+ mutation hooks must be audited and updated to remove local toast calls
- Error toasts appear exactly once per error, no exceptions

### Hook consolidation
- Claude decides how to merge duplicate payment method hooks — naming, which survives, import migration
- End result: one canonical hook, zero duplicates, all consumers updated

### Auth caching
- Replace 86 getUser() calls with a useCurrentUser() React hook backed by TanStack Query
- Consistent with existing patterns in the codebase, auto-invalidates on auth state changes
- All React component getUser() calls migrate to the hook; non-React contexts handled case-by-case

### Performance — tenant portal serial lookup
- Batch the 3-step serial tenant portal lookup into a single PostgREST query with relation joins
- No new Postgres RPC needed — use Supabase .select() with embedded relations

### Performance — batch operations & CSV export
- Batch tenant operations refactored to single queries/RPCs (eliminate N+1)
- CSV export queries capped at 10,000 row limit

### TODO stub resolution
- ALL runtime-throw TODO stubs must be replaced with real implementations — globally, across the entire codebase
- This is a production-grade project — no placeholder stubs allowed anywhere
- Not limited to the 4 known stubs — audit the entire codebase and fix every `throw new Error('TODO')` or equivalent

### Claude's Discretion
- Exact error wrapper implementation (HOC, wrapper function, or custom hook pattern)
- Which payment method hook survives the consolidation merge
- How to handle getUser() calls in non-React contexts (if any exist)
- Specific query restructuring for batch operations
- Implementation approach for each TODO stub (varies by what the stub was supposed to do)

</decisions>

<specifics>
## Specific Ideas

- User explicitly stated: "all stubs anywhere everywhere globally in this codebase should be replaced with the real functionality for a production env grade project like this one is" — zero tolerance for TODO throws
- Single error wrapper is a structural solution, not a bandaid — prevents double-toast by making it impossible for hooks to fire their own toasts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 62-code-quality-performance*
*Context gathered: 2026-02-27*
