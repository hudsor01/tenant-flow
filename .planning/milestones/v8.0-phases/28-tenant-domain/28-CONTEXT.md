# Phase 28: Tenant Domain - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Source:** 2026-07-02 whole-codebase bug hunt (TEN-01..06), re-verified against current source on `phase/28-tenant-domain` (off merged main w/ Phases 25-27).

<domain>
## Phase Boundary
Restore the tenant list/detail controls + the tenant mappers to correct behavior. Scope is exactly TEN-01..06 — all frontend + one mapper-logic fix; NO migrations (the tenant delete + update mutations already exist, they are just not wired). Builds on Phases 25-27; do not regress the dollars money model, soft-delete filters, or the `lease_tenants` reads that Phase 26 fixed. **Out of scope:** phases 29-35; the `@modal/(.)tenants/[id]/edit` parallel-route tree beyond what TEN-05 touches; any tenant-portal / tenant-auth concept (tenants are records, not users).
</domain>

<decisions>
## Implementation Decisions (each verified against current source)

### TEN-01 — tenant delete is a no-op from every control (P1)
Every delete control just logs: `tenants.tsx:199-200` (table row `onDelete`) + `tenants.tsx:211-212` (grid card `onDelete`) both call `logger.info("Delete tenant requested", { tenantId: id })`; `tenants.tsx:94` `handleBulkDelete` logs `"Bulk delete initiated"`. A REAL mutation already exists: `useDeleteTenantMutation()` (`use-tenant-mutations.ts:62`, wraps `tenantMutations.delete()`).
**LOCKED:** wire the row + grid `onDelete` and the bulk-action-bar delete to `useDeleteTenantMutation`, gated behind a confirm dialog (AlertDialog — destructive). Row/grid delete one id; bulk deletes the selected set (sequential or batched). On success invalidate `tenantQueries.lists()` + `ownerDashboardKeys.all` (the mutation already does). Respect the tenant-delete guard Phase 26 restored (active-lease tenants can't be deleted — surface the server error via toast, don't swallow).
**Verify:** deleting a tenant from row, grid card, and bulk bar removes it (or shows the active-lease block error); no `logger.info`-only path remains.

### TEN-02 — "View lease" navigates to the wrong entity (P1)
`tenant-table-row.tsx:92` `onClick={() => onViewLease(tenant.id)}` passes the TENANT id to `onViewLease(leaseId)`, so it navigates to `/leases/<tenantId>` → wrong/404. The button only renders when `tenant.leaseStatus === "active"`, so a current lease exists. (The detail-sheet callers are already correct — they pass `tenant.currentLease!.id` / `lease.id`.)
**LOCKED:** pass the tenant's current lease id — `onViewLease(tenant.currentLease?.id)` (guard: only render/enable the button when `currentLease?.id` exists, which aligns with the `leaseStatus === "active"` gate). Do NOT pass `tenant.id`.
**Verify:** clicking View on an active-lease tenant lands on that tenant's lease detail.

### TEN-03 — per-tenant status dropdowns don't persist (P2)
`tenant-table-row.tsx:79` and `tenant-grid.tsx:134` `onChange` handlers only `logger.info("Status change", …)` — the select snaps back on refetch. `useUpdateTenantMutation()` exists (`use-tenant-mutations.ts:42`).
**LOCKED:** persist the change — wire the dropdown `onChange` to `useUpdateTenantMutation` (update the tenant `status`), invalidating the list so the value sticks; OR, if the tenant `status` field is not a safe free-set from this control (e.g. it collides with the moved-out flow / lease-derived `leaseStatus`), REMOVE the dropdown and render read-only status. Decide by checking what `status` values are valid + whether `useMarkTenantAsMovedOutMutation` is the intended path for active→inactive. Whichever: no onChange-logs-only control that visually snaps back.
**Verify:** changing status persists after refetch, OR the control is gone (read-only badge).

### TEN-04 — mapTenantRow picks the wrong "current" lease (P2)
`tenant-mappers.ts:179-182`: `primaryLeaseTenant = leaseRows.find((lt) => lt.is_primary) ?? leaseRows[0]` then `activeLease = primaryLeaseTenant?.leases`. The comment claims "prefer active, fallback to first" but the code only prefers `is_primary` — so a tenant with a primary row on a TERMINATED/ENDED lease + a separate ACTIVE lease shows the terminated one as "current."
**LOCKED:** select the current lease by preferring `leases.lease_status === 'active'` first, then `is_primary`, then a deterministic order (e.g. latest `start_date`) — never just `is_primary`/first. Derive `currentLease` + `activeUnit`/`activeProperty` + `leaseStatus` from that chosen lease. Keep the existing null-safety (`?? null`) and the NOT-NULL-field throws.
**Verify:** a tenant whose primary lease is terminated but who has an active lease shows the active lease as current + `leaseStatus='active'`.

### TEN-05 — tenant-edit emergency-contact fields effectively mandatory (P2)
`src/app/(owner)/tenants/components/tenant-edit-form.client.tsx:30-36`: `emergencyContactSchema = tenantInputSchema.pick({emergency_contact_name, emergency_contact_phone, emergency_contact_relationship: true}).required()` used as `validators: { onChange: emergencyContactSchema }` (line 64). `.required()` makes all 3 emergency-contact fields mandatory, so an owner cannot clear them or do a name-only edit — `canSubmit` stays false.
**LOCKED:** make the emergency-contact fields OPTIONAL — drop `.required()` (or use `.partial()`) so empty/cleared values validate and a partial edit can submit. Keep any real format validation (e.g. phone shape when NON-empty) but do not require presence. The `onSubmit` already sends the three fields; ensure empty strings persist as empty/null per the column nullability.
**Verify:** editing a tenant and clearing the emergency-contact phone (or leaving all three empty) still submits and saves.

### TEN-06 — moved-out optimistic update targets the wrong key + shape (P2)
`use-tenant-mutations.ts` `useMarkTenantAsMovedOutMutation` optimistic block: `apply` calls `qc.setQueryData<TenantWithLeaseInfo[]>(tenantQueries.lists(), (old) => old ? old.filter(...) : old)`. Two bugs: (1) KEY — `tenantQueries.lists()` = `['tenants','list']`, but the list is cached under the exact key `[...lists(), filters ?? {}]` = `['tenants','list',{}]` (`tenant-keys.ts:50-52`), and `setQueryData`/`getQueryData` require the EXACT key → no-op. (2) SHAPE — the list data is `PaginatedResponse<TenantWithLeaseInfo>` (an object with `.data[]`, `tenant-keys.ts:53`), NOT a bare array, so `old.filter(...)` would throw if the key matched. The snapshot has the same key+shape mismatch.
**LOCKED:** fix the optimistic list update to target the real cached key(s) (use `qc.setQueriesData` with the `['tenants','list']` PREFIX filter to hit all filter variants, OR the exact `[...lists(), {}]`) AND the real `PaginatedResponse` shape (map/filter `old.data`, adjust `count`). OR — simpler and safe — DROP the optimistic list mutation and rely on the existing `invalidate: [...lists()...]` (the mutation already invalidates). Keep the detail/withLease optimistic only if their key+shape are correct. Whichever: no silent no-op / no throw.
**Verify:** marking a tenant moved-out updates the list immediately (or cleanly after invalidation) with no console error.

### Claude's Discretion
- TEN-01 confirm-dialog UX (single AlertDialog reused vs per-control); bulk delete sequential vs Promise.all.
- TEN-03 direction (wire-to-persist vs remove) — pick per the status-field semantics.
- TEN-06 approach (fix key+shape via setQueriesData vs drop the optimistic list step) — prefer the simplest that is correct.
- TEN-04 tie-break ordering among multiple active leases (latest start_date is reasonable).
</decisions>

<canonical_refs>
## Canonical References
- `src/components/tenants/tenants.tsx` — TEN-01 (row/grid/bulk onDelete wiring).
- `src/components/tenants/tenant-table-row.tsx` — TEN-02 (line 92 view-lease id) + TEN-03 (line 79 status onChange).
- `src/components/tenants/tenant-grid.tsx` — TEN-01 (grid delete) + TEN-03 (line 134 status onChange).
- `src/hooks/api/query-keys/tenant-mappers.ts` — TEN-04 (line 179-182 current-lease selection).
- `src/app/(owner)/tenants/components/tenant-edit-form.client.tsx` — TEN-05 (emergencyContactSchema.required()).
- `src/hooks/api/use-tenant-mutations.ts` — TEN-01 (`useDeleteTenantMutation`), TEN-03 (`useUpdateTenantMutation`), TEN-06 (`useMarkTenantAsMovedOutMutation` optimistic).
- `src/hooks/api/query-keys/tenant-keys.ts` — the list key shape (`lists()` vs `[...lists(), filters]`, `PaginatedResponse`).
- CLAUDE.md — mutations invalidate related keys + `ownerDashboardKeys.all`; `PaginatedResponse` uses `count` not `data.length`; no string-literal query keys; tenants are records not users.
</canonical_refs>

<specifics>
## Specific Ideas
- TEN-01 + TEN-06 both touch `use-tenant-mutations.ts` — coordinate (delete wiring vs moved-out optimistic) so they don't conflict.
- TEN-04's chosen lease drives `currentLease`, `leaseStatus`, and TEN-02's `onViewLease(currentLease.id)` — get TEN-04 right first, TEN-02 depends on `currentLease.id` being the active lease.
- No migrations this phase — pure frontend/mapper. Verify via exercising the flows + unit tests, not DB proofs.
</specifics>

<deferred>
## Deferred (tracked elsewhere)
- Anything not in TEN-01..06.
- The `@modal` parallel-route edit tree (dead/duplicate) unless TEN-05 must touch it for consistency.
</deferred>

---
*Phase: 28-tenant-domain*
