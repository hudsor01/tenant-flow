# PR #756 — Cycle 3 Review (Gate-Closing)

**Branch:** `fix/edge-functions-import-map-config`
**HEAD:** `c0f1a407b53f35e727891f6dc3c3f3600187ca51`
**Cycle-2 cleanup commit:** `c0f1a407b` — `chore(post-756 cycle-2): clarify download-documents-zip auth comment`
**Reviewed:** 2026-05-29
**Reviewer:** Claude (gsd-code-reviewer, Opus 4.7)
**Depth:** deep (paranoia mode, gate-closing cycle)

---

## Verdict

**CLEAN — 0 P0 / 0 P1 / 0 P2 / 0 INFO**

Second consecutive clean cycle — perfect-PR merge gate CLOSED. PR #756 is ready for merge.

---

## Verification Performed

### 1. Cycle-2 INFO fix correctness (download-documents-zip comment)

**Claim 1 — `validateBearerAuth()` at `index.ts:113`:**
- Read `supabase/functions/download-documents-zip/index.ts`.
- Line 113 reads exactly: `const auth = await validateBearerAuth(req, adminClient);` — exact match.

**Claim 2 — user-scoped client:**
- Lines 131-134 construct a user-scoped client via `createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, ... })`.
- Anon key + user JWT pattern (NOT service-role + user JWT). The in-file comment (lines 122-130) explicitly documents the defensive choice.

**Claim 3 — "platform gate is the outer boundary":**
- Prod probe of `download-documents-zip`: `HTTP/2 401`, NO `x-deno-execution-id` header → platform gateway blocked the call before it reached function code. Confirms `verify_jwt=true` in prod.
- Config block at lines 459-460 omits `verify_jwt` → platform default `true` → matches prod.

**Claim 4 — "only function deployed with verify_jwt=true":**
- Awk audit of all 15 function blocks: 14 explicit `verify_jwt = false`, 1 (`download-documents-zip`) defaults.
- Prod probes of `auth-email-send`, `stripe-checkout-session`, `stripe-webhooks` all returned `x-deno-execution-id` (function ran → `verify_jwt=false`). Confirms no drift since cycle 1.

Comment is fully accurate. No mismatch.

### 2. Re-verification of cycle-2 configuration audit

| Check | Expected | Actual | Result |
|------|---------|--------|--------|
| `[functions.*]` block count | 15 | 15 (lines 379, 386, 394, 400, 406, 412, 423, 429, 438, 444, 450, 459, 464, 470, 476) | PASS |
| `import_map = "./functions/deno.json"` lines | 15 | 15 | PASS |
| `verify_jwt = false` lines | 14 | 14 | PASS |
| `download-documents-zip` block has NO verify_jwt | yes | yes (line 459-460 only has `import_map`) | PASS |
| Duplicate function blocks | 0 | 0 | PASS |
| TOML parses cleanly | yes | `python3 -c "import tomllib; tomllib.loads(...)"` succeeded | PASS |
| Function dirs vs. config blocks | 15:15 exact | 15:15 (auth-email-send, docuseal, docuseal-webhook, download-documents-zip, export-report, export-user-data, generate-pdf, n8n-blog-ingest, newsletter-subscribe, resend-webhook, stripe-billing-portal, stripe-cancel-subscription, stripe-checkout, stripe-checkout-session, stripe-webhooks) | PASS |

### 3. Production state cross-reference (no drift since cycle 1)

Live probes via `curl -i -X POST $SUPABASE_URL/functions/v1/<fn> -H "Authorization: Bearer fake" -d '{}'`:

| Function | HTTP | `x-deno-execution-id` | Inferred prod verify_jwt | Config | Match |
|----------|------|------------------------|--------------------------|--------|-------|
| `auth-email-send` | 500 | present | false | false | YES |
| `stripe-checkout-session` | 400 | present | false | false | YES |
| `stripe-webhooks` | 400 | present | false | false | YES |
| `download-documents-zip` | 401 | ABSENT | true | (default true) | YES |

No prod drift since cycle 1.

### 4. Comment-vs-code consistency for ALL 15 blocks

| Function | Comment claim | Code evidence | Match |
|----------|--------------|---------------|-------|
| `stripe-webhooks` | "Stripe signature (constructEvent in handler)" | `stripe.webhooks.constructEventAsync` at index.ts:73 | YES |
| `docuseal` | "handler.ts entrypoint, validateBearerAuth() internally" | `entrypoint=./functions/docuseal/handler.ts`; `validateBearerAuth` at handler.ts:50 | YES |
| `n8n-blog-ingest` | "HMAC-SHA256 in `x-n8n-signature` vs N8N_WEBHOOK_SECRET" | `x-n8n-signature` (index.ts:4), `crypto.subtle.sign("HMAC", ...)` (index.ts:138), `N8N_WEBHOOK_SECRET` (index.ts:303) | YES |
| `docuseal-webhook` | "DocuSeal HMAC in `X-DocuSeal-Signature`" | index.ts:3, 258, 283 | YES |
| `resend-webhook` | "Svix signature headers" | "Svix-signed" (index.ts:1), Svix HMAC verification (index.ts:100) | YES |
| `newsletter-subscribe` | "public endpoint, rate-limited via Upstash" | no validateBearerAuth call; public endpoint | YES |
| `auth-email-send` | "Bearer == SUPABASE_AUTH_HOOK_SECRET, function verifies itself at index.ts:78-89" | Read of lines 78-89: `hookSecret = env[...]` (78), Bearer extract+strip (79-80), token compare (81), 401 response (82-88) — EXACT match | YES |
| `stripe-checkout` | "validateBearerAuth() internally" | index.ts:39 | YES |
| `stripe-checkout-session` | "public; session_id IS the secret; no Authorization header; caller is src/app/auth/post-checkout/page.tsx" | no validateBearerAuth call; matches | YES |
| `stripe-billing-portal` | "validateBearerAuth() internally" | index.ts:38 | YES |
| `stripe-cancel-subscription` | "validateBearerAuth() internally" | index.ts:43 | YES |
| `download-documents-zip` | "defense-in-depth: platform gate + validateBearerAuth() at index.ts:113 + user-scoped client" | line 113 exact, lines 131-134 user-scoped client | YES |
| `export-report` | "validateBearerAuth() internally" | index.ts:53 | YES |
| `export-user-data` | "validateBearerAuth() internally" | index.ts:60 | YES |
| `generate-pdf` | "validateBearerAuth() internally" | index.ts:209 | YES |

Every line-number reference in the config comments points at the claimed code.

### 5. CI status at HEAD `c0f1a407b`

| Check | Status | Duration |
|-------|--------|----------|
| `checks` | pass | 1m57s |
| `e2e-smoke` | pass | 2m48s |
| `rls-security` | pass | 53s |
| `Aikido Security: check code` | pass | 21s |
| `auto-merge` | skipping (expected; no merge label) | 0s |

All required CI gates GREEN.

### 6. Scope creep check

`git show c0f1a407b --stat`:
```
 supabase/config.toml | 8 +++++---
 1 file changed, 5 insertions(+), 3 deletions(-)
```

Diff inspection: only the comment lines above `[functions.download-documents-zip]` change (old 3-line comment → new 5-line comment). Config behavior unchanged. No scope creep.

### 7. Final detail pass

| Check | Result |
|-------|--------|
| Trailing whitespace in `config.toml` | none |
| File encoding | UTF-8 text (confirmed via `file`) |
| Tab characters in user content | none in config.toml |
| Comment line wrapping | consistent ~70-char width, matches surrounding blocks |
| Quote style consistency | all double-quoted (verified) |
| Function dir without config block | none (1:1 mapping enforced) |
| Config block without function dir | none (1:1 mapping enforced) |

---

## Findings

**None.** Zero P0, zero P1, zero P2, zero INFO.

---

## Cycle History Summary

| Cycle | Findings | Status |
|-------|----------|--------|
| 1 | 9 (6 P0 / 1 P1 / 2 INFO) | BLOCKED |
| 2 | 1 (0 P0 / 0 P1 / 1 INFO non-blocking) | CLEAN |
| 3 (this) | 0 | CLEAN |

Two consecutive clean cycles satisfied.

---

## Verdict

**CLEAN.** Second consecutive clean cycle — perfect-PR merge gate CLOSED. PR #756 is ready for merge.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
