# Phase 26: Database Stabilization - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix production bugs and add missing constraints on the `tenant_invitations` table. No UI changes, no new features -- pure data integrity and schema correctness.

Requirements: DB-01, DB-02, DB-03, DB-04

</domain>

<decisions>
## Implementation Decisions

### Duplicate Cleanup (DB-03 prerequisite)
- **D-01:** Auto-cancel older duplicate active invitations before adding the unique index. For each `(email, owner_user_id)` with multiple `pending`/`sent` rows, keep the newest and cancel the rest.
- **D-02:** Log cancelled invitation IDs via `RAISE NOTICE` in the migration output. No audit table or schema changes needed.

### Migration Structure
- **D-03:** All 4 fixes (DB-01 through DB-04) go in a single atomic migration file. They are tightly coupled (e.g., backfill must happen before unique index) and belong together.

### RLS Policy Audit (DB-02)
- **D-04:** Query live DB (`pg_policies`) during research to determine current RLS policy state. Migration should only fix what's actually wrong -- no defensive DROP+CREATE of policies that are already correct.

### Expiry Default (DB-04)
- **D-05:** Only `expires_at` gets a server-side DB default (`NOW() + INTERVAL '7 days'`). `invitation_code` and `invitation_url` remain client-generated (Phase 27's unified hook will own those).
- **D-06:** Remove client-side `expires_at` calculation from all 3 existing code paths in this phase (`invite-tenant-form.tsx`, `onboarding-step-tenant.tsx`, `tenant-invite-mutation-options.ts`). Do not defer to Phase 27 -- prevents the DB default from being silently overridden.

### CHECK Constraint Fix (DB-01)
- **D-07:** Backfill any rows with `type = 'portal_access'` to `'platform_access'` in the migration before any constraint changes. Fix the hardcoded string in `invite-tenant-form.tsx:78` from `'portal_access'` to `'platform_access'`.

### Claude's Discretion
- Migration ordering within the single file (backfill -> RLS fixes -> unique index -> default) -- Claude determines optimal ordering
- Whether to wrap migration in a transaction explicitly or rely on Supabase migration runner

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Research
- `.planning/REQUIREMENTS.md` -- DB-01 through DB-04 requirement definitions
- `.planning/research/FEATURES.md` -- Invitation code path analysis, `portal_access` bug documentation
- `.planning/research/ARCHITECTURE.md` -- 4 invitation paths identified, column drift analysis
- `.planning/research/PITFALLS.md` -- CHECK constraint violation details (line 13+)
- `.planning/research/SUMMARY.md` -- Research synthesis with prioritized action items

### Existing Code (to be modified)
- `src/components/tenants/invite-tenant-form.tsx` -- `portal_access` typo on line 78, client-side `expires_at` on line 65
- `src/components/onboarding/onboarding-step-tenant.tsx` -- client-side `expires_at` on line 47
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` -- client-side `expires_at` on line 88

### Schema Reference
- `src/types/supabase.ts` -- Generated types; confirms `owner_user_id` is the current column name (lines 1840-1926)
- `supabase/migrations/20251101000000_base_schema.sql` -- Original table definition (line 1714+); note `property_owner_id` in dump is stale

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tenant-invite-mutation-options.ts` -- Already has `invite()`, `resend()`, `cancel()` mutation factories; the invite path uses `owner_user_id` correctly
- `tenant-invitation-keys.ts` -- Query key factory for invitation list and validation queries
- `handlePostgrestError()` from `#lib/postgrest-error-handler` -- Standard error handling for all PostgREST operations

### Established Patterns
- Migrations live in `supabase/migrations/YYYYMMDDHHmmss_description.sql`
- RLS uses `get_current_owner_user_id()` helper function (not `get_current_property_owner_id()` which is the old pattern)
- CHECK constraints use text arrays, not PostgreSQL ENUMs (per project convention)
- `owner_user_id` references `users.id` directly (not `property_owners.id`)

### Integration Points
- The `invite-tenant-form.tsx` code path is currently broken in production due to the CHECK constraint violation
- Generated types (`supabase.ts`) already expect `owner_user_id` -- no type regeneration needed for column rename
- 3 code files need `expires_at` removal after DB default is added

### Key Finding
- The generated types show `owner_user_id` (not `property_owner_id`), meaning the column rename already happened in a prior migration. The stale `public.sql` dump still shows the old name. RLS policies need live verification to confirm they reference the correct column.

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- standard database migration patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 26-database-stabilization*
*Context gathered: 2026-03-30*
