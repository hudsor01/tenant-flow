---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T00:00:00Z
depth: deep
cycle: 9
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
  warning: 4
  info: 1
  total: 5
status: issues_found
consecutive_zero_finding_cycles: 0
perfect_pr_gate: counter_reset
---

# Phase 2: Code Review Report — Cycle 9

**Reviewed:** 2026-05-23
**Depth:** deep
**Cycle:** 9
**Status:** issues_found

## Scope Note

Cycle 8 fixed all six findings from the previous cycle (verified independently — see "Cycle-8 Fix Verification" below). Cycle 9 ran the full fresh-eyes pass on all 16 files (13 source + 3 SUMMARY artifacts) plus the cycle-9 directive's spot-check requirements.

The code surface (13 source/SQL/test files) remains clean for the fourth consecutive cycle (6, 7, 8, 9). New findings this cycle are all in the SUMMARY artifacts — specifically `02-03-SUMMARY.md`, which was not touched by the cycle-8 fix and contains several stale citations that cycle 8 missed because cycle 8 focused on `02-01-SUMMARY.md` and `02-02-SUMMARY.md`.

---

## Cycle-8 Fix Verification (Items 1-6 from cycle-9 directive)

| Check | Cycle-9 Verification | Status |
|-------|----------------------|--------|
| **WR-01** — 02-02 body "Transitive Closeout" no longer contradicts frontmatter | Lines 90-99: body now acknowledges initial fabrication AND cycle-1 follow-up. Internal consistency restored. | PASSED |
| **WR-02** — line-number citations updated to current state | `grep -n "open_maintenance: row.open_maintenance" src/hooks/api/use-owner-dashboard.ts` → line 277 ✓. `grep -n "openMaintenance: prop.open_maintenance"` page.tsx → line 106 ✓. `grep -n "maintenanceOpen: prop.open_maintenance"` dashboard-data.ts → line 77 ✓. All three citations updated. | PASSED |
| **IN-01** — dashboard-data.ts JSDoc ranges fixed | Line 44-45: now reads `dashboard.tsx:87-102` + `page.tsx:95-108`. Verified against actual code. | PASSED |
| **IN-02** — dashboard-data.test.ts header range fixed | Line 11-12: now reads `dashboard.tsx:87-102` + `page.tsx:95-108`. Verified. | PASSED |
| **IN-03** — 02-01-SUMMARY line refs updated | Line 42 (Outcome) + lines 141-144 (carry-forward) — all updated to final-state line numbers with `(planning-time range; final mapper landed at :277)` qualifier. | PASSED |
| **IN-04** — Success Criteria table reflects final shipped state | Lines 113-128 (Success Criteria reframed two-column) + new "Post-Plan Phase-2 follow-on migrations" section (lines 120-128) documenting cycles 2 and 4 migrations. | PASSED |

All six cycle-8 fixes verified. The cycle-8 fix commit `2d4bde6ee` is intact and correct against the cycle-8 directive.

---

## Code-Surface Re-Audit (Fresh Independent Sweep, All 13 Files)

### Zero Tolerance Rules — All Pass

- **`any` types:** `grep -nE '\bany\b'` across all 13 files: zero matches (excluding common-word false positives like "many").
- **`as unknown as`:** zero. Single match in `property-stats-keys.ts:35` is a JSDoc comment describing the absence ("no `as unknown as` assertions").
- **Barrel files / re-exports:** none introduced.
- **Duplicate types:** five distinct `Property*Performance*` types serving distinct seams (RPC payload row, post-mapped domain shape, section-consumer shape, table row, view-model) — each has a JSDoc anchor.
- **Commented-out code:** none. SQL `--` lines in migrations are documentation, not commented SQL.
- **Inline styles:** none.
- **PostgreSQL ENUMs:** none. All `status` derivations use string literals + CASE expressions against text-with-CHECK columns.
- **Emojis in code:** none.
- **`@radix-ui/react-icons`:** zero icon imports in the 13 files.
- **String literal query keys:** all dashboard query keys derive from `ownerDashboardKeys.*()` factories.
- **TODO/FIXME/XXX/HACK:** zero matches.
- **`console.log` / `debugger`:** one `console.warn` at `dashboard-rpc-open-maintenance.test.ts:182` inside a "Skipping: fixtures not created" branch — intentional skip notice, not a defect.

### D-01..D-06 Invariants

| Invariant | Status |
|-----------|--------|
| D-01 drop `collectionRate` | `grep -rn "collectionRate\|collection_rate" src/ tests/ supabase/migrations/` returns zero. Confirmed. |
| D-02 additive shared-CTE migration | All three migrations are `CREATE OR REPLACE FUNCTION`; shared-CTE invariant preserved; `perf_open_maintenance` joins `all_maintenance` → `maintenance_requests` via PK to recover `unit_id`. |
| D-03 prod-reconciled filenames | Repo filenames are timestamp-monotonic; `list_migrations` reconciliation performed at each apply step. |
| D-04 dual-client RLS test | Test has 2 `it` blocks (happy + isolation). Confirmed via `grep -nE "^\s*(describe\|it)\("` → 1 describe + 2 it. |
| D-05 prod-targeting | Test uses `createTestClient` from `tests/integration/setup/supabase-client.ts`. |
| D-06 sequence respected | Verified via git log: schema → frontend wiring → integration test, then cycle-N fix commits chronological. |

### Migration Safety Re-Audit (3 migrations)

- Each migration: `CREATE OR REPLACE FUNCTION`, signature `(p_user_id uuid) RETURNS jsonb`, `SECURITY DEFINER`, `SET search_path TO 'public'`, ends with `GRANT EXECUTE ... TO authenticated` + `service_role`. No DROP statements anywhere.
- Migration #3 cumulative end-state: auth guard (lines 22-27), address/property_type/status (lines 320-339), `perf_open_maintenance` CTE (lines 289-303). All preserved.

### Auth Guard Correctness (Migration #3)

- Position: immediately after `begin`, before `with`. Correct.
- Pattern: `if p_user_id != (select auth.uid()) then raise exception 'Unauthorized'; end if;`. Matches reference pattern.
- Edge cases re-confirmed: honest self-call → bypass → correct payload; cross-owner → raise `Unauthorized`; service_role → bypass (intentional, service-role calls don't have an `auth.uid()` anyway).

### Status Derivation Correctness

SQL CASE expression in M#3:334-339 and JS reference at `property-stats-keys.ts:47-56`. Spot-walked all 4 branches: identical classification. NULL handling exhaustive (`coalesce(puc.total_units, 0)`).

### Integration Test Rigor

- Happy path: asserts 4 fields (open_maintenance >= 1, address, property_type, status). Fixture state matches contract: 1 unit, 0 leases → status=vacant; 1 open maintenance request → open_maintenance=1.
- Isolation: strict `expect(data).toBeNull()` + `expect(error?.message).toBe("Unauthorized")` — strict equality.
- FK ordering: create property → unit → tenant → maintenance; cleanup reverse. Correct.

### Unit Test Rigor

`dashboard-data.test.ts`: 3 it-blocks. No `any`, no `as unknown as`. Clean.

### End-to-End Data Flow Trace (Spot-Walk)

Walking a real property row through all 5 seams:

1. **RPC row emitted** (`get_dashboard_data_v2`, M#3:307-345) — 13 keys including `open_maintenance`, `address`, `property_type`, server-derived `status`.
2. **Mapper boundary** (`use-owner-dashboard.ts:255-278`) — narrows to `PropertyPerformance`. `mapPropertyPerformanceStatus` validates `status` against closed union; `open_maintenance: row.open_maintenance ?? 0` applies deploy-order-safe fallback at line 277. ✓
3. **Hook surface** (`usePropertyPerformance`) — raw passthrough.
4. **Page re-map** (`page.tsx:95-108`) — re-shapes to `PropertyPerformanceItem`: `openMaintenance: prop.open_maintenance ?? 0` at line 106. ✓
5. **Dashboard inline transform** (`dashboard.tsx:87-102`) — re-shapes to `PortfolioRow`: `maintenanceOpen: prop.openMaintenance` at line 101. ✓
6. **PortfolioTable consumes `PortfolioRow[]`** — renders the column.

All seams preserve `open_maintenance`. Two `?? 0` fallbacks correctly guard the optional-field shape. **No defect at the code surface.**

### JSDoc Citation Spot-Check (Cycle-9 Directive Item 8)

| JSDoc citation | Actual position | Status |
|----------------|-----------------|--------|
| `dashboard-data.ts:44-45` → "inline transform in `dashboard.tsx:87-102` plus a re-mapper in `page.tsx:95-108`" | `const portfolioData: PortfolioRow[]` runs lines 87-102; `const propertyPerformance = (() =>` IIFE runs lines 95-108 | ACCURATE |
| `dashboard-data.test.ts:11-12` → "inline transform in `dashboard.tsx:87-102` plus a re-mapper in `page.tsx:95-108`" | Same as above | ACCURATE |
| Migration #2 lines 322-327 → "same rules as src/hooks/api/query-keys/property-stats-keys.ts:" (no line range) | Refers to file generally | ACCURATE |
| Migration #3 line 327 → "src/hooks/api/query-keys/property-stats-keys.ts:47-56" | `let status: PropertyPerformance["status"]` block runs lines 47-56 | ACCURATE |
| `use-owner-dashboard.ts:196-199` JSDoc → migration filename `20260523234221_phase2_property_perf_address_status_type.sql` | Migration file exists at that path | ACCURATE |
| `use-owner-dashboard.ts:273-276` JSDoc → migration filename `20260523223626_phase2_open_maintenance_per_property.sql` | Migration file exists at that path | ACCURATE |
| `database-rpc.ts:11-22` JSDoc → both Phase-2 migrations | Both files exist | ACCURATE |
| `core.ts:341-347` JSDoc → references Phase 2 `perf_open_maintenance` CTE | Verified | ACCURATE |

All in-source JSDoc citations are accurate against the current code state.

### Threat-Model Re-Verification

All cycle-1..cycle-5 threats re-verified closed. No regression introduced by cycles 6-8's documentation-only commits.

---

## SUMMARY-File Audit (Cycle-9 Directive Items 6, 7)

Cycle-9 directive: *"verify ALL line-number citations in ALL three SUMMARY files match the actual current source. Spot-check at least 3 references per file by reading the cited file/line"* AND *"are frontmatter and body sections of each SUMMARY aligned?"*

### 02-01-SUMMARY.md — Clean

Spot-check (cycle-8 IN-03 + IN-04 fixes):
- Line 42 Outcome: `dashboard-data.ts:77, dashboard.tsx:101, page.tsx:106` — verified ✓
- Lines 141-144 Carry-forward: all updated to final-state lines ✓
- Lines 113-128 Success Criteria + Post-Plan section: shipped state recorded ✓

**No new findings.**

### 02-02-SUMMARY.md — 2 stale citations + 1 brittle reference (see WR-04 + IN-01 below)

Spot-check:
- Line 25 cites `sections/dashboard.ts:56` for `openMaintenance` — actual line is **55** (see WR-04)
- Line 27 cites `sections/dashboard.ts:56` — actual line is **55** (see WR-04)
- Line 88 cites `sections/dashboard.ts:56` — actual line is **55** (see WR-04)
- Lines 28, 92, 121 cite `property-stats-keys.ts:85` for the construction site — line 85 is now a comment (see IN-01)
- Lines 26, 65, 80, 82, 83 cite `use-owner-dashboard.ts:277`, `page.tsx:106`, `dashboard-data.ts:77` — verified accurate ✓
- Line 66, 81: `dashboard.tsx:101` — verified ✓

### 02-03-SUMMARY.md — 3 distinct stale-citation findings (see WR-01, WR-02, WR-03 below)

Cycle 8 did NOT modify `02-03-SUMMARY.md` (verified: `git show 2d4bde6ee --stat` shows only 02-01-SUMMARY + 02-02-SUMMARY + REVIEW.md + dashboard-data.ts + dashboard-data.test.ts modified). The cycle-9 directive's "ALL three SUMMARY files" + "spot-check at least 3 references per file" surfaced the following defects.

Spot-check:
- Line 83 "Header comment block (lines 1-18)" — actual header runs **lines 1-22** (`*/` closes at line 22). Off by 4 on close boundary.
- Line 84 "Imports (lines 20-21)" — actual imports run **lines 24-26** (three import statements: `SupabaseClient`, `PropertyPerformanceRpcResponse`, `createTestClient + getTestCredentials`). Off by 4 on open, 5 on close.
- Line 86 "Module state (lines 24-34)" — actual `let` declarations + state inside describe run **lines 29-40**. Off by 5 on open, 6 on close.
- Line 87 "beforeAll (lines 36-135)" — actual `beforeAll` runs **lines 42-156**. Off by 6 on open, 21 on close.
- Line 91 "afterAll (lines 137-152)" — actual `afterAll` runs **lines 158-174**. Off by 21 on open, 22 on close.

All five line ranges in the Test File Structure tree (lines 81-100 of 02-03-SUMMARY) are wrong against current code.

Also frontmatter line 22 claims `test_file_lines: 220` — actual is **241** (`wc -l` output). And frontmatter line 23 claims `insert_inserts: 5` but the parenthetical decomposition `(property × 2, unit × 2, tenant × 1 + maintenance × 1 added during execution)` sums to **6**.

---

## Findings

### WR-01: `02-03-SUMMARY.md` Test File Structure tree contains 5 stale line ranges — file untouched by cycle-8 fix

**File:** `.planning/phases/02-data-layer-rpc/02-03-SUMMARY.md:83-91`
**Severity:** WARNING

**Issue:**

The "Test File Structure" diagram in the body of `02-03-SUMMARY.md` (lines 81-100) cites five distinct line ranges against `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts`. All five are stale against the current 241-line test file:

| Claim in 02-03-SUMMARY | Actual current position | Drift |
|------------------------|------------------------|-------|
| Line 83: "Header comment block (lines 1-18)" | Lines 1-22 (`*/` closes line 22) | Off by 4 on close |
| Line 84: "Imports (lines 20-21)" | Lines 24-26 (3 imports) | Off by 4 on open, 5 on close |
| Line 86: "Module state (lines 24-34)" | Lines 29-40 | Off by 5 on open, 6 on close |
| Line 87: "beforeAll (lines 36-135)" | Lines 42-156 | Off by 6 on open, **21 on close** |
| Line 91: "afterAll (lines 137-152)" | Lines 158-174 | **Off by 21 on open, 22 on close** |

The cycle-8 fix commit (`2d4bde6ee`) only modified `02-01-SUMMARY.md`, `02-02-SUMMARY.md`, `02-REVIEW.md`, `dashboard-data.ts`, and `dashboard-data.test.ts` — `02-03-SUMMARY.md` was not touched. The cycle-8 review correctly named `02-01` and `02-02` as the focus targets, but its line-number-drift verification did not extend to `02-03`. Cycle 9's directive ("verify ALL line-number citations in ALL three SUMMARY files") surfaces the gap.

**Verified via independent inspection:**

```bash
$ awk 'NR==22' tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
 */
$ awk 'NR==42 || NR==156' tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
	beforeAll(async () => {
	});  # closing brace of beforeAll
$ awk 'NR==158 || NR==174' tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
	afterAll(async () => {
	});  # closing brace of afterAll
```

**Why this matters:**

This is the same defect class cycle 7 + 8 closed for the other two SUMMARYs. The cycle-8 directive prioritized `02-01` and `02-02` because those were the targets of cycle 7's WR-01/WR-02. But `02-03` carries the test-file-structure block — which has the longest, most concretely-cited line ranges of any document in the phase. Anyone tracing the test file via the SUMMARY's structure tree will jump to a line that no longer matches.

The off-by-21 on `beforeAll` close (line 152 vs 156, the most-cited block in the body) is the most-visible drift. A reviewer who reads `02-03-SUMMARY.md:87` ("beforeAll (lines 36-135)") and jumps to line 36 of the test file lands on a `let` declaration, not the start of `beforeAll`.

**Fix:**

Either (a) update the five line ranges to current values:
- "Header comment block (lines 1-18)" → "(lines 1-22)"
- "Imports (lines 20-21)" → "(lines 24-26)"
- "Module state (lines 24-34)" → "(lines 29-40)"
- "beforeAll (lines 36-135)" → "(lines 42-156)"
- "afterAll (lines 137-152)" → "(lines 158-174)"

Or (b) drop line ranges entirely and refer to the symbols/blocks by name only — same durability argument as the cycle-7 WR-02 fix in `02-01-SUMMARY.md` and `02-02-SUMMARY.md`. The latter is more durable; symbol names don't drift.

### WR-02: `02-03-SUMMARY.md` frontmatter `test_file_lines: 220` is stale — actual file is 241 lines

**File:** `.planning/phases/02-data-layer-rpc/02-03-SUMMARY.md:22`
**Severity:** WARNING

**Issue:**

Frontmatter at line 22 reads:

```yaml
metrics:
  duration: ~10 min
  test_file_lines: 220
```

But `wc -l tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` outputs `241`. The "220 lines" claim is also repeated in the body at line 51 ("`tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` (220 lines). 1 describe, 2 it blocks.").

The 21-line drift between claim and reality matches the cycle-4 P0 migration commit (which added the `auth.uid()` guard AND extended the integration test's Test 2 assertion from `toEqual([])` to `expect(error?.message).toBe("Unauthorized")` plus extensive comments + supporting `import type { PropertyPerformanceRpcResponse }`). The body was updated to acknowledge the cycle-4 wording change but the line count was not.

**Verified:**

```bash
$ wc -l tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
     241 tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
```

**Why this matters:**

`metrics:` is the audit-trail block. A line count off by ~10% obscures the cycle-4 fix's footprint (it added 21 lines to the test). Future auditors reading `02-03-SUMMARY.md` will compare the "220" claim against `wc -l` and discover the drift — exactly the failure mode the perfect-PR gate exists to prevent.

**Fix:**

Update both citations:
- Frontmatter line 22: `test_file_lines: 220` → `test_file_lines: 241`
- Body line 51: `(220 lines)` → `(241 lines, post-cycle-4 expansion)` (the qualifier makes the audit-trail reading more honest — cycle 4 expanded the file, not the original Plan 02-03 write).

### WR-03: `02-03-SUMMARY.md` frontmatter `insert_inserts: 5` math inconsistent with parenthetical decomposition that sums to 6

**File:** `.planning/phases/02-data-layer-rpc/02-03-SUMMARY.md:23`
**Severity:** WARNING

**Issue:**

Frontmatter line 23 reads:

```yaml
  insert_inserts: 5 fixture inserts (property × 2, unit × 2, tenant × 1 + maintenance × 1 added during execution)
```

The parenthetical decomposition lists `property × 2 + unit × 2 + tenant × 1 + maintenance × 1 = 6`, but the "5" prefix says 5. The body of the SUMMARY (line 24, "Schema discovery during execution") explains that the tenant + maintenance inserts were added during execution to satisfy the `tenant_id NOT NULL` constraint — so the *original plan* called for 4 inserts (`property × 2, unit × 2`) plus 2 added in execution = 6 total. The "5" is neither the plan count nor the actual count.

Independent verification by counting `.insert(` calls inside `beforeAll`:

```bash
$ grep -c "\.insert(" tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
6
```

Six inserts: `propertyA`, `unitA`, `tenantA`, `maintenanceA`, `propertyB`, `unitB`.

**Why this matters:**

The frontmatter is the audit-trail. The `afterAll_deletes: 6 (matches dependency tree)` field on the next line is correct (verified — six deletes for six inserts, FK-reverse ordered). The mismatch between `insert_inserts: 5` and `afterAll_deletes: 6` is internally inconsistent: every insert needs a matching cleanup, so if there are 6 deletes there must be 6 inserts. Anyone reading the frontmatter as audit evidence will notice the off-by-one.

**Fix:**

Update line 23 to:
```yaml
  insert_inserts: 6 fixture inserts (property × 2, unit × 2, tenant × 1, maintenance × 1 — the tenant + maintenance pair was added during execution to satisfy `maintenance_requests.tenant_id NOT NULL`)
```

This restores internal consistency with `afterAll_deletes: 6` and captures the same execution-time discovery the body already documents.

### WR-04: `02-02-SUMMARY.md` cites `sections/dashboard.ts:56` three times — actual line is 55

**File:** `.planning/phases/02-data-layer-rpc/02-02-SUMMARY.md:25, 27, 88`
**Severity:** WARNING

**Issue:**

Three citations of `sections/dashboard.ts:56` in `02-02-SUMMARY.md` (lines 25, 27, 88) for the `PropertyPerformanceItem.openMaintenance` field. The actual line is **55**:

```bash
$ grep -n "openMaintenance" src/types/sections/dashboard.ts
38:	openMaintenanceRequests: number;
55:	openMaintenance: number;
```

All three citations:
- Line 25 (decisions block): "openMaintenance: number on PropertyPerformanceItem (required — was already declared at sections/dashboard.ts:56)"
- Line 27 (decisions block, asymmetric naming): "PropertyPerformanceItem.openMaintenance (camelCase, was already declared at sections/dashboard.ts:56 — only the value source changed)"
- Line 88 (body, Type seams list): "PropertyPerformanceItem.openMaintenance: number (required — was already declared at `sections/dashboard.ts:56`, only the value source changed)"

The same off-by-one citation also appears in `02-02-PLAN.md:357` and `02-CONTEXT.md` referencing this field — but those are pre-execution planning documents, so the off-by-one was baked in before the type file's actual layout was finalized. The SUMMARY documents are the post-execution audit trail and should reflect current state.

**Why this matters:**

The cycle-8 directive was framed as "line-number drift" cleanup. The cycle-9 directive's "Spot-check at least 3 references per file by reading the cited file/line" caught this — these three citations are precisely the class of drift that cycle-8 was supposed to clear.

The discrepancy is small (off by 1) but the principle is exactly what the perfect-PR gate is testing: an audit-trail document with a fact that's wrong against the live code is a defect. Three occurrences in the same document are not a typo — they're a systemic mis-citation.

**Fix:**

Two options:
- (a) Update all three `:56` → `:55` in `02-02-SUMMARY.md`
- (b) Drop the line number from all three (prefer this — same durability argument as the cycle-8 fix recommendation; "`sections/dashboard.ts`'s `PropertyPerformanceItem.openMaintenance` field" is just as searchable without the line number and never drifts)

### IN-01: `02-02-SUMMARY.md` cites `property-stats-keys.ts:85` 3 times — line 85 is now a comment, not the constructor site

**File:** `.planning/phases/02-data-layer-rpc/02-02-SUMMARY.md:28, 92, 121`
**Severity:** INFO

**Issue:**

Three citations of `property-stats-keys.ts:85` in `02-02-SUMMARY.md`:
- Line 28 (decisions block): "`src/hooks/api/query-keys/property-stats-keys.ts:85` was a transitive `PropertyPerformance` constructor"
- Line 92 (body, Transitive Closeout): "`src/hooks/api/query-keys/property-stats-keys.ts:85` constructs a `PropertyPerformance` from a different RPC"
- Line 121 (body, Issues / Deviations): "`property-stats-keys.ts:85` required a closeout"

When plan 02-02 was first written (commit `80bcef47d`), `:85` was the line where `open_maintenance: 0` was added (the fabricated-zero closeout). The cycle-1 fix (commit `7f64c1946`) removed that line entirely. The construction site (`return {...}` block of `mapPerformanceRow`) now spans **lines 70-89**. Line 85 itself is now a comment:

```typescript
// line 85 — current state:
		// `open_maintenance` deliberately omitted — the `get_property_performance_with_trends`
```

The citation is historically anchored ("where the fabrication used to be") but the prose claims `:85` "constructs a `PropertyPerformance`" and "was a transitive `PropertyPerformance` constructor" — both phrasings imply the line is currently a construction site, which it is not.

This is the same defect class as WR-02 (cycle 8) but lower severity because the prose context (`"was a transitive"`, past tense in decisions block line 28) is more historical than current-state-claiming. Lines 92 and 121 use present tense (`"constructs"`, `"required"`) and are slightly more misleading.

**Fix:**

Update the three citations to point to the line range that currently holds the construction block (lines 70-89) plus a historical anchor:
- Line 28: "`src/hooks/api/query-keys/property-stats-keys.ts` (the `mapPerformanceRow` return block, lines 70-89) was a transitive `PropertyPerformance` constructor; the original fabrication closeout went on line 85 and the cycle-1 fix removed that line entirely."
- Line 92: rewrite similarly with explicit historical-vs-current framing
- Line 121: drop the `:85` line number; refer to the function by name (`mapPerformanceRow`)

This is INFO rather than WARNING because the current prose is more historical than mis-leading — but the cycle-9 directive's "Spot-check at least 3 references per file" surfaces it for completeness.

---

## REVIEW.md Audit Trail Coverage (Cycle-9 Directive Item 9)

Audit trail re-verified end-to-end. The cycle-8 review captured cycles 1-8; this cycle-9 review extends it to cycle 9. See "Audit Trail" table at the end of this document.

---

## Audit Trail (cycles 1-9)

| Cycle | Findings | Notable |
|---|---|---|
| 1 | issues_found | Address/property_type/status declared in `PropertyPerformanceRpcResponse` but never emitted by RPC; cycle-1 typed status mapper upgraded silent coercion to runtime throw → P0 dashboard regression. |
| 2 | issues_found | Migration #2 (`20260523234221`) fixed the type-contract lie — RPC now emits address, property_type, and a server-derived `status` from a closed CASE expression. |
| 3 | issues_found | Selector composition removed `transformDashboardData(data)` to fix double-map; transform survives as Phase-3 seam, pinned by unit test. |
| 4 | issues_found (P0) | Cross-owner data exfil — SECURITY DEFINER trusted `p_user_id` without `auth.uid()` check. Migration #3 (`20260524001408`) added the guard. |
| 5 | issues_found (W1 + I2) | Migration #3 stripped explanatory comments from Migration #2; mapper JSDoc didn't anchor closed-set source; test regex was too loose. All three fixed. |
| 6 | clean | Cycle-5 fixes verified. Zero defects in fresh adversarial sweep. |
| 7 | issues_found (W2 + I1) | Code surface clean; SUMMARY-file audit surfaced 3 audit-trail defects in `02-02-SUMMARY.md` (WR-01 fabrication closeout), `02-03-SUMMARY.md` (WR-02 isolation assertion, IN-01 6-rows math). |
| 8 | issues_found (W2 + I4) | Code surface clean; cycle-7's WR-01 fix landed in frontmatter only — `02-02-SUMMARY.md` body "Transitive Closeout" still recorded the pre-cycle-1 resolution. Stale line citations across `02-01-SUMMARY.md` + `02-02-SUMMARY.md` + source JSDoc. All six fixed in commit `2d4bde6ee`. |
| 9 | **issues_found (W4 + I1)** | **Code surface clean (re-verified for the 4th consecutive cycle)**; all 6 cycle-8 fixes verified intact. Fresh-eyes SUMMARY audit + cycle-9 spot-check requirement surfaced 5 new defects in `02-03-SUMMARY.md` (test-file structure tree had 5 stale line ranges + 220-vs-241 line count + 5-vs-6 insert count — `02-03-SUMMARY.md` was not touched by cycle 8's fix commit) plus `02-02-SUMMARY.md` `sections/dashboard.ts:56` triple-citation off by 1 from actual `:55`. |

---

## Gate Status

- Cycle 9: **5 findings** (4 WARNING + 1 INFO) — all in SUMMARY documentation; **none in code/SQL/test runtime behavior**
- `consecutive_zero_finding_cycles`: **0** (counter reset)
- Perfect-PR gate: **counter reset to 0 of 2**

**Rationale for counter reset:** Cycle 9 directive explicitly required verification of *"ALL line-number citations in ALL three SUMMARY files"* + "spot-check at least 3 references per file by reading the cited file/line". The cycle-8 fix correctly addressed `02-01-SUMMARY.md` and `02-02-SUMMARY.md` but did not extend the verification to `02-03-SUMMARY.md`. The cycle-9 spot-check surfaced 5 separate defects in `02-03-SUMMARY.md` (test-file structure tree, file line count, fixture insert count) and 1 additional triple-citation defect in `02-02-SUMMARY.md` (`sections/dashboard.ts:56` vs actual `:55`). Under the user's exhaustive-coverage standard ("ZERO DISMISSALS"), all five are findings.

**Code surface itself remains clean** for the fourth consecutive cycle. All 13 in-scope source files pass the deep audit with zero findings. The phase's *implementation* is merge-ready; the planning-artifact narrative needs one more drift-cleanup pass.

**Path to merge:**
1. Fix the 5 findings above. Recommendation: prefer symbol-reference rewrites and updated line counts over preserving line numbers — cycle 9 surfaced what cycle 8 missed precisely because line numbers drift on every edit. The structural fix (drop line numbers entirely from the structure tree in `02-03-SUMMARY.md`) is more durable than fixing the integers.
2. Run cycle 10 → if zero findings, counter advances to 1 of 2.
3. Run cycle 11 → if zero findings, counter advances to 2 of 2 → gate satisfied → merge.

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
