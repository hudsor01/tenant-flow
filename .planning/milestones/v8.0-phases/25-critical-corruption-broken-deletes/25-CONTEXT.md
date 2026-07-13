# Phase 25: Critical — Corruption & Broken Deletes - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning
**Source:** 2026-07-02 whole-codebase bug hunt (findings verified against source + the live Supabase DB by the orchestrator)

<domain>
## Phase Boundary

Fix the three P0 defects (plus one sibling money-formatting bug) from the bug hunt. These are the highest-impact findings: one silently corrupts real lease data on the primary create path, and two make core delete operations fail 100% of the time. Scope is exactly CRIT-01..CRIT-04 — no adjacent refactors, no v7.0 form-typing migration work (even though CRIT-01 touches wizard files the paused v7.0 milestone also targets — fix behavior only, do not migrate typing).

**In scope:** the four fixes below, their migrations, and a filter-audit ensuring soft-deleted rows are excluded everywhere.
**Out of scope:** every other bug-hunt finding (they are phases 26-35), any hard-delete of leases/units, unifying the wizard and lease-template money models (they are intentionally different — see decisions).
</domain>

<decisions>
## Implementation Decisions

### CRIT-01 — Lease wizard writes rent 100× too high (money corruption)
**Root cause:** the lease-creation wizard treats money as **cents** internally, but `leases` money columns store **dollars** (`numeric(10,2)`, per CLAUDE.md). The insert writes the cents value straight into the dollars column with no `/100`.
- `src/components/leases/wizard/terms-step.tsx:69-73` — `parseCents` does `Math.round(num * 100)`; `centsToDisplay` does `cents / 100`.
- `src/components/leases/wizard/details-step.tsx` — same cents conversion for `pet_deposit` / `pet_rent`.
- `src/components/leases/wizard/lease-creation-wizard.tsx:166-183` — inserts `...termsData` (cents) into `supabase.from("leases").insert(...)` with no `/100`; `handleUnitSelected` (line 67-76) sets the unit's **dollar** `rent_amount` directly into the cents-state (inverse bug → a $1,500 unit displays as "$15").
- `src/components/leases/wizard/review-step.tsx` — formats with `formatCents` (masks the bug in review).
- `src/lib/validation/lease-wizard.schemas.ts:110-142` — `.describe("...in cents")` on rent/deposit/late-fee/pet fields; `RENT_MAXIMUM_VALUE` (1_000_000) is compared against the cents value, so it currently blocks any rent > $10,000/mo.

**LOCKED DECISION:** convert the wizard to treat money as **dollars end-to-end** (match the edit form `lease-form-financial-fields.tsx`, the bulk-import path, and the DB). Remove every `*100` / `/100` in the wizard money path; the input value binds to the dollar string directly (parse to a dollar number, allow 2 decimals). The insert writes dollar values. `review-step` uses the dollar currency formatter (e.g. `formatCurrency`, dollars-in), not `formatCents`. Update the schema `.describe()` text to "in dollars" and ensure `RENT_MAXIMUM_VALUE` compares dollars. Unit auto-fill (`handleUnitSelected`) then correctly carries the unit's dollar rent.
**Do NOT** change the DB columns — they are already dollars and correct.

### CRIT-02 — Lease-template document renders money 100× (formatter bug, opposite direction)
**Root cause:** the `/documents/lease-template` builder genuinely stores money as **cents** in its template context (`lease-template-builder.client.tsx` uses `dollarsToCents` on input), but `createDefaultContext` formats those cents fields with `formatCurrency` (a dollars-in formatter) instead of `formatCents`.
- `src/lib/templates/lease-template.ts:604-624` — `createDefaultContext` uses `formatCurrency(overrides?.rent_amountCents ?? DEFAULT_CONTEXT.rent_amountCents)` etc.; `formatCents` (in `currency.ts`) exists and is the correct formatter but is unused here.
- `DEFAULT_CONTEXT` (lines ~159,163,167) holds cents values (e.g. 180000 for $1,800).

**LOCKED DECISION:** in `createDefaultContext`, format the `*Cents` fields with `formatCents()` (not `formatCurrency`). This is the **opposite** fix from CRIT-01: the lease-template correctly stores cents and only the formatter is wrong. **Do NOT convert the lease-template to dollars** — that would break `lease-template-builder.client.tsx`'s `dollarsToCents` input path. Keep the two money models separate; they are independent code paths.
**Verify:** the default template renders "$1,800.00" rent and "$50.00" late fee (not $180,000 / $5,000), in both the live preview and the generated PDF.

### CRIT-03 — Unit delete always fails (invalid status value)
**Root cause:** `src/hooks/api/query-keys/unit-keys.ts:253-264` `unitMutations.delete` runs `.update({ status: "inactive" })`, but the live `units_status_check` allows only `available | occupied | maintenance | reserved` — so every delete raises a 23514 CHECK violation.

**LOCKED DECISION:** soft-delete via adding `'inactive'` to the `units_status_check` constraint (migration). Rationale (all verified live):
- The code already intends `'inactive'` as the soft-delete sentinel — the list/read queries in `unit-keys.ts` already carry `.neq("status","inactive")` filters (currently no-ops because no row can be `'inactive'`).
- **Hard delete is unsafe:** `leases.unit_id` FK is `ON DELETE CASCADE` (verified) — deleting a unit would cascade-delete its leases (financial records). Soft-delete preserves them.
- No `deleted_at` column exists on `units`; adding `'inactive'` to the CHECK is the minimal coherent fix that activates the existing filters.

**Migration:** `ALTER TABLE public.units DROP CONSTRAINT units_status_check, ADD CONSTRAINT units_status_check CHECK (status = ANY (ARRAY['available','occupied','maintenance','reserved','inactive']))`.
**Filter audit (mandatory):** once `'inactive'` becomes a possible value, every unit read that should show only live units must exclude it. Audit unit list/count/occupancy queries + the per-property performance RPCs (`get_property_performance_analytics` counts units) and confirm each excludes `status = 'inactive'`. (The list queries already do; verify stats/occupancy/dashboard paths.)

### CRIT-04 — Lease delete always fails (invalid status value)
**Root cause:** `src/hooks/api/query-keys/lease-mutation-options.ts:112-138` `delete()` and `deleteOptimistic()` run `.update({ lease_status: "inactive" })` (comment: "Soft-delete… financial record retention"), but the live `leases_lease_status_check` allows only `draft | pending_signature | active | ended | terminated | expired` — every delete raises 23514.

**LOCKED DECISION:** soft-delete via adding `'inactive'` to `leases_lease_status_check` (migration). Rationale (verified live):
- The design already treats `'inactive'` as soft-deleted: `get_lease_stats` computes `totalLeases = count(*) filter (where lease_status != 'inactive')`, and `leaseQueries.list` (`lease-keys.ts:73`) filters `.neq('lease_status','inactive')` — both anticipate `'inactive'` as the soft-delete sentinel that never got added to the CHECK.
- Preserves the "financial record retention" intent (row kept, hidden from active views) — matches CRIT-03.

**Migration:** `ALTER TABLE public.leases DROP CONSTRAINT leases_lease_status_check, ADD CONSTRAINT leases_lease_status_check CHECK (lease_status = ANY (ARRAY['draft','pending_signature','active','ended','terminated','expired','inactive']))`.
**Filter audit (mandatory):** confirm every lease read/stat that should exclude soft-deleted rows filters `lease_status != 'inactive'`. `get_lease_stats` and `leaseQueries.list` already do; audit the dashboard RPCs, `get_property_performance_*`, and any other lease aggregation. Note LEASE-01 (phase 26) will also touch the list query — keep the `.neq` filter intact.

### Migration discipline (both migrations)
- Two migrations in `supabase/migrations/YYYYMMDDHHmmss_*.sql` (idempotent: `DROP CONSTRAINT IF EXISTS` then `ADD CONSTRAINT`).
- Apply via Supabase MCP `apply_migration`, then reconcile the repo filename timestamp with `mcp__supabase__list_migrations` (prod assigns its own timestamp — see the `migration-mcp-prod-drift` memory).
- After applying, re-run `bun run db:types` only if a column/type changed (CHECK-only change does not alter generated types, so likely no regen needed — verify).

### Claude's Discretion
- Exact helper/formatter names in the wizard money conversion (reuse existing `formatCurrency`/dollar parsing already used by `lease-form-financial-fields.tsx`).
- Whether the wizard number inputs keep `inputMode="decimal"` (yes — unchanged UX, just dollar semantics).
- The precise SQL migration filename slug.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Money model (dollars, per project rule)
- `CLAUDE.md` — "All `amount` columns store **dollars** as `numeric(10,2)`. Convert to cents only at the Stripe API boundary."
- `src/components/leases/lease-form-financial-fields.tsx` — the CORRECT dollar-handling reference (edit form); the wizard must match this.
- `src/lib/formatters/` / `currency.ts` — `formatCurrency` (dollars-in) vs `formatCents` (cents-in); pick the right one per path.

### Files to change
- CRIT-01: `src/components/leases/wizard/{terms-step,details-step,review-step,lease-creation-wizard}.tsx`, `src/lib/validation/lease-wizard.schemas.ts`
- CRIT-02: `src/lib/templates/lease-template.ts` (only the formatter calls in `createDefaultContext`)
- CRIT-03: `supabase/migrations/*` (new) + audit `src/hooks/api/query-keys/unit-keys.ts` reads
- CRIT-04: `supabase/migrations/*` (new) + audit `src/hooks/api/query-keys/lease-mutation-options.ts` + `lease-keys.ts` reads

### Live DB facts (verified 2026-07-02)
- `units_status_check` = `available | occupied | maintenance | reserved` (no `inactive`)
- `leases_lease_status_check` = `draft | pending_signature | active | ended | terminated | expired` (no `inactive`)
- `leases.unit_id` FK is `ON DELETE CASCADE`; no `deleted_at` on `units`/`leases`
- `get_lease_stats` already excludes `lease_status = 'inactive'` in `totalLeases`
</canonical_refs>

<specifics>
## Specific Ideas

- CRIT-01 and CRIT-02 pull in opposite directions on purpose: wizard → dollars; lease-template → keep cents, fix formatter. A plan that "unifies" them is WRONG.
- The delete fixes are migrations, not hard deletes (CASCADE would destroy financial records).
- Each fix must be verified by exercising the flow: create a lease at 1500 and read back the DB row; render the lease-template default; delete a unit and a lease and confirm the row soft-deletes and disappears from its list.
</specifics>

<deferred>
## Deferred Ideas

- Every other bug-hunt finding — scoped to phases 26-35, not here.
- Introducing a dedicated `deleted_at` soft-delete column (rejected in favor of the existing `'inactive'` status sentinel the code already expects).
</deferred>

---

*Phase: 25-critical-corruption-broken-deletes*
*Context gathered: 2026-07-02 from the whole-codebase bug hunt (findings verified against source + live DB)*
