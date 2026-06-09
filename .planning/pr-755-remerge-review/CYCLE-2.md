---
review: PR #755 re-merge gate — CYCLE 2 (gate-closing)
head: 429d652be15db2fda4eb1176f6cf053e892d2c5c
branch: gsd/post-749-cleanup-review
reviewed: 2026-05-29
depth: standard (re-validation after conflict-free merge of origin/main)
findings:
  p0: 0
  p1: 0
  p2: 0
  info: 2
  total: 2
verdict: CLEAN
---

# PR #755 Re-Merge Gate — Cycle 2 (gate-closing)

**HEAD:** `429d652be`
**Stance:** Independent re-derivation. Did not trust cycle-1's claims; re-ran every check.

## Summary

Re-verification cycle 2 on PR #755 after the conflict-free merge of `origin/main`.
Every independent check passed. The live billing-history production crash
(`rent_payments` 42P01 on `/settings`) is fixed at the source. CI is genuinely
green at HEAD. No regressions, no conflict residue, no real type-safety
violations introduced by the merge. Two INFO items, both pre-existing and
non-blocking.

## Independent verification results

### 1. CI genuinely green at HEAD `429d652be` — PASS
`gh pr checks 755`:
- `checks` — **pass** (1m48s)
- `e2e-smoke` — **pass** (3m0s)
- `rls-security` — **pass** (1m34s)
- `Aikido Security` — **pass** (33s)
- `auto-merge` — skipping (expected; not a gate)

All three required gates pass, none pending. HEAD on the run matches `429d652be`.

### 2. Billing crash fixed — PASS
- `billing-keys.ts` is **55 lines**.
- `history()` queryFn uses `.rpc("get_user_invoices", { p_limit: 50 })` (billing-keys.ts:30-32).
- The **only** `rent_payments` occurrence is the comment at line 19 documenting
  the deleted legacy factories. No live query touches it.
- `BillingHistoryItem` mapper (billing-keys.ts:34-51) reads only
  `amount_paid`, `amount_due`, `invoice_id`, `status`, `created_at`,
  `invoice_pdf`, `hosted_invoice_url` — all 7 present in the typed
  `get_user_invoices` `Returns` row (supabase.ts:2581-2590). No phantom fields.
- Mapper output is exactly the 10-field `BillingHistoryItem` contract
  (api-contracts.ts:337-348). Shape matches 1:1.
- `billing-history-section.tsx` renders the new shape: `invoice.id`,
  `formattedDate`, `formattedAmount`, `isSuccessful`, `invoice_pdf`,
  `hosted_invoice_url`, `status`. **No dropped `rent_payments`-era fields**
  (no `subscription_id`, no `payment_method`, etc.). The deleted
  `invoices()`/`failed()`/`*BySubscription()` factories have no remaining
  consumers — `use-billing.ts` only calls `billingQueries.history()`.

### 3. No dropped table still queryable in typed code — PASS
- `grep "from(\"rent_payments\"|from('rent_payments')" src` → **zero hits**.
- `grep -c "rent_payments" src/types/supabase.ts` → **0**. The table is not
  typed, so any future `.from("rent_payments")` would be a compile error
  (defense-in-depth holds).

### 4. Merge integrity — PASS
- `grep "^<<<<<<<|^=======|^>>>>>>>" CLAUDE.md src supabase tests` → **zero** conflict markers.
- CLAUDE.md:164 — CORS fail-closed paragraph correctly reads `NEXT_PUBLIC_APP_URL`
  (the renamed env var from main's drift fixes). Coherent.
- CLAUDE.md:206 — FDW billing paragraph intact: `get_user_invoices` reads
  `stripe.invoices` through the Foreign Data Wrapper. Coherent and consistent
  with the billing-keys.ts implementation.

### 5. Full regression sweep on merged tree — PASS
- **`as unknown as`**: 4 grep hits, **all in comments/docstrings** describing the
  banned pattern (`msw-polyfill.ts:9`, `property-stats-keys.ts:35`,
  `document-keys.ts:119`, `rpc-shape.ts:10`). **Zero real casts.**
- **`: any`**: 1 hit — `rpc.ts:47` is the comment "Fallback: any unhandled RPC".
  Not a type annotation.
- **Barrel files** (`index.ts` with `export * from`): **none**.
- **`@radix-ui/react-icons`**: **none**.

### 6. Local quality gates — PASS
- `bun run typecheck` (`tsc --noEmit`) → clean (no output, no errors).
- `bun run lint` (`biome check`) → clean (1220 files checked, no fixes applied).
  Confirms cycle-1's claim independently.

### 7. Diff hygiene scan — 1 INFO (see below)
- Full diff: **54 files** = 48 `src/` + `CLAUDE.md` + 5 committed planning docs.
- All 48 src files are consistent with "typed `Database<>` client + drift
  fixes" (query-key factories, hooks, RPC-shape helpers, type files,
  supabase.ts regen, billing fix). No stray/unrelated source files.

---

## Findings

### INFO-1 — Five prior review-cycle docs committed in the PR diff

**Files:** `.planning/post-749-review/CYCLE-1.md` … `CYCLE-5.md` (all `A`dded)
**Issue:** This PR's own prior 5 review-cycle markdown files are committed
(tracked, not gitignored) and ride along in the `origin/main...HEAD` diff. The
brief explicitly flagged committed planning docs in #755's diff as noise. They
have zero runtime/type/security impact, but they are review artifacts in a
"typed client + drift fixes" PR.
**Severity:** INFO — cosmetic diff noise; does not block merge.
**Fix (optional, non-blocking):** `git rm --cached .planning/post-749-review/CYCLE-*.md`
before merge, or add `.planning/` to `.gitignore` if planning artifacts should
never be tracked. Not required to close the gate.

### INFO-2 — Stripe-native invoice statuses pass through unmapped (pre-existing)

**File:** `src/hooks/api/query-keys/billing-keys.ts:40-43`
**Issue:** `get_user_invoices` returns `status: string` (raw Stripe FDW value:
`draft|open|paid|uncollectible|void`). The mapper maps `"paid" → "succeeded"`
but casts every other value directly to the `BillingHistoryItem["status"]`
union (`succeeded|failed|pending|cancelled`). A `void` / `uncollectible` /
`draft` / `open` invoice carries a status string outside the union;
`getStatusVisual` falls through to the default `Clock` branch and renders the
raw Stripe string as the label. **Display-only, no crash, no type error** (it is
a cast, not a runtime guard).
**Severity:** INFO — pre-existing through all 6 prior clean cycles + cycle 1;
**not a regression** introduced by the merge. Out of scope for the re-merge
gate. Noted for completeness only.
**Fix (future, optional):** explicit status map at the boundary
(`open → pending`, `void|uncollectible → cancelled`, else `failed`) instead of a
blind cast.

---

## Verdict

**CLEAN** — 0 P0 / 0 P1 / 0 P2 / 2 INFO (both pre-existing, both non-blocking).

Second consecutive clean re-verification cycle — re-merge gate CLOSED.
PR #755 is ready to merge; it fixes the live billing-history production crash
(`/settings` BillingHistorySection 42P01 on the dropped `rent_payments` table).
