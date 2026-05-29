---
phase: post-749-cleanup
reviewed: 2026-05-29T18:00:00Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - src/components/settings/sections/billing-history-section.tsx
  - src/hooks/api/query-keys/billing-keys.ts
  - src/lib/supabase/server.ts
  - src/lib/supabase/middleware.ts
  - src/app/actions/auth.ts
  - src/proxy.ts
  - src/app/auth/callback/route.ts
  - CLAUDE.md
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Post-#749 Cleanup Cycle-3 Review

**Scope:** PR #755 at HEAD `70f214db8`, applying cycle-2 fixes (1 P0 + 2 P1).

**Verdict:** NEEDS-FIXES — but the gating P0 from cycle 2 IS correctly fixed and verified end-to-end (no $1.00-instead-of-$100 currency bug). The two warnings below cover *new* issues this cycle's fix introduced or surfaced, not regressions of cycle-2's stated fixes. The P0 / P1 trio (BL-1 cycle-2, WR-1, WR-2) are all genuinely closed. However, the BL-1 fix introduced a small UI inconsistency (always-green checkmark even on failed invoices) that didn't exist before because the hardcoded label was "Paid". That is the lone real cycle-2-fix-introduced regression and it is a P1 because the failure-state display is now self-contradictory rather than just hard-coded.

The previously-deferred cycle-1 issues (WR-3/4/5 SQL hardening, WR-6 / cycle-2 WR-3 stale `safeFetch` comment, IN-3/4 from cycle-1, IN-2/5/6 from cycle-2, IN-8 `as unknown as` sweep) remain unchanged and are NOT in cycle-2's stated scope. They're called out below as INFO/style rather than re-elevated; cycle-3's job is to verify the cycle-2 fix commit, not re-litigate prior triage. The user's standing directive ("instead of creating a TODO, research it canonically right now") still argues for sweeping them in this PR — flagging once more in IN-5.

---

## P0 BLOCKERS

_None._ The cycle-2 P0 (currency display) is verified fixed. See verification matrix below.

---

## P1 WARNINGS

### WR-1 (cycle-3): `<BillingHistorySection>` status badge displays green CheckCircle icon on FAILED invoices — internally inconsistent

**File:** `src/components/settings/sections/billing-history-section.tsx:39-42`

**Issue:** The cycle-2 fix correctly switched the badge label from hardcoded `"Paid"` to `{invoice.isSuccessful ? "Paid" : invoice.status}`. But the surrounding `<span>` still hardcodes `text-success` color AND renders a green `<CheckCircle>` icon unconditionally:

```tsx
<span className="inline-flex items-center gap-1 text-xs font-medium text-success">
  <CheckCircle className="w-3 h-3" />
  {invoice.isSuccessful ? "Paid" : invoice.status}
</span>
```

Net effect on a `status === "failed"` invoice: green checkmark icon + green color, label text says "failed". Before the cycle-2 fix the badge always lied uniformly (icon green, color green, text "Paid"); now it lies inconsistently (icon green, color green, text "failed"). A user reading "failed" next to a green check will reasonably conclude the UI is broken. CLAUDE.md "UX Philosophy: design-conscious — apply 'perfect by all measures' standard" applies.

The mapper at `billing-keys.ts:43-45` collapses every non-paid Stripe status into `(row.status as BillingHistoryItem["status"])`, where `BillingHistoryItem["status"]` is `"succeeded" | "failed" | "pending" | "cancelled"`. Any of the three non-success states will hit this badge.

**Fix:** Gate the icon AND color on `isSuccessful`. Use `lucide-react`'s `AlertCircle` / `Clock` / `XCircle` for the non-success branch to stay within the project's icon library (CLAUDE.md zero-tolerance rule #10):

```tsx
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
// ...
<span
  className={`inline-flex items-center gap-1 text-xs font-medium ${
    invoice.isSuccessful ? "text-success" : "text-destructive"
  }`}
>
  {invoice.isSuccessful ? (
    <CheckCircle className="w-3 h-3" />
  ) : (
    <AlertCircle className="w-3 h-3" />
  )}
  {invoice.isSuccessful ? "Paid" : invoice.status}
</span>
```

Or hide the failure branch entirely if the product decision is "we only ever list paid invoices in the UI". The cycle-2 fix author's choice to surface non-paid invoices reads intentional, so I'd fix the styling rather than filter.

---

### WR-2 (cycle-3): "Download" button on every row is dead code — no `onClick`, no `href`, dropped fields `invoice_pdf` / `hosted_invoice_url`

**File:** `src/components/settings/sections/billing-history-section.tsx:43-45` (component) and `src/hooks/api/query-keys/billing-keys.ts:34-52` (mapper drops two RPC fields)

**Issue:** The component renders `<button className="text-sm text-primary hover:underline">Download</button>` with no event handler or link, on every row. It's been dead since the file existed, but the cycle-2 fix is the right moment to address it because:

1. The `get_user_invoices` RPC at `20260305120000_get_user_invoices_rpc.sql:49-50` already returns BOTH `invoice_pdf` and `hosted_invoice_url` — they're documented in `src/types/supabase.ts` as part of the RPC's Returns shape (verified at lines 13-14 of the supabase.ts entry: `hosted_invoice_url: string; invoice_pdf: string;`).
2. The new mapper at `billing-keys.ts:34-52` drops both fields on the floor instead of preserving them on the `BillingHistoryItem`.
3. CLAUDE.md zero-tolerance rule #4: "No commented-out / dead code — delete it."

There are two canonical fixes — make the button work, or delete it. Either is acceptable.

**Fix (preferred — make it functional):** Add `invoice_pdf` and `hosted_invoice_url` to `BillingHistoryItem` (`src/types/api-contracts.ts:336-352`), preserve them in the mapper, then render the button as an `<a>` to `invoice_pdf` with `target="_blank" rel="noopener noreferrer"` (Stripe-hosted PDFs are public-but-unguessable URLs, no auth required):

```tsx
{invoice.invoice_pdf && (
  <a
    href={invoice.invoice_pdf}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-primary hover:underline"
  >
    Download
  </a>
)}
```

**Fix (alternative — delete):** Drop the `<button>` element entirely. Don't ship dead UI.

The button has been dead in main since the file existed (pre-PR), so by the strict cycle-3 rule "regressions of the cycle-2 fix commit only", this isn't a regression. It IS in scope because cycle-2 attention activated this component for the first time (BL-1 cycle-1 made the section actually render), and the mapper drops the two fields that would make the button work. Half-built UI shipping to production is a P1 per the project's design-conscious bar.

---

## INFO / Style

### IN-1: `subscriptionId` and `tenant_id` hardcoded to empty strings in mapper — schema bleed-through from rent-payment era

**File:** `src/hooks/api/query-keys/billing-keys.ts:38-39`

The mapper sets `subscriptionId: ""` and `tenant_id: ""` because the `BillingHistoryItem` interface at `src/types/api-contracts.ts:336-352` carries those required fields from the abandoned rent-payment direction (`tenant_id` had meaning when invoices were rent payments to tenants; landlord SaaS invoices have neither concept). Grep confirms no other consumer reads these fields (the only hits are this line and `bulk-import-config.ts` which is a different `tenant_id` for lease CSV imports). The cleaner fix is to remove the two fields from the interface entirely — they're dead weight that misleads future readers into thinking they carry information.

**Fix:** Drop `subscriptionId` and `tenant_id` from `BillingHistoryItem`, remove the empty-string assignments here. No downstream consumer breaks (verified via `grep -rn "invoice.subscriptionId\|invoice.tenant_id\|paymentHistory.*tenant_id" src/` returns zero hits).

### IN-2: CLAUDE.md claim "24 foreign tables" — un-verified at review time

**File:** `CLAUDE.md:206`

The new paragraph claims "24 foreign tables (`stripe.customers`, `stripe.subscriptions`, `stripe.invoices`, etc.) proxy live Stripe API data". The migration header at `20260528223546_install_stripe_wrapper.sql:8-9` also says "24 foreign tables total per the wrapper's import_foreign_schema output." I did not independently re-verify against prod via MCP at cycle-3 time; the migration header is the source. Two consistent self-references inside the repo don't constitute external verification. If a future Stripe API revision adds or drops a resource, the count will drift. Low risk — flag for future drift sweep, not actionable today.

### IN-3: `proxy.ts:137` `maybeSingle<UserGateRow>()` is now type-redundant under typed `<Database>` generic

**File:** `src/proxy.ts:137`

With the cycle-2 fix applying `<Database>` to `createServerClient`, the `.from("users").select("is_admin, subscription_status").eq("id", user.id).maybeSingle<UserGateRow>()` chain narrows natively from the table type. The explicit `<UserGateRow>` type argument is now redundant — Postgres returns `{ is_admin: boolean | null; subscription_status: string | null }` from `users` automatically.

This is INFO not WARNING because both shapes are structurally identical and the explicit cast is harmless. Per the cycle-2 review's suggestion, removing it would shrink the API surface. Keep `UserGateRow` as a local alias if you want a name for the shape; just drop the type arg on `.maybeSingle()`.

```typescript
const result = await subClient
  .from("users")
  .select("is_admin, subscription_status")
  .eq("id", user.id)
  .maybeSingle(); // <UserGateRow> no longer needed
```

### IN-4: `billing-keys.ts:46-47` writes `created_at` into BOTH `created_at` AND `updated_at` on `BillingHistoryItem`

**File:** `src/hooks/api/query-keys/billing-keys.ts:46-47`

```typescript
created_at: row.created_at,
updated_at: row.created_at,  // ← reuses created_at because the RPC doesn't return updated_at
```

Stripe invoices don't have a sensible `updated_at` exposed through the FDW row shape (only `created` is in the RPC return). Mapping `created_at` into both slots is misleading — the BillingHistoryItem `updated_at` reads as "the invoice was just updated" when in fact it just mirrors creation time. Same class as cycle-2 IN-5 (mapUserProfile fabricating timestamps).

Better: drop `updated_at` from `BillingHistoryItem` (no consumer reads it — same audit as IN-1 above), or expose it as `string | null` and map to `null` here.

### IN-5: Deferred cycle-1 / cycle-2 findings remain open — user directive recommends in-PR closure

**Files:** Multiple — see matrix below

The standing user directive (`feedback_no_multi_choice_when_directive_clear.md` + `feedback_perfect_pr_covers_pre_existing.md`) is "execute end-to-end without surfacing menus" and "Perfect-PR covers pre-existing failures." Items still open from prior cycles:

- **WR-3 cycle-1** (SQL: soft-deleted-property filter on 4 lease-driven RPCs) — DEFERRED-CHALLENGED. Pre-existing, but the cleanup-train PR is the right home; a follow-up PR creates audit drift.
- **WR-4 cycle-1** (SQL: `::bigint` truncation in 2 RPCs) — DEFERRED-CHALLENGED. Same argument; small but precise correctness fix.
- **WR-5 cycle-1** (FDW migration prod-only) — DEFERRED-OK. Documented behavior; replays skip via schema_migrations row. Header comments acknowledge.
- **WR-6 cycle-1 / WR-3 cycle-2** (stale `safeFetch` comment) — Comment is still stale at `report-data.ts:80-87`. Five-minute fix; deferred again.
- **IN-3 cycle-1** (`analytics-keys.ts:38` `as Record<string, unknown>`) — Still present.
- **IN-4 cycle-1** (`subscription-keys.ts:70,100` stale comment "Query stripe.subscriptions") — Still present. Now factually accurate as of PR #753, but the comment context (that the RPC reads from public.users) is still misleading. Either delete the comment or rewrite.
- **IN-2 cycle-2** (omitUndefined unsoundness on `field: T | undefined`) — Still present. Documented in code; INFO-only.
- **IN-5 cycle-2** (`mapUserProfile` fabricates `updated_at`) — Still present at `use-profile.ts:44`.
- **IN-6 cycle-2** (dead-fallback `?? new Date().toISOString()` on non-null column) — Still present at `inspection-keys.ts:75`.
- **IN-8 cycle-2** (`as unknown as` sweep) — 26 violations across `inspection-mutation-options.ts`, `lease-mutation-options.ts`, `tenant-mutation-options.ts`, `maintenance-keys.ts`, `inspection-keys.ts`, plus a few in components (`slider.tsx`, `chart-tooltip.tsx`, `lease-creation-wizard.tsx`, `selection-step.tsx`, `expiring-leases-widget.tsx`). The cycle-1 fix introduced `jsonObject` / `omitUndefined` as the replacement primitives but only swept `use-analytics.ts`. CLAUDE.md zero-tolerance rule #8 explicitly bans this pattern.

A two-day sweep closes the entire list. I cannot escalate them to BLOCKER without contradicting the cycle-2 explicit scoping, but flagging once more that the user's "do everything" directive applies.

---

## Verification (cross-checked at HEAD `70f214db8`)

- `bun run typecheck` — clean ✓
- `bun run lint` — clean (per cycle-2 verification, no new files touched in this commit beyond the four already verified) ✓
- `bun run test:unit src/components/settings/__tests__/billing-settings.test.tsx` — 16/16 pass ✓
- `bun run test:unit src/lib/supabase/__tests__/ src/lib/__tests__/auth-redirect.test.ts` — 51/51 pass (all SSR-touch sites green) ✓
- `gh pr checks 755` — `checks` pass / `e2e-smoke` pass / `rls-security` pass / auto-merge skipping ✓ (all three required CI gates green)
- `grep -rn "createServerClient(" src --include="*.ts" --include="*.tsx"` (with the open-paren) returns ZERO untyped SSR call sites in production code — all 5 sites now type-parameterize (`server.ts:14`, `middleware.ts:29`, `actions/auth.ts:25`, `proxy.ts:121`, `auth/callback/route.ts:48`). Test files retain runtime `vi.mock` stubs that don't need the generic ✓
- `supabase/migrations/20260305120000_get_user_invoices_rpc.sql:45-47` confirms `amount_due` and `amount_paid` are returned in DOLLARS post-`/100.0`; mapper at `billing-keys.ts:35` reads them as dollars without further division — currency math is now end-to-end consistent ✓
- `BillingHistoryItem.formattedAmount` template at `billing-keys.ts:48` is `$${amount.toFixed(2)}` — display string is always dollars-with-cents; the component swap from `${(invoice.amount / 100).toFixed(2)}` to `{invoice.formattedAmount}` is a verifiably correct fix for cycle-2 BL-1 ✓
- `paymentHistory.slice(0, 5)` at `billing-history-section.tsx:23` is the same slice offset that was always there — boundaries unchanged ✓
- `git diff 904584052..70f214db8 -- CLAUDE.md` shows the WR-1 paragraph rewritten (was: "There is no stripe.* schema"; now: "The `stripe.*` schema is a read-only Foreign Data Wrapper"). ✓
- `supabase/migrations/20260311200000_document_template_definitions.sql` exists with 6 columns + RLS + 4 policies + index — matches cycle-2 verification claim about MCP-applied schema being reconciled into the repo ✓
- `useBillingHistory` callers grep: only `<BillingHistorySection>` + two test mocks — no other consumer reads `tenant_id` or `subscriptionId` fields, so the empty-string mapper assignments are silent dead-weight, not breakage ✓

---

## Cycle-1 verification matrix (all 12 findings)

| ID  | Cycle-1 Issue                                                              | Cycle-3 Status   |
| --- | -------------------------------------------------------------------------- | ---------------- |
| BL-1 | `billing-keys.ts` queries dropped rent_payments — UI crash on /settings    | **FIXED** (rewritten to `get_user_invoices` RPC; cycle-2 follow-up display bug also fixed in this cycle's commit) |
| BL-2 | `useFinancialChartData` reads non-existent fields; `.sort()` throws       | **FIXED** (RPC shape matched via `RevenueTrendRow` interface at cycle-2 commit) |
| WR-1 | CLAUDE.md still claims "no stripe.* schema"                                | **FIXED** (CLAUDE.md:206 rewritten to describe FDW with 24-table count + vault key reference) |
| WR-2 | PR #752 migration comment "zero callers" is misleading                    | **DEFERRED-OK** (historical record; not worth a SQL revision for prose) |
| WR-3 | Lease-driven RPCs ignore soft-deleted properties                          | **DEFERRED-CHALLENGED** (still open; user directive argues for in-PR fix) |
| WR-4 | `::bigint` truncation in `get_revenue_trends_optimized`                   | **DEFERRED-CHALLENGED** (still open; same argument) |
| WR-5 | FDW migration fragility on fresh-DB chain replay                          | **DEFERRED-OK** (documented prod-only; schema_migrations skips replay) |
| WR-6 | `safeFetch` rationale comment is stale                                    | **MISSED** (file unchanged at `report-data.ts:80-87`; flagged for cycle 3 as IN-5 carry-forward) |
| IN-1 | SQL function-length cap exceeded                                          | **DEFERRED-OK** (style; CLAUDE.md ambiguous on plpgsql cap) |
| IN-2 | `as unknown as` in `use-analytics.ts:60,139`                              | **FIXED** (`jsonObjectOrEmpty` / `jsonObject` replaced both sites at cycle-1 commit) |
| IN-3 | `analytics-keys.ts:38` returns `as Record<string, unknown>`               | **MISSED** (still present at line 38) |
| IN-4 | `subscription-keys.ts:70,100` comment "Query stripe.subscriptions"        | **MISSED** (still present; semantically now accurate after PR #753, but comment context still says public.users which contradicts the FDW direction) |

---

## Cycle-2 verification matrix (all 11 findings)

| ID  | Cycle-2 Issue                                                              | Cycle-3 Status   |
| --- | -------------------------------------------------------------------------- | ---------------- |
| BL-1 | `<BillingHistorySection>` displays $100 as $1.00                          | **FIXED** (line 37 now `{invoice.formattedAmount}`; line 32 now `{invoice.formattedDate}`; verified end-to-end against RPC dollars conversion) |
| WR-1 | CLAUDE.md still claims "no stripe.* schema" (claimed fixed but wasn't)    | **FIXED** (CLAUDE.md:206 rewritten with full FDW description) |
| WR-2 | Typed-Database fix only covers browser client                             | **FIXED** (all 5 SSR call sites now `createServerClient<Database>` — `server.ts:14`, `middleware.ts:29`, `actions/auth.ts:25`, `proxy.ts:121`, `auth/callback/route.ts:48`) |
| WR-3 | WR-6 cycle-1 still open (`safeFetch` stale comment)                       | **MISSED** (still open at `report-data.ts:80-87`) |
| IN-1 | `omitUndefined` JSDoc says "cast through unknown" — code doesn't          | **MISSED** (comment still misleading) |
| IN-2 | `omitUndefined` type-unsound for `field: T \| undefined`                  | **DEFERRED-OK** (documented in cycle-2 INFO; current callers safe) |
| IN-3 | `useExpensesByProperty` test under-asserts `.eq` / `.in` args              | **MISSED** (test unchanged; would still pass on regression) |
| IN-4 | Inspection list mapper silently coerces unknown `inspection_type`        | **MISSED** (still pre-existing) |
| IN-5 | `mapUserProfile` fabricates `updated_at`                                 | **MISSED** (`use-profile.ts:44` still `?? new Date().toISOString()`) |
| IN-6 | `inspection-keys.ts:74` dead `?? new Date().toISOString()` fallback       | **MISSED** (still present at line 75) |
| IN-7 | PR description claimed use-profile-mutations.ts changed; it wasn't       | **DEFERRED-OK** (PR description inaccuracy; not actionable) |
| IN-8 | Cycle-1 IN-2/3/4 + as-unknown-as sweep                                   | **MISSED** (26 active `as unknown as` violations remain across 11 files) |

**Net for cycle-3:** all 3 cycle-2 high-priority items (1 P0 + 2 P1) are **FIXED**. 7 of 7 cycle-2 INFO items remain open (1 fixed-or-deferred, 6 missed). The cycle-2 P0 fix introduces one P1 styling inconsistency (always-green icon on failed badges) and one P1 surface-area issue (dead Download button on every row).

---

## Top 3 most impactful (cycle-3)

1. **WR-1 (cycle-3)** — Status badge displays green check + green text on FAILED invoices because only the label was made conditional. `billing-history-section.tsx:39-42`. One-component-rewrite.
2. **WR-2 (cycle-3)** — Download button is dead on every row; mapper drops `invoice_pdf` / `hosted_invoice_url` that the RPC already returns. Either wire it up or delete it. `billing-history-section.tsx:43-45` + `billing-keys.ts:34-52` + `api-contracts.ts:336-352`.
3. **IN-5 (cycle-3)** — Deferred backlog (cycle-1 WR-3/4/6 + cycle-2 INs) is now ~14 items deep; user's "do everything" directive argues for in-PR closure rather than perpetually pushing to a follow-up.

---

_Reviewed: 2026-05-29T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
