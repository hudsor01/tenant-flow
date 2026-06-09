# PR #747 — Perfect-PR Review, Cycle 2

**Reviewed:** 2026-05-29
**HEAD:** `b0e2dafc2343b96f83e702d07a30293f17d6762b`
**Branch:** `chore/env-standardize-app-url`
**Base:** `main` @ `0a7bce8a1`
**Cycle 1 verdict:** CLEAN (0 findings)
**Cycle 2 mandate:** Independent re-verification of cycle 1 + catch anything cycle 1 missed.

---

## Finding totals

| Severity | Count |
|----------|-------|
| P0       | 0     |
| P1       | 0     |
| P2       | 0     |
| INFO     | 0     |

## Verdict

**CLEAN.** Second consecutive clean cycle — perfect-PR merge gate CLOSED. PR #747 is ready for merge.

---

## Independent re-verification log

### 1. `FRONTEND_URL` global sweep — re-run

```
grep -rn "FRONTEND_URL" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude=bun.lock
```

Hits (live tree, excluding `.planning/`):
- `tests/e2e/playwright.config.prod.ts:14-15,52` — `PROD_FRONTEND_URL` local TS const + reading optional env override. Carve-out per PR description (local-only Playwright var name, not a deployed env contract).
- `tests/e2e/playwright.config.ts:28,95,228,234,244` — `TEST_FRONTEND_URL` local TS const. Same carve-out. Line 228+244 correctly export `NEXT_PUBLIC_APP_URL='${TEST_FRONTEND_URL}'` to the spawned dev server's env, which is the right wiring (test scaffolding can call its local var whatever; the contract crossing the process boundary is `NEXT_PUBLIC_APP_URL`).

Hits inside `.planning/`:
- Six in `.planning/milestones/v1.0-phases/06-blog-rebuild/` (PLAN.md + SUMMARY.md + N8N-FLOW.md) — archived/historical planning artifacts from v1.0, intentionally untouched.
- Seven in `.planning/pr-747-review/CYCLE-1.md` — discussion of the rename itself; meta, not stale.

Hits in `src/`: **0.** Hits in `supabase/`: **0.** Hits in `.github/`, `scripts/`, `vercel.json`, `package.json`, `next.config.ts`: **0.** Hits in `CLAUDE.md`, `SECURITY.md`: **0.**

Cycle 1's "zero hits" claim **confirmed.**

### 2. `_shared/cors.ts` — independent re-read

Read full file (65 lines). The canonical reader is at line 13: `Deno.env.get("NEXT_PUBLIC_APP_URL")`. Fail-closed path verified:

- Line 15: `if (!frontendUrl)` — branches on both undefined and empty string (`!"" === true`)
- Line 16-19: logs `console.error` with new name, returns `{}` (empty headers, no CORS)
- Line 24: also returns `{}` if origin missing or mismatched

`handleCorsOptions` (line 41) returns `204` with `null` body when no CORS headers, `200 "ok"` with headers when matched. Both are spec-compliant preflight responses. Fail-closed behavior preserved as cycle 1 claimed.

### 3. `_shared/` exhaustive sweep

```
grep -rn "FRONTEND_URL\|frontendUrl\|FrontendUrl\|frontend_url" supabase/functions/_shared/
```

Only hits are the renamed `cors.ts` lines (8, 9, 13, 17, 24) and the local-variable name `frontendUrl` (a TS identifier inside `cors.ts`). All other `_shared/` files (`auth-email-templates.ts`, `auth.ts`, `email-layout.ts`, `env.ts`, `errors.ts`, `escape-html.ts`, `plan-tier.ts`, `rate-limit.ts`, `resend.ts`, `stripe-client.ts`, `supabase-client.ts`, `tier-gate.ts`) have **zero** references to either env-var name. No other place in `_shared/` reads a CORS-related env var. Surface area confirmed minimal.

### 4. Edge Function exhaustive sweep

There are 15 Edge Functions total (subdirectories of `supabase/functions/` excluding `_shared` + `tests`):
`auth-email-send`, `docuseal`, `docuseal-webhook`, `download-documents-zip`, `export-report`, `export-user-data`, `generate-pdf`, `n8n-blog-ingest`, `newsletter-subscribe`, `resend-webhook`, `stripe-billing-portal`, `stripe-cancel-subscription`, `stripe-checkout`, `stripe-checkout-session`, `stripe-webhooks`.

For each, checked: (a) any `Deno.env.get("FRONTEND_URL")`, (b) any literal string `"FRONTEND_URL"` in validateEnv lists, (c) the cors helper import (where applicable).

| Function | Status | Notes |
|----------|--------|-------|
| auth-email-send | clean | Already canonical pre-PR (verified via `git show origin/main:supabase/functions/auth-email-send/index.ts`). Lines 69 + 101 reference `NEXT_PUBLIC_APP_URL`. Untouched by this PR. |
| docuseal | clean | `handler.ts:39` lists `NEXT_PUBLIC_APP_URL` in optional. Touched. |
| docuseal-webhook | clean | No URL env var reference (webhook-only, no browser CORS). Untouched, correct. |
| download-documents-zip | clean | `index.ts:98,100` — `NEXT_PUBLIC_APP_URL` in required (fail-fast at boot, per inline comment preserved through rename). Touched. |
| export-report | clean | Imports `getCorsHeaders`; consumes helper; no direct env var ref. Correct. |
| export-user-data | clean | Imports `getCorsHeaders`; consumes helper. Correct. |
| generate-pdf | clean | Imports `getCorsHeaders`; consumes helper. Correct. |
| n8n-blog-ingest | clean | `index.ts:304` lists `NEXT_PUBLIC_APP_URL` in required; line 477 uses `env.NEXT_PUBLIC_APP_URL` in template literal. Required-list guarantees defined string. Touched. |
| newsletter-subscribe | clean | `index.ts:113` lists `NEXT_PUBLIC_APP_URL` in optional. Touched. |
| resend-webhook | clean | No URL env var reference (webhook-only). Untouched, correct. |
| stripe-billing-portal | clean | `index.ts:25,34` — optional list + `env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3050"` localhost fallback. Touched. |
| stripe-cancel-subscription | clean | `index.ts:33` optional list. Touched. |
| stripe-checkout | clean | `index.ts:26,35` — optional list + localhost fallback. Touched. |
| stripe-checkout-session | clean | `index.ts:44` optional list. Touched. |
| stripe-webhooks | clean | `index.ts:42` optional list + `handlers/invoice-payment-failed.ts:47` direct `Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://app.tenantflow.app"` (prod URL fallback because the value is embedded in an outbound email). Touched (both files). |

Zero leftover references. Zero broken imports. Architecture consistent: webhook-only functions don't need the URL var; browser-facing functions either go through `getCorsHeaders` (transparent) or list it in their `validateEnv` call.

### 5. Test file double-check

Three Deno test files: `tests/export-user-data-test.ts`, `tests/n8n-blog-ingest.test.ts`, `tests/newsletter-subscribe-test.ts`. Read each diff:

- `export-user-data-test.ts:48` — `Deno.env.get("NEXT_PUBLIC_APP_URL")` swapped. Local TS const remains `frontendUrl` (purely lexical; harmless).
- `n8n-blog-ingest.test.ts:9,39,150` — comment-block instruction line, local const `APP_URL` (renamed away from `FRONTEND_URL` to avoid shadowing the `NEXT_PUBLIC_APP_URL` prefix in a test scope — PR description justifies this), and the `assertEquals(data.blog_url, \`${APP_URL}/blog/${body.slug}\`)` assertion. Internally consistent.
- `newsletter-subscribe-test.ts:58,74,75` — `Deno.env.get` swap + two comment-block strings updated symmetrically.

No string assertions against the literal `"FRONTEND_URL"` survive. Verified.

### 6. CLAUDE.md / SECURITY.md consistency

`git diff origin/main..HEAD -- CLAUDE.md SECURITY.md` returns exactly two single-line edits:

- `CLAUDE.md:164` — "Fail-closed when `FRONTEND_URL` unset." → "Fail-closed when `NEXT_PUBLIC_APP_URL` unset."
- `SECURITY.md:64` — "fail-closed when `FRONTEND_URL` is unset." → "fail-closed when `NEXT_PUBLIC_APP_URL` is unset."

Symmetric rename. No contradiction. Merge of `origin/main` did not stomp these edits — diff shows both lines are still in the new form at HEAD.

**Note on the post-#749 cleanup paragraph (Stripe FDW vs. "no `stripe.*` schema"):** `git show origin/main:CLAUDE.md` confirms `origin/main` itself still carries the old "There is no `stripe.*` schema" text on line 206 (the FDW-rewrite paragraph from MEMORY.md has not yet been committed to `origin/main`; it lives on a separate branch `gsd/post-749-cleanup-review`). PR #747's HEAD inherits main's current line 206 verbatim. **This is not a defect introduced by #747** — the PR's contract is "rename `FRONTEND_URL` → `NEXT_PUBLIC_APP_URL`"; the FDW paragraph drift belongs to a different open workstream. Out of scope for this gate.

### 7. Merge artifact paranoia

`git log --oneline origin/main..HEAD`:
```
b0e2dafc2 Merge remote-tracking branch 'origin/main' into chore/env-standardize-app-url
fe2284a02 chore: standardize FRONTEND_URL → NEXT_PUBLIC_APP_URL across Edge Functions
```

Exactly 2 commits as expected. No garbage commits, no stray amends, no merge from arbitrary branches.

`git show --stat HEAD` (the merge commit) brings in 100 files — all are recognizable from `origin/main` (Phase-04 chart artifacts, dashboard refactor, analytics RPC repairs, Stripe FDW migration, drift migrations). Spot-checked: no unexpected deletions or additions that would indicate a botched merge resolution.

`git diff origin/main..HEAD --stat` reports the PR-contracted **16 files / 27 ins / 27 del**, matching the PR description exactly.

### 8. CI status — re-verified

```
gh pr checks 747
checks         pass    3s     ✓
e2e-smoke      pass    3s     ✓
rls-security   pass    1m36s  ✓
auto-merge     skipping       —
```

All three required checks green on HEAD `b0e2dafc2`. The stale Supabase Preview CheckRun mentioned in the task header is no longer in the list — merge SHA rebase succeeded in pushing it off the gate.

### 9. File-count reconciliation (cycle 1 said "10 Edge Functions", PR description said "14 source files")

Ground truth from `git diff origin/main..HEAD --name-only -- supabase/functions/`:

- 1 shared file: `_shared/cors.ts`
- 10 Edge Function source files: `docuseal/handler.ts`, `download-documents-zip/index.ts`, `n8n-blog-ingest/index.ts`, `newsletter-subscribe/index.ts`, `stripe-billing-portal/index.ts`, `stripe-cancel-subscription/index.ts`, `stripe-checkout-session/index.ts`, `stripe-checkout/index.ts`, `stripe-webhooks/handlers/invoice-payment-failed.ts`, `stripe-webhooks/index.ts`
- 3 test files: `tests/export-user-data-test.ts`, `tests/n8n-blog-ingest.test.ts`, `tests/newsletter-subscribe-test.ts`

Total = 14 files under `supabase/functions/`. + `CLAUDE.md` + `SECURITY.md` = 16 files in the PR.

Cycle 1's "10 touched Edge Functions" referred to entry-point source files (excluding `_shared/` and `tests/`). PR description's "14 Edge Function source files" inclusively counts shared + tests. **Both numbers are factually correct counts of different sets.** Not a defect — just two different decompositions of the same file list. No inconsistency to fix.

---

## Cycle 1 claims, re-verified

| Cycle 1 claim | Cycle 2 verification | Status |
|---|---|---|
| Zero `FRONTEND_URL` in `supabase/` | Re-grepped; 0 hits | confirmed |
| Zero `FRONTEND_URL` in `src/` | Re-grepped; 0 hits | confirmed |
| Zero `FRONTEND_URL` in `CLAUDE.md`/`SECURITY.md` | Re-grepped; 0 hits | confirmed |
| Zero `FRONTEND_URL` in `.github/`/`scripts/`/`vercel.json`/`package.json`/`next.config.ts` | Re-grepped; 0 hits | confirmed |
| `_shared/cors.ts` fail-closed preserved | Re-read 65 lines; verified | confirmed |
| 10 touched Edge Functions cross-checked | 10 entry-point files verified line-by-line | confirmed |
| `auth-email-send` regression-free (already canonical pre-PR) | `git show origin/main` confirms pre-existing | confirmed |
| 3 Deno test files updated symmetrically | Re-read all three diffs | confirmed |
| CLAUDE.md/SECURITY.md merge resolution clean | Diff inspected — symmetric, no stomp | confirmed |
| All 3 CI checks green | `gh pr checks 747` | confirmed |

Zero cycle-1 claims wrong.

---

## Why this PR meets the perfect-PR gate

1. **Pure rename, mechanically symmetric.** Every reader call site, every `validateEnv` schema entry, every doc string, every test mock changed in lockstep. No half-renames. No orphan strings.
2. **Fail-closed semantics preserved.** Cross-checked `_shared/cors.ts` line-by-line: branch on falsy, error-log, empty-headers return — all unchanged behaviorally; only the env-var name in the lookup + log message changed.
3. **No callable-contract drift.** Public-API shape (`getCorsHeaders(req)`, `handleCorsOptions(req)`, `getJsonHeaders(req)`) is byte-identical. Callers don't need to change.
4. **Webhook-only functions correctly untouched.** `docuseal-webhook`, `resend-webhook` don't reference the URL var because they don't preflight from a browser. Cycle 2 verified they have **zero** references to either old or new name.
5. **Merge of `origin/main` clean.** 100 files inherited from main are all expected; PR's contracted 16 file edits survived the merge intact.
6. **CI is honest** (per `ci-gates-honest.md` memory). All three required checks ran against the new HEAD with secrets bound, no `continue-on-error`. Green pass means actually green.
7. **Two consecutive clean cycles.** Cycle 1 found 0 issues. Cycle 2 independently re-verified every cycle-1 claim and found 0 new issues.

---

**Second consecutive clean cycle — perfect-PR merge gate CLOSED. PR #747 is ready for merge.**

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (cycle 2, independent verification)_
_Depth: deep (cross-file + cross-doc)_
