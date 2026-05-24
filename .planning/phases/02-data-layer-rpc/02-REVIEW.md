---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T00:00:00Z
depth: deep
cycle: 11
files_reviewed: 16
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
  - .planning/phases/02-data-layer-rpc/02-01-SUMMARY.md
  - .planning/phases/02-data-layer-rpc/02-02-SUMMARY.md
  - .planning/phases/02-data-layer-rpc/02-03-SUMMARY.md
findings:
  critical: 1
  blocker: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
consecutive_zero_finding_cycles: 0
perfect_pr_gate: counter_reset
---

# Phase 2: Code Review Report — Cycle 11

**Reviewed:** 2026-05-23
**Depth:** deep (cross-file + DB↔frontend↔test contract trace)
**Files Reviewed:** 16 (13 code + 3 SUMMARY docs)
**Status:** issues_found
**Cycles since 0-finding (gate counter):** 0 / 2 — counter RESET

## Summary

Cycle 11 spawned a fresh full-scope adversarial pass after cycle-10's docs-only line-number cleanup. The cycle-10 fix itself is **verified GOOD** — the 02-03 SUMMARY test-structure tree now carries a "Symbol-anchored — line numbers omitted to avoid drift" disclaimer, preserves symbol references (`clientA`, `clientB`, `beforeAll`, `afterAll`, `it()`, etc.), and remains readable + accurate.

Tracked code surface (the 13 source files in scope) is otherwise clean — zero `any`, zero `as unknown as`, zero barrel files, zero radix-icon imports, zero `console.log`/`debugger`, zero hardcoded secrets. All JSDoc `:NN-NN` ranges in source files still match current code (verified `dashboard.tsx:87-102`, `page.tsx:95-108`).

**However, an UNTRACKED Phase 2 migration file exists in the working tree** that contradicts the committed contract. This is the primary cycle-11 finding and resets the perfect-PR counter. Additional warnings flag line-number-citation inconsistencies across the three migration files and a numeric drift in 02-01-SUMMARY.

## Cycle-10 Fix Verification

| Check | Result |
|-------|--------|
| 02-03 test-structure tree has no line-number ranges | PASS — `grep -nE ':[0-9]+-[0-9]+' 02-03-SUMMARY.md` returns 0 hits inside the tree block |
| Symbol-anchored references preserved | PASS — `clientA`, `clientB`, `ownerAId`, `ownerBId`, `beforeAll`, `afterAll`, `it()`, describe-name all present |
| Disclaimer present | PASS — line 83-84: "Symbol-anchored — line numbers omitted to avoid drift; consult the file directly for current positions." |
| Tree still readable and accurate | PASS — actual `describe(...)` title, both `it(...)` titles, and assertion summaries match `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` |

Cycle-10 fix is the correct shape and should be retained verbatim.

## Critical Issues

### CR-01 (BLOCKER): Untracked Phase 2 migration in working tree contradicts committed contract

**File:** `supabase/migrations/20260524012602_phase2_dashboard_rpc_auth_guard_message_align.sql` (UNTRACKED — not in `git ls-files`, surfaces under `git status` as `??`)

**Issue:** A fourth Phase 2 migration exists in the filesystem but is not committed. It is a `CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(...)` that supersedes the cycle-4 committed migration (`20260524001408`) with exactly one semantic change: the auth-guard exception message.

```diff
-    raise exception 'Unauthorized';
+    raise exception 'Access denied: cannot request data for another user';
```

The header self-attributes to "cycle-10/11", but cycle-10's actual fix was a docs-only edit (commit `83ff8ab9c`) that dropped drift-prone line numbers from the 02-03 SUMMARY test-structure tree. No migration was authored in cycle 10.

This file creates three real problems:

1. **State drift risk against prod.** If this migration has been applied to prod via the Supabase MCP (the project's standard pattern — see `migration-mcp-prod-drift.md` memory), the production RPC now raises `'Access denied: cannot request data for another user'`, but the committed integration test at `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:239` asserts strict equality: `expect(error?.message).toBe("Unauthorized");`. CI's `rls-security` workflow runs that test against prod on every PR push — the next CI run after applying this migration would fail hard. The committed cycle-4 migration `20260524001408` AND the integration test are tightly coupled by exact-string equality; the untracked file breaks that coupling without updating either side.

2. **Migration's own justification is FALSE.** The file's header claims it aligns the message with project convention. The cycle-4 migration's `comment on function` block (lines 528-532 of the untracked file, identical to the committed `20260524001408`) and the migration's own purpose-block (line 9) BOTH cite `20260306190000_consolidate_stats_rpcs.sql` (SEC-01) as the pattern. That referenced migration uses `raise exception 'Unauthorized'` at lines 18 + 55. The project convention is in fact mixed — both `'Unauthorized'` and `'Access denied: ...'` appear across `supabase/migrations/*.sql` — but the cited reference IS `'Unauthorized'`, so the "alignment" claim is the opposite of what the file actually does.

3. **Self-inconsistent comment.** The function comment on the untracked migration (lines 528-532) still says "Phase 2 shipped in three migrations" but this file would make it four. The file would need to update its own audit trail to be internally coherent.

**Fix:** Choose one of two paths, not both:

- **(A) Delete the file** if it is unintentional / draft cruft. Cycle-4's `'Unauthorized'` message is consistent with the cited SEC-01 reference and the committed integration test:
  ```bash
  rm supabase/migrations/20260524012602_phase2_dashboard_rpc_auth_guard_message_align.sql
  ```

- **(B) Commit the file AND** simultaneously update three coupled artifacts before any CI run that exercises prod:
  1. `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:239` — change `toBe("Unauthorized")` to `toBe("Access denied: cannot request data for another user")`.
  2. The file's own `comment on function` block (lines 528-532) — change "Phase 2 shipped in three migrations" to four, listing this migration as #4.
  3. The file's header purpose-block — strike the false "align with project convention" framing OR re-cite a different reference migration whose message actually matches.

Given the cycle-4 message is already convention-aligned with the cited SEC-01 reference, path (A) is the lower-risk fix.

## Warnings

### WR-01: Inconsistent line-number-citation policy between cycle-2 and cycle-4 committed migrations

**Files:**
- `supabase/migrations/20260523234221_phase2_property_perf_address_status_type.sql:323` (cycle-2, drift-resistant)
- `supabase/migrations/20260524001408_phase2_dashboard_rpc_auth_guard.sql:327` (cycle-4, drift-prone)

**Issue:** Both migrations contain the same inline comment block describing the server-derived `status` logic, but the citation format diverges:

Cycle-2 (`20260523234221`) line 323:
```sql
-- using the same rules as src/hooks/api/query-keys/property-stats-keys.ts:
```

Cycle-4 (`20260524001408`) line 327:
```sql
-- src/hooks/api/query-keys/property-stats-keys.ts:47-56:
```

The cycle-2 comment was deliberately written without line numbers when the migration was authored (commit `2ef51eaf4`). Cycle-5's fix (commit `304aa222d`) ported the comment block into the cycle-4 migration but added `:47-56` — re-introducing the same drift-prone pattern that cycle-10's docs fix later removed from the test-structure tree.

The citation IS currently accurate (lines 47-56 = the status if/else block in `property-stats-keys.ts`), but cycle-10's explicit principle was "line numbers are drift-prone, drop them." The cycle-4 migration retains the form cycle-10 said to avoid.

**Fix:** Either:
- Drop `:47-56` from `20260524001408` line 327 to match cycle-2's drift-resistant form, OR
- Add `:47-56` back to `20260523234221` line 323 for consistency in the opposite direction (worse — re-introduces drift risk elsewhere).

Preferred: drop the line range from cycle-4 so the two adjacent migrations carry the same comment form. Note this would touch a historical migration's inline comment — acceptable since the file has not yet been merged to main on the Phase 2 branch and the function body is unchanged.

```sql
-- src/hooks/api/query-keys/property-stats-keys.ts (mapPerformanceRow status block):
```

### WR-02: SUMMARY-01 line 51 misstates supabase.ts autogen line count

**File:** `.planning/phases/02-data-layer-rpc/02-01-SUMMARY.md:51`

**Issue:** Body claims:
> "2896-line autogen file written."

Actual: `wc -l src/types/supabase.ts` returns **2899** lines. The 2-line `+2/-0` change committed in `cb39ab370` (the same commit as this SUMMARY) brought the file from 2897 to 2899 — never 2896. The number was already wrong when written. Minor inaccuracy in an audit-trail document; not a code defect, but the user's "perfect by all measures" standard surfaces it.

**Fix:**
```diff
-Fell through to `mcp__supabase__generate_typescript_types` per the script's documented fallback. 2896-line autogen file written. `bunx tsc --noEmit` exits 0.
+Fell through to `mcp__supabase__generate_typescript_types` per the script's documented fallback. 2899-line autogen file written. `bunx tsc --noEmit` exits 0.
```

### WR-03: SUMMARY-03 body claims "(220 lines)" without historical-state marker

**File:** `.planning/phases/02-data-layer-rpc/02-03-SUMMARY.md:51`

**Issue:** Body table row T1 says:
> "`tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` (220 lines). 1 describe, 2 it blocks."

Actual file is 241 lines. The 220-line state was the pre-cycle-4 original write; the frontmatter correctly captures this with `test_file_lines: 241 # post-cycle-4 final state; original write was 220 before the isolation-assertion rewrite`. The body lacks the same explicit "(original-write line count)" marker that the frontmatter has, so a reader checking the file today and the body claim sees an unexplained 220 vs 241 discrepancy.

**Fix:**
```diff
-| T1 — Write dual-client RLS test | DONE | `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` (220 lines). 1 describe, 2 it blocks. ...
+| T1 — Write dual-client RLS test | DONE | `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` (220 lines at original write — see frontmatter `test_file_lines: 241` for post-cycle-4 final). 1 describe, 2 it blocks. ...
```

## Info

### IN-01: SUMMARY-02 line 75 page.tsx historical line numbers lack "(was line ...)" marker

**File:** `.planning/phases/02-data-layer-rpc/02-02-SUMMARY.md:75`

**Issue:** The same sentence cites three historical (pre-cleanup) line numbers in two different styles:

> "Field removed from `DashboardMetrics` interface (was line 39); two fabricated `collectionRate: 0` constructor sites in `page.tsx` (line 65 in the empty-state branch + line 82 in the real-data branch) deleted."

- `(was line 39)` — explicitly marked as historical with the `was` qualifier.
- `(line 65 in the empty-state branch + line 82 in the real-data branch)` — not marked. The "deleted" qualifier at the end of the sentence does clarify the line numbers point to deleted code, but the inconsistency with the earlier `(was line 39)` in the same sentence is jarring and easy to misread.

Today `page.tsx:65` is `};` (close of the empty-state metrics block) and `page.tsx:82` is `})();` (close of the real-data IIFE) — both are unambiguously NOT `collectionRate: 0`. A reader who skim-checks the citation against the current file sees an apparent contradiction.

**Fix:** Make the markers consistent within the sentence:
```diff
-Field removed from `DashboardMetrics` interface (was line 39); two fabricated `collectionRate: 0` constructor sites in `page.tsx` (line 65 in the empty-state branch + line 82 in the real-data branch) deleted.
+Field removed from `DashboardMetrics` interface (was line 39); two fabricated `collectionRate: 0` constructor sites in `page.tsx` (was line 65 in the empty-state branch + was line 82 in the real-data branch) deleted.
```

## Out-of-Scope Notes (not findings)

- **`data as { stats: ..., trends: ..., time_series: ..., property_performance: ..., activities: ... }` cast** at `use-owner-dashboard.ts:241` is preceded by a runtime structural type guard at lines 229-239 narrowing the shape. This is the contract-validated narrowing pattern, not an `as unknown as` violation. Acceptable.
- **`PortfolioRow.address: string` (non-nullable) vs `(row.address ?? "")` defensive guard in `dashboard.tsx:111`** is defensive overkill, not a bug. Not flagged.
- **Integration test default unit status** relies on the DB-level default for `units.status` being non-`'occupied'` (so the property derives `status='vacant'`). Currently correct per TenantFlow domain defaults. Not flagged.

## Files Verified Clean

| File | Notes |
|------|-------|
| `src/app/(owner)/dashboard/page.tsx` | `:106` reads `prop.open_maintenance ?? 0` correctly |
| `src/components/dashboard/dashboard-data.ts` | `:77` reads `prop.open_maintenance ?? 0`; JSDoc `:87-102` + `:95-108` ranges verified accurate |
| `src/components/dashboard/dashboard-data.test.ts` | 3 it blocks pin the canonical transform contract; JSDoc citations match current source |
| `src/components/dashboard/dashboard.tsx` | `:101` reads `prop.openMaintenance` (required, no fallback needed) |
| `src/hooks/api/query-keys/property-stats-keys.ts` | `open_maintenance` deliberately omitted with explanatory comment; lines 47-56 + 70-89 ranges still match SUMMARY citations |
| `src/hooks/api/use-owner-dashboard.ts` | `:277` mapper emits `open_maintenance: row.open_maintenance ?? 0`; runtime type guard at `:229-239` precedes the structural cast |
| `src/types/core.ts` | `PropertyPerformance.open_maintenance?: number` optional with anchored JSDoc explaining read-seam contract |
| `src/types/database-rpc.ts` | `PropertyPerformanceRpcResponse.open_maintenance: number` required — matches RPC emission post-`20260523223626` |
| `src/types/sections/dashboard.ts` | `:55 openMaintenance: number` matches SUMMARY citation |
| `supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql` | additive CTE, SECURITY DEFINER + `search_path` preserved, grants preserved |
| `supabase/migrations/20260523234221_phase2_property_perf_address_status_type.sql` | adds address/property_type/status emission; drift-resistant inline citation |
| `supabase/migrations/20260524001408_phase2_dashboard_rpc_auth_guard.sql` | adds `auth.uid() = p_user_id` guard via cycle-4 P0 fix; raises `'Unauthorized'` matching SEC-01 reference (WR-01 flags only the line-number citation form) |
| `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` | 2 it blocks pin happy path + isolation; `error?.message === "Unauthorized"` matches the committed cycle-4 migration |

## D-01..D-06 Invariants — End-to-End Verification

| Invariant | Status |
|-----------|--------|
| D-01 (drop `collectionRate`) | clean — `grep -rn collectionRate src/` returns 0 hits |
| D-02 (per-property `open_maintenance`) | clean — RPC emits, mapper reads, two read seams apply `?? 0`, one seam relies on required typing |
| D-03 (filename reconcile against MCP-assigned timestamps) | clean for committed migrations; **CR-01 surfaces an UNCOMMITTED migration with a yet-to-reconcile timestamp** |
| D-04 (dual-client RLS test) | clean — happy path + isolation pinned |
| D-05 (CI integration via `rls-security` workflow) | clean — but **CR-01 would break the next CI run if the untracked migration is applied to prod** |
| D-06 (write file → MCP apply → reconcile filename → regen types) | clean for committed migrations; **CR-01 indicates a half-executed D-06 sequence (file written, status unknown for steps 2-4)** |

## Auth Guard + Status Derivation + Test Rigor Check

| Surface | Verified |
|---------|----------|
| `auth.uid() = p_user_id` guard at top of function body | YES — cycle-4 migration line 25-27 |
| Guard raises `'Unauthorized'` matching SEC-01 reference | YES — committed cycle-4 |
| Guard raises message matching integration test assertion | YES — committed state. CR-01's untracked file would break this |
| Status derivation rules: NO_UNITS / vacant / FULL / PARTIAL | YES — `puc.total_units = 0` / `puc.occupied_units = 0` / `puc.occupied_units = puc.total_units` / else |
| Server-derived status matches frontend `mapPropertyPerformanceStatus` allowlist | YES — narrow guard accepts exactly these 4 string values |
| Integration test asserts all 4 cycle-2 fields (open_maintenance, address, property_type, status) | YES — lines 207-213 |
| Integration test isolates cross-owner correctly | YES — line 220-240 |
| Integration test cleans up fixtures in correct dependency order | YES — `afterAll` lines 158-174 |

## Perfect-PR Gate Counter

| Cycle | Findings | Counter |
|-------|----------|---------|
| 6 | 0 | 1/2 |
| 7 | 3 (SUMMARY docs) | RESET to 0/2 |
| 8 | findings | RESET to 0/2 |
| 9 | findings | RESET to 0/2 |
| 10 | 2 WARNING + 1 INFO | RESET to 0/2 |
| **11** | **1 BLOCKER + 3 WARNING + 1 INFO** | **RESET to 0/2** |

The cycle-11 BLOCKER (CR-01) is a tracked-vs-untracked state-drift issue rather than a defect in the committed code surface. It would not have surfaced via standard code-review of `git ls-files` output but is visible to `git status` and to anyone running the test suite against prod after an out-of-band MCP migration apply. Adversarial review specifically looks for this class of artifact.

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 11_
