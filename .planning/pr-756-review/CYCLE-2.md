---
pr: 756
head: d027befb6
branch: fix/edge-functions-import-map-config
cycle: 2
reviewed: 2026-05-29T21:00:00Z
depth: deep
files_reviewed: 1
files_reviewed_list:
  - supabase/config.toml
findings:
  blocker: 0
  warning: 0
  info: 1
  total: 1
status: clean
verdict: CLEAN
---

# PR #756 — Code Review Cycle 2

**Reviewed:** 2026-05-29T21:00:00Z
**HEAD:** d027befb6
**Status:** CLEAN — First clean cycle. Cycle 3 must also be CLEAN to close the merge gate.

## Summary

Re-did the cycle-1 audit independently. Every cycle-1 finding (BL-01 through BL-06, WR-01, IN-01, IN-02) is fully resolved at HEAD `d027befb6` with no regressions introduced. The fix commit is config-only (`supabase/config.toml`, +69/-17, one file) and the TOML parses cleanly via Python's `tomllib`. CI is green on all three required checks (`checks`, `e2e-smoke`, `rls-security`) at this exact SHA.

One INFO-level observation about a comment-vs-code wording mismatch on `download-documents-zip` — config matches deployed prod state and the function is correctly behaved; only the inline comment's word "pure" is technically loose. Not blocking.

## Independent verification matrix

### 1. verify_jwt audit (re-run independently)

```
awk '/^\[functions\./ { name=$0; getline; if ($0 ~ /verify_jwt = false/) print name " : false"; ... }' supabase/config.toml
```

| Function | config.toml | prod (curl probe) | Match |
|---|---|---|---|
| stripe-webhooks | false | FALSE (deno ran, HTTP 400) | ✓ |
| docuseal | false | FALSE (deno ran, HTTP 401) | ✓ |
| n8n-blog-ingest | false | FALSE (deno ran, HTTP 401) | ✓ |
| docuseal-webhook | false | FALSE (deno ran, HTTP 500) | ✓ |
| resend-webhook | false | FALSE (deno ran, HTTP 400) | ✓ |
| newsletter-subscribe | false | FALSE (deno ran, HTTP 400) | ✓ |
| auth-email-send | false | FALSE (deno ran, HTTP 500) | ✓ |
| stripe-checkout | false | FALSE (deno ran, HTTP 401) | ✓ |
| stripe-checkout-session | false | FALSE (deno ran, HTTP 400) | ✓ |
| stripe-billing-portal | false | FALSE (deno ran, HTTP 401) | ✓ |
| stripe-cancel-subscription | false | FALSE (deno ran, HTTP 401) | ✓ |
| download-documents-zip | default (true) | TRUE (gateway blocked) | ✓ |
| export-report | false | FALSE (deno ran, HTTP 401) | ✓ |
| export-user-data | false | FALSE (deno ran, HTTP 405) | ✓ |
| generate-pdf | false | FALSE (deno ran, HTTP 500) | ✓ |

**Result:** 14/15 explicit `verify_jwt = false`, 1/15 default (true) for `download-documents-zip`. Matches prod ground truth on every single function. Cycle-1's verbal claim re-verified case-by-case via independent curl probe.

### 2. Code-vs-declared-auth match

| Function | Comment claim | Actual code | Match |
|---|---|---|---|
| auth-email-send | HOOK_SECRET internally | `index.ts:78-81` validates `SUPABASE_AUTH_HOOK_SECRET` against Bearer | ✓ |
| stripe-checkout-session | no internal auth, session_id IS secret | No `validateBearerAuth` in source | ✓ |
| docuseal | validateBearerAuth internally | `handler.ts:50` calls it | ✓ |
| stripe-checkout | validateBearerAuth internally | `index.ts` calls it | ✓ |
| stripe-billing-portal | validateBearerAuth internally | `index.ts` calls it | ✓ |
| stripe-cancel-subscription | validateBearerAuth internally | `index.ts` calls it | ✓ |
| export-report | validateBearerAuth internally | `index.ts` calls it | ✓ |
| export-user-data | validateBearerAuth internally | `index.ts` calls it | ✓ |
| generate-pdf | validateBearerAuth internally | `index.ts` calls it | ✓ |
| stripe-webhooks | Stripe constructEvent signature | source matches | ✓ |
| n8n-blog-ingest | HMAC `x-n8n-signature` / `N8N_WEBHOOK_SECRET` | source matches | ✓ |
| docuseal-webhook | DocuSeal HMAC `X-DocuSeal-Signature` | source matches | ✓ |
| resend-webhook | Svix signature | source matches | ✓ |
| newsletter-subscribe | rate-limited public | Upstash `Ratelimit` matches | ✓ |
| download-documents-zip | "pure JWT-gated reader; platform gate is the auth boundary" | Function ALSO calls `validateBearerAuth(req, adminClient)` at `index.ts:113` | minor wording nit, see IN-01 |

### 3. TOML hygiene

- `grep '^\[functions\.' supabase/config.toml \| sort \| uniq -d` → no output (no duplicate blocks).
- 15 distinct `[functions.<name>]` blocks (one per `ls supabase/functions/` directory after excluding `_shared`, `tests`, `deno.json`).
- `python3 -c "import tomllib; tomllib.load(open('supabase/config.toml','rb'))"` → parses without error.
- 15 active `import_map = "./functions/deno.json"` lines (+ 1 inside comment block).

### 4. Comment block accuracy

Re-read `supabase/config.toml:330-372` end-to-end. The verify_jwt decision matrix (lines 351-362) describes the three cases (internal-auth / public-endpoint / pure-JWT-gated) correctly, and each function block below follows the rule:
- Internal-auth functions (8 of them) carry `verify_jwt = false` and reference `validateBearerAuth()` in the inline comment.
- Public-endpoint functions (5 of them: stripe-webhooks, n8n-blog-ingest, docuseal-webhook, resend-webhook, newsletter-subscribe, plus 1 special-case stripe-checkout-session + auth-email-send Auth Hook = 7 public) carry `verify_jwt = false` and document the actual auth mechanism (Stripe signature, HMAC, Svix, HOOK_SECRET, "Stripe session_id is the secret").
- Pure-JWT-gated (download-documents-zip) leaves `verify_jwt` line off, inheriting the platform default. This is the one case where the inline comment is slightly imprecise — see IN-01.

The curl probe recipe at line 364-368 is correct (`x-deno-execution-id` is the right header to look for; absence means gateway blocked) and matches the methodology I used to verify the table above.

The bare-specifier audit recipe at line 370-372 produces actionable output (re-ran it; see #5).

The "Every function block below" rewrite at line 347 correctly replaces the off-by-3 "The 12 blocks below" wording.

### 5. Bare-specifier audit at HEAD

```
grep -rEh 'from "[a-z@][^"]*"' supabase/functions/ | grep -v '^[a-z]*:' | sort -u
```

Yields six bare specifiers used in source:
- `@sentry/deno` ✓ (in `deno.json`)
- `@supabase/supabase-js` ✓
- `@upstash/ratelimit` ✓
- `@upstash/redis` ✓
- `@zip.js/zip.js` ✓
- `stripe` ✓

All present in `supabase/functions/deno.json`. No drift.

Test files use `jsr:` and `npm:` prefixes (full URLs, not bare), so they don't need import-map entries.

### 6. CI status at HEAD d027befb6

```
gh pr checks 756
```

| Check | Result | Required |
|---|---|---|
| checks | PASS (1m54s) | yes |
| e2e-smoke | PASS (3m17s) | yes |
| rls-security | PASS (1m20s) | yes |
| auto-merge | SKIPPED (Dependabot only) | no |

All required checks green.

### 7. Scope creep check

```
git show d027befb6 --stat
```

```
 supabase/config.toml | 86 +++++++++++++++++++++++++++++++++++++++++-----------
 1 file changed, 69 insertions(+), 17 deletions(-)
```

One file changed (`supabase/config.toml`). Matches the config-only contract.

### 8. Sanity on cycle-1's prod claim

Cycle 1 said "every function except `download-documents-zip` currently runs with `verify_jwt = false`". I re-probed all 15 functions independently with fresh curl calls (table in section 1). Cycle 1's claim is correct for all 15.

### 9. End-to-end re-read

Re-read `supabase/config.toml` lines 330-477 line-by-line. No typos, no broken TOML, no inline contradictions. The "WR-01" context note about `_shared/errors.ts` and `@sentry/deno` on stripe-webhooks is at lines 374-378 and reads correctly.

## Cycle-1 finding verification matrix

| ID | Cycle-1 finding | Cycle-2 status |
|---|---|---|
| BL-01 | auth-email-send missing `verify_jwt = false` (breaks Auth Hook) | **FIXED** — `config.toml:423-425` has explicit `verify_jwt = false`; comment at 416-422 documents the HOOK_SECRET mechanism and references the function source line range. |
| BL-02 | stripe-checkout-session missing `verify_jwt = false` (breaks post-checkout) | **FIXED** — `config.toml:438-440` has explicit `verify_jwt = false`; comment at 433-437 documents the session_id-as-secret model and identifies the no-Authorization caller. |
| BL-03 | 7 other Stripe/DocuSeal/export functions missing `verify_jwt = false` | **FIXED** — docuseal (387), stripe-checkout (430), stripe-billing-portal (445), stripe-cancel-subscription (451), export-report (463), export-user-data (469), generate-pdf (475) all have explicit `verify_jwt = false`. Each carries an inline comment naming `validateBearerAuth()` as the internal auth boundary. |
| BL-04 | "The 12 blocks below" comment off by 3 | **FIXED** — `config.toml:347` rewritten as "Every function block below". Future-proof against block-count drift. |
| BL-05 | No verify_jwt runbook in comment block | **FIXED** — `config.toml:351-368` adds the three-case decision matrix (internal-auth / public-endpoint / pure-JWT-gated) plus the curl probe recipe using `x-deno-execution-id`. |
| BL-06 | No bare-specifier audit recipe | **FIXED** — `config.toml:370-372` adds the grep recipe; ran it at HEAD and confirmed all 6 bare specifiers appear in `deno.json`. |
| WR-01 | stripe-webhooks needs context note (pre-#747 wasn't on import graph) | **FIXED** — `config.toml:376-378` adds the one-line context: "import_map was added post-#747: the FRONTEND_URL→NEXT_PUBLIC_APP_URL rename pulled _shared/errors.ts onto the import graph for stripe-webhooks, bringing the @sentry/deno bare specifier with it." |
| IN-01 (cycle 1) | (informational) | **N/A** — cycle-1's INFO items addressed by the runbook expansion. |
| IN-02 (cycle 1) | (informational) | **N/A** — same. |

All 9 cycle-1 findings: FIXED.

## INFO

### IN-01: download-documents-zip comment understates the function's auth model

**File:** `supabase/config.toml:454-457`
**Issue:** The comment reads "pure JWT-gated reader; platform gate is the auth boundary." In reality, `supabase/functions/download-documents-zip/index.ts:113` calls `validateBearerAuth(req, adminClient)` and re-derives a user-scoped client at line 131. So the function is NOT purely JWT-gated at the gateway — it does internal auth too (defense in depth: gateway gate + internal `getUser(token)` check + RLS-scoped client). The config is still correct: `verify_jwt = true` (default) matches the deployed prod state confirmed by independent curl probe (gateway blocked the fake-Bearer test request with no `x-deno-execution-id` header). And the decision-matrix bucket the function falls into is arguably "internal-auth" rather than "pure-JWT-gated" — which would normally imply `verify_jwt = false` to match the other 8 internal-auth functions. The function is intentionally deployed with the platform gate ON as belt-and-suspenders. Wording-only nit.

**Fix (optional, not blocking):** Replace the comment with:
```toml
# Download documents zip — defense-in-depth: platform JWT gate ON plus
# internal validateBearerAuth() at index.ts:113. Verify_jwt left at default
# (true) matches deployed prod state; the only function in the project
# currently running with the platform gate on.
```

This is INFO-only and does not block.

---

## Verdict

**CLEAN.** All 9 cycle-1 findings are fully resolved with no regressions. The cycle-1 fix commit `d027befb6`:
- Touches exactly one file (`supabase/config.toml`), no scope creep.
- Produces 14 explicit `verify_jwt = false` + 1 default (true), matching the independently-verified prod state on every function.
- TOML parses cleanly; no duplicate blocks; 15/15 dir↔block coverage.
- Comment block runbook (decision matrix + curl recipe + bare-spec audit) is accurate and useful.
- All 3 required CI checks green at the exact reviewed SHA.
- Comment-vs-code matches on every function except for one wording nit on `download-documents-zip` (IN-01, optional).

**First clean cycle — cycle 3 must also be CLEAN to close the merge gate.**

---

_Reviewed: 2026-05-29T21:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
