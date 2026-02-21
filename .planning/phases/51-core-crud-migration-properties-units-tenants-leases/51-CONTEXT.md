# Phase 51: Core CRUD Migration — Properties, Units, Tenants, Leases - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove NestJS as the middleman for four core domain hooks — properties, units, tenants, leases — by migrating them to direct Supabase PostgREST calls. RLS is already in place for all four tables. This phase covers the hook migration and backend module deletion only; tenant invitation email and other external-service calls are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Migration approach
- Migrate domain-by-domain (not all at once): Properties → Units → Tenants → Leases
- Each domain gets its own git commit on completion (e.g., `feat(properties): migrate to PostgREST`)
- If a migration breaks something mid-way: fix forward in the same branch — do not revert
- NestJS controller/service/module files for each domain are deleted immediately after that domain's hook is migrated (no dead code left behind)

### Error handling
- Use `PostgrestError` natively — no adapter layer mapping to NestJS-style HTTP exceptions
- User-facing errors: context-specific toast messages (e.g., "Failed to create property")
- Sentry captures the full `PostgrestError` for debugging (Sentry is already wired in)
- Create a shared `handlePostgrestError(error, domain)` utility used by all four hooks — single place for toast + Sentry logging, consistent across domains

### Hook compatibility
- Return raw DB types (DB is the source of truth) — consuming components update to align with DB column names/shapes
- If snake_case DB columns break components that expected camelCase, the components update — not an adapter layer
- Pagination/filtering aligns with PostgREST natively: use `.range()`, `.filter()`, `.order()` — components may need to update their hook call signatures accordingly
- Backend-only Zod DTOs and shared validation schemas that are exclusively used by the NestJS backend are deleted alongside the modules

### RLS verification
- Verification approach: automated integration tests (not manual browser testing)
- Tests run against the production Supabase DB using existing dedicated test owner accounts (credentials from env vars)
- RLS tests live in a new `apps/integration-tests/` app (long-term home for Supabase integration tests, since `apps/backend` will eventually be deleted)
- Tests authenticate as two separate owners and assert each cannot read the other's properties, units, tenants, or leases via PostgREST

### Claude's Discretion
- Design of the `apps/integration-tests/` app structure (package.json, test runner config, folder layout)
- Exact Sentry capture call within the shared error handler
- Specific PostgREST query patterns for filtering/ordering within each hook

</decisions>

<specifics>
## Specific Ideas

- The shared error handler should be a simple utility in `apps/frontend/src/hooks/` or `apps/frontend/src/lib/` — not a class, just a function
- The `apps/integration-tests/` app should be a Jest/Node setup (not Playwright) since it's testing the Supabase client layer directly, not browser UI

</specifics>

<deferred>
## Deferred Ideas

- Monorepo restructuring (removing `apps/backend` directory, simplifying to frontend-only monorepo) — architectural decision for a later phase after all NestJS modules are deleted
- Whether to keep `packages/shared` or inline types into the frontend as the monorepo simplifies — future phase

</deferred>

---

*Phase: 51-core-crud-migration-properties-units-tenants-leases*
*Context gathered: 2026-02-21*
