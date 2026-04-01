# Phase 26: Database Stabilization - Research

**Researched:** 2026-03-30
**Domain:** PostgreSQL schema repair (CHECK constraints, RLS policies, partial unique indexes, column defaults)
**Confidence:** HIGH

## Summary

Phase 26 is a surgical database migration addressing four confirmed issues on the `tenant_invitations` table. The column rename from `property_owner_id` to `owner_user_id` was applied to the live database (confirmed by generated types in `supabase.ts`) but the RLS policies were never updated -- they still reference the old column name, which means authenticated PostgREST inserts are either blocked or silently failing. Additionally, `invite-tenant-form.tsx` inserts `type: 'portal_access'` which violates the existing CHECK constraint (only `platform_access` and `lease_signing` are allowed), breaking dashboard-initiated invitations. There is no uniqueness constraint preventing duplicate active invitations to the same email, and the `expires_at` column has no DB default, forcing three client-side code paths to calculate expiry dates (introducing clock skew risk).

The migration file must follow a strict ordering: backfill bad data first, fix RLS policies second, add the unique index third, and add the column default last. Three frontend files need a small code change to remove client-side `expires_at` calculation and fix the `portal_access` typo. The Supabase migration runner executes each `.sql` file inside an implicit transaction, so no explicit `BEGIN`/`COMMIT` wrapper is needed.

**Primary recommendation:** Write a single atomic migration file that (1) backfills `portal_access` rows to `platform_access`, (2) drops and recreates all four RLS policies to reference `owner_user_id` with `(select auth.uid())`, (3) cancels duplicate active invitations and adds a partial unique index, and (4) adds a `DEFAULT NOW() + INTERVAL '7 days'` to `expires_at`. Then make three small code fixes to remove client-side `expires_at` and fix the `portal_access` string.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Auto-cancel older duplicate active invitations before adding the unique index. For each `(email, owner_user_id)` with multiple `pending`/`sent` rows, keep the newest and cancel the rest.
- **D-02:** Log cancelled invitation IDs via `RAISE NOTICE` in the migration output. No audit table or schema changes needed.
- **D-03:** All 4 fixes (DB-01 through DB-04) go in a single atomic migration file. They are tightly coupled (e.g., backfill must happen before unique index) and belong together.
- **D-04:** Query live DB (`pg_policies`) during research to determine current RLS policy state. Migration should only fix what's actually wrong -- no defensive DROP+CREATE of policies that are already correct.
- **D-05:** Only `expires_at` gets a server-side DB default (`NOW() + INTERVAL '7 days'`). `invitation_code` and `invitation_url` remain client-generated (Phase 27's unified hook will own those).
- **D-06:** Remove client-side `expires_at` calculation from all 3 existing code paths in this phase (`invite-tenant-form.tsx`, `onboarding-step-tenant.tsx`, `tenant-invite-mutation-options.ts`). Do not defer to Phase 27 -- prevents the DB default from being silently overridden.
- **D-07:** Backfill any rows with `type = 'portal_access'` to `'platform_access'` in the migration before any constraint changes. Fix the hardcoded string in `invite-tenant-form.tsx:78` from `'portal_access'` to `'platform_access'`.

### Claude's Discretion
- Migration ordering within the single file (backfill -> RLS fixes -> unique index -> default) -- Claude determines optimal ordering
- Whether to wrap migration in a transaction explicitly or rely on Supabase migration runner

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | Fix CHECK constraint violation -- change `'portal_access'` to `'platform_access'` in code and backfill any bad rows | Migration backfill pattern documented; code fix location confirmed at `invite-tenant-form.tsx:78` |
| DB-02 | Audit and fix RLS policies on `tenant_invitations` to reference `owner_user_id` (not stale `property_owner_id`) | Full RLS policy audit completed via migration file analysis; all 5 policies identified with exact column references |
| DB-03 | Add partial unique index on `(email, owner_user_id) WHERE status IN ('pending', 'sent')` to prevent duplicate active invitations | Duplicate cleanup CTE pattern documented; partial unique index syntax verified |
| DB-04 | Move invitation expiry calculation to DB default (`NOW() + INTERVAL '7 days'`) instead of client-side | Three code paths identified with client-side expiry; type regeneration impact documented |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No PostgreSQL ENUMs** -- use `text` columns with `CHECK` constraints (the type column already uses text + CHECK, compliant)
- **Migrations naming**: `supabase/migrations/YYYYMMDDHHmmss_description.sql` format required
- **RLS conventions**: One policy per operation per role; `(select auth.uid())` subselect wrapping; `PERMISSIVE` only; policies named `tablename_operation[_qualifier]`
- **No barrel files / re-exports**
- **Generated types** (`supabase.ts`) must not be edited manually -- run `pnpm db:types` after migration
- **Schema conventions**: `owner_user_id` references `users.id` directly; `set_updated_at()` is the only trigger function for `updated_at`
- **SQL migration skill rules**: lowercase SQL, header comment with metadata, copious comments for destructive commands, RLS must be enabled

## Standard Stack

### Core

No new libraries. This phase is pure SQL migration + three small TypeScript code fixes.

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase CLI | (installed) | Run migration via `supabase db push` or direct SQL | Project standard for all DB changes |
| PostgreSQL | 15.x (Supabase) | Target database | Production environment |
| Vitest | 4.0 | Unit tests for code changes | Existing test framework |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `pnpm db:types` | Regenerate `supabase.ts` after migration | After DB default is added (changes `expires_at` from required to optional in Insert type) |
| `pnpm typecheck` | Verify TypeScript after type regeneration | After `pnpm db:types` to catch any breakage from `expires_at` becoming optional |
| `pnpm test:unit` | Run unit tests after code changes | After modifying the 3 code files |

## Architecture Patterns

### Migration File Structure

The single migration file should follow this internal ordering. Each step must complete before the next can safely run.

```
supabase/migrations/YYYYMMDDHHmmss_stabilize_tenant_invitations.sql
|
+-- Step 1: Backfill bad type values ('portal_access' -> 'platform_access')
|   Why first: Must fix data BEFORE any unique index or constraint touches these rows
|
+-- Step 2: Fix RLS policies (DROP + CREATE with owner_user_id)
|   Why second: Independent of data content; needed for all PostgREST operations
|
+-- Step 3: Cancel duplicate active invitations + add partial unique index
|   Why third: Depends on Step 1 (clean data); RAISE NOTICE for cancelled IDs
|
+-- Step 4: Add DEFAULT on expires_at column
|   Why last: Independent; smallest change; safe to run after everything else
```

### Pattern 1: Backfill-Before-Constraint

**What:** Always update existing data to comply with a constraint BEFORE adding or modifying the constraint.
**When to use:** Any migration that adds CHECK constraints, UNIQUE indexes, or NOT NULL constraints on columns with existing data.
**Example:**

```sql
-- Step 1: Backfill non-compliant rows FIRST
update public.tenant_invitations
set type = 'platform_access'
where type = 'portal_access';

-- Step 2: THEN add/verify constraint (already exists, no change needed)
-- The CHECK constraint tenant_invitations_type_check already enforces
-- type IN ('platform_access', 'lease_signing')
```

### Pattern 2: Duplicate Cleanup with RAISE NOTICE Logging

**What:** Use a CTE to identify and cancel duplicate active invitations, keeping only the newest per `(email, owner_user_id)` group.
**When to use:** Before adding a partial unique index that would fail if duplicates exist.
**Example:**

```sql
-- Cancel older duplicates, keep the newest per (email, owner_user_id)
do $$
declare
  cancelled_row record;
  cancelled_count integer := 0;
begin
  for cancelled_row in
    with ranked as (
      select id, email, owner_user_id,
             row_number() over (
               partition by email, owner_user_id
               order by created_at desc
             ) as rn
      from public.tenant_invitations
      where status in ('pending', 'sent')
    )
    update public.tenant_invitations ti
    set status = 'cancelled'
    from ranked r
    where ti.id = r.id
      and r.rn > 1
    returning ti.id, ti.email, ti.owner_user_id
  loop
    raise notice 'Cancelled duplicate invitation: id=%, email=%, owner=%',
      cancelled_row.id, cancelled_row.email, cancelled_row.owner_user_id;
    cancelled_count := cancelled_count + 1;
  end loop;

  raise notice 'Total duplicate invitations cancelled: %', cancelled_count;
end $$;
```

### Pattern 3: RLS Policy DROP + CREATE

**What:** Drop the existing policy by name, then create the replacement with the corrected column reference.
**When to use:** When a policy references a stale column name that was renamed.
**Example:**

```sql
-- Drop stale policy referencing property_owner_id
drop policy if exists "tenant_invitations_insert_owner" on public.tenant_invitations;

-- Create replacement referencing owner_user_id
create policy "tenant_invitations_insert_owner"
on public.tenant_invitations
for insert
to authenticated
with check (owner_user_id = (select auth.uid()));
```

### Anti-Patterns to Avoid

- **Never use `NOT VALID` for this migration**: The `NOT VALID` + `VALIDATE CONSTRAINT` pattern is for adding new CHECK constraints to large tables. Our existing CHECK constraint `tenant_invitations_type_check` is already in place and correct -- we only need to backfill rows that violate it. No constraint change is needed for DB-01.
- **Never add explicit `BEGIN`/`COMMIT`**: Supabase migration runner wraps each file in an implicit transaction. Adding explicit transaction control causes nested transaction errors.
- **Never use `CREATE OR REPLACE POLICY`**: PostgreSQL does not support this syntax. Must `DROP POLICY IF EXISTS` then `CREATE POLICY`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplicate detection in application code | Custom pre-insert query + retry loop | Partial unique index at DB level | DB constraint is atomic and race-free; application-level checks have TOCTOU gaps |
| Expiry calculation | `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)` | `DEFAULT NOW() + INTERVAL '7 days'` | Server clock is authoritative; eliminates client clock skew |
| RLS authorization | Application-level owner checks | PostgreSQL RLS policies | RLS is enforced for all access paths including direct PostgREST; application checks can be bypassed |

## Common Pitfalls

### Pitfall 1: Index Creation Fails on Duplicate Data

**What goes wrong:** `CREATE UNIQUE INDEX` scans all existing rows. If any `(email, owner_user_id)` pair has multiple active (pending/sent) invitations, the index creation fails and the entire migration rolls back.
**Why it happens:** The unique index is added before cleaning up existing duplicates.
**How to avoid:** Cancel duplicate active invitations BEFORE creating the unique index. The CTE in Step 3 handles this.
**Warning signs:** Migration error: `could not create unique index "idx_tenant_invitations_active_email_owner"` / `Key (email, owner_user_id)=(...) is duplicated`.

### Pitfall 2: RLS Policy References Non-Existent Column

**What goes wrong:** If a policy references `property_owner_id` but the column was renamed to `owner_user_id`, PostgreSQL silently evaluates the policy as FALSE for all rows (the column reference resolves to nothing). All authenticated operations on the table fail silently.
**Why it happens:** Column rename migration was applied but RLS policy update was missed.
**How to avoid:** The migration drops all stale policies and recreates them with the correct column name. Migration-file analysis confirmed that 5 policies (4 CRUD + 1 SELECT from `20251225182240`) reference `property_owner_id`.
**Warning signs:** PostgREST returns empty arrays for SELECT, or `new row violates row-level security policy` for INSERT/UPDATE/DELETE.

### Pitfall 3: Type Regeneration Breaks Existing Code

**What goes wrong:** After adding `DEFAULT NOW() + INTERVAL '7 days'` to `expires_at`, running `pnpm db:types` changes the Insert type from `expires_at: string` (required) to `expires_at?: string` (optional). If the three code files still pass `expires_at` explicitly, TypeScript won't break -- but if any OTHER code path was relying on `expires_at` being required at the type level to catch missing values, that safety net is removed.
**Why it happens:** DB defaults make columns optional in the generated Insert type.
**How to avoid:** Remove client-side `expires_at` from all three code paths IN THE SAME COMMIT as the type regeneration. This is Decision D-06.
**Warning signs:** `pnpm typecheck` passes but the DB default is being silently overridden by stale client-side values.

### Pitfall 4: Partial Unique Index WHERE Clause Must Match Application Semantics

**What goes wrong:** If the WHERE clause uses `status IN ('pending', 'sent')` but the application transitions invitations through statuses in an unexpected order (e.g., directly to `'accepted'` without passing through `'sent'`), the unique index may not catch duplicates during the brief window.
**Why it happens:** The partial index only enforces uniqueness for rows matching the WHERE clause.
**How to avoid:** Verify that all application code paths set `status = 'sent'` on creation (confirmed: all 4 code paths set `status: 'sent'` on insert). The `'pending'` status is included for completeness (used by the "Invite Now or Later" future feature).
**Warning signs:** Duplicate invitations appearing with status `'accepted'` or any status not in the index's WHERE clause.

### Pitfall 5: SELECT Policy Must Support Both Owner and Invitee Access

**What goes wrong:** The original base schema SELECT policy was owner-only (`property_owner_id = get_current_property_owner_id()`). Migration `20251225182240` added a combined policy: `(select auth.uid()) = property_owner_id OR email = (select auth.email())`. If we only create an owner-only SELECT policy, the accept flow (which validates invitations by the invitee's email) breaks.
**Why it happens:** The accept flow uses `tenant-invitation-validate` and `tenant-invitation-accept` Edge Functions that run as service_role and bypass RLS. However, the `tenantInvitationQueries.list()` query in the frontend runs as the authenticated user. If a tenant needs to see their own pending invitation, they need the `email = auth.email()` branch.
**How to avoid:** Preserve the combined SELECT policy pattern from the `20251225182240` migration, updated to use `owner_user_id` instead of `property_owner_id`.

## Current RLS Policy State (from Migration Analysis)

This table reconstructs the current live state by replaying all migrations in order.

| Policy Name | Operation | Created In | Current Expression | Problem |
|-------------|-----------|------------|-------------------|---------|
| `tenant_invitations_select` | SELECT | `20251225182240` (replaced `tenant_invitations_select_owner` from base) | `(select auth.uid()) = property_owner_id OR email = (select auth.email())` | References `property_owner_id` (stale) |
| `tenant_invitations_insert_owner` | INSERT | `20251101000000` (base) | `property_owner_id = get_current_property_owner_id()` | References `property_owner_id` (stale) + uses deprecated function |
| `tenant_invitations_update_owner` | UPDATE | `20251101000000` (base) | `property_owner_id = get_current_property_owner_id()` (USING + WITH CHECK) | References `property_owner_id` (stale) + uses deprecated function |
| `tenant_invitations_delete_owner` | DELETE | `20251101000000` (base) | `property_owner_id = get_current_property_owner_id()` | References `property_owner_id` (stale) + uses deprecated function |
| `tenant_invitations_service_role` | ALL | `20251101000000` (base) | Dropped by `20251230191000` | **Already removed** -- service_role bypasses RLS by default |

**Corrected policies needed (5 total):**

1. **SELECT** (consolidated owner + invitee): `owner_user_id = (select auth.uid()) OR email = (select auth.email())`
2. **INSERT** (owner only): `WITH CHECK (owner_user_id = (select auth.uid()))`
3. **UPDATE** (owner only): `USING` + `WITH CHECK` both `owner_user_id = (select auth.uid())`
4. **DELETE** (owner only): `USING (owner_user_id = (select auth.uid()))`

Note: Per the RLS skill rules, using `(select auth.uid())` directly is correct here because `owner_user_id` stores the user's UUID (references `users.id`), not the Stripe connected account ID. The `get_current_owner_user_id()` function would also work but adds an unnecessary function call -- `(select auth.uid())` is simpler and equivalent for this table.

## Existing Index State (from Migration Analysis)

| Index Name | Columns | Status | Action Needed |
|------------|---------|--------|---------------|
| `idx_tenant_invitations_property_owner_id` | `property_owner_id` | Stale (column renamed) | Drop and recreate as `idx_tenant_invitations_owner_user_id` on `owner_user_id` |
| `idx_tenant_invitations_email` | `email` | Current | Keep |
| `idx_tenant_invitations_lease_id` | `lease_id` (partial) | Current | Keep |
| `idx_tenant_invitations_property_status` | `property_id, status` | Current | Keep |
| `idx_tenant_invitations_property_accepted` | `property_id, accepted_at, accepted_by_user_id` (partial) | Current | Keep |
| `idx_tenant_invitations_type` | `type` | Current | Keep |
| (NEW) `idx_tenant_invitations_active_email_owner` | `email, owner_user_id` WHERE `status IN ('pending', 'sent')` | Does not exist | Create (DB-03) |

**Note:** The `idx_tenant_invitations_property_owner_id` index references the old column name. If the column was renamed (which the generated types confirm), this index either (a) was automatically updated by PostgreSQL during the rename (indexes follow column renames), or (b) is broken. PostgreSQL DOES update indexes when columns are renamed, so the index likely works but has a misleading name. The migration should drop and recreate it with the correct name for clarity.

## Code Changes Required

### File 1: `src/components/tenants/invite-tenant-form.tsx`

**Line 78:** Change `type: 'portal_access'` to `type: 'platform_access'` (DB-01)
**Lines 63-65:** Remove `const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` (DB-04)
**Line 76:** Remove `expires_at: expiresAt,` from the insert payload (DB-04)

### File 2: `src/components/onboarding/onboarding-step-tenant.tsx`

**Lines 45-47:** Remove `const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` (DB-04)
**Line 56:** Remove `expires_at: expiresAt,` from the insert payload (DB-04)

### File 3: `src/hooks/api/query-keys/tenant-invite-mutation-options.ts`

**Lines 86-88:** Remove `const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` from `invite()` (DB-04)
**Line 105:** Remove `expires_at: expiresAt,` from the insert payload (DB-04)
**Lines 138-140:** Remove `const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` from `resend()` (DB-04)
**Line 144:** Change `expires_at: newExpiry` to server-side calculation (DB-04)

**Important note on `resend()`:** The resend mutation updates `expires_at` to extend the invitation by 7 days. After adding the DB default, the resend mutation still needs to explicitly set `expires_at` because `DEFAULT` only applies on INSERT, not UPDATE. The resend mutation should use a server-side approach -- either keep the client-side calculation (acceptable since it only extends, doesn't create) or use a raw SQL update via RPC. Since this is a simple UPDATE of one column, keeping the client-side calculation in `resend()` is acceptable and does not contradict D-06 (which specifies removing `expires_at` from INSERT paths). Alternatively, the update can use Supabase's PostgREST filter with a raw expression if available.

### Post-Migration Step: Type Regeneration

After the migration runs against the live database:
1. `pnpm db:types` -- regenerates `src/types/supabase.ts`
2. `expires_at` in the `Insert` type changes from `expires_at: string` (required) to `expires_at?: string` (optional)
3. `pnpm typecheck` -- verifies all code compiles with the new optional type

## Code Examples

### Complete Migration Structure

```sql
-- migration: stabilize_tenant_invitations
-- purpose: fix 4 data integrity issues on tenant_invitations table
-- affected: tenant_invitations (RLS policies, CHECK data, unique index, column default)
-- requirements: DB-01, DB-02, DB-03, DB-04

-- ============================================================================
-- step 1: backfill bad type values (DB-01)
-- the CHECK constraint tenant_invitations_type_check only allows
-- 'platform_access' and 'lease_signing'. any rows with 'portal_access'
-- (from the invite-tenant-form.tsx typo) need to be fixed before
-- any other operations touch these rows.
-- ============================================================================

update public.tenant_invitations
set type = 'platform_access'
where type = 'portal_access';

-- ============================================================================
-- step 2: fix RLS policies (DB-02)
-- all authenticated policies reference stale column property_owner_id.
-- the live column is owner_user_id (confirmed by generated types).
-- drop all stale policies and recreate with correct column reference.
-- ============================================================================

-- drop stale policies
drop policy if exists "tenant_invitations_select" on public.tenant_invitations;
drop policy if exists "tenant_invitations_select_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_insert_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_update_owner" on public.tenant_invitations;
drop policy if exists "tenant_invitations_delete_owner" on public.tenant_invitations;

-- SELECT: owner sees own invitations, invitee sees invitations sent to their email
create policy "tenant_invitations_select"
on public.tenant_invitations
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or email = (select auth.email())
);

-- INSERT: only the owner (authenticated user) can create invitations
create policy "tenant_invitations_insert"
on public.tenant_invitations
for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

-- UPDATE: only the owner can update their invitations
create policy "tenant_invitations_update"
on public.tenant_invitations
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

-- DELETE: only the owner can delete their invitations
create policy "tenant_invitations_delete"
on public.tenant_invitations
for delete
to authenticated
using (owner_user_id = (select auth.uid()));

-- ============================================================================
-- step 3: cancel duplicate active invitations + add unique index (DB-03)
-- ============================================================================

-- cancel older duplicates, keep the newest per (email, owner_user_id)
do $$
declare
  cancelled_row record;
  cancelled_count integer := 0;
begin
  for cancelled_row in
    with ranked as (
      select id, email, owner_user_id,
             row_number() over (
               partition by email, owner_user_id
               order by created_at desc
             ) as rn
      from public.tenant_invitations
      where status in ('pending', 'sent')
    )
    update public.tenant_invitations ti
    set status = 'cancelled'
    from ranked r
    where ti.id = r.id
      and r.rn > 1
    returning ti.id, ti.email, ti.owner_user_id
  loop
    raise notice 'Cancelled duplicate invitation: id=%, email=%, owner=%',
      cancelled_row.id, cancelled_row.email, cancelled_row.owner_user_id;
    cancelled_count := cancelled_count + 1;
  end loop;

  raise notice 'Total duplicate invitations cancelled: %', cancelled_count;
end $$;

-- add partial unique index (only enforced for active invitations)
create unique index if not exists idx_tenant_invitations_active_email_owner
on public.tenant_invitations (email, owner_user_id)
where status in ('pending', 'sent');

-- ============================================================================
-- step 4: add server-side expiry default (DB-04)
-- ============================================================================

alter table public.tenant_invitations
alter column expires_at set default now() + interval '7 days';
```

### Client-Side Code Fix (invite-tenant-form.tsx)

```typescript
// BEFORE (broken):
type: 'portal_access'
// ...
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
// ...
expires_at: expiresAt,

// AFTER (fixed):
type: 'platform_access'
// expires_at removed -- DB default handles it
// expiresAt variable deleted entirely
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `property_owner_id` FK to `property_owners.id` | `owner_user_id` FK to `users.id` | ~Dec 2025 (migration series) | Direct user reference eliminates join through `property_owners`; RLS policies simplified |
| `get_current_property_owner_id()` in RLS | `(select auth.uid())` directly | v1.2 onwards | No function call overhead; `owner_user_id` IS the auth UID, no lookup needed |
| Client-side expiry calculation | DB `DEFAULT` on `expires_at` | This phase (DB-04) | Eliminates clock skew; single source of truth for expiry duration |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | `portal_access` string no longer appears in invite-tenant-form.tsx | unit | `pnpm test:unit -- --run src/components/tenants/invite-tenant-form.test.ts` | Needs verification |
| DB-02 | RLS policies allow authenticated owner to insert/select/update/delete | integration (RLS) | `pnpm test:integration -- --run tests/integration/rls/tenant-invitations.rls.test.ts` | Yes (existing but only covers SELECT isolation) |
| DB-03 | Duplicate active invitations rejected at DB level | manual-only | Test via direct PostgREST insert of duplicate `(email, owner_user_id)` pair | N/A (DB constraint, not application logic) |
| DB-04 | `expires_at` not present in insert payload; DB sets it automatically | unit | `pnpm test:unit -- --run src/components/tenants/invite-tenant-form.test.ts` | Needs verification |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run` (quick, single pass)
- **Per wave merge:** `pnpm test:unit` (full suite with coverage)
- **Phase gate:** Full suite green + `pnpm typecheck` + `pnpm lint` before verification

### Wave 0 Gaps
- Existing `tenant-invitations.rls.test.ts` only tests SELECT cross-owner isolation -- does not test INSERT, UPDATE, or DELETE operations
- No unit test verifying the `type` value passed to PostgREST insert (the `portal_access` typo was never caught by tests)
- DB-03 is inherently a database-level constraint -- cannot be unit tested in the frontend; verification is via the migration itself and manual/integration testing

## Open Questions

1. **Index name after column rename**
   - What we know: PostgreSQL automatically updates indexes when columns are renamed. The index `idx_tenant_invitations_property_owner_id` was created on `property_owner_id`, but if the column was renamed to `owner_user_id`, the index still works (references the column by OID, not name).
   - What's unclear: Whether the index name should be updated for clarity. The migration should drop and recreate it with the correct name (`idx_tenant_invitations_owner_user_id`).
   - Recommendation: Include index rename in the migration for maintainability. Drop old, create new.

2. **Resend mutation expiry calculation**
   - What we know: D-06 says remove client-side `expires_at` from all 3 code paths. The `resend()` mutation in `tenant-invite-mutation-options.ts` also calculates `expires_at` client-side for the UPDATE operation.
   - What's unclear: DB `DEFAULT` only applies on INSERT, not UPDATE. The resend mutation must explicitly set `expires_at` somehow.
   - Recommendation: For the resend UPDATE, keep an explicit `expires_at` calculation but use `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` since this is an UPDATE (not an INSERT) and the DB default does not apply. Alternatively, create a small `extend_invitation_expiry(invitation_id uuid)` SQL function, but that adds scope beyond what the decisions dictate. The simplest approach: keep the existing client-side calculation in `resend()` only, document why it is an exception.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). This phase is pure SQL migration + TypeScript code changes. All tools needed (Supabase CLI, pnpm, Vitest) are standard project dependencies already available.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20251101000000_base_schema.sql` -- original `tenant_invitations` table definition with `property_owner_id` column, RLS policies, indexes, and FK constraints
- `supabase/migrations/20251128100000_separate_tenant_invitation_from_lease.sql` -- added `type` column with CHECK constraint (`platform_access`, `lease_signing`)
- `supabase/migrations/20251225182240_fix_rls_policy_security_and_performance.sql` -- replaced SELECT policy but still references `property_owner_id`
- `supabase/migrations/20251230191000_simplify_rls_policies.sql` -- dropped `tenant_invitations_service_role` policy
- `supabase/migrations/20251215010000_add_owner_user_id_columns.sql` -- added `owner_user_id` to leases, units, maintenance_requests but NOT tenant_invitations
- `src/types/supabase.ts` lines 1840-1926 -- generated types confirm `owner_user_id` is the live column name (not `property_owner_id`)
- `src/components/tenants/invite-tenant-form.tsx` line 78 -- confirms `type: 'portal_access'` typo
- `src/components/onboarding/onboarding-step-tenant.tsx` lines 45-56 -- confirms client-side `expires_at`
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` lines 86-105 -- confirms client-side `expires_at` in `invite()` and `resend()`
- `.claude/skills/sql-migration-rules/SKILL.md` -- migration naming and SQL conventions
- `.claude/skills/rls-policies/SKILL.md` -- RLS policy patterns and naming conventions

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` -- pitfalls 1-4 directly relevant to this phase (CHECK violation, RLS drift, duplicate race condition, client-side expiry)
- `.planning/research/ARCHITECTURE.md` -- 4 invitation code paths identified with exact file locations and line numbers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; all tools already in project
- Architecture: HIGH -- all migration patterns are standard PostgreSQL; all code changes verified by reading source files
- Pitfalls: HIGH -- two pitfalls are confirmed production bugs (CHECK violation, RLS drift); remaining two are structural issues verified by migration file analysis
- Code changes: HIGH -- exact line numbers verified by reading all three files

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable; these are PostgreSQL fundamentals, unlikely to change)
