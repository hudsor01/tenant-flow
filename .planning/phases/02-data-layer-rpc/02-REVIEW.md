---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T00:00:00Z
depth: deep
cycle: 8
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
  info: 4
  total: 6
status: issues_found
consecutive_zero_finding_cycles: 0
perfect_pr_gate: counter_reset
---

# Phase 2: Code Review Report — Cycle 8

**Reviewed:** 2026-05-23
**Depth:** deep
**Cycle:** 8
**Status:** issues_found

## Scope Note

Per the cycle-8 directive ("hunt for what cycle 6+7 missed", "fresh independent eyes", "ZERO DISMISSALS"), the three SUMMARY artifacts remain in scope alongside the 13 code/SQL/test files. The 13 code/SQL/test files themselves remain clean — see "Code-Surface Re-Audit" below. The findings this cycle surfaced are:

1. **WR-01**: Cycle-7's WR-01 fix for `02-02-SUMMARY.md` was incomplete — the frontmatter `decisions` block was rewritten but the body's "Transitive Closeout" section (lines 90-96) still records the pre-cycle-1 resolution ("Resolution: added `open_maintenance: 0`"). The frontmatter and body now directly contradict each other within the same document.
2. **WR-02**: Multiple stale line-number citations across all three SUMMARY files. Cycle-7 retained line numbers like `use-owner-dashboard.ts:249` that were correct at cycle-1 write time but have since drifted by 28 lines (mapper fallback is now at line 277). Same class of defect across `02-01-SUMMARY` (lines 42, 131-134), `02-02-SUMMARY` (lines 26, 65, 66), and minor in source JSDoc.
3. **IN-01..IN-04**: line-number drift in source-code JSDoc comments + 02-01-SUMMARY plan-time references.

These are textbook "what cycle 6+7 missed" defects — exactly the class the cycle-8 directive flagged ("anything that points to a stale line number or filename").

---

## Code-Surface Re-Audit (Fresh Eyes, All 13 Files)

Independent re-grep across the 13 in-scope files, not from prior-cycle claims:

### Zero Tolerance Rules
- **`any` types:** zero hits across the 13 files. Independent grep `grep -nE "\bany\b"` against all 13 files returned no matches.
- **`as unknown as`:** zero hits. Single match in `property-stats-keys.ts:35` is inside a JSDoc comment ("no `as unknown as` assertions") describing the absence.
- **Barrel files / re-exports:** none introduced.
- **Duplicate types:** five distinct `Property*Performance*` types serving five distinct seams — confirmed (RPC payload row, post-mapped domain shape, section-consumer shape, table row, view-model). Each has a JSDoc anchor.
- **Commented-out code:** none. SQL `--` lines in all three migrations are documentation, not commented SQL.
- **Inline styles:** none. All UI files use Tailwind utilities.
- **PostgreSQL ENUMs:** none. All `status` derivations use string literals + CASE expressions against text-with-CHECK columns.
- **Emojis in code:** none.
- **`@radix-ui/react-icons`:** no icon imports in the 13 files.
- **String literal query keys:** all dashboard query keys derive from `ownerDashboardKeys.*()` factories.
- **TODO/FIXME/XXX/HACK:** zero matches across all 13 files.
- **console.log/debugger:** one `console.warn` at `dashboard-rpc-open-maintenance.test.ts:182` inside the "Skipping: fixtures not created" branch — intentional skip notice, not a defect.

### D-01..D-06 Invariants
- **D-01 (drop collectionRate):** `grep -rn "collectionRate\|collection_rate" src/ tests/ supabase/migrations/` returns ZERO hits. Confirmed.
- **D-02 (additive shared-CTE migration):** all three migrations use `CREATE OR REPLACE FUNCTION`; shared-CTE invariant preserved; `perf_open_maintenance` joins `all_maintenance` → `maintenance_requests` via PK to recover `unit_id`.
- **D-03 (prod-reconciled filenames):** filenames in repo are timestamp-monotonic; `list_migrations` reconciliation was performed at each apply step.
- **D-04 (dual-client RLS test):** test has 2 `it` blocks (happy + isolation). Confirmed.
- **D-05 (prod-targeting):** test uses `createTestClient` from `tests/integration/setup/supabase-client.ts` with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env vars.
- **D-06 (sequence respected):** verified via git log.

### Migration Safety Re-Audit
- Each migration: `CREATE OR REPLACE FUNCTION`, signature `(p_user_id uuid) RETURNS jsonb`, `SECURITY DEFINER`, `SET search_path TO 'public'`, ends with GRANTs to `authenticated` + `service_role`. No DROP statements anywhere.
- Migration #3 cumulative end-state: auth guard (lines 22-27), address/property_type/status (lines 320-339), perf_open_maintenance CTE (lines 289-303). All preserved.

### Auth Guard Correctness (Migration #3)
- Position: lines 22-27, immediately after `begin`, before `with`. Correct.
- Pattern: `if p_user_id != (select auth.uid()) then raise exception 'Unauthorized'; end if;`. Matches reference pattern.
- Edge cases (re-confirmed): honest self-call → bypass → correct payload; cross-owner → raise `Unauthorized`; service_role → bypass (intentional).

### Status Derivation Correctness
- SQL CASE expression in M#3:334-339 and JS reference at `property-stats-keys.ts:47-56`. Walkthrough of all 4 branches confirmed identical classification. NULL handling exhaustive.

### Integration Test Rigor
- Happy path: asserts 4 fields (open_maintenance >= 1, address, property_type, status). Fixture state matches: 1 unit, 0 leases → status=vacant; 1 open maintenance request → open_maintenance=1.
- Isolation: strict `expect(data).toBeNull()` + `expect(error?.message).toBe("Unauthorized")` — strict equality.
- FK ordering: create property → unit → tenant → maintenance; cleanup reverse. Correct.

### Unit Test Rigor
- `dashboard-data.test.ts`: 3 it-blocks. No `any`, no `as unknown as`. Clean.

### End-to-End Data Flow Trace (Real Property Walk-Through)

Walking a real property row through all 5 seams:

1. **RPC row emitted** (`get_dashboard_data_v2`, M#3:307-345) — 13 keys including `open_maintenance`, `address`, `property_type`, server-derived `status`.
2. **Mapper boundary** (`use-owner-dashboard.ts:255-278`) — narrows to `PropertyPerformance`. `mapPropertyPerformanceStatus` validates `status` against closed union; `open_maintenance: row.open_maintenance ?? 0` applies the deploy-order-safe fallback at line 277.
3. **Hook surface** (`usePropertyPerformance`) — raw passthrough.
4. **Page re-map** (`page.tsx:95-108`) — re-shapes to `PropertyPerformanceItem`: `openMaintenance: prop.open_maintenance ?? 0` at line 106.
5. **Dashboard inline transform** (`dashboard.tsx:87-102`) — re-shapes to `PortfolioRow`: `maintenanceOpen: prop.openMaintenance` at line 101.
6. **PortfolioTable consumes `PortfolioRow[]`** — renders the column.

All seams preserve `open_maintenance`. Two `?? 0` fallbacks correctly guard the optional-field shape. **No defect at the code surface.**

### Threat-Model Re-Verification
All cycle-1..cycle-5 threats re-verified closed. No regression introduced by cycles 6 or 7's documentation-only commits.

---

## Findings (SUMMARY-File & JSDoc Stale-Reference Audit)

### WR-01: `02-02-SUMMARY.md` body "Transitive Closeout" section still records pre-cycle-1 resolution — cycle-7 fix landed in frontmatter only

**File:** `.planning/phases/02-data-layer-rpc/02-02-SUMMARY.md:88-96`
**Severity:** WARNING

**Issue:**

Cycle-7's WR-01 fix was supposed to rewrite the "Transitive Closeout" section so the body matched the frontmatter's `decisions:` block (which was updated). The frontmatter at line 28 now correctly says:

> "Cycle-1 fix REMOVED the line entirely and widened PropertyPerformance.open_maintenance to optional so the consumer can legitimately omit the field. `get_property_performance_with_trends` does not carry maintenance counts; omitting the field is the honest contract."

But the body section at lines 90-96 STILL reads:

> ## Transitive Closeout (out of plan scope)
>
> `src/hooks/api/query-keys/property-stats-keys.ts:85` constructs a `PropertyPerformance` from a different RPC (`get_property_performance_with_trends`) and was not listed in the plan's `files_modified` array. After Task 1 made `open_maintenance` non-optional on `PropertyPerformance`, this site failed TS2741.
>
> Resolution: added `open_maintenance: 0` to the returned object. The alternative RPC does not return maintenance counts; this consumer is not part of the dashboard pipeline (it powers a separate analytics surface). The placeholder is correct until either (a) the alternative RPC gains the field, or (b) this consumer is rewritten to use `get_dashboard_data_v2`.
>
> This is a typecheck-required, scope-adjacent edit — not a deviation from the plan's locked decisions. Captured in the `decisions:` block of the frontmatter.

Verified against the actual code: `property-stats-keys.ts:70-90` (current `mapPerformanceRow`) shows `open_maintenance` is **deliberately omitted** with a 5-line justifying comment ("`open_maintenance` deliberately omitted — the `get_property_performance_with_trends` RPC does not carry maintenance counts").

**Verified via diff:** `git show ff23696f6 -- .planning/phases/02-data-layer-rpc/02-02-SUMMARY.md` shows cycle-7 updated only the YAML frontmatter (lines 14-28 in the diff), not the markdown body. The body section was missed.

**Why this matters:**

The cycle-7 fix explicitly listed this as a WR-01 sub-item. The directive for cycle-8 named it: *"02-02-SUMMARY.md `key-files.modified` and `decisions` now reflect post-cycle-1 reality… `property-stats-keys.ts:85` no longer fabricates `: 0` (line was removed in cycle-1 fix)"*. The frontmatter was fixed; the body was not. The document now internally contradicts itself — the frontmatter's `decisions` block says one thing and the body's "Transitive Closeout" section says the opposite, in the same file. Anyone reading the SUMMARY linearly will hit the contradiction.

This is the cycle-8 "fresh eyes catches what cycle 7 missed" defect class explicitly.

**Fix:**

Rewrite `02-02-SUMMARY.md` lines 88-96 to match the frontmatter:

```markdown
## Transitive Closeout (out of plan scope)

`src/hooks/api/query-keys/property-stats-keys.ts` constructs a `PropertyPerformance` from a different RPC (`get_property_performance_with_trends`) which does not carry per-property maintenance counts. After Task 1 attempted to make `open_maintenance` non-optional on `PropertyPerformance`, this site failed TS2741.

The cycle-1 review fix changed the resolution: `open_maintenance` was narrowed to `open_maintenance?: number` (optional) at the `PropertyPerformance` type, and `mapPerformanceRow` now deliberately OMITS the field rather than fabricating a placeholder `0`. Consumers needing the value must source it from `get_dashboard_data_v2` and apply a `?? 0` fallback at the read seam (`dashboard-data.ts:77`, `page.tsx:106`). This avoids the same fabrication anti-pattern D-01 just removed for `collectionRate` — `0` would have been indistinguishable from "no data".

The original closeout (added `open_maintenance: 0`) is preserved here for audit-trail context, but the FINAL state of `property-stats-keys.ts:70-90` is field-omission with a 5-line justifying comment anchoring the contract.
```

### WR-02: Multiple stale line-number citations across `02-01-SUMMARY.md` and `02-02-SUMMARY.md` after code drifted

**File:** `.planning/phases/02-data-layer-rpc/02-01-SUMMARY.md`, `02-02-SUMMARY.md`
**Severity:** WARNING

**Issue:**

The cycle-8 directive checklist explicitly asks: *"Any reference in any file (code, test, SQL, SUMMARY) that points to a stale line number or filename?"* — and the answer is yes, multiple times.

**02-02-SUMMARY.md** (cycle-7 retained pre-rewrite line numbers — these were correct at cycle-1 write time but drifted as cycle-1+5 fixes added comments and the JSDoc on `PropertyPerformance.open_maintenance`):

| Claim | Actual current line |
|-------|---------------------|
| Line 26: `row.open_maintenance ?? 0` at `use-owner-dashboard.ts:249` | **line 277** (off by 28) |
| Line 26: `prop.open_maintenance ?? 0` at `page.tsx:107` | **line 106** (off by 1) |
| Line 26: `prop.open_maintenance ?? 0` at `dashboard-data.ts:68` | **line 77** (off by 9) |
| Line 65: Mapper at `use-owner-dashboard.ts:249` | **line 277** (off by 28) |
| Line 66: `dashboard-data.ts:64` reads `prop.open_maintenance` | **line 77** (off by 13) |
| Line 66: `dashboard.tsx:101` reads `prop.openMaintenance` | line 101 ✓ correct |

**02-01-SUMMARY.md** (was never updated to reflect post-cycle-1+5 final state; the cycle-8 directive specifically asks "02-01-SUMMARY: still accurate after cycle-2 migration added 3 more keys + cycle-4 added auth guard?"):

| Line 42 / 131-134 carry-forward references | Status |
|-------|--------|
| `dashboard-data.ts:64` `transformDashboardData` reads `prop.open_maintenance` | now line 77 (off by 13) |
| `dashboard.tsx:101` inline transform | line 101 ✓ correct |
| `page.tsx:108` re-mapper | now line 106 (off by 2) |
| `use-owner-dashboard.ts:232-249` mapper | now lines ~255-278 (off by ~25) |

**Verified by independent grep:**

```bash
$ grep -n "open_maintenance: row.open_maintenance" src/hooks/api/use-owner-dashboard.ts
277:		open_maintenance: row.open_maintenance ?? 0,

$ grep -n "openMaintenance: prop.open_maintenance" src/app/\(owner\)/dashboard/page.tsx
106:			openMaintenance: prop.open_maintenance ?? 0,

$ grep -n "maintenanceOpen: prop.open_maintenance" src/components/dashboard/dashboard-data.ts
77:		maintenanceOpen: prop.open_maintenance ?? 0,
```

The `02-01-SUMMARY.md` lines 80-83 historical narrative ("Four hardcoded-zero sites in the original codebase: 1. `dashboard-data.ts:64` `maintenanceOpen: 0`...") is arguably defensible as a pre-change record, but lines 26 and 65 in `02-02-SUMMARY.md` are framed as current-state claims and ARE wrong against the current code.

**Why this matters:**

The phase-1 perfect-PR gate precedent (cycle-7 surfaced stale line numbers in summaries as findings) applies here. Future auditors tracing the seam will jump to the cited line and find unrelated code (e.g., `use-owner-dashboard.ts:249` is inside the `ts_occupancy` JSONB block, not the property_performance mapper). The "anything that points to a stale line number" item in the cycle-8 directive checklist explicitly names this defect class.

**Fix:**

Either (a) update the SUMMARY line numbers to current values:
- `use-owner-dashboard.ts:249` → `use-owner-dashboard.ts:277`
- `page.tsx:107` → `page.tsx:106`
- `dashboard-data.ts:68` → `dashboard-data.ts:77`
- `dashboard-data.ts:64` → `dashboard-data.ts:77`
- `page.tsx:108` → `page.tsx:106`
- `use-owner-dashboard.ts:232-249` → `use-owner-dashboard.ts:255-278`

Or (b) drop the specific line numbers from the SUMMARY claims and refer to the function/file by name only — line-number-free references don't go stale on subsequent edits. This is the more durable fix and the same convention CLAUDE.md uses ("Browse `src/hooks/api/query-keys/` for the current factory list (it grows)") to avoid drift-prone exhaustive lists.

### IN-01: `dashboard-data.ts` JSDoc comment cites `dashboard.tsx:86-103` and `page.tsx:97-110` — both ranges off

**File:** `src/components/dashboard/dashboard-data.ts:44-46`
**Severity:** INFO

**Issue:**

The JSDoc block on `transformDashboardData` says:

> The live `/dashboard` page uses an inline transform in `dashboard.tsx:86-103` plus a re-mapper in `page.tsx:97-110`.

Verified actual ranges:
- Inline transform `const portfolioData: PropertyPerformance[] = propertyPerformance.map(...)` spans **lines 87-102** in `dashboard.tsx` (the JSDoc says 86-103 — off by 1 on both boundaries).
- Re-mapper `const propertyPerformance = (() => { ... })()` IIFE spans **lines 95-108** in `page.tsx`, with the inner `.map()` block at 98-107 (the JSDoc says 97-110 — off by 2-3 on both boundaries).

Independent grep:
```bash
$ grep -n "const portfolioData: PortfolioRow\[\] = propertyPerformance.map" src/components/dashboard/dashboard.tsx
87:	const portfolioData: PortfolioRow[] = propertyPerformance.map((prop) => ({

$ grep -n "const propertyPerformance = (() =>" src/app/\(owner\)/dashboard/page.tsx
95:	const propertyPerformance = (() => {
```

**Fix:**

Update the JSDoc to either correct ranges (`87-102`, `95-108`) or — preferably — drop line ranges entirely and refer to the symbol names. The symbols (`portfolioData` const in `dashboard.tsx`; `propertyPerformance` IIFE in `page.tsx`) are stable; the line numbers are not.

### IN-02: `dashboard-data.test.ts` comment cites `dashboard.tsx:86-102` — off by 1 on the opening boundary

**File:** `src/components/dashboard/dashboard-data.test.ts:11`
**Severity:** INFO

**Issue:**

Module-level docstring says:

> The live `/dashboard` page does NOT consume `transformDashboardData` today — it uses an inline transform in `dashboard.tsx:86-102` plus a re-mapper in `page.tsx:97-110`.

Same defect class as IN-01: actual ranges are `dashboard.tsx:87-102` (open boundary off by 1) and `page.tsx:95-108` (off by 2 on open). This is a near-duplicate of the JSDoc cited at IN-01 — likely copied between files. Both should be reworded together.

**Fix:**

Same as IN-01 — replace line ranges with stable symbol references (`portfolioData` const + `propertyPerformance` IIFE).

### IN-03: `02-01-SUMMARY.md` carry-forward references stale line numbers from planning-time positions

**File:** `.planning/phases/02-data-layer-rpc/02-01-SUMMARY.md:42,131-134`
**Severity:** INFO

**Issue:**

The cycle-8 directive explicitly asks: *"02-01-SUMMARY: still accurate after cycle-2 migration added 3 more keys + cycle-4 added auth guard?"* — the answer is partially. The outcome section at line 42 says:

> Frontend consumers (plan 02-02) will wire this end-to-end to retire the hardcoded `0`s in `dashboard-data.ts:64`, `dashboard.tsx:101`, and `page.tsx:108`.

Two of the three references are stale against the current code:
- `dashboard-data.ts:64` — now line 77 (off by 13)
- `page.tsx:108` — now line 106 (off by 2)
- `dashboard.tsx:101` — correct ✓

The Carry-forward section (lines 131-134) repeats the same line numbers in the wiring-target list. While these references describe planning-time positions (so are arguably defensible as "what the plan-02-02 author started with"), the carry-forward is framed as a forward pointer — when plan-02-02 is read after merge, the reader will jump to line 64 of `dashboard-data.ts` and find the wrong code.

**Fix:**

Add a "Post-cycle-1 final state" footnote pointing to the current line numbers, or drop the line numbers in favor of symbol references (`transformDashboardData` body, inline `portfolioData` const, `propertyPerformance` IIFE). The latter is more durable.

### IN-04: `02-01-SUMMARY.md` Success Criteria table omits cycle-4 auth-guard work and lists SC #3/#4 as "NOT YET (plan 02-03 scope)"

**File:** `.planning/phases/02-data-layer-rpc/02-01-SUMMARY.md:113-118`
**Severity:** INFO

**Issue:**

The Success Criteria table in `02-01-SUMMARY.md` reads:

| SC | Status | Notes |
|----|--------|-------|
| #1 Real per-property `open_maintenance` in RPC | DONE (schema half) | ... |
| #2 No hardcoded `0` for `collectionRate` | NOT YET ... |
| #3 Dual-client RLS test in `tests/integration/rls/` | NOT YET (plan 02-03 scope) | Plan 02-03 closes this. |
| #4 `bun run test:integration` passes | NOT YET (plan 02-03 scope) | Plan 02-03 closes this. |

This was accurate at plan-01 write time but is now stale — plan-02-02 and plan-02-03 are both completed, and the cycle-4 P0 auth-guard migration `20260524001408` is also shipped. The cycle-8 directive checklist asks "01-SUMMARY: still accurate after cycle-2 migration added 3 more keys + cycle-4 added auth guard?" — and the table doesn't mention the auth guard at all.

This is arguably acceptable as a "this plan's contemporaneous record" (plan 01 was the schema-half only; the auth guard is in migration #3 attached to plan 03 via cycle-4 fix). But for an audit trail readable by an outside reviewer, the SUMMARY should note that plan-02-01 originally shipped only the additive `perf_open_maintenance` CTE — the same `get_dashboard_data_v2` function was subsequently amended twice more (in cycles 2 and 4) to fix issues discovered downstream.

**Fix:**

Add a single "Post-cycle audit trail" note after the Success Criteria table:

> **Post-cycle audit trail:** This plan shipped the additive `perf_open_maintenance` CTE in migration `20260523223626`. Two subsequent migrations amended the same `get_dashboard_data_v2` function: `20260523234221` (cycle-2 fix — emit address, property_type, server-derived status to close a pre-existing type-contract lie surfaced by the cycle-1 typed status mapper) and `20260524001408` (cycle-4 P0 fix — add `auth.uid() = p_user_id` guard; SECURITY DEFINER bypasses RLS so caller-asserted `p_user_id` cannot be trusted as scope). The final RPC state lives in migration #3 and is pinned by the integration test `dashboard-rpc-open-maintenance.test.ts`.

---

## Migration Consolidation Question (Cycle-8 Checklist Item 8)

The cycle-8 directive asks: *"Are all 3 migrations necessary or could the final state be expressed as one migration? Audit trail value of incremental migrations vs. single-shot — likely incremental wins, but worth explicit note."*

**Disposition:** Keep all 3. Rationale:

1. **Migration #1 (`20260523223626`)** was applied to prod via MCP on cycle-1 and reconciled via `list_migrations`. It is part of the public migration history.
2. **Migration #2 (`20260523234221`)** was applied separately on cycle-2 to fix the address/property_type/status emission. Squashing it into #1 would require rewriting history — not viable.
3. **Migration #3 (`20260524001408`)** was applied on cycle-4 to add the auth guard. Same constraint.

Squashing in-flight would require resetting prod and re-applying, which the project convention strictly prohibits (CLAUDE.md: "Migrations applied via Supabase MCP `apply_migration` get prod-assigned timestamps that may not match the repo filename — always reconcile via `mcp__supabase__list_migrations` after MCP applies"). The audit-trail value of three incremental migrations is also real: each migration's comment block names the cycle that motivated it, making the history self-documenting. Recommendation: leave as-is.

Not a finding — explicit disposition for the audit trail.

---

## Cycle-6/7 Claims — Independent Re-Verification

Re-walked cycle-6 and cycle-7 review bodies end-to-end:

- All cycle-6 claims about code-surface clean state re-verified. No regression introduced by cycle-6/7's documentation-only commits.
- Cycle-7 claims about SUMMARY-file findings were independently re-confirmed against the cycle-7 fix commit (`ff23696f6`). Diff shows the fix updated frontmatter blocks in both SUMMARY files but only one body section in `02-03-SUMMARY.md` (the IN-01 6-rows enumeration); the corresponding `02-02-SUMMARY.md` "Transitive Closeout" body section was NOT updated — see WR-01 above.
- Cycle-7 documented a numerical claim ("diff M#2 vs M#3 line-count: 39") that was off (`diff -u | wc -l` = 95). Cycle-7 self-noted this; not re-counted as a defect.

---

## Audit Trail (cycles 1-8)

| Cycle | Findings | Notable |
|---|---|---|
| 1 | issues_found | Address/property_type/status declared in `PropertyPerformanceRpcResponse` but never emitted by RPC; cycle-1 typed status mapper upgraded silent coercion to runtime throw → P0 dashboard regression. |
| 2 | issues_found | Migration #2 fixed the type-contract lie — RPC now emits address, property_type, and a server-derived `status` from a closed CASE expression. |
| 3 | issues_found | Selector composition removed `transformDashboardData(data)` to fix double-map; transform survives as Phase-3 seam, pinned by unit test. |
| 4 | issues_found (P0) | Cross-owner data exfil — SECURITY DEFINER trusted `p_user_id` without `auth.uid()` check. Migration #3 added the guard. |
| 5 | issues_found (W1 + I2) | Migration #3 stripped explanatory comments from Migration #2; mapper JSDoc didn't anchor closed-set source; test regex was too loose. All three fixed. |
| 6 | clean | Cycle-5 fixes verified. Zero defects in fresh adversarial sweep. |
| 7 | issues_found (W2 + I1) | Code surface clean; SUMMARY-file audit surfaced 3 audit-trail defects in `02-02-SUMMARY.md` (WR-01 fabrication closeout), `02-03-SUMMARY.md` (WR-02 isolation assertion, IN-01 6-rows math). |
| 8 | **issues_found (W2 + I4)** | **Code surface clean (re-verified)**; cycle-7's WR-01 fix landed in frontmatter only — `02-02-SUMMARY.md` body "Transitive Closeout" still records the pre-cycle-1 resolution and directly contradicts the corrected frontmatter (WR-01). Stale line-number citations across both SUMMARY-01 and SUMMARY-02 plus minor in source JSDoc (WR-02, IN-01..04). |

---

## Gate Status

- Cycle 8: **6 findings** (2 WARNING + 4 INFO) — all in SUMMARY documentation or source-code JSDoc; **none in code/SQL/test runtime behavior**
- `consecutive_zero_finding_cycles`: **0** (counter reset)
- Perfect-PR gate: **counter reset to 0 of 2**

**Rationale for counter reset:** The cycle-8 directive explicitly named the defect classes ("stale line numbers", "audit trail accuracy", "what cycle 6+7 missed"). WR-01 is a cycle-7 fix that landed only in the frontmatter — the same defect cycle-7 was supposed to close. WR-02 and IN-01..04 are stale line numbers across multiple files, exactly the checklist item that cycle-8 asked for. Under the user's exhaustive-coverage standard ("ZERO DISMISSALS"), these are findings.

**Code surface itself remains clean.** All 13 in-scope source files (RPCs, frontend, types, tests) pass the deep audit with zero findings — same as cycles 6 and 7. The phase's *implementation* is merge-ready; only the planning-artifact narrative and source JSDoc anchors need to catch up to the post-fix-pass reality.

**Path to merge:**
1. Fix the 6 findings above (1 prose-rewrite for WR-01; line-number updates or symbol-reference rewrites for WR-02 + IN-01..IN-04). Recommendation: prefer symbol-reference rewrites over line-number-update edits — line numbers drift again on every future edit; symbol references are stable.
2. Run cycle 9 → if zero findings, counter advances to 1 of 2.
3. Run cycle 10 → if zero findings, counter advances to 2 of 2 → gate satisfied → merge.

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
