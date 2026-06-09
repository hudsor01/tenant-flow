---
pr: 756
head: b3c533bde
branch: fix/edge-functions-import-map-config
cycle: 1
reviewed: 2026-05-29T20:40:00Z
depth: deep
files_reviewed: 1
files_reviewed_list:
  - supabase/config.toml
findings:
  blocker: 6
  warning: 1
  info: 2
  total: 9
status: issues_found
verdict: BLOCKED
---

# PR #756 — Code Review Cycle 1

**Reviewed:** 2026-05-29T20:40:00Z
**HEAD:** b3c533bde
**Status:** BLOCKED — must not merge.

## Summary

Per the PR description, the intent is solely to wire `import_map = "./functions/deno.json"` to every `[functions.*]` block so Edge Function deploys can resolve bare specifiers like `@sentry/deno` and `stripe`. The 15-to-15 dir↔block coverage is correct; the import map covers all bare specifiers used in source. CI is green. But the PR also has a side-effect that the author did not call out: adding a `[functions.<name>]` block for a function that previously had none **inherits the default `verify_jwt = true`**.

Live probes against the deployed prod functions (with `curl ... -H "Authorization: Bearer faketoken"` and inspecting `x-deno-execution-id` to distinguish gateway-blocked vs. Deno-runtime-executed responses) show that **every function except `download-documents-zip` is currently deployed in prod with `verify_jwt = false`**. The PR's new blocks for `auth-email-send`, `docuseal`, `export-report`, `export-user-data`, `generate-pdf`, `stripe-billing-portal`, `stripe-cancel-subscription`, `stripe-checkout`, and `stripe-checkout-session` all omit `verify_jwt = false`, so the next deploy will flip the platform-level gate to `true` on those nine functions.

For most of those (the user-authenticated Stripe + DocuSeal + export functions), this is technically a hardening change and would still work for legitimate authenticated frontend calls because `supabase.functions.invoke()` sends the user JWT. But for two specific functions it is **production-breaking**:

1. **`auth-email-send`** — Supabase Auth Hook receiver. The Auth Hook delivers the `SUPABASE_AUTH_HOOK_SECRET` as the Bearer token, not a Supabase JWT. With `verify_jwt = true`, the gateway will 401 every Auth Hook call before the function code can validate the hook secret. This silently kills every signup confirmation, password reset, magic link, invitation, and email-change email — and Supabase Auth Hooks don't retry on 401. (See `supabase/functions/auth-email-send/index.ts:1-10,68,78-89`.)

2. **`stripe-checkout-session`** — explicitly designed as an unauthenticated endpoint ("Unauthenticated by design — users completing checkout may not have an account yet" — `supabase/functions/stripe-checkout-session/index.ts:3`). The caller is `src/app/auth/post-checkout/page.tsx:40-47`, which uses raw `fetch()` with **no Authorization header at all**. With `verify_jwt = true`, the post-checkout customer-email-retrieval / magic-link delivery breaks for every paying user.

CI being green proves nothing here — none of the CI jobs deploy Edge Functions or smoke-test them against prod. The bug only surfaces at deploy time.

## BLOCKER Findings

### BL-01: auth-email-send loses `verify_jwt = false`, breaking the Supabase Auth Hook (BLOCKER)
**File:** `supabase/config.toml:390-392`
**Issue:** The new `[functions.auth-email-send]` block omits `verify_jwt = false`, so deploy flips the gateway gate to `true`. `auth-email-send` is a Supabase Auth Hook receiver (`supabase/functions/auth-email-send/index.ts:1-6`) — Supabase Auth POSTs the `SUPABASE_AUTH_HOOK_SECRET` as the Bearer token, NOT a Supabase user JWT. The gateway will reject every Auth Hook call with 401 before the function gets a chance to validate the hook secret. Live probe against prod confirms the function currently runs with `verify_jwt = false` (`x-deno-execution-id` present even on fake-bearer POST). All branded auth emails — signup confirmation, password reset, magic link, invitation, email change — will silently stop. Auth Hooks don't retry on 401.
**Fix:**
```toml
# Auth email send — Supabase Auth Hook receiver. Hook delivers
# SUPABASE_AUTH_HOOK_SECRET as Bearer token (not a Supabase user JWT), so
# the platform JWT gate MUST be off; the function verifies the hook secret
# itself (see supabase/functions/auth-email-send/index.ts:78-89).
[functions.auth-email-send]
verify_jwt = false
import_map = "./functions/deno.json"
```

### BL-02: stripe-checkout-session loses `verify_jwt = false`, breaking the post-checkout flow (BLOCKER)
**File:** `supabase/config.toml:398-400`
**Issue:** The new `[functions.stripe-checkout-session]` block omits `verify_jwt = false`. The function source explicitly documents itself as "Unauthenticated by design — users completing checkout may not have an account yet" (`supabase/functions/stripe-checkout-session/index.ts:3`), has no `validateBearerAuth` call (confirmed by greping the file), and is consumed by `src/app/auth/post-checkout/page.tsx:40-47` via raw `fetch()` with no Authorization header. Live prod probe confirms it currently runs with `verify_jwt = false`. After this PR deploys, the gateway will reject every post-checkout customer-email fetch with 401 before the function runs → the post-checkout page surfaces "Failed to retrieve checkout session", no magic link is sent, paying users land in a dead-end UX after Stripe redirect-back. The label-only "Stripe checkout session — authenticated; default verify_jwt=true" comment on line 398 is wrong on both counts (it is NOT authenticated, and the default is NOT what this function needs).
**Fix:**
```toml
# Stripe checkout session retrieval — public by design. The Stripe
# session_id is the secret; the function looks up customer_email for the
# /auth/post-checkout magic-link flow before the user has an account.
# Caller is src/app/auth/post-checkout/page.tsx with no Authorization
# header. NOT Supabase JWT.
[functions.stripe-checkout-session]
verify_jwt = false
import_map = "./functions/deno.json"
```

### BL-03: Comment claims docuseal/export-report/etc. are "authenticated; default verify_jwt=true" — but prod has them as verify_jwt=false (BLOCKER)
**File:** `supabase/config.toml:390-424`
**Issue:** The labels on lines 390, 394, 398, 402, 406, 410, 414, 418, 422 all claim "default verify_jwt=true" as the intentional setting. But the currently-deployed prod state (verified via live curl probes inspecting the `x-deno-execution-id` header on POST-with-fake-bearer) is that **every** one of these functions currently runs with `verify_jwt = false`. The functions do their own auth internally via `validateBearerAuth` from `_shared/auth.ts`, which extracts the Bearer token and calls `supabase.auth.getUser(token)`. The PR's "default-to-true" stance changes the security posture of 7 functions without an explicit decision documented in the PR.

This is a BLOCKER not because verify_jwt=true is wrong per se (legitimate authenticated callers using `supabase.functions.invoke()` from the frontend still send the user JWT, so they'd pass the gateway gate), but because:
1. The PR's stated scope is "wire import_map for every function block". The verify_jwt change is undisclosed and unscoped.
2. There is no test (unit, integration, or E2E) that actually validates Edge Function invocation paths against the prod-deployed config. CI green means nothing.
3. Any caller using a service-role key or a fetch-without-Authorization pattern will now break (the post-checkout flow is one confirmed case; a comprehensive audit hasn't been done).
4. Re-instituting verify_jwt=true on `auth-email-send` and `stripe-checkout-session` (BL-01, BL-02) is outright broken; verify_jwt=true on the other seven is a behavior change that needs at least an explicit accept-and-document, not a side effect.

**Fix:** Either (a) explicitly set `verify_jwt = false` on every function whose prod state is currently false (full list below), OR (b) verify each is safe to gate AND deploy + smoke-test each one in a staging environment before merging. Option (a) is the conservative, intent-of-the-PR-respecting fix:

```toml
# All seven of these have validateBearerAuth() inside the function code
# (search: grep -rn validateBearerAuth supabase/functions/). Keeping
# verify_jwt=false preserves the current deployed state and security
# posture; the function-level Bearer check IS the auth boundary.
[functions.docuseal]
verify_jwt = false
entrypoint = "./functions/docuseal/handler.ts"
import_map = "./functions/deno.json"

[functions.stripe-checkout]
verify_jwt = false
import_map = "./functions/deno.json"

[functions.stripe-billing-portal]
verify_jwt = false
import_map = "./functions/deno.json"

[functions.stripe-cancel-subscription]
verify_jwt = false
import_map = "./functions/deno.json"

[functions.export-report]
verify_jwt = false
import_map = "./functions/deno.json"

[functions.export-user-data]
verify_jwt = false
import_map = "./functions/deno.json"

[functions.generate-pdf]
verify_jwt = false
import_map = "./functions/deno.json"
```

If the team decides verify_jwt=true is the desired forward state, this should be a separate, explicit, tested PR. Mixing it into an import-map fix is the wrong shape.

### BL-04: Misleading comment "12 blocks below" — actual count is 15 (BLOCKER for accuracy review)
**File:** `supabase/config.toml:347-348`
**Issue:** The added comment block says "The 12 blocks below exist specifically so deploys resolve the bare specifiers". The section actually contains 15 `[functions.*]` blocks (3 pre-existing + 12 new). The comment count is off by 3, which makes the comment misleading for anyone counting against `ls supabase/functions/`. Future contributors reading "12" and adding a 13th will reasonably wonder whether the comment-count drift is meaningful — and they'll spend cycles re-confirming the dir↔block invariant. This is a BLOCKER under the project's "no commented-out / dead code" zero-tolerance rule's spirit (stale documentation IS dead text), and because comments-as-source-of-truth was the entire reason the previous deploy regression happened.
**Fix:** Replace `The 12 blocks below` with `The 15 blocks below`, or say `Every function block below` so the comment doesn't go stale on the next Edge Function addition.

### BL-05: No "adding a new Edge Function?" runbook captures the verify_jwt decision (BLOCKER for review-cycle-2 risk)
**File:** `supabase/config.toml:344-346`
**Issue:** The comment block says "Adding a new Edge Function? Append a block here." It says nothing about `verify_jwt`. The next contributor adds a webhook handler, copies the `[functions.stripe-checkout]` skeleton (which now defaults to verify_jwt=true), and ships a webhook that gateway-blocks every signed request — repeating the BL-01/BL-02 failure mode. The PR is fixing one foot-gun (bundler import_map) by introducing another (silent verify_jwt drift). Given that the PR author already missed the verify_jwt decision on `auth-email-send` and `stripe-checkout-session`, the runbook gap is load-bearing.
**Fix:** Extend the comment block to include the verify_jwt decision matrix, e.g.:
```toml
# Adding a new Edge Function? Append a block here with import_map set.
# Then decide verify_jwt:
#   - User-authenticated and uses validateBearerAuth() internally
#     -> set verify_jwt = false (the function handles auth itself).
#   - Public endpoint (webhook, post-checkout retrieval, newsletter, etc.)
#     -> set verify_jwt = false and document the auth mechanism in a
#        comment above the block.
#   - Pure JWT-gated read with no internal auth logic
#     -> verify_jwt = true is the default; leave the line off.
# Verify prod state with:
#   curl -i -X POST "$URL/functions/v1/<name>" -H "Authorization: Bearer fake" \
#     -d '{}' | grep -E "HTTP/2|x-deno-execution-id"
# x-deno-execution-id present = function ran (verify_jwt is false in prod).
# x-deno-execution-id absent = gateway blocked (verify_jwt is true in prod).
```

### BL-06: No verification that the import_map covers `npm:` / `jsr:` re-exports through `_shared/` (BLOCKER for completeness)
**File:** `supabase/functions/deno.json`
**Issue:** The PR claim is that adding `import_map = "./functions/deno.json"` lets every function resolve bare specifiers. I verified this: `grep -rEh "from ['\"][^./][^'\"]*['\"]"` against `supabase/functions/` yields exactly 6 bare specifiers, all 6 of which exist in the import map (`@sentry/deno`, `@supabase/supabase-js`, `@upstash/ratelimit`, `@upstash/redis`, `@zip.js/zip.js`, `stripe`). The PR description doesn't show the author ran this check — it's load-bearing for the fix's correctness claim. Recording it here so a future regression (someone adds a bare specifier in `_shared/` without updating the import map) gets caught by re-running the audit. Not a code defect; a process gap.
**Fix:** Add to the comment block: "Bare specifiers used by any function MUST be listed in `supabase/functions/deno.json`. Verify with: `grep -rEh 'from \"[a-z@][^\"]*\"' supabase/functions/ | grep -v '^[a-z]*:'`."

## Warnings

### WR-01: `stripe-webhooks` "import_map" addition is technically a no-op — but is still required and worth a sanity-check comment
**File:** `supabase/config.toml:355-357`
**Issue:** Per the PR background, only `n8n-blog-ingest` deployed cleanly post-#747 because only it had `import_map` set. But `stripe-webhooks` had a block (with `verify_jwt = false`) WITHOUT `import_map`, and it presumably failed to redeploy too. The PR fixes that by adding the line. Good — but: how was Stripe webhook handling working before #747? Answer: the previously-deployed bundle (compiled before the recent code path that added a transitive `@sentry/deno` import via `_shared/errors.ts`) presumably didn't have the bare specifier, OR was deployed with a manual `--import-map` flag. Worth a one-line comment so the next reviewer doesn't waste time on it.
**Fix:** Optional — add a one-liner above the import_map line: `# (pre-#747 deploys didn't need this; the FRONTEND_URL→NEXT_PUBLIC_APP_URL rename pulled _shared/errors.ts onto the import graph.)`

## Info

### IN-01: PR description claims "TOML parses cleanly past supabase CLI config-load" — no evidence in the PR
**File:** N/A (PR meta)
**Issue:** Author claims CLI config-load passes but the PR doesn't show output. CI's `checks` / `e2e-smoke` / `rls-security` jobs do not invoke `supabase` CLI on `config.toml`. There is no programmatic check that the config parses, only that it parses as TOML syntactically. Manual verification via `supabase config validate` or equivalent before merge is recommended.
**Fix:** Either add `supabase --workdir supabase config validate` to lefthook pre-commit, or include the manual run output in the PR body.

### IN-02: PR #747 changes still on main — confirmed
**File:** N/A (sanity check from review prompt)
**Issue:** Prompt asked to verify that PR #747's NEXT_PUBLIC_APP_URL rename is still on main. Confirmed: `git log --oneline main -- supabase/functions/_shared/cors.ts | head -3` returns `fe2284a02` (PR #747 commit), and `grep NEXT_PUBLIC_APP_URL supabase/functions/_shared/cors.ts` shows the rename in place. No revert. Recording for the audit trail.

## Structural verification (passes)

- **15:15 dir↔block match:** `diff <(ls supabase/functions/ | grep -v _shared | grep -v tests | grep -v deno.json | sort) <(grep -E "^\[functions\." supabase/config.toml | sed 's/\[functions\.//;s/\]//' | sort)` produces empty output. No missing functions, no orphan blocks.
- **Import map coverage:** All 6 bare specifiers used in `supabase/functions/` (`@sentry/deno`, `@supabase/supabase-js`, `@upstash/ratelimit`, `@upstash/redis`, `@zip.js/zip.js`, `stripe`) appear in `supabase/functions/deno.json`.
- **Preserved settings:** `[functions.stripe-webhooks].verify_jwt = false` (line 356), `[functions.docuseal].entrypoint = "./functions/docuseal/handler.ts"` (line 362), `[functions.n8n-blog-ingest].verify_jwt = false` (line 369) all preserved.
- **TOML hygiene:** No duplicate block names, no trailing whitespace, consistent double-quote string syntax.
- **CI status:** All 3 required checks (`checks`, `e2e-smoke`, `rls-security`) pass at HEAD `b3c533bde`.

## Verdict

**BLOCKED.** The PR's stated intent (import_map) is implemented correctly, but the silent side-effect of inheriting `verify_jwt = true` on previously-no-block functions is production-breaking for `auth-email-send` (Auth Hook handler — uses HOOK_SECRET not JWT) and `stripe-checkout-session` (explicitly unauthenticated post-checkout endpoint called by an unauthenticated page with no Authorization header). The other 7 newly-blocked functions also flip from prod's verify_jwt=false to true, which is an undisclosed scope creep even if it doesn't immediately break (the legitimate frontend callers still send a user JWT).

Two paths to clean:
1. **Conservative (recommended):** Add `verify_jwt = false` to all 9 affected blocks (`auth-email-send`, `docuseal`, `export-report`, `export-user-data`, `generate-pdf`, `stripe-billing-portal`, `stripe-cancel-subscription`, `stripe-checkout`, `stripe-checkout-session`) and update the comment block to document the verify_jwt decision matrix for future contributors. This preserves the deployed prod state exactly.
2. **Aggressive:** Explicitly accept verify_jwt=true on the 7 user-auth functions, fix BL-01 + BL-02 only, AND add an E2E smoke test that hits each function's prod URL to catch future regressions. This is a bigger PR.

Either path resolves the BLOCKERs. Cycle 2 must verify the chosen fix is applied AND zero new findings.

---

_Reviewed: 2026-05-29T20:40:00Z_
_Reviewer: Claude (gsd-code-reviewer, adversarial mode)_
_Depth: deep_
