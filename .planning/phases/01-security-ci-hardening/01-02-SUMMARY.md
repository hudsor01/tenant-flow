---
phase: 01-security-ci-hardening
plan: 02
subsystem: frontend-security-headers
tags: [csp, nonce, strict-dynamic, proxy, middleware, xss]
requires:
  - "Next 16 proxy.ts auth/subscription gate (existing)"
  - "updateSession NextResponse.next cookie-sync pattern (existing)"
provides:
  - "Per-request nonce CSP with strict-dynamic on PRIVATE_ROUTE_PREFIXES, forwarded on the REQUEST Content-Security-Policy header so Next 16 auto-nonces hydration scripts"
  - "Hardened vercel.json static CSP (no script-src 'unsafe-inline') for non-private routes"
  - "csp-header.test.ts regression guard (request==response nonce parity + vercel.json script-src guard)"
affects:
  - "src/proxy.ts"
  - "src/lib/supabase/middleware.ts"
  - "vercel.json"
tech-stack:
  added: []
  patterns:
    - "Route-scoped nonce CSP (private routes dynamic, marketing/static stay static)"
    - "Nonce CSP threaded through updateSession's NextResponse.next({ request: { headers } }) — the load-bearing render-time path Next parses, not x-nonce"
key-files:
  created:
    - "src/lib/__tests__/csp-header.test.ts"
  modified:
    - "src/proxy.ts"
    - "src/lib/supabase/middleware.ts"
    - "vercel.json"
decisions:
  - "Scope nonce CSP to PRIVATE_ROUTE_PREFIXES only (locked) — a nonce forces dynamic rendering; marketing/blog must stay statically rendered for the SEO recovery"
  - "style-src keeps 'unsafe-inline' on private routes (CISEC-02 is script-src-scoped; inline-style risk is a MEDIUM follow-up)"
  - "JSON-LD <script type='application/ld+json'> untouched (data, not governed by script-src)"
  - "strict-dynamic ignores host allowlists in script-src, so *.supabase.co *.sentry.io *.stripe.com stay in connect-src"
requirements: [CISEC-02]
metrics:
  duration: "~25m"
  completed: "2026-06-04"
  tasks: 2
  files: 4
---

# Phase 1 Plan 02: CSP Per-Request Nonce + strict-dynamic (CISEC-02) Summary

Per-request nonce CSP with `'strict-dynamic'` on authenticated routes, forwarded on the forwarded REQUEST `Content-Security-Policy` header (the exact string Next 16.2.6 parses via `getScriptNonceFromHeader`) so framework hydration scripts get auto-nonced — and `script-src 'unsafe-inline'` dropped from both the private-route CSP and the `vercel.json` static fallback. Marketing/blog/static pages keep the static `vercel.json` CSP and stay statically rendered.

## What Was Built

### Task 1 — Per-request nonce CSP forwarded on the REQUEST header + response (private routes only)
- `src/proxy.ts`:
  - Added `buildNonceCsp(nonce)`: emits `default-src 'self'; script-src 'self' 'nonce-<nonce>' 'strict-dynamic'[ 'unsafe-eval' in dev]; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *.supabase.co *.sentry.io *.stripe.com; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. Host allowlist stays in `connect-src` (strict-dynamic ignores host allowlists in script-src). `'unsafe-eval'` is gated to `process.env.NODE_ENV === "development"`.
  - On `isPrivateRoute(pathname)` only: generate `const nonce = Buffer.from(crypto.randomUUID()).toString("base64")`, build the CSP, clone `request.headers` into `requestHeaders`, and `requestHeaders.set("Content-Security-Policy", nonceCsp)` (load-bearing) + `requestHeaders.set("x-nonce", nonce)` (convenience only).
  - Call `updateSession(request, requestHeaders)` on private routes; `updateSession(request, undefined)` on public routes (the `requestHeaders` var is `undefined` there).
  - Added a `withCsp()` wrapper that sets the same CSP on the response, applied to EVERY private-route return path: the authenticated pass-through, the subscription-allowlist pass-through, the no-user `/login` redirect, the gate-failure `/login` redirect, the non-admin `/dashboard` redirect, and the no-subscription `/pricing` redirect. The public early-return (`if (!privateRoute) return supabaseResponse`) is NOT wrapped — public routes keep the static `vercel.json` CSP.
  - JSON-LD renderers left untouched (verified via grep — 0 references in proxy.ts).
- `src/lib/supabase/middleware.ts`:
  - `updateSession` now takes an optional `requestHeaders?: Headers`. When provided it builds `supabaseResponse` via `NextResponse.next({ request: { headers: requestHeaders } })` at BOTH construction sites (init + the cookie `setAll` rebuild) so the CSP survives the cookie-sync rebuild. When undefined, the original `NextResponse.next({ request })` behavior is preserved exactly.
  - The existing auth (`getUser()`), `getAll`/`setAll` cookie pattern, and Sentry error handling are unchanged — the nonce wiring is purely additive.

### Task 2 — Harden vercel.json + regression test
- `vercel.json`: `script-src 'self' 'unsafe-inline'` → `script-src 'self'`. `style-src 'self' 'unsafe-inline'` retained (out of CISEC-02 scope).
- `src/lib/__tests__/csp-header.test.ts` (5 assertions, uses the REAL `next/server` `NextResponse`, mocks `#lib/supabase/middleware`/`@supabase/ssr`/`@sentry/nextjs`/`#env`):
  - (a) `vercel.json` static `script-src` has no `'unsafe-inline'`.
  - (b) On `/dashboard`, `updateSession` receives a `Headers` arg whose `content-security-policy` value contains `'nonce-` + `'strict-dynamic'` (REQUEST-side propagation — fails under response-only wiring).
  - (c) request-side nonce token == response-side nonce token (the success-criterion-2 pin).
  - (d) private-route response CSP has `'nonce-` + `'strict-dynamic'`, no `script-src 'unsafe-inline'`, and keeps `style-src 'self' 'unsafe-inline'`.
  - (e) On `/`, `updateSession` is called WITHOUT a CSP-bearing request-headers arg and the response carries no per-request CSP.

## Verification Results

- `bunx vitest --run --project unit src/lib/__tests__/csp-header.test.ts` → 5 passed.
- Combined with existing proxy/middleware suites (`middleware-routing.test.ts` + `middleware.test.ts`) → 35 passed, 0 regressions.
- `bun run typecheck` → clean (no `any`; `requestHeaders` typed as `Headers`).
- `bun run lint` → pass (one pre-existing Biome version `info` notice unrelated to this change).
- Full lefthook gate on commit (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) → all green. Committed without `--no-verify`.

### Acceptance-criteria greps (all satisfied)
- `grep -c "Content-Security-Policy" src/proxy.ts` = 3; `grep -c "strict-dynamic" src/proxy.ts` = 3.
- `grep -c "Content-Security-Policy" src/lib/supabase/middleware.ts` = 4 (request-header CSP path documented at the load-bearing `NextResponse.next` site).
- Both `NextResponse.next` sites carry `nextOptions` (init + setAll rebuild).
- `grep -cE "isPrivateRoute|privateRoute" src/proxy.ts` = 4 (nonce/CSP block gated behind the private-route check).
- JSON-LD references in proxy.ts (non-comment) = 0.
- `vercel.json` script-src `'unsafe-inline'` count = 0; `script-src 'self'` confirmed.

## The Load-Bearing Mechanism (why the plan was revised)

Next 16.2.6 sources the hydration-script nonce by parsing the `content-security-policy` header on the **forwarded request** (`getScriptNonceFromHeader`, `node_modules/next/dist/server/app-render/app-render.js:167-168` — verified by reading the installed source). It does NOT read `x-nonce`. So the nonce CSP string is set on `requestHeaders` and threaded through `updateSession`'s `NextResponse.next({ request: { headers: requestHeaders } })` at BOTH construction sites. `x-nonce` is set only as a non-load-bearing convenience. Test assertion (c) (request-side nonce == response-side nonce, captured off the `updateSession` mock arg) is what pins this — it would fail under a naive response-only wiring.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cookie-sync correctness when forwarding custom requestHeaders**
- **Found during:** Task 1 (middleware.ts wiring)
- **Issue:** The original `setAll` rebuild used `NextResponse.next({ request })`, which forwards the mutated `request` (with refreshed auth cookies). Switching the rebuild to `NextResponse.next({ request: { headers: requestHeaders } })` would forward the proxy's pre-mutation `requestHeaders` snapshot, dropping the refreshed cookies from the request Server Components render against — a session-desync bug.
- **Fix:** On the `setAll` rebuild, mirror the freshly-updated `cookie` header from `request` back into `requestHeaders` (`requestHeaders.set("cookie", request.headers.get("cookie") ?? "")`) before the rebuild. Next's `RequestCookies.set()` writes through to the underlying `cookie` header, so this captures the refreshed cookies. Only runs when `requestHeaders` is provided (private routes); public-route behavior is byte-for-byte unchanged.
- **Files modified:** `src/lib/supabase/middleware.ts`
- **Commit:** 2c878f486

**2. [Rule 3 - Blocking] Plan's test command had a duplicate `--run` flag**
- **Issue:** `bun run test:unit -- --run src/lib/__tests__/csp-header.test.ts` crashed — the `test:unit` script already passes `--run`, so vitest's CAC parser rejected the duplicate. (`bun run validate:quick` also failed in this shell with an unrelated packaged-Node `Cannot find module 'bun'` resolution quirk on the chained nested `bun run` — not a code issue; the three steps were run individually and all passed.)
- **Fix:** Ran the test via the direct invocation the task prompt specified: `bunx vitest --run --project unit src/lib/__tests__/csp-header.test.ts`. No code change.

**3. [Rule 1 - Bug] `import.meta.url` not a file: URL under the Vitest transform**
- **Found during:** Task 2 (test authoring)
- **Issue:** `fileURLToPath(new URL("../../../vercel.json", import.meta.url))` threw `The URL must be of scheme file` — `import.meta.url` is not a `file:` URL in this Vitest setup.
- **Fix:** Resolve `vercel.json` from `process.cwd()` (Vitest runs from repo root): `resolve(process.cwd(), "vercel.json")`.
- **Files modified:** `src/lib/__tests__/csp-header.test.ts`

No architectural changes were required. No package installs.

## Remaining Manual Verification (CANNOT be automated here)

Per `01-VALIDATION.md` Manual-Only, the deployed-browser CSP check is a post-deploy step that this executor cannot run (no deployed environment):

- After deploy, load `/dashboard` (authenticated) and `/` (marketing) in a browser:
  - Confirm the `/dashboard` response `Content-Security-Policy` header carries `'nonce-<n>'` + `'strict-dynamic'` and `/` serves the static `vercel.json` CSP.
  - Confirm ZERO `script-src` CSP-violation errors in the console on both — specifically the `next-themes` no-flash inline script (test dark mode for a flash), the Vercel Analytics beacon, and the Sentry tunnel `/monitoring`.
  - Confirm the dashboard **fully hydrates and is interactive** — a blank/non-interactive dashboard would mean the request-side nonce wiring failed (framework scripts blocked under strict-dynamic).
  - Confirm no `style-src` CSP violations and no broken/unstyled regions (style-src keeps `'unsafe-inline'` on private routes).

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access, or schema changes were introduced beyond the planned CSP header surface.

## Self-Check: PASSED
- `src/proxy.ts` — present, modified (buildNonceCsp + nonce wiring + withCsp).
- `src/lib/supabase/middleware.ts` — present, modified (optional requestHeaders).
- `vercel.json` — present, modified (script-src 'self').
- `src/lib/__tests__/csp-header.test.ts` — present, created (5 passing assertions).
- Commit `2c878f486` present on `gsd/phase-1-security-ci-hardening`.
