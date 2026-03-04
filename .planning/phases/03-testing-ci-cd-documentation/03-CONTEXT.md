# Phase 63: Testing, CI/CD + Documentation - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the testing and deployment pipeline — RLS write-path isolation tests gate PRs, E2E tests run pre-commit, stale NestJS test intercepts are cleaned up, and CLAUDE.md reflects the current Supabase-only architecture with PostgREST/Edge Function patterns documented.

</domain>

<decisions>
## Implementation Decisions

### RLS test scope & strategy
- Test INSERT, UPDATE, AND DELETE for all 7 domains: properties, units, tenants, leases, maintenance, vendors, inspections
- Cross-tenant isolation: verify that owner A cannot write/modify/delete owner B's data
- Run against the existing Supabase project (already has test users configured, existing RLS SELECT tests pass there)
- No dedicated integration project needed — use what's already working

### CI/CD pipeline design
- RLS tests GATE PR merges — a failing RLS test blocks the merge (non-negotiable for cross-tenant data safety)
- E2E tests run PRE-COMMIT, NOT in CI — this is the user's explicit preference
- Stale NestJS test intercepts must be removed from E2E tests and rewritten for PostgREST architecture
- All required environment variables must be resolved for E2E to run successfully in pre-commit

### CLAUDE.md modernization
- Strip ALL NestJS/Railway/backend references completely — no migration notes, no legacy context
- Clean slate: CLAUDE.md should read as if NestJS never existed
- Document the RLS-only security model as the canonical approach
- Add PostgREST query patterns and Edge Function patterns

### Claude's Discretion
- Level of detail for PostgREST/Edge Function code examples in CLAUDE.md (user said "you decide")
- Which specific E2E intercepts need rewriting (depends on codebase audit)
- How to structure the CI pipeline YAML for RLS test gating
- Whether to add additional CI checks beyond RLS (typecheck, lint already run pre-commit)

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants E2E in pre-commit hook, NOT CI — this is a deliberate choice to keep CI lean and catch issues before they're pushed
- RLS tests must be comprehensive (all 3 write operations x 7 domains) — no shortcuts on data isolation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 63-testing-ci-cd-documentation*
*Context gathered: 2026-02-27*
