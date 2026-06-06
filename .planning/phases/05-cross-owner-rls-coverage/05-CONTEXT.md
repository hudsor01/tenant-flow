# Phase 5: Cross-Owner RLS Coverage - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** Live-DB-grounded (Supabase MCP RLS-policy introspection). Test-only phase — no schema/frontend/type changes.

<domain>
## Phase Boundary
Add dual-client (ownerA/ownerB) RLS integration tests for the owner-scoped tables that lacked cross-owner coverage, harden RLS-rejection assertions to SQLSTATE codes, and extract the duplicated `REVOKED_CODES` literal to one shared helper. All under `tests/integration/rls/`, running in the `rls-security` CI gate.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### TEST-01 — dual-client tests for reports / expenses / document_template_definitions
All RLS-enabled with full S/I/U/D owner policies (verified). Scoping:
- **reports** — DIRECT `owner_user_id`. Simple: ownerA inserts a report; ownerB cannot SELECT/UPDATE/DELETE it (0 rows / rejection); ownerA sees only their own.
- **document_template_definitions** — DIRECT `owner_user_id`. Same shape.
- **expenses** — INDIRECT via `maintenance_request_id` → `maintenance_requests.owner_user_id` (verified: the RLS + the expense RPCs all join `mr.owner_user_id = p_user_id`; expenses have NO direct owner column). So the fixture must create ownerA's chain: property → unit → maintenance_request → expense, then assert ownerB can't read/mutate the expense.

### TEST-02 — dual-client tests for the 4 join-policy child tables
All RLS-enabled; owner isolation is enforced via the parent chain (verified scoping cols):
- **property_images** — via `property_id` → properties.owner. Policies S/I/U/D.
- **inspection_rooms** — via `inspection_id` → inspections.owner. Policies S/I/U/D.
- **inspection_photos** — via `inspection_id` + `inspection_room_id`. Policies S/I/D only (NO UPDATE policy — do NOT test UPDATE; test SELECT/INSERT/DELETE isolation).
- **maintenance_request_photos** — via `maintenance_request_id` → maintenance_requests.owner. Policies S/I/D only (NO UPDATE — same).
Each test builds ownerA's full parent chain, inserts the child row as ownerA, then asserts ownerB is denied on every policy that exists for that table (read returns 0 rows; write rejected). Reuse the parent-chain fixture helpers from the sibling tests (properties/inspections/maintenance) — don't reinvent the chain setup.

### TEST-04 — SQLSTATE assertions + shared REVOKED_CODES helper
- **Extract `REVOKED_CODES`** (`["42501","42883","PGRST202"]` — or the exact current literal) to ONE shared test helper (e.g. `tests/integration/rls/_helpers/revoked-codes.ts` or the existing shared-helpers location — match the suite's convention). Consumed by ALL current duplicate sites — there are **5** (not 4): `funnel-admin-rpc.test.ts`, `admin-rpc-grants.rls.test.ts`, `rls-no-policy-lockdown.rls.test.ts`, `anon-rpc-grants.rls.test.ts`, `users-privileged-columns.rls.test.ts`. No duplicated code-list literal may remain.
- **Migrate message-string RLS-rejection assertions to `error.code` / SQLSTATE** at the audit-named sites: `dashboard-rpc-revenue-6mo.test.ts` (~:175/:180/:197/:198), `dashboard-rpc-open-maintenance.test.ts` (~:240), `bulk-import-create-lease.test.ts` (~:229/:248/:328). Read each: where it asserts on `error.message`/a message string for an RLS/permission rejection, switch to asserting `error.code` (SQLSTATE, e.g. `42501`) or membership in the shared `REVOKED_CODES`. If a site already asserts codes, leave it (note it). Goal: insulate from chai-6 / message-drift fragility (the canonical `funnel-admin-rpc.test.ts:81` code-assertion is the reference style).

### Constraints
- Integration tests authenticate two synthetic owners against PROD (`e2e-owner-a@tenantflow.app` / `e2e-owner-b@tenantflow.app` — NEVER personal creds). Supabase auth rate-limits sign-ins ~45/min — do NOT run the full suite repeatedly locally; one structural local run at most, else rely on the `rls-security` CI gate (which fails hard on missing secrets). Mirror the existing harness exactly.
- `afterAll` FK-safe cleanup (delete children before parents) so reruns don't accumulate rows or hit FK violations.
- Vitest-4/chai-6 gotcha: assert on `{ data, error }` tuples / `error.code`, not `.toThrow('string')`.
</decisions>

<canonical_refs>
## Canonical References
- **Dual-client harness + parent-chain fixtures:** `tests/integration/rls/stats-rpcs.rls.test.ts` (Phase-3, the recent dual-client template), `properties.rls.test.ts`, `inspections.rls.test.ts`, `maintenance.rls.test.ts`, `bulk-import-create-lease.test.ts` (the ownerA/ownerB client setup + chain builders).
- **SQLSTATE-code assertion reference:** `funnel-admin-rpc.test.ts:81` (asserts `error.code` membership).
- **The 5 REVOKED_CODES duplicate sites** (listed above) + wherever the suite keeps shared helpers (check for an existing `_helpers`/`setup` dir under `tests/integration/`).
- CLAUDE.md "Integration Test Coverage" + "RLS integration" sections.
</canonical_refs>

<specifics>
## Specific Ideas
- Probable plan split: 05-01 (TEST-01 direct+expense tests), 05-02 (TEST-02 four child-table tests), 05-03 (TEST-04 helper extract + SQLSTATE migration). 05-03 is independent of 05-01/02 (touches different files) → can parallelize.
- For photos tables (S/I/D-only), assert isolation on SELECT/INSERT/DELETE only — asserting a non-existent UPDATE policy would be a false test.
- Reuse, don't duplicate, the synthetic-owner auth client factory the sibling tests already import.
</specifics>

<deferred>
## Deferred Ideas
None — TEST-03 (auth/dollar-hook UNIT tests) is the SEPARATE Phase 6, not this phase.
</deferred>

---
*Phase: 05-cross-owner-rls-coverage*
*Context gathered: 2026-06-06 — live RLS-policy scoping paths verified; 7 target tables + 5 REVOKED_CODES dup sites + 3 message-string migration sites identified.*
