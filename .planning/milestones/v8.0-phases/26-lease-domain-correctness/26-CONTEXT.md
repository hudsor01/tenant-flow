# Phase 26: Lease Domain Correctness - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning
**Source:** 2026-07-02 whole-codebase bug hunt (LEASE-01..08), file:line-verified; a few DB facts re-verified live 2026-07-04.

<domain>
## Phase Boundary
Make the lease surface trustworthy: the list shows real data + search works, UI-created leases are consistent with the data model, renew/sign/status/pagination behave correctly. Scope is exactly LEASE-01..08. Builds on Phase 25 (soft-delete) — keep every `.neq('lease_status','inactive')` filter Phase 25 relies on intact.

**Out of scope:** anything in phases 27-35; hard structural refactors of the lease schema; the v7.0 form-typing migration.
</domain>

<decisions>
## Implementation Decisions

### LEASE-01 — leases list table shows "Unassigned / No Property / N/A" (P1, headline)
**Root cause:** `leaseQueries.list` (`lease-keys.ts:66`) selects `"*, tenants:primary_tenant_id(id), units(id, unit_number, ...)"` — embeds the tenant under key `tenants` (id ONLY, no name) and the unit under `units` with NO nested property. But `transformLease` (`table/lease-utils.ts:92-129`) reads `lease.tenant` (singular), `lease.unit` (singular), and `unit.property` (singular). All undefined → every row shows "Unassigned"/"No Property"/"N/A", and the list's search filters on those fallback strings so it never matches real names.
**LOCKED DECISION:** expand the LIST query to carry tenant name + the unit's property, and align the embedded keys with what `transformLease` reads. The `detail` query already has the correct fuller shape — mirror it: `"*, tenant:primary_tenant_id(id, name, first_name, last_name), unit:units(id, unit_number, property:properties(id, name, address_line1))"` (alias embeds to the singular keys `tenant`/`unit`/`property` that `transformLease` + `LeaseWithNestedRelations` expect), OR keep the query keys and update `transformLease`+the type to read the actual keys — pick ONE and make them consistent. KEEP the Phase-25 `.neq('lease_status','inactive')` filter. Verify PostgREST embed-alias syntax against a live query before finalizing.
**Verify:** the list shows each lease's tenant name, property name, and unit number; typing a tenant/property name in search filters correctly.

### LEASE-02 — UI-created leases never get a `lease_tenants` join row (P1)
**Root cause:** `lease-mutation-options.ts:67` destructures `tenant_ids` away and inserts only lease columns; the wizard also inserts no join row. Tenant reads (`TENANT_WITH_LEASE_SELECT`) join through `lease_tenants`, and the active-lease tenant-delete guard checks `lease_tenants` — so a UI-created lease is invisible on the tenant, and its tenant can be soft-deleted despite an active lease. Only `bulk_import_create_lease` creates the row.
**LOCKED DECISION (canonical, path-independent):** add an AFTER INSERT trigger on `public.leases` that inserts the primary `lease_tenants` row (`lease_id`, `tenant_id = NEW.primary_tenant_id`, `is_primary = true`) with `ON CONFLICT (lease_id, tenant_id) DO NOTHING`. The unique constraint `lease_tenants_lease_id_tenant_id_key (lease_id, tenant_id)` exists (verified), so this is idempotent and harmless for `bulk_import_create_lease` (its manual insert becomes a no-op via ON CONFLICT). Guard `WHEN (NEW.primary_tenant_id IS NOT NULL)`. SECURITY DEFINER + `SET search_path=public`; verify it satisfies `lease_tenants` RLS or bypasses via definer.
**Migration discipline:** apply via Supabase MCP, reconcile filename via `list_migrations` (prod-drift memory).
**Verify:** create a lease via wizard AND via lease-form → the tenant detail page shows that lease; deleting that tenant is blocked while the lease is active.

### LEASE-03 — renew dialog discards the rent adjustment (P1)
`renew-lease-dialog.tsx:77` validates/previews a new rent then sends only `end_date`. **DECISION:** include the adjusted `rent_amount` (dollars) in the renew mutation payload when the user toggled the adjustment; leave rent unchanged when not. Frontend-only.

### LEASE-04 — lease terms editable after the tenant signs (P1)
Terms stay editable while `pending_signature` / after tenant-sign; the finalize step renders the signed PDF from current DB values → a signed doc with terms the tenant never agreed to. No lock exists.
**LOCKED DECISION (defense in depth):** (1) UI — hide/disable the "Edit Lease" affordance once `lease_status = 'pending_signature'` or `tenant_signed_at` is set. (2) Server — a BEFORE UPDATE trigger (or tightened RLS) on `leases` that REJECTS changes to the financial/term columns (rent_amount, security_deposit, dates, late-fee, deposits) once `tenant_signed_at IS NOT NULL` (or status is pending_signature/active-signed). Allow non-term edits (e.g. notes). Verify which column marks tenant-signature (`tenant_signed_at`) before writing the trigger.
**Verify:** an owner cannot edit rent on a lease the tenant has signed (UI blocked + a direct PostgREST update rejected).

### LEASE-05 — edit-form status select missing `pending_signature` (P2)
`lease-form-financial-fields.tsx` STATUS_OPTIONS = draft/active/ended/terminated; a `pending_signature` lease renders a blank Status trigger and can be knocked out of that state on save. **DECISION:** add `pending_signature` to the options (and note `expired` — the cron-set value; include it read-only if a lease can be in it). Frontend-only.

### LEASE-06 — leases page hardcodes limit:50 + client count (P2)
`leases/page.tsx:97` `useLeaseList({limit:50, offset:0})`, `totalLeases = leases.length`, client-side pagination over that page → leases 51+ unreachable, wrong total. **DECISION:** paginate server-side — pass real offset/limit driven by the page control, use the PostgREST `count` from the response for the total + page count (never `data.length`). Verify `useLeaseList` returns `count`; wire the page + stat cards to it.

### LEASE-07 — signed-PDF money format (P2)
`_shared/lease-signing.ts:104` `formatMoney` uses bare `toLocaleString("en-US")` (min 0 fraction digits) → "$1,500.5". **DECISION:** format with 2 decimals consistent with the signing page's `formatCurrency`. Edge-function change (`supabase/functions/_shared/lease-signing.ts`) — remember Edge Functions need out-of-band deploy (CLI 401 pattern; `bun scripts/deploy-edge-functions.ts`), so flag deploy as a manual/owner step.

### LEASE-08 — rent-increase notice gets the unit number as the address (P2)
`lease-header.tsx:170` passes `unitName` (unit_number) as `propertyAddress` to `RentIncreaseNoticeDialog`. **DECISION:** pass the property address (street/city) instead. Frontend-only; source the address from the lease's unit→property (available once LEASE-01's fuller embed lands).

### Claude's Discretion
- Exact PostgREST alias syntax for LEASE-01 (verify live).
- Whether LEASE-04's server gate is a trigger vs RLS (trigger preferred for a clear error message).
- Test coverage additions per fix.
</decisions>

<canonical_refs>
## Canonical References (read before planning/implementing)
- `src/hooks/api/query-keys/lease-keys.ts` — `list` (LEASE-01, line 66) vs `detail` (line 105, the correct fuller shape to mirror); keep `.neq('lease_status','inactive')`.
- `src/components/leases/table/lease-utils.ts` — `transformLease` + `LeaseWithNestedRelations` (LEASE-01).
- `src/hooks/api/query-keys/lease-mutation-options.ts` — create (LEASE-02), renew (LEASE-03), the Phase-25 delete/terminate.
- `src/components/leases/wizard/lease-creation-wizard.tsx` — the other create path (LEASE-02); Phase 25 fixed its money → dollars, do NOT regress.
- `supabase/migrations/` for `bulk_import_create_lease` (how it inserts lease_tenants) + the `lease_tenants` schema/RLS (LEASE-02); apply new migrations via MCP + reconcile filename.
- `supabase/functions/_shared/lease-signing.ts` — `formatMoney` (LEASE-07) + the signing-page `formatCurrency` reference.
- CLAUDE.md — money is dollars; pagination via PostgREST `count`; migrations MCP+reconcile; Edge Function deploy is out-of-band.

### Live DB facts (verified 2026-07-04)
- `lease_tenants_lease_id_tenant_id_key UNIQUE (lease_id, tenant_id)` exists → ON CONFLICT idempotency for LEASE-02.
- No AFTER-INSERT trigger currently creates `lease_tenants`; only `bulk_import_create_lease` does.
- No lease-terms edit lock exists (LEASE-04 is greenfield).
</canonical_refs>

<specifics>
## Specific Ideas
- LEASE-02 trigger must be idempotent (ON CONFLICT) so it composes with `bulk_import_create_lease`; guard on non-null primary_tenant_id.
- LEASE-04 needs BOTH a UI gate and a server-side rejection (a UI-only lock is bypassable via direct PostgREST — the exact hole the bug hunt flagged).
- Every DB change (LEASE-02 trigger, LEASE-04 trigger) verified against the live DB with a rolled-back before/after proof, like Phase 25.
- Keep the Phase-25 soft-delete filters + the dollars money model intact.
</specifics>

<deferred>
## Deferred
- The `unitQueries.byProperty` cache-invalidation gap → PROP-01 (Phase 30).
- Property-status filter in performance RPCs → DATA-02 (Phase 30).
- Anything not in LEASE-01..08.
</deferred>

---
*Phase: 26-lease-domain-correctness*
*Context gathered 2026-07-04 from the whole-codebase bug hunt.*
