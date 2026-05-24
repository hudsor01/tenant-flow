---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T00:00:00Z
depth: deep
cycle: 7
files_reviewed: 13
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard-data.test.ts
  - src/components/dashboard/dashboard.tsx
  - src/hooks/api/query-keys/property-stats-keys.ts
  - src/hooks/api/use-owner-dashboard.ts
  - src/types/core.ts
  - src/types/database-rpc.ts
  - src/types/sections/dashboard.ts
  - supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql
  - supabase/migrations/20260523234221_phase2_property_perf_address_status_type.sql
  - supabase/migrations/20260524001408_phase2_dashboard_rpc_auth_guard.sql
  - tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
findings:
  critical: 0
  blocker: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
consecutive_zero_finding_cycles: 0
perfect_pr_gate: counter_reset
---

# Phase 2: Code Review Report — Cycle 7

**Reviewed:** 2026-05-23
**Depth:** deep
**Cycle:** 7
**Status:** issues_found

## Scope Note

Per the cycle-7 directive ("checklist item 11 — Phase 2 SUMMARY files: do they accurately reflect the final state after 4 fix passes?"), the three SUMMARY artifacts (`02-01-SUMMARY.md`, `02-02-SUMMARY.md`, `02-03-SUMMARY.md`) were also audited even though they sit outside the 13-file `files_reviewed_list`. The findings below come from that audit. The 13 code/SQL/test files themselves remain clean — see "Code-Surface Re-Audit" section.

---

## Code-Surface Re-Audit (Fresh Eyes, All 13 Files)

Independent re-grep across the 13 in-scope files, not from cycle-6's claims:

### Zero Tolerance Rules
- **`any` types:** zero hits across the 13 files (`grep -nE "\bany\b" --include=*.ts*` returned only the false-positive substrings inside string content like `'any-string'` in comments; no type-position `any`).
- **`as unknown as`:** zero hits. Only one match in `property-stats-keys.ts:35` and that's inside a JSDoc comment ("no `as unknown as` assertions") describing the absence.
- **Barrel files / re-exports:** none introduced. `use-dashboard-hooks.ts:118-121` `export type { … } from './use-owner-dashboard'` is a typed re-export of two type aliases — by convention this is treated as type-level forwarding, not a barrel file (no values re-exported, no `*` re-export, no `index.ts`).
- **Duplicate types:** five distinct `Property*Performance*` types serving five distinct seams — confirmed (RPC payload row, post-mapped domain shape, section-consumer shape, table row, view-model). Each has a JSDoc anchor.
- **Commented-out code:** none. SQL `--` lines in all three migrations are documentation, not commented SQL.
- **Inline styles:** none. All UI files use Tailwind utilities.
- **PostgreSQL ENUMs:** none. All `status` derivations use string literals + CASE expressions against text-with-CHECK columns.
- **Emojis in code:** none.
- **`@radix-ui/react-icons`:** no icon imports in the 13 files.
- **String literal query keys:** all dashboard query keys derive from `ownerDashboardKeys.*()` factories (verified at `use-owner-dashboard.ts:23-73`).

### D-01..D-06 Invariants
- **D-01 (drop collectionRate):** `grep -rn "collectionRate\|collection_rate" src/ tests/ supabase/migrations/` returns ZERO hits. Confirmed.
- **D-02 (additive shared-CTE migration):** all three Phase 2 migrations use `CREATE OR REPLACE FUNCTION`; shared-CTE invariant preserved (each base table scanned once); `perf_open_maintenance` joins `all_maintenance` → `maintenance_requests` via PK to recover `unit_id`.
- **D-03 (prod-reconciled filenames):** filenames in repo (`20260523223626`, `20260523234221`, `20260524001408`) are timestamp-monotonic and within the cycle-7 prod-recorded range. `list_migrations` reconciliation was performed at each apply step (per the 02-01-SUMMARY's documented sequence).
- **D-04 (dual-client RLS test):** `dashboard-rpc-open-maintenance.test.ts` has 2 `it` blocks (happy + isolation). Confirmed.
- **D-05 (prod-targeting):** test imports `createTestClient` from `tests/integration/setup/supabase-client.ts` which uses `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env vars — no `supabase start` / local stack assumption.
- **D-06 (sequence respected):** each migration was applied → reconciled → types regenerated → frontend wired → test extended. Verified via git log:
  - `cb39ab370 feat(02-01)` (migration + types)
  - `80bcef47d feat(02-02)` (frontend wiring)
  - `29524fcc5 test(02-03)` (integration test)
  - `7f64c1946 fix(02)` (cycle-1 follow-on)
  - `2ef51eaf4 fix(02)` (cycle-2 follow-on migration)
  - `2c80a8db1 fix(02)` (cycle-4 P0 fix)
  - `304aa222d fix(02)` (cycle-5 follow-on)

### Migration Safety Re-Audit (All Three)
- Each migration: `CREATE OR REPLACE FUNCTION`, signature `(p_user_id uuid) RETURNS jsonb`, `SECURITY DEFINER`, `SET search_path TO 'public'`, ends with GRANTs to `authenticated` + `service_role`. No DROP statements anywhere.
- Migration #3 cumulative end-state: auth guard (lines 22-27), address/property_type/status (lines 320-339), perf_open_maintenance CTE (lines 289-303). All preserved.

### Auth Guard Correctness (Migration #3)
- Position: lines 22-27, immediately after `begin` (line 21), before `with` (line 29). Correct.
- Pattern: `if p_user_id != (select auth.uid()) then raise exception 'Unauthorized'; end if;`. Exact byte-for-byte match against reference `20260306190000_consolidate_stats_rpcs.sql:17-18` and `:54-55`.
- Edge cases analyzed (cycle-6 verbatim, re-confirmed):
  - honest self-call → bypass → correct payload
  - cross-owner → raise `Unauthorized`
  - service_role (auth.uid() NULL) → bypass (intentional; service_role GRANT is project convention)

### Status Derivation Correctness
- SQL CASE expression in M#3:309-313 (and identical in M#2:309-313):
  ```sql
  case
    when coalesce(puc.total_units, 0) = 0 then 'NO_UNITS'
    when coalesce(puc.occupied_units, 0) = 0 then 'vacant'
    when puc.occupied_units = puc.total_units then 'FULL'
    else 'PARTIAL'
  end
  ```
- JS reference at `property-stats-keys.ts:47-56`:
  ```typescript
  if (totalUnits === 0) status = "NO_UNITS";
  else if (occupiedUnits === 0) status = "vacant";
  else if (occupiedUnits === totalUnits) status = "FULL";
  else status = "PARTIAL";
  ```
- Walkthrough of all branches confirmed identical 4-way classification. NULL handling: `coalesce(puc.total_units, 0)` covers the left-join-miss case (property with zero units → 'NO_UNITS'). `count(*) filter` never returns NULL in postgres (returns 0 for zero matches), so `puc.occupied_units` is always non-NULL when the `puc` row exists. Exhaustive.

### Integration Test Rigor
- Happy path (lines 180-214): asserts 4 fields: `open_maintenance >= 1` (number), `address === '1 RPC St'`, `property_type === 'APARTMENT'`, `status === 'vacant'`. Fixture state matches: 1 unit, 0 leases → status=vacant; 1 open maintenance request → open_maintenance=1.
- Isolation (lines 220-240): strict `expect(data).toBeNull()` + `expect(error?.message).toBe("Unauthorized")` — strict equality.
- Fixture creation order (lines 58-155): property → unit → tenant → maintenance for owner A; property → unit for owner B. FK-correct.
- Cleanup order (lines 162-173): maintenance → tenant → unit → property. Reverse-FK-correct.
- No `any`, no `as unknown as`, no service-role key, no personal emails (synthetic `dashboard-rpc-test-tenant-a-${Date.now()}@example.com`).

### Unit Test Rigor
- `dashboard-data.test.ts`: 3 it-blocks — real value forwards (3), undefined-omission falls back to 0, row-order preserved across 3 properties. No `any`, no `as unknown as`.

### Type-System Contract
- `PropertyPerformanceRpcResponse` declares 13 fields (database-rpc.ts:23-37): property_name, property_id, total_units, occupied_units, vacant_units, occupancy_rate, annual_revenue, monthly_revenue, potential_revenue, address, property_type, status, open_maintenance — exact match against M#3's `jsonb_build_object` keys.
- `PropertyPerformance.open_maintenance?: number` in core.ts:347 (note: OPTIONAL) — see W-01 below for the documentation drift this creates.
- `mapPropertyPerformanceStatus` narrows raw string to typed union with defensive throw — verified.
- `DashboardMetrics.collectionRate` does NOT exist — verified via `grep`.

### End-to-End Data Flow Trace
1. RPC emits 13 keys per row → `PropertyPerformanceRpcResponse`
2. `fetchOwnerDashboardData` (use-owner-dashboard.ts:255-278) maps to `PropertyPerformance` (snake→camel hybrid; address→address_line1; status narrowed; open_maintenance with `?? 0` fallback)
3. `usePropertyPerformance` selector → raw passthrough
4. `page.tsx:95-108` re-maps to `PropertyPerformanceItem` (property_id→id, property→name, address_line1→address, open_maintenance→openMaintenance with `?? 0`)
5. `dashboard.tsx:87-102` inline-transforms to `PortfolioRow` (status NOT consumed here; leaseStatus is derived from occupancyRate, server-side `status` is Phase-3 wiring)
6. `PortfolioTable` consumes `PortfolioRow[]`

All 6 seams preserve `open_maintenance`. No value-loss seam. **No bug at the code surface.**

### Threat-Model Re-Verification
- Cross-owner exfil (cycle-4 P0): mitigated by guard. **Closed.**
- Type-contract lie (cycle-2): mitigated by M#2 emission. **Closed.**
- Fabrication (cycle-1): mitigated by optional `open_maintenance?` + `?? 0` read seam. **Closed.**
- Status throw (defense-in-depth): unreachable in normal operation because the server-derived CASE is closed. **Closed.**
- SQLi via `comment on function`: static literals only, no user input. **Closed.**
- Privilege escalation via SECURITY DEFINER: blocked by the auth.uid() guard for the `authenticated` role. **Closed.**

---

## Findings (SUMMARY-File Audit Per Cycle-7 Checklist #11)

### WR-01: `02-02-SUMMARY.md` has three claims that contradict the final state of the reviewed code

**File:** `.planning/phases/02-data-layer-rpc/02-02-SUMMARY.md`
**Severity:** WARNING

**Issue:**

The Plan 02-02 SUMMARY was written before cycle-1's fix pass (`7f64c1946 fix(02): close cycle-1 review findings`) which revised three decisions. The SUMMARY now misrepresents the final state on three points:

1. **Line 25** says:
   > `open_maintenance: number` added as a non-optional field at three type seams (PropertyPerformanceRpcResponse + PropertyPerformance + intermediate PropertyPerformanceItem...)

   But `src/types/core.ts:347` declares `open_maintenance?: number` — **optional** with the `?` marker. The cycle-1 fix narrowed the field on `PropertyPerformance` to optional (the JSDoc at lines 341-346 documents this explicitly: "Only `get_dashboard_data_v2` (via the Phase 2 `perf_open_maintenance` CTE) emits this field. Other RPCs that construct `PropertyPerformance` … do not carry maintenance counts; consumers that need the value MUST apply a `?? 0` fallback at the read seam"). The SUMMARY's "non-optional at three type seams" claim is false for one of the three seams.

2. **Line 26** says:
   > Defensive coalesce only at the RPC mapper boundary (`row.open_maintenance ?? 0` at use-owner-dashboard.ts:249) — downstream reads receive a guaranteed `number`, no redundant fallbacks.

   But `dashboard-data.ts:77` reads `prop.open_maintenance ?? 0` — a second downstream `?? 0` fallback. This is correct given the field is now optional (per finding 1), but it directly contradicts the SUMMARY's "no redundant fallbacks" claim and "downstream reads receive a guaranteed `number`" framing.

3. **Lines 91-94 ("Transitive Closeout")** say:
   > Resolution: added `open_maintenance: 0` to the returned object.

   But the final state of `src/hooks/api/query-keys/property-stats-keys.ts:85-89` shows `open_maintenance` is **deliberately omitted** from the returned object, with a 5-line justifying comment ("`open_maintenance` deliberately omitted — the `get_property_performance_with_trends` RPC does not carry maintenance counts. Consumers of this surface that need the value must source it from `get_dashboard_data_v2` instead"). The cycle-1 fix replaced the placeholder `0` with deliberate omission once the field became optional. The SUMMARY records the OLD resolution.

**Why this matters:**

These three SUMMARY claims are the executor's contemporaneous record of architectural decisions. The audit trail says one thing; the code says another. Future readers tracing why `open_maintenance` is optional, why two `?? 0` fallbacks exist, or why `mapPerformanceRow` omits the field will hit a contradiction between the SUMMARY and the code. Phase-1's audit trail discipline ("WR-01 restored explanatory comments because cycle-3's strip-down lost the design rationale") applies here too — SUMMARY content is part of the design rationale chain.

**Fix:**

Update the three claims in `02-02-SUMMARY.md`:

```markdown
- "D-02 frontend wiring: `open_maintenance: number` added at PropertyPerformanceRpcResponse (required) + PropertyPerformanceItem (required); narrowed to optional `open_maintenance?: number` at PropertyPerformance after cycle-1 review surfaced that `mapPerformanceRow` for `get_property_performance_with_trends` cannot produce the field (that RPC carries no maintenance data)."
- "Defensive coalesce applied at two seams: (a) RPC mapper boundary `row.open_maintenance ?? 0` at use-owner-dashboard.ts:277 (post-rename), (b) page.tsx:106 re-map `prop.open_maintenance ?? 0` and dashboard-data.ts:77 read-seam fallback — both required by the field being optional on PropertyPerformance after cycle-1."
```

And rewrite the Transitive Closeout (lines 91-96):

```markdown
## Transitive Closeout (out of plan scope)

`src/hooks/api/query-keys/property-stats-keys.ts` constructs a `PropertyPerformance` from a different RPC (`get_property_performance_with_trends`) which does not carry per-property maintenance counts. After Task 1 attempted to make `open_maintenance` non-optional on `PropertyPerformance`, this site failed TS2741. The cycle-1 review fix changed the resolution: `open_maintenance` was narrowed to `open_maintenance?: number` (optional) at the type level, and `mapPerformanceRow` now deliberately omits the field rather than fabricating a `0`. Consumers needing the value must source it from `get_dashboard_data_v2` and apply a `?? 0` fallback at the read seam (`dashboard-data.ts:77`, `page.tsx:106`).
```

### WR-02: `02-03-SUMMARY.md` describes the pre-cycle-4 test assertion

**File:** `.planning/phases/02-data-layer-rpc/02-03-SUMMARY.md`
**Severity:** WARNING

**Issue:**

The Plan 02-03 SUMMARY was written before cycle-4's P0 fix (`2c80a8db1 fix(02): close cycle-4 P0 security finding`). At write-time, Test 2 asserted `property_performance === []` (the RPC's owner-filter chain returned an empty array for cross-owner calls). After cycle-4 added the auth guard, Test 2 now asserts `data === null` + `error.message === 'Unauthorized'`. The SUMMARY records the OLD behavior in two places:

1. **Lines 16, 94-95**:
   > (2) isolation — ownerA passing ownerB's user_id receives empty property_performance.
   > ...
   > it("returns empty property_performance when ownerA passes ownerB's user_id (RLS-via-owner-filter)", ...)
   > └── Assertion: property_performance === []

   But the actual test name (`tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:220`) is:
   ```ts
   it("rejects cross-owner calls with Unauthorized (SECURITY DEFINER auth.uid() guard)", ...)
   ```
   And the assertion is `expect(error?.message).toBe("Unauthorized")`, not `=== []`.

2. **Lines 102-104 ("Threat Model Verification" table)**:
   > T-02-10 EOP via arbitrary `p_user_id` | mitigated | Test 2 asserts empty result for cross-owner queries...
   > T-02-11 Cross-tenant data leakage | mitigated | ...ownerA passing ownerB's id sees nothing.

   These describe the weaker (pre-cycle-4) mitigation. The actual mitigation is stronger: the RPC now raises `Unauthorized` at function-body top, *before* any data access — which is what a SECURITY DEFINER bypassing RLS requires to be defensible. The mitigation is correct in fact, but the SUMMARY's description of HOW it's mitigated is stale.

**Why this matters:**

Anyone reading the audit trail later (perfect-PR cycle audit, post-merge incident review, future security audit) will read the SUMMARY's Test 2 description and look in the test file for an `=== []` assertion they will not find. The cycle-4 P0 fix was the most significant Phase-2 finding — silently swapping which assertion the SUMMARY records erases the audit-trail signal that cycle-4 changed the security model.

**Fix:**

Update `02-03-SUMMARY.md`:

1. Lines 16, 94-95: change "isolation — ownerA passing ownerB's user_id receives empty property_performance" → "isolation — ownerA passing ownerB's user_id is rejected with `Unauthorized` (the cycle-4 auth.uid() guard added in migration 20260524001408 blocks the call at function-body top before any data access). The cycle-4 fix replaced the weaker 'owner-filter chain returns empty array' mitigation with an explicit raise."
2. Lines 102-104: rewrite the T-02-10 / T-02-11 evidence cells to point at the auth-guard raise rather than the empty array.
3. Add a "Cycle-4 P0 Fix" subsection just above "Carry-forward" capturing the migration name and the assertion change.

### IN-01: `02-03-SUMMARY.md` T-02-12 row says "5 rows" but lists 6

**File:** `.planning/phases/02-data-layer-rpc/02-03-SUMMARY.md:105`
**Severity:** INFO

**Issue:**

The Threat Model Verification row for T-02-12 reads:

> `afterAll` deletes 5 rows (1 maintenance, 1 tenant, 1 unitA, 1 propertyA, 1 unitB, 1 propertyB) in correct dependency order.

The parenthetical lists six items (maintenance, tenant, unitA, propertyA, unitB, propertyB) but the lead-in claims five. Reading the test file `afterAll` (lines 162-173) confirms six deletes (maintenance + tenant + unitA + propertyA + unitB + propertyB). The total should read "6 rows" not "5 rows."

**Fix:**

Change line 105 of `02-03-SUMMARY.md`:
```
| T-02-12 Fixture leaks into prod analytics | mitigated | `afterAll` deletes 6 rows (1 maintenance, 1 tenant, 1 unitA, 1 propertyA, 1 unitB, 1 propertyB) in correct dependency order. CI will surface any cleanup failure. |
```

---

## Cycle-6 Claims — Independent Re-Verification

Cycle-6's body was re-walked end-to-end. One numerical claim was found stale but not material to the code surface:

- **Cycle-6 line 68** claims: "Structural diff M#2 vs M#3 (`diff` line-count: 39)". Actual `diff -u | wc -l` = 95. Qualitative conclusion ("the only behavioural delta is the 6-line auth-guard block insertion") was verified independently in this cycle (see the diff inline). The number is wrong; the conclusion is right. Not a finding against the code, noted for the audit trail.

All other cycle-6 claims (auth-guard position, status-CASE exhaustiveness, fixture FK ordering, end-to-end trace, integration test assertions, comment-block syntactic position, GRANT preservation) re-verified clean.

---

## Audit Trail (cycles 1-7)

| Cycle | Findings | Notable |
|---|---|---|
| 1 | issues_found | Address/property_type/status declared in `PropertyPerformanceRpcResponse` but never emitted by RPC; cycle-1 typed status mapper upgraded silent coercion to runtime throw → P0 dashboard regression. |
| 2 | issues_found | Migration #2 fixed the type-contract lie — RPC now emits address, property_type, and a server-derived `status` from a closed CASE expression. |
| 3 | issues_found | Selector composition removed `transformDashboardData(data)` to fix double-map; transform survives as Phase-3 seam, pinned by unit test. |
| 4 | issues_found (P0) | Cross-owner data exfil — SECURITY DEFINER trusted `p_user_id` without `auth.uid()` check. Migration #3 added the guard. |
| 5 | issues_found (W1 + I2) | Migration #3 stripped explanatory comments from Migration #2; mapper JSDoc didn't anchor closed-set source; test regex was too loose. All three fixed. |
| 6 | clean | Cycle-5 fixes verified. Fresh adversarial sweep over Zero Tolerance Rules, all three migrations, auth guard threat-model, end-to-end data flow trace, integration + unit test rigor, and fresh-eyes pass surface zero defects. |
| 7 | **issues_found (W2 + I1)** | **Code surface clean**; SUMMARY-file audit (per cycle-7 checklist item 11) surfaced 3 audit-trail defects: `02-02-SUMMARY.md` records pre-cycle-1 resolution on `open_maintenance` typing + transitive closeout (WR-01); `02-03-SUMMARY.md` describes pre-cycle-4 test assertion semantics (WR-02); `02-03-SUMMARY.md` T-02-12 row math error (IN-01). |

---

## Gate Status

- Cycle 7: **3 findings** (2 WARNING + 1 INFO) — all in SUMMARY documentation, none in code/SQL/tests
- `consecutive_zero_finding_cycles`: **0** (counter reset)
- Perfect-PR gate: **counter reset to 0 of 2**

**Rationale for counter reset:** The user's directive for cycle 7 explicitly placed the SUMMARY files in scope ("checklist item 11 — do they accurately reflect the final state after 4 fix passes?"). They do not. Under the user's exhaustive-coverage standard ("ZERO DISMISSALS"), audit-trail defects count as findings. The user previously closed a cycle-5 WARNING for the same class of defect (stripped comments in Migration #3) — applying that precedent uniformly to SUMMARY files.

**Code surface itself is clean.** All 13 in-scope source files (RPCs, frontend, types, tests) pass the deep audit with zero findings — same as cycle 6. The phase's *implementation* is merge-ready; only the planning-artifact narrative needs to catch up to the post-fix-pass reality.

**Path to merge:**
1. Fix the 3 SUMMARY-file findings (WR-01, WR-02, IN-01) above. These are pure documentation edits — no code change.
2. Run cycle 8 → likely zero findings → counter advances to 1 of 2.
3. Run cycle 9 → zero findings → counter advances to 2 of 2 → gate satisfied → merge.

If the user explicitly considers SUMMARY-file staleness outside the perfect-PR gate (i.e., a planning-artifact concern, not a code concern), they can re-classify these findings as "audit-trail-only, no gate impact" — in which case the counter stays at cycle-6's `1 of 2` and one more zero-finding code cycle satisfies the gate. That re-classification is their call, not the reviewer's — the cycle-7 directive's text ("If ANY findings: list everything. Counter resets to 0.") does not carve out a SUMMARY-file exception.

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
