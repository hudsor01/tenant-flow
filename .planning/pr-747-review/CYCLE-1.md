---
pr: 747
head: b0e2dafc2
branch: chore/env-standardize-app-url
reviewed: 2026-05-29
depth: deep
cycle: 1
files_reviewed: 16
files_reviewed_list:
  - CLAUDE.md
  - SECURITY.md
  - supabase/functions/_shared/cors.ts
  - supabase/functions/docuseal/handler.ts
  - supabase/functions/download-documents-zip/index.ts
  - supabase/functions/n8n-blog-ingest/index.ts
  - supabase/functions/newsletter-subscribe/index.ts
  - supabase/functions/stripe-billing-portal/index.ts
  - supabase/functions/stripe-cancel-subscription/index.ts
  - supabase/functions/stripe-checkout-session/index.ts
  - supabase/functions/stripe-checkout/index.ts
  - supabase/functions/stripe-webhooks/handlers/invoice-payment-failed.ts
  - supabase/functions/stripe-webhooks/index.ts
  - supabase/functions/tests/export-user-data-test.ts
  - supabase/functions/tests/n8n-blog-ingest.test.ts
  - supabase/functions/tests/newsletter-subscribe-test.ts
findings:
  critical: 0
  blocker: 0
  warning: 0
  info: 0
  total: 0
status: clean
verdict: CLEAN
---

# PR #747 Cycle 1 Review — `chore/env-standardize-app-url`

## Verdict

**CLEAN.** Zero findings across all 8 review dimensions. First clean cycle — cycle 2 must also be CLEAN to close the merge gate.

## Scope verified

- 14 Edge Function source files + `_shared/cors.ts`
- 3 Deno test files
- `CLAUDE.md`, `SECURITY.md`
- Net diff matches PR description: 27 insertions / 27 deletions, pure rename.

## Checks performed and outcomes

### 1. Completeness of the rename

- `grep -rn "FRONTEND_URL" supabase/`: **0 hits.**
- `grep -rn "FRONTEND_URL" src/`: **0 hits.**
- `grep -n "FRONTEND_URL" CLAUDE.md SECURITY.md`: **0 hits each.**
- `grep -rn "FRONTEND_URL" .github/ scripts/ vercel.json package.json next.config.ts`: **0 hits.**
- `tests/e2e/playwright.config.ts` and `playwright.config.prod.ts` retain `TEST_FRONTEND_URL` / `PROD_FRONTEND_URL` — these are local TS consts representing the URL Playwright targets, matching the PR's explicit carve-out. `playwright.config.ts:228,244` correctly export `NEXT_PUBLIC_APP_URL='${TEST_FRONTEND_URL}'` into the spawned dev server's env, which is the right shape.

### 2. `_shared/cors.ts` audit

- Reads canonical `Deno.env.get("NEXT_PUBLIC_APP_URL")` at line 13.
- Fail-closed behavior preserved: lines 15-20 log error + return `{}` when unset.
- Log message updated to reference the new env var name (line 17), no stale on-call confusion.
- Function signatures (`getCorsHeaders`, `handleCorsOptions`, `getJsonHeaders`) and docstrings all updated coherently. Local var name `frontendUrl` (line 13) is internal — non-blocking style choice.

### 3. Test file updates

- `tests/export-user-data-test.ts:48` — `Deno.env.get("NEXT_PUBLIC_APP_URL")`. Clean.
- `tests/newsletter-subscribe-test.ts:58,74,75` — env var, comments, log lines all updated symmetrically.
- `tests/n8n-blog-ingest.test.ts` — the local-const rename `FRONTEND_URL → APP_URL` (line 39, used at line 150) is internally consistent. The PR description's stated reason — avoid shadowing the `NEXT_PUBLIC_` prefix in a local const — is sound; `APP_URL` is unambiguous in test scope. Setup comment at line 9 also updated.

### 4. `auth-email-send` regression check

- Not in the touched-files diff. Verified `auth-email-send/index.ts:69,101` still uses `NEXT_PUBLIC_APP_URL` — unchanged from pre-PR canonical state. The rename pass correctly left it as a no-op.

### 5. `validateEnv` declared-vs-consumed sanity

Cross-checked every touched function:

| Function | Declared (required/optional) | Consumed where | Status |
|----------|------------------------------|-----------------|--------|
| `docuseal/handler.ts` | optional | not consumed in source (declared for boot validation only, `getCorsHeaders` reads via `Deno.env.get`) | pre-existing pattern; pure rename |
| `download-documents-zip/index.ts` | required | via `getCorsHeaders(req)` (comment at line 98-99 documents the intent) | correct |
| `n8n-blog-ingest/index.ts` | required | line 477 `env.NEXT_PUBLIC_APP_URL` for `blog_url` template | correct |
| `newsletter-subscribe/index.ts` | optional | via `getCorsHeaders(req)` | correct |
| `stripe-billing-portal/index.ts` | optional | line 34 `env.NEXT_PUBLIC_APP_URL` for redirect URL | correct |
| `stripe-cancel-subscription/index.ts` | optional | not consumed in source | pre-existing pattern; pure rename |
| `stripe-checkout-session/index.ts` | optional | not consumed in source | pre-existing pattern; pure rename |
| `stripe-checkout/index.ts` | optional | line 35 `env.NEXT_PUBLIC_APP_URL` | correct |
| `stripe-webhooks/index.ts` | optional | via `invoice-payment-failed.ts` handler | correct |
| `stripe-webhooks/handlers/invoice-payment-failed.ts` | (handler) | line 47 `Deno.env.get("NEXT_PUBLIC_APP_URL")` direct read | correct |

### 6. CLAUDE.md / SECURITY.md doc edits

- `CLAUDE.md:164` — single-occurrence rename in the Edge Functions section. Correctly describes the cors helper's behavior post-rename.
- `SECURITY.md:64` — single-occurrence rename in the Edge Function Hygiene section. Phrasing consistent with cors.ts behavior.
- No duplicate paragraphs, no orphaned `FRONTEND_URL` references, no broken internal links.

### 7. Merge-resolution sanity (62 commits from main)

- CLAUDE.md auto-merged by `ort` retains a coherent structure (235 lines). The env-var rename at line 164 lives in the `## Edge Functions` section and does not collide with the v2.6 billing-storage paragraph (which is in `## Common Gotchas`).
- No conflict markers (`<<<<<<<`, `>>>>>>>`) present anywhere in the working tree.
- Pre-merge PR commit `fe2284a02` + post-merge HEAD `b0e2dafc2` diff against main matches the PR description (27/27).

### 8. `src/env.ts` reference

- Lines 65, 67, 116 all reference `NEXT_PUBLIC_APP_URL` (declared in the client schema with URL validation, mapped from `process.env.NEXT_PUBLIC_APP_URL`). No stale `FRONTEND_URL`.

## Zero-tolerance rule compliance

- No `any` types introduced. No barrel files. No duplicate types. No commented-out code. No emojis. No `as unknown as` assertions. No PostgreSQL ENUMs. No inline styles. No string-literal query keys. No `@radix-ui/react-icons`.

## CI status at HEAD `b0e2dafc2`

Per orchestrator note: `checks` PASS, `e2e-smoke` PASS, `rls-security` PASS, `auto-merge` SKIPPING (expected). Supabase Preview check absent at new HEAD (integration removed) — not a blocker.

## Final tally

- P0/Critical: **0**
- P1/Warning: **0**
- P2/Info: **0**
- INFO: **0**

**Total findings: 0.**

First clean cycle — cycle 2 must also be CLEAN to close the merge gate.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 1 of N (perfect-PR gate requires 2 consecutive zero-finding cycles)_
