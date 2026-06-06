# Phase 3: Stats RPC Consolidation - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning
**Source:** Live-DB-grounded (Supabase MCP introspection) — research spawn skipped; the facts below are verified, not assumed.

<domain>
## Phase Boundary

Replace the two multi-query stat hooks with single owner-scoped SECURITY DEFINER RPCs, mirroring the existing `get_maintenance_stats` pattern, each returning through a typed mapper, with owner isolation pinned by a dual-client RLS test.

- **PERF-02:** `unitQueries.stats()` (`src/hooks/api/query-keys/unit-keys.ts` ~:180-252) currently fires **4 HEAD counts + 1 UNBOUNDED `rent_amount` fetch** → `get_unit_stats(p_user_id uuid)`.
- **PERF-03:** `tenantQueries.stats()` (`src/hooks/api/query-keys/tenant-keys.ts` ~:148-180) currently fires **3 HEAD counts**, two filtering the JOINED `users.status` embedded resource without an inner join (broken) → `get_tenant_stats(p_user_id uuid)`.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Both RPCs mirror `get_maintenance_stats` EXACTLY (canonical pattern — see Canonical References)
- Signature `(p_user_id uuid) RETURNS jsonb`, `LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`.
- First statement: `if p_user_id != (select auth.uid()) then raise exception 'Unauthorized'; end if;` (SEC-01 identity guard).
- `jsonb_build_object` of `count(*) filter (where ...)` aggregates, scoped `where owner_user_id = p_user_id`.
- Grant: EXECUTE to `authenticated` only; the function is owner-self-scoped via the `auth.uid()` guard + `owner_user_id` filter (matches the steady-state `authenticated_security_definer` KEEP set — these are legit owner-scoped RPCs, NOT anon-executable).

### Verified scoping facts (live DB)
- `units` HAS `owner_user_id` DIRECTLY → scope `get_unit_stats` on `units.owner_user_id` (NO property join needed).
- `tenants` HAS its own `status` column AND `owner_user_id` → scope `get_tenant_stats` on `tenants.owner_user_id`, count by **`tenants.status`** (NOT the joined `users.status`).
- `get_unit_stats`/`get_tenant_stats` do NOT exist yet. `get_maintenance_stats`, `get_lease_stats`, `get_dashboard_stats` exist (the pattern).

### `get_unit_stats` return + no-regression contract
The current `UnitStats` (`src/types/stats.ts:48`) final values must be preserved. Current logic:
- `total` = count(status != 'inactive'); `occupied` = count(status='occupied'); `available` = count(status='available'); `maintenance` = count(status='maintenance').
- `totalActualRent` = sum(rent_amount) over non-inactive units (this is the UNBOUNDED fetch to kill — do it as `sum(rent_amount) filter (where status != 'inactive')` in SQL).
- Derived (keep in the typed mapper OR SQL): `vacant = available`; `occupancyRate = total>0 ? round(occupied/total*100) : 0`; `averageRent = total>0 ? totalActualRent/total : 0`; `occupancyChange = 0` (preserve the current hardcoded stub); `totalPotentialRent = totalActualRent` (preserve the current alias).
- RPC returns the raw aggregates (`total, occupied, available, maintenance, totalActualRent`); a typed `mapUnitStats` mapper derives the rest. Final `UnitStats` values must be IDENTICAL to today.

### `get_tenant_stats` return + the correctness note
Current `TenantStats` (`src/types/stats.ts:20`) values: `total`, `active`, `inactive`, `newThisMonth: 0` (stub — keep 0), `totalTenants = total`, `activeTenants = active`.
- RPC returns `total` = count(*), `active` = count(status='active'), `inactive` = count(status='inactive'), scoped `where owner_user_id = p_user_id`, counting by **`tenants.status`**.
- **CORRECTNESS NOTE (not a regression):** the OLD path counted active/inactive via `.eq("users.status", ...)` on a LEFT-joined `users` embed with NO inner join — a broken filter (the audit's flagged bug). Switching to `tenants.status` produces CORRECT counts that MAY DIFFER from the old (buggy) numbers. This is a deliberate correctness fix. `total` is unaffected (it had no filter). Do NOT treat a changed active/inactive count as a regression in verification — the success criterion "render identical values" applies to `total` + the un-broken fields; the tenant active/inactive fix is an intended correction. Document it in the SUMMARY.
- The mapper derives `totalTenants = total`, `activeTenants = active`, `newThisMonth = 0` (preserve stub).

### Typed mappers (Phase 2 pattern)
- `mapUnitStats(raw: unknown): UnitStats` + `mapTenantStats(raw: unknown): TenantStats` — Zod-validated boundary mappers mirroring `mapDocumentRow`/the Phase-2 mappers. Validate the numeric count fields; the RPC returns a known jsonb shape. Reuse `UnitStats`/`TenantStats` types from `src/types/stats.ts` — no duplicates.

### Migration
- New migration `supabase/migrations/YYYYMMDDHHmmss_*.sql` defining both RPCs. Applied to prod via Supabase MCP `apply_migration`; RECONCILE the repo filename timestamp against the prod-assigned one via `mcp__supabase__list_migrations` after apply (migration-mcp-prod-drift). Verify the migration applies cleanly against live prod.

### Dual-client RLS test
- `tests/integration/rls/` dual-client (ownerA/ownerB) test: ownerB calling `get_unit_stats(ownerA_id)` / `get_tenant_stats(ownerA_id)` is rejected (the `auth.uid()` guard raises 'Unauthorized'); each owner sees only their own counts. Runs in the `rls-security` CI gate.

### Claude's Discretion
- Whether to derive `vacant/occupancyRate/averageRent` in SQL or the typed mapper (either is fine; mapper keeps SQL lean).
- Exact jsonb key names (keep them clear; the mapper bridges to the `UnitStats`/`TenantStats` field names).
</decisions>

<canonical_refs>
## Canonical References

### The RPC pattern to mirror EXACTLY (live prod `get_maintenance_stats`)
```sql
CREATE OR REPLACE FUNCTION public.get_maintenance_stats(p_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;
  return (
    select jsonb_build_object(
      'open', count(*) filter (where status = 'open'),
      ... ,
      'total', count(*)
    )
    from maintenance_requests
    where owner_user_id = p_user_id
  );
end;
$function$
```

### Mapper pattern
- `src/hooks/api/query-keys/document-keys.ts` (`mapDocumentRow`) + the Phase-2 mappers (`analytics-mappers.ts`, `tenant-mappers.ts`, `maintenance-mappers.ts`).

### RLS test pattern
- `tests/integration/rls/` — existing dual-client ownerA/ownerB tests (e.g. `bulk-import-create-lease.test.ts`).

### Types
- `src/types/stats.ts` — `UnitStats` (:48), `TenantStats` (:20). REUSE — no duplicates.

### How the RPC is called from the hook
- Replace the `Promise.all([...HEAD counts...])` body with `supabase.rpc('get_unit_stats', { p_user_id })` → `mapUnitStats(data)`. Get `p_user_id` from the authed user (mirror how other RPC hooks pass the owner id).
</canonical_refs>

<specifics>
## Specific Ideas
- Kill the unbounded `rent_amount` fetch entirely — the sum moves into SQL (`sum(rent_amount) filter (where status != 'inactive')`).
- The tenant `users.status` embedded filter is DELETED (not "add an inner join") — the correct source is `tenants.status`, scoped by `owner_user_id`.
</specifics>

<deferred>
## Deferred Ideas
None — phase scope is the two RPCs + mappers + RLS test.
</deferred>

---

*Phase: 03-stats-rpc-consolidation*
*Context gathered: 2026-06-05 — live-DB-grounded; canonical get_maintenance_stats body + scoping columns + no-regression contract verified via MCP.*
