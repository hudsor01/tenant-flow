# Phase 1: Security-CI Hardening - Research

**Researched:** 2026-06-04
**Domain:** CI supply-chain hardening, Next.js 16 CSP, Deno Edge Function security, GitHub Actions pinning
**Confidence:** HIGH (all four requirements verified against current source + official docs + live GitHub API)

## Summary

Phase 1 closes four independent hardening gaps surfaced by the 2026-05-29 audit. None requires a new npm/Deno package — every fix is pure code/config against already-installed tooling (`stripe@22.1.1`, `vitest@4.1.6`, Next 16.2.6, Deno Web Crypto). The work splits cleanly: one CI/test gate (CISEC-01), one frontend security-header change (CISEC-02), one one-line Edge Function fix (CISEC-03), and a mechanical workflow-pinning sweep (CISEC-04).

The two non-trivial items are CISEC-01 and CISEC-02. For **CISEC-01**, the decisive finding is that the Node `stripe` SDK already installed in `package.json` exposes `stripe.webhooks.generateTestHeaderString()` and `stripe.webhooks.constructEvent()` — `[VERIFIED: node -e require('stripe')]`. This makes the Stripe-webhook signature path **unit-testable in isolation in Vitest** with zero server, zero prod secrets, and zero `supabase functions serve` — so the security-critical assertion can run inside the already-green `unit`/`checks` gate. For **CISEC-02**, the canonical Next 16 nonce pattern is documented and matches the repo's `proxy.ts`, but nonce-based CSP **forces every page into dynamic rendering** — a direct conflict with the dozens of statically-generated marketing/blog pages this SEO-sensitive app depends on. That tradeoff is the central risk of the phase and must be a locked decision before planning.

**Primary recommendation:** CISEC-01 → port the Stripe signature assertions to a Vitest unit test (option B). CISEC-02 → adopt the Next-16 proxy nonce pattern but **scope it to authenticated/dynamic routes only**, or accept full-dynamic with explicit owner sign-off (locked decision required). CISEC-03 → introduce one `_shared/timing-safe.ts` helper and replace the `!==` compare. CISEC-04 → pin all third-party actions to the commit SHAs resolved below.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stripe-webhook signature verification | API / Edge Function | CI (test gate) | Signature check runs in the Deno Edge Function; the *assertion* runs in Vitest CI |
| Constant-time secret compare | API / Edge Function | — | Hook-secret check is server-to-server inside `auth-email-send` |
| CSP nonce generation | Frontend Server (proxy) | CDN/static headers | Per-request nonce must be generated in `proxy.ts` at request time; the static fallback header lives in `vercel.json` |
| GitHub Actions pinning | CI / build infra | — | Workflow files are CI-only; never ship to prod artifacts |

## User Constraints

> No CONTEXT.md exists for this phase yet (`/gsd:discuss-phase 1` not run). The constraints below are extracted from CLAUDE.md + REQUIREMENTS.md "Out of Scope" and are treated with locked-decision authority.

### Project Constraints (from CLAUDE.md)
- **No `--no-verify`** ever. All commits pass lefthook (gitleaks, lint, typecheck, unit-tests).
- **Perfect-PR merge gate**: two consecutive zero-finding review cycles. Not "passing CI".
- **Never push to main**: feature branch → push → `gh pr create`; owner reviews + merges.
- **Never change repo settings / branch protection / secrets** without explicit per-change permission (`feedback_never_change_repo_settings`). This rules out the "enable GitHub secret-scanning toggle" approach — code-PR solutions only.
- **Edge Functions**: Deno runtime, `_shared/` utilities, `validateEnv` inside the handler, `errorResponse()` never leaks `err.message`.
- **CSP enforced via `vercel.json`** (current home of the header).
- **No `any`**, no barrel files, no `as unknown as` at RPC boundaries (not in scope here but the timing-safe helper must respect it).
- Every change keeps `checks` / `e2e-smoke` / `rls-security` green.

### Out of Scope (from REQUIREMENTS.md — do NOT re-do)
- CodeQL SAST + gitleaks CI secret-scanning — **already shipped via PR #781** (`codeql.yml` + `gitleaks.yml` exist on disk). CISEC-04 only *pins* their actions; it does not add the workflows.
- Enabling GitHub secret-scanning / push-protection / CodeQL default-setup / branch-protection required-checks — repo-settings toggles, owner's action.
- `auth_leaked_password_protection` — paid feature, intentionally disabled.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CISEC-01 | Stripe-webhook signature verification runs in CI as a hard gate | §CISEC-01 — Stripe SDK `generateTestHeaderString` enables a pure Vitest unit test in the `checks` gate |
| CISEC-02 | CSP serves per-request nonce + `strict-dynamic`; `unsafe-inline` removed | §CISEC-02 — Next-16 proxy nonce pattern; dynamic-rendering tradeoff documented |
| CISEC-03 | `auth-email-send` compares hook secret in constant time | §CISEC-03 — exact `timingSafeEqual` replacement + new `_shared/timing-safe.ts` |
| CISEC-04 | All third-party GitHub Actions pinned to commit SHAs | §CISEC-04 — every `uses:` enumerated with resolved SHA |

---

## CISEC-01 — Stripe-webhook signature test gate in CI

### Current State

The Stripe webhook function delegates 100% of signature verification to the Stripe SDK — it owns no hand-rolled crypto:

`supabase/functions/stripe-webhooks/index.ts:70-97`
```ts
const body = await req.text();
let event: Stripe.Event;
try {
    event = await stripe.webhooks.constructEventAsync(
        body, signature, env.STRIPE_WEBHOOK_SECRET,
    );
} catch (err) {
    captureWebhookError(err, { action: "verify_signature", reason: "verification_failed", ... });
    return new Response(JSON.stringify({ error: "Webhook signature verification failed" }),
        { status: 400, ... });
}
```

The existing test `supabase/functions/tests/stripe-webhooks-test.ts` is a **Deno integration test** that calls `client.functions.invoke("stripe-webhooks", ...)` — it requires a served function and is asserted loosely (`error !== null || data !== null`). Header comment line 13: *"Requires: local Supabase instance (`supabase functions serve`)"*. `[VERIFIED: file read]` This suite runs in **zero workflows** today (audit §4 tests). `grep "uses:" .github/workflows/` confirms no `deno test` step exists. `[VERIFIED: grep]`

**Decisive capability finding** — the Node `stripe` SDK already in `package.json` (`stripe@22.1.1`) exposes the test-signing API:
```
$ node -e "const s=new (require('stripe'))('sk_test_x'); console.log(typeof s.webhooks.generateTestHeaderString, typeof s.webhooks.constructEvent)"
function function
```
`[VERIFIED: node -e require('stripe')]` The Deno function uses `stripe@20` (`deno.json`); the Node SDK's signature algorithm (HMAC-SHA256 over `${timestamp}.${payload}`, the `t=...,v1=...` scheme) is identical and stable across both major versions — the same Stripe webhook protocol. `[CITED: stripe.com/docs/webhooks/signatures]`

### Recommended Approach: Option B — port signature assertions to Vitest

**Write a pure Vitest unit test** at `src/lib/__tests__/stripe-webhook-signature.test.ts` (the `unit` vitest project globs `src/**/*.test.ts`, runs in the `checks` gate). The test imports the Node `stripe` SDK, signs a payload with a throwaway test secret via `generateTestHeaderString`, and asserts `constructEvent` (a) **accepts** a correctly-signed payload, (b) **rejects** a tampered body, (c) **rejects** a wrong secret, (d) **rejects** a stale timestamp outside tolerance. This pins the exact security contract the Edge Function relies on, runs in <50ms with no network, no secrets, no server.

**Rationale (why B over A):**
- **Lower CI risk.** Option A (a `deno test` job wired to `supabase functions serve` + injected secrets) requires booting the Supabase CLI runtime in CI, mirroring `STRIPE_WEBHOOK_SECRET`/`SUPABASE_*` into the Actions scope, and tolerating serve-startup flakiness. The existing integration test asserts only "responded without crashing" — it cannot assert a *valid* signature is accepted because no test can mint a real Stripe signature against the prod secret. Option A therefore gates the *reject* path but never the *accept* path.
- **Gates the full contract.** Because `generateTestHeaderString` lets us mint a valid signature locally, the Vitest test gates BOTH accept and reject — strictly more coverage than A.
- **Already-green gate.** Lands in `checks` (PR-required), no new secrets, no new job, no Dependabot-scope mirroring.
- **No new dependency.** `stripe` and `vitest` are already installed. `[VERIFIED: package.json]`

**Rejected alternative (Option A):** A `deno test` CI job. Higher complexity (CLI serve in CI), higher flakiness, more secrets to mirror, and weaker assertions (reject-only). Keep the existing Deno integration test as a local/manual smoke test (it still documents the deployed-function behavior) but do **not** make it the CI gate. *Optionally* the planner may add a non-blocking `deno test` job later — out of scope for closing CISEC-01.

### Concrete Implementation Steps
1. Create `src/lib/__tests__/stripe-webhook-signature.test.ts`.
2. `import Stripe from "stripe"` (Node SDK already a dep).
3. In the test: `const secret = "whsec_test_" + "x".repeat(24); const stripe = new Stripe("sk_test_x");`
4. Build a minimal event JSON string; `const header = stripe.webhooks.generateTestHeaderString({ payload, secret });`
5. Assert `stripe.webhooks.constructEvent(payload, header, secret)` returns the parsed event (accept path).
6. Assert `constructEvent(payload + " ", header, secret)` throws (tampered body).
7. Assert `constructEvent(payload, header, "whsec_wrong")` throws (wrong secret).
8. Assert a header built with `timestamp: Math.floor(Date.now()/1000) - 10_000` is rejected when passing `tolerance` (stale timestamp).
9. Add a short comment linking the test to `stripe-webhooks/index.ts:73` so a future reader knows it guards the Edge Function's verification contract.

### Gotchas / Landmines
- **Async vs sync.** The Edge Function uses `constructEventAsync` (Deno needs the async/Web Crypto variant); the Node test can use the sync `constructEvent` — both implement the same scheme. Note this in a comment so nobody "fixes" the test to match.
- **`generateTestHeaderString` is a real SDK method**, not a mock — it produces a genuine HMAC. Don't hand-roll the `t=...,v1=...` string; that re-introduces the exact bug class the test guards against.
- **Don't import the Deno function file** into the Vitest test — it imports `npm:`/`jsr:` specifiers Vite can't resolve. Test the *SDK contract*, which is what the function depends on.
- **`exactOptionalPropertyTypes`** is on — `generateTestHeaderString` options are all required-or-omitted; pass a fully-populated options object.

### Validation Architecture (CISEC-01)
- **Test command:** `bun run test:unit -- --run src/lib/__tests__/stripe-webhook-signature.test.ts`
- **CI gate:** runs inside `checks` (the `unit` vitest project) on every PR — already required by branch protection.
- **Grep assertion (regression guard):** the file's existence + the four assertions ARE the gate; no extra grep needed.

### Risk Note
**LOW.** Self-contained new test file, no production code touched, no new dependency, no new CI secret. Worst case is a flaky-free deterministic unit test. The only judgment call (keep vs. delete the Deno integration test) is non-blocking — recommend *keep* as documentation.

---

## CISEC-02 — CSP per-request nonce + strict-dynamic, drop unsafe-inline

### Current State

CSP lives in `vercel.json` (a static response header), with `'unsafe-inline'` on both `script-src` and `style-src`:

`vercel.json:100-103`
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *.supabase.co *.sentry.io *.stripe.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
}
```
`[VERIFIED: file read]` `proxy.ts` currently sets **no** CSP header — it only does auth/subscription gating. `[VERIFIED: file read]`

**Every inline-script source that `'unsafe-inline'` currently covers** `[VERIFIED: grep + file reads]`:
| Inline script source | File | How it gets a nonce under strict-dynamic |
|----------------------|------|------------------------------------------|
| Next.js framework hydration (`self.__next_f.push(...)`) | framework-injected | Next.js auto-attaches the nonce when it parses `'nonce-…'` from the request CSP header (no manual work) — but only on **dynamically rendered** pages |
| `next-themes` no-flash inline `<script>` | `src/providers/theme-provider.tsx` (uses `next-themes@0.4.6`) | `next-themes` injects an inline script; relies on `'strict-dynamic'` trust OR the `nonce` prop (see gotchas) |
| JSON-LD `<script type="application/ld+json">` (×2 renderers, 8+ pages) | `src/components/seo/json-ld-script.tsx:26`, `src/components/seo/seo-json-ld.tsx` | **`type="application/ld+json"` is data, not executable JS — CSP `script-src` does NOT block it.** No nonce needed (see gotchas) |
| Vercel Analytics + Speed Insights | `src/app/layout.tsx:113-118` (`@vercel/analytics`, `@vercel/speed-insights`) | Loaded as external `<script src>` from Vercel's injected runtime; covered by `'strict-dynamic'` once the bootstrap is nonced, plus `connect-src` for the beacon |
| Sentry tunnel `/monitoring` + SDK | `next.config.ts:140` (`tunnelRoute`), `@sentry/nextjs@10` | Tunnel is a same-origin POST endpoint (already in `connect-src 'self'`); the SDK loads via Next bundles covered by strict-dynamic |

There is **no** `next/script` usage and **no** Google Tag Manager / Partytown in the tree. `[VERIFIED: grep "from \"next/script\"" → empty]`

### Recommended Approach: Next-16 proxy nonce pattern, dynamic-route-scoped

The canonical Next.js 16 pattern (docs version 16.2.7, matching `next@16.2.6`) generates the nonce in `proxy.ts`, forwards it via an `x-nonce` request header AND sets the `Content-Security-Policy` response header per request. Next.js auto-applies the nonce to framework + page bundles during SSR. `[CITED: nextjs.org/docs/app/guides/content-security-policy]`

**Canonical proxy snippet (adapt into the existing `proxy.ts`):**
```ts
// Source: nextjs.org/docs/app/guides/content-security-policy (v16.2.7)
const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
const isDev = process.env.NODE_ENV === "development";
const csp = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
  img-src 'self' data: blob:;
  connect-src 'self' *.supabase.co *.sentry.io *.stripe.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const requestHeaders = new Headers(request.headers);
requestHeaders.set("x-nonce", nonce);
requestHeaders.set("Content-Security-Policy", csp);
// existing updateSession()/gate logic uses NextResponse.next({ request: { headers: requestHeaders } })
response.headers.set("Content-Security-Policy", csp);
```

**THE central tradeoff (locked-decision territory):** Per the official docs, *"When you use nonces in your CSP, **all pages must be dynamically rendered**… Static optimization and ISR are disabled… Pages cannot be cached by CDNs."* `[CITED: nextjs.org CSP guide]` This app is **SEO-sensitive** with many statically-generated marketing/blog pages (`MEMORY.md`: SEO recovery, sitemap honesty, static blog rendering). Forcing every page dynamic would regress crawl performance and hosting cost.

**Recommended resolution (pick ONE — needs owner decision in discuss-phase):**
1. **Scope nonce CSP to dynamic/authenticated routes** (the existing `PRIVATE_ROUTE_PREFIXES` set in `proxy.ts`) and keep a strict static header (no `unsafe-inline`, hash-based or `'self'`-only) in `vercel.json` for static marketing pages. Best balance: removes `unsafe-inline` from the high-value authenticated surface without de-optimizing SEO pages. **Recommended.**
2. **Full-dynamic everywhere** — simplest header logic, but accepts the SEO/perf/cost regression. Only if owner explicitly accepts.
3. **Experimental SRI** (`experimental.sri.algorithm`) — keeps static generation, hash-pins scripts, no nonce. But it's flagged experimental + App-Router-only and doesn't cover the `next-themes` inline script. Higher uncertainty; **rejected for now**.

**Rejected alternative:** Generating the nonce in `vercel.json` — impossible; `vercel.json` headers are static strings with no per-request execution. The nonce MUST come from `proxy.ts`. The `vercel.json` CSP becomes either a static-page fallback (option 1) or is removed entirely (option 2).

### Concrete Implementation Steps
1. **Decide scope** (option 1 vs 2) in discuss-phase — this gates everything below.
2. Add nonce generation + CSP header set to `proxy.ts`. Reconcile the `config.matcher` (current matcher already excludes `_next/static`, `_next/image`, `favicon.ico`, `monitoring`, `api/` — close to the docs' recommended matcher; verify prefetch-skip is desired).
3. Remove `'unsafe-inline'` from `script-src` in `vercel.json` (and from `style-src` — but verify Tailwind/inline-style needs; the app forbids inline styles per CLAUDE.md rule #5, so `style-src 'self'` + nonce should hold).
4. For `next-themes`: confirm whether `'strict-dynamic'` trust covers its injected script, or thread `nonce` via `headers()` into the provider. Test the no-flash behavior in dark mode (MEMORY notes `bg-white` breaks dark mode — a CSP-blocked theme script would flash light).
5. If option 1: keep a hardened static CSP in `vercel.json` for non-private routes; ensure the two don't both emit (proxy header wins on dynamic routes).
6. Add a regression test (see Validation Architecture).
7. **Browser-verify** in a real deploy: open dashboard + a marketing page, check DevTools console for zero CSP violations, confirm Vercel Analytics beacon + Sentry tunnel still fire (`connect-src`).

### Gotchas / Landmines
- **JSON-LD is NOT blocked by `script-src`.** `<script type="application/ld+json">` is parsed as data, never executed, so CSP `script-src` does not apply. **Do not** add a nonce to the JSON-LD renderers — it's unnecessary and the existing `.replace(/</g, "\\u003c")` XSS-escaping is the correct guard. `[CITED: MDN CSP script-src — type-restricted scripts]` Confirm in a browser to refute the temptation to "nonce everything."
- **Nonce forces dynamic rendering.** This is the #1 landmine — static blog/marketing pages will break or silently become dynamic. Pages that read `headers()` for the nonce become dynamic; pages that don't but are served with a per-request nonce CSP can still hit a build/runtime mismatch. The Next docs warn: pages "build successfully but may encounter runtime errors if not properly configured." `[CITED: nextjs.org CSP guide]`
- **`'strict-dynamic'` ignores `'self'` and host-allowlists in `script-src`.** Once `strict-dynamic` is present, the browser ignores `'self'` and any `https://…` host in `script-src` — only nonced/hashed scripts and their descendants load. Keep host-allowlists in `connect-src`/`img-src`, not `script-src`. `[CITED: WebSearch verified w/ MDN + Next docs]`
- **Sentry tunnel** (`/monitoring`) is same-origin POST → already covered by `connect-src 'self'`. No `script-src` change needed for it. `[VERIFIED: next.config.ts tunnelRoute]`
- **Next.js App Router cannot manually nonce its hydration scripts** — `strict-dynamic` is the *only* supported way to trust them (no `_document.tsx` in App Router). `[CITED: vercel/next.js discussion #81703]` So `strict-dynamic` is mandatory, not optional.
- **`'unsafe-eval'` only in dev** (React's eval-based debugging). Production must not include it. `[CITED: nextjs.org CSP guide]`
- **PPR / cacheComponents incompatible with nonce.** The repo does NOT currently enable PPR or `cacheComponents` (`next.config.ts` has only `reactCompiler: true` + `optimizePackageImports`) `[VERIFIED: file read]`, so this is latent — but a future PPR adoption would conflict. Document it.

### Validation Architecture (CISEC-02)
- **Grep assertion (regression guard):** a test asserting `vercel.json`'s `script-src` no longer contains `'unsafe-inline'`:
  `grep -q "unsafe-inline" vercel.json && echo FAIL` — wire into a vitest test that `readFileSync`s `vercel.json` and asserts `!csp.includes("'unsafe-inline'")` for `script-src`.
- **Proxy unit test:** a vitest test that invokes the `proxy()` (or the nonce helper) and asserts the response carries a `Content-Security-Policy` header containing `'nonce-` and `'strict-dynamic'` and NOT `'unsafe-inline'` in `script-src`.
- **E2E check:** the existing `owner-axe` Playwright project loads the dashboard; extend a smoke assertion that the response CSP header contains a nonce (or add a console-error assertion that no CSP violation fires).
- **Manual browser verify:** DevTools console clean on dashboard + one marketing page post-deploy.

### Risk Note
**MEDIUM-HIGH.** The dynamic-rendering tradeoff can regress SEO/perf if applied app-wide without scoping. Mitigation: option-1 scoping + browser verification + the `owner-axe` E2E gate. This requires a locked owner decision before planning. The `next-themes` no-flash script and Vercel Analytics beacon are the two things most likely to break silently — both must be browser-verified, not just assumed-covered by `strict-dynamic`.

---

## CISEC-03 — Constant-time hook-secret compare in auth-email-send

### Current State

`supabase/functions/auth-email-send/index.ts:78-89`
```ts
const hookSecret = env["SUPABASE_AUTH_HOOK_SECRET"];
const authHeader = req.headers.get("authorization") ?? "";
const token = authHeader.replace(/^Bearer\s+/i, "");
if (token !== hookSecret) {            // ← non-constant-time string compare (timing side-channel)
    captureWebhookError(new Error("Unauthorized: invalid hook secret"), { ... });
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
}
```
`[VERIFIED: file read]` This is the lone `!==` secret compare; every other webhook uses a constant-time path. `[VERIFIED: grep]`

**Existing constant-time patterns (three inlined copies, NO shared `_shared/` helper):** `[VERIFIED: grep]`
- `resend-webhook/index.ts:145-168` — `crypto.subtle.timingSafeEqual` with an XOR fallback for runtimes lacking it (compares HMAC base64 strings).
- `docuseal-webhook/index.ts:295-301` — length-check then `crypto.subtle.timingSafeEqual` (compares hex HMAC strings).
- `n8n-blog-ingest/index.ts:131-150` (`verifyHmac`) — length-check then manual XOR loop.

**Key distinction:** the other three compare an attacker-supplied **HMAC digest** against a **computed digest**. `auth-email-send` compares two **raw secret strings** directly (no HMAC). So it needs a plain constant-time byte compare of `token` vs `hookSecret`, not the HMAC machinery.

### Recommended Approach: extract one `_shared/timing-safe.ts`, use it here

Create `supabase/functions/_shared/timing-safe.ts` with a single exported `timingSafeEqualStr(a: string, b: string): boolean` that does a length-check (intentional early return on length mismatch is acceptable — secret length is not itself secret) then `crypto.subtle.timingSafeEqual` with the proven XOR fallback (lifted verbatim from `resend-webhook`). Then replace the `auth-email-send` compare:

```ts
// supabase/functions/_shared/timing-safe.ts
export function timingSafeEqualStr(a: string, b: string): boolean {
    const enc = new TextEncoder();
    const ab = enc.encode(a);
    const bb = enc.encode(b);
    if (ab.length !== bb.length) return false;
    const subtle = crypto.subtle as unknown as {
        timingSafeEqual?: (x: Uint8Array, y: Uint8Array) => boolean;
    };
    if (typeof subtle.timingSafeEqual === "function") {
        try { return subtle.timingSafeEqual(ab, bb); } catch { /* fall through */ }
    }
    let d = 0;
    for (let i = 0; i < ab.length; i++) d |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
    return d === 0;
}
```
```ts
// auth-email-send/index.ts — replace line 81
import { timingSafeEqualStr } from "../_shared/timing-safe.ts";
// ...
if (!timingSafeEqualStr(token, hookSecret)) { /* unchanged 401 path */ }
```

**Rationale:** The audit explicitly recommends *"Reuse the resend-webhook XOR-fallback helper."* Three functions already inline the same pattern — extracting one helper closes CISEC-03 AND removes the triplication (matches CLAUDE.md "no duplicate" ethos). The XOR fallback keeps Deno-runtime portability if `crypto.subtle.timingSafeEqual` is unavailable. **The `as unknown as` here is a runtime-feature-detection shim, not an RPC boundary** — it matches the existing pattern in `resend-webhook:151` and is NOT a CLAUDE.md rule #8 violation (rule #8 scopes to PostgREST/RPC return casts).

**Rejected alternative:** A one-line inline fix in `auth-email-send` only (no shared helper). Closes CISEC-03 but leaves three duplicated copies and adds a fourth — worse hygiene. The shared helper is barely more work and is the audit's intent.

### Concrete Implementation Steps
1. Create `supabase/functions/_shared/timing-safe.ts` with `timingSafeEqualStr`.
2. Replace `auth-email-send/index.ts:81` `token !== hookSecret` → `!timingSafeEqualStr(token, hookSecret)`; add the import.
3. *(Optional, in-scope cleanup)* refactor `resend-webhook`/`docuseal-webhook`/`n8n-blog-ingest` to import the shared helper — but those compare HMAC digests, so only if the helper also fits their string-compare shape; otherwise leave them and note the follow-up. **Recommend: scope CISEC-03 to `auth-email-send` + the new helper; defer the other three refactors** to avoid widening the PR.
4. Deploy the Edge Function out-of-band post-merge (`bun scripts/deploy-edge-functions.ts`) — there is no CI deploy step for Edge Functions (`MEMORY.md`).

### Gotchas / Landmines
- **Length early-return is fine.** Returning early on length mismatch leaks only that the lengths differ, not the secret bytes. All three existing helpers do this. Don't over-engineer a length-padding scheme.
- **Don't HMAC the token.** `auth-email-send` compares the raw shared secret, not a signature. Adding HMAC would change the auth contract and break the Supabase Auth Hook config.
- **Deno Web Crypto `timingSafeEqual`** is available in current Deno runtimes but the XOR fallback is the portability guarantee — keep it. `[VERIFIED: resend-webhook uses the same guard in prod]`
- **No test exists for `auth-email-send`** (`ls supabase/functions/tests/ | grep auth` → none) `[VERIFIED]`. The helper itself is trivially unit-testable in Vitest (it's pure TS — but it's a Deno-path `.ts` importing nothing Deno-specific except `crypto`, which Node also has). Consider a Vitest test for `timingSafeEqualStr` (equal → true, unequal-same-length → false, different-length → false).

### Validation Architecture (CISEC-03)
- **Grep assertion (regression guard):** `grep -n "token !== hookSecret" supabase/functions/auth-email-send/index.ts` must return nothing after the fix. Wire into a vitest `readFileSync` test that asserts the file imports `timingSafeEqualStr` and does NOT contain `!== hookSecret`.
- **Unit test:** `bun run test:unit -- --run` on a new `timing-safe` test (equal/unequal/length-mismatch cases). Runs in `checks`.
- **Deno test (optional/local):** add to `supabase/functions/tests/` if a fuller Edge Function test is desired (not the CI gate).

### Risk Note
**LOW.** One-line behavioral-equivalent swap (rejects the same inputs, in constant time) plus a pure new helper. The only operational step is the manual Edge Function redeploy post-merge — a known, documented dance.

---

## CISEC-04 — SHA-pin all third-party GitHub Actions

### Current State

`grep "uses:" .github/workflows/*` — full enumeration `[VERIFIED: grep + live GitHub API resolution 2026-06-04]`:

| Action (current ref) | File(s) | Owner | Resolve-to SHA (pin target) | Notes |
|----------------------|---------|-------|-----------------------------|-------|
| `oven-sh/setup-bun@v2` | ci-cd.yml:43,142; rls-security-tests.yml:89 | **third-party** | `0c5077e51419868618aeaa5fe8019c62421857d6` # v2.2.0 | **must pin** |
| `gitleaks/gitleaks-action@v2` | gitleaks.yml:32 | **third-party** | `ff98106e4c7b2bc287b24eaf42907196329070c7` # v2.3.9 | **must pin** (v2 tag → annotated tag → this commit) |
| `anthropics/claude-code-action@v1` | claude.yml:37 | **third-party** (runs `id-token: write`) | `70a6e5256e9e2366a1ed5c041904a982ba3a328f` # v1 (v1.0.135) | **must pin** — highest priority (audit called it out: `id-token: write`) |
| `dependabot/fetch-metadata@25dd0e34…` | dependabot-auto-merge.yml:40 | third-party | already `25dd0e34f4fe68f24cc83900b1fe3fe149efef98` # v3.1.0 | **already pinned** ✅ (comment says v3.1.0; the v3 tag resolves to the same commit) |
| `actions/checkout@v6` | ci-cd.yml:39,114; rls-security-tests.yml:56; claude.yml:31; codeql.yml:37; gitleaks.yml:24 | GitHub-owned | `df4cb1c069e1874edd31b4311f1884172cec0e10` # v6.0.3 | recommend pin (consistency) |
| `actions/setup-node@v6` | ci-cd.yml:47,147; rls-security-tests.yml:95 | GitHub-owned | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` # v6.4.0 | recommend pin |
| `actions/upload-artifact@v7` | ci-cd.yml:172; post-deploy-sentry-gate.yml:393 | GitHub-owned | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` # v7.0.1 | recommend pin |
| `github/codeql-action/init@v3` | codeql.yml:42 | GitHub-owned | `dd903d2e4f5405488e5ef1422510ee31c8b32357` # v3 (v3 tag→commit) | GitHub recommends keeping `@v3` for CodeQL; see note |
| `github/codeql-action/analyze@v3` | codeql.yml:47 | GitHub-owned | `dd903d2e4f5405488e5ef1422510ee31c8b32357` # v3 | same as init |

> All SHAs resolved via `gh api repos/<owner>/<repo>/{git/refs/tags,git/tags,tags}` on 2026-06-04. Annotated-tag objects (codeql `v3`, gitleaks `v2`, claude `v1`) were dereferenced to their underlying commit. `[VERIFIED: live GitHub API]`

### Recommended Approach

**Pin every third-party action to its commit SHA with a trailing `# vX.Y.Z` comment** — the format Dependabot understands and bumps. `[CITED: docs.github.com/actions/security-guides/security-hardening-for-github-actions]` Format:
```yaml
uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
```

**First-party `actions/*` and `github/codeql-action/*`:** GitHub-owned, lower risk (a compromise of GitHub-owned action repos is a platform-level event). The CodeQL `actions`-language scan (already running in `codeql.yml`) flags *unpinned third-party* actions specifically; GitHub-owned ones are typically not flagged. **Recommendation: pin them too** for a clean, uniform policy and to satisfy the strictest reading of the audit ("All third-party GitHub Actions… pinned"). Pinning `actions/*` costs nothing (Dependabot maintains them via the trailing comment) and removes the "is this one trusted?" judgment call. CodeQL's `actions` scan stays clean either way; pinning guarantees zero findings.

**Special-case `github/codeql-action`:** GitHub's own guidance is to track `@v3` (the major tag) for CodeQL so security-query updates flow automatically; pinning to a SHA freezes the query suite until Dependabot bumps. Two valid options — (a) pin to SHA with comment (uniform policy, Dependabot bumps weekly) or (b) leave `@v3` and document the exception (GitHub-owned + GitHub-recommended). **Recommend (a) for uniformity** but flag (b) as acceptable; the planner/owner can choose.

**Rejected alternative:** Pinning to a *version tag* (`@v2.3.9` instead of the SHA). Tags are mutable — an attacker who compromises the action repo can re-point `v2.3.9` to a malicious commit. Only the immutable SHA defends against tag-repointing. `[CITED: GitHub security-hardening guide]`

### Concrete Implementation Steps
1. For each `uses:` line in the table, replace `@vX` with `@<sha> # vX.Y.Z`.
2. Ensure `dependabot.yml` has the `github-actions` ecosystem enabled (it does — `dependabot-auto-merge.yml` exists and auto-merges non-major GHA bumps) so pins stay current.
3. Keep the existing `dependabot/fetch-metadata` pin as-is (already correct).
4. Run the `actions` CodeQL scan locally-equivalent: push to a branch, confirm the CodeQL `Analyze (actions)` job is green with zero new findings.
5. Verify CI still passes (a wrong SHA fails the workflow immediately — that's the test).

### Gotchas / Landmines
- **Annotated vs lightweight tags.** `codeql-action@v3`, `gitleaks-action@v2`, `claude-code-action@v1` are **annotated tags** — `git/refs/tags/<tag>` returns a tag OBJECT, not a commit. You must dereference (`git/tags/<sha>` → `.object.sha`) to get the COMMIT SHA to pin. Pinning the tag-object SHA would break the workflow. The table above already shows the dereferenced commit SHAs. `[VERIFIED: API dereference]`
- **`setup-bun@v2` mutable tag currently == v2.2.0** (`0c5077e…`). Pin the SHA, comment `# v2.2.0`. If a `v2.3.0` ships, Dependabot bumps both.
- **`claude-code-action` is the priority pin** — it requests `id-token: write` (OIDC) and `contents: read`; a compromised mutable tag there is the highest-blast-radius action in the repo. The audit explicitly named it. `[CITED: AUDIT §5]`
- **`gitleaks-action` v2 vs v3.** v3.0.0 exists (`e0c47f4…`) but `gitleaks.yml` pins `@v2`. **Pin to the v2 SHA the workflow currently resolves (`ff98106…`)** — do NOT silently jump to v3 in the same PR (v3 may change config/behavior; keep the version bump separate). Let Dependabot propose v3 later.
- **Don't pin `actions/*` to a SHA without the comment** — Dependabot needs the `# vX.Y.Z` trailing comment to recognize and bump the pin.

### Validation Architecture (CISEC-04)
- **Grep assertion (regression guard):** every third-party `uses:` line must match a 40-hex SHA. A test/script:
  `grep -rE "uses: (oven-sh|gitleaks|anthropics|dependabot)/" .github/workflows/ | grep -vE "@[0-9a-f]{40}" && echo FAIL` — must return nothing.
- **CI gate:** the existing `codeql.yml` `Analyze (actions)` matrix job IS the gate — it flags unpinned third-party actions. A clean run after pinning closes the loop. `[VERIFIED: codeql.yml analyzes "actions" language]`
- **Self-validating:** a wrong/nonexistent SHA fails the workflow on next run.

### Risk Note
**LOW.** Mechanical text change; the only error mode (wrong SHA) fails loudly and immediately in CI. The one judgment call (pin GitHub-owned `actions/*` + `codeql-action` or not) is a policy preference, not a correctness risk — recommend pinning all for uniformity.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe signature verify (test) | A hand-built `t=…,v1=…` HMAC string | `stripe.webhooks.generateTestHeaderString()` + `constructEvent()` | Hand-rolling re-introduces the exact bug class; SDK is the source of truth |
| Constant-time compare | A naive `===` or early-returning loop | `crypto.subtle.timingSafeEqual` + XOR fallback (`_shared/timing-safe.ts`) | Timing side-channels are subtle; reuse the proven `resend-webhook` pattern |
| CSP nonce propagation | Manually nonce-ing every Next hydration script | `'strict-dynamic'` + Next's auto-nonce on dynamic pages | App Router has no `_document.tsx`; strict-dynamic is the only supported path |
| Action-version trust | Pinning to `@vX.Y.Z` tags | Immutable commit SHA + `# vX.Y.Z` comment | Tags are mutable and repointable by a repo compromise |

**Key insight:** Three of four requirements close by *reusing an existing pattern already in this repo* (Stripe SDK, the resend-webhook timing-safe path, the dependabot/fetch-metadata SHA pin). The only genuinely new ground is the Next-16 CSP nonce — and even there the framework does the heavy lifting; the risk is the dynamic-rendering tradeoff, not the mechanics.

## Common Pitfalls

### Pitfall 1: Nonce-ing JSON-LD scripts
**What goes wrong:** Adding a nonce to `<script type="application/ld+json">` because "it's a script tag."
**Why it happens:** Looks like a script; isn't executed.
**How to avoid:** CSP `script-src` only governs executable JS. `type="application/ld+json"` is inert data. Leave the existing `<` escaping; add no nonce.
**Warning signs:** A PR diff that touches `json-ld-script.tsx`/`seo-json-ld.tsx` for CSP reasons.

### Pitfall 2: App-wide nonce CSP silently de-optimizing SEO pages
**What goes wrong:** Every marketing/blog page becomes dynamic; ISR/CDN caching disabled; crawl perf + hosting cost regress.
**Why it happens:** Nonce CSP forces dynamic rendering (official docs).
**How to avoid:** Scope nonce CSP to authenticated/dynamic routes (option 1) OR get explicit owner sign-off for full-dynamic.
**Warning signs:** Build output shows previously-static routes now `ƒ (Dynamic)`; Vercel function-invocation count jumps.

### Pitfall 3: Pinning an annotated-tag object SHA instead of the commit SHA
**What goes wrong:** Workflow fails with "unable to resolve action" because the pinned SHA is a tag object, not a commit.
**Why it happens:** `git/refs/tags/v3` returns a tag object for annotated tags.
**How to avoid:** Dereference via `git/tags/<sha>` → `.object.sha`. (Table above is pre-dereferenced.)
**Warning signs:** `gh api …/git/refs/tags/<tag> --jq '.object.type'` returns `tag` not `commit`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `stripe` (Node SDK) | CISEC-01 unit test | ✓ | 22.1.1 | — |
| `vitest` | CISEC-01/-03 tests | ✓ | 4.1.6 | — |
| Next.js | CISEC-02 proxy nonce | ✓ | 16.2.6 | — |
| Deno Web Crypto (`crypto.subtle`) | CISEC-03 | ✓ (runtime) | — | XOR fallback (already in helper) |
| `gh` CLI / GitHub API | CISEC-04 SHA resolution | ✓ | (resolved this session) | — |
| `supabase` CLI (functions serve) | only if Option A chosen for CISEC-01 | n/a | — | **Option B avoids it entirely** |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Deno `crypto.subtle.timingSafeEqual` (XOR fallback covers it).

## Package Legitimacy Audit

**No external packages are installed by this phase.** All four requirements use already-present dependencies (`stripe@22.1.1`, `vitest@4.1.6`, `next@16.2.6`, `next-themes@0.4.6`) verified in `package.json`, plus runtime `crypto.subtle` and the `gh` CLI. slopcheck/registry verification is **not applicable** — no `npm install` / `deno add` occurs. The GitHub Actions pinned in CISEC-04 are not npm packages; their authenticity is established by the immutable commit SHAs resolved via the live GitHub API (table in §CISEC-04).

## Validation Architecture (consolidated)

> `workflow.nyquist_validation` not found in `.planning/config.json` lookup — treat as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (jsdom unit / node integration), Playwright (E2E) |
| Config file | `vitest.config.ts` (projects: `unit`, `component`, `integration`) |
| Quick run command | `bun run test:unit -- --run <file>` |
| Full suite command | `bun run validate:quick` (typecheck + lint + unit) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CISEC-01 | Valid Stripe sig accepted; tampered/wrong-secret/stale rejected | unit | `bun run test:unit -- --run src/lib/__tests__/stripe-webhook-signature.test.ts` | ❌ Wave 0 |
| CISEC-02 | `vercel.json` script-src has no `'unsafe-inline'`; proxy emits nonce CSP | unit + E2E | `bun run test:unit -- --run src/lib/__tests__/csp-header.test.ts` + `owner-axe` E2E | ❌ Wave 0 |
| CISEC-03 | `auth-email-send` uses `timingSafeEqualStr`, not `!==` | unit (grep) | `bun run test:unit -- --run supabase/functions/_shared/__tests__/timing-safe.test.ts` | ❌ Wave 0 |
| CISEC-04 | Every third-party `uses:` is a 40-hex SHA | unit (grep) | vitest `readFileSync` over `.github/workflows/*` + `codeql.yml` actions scan | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the requirement's quick unit command.
- **Per wave merge:** `bun run validate:quick`.
- **Phase gate:** full suite green + CodeQL `Analyze (actions)` green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/__tests__/stripe-webhook-signature.test.ts` — CISEC-01
- [ ] `src/lib/__tests__/csp-header.test.ts` (asserts no `unsafe-inline` in `vercel.json` script-src + proxy nonce) — CISEC-02
- [ ] `supabase/functions/_shared/timing-safe.ts` + its vitest test — CISEC-03
- [ ] A workflow-pin grep test (CISEC-04) — small; can live in `src/lib/__tests__/` or a shell assertion in CI.
- Framework install: none needed (Vitest present).

## Security Domain

> `security_enforcement` not explicitly `false` — included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Constant-time hook-secret compare (CISEC-03); Stripe signature verify (CISEC-01) |
| V5 Input Validation | yes | Stripe signature = authenticated input boundary |
| V6 Cryptography | yes | `crypto.subtle.timingSafeEqual` (never hand-roll); HMAC via Stripe SDK |
| V14 Configuration | yes | CSP hardening (CISEC-02); SHA-pinned CI supply chain (CISEC-04) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stripe webhook spoofing | Spoofing | SDK signature verification (already present) + CI-gated regression test (CISEC-01) |
| Timing side-channel on secret compare | Information Disclosure | Constant-time compare (CISEC-03) |
| Inline-script XSS | Tampering | Nonce + `strict-dynamic`, drop `unsafe-inline` (CISEC-02) |
| Supply-chain action-tag repointing | Tampering / Elevation | Immutable commit-SHA pins (CISEC-04) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stripe webhook signature scheme is identical between Node SDK v22 and Deno SDK v20 | CISEC-01 | LOW — same documented `t=,v1=` HMAC-SHA256 protocol; if wrong, the unit test still guards the SDK contract the function uses |
| A2 | `next-themes@0.4.6` inline no-flash script is trusted by `strict-dynamic` (or accepts a `nonce` prop) | CISEC-02 | MEDIUM — must browser-verify; if neither, a dark-mode flash appears. Needs a real-deploy check |
| A3 | `style-src 'self'` (no inline) suffices given CLAUDE.md forbids inline styles | CISEC-02 | MEDIUM — verify no library injects inline `<style>`; Tailwind emits a stylesheet, not inline |
| A4 | GitHub-owned `actions/*` SHAs resolved on 2026-06-04 are current latest | CISEC-04 | LOW — Dependabot will bump; pinning a slightly-older patch is safe |
| A5 | `nyquist_validation` is enabled (config key not located this session) | Validation | LOW — including the section is the safe default |

## Open Questions

1. **CISEC-02 scope: full-dynamic vs route-scoped nonce CSP?**
   - What we know: nonce CSP forces dynamic rendering; the app is SEO-sensitive with many static pages.
   - What's unclear: whether the owner accepts full-dynamic (perf/SEO/cost hit) or wants route-scoping (option 1).
   - Recommendation: **Lock this in `/gsd:discuss-phase 1` before planning.** Default to route-scoped (option 1).

2. **CISEC-01: keep or delete the existing Deno integration test?**
   - Recommendation: keep as local/manual documentation; the Vitest test is the CI gate. Non-blocking.

3. **CISEC-04: pin `github/codeql-action` to SHA or keep `@v3`?**
   - Recommendation: pin for uniformity; `@v3` is an acceptable documented exception (GitHub-recommended for CodeQL query freshness).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unsafe-inline` static CSP | Per-request nonce + `strict-dynamic` in proxy | Next 13.4.20+ proper nonce handling | Removes the largest XSS hole; costs dynamic rendering |
| `middleware.ts` | `proxy.ts` | Next 16 | Repo already migrated; nonce goes in `proxy.ts` |
| Mutable action tags | Commit-SHA pins + Dependabot comment | GitHub supply-chain guidance (post-tj-actions/2025 incidents) | Defeats tag-repointing |

**Deprecated/outdated:**
- Pages-Router `_document.tsx` nonce injection — N/A in App Router; `strict-dynamic` replaces it.
- Reading the nonce at `next.config` build time — impossible per-request; must be in `proxy.ts`.

## Sources

### Primary (HIGH confidence)
- Repo source files (read directly): `vercel.json`, `src/proxy.ts`, `src/lib/supabase/middleware.ts`, `supabase/functions/stripe-webhooks/index.ts` (+ test), `supabase/functions/auth-email-send/index.ts`, `supabase/functions/resend-webhook/index.ts`, `supabase/functions/docuseal-webhook/index.ts`, `supabase/functions/n8n-blog-ingest/index.ts`, all `.github/workflows/*.yml`, `next.config.ts`, `src/app/layout.tsx`, `src/components/seo/json-ld-script.tsx`, `src/components/seo/seo-json-ld.tsx`, `src/providers/theme-provider.tsx`, `vitest.config.ts`, `package.json`, `supabase/functions/deno.json`.
- `nextjs.org/docs/app/guides/content-security-policy` (v16.2.7, lastUpdated 2026-03-20) — canonical nonce + strict-dynamic pattern, dynamic-rendering requirement.
- Live GitHub API (`gh api`) 2026-06-04 — all CISEC-04 SHA resolutions + annotated-tag dereferences.
- `node -e require('stripe')` — confirmed `generateTestHeaderString` + `constructEvent` exist in installed SDK.

### Secondary (MEDIUM confidence)
- `github.com/vercel/next.js/discussions/81703` — App Router cannot manually nonce hydration scripts; `strict-dynamic` is the supported path.
- MDN CSP `script-src` reference — `type="application/ld+json"` is not executable, not governed by `script-src`.

### Tertiary (LOW confidence)
- WebSearch general CSP/nonce articles — used only to corroborate the official Next docs.

## Metadata

**Confidence breakdown:**
- CISEC-01: HIGH — SDK capability verified by direct `node -e`; placement verified against vitest config.
- CISEC-02: HIGH on the pattern (official current docs match repo version), MEDIUM on the `next-themes`/Vercel-beacon edge cases (need browser verify) and the scope decision (owner call).
- CISEC-03: HIGH — three existing in-repo patterns; one-line swap.
- CISEC-04: HIGH — every SHA resolved live this session, annotated tags dereferenced.

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (stable) — but CISEC-04 SHAs drift as actions release; re-resolve at plan time if >2 weeks old.

## Sources

- [Next.js Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy)
- [vercel/next.js discussion #81703 — script-src unsafe-inline in production](https://github.com/vercel/next.js/discussions/81703)
- [MDN — Content-Security-Policy script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)
- [GitHub — Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
