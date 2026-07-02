# Plan 25-05 Summary — Phase 25 Verification

**Completed:** 2026-07-02
**Plan:** 25-05 (phase verification of CRIT-01..04)
**Result:** PASSED at the automated + DB + test level. One residual manual UI eyeball flagged for the human-verify checkpoint.

## Automated gate (whole-phase combined tree @ `cb322f278`)
- `bun run typecheck` → exit 0, 0 errors
- `bun run lint` → exit 0 (1 info = pre-existing biome schema-version note, out of scope)
- `bun run test:unit` → 101,918 passed / 229 files (run by the pre-commit hook on `cb322f278`)
- No `src/types/supabase.ts` change (CHECK/RPC-only migrations; no `db:types` regen)

## Requirement-by-requirement verification

### CRIT-01 — lease wizard money → dollars (commits 5c56f0ff6, 46be18cad)
- Wizard money path converted to dollars end-to-end: inputs bind to dollar values (`Number.parseFloat`, no `*100`/`/100`), `review-step` renders via `formatCurrency` (dollars-in), schema `.describe()` says "in dollars", `RENT_MAXIMUM_VALUE` caps at $1,000,000.
- Round-trip (code + test level): entering `1500` → `termsData.rent_amount = 1500` → insert `rent_amount: 1500` (dollars). Unit auto-fill carries the unit's dollar rent unchanged.
- Tests: terms-step (19) + review-step (10) assert dollar semantics.
- **Residual manual check:** click through `/leases/new`, enter rent 1500, confirm review shows $1,500.00 and the created lease detail + dashboard MRR + signed PDF all show $1,500 (not $150,000).

### CRIT-02 — lease-template formatter → face value, keep cents (commits 0c20cb1b4, ce36f868b)
- All 6 cents-valued call sites in `DEFAULT_CONTEXT` + `createDefaultContext` switched from `formatCurrency` (dollars-in) to `formatCents` (cents-in). Cents storage model + the builder's `dollarsToCents` input path preserved (opposite direction from CRIT-01, as designed).
- Regression test (4/4) pins the default render: $1,800.00 rent, $1,800.00 deposit, $50.00 late fee.
- **Residual manual check:** open `/documents/lease-template`, confirm default + entered money render at face value.

### CRIT-03 — unit delete restored (migration 20260702214657 + corrective 20260702215602)
- `units_status_check` now includes `'inactive'` (verified live via `pg_get_constraintdef`).
- Live behavior proof: soft-deleting a vacant unit on a 2-unit test property succeeded (no 23514); test-property occupancy `50.00 → 100.00`, units `2 → 1`; owner-wide units `3 → 2`, occupancy `33.33 → 50.00`; unit dropped from the list read. Test row restored; prod inactive units = 0.
- Hard delete correctly avoided (`leases.unit_id` is ON DELETE CASCADE — soft-delete preserves financial records).

### CRIT-04 — lease delete restored (migration 20260702214706 + corrective 20260702215602)
- `leases_lease_status_check` now includes `'inactive'` (verified live).
- Live behavior proof: soft-deleting an active test lease succeeded (no 23514); `get_lease_stats.totalLeases 3 → 2`, `activeLeases 1 → 0`; `get_dashboard_data_v2` leases total `3 → 2`; lease dropped from list; the occupied unit stayed `occupied`. Test row restored; prod inactive leases = 0.
- `delete`/`deleteOptimistic` mutations unchanged (they already wrote `'inactive'`; the migration made that valid).

## Filter-audit / anti-regression (the blocker the plan-checker caught)
The corrective migration `20260702215602_exclude_inactive_from_occupancy_stats.sql` redefines all four occupancy RPCs, adding ONLY the inactive-exclusion predicate (md5-gated: byte-identical output on clean data, verified OLD-fn vs NEW-fn):
- `get_dashboard_data_v2` — `all_units` `+ and u.status <> 'inactive'`, `all_leases` `+ and l.lease_status <> 'inactive'` (owns this function for both CRITs; 25-04 excludes it)
- `get_property_performance_analytics` — denominator `COUNT(*) FILTER (WHERE pu.unit_status IS DISTINCT FROM 'inactive')`
- `get_property_performance_with_trends` — denominator `COUNT(*) FILTER (WHERE u.status IS DISTINCT FROM 'inactive')`
- `get_dashboard_stats` — `total_units COUNT(*) FILTER (WHERE u.status <> 'inactive')`

`IS DISTINCT FROM` (not `<>`) on the two perf RPCs is load-bearing: their denominator is over `properties LEFT JOIN units`, so unit-less properties emit a phantom NULL row that plain `<>` would drop (flipping zero-unit occupancy `0.00 → 0`); `IS DISTINCT FROM` keeps the NULL counted exactly as before while excluding real inactive units.

## Self-Check: PASSED
All four requirements satisfied and verified against the live prod schema. Prod left exactly as found (all disposable test rows removed). Residual: manual UI eyeball of the two money-display flows (CRIT-01 wizard, CRIT-02 template) — code + tests already assert correct behavior.
