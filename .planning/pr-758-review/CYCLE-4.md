---
pr: 758
branch: security/anon-exec-security-definer-audit
head_sha: b4906aada
cycle: 4
reviewed: 2026-05-29
files_reviewed: 5
files_reviewed_list:
  - .planning/anon-exec-audit/CYCLE-1.md
  - supabase/migrations/20260529224926_revoke_anon_security_definer_rpcs.sql
  - supabase/migrations/20260529225039_revoke_anon_security_definer_rpcs_v2.sql
  - tests/integration/rls/anon-rpc-grants.rls.test.ts
  - tests/integration/rls/funnel-admin-rpc.test.ts
findings:
  p0: 0
  p1: 1
  p2: 0
  info: 0
  total: 1
status: issues_found
verdict: NEEDS-FIXES — cycle-3 cleanup commit introduced a NEW docstring drift AND failed to fix the it()-block-name drift that was part of the original P2-01 finding. Merge gate NOT closed.
---

# PR #758 — Cycle 4 Review (Merge-Gate-Closing)

**HEAD:** `b4906aada` `chore(post-758 cycle-3): correct funnel-admin docstring drift`
**Branch:** `security/anon-exec-security-definer-audit`
**Predecessor reviewed:** `7227651d1` (cycle-3 fix). This cycle verifies the cycle-3 cleanup commit.

This is the gate-closing cycle. Cycle-3 was CLEAN; cycle-4 must also be CLEAN to close the perfect-PR merge gate. **It is not.** The single P2 fix attempt introduced a new factual error and left half of the original drift unfixed.

---

## Cycle-3 cleanup verification — what was actually done

The cycle-3 cleanup commit `b4906aada` is comment-only on `tests/integration/rls/funnel-admin-rpc.test.ts`. Diff:

```diff
- *   1. non-admin OWNER caller gets error matching /unauthorized/i
- *   2. anonymous caller gets error matching /unauthorized/i
- *   3. admin caller on seeded cohort gets valid jsonb with 4 step rows,
- *      correct step_order, and non-null cohort_label
- *   4. empty-cohort window (1970-01-01 -> 1970-01-02) returns 4 zero-count
- *      rows with null conversion rates (nullif div-by-zero safety)
+ *   1. non-admin OWNER caller (authenticated, reaches the in-body
+ *      is_admin() gate) gets error matching /unauthorized/i
+ *   2. anonymous caller is blocked at the role-level revoke before the
+ *      body runs (error.code in {42501, 42883, PGRST202}). [...]
+ *   3. admin caller on seeded cohort gets valid jsonb with 3 step rows
+ *      (signup, first_property, first_unit), correct step_order, and
+ *      non-null cohort_label
+ *   4. empty-cohort window (1970-01-01 -> 1970-01-02) returns 3
+ *      zero-count rows with null conversion rates (nullif div-by-zero
+ *      safety)
```

Items fixed correctly: claim 1 clarified as in-body gate; claim 2 switched to role-level revoke set; claim 3's "4 step rows" → "3 step rows"; claim 4's "4 zero-count" → "3 zero-count".

Item broken: claim 3 added the parenthetical "(signup, first_property, **first_unit**)" — but the test has no `first_unit` step.

Item missed: the original cycle-3 P2-01 finding called out drift in BOTH the module docstring AND the `it()` block names at lines 186 + 245 ("returns 4-row" / "returns 4 zero-count"). The cleanup commit only fixed the module docstring.

---

## Findings

### P1-01 — New docstring drift introduced by cycle-3 cleanup AND original `it()`-name drift left unfixed

**File:** `tests/integration/rls/funnel-admin-rpc.test.ts`

**Issue:** Two distinct sub-defects in the same comment-only commit that was meant to eliminate documentation drift on this file:

**(a) New drift at line 18** — the cleanup commit added the parenthetical "(signup, first_property, **first_unit**)" but the actual test asserts `first_tenant`, not `first_unit`:

- Line 18 (the new claim): `(signup, first_property, first_unit)`
- Line 140 (seed comment): `signup -> first_property (5d) -> first_tenant (10d)`
- Line 155 (seed data): `step_name: "first_tenant"`
- Line 222–225 (the assertion): `expect(result.steps[2]).toMatchObject({ step: "first_tenant", step_order: 3 })`

`grep -n "first_unit\|first_tenant" tests/integration/rls/funnel-admin-rpc.test.ts` returns the new docstring claim is the ONLY `first_unit` mention; every other reference uses `first_tenant`. The fix commit invented a step name that does not exist in the test or the seeded data.

**(b) Original `it()`-name drift NOT fixed** — the cycle-3 P2-01 finding (CYCLE-3.md:138) explicitly said the drift exists in the module docstring AND the `it()` blocks at lines 208 + 256 (the line numbers were the pre-fix locations; post-fix they're 186 + 245). The cleanup commit fixed the docstring and left the `it()` block names untouched:

- Line 186: `it("returns 4-row steps array with valid aggregates on seeded cohort", async () => {`
- Line 245: `it("returns 4 zero-count rows with null rates for empty cohort window", async () => {`

Both `it()` blocks immediately assert `expect(result.steps).toHaveLength(3)` (lines 215 and 263). The `it()` description and the assertion are in direct contradiction — exactly the pattern P2-01 was meant to eliminate. Running vitest produces test names that report "4-row" while the assertion enforces 3, which is precisely the misleading-test-name failure mode that gate cycles exist to catch.

**Fix (diff):**

```diff
@@ funnel-admin-rpc.test.ts lines 17-19 @@
- *   3. admin caller on seeded cohort gets valid jsonb with 3 step rows
- *      (signup, first_property, first_unit), correct step_order, and
- *      non-null cohort_label
+ *   3. admin caller on seeded cohort gets valid jsonb with 3 step rows
+ *      (signup, first_property, first_tenant), correct step_order, and
+ *      non-null cohort_label
@@ funnel-admin-rpc.test.ts line 186 @@
-		it("returns 4-row steps array with valid aggregates on seeded cohort", async () => {
+		it("returns 3-row steps array with valid aggregates on seeded cohort", async () => {
@@ funnel-admin-rpc.test.ts line 245 @@
-		it("returns 4 zero-count rows with null rates for empty cohort window", async () => {
+		it("returns 3 zero-count rows with null rates for empty cohort window", async () => {
```

**Severity rationale:** Cycle-3 graded the original drift as P2 (non-blocking, ship-it-anyway). In a gate-closing cycle, a "fix" that introduces a new factually-wrong claim AND leaves half of the original drift in place is no longer a doc-polish nit — it is a fix-pass regression. The merge-gate rule for this PR is "two consecutive clean cycles". Letting `first_unit` (which does not exist) and `4-row`/`4 zero-count` (which contradict the assertions) ship through the gate would mean the perfect-PR discipline failed to catch its own fix-cycle regression. Promoted to **P1**.

---

## Other cycle-1-through-3 checks re-verified (all PASS)

### CI status at HEAD `b4906aada`

`gh pr checks 758` rollup at HEAD:

| Check | Status | Workflow run | Notes |
|---|---|---|---|
| `checks` (CI workflow) | **SUCCESS** | run 26669357700 | completed 00:35:18 |
| `e2e-smoke` (CI workflow) | **SUCCESS** | run 26669357700 | completed 00:35:17 |
| `rls-security` | **SUCCESS** | run 26669357673 | 70s, completed 00:36:24 |
| `checks` (duplicate CI run) | IN_PROGRESS | run 26669357695 | re-run still going |
| `e2e-smoke` (duplicate CI run) | IN_PROGRESS | run 26669357695 | re-run still going |
| Aikido Security | SUCCESS | — | 22s |
| auto-merge | SKIPPED | — | (Dependabot job, expected) |

All three branch-protection-required checks have a passing run at HEAD. The duplicate IN_PROGRESS runs are a second CI workflow firing concurrently (same SHA) — does not invalidate the green status.

### `bun run typecheck` + `bun run lint` clean

- `tsc --noEmit` exit 0, no output beyond the command line.
- `biome check` exit 0, 1217 files checked, no fixes applied.

### Cycle-3 commit only touched the one expected file

`git show --stat b4906aada` → `tests/integration/rls/funnel-admin-rpc.test.ts | 19 +++++++++++++------`. No collateral edits.

### Anon-RPC test array counts agree with audit doc

- `REVOKED_FROM_ANON` (`anon-rpc-grants.rls.test.ts:49-143`): 21 entries — verified by counting unique top-level `name:` keys, excluding the nested `p_metric_name` arg keys.
- `REVOKED_FROM_AUTHENTICATED` (`anon-rpc-grants.rls.test.ts:146-161`): 2 entries.
- `is_admin()` positive contract test exists at `anon-rpc-grants.rls.test.ts:195-201`.
- `CYCLE-1.md` verification table sums: 2 IDOR + 19 defense-in-depth + 1 intentionally-public (`is_admin`) + 1 trigger-moot (`log_lease_signature_activity`) = 23. ✓ matches the advisor flag total. ✓

### `is_admin()` positive contract still holds

Test at `anon-rpc-grants.rls.test.ts:197-200`: `anonClient.rpc("is_admin")` asserts `data === false` and `error === null`. Function body (per audit doc CYCLE-1.md:40) returns `false` when `auth.uid()` is null. The contract holds — anon callers cannot be locked out of `is_admin()` because it's invoked from RLS evaluation contexts.

### No new rule-#8 (`as unknown as`) violations in PR scope

`grep -rn "as unknown as" tests/integration/rls/ supabase/migrations/` returns hits in `document-category-mutations.rls.test.ts`, `search-documents.rls.test.ts`, `activity.rls.test.ts`, and `20260507194555_p0_security_review_followups.sql`. None of those files are in PR #758 scope (`git diff main...b4906aada --name-only` returns only the 5 files in the front-matter file list). Pre-existing, not introduced by this PR.

### `REVOKED_CODES` literal duplication (cycle-3 INF-01)

Still present at 5 sites across 4 files. Cycle-3 reviewer recommended deferring to a separate refactor PR; cycle-3 cleanup commit correctly left it alone. Not re-raised this cycle.

---

## Final summary

- **Total findings:** 0 P0 / **1 P1** / 0 P2 / 0 INFO
- **Verdict:** **NEEDS-FIXES**
- **Merge-gate status:** NOT CLOSED. Cycle-3 was the first clean cycle; cycle-4 must also be clean. P1-01 above resets the streak.
- **What to do:** apply the three-line diff in P1-01 (one docstring word, two `it()` block descriptions), commit as `chore(post-758 cycle-4): finish docstring drift cleanup`, then run cycle 5. If cycle 5 is clean, the merge gate closes after cycle 6 (cycle 5 = first clean; cycle 6 = second consecutive clean).

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (gate-closing cycle — full cross-artifact re-verification + cleanup-commit regression hunt)_
