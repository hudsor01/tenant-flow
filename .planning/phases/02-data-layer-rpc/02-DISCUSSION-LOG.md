---
phase: 2
discussed: 2026-05-23
---

# Phase 2 Discussion Log

## Domain Boundary
Backend data-layer phase. Two carry-forwards from Phase 1's CONTEXT.md:
1. Additive RPC migration for per-property `open_maintenance`
2. Resolve `collection_rate` placeholder per v1.0 honesty principle

No UI surfaces. Inherits Phase 1 UI-SPEC for any incidental touches but adds no new design.

## Discussion

### Gray Area 1: collection_rate compute-or-drop
**Question asked:** "TenantFlow doesn't facilitate rent payments, so collection_rate has no real data source. What's the call?"

**Options presented:**
- Drop the KPI entirely (Recommended)
- Compute from leases (theoretical) — synthesize from occupied-units-with-active-leases / total-occupied-units
- Ship column hidden until Phase 5 — keep field in shape, render N/A, hide in DataTable

**User answer:** Drop the KPI entirely
**Rationale (from recommendation):** TenantFlow product doesn't have payment events / rent ledger / collection data. Computing from leases would ship a metric whose name no longer matches its definition. v1.0 honesty principle ("never fabricate") backs the drop.

**Locked as D-01.**

### Gray Area 2: open_maintenance migration shape (Claude's discretion — technical decision)
**Considered:**
- Additive to `get_dashboard_data_v2` (extend existing RPC, reuse shared CTEs)
- New separate RPC `get_property_open_maintenance_counts(owner_user_id)` (dashboard combines)
- Ship-hidden column until Phase 5 wires it (defer the data work)

**Chosen:** Additive to `get_dashboard_data_v2`
**Rationale:** The existing v2 RPC's shared-CTE pattern already scans `maintenance_requests` exactly once. Adding a separate RPC would scan it twice. The additive approach reuses the existing `all_maintenance` CTE via one more aggregate join. No new HTTP round-trip, no new RLS attack surface.

**Locked as D-02.**

### Gray Area 3: RLS test pattern (Claude's discretion — technical decision)
**Considered:**
- Single-owner happy-path only
- Dual-client ownerA/ownerB matching existing RLS tests
- Adversarial cross-owner injection attempts (e.g., manipulated UUID in SECURITY DEFINER param)

**Chosen:** Dual-client ownerA/ownerB matching existing pattern; happy path + isolation assertion
**Rationale:** Matches the established `tests/integration/rls/` infrastructure. Two assertions cover the contract: (1) ownerA sees own data with real counts, (2) ownerA querying ownerB's id returns empty. Adversarial-injection scenarios already covered by the function's SECURITY DEFINER + `(select auth.uid())` guard pattern — not new attack surface in Phase 2.

**Locked as D-04.**

### Gray Area 4: When to run `bun run db:types` (Claude's discretion — sequencing decision)
**Considered:**
- Before MCP apply (preview types from local schema)
- After MCP apply but before frontend changes
- After all frontend changes (one final regen)

**Chosen:** After MCP apply, before frontend code reads new fields
**Rationale:** `db:types` pulls from prod schema atomically. Running it before MCP apply would regenerate stale types. Running it after frontend changes risks the frontend type-checking against the wrong shape mid-edit. The sequence locked in D-06 prevents type drift.

**Locked as D-06.**

## Carry-forward Verification

From Phase 1's CONTEXT.md `<deferred>` section, both Phase 2 items are addressed:
- ✓ Per-property `open_maintenance` additive migration (D-02)
- ✓ `collection_rate` compute-or-drop resolution (D-01 — drop)

## Deferred Ideas (out of Phase 2 scope)
- Maintenance trend per property — Phase 3/4
- Filter portfolio by "has open maintenance" — Phase 5 (faceted filters)
- Per-tenant maintenance counts — out of v2.0 milestone
