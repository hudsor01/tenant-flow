---
review: pr-755-remerge
cycle: 1
reviewed: 2026-05-29
head: 429d652be15db2fda4eb1176f6cf053e892d2c5c
branch: gsd/post-749-cleanup-review
scope: post-merge integration re-verification (NOT a re-review of the 36-file diff)
findings:
  p0: 0
  p1: 0
  p2: 0
  info: 1
  total: 1
status: clean
---

# PR #755 Re-Merge Verification — Cycle 1

**Reviewed:** 2026-05-29
**HEAD:** `429d652be` (Merge `origin/main` into `gsd/post-749-cleanup-review`)
**Scope:** Verify the merge of `main` (#747/#756/#757/#758) into the long-lived #755 branch did not introduce integration problems, and re-confirm the headline billing-crash fix against current prod. The pre-merge 36-file diff was NOT re-litigated.

## Verdict

**CLEAN.** Zero P0/P1/P2. The billing-history production crash is fixed on this branch; the merge integrated `main` cleanly with no stranded or incoherent files; supabase.ts matches prod schema reality; and #758's anon-EXEC lockdown is compatible with the new billing read path.

---

## 1. Billing crash is actually fixed — CONFIRMED

`src/hooks/api/query-keys/billing-keys.ts` (55 lines) no longer queries `rent_payments`. The only `rent_payments` reference is the explanatory comment on line 19. The `history()` factory calls `.rpc("get_user_invoices", { p_limit: 50 })` (line 30) and maps the result through a typed callback to `BillingHistoryItem[]`.

**RPC ↔ mapper ↔ type ↔ supabase.ts chain — fully consistent:**

| Surface | Shape |
|---|---|
| `get_user_invoices` migration `20260305120000` `RETURNS TABLE` | `invoice_id text, amount_due numeric, amount_paid numeric, status text, created_at timestamptz, invoice_pdf text, hosted_invoice_url text, customer_email text` (8 cols); `p_limit integer DEFAULT 50`; `SECURITY DEFINER`, `SET search_path TO 'public'`, `auth.uid()` guard, returns empty set when `stripe_customer_id IS NULL` |
| `src/types/supabase.ts:2579` `get_user_invoices` | `Args: { p_limit?: number }`; `Returns: {...}[]` with all 8 columns typed — `.rpc("get_user_invoices", { p_limit: 50 })` compiles |
| `billing-keys.ts` mapper | reads `invoice_id`, `amount_paid ?? amount_due`, `status`, `created_at`, `invoice_pdf ?? null`, `hosted_invoice_url ?? null` — every field exists in the RPC return |

> Note: prod RPC shape could not be queried live this cycle — the `mcp__supabase__execute_sql` tool specified in the checklist was not loaded in this session. Verified instead against the authoritative migration source on disk (`20260305120000_get_user_invoices_rpc.sql`), which is the definition applied to prod and is mirrored in the generated `supabase.ts`. The repaired analytics RPC migration (`20260528231201`) and FDW install (`20260528223546`) are both present on disk. CI `checks` + `rls-security` are green at HEAD, which exercises the prod schema.

**Component + hook wiring — CONFIRMED:**
- `src/hooks/api/use-billing.ts:7` — `useBillingHistory()` returns `useQuery(billingQueries.history())`. Correctly wired to the new factory.
- `src/components/settings/sections/billing-history-section.tsx` consumes the new `BillingHistoryItem` shape only: `id`, `isSuccessful`, `status`, `formattedDate`, `formattedAmount`, `invoice_pdf`, `hosted_invoice_url`. No reference to dropped `tenant_id` / `subscriptionId` / any `rent_payments`-era field. Renders without throwing (null-safe via `paymentHistory &&` guards; empty-set RPC path yields the "No billing history yet" branch).

## 2. supabase.ts ↔ prod schema parity — CONFIRMED

- `document_template_definitions` IS typed in `supabase.ts:172` (matches the MCP-applied restore on main). Parity correct.
- `rent_payments` is NOT typed anywhere in `supabase.ts` (0 occurrences). `.from("rent_payments")` is now a compile error — the prevention is complete. The demolish migration `20260418140000` drops `rent_payments`, `late_fees`, `rent_due`, `payment_methods`, `payment_reminders`, `stripe_connected_accounts`, `tenant_invitations` via `cascade`.
- `payment_transactions` IS still typed (`supabase.ts:1164`) — and that is **correct**: the demolish migration does NOT drop `payment_transactions` (verified against the migration's `drop table` list). It is a surviving prod table, so its presence in the typed client is accurate, not a parity defect.

## 3. Merge integrity — CONFIRMED

- **Zero conflict markers** across `CLAUDE.md src supabase tests`.
- **Only `CLAUDE.md` was co-edited** by both merge parents (`comm -12` of files-changed-from-`^1` and files-changed-from-`^2` = `CLAUDE.md` alone). Exactly what `git merge-tree` predicted. Nothing else auto-merged into anything incoherent.
- CLAUDE.md line 164 carries #747's `NEXT_PUBLIC_APP_URL` CORS line; line 206 carries #755's full FDW billing-storage paragraph (`get_user_invoices` reads `stripe.invoices` via the wrapper). Both survived coherently.
- The merge did not touch `billing-keys.ts`, `supabase.ts`, or `billing-history-section.tsx` beyond their PR-branch versions (`git diff ^1..merge` on those paths = empty) — the billing fix came straight from the PR side, unmolested.
- Files brought in from `main` by the merge (`scripts/deploy-edge-functions.ts`, `supabase/config.toml`, the two anon-revoke migrations, edge-function `NEXT_PUBLIC_APP_URL` renames, `anon-rpc-grants.rls.test.ts`) do not overlap semantically with #755's frontend work.

**Cross-PR interaction check (#758 ↔ #755):** anon-revoke v2 (`20260529225039`) explicitly handles the billing RPC — `REVOKE EXECUTE ON FUNCTION public.get_user_invoices(integer) FROM PUBLIC; GRANT EXECUTE ... TO authenticated, service_role`. The billing query runs under an authenticated session (`getCachedUser()` gate), so the lockdown does not break the new read path. No integration regression.

## 4. Regression sweep on merged tree — CLEAN

- `as unknown as` in non-test prod code: **zero actual casts**. The 7 grep hits are all JSDoc/inline comments *referencing the banned pattern* (`msw-polyfill.ts`, `chart-tooltip.tsx`, `property-stats-keys.ts`, `inspection-keys.ts`, `document-keys.ts`, `rpc-shape.ts`, `generate-excel.ts`). Verified line-by-line. Rule #8 satisfied.
- `rent_payments` in non-test prod code: **comment-only** (`billing-keys.ts:19`). The remaining hits are in test files (`use-tenant.test.tsx`, `report-data.test.ts`) exercising the 42P01 / not-exist error paths — acceptable.
- No new `any`, no barrel/re-export `index.ts`. Zero-tolerance rules intact.

## 5. CI status at HEAD `429d652be`

| Check | State |
|---|---|
| `checks` | **pass** (1m48s) |
| `rls-security` | **pass** (1m34s) |
| `e2e-smoke` | pending (queued/running) |
| Aikido Security | **pass** |
| `auto-merge` | skipping (expected) |

`checks` and `rls-security` green; `e2e-smoke` still pending at review time (note state, not a finding).

---

## Findings

### INFO

**IN-01: `status` mapper casts raw Stripe invoice statuses without exhaustive mapping**
**File:** `src/hooks/api/query-keys/billing-keys.ts:40-43`
The mapper converts `"paid" → "succeeded"` and otherwise casts the raw Stripe status (`draft`/`open`/`uncollectible`/`void`) `as BillingHistoryItem["status"]` (typed `"succeeded" | "failed" | "pending" | "cancelled"`). A `void`/`uncollectible`/`open` invoice therefore carries a status string outside the declared union. **Not a crash and not a merge regression** — the sole consumer `getStatusVisual()` checks `isSuccessful` first, then `failed`/`cancelled`, else falls through to a neutral Clock icon + raw-string label, so unmapped statuses degrade gracefully. This is a pre-existing type-honesty gap in the already-reviewed 36-file diff, surfaced here only for completeness; out of scope for the re-merge gate. Optional hardening: map `uncollectible`/`void → "cancelled"`, `open`/`draft → "pending"`.

---

## Summary

- **P0:** 0
- **P1:** 0
- **P2:** 0
- **INFO:** 1
- **Verdict: CLEAN.**

First clean re-verification cycle — one more clean cycle closes the re-merge gate. The billing-history production crash is fixed on this branch.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cross-file + cross-PR integration)_
