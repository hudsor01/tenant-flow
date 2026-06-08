---
pr: 758
branch: security/anon-exec-security-definer-audit
head_sha: 7227651d1
cycle: 3
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
  p1: 0
  p2: 1
  info: 1
  total: 2
status: clean
verdict: CLEAN — first clean cycle; cycle 4 must also be CLEAN to close the merge gate
---

# PR #758 — Cycle 3 Review

**HEAD:** `7227651d1` `fix(post-758 cycle-2): unblock rls-security CI + finish count drift`
**Branch:** `security/anon-exec-security-definer-audit`
**Predecessor commit reviewed:** `e24eb9ab3` (cycle-1 fix) → this cycle verifies cycle-2 fix

## Cycle-2 claims verified independently

### 1. `rls-security` CI is GREEN at HEAD (BL-01 resolved)

`gh pr checks 758` at HEAD `7227651d1`:

| Check          | Status | Duration |
|----------------|--------|----------|
| `checks`       | pass   | 2s       |
| `e2e-smoke`    | pass   | 2m52s    |
| `rls-security` | **pass** | 54s    |
| Aikido Security | pass | 20s |

BL-01 (P0 from cycle-2) is genuinely resolved — `rls-security` flipped from RED to GREEN.

### 2. The "only one anon.rpc regression site" claim is verified

`grep -rn "anon\.rpc\|anonClient\.rpc" tests/integration/` returns exactly 4 hits:

| File:line | Caller | Function | Status |
|---|---|---|---|
| `anon-rpc-grants.rls.test.ts:177-178` | new lockdown test | iterates all 21 revoked | designed-for-revoke; uses code-set assertion |
| `anon-rpc-grants.rls.test.ts:197` | new lockdown test | `is_admin()` | intentionally-public; positive contract |
| `funnel-admin-rpc.test.ts:63` | pre-existing test | `get_funnel_stats` | **cycle-2 fix site** (assertion updated) |

`blogs-status-workflow.rls.test.ts:97` also creates an anon client, but only uses it via `anon.from("blogs")` (RLS table-read isolation), never `.rpc()`. No interference with the 21 revoked RPCs.

**Cycle-2's claim of a single regression site is independently verified.** No additional `anon.rpc()` calls in the test suite would have been broken by the lockdown.

### 3. The assertion-contract change is correct

`tests/integration/rls/funnel-admin-rpc.test.ts` now pins two distinct contracts at two distinct lines:

| Line | Caller | Assertion | What it pins |
|------|--------|-----------|--------------|
| 53 | authenticated non-admin OWNER | `error.message =~ /unauthorized/i` | in-body `IF NOT is_admin() THEN RAISE` (defense-in-depth gate still fires for authenticated callers because they pass the role-level grant) |
| 74 | anonymous | `error.code ∈ {42501, 42883, PGRST202}` | role-level revoke (anon cannot reach the function body at all) |

This is the correct contract pair. The authenticated-non-admin path retains the message contract because authenticated still has EXECUTE (re-granted by v2 migration). The anon path correctly switched to the role-level-revoke contract. The inline comment at lines 69-73 documents this exactly.

### 4. Count drift is fully resolved

Cross-file count audit:

| Claim | Location | Value | Verified |
|---|---|---|---|
| Advisor flagged functions | `CYCLE-1.md:3` | 23 | ✓ |
| IDOR fixes | `CYCLE-1.md:11`, `v1.sql` | 2 | ✓ (`REVOKE EXECUTE ON FUNCTION` in v1: 2 × 3 forms each = 6 statements / 3 = 2 functions) |
| Defense-in-depth functions | `CYCLE-1.md:47`, `v2.sql` | 19 | ✓ (`grep -c "^REVOKE EXECUTE"` v2 = 19) |
| Defense-in-depth breakdown | `CYCLE-1.md:47, 61` | 16 gated + 3 no-param | ✓ (v2 SQL section headers: 3 self-targeting + 13 owner-id-param + 3 admin-gated = 19) |
| Total locked down | `CYCLE-1.md:49` | 21 (2 + 19) | ✓ |
| `REVOKED_FROM_ANON` array | `anon-rpc-grants.rls.test.ts:53-142` | 21 entries | ✓ (counted unique `name: "..."` keys, excluding nested `p_metric_name`) |
| `REVOKED_FROM_AUTHENTICATED` array | `anon-rpc-grants.rls.test.ts:151-161` | 2 entries | ✓ |
| Test docstring "revoke FROM PUBLIC on N functions" | `anon-rpc-grants.rls.test.ts:11` | 19 | ✓ (cycle-2 fix landed) |
| Audit doc "N anon-RPC tests" | `CYCLE-1.md:70` | 21 | ✓ (cycle-2 fix landed) |
| Verification table row sum | `CYCLE-1.md:60-63` | 2 + 19 + 1 + 1 = 23 | ✓ matches advisor flag total |

No remaining "20" or "22" references in any source-of-truth artifact. The two remaining hits (`pr-758-review/CYCLE-1.md`, `pr-758-review/CYCLE-2.md`) are historical review records — correct to leave them as-is.

### 5. `REVOKED_CODES` set is consistent across all role-level-revoke tests

`grep -rn '"42501"\|"42883"\|"PGRST202"' tests/integration/rls/`:

| File:line | Set used |
|---|---|
| `anon-rpc-grants.rls.test.ts:46` | `["42501", "42883", "PGRST202"]` (named constant) |
| `funnel-admin-rpc.test.ts:74` | `["42501", "42883", "PGRST202"]` (literal) |
| `admin-rpc-grants.rls.test.ts:50,56,64,72` | `["42501", "42883", "PGRST202"]` (literal × 4) |
| `users-privileged-columns.rls.test.ts:314` | `["42501", "42883", "PGRST202"]` (literal) |

All five sites use the identical 3-element set. No drift. (Note INF-01 below on duplication.)

### 6. Lint + typecheck clean at HEAD

- `bun run typecheck` → clean (`tsc --noEmit`)
- `bun run lint` → clean (`biome check`, 1217 files, no fixes)

### 7. `it()` runtime count math is consistent

`anon-rpc-grants.rls.test.ts` generates `it()` calls dynamically from the arrays:

- `REVOKED_FROM_ANON.length = 21` → 21 `it()` runs
- `REVOKED_FROM_AUTHENTICATED.length = 2` → 2 `it()` runs
- `is_admin()` positive contract → 1 `it()` run
- **Total: 24 `it()` runs**

Audit doc line 70 says "21 anon-RPC tests" — refers to the `anon cannot reach revoked SECURITY DEFINER functions` describe block specifically (not the file total). Correct framing.

---

## Findings

### P2-01 — Module docstring drift in `funnel-admin-rpc.test.ts:9-15`

**File:** `tests/integration/rls/funnel-admin-rpc.test.ts:9-15`

**Issue:** Cycle-2 updated the `it()` description (line 56) and added an inline comment (lines 69-73) explaining that the anon assertion switched from `/unauthorized/i` to `error.code ∈ {42501, 42883, PGRST202}`, but the file's top-level docstring still claims:

```
 * Asserts:
 *   1. non-admin OWNER caller gets error matching /unauthorized/i
 *   2. anonymous caller gets error matching /unauthorized/i   ← STALE
 *   3. admin caller on seeded cohort gets valid jsonb with 4 step rows,
 *   4. empty-cohort window ... returns 4 zero-count rows
```

Assertion (2) was changed by cycle-2 to a code-set check, not a message regex.

**Additionally, pre-existing drift in (3) and (4):** "4 step rows" and "4 zero-count rows" — the actual `it()` blocks at lines 208 and 256 assert `toHaveLength(3)` (signup + first_property + first_tenant; no fourth step exists in the seed). Pre-existing before this PR; not introduced by cycle-2.

**Fix:**
```
 * Asserts:
 *   1. non-admin OWNER caller gets error matching /unauthorized/i (in-body gate)
 *   2. anonymous caller gets role-level revoke code (42501 / 42883 / PGRST202)
 *   3. admin caller on seeded cohort gets valid jsonb with 3 step rows,
 *      correct step_order, and non-null cohort_label
 *   4. empty-cohort window (1970-01-01 -> 1970-01-02) returns 3 zero-count
 *      rows with null conversion rates (nullif div-by-zero safety)
```

**Severity:** P2 (documentation drift; no functional impact, but the inline comment + describe-string update should have flowed up to the module docstring for consistency). Not a merge blocker.

---

### INF-01 — `REVOKED_CODES` literal duplicated across 5 test sites

**Files:**
- `tests/integration/rls/anon-rpc-grants.rls.test.ts:46` (named constant)
- `tests/integration/rls/funnel-admin-rpc.test.ts:74` (literal)
- `tests/integration/rls/admin-rpc-grants.rls.test.ts:50,56,64,72` (literal × 4)
- `tests/integration/rls/users-privileged-columns.rls.test.ts:314` (literal)

**Issue:** The set `["42501", "42883", "PGRST202"]` is duplicated 7 times across 4 files. If PostgREST ever adds a new error code for revoked EXECUTE (or one of these gets retired), all 7 sites need to be updated in lockstep, with no compile-time enforcement. Already drifted once during cycle-2 (the old `funnel-admin-rpc.test.ts` regex didn't match the new codes).

**Fix:** Export `REVOKED_CODES` (and a helper like `expectRevoked(error)`) from `tests/integration/setup/supabase-client.ts` and import everywhere.

```typescript
// tests/integration/setup/supabase-client.ts
export const REVOKED_CODES = ["42501", "42883", "PGRST202"] as const;
export function expectRevoked(error: { code?: string } | null) {
  expect(error).not.toBeNull();
  expect(REVOKED_CODES).toContain(error?.code);
}
```

**Severity:** INFO (drift hazard, not a current bug). Acceptable to defer to a separate cleanup PR — does not gate this merge.

---

## Final summary

- **Total findings:** 0 P0 / 0 P1 / 1 P2 / 1 INFO
- **Verdict:** **CLEAN** — no P0 / P1 findings. Cycle-2 fixes are independently verified correct; no new regressions introduced by the cycle-2 commit; CI is genuinely green at HEAD; count claims are consistent across all source-of-truth artifacts.
- **First clean cycle — cycle 4 must also be CLEAN to close the merge gate.**

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cross-file + cross-artifact count audit + CI verification)_
